import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { parseEnvironment } from "../src/config/environment.js";
import { mountClient, assertClientBuild } from "../src/middleware/client.js";
import { createShutdown } from "../src/lifecycle.js";
import { setupLocal } from "../../scripts/setup-local.mjs";

const database = `sarkari_saathi_production_test_${Date.now()}`;
const configuration = {
  MONGO_URI: `mongodb://127.0.0.1:27017/${database}`,
  JWT_SECRET: randomBytes(48).toString("base64url"),
  CLIENT_URL: "http://localhost:5176",
  NODE_ENV: "production",
  SERVE_CLIENT: "false",
};
Object.assign(process.env, configuration);
const { default: app } = await import("../src/app.js");
let temporary;
before(async () => {
  temporary = await mkdtemp(join(tmpdir(), "sarkarisaathi-production-"));
  await mkdir(join(temporary, "assets"));
  await writeFile(
    join(temporary, "index.html"),
    "<!doctype html><title>SPA fixture</title>",
  );
  await writeFile(
    join(temporary, "assets", "main-abcdefgh.js"),
    "console.log('fixture');\n".repeat(200),
  );
  await writeFile(join(temporary, ".env"), "SENSITIVE=fixture");
  await mongoose.connect(configuration.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await rm(temporary, { recursive: true, force: true });
});

test("production environment accepts HTTPS and loopback origins", () => {
  assert.equal(parseEnvironment(configuration).SERVE_CLIENT, false);
  assert.equal(
    parseEnvironment({
      ...configuration,
      CLIENT_URL: "https://schemes.example.org",
      SERVE_CLIENT: "true",
    }).SERVE_CLIENT,
    true,
  );
});
for (const [name, overrides] of [
  [
    "example secret",
    { JWT_SECRET: "replace-with-a-random-secret-of-at-least-32-characters" },
  ],
  ["short secret", { JWT_SECRET: "short" }],
  ["zero expiry", { JWT_EXPIRES_IN: "0d" }],
  ["path origin", { CLIENT_URL: "https://example.org/path" }],
  ["trailing slash", { CLIENT_URL: "https://example.org/" }],
  ["credential origin", { CLIENT_URL: "https://user:password@example.org" }],
  ["insecure remote origin", { CLIENT_URL: "http://example.org" }],
  ["file origin", { CLIENT_URL: "file:///tmp/site" }],
  ["invalid serve flag", { SERVE_CLIENT: "yes" }],
])
  test(`startup rejects ${name} without echoing values`, () => {
    assert.throws(
      () => parseEnvironment({ ...configuration, ...overrides }),
      (error) => {
        assert.match(error.message, /Invalid environment configuration/);
        assert(!error.message.includes(configuration.JWT_SECRET));
        assert(!error.message.includes("user:password"));
        return true;
      },
    );
  });
test("development allows exact remote HTTP origins without trusting proxies", () => {
  assert.equal(
    parseEnvironment({
      ...configuration,
      NODE_ENV: "development",
      CLIENT_URL: "http://example.org",
    }).CLIENT_URL,
    "http://example.org",
  );
  assert.equal(app.get("trust proxy"), false);
});
test("liveness keeps the exact original contract and never caches", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.deepEqual(res.body, {
    success: true,
    message: "SarkariSaathi API is running",
  });
  assert.equal(res.headers["cache-control"], "no-store");
});
test("readiness verifies a real MongoDB ping without revealing connection details", async () => {
  const res = await request(app).get("/api/ready").expect(200);
  assert.deepEqual(res.body, {
    success: true,
    message: "SarkariSaathi API is ready",
  });
  assert.equal(res.headers["cache-control"], "no-store");
});
test("draining rejects readiness and data requests while liveness remains available", async () => {
  app.locals.draining = true;
  try {
    for (const path of ["/api/ready", "/api/schemes", "/api/auth/me"]) {
      const res = await request(app).get(path).expect(503);
      assert.deepEqual(Object.keys(res.body).sort(), ["message", "success"]);
      assert.equal(res.headers["retry-after"], "5");
      assert.equal(res.headers["cache-control"], "no-store");
    }
    await request(app).get("/api/health").expect(200);
  } finally {
    app.locals.draining = false;
  }
});
test("disconnected database returns prompt 503 and recovers after reconnect", async () => {
  await mongoose.disconnect();
  try {
    await request(app).get("/api/ready").expect(503);
    await request(app).get("/api/schemes").expect(503);
    await request(app).get("/api/health").expect(200);
  } finally {
    await mongoose.connect(configuration.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }
  await request(app).get("/api/ready").expect(200);
});
test("failed database ping returns a safe 503", async () => {
  const original = mongoose.connection.db.admin;
  mongoose.connection.db.admin = () => ({
    command: async () => {
      throw new Error("private connection detail");
    },
  });
  try {
    const res = await request(app).get("/api/ready").expect(503);
    assert(!res.text.includes("private"));
  } finally {
    mongoose.connection.db.admin = original;
  }
});
test("errors including disallowed CORS and missing endpoints are not cached", async () => {
  for (const [origin, path, status] of [
    [configuration.CLIENT_URL, "/api/missing", 404],
    ["https://other.example.org", "/api/health", 403],
  ]) {
    const res = await request(app)
      .get(path)
      .set("Origin", origin)
      .expect(status);
    assert.equal(res.headers["cache-control"], "no-store");
    assert.equal(res.body.success, false);
  }
});
test("SPA deep links and HEAD requests receive revalidated HTML", async () => {
  const site = express();
  mountClient(site, temporary);
  for (const path of [
    "/",
    "/login",
    "/schemes/pm-kisan",
    "/discover?category=agriculture",
    "/readiness?scheme=pmsby",
  ]) {
    const res = await request(site)
      .get(path)
      .set("Accept", "text/html")
      .expect(200);
    assert.match(res.text, /SPA fixture/);
    assert.equal(res.headers["cache-control"], "no-cache");
  }
  await request(site).head("/discover").expect(200);
});
test("fingerprinted assets are immutable while HTML is never immutable", async () => {
  const site = express();
  mountClient(site, temporary);
  const asset = await request(site)
    .get("/assets/main-abcdefgh.js")
    .set("Accept-Encoding", "gzip")
    .expect(200);
  assert.equal(asset.headers["content-encoding"], "gzip");
  assert.match(asset.headers.vary, /Accept-Encoding/);
  assert.equal(
    asset.headers["cache-control"],
    "public, max-age=31536000, immutable",
  );
  const html = await request(site).get("/index.html").expect(200);
  assert.equal(html.headers["cache-control"], "no-cache");
});
test("missing APIs, assets, private files and non-HTML requests never receive SPA HTML", async () => {
  const site = express();
  mountClient(site, temporary);
  for (const path of [
    "/api",
    "/api/missing",
    "/API/missing",
    "/assets/absent.js",
    "/assets/missing",
    "/.env",
    "/%2eenv",
    "/server/.env",
    "/missing.css",
  ]) {
    const res = await request(site)
      .get(path)
      .set("Accept", "text/html")
      .expect(404);
    assert(!res.text.includes("SPA fixture"));
    assert(!res.text.includes("SENSITIVE"));
  }
  await request(site)
    .get("/discover")
    .set("Accept", "application/json")
    .expect(404);
  await request(site).post("/discover").expect(404);
});
test("production startup detects a missing client build with an actionable message", () => {
  assert.doesNotThrow(() => assertClientBuild(temporary));
  assert.throws(
    () => assertClientBuild(join(temporary, "absent")),
    /npm run build/,
  );
});
test("setup creates ignored configurations with a private random secret and preserves edits", async () => {
  const root = join(temporary, "setup");
  await mkdir(join(root, "server"), { recursive: true });
  await mkdir(join(root, "client"));
  await setupLocal(root);
  const dev = await readFile(join(root, "server/.env"), "utf8");
  assert(!dev.includes(configuration.JWT_SECRET));
  assert.match(dev, /JWT_SECRET=[A-Za-z0-9_-]{64}/);
  const custom = dev.replace("sarkari_saathi_ai", "sarkari_saathi_preserved");
  await writeFile(join(root, "server/.env"), custom);
  const prod = await readFile(join(root, "server/.env.production"), "utf8");
  await setupLocal(root);
  assert.equal(await readFile(join(root, "server/.env"), "utf8"), custom);
  assert.equal(
    await readFile(join(root, "server/.env.production"), "utf8"),
    prod,
  );
});
test("shutdown marks draining, closes once and disconnects before successful exit", async () => {
  const calls = [],
    app = { locals: {} };
  let callback;
  const stop = createShutdown({
    app,
    server: {
      close: (cb) => {
        calls.push("close");
        callback = cb;
      },
      closeAllConnections() {
        calls.push("force");
      },
    },
    disconnect: async () => {
      calls.push("disconnect");
    },
    exit: (code) => calls.push(code),
  });
  stop();
  stop();
  assert.equal(app.locals.draining, true);
  await callback();
  assert.deepEqual(calls, ["close", "disconnect", 0]);
});
test("shutdown reports disconnect failure", async () => {
  let callback, code;
  const stop = createShutdown({
    app: { locals: {} },
    server: {
      close: (cb) => {
        callback = cb;
      },
    },
    disconnect: async () => {
      throw new Error("fixture");
    },
    exit: (value) => {
      code = value;
    },
  });
  stop();
  await callback();
  assert.equal(code, 1);
});
test("shutdown deadline forces connections closed instead of hanging", async () => {
  const calls = [];
  createShutdown({
    app: { locals: {} },
    server: {
      close() {},
      closeAllConnections() {
        calls.push("force");
      },
    },
    disconnect: async () => {},
    exit: (code) => calls.push(code),
    timeout: 15,
  })();
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.deepEqual(calls, ["force", 1]);
});
