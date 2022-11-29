const Joi = require("joi");
const sgMail = require("@sendgrid/mail");
require("dotenv").config();
const { SENDGRID_API_KEY } = process.env;

const {
  registration,
  verifyEmail,
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
  const { verificationToken } = req.query;
  verifyEmail(verificationToken);
  console.log("controller", verificationToken);
  return res.json({ ok: true });
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
  verifyEmailController,
  loginController,
  logoutController,
  currentController,
};
