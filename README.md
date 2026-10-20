# SarkariSaathi AI — Phases 1–8

A MERN application for understanding government schemes. Phase 1 provides authentication and a polished responsive interface. Phase 2 adds private citizen profiles. Phase 3 adds public official-source scheme browsing. Phase 4 adds explainable, partial screening of basic criteria for the six catalog schemes. Phase 5 adds private saved schemes and source-linked preparation checklists. Phase 6 adds Hindi/English support across those features. Phase 7 adds an explainable grouped scheme shortlist using the same screening rules. Phase 8 consolidates the project and adds a single production server, database readiness checks, repeatable local configuration and automated verification. AI assistance remains skipped. This is an independent project, not an official government service.

## Additional features

[Applications](http://localhost:5176/applications) is a private, user-maintained tracker for preparation, submission and recorded decisions. It is not connected to government status systems. See [incremental feature delivery and verification](docs/ADDITIONS-PROGRESS.md). Each addition is verified and pushed independently. [Personal reminders](http://localhost:5176/reminders) provide in-app due/overdue dates chosen by the citizen, without external messages or official-deadline claims. A [staff catalog workspace](http://localhost:5176/catalog) supports private drafts, separate editor/publisher permissions, review dates and change history. Operator access and publication limits are documented in the delivery log. [Compare schemes](http://localhost:5176/compare) side by side using public source-backed content and optional saved-profile screening; no ranking or approval probability is introduced.

## Phase 8: one project, production-ready startup

All phases now live in **`sarkari-saathi-ai` on `main`**. The previous Phase 7 worktree was merged and removed; Git retains its history and branch. The latest local database and authentication configuration were preserved. There is one project folder, with `client`, `server`, `shared`, tests and documentation together.

Run `npm ci`, `npm run setup`, `npm run build`, then **`npm start`**. Production startup serves the React build and `/api` on one origin, locally **http://localhost:5176**. No Vite preview or second API process is needed. Setup creates missing ignored environments with a random secret and preserves existing files. It does not start MongoDB, seed data, replace settings or deploy the application. Run `npm run seed:schemes` once for the reviewed catalog.

`/api/health` keeps its exact original liveness contract. `/api/ready` additionally verifies a live MongoDB ping and returns a safe 503 during disconnection/draining. Data routes fail promptly while the database is disconnected. API responses are not cached; HTML revalidates, while fingerprinted build assets can be cached immutably. Frontend assets negotiate compression; private API/token responses bypass that middleware. SPA deep links work without turning missing APIs, assets or private files into HTML. Startup validates exact origins, placeholder secrets, positive JWT lifetimes and HTTPS for remote production origins. Graceful shutdown drains HTTP traffic before disconnecting MongoDB, with a bounded deadline.

The read-only [GitHub verification workflow](.github/workflows/verify.yml) installs locked dependencies, runs API/domain/environment/lifecycle tests, builds the frontend and exercises a real production browser/API/database flow with an ephemeral CI secret and MongoDB service. It does not deploy or write to repository contents. See [deployment and recovery](docs/DEPLOYMENT.md) and [Phase 8 verification](docs/PHASE8-VERIFICATION.md) for measured results and operational limits.

## Screenshots

![SarkariSaathi landing page](docs/screenshots/home-desktop.png)

![Private saved schemes and preparation checklists](docs/screenshots/readiness-desktop.png)

See the [English and Hindi desktop/mobile screenshot gallery](docs/screenshots/README.md) for all ten pages. Captured from the completed local production build with synthetic demo data. Run `npm run screenshots` with the API, seeded catalog and frontend running to regenerate English images; set `SCREENSHOT_LANGUAGE=hi` for Hindi.

## Phase 7: explainable scheme shortlist

Open [My shortlist](http://localhost:5176/discover) after signing in, through workspace navigation or the dashboard. The view groups the reviewed catalog into **Basic matches to review**, **Clarify these next**, **A checked condition does not match**, and **Not screened**. It uses the existing server screening result; no second eligibility engine, AI model, score, approval probability or database collection is introduced. Names remain alphabetical by original English name within each group. Missing answers never become positive matches, and a known failure stays separate from missing information.

Start with your saved profile. Expand optional clarification questions to supply this visit's additional facts, then update the shortlist. The same questions, partial rules, explanations, sources and limitations as screening apply. Changing an answer hides the old groups/counts until confirmed by the server. Extra answers reset on refresh, navigation, reload or account change and are never stored in the account or localStorage. The separate screening page's temporary answers are not imported. A network failure preserves answers and session without publishing a new group decision.

Filter by category or checked status. Full-catalog counts stay visible independently of the filtered list; zero-result views are explicit. The URL preserves canonical `category`, `status` and optional clarification `scheme` values. Unsupported/repeated values fall back with a notice. Filters are presentation-only and are never sent as profile/owner overrides. Safe login redirects preserve internal shortlist queries. Each card links to reasons, official sources, details, profile edits or the existing preparation checklist. Hindi and English are supported throughout.

This is a partial new-application screen, not a recommendation to apply, verified entitlement, comprehensive directory or government approval. All previous rule boundaries remain: no citizenship/tax/landownership inference, no account-holder-age substitution for a girl, APY birthday/tax clarification, PMSBY provider clarification at 70, and UP stage/family checks. Source/rule review dates remain 8 October 2026; this phase did not rereview official policy. See [Phase 7 verification](docs/PHASE7-VERIFICATION.md).

Phase 7 was originally delivered in a separate worktree on `phase-7-shortlist`; Phase 8 consolidated it into this project on `main`. Its local database **sarkari_saathi_ai_phase7** and authentication settings were retained, so existing local accounts and saved preparation data remain available. Earlier verification records describe their original folders/ports and are historical evidence.

Implementation: `shared/discovery.js` defines transparent grouping and safe view parsing; `useDiscovery` owns page-local answers and confirmation state; `Discovery` composes the existing assessment/question UI. GET/POST `/api/eligibility` are reused unchanged. No new endpoint, request schema, secret setting or migration is required. The existing 55-request Postman collection remains applicable; browser tests execute the live profile → screening → grouped view → preparation flow.

## Phase 6: Hindi / English

Use the language control in public navigation, authentication pages or the signed-in workspace. English is the default; Hindi applies to the landing page, forms and validation, dashboard, profile choices, all six scheme details, screening questions/reasons and preparation tasks. User names, emails, typed district values, identity fields, official links and canonical API identifiers remain unchanged. Hindi is a project translation, not an official government translation; provider sources and current terms remain authoritative. This phase translates the existing reviewed content, with its original review dates, rather than conducting a fresh scheme-policy review.

Switching language updates the document language, page title, description, date formatting, labels, accessibility text and new notifications. It preserves route/query/hash, unsaved form edits, passwords, current screening answers and saved checklist progress. The preference is local to the browser (`sarkarisaathi.language.v1`); it is not a citizen-profile field and does not add any API calls or database fields. Other open tabs synchronize. Blocked storage still allows switching in memory; unsupported preferences fall back to English. Authentication behavior remains independent of language.

The switcher supports keyboard arrows, Home/End, Enter/Space, Escape, outside click/focus, a selected state and focus restoration. Its visible language is included in the accessible name. Self-hosted Noto Sans Devanagari complements Manrope, with adjusted Hindi line height and mobile navigation spacing. Hindi text is a separate lazy-loaded chunk, fetched only when needed. A load failure keeps English usable and offers a reload instruction. Unknown future editorial or technical messages fall back to their original English; no external translation API or AI is used.

Catalog filters display Hindi while retaining canonical values such as `Uttar Pradesh`, `student` and `insurance`. Search recognizes the reviewed schemes' listed Hindi names/common aliases (for example `किसान`, `पेंशन`, `कन्या`) while preserving the typed query in the URL. Other queries keep the original literal English-catalog search semantics. Sorting stays by the original English name and is labelled accordingly in Hindi; this is not a relevance ranking.

See [localization architecture and maintenance](docs/I18N.md) and [Phase 6 verification](docs/PHASE6-VERIFICATION.md). New pieces: `LanguageSwitcher`, `TranslationNotice`, `useLanguage`, the translation core/dictionary and `i18n.css`. No new backend endpoint, migration, environment variable, AI service or deployment is required. API contracts and the 55-request Postman collection remain unchanged.

## Phase 5: application readiness

Open [preparation](http://localhost:5176/readiness) after signing in. Workspace navigation and the dashboard open your saved list; scheme details and screening results open `/readiness?scheme=<slug>`. Login retains that safe internal destination. Preview any of the six checklists, save a scheme, and mark or unmark individual tasks. Saved schemes and confirmed progress persist through refresh and signing in again. Official references appear beside each task, with a separate official next-steps link.

Progress means **self-marked completion of the listed preparation tasks**, not eligibility, document verification, a submitted application, payment consent or government approval. Templates are partial preparation guides; the provider determines the current complete requirements. UP evidence varies by support stage and family circumstances, and bank KYC alternatives vary by the applicable process. No uploads, Aadhaar/bank numbers, document contents or free-text notes are collected. Only scheme slugs and task marks are stored in the new owner-scoped `SavedScheme` collection, with version/revision metadata and timestamps. Users and profiles are unchanged.

| Protected endpoint            | Contract                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/readiness`          | `{ success: true, entries }`; catalog previews merged with only the account's saved progress, alphabetical, no writes         |
| `PUT /api/readiness/:slug`    | Empty JSON object; idempotently saves a current catalog entry without resetting marks or changing existing timestamps         |
| `PATCH /api/readiness/:slug`  | `{ itemId, completed, templateVersion, revision, saveId }`; updates one supported task and returns `{ success: true, entry }` |
| `DELETE /api/readiness/:slug` | `{ revision, saveId }`; removes that account's saved scheme and marks; resaving starts empty                                  |

PUT also returns `{ success: true, entry }`. DELETE returns `{ success: true, message }`. Entries include scheme identity, availability, saved state, opaque `saveId`, revision, timestamps, template version/review date, source-linked items and server-calculated progress. No owner IDs or internal account data are exposed. Use the last returned integer `revision`, opaque `saveId` and current `templateVersion` for changes. Atomic owner/revision/save-ID checks reject stale mutations with 409, including an old window after removal and resaving. Missing rows return 404. Strict schemas reject owner overrides, unknown tasks/fields and string booleans. Mutations have a separate 120/minute per-IP limit; existing JWT, CORS, Helmet and body limits apply. Successful responses use `Cache-Control: no-store`.

Checklists live in `server/src/domain/readiness.js`, reviewed 8 October 2026, version `2026-10-08.1`. A changed template withholds old marks until reconfirmed; GET never silently rewrites stored progress. Unreviewed or removed catalog entries show no invented tasks or complete progress. Removed entries remain removable. Failed or uncertain network responses preserve the last confirmed UI state and offer reload to reconcile with the server. Private content resets on account changes; rejected sessions clear authentication. Removal uses an accessible confirmation dialog.

New reusable pieces: ReadinessCard, RemoveSavedDialog, useReadiness and `readiness.css`. Five workspace links fit the mobile navigation grid. Native checkboxes, focus restoration, loading/error/retry states, notifications and reduced motion are verified. No dependency, secret, migration or environment change is required. See [preparation source notes](docs/READINESS-SOURCES.md) and [Phase 5 verification](docs/PHASE5-VERIFICATION.md).

## Phase 4: explainable screening

Open [screening](http://localhost:5176/eligibility) after signing in, through workspace navigation, the dashboard or a scheme detail. A detail opens `/eligibility?scheme=<slug>`; login safely retains that internal destination. Choose one scheme or all six. Saved profile facts provide the starting point, while native Yes/No/Not sure controls and a UP-stage select fill missing facts. Additional answers are sent only when Run screening is pressed and are **not persisted** to MongoDB or browser storage. They reset on refresh, route departure, account change or Reload saved details. Reset answers clears local answers and requires a new screen if they differ from the previous submission.

Results show **Basic criteria match**, **More information needed**, or **A checked criterion isn’t met**, with rule-by-rule reasons, missing-information actions, official references, limitations, review date and rule version. A known failure takes precedence over unknown facts without hiding those unknowns. Edited answers hide the previous report until it is rerun. Results stay alphabetical; there are no recommendation rankings, confidence scores or approval claims. Unsupported future catalog entries are explicitly Not screened.

This screens **new applications only** and deliberately covers a subset of conditions. Occupation does not imply land ownership; household income does not imply tax history. APY asks about current and past income-tax status and, at age 40, whether the application date is no later than the 40th birthday. PMSBY age 70 requires provider clarification because whole-year age cannot resolve its exact termination rule. UP uses saved residency/income only after confirming they describe the girl’s family; the account holder’s age never becomes the girl’s age. Stage and family exceptions are self-confirmed. Full documents, land/title conditions, KYC, payments, nomination, renewal and official approval remain provider responsibilities. See [rule coverage and provenance](docs/SCREENING-RULES.md).

| Protected endpoint      | Contract                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET /api/eligibility`  | Baseline report using the authenticated account’s current saved profile and unknown additional facts; no writes     |
| `POST /api/eligibility` | `{ "answers": { "existingBankAccount": false } }`; only supported boolean/null facts and an optional valid UP stage |

Both return `{ success: true, profile, questions, results, counts, ruleVersion, reviewedAt, checkedAt }` and `Cache-Control: no-store`. `profile` is a safe snapshot containing age, state, annualHouseholdIncome and updatedAt only. `questions` supplies labels, helpers and official sources. Each result contains a safe scheme summary plus `assessment: { status, rules, missing, sources, limitations, ruleVersion, reviewedAt }`; each rule has a status, reason, source and input origin. The backend reads the owner from the JWT and rereads the saved profile on every screen. Unknown keys, string booleans, client profile/owner/result overrides and invalid stages return 400. POST has a separate 60/minute per-IP in-memory limit. Existing JWT, CORS, Helmet and 16KB body limits apply.

Rules are reviewed static JavaScript in `server/src/domain/eligibility.js`, version `2026-10-08.1`. They are independent of the editorial MongoDB catalog. Screening needed no new collection, migration, dependency, secret, external AI service or environment setting. New reusable pieces: AssessmentCard, ScreeningQuestion, useEligibility, shared status labels, safeReturnPath and `eligibility.css`. Workspace links use a two-column grid on mobile; radios, disclosures, focus after submission, loading/error/retry states and reduced motion are verified.

## Phase 3: official scheme browsing

Open [the scheme library](http://localhost:5176/schemes). Six manually reviewed schemes cover agriculture, insurance, pensions, banking, and girls’ education. Browse without an account; search names, acronyms and keywords, filter category/central-or-state/location, and open detail pages for benefits, intended audience, next steps and official references. Query parameters persist search/filter/page state through refresh, sharing and browser history. Details retain the list query in their URL, so Back to schemes preserves the current view.

The catalog is a small editorial collection, not a comprehensive directory. Central schemes are included for every location; state-scheme coverage currently includes Uttar Pradesh only. Filters describe scheme coverage, not personal eligibility. Profiles do not populate filters or influence browsing order (alphabetical). Screening is a separate signed-in action; browsing does not automatically screen a person.

Scheme records live in a separate MongoDB collection. Load/update the reviewed catalog with `npm run seed:schemes`. This explicitly upserts six stable slugs, validates HTTPS government source URLs, preserves unrelated catalog records, and never deletes or edits users/profiles. Startup initializes scheme indexes but does not silently seed data. A fresh database displays an honest empty-library state until seeding. Re-running the seed overwrites editorial fields for those six slugs, including fixed review dates; it does not perform a fresh web review.

Editorial data: `server/src/data/schemes.js`. Review process and provenance: [catalog source notes](docs/CATALOG-SOURCES.md). Review date: 8 October 2026, separate from source publication/update dates. Official pages may change or be temporarily unavailable; every detail page directs readers to confirm current terms with the provider.

| Public endpoint          | Contract                                                   |
| ------------------------ | ---------------------------------------------------------- |
| `GET /api/schemes`       | `{ success: true, schemes, pagination, filters, catalog }` |
| `GET /api/schemes/:slug` | `{ success: true, scheme }`; safe 404 when missing         |

List query options: `q` (trimmed, max 100 characters, case-insensitive literal substring), `category` (agriculture, insurance, pension, banking, women-education), `level` (central/state), `state` (one of 36 shared states/UTs), `page` (1–10000, default 1), and `limit` (1–24, default 6). Filters combine with AND; location includes national schemes plus state schemes covering that location. Unknown/repeated query keys and invalid values return 400. Pagination returns totals and totalPages (0 for no results); out-of-range pages have no items. Changing UI filters resets page. Summaries omit details/internal metadata; details omit database IDs, search fields and timestamps. Both endpoints are read-only and use `Cache-Control: no-store`.

New UI pieces: SchemeCard, Schemes, SchemeDetail, useSchemes, shared labels/date formatting, and `schemes.css`. Aborted requests prevent stale results; loading skeletons, empty states, safe errors and retry are provided. Native selects/search forms, labelled controls, live result counts, source-anchor focus, mobile navigation and reduced motion preserve keyboard behavior. No additional dependencies or environment variables were needed.

## Phase 2: citizen profile setup

Open `/profile` from My profile or the dashboard's Profile Setup card. You can save an incomplete draft, return after signing in again, edit saved details, and reset unsaved changes. Profile completion describes data readiness only; it is not a scheme eligibility result.

| Detail                  | Validation                                       | Completion |
| ----------------------- | ------------------------------------------------ | ---------- |
| Age                     | Integer 0–120; blank is null                     | Core       |
| State / Union Territory | One of the shared 36 options; blank is null      | Core       |
| Occupation              | One of the shared choices; blank is null         | Core       |
| Annual household income | Whole rupees, 0–1,000,000,000; blank is null     | Core       |
| District                | Optional, trimmed, 2–80 characters when supplied | Optional   |

Each valid core field contributes 25%. Zero age/income count as supplied values. The income upper bound is an input limit, not an eligibility threshold. Changing state in the form clears district. The form clearly distinguishes unsaved draft progress from saved dashboard progress; details are never automatically saved to localStorage.

Profiles have a separate MongoDB collection with one unique owner per authenticated account. Existing account records and authentication response contracts are unchanged; no data migration is required. Names/emails shown on the profile page remain account identity and are not editable in this phase. State/UT choices use current names, including the merged Dadra and Nagar Haveli and Daman and Diu territory and Ladakh. Sources: [Ministry of Panchayati Raj directory](https://panchayat.gov.in/en/state-ut-panchayati-raj-department-website/) and [merged UT administration](https://ddd.gov.in/introduction/).

`GET /api/profile` and `PUT /api/profile` require the same bearer JWT as `/auth/me`. Both return `{ success: true, profile, completion }`. GET supplies empty values and zero completion when no profile has been saved, without creating a record. PUT replaces all profile details; send the four core keys, each either a valid value or null, plus the optional district string. Unknown keys, owner IDs, account updates, and client-supplied completion are rejected. The owner always comes from authentication. Responses exclude internal owner IDs and set `Cache-Control: no-store`.

```json
{
  "age": 22,
  "state": "Uttar Pradesh",
  "district": "Muzaffarnagar",
  "occupation": "student",
  "annualHouseholdIncome": 240000
}
```

`profile` includes these five fields and `createdAt`/`updatedAt`. `completion` includes `percentage`, `completedFields`, `totalFields`, `isComplete`, and `missingFields`. There are no recommendations, matching rules, or AI calls behind completion.

New reusable pieces: WorkspaceLayout, SelectField, ProfileProgress, LeaveProfileDialog, useProfile, and shared profile choices/completion logic. The router now uses a data router so in-app navigation can warn about unsaved edits. The native dialog supports Escape, focus restoration, and focus wrapping; refresh/close prompts use the browser's beforeunload behavior.

## Run locally

Requirements: Node.js 22.12+ (verified environment: Node 24), npm, and a running local MongoDB service. Run commands from `sarkari-saathi-ai`.

```powershell
npm ci
npm run setup
npm run seed:schemes
npm run build
npm start
```

**This consolidated delivery runs at http://localhost:5176**, with API health at http://localhost:5176/api/health and readiness at http://localhost:5176/api/ready. The production server is left running for manual testing. The optional development pair defaults to 5173/5000 on a fresh setup; the preserved local development settings use 5176/5001. Stop the production server before starting Vite on the same frontend port.

Production configuration comes from host environment variables or ignored `server/.env.production`. Set `PORT` and `CLIENT_URL` together for a different local production origin. Development port changes use `VITE_DEV_PORT` in `client/.env` and `CLIENT_URL` in `server/.env`. Open the browser using `localhost` to match the exact origin.

Optional development servers, in separate terminals:

```powershell
npm run dev -w server
npm run dev -w client
```

Production startup and readiness check:

```powershell
npm run build
npm start
# In another terminal:
npm run check:health
```

## Environment configuration

| Location    | Variable       | Example default / purpose                                    |
| ----------- | -------------- | ------------------------------------------------------------ |
| server/.env | PORT           | 5000                                                         |
| server/.env | MONGO_URI      | mongodb://127.0.0.1:27017/sarkari_saathi_ai                  |
| server/.env | JWT_SECRET     | Random private secret; never commit                          |
| server/.env | JWT_EXPIRES_IN | 7d; accepts integer with s, m, h, or d suffix                |
| server/.env | CLIENT_URL     | http://localhost:5173; exact allowed browser origin          |
| server/.env | NODE_ENV       | development, production, or test                             |
| server/.env | SERVE_CLIENT   | false for API-only development; production start forces true |
| client/.env | VITE_API_URL   | http://localhost:5000/api; public URL, never a secret        |
| client/.env | VITE_DEV_PORT  | 5173 by default; configured locally as 5176                  |

The `.gitignore` excludes actual environment files, dependencies, build output, and generated reports. Examples are safe to commit. Do not replace the examples with live credentials. Use `localhost` consistently when opening the frontend because the API allowlist is exact.

`server/.env.production.example` documents production variables. `npm run setup` generates the actual file for local use; host-provided values take precedence. `npm start` forces production mode and serving the built client. `VITE_API_URL` defaults to `/api` in production regardless of development `.env`; an explicit build-shell `VITE_API_URL` supports a separate API origin. Development and preview proxy relative `/api` requests to the development API. Never put secrets in Vite variables.

## Architecture and folder structure

```text
sarkari-saathi-ai/
  client/
    public/favicon.svg
    src/
      api/axios.js
      components/   # Shared UI, ProfileProgress, dialogs, AssessmentCard, ReadinessCard
      context/AuthContext.jsx
      hooks/        # useReveal, useProfile, useSchemes, useEligibility, useReadiness, useDiscovery
      layouts/      # MainLayout.jsx, WorkspaceLayout.jsx
      pages/        # Home, auth, Dashboard, Profile, Schemes, SchemeDetail, Eligibility, Readiness, Discovery, NotFound
      utils/returnPath.js
      App.jsx
      main.jsx
      styles.css
      profile.css
      schemes.css
      eligibility.css
      readiness.css
      i18n.css
      discovery.css
      i18n/         # core.js, useLanguage.js, lazy-loaded hi.json
    .env.example
    index.html
    vite.config.js
    package.json
  server/
    src/
      config/       # db.js, env.js, environment.js validation
      controllers/ # auth, profile, scheme, eligibility and readiness controllers
      domain/       # eligibility.js screening rules; readiness.js preparation templates
      data/schemes.js # Reviewed editorial catalog with source URLs
      middleware/   # auth, errors, database availability, production client serving
      models/       # User.js, Profile.js, Scheme.js, SavedScheme.js
      routes/       # auth, profile, scheme, eligibility and readiness routes
      utils/        # generateToken.js, seedSchemes.js
      app.js
      lifecycle.js
    scripts/seed-schemes.js
    tests/          # auth, profile, schemes, eligibility and readiness *.test.js
    server.js
    production.js
    .env.example
    .env.production.example
    package.json
  shared/profile.js
  shared/schemes.js
  shared/eligibility.js
  shared/discovery.js
  tests/            # browser.mjs and profile/schemes/eligibility/readiness-browser.mjs
  scripts/create-postman.mjs
  scripts/audit-phase4.mjs
  scripts/audit-phase5.mjs
  scripts/audit-phase6.mjs
  scripts/audit-phase7.mjs
  scripts/audit-phase8.mjs
  scripts/capture-screenshots.mjs
  scripts/setup-local.mjs
  scripts/check-health.mjs
  .github/workflows/verify.yml
  Procfile
  docs/
    SarkariSaathi.postman_collection.json
    VERIFICATION.md
    PHASE2-VERIFICATION.md
    PHASE3-VERIFICATION.md
    CATALOG-SOURCES.md
    SCREENING-RULES.md
    PHASE4-VERIFICATION.md
    READINESS-SOURCES.md
    PHASE5-VERIFICATION.md
    I18N.md
    PHASE6-VERIFICATION.md
    PHASE7-VERIFICATION.md
    PHASE8-VERIFICATION.md
    DEPLOYMENT.md
    screenshots/    # Ten pages, English/Hindi, desktop/mobile
  package.json
  package-lock.json
  .gitignore
```

User records contain name, normalized email, bcrypt password hash, and timestamps. MongoDB adds its usual `_id` and version metadata. The unique email index is initialized before the API starts. Registration and login return only safe user data and a signed JWT. AuthContext checks `/auth/me` on refresh, while Axios adds bearer headers and recognizes rejected sessions. Temporary network failures retain the token and show a retry option.

## Packages and rationale

Frontend: React/React DOM for UI, Vite and its React plugin for development/build, React Router for routing, Tailwind CSS and its Vite plugin for utilities, Axios for centralized requests, Lucide React for consistent tree-shaken icons, Sonner for accessible notifications, and Fontsource Manrope/Noto Sans Devanagari for self-hosted Latin/Hindi fonts. Custom CSS supplies shared tokens, responsive layouts, and lightweight motion; no animation or runtime translation library is needed.

Backend: Express 5 for asynchronous HTTP handlers, Mongoose for MongoDB models, bcrypt for password hashing, jsonwebtoken for HS256 bearer sessions, dotenv for local configuration, Zod for validation, Helmet for HTTP security headers, cors for an explicit origin allowlist, express-rate-limit for authentication and protected mutation throttling, and compression for negotiated frontend asset encoding.

Development: concurrently runs frontend/backend together, Node's test runner with Supertest exercises HTTP/database behavior, Playwright verifies real browser flows, Lighthouse audits the production build, and Prettier formats source. The lockfile records installed versions. A shell-quote 1.11.0 override resolves the development runner's critical advisory; npm audit reports zero vulnerabilities.

## API contract

| Method | Endpoint           | Result                                                                                                    |
| ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| GET    | /api/health        | 200 `{ success: true, message: "SarkariSaathi API is running" }`                                          |
| GET    | /api/ready         | 200 `{ success: true, message: "SarkariSaathi API is ready" }`; safe 503 if database unavailable/draining |
| POST   | /api/auth/register | 201 `{ success: true, user, token }`                                                                      |
| POST   | /api/auth/login    | 200 `{ success: true, user, token }`                                                                      |
| GET    | /api/auth/me       | 200 `{ success: true, user }`; bearer JWT required                                                        |

Register body: `{ "name": "Devansh", "email": "devansh@example.com", "password": "password123" }`. Login uses email/password. User response fields: `id`, `name`, `email`, `createdAt`, `updatedAt`. Errors: `{ success: false, message }`; validation 400, rejected session/credentials 401, disallowed origin 403, not found 404, duplicate email 409, oversized body 413, authentication throttling 429, unexpected error 500.

Names are trimmed and must contain 2–80 characters. Email is trimmed, lowercased, syntax-checked, and limited to 254 characters. Registration passwords require at least 8 characters and at most 72 UTF-8 bytes; whitespace is preserved. Login accepts existing passwords without reapplying the registration minimum. Secrets are server-only; JWTs use configured expiration and HS256 verification.

## Design system and reusable UI

Colors: ink `#172139`, muted text `#627087`, primary indigo `#5046dd`, off-white canvas, light slate borders, and restrained saffron/green feature accents. Manrope supplies Latin typography, complemented by Noto Sans Devanagari and adjusted line heights for Hindi. Cards use 12–16px radii; controls use 8px radii, consistent heights, subtle shadows, and clear focus states.

Reusable components: Brand; Button (primary, secondary, ghost, danger, loading and disabled states); Field (label, helper/error feedback and password visibility); Loader with skeleton lines; Navbar with mobile menu; Footer; ProtectedRoute; AuthPage; MainLayout. Shared classes provide icon boxes, badges, feature/dashboard cards, section headings, and reveal behavior. AuthProvider supplies user, token, loading, login, register, logout, sessionError, and retry.

Native smooth anchors, IntersectionObserver reveals, approximately 200ms page entrances, 250ms hover effects, and reduced-motion overrides keep animation restrained. Decorative previews are labelled conceptual; unavailable cards are informational and do not use pointer cursors.

## Tests and manual checklist

```powershell
npm test
# With npm start running, configure older helpers before running the suites:
$env:API_URL = 'http://localhost:5176/api'
$env:FRONTEND_URL = 'http://localhost:5176'
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run test:readiness-browser
npm run test:language-browser
npm run test:discovery-browser
# Running single production server required:
npm run test:production-browser
npm run audit:phase8
```

`npm test` runs all API/domain, feature, environment/lifecycle, localization and shortlist tests. Current counts and per-addition verification are in [the delivery log](docs/ADDITIONS-PROGRESS.md). Backend suites create and remove their own uniquely named test databases; they do not wipe development data. Browser tests create uniquely named synthetic accounts, profiles and saved schemes which remain available for inspection. When running older browser helpers against `npm start`, set `API_URL=http://localhost:5176/api` and `FRONTEND_URL=http://localhost:5176` before all commands. The production browser helper uses the same origin automatically. Local helpers use installed Edge/Chrome (`BROWSER_PATH` override); CI installs Playwright Chromium. The shortlist audit defaults to installed Chrome (`CHROME_PATH` override), uses a synthetic account and preserved storage in ignored `reports/`, and measures authenticated English/Hindi pages. Run Lighthouse separately from browser suites to avoid CPU contention.

Import `docs/SarkariSaathi.postman_collection.json` into Postman. Run the requests in order; Health initializes a unique account email, registration/login capture the token, and readiness mutations capture the returned revision/save ID. Assertions check status/error safety. It creates a synthetic account in the configured API database. All request scripts and substituted JSON parse; equivalent HTTP scenarios run through Supertest. Postman desktop itself was not run. Expired-token and production-error scenarios are covered by the automated backend suite.

See [Phase 8 verification](docs/PHASE8-VERIFICATION.md) for current results. Earlier verification records and their measured Lighthouse scores are retained as historical evidence. Local audit observations are not a production or real-user performance guarantee.

## Current boundaries and known limitations

- English and Hindi are available; no deployment is included. Hosting later requires SPA route fallback, HTTPS, appropriate origins, and production environment configuration.
- Hindi text is project-maintained, not an official or independently certified translation. New/unmapped catalog content and unexpected technical messages fall back to English. Hindi search aliases cover the six reviewed schemes, not unrestricted Hindi semantic search. External official pages may offer different languages or be temporarily unavailable.
- Bearer tokens are stored in localStorage as requested; an XSS vulnerability could expose them. Logout removes the browser token but does not revoke it server-side before expiry. Cookie sessions, refresh tokens, and server revocation are future hardening work.
- Rate limits are held in process memory and reset on restart; a shared store is needed when scaling to multiple instances. No reverse-proxy trust setting is enabled by default.
- Profile drafts save only when explicitly submitted. Unsaved changes can be lost if the user chooses to discard them or signs out; there is no offline persistence or autosave. Concurrent saves use the last successful write.
- Age and household income are self-reported; they are not verified or automatically updated. No account deletion/profile-deletion endpoint is included; saved fields can be emptied and saved again.
- Screening and preparation are partial and self-reported; neither establishes entitlement, verified documents or approval. Sources/templates are manually maintained; there is no automatic tracking of official changes. A task mark can become stale outside the app, so confirm the provider's current requirements before applying.
- Readiness stores only saved schemes and task marks. Removing a saved scheme deletes its progress; resaving starts empty. There is no upload, official application-status tracking or automatic checklist selection from screening answers.
- No password reset, email verification, recommendations, chatbot, RAG, document processing or application submission is implemented.
- The health endpoint reports that the HTTP API is running; it is not a database readiness probe.
- The landing illustration is labelled a conceptual preview. Browsing, partial screening and preparation are available through navigation and the dashboard; AI assistance and personalised recommendations remain future work. There are no invented schemes, counts, testimonials, recommendation scores or security certifications.

Implementation references: [Express asynchronous error handling](https://expressjs.com/en/guide/error-handling/) and [Tailwind's Vite integration](https://tailwindcss.com/docs/installation/using-vite).
