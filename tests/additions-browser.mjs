import { CATALOG_FIELDS } from "../shared/catalog.js";
import {
  staffFixture,
  removeCatalogFixture,
} from "./support/staff-fixture.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
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
const catalogSlug = `browser-review-${Date.now()}`;
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
  await check("Ordinary accounts cannot enter catalog management", async () => {
    await page.goto(base + "/catalog");
    await page
      .getByRole("heading", { name: "Catalog access is restricted" })
      .waitFor();
    const res = await context.request.get(base + "/api/catalog", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status(), 403);
  });
  await check(
    "An editor saves a private draft without changing published content",
    async () => {
      await staffFixture(email, "editor");
      const source = (
        await (await context.request.get(base + "/api/schemes/pmsby")).json()
      ).scheme;
      const fixtureData = {
        ...Object.fromEntries(CATALOG_FIELDS.map((key) => [key, source[key]])),
        slug: catalogSlug,
        keywords: [],
      };
      const created = await context.request.post(base + "/api/catalog", {
        headers: { Authorization: `Bearer ${token}` },
        data: fixtureData,
      });
      assert.equal(created.status(), 201);
      await page.goto(base + "/catalog");
      await page.getByLabel("Choose catalog entry").selectOption(catalogSlug);
      await page
        .getByRole("form", { name: "Scheme editorial draft" })
        .waitFor();
      const original = await page
        .getByLabel("Plain-language summary")
        .inputValue();
      await page.getByLabel("Plain-language summary").fill(original + " ");
      const saved = page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/catalog/" + catalogSlug) &&
          res.request().method() === "PATCH",
      );
      await page.getByRole("button", { name: "Save editorial draft" }).click();
      assert.equal((await saved).status(), 200);
      await page.getByRole("button", { name: "Discard saved draft" }).waitFor();
      assert.equal(
        await page.getByRole("button", { name: "Publish saved draft" }).count(),
        0,
      );
      const published = (
        await (await context.request.get(base + "/api/schemes/pmsby")).json()
      ).scheme;
      assert.equal(published.summary, original);
      assert.equal(Boolean(published.screeningSuspended), false);
      assert.equal(
        (
          await context.request.get(base + "/api/schemes/" + catalogSlug)
        ).status(),
        404,
      );
    },
  );
  await check(
    "Editor form and history fit seven widths in both languages",
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
              path: `reports/${lang === "hi" ? "hi-" : ""}catalog-editor-${width === 390 ? "mobile" : "desktop"}.png`,
              fullPage: true,
            });
          }
        }
      }
    },
  );
  await check(
    "Discard preserves public content and revoked roles lose access",
    async () => {
      await page.getByRole("button", { name: "Discard saved draft" }).click();
      await page
        .getByRole("button", { name: "Discard draft", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          !Array.from(document.querySelectorAll("button")).some(
            (el) => el.textContent === "Discard saved draft",
          ),
      );
      await staffFixture(email, "admin");
      await page.goto(base + "/catalog");
      await page.getByLabel("Choose catalog entry").selectOption(catalogSlug);
      await page.getByRole("button", { name: "Publish saved draft" }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Publish saved draft" })
          .isDisabled(),
        true,
      );
      await staffFixture(email, "citizen");
      await page.goto(base + "/catalog");
      await page
        .getByRole("heading", { name: "Catalog access is restricted" })
        .waitFor();
    },
  );
  await check(
    "Comparison loads two schemes with public sources and profile-only screening",
    async () => {
      await page.goto(base + "/compare?schemes=pmsby,pmjjby");
      await page.locator(".comparison-card").first().waitFor();
      assert.equal(await page.locator(".comparison-card").count(), 2);
      await page.locator(".comparison-profile-grid").waitFor();
      assert.equal(
        await page.locator(".comparison-profile-grid>div").count(),
        2,
      );
      for (const url of await page
        .locator(".comparison-card a[target=_blank]")
        .evaluateAll((links) => links.map((link) => link.href)))
        assert.equal(new URL(url).protocol, "https:");
      await page
        .getByLabel("Scheme 3", { exact: true })
        .selectOption("pm-kisan");
      await page.waitForFunction(
        () => document.querySelectorAll(".comparison-card").length === 3,
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelectorAll(".comparison-card").length === 3,
      );
    },
  );
  await check(
    "Invalid comparison choices recover and network failure keeps scheme information",
    async () => {
      await page.goto(base + "/compare?schemes=pmsby,pmsby");
      await page
        .getByRole("alert")
        .filter({ hasText: "Some comparison choices" })
        .waitFor();
      assert.equal(await page.locator(".comparison-card").count(), 0);
      await page.getByLabel("Scheme 1", { exact: true }).selectOption("pmsby");
      await page.getByLabel("Scheme 2", { exact: true }).selectOption("pmjjby");
      await page.waitForFunction(
        () => document.querySelectorAll(".comparison-card").length === 2,
      );
      await page.route("**/api/eligibility", (route) => route.abort());
      await page.reload();
      await page.locator(".profile-comparison [role=alert]").waitFor();
      assert.equal(await page.locator(".comparison-card").count(), 2);
      await page.unroute("**/api/eligibility");
      await page.getByRole("button", { name: "Reload profile screen" }).click();
      await page.locator(".comparison-profile-grid").waitFor();
    },
  );
  await check("Comparison fits seven widths in both languages", async () => {
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
            path: `reports/${lang === "hi" ? "hi-" : ""}comparison-${width === 390 ? "mobile" : "desktop"}.png`,
            fullPage: true,
          });
        }
      }
    }
  });
  await check(
    "Visitors can compare without requesting private screening",
    async () => {
      const visitor = await browser.newContext(),
        tab = await visitor.newPage(),
        privateCalls = [];
      tab.on("request", (req) => {
        if (req.url().includes("/api/eligibility"))
          privateCalls.push(req.url());
      });
      await tab.goto(base + "/compare?schemes=pmsby,pmjjby");
      await tab.waitForFunction(
        () => document.querySelectorAll(".comparison-card").length === 2,
      );
      await tab
        .getByText(
          "Sign in to compare profile-based screening. Public scheme information remains available without an account.",
        )
        .waitFor();
      assert.deepEqual(privateCalls, []);
      await tab.getByRole("link", { name: "Sign in", exact: true }).click();
      await tab.getByLabel("Email address").fill(email);
      await tab.getByLabel("Password", { exact: true }).fill(password);
      await tab.getByRole("button", { name: "Sign in", exact: true }).click();
      await tab.waitForURL(
        (url) =>
          url.pathname === "/compare" &&
          url.searchParams.get("schemes") === "pmsby,pmjjby",
      );
      await tab.locator(".comparison-profile-grid").waitFor();
      await visitor.close();
    },
  );
  await check(
    "Preparation plan shows only selected saved schemes and confirmed marks",
    async () => {
      const headers = { Authorization: `Bearer ${token}` };
      for (const slug of ["pmsby", "pmjjby"]) {
        const saved = await context.request.put(
          base + "/api/readiness/" + slug,
          { headers, data: {} },
        );
        assert.equal(saved.status(), 200);
        if (slug === "pmsby") {
          const entry = (await saved.json()).entry;
          assert.equal(
            (
              await context.request.patch(base + "/api/readiness/" + slug, {
                headers,
                data: {
                  itemId: entry.items[0].id,
                  completed: true,
                  revision: entry.revision,
                  saveId: entry.saveId,
                  templateVersion: entry.templateVersion,
                },
              })
            ).status(),
            200,
          );
        }
      }
      await page.goto(base + "/plan");
      await page.locator(".plan-entry").first().waitFor();
      assert.equal(await page.locator(".plan-entry").count(), 2);
      const cards = await page.locator(".plan-entry h3").allTextContents();
      await page
        .getByRole("checkbox", {
          name: "Pradhan Mantri Jeevan Jyoti Bima Yojana",
          exact: true,
        })
        .uncheck();
      await page.waitForFunction(
        () => document.querySelectorAll(".plan-entry").length === 1,
      );
      assert((await page.locator(".plan-print").innerText()).includes("[x]"));
      assert(!(await page.locator(".plan-print").innerText()).includes(email));
      assert.equal(await page.locator(".plan-owner").count(), 0);
      await page
        .getByRole("checkbox", { name: "Include my name on the plan" })
        .check();
      await page
        .locator(".plan-owner")
        .filter({ hasText: "Additions Citizen" })
        .waitFor();
      await page
        .getByRole("checkbox", { name: "Include my name on the plan" })
        .uncheck();
    },
  );
  await check(
    "Browser print produces an A4 PDF with navigation and controls hidden",
    async () => {
      await page.evaluate(() => {
        window.__printCalled = false;
        window.print = () => {
          window.__printCalled = true;
        };
      });
      await page.getByRole("button", { name: "Print / save PDF" }).click();
      assert(await page.evaluate(() => window.__printCalled));
      await page.emulateMedia({ media: "print" });
      assert.equal(
        await page
          .locator(".dashboard-sidebar")
          .evaluate((el) => getComputedStyle(el).display),
        "none",
      );
      assert.equal(
        await page
          .locator(".plan-controls")
          .first()
          .evaluate((el) => getComputedStyle(el).display),
        "none",
      );
      assert.equal(await page.locator(".plan-print").isVisible(), true);
      const pdf = await page.pdf({
        path: "reports/preparation-plan.pdf",
        format: "A4",
        printBackground: true,
      });
      assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
      assert(pdf.length > 10000);
      await page.emulateMedia({ media: "screen" });
    },
  );
  await check(
    "Plan fits seven widths in both languages and empty selection disables print",
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
              path: `reports/${lang === "hi" ? "hi-" : ""}preparation-plan-${width === 390 ? "mobile" : "desktop"}.png`,
              fullPage: true,
            });
          }
        }
      }
      await page
        .getByRole("checkbox", {
          name: "Pradhan Mantri Suraksha Bima Yojana",
          exact: true,
        })
        .uncheck();
      await page
        .getByText("Select at least one saved scheme to print.")
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Print / save PDF" })
          .isDisabled(),
        true,
      );
    },
  );

  async function preview(purpose) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const names = await readdir("reports/mail").catch(() => []);
      const mails = (
        await Promise.all(
          names
            .filter((n) => n.endsWith(".json"))
            .map(async (n) =>
              JSON.parse(await readFile("reports/mail/" + n, "utf8")),
            ),
        )
      )
        .filter((m) => m.to === email && m.purpose === purpose)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (mails[0]) return mails[0].text.match(/https?:\/\/\S+/)[0];
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error("Synthetic account email preview was not written");
  }
  async function accountScreens(name) {
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
            path:
              "reports/" +
              (lang === "hi" ? "hi-" : "") +
              name +
              "-" +
              (width === 390 ? "mobile" : "desktop") +
              ".png",
            fullPage: true,
          });
        }
      }
    }
  }
  let verificationLink, resetLink;
  const replacement = "New Additions Password 123!";
  await check(
    "Account status, local preview warning and verification request work without sending email",
    async () => {
      await page.goto(base + "/account");
      await page.getByText("Email not verified", { exact: true }).waitFor();
      await page.getByText(/Local preview mode: no email is sent/).waitFor();
      await accountScreens("account");
      await page
        .getByRole("button", { name: "Prepare verification link", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "If verification is needed" })
        .first()
        .waitFor();
      verificationLink = await preview("verify");
    },
  );
  await check(
    "Verification link is removed from URL, requires confirmation and is single use",
    async () => {
      await page.goto(verificationLink);
      await page
        .getByRole("button", { name: "Confirm email access", exact: true })
        .waitFor();
      assert.equal(new URL(page.url()).hash, "");
      await accountScreens("verify-email");
      await page
        .getByRole("button", { name: "Confirm email access", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Email verified." })
        .waitFor();
      await page.goto(verificationLink);
      await page
        .getByRole("button", { name: "Confirm email access", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "invalid or expired" })
        .waitFor();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        token,
      );
      await page.goto(base + "/account");
      await page.getByText("Email verified", { exact: true }).waitFor();
    },
  );
  await check(
    "Forgot-password form validates and shows a generic result with private local preview",
    async () => {
      await page.goto(base + "/forgot-password");
      await page
        .getByRole("button", { name: "Prepare reset link", exact: true })
        .click();
      await page
        .getByText("Enter a valid email address.", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByLabel("Email address")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await page.getByLabel("Email address").fill(email);
      await accountScreens("forgot-password");
      await page
        .getByRole("button", { name: "Prepare reset link", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "If an account matches" })
        .waitFor();
      resetLink = await preview("reset");
    },
  );
  await check(
    "Password reset validates matching passwords, strips the link and invalidates old sessions",
    async () => {
      await page.goto(resetLink);
      await page.getByLabel("New password", { exact: true }).fill(replacement);
      await page
        .getByLabel("Confirm new password", { exact: true })
        .fill("different");
      await page
        .getByRole("button", { name: "Save new password", exact: true })
        .click();
      await page.getByText("Passwords must match.", { exact: true }).waitFor();
      await page
        .getByLabel("Confirm new password", { exact: true })
        .fill(replacement);
      assert.equal(new URL(page.url()).hash, "");
      await page
        .getByRole("button", { name: "Show password", exact: true })
        .first()
        .click();
      assert.equal(
        await page
          .getByLabel("New password", { exact: true })
          .getAttribute("type"),
        "text",
      );
      await page
        .getByRole("button", { name: "Hide password", exact: true })
        .first()
        .click();
      await accountScreens("reset-password");
      let releaseReset;
      const resetGate = new Promise((resolve) => {
        releaseReset = resolve;
      });
      await page.route("**/api/account/reset-password", async (route) => {
        await resetGate;
        await route.continue();
      });
      await page
        .getByRole("button", { name: "Save new password", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Save new password", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page.getByLabel("New password", { exact: true }).isDisabled(),
        true,
      );
      releaseReset();
      await page
        .getByRole("status")
        .filter({ hasText: "Password changed." })
        .waitFor();
      await page.unroute("**/api/account/reset-password");
      assert.equal(
        (
          await context.request.get(base + "/api/auth/me", {
            headers: { Authorization: "Bearer " + token },
          })
        ).status(),
        401,
      );
      await page.goto(base + "/account");
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(replacement);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/account");
      token = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      await page.goto(resetLink);
      await page.getByLabel("New password", { exact: true }).fill(replacement);
      await page
        .getByLabel("Confirm new password", { exact: true })
        .fill(replacement);
      await page
        .getByRole("button", { name: "Save new password", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "invalid or expired" })
        .waitFor();
    },
  );
  await check(
    "Network failures preserve a valid account; deletion dialog cancellation restores focus",
    async () => {
      await page.goto(base + "/account");
      await page.getByText("Email verified", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Delete profile", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .getByRole("button", { name: "Delete profile", exact: true })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await page.route("**/api/account", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("alert")
        .filter({ hasText: /connect|network|server/i })
        .waitFor();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        token,
      );
      await page.unroute("**/api/account");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page.getByText("Email verified", { exact: true }).waitFor();
    },
  );
  await check(
    "Profile deletion checks the current password and preserves saved preparation",
    async () => {
      assert.equal(
        (
          await context.request.put(base + "/api/profile", {
            headers: { Authorization: "Bearer " + token },
            data: {
              age: 30,
              state: null,
              district: "",
              occupation: null,
              annualHouseholdIncome: null,
            },
          })
        ).status(),
        200,
      );
      await page
        .getByRole("button", { name: "Delete profile", exact: true })
        .click();
      await page.getByLabel("Current password").fill("wrong");
      await page
        .getByRole("button", { name: "Confirm profile deletion", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "current password could not be confirmed" })
        .waitFor();
      await page.getByLabel("Current password").fill(replacement);
      await page
        .getByRole("button", { name: "Confirm profile deletion", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Profile deleted." })
        .first()
        .waitFor();
      const saved = await context.request.get(base + "/api/readiness", {
        headers: { Authorization: "Bearer " + token },
      });
      assert(saved.ok());
      assert((await saved.json()).entries.length >= 2);
      const profile = await context.request.get(base + "/api/profile", {
        headers: { Authorization: "Bearer " + token },
      });
      assert(profile.ok());
      assert.equal((await profile.json()).profile.age, null);
    },
  );
  await check(
    "Account deletion requires typed confirmation, clears the session and rejects further login",
    async () => {
      await page
        .getByRole("button", { name: "Delete account", exact: true })
        .click();
      await page.getByLabel("Current password").fill(replacement);
      assert.equal(
        await page
          .getByRole("button", {
            name: "Confirm account deletion",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      await page.getByLabel("Type DELETE to confirm").fill("DELETE");
      await page
        .getByRole("button", { name: "Confirm account deletion", exact: true })
        .click();
      await page.waitForURL("**/login");
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        null,
      );
      assert.equal(
        (
          await context.request.get(base + "/api/auth/me", {
            headers: { Authorization: "Bearer " + token },
          })
        ).status(),
        401,
      );
      assert.equal(
        (
          await context.request.post(base + "/api/auth/login", {
            data: { email, password: replacement },
          })
        ).status(),
        401,
      );
    },
  );

  await check("No unexpected runtime or console errors", async () =>
    assert.deepEqual(errors, []),
  );
} finally {
  if (token) await staffFixture(email, "citizen");
  await removeCatalogFixture(catalogSlug);
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/additions-browser-results.json",
    JSON.stringify({ base, results, errors }, null, 2),
  );
  await browser.close();
}
