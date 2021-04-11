const { Schema } = require("mongoose");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    img: {
      type: String,
      required: true,
    },
    googleId: {
      type: String,
    },
    facebookId: {
      type: String,
    },
    refreshTokens: [{ token: { type: String, required: true } }],
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

UserSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return user;
    else return null;
  } else {
    return null;
  }
};
UserSchema.statics.changePassword = async function (userId, oldPassword, newPassword) {
  const user = await this.findById(userId);
  if (user) {
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (isMatch) {
      user.password = newPassword;
      user.save();
      return true;
    } else return false;
  } else {
    return false;
  }
};
UserSchema.pre("validate", async function (next) {
  const user = this;
  const plainPW = user.password;
  const google = user.googleId;
  const facebook = user.facebookId;
  google || facebook || plainPW ? next() : next(new Error("No password provided"));
});
UserSchema.pre("save", async function (next) {
  const user = this;
  const plainPW = user.password;

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(plainPW, 10);
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
