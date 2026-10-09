import { z } from "zod";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { SCHEME_CATEGORIES, SCHEME_LEVELS } from "../../../shared/schemes.js";
import { STATES_AND_UTS } from "../../../shared/profile.js";
const number = (max, fallback) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(max))
    .prefault(String(fallback));
const querySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    category: z.enum(SCHEME_CATEGORIES.map(({ value }) => value)).optional(),
    level: z.enum(["central", "state"]).optional(),
    state: z.enum(STATES_AND_UTS).optional(),
    page: number(10000, 1),
    limit: number(24, 6),
  })
  .strict();
const summaryFields =
  "-_id slug name acronym category level states authority summary benefitLabel benefitNote reviewedAt";
export async function listSchemes(req, res) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Use valid search and filters. Search is limited to 100 characters; page must be 1–10000 and limit 1–24.",
    );
  const { q, category, level, state, page, limit } = parsed.data;
  const filter = {};
  if (q)
    filter.searchText = new RegExp(
      q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (state) filter.$or = [{ level: "central" }, { states: state }];
  const [schemes, total, all] = await Promise.all([
    Scheme.find(filter)
      .select(summaryFields)
      .sort({ name: 1, slug: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .lean(),
    Scheme.countDocuments(filter).maxTimeMS(5000),
    Scheme.find()
      .select("-_id category level states reviewedAt")
      .maxTimeMS(5000)
      .lean(),
  ]);
  res.set("Cache-Control", "no-store").json({
    success: true,
    schemes,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    filters: {
      q,
      category: category || "",
      level: level || "",
      state: state || "",
    },
    catalog: {
      total: all.length,
      reviewedAt:
        all
          .map((record) => record.reviewedAt)
          .sort()
          .at(-1) || null,
      categories: SCHEME_CATEGORIES.map((category) => ({
        ...category,
        count: all.filter((record) => record.category === category.value)
          .length,
      })),
      levels: SCHEME_LEVELS.map((level) => ({
        ...level,
        count: all.filter((record) => record.level === level.value).length,
      })),
      stateCoverage: [
        ...new Set(all.flatMap((record) => record.states)),
      ].sort(),
    },
  });
}
export async function getScheme(req, res) {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug) ||
    req.params.slug.length > 100
  )
    throw new HttpError(404, "Scheme not found in this catalog.");
  const scheme = await Scheme.findOne({ slug: req.params.slug })
    .select("-_id -__v -searchText -keywords -createdAt -updatedAt")
    .maxTimeMS(5000)
    .lean();
  if (!scheme) throw new HttpError(404, "Scheme not found in this catalog.");
  res.set("Cache-Control", "no-store").json({ success: true, scheme });
}
