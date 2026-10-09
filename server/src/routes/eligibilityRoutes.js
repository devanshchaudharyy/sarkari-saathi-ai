import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import auth from "../middleware/authMiddleware.js";
import {
  getEligibility,
  checkEligibility,
} from "../controllers/eligibilityController.js";
const router = Router();
router.use(auth);
router.get("/", getEligibility);
router.post(
  "/",
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message:
        "Too many screening requests. Please wait a minute and try again.",
    },
  }),
  checkEligibility,
);
export default router;
