const { findElementByObjectKey } = require("./services/auth/tools");
const roomSchema = require("./services/rooms/schema");
const userSchema = require("./services/users/schema");

const createSocketServer = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", async (roomId, user) => {
      try {
        //check if room exists
        const room = await roomSchema.findById(roomId);

        if (!room) throw new Error("Couldn't find room");

        if (room.admin._id == user._id) {
          //if the user is the admin join
          socket.join(roomId);
          room.admin.socketId = socket.id;
          await room.save();

          socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
        } else {
          //check if the room is private
          if (room && room.private) {
            const userAdmited = findElementByObjectKey(room.users, ["userId", "newUserId"], user._id);

            //check if user has already been admited
            if (userAdmited !== -1) {
              //if the user has already been admited join the room and update the socket id
              socket.join(roomId);
              socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
              socket.emit("all-users", [...room.users, room.admin]);
              room.users[userAdmited].socketId = socket.id;
              await room.save();
            } else {
              //if the user is new request to join room
              const user = user._id.length === 24 ? await userSchema.findById(user._id) : false;
              const data = user ? { socketId: socket.id, userId: user._id, firstname: user.firstname, lastname: user.lastname, img: user.img } : { socketId: socket.id, ...user };
              room.waitingList = [...room.waitingList, data];
              await room.save();
              socket.to(room.admin.socketId).emit("user-requested", { user, socketId: socket.id });
            }
          } else {
            //if the room is public
            socket.join(roomId);
            socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
            socket.to(socketId).emit("all-users", [...room.users, room.admin]);
            const user = user._id.length === 24 ? await userSchema.findById(user._id) : false;
            const data = user ? { socketId: socket.id, userId: user._id, firstname: user.firstname, lastname: user.lastname, img: user.img } : { socketId: socket.id, ...user };
            room.users.push(data);
            await room.save();
          }
        }
        socket.on("disconnect", async () => {
          try {
            socket.to(roomId).emit("user-disconnected", user);
          } catch (err) {
            console.log(err);
          }
        });
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("sending-signal", (payload) => {
      io.to(payload.userToSignal.socketId).emit("user-joined", { signal: payload.signal, callerID: socket.id });
    });

    socket.on("returning-signal", (payload) => {
      io.to(payload.callerID).emit("receiving-returned-signal", { signal: payload.signal, id: socket.id });
    });

    socket.on("admit-user", async (payload) => {
      const { roomId, adminId, user, socketId } = payload;
      //check if room with current id exists
      try {
        const room = await roomSchema.findOne({ _id: roomId, "admin._id": adminId });
        const id = user._id.length === 24 ? await userSchema.findById(user._id) : false;
        const data = id ? { socketId: socket.id, userId: user._id, firstname: user.firstname, lastname: user.lastname, img: user.img } : { socketId: socket.id, ...user, newUserId: user._id };

        if (room) {
          io.sockets.connected[socketId].join(roomId);
          socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
          socket.to(socketId).emit("all-users", [...room.users, room.admin]);
          room.users.push(data);
          room.waitingList = room.waitingList.filter((user) => user.userId !== user._id && user.newUserId !== user._id);
          await room.save();
        } else {
          socket.to(roomId).emit("error", "Room not found");
        }
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("subtitles", (roomId, subtitles, user) => {
      socket.to(roomId).broadcast.emit("subtitles", { subtitles, user });
    });

    socket.on("message", (roomId, user, message) => {
      socket.to(roomId).broadcast.emit("message", { user, message });
    });

    socket.on("end-call", async ({ roomId, userId }) => {
      try {
        const room = await roomSchema.findById(roomId);
        console.log(roomId, userId, room);
        if (room && room.admin._id == userId) {
          await roomSchema.findByIdAndDelete(roomId);
          socket.to(roomId).broadcast.emit("call-end");
        }
        socket.leave(roomId);
      } catch (error) {
        console.log(error);
      }
    });
  });
};
module.exports = createSocketServer;
