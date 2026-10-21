import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const env = await readFile("client/.env", "utf8"),
  base =
    process.env.FRONTEND_URL ||
    `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`,
  api =
    process.env.API_URL ||
    /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() ||
    "http://localhost:5000/api";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_PATH ||
    [
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ].find(existsSync),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const errors = [],
  consoleErrors = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" &&
    !/Failed to load resource/.test(message.text())
  )
    consoleErrors.push(message.text());
});
const email = `discovery.${Date.now()}@example.com`,
  password = "DiscoveryTest123!";
const registration = await context.request.post(`${api}/auth/register`, {
  data: { name: "Discovery Citizen", email, password },
});
assert.equal(registration.status(), 201);
let sessionToken;
const account = await registration.json(),
  headers = { Authorization: `Bearer ${account.token}` };
const ready = () => page.locator(".discovery-counts").waitFor();
const count = async (status) =>
  Number(
    await page
      .locator(`.discovery-count.discovery-${status} strong`)
      .innerText(),
  );
const card = (acronym) =>
  page.locator(".assessment-card").filter({
    has: page.locator(".assessment-category", { hasText: acronym }),
  });
async function setProfile(age = 24) {
  const response = await context.request.put(`${api}/profile`, {
    headers,
    data: {
      age,
      state: "Uttar Pradesh",
      district: "",
      occupation: "student",
      annualHouseholdIncome: 0,
    },
  });
  assert.equal(response.status(), 200);
}
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
async function clarify() {
  await card("PMSBY")
    .getByRole("button", { name: "Answer missing questions" })
    .click();
  await page.locator(".discovery-refine[open] #discovery-scheme").waitFor();
}
async function answer(key, value) {
  await page.locator(`input[name="${key}"][value="${value}"]`).check();
}
async function run() {
  await page
    .getByRole("button", { name: "Update shortlist", exact: true })
    .click();
  await ready();
}
async function reload() {
  await page
    .getByRole("button", { name: "Reload saved details (resets answers)" })
    .click();
  await ready();
}
await mkdir("reports", { recursive: true });
try {
  await check(
    "Protected shortlist login preserves category and selected-scheme query",
    async () => {
      await page.goto(`${base}/discover?category=insurance&scheme=pmsby`);
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/discover?category=insurance&scheme=pmsby");
      sessionToken = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      await ready();
      assert.equal(
        await page.locator("#discovery-category").inputValue(),
        "insurance",
      );
      assert.equal(
        await page.locator("#discovery-scheme").inputValue(),
        "pmsby",
      );
    },
  );
  await check(
    "No-profile and profile-only views never fabricate basic matches",
    async () => {
      assert.equal(await count("match"), 0);
      assert.equal(await count("clarify"), 6);
      await page
        .getByRole("heading", {
          name: "A few profile details are still missing.",
        })
        .waitFor();
      await setProfile();
      await reload();
      assert.equal(await count("match"), 0);
      assert.equal(await count("clarify"), 6);
      await page
        .getByRole("heading", { name: "Built from your saved details." })
        .waitFor();
      assert.ok(
        (await page.locator(".discovery-profile").innerText()).includes("₹0"),
      );
      await page.getByRole("button", { name: "Clear view filters" }).click();
      await ready();
    },
  );
  await check(
    "Missing-information action opens the right questions and focuses their heading",
    async () => {
      await clarify();
      assert.equal(
        await page.locator("#discovery-scheme").inputValue(),
        "pmsby",
      );
      await page.waitForFunction(
        () =>
          document.activeElement?.textContent === "Answer only what you know.",
      );
      for (const key of [
        "pmsbyAccount",
        "pmsbySingleAccount",
        "premiumConsent",
      ])
        await answer(key, true);
      await page
        .getByText(
          "Update the shortlist to see current groups and counts. Previous results are hidden until this check is confirmed.",
        )
        .waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 0);
      assert.equal(await page.locator(".discovery-count").count(), 0);
    },
  );
  await check(
    "Confirmed facts move PMSBY into the basic-match group without changing other schemes",
    async () => {
      await run();
      assert.equal(await count("match"), 1);
      assert.equal(await count("clarify"), 5);
      assert.equal(await count("unmet"), 0);
      assert.equal(
        await page
          .locator(".discovery-group")
          .first()
          .locator("h2")
          .innerText(),
        "Basic matches to review",
      );
      await card("PMSBY").locator("summary").click();
      await card("PMSBY")
        .getByText("Your answer Yes meets this checked requirement.")
        .first()
        .waitFor();
      for (const link of await card("PMSBY")
        .locator(".assessment-reasons a")
        .all())
        assert.ok((await link.getAttribute("href")).startsWith("https://"));
      assert.equal(
        await page.locator(".discovery-check-stamp").isVisible(),
        true,
      );
    },
  );
  await check(
    "Failed updates preserve answers and sessions while hiding stale group counts",
    async () => {
      await answer("pmsbyAccount", false);
      await page.route("**/api/eligibility", (route) =>
        route.request().method() === "POST" ? route.abort() : route.continue(),
      );
      await page
        .getByRole("button", { name: "Update shortlist", exact: true })
        .click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Your answers are still here" })
        .waitFor();
      assert.equal(
        await page
          .locator('input[name="pmsbyAccount"][value="false"]')
          .isChecked(),
        true,
      );
      assert.equal(await page.locator(".discovery-count").count(), 0);
      assert.ok(
        (await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        )) === sessionToken,
        "A network failure retains the signed-in session",
      );
      await page.unroute("**/api/eligibility");
      await run();
      assert.equal(await count("unmet"), 1);
      assert.equal(await count("match"), 0);
      assert.equal(await count("clarify"), 5);
      await answer("pmsbyAccount", null);
      await run();
      assert.equal(await count("clarify"), 6);
    },
  );
  await check(
    "Category and status views intersect with shareable URLs and honest zero-result states",
    async () => {
      await page
        .getByLabel("Category", { exact: true })
        .selectOption("insurance");
      await page.waitForFunction(
        () => document.querySelectorAll(".assessment-card").length === 2,
      );
      assert.equal(await page.locator(".assessment-card").count(), 2);
      await page
        .getByLabel("Checked status", { exact: true })
        .selectOption("basic_match");
      await page
        .getByRole("heading", { name: "No entries in this view" })
        .waitFor();
      assert.equal(await count("clarify"), 6);
      await page.reload();
      await ready();
      assert.equal(
        await page.getByLabel("Checked status").inputValue(),
        "basic_match",
      );
      await page.getByRole("button", { name: "Clear view filters" }).click();
      // Counts stay mounted while React Router commits a view-only query change.
      await page.waitForFunction(
        () => document.querySelectorAll(".assessment-card").length === 6,
      );
      assert.equal(await page.locator(".assessment-card").count(), 6);
    },
  );
  await check(
    "Refresh resets extra answers and groups stay alphabetical without profile/database writes",
    async () => {
      const before = (
        await (await context.request.get(`${api}/profile`, { headers })).json()
      ).profile;
      await clarify();
      for (const key of [
        "pmsbyAccount",
        "pmsbySingleAccount",
        "premiumConsent",
      ])
        await answer(key, true);
      await run();
      const group = page.locator(".discovery-group.discovery-clarify");
      const names = await group
        .locator(".assessment-card h3")
        .allTextContents();
      assert.deepEqual(
        names,
        [...names].sort((a, b) => a.localeCompare(b, "en")),
      );
      const after = (
        await (await context.request.get(`${api}/profile`, { headers })).json()
      ).profile;
      assert.deepEqual(after, before);
      await page.reload();
      await ready();
      assert.equal(await count("match"), 0);
      assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [
        "sarkarisaathi.token.v1",
      ]);
    },
  );
  await check(
    "Invalid, repeated and unknown view queries fall back transparently",
    async () => {
      await page.goto(
        `${base}/discover?category=unknown&status=approved&status=needs_info&user=someone-else`,
      );
      await ready();
      await page
        .getByText(
          "Some view filters were not recognized and were ignored. Clear view filters to reset this view.",
        )
        .waitFor();
      assert.equal(await page.getByLabel("Checked status").inputValue(), "all");
      assert.equal(await page.locator(".assessment-card").count(), 6);
      await page.getByRole("button", { name: "Clear view filters" }).click();
      assert.equal(new URL(page.url()).search, "");
    },
  );
  await check(
    "Slow checks disable editing and cannot submit twice",
    async () => {
      await clarify();
      await answer("pmsbyAccount", true);
      let requests = 0;
      await page.route("**/api/eligibility", async (route) => {
        if (route.request().method() === "POST") {
          requests++;
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
        await route.continue();
      });
      await page
        .getByRole("button", { name: "Update shortlist", exact: true })
        .click();
      await page
        .locator('.discovery-refine button[aria-busy="true"]')
        .waitFor();
      assert.equal(
        await page.locator('input[name="pmsbyAccount"]').first().isDisabled(),
        true,
      );
      assert.equal(await page.locator("#discovery-scheme").isDisabled(), true);
      await ready();
      assert.equal(requests, 1);
      await page.unroute("**/api/eligibility");
    },
  );
  await check(
    "Future unsupported and empty catalogs show no invented matches",
    async () => {
      await page.route("**/api/eligibility", async (route) => {
        const response = await route.fetch(),
          data = await response.json();
        data.results = [
          {
            slug: "future",
            name: "Future scheme",
            acronym: "Future",
            category: "banking",
            assessment: {
              status: "not_assessed",
              rules: [],
              missing: [],
              limitations: [
                "No reviewed screening rules are available for this catalog entry.",
              ],
              sources: [],
              ruleVersion: null,
              reviewedAt: null,
            },
          },
        ];
        await route.fulfill({ response, json: data });
      });
      await reload();
      assert.equal(await count("unknown"), 1);
      assert.equal(await count("match"), 0);
      await page.locator(".discovery-group.discovery-unknown").waitFor();
      await page.unroute("**/api/eligibility");
      await page.route("**/api/eligibility", async (route) => {
        const response = await route.fetch(),
          data = await response.json();
        data.results = [];
        data.questions = [];
        await route.fulfill({ response, json: data });
      });
      await reload();
      await page
        .getByRole("heading", { name: "The reviewed catalog is empty" })
        .waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 0);
      await page.unroute("**/api/eligibility");
      await reload();
    },
  );
  await check(
    "GET failure hides private results and retry restores current profile facts",
    async () => {
      await page.route("**/api/eligibility", (route) => route.abort());
      await page
        .getByRole("button", { name: "Reload saved details (resets answers)" })
        .click();
      await page
        .getByRole("heading", { name: "We couldn’t prepare your shortlist" })
        .waitFor();
      assert.equal(await page.locator(".assessment-card").count(), 0);
      await page.unroute("**/api/eligibility");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await ready();
    },
  );
  await check(
    "Details, preparation, workspace and dashboard transitions remain usable",
    async () => {
      await card("PMSBY")
        .getByRole("link", { name: "Prepare checklist" })
        .click();
      await page.waitForURL("**/readiness?scheme=pmsby");
      await page
        .getByRole("link", { name: "My shortlist", exact: true })
        .click();
      await ready();
      await card("PMSBY")
        .getByRole("link", { name: "Scheme details", exact: true })
        .click();
      await page.waitForURL("**/schemes/pmsby");
      await page.goto(`${base}/dashboard`);
      await page.getByRole("link", { name: "Open my shortlist" }).click();
      await ready();
    },
  );
  await check(
    "Both languages fit seven widths with workspace navigation entries and expanded questions",
    async () => {
      for (const language of ["en", "hi"]) {
        await page.evaluate(
          (language) =>
            localStorage.setItem("sarkarisaathi.language.v1", language),
          language,
        );
        for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
          await page.setViewportSize({ width, height: 950 });
          await page.goto(`${base}/discover?scheme=pmsby`);
          await ready();
          await page.waitForFunction(
            (language) => document.documentElement.lang === language,
            language,
          );
          await page.evaluate(() => document.fonts.ready);
          assert.equal(
            await page.locator(".workspace-navigation a").count(),
            10,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${language} ${width}`,
          );
          assert.match(
            await page.locator(".discovery-heading h1").innerText(),
            language === "hi" ? /आपकी संभावनाएँ/ : /Your possibilities/,
          );
        }
      }
      await page.locator(".language-trigger").click();
      await page
        .getByRole("menuitemradio")
        .filter({ has: page.locator("[lang=en]") })
        .click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
    },
  );
  await check(
    "Native radios, repeated clarification focus and reduced motion work",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${base}/discover?scheme=pmsby`);
      await ready();
      await clarify();
      await clarify();
      await page.waitForFunction(
        () =>
          document.activeElement?.textContent === "Answer only what you know.",
      );
      const radio = page.locator('input[name="pmsbyAccount"][value="true"]');
      await radio.focus();
      await page.keyboard.press("Space");
      assert.equal(await radio.isChecked(), true);
      await run();
      assert.equal(
        await page
          .locator(".discovery-count")
          .first()
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
    },
  );
  await check(
    "Changing account clears page-local facts and rejected sessions protect the shortlist",
    async () => {
      const registration = await context.request.post(`${api}/auth/register`, {
        data: {
          name: "Another Citizen",
          email: `other.${Date.now()}@example.com`,
          password,
        },
      });
      assert.equal(registration.status(), 201);
      const other = await registration.json();
      const second = await context.newPage();
      await second.goto(base);
      await second.evaluate(
        (token) => localStorage.setItem("sarkarisaathi.token.v1", token),
        other.token,
      );
      await second.close();
      await page
        .getByRole("heading", {
          name: "A few profile details are still missing.",
        })
        .waitFor();
      assert.equal(await count("match"), 0);
      if (await page.locator(".discovery-refine[open]").count())
        assert.equal(
          await page
            .locator('input[name="pmsbyAccount"][value="null"]')
            .isChecked(),
          true,
        );
      await page.evaluate(() =>
        localStorage.setItem("sarkarisaathi.token.v1", "rejected-token"),
      );
      await page.reload();
      await page.waitForURL("**/login");
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        null,
      );
    },
  );
  await check(
    "No runtime exceptions or unexpected console errors",
    async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(consoleErrors, []);
    },
  );
} finally {
  await writeFile(
    "reports/discovery-browser-results.json",
    JSON.stringify({ base, results, errors, consoleErrors }, null, 2),
  );
  await browser.close();
}
