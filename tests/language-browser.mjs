import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const env = await readFile("client/.env", "utf8");
const base =
  process.env.FRONTEND_URL ||
  `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`;
const api =
  /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() || "http://localhost:5000/api";
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
const email = `language.${Date.now()}@example.com`,
  password = "LanguageTest123!",
  name = "Student भाषा परीक्षण";
const key = "sarkarisaathi.language.v1";
let token;
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`PASS ${name}`);
}
async function language(value) {
  await page.locator(".language-trigger").first().click();
  await page
    .getByRole("menuitemradio")
    .filter({ has: page.locator(`[lang=${value}]`) })
    .click();
  await page.waitForFunction(
    (value) => document.documentElement.lang === value,
    value,
  );
}
async function profile() {
  const response = await context.request.get(`${api}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status(), 200);
  return (await response.json()).profile;
}
async function ready() {
  await page.locator(".readiness-card").first().waitFor();
}
await mkdir("reports", { recursive: true });
try {
  await check(
    "English default loads without downloading Hindi dictionary",
    async () => {
      const requests = [];
      page.on("request", (request) => requests.push(request.url()));
      await page.goto(base);
      await page.locator(".hero h1").waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), "en");
      assert.ok(!requests.some((url) => /\/hi-[\w-]+\.js/.test(url)));
    },
  );
  await check(
    "Language menu supports arrows, selected state, Escape and trigger focus",
    async () => {
      const button = page.locator(".language-trigger").first();
      await button.focus();
      await page.keyboard.press("ArrowDown");
      await page.getByRole("menuitemradio", { checked: true }).waitFor();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.documentElement.lang === "hi");
      await page
        .getByRole("heading", { name: "सरकारी लाभ, आसान भाषा में।" })
        .waitFor();
      assert.ok((await page.title()).includes("सरकारी"));
      await button.click();
      assert.equal(
        await page.getByRole("menuitemradio", { checked: true }).innerText(),
        "हिन्दी\nहिन्दी",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await button.evaluate((element) => element === document.activeElement),
        true,
      );
      await button.click();
      await page.locator(".hero h1").click();
      assert.equal(await page.getByRole("menu").count(), 0);
    },
  );
  await check(
    "Language persists through refresh and direct native anchors",
    async () => {
      await page.goto(`${base}/#how-it-works`);
      await page.waitForFunction(() => document.documentElement.lang === "hi");
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        "hi",
      );
      await page.reload();
      await page.waitForFunction(() => document.documentElement.lang === "hi");
      assert.equal(new URL(page.url()).hash, "#how-it-works");
      await page.getByRole("note", { name: "अनुवाद संबंधी जानकारी" }).waitFor();
    },
  );
  await check(
    "Auth drafts and passwords survive switching languages; Hindi validation is inline",
    async () => {
      await page.goto(`${base}/register`);
      await page.locator("#name").fill(name);
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await language("en");
      assert.equal(await page.locator("#name").inputValue(), name);
      assert.equal(await page.locator("#password").inputValue(), password);
      await language("hi");
      await page.locator("#email").fill("invalid");
      await page
        .getByRole("button", { name: "खाता बनाएँ", exact: true })
        .click();
      await page
        .getByText("एक मान्य ईमेल पता लिखें।", { exact: true })
        .waitFor();
      await page.getByRole("button", { name: "पासवर्ड दिखाएँ" }).click();
      assert.equal(
        await page.locator("#password").getAttribute("type"),
        "text",
      );
      await page.getByRole("button", { name: "पासवर्ड छिपाएँ" }).click();
      await page.locator("#email").fill(email);
      await page
        .getByRole("button", { name: "खाता बनाएँ", exact: true })
        .click();
      await page.waitForURL("**/dashboard");
      token = await page.evaluate(() =>
        localStorage.getItem("sarkarisaathi.token.v1"),
      );
      assert.ok(token);
      await page
        .getByRole("heading", { name: new RegExp(name.split(" ")[0]) })
        .waitFor();
    },
  );
  await check(
    "Profile drafts survive switching and Hindi choices send canonical payloads",
    async () => {
      await page.goto(`${base}/profile`);
      await page.locator("#profile-age").fill("24");
      await page.locator("#profile-state").selectOption("Uttar Pradesh");
      await page.locator("#profile-occupation").selectOption("student");
      await page.locator("#profile-district").fill("मुज़फ़्फ़रनगर");
      await page.locator("#profile-income").fill("240000");
      await language("en");
      assert.equal(
        await page.locator("#profile-district").inputValue(),
        "मुज़फ़्फ़रनगर",
      );
      await language("hi");
      assert.equal(
        await page.locator("#profile-state").inputValue(),
        "Uttar Pradesh",
      );
      await page
        .getByRole("button", { name: "प्रोफ़ाइल सेव करें", exact: true })
        .click();
      await page.getByText("सभी बदलाव सेव हो गए", { exact: true }).waitFor();
      const stored = await profile();
      assert.equal(stored.state, "Uttar Pradesh");
      assert.equal(stored.occupation, "student");
      assert.equal(stored.district, "मुज़फ़्फ़रनगर");
    },
  );
  await check(
    "Hindi catalog filters retain canonical URL values and Hindi search resolves known schemes",
    async () => {
      await page.goto(`${base}/schemes`);
      await page.locator(".scheme-card").first().waitFor();
      await page
        .getByLabel("स्थान के लिए", { exact: true })
        .selectOption("Kerala");
      await page.waitForURL("**/schemes?state=Kerala");
      assert.equal(
        await page.getByLabel("स्थान के लिए", { exact: true }).inputValue(),
        "Kerala",
      );
      await page.locator("#scheme-search").fill("किसान");
      await page.getByRole("button", { name: "खोजें", exact: true }).click();
      await page
        .getByRole("heading", {
          name: "प्रधानमंत्री किसान सम्मान निधि",
          exact: true,
        })
        .waitFor();
      assert.equal(new URL(page.url()).searchParams.get("q"), "किसान");
      await language("en");
      assert.equal(await page.locator("#scheme-search").inputValue(), "किसान");
      await language("hi");
    },
  );
  await check(
    "All six scheme details translate benefits and retain exact official links",
    async () => {
      const response = await context.request.get(`${api}/schemes`);
      const data = await response.json();
      for (const scheme of data.schemes) {
        await page.goto(`${base}/schemes/${scheme.slug}#official-sources`);
        await page.locator(".scheme-detail-layout").waitFor();
        assert.match(await page.locator("h1").innerText(), /[\u0900-\u097f]/);
        assert.match(
          await page.locator(".scheme-benefits-list").innerText(),
          /[\u0900-\u097f]/,
        );
        const detail = await (
          await context.request.get(`${api}/schemes/${scheme.slug}`)
        ).json();
        assert.equal(
          await page
            .getByRole("link", { name: "आधिकारिक वेबसाइट देखें" })
            .getAttribute("href"),
          detail.scheme.officialUrl,
        );
      }
    },
  );
  await check(
    "Screening answers survive switching and Hindi reasons preserve deterministic results",
    async () => {
      await page.goto(`${base}/eligibility?scheme=pmsby`);
      await page.locator(".screening-question").first().waitFor();
      for (const fieldset of await page.locator(".screening-question").all())
        await fieldset.getByRole("radio", { name: "हाँ", exact: true }).check();
      await language("en");
      for (const fieldset of await page.locator(".screening-question").all())
        assert.equal(
          await fieldset
            .getByRole("radio", { name: "Yes", exact: true })
            .isChecked(),
          true,
        );
      await language("hi");
      await page
        .getByRole("button", { name: "जाँच करें", exact: true })
        .click();
      await page
        .locator(".assessment-status")
        .filter({ hasText: "बुनियादी शर्तें मेल खाती हैं" })
        .waitFor();
      await page.locator(".assessment-reasons summary").click();
      assert.match(
        await page.locator(".assessment-reasons").innerText(),
        /आपका जवाब हाँ/,
      );
      assert.ok(
        !(await page.locator(".assessment-reasons").innerText()).includes(
          "Your answer",
        ),
      );
    },
  );
  await check(
    "Preparation preview, save and marks persist across languages and refresh",
    async () => {
      await page.goto(`${base}/readiness?scheme=pmsby`);
      await ready();
      await page
        .getByRole("button", { name: "शुरू करने के लिए योजना सेव करें" })
        .click();
      await page.getByText("सेव की गई योजना", { exact: true }).waitFor();
      await page.locator(".readiness-item input").first().click();
      await page
        .getByText("4 में से 1 काम पूरे हुए", { exact: true })
        .waitFor();
      await language("en");
      await page.getByText("1 of 4 tasks complete", { exact: true }).waitFor();
      await language("hi");
      await page.reload();
      await ready();
      await page
        .getByText("4 में से 1 काम पूरे हुए", { exact: true })
        .waitFor();
      const response = await context.request.get(`${api}/readiness`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const entry = (await response.json()).entries.find(
        (row) => row.slug === "pmsby",
      );
      assert.equal(entry.progress.completed, 1);
      assert.equal(entry.items[0].id, "account");
      await page
        .getByRole("button", { name: "सूची से हटाएँ", exact: true })
        .click();
      await page
        .getByRole("button", { name: "योजना रखें", exact: true })
        .click();
      assert.equal(await page.locator("dialog").count(), 0);
    },
  );
  await check(
    "Cross-tab preference synchronizes without losing session or editing state",
    async () => {
      const other = await context.newPage();
      await other.goto(base);
      await other.evaluate((key) => localStorage.setItem(key, "en"), key);
      await page.waitForFunction(() => document.documentElement.lang === "en");
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        token,
      );
      await other.evaluate((key) => localStorage.setItem(key, "hi"), key);
      await page.waitForFunction(() => document.documentElement.lang === "hi");
      await other.close();
    },
  );
  await check(
    "Hindi pages and language controls fit all seven required widths",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        for (const route of [
          "/",
          "/schemes",
          "/schemes/pm-kisan",
          "/dashboard",
          "/profile",
          "/eligibility?scheme=pmsby",
          "/readiness?scheme=pmsby",
        ]) {
          await page.goto(`${base}${route}`);
          await page.waitForFunction(
            () => document.documentElement.lang === "hi",
          );
          await page.locator("h1").first().waitFor();
          if (route.includes("readiness")) await ready();
          if (route === "/schemes")
            await page.locator(".scheme-card").first().waitFor();
          await page.evaluate(() => document.fonts.ready);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          );
          assert.equal(overflow, false, `Overflow at ${width}: ${route}`);
          await page
            .locator(".language-trigger")
            .first()
            .scrollIntoViewIfNeeded();
          assert.equal(
            await page.locator(".language-trigger").first().isVisible(),
            true,
          );
        }
      }
    },
  );
  await check(
    "Mobile menu and reduced motion remain usable in Hindi",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base);
      await page.getByRole("button", { name: "नेविगेशन खोलें" }).click();
      await page
        .getByRole("link", { name: "यह कैसे काम करता है", exact: true })
        .first()
        .click();
      assert.equal(
        await page.locator("#menu-toggle").getAttribute("aria-expanded"),
        "false",
      );
      assert.ok(new URL(page.url()).hash === "#how-it-works");
      await page.locator(".language-trigger").first().click();
      assert.equal(
        await page
          .locator(".language-menu")
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Network errors and rejected sessions show Hindi and keep language preference",
    async () => {
      await page.goto(`${base}/profile`);
      await page.locator("#profile-age").waitFor();
      await page.route("**/api/profile", (route) => route.abort());
      await page.reload();
      await page
        .getByRole("heading", { name: "आपकी प्रोफ़ाइल लोड नहीं हो सकी" })
        .waitFor();
      await page
        .getByText(
          "सर्वर से संपर्क नहीं हो सका। अपना कनेक्शन जाँचें और फिर कोशिश करें।",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("sarkarisaathi.token.v1"),
        ),
        token,
      );
      await page.unroute("**/api/profile");
      await page.evaluate(() =>
        localStorage.setItem("sarkarisaathi.token.v1", "rejected-session"),
      );
      await page.reload();
      await page.waitForURL("**/login");
      await page
        .getByRole("button", { name: "साइन इन करें", exact: true })
        .waitFor();
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        "hi",
      );
    },
  );
  await check(
    "Hindi auth forms fit mobile widths and storage contains only session preference",
    async () => {
      for (const width of [360, 390, 430, 768, 1024, 1280, 1440])
        for (const route of ["/login", "/register"]) {
          await page.setViewportSize({ width, height: 950 });
          await page.goto(`${base}${route}`);
          await page.locator("#email").waitFor();
          await page.evaluate(() => document.fonts.ready);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${route} ${width}`,
          );
        }
      assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [
        key,
      ]);
    },
  );
  await check(
    "Hindi credential and duplicate-account errors use the real API",
    async () => {
      await page.goto(`${base}/login`);
      await page.locator("#email").fill(email);
      await page.locator("#password").fill("Incorrect123!");
      await page
        .getByRole("button", { name: "साइन इन करें", exact: true })
        .click();
      await page
        .locator(".form-alert")
        .filter({ hasText: "ईमेल या पासवर्ड गलत है" })
        .waitFor();
      await page.goto(`${base}/register`);
      await page.locator("#name").fill(name);
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page
        .getByRole("button", { name: "खाता बनाएँ", exact: true })
        .click();
      await page
        .locator(".form-alert")
        .filter({ hasText: "इस ईमेल से पहले से खाता मौजूद है।" })
        .waitFor();
    },
  );
  await check("Invalid stored language falls back to English", async () => {
    await page.evaluate((key) => localStorage.setItem(key, "unsupported"), key);
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    await page.getByLabel("Email address").waitFor();
  });
  await check(
    "Blocked browser storage still allows in-memory language switching",
    async () => {
      const isolated = await browser.newContext();
      await isolated.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new Error("Storage unavailable");
        };
        Storage.prototype.setItem = () => {
          throw new Error("Storage unavailable");
        };
      });
      const isolatedPage = await isolated.newPage();
      isolatedPage.on("pageerror", (error) => errors.push(error.message));
      await isolatedPage.goto(base);
      await isolatedPage.locator(".language-trigger").click();
      await isolatedPage
        .getByRole("menuitemradio")
        .filter({ has: isolatedPage.locator("[lang=hi]") })
        .click();
      await isolatedPage.waitForFunction(
        () => document.documentElement.lang === "hi",
      );
      await isolatedPage
        .getByRole("heading", { name: "सरकारी लाभ, आसान भाषा में।" })
        .waitFor();
      await isolated.close();
    },
  );
  await check(
    "Unavailable Hindi bundle keeps English usable and reload recovers",
    async () => {
      const isolated = await browser.newContext();
      const isolatedPage = await isolated.newPage();
      isolatedPage.on("pageerror", (error) => errors.push(error.message));
      await isolatedPage.route(/\/assets\/hi-[^/]+\.js$/, (route) =>
        route.abort(),
      );
      await isolatedPage.goto(base);
      await isolatedPage.locator(".language-trigger").click();
      await isolatedPage
        .getByRole("menuitemradio")
        .filter({ has: isolatedPage.locator("[lang=hi]") })
        .click();
      await isolatedPage
        .getByRole("alert")
        .filter({ hasText: "Hindi could not be loaded" })
        .waitFor();
      assert.equal(
        await isolatedPage.locator("html").getAttribute("lang"),
        "en",
      );
      await isolatedPage
        .getByRole("heading", {
          name: "Government benefits, made understandable.",
        })
        .waitFor();
      await isolatedPage.unroute(/\/assets\/hi-[^/]+\.js$/);
      await isolatedPage.reload();
      await isolatedPage.locator(".language-trigger").click();
      await isolatedPage
        .getByRole("menuitemradio")
        .filter({ has: isolatedPage.locator("[lang=hi]") })
        .click();
      await isolatedPage.waitForFunction(
        () => document.documentElement.lang === "hi",
      );
      await isolated.close();
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
    "reports/language-browser-results.json",
    JSON.stringify({ base, results, errors, consoleErrors }, null, 2),
  );
  await browser.close();
}
