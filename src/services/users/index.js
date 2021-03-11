const express = require("express");

const UserSchema = require("./schema");

const usersRouter = express.Router();

const { authorize } = require("../auth/middleware");

const { authenticate, refreshToken } = require("../auth/tools");

const passport = require("passport");

//GOOGLE LOG IN

usersRouter.get("/googleLogin", passport.authenticate("google", { scope: ["profile", "email"] }));

usersRouter.get("/googleRedirect", passport.authenticate("google"), async (req, res, next) => {
  try {
    res.cookie("token", req.user.tokens.token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.cookie("refreshToken", req.user.tokens.refreshToken, {
      httpOnly: true,
      path: "/users/refreshToken",
      sameSite: "none",
      secure: true,
    });

    res.status(200).redirect(process.env.FE_PROD_URL || process.env.FE_DEV_URL);
  } catch (error) {
    next(error);
  }
});
//FACEBOOK LOG IN
usersRouter.get("/facebookLogin", passport.authenticate("facebook", { scope: ["public_profile", "email"] }));

usersRouter.get("/facebookRedirect", passport.authenticate("facebook"), async (req, res, next) => {
  try {
    res.cookie("token", req.user.tokens.token, {
      httpOnly: true,
    });
    res.cookie("refreshToken", req.user.tokens.refreshToken, {
      httpOnly: true,
      path: "/users/refreshToken",
    });
    res.status(200).redirect(process.env.FE_PROD_URL || process.env.FE_DEV_URL);
  } catch (error) {
    next(error);
  }
});
usersRouter.post("/register", async (req, res, next) => {
  try {
    const newUser = new UserSchema({ img: "https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg", ...req.body });
    const { _id } = await newUser.save();
    if (_id) {
      res.status(201).send({ _id });
    } else {
      res.status(400).send({ errorCode: "wrong_credentials" });
    }
  } catch (error) {
    res.status(400).send({
      message: error.message,
      errorCode: "wrong_credentials",
    });
  }
});

usersRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserSchema.findByCredentials(email, password);
    if (user) {
      const tokens = await authenticate(user);
      res.cookie("token", tokens.token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        path: "/users/refreshToken",
        sameSite: "none",
        secure: true,
      });
      res.status(201).send({ ok: true });
    } else {
      const err = new Error("User with email and password not found");
      err.httpStatusCode = 401;
      next(err);
    }
  } catch (error) {
    res.status(401).send({
      message: error.message,
      errorCode: "wrong_credentials",
    });
  }
});

usersRouter.post("/logOut", authorize, async (req, res, next) => {
  try {
    if (req.token) {
      req.user.refreshTokens = req.user.refreshTokens.filter((t) => t.token !== req.token);
      await req.user.save();
      res.cookie("token", "", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.cookie("refreshToken", "", {
        httpOnly: true,
        path: "/users/refreshToken",
        sameSite: "none",
        secure: true,
      });
      res.status(201).send({ ok: true });
    } else {
      const err = new Error("Token not provided");
      err.httpStatusCode = 401;
      next(err);
    }
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/logOutAll", authorize, async (req, res, next) => {
  try {
    req.user.refreshTokens = [];
    await req.user.save();
    res.status(201).send({ ok: true });
  } catch (error) {
    next(error);
  }
});
usersRouter.post("/refreshToken", async (req, res, next) => {
  const oldRefreshToken = req.cookies.refreshToken;
  if (!oldRefreshToken) {
    const err = new Error("Refresh token missing");
    err.httpStatusCode = 400;
    next(err);
  } else {
    try {
      const newTokens = await refreshToken(oldRefreshToken);
      if (newTokens) {
        res.cookie("token", newTokens.token, {
          httpOnly: true,
        });
        res.cookie("refreshToken", newTokens.refreshToken, {
          httpOnly: true,
          path: "/users/refreshToken",
        });
        res.status(201).send({ ok: true });
      } else {
        const err = new Error("Provided refresh tocken is incorrect");
        err.httpStatusCode = 403;
        next(err);
      }
    } catch (error) {
      next(error);
    }
  }
});

module.exports = usersRouter;
