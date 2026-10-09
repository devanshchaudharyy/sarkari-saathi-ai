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
const env = await readFile("client/.env", "utf8");
const base =
  process.env.FRONTEND_URL ||
  `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`;
const api =
  /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() || "http://localhost:5000/api";
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage(),
  results = [],
  errors = [],
  consoleErrors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    consoleErrors.push(m.text());
});
await mkdir("reports", { recursive: true });
const email = `screen.browser.${Date.now()}@example.com`,
  password = "ScreenTest123!";
const response = await context.request.post(`${api}/auth/register`, {
  data: { name: "Screen Citizen", email, password },
});
assert.equal(response.status(), 201);
const account = await response.json();
let sessionToken;
const headers = { Authorization: `Bearer ${account.token}` };
const profile = {
  age: 22,
  state: "Uttar Pradesh",
  district: "",
  occupation: "student",
  annualHouseholdIncome: 0,
};
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
const ready = () =>
  page.getByRole("form", { name: "Scheme screening answers" }).waitFor();
const choose = async (slug) => {
  await page.getByLabel("Choose a scheme").selectOption(slug);
  await ready();
};
const answer = (key, value) =>
  page.locator(`input[name="${key}"][value="${String(value)}"]`).check();
const run = async (count = 1) => {
  await page
    .getByRole("button", { name: "Run screening", exact: true })
    .click();
  await page.locator(".screening-results .assessment-card").first().waitFor();
  assert.equal(await page.locator(".assessment-card").count(), count);
};
const status = async (label) =>
  assert.equal(
    await page.locator(".assessment-status").first().innerText(),
    label,
  );
const reset = () =>
  page.getByRole("button", { name: "Reset answers", exact: true }).click();
const saveProfile = async (p) =>
  assert.equal(
    (
      await context.request.put(`${api}/profile`, { headers, data: p })
    ).status(),
    200,
  );
const reload = async () => {
  await page
    .getByRole("button", {
      name: "Reload saved details (resets answers)",
      exact: true,
    })
    .click();
  await ready();
};
const expandAll = async () => {
  for (const group of await page.locator(".question-group").all())
    if (
      !(await group.getAttribute("open")) &&
      !(await group.evaluate((el) => el.open))
    )
      await group.locator("summary").click();
};
const snapshot = async (path) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path, fullPage: true });
  await page.screenshot({ path: path.replace(".png", "-viewport.png") });
  await page.emulateMedia({ reducedMotion: "no-preference" });
};
try {
  await check(
    "Scheme detail starts protected screening and login preserves its query",
    async () => {
      await page.goto(`${base}/schemes/pmsby`);
      await page
        .getByRole("link", { name: "Sign in to screen criteria" })
        .click();
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/eligibility?scheme=pmsby");
      await ready();
      sessionToken = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      assert.equal(
        await page.getByLabel("Choose a scheme").inputValue(),
        "pmsby",
      );
      await status("More information needed");
    },
  );
  await check(
    "Missing saved age is explained and links to profile",
    async () => {
      const card = page.locator(".assessment-card");
      await card.getByText("Review reasons (4)").click();
      await card
        .getByText("Add your age to your saved profile.", { exact: true })
        .waitFor();
      assert.equal(
        await card
          .getByRole("link", { name: "Review profile" })
          .getAttribute("href"),
        "/profile",
      );
      await page.getByText("No profile saved yet", { exact: true }).waitFor();
    },
  );
  await check(
    "Reload uses fresh saved details, including zero income",
    async () => {
      await saveProfile(profile);
      await reload();
      await page.getByText("₹0", { exact: true }).waitFor();
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="null"]')
          .isChecked(),
        true,
      );
    },
  );
  await check(
    "PMSBY supplied facts yield a partial match, reasons and official links",
    async () => {
      await answer("pmsbyAccount", true);
      await answer("pmsbySingleAccount", true);
      await answer("premiumConsent", true);
      await run();
      await status("Basic criteria match");
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Your screening overview",
      );
      await page.locator(".assessment-reasons summary").click();
      await page
        .getByText("Saved age 22 is within this entry range.", { exact: true })
        .waitFor();
      assert.equal(await page.locator(".rule-met").count(), 4);
      for (const link of await page.locator(".assessment-reasons a").all()) {
        const url = new URL(await link.getAttribute("href"));
        assert.equal(url.protocol, "https:");
        assert.ok(url.hostname.endsWith(".gov.in"));
      }
      await page
        .getByText(
          "Screening updated. Review the reasons and remaining conditions.",
          { exact: true },
        )
        .first()
        .waitFor();
    },
  );
  await check(
    "Answer changes hide old results; false and unknown remain different",
    async () => {
      await answer("pmsbyAccount", false);
      await page.getByText("Your answers changed.", { exact: true }).waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 0);
      await run();
      await status("A checked criterion isn’t met");
      await answer("pmsbyAccount", null);
      await run();
      await status("More information needed");
      await page
        .getByRole("button", { name: "Answer missing questions" })
        .click();
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "A few facts your profile can’t tell us.",
      );
    },
  );
  await check(
    "Refresh preserves selected scheme but resets ephemeral answers",
    async () => {
      await page.reload();
      await ready();
      assert.equal(
        await page.getByLabel("Choose a scheme").inputValue(),
        "pmsby",
      );
      assert.equal(
        await page
          .locator('input[name="premiumConsent"][value="null"]')
          .isChecked(),
        true,
      );
      const keys = await page.evaluate(() => Object.keys(localStorage));
      assert.deepEqual(keys, ["sarkarisaathi.token.v1"]);
    },
  );
  await check(
    "APY age 40 requires birthday confirmation and rejects past tax payer",
    async () => {
      await saveProfile({ ...profile, age: 40 });
      await choose("atal-pension-yojana");
      await reload();
      await answer("apySavingsAccount", true);
      await answer("indianCitizen", true);
      await answer("everIncomeTaxPayer", false);
      await run();
      await status("More information needed");
      await answer("apyByFortiethBirthday", true);
      await run();
      await status("Basic criteria match");
      await answer("everIncomeTaxPayer", true);
      await run();
      await status("A checked criterion isn’t met");
      const source = page.locator(".question-source").first();
      assert.equal(
        new URL(await source.getAttribute("href")).hostname,
        "www.pfrda.org.in",
      );
    },
  );
  await check(
    "PMSBY age 70 asks the official provider about exact entry age",
    async () => {
      await saveProfile({ ...profile, age: 70 });
      await choose("pmsby");
      await reload();
      for (const key of [
        "pmsbyAccount",
        "pmsbySingleAccount",
        "premiumConsent",
      ])
        await answer(key, true);
      await run();
      await status("More information needed");
      await page
        .getByText(
          "Ask the provider to verify the exact entry-age condition.",
          { exact: true },
        )
        .waitFor();
    },
  );
  await check(
    "UP uses confirmed family context, stage, zero income; stage changes clear confirmation",
    async () => {
      await saveProfile(profile);
      await choose("up-kanya-sumangala");
      await reload();
      for (const key of [
        "upFamilyContext",
        "girlBeneficiary",
        "upFamilyRulesMet",
      ])
        await answer(key, true);
      await page
        .getByLabel("Which UP support stage are you checking?")
        .selectOption("class-1");
      await answer("upStageRequirementsMet", true);
      await run();
      await status("Basic criteria match");
      await page
        .getByLabel("Which UP support stage are you checking?")
        .selectOption("class-6");
      assert.equal(
        await page
          .locator('input[name="upStageRequirementsMet"][value="null"]')
          .isChecked(),
        true,
      );
      await run();
      await status("More information needed");
      await answer("upStageRequirementsMet", true);
      await answer("upFamilyContext", false);
      await run();
      await status("More information needed");
    },
  );
  await check(
    "All six results use alphabetical order and consistent counts",
    async () => {
      await choose("all");
      await reset();
      await expandAll();
      for (const key of [
        "pmsbyAccount",
        "pmsbySingleAccount",
        "premiumConsent",
        "pmjjbyAccount",
        "apySavingsAccount",
        "indianCitizen",
        "cultivableLandOwner",
        "upFamilyContext",
        "girlBeneficiary",
        "upFamilyRulesMet",
        "upStageRequirementsMet",
      ])
        await answer(key, true);
      for (const key of [
        "everIncomeTaxPayer",
        "existingBankAccount",
        "pmKisanExcluded",
      ])
        await answer(key, false);
      // Changing a stage always clears its confirmation.
      await page
        .getByLabel("Which UP support stage are you checking?")
        .selectOption("class-1");
      await answer("upStageRequirementsMet", true);
      await run(6);
      assert.deepEqual(
        await page.locator(".assessment-status").allTextContents(),
        Array(6).fill(" Basic criteria match"),
      );
      const names = await page.locator(".assessment-card h3").allTextContents();
      assert.deepEqual(names, [...names].sort());
      assert.equal(
        await page.locator(".count-basic_match strong").innerText(),
        "6",
      );
      await snapshot("reports/eligibility-desktop.png");
    },
  );
  await check(
    "Keyboard radios, native disclosure, and source focus are usable",
    async () => {
      await choose("pmsby");
      const radio = page.locator('input[name="pmsbyAccount"][value="true"]');
      await radio.focus();
      await radio.press("ArrowRight");
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="false"]')
          .isChecked(),
        true,
      );
      const summary = page.locator(".question-group summary").first();
      await summary.focus();
      await summary.press("Enter");
      assert.equal(
        await summary.evaluate((el) => el.parentElement.open),
        false,
      );
      await summary.press("Enter");
      assert.equal(await summary.evaluate((el) => el.parentElement.open), true);
      await page.locator(".question-source").first().focus();
      assert.equal(
        await page.evaluate(() => document.activeElement?.className),
        "question-source",
      );
    },
  );
  await check(
    "Slow submission disables fields and exposes loading status",
    async () => {
      await page.route("**/api/eligibility", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 700));
        }
        await route.continue();
      });
      await page
        .getByRole("button", { name: "Run screening", exact: true })
        .click();
      await page.getByRole("button", { name: "Checking…" }).waitFor();
      assert.equal(await page.getByLabel("Choose a scheme").isDisabled(), true);
      assert.equal(
        await page.locator('input[name="pmsbyAccount"]').first().isDisabled(),
        true,
      );
      await page.locator(".assessment-card").first().waitFor();
      await page.unroute("**/api/eligibility");
    },
  );
  await check(
    "POST network failure retains answers and the signed-in session",
    async () => {
      await answer("pmsbyAccount", true);
      await page.route("**/api/eligibility", (route) =>
        route.request().method() === "POST"
          ? route.abort("failed")
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "Run screening", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Your answers are still here" })
        .waitFor();
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="true"]')
          .isChecked(),
        true,
      );
      assert.ok(
        (await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        )) === sessionToken,
        "Session retained after network failure",
      );
      await page.unroute("**/api/eligibility");
      await run();
      await status("Basic criteria match");
    },
  );
  await check(
    "GET failure is honest and retry recovers without logout",
    async () => {
      await page.route("**/api/eligibility", (route) =>
        route.request().method() === "GET"
          ? route.abort("failed")
          : route.continue(),
      );
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t prepare your screening" })
        .waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 0);
      assert.ok(
        (await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        )) === sessionToken,
        "Session retained after network failure",
      );
      await page.unroute("**/api/eligibility");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await ready();
    },
  );
  await check(
    "Unknown scheme URL falls back transparently to the full catalog",
    async () => {
      await page.goto(`${base}/eligibility?scheme=unknown`);
      await ready();
      await page
        .getByText(
          "That scheme isn’t in the loaded catalog. Showing the full collection.",
          { exact: true },
        )
        .waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 6);
    },
  );
  await check(
    "Seven widths support all schemes, expanded questions/reasons and workspace pages",
    async () => {
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${base}/eligibility`);
        await ready();
        await expandAll();
        for (const disclosure of await page
          .locator(".assessment-reasons summary")
          .all())
          await disclosure.click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `Screening overflow ${width}`,
        );
        await choose("up-kanya-sumangala");
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `UP overflow ${width}`,
        );
        if (width === 390) await snapshot("reports/eligibility-mobile.png");
        for (const path of ["/dashboard", "/profile"]) {
          await page.goto(`${base}${path}`);
          await page
            .locator(
              path === "/profile" ? ".profile-form-card" : ".dashboard-grid",
            )
            .waitFor();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `${path} overflow ${width}`,
          );
        }
      }
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.goto(`${base}/eligibility?scheme=pmsby`);
      await ready();
    },
  );
  await check(
    "Reduced motion removes entrance and interaction transitions",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const motion = await page
        .locator(".screening-choices label")
        .first()
        .evaluate((el) => ({
          transition: getComputedStyle(el).transitionDuration,
          animation: getComputedStyle(document.querySelector(".page-enter"))
            .animationDuration,
        }));
      assert.equal(motion.transition, "0s");
      assert.ok(parseFloat(motion.animation) <= 0.001);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      const normal = await page
        .locator(".screening-choices label")
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      assert.ok(normal.includes("0.15s"));
    },
  );
  await check(
    "Changing accounts clears previous answers and private profile snapshots",
    async () => {
      await answer("pmsbyAccount", true);
      const response = await context.request.post(`${api}/auth/register`, {
        data: {
          name: "Second Screen Citizen",
          email: `second.${Date.now()}@example.com`,
          password,
        },
      });
      assert.equal(response.status(), 201);
      const second = await response.json();
      async function switchToken(token) {
        await page.evaluate((value) => {
          const oldValue = localStorage.getItem("sarkarisaathi.token.v1");
          localStorage.setItem("sarkarisaathi.token.v1", value);
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "sarkarisaathi.token.v1",
              oldValue,
              newValue: value,
              storageArea: localStorage,
            }),
          );
        }, token);
      }
      await switchToken(second.token);
      await page.getByText("Second Screen Citizen", { exact: true }).waitFor();
      await ready();
      assert.deepEqual(
        await page.locator(".screening-profile dd").allTextContents(),
        ["Not added", "Not added", "Not added"],
      );
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="null"]')
          .isChecked(),
        true,
      );
      await switchToken(sessionToken);
      await page.getByText("Screen Citizen", { exact: true }).waitFor();
      await ready();
      assert.equal(
        await page.locator(".screening-profile dd").first().innerText(),
        "22",
      );
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="null"]')
          .isChecked(),
        true,
      );
    },
  );
  await check(
    "Rejected session clears private screen and token; logout prevents re-entry",
    async () => {
      await page.route("**/api/eligibility", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Your session has expired. Please sign in again.",
          }),
        }),
      );
      await page.reload();
      await page.waitForURL("**/login");
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        null,
      );
      assert.equal(await page.locator(".assessment-card").count(), 0);
      await page.unroute("**/api/eligibility");
      await page.evaluate(
        (token) => localStorage.setItem("sarkarisaathi.token.v1", token),
        account.token,
      );
      await page.goto(`${base}/eligibility`);
      await ready();
      await page
        .getByRole("button", { name: "Sign out", exact: true })
        .first()
        .click();
      await page.waitForURL("**/login");
      await page.goto(`${base}/eligibility`);
      await page.waitForURL("**/login");
    },
  );
  await check(
    "No JavaScript exceptions or unexpected browser console errors",
    async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(consoleErrors, []);
    },
  );
} finally {
  await writeFile(
    "reports/eligibility-browser-results.json",
    JSON.stringify({ base, api, results, errors, consoleErrors }, null, 2),
  );
  await browser.close();
}
