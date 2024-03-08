import io from "socket.io-client";

const socket = io("http://localhost:3000"); // connects to the server

// Connecting with the server
socket.on("connect", () => {
  console.log(`${socket.id} Connected with the server`);

  // Sending events up from the client to the server
  socket.emit("messageToServer", message, room);

  // Joining a room
  socket.emit("join-room", room);
});

// Listening to events coming down from server
socket.on("messageToClient", (message) => {
  console.log(message);
});
