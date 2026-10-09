# Phase 4 verification — explainable eligibility screening

Verified **8 October 2026** against local MongoDB, API `http://localhost:5000/api`, and the Vite **production build** at `http://localhost:5175`. Scope: partial screening of basic requirements for the six existing schemes, using the signed-in account’s saved profile plus ephemeral extra answers. No official eligibility approval, AI or application submission.

## Executed results

| Check               | Result                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend/rule suites | **133 passed, 0 failed**: auth 27, profile 24, catalog 26, screening/return-route 56                                                                                |
| Browser suites      | **68 passed, 0 failed**: foundation 15, profile 14, catalog 19, screening 20                                                                                        |
| Runtime/console     | Zero JavaScript exceptions in all four suites; zero unexpected console errors in catalog/screening suites. Expected failed-request resource messages were excluded. |
| Production build    | Passed; screening is a lazy-loaded chunk, approximately 15.1 KB / 5.1 KB gzip                                                                                       |
| Responsive          | 360, 390, 430, 768, 1024, 1280, 1440px; screening with all groups/reasons expanded, selected UP scheme, dashboard/profile and prior public/auth regressions         |
| Postman handoff     | 43 generated requests; JSON and all request scripts parse successfully; equivalent HTTP scenarios executed through Supertest. Postman desktop itself was not run.   |

Screening tests include deliberately synthetic profiles and self-confirmed conditions. Passing tests demonstrate the implemented rule contract, not accuracy against independently adjudicated government decisions.

## Measured production mobile Lighthouse

Lighthouse 13 with installed headless Chrome, default mobile simulated throttling, against production preview. The audit creates a synthetic account/profile and uses a persistent default browser context with `disableStorageReset: true` to reach the authenticated route. These local measurements include that storage/cache context; they are not a cold-user or deployed performance guarantee.

| Route                                 | Performance | Accessibility | Best practices | SEO | FCP  | LCP  | TBT  | CLS   |
| ------------------------------------- | ----------- | ------------- | -------------- | --- | ---- | ---- | ---- | ----- |
| `/eligibility` authenticated baseline | 99          | 100           | 100            | 63  | 0.9s | 1.7s | 90ms | 0     |
| `/schemes/pm-kisan`                   | 100         | 100           | 100            | 100 | 1.1s | 1.5s | 10ms | 0.001 |

Screening’s crawlability audit fails intentionally: `/eligibility` is a protected private workspace route and is disallowed in robots.txt. It was not made crawlable to increase SEO. Both reports also flag the browser’s back/forward cache diagnostic; scores and functioning browser-history regressions are recorded rather than claiming all audit items are green. No significant actionable performance or accessibility failure remains. Accessibility scoring is supplemented by keyboard/browser checks, not treated as comprehensive certification.

## API, rule and security checklist

- [x] GET/POST require a valid unexpired bearer JWT and an existing account. Earlier auth tests cover allowed-algorithm verification and safe responses.
- [x] Missing profile supplies unknown facts without inserting a record. Exactly the six actual seeded entries are screened; unsupported future slugs are not assessed.
- [x] Every request reads the authenticated owner’s latest profile. Another account’s profile never affects results. Responses omit owner IDs, hashes, account metadata and database internals.
- [x] Strict supported-answer schema rejects unknown keys, wrong boolean types, invalid stages, client owner/profile/result overrides and missing/malformed answer objects.
- [x] Empty answers and explicit null are accepted. False is distinct from unknown, zero income is supplied, and known failures retain missing facts.
- [x] PMSBY ages 17/18/69/70/71; PMJJBY 17/18/50/51; APY 17/18/39/40/41 tested. APY 40 requires exact birthday confirmation; PMSBY 70 defers to provider.
- [x] APY current/past tax status is explicit. Farmer occupation does not infer land ownership; income does not infer tax history or citizenship.
- [x] UP family context gates saved state/income. Income 0/300000/300001/null, unrelated family/state, stage selection and stage confirmation tested. Account-holder age is not the girl’s age.
- [x] Rule reasons, official references, version, review date, limitations and missing inputs are returned. Engine does not mutate its inputs.
- [x] POST makes no database writes. Extra answers are not retained on later GET; profiles/users remain unchanged. Reports use `Cache-Control: no-store`.
- [x] Screening POST has its own 60/minute limit. Existing explicit CORS, Helmet, 16KB body limits, unique emails, bcrypt, JWT and generic production errors pass regression checks.
- [x] Safe return paths preserve the screening query and reject external/protocol-relative/backslash/unknown/excessive destinations.
- [x] Axios rejection clears sessions; transient network failures retain tokens. Cross-tab account changes clear private report data and local extra answers.

## Browser checklist

- [x] Scheme detail → sign in → selected scheme screening preserves query. Workspace and dashboard expose available screening.
- [x] Missing saved facts are explained with profile links; Reload saved details uses current data and resets answers.
- [x] Yes/No/Not sure produce distinct match/failure/unknown states; edited answers hide outdated reports until resubmitted.
- [x] APY birthday/tax and PMSBY age-70 clarification paths work in the browser.
- [x] UP context, stage requirements and zero income work; changing stage clears the old confirmation.
- [x] All six supplied basic matches appear alphabetically with correct counts, reason disclosures and limitations. No ranking/approval score exists.
- [x] Selected scheme survives refresh; extra answers reset on refresh/departure/account switch. Only the JWT is present in localStorage.
- [x] Unknown scheme query falls back transparently; no-profile, load failure and POST failure states remain honest.
- [x] Slow submissions disable fields/selector and show loading. Failed POST preserves answers; failed GET retries successfully without logging out.
- [x] 401 clears private content/token and returns to login. Logout prevents protected re-entry. Original register/login/refresh/duplicate/validation flows pass.
- [x] Submission moves focus to the results heading; missing-question action moves focus to the question heading. Radio arrow keys and native disclosure Enter work; official links are focusable.
- [x] HTTPS official source destinations verified, including the regulator’s PFRDA `.org.in` reference. External provider uptime is not asserted.
- [x] Existing direct source anchors, mobile-menu closure/Escape/focus and native landing anchors pass catalog/foundation regression suites.
- [x] Notifications, loading controls, error alerts and zero unexpected runtime errors verified.

## Responsive and motion checklist

- [x] Every required width checks page overflow and usable questions/selects/cards/reasons. All six catalog details and public/auth pages pass earlier browser suite regressions.
- [x] Four mobile workspace entries fit a two-column navigation grid. Screening form/guide and result cards stack on smaller widths.
- [x] Desktop/mobile screenshots and viewport captures were visually inspected for spacing, hierarchy and controls.
- [x] Native focus outlines, radio focus rings, selected/hover/pressed styles and approximately 200ms page entrance remain available.
- [x] Reduced motion removes radio/card/disclosure transitions and page animation. Foundation reveal/navbar/hover reduced-motion checks pass.
- [x] Slow request loading states and success/error notifications verified without changing keyboard focus during typing.

## Reproduce

```powershell
npm run seed:schemes
npm test
npm run build
# Run API and production preview in separate terminals first:
npm run start -w server
npm run preview -w client
# Then:
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run audit:phase4
node scripts/create-postman.mjs
```

Local .env currently uses port 5175 with the matching exact API CORS origin; committed examples default to 5173. Audit Chrome debugging port 9335 must be free. Browser/audit tests create uniquely named synthetic accounts in the development database and leave them for inspection. API suites create/drop only their own uniquely named local test databases after an exact-name cleanup guard. No real citizen details or JWT secret are printed or required by the audit.

Ignored evidence: `reports/eligibility-browser-results.json`, all three prior browser result files, screening desktop/mobile full-page and viewport screenshots, `phase4-screening-lighthouse.{json,html}`, `phase4-detail-lighthouse.{json,html}`, `phase4-lighthouse-summary.json` and a synthetic audit browser profile. A screenshot’s transient toast is ordinary submission feedback.

## Boundaries and remaining limitations

These are static, partial, self-reported screening rules. Full current official terms and verification remain the provider’s responsibility; no independently labelled government-decision dataset was used. Official sites/PDFs can be unavailable or change. Indexed official content was used where direct source access failed; details and maintenance guidance are in [SCREENING-RULES.md](SCREENING-RULES.md). The source review is not an official endorsement. Existing bearer-localStorage, no server revocation, in-memory rate-limit and self-reported profile limitations remain.

No deployment, application readiness, chatbot, RAG, recommendations or document processing was added. No failing local acceptance check or unfinished in-scope feature remains. The intentional private-route crawlability and back/forward-cache diagnostics above remain recorded.

**PHASE 4 COMPLETE — EXPLAINABLE PARTIAL SCREENING ONLY**
