import { chromium } from "playwright";
import lighthouse from "lighthouse";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const env = await readFile("client/.env", "utf8");
const base =
  process.env.FRONTEND_URL ||
  `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`;
const api =
  /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() || "http://localhost:5000/api";
await mkdir("reports", { recursive: true });
// A persistent DEFAULT browser context lets Lighthouse use a synthetic account.
// Never supply an actual citizen's token or profile to this audit.
const context = await chromium.launchPersistentContext(
  "reports/phase4-audit-profile",
  {
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--remote-debugging-port=9335"],
  },
);
try {
  const response = await context.request.post(`${api}/auth/register`, {
    data: {
      name: "Audit Citizen",
      email: `audit.${Date.now()}@example.com`,
      password: "AuditTest123!",
    },
  });
  assert.equal(response.status(), 201);
  const { token } = await response.json();
  assert.equal(
    (
      await context.request.put(`${api}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          age: 22,
          state: "Uttar Pradesh",
          district: "",
          occupation: "student",
          annualHouseholdIncome: 240000,
        },
      })
    ).status(),
    200,
  );
  const page = context.pages()[0];
  await page.goto(`${base}/login`);
  await page.evaluate(
    (value) => localStorage.setItem("sarkarisaathi.token.v1", value),
    token,
  );
  const measured = [];
  for (const [label, path] of [
    ["screening", "/eligibility"],
    ["detail", "/schemes/pm-kisan"],
  ]) {
    const audit = await lighthouse(`${base}${path}`, {
      port: 9335,
      logLevel: "error",
      output: ["json", "html"],
      disableStorageReset: true,
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    assert.equal(
      new URL(audit.lhr.finalDisplayedUrl).pathname,
      path,
      "Audit must measure the intended route",
    );
    await writeFile(`reports/phase4-${label}-lighthouse.json`, audit.report[0]);
    await writeFile(`reports/phase4-${label}-lighthouse.html`, audit.report[1]);
    const scores = Object.fromEntries(
      Object.entries(audit.lhr.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    );
    const metrics = Object.fromEntries(
      [
        "first-contentful-paint",
        "largest-contentful-paint",
        "total-blocking-time",
        "cumulative-layout-shift",
      ].map((key) => [key, audit.lhr.audits[key].displayValue]),
    );
    const failures = Object.values(audit.lhr.audits)
      .filter((a) => a.scoreDisplayMode === "binary" && a.score === 0)
      .map((a) => ({ id: a.id, title: a.title, details: a.details }));
    measured.push({ label, path, scores, metrics, failures });
    console.log(
      JSON.stringify({
        label,
        scores,
        metrics,
        failedAudits: failures.map((a) => a.id),
      }),
    );
  }
  await writeFile(
    "reports/phase4-lighthouse-summary.json",
    JSON.stringify(measured, null, 2),
  );
} finally {
  await context.close();
}
