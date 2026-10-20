# Phase 8 verification — consolidation and production readiness

Verification date: **20 October 2026**. Scope approved: one consolidated project, repeatable startup, health checks, deployment configuration and automated verification. No public deployment or AI feature was requested for this phase.

## Consolidation

All code, screenshots and documentation from `phase-7-shortlist` were fast-forwarded into the original **`sarkari-saathi-ai`** checkout on `main`. The duplicate worktree was removed after checking both trees were clean, retaining its committed history. Only one project folder remains in the workspace. Git still retains the prior phase branch/commits.

The Phase 7 ignored environments were transferred to the main folder. Its local MongoDB database `sarkari_saathi_ai_phase7`, JWT secret and accounts were preserved; no database was dropped, merged or exported as part of consolidation. Older local environments and historical verification reports are retained under ignored `reports/`. Dependencies/build artifacts remain ignored. Fresh setup generates a private secret without displaying it and never overwrites existing files.

## Production story and evidence

**Story:** a browser opens a direct route on `http://localhost:5176` → the single Express process serves the built React application → relative `/api` requests use the same origin → authenticated controllers read/write MongoDB → confirmed results render in English or Hindi.

| Boundary                 | Evidence                                                                                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production configuration | Dedicated optional `.env.production` or host variables; development `.env` is not a production fallback. Placeholder secrets, invalid origins, non-positive expiry and remote plain-HTTP production origins are rejected. Values are omitted from validation errors. |
| Startup                  | `npm run setup`, production build and `npm start` executed. Build output is checked before listener/database startup. An attempted start while the build was not yet present failed with the intended build instruction.                                             |
| Site and API             | One listener at 5176 serves both; no Vite preview or separate API process is needed for the delivered runtime. Browser requests are asserted to stay on that origin.                                                                                                 |
| API and MongoDB          | Existing authentication/profile/catalog/screening/readiness tests plus real database ping, disconnect/reconnect and safe failed-ping cases. Test databases use generated names and exact-name deletion checks.                                                       |
| Response to UI           | Synthetic registration, profile save/readback, screening, shortlist, checklist marks, login/logout, refresh and bilingual lazy assets exercised through the production app.                                                                                          |
| Private responses        | All `/api` results/errors use `no-store`; account scoping, generic errors, JWT validation, CORS, limits and hash exclusions remain covered.                                                                                                                          |

## Automated and browser results

| Check                            | Result                                                                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API/domain/environment/lifecycle | **195 passed**, comprising 170 previous tests and 25 production tests                                                                                                                                       |
| Localization                     | **23 passed**                                                                                                                                                                                               |
| Shortlist presentation           | **18 passed**                                                                                                                                                                                               |
| Total Node tests                 | **236 passed, 0 failed**                                                                                                                                                                                    |
| Existing browser regressions     | **122 passed, 0 failed**: foundation 15, profile 14, catalog 19, screening 20, readiness 19, bilingual 19, shortlist 16                                                                                     |
| New production browser           | **10 passed, 0 failed**; **132 total browser scenarios**. No runtime exceptions or unexpected console/CSP errors in the final reports.                                                                      |
| Build                            | Passed; entry 438.21 KB / 142.01 KB gzip; Hindi 135.41 KB / 33.07 KB gzip; Discovery 13.22 KB / 4.80 KB gzip                                                                                                |
| Dependencies                     | Lockfile metadata updated for Node >=22.12/npm >=10; Node 24 used locally and in CI configuration. Added compression for frontend asset encoding; 351 installed packages audited with zero vulnerabilities. |

The screening suite exposed a scheduling race: results could render before its animation-frame callback focused their heading. Focus now follows the committed result in a layout effect. Its original focus assertion passes. The shortlist filter test now waits for the route's actual card rendering after a query change, rather than treating an already-mounted count container as evidence that navigation finished. Assertions on card counts and URL behavior remain in place.

## Production, security and operations checklist

- [x] Original `/api/health` JSON contract retained. `/api/ready` checks connected MongoDB and a real ping with a 1500ms driver deadline; failure/draining/disconnection returns safe 503 with `Retry-After: 5`.
- [x] Database-dependent requests fail promptly in a disconnected/draining state; ordinary network/503 failures retain client authentication. Invalid sessions still clear private content.
- [x] Known and unknown SPA direct links load through the built application. Missing API routes, assets, encoded/private dotfiles and non-HTML requests do not become SPA HTML. API misses keep consistent JSON errors, including mixed-case API paths.
- [x] API responses/errors use `no-store`; HTML uses `no-cache`; fingerprinted assets use immutable caching. Frontend gzip negotiation and Vary: Accept-Encoding are tested; private API/token responses bypass compression. Helmet/CSP is active on the site and API; browser checks cover lazy Hindi assets under it.
- [x] Exact-origin validation rejects paths, credentials, fragments/trailing slashes, unsupported protocols and remote HTTP in production. Loopback HTTP remains permitted for local verification. Proxy trust stays disabled.
- [x] Setup generates private random material, preserves edited environments, retains the intended database and creates no committed live credential. Host variables take precedence over local production values.
- [x] Shutdown marks draining, closes HTTP once, disconnects MongoDB before success, handles disconnect failure and enforces the 10-second deadline. Controlled lifecycle tests exercise success/failure/deadline behavior; Unix signal delivery was not claimed from Windows hard termination.
- [x] README and deployment guide cover installation/build/start, readiness, exact origins, build-time public API configuration, process supervision, shared-rate-limit/proxy limitations, release directories, backup prerequisites and rollback. No destructive migration or auto-seed on startup.
- [x] Workflow YAML parses with Prettier; repository permission is `contents: read`. CI uses an ephemeral secret, disposable MongoDB service and installed Chromium. No deployment step or credential publication is present.

## Browser, responsive, motion and screenshots

Previous suites cover authentication, profiles, catalog filters/source anchors, screening boundaries, readiness concurrency/errors, Hindi switching and shortlist behavior. The production-specific flow checks cache/security headers and direct routes, real form/API/database round trips, confirmation-based checklist progress, immediate screening-heading focus, Hindi lazy loading under CSP, network recovery, safe login return, and same-origin requests without runtime/CSP errors.

All seven widths were checked: **360, 390, 430, 768, 1024, 1280, 1440px**. Existing suites exercise both languages, forms, cards, six-item navigation, expanded questions/reasons, dialogs, focus, keyboard/native anchors and reduced motion. All **40 screenshots** were regenerated from the final production UI on 20 October with synthetic accounts: ten routes × two languages × desktop/mobile. Desktop dashboard and Hindi mobile shortlist were visually sampled. Earlier phase measurements remain historical and are not reused as current scores.

## Final run records

The actual [GitHub Linux verification run](https://github.com/devanshchaudharyy/sarkari-saathi-ai/actions/runs/39379385111) **completed successfully** for implementation commit `c1b7ff9b1c3abf24546ff75a609fd35a9d706faa`. Its steps passed locked installation, 236 Node tests, production build, Chromium installation, catalog seeding, real MongoDB readiness, all ten production browser checks and cleanup. This is execution evidence, not merely a committed workflow. The local 122 regression scenarios supplement the ten scenarios run by CI.

Raw local test logs, all eight browser JSON reports, transfer-size measurements and Lighthouse JSON/HTML are retained under ignored `reports/`. Secrets and browser profiles are not published. API tests remove only their dedicated test databases; synthetic browser/audit accounts remain in the selected development database. No required functional, build, browser or CI check is failing or blocked.

## Measured production mobile Lighthouse

Final run: Lighthouse 13, installed headless Chrome, default mobile simulated throttling, one production server, executed separately from browser suites. A synthetic account and persistent default context preserve authentication/language storage (`disableStorageReset: true`). These are local observations with that cache/storage context, not a cold-user or deployed performance guarantee.

| Route / language                   | Performance | Accessibility | Best practices | SEO | FCP  | LCP  | TBT   | CLS |
| ---------------------------------- | ----------- | ------------- | -------------- | --- | ---- | ---- | ----- | --- |
| `/` English                        | 92          | 100           | 100            | 100 | 0.7s | 1.1s | 350ms | 0   |
| `/` Hindi                          | 87          | 100           | 100            | 100 | 0.7s | 1.2s | 500ms | 0   |
| `/discover` English, authenticated | 96          | 100           | 100            | 63  | 0.7s | 1.2s | 210ms | 0   |
| `/discover` Hindi, authenticated   | 91          | 100           | 100            | 63  | 0.7s | 1.4s | 380ms | 0   |

Private routes deliberately disallow indexing, accounting for SEO 63. The back/forward-cache diagnostic remains because audit-browser flags disable it. Accessibility 100 does not certify every accessibility behavior or imply every diagnostic passes.

The audit exposed uncompressed static delivery. Negotiated frontend compression now reduces the entry-script HTTP body from **438,213 bytes to 142,012 bytes** with explicit gzip, about **68% fewer transferred bytes**; gzip and Vary behavior are tested. Private API/token responses bypass compression. An earlier uncompressed run scored 93/87/96/92 on the same four routes; the final scores are 92/87/96/91. Compression improved transfer size, and these observations do **not** establish a better Lighthouse score or lower main-thread time.

**Remaining performance optimization:** Hindi landing has 500ms simulated total blocking time; main-thread style/layout work is an identified follow-up profiling target. LCP and layout stability in the measured runs are recorded above. No perfect-performance or real-user latency claim is made. Use `npm run audit:phase8` to reproduce the measurements; runtime conditions can change scores.

**PHASE 8 COMPLETE** for consolidation and the verified single-service production-readiness scope. Public deployment and the operational prerequisites below remain outside this phase.

## Limits

Production readiness is a verified single-process baseline, not a public deployment or operational service-level guarantee. No host/domain/TLS provisioning, live backup/restore, distributed rate-limit store, trusted-proxy configuration, alerting, load test or real-user measurement was performed. The existing 55-request Postman collection remains applicable; Postman desktop was not run, while equivalent API scenarios were automated.

Tokens remain in localStorage and logout does not revoke them before expiry. MongoDB and JWT secrets require host-side protection; multi-instance operation requires a shared limiter and reviewed proxy configuration. Official-source/rule review remains **8 October 2026**, version `2026-10-08.1`; no fresh policy review or expanded eligibility claim is made. AI/RAG/chatbot, document uploads, official application submission and government integration remain unimplemented.
