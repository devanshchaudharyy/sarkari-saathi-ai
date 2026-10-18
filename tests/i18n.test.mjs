import { test } from "node:test";
import assert from "node:assert/strict";
import hindi from "../client/src/i18n/hi.json" with { type: "json" };
import {
  createTranslator,
  canonicalSearch,
  supportedLanguage,
} from "../client/src/i18n/core.js";
import { catalog } from "../server/src/data/schemes.js";
import {
  QUESTIONS,
  UP_STAGES,
  assessSchemes,
} from "../server/src/domain/eligibility.js";
import { readinessTemplates } from "../server/src/domain/readiness.js";
import { STATES_AND_UTS, OCCUPATIONS } from "../shared/profile.js";
import { formatReviewDate } from "../shared/schemes.js";
const t = (value, variables) => createTranslator(hindi)(value, "hi", variables);
const translated = (value) =>
  assert.notEqual(t(value), value, `Missing Hindi text: ${value}`);
test("Every translation is nonempty, Unicode and preserves interpolation placeholders", () => {
  for (const [key, value] of Object.entries(hindi)) {
    assert.ok(value.trim(), key);
    assert.ok(!value.includes("�"), key);
    assert.deepEqual(
      [...key.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
      [...value.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
      key,
    );
  }
});
test("English, numbers, React-like objects, URLs and unknown future editorial strings remain unchanged", () => {
  const translate = createTranslator(hindi),
    object = { id: "unchanged" };
  for (const value of [
    null,
    undefined,
    false,
    0,
    object,
    "Unknown future editorial sentence.",
    "constructor",
    "__proto__",
    "toString",
    "https://www.pmkisan.gov.in/",
  ])
    assert.equal(translate(value, "hi"), value);
  assert.equal(translate("Save profile", "en"), "Save profile");
  assert.equal(translate("Page {0} of {1}", "en", [2, 3]), "Page 2 of 3");
  assert.equal(translate(" Save profile ", "hi"), " प्रोफ़ाइल सेव करें ");
});
test("Count interpolation uses Hindi word order and translates nested rule phrases", () => {
  assert.equal(t("1 of 4 tasks complete"), "4 में से 1 काम पूरे हुए");
  assert.equal(
    t("{0} of {1} core details added", [3, 4]),
    "4 में से 3 मुख्य विवरण जोड़े गए",
  );
  assert.equal(
    t("Your answer No does not meet this checked requirement."),
    "आपका जवाब नहीं इस जाँची गई आवश्यकता को पूरा नहीं करता।",
  );
  assert.ok(t("Saved age 40 is within this entry range.").includes("भीतर है"));
});
test("Unsupported language preferences fall back to English", () => {
  for (const value of [null, "fr", "HI", "", {}, "<script>"])
    assert.equal(supportedLanguage(value), "en");
  assert.equal(supportedLanguage("hi"), "hi");
});
test("All 36 states and all occupation labels translate without changing canonical choices", () => {
  assert.equal(STATES_AND_UTS.length, 36);
  STATES_AND_UTS.forEach(translated);
  OCCUPATIONS.forEach((item) => translated(item.label));
  assert.equal(OCCUPATIONS[0].value, "student");
});
test("Known Hindi searches resolve to reviewed scheme aliases; arbitrary queries are preserved", () => {
  for (const name of ["किसान", "सुरक्षा", "जीवन", "पेंशन", "जन धन", "कन्या"])
    assert.ok(!/[\u0900-\u097f]/.test(canonicalSearch(name)));
  assert.equal(canonicalSearch("PM-KISAN"), "PM-KISAN");
  assert.equal(canonicalSearch("unreviewed query"), "unreviewed query");
  assert.equal(canonicalSearch("__proto__"), "__proto__");
  for (const scheme of catalog)
    assert.notEqual(canonicalSearch(t(scheme.name)), t(scheme.name));
});
test("Review dates have a Hindi locale while retaining the reviewed day", () => {
  assert.equal(formatReviewDate("2026-10-08"), "8 Oct 2026");
  assert.match(formatReviewDate("2026-10-08", "hi-IN"), /अक्तू|अक्टू/);
});
for (const scheme of catalog)
  test(`${scheme.slug}: all visible editorial fields have Hindi translations`, () => {
    for (const key of [
      "name",
      "authority",
      "summary",
      "benefitLabel",
      "benefitNote",
    ])
      translated(scheme[key]);
    for (const key of [
      "benefits",
      "eligibility",
      "applicationSteps",
      "caveats",
    ])
      scheme[key].forEach(translated);
    scheme.sources.forEach((source) => {
      translated(source.title);
      assert.equal(t(source.url), source.url);
    });
  });
test("All screening questions, explanations, groups and UP stages have Hindi translations", () => {
  for (const question of QUESTIONS)
    for (const key of ["label", "helper", "group"]) translated(question[key]);
  for (const stage of UP_STAGES) {
    translated(stage.label);
    translated(stage.requirement);
  }
});
for (const answer of [null, true, false])
  test(`Screening result labels, reasons and limitations translate for answers ${answer}`, () => {
    const answers = Object.fromEntries(
      QUESTIONS.map((q) => [q.key, q.type === "stage" ? "birth" : answer]),
    );
    const results = assessSchemes(
      catalog,
      { age: 24, state: "Uttar Pradesh", annualHouseholdIncome: 0 },
      answers,
    );
    for (const result of results) {
      for (const rule of result.assessment.rules) {
        translated(rule.label);
        translated(rule.reason);
      }
      result.assessment.limitations.forEach(translated);
      result.assessment.sources.forEach((source) => translated(source.title));
    }
  });
for (const [slug, items] of Object.entries(readinessTemplates))
  test(`${slug}: every preparation task translates without mutating its ID/source`, () => {
    const before = JSON.stringify(items);
    for (const item of items) {
      for (const key of ["title", "detail", "kind"]) translated(item[key]);
      translated(item.source.title);
      assert.equal(t(item.source.url), item.source.url);
    }
    assert.equal(JSON.stringify(items), before);
  });
