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

All seven widths remain in scope: **360, 390, 430, 768, 1024, 1280, 1440px**. Existing suites exercise both languages, forms, cards, six-item navigation, expanded questions/reasons, dialogs, focus, keyboard/native anchors and reduced motion. Screenshot and Lighthouse results are recorded after their final production runs below; earlier phase measurements are historical and are not reused as current scores.

## Final run records

Local browser, screenshot and performance runs are being finalized. GitHub-hosted verification will be recorded after the workflow is pushed and executed. This draft does not claim that a committed workflow has already run.

## Limits

Production readiness is a verified single-process baseline, not a public deployment or operational service-level guarantee. No host/domain/TLS provisioning, live backup/restore, distributed rate-limit store, trusted-proxy configuration, alerting, load test or real-user measurement was performed. The existing 55-request Postman collection remains applicable; Postman desktop was not run, while equivalent API scenarios were automated.

Tokens remain in localStorage and logout does not revoke them before expiry. MongoDB and JWT secrets require host-side protection; multi-instance operation requires a shared limiter and reviewed proxy configuration. Official-source/rule review remains **8 October 2026**, version `2026-10-08.1`; no fresh policy review or expanded eligibility claim is made. AI/RAG/chatbot, document uploads, official application submission and government integration remain unimplemented.
