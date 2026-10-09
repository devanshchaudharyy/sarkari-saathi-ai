import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const executablePath =
  process.env.BROWSER_PATH ||
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);
const localEnv = await readFile("client/.env", "utf8").catch(() => "");
const port = /^VITE_DEV_PORT=(\d+)/m.exec(localEnv)?.[1] || "5173";
const base = process.env.FRONTEND_URL || `http://localhost:${port}`;
const api =
  /^VITE_API_URL=(.+)/m.exec(localEnv)?.[1]?.trim() ||
  "http://localhost:5000/api";
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const email = `profile.browser.${Date.now()}@example.com`,
  password = "ProfileTest123!";
const response = await context.request.post(`${api}/auth/register`, {
  data: { name: "Profile Citizen", email, password },
});
assert.equal(response.status(), 201);
const account = await response.json();
const results = [];
await mkdir("reports", { recursive: true });
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
const save = async () => {
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
};
const progress = (label) => page.getByRole("progressbar", { name: label });
const snapshot = async (path) => {
  await page.getByRole("form", { name: "Citizen profile" }).waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
};
try {
  await check(
    "Protected profile returns to the requested page after login",
    async () => {
      await page.goto(`${base}/profile`);
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/profile");
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await progress("Saved profile completion").getAttribute("value"),
        "0",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Save profile", exact: true })
          .isDisabled(),
        true,
      );
    },
  );
  await check("Partial draft persists with 25 percent completion", async () => {
    await page.getByLabel("Age", { exact: true }).fill("22");
    assert.equal(
      await progress("Draft completion").getAttribute("value"),
      "25",
    );
    await save();
    await page.reload();
    await page.getByRole("form", { name: "Citizen profile" }).waitFor();
    assert.equal(
      await page.getByLabel("Age", { exact: true }).inputValue(),
      "22",
    );
    assert.equal(
      await progress("Saved profile completion").getAttribute("value"),
      "25",
    );
  });
  await check(
    "Core details save with zero income and optional district",
    async () => {
      await page
        .getByLabel("Occupation", { exact: true })
        .selectOption("student");
      await page
        .getByLabel("State / Union Territory", { exact: true })
        .selectOption("Uttar Pradesh");
      await page
        .getByLabel("District (optional)", { exact: true })
        .fill("Muzaffarnagar");
      await page
        .getByLabel("Annual household income (₹)", { exact: true })
        .fill("0");
      assert.equal(
        await progress("Draft completion").getAttribute("value"),
        "100",
      );
      await save();
      await page
        .getByText("Profile complete. Your details are saved.", { exact: true })
        .waitFor();
      await snapshot("reports/profile-desktop.png");
    },
  );
  await check(
    "Dashboard reflects saved completion and edit action",
    async () => {
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Overview", exact: true })
        .click();
      await page
        .getByRole("link", { name: "Edit profile", exact: true })
        .waitFor();
      assert.equal(
        await progress("Saved profile completion").getAttribute("value"),
        "100",
      );
      await page
        .getByRole("link", { name: "Edit profile", exact: true })
        .click();
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page
          .getByLabel("Annual household income (₹)", { exact: true })
          .inputValue(),
        "0",
      );
    },
  );
  await check(
    "Invalid input is inline and no invalid save reaches the API",
    async () => {
      let requests = 0;
      const listener = (request) => {
        if (
          request.method() === "PUT" &&
          request.url().endsWith("/api/profile")
        )
          requests++;
      };
      page.on("request", listener);
      await page.getByLabel("Age", { exact: true }).fill("-1");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await page
        .getByText("Enter a whole-number age between 0 and 120.")
        .waitFor();
      assert.equal(requests, 0);
      await page.waitForFunction(
        () => document.activeElement?.id === "profile-age",
      );
      assert.equal(
        await page.locator(":focus").getAttribute("id"),
        "profile-age",
      );
      page.off("request", listener);
      await page
        .getByRole("button", { name: "Reset changes", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "22",
      );
    },
  );
  await check(
    "State changes clear district and saved edits persist",
    async () => {
      await page
        .getByLabel("State / Union Territory", { exact: true })
        .selectOption("Delhi");
      assert.equal(
        await page
          .getByLabel("District (optional)", { exact: true })
          .inputValue(),
        "",
      );
      await page.getByLabel("Age", { exact: true }).fill("23");
      await save();
      await page.reload();
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page
          .getByLabel("State / Union Territory", { exact: true })
          .inputValue(),
        "Delhi",
      );
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "23",
      );
    },
  );
  await check(
    "Unsaved navigation warns, traps focus, supports Escape and deliberate leave",
    async () => {
      await page.getByLabel("Age", { exact: true }).fill("24");
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Overview", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Leave without saving?",
      });
      await dialog.waitFor();
      assert.equal(await page.locator(":focus").textContent(), "Keep editing");
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.locator(":focus").textContent(), "Leave page");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "24",
      );
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Overview", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Leave page", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      await page
        .getByRole("link", { name: "Edit profile", exact: true })
        .click();
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "23",
      );
    },
  );
  await check("Failed save preserves edits and retry saves them", async () => {
    await page
      .getByLabel("Annual household income (₹)", { exact: true })
      .fill("180000");
    await page.route("**/api/profile", (route) =>
      route.request().method() === "PUT" ? route.abort() : route.continue(),
    );
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await page
      .getByRole("alert")
      .getByText(/Your changes are still here/)
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Annual household income (₹)", { exact: true })
        .inputValue(),
      "180000",
    );
    await page.unroute("**/api/profile");
    await save();
  });
  await check(
    "Failed profile load prevents accidental overwrites and supports retry",
    async () => {
      await page.route("**/api/profile", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t load your profile" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Save profile", exact: true })
          .count(),
        0,
      );
      await page.unroute("**/api/profile");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page
          .getByLabel("Annual household income (₹)", { exact: true })
          .inputValue(),
        "180000",
      );
    },
  );
  await check("Saving disables all fields and shows feedback", async () => {
    await page.getByLabel("Age", { exact: true }).fill("25");
    await page.route("**/api/profile", async (route) => {
      if (route.request().method() === "PUT")
        await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Saving…", exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Age", { exact: true }).isDisabled(),
      true,
    );
    await page.getByText("All changes saved", { exact: true }).waitFor();
    await page.unroute("**/api/profile");
  });
  await check(
    "Profile and updated dashboard fit all seven widths",
    async () => {
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        for (const path of ["/profile", "/dashboard"]) {
          await page.goto(`${base}${path}`);
          if (path === "/profile")
            await page.getByRole("form", { name: "Citizen profile" }).waitFor();
          else
            await page
              .getByRole("link", { name: "Edit profile", exact: true })
              .waitFor();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            `${path} overflow at ${width}`,
          );
        }
        if (width === 390) {
          await page.goto(`${base}/profile`);
          await snapshot("reports/profile-mobile.png");
        }
      }
    },
  );
  await check(
    "Reduced motion, reload persistence, and no profile data in localStorage",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${base}/profile`);
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page
          .locator(".profile-layout")
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "25",
      );
      const storage = await page.evaluate(() => JSON.stringify(localStorage));
      assert.equal(storage.includes("annualHouseholdIncome"), false);
      assert.equal(storage.includes("Muzaffarnagar"), false);
    },
  );
  await check(
    "Expired session returns to login instead of saving",
    async () => {
      await page.getByLabel("Age", { exact: true }).fill("26");
      await page.route("**/api/profile", (route) =>
        route.request().method() === "PUT"
          ? route.fulfill({
              status: 401,
              contentType: "application/json",
              body: JSON.stringify({
                success: false,
                message: "Your session has expired. Please sign in again.",
              }),
            })
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await page.waitForURL("**/login");
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        null,
      );
      await page.unroute("**/api/profile");
    },
  );
  await check(
    "New account does not inherit previous profile data",
    async () => {
      const fresh = await context.request.post(`${api}/auth/register`, {
        data: { name: "Another Citizen", email: `other.${email}`, password },
      });
      assert.equal(fresh.status(), 201);
      await page.getByLabel("Email address").fill(`other.${email}`);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/profile");
      await page.getByRole("form", { name: "Citizen profile" }).waitFor();
      assert.equal(
        await page.getByLabel("Age", { exact: true }).inputValue(),
        "",
      );
      assert.equal(
        await progress("Saved profile completion").getAttribute("value"),
        "0",
      );
      assert.deepEqual(errors, []);
    },
  );
} finally {
  await writeFile(
    "reports/profile-browser-results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
