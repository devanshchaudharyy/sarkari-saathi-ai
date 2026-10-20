import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import StaffAccess from "../src/models/StaffAccess.js";
const { values } = parseArgs({
  options: { email: { type: "string" }, role: { type: "string" } },
});
if (!values.email || !["editor", "admin", "citizen"].includes(values.role))
  throw Error(
    "Usage: npm run catalog:role -- --email existing@example.com --role editor|admin|citizen",
  );
try {
  await connectDB(env.MONGO_URI);
  const user = await User.findOne({ email: values.email.trim().toLowerCase() });
  if (!user) throw Error("Existing account not found; no account was created.");
  await StaffAccess.init();
  if (values.role === "citizen")
    await StaffAccess.deleteOne({ user: user._id });
  else
    await StaffAccess.findOneAndUpdate(
      { user: user._id },
      { $set: { role: values.role } },
      { upsert: true, runValidators: true },
    );
  console.log("Catalog access updated. Sign in again or reload the workspace.");
} finally {
  await mongoose.disconnect();
}
