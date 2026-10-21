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
import { catalogData, LIVE_CATALOG } from "../../../shared/catalog.js";
import { todayInIndia, validDay } from "../../../shared/applications.js";
import {
  addDays,
  makeUpdate,
  updatePush,
  reviewPending,
  reliabilityFor,
} from "../../../shared/reliability.js";
import { documentGuides } from "../domain/documents.js";
import { catalogInput, searchTextFor } from "../domain/catalogInput.js";
const router = Router();
const versionFilter = (revision) =>
  revision === 0
    ? {
        $or: [
          { editorialRevision: 0 },
          { editorialRevision: { $exists: false } },
        ],
      }
    : { editorialRevision: revision };
const supportedSources = (row) => {
  const values = [
    ...(row.sources || []),
    { title: "Official scheme website", url: row.officialUrl },
    ...(documentGuides[row.slug] || []).flatMap((g) => g.sources),
  ];
  return values.filter(
    (source, index) => values.findIndex((s) => s.url === source.url) === index,
  );
};
router.use("/:slug/review", auth, async (req, res, next) => {
  noQuery(req);
  parseInput(slugSchema, req.params.slug);
  const access = await StaffAccess.findOne({ user: req.user._id }).lean();
  if (!access) throw new HttpError(403, "Source review requires staff access.");
  req.sourceRole = access.role;
  next();
});
router.get("/:slug/review", async (req, res) => {
  const row = await Scheme.findOne({ slug: req.params.slug }).lean();
  if (!row) throw new HttpError(404, "Scheme not found.");
  res.json({
    success: true,
    review: {
      id: String(row._id),
      slug: row.slug,
      revision: row.editorialRevision || 0,
      published: row.published !== false,
      hasDraft: !!row.editorialDraft,
      pending: row.sourceReview || null,
      history: (row.sourceReviewHistory || []).slice(-5),
      sources: supportedSources(row),
      reliability: reliabilityFor(row, todayInIndia()),
    },
  });
});
const limiter = rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many review changes. Wait a minute and try again.",
  },
});
const short = z.string().trim().min(3).max(160),
  summary = z.string().trim().min(10).max(600);
router.post("/:slug/review/:action", limiter, async (req, res) => {
  const action = parseInput(z.enum(["report", "resolve"]), req.params.action);
  const input = parseInput(
    action === "report"
      ? z.strictObject({
          ...versionInput,
          sourceUrl: z.string().max(2000),
          versionLabel: short,
          observedOn: z
            .string()
            .refine(
              (d) =>
                validDay(d) &&
                d <= "2099-12-31" &&
                d <= todayInIndia() &&
                d >= "2000-01-01",
            ),
          note: z.string().trim().min(10).max(1500),
        })
      : z.strictObject({
          ...versionInput,
          resolution: z.enum(["no_change", "publish", "archive"]),
          summary,
          versionLabel: short,
          nextReviewAt: z
            .string()
            .refine(
              (d) =>
                validDay(d) &&
                d >= todayInIndia() &&
                d <= addDays(todayInIndia(), 365),
            ),
          confirmed: z.literal(true),
        }),
    req.body,
  );
  if (action === "resolve" && req.sourceRole !== "admin")
    throw new HttpError(
      403,
      "Resolving source reviews requires administrator access.",
    );
  const row = await Scheme.findOne({
    _id: input.id,
    slug: req.params.slug,
    ...versionFilter(input.revision),
  }).lean();
  if (!row) throw conflict();
  let change, update, record;
  if (action === "report") {
    if (row.published === false)
      throw new HttpError(
        400,
        "Report source changes for published schemes only.",
      );
    if (reviewPending(row))
      throw new HttpError(
        409,
        "A source review is already pending. Reload before making another change.",
      );
    const source = supportedSources(row).find((s) => s.url === input.sourceUrl);
    if (!source)
      throw new HttpError(
        400,
        "Choose a source already attached to this scheme or its document guide.",
      );
    change = {
      sourceReview: {
        pending: true,
        source,
        versionLabel: input.versionLabel,
        observedOn: input.observedOn,
        note: input.note,
        reportedBy: String(req.user._id),
        reportedAt: new Date(),
        catalogSnapshot: catalogData(row),
      },
    };
    update = makeUpdate(row, {
      kind: "review_requested",
      summary:
        "A source change was reported. Screening, checklists and document guidance are paused while staff review the evidence.",
      source,
      sourceVersion: input.versionLabel,
    });
  } else {
    if (!reviewPending(row))
      throw new HttpError(409, "There is no pending source review to resolve.");
    const pending = row.sourceReview;
    change = {
      sourceReview: null,
      nextReviewAt: input.nextReviewAt,
      reviewedAt: todayInIndia(),
      reviewedSourceVersion: {
        label: input.versionLabel,
        url: pending.source.url,
        reviewedAt: todayInIndia(),
      },
    };
    if (input.resolution === "publish") {
      if (!row.editorialDraft)
        throw new HttpError(
          400,
          "Save a reviewed catalog draft before publishing this review.",
        );
      const data = parseInput(catalogInput, row.editorialDraft);
      change = {
        ...change,
        ...data,
        reviewedAt: todayInIndia(),
        searchText: searchTextFor(data),
        published: true,
        editorialDraft: null,
        screeningSuspended: true,
        readinessSuspended: true,
      };
    } else if (input.resolution === "archive") change.published = false;
    update = makeUpdate(row, {
      kind:
        input.resolution === "no_change"
          ? "review_completed"
          : input.resolution === "archive"
            ? "archived"
            : "content_updated",
      summary: input.summary,
      source: pending.source,
      sourceVersion: input.versionLabel,
      after: input.resolution === "publish" ? { ...row, ...change } : null,
    });
    record = {
      ...pending,
      pending: false,
      resolution: input.resolution,
      summary: input.summary,
      resolvedBy: String(req.user._id),
      resolvedAt: new Date(),
      reviewedVersion: input.versionLabel,
    };
  }
  change.publicUpdateRevision = update.revision;
  const saved = await Scheme.findOneAndUpdate(
    {
      _id: row._id,
      ...versionFilter(input.revision),
      "editorialHistory.99": { $exists: false },
    },
    {
      $set: change,
      $inc: { editorialRevision: 1 },
      $push: {
        publicUpdates: updatePush(update),
        ...(record
          ? { sourceReviewHistory: { $each: [record], $slice: -20 } }
          : {}),
        editorialHistory: {
          action:
            action === "report"
              ? "review_requested"
              : "review_" + input.resolution,
          actor: req.user._id,
          revision: input.revision + 1,
          at: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw conflict();
  res.json({
    success: true,
    message:
      action === "report"
        ? "Source review queued. Existing automated guidance is paused."
        : "Source review resolved. Affected saved schemes have an in-app update.",
  });
});
export default router;
