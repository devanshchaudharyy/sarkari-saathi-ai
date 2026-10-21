import { PUBLIC_SCHEME_FIELDS } from "./catalog.js";
export function addDays(day, count) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return null;
  const date = new Date(day + "T00:00:00Z");
  if (!Number.isFinite(+date)) return null;
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export const reviewPending = (row) => !!row?.sourceReview?.pending;
export function publicUpdate(update) {
  return {
    revision: update.revision,
    kind: update.kind,
    at: update.at,
    summary: update.summary,
    source: update.source
      ? { title: update.source.title, url: update.source.url }
      : null,
    sourceVersion: update.sourceVersion || null,
    fieldsChanged: update.fieldsChanged || [],
    changes: (update.changes || []).map(({ field, before, after }) => ({
      field,
      before,
      after,
    })),
  };
}
export function reliabilityFor(row, today) {
  const nextReviewAt = row.nextReviewAt || addDays(row.reviewedAt, 90);
  const last = row.publicUpdates?.at(-1);
  return {
    state: reviewPending(row)
      ? "pending"
      : nextReviewAt && nextReviewAt < today
        ? "due"
        : "reviewed",
    reviewedAt: row.reviewedAt,
    nextReviewAt,
    revision: row.publicUpdateRevision || 0,
    sourceVersion: row.reviewedSourceVersion
      ? {
          label: row.reviewedSourceVersion.label,
          url: row.reviewedSourceVersion.url,
          reviewedAt: row.reviewedSourceVersion.reviewedAt,
        }
      : null,
    latestUpdate: last ? publicUpdate(last) : null,
  };
}
const preview = (value) => {
  const text = Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join("\n")
    : String(value ?? "");
  return text.length > 600 ? text.slice(0, 600) + "…" : text;
};
export function catalogChanges(before, after) {
  return PUBLIC_SCHEME_FIELDS.filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  ).map((field) => ({
    field,
    before: preview(before[field]),
    after: preview(after[field]),
  }));
}
export function makeUpdate(
  row,
  { kind, summary, source = null, sourceVersion = null, after = null },
) {
  const changes = after ? catalogChanges(row, after) : [];
  return {
    revision: (row.publicUpdateRevision || 0) + 1,
    kind,
    summary,
    source,
    sourceVersion,
    at: new Date(),
    fieldsChanged: changes.map((c) => c.field),
    changes,
  };
}
export const updatePush = (update) => ({ $each: [update], $slice: -20 });
