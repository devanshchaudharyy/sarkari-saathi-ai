import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISCOVERY_GROUPS,
  groupDiscovery,
  discoveryCounts,
  discoveryView,
} from "../shared/discovery.js";
import { assessSchemes, QUESTIONS } from "../server/src/domain/eligibility.js";
import { catalog } from "../server/src/data/schemes.js";
import { safeReturnPath } from "../client/src/utils/returnPath.js";
import { createTranslator } from "../client/src/i18n/core.js";
import hindi from "../client/src/i18n/hi.json" with { type: "json" };
const profile = { age: 24, state: "Uttar Pradesh", annualHouseholdIncome: 0 };
const answers = Object.fromEntries(
  QUESTIONS.map((question) => [
    question.key,
    question.type === "stage" ? "birth" : true,
  ]),
);
// These are self-confirmed fixture facts, not adjudicated government decisions.
for (const key of [
  "everIncomeTaxPayer",
  "existingBankAccount",
  "pmKisanExcluded",
])
  answers[key] = false;
const fixture = (slug, name, status, category = "insurance") => ({
  slug,
  name,
  category,
  assessment: { status, rules: [], missing: [], limitations: [], sources: [] },
});
test("Presentation groups have an explicit fixed order with no approval score", () => {
  assert.deepEqual(
    DISCOVERY_GROUPS.map((group) => group.status),
    ["basic_match", "needs_info", "criteria_not_met", "not_assessed"],
  );
  assert.ok(DISCOVERY_GROUPS.every((group) => !Object.hasOwn(group, "score")));
});
test("Grouping preserves each canonical assessment object and does not mutate input", () => {
  const input = assessSchemes(catalog, profile, answers),
    before = JSON.stringify(input);
  const grouped = groupDiscovery(input).flatMap((group) => group.entries);
  assert.equal(grouped.length, input.length);
  for (const result of grouped)
    assert.equal(
      result.assessment,
      input.find((item) => item.slug === result.slug).assessment,
    );
  assert.equal(JSON.stringify(input), before);
});
test("Every group is alphabetical by original name with slug as deterministic tie break", () => {
  const entries = [
    fixture("b", "Alpha", "needs_info"),
    fixture("z", "Zulu", "needs_info"),
    fixture("a", "Alpha", "needs_info"),
  ];
  assert.deepEqual(
    groupDiscovery(entries)[1].entries.map((item) => item.slug),
    ["a", "b", "z"],
  );
  assert.deepEqual(
    entries.map((item) => item.slug),
    ["b", "z", "a"],
  );
});
test("Category and status filters intersect without changing full-catalog counts", () => {
  const results = [
    fixture("one", "One", "basic_match"),
    fixture("two", "Two", "needs_info"),
    fixture("three", "Three", "basic_match", "banking"),
  ];
  assert.deepEqual(
    groupDiscovery(results, { category: "insurance", status: "basic_match" })
      .flatMap((group) => group.entries)
      .map((item) => item.slug),
    ["one"],
  );
  assert.deepEqual(discoveryCounts(results), {
    basic_match: 2,
    needs_info: 1,
    criteria_not_met: 0,
    not_assessed: 0,
  });
});
test("Empty catalogs and empty views never invent schemes or matches", () => {
  assert.deepEqual(Object.values(discoveryCounts([])), [0, 0, 0, 0]);
  assert.ok(
    groupDiscovery([fixture("one", "One", "needs_info")], {
      status: "basic_match",
    }).every((group) => group.entries.length === 0),
  );
});
test("Profile-only results never turn missing answers into basic matches", () => {
  const results = assessSchemes(catalog, profile, {});
  assert.equal(discoveryCounts(results).basic_match, 0);
  assert.equal(discoveryCounts(results).needs_info, 6);
});
test("Missing age and income are unknown rather than inferred from occupation", () => {
  const results = assessSchemes(catalog, { occupation: "farmer" }, {});
  assert.equal(discoveryCounts(results).basic_match, 0);
  assert.equal(
    results
      .find((item) => item.slug === "pm-kisan")
      .assessment.rules.find((rule) => rule.input.key === "cultivableLandOwner")
      .status,
    "unknown",
  );
});
test("Known failures remain separate from missing information", () => {
  const results = assessSchemes(catalog, { ...profile, age: 80 }, {});
  const counts = discoveryCounts(results);
  assert.ok(counts.criteria_not_met >= 3);
  assert.equal(counts.basic_match, 0);
  const pmsby = results.find((item) => item.slug === "pmsby");
  assert.ok(pmsby.assessment.missing.length > 0);
});
test("Explicit confirmed facts can produce basic matches using the existing engine", () => {
  const results = assessSchemes(catalog, profile, answers);
  assert.ok(discoveryCounts(results).basic_match >= 3);
  const pmsby = results.find((item) => item.slug === "pmsby");
  assert.equal(pmsby.assessment.status, "basic_match");
  assert.equal(
    assessSchemes(catalog, profile, { ...answers, pmsbyAccount: false }).find(
      (item) => item.slug === "pmsby",
    ).assessment.status,
    "criteria_not_met",
  );
});
test("A future catalog scheme stays not assessed, with its sources and rule limitations intact", () => {
  const result = assessSchemes(
    [{ slug: "future-scheme", name: "Future scheme", category: "banking" }],
    profile,
    answers,
  )[0];
  assert.equal(groupDiscovery([result])[3].entries[0].slug, "future-scheme");
  assert.equal(result.assessment.ruleVersion, null);
  assert.deepEqual(result.assessment.rules, []);
});
test("Unexpected future status is shown in not-screened group and not silently discarded", () => {
  const input = fixture("future", "Future", "future_status");
  assert.equal(discoveryCounts([input]).not_assessed, 1);
  assert.equal(input.assessment.status, "future_status");
});
for (const [query, expected] of [
  [
    "category=insurance&status=needs_info&scheme=pmsby",
    {
      category: "insurance",
      status: "needs_info",
      selected: "pmsby",
      invalid: false,
    },
  ],
  [
    "category=all&status=all&scheme=all",
    { category: "all", status: "all", selected: "all", invalid: false },
  ],
  [
    "category=made-up&status=approved&scheme=missing",
    { category: "all", status: "all", selected: "all", invalid: true },
  ],
  [
    "status=needs_info&status=basic_match",
    { category: "all", status: "all", selected: "all", invalid: true },
  ],
  [
    "user=someone-else",
    { category: "all", status: "all", selected: "all", invalid: true },
  ],
])
  test(`Safe presentation query: ${query}`, () =>
    assert.deepEqual(
      discoveryView(new URLSearchParams(query), catalog),
      expected,
    ));
test("Shortlist login return is internal, query-preserving and cannot become an external redirect", () => {
  assert.equal(
    safeReturnPath("/discover?scheme=pmsby&category=insurance"),
    "/discover?scheme=pmsby&category=insurance",
  );
  for (const value of [
    "//evil.example/discover",
    "https://evil.example/discover",
    "/discover\\evil",
    "/discover/unknown",
  ])
    assert.equal(safeReturnPath(value), "/dashboard");
});
test("Group labels and critical boundary copy have Hindi translations", () => {
  const t = createTranslator(hindi);
  for (const group of DISCOVERY_GROUPS)
    for (const key of ["title", "description"])
      assert.notEqual(t(group[key], "hi"), group[key]);
  assert.equal(
    t("{0} of {1} catalog entries shown", "en", [2, 6]),
    "2 of 6 catalog entries shown",
  );
  assert.equal(
    t("{0} of {1} catalog entries shown", "hi", [2, 6]),
    "कैटलॉग की 6 में से 2 प्रविष्टियाँ दिखाई गईं",
  );
});
