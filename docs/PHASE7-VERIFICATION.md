# Phase 7 verification — explainable scheme shortlist

Verified **19 October 2026** in the new sibling folder `sarkari-saathi-ai-phase7`, branch `phase-7-shortlist`. The original `sarkari-saathi-ai` folder remains on `main` at `1ead9f9`, with its Phase 6 code unchanged. Both folders share Git history through a worktree; the new folder has separate dependencies, environments, runtime ports and development data.

Local production frontend: **http://localhost:5176**. API: **http://localhost:5001/api**. Database: **sarkari_saathi_ai_phase7** on the running local MongoDB service. The original runtime keeps ports 5175/5000. Committed examples retain fresh-checkout defaults 5173/5000. Actual environments and the separately generated local JWT secret are ignored and are not published.

## Executed results

| Check                                   | Result                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| API/domain regression                   | **170 passed, 0 failed**, against uniquely named local test databases                                                                       |
| Localization/coverage                   | **23 passed, 0 failed**                                                                                                                     |
| Discovery presentation/rule integration | **18 passed, 0 failed**                                                                                                                     |
| Browser scenarios                       | **122 passed, 0 failed**: foundation 15, profile 14, catalog 19, screening 20, readiness 19, bilingual 19, shortlist 16                     |
| Production frontend build               | Passed; Discovery lazy chunk 13.22 KB / 4.81 KB gzip; entry 438.23 KB / 142.02 KB gzip; separate Hindi chunk 135.41 KB / 33.07 KB gzip      |
| Runtime/console                         | No JavaScript exceptions or unexpected console errors in the final browser runs; deliberate failed-request resource messages are excluded   |
| Responsive coverage                     | 360, 390, 430, 768, 1024, 1280 and 1440px; English and Hindi, including expanded shortlist questions and all six workspace navigation links |
| Screenshots                             | **40 full-page PNGs**: ten pages × English/Hindi × desktop/mobile, using synthetic data                                                     |
| Dependency installation/audit           | Clean installation of 344 packages; zero reported vulnerabilities; no new Phase 7 dependency                                                |

API tests remove only their uniquely named test databases. Browser, screenshot and audit helpers leave synthetic accounts in this folder's separate development database. The authentication limiter was reset by restarting only this new development API during repeated verification; its configured limits were not weakened. Original project data was not migrated or modified.

## Measured production mobile Lighthouse

Lighthouse 13 with installed headless Chrome, default mobile simulated throttling and the production preview. The helper creates a synthetic account/profile, preserves browser storage to reach the protected page, and measures the authenticated shortlist in both languages. These isolated local observations use a preserved storage/cache context; they are not cold-user, deployed or real-user performance guarantees.

| Route / language    | Performance | Accessibility | Best practices | SEO | FCP  | LCP  | TBT  | CLS |
| ------------------- | ----------- | ------------- | -------------- | --- | ---- | ---- | ---- | --- |
| `/discover` English | 100         | 100           | 100            | 63  | 0.9s | 1.7s | 40ms | 0   |
| `/discover` Hindi   | 100         | 100           | 100            | 63  | 1.0s | 1.8s | 20ms | 0   |

The private workspace deliberately disallows indexing, accounting for the SEO result. The remaining back/forward-cache diagnostic comes from audit-browser flags disabling that cache. No significant actionable issue remained in these measurements. Scores do not mean every diagnostic passes or certify complete accessibility. Raw JSON/HTML and the summary are generated into ignored `reports/` by `npm run audit:phase7`.

## Shortlist, API and data checklist

- [x] Reuses authenticated GET/POST `/api/eligibility` and existing owner-scoped profile facts. No new endpoint, schema, database collection, eligibility engine, AI service or migration.
- [x] Groups the server's decisions in explicit order: basic matches, missing information, a known unmet condition, then not screened. Names are alphabetical by original English name within each group, with slug tie-breaking. No weighted ranking, approval probability or recommendation to apply.
- [x] Unknown facts never become matches. Known failures stay separate while their explanations retain missing facts. Empty/future unsupported catalog entries have honest states without invented counts or eligibility conclusions.
- [x] Existing rule boundaries remain covered by regression: no occupation-to-landownership or income-to-tax inference, APY age-40 clarification, PMSBY provider clarification at 70, and UP girl/family/stage checks.
- [x] Uses current saved profile on baseline load and each server check. Profile snapshot and check/review timestamps identify the supplied context. Reload clears page-local clarification answers and rereads the saved profile.
- [x] Additional facts are page-local, sent only on submission, and never persisted in the account or browser. Refresh, route departure and account changes reset them; screening-page answers are not imported.
- [x] Edited answers hide old groups/counts until the check succeeds. Failed POST preserves facts and the valid session. A synchronous lock prevents duplicate submissions; controls disable while checking, and unmount cancels requests.
- [x] Category/status filters are presentation-only. Counts cover the full catalog while visible results intersect both filters. Safe canonical query values survive login and refresh; unsupported, duplicate and unknown parameters show a notice and safe fallback.
- [x] Existing JWT/session rejection, CORS, body limits, rate limits, safe errors, password hashing and owner isolation pass the unchanged API/security suites. Rejected sessions clear private content; network failures do not log the user out.

## Browser, accessibility, responsive and animation checklist

- [x] Protected shortlist redirects through login while preserving safe category/scheme queries. Empty profile and profile-only results show missing information without fabricated positive matches.
- [x] Missing-information actions open the appropriate clarification questions and move keyboard focus to their heading, including repeated actions. Successful submission focuses the grouped-results heading.
- [x] Confirmed facts change the correct server decision; reasons, official references and links to scheme details, profile and preparation remain available.
- [x] Slow requests show disabled/loading states and send one POST. Failed GET offers retry; failed POST retains answers and hides obsolete decisions. Refresh resets temporary answers without changing the profile.
- [x] Category/status combinations, clear filters, zero results, invalid/repeated queries, future unsupported entries and an empty catalog are covered. Future/empty catalog states are explicit response fixtures; ordinary flows use the real API/database.
- [x] Account switching cancels/reset private state; a rejected token redirects without leaking previous grouped results. Valid sessions survive ordinary network failures.
- [x] Both languages retain canonical API values and view URLs. Status labels, disclosures, questions, reasons, notices, controls, dates and counts translate; Hindi remains a project translation rather than official government wording.
- [x] Native selects, radios, details and buttons retain keyboard behavior, accessible names, pressed/disabled states and visible focus. Category, checked status and scheme selectors have explicit names. Reduced-motion overrides remain active.
- [x] The shortlist and its expanded PMSBY form fit all seven widths in both languages. The dashboard shortcut now wraps at 360px, resolving the initial overflow. Six navigation items fit the mobile grid; all previous page, anchor, dialog, notification and motion checks pass their regression suites.
- [x] Screenshot gallery was regenerated from the final production UI and visually sampled on desktop and mobile, including Hindi and the corrected narrow dashboard.

## Reproduce

From this folder, install dependencies with `npm ci`, configure ignored environment files from the examples, and seed the reviewed catalog with `npm run seed:schemes`. Use separate terminals for the API and preview:

```powershell
npm test
npm run build
npm run start -w server
npm run preview -w client
```

With both services running, run the browser suites sequentially:

```powershell
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run test:readiness-browser
npm run test:language-browser
npm run test:discovery-browser
npm run screenshots
$env:SCREENSHOT_LANGUAGE = 'hi'
npm run screenshots
Remove-Item Env:SCREENSHOT_LANGUAGE
npm run audit:phase7
```

Use localhost consistently to match the configured exact CORS origin. Allow time between repeated authentication-heavy runs or restart only the intended local development API to reset its in-memory counter. Never weaken rate limits for verification. See [README](../README.md) for environments, components and dependencies, and the [gallery](screenshots/README.md) for captured pages.

## Limits and delivery status

The six-scheme catalog and partial rules retain source review **8 October 2026**, rule version **2026-10-08.1**. This phase did not conduct a fresh policy review. Official providers determine current complete requirements and approval; self-reported facts and a basic match do not establish entitlement. No AI, RAG, chatbot, government integration, document upload, submission, automated policy monitoring or deployment is included. Existing bearer/localStorage and logout-expiration limitations remain documented in README.

The existing 55-request Postman collection remains applicable because contracts are unchanged. Postman desktop was not run; equivalent API scenarios were executed by the automated suites. No required implementation, build, browser or Lighthouse check remains failing or blocked. **PHASE 7 COMPLETE.**
