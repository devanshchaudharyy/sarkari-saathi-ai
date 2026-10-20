# Additional features delivery

Approved sequence: implement, verify and push each addition before starting the next. Keep one consolidated project on main. No AI or official submission/status integration. Email controls will use local previews with configurable SMTP, as approved.

1. Application tracker — complete; verified and pushed before addition 2.
2. Personal reminders — complete; verified and pushed before addition 3.
3. Reviewed catalog management — complete; verified and pushed before addition 4.
4. Scheme comparison — complete; verified and pushed before addition 5.
5. Printable preparation plan — complete; verified and pushed before addition 6.
6. Account controls — complete; verified and pushed as the final approved addition.

Each delivery records its executed tests and limitations here. Application statuses and progress are personal records, not verified government decisions. No real email is sent during verification.

## 1. Application tracker

Private, one-per-scheme, idempotent creation; five explicitly self-reported statuses; dated append-only history (100-event limit); revision and record-id protection against stale writes/removal; private confirmation-based UI, English/Hindi and seven responsive widths. No application/reference numbers, files or free-text notes are collected. Removal does not affect official applications or preparation records.

Verification: 254 Node tests (213 API/domain + 23 localization + 18 shortlist), production build, six new browser scenarios; source/API errors do not log out valid sessions. Tests cover owner isolation, invalid dates/status/fields, concurrency, stale ids after recreation and removed-catalog history. Local synthetic screenshots are included.

## 2. Personal reminders

Private, user-chosen preparation/follow-up dates; due today, overdue, upcoming and completed views; rescheduling, completion/reopening, confirmed removal and a workspace bell. India Standard Time defines the calendar day. Counts refresh on changes, window focus and once per minute; there is no background push, email, SMS or invented official deadline. One reminder per purpose/scheme is idempotent. Owner, revision and date validation protect updates.

Verification: 267 Node tests (226 API/domain + 23 localization + 18 shortlist), production build, ten cumulative addition-browser scenarios, English/Hindi and seven widths. Dedicated database cases include India midnight, overdue completion, strict inputs, cross-account counts, concurrent updates and safe deletion. Addition 1 GitHub CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39383125069 .

## 3. Reviewed catalog management

Protected editor/admin workspace: create/edit private drafts, maintain source links and review dates, inspect revision history, explicitly confirm publication, archive outdated entries and discard drafts. Only administrators publish/archive; each request checks current server-side StaffAccess. Registration and JWT role claims cannot grant access. Public APIs whitelist editorial fields and filter unpublished records from lists, counts, details and personal-tool creation. History is atomically stored with each record and limited to 100 changes.

Publishing suspends screening and preparation templates until a separate code/rule review; it never auto-approves copied rules. Unknown/new content has no invented screen or checklist. Archived schemes retain personal timelines/reminders and existing saved records. Seed now inserts missing baseline entries without overwriting editorial work. New content falls back to English until translations are reviewed. Draft form edits save only when submitted; changing records or leaving discards unsaved edits.

Verification: 285 Node tests (244 API/domain + 23 localization + 18 shortlist), build, 14 cumulative addition-browser scenarios plus ten production flows. Dedicated DB tests cover role revocation, private drafts, source/review validation, concurrent/stale publication, metadata exclusion, archives, seed preservation and rule/template suspension. Browser staff fixtures use a local-only synthetic account and unpublished draft, revoke their privileges in cleanup, and never publish test content to the real development catalog. English/Hindi forms fit seven widths; screenshots are included. Addition 2 GitHub CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39383745959 .

### Grant or revoke editorial access

Register an account, then have the trusted local operator run `npm run catalog:role -- --email existing@example.com --role editor` (or `admin`; `citizen` revokes access). This uses server environment/database configuration and never creates an account. Reload the workspace to see the management link. For a hosted database, configure the intended host variables first. No public bootstrap/admin-registration endpoint exists.

## 4. Scheme comparison

Public comparison of two or three live catalog entries: benefits, coverage, eligibility notes, partial document preparation guidance, application steps, source review dates, limitations and official links. Chosen column order is preserved, not ranked. Scheme-only URLs can be shared; invalid, repeated, duplicate or unavailable choices show a safe recovery state. Visitors make no private screening call. Signed-in users may view the existing saved-profile-only screen and missing-fact counts; per-visit answers are never imported or put in URLs. Safe sign-in return retains the comparison. Public preparation previews contain guidance only, never saved task marks or account metadata.

Verification: 299 Node tests (245 API/domain + 23 localization + 18 shortlist + 13 comparison), production build and 18 cumulative addition-browser scenarios. Browser coverage includes two/three columns, direct refresh, invalid choices, protected-report failure while public facts stay visible, anonymous access, sign-in return, exact source links, English/Hindi, seven widths and no unexpected errors. Catalog CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39386376392 .

## 5. Printable preparation plan

Choose saved schemes and print or save a PDF through the browser. Confirmed self-marked tasks, partial-guidance notices, source URLs, review dates and template versions remain readable on A4. Name inclusion is optional and off by default; email, profile facts, timelines and reminders are excluded. Selection resets after refresh. Unavailable templates show an honest notice. No server PDF service or file upload is introduced.

Verification: 303 Node tests (245 API/domain + 23 localization + 18 shortlist + 13 comparison + 4 plan), production build and 21 cumulative addition-browser scenarios. Print media hides navigation, controls and notifications; a real two-page PDF was rendered and visually inspected, with no clipped tasks or private email. English/Hindi screens fit seven widths, empty selections disable printing and the print action is wired to the browser. Comparison CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39387853258 .

## 6. Account controls

Password reset, optional email verification, password-confirmed profile deletion and explicitly typed account deletion are available. Local email previews use ignored private files and send nothing externally; SMTP is configurable with required TLS and attachment-access restrictions. Remote preview mode is rejected. Only hashed, expiring, single-use random tokens are stored in MongoDB, resends replace older links, fragments are removed when read and successful reset invalidates previous JWT sessions. Verification confirms email access only. Safe auth DTOs remain unchanged.

Account deletion first disables authentication, then purges owned records through a durable retryable cleanup job. Startup/minute sweeps recover failed cleanup and catch late in-flight writes for 24 hours after completion. Pending jobs cannot purge active accounts; repeat sweeps preserve the original retention deadline. No atomic multi-collection deletion or durable email queue is claimed. Public catalog history retains opaque actor IDs. Profile-only deletion preserves preparation/tracker/reminder records. See ACCOUNT-CONTROLS.md for API, setup, recovery and limitations, plus the separate runnable Postman collection.

Verification on 20 October 2026: **325 Node tests** (267 API/domain/environment/lifecycle + 23 localization + 18 shortlist + 13 comparison + 4 plan), production build, **160 browser scenarios** (122 earlier-phase regressions + 10 production + 28 cumulative additions), and zero unexpected runtime/console errors. The account screens were checked in English/Hindi at 360, 390, 430, 768, 1024, 1280 and 1440 pixels, with committed desktop/mobile screenshots. Tests cover generic reset acknowledgements, validation, rate limits, hashed tokens, expiration, resend/single use/concurrent consumption, password byte limits/whitespace, old-session rejection, explicit verification, unchanged safe DTOs, network failures, loading controls, focus restoration, profile-only retention, owner isolation, disabled account access, failed-cleanup recovery and late-write cleanup. Production dependency audit found zero known vulnerabilities at verification time. Printable-plan CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39445578342 .

### Executed release checklist

- [x] Dedicated local test databases; real browser to API to MongoDB flows.
- [x] All six additions verified independently and pushed in order.
- [x] Existing login, persistence, public catalog, screening and preparation regressions passed.
- [x] Keyboard controls, dialogs, anchors, seven widths and reduced-motion behavior checked.
- [x] New email links require explicit actions, stay out of API responses/storage and expire independently of TTL sweeps.
- [x] Local previews only during tests; ignored environments, reports and preview messages excluded from Git.
- [x] API guide, environment examples, screenshot gallery and Postman request/script syntax verified.

External SMTP delivery, multi-instance rate limiting, public deployment and email-delivery guarantees are not tested or provided by this local handoff. Earlier measured Lighthouse results remain in the phase verification documents; no new performance score is claimed for these additions. AI/RAG and official application/status integration remain skipped.

Account-controls CI passed: https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39448450109 . Final form polish clears outdated recovery-field errors when inputs change; browser assertions and refreshed screenshots cover the feedback.
