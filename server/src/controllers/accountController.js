import bcrypt from "bcrypt";
import { randomBytes, createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import AccountAction from "../models/AccountAction.js";
import AccountDeletion from "../models/AccountDeletion.js";
import { env } from "../config/env.js";
import { email, password } from "./authController.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { queueAction } from "../services/mail.js";
import { cleanDeletedAccount } from "../services/accountDeletion.js";
const token = z.string().regex(/^[a-f0-9]{64}$/);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const invalid = () =>
  new HttpError(400, "This link is invalid or expired. Request a new link.");
const versionFilter = (version) =>
  version === 0
    ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
    : { sessionVersion: version };
function input(schema, req) {
  if (Object.keys(req.query).length)
    throw new HttpError(400, "Unexpected query parameters.");
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    throw new HttpError(400, "Check the required fields and try again.");
  return parsed.data;
}
export function capabilities(req, res) {
  res.json({ success: true, mailMode: env.MAIL_MODE });
}
export function status(req, res) {
  res.json({
    success: true,
    emailVerifiedAt: req.user.emailVerifiedAt || null,
    mailMode: env.MAIL_MODE,
  });
}
async function issue(user, purpose) {
  if (!user || user.deletingAt || env.MAIL_MODE === "disabled") return;
  const raw = randomBytes(32).toString("hex");
  await AccountAction.findOneAndUpdate(
    { user: user._id, purpose },
    {
      $set: {
        tokenHash: hash(raw),
        emailAtIssue: user.email,
        sessionVersion: user.sessionVersion ?? 0,
        expiresAt: new Date(
          Date.now() + (purpose === "reset" ? 1800000 : 86400000),
        ),
      },
    },
    { upsert: true, runValidators: true },
  );
  queueAction({ to: user.email, purpose, token: raw, user: user._id });
}
export async function requestReset(req, res) {
  const { email: address } = input(z.object({ email }).strict(), req),
    started = Date.now();
  const user = await User.findOne({ email: address }).select(
    "+sessionVersion +deletingAt",
  );
  try {
    await issue(user, "reset");
  } catch {
    console.error("Account email request could not be queued.");
  }
  await delay(Math.max(0, 300 - (Date.now() - started)));
  res.json({
    success: true,
    message:
      "If an account matches, a reset link will be prepared. Check the configured email delivery method.",
  });
}
export async function requestVerification(req, res) {
  input(z.object({}).strict(), req);
  if (env.MAIL_MODE === "disabled")
    throw new HttpError(503, "Email delivery is not configured.");
  if (!req.user.emailVerifiedAt) await issue(req.user, "verify");
  res.json({
    success: true,
    message: "If verification is needed, a new link has been prepared.",
  });
}
async function consume(raw, purpose) {
  const action = await AccountAction.findOneAndDelete({
    tokenHash: hash(raw),
    purpose,
    expiresAt: { $gt: new Date() },
  });
  if (!action) throw invalid();
  return action;
}
export async function resetPassword(req, res) {
  const data = input(z.object({ token, password }).strict(), req);
  const encoded = await bcrypt.hash(data.password, 12);
  const action = await consume(data.token, "reset");
  const result = await User.updateOne(
    {
      _id: action.user,
      email: action.emailAtIssue,
      deletingAt: null,
      ...versionFilter(action.sessionVersion),
    },
    { $set: { password: encoded }, $inc: { sessionVersion: 1 } },
  );
  if (!result.modifiedCount) throw invalid();
  await AccountAction.deleteMany({ user: action.user });
  res.json({
    success: true,
    message:
      "Password changed. Sign in with your new password. Previous sessions are no longer valid.",
  });
}
export async function verifyEmail(req, res) {
  const data = input(z.object({ token }).strict(), req),
    action = await consume(data.token, "verify");
  const result = await User.updateOne(
    {
      _id: action.user,
      email: action.emailAtIssue,
      deletingAt: null,
      ...versionFilter(action.sessionVersion),
      emailVerifiedAt: null,
    },
    { $set: { emailVerifiedAt: new Date() } },
  );
  if (!result.modifiedCount) throw invalid();
  res.json({
    success: true,
    message:
      "Email verified. This confirms access to your email, not identity or scheme eligibility.",
  });
}
async function reauthenticate(req, value) {
  const user = await User.findById(req.user._id).select(
    "+password +deletingAt +sessionVersion",
  );
  if (
    !user ||
    user.deletingAt ||
    user.sessionVersion !== req.user.sessionVersion ||
    !(await bcrypt.compare(value, user.password))
  )
    throw new HttpError(400, "Your current password could not be confirmed.");
  return user;
}
const currentPassword = z
  .string()
  .min(1)
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72);
export async function deleteProfile(req, res) {
  const data = input(
    z
      .object({ password: currentPassword, confirmed: z.literal(true) })
      .strict(),
    req,
  );
  await reauthenticate(req, data.password);
  await Profile.deleteOne({ user: req.user._id });
  res.json({
    success: true,
    message:
      "Profile deleted. Your account and preparation records remain available.",
  });
}
export async function deleteAccount(req, res) {
  const data = input(
    z
      .object({ password: currentPassword, confirmation: z.literal("DELETE") })
      .strict(),
    req,
  );
  const user = await reauthenticate(req, data.password);
  await AccountDeletion.updateOne(
    { user: user._id },
    { $setOnInsert: { requestedAt: new Date() } },
    { upsert: true },
  );
  const disabled = await User.updateOne(
    {
      _id: user._id,
      deletingAt: null,
      ...versionFilter(user.sessionVersion ?? 0),
    },
    { $set: { deletingAt: new Date() }, $inc: { sessionVersion: 1 } },
  );
  if (!disabled.modifiedCount)
    throw new HttpError(409, "Account changed. Reload and try again.");
  try {
    await cleanDeletedAccount(user._id);
  } catch {
    console.error("Account disabled; personal data cleanup queued for retry.");
  }
  res
    .status(202)
    .json({
      success: true,
      message:
        "Account disabled. Personal data cleanup is queued; a minimal cleanup record is kept for 24 hours after completion.",
    });
}
