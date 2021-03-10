const express = require("express");
const cors = require("cors");
const { join } = require("path");
const listEndpoints = require("express-list-endpoints");
const mongoose = require("mongoose");
const http = require("http");
//const createSocketServer = require("./socket");

const servicesRouter = require("./services");

const { notFoundHandler, forbiddenHandler, badRequestHandler, genericErrorHandler } = require("./tools/errorHandlers");

const passport = require("passport");

const oauth = require("./services/auth/oauth");

const cookieParser = require("cookie-parser");

const server = express();
const httpServer = http.createServer(server);
//createSocketServer(httpServer);

const port = process.env.PORT || 3001;

const staticFolderPath = join(__dirname, "../public");

server.use(express.static(staticFolderPath));

server.use(express.json());

server.use(cookieParser());

const whitelist = [process.env.FE_URL];

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

server.use(passport.initialize());

server.use("/", servicesRouter);

// ERROR HANDLERS MIDDLEWARES

server.use(badRequestHandler);
server.use(notFoundHandler);
server.use(forbiddenHandler);
server.use(genericErrorHandler);

console.log(listEndpoints(server));

mongoose
  .connect(process.env.MONGO_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(
    httpServer.listen(port, () => {
      console.log("Running on port", port);
    })
  )
  .catch((err) => console.log(err));
