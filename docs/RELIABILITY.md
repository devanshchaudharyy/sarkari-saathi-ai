# Document guidance and scheme reliability

Approved next scope: first publish document-acquisition guidance for three existing schemes; then add human source-change review and affected-user notices. No automatic myScheme scraping, official application submission or AI is included.

## Document guidance

Public route /schemes/:slug/documents supports optional ?item=form|kyc|aadhaar for a direct focused guide. Available for PMJDY (form, bank KYC clarification, optional new Aadhaar enrolment), PMSBY and PMJJBY (enrolment forms). Other schemes return an honest unavailable state. Entry points are scheme detail pages and preparation previews; item links work even before saving. The page collects no documents, numbers, missing-document answers or new profile fields. Existing checklist marks remain self-reported and unchanged.

GET /api/schemes/:slug/documents returns success, a safe scheme summary, public reliability metadata and guide {available, version, reviewedAt, items}. Each item contains issuer, prerequisites, steps, fee status/text, validity caveats and official sources. Unknown queries are rejected; unpublished/archived schemes return 404. Publishing revised catalog content suspends the old preparation guide. Unsupported/suspended guidance never invents instructions.

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

The staff catalog workspace now supports a manual report → review → resolve workflow. Editors and administrators can report an observed change using a source already linked to the scheme or its document guide. The report records an observed day, staff-supplied public version label and private evidence note/catalog snapshot. No URL is fetched, scraped or automatically monitored. A label is not a verified checksum or an independent confirmation of official policy.

Reporting immediately marks the scheme **review pending**, withholds its old screening rules, preparation tasks and document guides, and warns that published catalog text may be outdated. Existing personal task marks remain stored. Administrators inspect the official source themselves, then explicitly attest and confirm one of three outcomes:

- **No catalog change needed:** records the review and restores previously available guidance; preserves any private draft and any pre-existing rule/template suspension.
- **Publish saved reviewed draft:** publishes catalog changes with bounded before/after previews. Old screening rules, preparation templates and guides remain suspended until a separate code review.
- **Archive scheme:** removes public discovery/detail access while preserving personal records and owner notices.

Normal publication/archive controls cannot bypass a pending review. Every mutation checks the current database role, record ID and editorial revision; stale/concurrent changes return 409. Existing catalog history is limited to 100 events. The last 20 completed source reviews remain staff-only. Public DTOs exclude notes, snapshots, reporter identities and private drafts.

Public scheme detail, document pages and saved preparation expose review status, catalog review date and the next scheduled review. Legacy entries default to 90 days after their recorded review; administrators choose the next review day within one year when resolving. A passed date is advisory; it does not imply a detected policy change or automatically disable guidance. Reported pending changes do disable guidance. Editorial review remains separate from a government confirmation or live status check.

## Saved-scheme notices

Signed-in users open `/updates` to see changes affecting their own saved schemes, including review requests, resolutions, catalog publications and archives. New saves start at the current public revision. Existing saves receive subsequent notices; one account cannot read or acknowledge another account's records. Counts represent saved schemes with unread updates, not the total number of events. The page refreshes on entry or Reload; there is no email, push notification or background source-monitoring service.

Each scheme retains its latest 20 safe public events. When older unseen events have fallen outside that window, the page explicitly says the history is incomplete. Read acknowledgements use save ID and previous seen revision, so acknowledging an older loaded page does not mark a newer event read. Reading notices does not change checklist revision, task marks or progress timestamps. Removing a saved scheme removes its read state; resaving begins at the current baseline.

## API and manual operation

| Method | Endpoint | Access / body |
| --- | --- | --- |
| GET | `/api/catalog/:slug/review` | Editor/admin; staff evidence, sources, ID and editorial revision |
| POST | `/api/catalog/:slug/review/report` | Editor/admin; `{id, revision, sourceUrl, versionLabel, observedOn, note}` |
| POST | `/api/catalog/:slug/review/resolve` | Admin; `{id, revision, resolution, summary, versionLabel, nextReviewAt, confirmed:true}` |
| GET | `/api/updates` | Authenticated owner; safe events, unread count and current saved-record revisions |
| PATCH | `/api/updates/:slug/read` | Authenticated owner; `{saveId, seenRevision, revision}` where `revision` is the loaded public revision |

Unknown query/body fields are rejected. Use the existing operator-only `npm run catalog:role -- --email existing@example.com --role editor` (or `admin`) command, then reload. Registration cannot grant roles. See the runnable [Postman collection](Reliability.postman_collection.json); mutations are skipped unless explicitly enabled with current variables. Run against a disposable catalog when practicing. Public summaries and version labels must contain no personal data. New editorial wording remains canonical operator text until translated separately.

## Verification and boundaries

The guide-only delivery was pushed as `399a7e7`; its [GitHub verification passed](https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39453924054). Source-review verification uses dedicated local MongoDB databases, including an isolated production server for browser publication/archive fixtures. The real local catalog is never modified by those fixtures. Executed final counts are recorded in ADDITIONS-PROGRESS.md. Postman request bodies and scripts were syntax-checked, with equivalent HTTP behavior exercised through integration tests; Postman desktop itself was not run.

No official policy change is asserted merely because this workflow exists. No official application status, submission, automatic document validation, government approval, real email delivery, five-person usability study or new performance score is claimed. This is an independent project, not an official government service.
