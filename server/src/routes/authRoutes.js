import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register, login, me } from "../controllers/authController.js";
import auth from "../middleware/authMiddleware.js";
const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many attempts. Please try again in 15 minutes.",
    }),
});
router.post("/register", limiter, register);
router.post("/login", limiter, login);
router.get("/me", auth, me);
export default router;
