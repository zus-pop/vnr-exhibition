// ChatBox.tsx
import React, { useState } from "react";
import { useSocket } from "../provider/SocketProvider";
import { usePersonStore } from "../stores/person";

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const { socket } = useSocket();
  const setLocalChatMessage = usePersonStore(
    (state) => state.setLocalChatMessage
  );

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput("");
      setLocalChatMessage(input);
      socket.emit("localModelChatMessage", {
        id: socket.id,
        message: input,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 999,
          backgroundColor: "transparent",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "300px",
          backgroundColor: "white",
          border: "1px solid #ccc",
          borderRadius: "8px",
          zIndex: 1000,
          padding: "10px",
        }}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-1 bg-orange-300 hover:bg-orange-800 text-gray-500 hover:text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm"
        >
          ✕
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <input
            autoFocus
            type="text"
            value={input}
            onKeyDownCapture={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyUpCapture={(e) => e.stopPropagation()}
            onChange={(e) => (e.stopPropagation(), setInput(e.target.value))}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.stopPropagation(), sendMessage())
            }
            className="w-full p-2 border border-gray-300 rounded text-black"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="text-white w-full p-2 cursor-pointer bg-linear-to-r from-orange-500 to-red-500 rounded mt-2"
            style={{ marginTop: "10px" }}
          >
            Gửi
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatBox;
