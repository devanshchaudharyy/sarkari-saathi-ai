// Presentation order only. Eligibility decisions remain server-owned.
import { SCHEME_CATEGORIES } from "./schemes.js";
export const DISCOVERY_GROUPS = [
  {
    status: "basic_match",
    title: "Basic matches to review",
    description:
      "The checked conditions match your supplied facts. Confirm all remaining conditions with the official provider.",
    tone: "match",
  },
  {
    status: "needs_info",
    title: "Clarify these next",
    description:
      "Missing facts or provider confirmation prevent a complete basic screen. These are possibilities to clarify, not confirmed matches.",
    tone: "clarify",
  },
  {
    status: "criteria_not_met",
    title: "A checked condition does not match",
    description:
      "At least one checked requirement is not met by the supplied facts. Review the reason before considering next steps.",
    tone: "unmet",
  },
  {
    status: "not_assessed",
    title: "Not screened",
    description:
      "This catalog entry has no reviewed screening rules. No match or eligibility conclusion has been made.",
    tone: "unknown",
  },
];
export function groupDiscovery(
  results,
  { category = "all", status = "all" } = {},
) {
  return DISCOVERY_GROUPS.map((group) => ({
    ...group,
    entries: results
      .filter(
        (result) =>
          (category === "all" || result.category === category) &&
          (status === "all" || status === group.status) &&
          (DISCOVERY_GROUPS.some(
            (item) => item.status === result.assessment?.status,
          )
            ? result.assessment.status
            : "not_assessed") === group.status,
      )
      .slice()
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, "en") ||
          a.slug.localeCompare(b.slug, "en"),
      ),
  }));
}
export function discoveryCounts(results) {
  return Object.fromEntries(
    groupDiscovery(results).map((group) => [
      group.status,
      group.entries.length,
    ]),
  );
}
export function discoveryView(params, results) {
  let invalid = [...params.keys()].some(
    (key) => !["category", "status", "scheme"].includes(key),
  );
  function read(key, allowed) {
    const values = params.getAll(key);
    if (
      !values.length ||
      (values.length === 1 && (!values[0] || values[0] === "all"))
    )
      return "all";
    if (values.length === 1 && allowed.includes(values[0])) return values[0];
    invalid = true;
    return "all";
  }
  const category = read(
    "category",
    SCHEME_CATEGORIES.map((item) => item.value),
  );
  const status = read(
    "status",
    DISCOVERY_GROUPS.map((item) => item.status),
  );
  const selected = read(
    "scheme",
    results.map((item) => item.slug),
  );
  return { category, status, selected, invalid };
}
