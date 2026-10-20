import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import User from "../../server/src/models/User.js";
import StaffAccess from "../../server/src/models/StaffAccess.js";
import Scheme from "../../server/src/models/Scheme.js";
export async function removeCatalogFixture(slug) {
  if (!/^browser-review-\d+$/.test(slug))
    throw Error("Invalid synthetic draft slug");
  const local = parse(
    await readFile("server/.env.production", "utf8").catch(() => ""),
  );
  const uri = process.env.MONGO_URI || local.MONGO_URI;
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri || ""))
    throw Error("Fixture cleanup requires local MongoDB");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await Scheme.deleteOne({ slug, published: false });
  } finally {
    await mongoose.disconnect();
  }
}
export async function staffFixture(email, role) {
  if (!/^additions\.\d+@example\.com$/.test(email))
    throw Error("Staff fixtures require a synthetic additions account.");
  const local = parse(
      await readFile("server/.env.production", "utf8").catch(() => ""),
    ),
    uri = process.env.MONGO_URI || local.MONGO_URI;
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri || ""))
    throw Error("Staff browser fixtures may only use local test MongoDB.");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const user = await User.findOne({ email });
    if (!user) throw Error("Synthetic staff account not found.");
    await StaffAccess.init();
    if (role === "citizen") await StaffAccess.deleteOne({ user: user._id });
    else
      await StaffAccess.findOneAndUpdate(
        { user: user._id },
        { $set: { role } },
        { upsert: true, runValidators: true },
      );
  } finally {
    await mongoose.disconnect();
  }
}
