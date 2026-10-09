import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
const database = `sarkari_saathi_schemes_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.JWT_SECRET = randomBytes(48).toString("base64");
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");
const { default: Scheme } = await import("../src/models/Scheme.js");
const { seedSchemes } = await import("../src/utils/seedSchemes.js");
const { catalog } = await import("../src/data/schemes.js");
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await Scheme.init();
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const list = (query = {}) => request(app).get("/api/schemes").query(query);
test("empty database is honest and public", async () => {
  const { body } = await list().expect(200);
  assert.equal(body.catalog.total, 0);
  assert.equal(body.catalog.reviewedAt, null);
  assert.deepEqual(body.schemes, []);
  assert.equal(body.pagination.totalPages, 0);
});
test("seed is idempotent and preserves unrelated catalog records", async () => {
  await seedSchemes();
  await seedSchemes();
  assert.equal(await Scheme.countDocuments(), 6);
  await Scheme.create({
    ...catalog[0],
    slug: "unrelated-scheme",
    searchText: "unrelated",
  });
  await seedSchemes();
  assert.equal(await Scheme.countDocuments(), 7);
  await Scheme.deleteOne({ slug: "unrelated-scheme" });
});
test("public listing returns safe summaries, counts and deterministic order", async () => {
  const res = await list().expect(200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.schemes.length, 6);
  assert.deepEqual(res.body.pagination, {
    page: 1,
    limit: 6,
    total: 6,
    totalPages: 1,
  });
  assert.deepEqual(res.body.catalog.stateCoverage, ["Uttar Pradesh"]);
  assert.equal(
    res.body.catalog.categories.find(({ value }) => value === "insurance")
      .count,
    2,
  );
  assert.equal(res.headers["cache-control"], "no-store");
  for (const scheme of res.body.schemes) {
    for (const hidden of [
      "_id",
      "__v",
      "searchText",
      "keywords",
      "benefits",
      "password",
      "user",
    ])
      assert.equal(scheme[hidden], undefined);
  }
  const names = res.body.schemes.map((scheme) => scheme.name);
  assert.deepEqual(names, [...names].sort());
});
test("search is case-insensitive, trimmed and supports keywords and acronyms", async () => {
  for (const q of ["  pM-kIsAn  ", "farmer"]) {
    const { body } = await list({ q }).expect(200);
    assert.equal(body.pagination.total, 1);
    assert.equal(body.schemes[0].slug, "pm-kisan");
  }
  assert.equal((await list({ q: "insurance" })).body.pagination.total, 2);
});
test("search treats regex operators as literal text", async () => {
  for (const q of [".*", "[", "$where", "(a+)+$"])
    assert.equal((await list({ q }).expect(200)).body.pagination.total, 0);
});
test("category, level and location combine without personal matching", async () => {
  assert.equal(
    (await list({ category: "insurance" })).body.pagination.total,
    2,
  );
  const up = await list({ state: "Uttar Pradesh" }).expect(200);
  assert.equal(up.body.pagination.total, 6);
  assert.equal((await list({ state: "Delhi" })).body.pagination.total, 5);
  assert.equal(
    (await list({ level: "state", state: "Delhi" })).body.pagination.total,
    0,
  );
  assert.equal(
    (
      await list({
        level: "state",
        state: "Uttar Pradesh",
        category: "women-education",
      })
    ).body.schemes[0].slug,
    "up-kanya-sumangala",
  );
  assert.equal(
    (await list({ level: "central", category: "women-education" })).body
      .pagination.total,
    0,
  );
});
test("pagination has stable, non-overlapping pages and accurate totals", async () => {
  const first = (await list({ limit: "2" }).expect(200)).body;
  const second = (await list({ limit: "2", page: "2" }).expect(200)).body;
  assert.equal(first.pagination.totalPages, 3);
  assert.equal(second.schemes.length, 2);
  assert.equal(
    first.schemes.some((scheme) =>
      second.schemes.some((other) => other.slug === scheme.slug),
    ),
    false,
  );
  const outOfRange = (await list({ page: "999" }).expect(200)).body;
  assert.deepEqual(outOfRange.schemes, []);
  assert.equal(outOfRange.pagination.total, 6);
});
for (const [name, query] of [
  ["long search", { q: "a".repeat(101) }],
  ["unknown category", { category: "fake" }],
  ["unknown level", { level: "district" }],
  ["unknown state", { state: "fake" }],
  ["zero page", { page: "0" }],
  ["negative page", { page: "-1" }],
  ["fractional page", { page: "1.5" }],
  ["huge page", { page: "10001" }],
  ["excessive limit", { limit: "25" }],
  ["zero limit", { limit: "0" }],
  ["unknown parameter", { userId: "owner" }],
  ["operator injection", { "q[$ne]": "x" }],
])
  test(`rejects ${name}`, async () => {
    const { body } = await list(query).expect(400);
    assert.equal(body.success, false);
    assert.equal(typeof body.message, "string");
    assert.equal(body.stack, undefined);
  });
test("rejects repeated query parameters", async () => {
  await request(app).get("/api/schemes?q=a&q=b").expect(400);
});
test("details expose reviewed sources but no database metadata", async () => {
  for (const record of catalog) {
    const { body } = await request(app)
      .get(`/api/schemes/${record.slug}`)
      .expect(200);
    assert.equal(body.scheme.slug, record.slug);
    assert.ok(body.scheme.sources.length);
    assert.ok(body.scheme.eligibility.length);
    assert.equal(body.scheme.reviewedAt, "2026-10-08");
    for (const hidden of [
      "_id",
      "__v",
      "searchText",
      "keywords",
      "createdAt",
      "updatedAt",
    ])
      assert.equal(body.scheme[hidden], undefined);
    for (const url of [
      body.scheme.officialUrl,
      ...body.scheme.sources.map((source) => source.url),
    ]) {
      const parsed = new URL(url);
      assert.equal(parsed.protocol, "https:");
      assert.ok(parsed.hostname.endsWith(".gov.in"));
    }
  }
});
test("unknown, malformed and overlong detail slugs use safe 404 errors", async () => {
  for (const slug of ["unknown-scheme", "%24where", "a".repeat(101)]) {
    const { body } = await request(app).get(`/api/schemes/${slug}`).expect(404);
    assert.deepEqual(body, {
      success: false,
      message: "Scheme not found in this catalog.",
    });
  }
});
test("catalog remains public with a rejected bearer token", async () => {
  await request(app)
    .get("/api/schemes")
    .set("Authorization", "Bearer invalid")
    .expect(200);
});
test("CORS protects the catalog consistently", async () => {
  const allowed = await request(app)
    .get("/api/schemes")
    .set("Origin", process.env.CLIENT_URL)
    .expect(200);
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    process.env.CLIENT_URL,
  );
  await request(app)
    .get("/api/schemes")
    .set("Origin", "https://untrusted.example")
    .expect(403);
});
test("public catalog has no mutation endpoints", async () => {
  await request(app).post("/api/schemes").send(catalog[0]).expect(404);
  await request(app)
    .put("/api/schemes/pm-kisan")
    .send({ name: "Changed" })
    .expect(404);
  await request(app).delete("/api/schemes/pm-kisan").expect(404);
  assert.equal(
    (await Scheme.findOne({ slug: "pm-kisan" })).name,
    catalog[0].name,
  );
});
test("seed validation rejects untrusted URL protocols", async () => {
  await assert.rejects(
    new Scheme({
      ...catalog[0],
      officialUrl: "javascript:alert(1)",
      searchText: "test",
    }).validate(),
    { name: "ValidationError" },
  );
});
