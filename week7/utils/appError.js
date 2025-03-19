function appError(statusCode, errMessage) {
  const error = new Error(errMessage);
  error.statusCode = statusCode;
  return error;
}

module.exports = appError;
