import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { integration } from "./support/integration.js";
import Scheme from "../src/models/Scheme.js";
import {
  documentGuides,
  DOCUMENT_GUIDE_VERSION,
} from "../src/domain/documents.js";
import { officialSourceUrl } from "../../shared/catalog.js";
const f = await integration("documents");
before(f.setup);
after(f.cleanup);
const api = (slug) => request(f.app).get(`/api/schemes/${slug}/documents`);
for (const slug of ["pmsby", "pmjjby", "pm-jan-dhan-yojana"])
  test(`public document guidance for ${slug} contains reviewed practical instructions without private data`, async () => {
    const response = await api(slug).expect(200),
      { guide, scheme } = response.body;
    assert(guide.available);
    assert.equal(guide.version, DOCUMENT_GUIDE_VERSION);
    assert.equal(scheme.slug, slug);
    for (const item of guide.items) {
      assert(item.issuer);
      assert(item.steps.length >= 3);
      assert(item.prerequisites.length);
      assert(item.validity);
      assert(item.fee.status);
      assert(item.caution);
      for (const source of item.sources) assert(officialSourceUrl(source.url));
    }
    for (const name of [
      "user",
      "password",
      "saveId",
      "completedIds",
      "editorialDraft",
    ])
      assert.equal(
        JSON.stringify(response.body).includes('"' + name + '"'),
        false,
      );
    assert.equal(response.headers["cache-control"], "no-store");
  });
test("unknown and archived schemes are not exposed through document guidance", async () => {
  await api("missing-scheme").expect(404);
  await Scheme.updateOne({ slug: "pmjjby" }, { $set: { published: false } });
  await api("pmjjby").expect(404);
  await Scheme.updateOne({ slug: "pmjjby" }, { $set: { published: true } });
});
test("unsupported and editorially revised schemes have explicit empty guidance", async () => {
  assert.equal((await api("pm-kisan")).body.guide.available, false);
  await Scheme.updateOne(
    { slug: "pmsby" },
    { $set: { readinessSuspended: true } },
  );
  const { guide } = (await api("pmsby")).body;
  assert.equal(guide.available, false);
  assert.deepEqual(guide.items, []);
  assert.equal(guide.reviewedAt, null);
});
test("document APIs reject owner filters and unknown query parameters", async () => {
  await request(f.app)
    .get("/api/schemes/pmsby/documents?user=other")
    .expect(400);
});
test("only the reviewed new-enrolment service has a published zero fee", () => {
  const all = Object.values(documentGuides).flat(),
    published = all.filter((x) => x.fee.status === "published");
  assert.equal(published.length, 1);
  assert.equal(published[0].id, "aadhaar");
  assert.equal(published[0].fee.amountInRupees, 0);
  assert(published[0].fee.source.url.startsWith("https://uidai.gov.in/"));
  assert(
    all
      .filter((x) => x.fee.status === "not_verified")
      .every((x) => x.fee.amountInRupees === undefined),
  );
});
test("readiness connects only reviewed checklist items to document guides", async () => {
  const owner = await f.account("document-owner");
  const rows = (await request(f.app).get("/api/readiness").set(owner.headers))
    .body.entries;
  const jdy = rows.find((r) => r.slug === "pm-jan-dhan-yojana");
  assert.equal(jdy.documentGuideAvailable, true);
  assert.equal(jdy.items.find((i) => i.id === "kyc").documentGuideId, "kyc");
  assert.equal(
    rows.find((r) => r.slug === "pmsby").documentGuideAvailable,
    false,
  );
});
