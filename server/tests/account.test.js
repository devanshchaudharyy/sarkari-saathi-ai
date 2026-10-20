import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { integration } from "./support/integration.js";
import User from "../src/models/User.js";
import Profile from "../src/models/Profile.js";
import SavedScheme from "../src/models/SavedScheme.js";
import Application from "../src/models/Application.js";
import Reminder from "../src/models/Reminder.js";
import StaffAccess from "../src/models/StaffAccess.js";
import AccountAction from "../src/models/AccountAction.js";
import AccountDeletion from "../src/models/AccountDeletion.js";
const f = await integration("account");
const { flushMail, previewDirectory, removeMailPreviews, smtpOptions } =
  await import("../src/services/mail.js");
const { processAccountDeletions } =
  await import("../src/services/accountDeletion.js");
const { parseEnvironment } = await import("../src/config/environment.js");
let owner, other, resetOne, resetTwo, verifyOne, verifyTwo;
const password = " initial-password ",
  nextPassword = " replacement-password ";
const address = `account-test-${Date.now()}@example.com`;
const api = (method, path = "") =>
  request(f.app)[method]("/api/account" + path);
const privateApi = (method, path = "") => api(method, path).set(owner.headers);
async function latest(purpose) {
  await flushMail();
  const mails = (
    await Promise.all(
      (await readdir(previewDirectory))
        .filter((x) => x.endsWith(".json"))
        .map(async (name) =>
          JSON.parse(await readFile(`${previewDirectory}/${name}`, "utf8")),
        ),
    )
  )
    .filter((x) => x.to === address && x.purpose === purpose)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const mail = mails[0];
  assert(mail);
  const url = new URL(mail.text.match(/https?:\/\/\S+/)[0]);
  assert.equal(url.search, "");
  assert.equal(url.origin, "http://localhost:5176");
  return new URLSearchParams(url.hash.slice(1)).get("token");
}
before(async () => {
  await f.setup();
  await Promise.all(
    [User, AccountAction, AccountDeletion, StaffAccess].map((m) => m.init()),
  );
  const user = await User.create({
    name: "Account Test",
    email: address,
    password: await bcrypt.hash(password, 12),
  });
  owner = {
    user,
    headers: {
      Authorization: `Bearer ${jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: user.id, algorithm: "HS256", expiresIn: "1h" })}`,
    },
  };
  other = await f.account("account-other");
});
after(async () => {
  await flushMail();
  await removeMailPreviews(address);
  await f.cleanup();
});
test("account status is protected and safe; capabilities expose no SMTP credentials", async () => {
  await api("get").expect(401);
  assert.deepEqual((await api("get", "/capabilities")).body, {
    success: true,
    mailMode: "preview",
  });
  assert.deepEqual((await privateApi("get")).body, {
    success: true,
    emailVerifiedAt: null,
    mailMode: "preview",
  });
  const safe = (await request(f.app).get("/api/auth/me").set(owner.headers))
    .body.user;
  assert.deepEqual(
    Object.keys(safe).sort(),
    ["id", "name", "email", "createdAt", "updatedAt"].sort(),
  );
});
test("request validation rejects malformed addresses, missing and extra fields", async () => {
  for (const body of [
    {},
    { email: "bad" },
    { email: address, user: other.user.id },
  ])
    await api("post", "/request-reset").send(body).expect(400);
});
test("known and unknown reset requests have identical generic responses and minimum response delay", async () => {
  const start = Date.now();
  const a = await api("post", "/request-reset")
    .send({ email: address })
    .expect(200);
  resetOne = await latest("reset");
  const b = await api("post", "/request-reset")
    .send({ email: "unknown@example.com" })
    .expect(200);
  assert.deepEqual(a.body, b.body);
  assert(Date.now() - start >= 550);
  assert.equal(JSON.stringify(a.body).includes(resetOne), false);
});
test("new reset issuance replaces the previous token and stores only a hash", async () => {
  await api("post", "/request-reset")
    .send({ email: address.toUpperCase() })
    .expect(200);
  resetTwo = await latest("reset");
  assert.notEqual(resetOne, resetTwo);
  const row = await AccountAction.findOne({
    user: owner.user.id,
    purpose: "reset",
  });
  assert.equal(
    row.tokenHash,
    createHash("sha256").update(resetTwo).digest("hex"),
  );
  assert(!JSON.stringify(row).includes(resetTwo));
  await api("post", "/reset-password")
    .send({ token: resetOne, password: nextPassword })
    .expect(400);
});
test("reset rejects short and oversized UTF8 passwords without consuming the valid link", async () => {
  for (const value of ["tiny", "🧭".repeat(19)])
    await api("post", "/reset-password")
      .send({ token: resetTwo, password: value })
      .expect(400);
  assert.equal(
    await AccountAction.countDocuments({
      user: owner.user.id,
      purpose: "reset",
    }),
    1,
  );
});
test("one successful reset preserves whitespace, hashes password and revokes old JWTs", async () => {
  await api("post", "/reset-password")
    .send({ token: resetTwo, password: nextPassword })
    .expect(200);
  await request(f.app).get("/api/auth/me").set(owner.headers).expect(401);
  const user = await User.findById(owner.user.id).select(
    "+password +sessionVersion",
  );
  assert.equal(user.sessionVersion, 1);
  assert(await bcrypt.compare(nextPassword, user.password));
  assert(!(await bcrypt.compare(nextPassword.trim(), user.password)));
  await request(f.app)
    .post("/api/auth/login")
    .send({ email: address, password })
    .expect(401);
  const login = await request(f.app)
    .post("/api/auth/login")
    .send({ email: address, password: nextPassword })
    .expect(200);
  owner.headers.Authorization = `Bearer ${login.body.token}`;
  await privateApi("get").expect(200);
});
test("used, missing, malformed and expired action tokens return 400 without affecting a valid session", async () => {
  for (const value of [resetTwo, "a".repeat(64), "bad"])
    await api("post", "/reset-password")
      .send({ token: value, password: nextPassword })
      .expect(400);
  const raw = randomBytes(32).toString("hex");
  await AccountAction.create({
    user: owner.user.id,
    purpose: "reset",
    tokenHash: createHash("sha256").update(raw).digest("hex"),
    emailAtIssue: address,
    sessionVersion: 1,
    expiresAt: new Date(Date.now() - 1000),
  });
  await api("post", "/reset-password")
    .send({ token: raw, password: nextPassword })
    .expect(400);
  await privateApi("get").expect(200);
});
test("issuance rate limits include invalid requests and unknown accounts", async () => {
  const response = await api("post", "/request-reset")
    .send({ email: address })
    .expect(429);
  assert.equal(response.body.success, false);
});
test("SMTP requires complete configuration and preview mode refuses public origins", () => {
  const valid = {
    ...process.env,
    CLIENT_URL: "https://example.com",
    NODE_ENV: "production",
  };
  assert.equal(
    parseEnvironment({ ...valid, MAIL_MODE: undefined }).MAIL_MODE,
    "disabled",
  );
  assert.throws(() => parseEnvironment({ ...valid, MAIL_MODE: "preview" }));
  assert.throws(() => parseEnvironment({ ...valid, MAIL_MODE: "smtp" }));
  const configured = parseEnvironment({
    ...valid,
    MAIL_MODE: "smtp",
    SMTP_HOST: "smtp.example.com",
    SMTP_USER: "user",
    SMTP_PASS: "secret",
    SMTP_FROM: "mail@example.com",
  });
  const options = smtpOptions(configured);
  assert(options.requireTLS);
  assert(options.disableFileAccess);
  assert(options.disableUrlAccess);
  assert.equal(options.debug, false);
});
test("profile deletion requires current password and explicit confirmation", async () => {
  await Profile.create({ user: owner.user.id, age: 34 });
  await privateApi("delete", "/profile")
    .send({ password: nextPassword })
    .expect(400);
  await privateApi("delete", "/profile")
    .send({ password: "wrong", confirmed: true })
    .expect(400);
  assert(await Profile.exists({ user: owner.user.id }));
  await privateApi("delete", "/profile")
    .send({ password: nextPassword, confirmed: true, user: other.user.id })
    .expect(400);
});
test("profile-only deletion preserves account and other private records", async () => {
  await SavedScheme.create({
    user: owner.user.id,
    slug: "pmsby",
    templateVersion: "test",
  });
  await Profile.create({ user: other.user.id, age: 28 });
  await privateApi("delete", "/profile")
    .send({ password: nextPassword, confirmed: true })
    .expect(200);
  assert.equal(await Profile.countDocuments({ user: owner.user.id }), 0);
  assert(await Profile.exists({ user: other.user.id }));
  assert(await SavedScheme.exists({ user: owner.user.id }));
  await privateApi("get").expect(200);
});
test("account deletion refuses wrong password, missing typed confirmation and owner injection", async () => {
  for (const data of [
    { password: "wrong", confirmation: "DELETE" },
    { password: nextPassword, confirmation: "delete" },
    { password: nextPassword, confirmation: "DELETE", user: other.user.id },
  ])
    await privateApi("delete").send(data).expect(400);
  assert(await User.exists({ _id: owner.user.id }));
});
test("retry cleanup ignores active accounts even with a pending job", async () => {
  await AccountDeletion.create({ user: other.user.id });
  await processAccountDeletions();
  assert(await User.exists({ _id: other.user.id }));
  assert(await Profile.exists({ user: other.user.id }));
});
test("account deletion removes every owned collection, rejects sessions and preserves other users", async () => {
  await Profile.create({ user: owner.user.id, age: 34 });
  await Application.create({
    user: owner.user.id,
    slug: "pmsby",
    name: "Test",
    acronym: "PMSBY",
    events: [],
  });
  await Reminder.create({
    user: owner.user.id,
    slug: "pmsby",
    name: "Test",
    acronym: "PMSBY",
    kind: "prepare",
    dueOn: "2099-01-01",
  });
  await StaffAccess.create({ user: owner.user.id, role: "editor" });
  await privateApi("delete")
    .send({ password: nextPassword, confirmation: "DELETE" })
    .expect(202);
  for (const model of [
    Profile,
    SavedScheme,
    Application,
    Reminder,
    StaffAccess,
    AccountAction,
  ])
    assert.equal(await model.countDocuments({ user: owner.user.id }), 0);
  assert.equal(await User.countDocuments({ _id: owner.user.id }), 0);
  await privateApi("get").expect(401);
  assert(await Profile.exists({ user: other.user.id }));
  const job = await AccountDeletion.findOne({ user: owner.user.id });
  assert(job.completedAt);
  assert(job.expiresAt);
  assert.equal(job.email, undefined);
});
test("replayed cleanup removes a late write and does not extend the cleanup retention deadline", async () => {
  const before = await AccountDeletion.findOne({ user: owner.user.id });
  await Profile.create({ user: owner.user.id, age: 21 });
  const sweep = processAccountDeletions();
  assert.equal(processAccountDeletions(), sweep);
  await sweep;
  assert.equal(await Profile.countDocuments({ user: owner.user.id }), 0);
  const after = await AccountDeletion.findOne({ user: owner.user.id });
  assert.equal(+before.expiresAt, +after.expiresAt);
});
test("cleanup failure leaves sign-in disabled and a durable retry removes remaining records", async () => {
  const user = await User.create({
    name: "Cleanup Retry",
    email: "cleanup-retry@example.com",
    password: await bcrypt.hash(nextPassword, 12),
  });
  const headers = {
    Authorization: `Bearer ${jwt.sign({ ver: 0 }, process.env.JWT_SECRET, { subject: user.id, algorithm: "HS256", expiresIn: "1h" })}`,
  };
  await Reminder.create({
    user: user.id,
    slug: "pmsby",
    name: "Retry",
    acronym: "PMSBY",
    kind: "prepare",
    dueOn: "2099-01-01",
  });
  const original = Reminder.deleteMany;
  try {
    Reminder.deleteMany = () =>
      Promise.reject(new Error("Simulated cleanup failure"));
    await api("delete")
      .set(headers)
      .send({ password: nextPassword, confirmation: "DELETE" })
      .expect(202);
    await request(f.app).get("/api/auth/me").set(headers).expect(401);
    assert((await User.findById(user.id).select("+deletingAt")).deletingAt);
    assert.equal(
      (await AccountDeletion.findOne({ user: user.id })).completedAt,
      undefined,
    );
  } finally {
    Reminder.deleteMany = original;
  }
  await processAccountDeletions();
  assert.equal(await User.countDocuments({ _id: user.id }), 0);
  assert.equal(await Reminder.countDocuments({ user: user.id }), 0);
  assert((await AccountDeletion.findOne({ user: user.id })).completedAt);
});
