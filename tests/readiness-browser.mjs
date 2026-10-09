import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const env = await readFile("client/.env", "utf8"),
  base =
    process.env.FRONTEND_URL ||
    `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`,
  api =
    /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() || "http://localhost:5000/api";
const executablePath =
  process.env.BROWSER_PATH ||
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath }),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  }),
  page = await context.newPage();
const errors = [],
  consoleErrors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text()))
    consoleErrors.push(m.text());
});
await mkdir("reports", { recursive: true });
const email = `readiness.browser.${Date.now()}@example.com`,
  password = "ReadinessTest123!";
const registration = await context.request.post(`${api}/auth/register`, {
  data: { name: "Preparation Citizen", email, password },
});
assert.equal(registration.status(), 201);
const account = await registration.json(),
  headers = { Authorization: `Bearer ${account.token}` };
let sessionToken;
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
const ready = () =>
  page.getByLabel("Explore a checklist", { exact: true }).waitFor();
const choose = async (slug) => {
  await page
    .getByLabel("Explore a checklist", { exact: true })
    .selectOption(slug);
  await page.locator(".readiness-card").first().waitFor();
};
const card = () => page.locator(".readiness-card").first();
const progress = async (n, total) => {
  await card()
    .locator(".readiness-progress strong")
    .filter({ hasText: new RegExp(`^${n} of ${total} tasks complete$`) })
    .waitFor();
};
const checkbox = (index) => card().locator('input[type="checkbox"]').nth(index);
const load = async () => {
  await page
    .getByRole("button", { name: "Reload saved schemes", exact: true })
    .first()
    .click();
  await ready();
};
const save = async () => {
  await card().getByRole("button", { name: "Save scheme to start" }).click();
  await card().getByText("Saved scheme", { exact: true }).waitFor();
};
const getEntry = async (slug = "pmsby") => {
  const res = await context.request.get(`${api}/readiness`, { headers });
  assert.equal(res.status(), 200);
  return (await res.json()).entries.find((e) => e.slug === slug);
};
const screenshot = async (path) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({ path, fullPage: true });
  await page.screenshot({ path: path.replace(".png", "-viewport.png") });
  await page.emulateMedia({ reducedMotion: "no-preference" });
};
try {
  await check(
    "Detail preparation action preserves the scheme through login",
    async () => {
      await page.goto(`${base}/schemes/pmsby`);
      await page
        .getByRole("link", { name: "Sign in to save & prepare" })
        .click();
      await page.waitForURL("**/login");
      await page.getByLabel("Email address").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL("**/readiness?scheme=pmsby");
      await ready();
      sessionToken = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      assert.equal(
        await page.getByLabel("Explore a checklist").inputValue(),
        "pmsby",
      );
      assert.equal(await checkbox(0).isDisabled(), true);
      await card().getByText("Checklist preview", { exact: true }).waitFor();
    },
  );
  await check(
    "Empty saved list is honest and checklist preview remains selectable",
    async () => {
      await page.getByLabel("Explore a checklist").selectOption("");
      await page
        .getByRole("heading", {
          name: "A little preparation starts with a saved scheme.",
        })
        .waitFor();
      assert.equal(await page.locator(".readiness-card").count(), 0);
      await choose("pmsby");
      assert.equal(await card().locator('input[type="checkbox"]').count(), 4);
      await card()
        .getByText("Save to track progress", { exact: true })
        .waitFor();
    },
  );
  await check(
    "Save persists a scheme and a checked task through refresh",
    async () => {
      await save();
      await checkbox(0).click();
      await progress(1, 4);
      await page.reload();
      await ready();
      await progress(1, 4);
      assert.equal(await checkbox(0).isChecked(), true);
      assert.equal((await getEntry()).progress.completed, 1);
      assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [
        "sarkarisaathi.token.v1",
      ]);
    },
  );
  await check(
    "Listed-task completion reaches 100 percent without an approval claim",
    async () => {
      for (let i = 1; i < 4; i++) {
        await checkbox(i).click();
        await progress(i + 1, 4);
      }
      await card()
        .getByText("Listed tasks complete", { exact: true })
        .waitFor();
      await card()
        .getByText(
          "Your listed tasks are complete. Confirm the provider’s current requirements before applying.",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await card().getByRole("progressbar").getAttribute("value"),
        "100",
      );
      await checkbox(0).click();
      await progress(3, 4);
      assert.equal((await getEntry()).items[0].completed, false);
    },
  );
  await check(
    "Official references, provider next steps and screening transition are usable",
    async () => {
      for (const link of await card()
        .locator(".readiness-item > a, .readiness-official")
        .all()) {
        const url = new URL(await link.getAttribute("href"));
        assert.equal(url.protocol, "https:");
        assert.ok(url.hostname.endsWith(".gov.in"));
        assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
      }
      await page.goto(`${base}/eligibility?scheme=pmsby`);
      await page.locator(".assessment-card").waitFor();
      await page
        .getByRole("link", { name: "Prepare checklist", exact: true })
        .click();
      await page.waitForURL("**/readiness?scheme=pmsby");
      await ready();
      await progress(3, 4);
    },
  );
  await check(
    "A stale window cannot overwrite newer progress; reload reconciles it",
    async () => {
      const before = await getEntry();
      const res = await context.request.patch(`${api}/readiness/pmsby`, {
        headers,
        data: {
          itemId: before.items[0].id,
          completed: !before.items[0].completed,
          revision: before.revision,
          saveId: before.saveId,
          templateVersion: before.templateVersion,
        },
      });
      assert.equal(res.status(), 200);
      const fresh = (await res.json()).entry;
      await checkbox(1).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "changed in another window" })
        .waitFor();
      assert.equal(await checkbox(1).isChecked(), true);
      await load();
      await progress(fresh.progress.completed, 4);
      assert.equal(await checkbox(0).isChecked(), fresh.items[0].completed);
    },
  );
  await check(
    "Failed update retains confirmed progress and authentication",
    async () => {
      const was = await checkbox(0).isChecked();
      await page.route("**/api/readiness/pmsby", (route) =>
        route.request().method() === "PATCH"
          ? route.abort("failed")
          : route.continue(),
      );
      await checkbox(0).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "last confirmed progress" })
        .waitFor();
      assert.equal(await checkbox(0).isChecked(), was);
      assert.ok(
        (await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        )) === sessionToken,
      );
      await page.unroute("**/api/readiness/pmsby");
      await load();
    },
  );
  await check(
    "A committed update with lost response is recovered by reload",
    async () => {
      const was = await checkbox(0).isChecked();
      await page.route("**/api/readiness/pmsby", async (route) => {
        if (route.request().method() === "PATCH") {
          const res = await route.fetch();
          assert.equal(res.status(), 200);
          await route.abort("failed");
        } else await route.continue();
      });
      await checkbox(0).click();
      await page
        .getByRole("alert")
        .filter({ hasText: "Reload to confirm" })
        .waitFor();
      assert.equal(await checkbox(0).isChecked(), was);
      await page.unroute("**/api/readiness/pmsby");
      await load();
      assert.equal(await checkbox(0).isChecked(), !was);
    },
  );
  await check(
    "Slow saves disable controls and show loading feedback",
    async () => {
      await choose("pmjjby");
      await page.route("**/api/readiness/pmjjby", async (route) => {
        if (route.request().method() === "PUT")
          await new Promise((r) => setTimeout(r, 800));
        await route.continue();
      });
      await card()
        .getByRole("button", { name: "Save scheme to start" })
        .click();
      await page.locator('.readiness-card button[aria-busy="true"]').waitFor();
      assert.equal(
        await page.getByLabel("Explore a checklist").isDisabled(),
        true,
      );
      await card().getByText("Saved scheme", { exact: true }).waitFor();
      await page.unroute("**/api/readiness/pmjjby");
    },
  );
  await check(
    "All six checklist previews have scheme-specific tasks and source links",
    async () => {
      const response = await context.request.get(`${api}/readiness`, {
        headers,
      });
      const entries = (await response.json()).entries;
      assert.equal(entries.length, 6);
      for (const entry of entries) {
        await choose(entry.slug);
        assert.equal(
          await card().locator('input[type="checkbox"]').count(),
          entry.items.length,
        );
        for (const link of await card().locator(".readiness-item > a").all()) {
          const url = new URL(await link.getAttribute("href"));
          assert.ok(
            url.hostname.endsWith(".gov.in") ||
              url.hostname === "www.pfrda.org.in",
          );
          assert.equal(url.protocol, "https:");
        }
      }
      await choose("pmsby");
      await screenshot("reports/readiness-desktop.png");
    },
  );
  await check(
    "Removal dialog supports Escape, focus restoration and confirmed deletion",
    async () => {
      const trigger = card().getByRole("button", { name: "Remove from list" });
      await trigger.click();
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Keep scheme",
      );
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Remove saved scheme",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Keep scheme",
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Remove from list",
      );
      await trigger.click();
      await page
        .getByRole("button", { name: "Remove saved scheme", exact: true })
        .click();
      await card()
        .getByRole("button", { name: "Save scheme to start" })
        .waitFor();
      assert.equal((await getEntry()).saved, false);
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent),
        "Preview before you save",
      );
      await save();
      await progress(0, 4);
    },
  );
  await check(
    "Saved-list order and overview derive only from saved schemes",
    async () => {
      await page.getByLabel("Explore a checklist").selectOption("");
      assert.equal(await page.locator(".readiness-card").count(), 2);
      const names = await page.locator(".readiness-card h2").allTextContents();
      assert.deepEqual(names, [...names].sort());
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Overview", exact: true })
        .click();
      await page.getByRole("link", { name: "Open preparation" }).click();
      await ready();
    },
  );
  await check(
    "Load failure hides data and retry restores the current saved list",
    async () => {
      await page.route("**/api/readiness", (route) => route.abort("failed"));
      await page.reload();
      await page
        .getByRole("heading", {
          name: "We couldn’t load your preparation space",
        })
        .waitFor();
      assert.equal(await page.locator(".readiness-card").count(), 0);
      assert.ok(
        (await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        )) === sessionToken,
      );
      await page.unroute("**/api/readiness");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await ready();
      assert.equal(await page.locator(".readiness-card").count(), 2);
    },
  );
  await check(
    "Unknown query uses an explicit fallback and stays in the saved workspace",
    async () => {
      await page.goto(`${base}/readiness?scheme=unknown`);
      await ready();
      await page
        .getByText(
          "That scheme isn’t available in this catalog. Showing your saved list.",
          { exact: true },
        )
        .waitFor();
      assert.equal(await page.locator(".readiness-card").count(), 2);
    },
  );
  await check(
    "Seven widths fit saved lists, all six previews and five navigation links",
    async () => {
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${base}/readiness`);
        await ready();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `Saved list overflow ${width}`,
        );
        for (const slug of [
          "pmsby",
          "pmjjby",
          "atal-pension-yojana",
          "pm-jan-dhan-yojana",
          "pm-kisan",
          "up-kanya-sumangala",
        ]) {
          await choose(slug);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `${slug} overflow ${width}`,
          );
        }
        if (width === 390) await screenshot("reports/readiness-mobile.png");
        for (const path of ["/dashboard", "/profile", "/eligibility"]) {
          await page.goto(`${base}${path}`);
          await page
            .locator(
              path === "/dashboard"
                ? ".dashboard-grid"
                : path === "/profile"
                  ? ".profile-form-card"
                  : ".screening-form",
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
      await page.goto(`${base}/readiness?scheme=pmsby`);
      await ready();
    },
  );
  await check(
    "Native checkbox keyboard control and reduced motion work",
    async () => {
      await checkbox(0).focus();
      await page.keyboard.press("Space");
      await progress(1, 4);
      assert.equal(await checkbox(0).isChecked(), true);
      assert.equal(
        await checkbox(0).evaluate((el) => document.activeElement === el),
        true,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await card().evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
      assert.ok(
        await page
          .locator(".page-enter")
          .first()
          .evaluate(
            (el) => parseFloat(getComputedStyle(el).animationDuration) <= 0.001,
          ),
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      assert.ok(
        (
          await card().evaluate((el) => getComputedStyle(el).transitionDuration)
        ).includes("0.2s"),
      );
    },
  );
  await check(
    "Changing accounts clears prior saved schemes and checklist state",
    async () => {
      const response = await context.request.post(`${api}/auth/register`, {
        data: {
          name: "Second Preparation Citizen",
          email: `second.prepare.${Date.now()}@example.com`,
          password,
        },
      });
      assert.equal(response.status(), 201);
      const second = await response.json();
      const switchToken = async (token) =>
        page.evaluate((value) => {
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
      await switchToken(second.token);
      await page
        .getByText("Second Preparation Citizen", { exact: true })
        .waitFor();
      await ready();
      assert.equal(await checkbox(0).isChecked(), false);
      assert.equal(await checkbox(0).isDisabled(), true);
      await page.getByLabel("Explore a checklist").selectOption("");
      await page
        .getByRole("heading", {
          name: "A little preparation starts with a saved scheme.",
        })
        .waitFor();
      await switchToken(sessionToken);
      await page.getByText("Preparation Citizen", { exact: true }).waitFor();
      await ready();
      await choose("pmsby");
      await progress(1, 4);
    },
  );
  await check(
    "Rejected sessions clear private readiness; logout protects re-entry",
    async () => {
      await page.route("**/api/readiness", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Session expired." }),
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
      assert.equal(await page.locator(".readiness-card").count(), 0);
      await page.unroute("**/api/readiness");
      await page.evaluate(
        (token) => localStorage.setItem("sarkarisaathi.token.v1", token),
        sessionToken,
      );
      await page.goto(`${base}/readiness`);
      await ready();
      await page
        .getByRole("button", { name: "Sign out", exact: true })
        .first()
        .click();
      await page.waitForURL("**/login");
      await page.goto(`${base}/readiness`);
      await page.waitForURL("**/login");
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
    "reports/readiness-browser-results.json",
    JSON.stringify({ base, api, results, errors, consoleErrors }, null, 2),
  );
  await browser.close();
}
