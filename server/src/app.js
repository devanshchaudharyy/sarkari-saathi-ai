import catalogRoutes from "./routes/catalogRoutes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import schemeRoutes from "./routes/schemeRoutes.js";
import eligibilityRoutes from "./routes/eligibilityRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import readinessRoutes from "./routes/readinessRoutes.js";
import { HttpError, errorMiddleware } from "./middleware/errorMiddleware.js";
import { readiness, requireDatabase } from "./middleware/availability.js";
import { mountClient } from "./middleware/client.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(
  cors({
    origin: (origin, callback) =>
      !origin || origin === env.CLIENT_URL
        ? callback(null, true)
        : callback(new HttpError(403, "Origin is not allowed.")),
  }),
);
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "SarkariSaathi API is running" }),
);
app.get("/api/ready", readiness);
app.use("/api", requireDatabase);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/catalog", catalogRoutes);
// An API miss must keep its JSON contract even when the client is also served.
app.use("/api", (req, res, next) =>
  next(new HttpError(404, "Endpoint not found.")),
);
if (env.SERVE_CLIENT) mountClient(app);
app.use((req, res, next) => next(new HttpError(404, "Endpoint not found.")));
app.use(errorMiddleware);
export default app;
