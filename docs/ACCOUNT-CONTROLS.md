# Account controls

Open /account while signed in. Verification is optional and confirms mailbox access only; it does not verify identity, documents or scheme eligibility. English/Hindi screens are available. Account emails are currently English. Passwords retain whitespace and the existing 8-character minimum / 72-UTF8-byte maximum. User DTOs retain the original safe fields; hidden account metadata tracks verification, session versions and deletion.

## Local previews and SMTP

Loopback CLIENT_URL defaults to MAIL_MODE=preview. Private JSON messages are written under ignored reports/mail; open the appropriate file locally and copy its link into the browser. No public preview endpoint exists and nothing is sent externally. These files contain active sensitive links; keep them private, do not share them or commit them, and remove old previews when no longer needed. The preview folder is not served by Express. Local account cleanup also removes matching previews.

Remote origins default to disabled email. Preview mode is rejected outside loopback. For deployment choose MAIL_MODE=smtp and set SMTP_HOST, SMTP_PORT (587 with SMTP_SECURE=false and required STARTTLS, or 465 with SMTP_SECURE=true), SMTP_USER, SMTP_PASS and SMTP_FROM (a provider-authorized sender address). Use the ignored server environment or host variables. Examples contain only commented SMTP placeholders. Certificate checks remain enabled. SMTP credentials/links are never logged. File and URL attachment access are disabled. No paid integration, provider account, public deployment or real external email test was performed.

Requests queue delivery in process and return a generic acknowledgement. A crash can lose pending mail; requesting another link safely replaces the old one. Delivery errors are logged without recipients, tokens or provider credentials. This is not a durable email-delivery queue or a claim of delivered mail. Server shutdown waits for pending mail within the existing bounded shutdown deadline.

## API

All paths below begin /api/account. Existing bearer authentication applies to protected requests. Bodies are strict JSON; arbitrary owner fields and query parameters on actions are rejected. Errors use { success:false, message }. No action returns a raw email-link token.

| Method/path                | Body                             | Access/result                                                           |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| GET /capabilities          | none                             | Public: success, mailMode only                                          |
| GET /                      | none                             | Protected: success, emailVerifiedAt, mailMode                           |
| POST /request-reset        | {email}                          | Public, identical acknowledgement for existing/unknown valid email      |
| POST /reset-password       | {token,password}                 | Public: success message; no automatic sign-in                           |
| POST /request-verification | {}                               | Protected: request latest verification link                             |
| POST /verify-email         | {token}                          | Public: explicit confirmation; no automatic sign-in                     |
| DELETE /profile            | {password,confirmed:true}        | Protected: delete profile only; preserves preparation/tracker/reminders |
| DELETE /                   | {password,confirmation:"DELETE"} | Protected: 202 account disabled and cleanup queued                      |

Issuance has a shared 6-attempt/15-minute per-IP limit (invalid/unknown requests count). Consumption has 20 attempts/15 minutes; destructive actions have 10. Limits are in-memory per process; a multi-instance deployment needs a shared rate-limit store and reviewed proxy configuration. Reset acknowledgements have a 300ms minimum response time and do not wait for SMTP; this is mitigation, not a guarantee against statistical timing analysis under all loads.

## Links and sessions

Tokens use 32 random bytes, stored only as SHA-256 hashes in MongoDB, single-use and replaced on resend. Reset links expire after 30 minutes; verification after 24 hours. Expiry is checked in queries independently of MongoDB TTL cleanup. Links use fragments, are removed from the address bar when read, stay only in page memory and are never stored in localStorage. Reloading after removal requires opening the original email link again. Verification waits for an explicit confirmation button. Invalid/expired/used links return 400, preserving any otherwise valid signed-in session.

Password reset atomically increments a hidden session version and invalidates outstanding action tokens. Old JWTs fail on their next request; existing legacy JWTs are treated as version zero until reset. Logout alone still clears the browser session and leaves tokens valid until expiration. No email change flow is provided.

## Deletion and recovery

Profile-only deletion requires the current password and confirmation; it removes the citizen details used in screening, preserving other records. An already accepted concurrent profile save can create a new profile, so close other editing tabs first.

Account deletion requires current-password confirmation plus exact DELETE text. A durable cleanup job is created before sign-in is disabled, then owner-scoped Profile, SavedScheme, Application, Reminder, StaffAccess and AccountAction rows and the User are purged. This is intentionally not described as an atomic multi-collection transaction on standalone MongoDB. A failed cleanup keeps sign-in disabled and retries on startup and every minute while the server runs. A queued job never purges an active account if disablement did not happen. Completed jobs repeat cleanup for 24 hours to catch writes accepted before disablement; then MongoDB TTL expires the minimal journal (user ID and timestamps only). Retention is not extended on each sweep. Restore normal server/database operation to resume pending cleanup. Public scheme content and its audit history retain opaque actor IDs without account names/emails. Operator database backups and already delivered external email are outside app deletion.

## Manual checks / Postman

Import Account-controls.postman_collection.json separately. It creates a new synthetic account. The first request initializes its unique email; registration captures token. Request verification, open the private preview, and copy only the fragment token into verificationToken to run verification. Request reset and set resetToken from the new preview; resetting captures no session, so sign in again using nextPassword. Reset/verification requests with unset token variables are skipped in the runner. Destructive requests additionally require allowDelete=true; use only the synthetic account. The original collection remains available for the earlier phases. Postman desktop was not run; JSON and scripts are checked locally, with equivalent HTTP flows tested against MongoDB.

Security design references: [OWASP forgot-password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) and [Nodemailer SMTP options](https://nodemailer.com/smtp). Verification results are recorded in ADDITIONS-PROGRESS.md.
