// SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Person, userPersonStore } from "@/stores/person";

interface SocketContextType {
  socket: Socket;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const setPersons = userPersonStore((state) => state.setPersons);

  useEffect(() => {
    const newSocket = io("http://localhost:8000"); // Change to your backend URL
    setSocket(newSocket);

    // Person joined
    newSocket.on("personUpdate", (persons: Person[]) => {
      setPersons(persons);
    });

    newSocket.on("connect", () => {
      console.log("Connected to server with ID:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    return () => {
      newSocket.off("personUpdate");
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.disconnect();
    };
  }, []);

  if (!socket) {
    return null; // or a loading spinner
  }

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
