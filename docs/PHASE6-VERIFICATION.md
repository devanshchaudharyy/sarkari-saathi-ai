# Phase 6 verification — Hindi / English

Verified **18 October 2026** against local MongoDB, API `http://localhost:5000/api`, and the Vite production build at `http://localhost:5175`. Scope: Hindi/English display and interaction support across the existing app. AI assistance was explicitly skipped; no AI, RAG, recommendations or deployment was added.

## Executed results

| Check                       | Result                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API/domain regression tests | **170 passed, 0 failed**; dedicated local test databases, existing authentication/profile/catalog/screening/readiness contracts                                                               |
| Translation/coverage tests  | **23 passed, 0 failed**; dictionary integrity, placeholders, safe fallback, interpolation, canonical search, locales and reviewed content coverage                                            |
| Browser scenarios           | **106 passed, 0 failed**: foundation 15, profile 14, catalog 19, screening 20, readiness 19, bilingual 19                                                                                     |
| Production build            | Passed; entry chunk approximately 437.8 KB / 141.9 KB gzip; Hindi separate lazy chunk 123.88 KB / 30.43 KB gzip                                                                               |
| Runtime/console             | Zero JavaScript exceptions across all six suites; zero unexpected console errors in catalog, screening, readiness and bilingual suites. Expected failed-request resource errors are excluded. |
| Responsive                  | 360, 390, 430, 768, 1024, 1280, 1440px; both languages, public/auth/workspace flows, six details and checklist/screening variants                                                             |
| Screenshots                 | **36 refreshed full-page PNGs**, nine pages × two languages × desktop/mobile, generated using synthetic information                                                                           |
| Dependency audit            | Font installation audited 344 packages with zero reported vulnerabilities; lockfile records the added OFL-licensed Fontsource Noto Sans Devanagari package                                    |

Coverage tests verify that translations exist and preserve contracts; they are not independent certification of linguistic accuracy, official policy or government eligibility decisions. Source policy review dates remain 8 October 2026. API tests remove only their uniquely named test databases; browser and audit synthetic accounts remain in development MongoDB for inspection.

## Measured production mobile Lighthouse

Lighthouse 13, installed headless Chrome, default mobile simulated throttling, production preview. The helper uses a synthetic account and persistent default context with `disableStorageReset: true`, including a saved preparation list. The final measurement ran separately from browser test suites. Storage/cache context is preserved; these are local observations, not cold-user or deployed performance guarantees.

| Route / language                  | Performance | Accessibility | Best practices | SEO | FCP  | LCP  | TBT   | CLS |
| --------------------------------- | ----------- | ------------- | -------------- | --- | ---- | ---- | ----- | --- |
| `/` English                       | 100         | 100           | 100            | 100 | 1.1s | 1.2s | 30ms  | 0   |
| `/` Hindi                         | 98          | 100           | 100            | 100 | 1.1s | 1.3s | 160ms | 0   |
| `/readiness` Hindi, authenticated | 99          | 100           | 100            | 63  | 1.1s | 1.7s | 110ms | 0   |

The language button initially failed the label-in-name diagnostic even while the category score was 100. Its accessible name now includes its visible English/Hindi label; the final diagnostic passes. The readiness route intentionally remains excluded from indexing, accounting for its SEO score. Browser back/forward-cache diagnostics remain because the audit browser disables that cache with flags. No significant actionable local performance/accessibility issue remains. An earlier Hindi landing audit performed alongside browser work measured performance 86 / TBT 530ms; the isolated final run measured 98 / 160ms. This variation is why local scores are not presented as a real-user guarantee or a claim that every audit item passes.

## Translation and API checklist

- [x] All six reviewed catalog names, summaries, benefits, eligibility introductions, caveats, next steps and source labels have Hindi mappings.
- [x] All 36 state/UT and occupation labels translate; option values stay canonical. Names, email addresses, passwords and typed district input retain their original text.
- [x] Screening question labels/helpers/groups, all UP stages, status descriptions, sample true/false/unknown reasons and limitations translate. Rule IDs, facts, evaluation order and decisions are unchanged.
- [x] Every reviewed preparation title/detail/kind/source label translates. Task IDs, save IDs, revisions, versions, marks and official URLs remain unchanged.
- [x] Placeholder sets match between languages; task/profile count messages support Hindi word order. Date formatting uses Hindi/English locale with existing time zones.
- [x] Unknown new text and prototype-key strings fall back safely. URLs and non-string/React values pass through without mutation. React renders escaped text; there is no HTML injection or DOM-text substitution.
- [x] Known Hindi scheme names/common aliases map to canonical literal catalog searches. Typed queries remain in URL/form; English and arbitrary queries retain existing behavior. This is not unrestricted semantic Hindi search.
- [x] API schemas, database records, auth/rate limits and the 55-request Postman collection remain unchanged. Existing API/security regression tests pass; Postman desktop was not rerun because the contracts did not change.

## Browser and accessibility checklist

- [x] A fresh English visit does not download the Hindi dictionary. Hindi is loaded only when selected or restoring a Hindi preference.
- [x] Switcher exposes selected state, arrows, Home/End handling, Enter/Space activation, Escape, outside click/focus closure and focus restoration. Browser tests exercise arrows/Enter/Escape/outside click; native buttons retain Space behavior.
- [x] Document language, title, description, labels, screen-reader descriptions, date locale and new notifications update with language.
- [x] Refresh, route changes, safe login return, selected-scheme query, native anchors and browser history retain language/navigation state. Other tabs synchronize the preference without losing authentication.
- [x] Auth drafts and password visibility/content survive switching. Hindi inline validation, actual registration, invalid credentials and duplicate-email errors work through the real API.
- [x] A synthetic citizen name starting with the UI word `Student` stays unchanged in Hindi. Profile edits survive switching; saved API values remain `Uttar Pradesh` and `student`, with the user's Hindi district unchanged.
- [x] Hindi filters send canonical location/category values; Hindi scheme search resolves actual catalog results. All six Hindi detail pages preserve exact provider links.
- [x] Screening answers survive language changes; running the same facts yields translated reasons for the same deterministic result. Preparation save/mark/refresh/switch retains confirmed server progress.
- [x] Failed network requests show translated errors while preserving valid sessions. A rejected token clears private content and redirects to Hindi login while retaining the language preference.
- [x] Unsupported preference falls back to English. Blocked browser storage still permits in-memory switching. An unavailable Hindi chunk keeps English usable and reload recovers after access returns.
- [x] Translation notice identifies Hindi as a project translation, not official government wording. Unknown future content can remain English and can be read in the English view.
- [x] Existing authentication, profile draft dialogs, catalog filters/source anchors, screening boundaries and readiness race/failure/removal scenarios pass regression suites.

## Responsive, motion and fixes

- [x] All seven widths fit Hindi landing/library/detail/dashboard/profile/screening/preparation and login/register pages; English suites recheck their existing responsive coverage.
- [x] The initial 360px public-navbar overflow was fixed with tighter gaps, a smaller mobile brand and explicit control spacing. Long Hindi headings/fields have suitable line height with self-hosted Devanagari fonts.
- [x] Native checkbox/radio/select and keyboard focus behavior remains intact. Reduced motion disables the language-menu animation and prior page/card transitions.
- [x] Screening's missing-question action now focuses its existing heading synchronously. Readiness reload clears the old visible result synchronously before fetching; this resolves focus/refresh timing issues exposed by concurrent verification.
- [x] Desktop/mobile screenshots were inspected for typography, navigation, cards, fields and clipping. Capture scripts wait for fonts/data, use reduced motion and assert zero page exceptions; cleanup also runs after startup failure.

Repeated synthetic sign-ins exhausted the normal 30-attempt/15-minute development authentication limit during verification. The local API was restarted to reset its in-memory counters before the final bilingual run, captures and audit. Limits were not weakened, and no citizen records were reset. Allow the window to expire or restart only your own development API when repeatedly reproducing the full suite.

## Reproduce

```powershell
npm install
npm run seed:schemes
npm test
npm run build
# Start separately with matching configured API origin / frontend port:
npm run start -w server
npm run preview -w client
# Browser suites:
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run test:readiness-browser
npm run test:language-browser
# Run after browser work finishes:
npm run audit:phase6
# Synthetic screenshot gallery:
npm run screenshots
$env:SCREENSHOT_LANGUAGE='hi'
npm run screenshots
Remove-Item Env:SCREENSHOT_LANGUAGE
```

Audit debugging port 9337 must be free. Browser suites default to installed Edge (`BROWSER_PATH` override); Lighthouse uses installed Chrome (`CHROME_PATH` override). Current local port is 5175; examples remain 5173. Actual environments, dependencies, builds, test browser profiles and reports are ignored. Evidence is in ignored `reports/*-browser-results.json`, `phase6-*-lighthouse.{json,html}` and `phase6-lighthouse-summary.json`; the shareable screenshot gallery is committed under `docs/screenshots/`.

## Boundaries

Translations are maintained by the project and have not been independently certified by a professional translator or government body. Canonical data and official sources remain authoritative. New unmapped content or unexpected technical messages can fall back to English. The initial stored-Hindi load may briefly show English; if that chunk is unavailable the app remains usable in English. Language preference is per browser, not synchronized through an account on other devices. Active notifications may retain their creation language until dismissed.

Existing partial-screening, self-marked preparation, localStorage bearer-token, no server revocation, in-memory rate-limit and manual source-review limitations remain. No official-document translation service, unrestricted Hindi semantic search, AI assistant, RAG, recommendations or deployment was added. No failing local in-scope acceptance check remains.

**PHASE 6 COMPLETE — HINDI / ENGLISH SUPPORT; AI SKIPPED**
