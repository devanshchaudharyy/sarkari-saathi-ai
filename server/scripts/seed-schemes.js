import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { seedSchemes } from "../src/utils/seedSchemes.js";
try {
  await connectDB(env.MONGO_URI);
  console.log(`Seeded ${await seedSchemes()} reviewed schemes.`);
} catch (error) {
  console.error("Catalog seeding failed:", error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
