import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import Application from "../models/Application.js";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  slugSchema,
  versionInput,
  parseInput,
  noQuery,
  conflict,
} from "../utils/input.js";
import {
  APPLICATION_STATUSES,
  validDay,
  todayInIndia,
} from "../../../shared/applications.js";
const router = Router();
const safe = (row) => ({
  id: String(row._id),
  slug: row.slug,
  name: row.name,
  acronym: row.acronym,
  status: row.status,
  revision: row.revision,
  events: row.events.map(({ status, occurredOn, recordedAt }) => ({
    status,
    occurredOn,
    recordedAt,
  })),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
router.use(auth);
router.get("/", async (req, res) => {
  noQuery(req);
  const rows = await Application.find({ user: req.user._id })
    .sort({ updatedAt: -1, slug: 1 })
    .lean();
  res.json({ success: true, entries: rows.map(safe) });
});
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 90,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many updates. Wait a minute and try again.",
    },
  }),
);
router.put("/:slug", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug);
  parseInput(z.strictObject({}), req.body ?? {});
  const scheme = await Scheme.findOne({ slug }).lean();
  if (!scheme)
    throw new HttpError(404, "Scheme not found in the current catalog.");
  let row;
  try {
    row = await Application.findOneAndUpdate(
      { user: req.user._id, slug },
      {
        $setOnInsert: {
          user: req.user._id,
          slug,
          name: scheme.name,
          acronym: scheme.acronym,
          status: "preparing",
          revision: 0,
          events: [
            {
              status: "preparing",
              occurredOn: todayInIndia(),
              recordedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, timestamps: false },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    row = await Application.findOne({ user: req.user._id, slug });
    if (!row) throw error;
  }
  res.json({ success: true, entry: safe(row) });
});
router.patch("/:slug", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug);
  const input = parseInput(
    z.strictObject({
      ...versionInput,
      status: z.enum(APPLICATION_STATUSES.map((item) => item.value)),
      occurredOn: z
        .string()
        .refine(
          (value) =>
            validDay(value) && value >= "1900-01-01" && value <= todayInIndia(),
        ),
    }),
    req.body,
  );
  const row = await Application.findOneAndUpdate(
    {
      _id: input.id,
      user: req.user._id,
      slug,
      revision: input.revision,
      "events.99": { $exists: false },
    },
    {
      $set: { status: input.status },
      $push: {
        events: {
          status: input.status,
          occurredOn: input.occurredOn,
          recordedAt: new Date(),
        },
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!row) {
    const current = await Application.findOne({
      user: req.user._id,
      slug,
    }).lean();
    if (!current) throw new HttpError(404, "Tracked application not found.");
    if (current.events.length >= 100)
      throw new HttpError(
        409,
        "This timeline has reached its 100-event limit.",
      );
    throw conflict();
  }
  res.json({ success: true, entry: safe(row) });
});
router.delete("/:slug", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug),
    input = parseInput(z.strictObject(versionInput), req.body);
  const row = await Application.findOneAndDelete({
    _id: input.id,
    user: req.user._id,
    slug,
    revision: input.revision,
  });
  if (!row) {
    if (await Application.exists({ user: req.user._id, slug }))
      throw conflict();
    throw new HttpError(404, "Tracked application not found.");
  }
  res.json({ success: true, removedId: input.id });
});
export default router;
