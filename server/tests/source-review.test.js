import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { integration } from "./support/integration.js";
import Scheme from "../src/models/Scheme.js";
import SavedScheme from "../src/models/SavedScheme.js";
import StaffAccess from "../src/models/StaffAccess.js";
import { catalogData } from "../../shared/catalog.js";
import { todayInIndia } from "../../shared/applications.js";
import {
  addDays,
  updatePush,
  catalogChanges,
  reliabilityFor,
} from "../../shared/reliability.js";
async function expectStatus(promise, status) {
  const response = await promise;
  assert.equal(response.status, status, JSON.stringify(response.body));
  return response;
}
const f = await integration("source-review");
let owner, other, editor, admin, original, save, publishedRevision;
before(async () => {
  await f.setup();
  await Promise.all([SavedScheme, StaffAccess].map((m) => m.init()));
  owner = await f.account("notice-owner");
  other = await f.account("notice-other");
  editor = await f.account("source-editor");
  admin = await f.account("source-admin");
  await StaffAccess.create([
    { user: editor.user.id, role: "editor" },
    { user: admin.user.id, role: "admin" },
  ]);
  original = await Scheme.findOne({ slug: "pmsby" }).lean();
});
after(f.cleanup);
const api = (method, path, who = admin) =>
  request(f.app)
    [method]("/api" + path)
    .set(who.headers);
async function current() {
  return (await api("get", "/catalog/pmsby/review").expect(200)).body.review;
}
async function identity() {
  const r = await current();
  return { id: r.id, revision: r.revision };
}
async function report(extra = {}) {
  const r = await current();
  return api("post", "/catalog/pmsby/review/report", editor).send({
    id: r.id,
    revision: r.revision,
    sourceUrl: r.sources[0].url,
    observedOn: todayInIndia(),
    versionLabel: "Fixture source v1",
    note: "PRIVATE-NOTE: observed a source difference requiring manual review.",
    ...extra,
  });
}
async function resolve(resolution = "no_change", extra = {}) {
  return api("post", "/catalog/pmsby/review/resolve").send({
    ...(await identity()),
    resolution,
    versionLabel: "Reviewed fixture source v2",
    nextReviewAt: addDays(todayInIndia(), 30),
    summary:
      "Staff reviewed the source and recorded the appropriate catalog outcome.",
    confirmed: true,
    ...extra,
  });
}
const notices = (who) => api("get", "/updates", who);
test("review and update endpoints enforce authentication and current staff roles", async () => {
  await request(f.app).get("/api/catalog/pmsby/review").expect(401);
  await api("get", "/catalog/pmsby/review", owner).expect(403);
  await request(f.app).get("/api/updates").expect(401);
  assert.equal((await current()).pending, null);
});
test("legacy records get a scheduled review without invented source versions or changes", async () => {
  const r = await current();
  assert.equal(r.reliability.nextReviewAt, addDays(original.reviewedAt, 90));
  assert.equal(r.reliability.sourceVersion, null);
  assert.equal(r.reliability.latestUpdate, null);
  assert.equal(
    reliabilityFor({ ...original, nextReviewAt: "2000-01-01" }, todayInIndia())
      .state,
    "due",
  );
});
test("saving before a change establishes a private notice baseline and retains checklist marks", async () => {
  save = (await api("put", "/readiness/pmsby", owner).send({}).expect(200)).body
    .entry;
  save = (
    await api("patch", "/readiness/pmsby", owner)
      .send({
        itemId: "form",
        completed: true,
        templateVersion: save.templateVersion,
        revision: save.revision,
        saveId: save.saveId,
      })
      .expect(200)
  ).body.entry;
  assert.equal(save.progress.completed, 1);
  assert.equal((await notices(other)).body.entries.length, 0);
});
test("reports reject unrelated sources, future dates, owner claims and unknown queries", async () => {
  await expectStatus(report({ sourceUrl: "https://unrelated.gov.in/" }), 400);
  await expectStatus(report({ observedOn: "2099-01-01" }), 400);
  await expectStatus(report({ user: owner.user.id }), 400);
  await api("get", "/catalog/pmsby/review?user=other").expect(400);
});
test("source report atomically queues evidence, history and a public pending notice", async () => {
  await expectStatus(report(), 200);
  const row = await Scheme.findOne({ slug: "pmsby" }).lean();
  assert(row.sourceReview.pending);
  assert(row.sourceReview.catalogSnapshot);
  assert.equal(row.publicUpdateRevision, 1);
  assert.equal(row.publicUpdates[0].kind, "review_requested");
  assert.equal(row.editorialHistory.at(-1).action, "review_requested");
});
test("pending review withholds old screening, checklist and document guidance without deleting marks", async () => {
  const entry = (await api("get", "/readiness", owner)).body.entries.find(
    (e) => e.slug === "pmsby",
  );
  assert.equal(entry.items.length, 0);
  assert.equal(entry.documentGuideAvailable, false);
  assert.equal(entry.noticeUnread, true);
  assert(
    (await SavedScheme.findById(save.saveId)).completedIds.includes("form"),
  );
  assert.equal(
    (await request(f.app).get("/api/schemes/pmsby/documents")).body.guide
      .available,
    false,
  );
  const result = (await api("get", "/eligibility", owner)).body.results.find(
    (e) => e.slug === "pmsby",
  );
  assert.equal(result.reviewPending, true);
  assert.equal(result.assessment.status, "not_assessed");
});
test("public and citizen APIs never expose staff notes, snapshots or reporter identity", async () => {
  for (const [path, who] of [
    ["/schemes/pmsby", owner],
    ["/schemes/pmsby/documents", owner],
    ["/readiness", owner],
    ["/eligibility", owner],
    ["/updates", owner],
  ]) {
    const r = await api("get", path, who).expect(200),
      text = JSON.stringify(r.body);
    for (const secret of [
      "PRIVATE-NOTE",
      "catalogSnapshot",
      "reportedBy",
      editor.user.id,
    ])
      assert(!text.includes(secret), path + " leaked " + secret);
  }
});
test("a second report and legacy publication controls cannot bypass the pending review", async () => {
  await expectStatus(report(), 409);
  for (const action of ["publish", "archive"])
    await api("post", "/catalog/pmsby/" + action)
      .send({ ...(await identity()), confirmed: true })
      .expect(409);
});
test("resolution requires an administrator, explicit confirmation and a valid next review date", async () => {
  await api("post", "/catalog/pmsby/review/resolve", editor)
    .send({
      ...(await identity()),
      resolution: "no_change",
      versionLabel: "Review v2",
      summary: "Valid public summary text.",
      nextReviewAt: addDays(todayInIndia(), 30),
      confirmed: true,
    })
    .expect(403);
  await expectStatus(resolve("no_change", { confirmed: false }), 400);
  await expectStatus(resolve("no_change", { nextReviewAt: "2000-01-01" }), 400);
});
test("stale review resolution cannot overwrite newer editorial state", async () => {
  const stale = await identity();
  await api("patch", "/catalog/pmsby")
    .send({
      ...stale,
      data: {
        ...catalogData(original),
        benefitNote: "PRIVATE-DRAFT: a synthetic note not yet published.",
      },
    })
    .expect(200);
  await expectStatus(resolve("no_change", stale), 409);
  const detail = (await request(f.app).get("/api/schemes/pmsby")).body;
  assert(!JSON.stringify(detail).includes("PRIVATE-DRAFT"));
});
test("no-change review preserves a private draft and restores unchanged guidance and marks", async () => {
  await expectStatus(resolve(), 200);
  const r = await current();
  assert.equal(r.pending, null);
  assert(r.hasDraft);
  assert.equal(r.reliability.sourceVersion.label, "Reviewed fixture source v2");
  const entry = (await api("get", "/readiness", owner)).body.entries.find(
    (e) => e.slug === "pmsby",
  );
  assert.equal(entry.progress.completed, 1);
  assert.equal(entry.items.length, 4);
  assert(entry.documentGuideAvailable);
  assert.equal((await notices(owner)).body.unreadCount, 1);
  assert.equal((await notices(other)).body.unreadCount, 0);
});
test("new saves start at the latest notice version and do not inherit another users read state", async () => {
  await api("put", "/readiness/pmsby", other).send({}).expect(200);
  assert.equal((await notices(other)).body.unreadCount, 0);
  assert.equal((await notices(owner)).body.unreadCount, 1);
});
test("read acknowledgements are owner scoped, reject future versions and preserve checklist revision/time", async () => {
  const before = await SavedScheme.findById(save.saveId).lean(),
    entry = (await notices(owner)).body.entries[0],
    body = {
      saveId: save.saveId,
      seenRevision: 0,
      revision: entry.reliability.revision,
    };
  await api("patch", "/updates/pmsby/read", other).send(body).expect(409);
  await api("patch", "/updates/pmsby/read", owner)
    .send({ ...body, revision: 999 })
    .expect(400);
  await api("patch", "/updates/pmsby/read", owner).send(body).expect(200);
  await api("patch", "/updates/pmsby/read", owner).send(body).expect(409);
  const after = await SavedScheme.findById(save.saveId).lean();
  assert.equal(after.revision, before.revision);
  assert.equal(+after.updatedAt, +before.updatedAt);
  assert.deepEqual(after.completedIds, before.completedIds);
});
test("concurrent reports create one review and one notice", async () => {
  const r = await current(),
    body = {
      id: r.id,
      revision: r.revision,
      sourceUrl: r.sources[0].url,
      observedOn: todayInIndia(),
      versionLabel: "Fixture changed v3",
      note: "Review a second synthetic source observation.",
    };
  const responses = await Promise.all(
    [1, 2].map(() =>
      api("post", "/catalog/pmsby/review/report", editor).send(body),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await Scheme.findOne({ slug: "pmsby" })).publicUpdateRevision,
    3,
  );
});
test("reviewed publication records safe before/after differences and keeps old rules suspended", async () => {
  await expectStatus(
    resolve("publish", {
      summary: "A synthetic catalog note was changed after source review.",
    }),
    200,
  );
  const row = await Scheme.findOne({ slug: "pmsby" }).lean();
  publishedRevision = row.publicUpdateRevision;
  assert.equal(publishedRevision, 4);
  assert.equal(row.sourceReview, null);
  assert(row.readinessSuspended);
  assert(row.screeningSuspended);
  assert(row.publicUpdates.at(-1).fieldsChanged.includes("benefitNote"));
  assert(
    row.publicUpdates
      .at(-1)
      .changes.find((c) => c.field === "benefitNote")
      .after.includes("PRIVATE-DRAFT"),
  );
  assert.equal(
    (await request(f.app).get("/api/schemes/pmsby/documents")).body.guide
      .available,
    false,
  );
  assert.equal((await notices(owner)).body.unreadCount, 1);
  assert.equal((await notices(other)).body.unreadCount, 1);
});
test("archive resolution keeps affected-user notices while public discovery closes", async () => {
  await expectStatus(report(), 200);
  await expectStatus(
    resolve("archive", {
      summary: "The synthetic scheme was archived after the source review.",
    }),
    200,
  );
  await request(f.app).get("/api/schemes/pmsby").expect(404);
  const entry = (await notices(owner)).body.entries[0];
  assert.equal(entry.available, false);
  assert.equal(entry.updates.at(-1).kind, "archived");
});
test("acknowledging an earlier observed version leaves newer updates unread", async () => {
  await api("patch", "/updates/pmsby/read", owner)
    .send({ saveId: save.saveId, seenRevision: 2, revision: publishedRevision })
    .expect(200);
  const entry = (await notices(owner)).body.entries[0];
  assert.equal(entry.seenRevision, 4);
  assert(entry.unread);
});
test("removed and recreated saves reject acknowledgements for the old record id", async () => {
  const own = await SavedScheme.findById(save.saveId);
  await own.deleteOne();
  const replacement = await SavedScheme.create({
    user: owner.user.id,
    slug: "pmsby",
    templateVersion: "test",
    noticeReadRevision: 0,
  });
  await api("patch", "/updates/pmsby/read", owner)
    .send({ saveId: save.saveId, seenRevision: 0, revision: 6 })
    .expect(409);
  assert.equal(
    (await SavedScheme.findById(replacement.id)).noticeReadRevision,
    0,
  );
});
test("notice history is bounded and makes missed retained versions explicit", async () => {
  const updates = Array.from({ length: 24 }, (_, i) => ({
    revision: 7 + i,
    kind: "content_updated",
    summary: "Synthetic bounded-history fixture.",
    at: new Date(),
    fieldsChanged: [],
    changes: [],
  }));
  await Scheme.updateOne(
    { slug: "pmsby" },
    {
      $set: { publicUpdateRevision: 30 },
      $push: {
        publicUpdates: {
          $each: updates,
          $slice: updatePush(updates[0]).$slice,
        },
      },
    },
  );
  const entry = (await notices(owner)).body.entries[0];
  assert.equal(entry.updates.length, 20);
  assert.equal(entry.historyTruncated, true);
});
test("catalog differences omit private editorial fields and truncate long previews", () => {
  const changes = catalogChanges(
    { ...original, benefitNote: "a".repeat(1000) },
    {
      ...original,
      benefitNote: "b".repeat(1000),
      editorialDraft: { secret: "x" },
      keywords: ["private-keyword"],
    },
  );
  assert.deepEqual(
    changes.map((c) => c.field),
    ["benefitNote"],
  );
  assert.equal(changes[0].before.length, 601);
});
test("staff revocation takes effect on subsequent source-review requests", async () => {
  await StaffAccess.deleteOne({ user: editor.user.id });
  await api("get", "/catalog/pmsby/review", editor).expect(403);
});
