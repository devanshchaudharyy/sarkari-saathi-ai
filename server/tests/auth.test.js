import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
const database = `sarkari_saathi_test_${Date.now()}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.JWT_SECRET = randomBytes(48).toString("base64");
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "production";
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { errorMiddleware } =
  await import("../src/middleware/errorMiddleware.js");
let token, userId;
const input = {
  name: " Test Citizen ",
  email: " CITIZEN@example.com ",
  password: "password123",
};
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await User.init();
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("health returns exact public contract and security headers", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.deepEqual(res.body, {
    success: true,
    message: "SarkariSaathi API is running",
  });
  assert.ok(res.headers["x-content-type-options"]);
  assert.equal(res.headers["x-powered-by"], undefined);
});
test("registration normalizes identity, hashes password, and returns safe JWT data", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send(input)
    .expect(201);
  assert.equal(res.body.user.name, "Test Citizen");
  assert.equal(res.body.user.email, "citizen@example.com");
  assert.equal(res.body.user.password, undefined);
  assert.ok(res.body.user.createdAt);
  token = res.body.token;
  userId = res.body.user.id;
  assert.equal(jwt.verify(token, process.env.JWT_SECRET).sub, userId);
  const user = await User.findById(userId).select("+password");
  assert.notEqual(user.password, input.password);
  assert.equal(await bcrypt.compare(input.password, user.password), true);
  assert.equal((await User.findById(userId)).password, undefined);
});
test("duplicate email is case insensitive", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send(input)
    .expect(409);
  assert.equal(res.body.success, false);
});
for (const [description, changes] of [
  ["missing name", { name: undefined }],
  ["missing email", { email: undefined }],
  ["missing password", { password: undefined }],
  ["invalid email", { email: "not-an-email" }],
  ["short password", { password: "short" }],
  ["oversize multibyte password", { password: "🧭".repeat(19) }],
  ["short name", { name: "a" }],
  ["long name", { name: "a".repeat(81) }],
  ["non-string password", { password: 123456789 }],
])
  test(`registration rejects ${description}`, async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...input, ...changes })
      .expect(400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.stack, undefined);
  });
test("registration race returns one success and one conflict", async () => {
  const results = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post("/api/auth/register")
        .send({ ...input, email: "race@example.com" }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
test("valid login returns safe user data", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: input.email, password: input.password })
    .expect(200);
  assert.equal(res.body.user.id, userId);
  assert.equal(res.body.user.password, undefined);
});
test("incorrect password and unknown account have matching generic errors", async () => {
  const a = await request(app)
    .post("/api/auth/login")
    .send({ email: "citizen@example.com", password: "wrongpassword" })
    .expect(401);
  const b = await request(app)
    .post("/api/auth/login")
    .send({ email: "unknown@example.com", password: "wrongpassword" })
    .expect(401);
  assert.deepEqual(a.body, b.body);
  assert.equal(a.body.message, "Invalid email or password");
});
for (const body of [
  {},
  { email: "citizen@example.com" },
  { password: "password123" },
])
  test(`login rejects missing fields ${Object.keys(body).join(",")}`, async () => {
    await request(app).post("/api/auth/login").send(body).expect(400);
  });
test("me accepts a valid token and never returns password", async () => {
  const res = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(res.body.user.id, userId);
  assert.equal(res.body.user.password, undefined);
});
test("me rejects absent, malformed, invalid, expired and wrong algorithm tokens", async () => {
  const expired = jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId,
    expiresIn: -10,
  });
  const algorithm = jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId,
    algorithm: "HS384",
  });
  for (const auth of [
    undefined,
    "Bearer bad",
    "Basic token",
    `Bearer ${expired}`,
    `Bearer ${algorithm}`,
  ]) {
    let req = request(app).get("/api/auth/me");
    if (auth) req = req.set("Authorization", auth);
    const res = await req.expect(401);
    assert.equal(res.body.success, false);
  }
});
test("me rejects token for a deleted user", async () => {
  const ghost = jwt.sign({}, process.env.JWT_SECRET, {
    subject: new mongoose.Types.ObjectId().toString(),
  });
  await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${ghost}`)
    .expect(401);
});
test("CORS accepts only configured origin", async () => {
  const allowed = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:5173")
    .expect(200);
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
  await request(app)
    .get("/api/health")
    .set("Origin", "https://untrusted.example")
    .expect(403);
});
test("malformed JSON and unknown routes use consistent error contract", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
  assert.equal(res.body.message, "Invalid JSON request.");
  await request(app).get("/missing").expect(404);
});
test("production errors hide stack traces and internal messages", () => {
  let body;
  const res = {
    headersSent: false,
    status(code) {
      assert.equal(code, 500);
      return this;
    },
    json(value) {
      body = value;
    },
  };
  errorMiddleware(new Error("private database details"), {}, res, () => {});
  assert.deepEqual(body, {
    success: false,
    message: "Something went wrong. Please try again later.",
  });
});
test("password whitespace is preserved", async () => {
  const password = " password123 ";
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Whitespace Citizen",
      email: "whitespace@example.com",
      password,
    })
    .expect(201);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "whitespace@example.com", password })
    .expect(200);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "whitespace@example.com", password: password.trim() })
    .expect(401);
});
test("oversized payload is rejected with a safe error", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "a".repeat(17000) })
    .expect(413);
  assert.equal(res.body.success, false);
  assert.equal(res.body.stack, undefined);
});
test("authentication endpoints enforce a rate limit", async () => {
  let last;
  for (let i = 0; i < 31; i++)
    last = await request(app).post("/api/auth/login").send({});
  assert.equal(last.status, 429);
  assert.equal(last.body.success, false);
});
