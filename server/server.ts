import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
const app = express();
app.use(
  cors({
    origin: "*",
  })
);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

interface Person {
  id: string;
  name: string;
  colors: {
    hairColor: string;
    skinColor: string;
  };
  position: [number, number, number];
  rotation: [number, number, number, number];
}

const persons: Person[] = [];

// Express middleware
app.use(express.json());

// Basic route
app.get("/api/persons", (req, res) => {
  const excludeId = req.query.excludeId;
  const filteredPersons = persons.filter((p) => p.id !== excludeId);
  return res.json(filteredPersons);
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("a user connected ", socket.id);
  const user = {
    id: socket.id,
    name: `User${socket.id}`,
    colors: {
      hairColor:
        "#" + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0"),
      skinColor:
        "#" + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0"),
    },
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0, 1] as [number, number, number, number],
  };
  persons.push(user);

  socket.on("localModelUpdate", (data) => {
    const person = persons.find((p) => p.id === data.id);
    if (person) {
      person.position = data.position;
      person.rotation = data.rotation;
    }
    socket.broadcast.emit(`remoteReceiveUpdate:${data.id}`, data);
  });

  new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
    console.log(persons);
    console.log(persons.length);
    io.emit("personUpdate", persons);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
    const index = persons.findIndex((p) => p.id === socket.id);
    if (index !== -1) persons.splice(index, 1);
    io.emit("personUpdate", persons);
    console.log(persons);
    console.log(persons.length);
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(
    `Express server with Socket.IO running at http://192.168.2.175:${PORT}/`
  );
});
