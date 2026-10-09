import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const env = await readFile("client/.env", "utf8").catch(() => "");
const base =
  process.env.FRONTEND_URL ||
  `http://localhost:${/^VITE_DEV_PORT=(\d+)/m.exec(env)?.[1] || "5173"}`;
const api =
  process.env.API_URL ||
  /^VITE_API_URL=(.+)/m.exec(env)?.[1]?.trim() ||
  "http://localhost:5000/api";
const executablePath =
  process.env.BROWSER_PATH ||
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath });
const requestContext = await browser.newContext();
const registration = await requestContext.request.post(`${api}/auth/register`, {
  data: {
    name: "Demo Citizen",
    email: `screenshots.${Date.now()}@example.com`,
    password: "ScreenshotDemo123!",
  },
});
assert.equal(registration.status(), 201);
const { token } = await registration.json();
const headers = { Authorization: `Bearer ${token}` };
assert.equal(
  (
    await requestContext.request.put(`${api}/profile`, {
      headers,
      data: {
        age: 24,
        state: "Uttar Pradesh",
        district: "Muzaffarnagar",
        occupation: "student",
        annualHouseholdIncome: 240000,
      },
    })
  ).status(),
  200,
);
for (const slug of ["pmsby", "up-kanya-sumangala"]) {
  const saved = await requestContext.request.put(`${api}/readiness/${slug}`, {
    headers,
    data: {},
  });
  assert.equal(saved.status(), 200);
  const { entry } = await saved.json();
  assert.equal(
    (
      await requestContext.request.patch(`${api}/readiness/${slug}`, {
        headers,
        data: {
          itemId: entry.items[0].id,
          completed: true,
          templateVersion: entry.templateVersion,
          revision: entry.revision,
          saveId: entry.saveId,
        },
      })
    ).status(),
    200,
  );
}
await mkdir("docs/screenshots", { recursive: true });
try {
  for (const [device, viewport] of Object.entries({
    desktop: { width: 1440, height: 1000 },
    mobile: { width: 390, height: 844 },
  })) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const routes = [
      ["home", "/", false, "h1"],
      ["login", "/login", false, "#email"],
      ["register", "/register", false, "#email"],
      ["schemes", "/schemes", false, ".scheme-card"],
      ["scheme-detail", "/schemes/pm-kisan", false, ".scheme-detail-layout"],
      ["dashboard", "/dashboard", true, ".dashboard-grid"],
      ["profile", "/profile", true, "#profile-age"],
      ["eligibility", "/eligibility", true, ".assessment-card"],
      ["readiness", "/readiness", true, ".readiness-card"],
    ];
    for (const [name, route, authenticated, selector] of routes) {
      await page.goto(base);
      await page.evaluate(
        ({ authenticated, token }) => {
          if (authenticated)
            localStorage.setItem("sarkarisaathi.token.v1", token);
          else localStorage.removeItem("sarkarisaathi.token.v1");
        },
        { authenticated, token },
      );
      await page.goto(`${base}${route}`);
      await page.locator(selector).first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (name === "home") {
        for (const section of await page.locator("section").all()) {
          await section.scrollIntoViewIfNeeded();
          await page.waitForTimeout(60);
        }
      }
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.waitForTimeout(250);
      await page.screenshot({
        path: `docs/screenshots/${name}-${device}.png`,
        fullPage: true,
      });
      console.log(`Captured ${name}-${device}`);
    }
    assert.deepEqual(
      errors,
      [],
      "Screenshots must have no JavaScript exceptions",
    );
    await context.close();
  }
} finally {
  await browser.close();
}
