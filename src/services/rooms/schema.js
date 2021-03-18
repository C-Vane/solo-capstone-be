const { Schema } = require("mongoose");
const mongoose = require("mongoose");
const RoomSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    users: [{ type: String, required: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", RoomSchema);
