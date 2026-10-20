# Additional features delivery

Approved sequence: implement, verify and push each addition before starting the next. Keep one consolidated project on main. No AI or official submission/status integration. Email controls will use local previews with configurable SMTP, as approved.

1. Application tracker — complete; verified and pushed before addition 2.
2. Personal reminders — complete; verified and pushed before addition 3.
3. Reviewed catalog management — complete; verified and pushed before addition 4.
4. Scheme comparison — pending.
5. Printable preparation plan — pending.
6. Account controls — pending.

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
