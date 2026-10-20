import mongoose from "mongoose";
import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import User from "./src/models/User.js";
import Profile from "./src/models/Profile.js";
import Scheme from "./src/models/Scheme.js";
import SavedScheme from "./src/models/SavedScheme.js";
import { assertClientBuild } from "./src/middleware/client.js";
import { createShutdown } from "./src/lifecycle.js";
try {
  if (env.SERVE_CLIENT) assertClientBuild();
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
  const stop = createShutdown({
    app,
    server,
    disconnect: () => mongoose.disconnect(),
  });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(
    "Startup failed:",
    error.code === "CLIENT_BUILD_MISSING" ? error.message : error.name,
  );
  process.exit(1);
}
