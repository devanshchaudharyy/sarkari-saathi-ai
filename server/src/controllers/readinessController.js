import { z } from "zod";
import SavedScheme from "../models/SavedScheme.js";
import Scheme from "../models/Scheme.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import {
  READINESS_VERSION,
  readinessTemplates,
  readinessEntry,
} from "../domain/readiness.js";
const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const saveId = z.string().regex(/^[a-f0-9]{24}$/);
const updateSchema = z.strictObject({
  itemId: z.string().max(60),
  completed: z.boolean(),
  templateVersion: z.literal(READINESS_VERSION),
  revision,
  saveId,
});
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      "Please send only the supported readiness fields with valid values.",
    );
  return result.data;
}
function slug(req) {
  const result = slugSchema.safeParse(req.params.slug);
  if (!result.success) throw new HttpError(404, "Scheme not found.");
  return result.data;
}
async function schemeFor(value) {
  const scheme = await Scheme.findOne({ slug: value }).lean();
  if (!scheme)
    throw new HttpError(404, "Scheme not found in the current catalog.");
  return scheme;
}
const reply = (res, entry) =>
  res.set("Cache-Control", "no-store").json({ success: true, entry });
export async function getReadiness(req, res) {
  if (Object.keys(req.query).length)
    throw new HttpError(
      400,
      "This endpoint does not accept filters or account identifiers.",
    );
  const [schemes, saved] = await Promise.all([
    Scheme.find().sort({ name: 1, slug: 1 }).lean(),
    SavedScheme.find({ user: req.user._id }).lean(),
  ]);
  const bySlug = new Map(saved.map((row) => [row.slug, row]));
  const entries = schemes.map((scheme) =>
    readinessEntry(scheme, bySlug.get(scheme.slug)),
  );
  for (const row of saved)
    if (!schemes.some((s) => s.slug === row.slug))
      entries.push(readinessEntry(null, row));
  entries.sort(
    (a, b) =>
      a.name.localeCompare(b.name, "en") || a.slug.localeCompare(b.slug, "en"),
  );
  res.set("Cache-Control", "no-store").json({ success: true, entries });
}
export async function saveScheme(req, res) {
  const value = slug(req);
  parse(z.strictObject({}), req.body ?? {});
  const scheme = await schemeFor(value);
  let saved;
  try {
    saved = await SavedScheme.findOneAndUpdate(
      { user: req.user._id, slug: value },
      {
        $setOnInsert: {
          user: req.user._id,
          slug: value,
          templateVersion: READINESS_VERSION,
          completedIds: [],
          revision: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        timestamps: false,
      },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    saved = await SavedScheme.findOne({ user: req.user._id, slug: value });
    if (!saved) throw error;
  }
  // Idempotent saves never reset progress or revisions.
  reply(res, readinessEntry(scheme, saved));
}
export async function updateReadiness(req, res) {
  const value = slug(req),
    input = parse(updateSchema, req.body),
    scheme = await schemeFor(value);
  const template = readinessTemplates[value];
  if (!template?.some((item) => item.id === input.itemId))
    throw new HttpError(
      400,
      "This checklist item is not available for this scheme.",
    );
  const current = await SavedScheme.findOne({
    user: req.user._id,
    slug: value,
  }).lean();
  if (!current)
    throw new HttpError(404, "Save this scheme before updating its checklist.");
  const ids =
    current.templateVersion === READINESS_VERSION ? current.completedIds : [];
  const completedIds = input.completed
    ? [...new Set([...ids, input.itemId])]
    : ids.filter((id) => id !== input.itemId);
  const saved = await SavedScheme.findOneAndUpdate(
    {
      user: req.user._id,
      slug: value,
      _id: input.saveId,
      revision: input.revision,
    },
    {
      $set: { completedIds, templateVersion: READINESS_VERSION },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!saved)
    throw new HttpError(
      409,
      "This checklist changed in another window. Reload your saved schemes and try again.",
    );
  reply(res, readinessEntry(scheme, saved));
}
export async function removeScheme(req, res) {
  const value = slug(req),
    input = parse(z.strictObject({ revision, saveId }), req.body);
  const removed = await SavedScheme.findOneAndDelete({
    user: req.user._id,
    slug: value,
    _id: input.saveId,
    revision: input.revision,
  });
  if (!removed) {
    const exists = await SavedScheme.exists({
      user: req.user._id,
      slug: value,
    });
    throw new HttpError(
      exists ? 409 : 404,
      exists
        ? "This checklist changed in another window. Reload before removing it."
        : "Saved scheme not found.",
    );
  }
  res
    .set("Cache-Control", "no-store")
    .json({ success: true, message: "Scheme removed from your saved list." });
}
