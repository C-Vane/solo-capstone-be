const router = require("express").Router();
const users = require("./users/index");
const rooms = require("./rooms/index");
router.use("/users", users);
router.use("/room", rooms);
module.exports = router;
