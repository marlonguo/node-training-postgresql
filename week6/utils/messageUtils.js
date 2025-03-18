function successMessage(res, statusCode, status, data) {
  if (data === undefined) {
    return res.status(statusCode).json({ status });
  } else {
    return res.status(statusCode).json({ status, data });
  }
}

function errorMessage(res, statusCode, status, message) {
  return res.status(statusCode).json({ status, message });
}

module.exports = {
  successMessage,
  errorMessage,
};
