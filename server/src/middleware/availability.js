import mongoose from "mongoose";
const unavailable = (res) =>
  res
    .status(503)
    .set("Retry-After", "5")
    .json({
      success: false,
      message: "Service temporarily unavailable. Please try again shortly.",
    });
export function requireDatabase(req, res, next) {
  if (req.app.locals.draining || mongoose.connection.readyState !== 1)
    return unavailable(res);
  next();
}
export async function readiness(req, res) {
  if (req.app.locals.draining || mongoose.connection.readyState !== 1)
    return unavailable(res);
  try {
    await mongoose.connection.db
      .admin()
      .command({ ping: 1 }, { timeoutMS: 1500 });
    if (req.app.locals.draining) return unavailable(res);
    res.json({ success: true, message: "SarkariSaathi API is ready" });
  } catch {
    unavailable(res);
  }
}
