import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import StaffAccess from "../models/StaffAccess.js";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  parseInput,
  slugSchema,
  versionInput,
  noQuery,
  conflict,
} from "../utils/input.js";
import { catalogInput, searchTextFor } from "../domain/catalogInput.js";
import { catalogData, CATALOG_FIELDS } from "../../../shared/catalog.js";
const router = Router();
const safe = (row) => ({
  id: String(row._id),
  slug: row.slug,
  name: row.name,
  published: row.published !== false,
  revision: row.editorialRevision || 0,
  draft: row.editorialDraft || null,
  current: catalogData(row),
  history: (row.editorialHistory || []).map(
    ({ action, at, revision, actor }) => ({
      action,
      at,
      revision,
      actor: String(actor),
    }),
  ),
  screeningSuspended: !!row.screeningSuspended,
});
const revisionFilter = (revision) =>
  revision === 0
    ? {
        $or: [
          { editorialRevision: 0 },
          { editorialRevision: { $exists: false } },
        ],
      }
    : { editorialRevision: revision };
router.use(auth);
router.get("/access", async (req, res) => {
  noQuery(req);
  const access = await StaffAccess.findOne({ user: req.user._id }).lean();
  res.json({ success: true, role: access?.role || "citizen" });
});
router.use(async (req, res, next) => {
  const access = await StaffAccess.findOne({ user: req.user._id }).lean();
  if (!access)
    throw new HttpError(403, "Catalog editing requires staff access.");
  req.catalogRole = access.role;
  next();
});
router.get("/", async (req, res) => {
  noQuery(req);
  res.json({
    success: true,
    role: req.catalogRole,
    entries: (await Scheme.find().sort({ name: 1, slug: 1 }).lean()).map(safe),
  });
});
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many catalog changes. Wait a minute and try again.",
    },
  }),
);
router.post("/", async (req, res) => {
  noQuery(req);
  const data = parseInput(catalogInput, req.body);
  if (await Scheme.exists({ slug: data.slug }))
    throw new HttpError(
      409,
      "This scheme slug already exists. Edit its draft instead.",
    );
  let row;
  try {
    row = await Scheme.create({
      ...data,
      searchText: searchTextFor(data),
      published: false,
      editorialRevision: 0,
      editorialDraft: data,
      screeningSuspended: true,
      readinessSuspended: true,
      editorialHistory: [
        {
          action: "draft_created",
          actor: req.user._id,
          revision: 0,
          at: new Date(),
        },
      ],
    });
  } catch (error) {
    if (error.code === 11000)
      throw new HttpError(
        409,
        "This scheme slug already exists. Edit its draft instead.",
      );
    throw error;
  }
  res.status(201).json({ success: true, entry: safe(row) });
});
router.patch("/:slug", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug),
    input = parseInput(
      z.strictObject({ ...versionInput, data: catalogInput }),
      req.body,
    );
  if (input.data.slug !== slug)
    throw new HttpError(400, "A scheme slug cannot be renamed.");
  const row = await Scheme.findOneAndUpdate(
    {
      _id: input.id,
      slug,
      ...revisionFilter(input.revision),
      "editorialHistory.99": { $exists: false },
    },
    {
      $set: { editorialDraft: input.data },
      $inc: { editorialRevision: 1 },
      $push: {
        editorialHistory: {
          action: "draft_saved",
          actor: req.user._id,
          revision: input.revision + 1,
          at: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!row) throw conflict();
  res.json({ success: true, entry: safe(row) });
});
router.post("/:slug/:action", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug),
    action = parseInput(
      z.enum(["publish", "archive", "discard"]),
      req.params.action,
    ),
    input = parseInput(
      z.strictObject({ ...versionInput, confirmed: z.literal(true) }),
      req.body,
    );
  if (action !== "discard" && req.catalogRole !== "admin")
    throw new HttpError(
      403,
      "Publishing and archiving require administrator access.",
    );
  const current = await Scheme.findOne({
    _id: input.id,
    slug,
    ...revisionFilter(input.revision),
  }).lean();
  if (!current) throw conflict();
  let change;
  if (action === "publish") {
    if (!current.editorialDraft)
      throw new HttpError(400, "Save a valid draft before publishing.");
    const data = parseInput(catalogInput, current.editorialDraft);
    change = {
      ...data,
      searchText: searchTextFor(data),
      published: true,
      editorialDraft: null,
      screeningSuspended: true,
      readinessSuspended: true,
    };
  } else if (action === "archive") change = { published: false };
  else change = { editorialDraft: null };
  const row = await Scheme.findOneAndUpdate(
    {
      _id: input.id,
      slug,
      ...revisionFilter(input.revision),
      "editorialHistory.99": { $exists: false },
    },
    {
      $set: change,
      $inc: { editorialRevision: 1 },
      $push: {
        editorialHistory: {
          action,
          actor: req.user._id,
          revision: input.revision + 1,
          at: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!row) throw conflict();
  res.json({ success: true, entry: safe(row) });
});
export default router;
