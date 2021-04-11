const { findElementByObjectKey } = require("./services/auth/tools");
const roomSchema = require("./services/rooms/schema");
const userSchema = require("./services/users/schema");

const createSocketServer = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", async (roomId, user) => {
      try {
        //check if room exists
        const room = await roomSchema.findById(roomId).populate("admin.user", "firstname lastname _id img");

        if (!room) throw new Error("Couldn't find room");

        if (room.admin.user._id == user._id) {
          //if the user is the admin join
          socket.join(roomId);
          room.admin.socketId = socket.id;
          await room.save();
          socket.emit("all-users", [...room.users]);
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
              socket.emit("all-users", [...room.users, { socketId: room.admin.socketId, ...room.admin.user }]);
              room.users[userAdmited].socketId = socket.id;
              await room.save();
            } else {
              //if the user is new request to join room
              const id = user._id.length === 24 ? await userSchema.findById(user._id) : false;
              const data = id
                ? { socketId: socket.id, userId: user._id, firstname: user.firstname, lastname: user.lastname, img: user.img }
                : { socketId: socket.id, firstname: user.firstname, lastname: user.lastname, img: user.img, newUserId: user._id };
              room.waitingList = [...room.waitingList, data];
              await room.save();
              socket.to(room.admin.socketId).emit("user-requested", room.waitingList);
            }
          } else {
            //if the room is public
            socket.join(roomId);
            socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
            socket.emit("all-users", [...room.users, { socketId: room.admin.socketId, ...room.admin.user }]);
            const id = user._id.length === 24 ? await userSchema.findById(user._id) : false;
            const data = id
              ? { socketId: socket.id, userId: user._id, firstname: user.firstname, lastname: user.lastname, img: user.img }
              : { socketId: socket.id, firstname: user.firstname, lastname: user.lastname, img: user.img, newUserId: user._id };
            room.users.push(data);
            await room.save();
          }
        }
        socket.on("disconnect", async () => {
          try {
            const index = room.users.findIndex((oldUser) => oldUser.socketId === socket.id);
            if (index !== -1) {
              const updatedUser = room.users[index].toObject();
              delete updatedUser.socketId;
              room.users = [...room.users.slice(0, index), updatedUser, ...room.users.slice(index + 1)];
              await room.save();
              socket.to(roomId).emit("user-disconnected", socket.id);
            }
            if (room.admin.socketId === socket.id) {
              (room.admin.socketId = ""), await room.save();
            }
          } catch (err) {
            console.log(err);
          }
        });
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("sending-signal", (payload) => {
      io.to(payload.userToSignal.socketId).emit("user-joined", { signal: payload.signal, user: payload.caller, callerID: socket.id });
    });

    socket.on("returning-signal", (payload) => {
      io.to(payload.caller).emit("receiving-returned-signal", { signal: payload.signal, id: socket.id });
    });

    socket.on("admit-user", async (payload) => {
      const { roomId, adminId, user } = payload;
      //check if room with current id exists
      try {
        const room = await roomSchema.findOne({ _id: roomId, "admin.user": adminId }).populate("admin.user", "firstname lastname _id img");

        if (room) {
          const objectRoom = room.toObject();
          io.sockets.connected[user.socketId].join(roomId);
          socket.to(roomId).emit("user-connected", `${user.firstname} has joined the room`);
          socket.to(user.socketId).emit("all-users", [...room.users, { socketId: objectRoom.admin.socketId, ...objectRoom.admin.user }]);
          room.users.push(user);
          const index = room.waitingList.findIndex((oldUser) => oldUser._id == user._id);
          room.waitingList = [...room.waitingList.slice(0, index), ...room.waitingList.slice(index + 1)];
          await room.save();
        } else {
          socket.to(roomId).emit("error", "Room not found");
        }
      } catch (error) {
        console.log(error);
      }
    });
    socket.on("decline-user", async (payload) => {
      const { roomId, adminId, user } = payload;
      //check if room with current id exists
      try {
        const room = await roomSchema.findOne({ _id: roomId, "admin.user": adminId }).populate("admin.user", "firstname lastname _id img");
        if (room) {
          socket.to(user.socketId).emit("call-end");
          const index = room.waitingList.findIndex((oldUser) => oldUser._id == user._id);
          room.waitingList = [...room.waitingList.slice(0, index), ...room.waitingList.slice(index + 1)];
          await room.save();
        } else {
          socket.to(roomId).emit("error", "Room not found");
        }
      } catch (error) {
        console.log(error);
      }
    });
    socket.on("subtitles", ({ roomId, subtitles, user }) => {
      socket.to(roomId).emit("text", { subtitles, user: user._id });
    });

    socket.on("send-message", ({ roomId, user, message }) => {
      io.in(roomId).emit("message", { user, message, createdAt: new Date() });
    });
    socket.on("mute-user", (userId) => {
      socket.to(userId).emit("mute");
    });
    socket.on("kick-out", async ({ socketId, roomID }) => {
      const room = await roomSchema.findById(roomID);
      if (room) {
        const index = room.users.findIndex((oldUser) => oldUser.socketId === socketId);
        room.users = [...room.users.slice(0, index), ...room.users.slice(index + 1)];
        await room.save();
        socket.to(socketId).emit("call-end");
      }
    });
    socket.on("end-call", async ({ roomId, userId }) => {
      try {
        const room = await roomSchema.findById(roomId);
        if (room && room.admin.user == userId) {
          await roomSchema.findByIdAndDelete(roomId);
          socket.to(roomId).broadcast.emit("call-end");
        }
        if (room) {
          const index = room.users.findIndex((oldUser) => oldUser._id === userId);
          room.users = [...room.users.slice(0, index), ...room.users.slice(index + 1)];
          await room.save();
        }
      } catch (error) {
        console.log(error);
      }
    });
  });
};
module.exports = createSocketServer;
