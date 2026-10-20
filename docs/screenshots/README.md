# Project screenshots

Captured **20 October 2026** from the consolidated Phase 8 production server at localhost:5176. Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844. These are full-page captures; pages can extend beyond one viewport. All citizen details and checklist marks shown are synthetic demo data. No real account, document, bank or identity data are used.

## English

| Page                          | Desktop                           | Mobile                           |
| ----------------------------- | --------------------------------- | -------------------------------- |
| Landing page                  | [View](home-desktop.png)          | [View](home-mobile.png)          |
| Sign in                       | [View](login-desktop.png)         | [View](login-mobile.png)         |
| Registration                  | [View](register-desktop.png)      | [View](register-mobile.png)      |
| Scheme library                | [View](schemes-desktop.png)       | [View](schemes-mobile.png)       |
| PM-KISAN detail               | [View](scheme-detail-desktop.png) | [View](scheme-detail-mobile.png) |
| Dashboard                     | [View](dashboard-desktop.png)     | [View](dashboard-mobile.png)     |
| Scheme shortlist              | [View](shortlist-desktop.png)     | [View](shortlist-mobile.png)     |
| Citizen profile               | [View](profile-desktop.png)       | [View](profile-mobile.png)       |
| Partial eligibility screening | [View](eligibility-desktop.png)   | [View](eligibility-mobile.png)   |
| Saved schemes and preparation | [View](readiness-desktop.png)     | [View](readiness-mobile.png)     |

## Hindi

Hindi text is the project's translation, not an official government translation. Brands, scheme acronyms, source URLs and citizen-entered values retain their original form.

| Page                          | Desktop                              | Mobile                              |
| ----------------------------- | ------------------------------------ | ----------------------------------- |
| Landing page                  | [View](hi-home-desktop.png)          | [View](hi-home-mobile.png)          |
| Sign in                       | [View](hi-login-desktop.png)         | [View](hi-login-mobile.png)         |
| Registration                  | [View](hi-register-desktop.png)      | [View](hi-register-mobile.png)      |
| Scheme library                | [View](hi-schemes-desktop.png)       | [View](hi-schemes-mobile.png)       |
| PM-KISAN detail               | [View](hi-scheme-detail-desktop.png) | [View](hi-scheme-detail-mobile.png) |
| Dashboard                     | [View](hi-dashboard-desktop.png)     | [View](hi-dashboard-mobile.png)     |
| Scheme shortlist              | [View](hi-shortlist-desktop.png)     | [View](hi-shortlist-mobile.png)     |
| Citizen profile               | [View](hi-profile-desktop.png)       | [View](hi-profile-mobile.png)       |
| Partial eligibility screening | [View](hi-eligibility-desktop.png)   | [View](hi-eligibility-mobile.png)   |
| Saved schemes and preparation | [View](hi-readiness-desktop.png)     | [View](hi-readiness-mobile.png)     |

To reproduce, start the configured API and frontend, load the six schemes with `npm run seed:schemes`, then run `npm run screenshots` from the project root. The helper creates a unique synthetic demo account/profile and two saved schemes in the development database, leaving them available for inspection. It reads the local frontend/API origins, supports `FRONTEND_URL`, `API_URL` and `BROWSER_PATH` overrides, and never writes the session token into committed files. It defaults to installed Edge or Chrome, respects reduced motion during capture, waits for fonts/data and asserts no browser JavaScript exceptions.

For Hindi in PowerShell, set `$env:SCREENSHOT_LANGUAGE='hi'` before the command, then `Remove-Item Env:SCREENSHOT_LANGUAGE` afterwards. Hindi captures use the `hi-` filename prefix. The combined gallery contains 40 images covering ten pages, two languages and two viewports. Startup/capture failures close the browser before propagating the error.

Checklist completion and screening results are partial, self-reported guidance, not official approval. SarkariSaathi is an independent project and is not an official government service.

## Additional feature captures

Synthetic test accounts, local production server, 20 October 2026.

| Page                | English desktop                  | English mobile                  | Hindi desktop                       | Hindi mobile                       |
| ------------------- | -------------------------------- | ------------------------------- | ----------------------------------- | ---------------------------------- |
| Application tracker | [View](applications-desktop.png) | [View](applications-mobile.png) | [View](hi-applications-desktop.png) | [View](hi-applications-mobile.png) |

| Personal reminders | [View](reminders-desktop.png) | [View](reminders-mobile.png) | [View](hi-reminders-desktop.png) | [View](hi-reminders-mobile.png) |
