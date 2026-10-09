import { mkdir, writeFile } from "node:fs/promises";
const test = (code) => [
  {
    listen: "test",
    script: { type: "text/javascript", exec: code.split("\n") },
  },
];
const status = (code) =>
  `pm.test('HTTP ${code}',()=>pm.response.to.have.status(${code}));\npm.test('Consistent response',()=>pm.expect(pm.response.json().success).to.eql(${code < 400}));\npm.test('No password or stack exposed',()=>{const b=pm.response.json();pm.expect(b.stack).to.eql(undefined);if(b.user)pm.expect(b.user.password).to.eql(undefined);});`;
const item = (
  name,
  method,
  path,
  body,
  code = 200,
  auth = false,
  extra = "",
) => ({
  name,
  request: {
    method,
    header: [
      ...(body ? [{ key: "Content-Type", value: "application/json" }] : []),
      ...(auth ? [{ key: "Authorization", value: "Bearer {{token}}" }] : []),
    ],
    url: `{{baseUrl}}${path}`,
    ...(body
      ? { body: { mode: "raw", raw: JSON.stringify(body, null, 2) } }
      : {}),
  },
  event: test(`${status(code)}${extra ? "\n" + extra : ""}`),
});
const valid = {
  name: "Postman Citizen",
  email: "{{email}}",
  password: "{{password}}",
};
const items = [
  item("Health", "GET", "/health"),
  item(
    "Register valid account",
    "POST",
    "/auth/register",
    valid,
    201,
    false,
    "pm.collectionVariables.set('token',pm.response.json().token);",
  ),
  item("Duplicate email", "POST", "/auth/register", valid, 409),
];
for (const [name, override] of [
  ["Invalid email", { email: "invalid" }],
  ["Short password", { password: "short" }],
  ["Missing name", { name: undefined }],
  ["Missing email", { email: undefined }],
  ["Missing password", { password: undefined }],
])
  items.push(
    item(name, "POST", "/auth/register", { ...valid, ...override }, 400),
  );
items.push(
  item(
    "Login valid",
    "POST",
    "/auth/login",
    { email: "{{email}}", password: "{{password}}" },
    200,
    false,
    "pm.collectionVariables.set('token',pm.response.json().token);",
  ),
  item(
    "Wrong password",
    "POST",
    "/auth/login",
    { email: "{{email}}", password: "incorrect123" },
    401,
  ),
  item(
    "Unknown account",
    "POST",
    "/auth/login",
    { email: "nonexistent.{{runId}}@example.com", password: "{{password}}" },
    401,
  ),
  item("Missing login fields", "POST", "/auth/login", {}, 400),
  item("Me valid token", "GET", "/auth/me", null, 200, true),
  item("Me missing token", "GET", "/auth/me", null, 401),
);
const invalid = item("Me invalid token", "GET", "/auth/me", null, 401);
invalid.request.header = [
  { key: "Authorization", value: "Bearer invalid-token" },
];
items.push(invalid);
const draft = {
  age: 22,
  state: null,
  district: "",
  occupation: null,
  annualHouseholdIncome: null,
};
const completeProfile = {
  age: 22,
  state: "Uttar Pradesh",
  district: "Muzaffarnagar",
  occupation: "student",
  annualHouseholdIncome: 0,
};
const completionTest = (percent) =>
  `pm.test('Profile completion ${percent}%',()=>pm.expect(pm.response.json().completion.percentage).to.eql(${percent}));pm.test('Owner metadata is private',()=>pm.expect(pm.response.json().profile.user).to.eql(undefined));`;
items.push(
  item(
    "Profile initial empty",
    "GET",
    "/profile",
    null,
    200,
    true,
    completionTest(0),
  ),
  item(
    "Profile save draft",
    "PUT",
    "/profile",
    draft,
    200,
    true,
    completionTest(25),
  ),
  item(
    "Profile read saved draft",
    "GET",
    "/profile",
    null,
    200,
    true,
    completionTest(25),
  ),
  item(
    "Profile complete with zero income",
    "PUT",
    "/profile",
    completeProfile,
    200,
    true,
    completionTest(100),
  ),
  item(
    "Profile rejects invalid age",
    "PUT",
    "/profile",
    { ...completeProfile, age: -1 },
    400,
    true,
  ),
  item(
    "Profile rejects injected owner",
    "PUT",
    "/profile",
    { ...completeProfile, userId: "untrusted-owner" },
    400,
    true,
  ),
  item(
    "Profile read after invalid saves",
    "GET",
    "/profile",
    null,
    200,
    true,
    completionTest(100),
  ),
  item("Profile missing authentication", "GET", "/profile", null, 401),
);
items.push(
  item(
    "Schemes public catalog",
    "GET",
    "/schemes",
    null,
    200,
    false,
    "pm.test('Curated catalog is seeded',()=>pm.expect(pm.response.json().catalog.total).to.be.at.least(6));",
  ),
  item(
    "Schemes keyword search",
    "GET",
    "/schemes?q=farmer",
    null,
    200,
    false,
    "pm.test('Farmer search finds PM-KISAN',()=>pm.expect(pm.response.json().schemes.some(s=>s.slug==='pm-kisan')).to.eql(true));",
  ),
  item(
    "Schemes combined filters",
    "GET",
    "/schemes?category=insurance&level=central&state=Delhi",
  ),
  item(
    "Schemes state coverage",
    "GET",
    "/schemes?level=state&state=Uttar%20Pradesh",
  ),
  item(
    "Schemes out-of-coverage view",
    "GET",
    "/schemes?level=state&state=Delhi",
    null,
    200,
    false,
    "pm.test('Honest empty result',()=>pm.expect(pm.response.json().schemes).to.eql([]));",
  ),
  item("Schemes pagination", "GET", "/schemes?limit=2&page=2"),
  item(
    "Scheme official references",
    "GET",
    "/schemes/pm-kisan",
    null,
    200,
    false,
    "pm.test('Official sources present',()=>pm.expect(pm.response.json().scheme.sources.length).to.be.above(0));pm.test('No database metadata',()=>pm.expect(pm.response.json().scheme._id).to.eql(undefined));",
  ),
  item("Scheme missing slug", "GET", "/schemes/not-in-catalog", null, 404),
  item("Schemes invalid filter", "GET", "/schemes?category=unknown", null, 400),
  item("Schemes excessive limit", "GET", "/schemes?limit=25", null, 400),
  item(
    "Schemes read-only API",
    "POST",
    "/schemes",
    { name: "Untrusted scheme" },
    404,
  ),
);
items.push(
  item("Screening missing token", "GET", "/eligibility", null, 401),
  item(
    "Screening baseline missing facts",
    "GET",
    "/eligibility",
    null,
    200,
    true,
    "pm.test('Six reviewed entries',()=>pm.expect(pm.response.json().results.length).to.eql(6));pm.test('Additional answers not retained',()=>pm.expect(pm.response.json().counts.needs_info).to.eql(6));",
  ),
  item(
    "Screening supplied basic match",
    "POST",
    "/eligibility",
    {
      answers: {
        pmsbyAccount: true,
        pmsbySingleAccount: true,
        premiumConsent: true,
      },
    },
    200,
    true,
    "pm.test('PMSBY basic match',()=>pm.expect(pm.response.json().results.find(x=>x.slug==='pmsby').assessment.status).to.eql('basic_match'));",
  ),
  item(
    "Screening known failure",
    "POST",
    "/eligibility",
    { answers: { existingBankAccount: true } },
    200,
    true,
    "pm.test('PMJDY checked failure',()=>pm.expect(pm.response.json().results.find(x=>x.slug==='pm-jan-dhan-yojana').assessment.status).to.eql('criteria_not_met'));",
  ),
  item(
    "Screening not sure",
    "POST",
    "/eligibility",
    { answers: { existingBankAccount: null } },
    200,
    true,
  ),
  item(
    "Screening rejects string boolean",
    "POST",
    "/eligibility",
    { answers: { existingBankAccount: "false" } },
    400,
    true,
  ),
  item(
    "Screening rejects invalid stage",
    "POST",
    "/eligibility",
    { answers: { upStage: "class-2" } },
    400,
    true,
  ),
  item(
    "Screening rejects profile override",
    "POST",
    "/eligibility",
    { answers: {}, profile: { age: 22 } },
    400,
    true,
  ),
  item(
    "Screening confirms answers are ephemeral",
    "GET",
    "/eligibility",
    null,
    200,
    true,
    "pm.test('Answers are not persisted',()=>pm.expect(pm.response.json().counts.needs_info).to.eql(6));",
  ),
);
const capturePreparation =
  "const e=pm.response.json().entry;pm.collectionVariables.set('readinessRevision',e.revision);pm.collectionVariables.set('readinessSaveId',e.saveId);pm.collectionVariables.set('readinessVersion',e.templateVersion);";
function readinessMutation(name, method, fields, code = 200, extra = "") {
  const result = item(
    name,
    method,
    "/readiness/pmsby",
    fields,
    code,
    true,
    extra,
  );
  result.request.body.raw = result.request.body.raw.replace(
    '"{{readinessRevision}}"',
    "{{readinessRevision}}",
  );
  return result;
}
const preparationBody = {
  itemId: "account",
  completed: true,
  revision: "{{readinessRevision}}",
  saveId: "{{readinessSaveId}}",
  templateVersion: "{{readinessVersion}}",
};
items.push(
  item("Readiness missing token", "GET", "/readiness", null, 401),
  item("Readiness initial previews", "GET", "/readiness", null, 200, true),
  item(
    "Readiness save scheme",
    "PUT",
    "/readiness/pmsby",
    {},
    200,
    true,
    capturePreparation,
  ),
  readinessMutation(
    "Readiness complete task",
    "PATCH",
    preparationBody,
    200,
    capturePreparation,
  ),
  item(
    "Readiness read persisted task",
    "GET",
    "/readiness",
    null,
    200,
    true,
    "pm.test('Task stored',()=>pm.expect(pm.response.json().entries.find(e=>e.slug==='pmsby').progress.completed).to.eql(1));",
  ),
  readinessMutation(
    "Readiness rejects string completion",
    "PATCH",
    { ...preparationBody, completed: "true" },
    400,
  ),
  item(
    "Readiness repeated save preserves progress",
    "PUT",
    "/readiness/pmsby",
    {},
    200,
    true,
    capturePreparation,
  ),
  readinessMutation(
    "Readiness unmark task",
    "PATCH",
    { ...preparationBody, completed: false },
    200,
    capturePreparation,
  ),
  item(
    "Readiness rejects owner override",
    "PUT",
    "/readiness/pmsby",
    { user: "another-account" },
    400,
    true,
  ),
  readinessMutation(
    "Readiness rejects stale removal",
    "DELETE",
    { revision: 0, saveId: "{{readinessSaveId}}" },
    409,
  ),
  readinessMutation("Readiness remove saved scheme", "DELETE", {
    revision: "{{readinessRevision}}",
    saveId: "{{readinessSaveId}}",
  }),
  item(
    "Readiness confirms removal",
    "GET",
    "/readiness",
    null,
    200,
    true,
    "pm.test('Saved entry removed',()=>pm.expect(pm.response.json().entries.find(e=>e.slug==='pmsby').saved).to.eql(false));",
  ),
);
const collection = {
  info: {
    name: "SarkariSaathi AI — Phases 1–5",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:5000/api" },
    { key: "email", value: "" },
    { key: "password", value: "PostmanTest123!" },
    { key: "token", value: "" },
  ],
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "if(pm.info.requestName === 'Health'){const id=Date.now().toString();pm.collectionVariables.set('runId',id);pm.collectionVariables.set('email','postman.'+id+'@example.com');}",
        ],
      },
    },
  ],
  item: items,
};
await mkdir("docs", { recursive: true });
await writeFile(
  "docs/SarkariSaathi.postman_collection.json",
  JSON.stringify(collection, null, 2),
);
console.log("Postman collection generated.");
