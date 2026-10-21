import { staffFixture } from "./support/staff-fixture.mjs";
import { todayInIndia } from "../shared/applications.js";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
if (
  !/^sarkari_saathi_reliability_browser_test_\d+_[a-f0-9]{6}$/.test(
    process.env.RELIABILITY_ISOLATED_DB || "",
  ) ||
  !process.env.MONGO_URI?.endsWith("/" + process.env.RELIABILITY_ISOLATED_DB)
)
  throw Error("Use the isolated reliability browser launcher.");
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
  page = await context.newPage();
const results = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    errors.push(m.text());
});
const email = `additions.${Date.now()}@example.com`,
  password = "Reliability Test Password!";
let token;
const headers = () => ({ Authorization: "Bearer " + token });
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
  await page.waitForFunction((v) => document.documentElement.lang === v, value);
}
async function responsive(name) {
  for (const lang of ["hi", "en"]) {
    await language(lang);
    assert.equal(
      await page
        .locator(".language-trigger")
        .first()
        .evaluate((el) => el === document.activeElement),
      true,
    );
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
          path: `reports/${lang === "hi" ? "hi-" : ""}${name}-${width === 390 ? "mobile" : "desktop"}.png`,
          fullPage: true,
        });
      }
    }
  }
}
await mkdir("reports", { recursive: true });
try {
  await check(
    "Public document guides load for three real schemes with exact official references and no private inputs",
    async () => {
      for (const slug of ["pmsby", "pmjjby", "pm-jan-dhan-yojana"]) {
        await page.goto(`${base}/schemes/${slug}/documents`);
        await page.locator(".document-guide").first().waitFor();
        const { guide } = await (
          await context.request.get(`${base}/api/schemes/${slug}/documents`)
        ).json();
        assert.equal(
          await page.locator(".document-guide").count(),
          guide.items.length,
        );
        assert.equal(await page.locator(".document-guide input").count(), 0);
        const links = await page
          .locator(".document-source")
          .evaluateAll((list) => list.map((x) => x.href));
        assert.deepEqual(
          links,
          guide.items.flatMap((x) => x.sources.map((s) => s.url)),
        );
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("sarkarisaathi.token.v1"),
          ),
          null,
        );
      }
    },
  );
  await check(
    "Direct document choices focus the chosen guide and survive reload",
    async () => {
      await page.goto(base + "/schemes/pm-jan-dhan-yojana/documents?item=kyc");
      await page
        .getByRole("article", {
          name: "Resolve missing identity or address evidence",
        })
        .waitFor();
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Resolve missing identity or address evidence",
      );
      await page.reload();
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Resolve missing identity or address evidence",
      );
      await page
        .getByRole("link", {
          name: "Optional: start a new Aadhaar enrolment",
          exact: true,
        })
        .click();
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Optional: start a new Aadhaar enrolment",
      );
    },
  );
  await check(
    "Unsupported schemes, missing schemes and invalid document choices show honest recovery",
    async () => {
      await page.goto(base + "/schemes/pm-kisan/documents");
      await page
        .getByRole("heading", {
          name: "No reviewed document guide is available",
        })
        .waitFor();
      assert.equal(await page.locator(".document-guide").count(), 0);
      await page.goto(base + "/schemes/no-such-scheme/documents");
      await page.getByRole("alert").waitFor();
      await page.goto(
        base + "/schemes/pmsby/documents?item=unknown&owner=other",
      );
      await page
        .getByText(
          "That document choice is unavailable. The current guides are shown below.",
        )
        .waitFor();
      assert.equal(await page.locator(".document-guide").count(), 1);
    },
  );
  await check(
    "A failed document request retries without inventing content",
    async () => {
      await page.route("**/api/schemes/pmsby/documents", (r) => r.abort());
      await page.goto(base + "/schemes/pmsby/documents");
      await page.getByRole("alert").waitFor();
      assert.equal(await page.locator(".document-guide").count(), 0);
      await page.unroute("**/api/schemes/pmsby/documents");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page.locator(".document-guide").waitFor();
    },
  );
  await check(
    "Guide fees distinguish published new-enrolment cost from unverified provider charges",
    async () => {
      await page.goto(base + "/schemes/pm-jan-dhan-yojana/documents");
      await page
        .getByText("Published by the authority", { exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("Not verified here", { exact: true }).count(),
        2,
      );
      await page
        .getByText("UIDAI states that new Aadhaar enrolment is free.", {
          exact: false,
        })
        .waitFor();
    },
  );
  await check(
    "Document guides fit seven widths in both languages and respect reduced motion",
    async () => {
      await responsive("document-guides");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".page-enter")
          .first()
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
    },
  );
  await check(
    "Preparation preview links reach the matching guide without changing checklist marks",
    async () => {
      const response = await context.request.post(base + "/api/auth/register", {
        data: { name: "Reliability Citizen", email, password },
      });
      assert.equal(response.status(), 201);
      token = (await response.json()).token;
      await page.evaluate(
        (value) => localStorage.setItem("sarkarisaathi.token.v1", value),
        token,
      );
      await page.goto(base + "/readiness?scheme=pmsby");
      const card = page.getByRole("article", {
        name: "Pradhan Mantri Suraksha Bima Yojana",
        exact: true,
      });
      await card
        .getByRole("link", { name: "Help with this document", exact: true })
        .click();
      await page.waitForURL("**/schemes/pmsby/documents?item=form");
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Get the enrolment and consent form",
      );
      const saved = await (
        await context.request.get(base + "/api/readiness", {
          headers: headers(),
        })
      ).json();
      assert.equal(saved.entries.find((e) => e.slug === "pmsby").saved, false);
    },
  );

  let otherToken;
  const panel = () => page.locator(".source-review-panel");
  const apiRow = async () =>
    (
      await (
        await context.request.get(base + "/api/readiness", {
          headers: headers(),
        })
      ).json()
    ).entries.find((e) => e.slug === "pmsby");
  async function catalogPage() {
    await page.goto(base + "/catalog");
    await page.locator("#catalog-entry").selectOption("pmsby");
    await panel()
      .getByRole("heading", { name: "Keep scheme guidance current" })
      .waitFor();
    await panel()
      .getByLabel("Public source version label", { exact: true })
      .waitFor();
  }
  async function queue(label) {
    await panel()
      .getByLabel("Public source version label", { exact: true })
      .fill(label);
    await panel()
      .getByLabel("Private observation note")
      .fill("Synthetic private observation for isolated browser verification.");
    await panel()
      .getByRole("button", { name: "Queue source review", exact: true })
      .click();
    await panel().getByText("Pending evidence", { exact: true }).waitFor();
  }
  async function resolution(kind, label, summary) {
    await panel()
      .getByLabel("Review outcome", { exact: true })
      .selectOption(kind);
    await panel()
      .getByLabel("Public source version label", { exact: true })
      .fill(label);
    await panel()
      .getByLabel("Public change summary", { exact: true })
      .fill(summary);
    await panel()
      .getByRole("button", { name: "Review and confirm outcome", exact: true })
      .click();
  }
  async function confirmOutcome() {
    await page
      .getByRole("checkbox", {
        name: "I checked the official source, the current guidance and this public summary.",
      })
      .check();
    await page
      .getByRole("button", { name: "Confirm review outcome", exact: true })
      .click();
    await panel()
      .getByRole("button", { name: "Queue source review", exact: true })
      .waitFor();
  }
  await check(
    "Ordinary accounts cannot review sources; saved schemes establish a notice baseline",
    async () => {
      assert.equal(
        (
          await context.request.get(base + "/api/catalog/pmsby/review", {
            headers: headers(),
          })
        ).status(),
        403,
      );
      let saved = await (
        await context.request.put(base + "/api/readiness/pmsby", {
          headers: headers(),
          data: {},
        })
      ).json();
      await context.request.patch(base + "/api/readiness/pmsby", {
        headers: headers(),
        data: {
          itemId: "form",
          completed: true,
          templateVersion: saved.entry.templateVersion,
          revision: saved.entry.revision,
          saveId: saved.entry.saveId,
        },
      });
      assert.equal((await apiRow()).progress.completed, 1);
      const other = await context.request.post(base + "/api/auth/register", {
        data: {
          name: "Other Reliability Citizen",
          email: "other." + Date.now() + "@example.com",
          password,
        },
      });
      assert.equal(other.status(), 201);
      otherToken = (await other.json()).token;
      assert.equal(
        (
          await (
            await context.request.get(base + "/api/updates", {
              headers: { Authorization: "Bearer " + otherToken },
            })
          ).json()
        ).unreadCount,
        0,
      );
    },
  );
  await check(
    "Editor source reports pause guidance and preserve a private evidence record",
    async () => {
      await staffFixture(email, "editor");
      await catalogPage();
      await queue("Observed source version 1");
      await panel()
        .getByText(
          "An administrator must resolve this review. You may prepare and save a catalog draft below.",
        )
        .waitFor();
      assert.equal((await apiRow()).items.length, 0);
      const detail = await (
        await context.request.get(base + "/api/schemes/pmsby")
      ).json();
      assert.equal(detail.scheme.reliability.state, "pending");
      assert(!JSON.stringify(detail).includes("Synthetic private observation"));
      const screening = await (
        await context.request.get(base + "/api/eligibility", {
          headers: headers(),
        })
      ).json();
      assert.equal(
        screening.results.find((e) => e.slug === "pmsby").assessment.status,
        "not_assessed",
      );
    },
  );
  await check(
    "Pending source changes appear on public guides and only affected users receive notices",
    async () => {
      await page.goto(base + "/schemes/pmsby/documents");
      await page
        .getByText("Source change reported — review pending", { exact: true })
        .waitFor();
      await page
        .getByRole("heading", {
          name: "No reviewed document guide is available",
        })
        .waitFor();
      await page.goto(base + "/readiness?scheme=pmsby");
      await page
        .getByRole("link", {
          name: "Unread update for this saved scheme",
          exact: true,
        })
        .click();
      await page.waitForURL("**/updates");
      await page.getByText("Unread updates", { exact: true }).waitFor();
      assert.equal(
        (
          await (
            await context.request.get(base + "/api/updates", {
              headers: { Authorization: "Bearer " + otherToken },
            })
          ).json()
        ).entries.length,
        0,
      );
    },
  );
  await check(
    "Administrator review supports both languages, responsive layouts and dialog focus",
    async () => {
      await staffFixture(email, "admin");
      await catalogPage();
      await panel()
        .getByLabel("Public source version label", { exact: true })
        .fill("Reviewed source version 1");
      await panel()
        .getByLabel("Public change summary", { exact: true })
        .fill(
          "The official source review found no change to the current published guidance.",
        );
      await responsive("source-review");
      await panel()
        .getByRole("button", {
          name: "Review and confirm outcome",
          exact: true,
        })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      assert.equal(
        await panel()
          .getByRole("button", {
            name: "Review and confirm outcome",
            exact: true,
          })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await panel()
        .getByRole("button", {
          name: "Review and confirm outcome",
          exact: true,
        })
        .click();
      await confirmOutcome();
      assert.equal((await apiRow()).progress.completed, 1);
      assert((await apiRow()).documentGuideAvailable);
    },
  );
  await check(
    "Update notices fit seven widths; failed acknowledgement preserves authentication and retry succeeds",
    async () => {
      await page.goto(base + "/updates");
      await page.getByText("Unread updates", { exact: true }).waitFor();
      await responsive("scheme-updates");
      await page.route("**/api/updates/pmsby/read", (r) => r.abort());
      await page
        .getByRole("button", { name: "Mark these updates read", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        token,
      );
      await page.unroute("**/api/updates/pmsby/read");
      await page
        .getByRole("button", { name: "Reload updates", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Mark these updates read", exact: true })
        .click();
      await page.getByText("Updates read", { exact: true }).waitFor();
      await page.reload();
      await page.getByText("Updates read", { exact: true }).waitFor();
      assert.equal((await apiRow()).progress.completed, 1);
    },
  );
  await check(
    "Reviewed publication exposes catalog differences and keeps old rules and document guides suspended",
    async () => {
      await catalogPage();
      await queue("Observed source version 2");
      await page
        .getByLabel("Benefit explanation", { exact: true })
        .fill("Synthetic published note for isolated review tests.");
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/catalog/pmsby") &&
            response.request().method() === "PATCH" &&
            response.status() === 200,
        ),
        page
          .getByRole("button", { name: "Save editorial draft", exact: true })
          .click(),
      ]);
      await panel()
        .locator('option[value="publish"]:not([disabled])')
        .waitFor({ state: "attached" });
      assert.equal(await panel().count(), 1);
      await resolution(
        "publish",
        "Reviewed source version 2",
        "The reviewed catalog note changed. Older automated guidance remains suspended pending a separate rule review.",
      );
      await confirmOutcome();
      const detail = await (
        await context.request.get(base + "/api/schemes/pmsby")
      ).json();
      assert.equal(
        detail.scheme.benefitNote,
        "Synthetic published note for isolated review tests.",
      );
      assert.equal(detail.scheme.preparation.items.length, 0);
      await page.goto(base + "/updates");
      await page
        .getByText("Catalog content updated", { exact: false })
        .first()
        .waitFor();
      await page
        .getByText("Published catalog differences", { exact: true })
        .first()
        .click();
      await page
        .locator(".catalog-diff")
        .getByText("Synthetic published note for isolated review tests.", {
          exact: true,
        })
        .waitFor();
    },
  );
  await check(
    "Source review can archive a scheme while keeping a clear affected-user notice",
    async () => {
      await catalogPage();
      await queue("Observed archive version");
      await resolution(
        "archive",
        "Reviewed archive version",
        "The isolated test scheme was archived after staff source review.",
      );
      await page
        .getByRole("checkbox", {
          name: "I checked the official source, the current guidance and this public summary.",
        })
        .check();
      await page
        .getByRole("button", { name: "Confirm review outcome", exact: true })
        .click();
      await panel()
        .getByText("Publish a scheme before reporting a source change.")
        .waitFor();
      assert.equal(
        (await context.request.get(base + "/api/schemes/pmsby")).status(),
        404,
      );
      await page.goto(base + "/updates");
      await page
        .getByText("Scheme archived", { exact: false })
        .first()
        .waitFor();
      const source = await (
        await context.request.get(base + "/api/updates", { headers: headers() })
      ).json();
      assert.equal(source.entries[0].available, false);
    },
  );
  if (otherToken)
    await context.request.delete(base + "/api/account", {
      headers: { Authorization: "Bearer " + otherToken },
      data: { password, confirmation: "DELETE" },
    });

  await check(
    "No unexpected document-guide runtime or console errors",
    async () => assert.deepEqual(errors, []),
  );
} finally {
  if (token)
    await context.request.delete(base + "/api/account", {
      headers: headers(),
      data: { password, confirmation: "DELETE" },
    });
  await writeFile(
    "reports/reliability-browser-results.json",
    JSON.stringify({ base, results, errors }, null, 2),
  );
  await browser.close();
}
