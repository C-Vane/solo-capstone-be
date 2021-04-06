require("dotenv").config();

const express = require("express");

const cors = require("cors");

const { join } = require("path");

const listEndpoints = require("express-list-endpoints");

const mongoose = require("mongoose");

const createSocketServer = require("./socket");

const { ExpressPeerServer } = require("peer");

const servicesRouter = require("./services");

const { notFoundHandler, forbiddenHandler, badRequestHandler, genericErrorHandler, wrongCredentials } = require("./tools/errorHandlers");

const passport = require("passport");

const oauth = require("./services/auth/oauth");

const cookieParser = require("cookie-parser");

const server = express();

const httpServer = require("http").Server(server);

//socket  server
const io = require("socket.io")(httpServer);
createSocketServer(io);

const port = process.env.PORT || 3000;

const staticFolderPath = join(__dirname, "../public");

server.use(express.static(staticFolderPath));

server.use(express.json());

server.use(cookieParser());

const whitelist = [process.env.FE_URL, process.env.PROD_URL];

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

server.use(cors(corsOptions));

//oAuth
server.use(passport.initialize());

//test
server.get("/test", (req, res) => {
  res.status(200).send({ message: "Test success" });
});

//services
server.use("/", servicesRouter);

// ERROR HANDLERS MIDDLEWARES

server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(forbiddenHandler);
server.use(wrongCredentials);
server.use(genericErrorHandler);

console.log(listEndpoints(server));

if (process.env.TEST_ENV !== "testing") {
  mongoose
    .connect(process.env.MONGO_CONNECTION + "/VideoChat", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(
      server.listen(port, () => {
        console.log("Running on port", port);
      })
    )
    .catch((err) => console.log(err));
}

module.exports = server;
