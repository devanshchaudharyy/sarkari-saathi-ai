# Phase 5 verification — saved schemes and application readiness

Verified **9 October 2026** using local MongoDB, API `http://localhost:5000/api` and the production frontend at `http://localhost:5175`. Scope: private saved schemes, source-linked checklists and persistent self-marked preparation progress for the six existing schemes. No uploads, application submission or official approval.

## Executed results

| Check                | Result                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend/domain tests | **170 passed, 0 failed**: auth 27, profile 24, catalog 26, screening/return-route 56, readiness 37                                                                      |
| Browser scenarios    | **87 passed, 0 failed**: foundation 15, profile 14, catalog 19, screening 20, readiness 19                                                                              |
| Runtime/console      | Zero JavaScript exceptions in all suites; zero unexpected console errors in catalog, screening and readiness. Expected failed-request resource messages excluded.       |
| Production build     | Passed; readiness lazy chunk 12.70 KB / 4.41 KB gzip                                                                                                                    |
| Responsive checks    | 360, 390, 430, 768, 1024, 1280, 1440px: saved cards, all six selected previews, dashboard/profile/screening workspace navigation; earlier public/auth page checks rerun |
| Postman              | 55 generated requests; scripts and substituted JSON parse. Equivalent HTTP scenarios executed with Supertest; Postman desktop itself was not run.                       |

Final backend rerun also verified alphabetical order when multiple removed catalog entries remain saved. Test databases are uniquely named and cleanup checks the exact name; development accounts/profiles are not wiped.

## Measured production mobile Lighthouse

Lighthouse 13, installed headless Chrome, default mobile simulated throttling. The helper creates a synthetic account and two saved schemes with one marked task each. It uses a persistent default browser context and `disableStorageReset: true` to reach the private route. These measurements include that storage/cache context and are not a cold-user, deployment or real-user guarantee.

| Route                                 | Performance | Accessibility | Best practices | SEO | FCP  | LCP  | TBT  | CLS   |
| ------------------------------------- | ----------- | ------------- | -------------- | --- | ---- | ---- | ---- | ----- |
| `/readiness` authenticated saved list | 100         | 100           | 100            | 63  | 0.9s | 1.6s | 50ms | 0     |
| `/schemes/pm-kisan` public detail     | 100         | 100           | 100            | 100 | 1.1s | 1.4s | 10ms | 0.001 |

The initial audit identified insufficient contrast in the preparation disclaimer; its text color was corrected and the final audit passed accessibility. The private readiness route intentionally fails crawlability because robots.txt excludes it. Both reports retain back/forward-cache diagnostics caused by the audit browser's disabling flags, reported as not actionable. No significant actionable performance or accessibility issue remains. Lighthouse is supplemented by keyboard and browser tests, not treated as accessibility certification.

## API and security checklist

- [x] All readiness methods require a valid unexpired HS256 JWT and an existing account; missing, malformed, invalid, expired and wrong-algorithm tokens reject safely.
- [x] GET returns six unsaved previews without writing a saved row or profile. Rows and progress are scoped to the authenticated owner. Successful responses are no-store.
- [x] Unique owner/slug index prevents duplicate saves; five concurrent saves create one row. Repeat saves preserve marks, revision and timestamps.
- [x] Native true/false marks persist; progress is calculated from supported tasks, never supplied by a client. Duplicate/unknown stored IDs do not inflate counts.
- [x] Responses exclude owner IDs, hashes, account internals, document contents and arbitrary notes. Strict input schemas reject owner overrides, injected progress, notes, unknown tasks, missing fields and string booleans.
- [x] Concurrent stale writes allow one winner and return 409 for the other. Stale removal is rejected. Removal/resaving starts empty with a new save ID; an old request cannot mutate the new row even if its revision matches.
- [x] Another account cannot see, update or remove the first account's progress. User/profile data remain unchanged.
- [x] Template changes withhold old marks without GET writes; a confirmed current task updates the version. Unreviewed templates never report 100%; removed catalog entries remain unavailable and removable.
- [x] Mutations have an independent 120/minute in-memory rate limit and safe 429 response. Explicit CORS and generic production error handling pass; auth/Helmet/body-limit/bcrypt regressions pass.
- [x] Safe internal return routes preserve readiness queries and reject external destinations. JWT alone persists in localStorage; checklist data do not.

## Browser checklist

- [x] Detail → login → selected preparation preserves the scheme. Dashboard/workspace and screening-result preparation links work.
- [x] Empty saved list and disabled preview tasks are honest. Save, mark/unmark, refresh, sign in again and listed-task completion work against the real API/database.
- [x] 100% explicitly means listed tasks complete; it does not claim verified documents, eligibility, application submission or approval.
- [x] All six templates have usable HTTPS primary-source links and official next steps. External provider uptime is not asserted.
- [x] Stale-window 409 preserves the last confirmed state and offers reload; reload reconciles current server progress.
- [x] Failed mutations preserve confirmed progress and authentication. A mutation that commits but loses its response also preserves the last confirmed UI until reload reveals the committed server state.
- [x] Slow saves disable controls and show loading. Failed GET shows an honest load error and retry; no fabricated entries.
- [x] Removal confirmation wraps keyboard focus, Escape cancels, cancellation restores the trigger, confirmation removes the row and resaving starts empty. The initial cancellation-focus bug was corrected before the final passing run.
- [x] Saving/restoring focus and native Space checkbox interaction work. Completion updates use server-confirmed state; success/error notifications are visible.
- [x] Invalid scheme query falls back transparently. Saved list is alphabetical. Account switching clears private content; rejected sessions clear JWT and redirect safely.
- [x] Existing auth, duplicate registration, profile, catalog, screening, direct anchors, mobile-menu closure/Escape and browser-history scenarios pass regression suites.
- [x] Zero unexpected JavaScript/runtime errors in final browser runs.

## Responsive and motion checklist

- [x] All seven widths check horizontal overflow, readable typography, usable selectors/tasks/cards and the five-link workspace navigation.
- [x] Desktop/mobile viewport screenshots visually inspected for hierarchy, spacing and controls; narrow layouts stack tasks and cards.
- [x] Native focus rings, checkbox selection, hover/pressed styles, approximately 200ms entrance and loading states remain usable.
- [x] Reduced motion disables card/control/page transitions and animation; prior landing reveal/navbar motion checks pass.
- [x] Focus returns after asynchronous task changes without stealing focus from another control; save/removal move focus to a meaningful list heading.

## Reproduce

```powershell
npm run seed:schemes
npm test
npm run build
# Start in separate terminals:
npm run start -w server
npm run preview -w client
# Then:
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run test:readiness-browser
npm run audit:phase5
node scripts/create-postman.mjs
```

Local environment uses frontend port 5175 with matching API CORS; examples default to 5173. Installed Edge was used for browser suites; `BROWSER_PATH` can override it. The audit uses installed Chrome (`CHROME_PATH` override) and needs debugging port 9336 free. Synthetic browser/audit accounts and saved records remain in the development database for inspection. No real citizen details or JWT secret are required or printed.

Ignored evidence: five browser result JSON files, readiness desktop/mobile full-page and viewport screenshots, `phase5-readiness-lighthouse.{json,html}`, `phase5-detail-lighthouse.{json,html}`, `phase5-lighthouse-summary.json` and the synthetic audit browser profile in `reports/`.

## Boundaries and remaining limitations

Templates are manually reviewed partial guides, with source-access limits documented in [READINESS-SOURCES.md](READINESS-SOURCES.md). Stage-specific and provider-specific requirements must be confirmed officially. Checking tasks does not verify evidence or grant approval. Templates do not adapt automatically to ephemeral screening answers. Removing a saved scheme deletes its marks; a network error can leave the client uncertain until reload. Existing localStorage bearer sessions, no server revocation, in-memory rate limits and self-reported profile limitations remain.

No deployment, AI assistance, RAG, recommendations, document processing, uploads or official application-status integration was added. No failing local acceptance check or unfinished in-scope feature remains. Intentional private-route crawlability and audit-browser cache diagnostics are recorded above. Postman import/execution in its desktop UI was not measured; the collection is generated and syntax-validated, with equivalent API coverage executed.

**PHASE 5 COMPLETE — SAVED SCHEMES AND PREPARATION CHECKLISTS**
