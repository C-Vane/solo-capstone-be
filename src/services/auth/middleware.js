const UserModel = require("../users/schema");
const { verifyJWT } = require("./tools");

const authorize = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    const decoded = await verifyJWT(token);
    const user = await UserModel.findOne({
      _id: decoded._id,
    });

    if (!user) {
      const err = new Error("User not Found");
      err.httpStatusCode = 404;
      next(err);
    }
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    const err = new Error("Please authenticate");
    err.httpStatusCode = 401;
    next(err);
  }
};

const adminOnlyMiddleware = async (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else {
    const err = new Error("Only for admins!");
    err.httpStatusCode = 403;
    next(err);
  }
};

module.exports = { authorize, adminOnlyMiddleware };
