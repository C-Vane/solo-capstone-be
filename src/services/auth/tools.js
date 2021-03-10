const jwt = require("jsonwebtoken");
const User = require("../users/schema");

const authenticate = async (user) => {
  try {
    const newAccessToken = await generateJWT({ _id: user._id });
    const newRefreshToken = await generateRefreshJWT({ _id: user._id });

    user.refreshTokens = user.refreshTokens.concat({ token: newRefreshToken });
    await user.save();

    return { token: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new Error(error);
  }
};

const generateJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" }, (err, token) => {
      if (err) rej(err);
      res(token);
    })
  );

const verifyJWT = (token) =>
  new Promise((res, rej) =>
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) rej(err);
      res(decoded);
    })
  );

const generateRefreshJWT = (payload) =>
  new Promise((res, rej) =>
    jwt.sign(payload, process.env.REFRESH_JWT_SECRET, { expiresIn: "1 week" }, (err, token) => {
      if (err) rej(err);
      res(token);
    })
  );

const verifyRefreshToken = (token) =>
  new Promise((res, rej) =>
    jwt.verify(token, process.env.REFRESH_JWT_SECRET, (err, decoded) => {
      if (err) rej(err);
      res(decoded);
    })
  );

const refreshToken = async (oldRefreshToken) => {
  const decoded = await verifyRefreshToken(oldRefreshToken);

  const user = await User.findOne({ _id: decoded._id });

  if (!user) {
    throw new Error(`Access is forbidden`);
  }
  const currentRefreshToken = user.refreshTokens.find((t) => t.token === oldRefreshToken);

  if (!currentRefreshToken) {
    throw new Error(`Refresh token is wrong`);
  }

  const newAccessToken = await generateJWT({ _id: user._id });
  const newRefreshToken = await generateRefreshJWT({ _id: user._id });

  const newRefreshTokens = user.refreshTokens.filter((t) => t.token !== oldRefreshToken).concat({ token: newRefreshToken });

  user.refreshTokens = [...newRefreshTokens];

  await user.save();

  return { token: newAccessToken, refreshToken: newRefreshToken };
};

module.exports = { authenticate, verifyJWT, refreshToken };
