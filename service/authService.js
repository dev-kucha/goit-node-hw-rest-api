const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const { nanoid } = require("nanoid");
require("dotenv").config();

const { JWT_SECRET } = process.env;

const User = require("../models/user.model");
const {
  NotFoundError,
  WrongParametersError,
  RegistrationConflictError,
  NotAuthorizedError,
} = require("../helpers/errors");

const registration = async (email, password, subscription = "starter") => {
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(password, salt);

  /*  */
  const gravatarUrl = gravatar.url(
    "email",
    {
      s: "100",
      r: "x",
      d: "retro",
    },
    true
  );
  // console.log(gravatarUrl);
  /*  */

  const verificationToken = nanoid();

  const user = new User({
    email,
    password: hashedPassword,
    subscription,
    avatarURL: gravatarUrl,
    verificationToken,
  });

  try {
    await user.save();
  } catch (error) {
    console.log(error.message);
    if (error.message.includes("duplicate key error collection")) {
      throw new RegistrationConflictError("Email in use");
    }

    throw RegistrationConflictError;
  }

  return {
    user: {
      email: email,
      subscription: subscription,
      verificationToken,
    },
  };
};

const verifyEmail = async (verificationToken) => {
  // console.log("service", verificationToken);
  const user = await User.findOne({ verificationToken });
  // console.log(user);

  if (!user) {
    throw new NotFoundError("VerificationToken is wrong");
  }

  if (user && !user.verify) {
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });

    return true;
  }
};

const enotherVerifyEmail = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new NotFoundError("User is not found");
  }

  if (user && user.verify) {
    throw new WrongParametersError("Verification has already been passed");
  }

  return user;
};

const login = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user || !user.verify) {
    throw new NotAuthorizedError("Email or password is wrong");
  }

  const isPasswordTheSame = await bcrypt.compare(password, user.password);
  if (!isPasswordTheSame) {
    throw new NotAuthorizedError("Email or password is wrong");
  }

  const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
    expiresIn: "15m",
  });

  user.token = token;
  await User.findByIdAndUpdate(user._id, user);
  return {
    token: user.token,
    user: {
      email: user.email,
      subscription: user.subscription,
    },
  };
};

const logout = async (user) => {
  user.token = null;
  await User.findByIdAndUpdate(user._id, user);

  return {
    ResponseBody: {
      message: "Not authorized",
    },
  };
};

const avatarUpdate = async (user, newAvatarPath) => {
  // console.log(user);
  user.avatarURL = newAvatarPath;
  // console.log(user);
  // console.log(newAvatarPath);
  await User.findByIdAndUpdate(user._id, user);
  return {
    status: "success",
    message: {
      avatarURL: newAvatarPath,
    },
  };
};

module.exports = {
  registration,
  verifyEmail,
  enotherVerifyEmail,
  login,
  logout,
  avatarUpdate,
};
