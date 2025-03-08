const { validate: uuidValidate } = require("uuid");

const headers = {
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Length, X-Requested-With",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, POST, GET,OPTIONS,DELETE",
  "Content-Type": "application/json",
};

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

function errorMessage(res, status, statusCode, message) {
  res.writeHead(statusCode, headers);
  res.write(
    JSON.stringify({
      status,
      message,
    })
  );
  res.end();
}

function successMessage(res, data) {
  res.writeHead(200, headers);
  if (data === undefined) {
    res.write(
      JSON.stringify({
        status: "success",
      })
    );
  } else {
    res.write(
      JSON.stringify({
        status: "success",
        data,
      })
    );
  }
  res.end();
}

module.exports = {
  isUndefined,
  isNotValidSting,
  isNotValidInteger,
  isNotValidUUID,
  errorMessage,
  successMessage,
};
