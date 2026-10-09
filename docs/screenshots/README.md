# Project screenshots

Captured **9 October 2026** from the local production frontend, after Phase 5 completion. Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844. These are full-page captures; pages can extend beyond one viewport. All citizen details and checklist marks shown are synthetic demo data. No real account, document, bank or identity data are used.

| Page                          | Desktop                           | Mobile                           |
| ----------------------------- | --------------------------------- | -------------------------------- |
| Landing page                  | [View](home-desktop.png)          | [View](home-mobile.png)          |
| Sign in                       | [View](login-desktop.png)         | [View](login-mobile.png)         |
| Registration                  | [View](register-desktop.png)      | [View](register-mobile.png)      |
| Scheme library                | [View](schemes-desktop.png)       | [View](schemes-mobile.png)       |
| PM-KISAN detail               | [View](scheme-detail-desktop.png) | [View](scheme-detail-mobile.png) |
| Dashboard                     | [View](dashboard-desktop.png)     | [View](dashboard-mobile.png)     |
| Citizen profile               | [View](profile-desktop.png)       | [View](profile-mobile.png)       |
| Partial eligibility screening | [View](eligibility-desktop.png)   | [View](eligibility-mobile.png)   |
| Saved schemes and preparation | [View](readiness-desktop.png)     | [View](readiness-mobile.png)     |

To reproduce, start the configured API and frontend, load the six schemes with `npm run seed:schemes`, then run `npm run screenshots` from the project root. The helper creates a unique synthetic demo account/profile and two saved schemes in the development database, leaving them available for inspection. It reads the local frontend/API origins, supports `FRONTEND_URL`, `API_URL` and `BROWSER_PATH` overrides, and never writes the session token into committed files. It defaults to installed Edge or Chrome, respects reduced motion during capture, waits for fonts/data and asserts no browser JavaScript exceptions.

Checklist completion and screening results are partial, self-reported guidance, not official approval. SarkariSaathi is an independent project and is not an official government service.
