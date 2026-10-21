import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import mongoose from "mongoose";
import { seedSchemes } from "../server/src/utils/seedSchemes.js";
const database = `sarkari_saathi_reliability_browser_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
const uri = `mongodb://127.0.0.1:27017/${database}`;
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", resolve);
});
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  MONGO_URI: uri,
  CLIENT_URL: base,
  FRONTEND_URL: base,
  PORT: String(port),
  JWT_SECRET: randomBytes(48).toString("base64url"),
  MAIL_MODE: "preview",
  NODE_ENV: "production",
  SERVE_CLIENT: "true",
  RELIABILITY_ISOLATED_DB: database,
};
let server,
  logs = "",
  code = 1;
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await seedSchemes();
  server = spawn(process.execPath, ["server/production.js"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.on("data", (data) => {
    logs = (logs + data.toString()).slice(-2000);
  });
  server.stderr.on("data", (data) => {
    logs = (logs + data.toString()).slice(-2000);
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(base + "/api/ready", {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!ready)
    throw new Error("Isolated test server did not become ready. " + logs);
  const browser = spawn(process.execPath, ["tests/reliability-browser.mjs"], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  code = await new Promise((resolve, reject) => {
    browser.once("error", reject);
    browser.once("exit", (c) => resolve(c ?? 1));
  });
} finally {
  if (server && server.exitCode === null) {
    const closed = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await closed;
  }
  if (
    mongoose.connection.name === database &&
    /^sarkari_saathi_reliability_browser_test_\d+_[a-f0-9]{6}$/.test(database)
  )
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
process.exitCode = code;
