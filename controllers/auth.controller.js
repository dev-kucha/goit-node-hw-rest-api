const Joi = require("joi");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const { SENDGRID_API_KEY } = process.env;

const {
  registration,
  verifyEmail,
  enotherVerifyEmail,
  login,
  logout,
} = require("../service/authService");

const schema = Joi.object({
  password: Joi.string().min(1).max(60).required(),
  email: Joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ["com", "net"] },
  }),
  subscription: Joi.string(),
});

async function sendMail(email, verificationToken) {
  sgMail.setApiKey(SENDGRID_API_KEY);

  const validationUrl = `http://localhost:3000/api/users/verify/${verificationToken}`;

  const msg = {
    to: email,
    from: "ukucher@gmail.com",
    subject: "Please, verify you email address",
    html: `Please, open this link ${validationUrl} for verification you email address`,
    text: `Please, open this link ${validationUrl} for verification you email address`,
  };
  const response = await sgMail.send(msg);
  console.log("Email sent", response);
}

async function registrationController(req, res, next) {
  const { email, password, subscription } = req.body;

  const validationResult = schema.validate(req.body);
  if (validationResult.error) {
    console.log(validationResult.error);
    return res.status(400).json({
      message: validationResult.error.details,
    });
  }

  const registeredUser = await registration(email, password, subscription);
  // console.log(registeredUser);
  try {
    const { email, verificationToken } = registeredUser.user;
    sendMail(email, verificationToken);
  } catch (error) {
    console.error(error);
  }

  return res.status(201).json(registeredUser);
}

async function verifyEmailController(req, res, next) {
  const { verificationToken } = req.params;
  const response = await verifyEmail(verificationToken);
  // console.log("response", response);
  if (response) {
    return res.status(200).json({ message: "Verification successful" });
  }
}

async function requestEnotherVerifyController(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "missing required field email" });
  }

  const response = await enotherVerifyEmail(email);

  if (response) {
    const { email, verificationToken } = response;
    sendMail(email, verificationToken);
    return res.status(200).json({
      message: "Verification email sent",
    });
  }
}

async function loginController(req, res, next) {
  const { email, password } = req.body;
  const loginResult = await login(email, password);
  return res.json(loginResult);
}

async function logoutController(req, res, next) {
  const logoutResult = await logout(req.user);
  return res.status(204).json(logoutResult);
}

async function currentController(req, res, next) {
  const { email, subscription } = req.user;
  const currentUser = { email, subscription };
  return res.status(200).json(currentUser);
}

module.exports = {
  registrationController,
  requestEnotherVerifyController,
  verifyEmailController,
  loginController,
  logoutController,
  currentController,
};
