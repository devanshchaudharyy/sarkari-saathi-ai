import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { integration } from "./support/integration.js";
import Application from "../src/models/Application.js";
import { todayInIndia } from "../../shared/applications.js";
const fixture = await integration("applications");
let owner, other, entry;
before(async () => {
  await fixture.setup();
  await Application.init();
  owner = await fixture.account("owner");
  other = await fixture.account("other");
});
after(fixture.cleanup);
const api = (method, path = "") =>
  request(fixture.app)[method](`/api/applications${path}`).set(owner.headers);
test("tracker requires authentication and rejects owner-query injection", async () => {
  await request(fixture.app).get("/api/applications").expect(401);
  await api("get", "?user=other").expect(400);
});
test("tracker is initially empty and does not invent application statuses", async () => {
  assert.deepEqual((await api("get").expect(200)).body.entries, []);
});
test("start is idempotent, safe and scoped to the current catalog", async () => {
  entry = (await api("put", "/pmsby").send({}).expect(200)).body.entry;
  assert.equal(entry.status, "preparing");
  assert.equal(entry.events.length, 1);
  assert.equal(entry.events[0].occurredOn, todayInIndia());
  assert.equal(entry.user, undefined);
  assert.equal(entry._id, undefined);
  const repeated = (await api("put", "/pmsby").send({}).expect(200)).body.entry;
  assert.equal(repeated.id, entry.id);
  assert.equal(repeated.revision, 0);
  await api("put", "/unknown").send({}).expect(404);
});
for (const input of [
  { user: "other" },
  { status: "approved" },
  { referenceNumber: "sensitive" },
  { document: "content" },
])
  test(
    "start rejects unsupported/private fields " + Object.keys(input)[0],
    async () => {
      await api("put", "/pmsby").send(input).expect(400);
    },
  );
test("other owners cannot read, update or delete a timeline", async () => {
  assert.deepEqual(
    (await request(fixture.app).get("/api/applications").set(other.headers))
      .body.entries,
    [],
  );
  await request(fixture.app)
    .patch("/api/applications/pmsby")
    .set(other.headers)
    .send({
      id: entry.id,
      revision: 0,
      status: "approved",
      occurredOn: todayInIndia(),
    })
    .expect(404);
  await request(fixture.app)
    .delete("/api/applications/pmsby")
    .set(other.headers)
    .send({ id: entry.id, revision: 0 })
    .expect(404);
});
for (const [name, change] of [
  ["future date", { occurredOn: "2099-01-01" }],
  ["impossible date", { occurredOn: "2026-02-30" }],
  ["invalid status", { status: "officially_verified" }],
  ["owner", { user: "other" }],
  ["missing revision", { revision: undefined }],
  ["string revision", { revision: "0" }],
])
  test("update rejects " + name, async () => {
    await api("patch", "/pmsby")
      .send({
        id: entry.id,
        revision: 0,
        status: "submitted",
        occurredOn: todayInIndia(),
        ...change,
      })
      .expect(400);
  });
test("updates append a dated self-reported event and use atomic revisions", async () => {
  entry = (
    await api("patch", "/pmsby")
      .send({
        id: entry.id,
        revision: 0,
        status: "submitted",
        occurredOn: todayInIndia(),
      })
      .expect(200)
  ).body.entry;
  assert.equal(entry.status, "submitted");
  assert.equal(entry.events.length, 2);
  assert.equal(entry.revision, 1);
  assert.equal(entry.events[0].status, "preparing");
  await api("patch", "/pmsby")
    .send({
      id: entry.id,
      revision: 0,
      status: "approved",
      occurredOn: todayInIndia(),
    })
    .expect(409);
});
test("simultaneous updates cannot overwrite each other", async () => {
  const input = {
    id: entry.id,
    revision: entry.revision,
    occurredOn: todayInIndia(),
  };
  const responses = await Promise.all([
    api("patch", "/pmsby").send({ ...input, status: "approved" }),
    api("patch", "/pmsby").send({ ...input, status: "rejected" }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  entry = responses.find((r) => r.status === 200).body.entry;
});
test("removal checks revision and recreate cannot accept an old timeline id", async () => {
  await api("delete", "/pmsby").send({ id: entry.id, revision: 0 }).expect(409);
  await api("delete", "/pmsby")
    .send({ id: entry.id, revision: entry.revision })
    .expect(200);
  const fresh = (await api("put", "/pmsby").send({}).expect(200)).body.entry;
  assert.notEqual(fresh.id, entry.id);
  assert.equal(fresh.events.length, 1);
  await api("delete", "/pmsby").send({ id: entry.id, revision: 0 }).expect(409);
});
test("removed catalog schemes retain owner timelines and history is bounded", async () => {
  const { default: Scheme } = await import("../src/models/Scheme.js");
  await Scheme.deleteOne({ slug: "pmsby" });
  const row = (await api("get")).body.entries[0];
  assert.equal(row.slug, "pmsby");
  const events = Array.from({ length: 100 }, () => ({
    status: "preparing",
    occurredOn: todayInIndia(),
    recordedAt: new Date(),
  }));
  await Application.updateOne({ _id: row.id }, { $set: { events } });
  await api("patch", "/pmsby")
    .send({
      id: row.id,
      revision: row.revision,
      status: "submitted",
      occurredOn: todayInIndia(),
    })
    .expect(409);
});
