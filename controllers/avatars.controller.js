const jimp = require("jimp");
const path = require("path");
const { nanoid } = require("nanoid");

const { avatarUpdate } = require("../service/authService");

async function avatarTransform(fileName) {
  const source = path.join(__dirname, "../tmp");
  const destination = path.join(__dirname, "../public/avatars");
  const image = await jimp.read(`${source}/${fileName}`);
  const [name, extention] = fileName.split(".");
  await image.resize(250, 250);
  const newAvatarName = `${name}-${nanoid(6)}.${extention}`;
  const newAvatarPath = path.join(destination, newAvatarName);
  await image.writeAsync(newAvatarPath);
  return newAvatarName;
}

async function uploadController(req, res, next) {
  const newAvatarName = await avatarTransform(req.file.originalname);
  const newAvatarPath = path.join(req.headers.host, "/avatars/", newAvatarName);
  const result = await avatarUpdate(req.user, newAvatarPath);
  return res.json(result);
}

module.exports = {
  uploadController,
};
