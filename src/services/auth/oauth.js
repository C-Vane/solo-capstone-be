const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const UserModel = require("../users/schema");
const { authenticate } = require("./tools");

passport.use(
  "facebook",
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: process.env.FACEBOOK_REDIRECT,
      profileFields: ["email", "first_name", "last_name", "gender", "link"],
    },
    async (request, accessToken, refreshToken, profile, next) => {
      const newUser = {
        facebookId: profile.id,
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        email: profile.emails[0].value || "",
        img: "https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg",
      };

      try {
        const user = await UserModel.findOne({ $or: [{ facebookId: profile.id }, { email: newUser.email }] });
        if (user) {
          const tokens = await authenticate(user);
          next(null, { user, tokens });
        } else {
          const createdUser = new UserModel(newUser);
          const savedUser = await createdUser.save();
          const tokens = await authenticate(savedUser);
          next(null, { user: savedUser, tokens });
        }
      } catch (error) {
        next(error);
      }
    }
  )
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (request, accessToken, refreshToken, profile, next) => {
      const newUser = {
        googleId: profile.id,
        firstname: profile.name.givenName,
        lastname: profile.name.familyName,
        email: profile.emails[0].value,
        img: "https://thumbs.dreamstime.com/b/default-avatar-profile-trendy-style-social-media-user-icon-187599373.jpg",
      };

      try {
        const user = await UserModel.findOne({ $or: [{ googleId: profile.id }, { email: newUser.email }] });

        if (user) {
          const tokens = await authenticate(user);
          next(null, { user, tokens });
        } else {
          const createdUser = new UserModel(newUser);
          const savedUser = await createdUser.save();
          const tokens = await authenticate(savedUser);
          next(null, { user: savedUser, tokens });
        }
      } catch (error) {
        console.log(error);
        next(error);
      }
    }
  )
);

passport.serializeUser(function (user, next) {
  next(null, user);
});
