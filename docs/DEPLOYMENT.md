# Production startup, deployment and recovery

This phase prepares a **single Node service**; it does not publish a public deployment. The same Express process serves the built React site and `/api`. MongoDB remains a separate service. All phases are consolidated in `sarkari-saathi-ai`, with one lockfile and one Git repository on `main`.

## Local production-style run

Use Node 24, npm and the running local MongoDB service. From the repository root:

```powershell
npm ci
npm run setup
npm run seed:schemes
npm test
npm run build
npm start
```

`npm run setup` creates only missing `server/.env`, `client/.env` and `server/.env.production`. It generates a random JWT secret without printing it, retains the existing development database/secret for the local production configuration, and never overwrites files. Examples contain deliberately rejected placeholder secrets. If you have already copied an example with a placeholder, replace that value with a cryptographically random secret before setup/start. Secrets are ignored by Git.

The production example uses **http://localhost:5176**, including `/api`. In another terminal run `npm run check:health`; it waits up to 30 seconds for readiness. Existing custom production files are preserved, so check their actual port before running the helper. Set `FRONTEND_URL` if it differs. The production launcher forces `NODE_ENV=production` and `SERVE_CLIENT=true`; missing build output causes a clear startup failure before opening the database/listener. Build before starting and restart after replacing a release.

The consolidated local configuration retains database `sarkari_saathi_ai_phase7` and the Phase 7 secret. Earlier Phase 6 data still exists in MongoDB separately; no database was merged, deleted or copied into Git. Historical ignored verification reports and older local environment backups are retained under `reports/`, alongside the current verification outputs.

Stop the production process before running `npm run dev`: the preserved local development frontend also uses 5176, with API 5001. Fresh setup defaults for the optional development pair are frontend 5173/API 5000. `npm run preview -w client` is a build-preview tool; `npm start` is the actual production-style server.

## Hosting contract

For a Node host, select the repository root, Node 24 and a reachable MongoDB database. The generic `Procfile` contains `web: npm start`; no host-specific provisioning or paid resources are configured.

| Setting               | Required value or behavior                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Install               | `npm ci` with build/dev dependencies available                                                                              |
| Build                 | `npm run build`                                                                                                             |
| Start                 | `npm start`                                                                                                                 |
| `PORT`                | Host-provided listener port; default 5000 if not provided                                                                   |
| `MONGO_URI`           | Private reachable MongoDB URI; host secret storage                                                                          |
| `JWT_SECRET`          | At least 32 characters of random server-only material; replace placeholders                                                 |
| `JWT_EXPIRES_IN`      | Positive integer plus s/m/h/d; default 7d                                                                                   |
| `CLIENT_URL`          | Exact public HTTPS origin, e.g. `https://your-service.example.org`; no path, credentials, query, fragment or trailing slash |
| Health/readiness path | `/api/ready` for load-balancer readiness; `/api/health` for process liveness                                                |

Set variables in the hosting environment; they take precedence over the optional ignored local production file. Do not upload local `.env`, database backups, reports, authentication tokens or browser profiles. A production configuration is not generated into source control.

The built frontend uses relative `/api`, so the browser and API share the public origin. Development `.env` API URLs are intentionally ignored for the production build. For deliberately split hosting, set an **explicit build-process `VITE_API_URL=https://your-api.example.org/api`**, configure the exact frontend `CLIENT_URL`, and verify CSP/CORS and direct-route fallback on that host. This phase verifies the single-origin arrangement only. Vite variables are public build contents and must never contain secrets.

Terminate public HTTPS at a correctly configured host/reverse proxy. Remote production `CLIENT_URL` values using plain HTTP are rejected; loopback HTTP remains allowed for local verification. Express proxy trust stays disabled. Do not blindly enable `trust proxy`: with a proxy, this version may rate-limit by the proxy's address. Choose and test exact trusted proxy ranges/hops before scaling. The current rate limit stores are in process memory; use a shared store before multiple instances. Those changes are not silently assumed here.

Seed the reviewed six-scheme catalog explicitly once with `npm run seed:schemes` using the intended database and server environment. The seed is idempotent for those scheme records and preserves unrelated entries; startup never seeds or overwrites editorial content automatically. Rule/source review remains 8 October 2026; deployment is not a policy review.

## Health, caching and shutdown

- `GET /api/health` returns the original exact `{ success: true, message: "SarkariSaathi API is running" }`. It tests process liveness, not database availability.
- `GET /api/ready` returns `{ success: true, message: "SarkariSaathi API is ready" }` after a connected MongoDB ping. A disconnected/draining state or failed ping gives HTTP 503, `{ success: false, message }` and `Retry-After: 5`. The ping uses a 1500ms driver deadline. No database URI, credentials or topology are exposed.
- All API responses, including errors, use `Cache-Control: no-store`. HTML uses `no-cache` revalidation; fingerprinted files under `/assets/` use a one-year immutable cache. Site assets negotiate compression with Vary: Accept-Encoding; private API/token responses bypass that middleware. Missing API/asset/private paths keep safe errors rather than receiving the SPA document.
- Native SPA deep links such as `/discover?category=insurance`, `/profile` and `/schemes/pmsby` load through the production server. Protection of account data remains enforced by the API; returning the public application shell never grants access to private content.
- SIGINT/SIGTERM mark the app as draining, stop accepting connections, allow current HTTP requests to complete, disconnect MongoDB, and exit. A 10-second deadline closes remaining connections and exits with failure rather than hanging. Windows process-manager hard termination does not promise delivery of Unix signals; use an appropriate service supervisor on the chosen host.

Compression follows the [Express production performance guidance](https://expressjs.com/en/advanced/best-practice-performance/). These behaviors follow [Express static-serving guidance](https://expressjs.com/en/5x/starter/static-files/) and the [Node HTTP shutdown APIs](https://nodejs.org/docs/latest-v24.x/api/http.html#servercloseallconnections). No wildcard proxy trust, TLS termination or database backup is configured by this repository.

## Verification and CI

`npm test` runs API/domain/security tests, environment validation, static routing/cache tests, database readiness/outage/recovery and shutdown checks, plus translation and shortlist tests. Dedicated test databases are deleted only after their exact generated name is checked. Tests never drop development data.

With `npm start` running:

```powershell
npm run check:health
npm run test:production-browser
$env:API_URL = 'http://localhost:5176/api'
$env:FRONTEND_URL = 'http://localhost:5176'
npm run test:browser
npm run test:profile-browser
npm run test:schemes-browser
npm run test:eligibility-browser
npm run test:readiness-browser
npm run test:language-browser
npm run test:discovery-browser
npm run audit:phase8
```

The new production browser helper also runs on Linux using Playwright Chromium. Local checks use installed Edge/Chrome or `BROWSER_PATH`; CI installs Chromium. The GitHub workflow uses a temporary MongoDB service, generates an ephemeral secret without echoing it, builds, starts the single service, checks readiness and executes the production browser flow. Its repository permission is `contents: read`; it has no deployment credentials or publishing step. It does not upload browser storage or logs as public artifacts. See [Phase 8 verification](PHASE8-VERIFICATION.md) for the actual run status; a committed workflow alone is not proof of a successful GitHub run.

Browser helpers create synthetic accounts and leave them in the selected local development database for inspection. Authentication limits remain active; repeated suites can exhaust their in-memory limit. Wait for reset or restart only the intended local test/development process. Do not disable limits or perform an uncontrolled production restart to accommodate tests.

## Release and rollback

Deploy an immutable checkout/release directory, install the lockfile, build before switching traffic, and point readiness at `/api/ready`. Retain the preceding release and its matching public assets. Do not overwrite a running release's assets in place: existing browser tabs may still request old fingerprinted chunks. No service worker or offline cache is installed.

Before an actual deployment, take and verify a restorable backup with the database operator's supported tooling, keep the URI/backup outside Git, and record the intended database and source revision. Backup/restore procedures are operational instructions; a live backup/restore was not executed in this phase. No destructive migration is introduced.

If a release fails readiness, keep traffic on the previous healthy release. Roll back by restoring the previous built release with the same intended database and secrets, then check readiness and a synthetic sign-in/read flow. Rotating the JWT secret invalidates all existing tokens; routine application rollback should not rotate it. Logout remains a client-side token removal rather than immediate server revocation. Never restore a database simply to undo a frontend release.

No public host, domain, TLS certificate, managed database, distributed rate-limit store, operational alerting, real-user monitoring, backup schedule, AI/RAG/chatbot or application submission is part of this delivery.
