# Document guidance and scheme reliability

Approved next scope: first publish document-acquisition guidance for three existing schemes; then add human source-change review and affected-user notices. No automatic myScheme scraping, official application submission or AI is included.

## Document guidance

Public route /schemes/:slug/documents supports optional ?item=form|kyc|aadhaar for a direct focused guide. Available for PMJDY (form, bank KYC clarification, optional new Aadhaar enrolment), PMSBY and PMJJBY (enrolment forms). Other schemes return an honest unavailable state. Entry points are scheme detail pages and preparation previews; item links work even before saving. The page collects no documents, numbers, missing-document answers or new profile fields. Existing checklist marks remain self-reported and unchanged.

GET /api/schemes/:slug/documents returns success, a safe scheme summary and guide {available, version, reviewedAt, items}. Each item contains issuer, prerequisites, steps, fee status/text, validity caveats and official sources. Unknown queries are rejected; unpublished/archived schemes return 404. Publishing revised catalog content suspends the old preparation guide. Unsupported/suspended guidance never invents instructions.

Reviewed 20 October 2026, guide version 2026-10-20.1. These partial guides explain where to obtain instructions, not whether an authority will accept a document or approve a scheme. Fees are explicitly unverified except UIDAI's published free new-enrolment service, which excludes updates/replacements. No bank-wide validity period, processing-time promise or requirement that Aadhaar is the only KYC route is asserted.

Sources manually consulted:

- [PIB PMJDY account-opening guidance](https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=159721&lang=2&reg=48): branch/Bank Mitra route, form and bank verification.
- [India Post PMSBY documents](https://www.indiapost.gov.in/insurance-services/pmsby): consent-cum-declaration form and official instructions.
- [India Post PMJJBY documents](https://www.indiapost.gov.in/insurance-services/pmjjby): consent-cum-declaration form and official instructions.
- [UIDAI enrolment guidance](https://uidai.gov.in/hi/aadhaar-enrolment): authorised centre, applicable evidence, acknowledgement and free new enrolment.
- [Official Aadhaar centre locator](https://bhuvan-app3.nrsc.gov.in/aadhaar/): external locator; no geolocation is collected by SarkariSaathi.

Some direct Jan Suraksha PDF links were unreachable from the implementation environment. Guides therefore point to accessible official India Post forms pages and instruct users to ask their own provider for its current version. Older PMJDY PDFs can carry historical benefit amounts, so the guide does not promote an old form as current policy. Hindi explanations are project translations; linked authority instructions remain authoritative.

Verification: 333 Node checks (275 API/domain + 23 localization + 18 shortlist + 13 comparison + 4 plan), production build and eight new browser scenarios plus 19 preparation regressions across three schemes. English/Hindi fit 360, 390, 430, 768, 1024, 1280 and 1440 px; direct-choice focus, reload, invalid choices, network recovery, fee distinctions, reduced motion, source hrefs, anonymous access and preparation links were checked. Screenshots are included in the gallery. No real citizen usability study or official submission was conducted.

## Source-change review

Implementation follows after the document-guidance commit is pushed.
