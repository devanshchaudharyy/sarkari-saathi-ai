import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import {
  assessSchemes,
  QUESTIONS,
  RULE_VERSION,
} from "../src/domain/eligibility.js";
import { safeReturnPath } from "../../client/src/utils/returnPath.js";
const database = `sarkari_saathi_eligibility_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
process.env.MONGO_URI = `mongodb://127.0.0.1:27017/${database}`;
process.env.JWT_SECRET = randomBytes(48).toString("base64");
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/User.js");
const { default: Profile } = await import("../src/models/Profile.js");
const { default: Scheme } = await import("../src/models/Scheme.js");
const { seedSchemes } = await import("../src/utils/seedSchemes.js");
let a, b, tokenA, tokenB;
const profile = {
  age: 22,
  state: "Uttar Pradesh",
  annualHouseholdIncome: 0,
  occupation: "student",
};
const allYes = Object.fromEntries(
  QUESTIONS.filter((q) => q.type === "boolean").map((q) => [q.key, true]),
);
const good = {
  ...allYes,
  everIncomeTaxPayer: false,
  existingBankAccount: false,
  pmKisanExcluded: false,
  upStage: "class-1",
};
const screen = (slug, p = profile, answers = good) =>
  assessSchemes([{ slug, name: slug }], p, answers)[0].assessment;
before(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  await Promise.all([User.init(), Profile.init(), Scheme.init()]);
  await seedSchemes();
  [a, b] = await User.create(
    ["a", "b"].map((letter) => ({
      name: `Screen Citizen ${letter}`,
      email: `${letter}@example.com`,
      password: "test-fixture-unused-hash",
    })),
  );
  [tokenA, tokenB] = [a, b].map((user) =>
    jwt.sign({}, process.env.JWT_SECRET, {
      subject: user.id,
      algorithm: "HS256",
      expiresIn: "1h",
    }),
  );
});
after(async () => {
  if (mongoose.connection.name === database)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
const get = (token = tokenA) =>
  request(app).get("/api/eligibility").set("Authorization", `Bearer ${token}`);
const post = (body, token = tokenA) =>
  request(app)
    .post("/api/eligibility")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
for (const slug of [
  "pmsby",
  "pmjjby",
  "atal-pension-yojana",
  "pm-jan-dhan-yojana",
  "pm-kisan",
  "up-kanya-sumangala",
]) {
  test(`${slug}: a supplied match remains explicitly partial and sourced`, () => {
    const result = screen(slug);
    assert.equal(result.status, "basic_match");
    assert.ok(result.limitations.length);
    assert.ok(
      result.rules.every(
        (rule) =>
          rule.status === "met" && rule.source.url.startsWith("https://"),
      ),
    );
    assert.equal(result.ruleVersion, RULE_VERSION);
  });
}
for (const [slug, ages] of [
  [
    "pmsby",
    [
      [17, "criteria_not_met"],
      [18, "basic_match"],
      [69, "basic_match"],
      [70, "needs_info"],
      [71, "criteria_not_met"],
    ],
  ],
  [
    "pmjjby",
    [
      [17, "criteria_not_met"],
      [18, "basic_match"],
      [50, "basic_match"],
      [51, "criteria_not_met"],
    ],
  ],
  [
    "atal-pension-yojana",
    [
      [17, "criteria_not_met"],
      [18, "basic_match"],
      [39, "basic_match"],
      [40, "basic_match"],
      [41, "criteria_not_met"],
    ],
  ],
])
  for (const [age, status] of ages)
    test(`${slug}: age ${age} boundary`, () =>
      assert.equal(screen(slug, { ...profile, age }).status, status));
test("APY age 40 needs exact birthday confirmation rather than a whole-year match", () => {
  assert.equal(
    screen(
      "atal-pension-yojana",
      { ...profile, age: 40 },
      { ...good, apyByFortiethBirthday: null },
    ).status,
    "needs_info",
  );
  assert.equal(
    screen(
      "atal-pension-yojana",
      { ...profile, age: 40 },
      { ...good, apyByFortiethBirthday: false },
    ).status,
    "criteria_not_met",
  );
});
test("APY current or past income tax payer is a checked failure", () =>
  assert.equal(
    screen("atal-pension-yojana", profile, {
      ...good,
      everIncomeTaxPayer: true,
    }).status,
    "criteria_not_met",
  ));
test("Unknown answers are not false; no occupation/income inference", () => {
  assert.equal(screen("atal-pension-yojana", profile, {}).status, "needs_info");
  assert.equal(
    screen("pm-kisan", { ...profile, occupation: "farmer" }, {}).status,
    "needs_info",
  );
  assert.equal(
    screen("pm-jan-dhan-yojana", profile, { existingBankAccount: false })
      .status,
    "basic_match",
  );
  assert.equal(
    screen("pm-jan-dhan-yojana", profile, { existingBankAccount: null }).status,
    "needs_info",
  );
});
test("A known failure precedes missing facts but retains clarification prompts", () => {
  const result = screen("pmsby", { ...profile, age: 15 }, {});
  assert.equal(result.status, "criteria_not_met");
  assert.ok(result.missing.length);
});
test("PMSBY age 70 defers to provider and includes an official clarification", () =>
  assert.deepEqual(screen("pmsby", { ...profile, age: 70 }).missing, [
    { origin: "official", key: "pmsby-age" },
  ]));
test("Missing or invalid saved age remains unknown", () => {
  for (const age of [null, undefined, "22", NaN, -1, 121, 18.5])
    assert.equal(screen("pmsby", { ...profile, age }).status, "needs_info");
});
test("UP family context prevents use of unrelated account-holder details", () => {
  for (const upFamilyContext of [false, null, undefined]) {
    const result = screen(
      "up-kanya-sumangala",
      { ...profile, state: "Kerala", annualHouseholdIncome: 500000 },
      { ...good, upFamilyContext },
    );
    assert.equal(result.status, "needs_info");
    assert.deepEqual(result.missing, [
      { origin: "answer", key: "upFamilyContext" },
    ]);
  }
});
for (const [income, status] of [
  [0, "basic_match"],
  [300000, "basic_match"],
  [300001, "criteria_not_met"],
  [null, "needs_info"],
])
  test(`UP confirmed family income ${income}`, () =>
    assert.equal(
      screen("up-kanya-sumangala", {
        ...profile,
        annualHouseholdIncome: income,
      }).status,
      status,
    ));
test("UP residency and missing state are checked only after family confirmation", () => {
  assert.equal(
    screen("up-kanya-sumangala", { ...profile, state: "Kerala" }).status,
    "criteria_not_met",
  );
  assert.equal(
    screen("up-kanya-sumangala", { ...profile, state: null }).status,
    "needs_info",
  );
});
test("UP never uses account-holder age as girl's stage or age", () =>
  assert.equal(
    screen("up-kanya-sumangala", { ...profile, age: 120 }).status,
    "basic_match",
  ));
test("UP stage must be supplied even if requirements were confirmed", () =>
  assert.equal(
    screen("up-kanya-sumangala", profile, { ...good, upStage: null }).status,
    "needs_info",
  ));
test("UP stage selection is not itself confirmation of stage requirements", () =>
  assert.equal(
    screen("up-kanya-sumangala", profile, {
      ...good,
      upStageRequirementsMet: null,
    }).status,
    "needs_info",
  ));
test("Unknown catalog entry is not screened and has no invented rules", () => {
  const result = screen("future-scheme");
  assert.equal(result.status, "not_assessed");
  assert.deepEqual(result.rules, []);
  assert.equal(result.ruleVersion, null);
});
test("Engine does not mutate catalog, profile or answers", () => {
  const p = structuredClone(profile),
    answers = structuredClone(good),
    schemes = [{ slug: "pmsby", name: "PMSBY" }];
  const before = JSON.stringify({ p, answers, schemes });
  assessSchemes(schemes, p, answers);
  assert.equal(JSON.stringify({ p, answers, schemes }), before);
});
test("Safe login return preserves screening query but rejects unsafe destinations", () => {
  assert.equal(
    safeReturnPath("/eligibility?scheme=pmsby"),
    "/eligibility?scheme=pmsby",
  );
  for (const path of [
    "//evil.example/eligibility",
    "https://evil.example",
    "/\\evil.example/eligibility",
    "/unknown",
    "/eligibility/../login",
    null,
    "/eligibility?" + "a".repeat(301),
  ])
    assert.equal(safeReturnPath(path), "/dashboard");
});
test("Screening requires valid unexpired JWT and a live account for reads and writes", async () => {
  await request(app).get("/api/eligibility").expect(401);
  await request(app).post("/api/eligibility").send({ answers: {} }).expect(401);
  await get("invalid").expect(401);
  await get(
    jwt.sign({}, process.env.JWT_SECRET, { subject: a.id, expiresIn: -1 }),
  ).expect(401);
  await get(
    jwt.sign({}, process.env.JWT_SECRET, {
      subject: new mongoose.Types.ObjectId().toString(),
    }),
  ).expect(401);
});
test("Initial screen is private, has six real entries, and creates no profile", async () => {
  const { body, headers } = await get().expect(200);
  assert.equal(headers["cache-control"], "no-store");
  assert.equal(body.results.length, 6);
  assert.equal(body.counts.needs_info, 6);
  assert.equal(body.profile.age, null);
  assert.equal(await Profile.countDocuments(), 0);
  assert.equal(body.questions.length, QUESTIONS.length);
  assert.ok(Date.parse(body.checkedAt));
  for (const result of body.results) assert.equal(result._id, undefined);
  assert.deepEqual(
    Object.keys(body.profile).sort(),
    ["age", "annualHouseholdIncome", "state", "updatedAt"].sort(),
  );
});
test("Only authenticated owner's profile is used; zero income is preserved", async () => {
  await Profile.create({ user: a._id, ...profile });
  await Profile.create({
    user: b._id,
    ...profile,
    age: 75,
    state: "Kerala",
    annualHouseholdIncome: 500000,
  });
  const first = await post({ answers: good }).expect(200),
    second = await post({ answers: good }, tokenB).expect(200);
  assert.equal(first.body.counts.basic_match, 6);
  assert.equal(first.body.profile.annualHouseholdIncome, 0);
  assert.equal(second.body.profile.age, 75);
  assert.equal(second.body.counts.criteria_not_met, 4);
});
for (const [name, payload] of [
  ["missing answers", {}],
  ["null answers", { answers: null }],
  ["array answers", { answers: [] }],
  ["unknown fact", { answers: { unknown: true } }],
  ["string boolean", { answers: { existingBankAccount: "false" } }],
  ["numeric boolean", { answers: { existingBankAccount: 0 } }],
  ["unknown stage", { answers: { upStage: "class-2" } }],
  ["client owner", { answers: {}, user: "someone-else" }],
  ["client profile", { answers: {}, profile: { age: 22 } }],
  ["client result", { answers: {}, result: "eligible" }],
])
  test(`Rejects ${name}`, async () => {
    const { body } = await post(payload).expect(400);
    assert.deepEqual(Object.keys(body).sort(), ["message", "success"]);
  });
test("Empty answers and explicit unknown values are accepted", async () => {
  await post({ answers: {} }).expect(200);
  const { body } = await post({
    answers: Object.fromEntries(QUESTIONS.map((q) => [q.key, null])),
  }).expect(200);
  assert.equal(body.counts.needs_info, 6);
});
test("POST is read-only and never persists screening answers", async () => {
  const before = await Profile.findById(
    (await Profile.findOne({ user: a._id }))._id,
  ).lean();
  const userBefore = await User.findById(a._id).lean();
  await post({ answers: good }).expect(200);
  assert.deepEqual(await Profile.findOne({ user: a._id }).lean(), before);
  assert.deepEqual(await User.findById(a._id).lean(), userBefore);
  assert.equal((await get().expect(200)).body.counts.needs_info, 6);
});
test("Every screen reads the latest saved profile rather than a previous result", async () => {
  await Profile.updateOne({ user: a._id }, { $set: { age: 80 } });
  const { body } = await post({ answers: good }).expect(200);
  assert.equal(body.profile.age, 80);
  assert.equal(body.counts.criteria_not_met, 3);
});
test("Explicit CORS allows configured origin and hides unexpected failures", async () => {
  assert.equal(
    (await get().set("Origin", process.env.CLIENT_URL).expect(200)).headers[
      "access-control-allow-origin"
    ],
    process.env.CLIENT_URL,
  );
  const blocked = await get()
    .set("Origin", "https://untrusted.example")
    .expect(403);
  assert.equal(blocked.headers["access-control-allow-origin"], undefined);
  const find = Scheme.find;
  Scheme.find = () => {
    throw new Error("internal-secret-stack");
  };
  try {
    const { body } = await get().expect(500);
    assert.deepEqual(body, {
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  } finally {
    Scheme.find = find;
  }
});
test("Screening requests have an independent rate limit", async () => {
  let response;
  for (let i = 0; i < 61; i++) {
    response = await post({ answers: {} });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.equal(response.body.success, false);
  assert.ok(response.headers["ratelimit"]);
});
