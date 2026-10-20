import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.FRONTEND_URL || "http://localhost:5176";
const api = `${base}/api`;
const executablePath =
  process.env.BROWSER_PATH ||
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  requests = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("/api/")) requests.push(request.url());
});
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !/Failed to load resource/.test(message.text())
  )
    errors.push(message.text());
});
const email = `production.${Date.now()}@example.com`,
  password = "ProductionTest123!";
let token;
async function check(name, run) {
  await run();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
await mkdir("reports", { recursive: true });
try {
  await check(
    "One origin serves liveness, real database readiness, SPA deep links and correct cache policies",
    async () => {
      for (const route of ["health", "ready"])
        assert.equal(
          (await context.request.get(`${api}/${route}`)).status(),
          200,
        );
      const html = await context.request.get(
        `${base}/discover?status=needs_info`,
        { headers: { Accept: "text/html" } },
      );
      assert.equal(html.status(), 200);
      assert.equal(html.headers()["cache-control"], "no-cache");
      assert.match(
        html.headers()["content-security-policy"],
        /default-src 'self'/,
      );
      const asset = /src="([^"]+\.js)"/.exec(await html.text())[1];
      assert.match(
        (await context.request.get(new URL(asset, base).href)).headers()[
          "cache-control"
        ],
        /immutable/,
      );
      const compressed = await context.request.get(new URL(asset, base).href, {
        headers: { "Accept-Encoding": "gzip" },
      });
      assert.equal(compressed.headers()["content-encoding"], "gzip");
      for (const path of [
        "/api/unknown",
        "/assets/missing.js",
        "/.env",
        "/server/.env",
      ]) {
        const res = await context.request.get(`${base}${path}`);
        assert.equal(res.status(), 404);
        assert.equal((await res.json()).success, false);
      }
    },
  );
  await check(
    "Production registration reaches the database through same-origin /api",
    async () => {
      await page.goto(`${base}/register`);
      await page.getByLabel("Full name").fill("Production Citizen");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      await page
        .getByRole("heading", { name: "Welcome back, Production." })
        .waitFor();
      token = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      assert(!!token);
    },
  );
  await check(
    "Profile saved in the browser is returned by the real API after refresh",
    async () => {
      await page.goto(`${base}/profile`);
      await page.getByLabel("Age", { exact: true }).fill("24");
      await page
        .getByLabel("Occupation", { exact: true })
        .selectOption("student");
      await page
        .getByLabel("State / Union Territory", { exact: true })
        .selectOption("Uttar Pradesh");
      await page
        .getByLabel("Annual household income (₹)", { exact: true })
        .fill("240000");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await page
        .getByText("Profile complete. Your details are saved.", { exact: true })
        .waitFor();
      await page.reload();
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "24",
      );
      const res = await context.request.get(`${api}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status(), 200);
      assert.equal((await res.json()).profile.age, 24);
    },
  );
  await check(
    "Direct shortlist and scheme detail links load through the production server",
    async () => {
      await page.goto(`${base}/discover?status=needs_info`);
      await page.locator(".discovery-counts").waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 6);
      await page.goto(`${base}/schemes/pmsby`);
      await page.locator(".scheme-detail-meta").waitFor();
    },
  );
  await check(
    "Screening confirms supplied facts and focuses the new result heading",
    async () => {
      await page.goto(`${base}/eligibility?scheme=pmsby`);
      for (const key of [
        "pmsbyAccount",
        "pmsbySingleAccount",
        "premiumConsent",
      ]) {
        await page.locator(`input[name="${key}"][value="true"]`).check();
      }
      await page
        .getByRole("button", { name: "Run screening", exact: true })
        .click();
      await page
        .locator(".assessment-status")
        .filter({ hasText: "Basic criteria match" })
        .waitFor();
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Your screening overview",
      );
    },
  );
  await check(
    "Preparation save and checklist mark persist across a direct-link refresh",
    async () => {
      await page.goto(`${base}/readiness?scheme=pmsby`);
      const card = page.locator(".readiness-card").first();
      await card.getByRole("button", { name: "Save scheme to start" }).click();
      await card.getByText("Saved scheme", { exact: true }).waitFor();
      const box = card.locator('input[type="checkbox"]').first();
      // This control reflects confirmed server progress, rather than an optimistic mark.
      await box.click();
      await card
        .locator(".readiness-progress strong")
        .filter({ hasText: /^1 of / })
        .waitFor();
      await page.reload();
      await card.getByText("Saved scheme", { exact: true }).waitFor();
      assert.equal(await box.isChecked(), true);
    },
  );
  await check(
    "Hindi lazy assets load under CSP and mobile layouts fit all seven widths",
    async () => {
      await page.goto(`${base}/discover`);
      await page.locator(".discovery-counts").waitFor();
      await page.locator(".language-trigger").first().click();
      await page.getByRole("menuitemradio", { name: /हिन्दी/ }).click();
      await page.waitForFunction(() => document.documentElement.lang === "hi");
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `Overflow ${width}`,
        );
      }
      await page.locator(".language-trigger").first().click();
      await page.getByRole("menuitemradio", { name: /English/ }).click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
    },
  );
  await check(
    "A temporary API failure preserves authentication and retry recovers",
    async () => {
      await page.route("**/api/auth/me", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t reconnect" })
        .waitFor();
      assert(
        await page.evaluate(
          () => !!localStorage.getItem("sarkarisaathi.token.v1"),
        ),
      );
      await page.unroute("**/api/auth/me");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page.locator(".discovery-counts").waitFor();
    },
  );
  await check(
    "Logout and login preserve a protected return URL on the production origin",
    async () => {
      await page
        .getByRole("button", { name: "Sign out", exact: true })
        .first()
        .click();
      await page.waitForURL("**/login");
      await page.goto(`${base}/discover?category=insurance`);
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/discover?category=insurance");
      await page.locator(".discovery-counts").waitFor();
    },
  );
  await check(
    "Every browser API request stays on the production origin with no runtime or CSP errors",
    async () => {
      assert(requests.length > 10);
      assert(
        requests.every((url) => new URL(url).origin === new URL(base).origin),
      );
      assert.equal(errors.length, 0);
    },
  );
} catch (error) {
  results.push({
    name: "Production flow",
    status: "failed",
    message: error.message,
  });
  await page.screenshot({
    path: "reports/production-failure.png",
    fullPage: true,
  });
  throw error;
} finally {
  await writeFile(
    "reports/production-browser-results.json",
    JSON.stringify({ base, results, errors }, null, 2),
  );
  await browser.close();
}
