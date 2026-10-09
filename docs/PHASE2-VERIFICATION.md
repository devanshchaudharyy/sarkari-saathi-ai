# Phase 2 — citizen profiles

Implemented and verified on 8 October 2026. Scope: save/edit private citizen details and show profile completion. No scheme browsing, eligibility engine, recommendations, document tracking, or AI features were added.

Open http://localhost:5175/profile after signing in. The frontend production preview and API are running locally; API health is http://localhost:5000/api/health. No additional environment variables or installed packages were needed.

## Results

| Check                              | Result                                                         |
| ---------------------------------- | -------------------------------------------------------------- |
| Production build                   | Passed                                                         |
| Backend integration tests          | 51 passed: 27 auth + 24 profile                                |
| Phase 1 browser regression checks  | 15 passed                                                      |
| Phase 2 profile browser checks     | 14 passed                                                      |
| Runtime exceptions                 | 0 in both browser suites                                       |
| Profile/dashboard widths           | 360, 390, 430, 768, 1024, 1280, 1440px; no overflow            |
| Lighthouse mobile landing page     | Performance 95; Accessibility 100; Best Practices 100; SEO 100 |
| First / largest contentful paint   | 2.4s / 2.4s                                                    |
| Total blocking time / layout shift | 0ms / 0                                                        |

Lighthouse audited the public production landing page, not the authenticated profile page. These scores are a local measurement, not a certification or production guarantee. Profile accessibility was checked through labels, keyboard navigation, modal focus behavior, progressbar names, and reduced motion. Desktop and mobile profile screenshots were visually reviewed.

## Implemented behavior

- Protected `/profile` route; signing in from that route returns to the profile page.
- Separate Profile collection with a unique owner index; existing users need no migration.
- Age, state/UT, occupation, and annual household income are the four core details; district is optional.
- Partial drafts, completed profiles, editing, explicit save, reset unsaved changes, and saved completion on the dashboard.
- Each valid core detail contributes 25%; zero age and zero income are supplied values. Completion is never an eligibility claim.
- Draft completion is labelled separately from saved completion. Details are kept in component memory until saving, then stored in MongoDB; they are not cached in localStorage.
- Changing state clears district in the form, preventing an old district from remaining attached to a new state.
- In-app navigation warns about unsaved changes. The native dialog supports Escape, focus restoration, and Tab/Shift+Tab wrapping. Refresh/close uses a browser beforeunload prompt.
- Loading feedback, disabled save/fields, success/error notifications, network retry, preserved edits after failure, and expired-session handling.
- Public copy now accurately states that accounts and profiles are available while later features remain planned.

## API/security checks

- [x] GET and PUT /api/profile require a verified bearer JWT.
- [x] First GET supplies an empty response without creating a profile record.
- [x] Saved drafts round-trip through MongoDB and return correct completion.
- [x] Completed profiles trim district and return 100% only for valid core data.
- [x] Two accounts read and write only their own profiles.
- [x] Owner/userId injection, account-field changes, update operators, and client-provided completion are rejected.
- [x] Invalid numeric types, negative/fractional/out-of-range values, unknown choices, and malformed district values return 400 without changing stored data.
- [x] PUT requires the full replacement shape; null explicitly clears core values.
- [x] Age 0 and income 0 work correctly, with district optional.
- [x] Editing and simultaneous first saves preserve exactly one profile per user.
- [x] Responses omit owner metadata and use Cache-Control: no-store.
- [x] Shared state/UT choices contain 36 unique entries, including Ladakh and the merged territory.
- [x] Existing password hashing, JWT verification, login, CORS, rate limiting, and safe errors pass their regression suite.

## Browser checks

- [x] Protected route → login → requested profile route.
- [x] Initial empty state; unchanged Save button disabled.
- [x] Save an age-only draft, refresh, and observe 25% saved completion.
- [x] Fill all core fields, including zero income, save, and observe 100% completion.
- [x] Dashboard reflects saved completion and exposes Edit profile.
- [x] Invalid age shows inline feedback, focuses the invalid field, and sends no PUT request.
- [x] Changing state clears district; edits survive refresh.
- [x] Unsaved navigation supports keep editing, Escape, focus wrapping, and deliberate discard.
- [x] Failed save preserves edits; retry saves successfully.
- [x] Failed profile load hides the form to prevent accidental overwrites; retry restores the existing profile.
- [x] Slow save disables fields and provides progress feedback.
- [x] Profile and dashboard fit all seven requested widths.
- [x] Reduced motion preserves functionality; no profile fields leak into localStorage.
- [x] Rejected/expired session redirects to login and clears the token.
- [x] A newly signed-in account does not inherit the previous account's form values or completion.

## Reproduce and inspect

```powershell
npm test
# With the frontend and API running:
npm run test:browser
npm run test:profile-browser
```

API tests create and remove only their isolated test databases. Browser tests create synthetic accounts/profiles in the development database and leave them for inspection. Evidence is in ignored `reports/`: profile-browser-results.json, browser-results.json, profile-desktop.png, profile-mobile.png, and phase2-lighthouse-mobile.report.html/.json. Full-page screenshots suppress motion during capture.

The updated Postman collection contains 23 requests across authentication and profiles. Profile requests cover initial empty state, draft save/read, completion with zero income, invalid age, owner injection, unchanged state after rejection, and missing authentication. Run it from Health onward to generate a unique account and capture its token. Equivalent scenarios were executed through Supertest rather than the Postman desktop app.

## Limitations

No known failing acceptance check or unfinished in-scope feature remains. Profiles are self-reported, not verified; age does not automatically advance. There is no autosave, offline draft storage, account identity editing, or dedicated profile deletion endpoint. Blank values can be saved to clear fields. Concurrent saves use the last successful write. Logging out discards unsaved edits. Existing localStorage token exposure and non-revoking logout limitations remain unchanged. No deployment is included.

**PHASE 2 COMPLETE — PROFILE SETUP ONLY**
