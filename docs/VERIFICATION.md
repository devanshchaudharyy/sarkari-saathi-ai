# Phase 1 verification

Verified on 7 October 2026 using Node 24, local MongoDB, installed Chromium browsers, and the built frontend at http://localhost:5175. API: http://localhost:5000. Both are left running for manual testing. Ignored local configuration selects 5175 because ports 5173 and 5174 already hosted other projects.

## Results

| Check                             | Result                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| Frontend production build         | Passed                                                         |
| Backend integration suite         | 27 passed; 0 failed                                            |
| Browser acceptance suite          | 15 grouped checks passed; no runtime exceptions                |
| Responsive widths                 | 360, 390, 430, 768, 1024, 1280, 1440px; no horizontal overflow |
| Dependency audit                  | 0 vulnerabilities                                              |
| Lighthouse mobile: Performance    | 96                                                             |
| Lighthouse mobile: Accessibility  | 100                                                            |
| Lighthouse mobile: Best Practices | 100                                                            |
| Lighthouse mobile: SEO            | 100                                                            |
| First / largest contentful paint  | 2.3s / 2.3s                                                    |
| Total blocking time               | 10ms                                                           |
| Cumulative layout shift           | 0                                                              |

Lighthouse measured a local production preview with simulated mobile throttling. Scores depend on the environment and are not an accessibility certification. Its optional agentic-browsing category is outside Phase 1. Remaining optimization opportunities include unused JavaScript and font request chains; no severe performance issue was observed. Frame rate was not instrumented.

Evidence is saved in the ignored `reports/` directory: browser-results.json, home-desktop.png, home-mobile.png, dashboard-desktop.png, dashboard-mobile.png, register-mobile.png, lighthouse-mobile.report.html, and lighthouse-mobile.report.json. Screenshots suppress animation during capture to avoid transient entrance states.

## API checklist — verified

- [x] Health endpoint returns 200 and the exact requested message.
- [x] Registration handles valid inputs, duplicate normalized email, invalid email, short password, missing name/email/password, invalid name lengths, non-string password, and oversized UTF-8 password.
- [x] Concurrent registrations produce one 201 and one 409.
- [x] Stored password is bcrypt-hashed and excluded from default model reads and API responses.
- [x] Password whitespace is preserved; changing it rejects login.
- [x] Login handles valid credentials, incorrect password, unknown account, and missing fields.
- [x] Incorrect password and unknown account return matching generic errors.
- [x] Protected /me accepts a valid JWT and rejects missing, malformed, invalid, expired, wrong-algorithm, and nonexistent-user tokens.
- [x] CORS permits the configured origin and rejects an untrusted origin.
- [x] Malformed JSON, unknown routes, oversized bodies, and authentication throttling have safe errors.
- [x] Unexpected production errors hide internal messages and stacks.

Run `npm test` independently of the live API. It creates and removes only a uniquely named test database. Import `SarkariSaathi.postman_collection.json` for manual API testing; run in order to initialize the unique email and capture the token. The collection includes assertions; equivalent scenarios were executed through Supertest, rather than the Postman desktop application.

## Browser checklist — verified

- [x] Registration → real API → MongoDB → dashboard.
- [x] Logout → login and successful login → dashboard.
- [x] Refresh restores the user through /me.
- [x] Logged-out dashboard redirects to login; authenticated login/register redirects to dashboard.
- [x] Invalid credentials, duplicate registration, and invalid inputs show actionable feedback.
- [x] Network errors are explained; initial API outage preserves the token and supports retry.
- [x] Invalid persisted tokens are removed and redirect to login.
- [x] Password visibility control changes the input type.
- [x] Submit loading disables the button; successful login/logout produces toast feedback.
- [x] Keyboard skip link focuses main content; inputs have labels, validation feedback, and visible focus rings.
- [x] Mobile menu opens/closes, closes on selection, and supports Escape/focus restoration.
- [x] Direct anchors position correctly after reload.
- [x] No unhandled runtime exceptions.

Expected failed requests are deliberately generated during offline and invalid-credential/session tests. Synthetic browser-test accounts remain in the development database for inspection.

## Responsive checklist — verified

- [x] Landing, login, registration, dashboard, and not-found pages fit all seven requested widths.
- [x] Desktop hero/authentication layouts use two columns.
- [x] Mobile adapts typography, hero spacing, menu, forms, process steps, and dashboard navigation.
- [x] No horizontal overflow; future-feature statuses stay visible.
- [x] Desktop landing and mobile registration/dashboard screenshots were visually reviewed.
- [x] Preview is labelled conceptual; no real schemes, recommendations, statistics, or testimonials are fabricated.

## Animation checklist — verified

- [x] Navbar becomes opaque with a subtle border after scrolling.
- [x] Page/hero entrances are short and restrained.
- [x] Scroll reveals and staggered cards use transform/opacity.
- [x] Cards lift gently; buttons have hover/pressed states.
- [x] Focus rings, password controls, loading indicators, and toast transitions provide feedback.
- [x] Native smooth anchors respect sticky-header clearance.
- [x] Browser-emulated reduced motion removes animation and smooth scrolling while keeping content visible and functionality intact.

## Security checklist — verified

- [x] bcrypt uses work factor 12; raw passwords are not stored or returned.
- [x] JWT secret is random, server-only, and not printed or included in examples.
- [x] Database URI and JWT settings are configurable; actual environment files match gitignore exclusions.
- [x] No credentials are embedded in application source, frontend bundles, or Postman collection.
- [x] Server-side bearer verification protects /me; frontend route guard protects dashboard access.
- [x] JWT signature, expiry, algorithm, and user existence are checked.
- [x] CORS, Helmet, body limits, and authentication rate limiting are configured.
- [x] Database unique index prevents duplicate email, including races.
- [x] Startup validates configuration; shutdown closes HTTP and database connections.
- [x] Production errors expose no stack traces.

## Fixes and boundaries

Verification fixed mobile trust/CTA overflow, low-contrast labels, a brand accessible-name mismatch, missing robots.txt, transient screenshots, and a vulnerable development dependency. Authentication/dashboard routes are lazy-loaded.

No known unfinished Phase 1 feature or failing acceptance check remains. Intentional limitations: English only; no deployment, password reset, email verification, token revocation, or shared rate-limit storage. localStorage bearer tokens can be exposed by XSS; logout clears browser authentication but does not revoke issued tokens before expiry. All scheme, demographic-profile, eligibility, recommendation, AI/RAG, scraping, PDF, and tracking features remain unimplemented as requested.

**PHASE 1 COMPLETE**
