import { test } from "node:test";
import assert from "node:assert/strict";
import { planEntries } from "../shared/plans.js";
test("print plans include only saved selected schemes", () => {
  const a = { slug: "a", saved: true },
    b = { slug: "b", saved: false },
    c = { slug: "c", saved: true };
  assert.deepEqual(planEntries([a, b, c], ["a", "b", "missing"]), [a]);
});
test("empty selections do not create a plan", () =>
  assert.deepEqual(planEntries([{ slug: "a", saved: true }], []), []));
test("plan selection does not mutate records, marks or order", () => {
  const list = [
    { slug: "b", saved: true, items: [{ completed: true }] },
    { slug: "a", saved: true },
  ];
  const before = structuredClone(list);
  assert.deepEqual(planEntries(list, ["a", "b"]), list);
  assert.deepEqual(list, before);
});
test("duplicate and inherited-key slugs cannot duplicate or invent plan content", () => {
  assert.deepEqual(
    planEntries([{ slug: "a", saved: true }], ["a", "a", "__proto__"]),
    [{ slug: "a", saved: true }],
  );
});
