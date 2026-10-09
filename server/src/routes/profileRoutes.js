import { Router } from "express";
import auth from "../middleware/authMiddleware.js";
import { getProfile, saveProfile } from "../controllers/profileController.js";
const router = Router();
router.use(auth);
router.get("/", getProfile);
router.put("/", saveProfile);
export default router;
