const { Schema } = require("mongoose");
const mongoose = require("mongoose");
const RoomSchema = new Schema(
  {
    admin: { _id: { type: Schema.Types.ObjectId, ref: "User", required: true }, socketId: { type: String } },
    users: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        newUserId: { type: String },
        firstname: { type: String },
        lastname: { type: String },
        img: { type: String },
        socketId: { type: String, required: true },
      },
    ],
    waitingList: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        newUserId: { type: String },
        firstname: { type: String },
        lastname: { type: String },
        img: { type: String },
        socketId: { type: String, required: true },
      },
    ],
    private: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", RoomSchema);
