export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.code === 11000 ? 409 : error.status || 500;
  const message =
    error.code === 11000
      ? "An account with this email already exists."
      : status >= 500
        ? "Something went wrong. Please try again later."
        : error.type === "entity.parse.failed"
          ? "Invalid JSON request."
          : error.message;
  if (status >= 500) console.error("Request failed:", error.name);
  res.status(status).json({ success: false, message });
}
