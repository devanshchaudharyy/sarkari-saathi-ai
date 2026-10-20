import { test } from "node:test";
import assert from "node:assert/strict";
import { comparisonSelection, comparisonQuery } from "../shared/comparison.js";
for (const [value, slugs, invalid] of [
  ["", [], false],
  ["schemes=pmsby,pm-kisan", ["pmsby", "pm-kisan"], false],
  ["schemes=pmsby", ["pmsby"], false],
  ["schemes=a,b,c", ["a", "b", "c"], false],
  ["schemes=a,a", [], true],
  ["schemes=a,b,c,d", [], true],
  ["schemes=a&schemes=b", [], true],
  ["schemes=../x", [], true],
  ["schemes=a,,b", [], true],
  ["schemes=a,b&owner=x", [], true],
  ["schemes=https://evil.test", [], true],
])
  test("comparison query " + value, () =>
    assert.deepEqual(comparisonSelection(new URLSearchParams(value)), {
      slugs,
      invalid,
    }),
  );
test("unavailable/draft schemes are not accepted as selectable public choices", () =>
  assert.equal(
    comparisonSelection(new URLSearchParams("schemes=a,b"), ["a"]).invalid,
    true,
  ));
test("chosen order is retained with no profile facts in the URL", () => {
  const original = ["pmsby", "pm-kisan"];
  assert.deepEqual(comparisonQuery(original), { schemes: "pmsby,pm-kisan" });
  assert.deepEqual(original, ["pmsby", "pm-kisan"]);
});
