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
