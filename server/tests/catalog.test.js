import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { integration } from "./support/integration.js";
import StaffAccess from "../src/models/StaffAccess.js";
import Scheme from "../src/models/Scheme.js";
import { catalog } from "../src/data/schemes.js";
import { catalogData } from "../../shared/catalog.js";
import { seedSchemes } from "../src/utils/seedSchemes.js";
const f = await integration("catalog-management");
let admin, editor, citizen, row;
const data = {
  ...catalogData(catalog[0]),
  slug: "review-fixture",
  name: "Synthetic reviewed test fixture",
};
before(async () => {
  await f.setup();
  await StaffAccess.init();
  admin = await f.account("catalog-admin");
  editor = await f.account("catalog-editor");
  citizen = await f.account("catalog-citizen");
  await StaffAccess.create([
    { user: admin.user._id, role: "admin" },
    { user: editor.user._id, role: "editor" },
  ]);
});
after(f.cleanup);
const api = (method, path = "", who = admin) =>
  request(f.app)
    [method]("/api/catalog" + path)
    .set(who.headers);
test("catalog access is server-authorized and citizenship is the default", async () => {
  await request(f.app).get("/api/catalog").expect(401);
  assert.equal((await api("get", "/access", citizen)).body.role, "citizen");
  await api("get", "", citizen).expect(403);
  await api("post", "", citizen).send(data).expect(403);
});
test("editors create drafts without exposing them to discovery, counts, details or private tools", async () => {
  row = (await api("post", "", editor).send(data).expect(201)).body.entry;
  assert.equal(row.published, false);
  assert.equal(row.history[0].action, "draft_created");
  assert.equal(
    (await request(f.app).get("/api/schemes?limit=24")).body.pagination.total,
    6,
  );
  await request(f.app).get("/api/schemes/review-fixture").expect(404);
  await request(f.app)
    .put("/api/applications/review-fixture")
    .set(citizen.headers)
    .send({})
    .expect(404);
  await request(f.app)
    .put("/api/reminders/review-fixture/prepare")
    .set(citizen.headers)
    .send({ dueOn: "2099-01-01" })
    .expect(404);
});
test("draft slugs cannot collide or be renamed", async () => {
  await api("post").send(data).expect(409);
  await api("patch", "/review-fixture", editor)
    .send({
      id: row.id,
      revision: row.revision,
      data: { ...data, slug: "other" },
    })
    .expect(400);
});
for (const [name, change] of [
  ["untrusted domain", { officialUrl: "https://example.com" }],
  ["script URL", { officialUrl: "javascript:alert(1)" }],
  ["credentials", { officialUrl: "https://user:secret@example.gov.in" }],
  ["future review", { reviewedAt: "2099-01-01" }],
  ["impossible date", { reviewedAt: "2026-02-30" }],
  ["missing state", { level: "state", states: [] }],
  ["invalid category", { category: "made-up" }],
  ["metadata override", { published: true }],
  [
    "unsafe source",
    { sources: [{ title: "Fake", url: "http://example.gov.in" }] },
  ],
])
  test("catalog input rejects " + name, async () => {
    await api("post")
      .send({ ...data, slug: "invalid-fixture", ...change })
      .expect(400);
  });
test("editor draft changes are revision guarded", async () => {
  row = (
    await api("patch", "/review-fixture", editor)
      .send({
        id: row.id,
        revision: 0,
        data: {
          ...data,
          summary: "Reviewed synthetic fixture wording for automated tests.",
        },
      })
      .expect(200)
  ).body.entry;
  assert.equal(row.revision, 1);
  assert.equal(row.history.at(-1).action, "draft_saved");
  await api("patch", "/review-fixture", editor)
    .send({ id: row.id, revision: 0, data })
    .expect(409);
});
test("editors cannot publish or archive and publication requires explicit confirmation", async () => {
  await api("post", "/review-fixture/publish", editor)
    .send({ id: row.id, revision: row.revision, confirmed: true })
    .expect(403);
  await api("post", "/review-fixture/archive", editor)
    .send({ id: row.id, revision: row.revision, confirmed: true })
    .expect(403);
  await api("post", "/review-fixture/publish")
    .send({ id: row.id, revision: row.revision, confirmed: false })
    .expect(400);
});
test("publishing is atomic, audited and exposes only public fields", async () => {
  const input = { id: row.id, revision: row.revision, confirmed: true };
  const res = await Promise.all([
    api("post", "/review-fixture/publish").send(input),
    api("post", "/review-fixture/publish").send(input),
  ]);
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409]);
  row = res.find((r) => r.status === 200).body.entry;
  assert.equal(row.published, true);
  assert.equal(row.draft, null);
  const scheme = (
    await request(f.app).get("/api/schemes/review-fixture").expect(200)
  ).body.scheme;
  assert.equal(
    scheme.summary,
    "Reviewed synthetic fixture wording for automated tests.",
  );
  for (const key of [
    "editorialHistory",
    "editorialDraft",
    "editorialRevision",
    "published",
    "searchText",
    "keywords",
    "_id",
  ])
    assert.equal(scheme[key], undefined);
});
test("published changes cannot silently keep old rules or preparation tasks", async () => {
  const original = await Scheme.findOne({ slug: "pmsby" }).lean();
  const editing = (await api("get")).body.entries.find(
    (e) => e.slug === "pmsby",
  );
  let next = (
    await api("patch", "/pmsby").send({
      id: editing.id,
      revision: editing.revision,
      data: catalogData(original),
    })
  ).body.entry;
  assert.equal(
    (
      await request(f.app).get("/api/eligibility").set(citizen.headers)
    ).body.results.find((e) => e.slug === "pmsby").assessment.status,
    "needs_info",
  );
  next = (
    await api("post", "/pmsby/publish").send({
      id: next.id,
      revision: next.revision,
      confirmed: true,
    })
  ).body.entry;
  const result = (
    await request(f.app).get("/api/eligibility").set(citizen.headers)
  ).body.results.find((e) => e.slug === "pmsby");
  assert.equal(result.assessment.status, "not_assessed");
  assert.deepEqual(result.assessment.rules, []);
  const readiness = (
    await request(f.app).get("/api/readiness").set(citizen.headers)
  ).body.entries.find((e) => e.slug === "pmsby");
  assert.deepEqual(readiness.items, []);
  assert.equal(readiness.progress.complete, false);
  await seedSchemes();
  assert.equal(
    (await Scheme.findOne({ slug: "pmsby" }).lean()).screeningSuspended,
    true,
  );
});
test("archiving removes public visibility and draft discard keeps published content", async () => {
  row = (
    await api("post", "/review-fixture/archive").send({
      id: row.id,
      revision: row.revision,
      confirmed: true,
    })
  ).body.entry;
  await request(f.app).get("/api/schemes/review-fixture").expect(404);
  row = (
    await api("patch", "/review-fixture", editor).send({
      id: row.id,
      revision: row.revision,
      data,
    })
  ).body.entry;
  row = (
    await api("post", "/review-fixture/discard", editor).send({
      id: row.id,
      revision: row.revision,
      confirmed: true,
    })
  ).body.entry;
  assert.equal(row.draft, null);
  assert.equal(row.published, false);
});
test("revoked editor privileges take effect on the next request", async () => {
  await StaffAccess.deleteOne({ user: editor.user._id });
  await api("get", "", editor).expect(403);
  assert.equal((await api("get", "/access", editor)).body.role, "citizen");
});
