import { mkdir, writeFile, readdir, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import User from "../models/User.js";
export const previewDirectory = fileURLToPath(
  new URL("../../../reports/mail/", import.meta.url),
);
const pending = new Set();
let transport;
export function smtpOptions(config = env) {
  return {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    requireTLS: !config.SMTP_SECURE,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
  };
}
export async function deliverAction({ to, purpose, token, user }) {
  if (env.MAIL_MODE === "disabled") return;
  if (user && !(await User.exists({ _id: user, deletingAt: null }))) return;
  const route = purpose === "reset" ? "reset-password" : "verify-email";
  const url = `${env.CLIENT_URL}/${route}#token=${token}`;
  const mail = {
    from: env.SMTP_FROM || "preview@sarkarisaathi.local",
    to,
    subject:
      purpose === "reset"
        ? "Reset your SarkariSaathi password"
        : "Verify your SarkariSaathi email",
    text: `SarkariSaathi account control\n\n${url}\n\nThis single-use link expires in ${purpose === "reset" ? "30 minutes" : "24 hours"}. Only the latest requested link works. If you did not request this, ignore it. SarkariSaathi is an independent project, not an official government service.`,
  };
  if (env.MAIL_MODE === "preview") {
    await mkdir(previewDirectory, { recursive: true, mode: 0o700 });
    const path = `${previewDirectory}/${randomUUID()}.json`;
    await writeFile(
      path,
      JSON.stringify({ ...mail, purpose, createdAt: new Date().toISOString() }),
      { flag: "wx", mode: 0o600 },
    );
    if (user && !(await User.exists({ _id: user, deletingAt: null })))
      await unlink(path).catch(() => {});
  } else {
    transport ??= nodemailer.createTransport(smtpOptions());
    await transport.sendMail(mail);
  }
}
export function queueAction(mail) {
  const task = deliverAction(mail).catch(() =>
    console.error("Account email delivery failed; check mail configuration."),
  );
  pending.add(task);
  task.finally(() => pending.delete(task));
}
export async function flushMail() {
  await Promise.allSettled([...pending]);
}
export async function removeMailPreviews(address) {
  if (env.MAIL_MODE !== "preview") return;
  for (const name of await readdir(previewDirectory).catch(() => [])) {
    if (!/^[a-f0-9-]+\.json$/.test(name)) continue;
    const path = `${previewDirectory}/${name}`;
    let mail;
    try {
      mail = JSON.parse(await readFile(path, "utf8"));
    } catch {
      continue;
    }
    if (mail.to === address) await unlink(path).catch(() => {});
  }
}
