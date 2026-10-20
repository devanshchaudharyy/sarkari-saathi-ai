import { Router } from "express";
import { getScheme, listSchemes } from "../controllers/schemeController.js";
import { getDocuments } from "../controllers/documentController.js";
const router = Router();
router.get("/", listSchemes);
router.get("/:slug/documents", getDocuments);
router.get("/:slug", getScheme);
export default router;
