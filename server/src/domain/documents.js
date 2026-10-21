import { reviewPending } from "../../../shared/reliability.js";
export const DOCUMENT_GUIDE_VERSION = "2026-10-20.1";
export const DOCUMENT_GUIDE_REVIEWED_AT = "2026-10-20";
const reference = (title, url) => ({ title, url });
const pmjdy = reference(
  "PIB PMJDY account-opening guidance",
  "https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159721&lang=2&reg=48",
);
const uidai = reference(
  "UIDAI Aadhaar enrolment guidance",
  "https://uidai.gov.in/hi/aadhaar-enrolment",
);
const unverifiedFee =
  "Not verified here. Ask the issuing provider about current charges and obtain a receipt for any payment. Insurance premiums are separate from obtaining a form.";
const validity =
  "No universal validity period is verified in this guide. Ask the receiving provider which document date or form version it currently accepts.";
function insurance(title, url) {
  return [
    {
      id: "form",
      checklistItems: ["form"],
      title: "Get the enrolment and consent form",
      issuer: "Your participating bank or post office",
      prerequisites: [
        "Identify the participating branch and the account you intend to use. Do not enter account or nominee details in SarkariSaathi.",
      ],
      steps: [
        "Open the official form reference below, or request the current form from your provider.",
        "Ask the provider to explain the declaration, nomination and auto-debit consent before you sign.",
        "Submit through the provider's accepted channel. Keep the acknowledgement privately; marking a preparation task here does not enrol you.",
      ],
      fee: { status: "not_verified", text: unverifiedFee },
      validity,
      caution:
        "This is an enrolment guide, not a claim form or an insurance decision. Confirm the current form and premium with your provider.",
      sources: [reference(title, url)],
    },
  ];
}
export const documentGuides = {
  pmsby: insurance(
    "India Post PMSBY forms and instructions",
    "https://www.indiapost.gov.in/insurance-services/pmsby",
  ),
  pmjjby: insurance(
    "India Post PMJJBY forms and instructions",
    "https://www.indiapost.gov.in/insurance-services/pmjjby",
  ),
  "pm-jan-dhan-yojana": [
    {
      id: "form",
      checklistItems: ["form"],
      title: "Get the account-opening form",
      issuer: "Your bank branch or Bank Mitra",
      prerequisites: [
        "Identify the branch or Bank Mitra you plan to visit. Ask which current form and KYC route apply to your situation.",
      ],
      steps: [
        "Request the current PMJDY account-opening form from that provider.",
        "Prepare the evidence the bank requests and review the form before signing.",
        "Submit the form and evidence to the provider for verification. Ask how to obtain its acknowledgement.",
      ],
      fee: {
        status: "not_verified",
        text: "The form or service charge is not verified here. Ask the bank to identify any applicable charge; a minimum balance and a service fee are different things.",
      },
      validity,
      caution:
        "Older downloadable forms can contain historical benefit amounts. Confirm the bank's current form and terms instead of treating old form text as current policy.",
      sources: [pmjdy],
    },
    {
      id: "kyc",
      checklistItems: ["kyc"],
      title: "Resolve missing identity or address evidence",
      issuer: "The bank receiving your account-opening request",
      prerequisites: [
        "List the identity and address evidence you already have, privately. Do not upload copies or numbers here.",
      ],
      steps: [
        "Ask the bank which current identity and address evidence or permitted alternative process it accepts.",
        "Ask for the relevant official instructions if you are missing a requested document. The bank determines the applicable KYC route.",
        "If you choose to obtain Aadhaar, the optional enrolment guide below explains where to start. This does not mean Aadhaar is the only possible KYC route.",
      ],
      fee: {
        status: "not_verified",
        text: "Charges depend on the document or service you choose. No single fee for obtaining all KYC evidence is verified here.",
      },
      validity,
      caution:
        "This guide does not decide KYC acceptance or require every document named in an overview. Confirm requirements with the receiving bank.",
      sources: [pmjdy],
    },
    {
      id: "aadhaar",
      checklistItems: ["kyc"],
      title: "Optional: start a new Aadhaar enrolment",
      issuer: "UIDAI through an authorised Aadhaar enrolment centre",
      prerequisites: [
        "Check UIDAI's current eligibility, supporting-document list and applicable enrolment route first. If you already have Aadhaar, use UIDAI's retrieval or update guidance instead of enrolling again.",
      ],
      steps: [
        "Read UIDAI's enrolment guidance and use its official centre locator to identify a centre offering your required service.",
        "Bring the applicable supporting evidence and complete enrolment at the authorised centre.",
        "Keep the acknowledgement and enrolment identifier privately. Use UIDAI's official channel for status enquiries.",
      ],
      fee: {
        status: "published",
        text: "UIDAI states that new Aadhaar enrolment is free. This statement does not cover updates, replacement cards or other services.",
        amountInRupees: 0,
        source: uidai,
      },
      validity:
        "This guide does not establish how recent your evidence must be for a bank application. Confirm acceptance with the receiving bank.",
      caution:
        "This is an optional document-acquisition route, not proof of scheme eligibility. SarkariSaathi does not receive Aadhaar details or biometrics.",
      sources: [
        uidai,
        reference(
          "UIDAI official centre locator",
          "https://bhuvan-app3.nrsc.gov.in/aadhaar/",
        ),
      ],
    },
  ],
};
export function documentGuideFor(scheme) {
  const items =
    scheme && !scheme.readinessSuspended && !reviewPending(scheme)
      ? documentGuides[scheme.slug] || []
      : [];
  return {
    available: items.length > 0,
    version: items.length ? DOCUMENT_GUIDE_VERSION : null,
    reviewedAt: items.length ? DOCUMENT_GUIDE_REVIEWED_AT : null,
    items,
  };
}
