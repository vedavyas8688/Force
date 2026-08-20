export function errorHandler(err, req, res, next) {
  console.error(err);

  // Mongoose duplicate key (e.g. unique email per org)
  if (err.code === 11000) {
    return res.status(409).json({ error: "Duplicate value", details: err.keyValue });
  }

  const status = err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV !== "development"
      ? "Internal server error"
      : err.message;

  res.status(status).json({ error: message });
}
