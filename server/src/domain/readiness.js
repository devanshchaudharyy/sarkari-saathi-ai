export const READINESS_VERSION = "2026-10-08.1";
export const READINESS_REVIEWED_AT = "2026-10-08";
const ref = (title, url) => ({ title, url });
const sources = {
  pmsby: ref(
    "DFS PMSBY enrolment FAQs",
    "https://www.financialservices.gov.in/pmsby",
  ),
  pmjjby: ref(
    "DFS PMJJBY enrolment FAQs",
    "https://www.financialservices.gov.in/pmjjby",
  ),
  apy: ref(
    "PFRDA APY FAQ",
    "https://www.pfrda.org.in/documents/33652/676426/APY%2BFAQs.pdf",
  ),
  apyForms: ref(
    "PFRDA subscriber forms",
    "https://www.pfrda.org.in/en/web/pfrda/forms",
  ),
  jdy: ref(
    "PIB PMJDY account-opening guidance",
    "https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159721&lang=2&reg=48",
  ),
  kisan: ref("Official PM-KISAN portal", "https://www.pmkisan.gov.in/"),
  kisanDocs: ref(
    "West Bengal government PM-KISAN guidance",
    "https://www.egiyebangla.gov.in/government-schemes-details-pradhan-mantri-kisan-samman-nidhi.aspx",
  ),
  up: ref(
    "UP citizen process guide",
    "https://mksy.up.gov.in/women_welfare/pdf/MKSY-Citizen-Process.pdf",
  ),
};
const item = (id, title, detail, kind, source) => ({
  id,
  title,
  detail,
  kind,
  source,
});
const verify = (source) =>
  item(
    "confirm-current",
    "Confirm current requirements with the provider",
    "Check the latest form, applicable conditions and any additional evidence before submitting through the official channel.",
    "Next step",
    source,
  );
const insurance = (source) => [
  item(
    "account",
    "Have your participating account details ready",
    "Confirm participation with your bank or post office and identify the account you will use.",
    "Information",
    source,
  ),
  item(
    "form",
    "Prepare the enrolment and consent form",
    "Obtain the current provider form and review its declaration and auto-debit authorisation. Checking this box does not authorise a payment.",
    "Document",
    source,
  ),
  item(
    "nominee",
    "Prepare nominee information for the provider",
    "Review the nomination section of the enrolment form with your provider. Keep personal details outside this app.",
    "Information",
    source,
  ),
  verify(source),
];
export const readinessTemplates = {
  pmsby: insurance(sources.pmsby),
  pmjjby: insurance(sources.pmjjby),
  "atal-pension-yojana": [
    item(
      "account",
      "Have savings-account details ready",
      "Use your personal bank or post-office savings account for the provider’s registration process.",
      "Information",
      sources.apy,
    ),
    item(
      "form",
      "Prepare the APY subscriber registration form",
      "Get the current form from your provider or the regulator’s forms page.",
      "Document",
      sources.apyForms,
    ),
    item(
      "nominee",
      "Prepare nominee and applicable spouse details",
      "Nomination is required. Ask your provider which spouse or nominee details apply to your situation.",
      "Information",
      sources.apy,
    ),
    item(
      "contribution",
      "Review contribution and auto-debit arrangements",
      "Discuss the chosen pension amount, contribution frequency and sufficient account balance with your provider.",
      "Next step",
      sources.apy,
    ),
    verify(sources.apy),
  ],
  "pm-jan-dhan-yojana": [
    item(
      "kyc",
      "Prepare the identity and address evidence accepted by your bank",
      "Ask which current KYC documents or permitted alternative process applies to you; do not assume every listed identity document is required.",
      "Document",
      sources.jdy,
    ),
    item(
      "form",
      "Prepare the account-opening form",
      "Obtain the current PMJDY form and check its required fields with the bank or Bank Mitra.",
      "Document",
      sources.jdy,
    ),
    item(
      "visit",
      "Identify your bank branch or Bank Mitra",
      "Plan where to submit the form and required evidence for verification.",
      "Next step",
      sources.jdy,
    ),
    verify(sources.jdy),
  ],
  "pm-kisan": [
    item(
      "identity",
      "Prepare Aadhaar and contact details for the official process",
      "Keep the identity and mobile information requested during official registration available. Do not enter those numbers here.",
      "Information",
      sources.kisanDocs,
    ),
    item(
      "land",
      "Prepare land records for official verification",
      "Identify the ownership records requested by the responsible authority. Document availability does not establish eligibility.",
      "Document",
      sources.kisanDocs,
    ),
    item(
      "bank",
      "Prepare bank details and supporting evidence",
      "Check the account details and evidence requested in the official registration process.",
      "Document",
      sources.kisanDocs,
    ),
    item(
      "ekyc",
      "Review the official eKYC process",
      "eKYC is required for registered farmers. Use the official portal or an authorised assistance channel to check the applicable method.",
      "Next step",
      sources.kisan,
    ),
    verify(sources.kisan),
  ],
  "up-kanya-sumangala": [
    item(
      "residence",
      "Prepare residence and applicable identity evidence",
      "Consult the current guide for the applicant, guardian and beneficiary requirements and any stage-specific exceptions.",
      "Document",
      sources.up,
    ),
    item(
      "bank",
      "Prepare the appropriate account’s passbook evidence",
      "Confirm whether the mother’s, father’s, guardian’s or beneficiary’s account applies before preparing the requested copy.",
      "Document",
      sources.up,
    ),
    item(
      "stage",
      "Prepare evidence for the intended support stage",
      "Use the current stage list: birth registration, immunisation or admission evidence may apply. Different stages do not share one universal document list.",
      "Document",
      sources.up,
    ),
    item(
      "circumstances",
      "Check documents for your family circumstances",
      "Ask which additional evidence applies, including guardian or deceased-parent circumstances. This is a preparation task, not a request to upload documents.",
      "Next step",
      sources.up,
    ),
    verify(sources.up),
  ],
};
export function readinessEntry(scheme, saved) {
  const slug = scheme?.slug || saved.slug;
  const template = scheme ? readinessTemplates[slug] : null;
  const versionChanged = !!saved && saved.templateVersion !== READINESS_VERSION;
  const completed = new Set(versionChanged ? [] : saved?.completedIds || []);
  const items = (template || []).map((i) => ({
    ...i,
    completed: completed.has(i.id),
  }));
  const done = items.filter((i) => i.completed).length;
  return {
    slug,
    name: scheme?.name || slug,
    acronym: scheme?.acronym || "Unavailable",
    category: scheme?.category || null,
    available: !!scheme,
    officialUrl: scheme?.officialUrl || null,
    saved: !!saved,
    revision: saved?.revision ?? null,
    saveId: saved?._id?.toString() || null,
    createdAt: saved?.createdAt || null,
    updatedAt: saved?.updatedAt || null,
    templateVersion: template ? READINESS_VERSION : null,
    reviewedAt: template ? READINESS_REVIEWED_AT : null,
    versionChanged,
    items,
    progress: {
      completed: done,
      total: items.length,
      percentage: items.length ? Math.round((done / items.length) * 100) : 0,
      complete: items.length > 0 && done === items.length,
    },
  };
}
