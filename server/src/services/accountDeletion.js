import User from "../models/User.js";
import Profile from "../models/Profile.js";
import SavedScheme from "../models/SavedScheme.js";
import Application from "../models/Application.js";
import Reminder from "../models/Reminder.js";
import StaffAccess from "../models/StaffAccess.js";
import AccountAction from "../models/AccountAction.js";
import AccountDeletion from "../models/AccountDeletion.js";
import { removeMailPreviews } from "./mail.js";
export async function cleanDeletedAccount(user) {
  const account = await User.findById(user).select("+deletingAt");
  if (account && !account.deletingAt) return false;
  if (account) await removeMailPreviews(account.email);
  await Promise.all(
    [
      Profile,
      SavedScheme,
      Application,
      Reminder,
      StaffAccess,
      AccountAction,
    ].map((model) => model.deleteMany({ user })),
  );
  await User.deleteOne({ _id: user, deletingAt: { $ne: null } });
  await AccountDeletion.updateOne(
    { user, completedAt: { $exists: false } },
    {
      $set: {
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      },
    },
  );
  return true;
}
let running;
export function processAccountDeletions() {
  if (running) return running;
  running = (async () => {
    for await (const job of AccountDeletion.find({}).cursor()) {
      try {
        await cleanDeletedAccount(job.user);
      } catch {
        console.error("Account cleanup deferred; will retry.");
      }
    }
  })().finally(() => {
    running = null;
  });
  return running;
}
export function startDeletionWorker() {
  let active = Promise.resolve();
  const run = () =>
    (active = processAccountDeletions().catch(() =>
      console.error("Account cleanup deferred; will retry."),
    ));
  run();
  const timer = setInterval(run, 60000);
  timer.unref();
  return async () => {
    clearInterval(timer);
    await active;
  };
}
