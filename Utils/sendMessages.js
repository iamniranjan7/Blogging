


exports.errMessage = (msg, err, res, statusCode) => {
  this.statusCode = statusCode || 500;
  return res.status(this.statusCode).json({
    status: "failed",
    message: msg,
    err,
  });
};

exports.throwsError = (msg, statusCode) => {
  const error = new Error(msg);
  error.statusCode = statusCode || 500;
  error.st = error.stack;
  throw error;
};

exports.successMessage = (msg, result, res, statusCode) => {
  return res.status(statusCode).json({
    status: "success",
    message: msg,
    result,
  });
};

exports.noContent = (res, result) => {
  if (!result.length) {
    throwsError(`There's no content`, 204);
  }
};