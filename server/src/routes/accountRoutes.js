import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import auth from "../middleware/authMiddleware.js";
import * as controller from "../controllers/accountController.js";
const router = Router();
const limiter = (limit) =>
  rateLimit({
    windowMs: 900000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res
        .status(429)
        .json({
          success: false,
          message: "Too many attempts. Please try again in 15 minutes.",
        }),
  });
const requests = limiter(6),
  actions = limiter(20),
  destructive = limiter(10);
router.get("/capabilities", controller.capabilities);
router.post("/request-reset", requests, controller.requestReset);
router.post("/reset-password", actions, controller.resetPassword);
router.post("/verify-email", actions, controller.verifyEmail);
router.use(auth);
router.get("/", controller.status);
router.post("/request-verification", requests, controller.requestVerification);
router.delete("/profile", destructive, controller.deleteProfile);
router.delete("/", destructive, controller.deleteAccount);
export default router;
