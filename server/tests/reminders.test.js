import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { integration } from "./support/integration.js";
import Reminder from "../src/models/Reminder.js";
import { todayInIndia } from "../../shared/applications.js";
const f = await integration("reminders");
let owner, other, row;
before(async () => {
  await f.setup();
  await Reminder.init();
  owner = await f.account("reminder-owner");
  other = await f.account("reminder-other");
});
after(f.cleanup);
const api = (method, path = "") =>
  request(f.app)
    [method]("/api/reminders" + path)
    .set(owner.headers);
test("reminders require auth, reject owner filters and have honest empty counts", async () => {
  await request(f.app).get("/api/reminders").expect(401);
  await api("get", "?user=x").expect(400);
  assert.equal((await api("get", "/summary")).body.due, 0);
});
test("a personal due-today reminder is idempotent and safe", async () => {
  row = (
    await api("put", "/pmsby/prepare")
      .send({ dueOn: todayInIndia() })
      .expect(200)
  ).body.entry;
  assert.equal(row.status, "today");
  assert.equal(row.user, undefined);
  assert.equal(row._id, undefined);
  const repeat = (
    await api("put", "/pmsby/prepare").send({ dueOn: "2099-01-01" })
  ).body.entry;
  assert.equal(repeat.id, row.id);
  assert.equal(repeat.dueOn, todayInIndia());
  assert.equal((await api("get", "/summary")).body.due, 1);
});
for (const [name, input] of [
  ["past date", { dueOn: "1900-01-01" }],
  ["impossible day", { dueOn: "2026-02-30" }],
  ["owner", { dueOn: "2099-01-01", user: "x" }],
  ["message content", { dueOn: "2099-01-01", message: "sensitive" }],
  ["missing date", {}],
])
  test("reminder validation rejects " + name, async () => {
    await api("put", "/pmsby/follow_up").send(input).expect(400);
  });
test("unknown schemes and reminder purposes cannot be created", async () => {
  await api("put", "/missing/prepare")
    .send({ dueOn: todayInIndia() })
    .expect(404);
  await api("put", "/pmsby/official_deadline")
    .send({ dueOn: todayInIndia() })
    .expect(400);
});
test("another owner cannot see or mutate reminders or counts", async () => {
  assert.deepEqual(
    (await request(f.app).get("/api/reminders").set(other.headers)).body
      .entries,
    [],
  );
  assert.equal(
    (await request(f.app).get("/api/reminders/summary").set(other.headers)).body
      .due,
    0,
  );
  await request(f.app)
    .patch("/api/reminders/" + row.id)
    .set(other.headers)
    .send({ revision: 0, dueOn: row.dueOn, completed: true })
    .expect(404);
  await request(f.app)
    .delete("/api/reminders/" + row.id)
    .set(other.headers)
    .send({ revision: 0 })
    .expect(404);
});
test("overdue is derived from India date and old reminders can be completed", async () => {
  await Reminder.updateOne({ _id: row.id }, { $set: { dueOn: "1900-01-01" } });
  assert.equal((await api("get")).body.entries[0].status, "overdue");
  row = (
    await api("patch", "/" + row.id)
      .send({ revision: 0, dueOn: "1900-01-01", completed: true })
      .expect(200)
  ).body.entry;
  assert.equal(row.status, "completed");
  assert(row.completedAt);
  assert.equal((await api("get", "/summary")).body.due, 0);
});
test("reschedule reopens a reminder with atomic stale-write protection", async () => {
  const input = {
    revision: row.revision,
    dueOn: "2099-01-01",
    completed: false,
  };
  const res = await Promise.all([
    api("patch", "/" + row.id).send(input),
    api("patch", "/" + row.id).send(input),
  ]);
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409]);
  row = res.find((r) => r.status === 200).body.entry;
  assert.equal(row.status, "upcoming");
  assert.equal(row.completedAt, null);
});
test("invalid edits, string booleans and stale removals are rejected", async () => {
  await api("patch", "/" + row.id)
    .send({ revision: row.revision, dueOn: "1900-01-01", completed: false })
    .expect(400);
  await api("patch", "/" + row.id)
    .send({ revision: row.revision, dueOn: row.dueOn, completed: "false" })
    .expect(400);
  await api("delete", "/" + row.id)
    .send({ revision: 0 })
    .expect(409);
  await api("delete", "/" + row.id)
    .send({ revision: row.revision })
    .expect(200);
  assert.equal((await api("get")).body.entries.length, 0);
});
test("calendar uses Indian midnight, not UTC midnight", () => {
  assert.equal(todayInIndia(new Date("2026-10-20T18:29:00Z")), "2026-10-20");
  assert.equal(todayInIndia(new Date("2026-10-20T18:30:00Z")), "2026-10-21");
});
