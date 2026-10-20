import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import request from "supertest";
import { integration } from "./support/integration.js";
import User from "../src/models/User.js";
import AccountAction from "../src/models/AccountAction.js";
const f = await integration("verification");
const { flushMail, previewDirectory, removeMailPreviews } =
  await import("../src/services/mail.js");
let owner, first, second;
before(async () => {
  await f.setup();
  await AccountAction.init();
  owner = await f.account(`verification-${Date.now()}`);
});
after(async () => {
  await flushMail();
  await removeMailPreviews(owner.user.email);
  await f.cleanup();
});
const api = (path) => request(f.app).post("/api/account" + path);
async function link() {
  await flushMail();
  const mails = (
    await Promise.all(
      (await readdir(previewDirectory))
        .filter((n) => n.endsWith(".json"))
        .map(async (n) =>
          JSON.parse(await readFile(`${previewDirectory}/${n}`, "utf8")),
        ),
    )
  )
    .filter((m) => m.to === owner.user.email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return new URLSearchParams(
    new URL(mails[0].text.match(/https?:\/\/\S+/)[0]).hash.slice(1),
  ).get("token");
}
test("verification request requires authentication and never exposes a token", async () => {
  await api("/request-verification").send({}).expect(401);
  const response = await api("/request-verification")
    .set(owner.headers)
    .send({})
    .expect(200);
  first = await link();
  assert(!JSON.stringify(response.body).includes(first));
});
test("resending verification invalidates the old link", async () => {
  await api("/request-verification").set(owner.headers).send({}).expect(200);
  second = await link();
  assert.notEqual(first, second);
  await api("/verify-email").send({ token: first }).expect(400);
});
test("verification is explicit, single-use and does not issue a session", async () => {
  const response = await api("/verify-email")
    .send({ token: second })
    .expect(200);
  assert.equal(response.body.token, undefined);
  const status = await request(f.app)
    .get("/api/account")
    .set(owner.headers)
    .expect(200);
  assert(status.body.emailVerifiedAt);
  await api("/verify-email").send({ token: second }).expect(400);
  await api("/request-verification").set(owner.headers).send({}).expect(200);
  assert.equal(await AccountAction.countDocuments({ user: owner.user.id }), 0);
});
test("expired, wrong-purpose and mismatched-version verification links fail safely", async () => {
  for (const settings of [
    {
      expiresAt: new Date(Date.now() - 1000),
      purpose: "verify",
      sessionVersion: 0,
    },
    {
      expiresAt: new Date(Date.now() + 60000),
      purpose: "reset",
      sessionVersion: 0,
    },
    {
      expiresAt: new Date(Date.now() + 60000),
      purpose: "verify",
      sessionVersion: 99,
    },
  ]) {
    await AccountAction.deleteMany({ user: owner.user.id });
    const raw = randomBytes(32).toString("hex");
    await AccountAction.create({
      user: owner.user.id,
      emailAtIssue: owner.user.email,
      tokenHash: createHash("sha256").update(raw).digest("hex"),
      ...settings,
    });
    await api("/verify-email").send({ token: raw }).expect(400);
  }
});
test("verification metadata stays out of safe auth responses and registration cannot set it", async () => {
  const response = await request(f.app)
    .post("/api/auth/register")
    .send({
      name: "No Privileges",
      email: "cannot-verify@example.com",
      password: "long-password",
      emailVerifiedAt: new Date(),
      sessionVersion: 55,
    })
    .expect(201);
  const user = await User.findById(response.body.user.id).select(
    "+emailVerifiedAt +sessionVersion",
  );
  assert.equal(user.emailVerifiedAt, null);
  assert.equal(user.sessionVersion, 0);
  assert.equal(response.body.user.emailVerifiedAt, undefined);
});
test("concurrent use of one reset link succeeds once", async () => {
  await AccountAction.deleteMany({ user: owner.user.id });
  const raw = randomBytes(32).toString("hex");
  await AccountAction.create({
    user: owner.user.id,
    purpose: "reset",
    tokenHash: createHash("sha256").update(raw).digest("hex"),
    emailAtIssue: owner.user.email,
    sessionVersion: 0,
    expiresAt: new Date(Date.now() + 60000),
  });
  const responses = await Promise.all(
    [1, 2].map(() =>
      api("/reset-password").send({
        token: raw,
        password: "parallel-new-password",
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
});
