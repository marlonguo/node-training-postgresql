const { validate: uuidValidate } = require("uuid");

function isUndefined(value) {
  return value === undefined;
}

function isNotValidSting(value) {
  return typeof value !== "string" || value.trim().length === 0 || value === "";
}

function isNotValidInteger(value) {
  return typeof value !== "number" || value < 0 || value % 1 !== 0;
}

function isNotValidUUID(value) {
  return !uuidValidate(value);
}

function isNotValidPassword(value) {
  const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/;
  return !passwordPattern.test(value);
}

function isNotValidImageURL(url) {
  return !/\.(jpg|png)$/i.test(url);
}

function isNotValidUserName(value) {
  return !/^[a-zA-Z0-9]{2,10}$/.test(value);
}

function isNotValidEmail(value) {
  return !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}
module.exports = {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidPassword,
  isNotValidImageURL,
  isNotValidUserName,
  isNotValidEmail,
};
