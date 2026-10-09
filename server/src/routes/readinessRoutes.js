import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import auth from "../middleware/authMiddleware.js";
import {
  getReadiness,
  saveScheme,
  updateReadiness,
  removeScheme,
} from "../controllers/readinessController.js";
const router = Router();
router.use(auth);
router.get("/", getReadiness);
router.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many readiness updates. Wait a minute and try again.",
    },
  }),
);
router.put("/:slug", saveScheme);
router.patch("/:slug", updateReadiness);
router.delete("/:slug", removeScheme);
export default router;
