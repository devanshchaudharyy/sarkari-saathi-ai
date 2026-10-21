import { Router } from "express";
import { z } from "zod";
import auth from "../middleware/authMiddleware.js";
import Scheme from "../models/Scheme.js";
import SavedScheme from "../models/SavedScheme.js";
import { noQuery, parseInput, slugSchema, conflict } from "../utils/input.js";
import { reliabilityFor, publicUpdate } from "../../../shared/reliability.js";
import { todayInIndia } from "../../../shared/applications.js";
import { HttpError } from "../middleware/errorMiddleware.js";
const router = Router();
router.use(auth);
router.get("/", async (req, res) => {
  noQuery(req);
  const saved = await SavedScheme.find({ user: req.user._id }).lean();
  const schemes = await Scheme.find({ slug: { $in: saved.map((s) => s.slug) } })
    .select(
      "slug name acronym officialUrl reviewedAt nextReviewAt sourceReview publicUpdateRevision publicUpdates reviewedSourceVersion published",
    )
    .lean();
  const entries = schemes
    .map((row) => {
      const own = saved.find((s) => s.slug === row.slug),
        updates = (row.publicUpdates || []).map(publicUpdate),
        seen = own.noticeReadRevision || 0;
      return {
        slug: row.slug,
        name: row.name,
        acronym: row.acronym,
        available: row.published !== false,
        officialUrl: row.officialUrl,
        saveId: String(own._id),
        seenRevision: seen,
        unread: (row.publicUpdateRevision || 0) > seen,
        historyTruncated: !!updates.length && seen < updates[0].revision - 1,
        reliability: reliabilityFor(row, todayInIndia()),
        updates,
      };
    })
    .filter((e) => e.updates.length || e.reliability.state !== "reviewed");
  entries.sort(
    (a, b) =>
      Number(b.unread) - Number(a.unread) || a.name.localeCompare(b.name),
  );
  res.json({
    success: true,
    entries,
    unreadCount: entries.filter((e) => e.unread).length,
  });
});
router.patch("/:slug/read", async (req, res) => {
  noQuery(req);
  const slug = parseInput(slugSchema, req.params.slug),
    input = parseInput(
      z.strictObject({
        saveId: z.string().regex(/^[a-f0-9]{24}$/),
        seenRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      }),
      req.body,
    );
  const row = await Scheme.findOne({ slug })
    .select("publicUpdateRevision")
    .lean();
  if (
    !row ||
    input.revision > (row.publicUpdateRevision || 0) ||
    input.revision <= input.seenRevision
  )
    throw new HttpError(400, "Choose a current unread update revision.");
  const seen =
    input.seenRevision === 0
      ? {
          $or: [
            { noticeReadRevision: 0 },
            { noticeReadRevision: { $exists: false } },
          ],
        }
      : { noticeReadRevision: input.seenRevision };
  const result = await SavedScheme.updateOne(
    { _id: input.saveId, user: req.user._id, slug, ...seen },
    { $set: { noticeReadRevision: input.revision } },
    { timestamps: false },
  );
  if (!result.modifiedCount) throw conflict();
  res.json({ success: true, acknowledgedRevision: input.revision });
});
export default router;
