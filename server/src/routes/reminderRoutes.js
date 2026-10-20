import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import Reminder from "../models/Reminder.js";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  parseInput,
  versionInput,
  slugSchema,
  noQuery,
  conflict,
} from "../utils/input.js";
import { REMINDER_KINDS, reminderState } from "../../../shared/reminders.js";
import { todayInIndia, validDay } from "../../../shared/applications.js";
const router = Router(),
  day = z
    .string()
    .refine(
      (value) =>
        validDay(value) && value >= "1900-01-01" && value <= "2100-12-31",
    );
const safe = (row) => ({
  id: String(row._id),
  slug: row.slug,
  name: row.name,
  acronym: row.acronym,
  kind: row.kind,
  dueOn: row.dueOn,
  completedAt: row.completedAt,
  revision: row.revision,
  status: reminderState(row, todayInIndia()),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
router.use(auth);
router.get("/summary", async (req, res) => {
  noQuery(req);
  res.json({
    success: true,
    due: await Reminder.countDocuments({
      user: req.user._id,
      completedAt: null,
      dueOn: { $lte: todayInIndia() },
    }),
  });
});
router.get("/", async (req, res) => {
  noQuery(req);
  const rows = await Reminder.find({ user: req.user._id })
    .sort({ dueOn: 1, slug: 1, kind: 1 })
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
router.put("/:slug/:kind", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug),
    kind = parseInput(
      z.enum(REMINDER_KINDS.map((item) => item.value)),
      req.params.kind,
    ),
    { dueOn } = parseInput(
      z.strictObject({ dueOn: day.refine((value) => value >= todayInIndia()) }),
      req.body,
    );
  const scheme = await Scheme.findOne({ slug }).lean();
  if (!scheme)
    throw new HttpError(404, "Scheme not found in the current catalog.");
  let row;
  try {
    row = await Reminder.findOneAndUpdate(
      { user: req.user._id, slug, kind },
      {
        $setOnInsert: {
          user: req.user._id,
          slug,
          kind,
          dueOn,
          name: scheme.name,
          acronym: scheme.acronym,
          completedAt: null,
          revision: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true, timestamps: false },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    row = await Reminder.findOne({ user: req.user._id, slug, kind });
    if (!row) throw error;
  }
  res.json({ success: true, entry: safe(row) });
});
router.patch("/:id", async (req, res) => {
  noQuery(req);
  const id = parseInput(versionInput.id, req.params.id),
    input = parseInput(
      z.strictObject({
        revision: versionInput.revision,
        dueOn: day,
        completed: z.boolean(),
      }),
      req.body,
    );
  const current = await Reminder.findOne({
    _id: id,
    user: req.user._id,
  }).lean();
  if (!current) throw new HttpError(404, "Reminder not found.");
  if (input.dueOn !== current.dueOn && input.dueOn < todayInIndia())
    throw new HttpError(
      400,
      "Choose today or a future date when rescheduling.",
    );
  const row = await Reminder.findOneAndUpdate(
    { _id: id, user: req.user._id, revision: input.revision },
    {
      $set: {
        dueOn: input.dueOn,
        completedAt: input.completed ? current.completedAt || new Date() : null,
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!row) throw conflict();
  res.json({ success: true, entry: safe(row) });
});
router.delete("/:id", async (req, res) => {
  noQuery(req);
  const id = parseInput(versionInput.id, req.params.id),
    { revision } = parseInput(
      z.strictObject({ revision: versionInput.revision }),
      req.body,
    );
  const row = await Reminder.findOneAndDelete({
    _id: id,
    user: req.user._id,
    revision,
  });
  if (!row) {
    if (await Reminder.exists({ _id: id, user: req.user._id }))
      throw conflict();
    throw new HttpError(404, "Reminder not found.");
  }
  res.json({ success: true, removedId: id });
});
export default router;
