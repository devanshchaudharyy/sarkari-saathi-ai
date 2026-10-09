import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
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
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const localEnv = await readFile("client/.env", "utf8").catch(() => "");
const port = /^VITE_DEV_PORT=(\d+)/m.exec(localEnv)?.[1] || "5173";
const base = process.env.FRONTEND_URL || `http://localhost:${port}`,
  email = `browser.${Date.now()}@example.com`,
  password = "BrowserTest123!";
const results = [];
await mkdir("reports", { recursive: true });
async function snapshot(options) {
  await page.locator("h1").first().waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page["screenshot"](options);
  await page.emulateMedia({ reducedMotion: "no-preference" });
}
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
try {
  await check("Landing page and conceptual preview", async () => {
    await page.goto(base);
    await page
      .getByRole("heading", {
        name: "Government benefits, made understandable.",
      })
      .waitFor();
    await snapshot({ path: "reports/home-desktop.png", fullPage: true });
  });
  await check(
    "Protected dashboard redirect and invalid form feedback",
    async () => {
      await page.goto(`${base}/dashboard`);
      await page.waitForURL("**/login");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByText("Enter a valid email address.").waitFor();
      assert.equal(
        await page.locator("#email").getAttribute("aria-invalid"),
        "true",
      );
    },
  );
  await check("Register → real API → dashboard", async () => {
    await page.goto(`${base}/register`);
    await page.getByLabel("Full name").fill("Browser Citizen");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Show password" }).click();
    assert.equal(await page.locator("#password").getAttribute("type"), "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.waitForURL("**/dashboard");
    await page
      .getByRole("heading", { name: "Welcome back, Browser." })
      .waitFor();
    await snapshot({
      path: "reports/dashboard-desktop.png",
      fullPage: true,
    });
  });
  await check("Dashboard refresh preserves session", async () => {
    await page.reload();
    await page
      .getByRole("heading", { name: "Welcome back, Browser." })
      .waitFor();
  });
  await check("Authenticated users cannot revisit registration", async () => {
    await page.goto(`${base}/register`);
    await page.waitForURL("**/dashboard");
  });
  await check("Logout and invalid credentials", async () => {
    await page
      .getByRole("button", { name: "Sign out", exact: true })
      .first()
      .click();
    await page.waitForURL("**/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("incorrect123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("alert")
      .getByText("Invalid email or password")
      .waitFor();
  });
  await check("Network failure is actionable", async () => {
    await page.route("**/api/auth/login", (route) => route.abort());
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("alert")
      .getByText(/Unable to reach the server/)
      .waitFor();
    await page.unroute("**/api/auth/login");
  });
  await check("Duplicate registration and login", async () => {
    await page.goto(`${base}/register`);
    await page.getByLabel("Full name").fill("Browser Citizen");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page
      .getByRole("alert")
      .getByText(/already exists/)
      .waitFor();
    await page.goto(`${base}/login`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard");
  });
  await check(
    "Temporary API failure preserves stored token and supports retry",
    async () => {
      await page.route("**/api/auth/me", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t reconnect" })
        .waitFor();
      assert.ok(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
      );
      await page.unroute("**/api/auth/me");
      await page.getByRole("button", { name: "Try again" }).click();
      await page
        .getByRole("heading", { name: "Welcome back, Browser." })
        .waitFor();
    },
  );
  await check("Responsive layouts at all requested widths", async () => {
    for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of ["/", "/dashboard"]) {
        await page.goto(`${base}${route}`);
        await page.waitForTimeout(350);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow ${route} at ${width}`,
        );
      }
      if (width === 390)
        await snapshot({
          path: "reports/dashboard-mobile.png",
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/dashboard`);
    await page
      .getByRole("button", { name: "Sign out", exact: true })
      .first()
      .click();
    for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of ["/login", "/register", "/missing"]) {
        await page.goto(`${base}${route}`);
        await page.waitForTimeout(250);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow ${route} at ${width}`,
        );
      }
      if (width === 390) {
        await page.goto(`${base}/register`);
        await snapshot({
          path: "reports/register-mobile.png",
          fullPage: true,
        });
      }
    }
  });
  await check(
    "Mobile menu closes on selection and Escape; anchor survives reload",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base);
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation")
        .getByText("How it works", { exact: true })
        .click();
      assert.equal(
        await page.locator("#menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      await page.waitForURL("**/#how-it-works");
      await page.reload();
      await page.waitForTimeout(700);
      assert.ok(
        await page
          .locator("#how-it-works")
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top) < 160),
      );
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      await page.goto(base);
      await snapshot({
        path: "reports/home-mobile.png",
        fullPage: true,
      });
    },
  );
  await check("Navbar, reveal, hover and reduced-motion styles", async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(700);
    assert.ok(
      await page
        .locator(".navbar")
        .evaluate((el) => el.classList.contains("scrolled")),
    );
    await page.locator(".feature-card").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    assert.equal(
      await page
        .locator(".feature-card")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    await page.locator(".feature-card").first().hover();
    await page.waitForTimeout(300);
    assert.notEqual(
      await page
        .locator(".feature-card")
        .first()
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base);
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
      "auto",
    );
    assert.equal(
      await page
        .locator(".page-enter")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.equal(
      await page
        .locator(".feature-card")
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
  });
  await check("Invalid persisted token clears session", async () => {
    await page.evaluate(() =>
      localStorage.setItem("sarkarisaathi.token.v1", "invalid-token"),
    );
    await page.goto(`${base}/dashboard`);
    await page.waitForURL("**/login");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("sarkarisaathi.token.v1")),
      null,
    );
  });
  await check("Keyboard skip link and no runtime exceptions", async () => {
    await page.goto(base);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").textContent(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator(":focus").getAttribute("id"),
      "main-content",
    );
    assert.deepEqual(errors, []);
  });
  await check(
    "Form focus, submit loading, and success notifications",
    async () => {
      await page.goto(`${base}/login`);
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Email address").focus();
      assert.notEqual(
        await page
          .locator("#email")
          .evaluate((el) => getComputedStyle(el).boxShadow),
        "none",
      );
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.route("**/api/auth/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.continue();
      });
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByRole("button", { name: "Signing you in…" }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Signing you in…" })
          .isDisabled(),
        true,
      );
      await page.waitForURL("**/dashboard");
      await page.getByText("Welcome back!", { exact: true }).waitFor();
      await page.unroute("**/api/auth/login");
      await page
        .getByRole("button", { name: "Sign out", exact: true })
        .first()
        .click();
      await page
        .getByText("You have been signed out.", { exact: true })
        .waitFor();
      assert.deepEqual(errors, []);
    },
  );
} finally {
  await writeFile(
    "reports/browser-results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
