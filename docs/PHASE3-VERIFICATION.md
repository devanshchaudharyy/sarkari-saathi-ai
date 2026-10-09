# Phase 3 — official scheme browsing

Verified on 8 October 2026. Scope: a public curated catalog with search, filters, detail pages and official references. This phase does not implement profile matching, personalised eligibility decisions, recommendations or AI.

Open [the local scheme library](http://localhost:5175/schemes). API: `http://localhost:5000/api/schemes`. The local MongoDB database contains six seeded schemes; the API and frontend production preview are left running. No deployment, new dependencies or new environment variables were required.

## Results

| Check                                       | Result                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Production build                            | Passed                                                                                                           |
| Backend integration tests                   | 77 passed: 27 auth + 24 profile + 26 schemes                                                                     |
| Authentication/landing browser regression   | 15 passed                                                                                                        |
| Profile browser regression                  | 14 passed                                                                                                        |
| Scheme browsing browser checks              | 19 scenarios; results in `reports/schemes-browser-results.json`                                                  |
| JavaScript exceptions                       | 0 in all browser suites                                                                                          |
| Unexpected scheme browser console errors    | 0; deliberately failed HTTP requests excluded                                                                    |
| Responsive views                            | Catalog and every detail inspected at 360, 390, 430, 768, 1024, 1280, 1440px; no horizontal overflow             |
| Existing pages                              | Landing, login, registration, dashboard, profile and missing-page regression checks pass at the requested widths |
| Catalog Lighthouse, mobile                  | Performance 94; Accessibility 100; Best Practices 100; SEO 100                                                   |
| PM-KISAN detail Lighthouse, mobile          | Performance 94; Accessibility 100; Best Practices 100; SEO 100                                                   |
| Catalog FCP / LCP / blocking / layout shift | 1.8s / 2.9s / 20ms / 0                                                                                           |
| Detail FCP / LCP / blocking / layout shift  | 1.8s / 2.9s / 0ms / 0.001                                                                                        |

Lighthouse ran against the production frontend preview with the local API, using its mobile configuration. These measurements cover `/schemes` and `/schemes/pm-kisan`, not every scheme, authenticated page, real device or deployed network. Reports also contain Lighthouse’s additional agentic-browsing category (50 for these runs); no agent-readiness certification is claimed. LCP remains 2.9s under the simulated mobile environment.

The initial catalog audit found one contrast failure, corrected by darkening the coverage text. The initial detail audit scored 80 with 0.278 layout shift because the footer appeared below a short loading state before moving down. A larger content skeleton keeps the footer below the viewport; the repeated detail measurement reduced shift to 0.001 and raised performance to 94. Desktop/mobile catalog and detail screenshots were visually reviewed. Keyboard, focus and reduced-motion checks complement the automated accessibility audit.

## API and security checklist

- [x] Public GET list/detail routes work without a bearer token; account/profile endpoints retain authentication.
- [x] Empty database returns zero records, zero pages and no invented review date.
- [x] Seed upserts six stable slugs, is idempotent and preserves unrelated catalog records. It targets only the Scheme collection.
- [x] Name/acronym/keyword search is case-insensitive and trimmed; regex characters are escaped and searched literally.
- [x] Category, central/state and location filters combine. Central schemes appear for each location; Uttar Pradesh state coverage is explicit.
- [x] Stable alphabetical pagination returns accurate totals, no overlap, and empty out-of-range pages.
- [x] Invalid choices, malformed/negative/fractional/excessive pagination, long search, unknown keys, repeated keys and query-operator injection return safe 400 errors.
- [x] Detail slugs are bounded; missing/malformed slugs use safe 404 responses.
- [x] List summaries and detail responses exclude database IDs, search internals and irrelevant owner data.
- [x] Source URLs are validated as HTTPS government domains during seeding. Invalid protocols fail validation.
- [x] The catalog has no public POST/PUT/DELETE mutations; React renders source text without HTML injection.
- [x] Exact-origin CORS, Helmet, body limits, JWT checks, password hashing, unique email enforcement, rate limiting and hidden production errors pass regression tests.
- [x] Network failures retain client sessions. Search/list failures do not clear profile data or tokens.

## Browser checklist

- [x] Public catalog displays the six actual API records without an account.
- [x] Search supports acronyms and keywords; form submission/Enter trims input and updates the URL.
- [x] Category/level/location filters combine, removable chips work and Clear all resets the view.
- [x] Filtered views survive reload/share; details and Back to schemes preserve search context; browser history restores the view.
- [x] Every detail shows benefits, intended audience, next steps, caveats, review date, department and official sources.
- [x] External links point to HTTPS government domains, use new-tab/noopener/noreferrer attributes and disclose their destinations. External service uptime is not asserted.
- [x] Source anchors scroll and focus correctly on click and direct hash URLs after asynchronous loading.
- [x] Pagination changes results; changing filters resets page.
- [x] Missing schemes, invalid queries, literal regex searches, out-of-coverage views and an unseeded catalog have honest states.
- [x] Skeletons appear during loading; detail loading reserves page space. List and detail failures offer retry.
- [x] Rapid successive searches cannot overwrite newer results with an older response.
- [x] Keyboard search and native selects work without losing control focus.
- [x] Mobile menu closes after Browse schemes selection and Escape restores toggle focus.
- [x] Dashboard and workspace navigation expose available browsing. Signed-in browsing retains the session and does not update the citizen profile.
- [x] No JavaScript exceptions or unexpected console errors.

## Responsive and animation checklist

- [x] Catalog plus all six detail routes checked at all seven widths.
- [x] Desktop/mobile/tablet catalog and desktop/mobile detail screenshots captured; desktop/mobile screenshots visually reviewed.
- [x] Search, selects, filter chips, empty/error states, cards, external links and navigation remain usable on narrow screens.
- [x] Three-column desktop cards become two columns and then one; detail side panel moves above content on small screens.
- [x] Existing workspace navigation with its third entry fits mobile widths.
- [x] Card hover movement, focus styling and approximately 200ms entrances work.
- [x] Reduced motion removes card movement/transitions and retains functionality; global page/reveal overrides pass prior browser regressions.
- [x] Submit loading/toasts, landing reveals/anchors and mobile-menu transitions pass earlier-phase regression checks.

## Reproduce and inspect

```powershell
npm run seed:schemes
npm test
npm run build
# Start API and frontend first:
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
# Production audit; set CHROME_PATH to your installed Chrome executable:
npx lighthouse http://localhost:5175/schemes --chrome-flags="--headless=new" --output=json --output=html --output-path=reports/phase3-lighthouse-mobile
npx lighthouse http://localhost:5175/schemes/pm-kisan --chrome-flags="--headless=new" --output=json --output=html --output-path=reports/phase3-detail-lighthouse-mobile
```

API suites create/drop only uniquely named local test databases, with an exact database-name check before cleanup. Browser tests create synthetic accounts in the development database and leave them for inspection. Seeding never deletes catalog/accounts/profiles. Evidence in ignored `reports/`: three browser-results JSON files, scheme desktop/mobile/tablet and detail screenshots, plus catalog/detail Lighthouse JSON/HTML reports.

The generated Postman collection now contains 34 requests, including 11 catalog scenarios. Seed the catalog and run from Health onward. Request scripts were syntax-checked; equivalent API scenarios were executed through Supertest. The Postman desktop app itself was not used for this verification.

## Boundaries and external limitations

This is six editorial summaries, not a complete or automatically synchronised directory. No admin editor, saved schemes, live deadlines, document checklist engine, application submission, profile matching or AI is included. Source review details and direct-fetch limitations are recorded in [CATALOG-SOURCES.md](CATALOG-SOURCES.md). Some official pages timed out or returned gateway errors during research; indexed official content supplied the remaining evidence. External government site/PDF availability is not guaranteed, and the UP portal showed a dated maintenance notice. Confirm current terms with the responsible provider.

Existing bearer-localStorage/session and self-reported profile limitations remain documented in README. No deployment was performed.

No known failing local acceptance check or unfinished in-scope feature remains. External source reachability limits are described above.

**PHASE 3 COMPLETE — OFFICIAL SCHEME BROWSING ONLY**
