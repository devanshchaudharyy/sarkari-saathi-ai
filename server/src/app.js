import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import schemeRoutes from "./routes/schemeRoutes.js";
import eligibilityRoutes from "./routes/eligibilityRoutes.js";
import readinessRoutes from "./routes/readinessRoutes.js";
import { HttpError, errorMiddleware } from "./middleware/errorMiddleware.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
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
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/readiness", readinessRoutes);
app.use((req, res, next) => next(new HttpError(404, "Endpoint not found.")));
app.use(errorMiddleware);
export default app;
