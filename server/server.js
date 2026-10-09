import mongoose from "mongoose";
import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import User from "./src/models/User.js";
import Profile from "./src/models/Profile.js";
import Scheme from "./src/models/Scheme.js";
import SavedScheme from "./src/models/SavedScheme.js";
try {
  await connectDB(env.MONGO_URI);
  await Promise.all([
    User.init(),
    Profile.init(),
    Scheme.init(),
    SavedScheme.init(),
  ]);
  const server = app.listen(env.PORT, () =>
    console.log(`SarkariSaathi API ready at http://localhost:${env.PORT}`),
  );
  server.on("error", (error) => {
    console.error("Server could not start:", error.code);
    mongoose.disconnect().finally(() => process.exit(1));
  });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => process.exit(1), 10000);
    timer.unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timer);
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error("Startup failed:", error.name);
  process.exit(1);
}
