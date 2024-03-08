import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import "./client.js";
import { Server } from "socket.io";

const io = new Server(3000, {
  //3000 is the port where server is running
  cors: {
    origin: ["http://localhost:5000"], // port of the client
  },
});

// Middleware for user authentication
io.use(async (socket, next) => {
  const token = socket.handshake.headers.authorization; // to access JWT from the authorization header sent by the client during the handshake process.
  if (!token) {
    next(new ApiError(403, "Token is required"));
  } else {
    const user = await User.findById(req.user._id);
    if (user) {
      socket.username = user.username;
      console.log(`${socket.username} is Authenticated`);
      next();
    } else {
      next(new ApiError(403, "You are not authorized"));
    }
  }
});

//function that runs whenever a client connects to the server & gives a socket instance
io.on("connection", (socket) => {
  console.log(`${socket.id} Connected with the client!`); // socket.id is a random id assigned to each socket/client after the connection

  //listening to event sent by the client
  socket.on("messageToServer", (message, room) => {
    if (room === "") {
      //"broadcast" prevents sending of msg to current server i.e to itself
      socket.broadcast.emit("messageToClient", message);
    } else {
      socket.to(room).emit("messageToClient", message);
    }
  });
  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`${socket.username} joined room ${room}`);
  });
});
