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
const env = await readFile("client/.env", "utf8").catch(() => "");
const base =
  process.env.FRONTEND_URL ||
  `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`;
const api =
  /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() || "http://localhost:5000/api";
const browser = await chromium.launch({ headless: true, executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
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
await mkdir("reports", { recursive: true });
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
const ready = async (count) => {
  await page
    .getByRole("status")
    .filter({ hasText: new RegExp(`^${count} schemes? found$`) })
    .waitFor();
  assert.equal(await page.locator(".scheme-card").count(), count);
};
const search = async (text) => {
  await page.getByRole("searchbox", { name: "Search schemes" }).fill(text);
  await page
    .getByRole("search", { name: "Search schemes" })
    .getByRole("button", { name: "Search", exact: true })
    .click();
};
const reset = async () => {
  await page.goto(`${base}/schemes`);
  await ready(6);
};
const snapshot = async (path) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
};
try {
  await check(
    "Public catalog loads actual records without authentication",
    async () => {
      await reset();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        null,
      );
      const response = await context.request.get(`${api}/schemes`);
      assert.equal(response.status(), 200);
      const data = await response.json();
      assert.equal(data.catalog.total, 6);
      assert.deepEqual(
        await page.locator(".scheme-card h2").allTextContents(),
        data.schemes.map((scheme) => scheme.name),
      );
      await page.getByText("6 schemes, carefully sourced.").waitFor();
      await snapshot("reports/schemes-desktop.png");
    },
  );
  await check(
    "Search trims input, supports acronyms and stores state in the URL",
    async () => {
      await search("  pM-kIsAn  ");
      await ready(1);
      assert.equal(new URL(page.url()).searchParams.get("q"), "pM-kIsAn");
      await page
        .getByRole("heading", {
          name: "Pradhan Mantri Kisan Samman Nidhi",
          exact: true,
        })
        .waitFor();
      await page.reload();
      await ready(1);
      assert.equal(await page.getByRole("searchbox").inputValue(), "pM-kIsAn");
      await search("insurance");
      await ready(2);
    },
  );
  await check(
    "Combined filters include central schemes for a location and clear independently",
    async () => {
      await reset();
      await page
        .getByLabel("Category", { exact: true })
        .selectOption("insurance");
      await ready(2);
      await page
        .getByLabel("Scheme level", { exact: true })
        .selectOption("central");
      await ready(2);
      await page
        .getByLabel("For location", { exact: true })
        .selectOption("Delhi");
      await ready(2);
      await page
        .getByRole("button", { name: "Remove category filter: Insurance" })
        .click();
      await ready(5);
      await page
        .getByRole("button", { name: "Clear all", exact: true })
        .click();
      await ready(6);
      assert.equal(new URL(page.url()).search, "");
    },
  );
  await check(
    "State coverage and honest empty results are shareable",
    async () => {
      await page
        .getByLabel("Scheme level", { exact: true })
        .selectOption("state");
      await page
        .getByLabel("For location", { exact: true })
        .selectOption("Uttar Pradesh");
      await ready(1);
      await page.reload();
      await ready(1);
      await page
        .getByLabel("For location", { exact: true })
        .selectOption("Delhi");
      await ready(0);
      await page
        .getByRole("heading", { name: "No schemes in this view" })
        .waitFor();
      await page
        .getByText(/does not cover every available government scheme/)
        .waitFor();
      await page
        .getByRole("button", { name: "Reset search", exact: true })
        .click();
      await ready(6);
    },
  );
  await check(
    "Details preserve search context, direct reload and browser history",
    async () => {
      await search("farmer");
      await ready(1);
      await page
        .getByRole("link", {
          name: "View details: Pradhan Mantri Kisan Samman Nidhi",
        })
        .click();
      await page
        .getByRole("heading", {
          name: "Pradhan Mantri Kisan Samman Nidhi",
          exact: true,
        })
        .waitFor();
      assert.equal(new URL(page.url()).searchParams.get("q"), "farmer");
      await page.reload();
      await page
        .getByRole("heading", {
          name: "Pradhan Mantri Kisan Samman Nidhi",
          exact: true,
        })
        .waitFor();
      await page.getByRole("link", { name: "Back to schemes" }).click();
      await ready(1);
      await page.goBack();
      await page
        .getByRole("heading", { name: "Where to begin", exact: true })
        .waitFor();
      await page.goBack();
      await ready(1);
    },
  );
  await check(
    "All six details provide official references and clear availability",
    async () => {
      const { schemes } = await (
        await context.request.get(`${api}/schemes`)
      ).json();
      for (const scheme of schemes) {
        await page.goto(`${base}/schemes/${scheme.slug}`);
        await page
          .getByRole("heading", { name: scheme.name, exact: true })
          .waitFor();
        await page
          .getByRole("heading", { name: "Official references", exact: true })
          .waitFor();
        assert.ok(
          (await page.locator(".scheme-source-section a").count()) >= 1,
        );
        for (const link of await page
          .locator(".scheme-source-section a, .scheme-official-card a")
          .all()) {
          const url = new URL(await link.getAttribute("href"));
          assert.equal(url.protocol, "https:");
          assert.ok(url.hostname.endsWith(".gov.in"));
          assert.equal(await link.getAttribute("target"), "_blank");
          assert.match(await link.getAttribute("rel"), /noopener/);
        }
        await page
          .getByText(
            "A brief overview of official requirements. This is not a personalised eligibility check.",
          )
          .waitFor();
      }
      await page.goto(`${base}/schemes/pm-kisan`);
      await page
        .getByRole("heading", { name: "Official references" })
        .waitFor();
      await snapshot("reports/scheme-detail-desktop.png");
    },
  );
  await check(
    "Native source anchors scroll and focus, including direct hash URLs",
    async () => {
      await page.getByRole("link", { name: "Read the references" }).click();
      await page.waitForFunction(
        () => document.activeElement?.id === "official-sources",
      );
      assert.equal(new URL(page.url()).hash, "#official-sources");
      await page.goto(`${base}/schemes/pmsby#official-sources`);
      await page
        .getByRole("heading", { name: "Official references" })
        .waitFor();
      await page.waitForFunction(
        () => document.activeElement?.id === "official-sources",
      );
    },
  );
  await check(
    "Pagination changes pages and resets when a filter changes",
    async () => {
      await page.goto(`${base}/schemes?limit=2`);
      await page.getByText("Page 1 of 3", { exact: true }).waitFor();
      assert.equal(await page.locator(".scheme-card").count(), 2);
      const first = await page.locator(".scheme-card h2").allTextContents();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByText("Page 2 of 3", { exact: true }).waitFor();
      assert.equal(
        (await page.locator(".scheme-card h2").allTextContents()).some((name) =>
          first.includes(name),
        ),
        false,
      );
      await page.getByRole("button", { name: "Previous", exact: true }).click();
      await page.getByText("Page 1 of 3", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByText("Page 2 of 3", { exact: true }).waitFor();
      await page
        .getByLabel("Category", { exact: true })
        .selectOption("insurance");
      await ready(2);
      assert.equal(new URL(page.url()).searchParams.has("page"), false);
    },
  );
  await check(
    "Missing schemes, invalid queries and literal operators have safe states",
    async () => {
      await page.goto(`${base}/schemes/not-in-catalog`);
      await page
        .getByRole("heading", { name: "Scheme not in this catalog" })
        .waitFor();
      await page.goto(`${base}/schemes?category=unknown`);
      await page
        .getByRole("heading", { name: "We couldn’t load the collection" })
        .waitFor();
      await page
        .getByRole("button", { name: "Reset search", exact: true })
        .click();
      await ready(6);
      await search(".*");
      await ready(0);
      await page
        .getByRole("button", { name: "Reset search", exact: true })
        .click();
      await ready(6);
    },
  );
  await check(
    "An unseeded catalog never invents counts or records",
    async () => {
      const response = await context.request.get(`${api}/schemes`);
      const empty = await response.json();
      empty.schemes = [];
      empty.pagination.total = 0;
      empty.pagination.totalPages = 0;
      empty.catalog.total = 0;
      empty.catalog.reviewedAt = null;
      empty.catalog.stateCoverage = [];
      await page.route("**/api/schemes", (route) =>
        route.fulfill({ json: empty }),
      );
      await page.reload();
      await ready(0);
      await page
        .getByRole("heading", { name: "The library is being prepared" })
        .waitFor();
      await page.getByText("0 schemes, carefully sourced.").waitFor();
      await page.unroute("**/api/schemes");
      await reset();
    },
  );
  await check(
    "Loading uses skeletons and then the actual API results",
    async () => {
      await page.route("**/api/schemes", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
      });
      await page.reload();
      await page
        .getByRole("status")
        .filter({ hasText: "Loading schemes…" })
        .waitFor();
      assert.equal(await page.locator(".scheme-skeleton").count(), 6);
      assert.equal(
        await page.locator(".scheme-grid").getAttribute("aria-hidden"),
        "true",
      );
      await ready(6);
      await page.unroute("**/api/schemes");
    },
  );
  await check(
    "Detail loading reserves space and network retry restores content",
    async () => {
      await page.route("**/api/schemes/pm-kisan", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.continue();
      });
      await page.goto(`${base}/schemes/pm-kisan`);
      await page.locator(".detail-placeholder").waitFor();
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector(".footer").getBoundingClientRect().top >
            innerHeight,
        ),
        true,
      );
      assert.equal(
        await page
          .locator(".detail-placeholder > div")
          .getAttribute("aria-hidden"),
        "true",
      );
      await page
        .getByRole("heading", {
          name: "Pradhan Mantri Kisan Samman Nidhi",
          exact: true,
        })
        .waitFor();
      await page.unroute("**/api/schemes/pm-kisan");
      await page.route("**/api/schemes/pm-kisan", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t load this scheme" })
        .waitFor();
      await page.unroute("**/api/schemes/pm-kisan");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: "Pradhan Mantri Kisan Samman Nidhi",
          exact: true,
        })
        .waitFor();
      await reset();
    },
  );
  await check("Rapid searches cannot display stale results", async () => {
    await page.route("**/api/schemes?q=insurance", async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ response }).catch(() => {});
    });
    await search("insurance");
    await page
      .getByRole("status")
      .filter({ hasText: "Loading schemes…" })
      .waitFor();
    await search("farmer");
    await ready(1);
    await page.waitForTimeout(850);
    await ready(1);
    await page
      .getByRole("heading", {
        name: "Pradhan Mantri Kisan Samman Nidhi",
        exact: true,
      })
      .waitFor();
    await page.unroute("**/api/schemes?q=insurance");
  });
  await check("Keyboard search and native filters preserve focus", async () => {
    await reset();
    await page.getByRole("searchbox").focus();
    await page.keyboard.type("pension");
    await page.keyboard.press("Enter");
    await ready(1);
    assert.equal(
      await page.locator(":focus").getAttribute("id"),
      "scheme-search",
    );
    await page.getByLabel("Category", { exact: true }).focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await ready(0);
    assert.equal(
      await page.locator(":focus").evaluate((element) => element.tagName),
      "SELECT",
    );
  });
  await check(
    "Catalog mobile navigation closes after selection and Escape",
    async () => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(base);
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Browse schemes", exact: true })
        .click();
      await ready(6);
      assert.equal(
        await page.locator("#menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      assert.equal(
        await page.locator(":focus").getAttribute("id"),
        "menu-toggle",
      );
    },
  );
  await check(
    "Catalog and every detail fit all seven viewport widths",
    async () => {
      const { schemes } = await (
        await context.request.get(`${api}/schemes`)
      ).json();
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await reset();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `catalog overflow ${width}`,
        );
        if (width === 390) await snapshot("reports/schemes-mobile.png");
        if (width === 768) await snapshot("reports/schemes-tablet.png");
        for (const scheme of schemes) {
          await page.goto(`${base}/schemes/${scheme.slug}`);
          await page
            .getByRole("heading", { name: scheme.name, exact: true })
            .waitFor();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            `${scheme.slug} overflow ${width}`,
          );
          if (width === 390 && scheme.slug === "pm-kisan")
            await snapshot("reports/scheme-detail-mobile.png");
        }
      }
    },
  );
  await check("Card hover and reduced motion behave correctly", async () => {
    await reset();
    const card = page.locator(".scheme-card").first();
    await card.hover();
    await page.waitForTimeout(220);
    assert.notEqual(
      await card.evaluate((element) => getComputedStyle(element).transform),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await card.evaluate((element) => getComputedStyle(element).transform),
      "none",
    );
    assert.equal(
      await card.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
      "0s",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
  await check(
    "Signed-in dashboard opens browsing and failures retain the session and profile",
    async () => {
      const response = await context.request.post(`${api}/auth/register`, {
        data: {
          name: "Scheme Citizen",
          email: `scheme.${Date.now()}@example.com`,
          password: "SchemeBrowser123!",
        },
      });
      assert.equal(response.status(), 201);
      const account = await response.json();
      await page.evaluate(
        (token) => localStorage.setItem("sarkarisaathi.token.v1", token),
        account.token,
      );
      await page.goto(`${base}/dashboard`);
      await page
        .getByRole("link", { name: "Browse schemes", exact: true })
        .click();
      await ready(6);
      await page.getByRole("link", { name: "My dashboard" }).waitFor();
      await page.route("**/api/schemes", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "We couldn’t load the collection" })
        .waitFor();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        account.token,
      );
      await page.unroute("**/api/schemes");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await ready(6);
      const profile = await context.request.get(`${api}/profile`, {
        headers: { Authorization: `Bearer ${account.token}` },
      });
      assert.equal((await profile.json()).completion.percentage, 0);
      await page.getByRole("link", { name: "My dashboard" }).click();
      await page
        .getByRole("link", { name: "Set up profile", exact: true })
        .waitFor();
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `workspace nav overflow ${width}`,
        );
      }
    },
  );
  await check("No JavaScript errors or unexpected console errors", async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
  });
} finally {
  await writeFile(
    "reports/schemes-browser-results.json",
    JSON.stringify({ results, errors, consoleErrors }, null, 2),
  );
  await browser.close();
}
