import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
const database = `sarkari_saathi_profile_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.JWT_SECRET = randomBytes(48).toString("base64");
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Profile } = await import("../src/models/Profile.js");
const { emptyProfile, STATES_AND_UTS } =
  await import("../../shared/profile.js");
let userA, userB, userC, tokenA, tokenB, tokenC;
const complete = {
  age: 22,
  state: "Uttar Pradesh",
  district: " Muzaffarnagar ",
  occupation: "student",
  annualHouseholdIncome: 240000,
};
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all([User.init(), Profile.init()]);
  [userA, userB, userC] = await User.create(
    ["a", "b", "c"].map((letter) => ({
      name: `Citizen ${letter}`,
      email: `${letter}@example.com`,
      password: "fixture-hash-not-used-for-login",
    })),
  );
  [tokenA, tokenB, tokenC] = [userA, userB, userC].map((user) =>
    jwt.sign({}, process.env.JWT_SECRET, {
      subject: user.id,
      expiresIn: "1h",
      algorithm: "HS256",
    }),
  );
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const get = (token) =>
  request(app).get("/api/profile").set("Authorization", `Bearer ${token}`);
const put = (body, token = tokenA) =>
  request(app)
    .put("/api/profile")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
test("profile requires authentication for reads and writes", async () => {
  await request(app).get("/api/profile").expect(401);
  await request(app).put("/api/profile").send(complete).expect(401);
  await get("bad-token").expect(401);
});
test("first read returns an empty profile without creating a database record", async () => {
  const res = await get(tokenA).expect(200);
  assert.equal(res.body.profile.age, null);
  assert.equal(res.body.profile.updatedAt, null);
  assert.equal(res.body.completion.percentage, 0);
  assert.equal(res.body.completion.isComplete, false);
  assert.equal(res.body.completion.missingFields.length, 4);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(await Profile.countDocuments(), 0);
});
test("partial draft can be saved and retrieved with exact completion", async () => {
  const res = await put({ ...emptyProfile(), age: 22 }).expect(200);
  assert.equal(res.body.completion.percentage, 25);
  assert.equal(res.body.completion.isComplete, false);
  assert.ok(res.body.profile.updatedAt);
  assert.equal(res.body.profile.user, undefined);
  assert.equal(res.body.profile._id, undefined);
  const stored = await Profile.findOne({ user: userA.id });
  assert.equal(stored.age, 22);
  assert.equal(stored.annualHouseholdIncome, null);
  assert.equal((await get(tokenA)).body.profile.age, 22);
});
test("complete profile trims district and ignores optional district for completion", async () => {
  const res = await put(complete).expect(200);
  assert.equal(res.body.profile.district, "Muzaffarnagar");
  assert.deepEqual(res.body.completion, {
    percentage: 100,
    completedFields: 4,
    totalFields: 4,
    isComplete: true,
    missingFields: [],
  });
  assert.equal(res.headers["cache-control"], "no-store");
});
test("another account sees only its own empty profile", async () => {
  const res = await get(tokenB).expect(200);
  assert.equal(res.body.completion.percentage, 0);
  assert.equal(res.body.profile.age, null);
  assert.equal(res.body.profile.district, "");
});
test("another account writes only its own document", async () => {
  await put({ ...emptyProfile(), age: 50 }, tokenB).expect(200);
  assert.equal((await get(tokenA)).body.profile.age, 22);
  assert.equal((await get(tokenB)).body.profile.age, 50);
  assert.equal(await Profile.countDocuments(), 2);
});
for (const [name, changes] of [
  ["negative age", { age: -1 }],
  ["over-limit age", { age: 121 }],
  ["fractional age", { age: 22.5 }],
  ["numeric string age", { age: "22" }],
  ["unknown state", { state: "Unknown State" }],
  ["unknown occupation", { occupation: "invented" }],
  ["negative income", { annualHouseholdIncome: -1 }],
  ["fractional income", { annualHouseholdIncome: 12.5 }],
  ["excessive income", { annualHouseholdIncome: 1000000001 }],
  ["numeric string income", { annualHouseholdIncome: "0" }],
  ["invalid district", { district: "A" }],
  ["long district", { district: "A".repeat(81) }],
])
  test(`rejects ${name} without altering saved profile`, async () => {
    const res = await put({ ...complete, ...changes }).expect(400);
    assert.equal(res.body.success, false);
    assert.equal((await get(tokenA)).body.profile.age, 22);
  });
test("rejects owner injection, account updates, and client-provided completion", async () => {
  for (const injection of [
    { user: userB.id },
    { userId: userB.id },
    { email: "changed@example.com" },
    { completion: { percentage: 100 } },
    { $set: { age: 1 } },
  ])
    await put({ ...complete, ...injection }).expect(400);
  assert.equal((await get(tokenB)).body.profile.age, 50);
  assert.equal((await User.findById(userA.id)).email, "a@example.com");
});
test("PUT requires a complete replacement shape; supports explicit blanks", async () => {
  await put({ age: 30 }).expect(400);
  const res = await put(emptyProfile()).expect(200);
  assert.equal(res.body.completion.percentage, 0);
  assert.equal(res.body.profile.age, null);
});
test("zero income and zero age count as supplied; district stays optional", async () => {
  const res = await put({
    ...complete,
    age: 0,
    annualHouseholdIncome: 0,
    district: "",
  }).expect(200);
  assert.equal(res.body.completion.percentage, 100);
  assert.equal(res.body.profile.age, 0);
  assert.equal(res.body.profile.annualHouseholdIncome, 0);
});
test("editing existing profile replaces fields without creating duplicates", async () => {
  const res = await put({
    ...complete,
    age: 31,
    state: "Delhi",
    district: "",
    occupation: "salaried",
  }).expect(200);
  assert.equal(res.body.profile.age, 31);
  assert.equal(res.body.profile.state, "Delhi");
  assert.equal(await Profile.countDocuments({ user: userA.id }), 1);
});
test("parallel first saves keep one owner-scoped record", async () => {
  const results = await Promise.all([
    put({ ...complete, age: 44 }, tokenC),
    put({ ...complete, age: 45 }, tokenC),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );
  assert.equal(await Profile.countDocuments({ user: userC.id }), 1);
  assert.ok([44, 45].includes((await get(tokenC)).body.profile.age));
});
test("state choices include merged territory and Ladakh exactly once", () => {
  assert.equal(STATES_AND_UTS.length, 36);
  assert.equal(new Set(STATES_AND_UTS).size, 36);
  assert.ok(STATES_AND_UTS.includes("Ladakh"));
  assert.ok(
    STATES_AND_UTS.includes("Dadra and Nagar Haveli and Daman and Diu"),
  );
});
