const socket = require("socket.io");
const roomSchema = require("./services/rooms/schema");

const createSocketServer = (server) => {
  const io = socket(server);

  io.on("connection", (socket) => {
    socket.on("join-room", async (roomId, userId) => {
      try {
        //check if room exists
        const room = await roomSchema.findById(roomId);
        if (room) {
          const userAdmited = room.users.includes(userId);
          if (room.admin === userId || userAdmited) {
            socket.join(roomId);
            socket.to(roomId).broadcast.emit("user-connected", `${userId} has joined the room`);
          } else {
            socket.to(roomId).broadcast.emit("user-requested", userId, socket.id);
          }
        } else {
          socket.emit({ error: "Room not found", status: 404 });
        }
      } catch (error) {
        console.log(error);
      }
      socket.on("disconnect", () => {
        socket.to(roomId).broadcast.emit("user-diconnected", userId);
      });
    });
    socket.on("admit-user", async (roomId, adminId, userId, socketId) => {
      //check if room with current id exists
      const room = await roomSchema.findOne({ _id: roomId, admin: adminId });
      if (room) {
        room.users.push(userId);
        await room.save();
        io.sockets.connected[socketId].join(room);
        socket.to(roomId).broadcast.emit("user-connected", `${userId} has joined the room`);
      } else {
        socket.emit("error", "Room not found");
      }
    });
    socket.on("admit-user", async (roomId, adminId, userId, socketId) => {
      //check if room with current id exists
      const room = await roomSchema.findOne({ _id: roomId, admin: adminId });
      if (room) {
        room.users.push(userId);
        await room.save();
        io.sockets.connected[socketId].join(room);
        socket.to(roomId).broadcast.emit("user-connected", `${userId} has joined the room`);
      } else {
        socket.emit({ error: "Room not found", status: 404 });
      }
    });

    socket.on("subtitles", (roomId, subtitles, user) => {
      socket.to(roomId).broadcast.emit("subtitles", { subtitles, user });
    });
  });
};
module.exports = createSocketServer;
