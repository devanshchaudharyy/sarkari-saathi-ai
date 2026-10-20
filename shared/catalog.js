export const CATALOG_FIELDS = [
  "slug",
  "name",
  "acronym",
  "category",
  "level",
  "states",
  "authority",
  "summary",
  "benefitLabel",
  "benefitNote",
  "benefits",
  "eligibility",
  "applicationSteps",
  "caveats",
  "officialUrl",
  "sources",
  "keywords",
  "reviewedAt",
];
export const PUBLIC_SCHEME_FIELDS = CATALOG_FIELDS.filter(
  (field) => field !== "keywords",
);
export const LIVE_CATALOG = { published: { $ne: false } };
export function catalogData(row) {
  return Object.fromEntries(CATALOG_FIELDS.map((field) => [field, row[field]]));
}
export function officialSourceUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      [".gov.in", ".nic.in"].some((suffix) => url.hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
}
