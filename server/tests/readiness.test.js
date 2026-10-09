import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  readinessEntry,
  readinessTemplates,
  READINESS_VERSION,
} from "../src/domain/readiness.js";
import { safeReturnPath } from "../../client/src/utils/returnPath.js";
const database = `sarkari_saathi_readiness_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.JWT_SECRET = randomBytes(48).toString("base64");
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Profile } = await import("../src/models/Profile.js");
const { default: SavedScheme } = await import("../src/models/SavedScheme.js");
const { default: Scheme } = await import("../src/models/Scheme.js");
const { seedSchemes } = await import("../src/utils/seedSchemes.js");
let a, b, ta, tb, entry;
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all([
    User.init(),
    Profile.init(),
    SavedScheme.init(),
    Scheme.init(),
  ]);
  await seedSchemes();
  [a, b] = await User.create(
    ["a", "b"].map((i) => ({
      name: `Preparation ${i}`,
      email: `${i}@example.com`,
      password: "unused-fixture-hash",
    })),
  );
  [ta, tb] = [a, b].map((user) =>
    jwt.sign({}, process.env.JWT_SECRET, {
      subject: user.id,
      algorithm: "HS256",
      expiresIn: "1h",
    }),
  );
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const get = (token = ta) =>
  request(app).get("/api/readiness").set("Authorization", `Bearer ${token}`);
const save = (slug = "pmsby", body = {}, token = ta) =>
  request(app)
    .put(`/api/readiness/${slug}`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
const patch = (body, slug = "pmsby", token = ta) =>
  request(app)
    .patch(`/api/readiness/${slug}`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
const remove = (row, token = ta) =>
  request(app)
    .delete(`/api/readiness/${row.slug}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ revision: row.revision, saveId: row.saveId });
const input = (row, id = "account", completed = true) => ({
  itemId: id,
  completed,
  revision: row.revision,
  saveId: row.saveId,
  templateVersion: READINESS_VERSION,
});
for (const [slug, items] of Object.entries(readinessTemplates))
  test(`${slug} has reviewed, unique preparation items and trusted references`, () => {
    assert.ok(items.length >= 4);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length);
    assert.equal(items.at(-1).id, "confirm-current");
    for (const item of items) {
      const url = new URL(item.source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(
        url.hostname.endsWith(".gov.in") || url.hostname === "www.pfrda.org.in",
      );
      assert.ok(item.title && item.detail && item.kind);
    }
  });
test("No checklist never means 100 percent complete; template changes withhold old marks", () => {
  assert.equal(
    readinessEntry({ slug: "future" }, null).progress.complete,
    false,
  );
  const old = readinessEntry(
    { slug: "pmsby" },
    { slug: "pmsby", templateVersion: "old", completedIds: ["account"] },
  );
  assert.equal(old.versionChanged, true);
  assert.equal(old.progress.completed, 0);
});
test("Unknown stored item IDs do not increase progress and responses do not mutate input", () => {
  const saved = {
      slug: "pmsby",
      templateVersion: READINESS_VERSION,
      completedIds: ["account", "forged", "account"],
    },
    before = JSON.stringify(saved);
  assert.equal(readinessEntry({ slug: "pmsby" }, saved).progress.completed, 1);
  assert.equal(JSON.stringify(saved), before);
});
test("Login return preserves preparation query and rejects unsafe destinations", () => {
  assert.equal(
    safeReturnPath("/readiness?scheme=pmsby"),
    "/readiness?scheme=pmsby",
  );
  for (const path of [
    "//evil.example/readiness",
    "/readiness/../login",
    "/readiness/nested",
    "https://evil.example",
  ])
    assert.equal(safeReturnPath(path), "/dashboard");
});
test("Every method requires valid JWT, expiration, HS256 and existing user", async () => {
  for (const method of ["get", "put", "patch", "delete"])
    await request(app)
      [method](method === "get" ? "/api/readiness" : "/api/readiness/pmsby")
      .expect(401);
  for (const token of [
    "invalid",
    jwt.sign({}, process.env.JWT_SECRET, { subject: a.id, expiresIn: -1 }),
    jwt.sign({}, process.env.JWT_SECRET, { subject: a.id, algorithm: "HS384" }),
    jwt.sign({}, process.env.JWT_SECRET, {
      subject: new mongoose.Types.ObjectId().toString(),
    }),
  ])
    await get(token).expect(401);
});
test("First read returns six previews without writing profile or saved rows", async () => {
  const res = await get().expect(200);
  assert.equal(res.body.entries.length, 6);
  assert.ok(
    res.body.entries.every((i) => !i.saved && i.progress.completed === 0),
  );
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(await SavedScheme.countDocuments(), 0);
  assert.equal(await Profile.countDocuments(), 0);
});
test("Parallel saves are idempotent with a single unique owner record and timestamps", async () => {
  const rows = await Promise.all(
    Array.from({ length: 5 }, () => save().expect(200)),
  );
  entry = rows[0].body.entry;
  assert.ok(entry.saved);
  assert.equal(entry.revision, 0);
  assert.ok(Date.parse(entry.createdAt));
  assert.ok(Date.parse(entry.updatedAt));
  assert.equal(new Set(rows.map((r) => r.body.entry.saveId)).size, 1);
  assert.equal(
    await SavedScheme.countDocuments({ user: a._id, slug: "pmsby" }),
    1,
  );
});
test("Safe responses expose no owner/account metadata, documents or arbitrary notes", async () => {
  for (const row of (await get()).body.entries)
    for (const key of [
      "user",
      "_id",
      "__v",
      "password",
      "email",
      "notes",
      "documents",
    ])
      assert.equal(row[key], undefined);
});
test("A checklist mark persists and a repeat save preserves progress/revision/timestamps", async () => {
  entry = (await patch(input(entry)).expect(200)).body.entry;
  assert.equal(entry.progress.completed, 1);
  assert.equal(entry.progress.percentage, 25);
  const again = (await save().expect(200)).body.entry;
  assert.equal(again.revision, entry.revision);
  assert.equal(again.updatedAt, entry.updatedAt);
  assert.equal(again.progress.completed, 1);
  assert.equal(
    (await get()).body.entries.find((i) => i.slug === "pmsby").items[0]
      .completed,
    true,
  );
});
test("False unmarks a task, completed count reaches 100 only for all listed tasks", async () => {
  entry = (await patch(input(entry, "account", false)).expect(200)).body.entry;
  assert.equal(entry.progress.completed, 0);
  for (const item of readinessTemplates.pmsby)
    entry = (await patch(input(entry, item.id)).expect(200)).body.entry;
  assert.equal(entry.progress.percentage, 100);
  assert.equal(entry.progress.complete, true);
});
test("Concurrent stale writes permit one winner and never lose another checklist mark", async () => {
  const rows = await Promise.all([
    patch(input(entry, "account", false)),
    patch(input(entry, "form", false)),
  ]);
  assert.deepEqual(rows.map((r) => r.status).sort(), [200, 409]);
  entry = rows.find((r) => r.status === 200).body.entry;
  assert.equal(entry.progress.completed, 3);
});
test("Another account cannot see, mutate or delete the first owner's entry", async () => {
  assert.equal(
    (await get(tb)).body.entries.find((i) => i.slug === "pmsby").saved,
    false,
  );
  await patch(input(entry), "pmsby", tb).expect(404);
  await remove(entry, tb).expect(404);
  const other = (await save("pmsby", {}, tb).expect(200)).body.entry;
  assert.notEqual(other.saveId, entry.saveId);
  assert.equal(other.progress.completed, 0);
  await patch(input(entry), "pmsby", tb).expect(409);
  assert.equal(
    (await get()).body.entries.find((i) => i.slug === "pmsby").progress
      .completed,
    3,
  );
});
for (const [name, extra] of [
  ["string completion", { completed: "true" }],
  ["null completion", { completed: null }],
  ["unknown item", { itemId: "invented" }],
  ["wrong template", { templateVersion: "old" }],
  ["negative revision", { revision: -1 }],
  ["fractional revision", { revision: 1.5 }],
  ["missing revision", { revision: undefined }],
  ["missing save ID", { saveId: undefined }],
  ["owner override", { user: "someone" }],
  ["progress injection", { progress: 100 }],
  ["document content", { documents: ["Aadhaar number"] }],
  ["notes", { notes: "arbitrary text" }],
])
  test(`Rejects ${name} without modifying progress`, async () => {
    const before = await SavedScheme.findOne({
      user: a._id,
      slug: "pmsby",
    }).lean();
    const { body } = await patch({ ...input(entry), ...extra }).expect(400);
    assert.equal(body.success, false);
    assert.deepEqual(
      await SavedScheme.findOne({ user: a._id, slug: "pmsby" }).lean(),
      before,
    );
  });
test("Save/query/missing-row inputs are bounded and owner overrides rejected", async () => {
  await save("pmsby", { user: b.id }).expect(400);
  await save("missing-scheme").expect(404);
  await save("BAD").expect(404);
  await save("x".repeat(101)).expect(404);
  await get().query({ user: b.id }).expect(400);
  await patch(input(entry, "identity"), "pm-kisan").expect(404);
});
test("Stale removal fails, current removal deletes progress, resaving starts empty", async () => {
  await remove({ ...entry, revision: entry.revision - 1 }).expect(409);
  const old = entry;
  await remove(entry).expect(200);
  assert.equal(
    (await get()).body.entries.find((i) => i.slug === "pmsby").saved,
    false,
  );
  entry = (await save().expect(200)).body.entry;
  assert.equal(entry.progress.completed, 0);
  assert.notEqual(entry.saveId, old.saveId);
  await patch(input({ ...old, revision: 0 })).expect(409);
  await remove({ ...old, revision: 0 }).expect(409);
});
test("Changed templates reset prior marks without a GET write and can be re-reviewed", async () => {
  await SavedScheme.updateOne(
    { user: a._id, slug: "pmsby" },
    { $set: { templateVersion: "old", completedIds: ["account"] } },
  );
  const changed = (await get()).body.entries.find((i) => i.slug === "pmsby");
  assert.equal(changed.versionChanged, true);
  assert.equal(changed.progress.completed, 0);
  assert.equal(
    (await SavedScheme.findOne({ user: a._id, slug: "pmsby" })).templateVersion,
    "old",
  );
  entry = (await patch(input(changed, "form")).expect(200)).body.entry;
  assert.equal(entry.versionChanged, false);
  assert.equal(entry.progress.completed, 1);
  assert.equal(entry.items[0].completed, false);
});
test("Removed catalog entries remain explicitly unavailable and can be removed", async () => {
  const row = (await save("pm-kisan").expect(200)).body.entry;
  await Scheme.deleteOne({ slug: "pm-kisan" });
  const fixtures = await SavedScheme.create(
    ["zzz-retired", "aaa-retired"].map((slug) => ({
      user: a._id,
      slug,
      templateVersion: READINESS_VERSION,
    })),
  );
  const entries = (await get()).body.entries;
  assert.deepEqual(
    entries.map((item) => item.name),
    entries.map((item) => item.name).sort((a, b) => a.localeCompare(b, "en")),
  );
  const removed = entries.find((i) => i.slug === "pm-kisan");
  assert.equal(removed.available, false);
  assert.deepEqual(removed.items, []);
  assert.equal(removed.progress.complete, false);
  await patch(input(row, "land"), "pm-kisan").expect(404);
  await remove(removed).expect(200);
  await SavedScheme.deleteMany({
    _id: { $in: fixtures.map((row) => row._id) },
  });
  await seedSchemes();
});
test("Future catalog entry has honest unavailable checklist instead of invented tasks", async () => {
  const base = await Scheme.findOne({ slug: "pmsby" }).lean();
  delete base._id;
  await Scheme.create({ ...base, slug: "future-scheme", name: "Future entry" });
  const row = (await save("future-scheme").expect(200)).body.entry;
  assert.equal(row.items.length, 0);
  assert.equal(row.progress.complete, false);
  await patch(input(row, "account"), "future-scheme").expect(400);
  await remove(row).expect(200);
  await Scheme.deleteOne({ slug: "future-scheme" });
});
test("Readiness never updates account or profile data and respects explicit CORS", async () => {
  assert.equal(await Profile.countDocuments(), 0);
  assert.equal((await User.findById(a._id)).name, "Preparation a");
  assert.equal(
    (await get().set("Origin", process.env.CLIENT_URL).expect(200)).headers[
      "access-control-allow-origin"
    ],
    process.env.CLIENT_URL,
  );
  await get().set("Origin", "https://untrusted.example").expect(403);
});
test("Unexpected errors stay generic, with no production internals", async () => {
  const find = SavedScheme.find;
  SavedScheme.find = () => {
    throw new Error("sensitive-details");
  };
  try {
    const { body } = await get().expect(500);
    assert.deepEqual(body, {
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  } finally {
    SavedScheme.find = find;
  }
});
test("Mutation limit is independent and emits a safe 429", async () => {
  let res;
  for (let i = 0; i < 121; i++) {
    res = await save();
    if (res.status === 429) break;
  }
  assert.equal(res.status, 429);
  assert.equal(res.body.success, false);
  assert.ok(res.headers.ratelimit);
});
