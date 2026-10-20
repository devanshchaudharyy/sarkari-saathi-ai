import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.FRONTEND_URL || "http://localhost:5176";
const executablePath =
  process.env.BROWSER_PATH ||
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  results = [],
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !/Failed to load resource/.test(message.text())
  )
    errors.push(message.text());
});
const email = `additions.${Date.now()}@example.com`,
  password = "AdditionsTest123!";
let token;
async function check(name, run) {
  await run();
  results.push({ name, status: "passed" });
  console.log("PASS " + name);
}
async function language(value) {
  await page.locator(".language-trigger").first().click();
  await page
    .getByRole("menuitemradio", { name: value === "hi" ? /हिन्दी/ : /English/ })
    .click();
  await page.waitForFunction(
    (value) => document.documentElement.lang === value,
    value,
  );
}
try {
  await check(
    "Protected tracker redirects and registration uses the actual API",
    async () => {
      await page.goto(base + "/applications");
      await page.waitForURL("**/login");
      await page.goto(base + "/register");
      await page.getByLabel("Full name").fill("Additions Citizen");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      token = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
    },
  );
  await check(
    "Application tracker saves and refreshes a self-reported timeline",
    async () => {
      await page.goto(base + "/applications");
      await page.getByLabel("Scheme to track").selectOption("pmsby");
      await page
        .getByRole("button", { name: "Start tracking", exact: true })
        .click();
      await page.locator(".application-card").waitFor();
      await page.getByLabel("New status").selectOption("submitted");
      await page.getByRole("button", { name: "Save status update" }).click();
      await page
        .locator(".application-card>strong")
        .filter({ hasText: "Submitted" })
        .waitFor();
      await page.reload();
      await page
        .locator(".application-card>strong")
        .filter({ hasText: "Submitted" })
        .waitFor();
      await page.getByText("Your recorded timeline", { exact: false }).click();
      assert.equal(await page.locator(".application-timeline li").count(), 2);
    },
  );
  await check(
    "A network failure retains the account and last confirmed timeline",
    async () => {
      await page.route("**/api/applications/pmsby", (route) =>
        route.request().method() === "PATCH" ? route.abort() : route.continue(),
      );
      await page.getByLabel("New status").selectOption("approved");
      await page.getByRole("button", { name: "Save status update" }).click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.locator(".application-card>strong").innerText(),
        "Submitted",
      );
      assert(
        await page.evaluate(
          () => !!localStorage.getItem("sarkarisaathi.token.v1"),
        ),
      );
      await page.unroute("**/api/applications/pmsby");
    },
  );
  await check("Tracker fits seven widths in English and Hindi", async () => {
    for (const lang of ["hi", "en"]) {
      await language(lang);
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `overflow ${lang} ${width}`,
        );
        if ([390, 1440].includes(width)) {
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({
            path: `reports/${lang === "hi" ? "hi-" : ""}applications-${width === 390 ? "mobile" : "desktop"}.png`,
            fullPage: true,
          });
        }
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({
      path: "reports/applications-desktop.png",
      fullPage: true,
    });
  });
  await check(
    "Removal dialog cancels with Escape and confirmed deletion persists",
    async () => {
      await page.getByRole("button", { name: "Remove timeline" }).click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page.getByRole("button", { name: "Remove timeline" }).click();
      await page.getByRole("button", { name: "Confirm removal" }).click();
      await page
        .getByText("No tracked applications yet. Choose a scheme to begin.")
        .waitFor();
      await page.reload();
      await page
        .getByText("No tracked applications yet. Choose a scheme to begin.")
        .waitFor();
    },
  );
  await check(
    "Personal reminders show due-today and persist confirmed completion",
    async () => {
      await page.goto(base + "/reminders");
      await page.getByLabel("Reminder scheme").selectOption("pmsby");
      await page
        .getByRole("button", { name: "Create reminder", exact: true })
        .click();
      await page.locator(".reminder-card .reminder-today").waitFor();
      await page
        .getByRole("button", { name: "Mark complete", exact: true })
        .click();
      await page.locator(".reminder-card .reminder-completed").waitFor();
      await page.reload();
      await page.locator(".reminder-card .reminder-completed").waitFor();
    },
  );
  await check(
    "Reminders reschedule and filter without inventing a provider deadline",
    async () => {
      await page.getByLabel("Reschedule for").fill("2099-01-01");
      await page.getByRole("button", { name: "Reschedule and reopen" }).click();
      await page.locator(".reminder-card .reminder-upcoming").waitFor();
      await page.getByLabel("Show reminders").selectOption("today");
      await page.getByText("No reminders in this view.").waitFor();
      await page.getByLabel("Show reminders").selectOption("all");
      await page.locator(".reminder-card").waitFor();
    },
  );
  await check(
    "Reminder layouts and translations fit seven widths",
    async () => {
      for (const lang of ["hi", "en"]) {
        await language(lang);
        for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
          if ([390, 1440].includes(width)) {
            await page.evaluate(() => document.fonts.ready);
            await page.screenshot({
              path: `reports/${lang === "hi" ? "hi-" : ""}reminders-${width === 390 ? "mobile" : "desktop"}.png`,
              fullPage: true,
            });
          }
        }
      }
    },
  );
  await check(
    "Reminder removal requires confirmation and persists",
    async () => {
      await page.getByRole("button", { name: "Remove reminder" }).click();
      await page.getByRole("button", { name: "Confirm removal" }).click();
      await page.getByText("No reminders in this view.").waitFor();
      await page.reload();
      await page.getByText("No reminders in this view.").waitFor();
    },
  );
  await check("No unexpected runtime or console errors", async () =>
    assert.deepEqual(errors, []),
  );
} finally {
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/additions-browser-results.json",
    JSON.stringify({ base, results, errors }, null, 2),
  );
  await browser.close();
}
