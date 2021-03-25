const express = require("express");

const { authorize } = require("../auth/middleware");

const roomSchema = require("./schema");

const roomsRouter = express.Router();

roomsRouter.post("/", authorize, async (req, res, next) => {
  try {
    const newRoom = new roomSchema({ admin: { _id: req.user._id } });
    const { _id } = await newRoom.save();
    if (_id) res.status(201).send({ _id });
    else {
      const err = new Error("Wrong request");
      err.status = 401;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

roomsRouter.post("/join", async (req, res, next) => {
  try {
  } catch (error) {}
});

roomsRouter.get("/:roomId", async (req, res, next) => {
  try {
    const room = await roomSchema.findById(req.params.roomId);
    if (room) {
      res.status(200).send(room);
    } else {
      const err = new Error("Room not found");
      err.status = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});
roomsRouter.delete("/:roomId", authorize, async (req, res, next) => {
  try {
    const room = await roomSchema.findByIdAndDelete(req.params.roomId);
    if (room) {
      res.status(200).send("Deleted");
    } else {
      const err = new Error("Room not found");
      err.status = 404;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = roomsRouter;
