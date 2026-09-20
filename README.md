# Startup SA

South African startup discovery with a compact community leaderboard. React/Vinext runs on Cloudflare Workers; Supabase provides Postgres and authenticated identities.

## Development

Node.js 22.13+ is required. Run `npm run install:ci`, put runtime credentials matching `.env.example` in ignored `.dev.vars`, then run `npm run dev`. Production environment values are configured in Sites; never put secrets in `.openai/hosting.json` or browser code.

`npm run build` builds the Worker. `npx tsc --noEmit` checks types. `npm run test:database` runs the Postgres migration and permission tests in an isolated PGlite database.

## Connected flows

- Email-code sign-in: server generates a Supabase OTP and sends it using the configured Resend sender. The browser verifies the code directly with Supabase. No project-wide auth templates are changed.
- Founders submit validated listings. Database ownership is derived from the verified session, never from submitted owner IDs. Retry IDs prevent duplicate submissions after uncertain network responses.
- Submissions remain private to their owner and Startup SA moderators. Moderators can approve or reject, and rejection requires a reason. Approved listings become public atomically.
- Voting does not require sign-in. A signed HttpOnly SameSite cookie identifies the browser for one durable vote per startup. Browser identity hashes remain server-side; client-supplied voter IDs are not accepted. Rate limits allow 60 changes/browser/hour and 200 changes/network/hour. Network keys are daily HMAC hashes, not raw IP addresses, and limit rows expire after 24 hours. Clearing cookies, cookie expiry or changing browsers can bypass uniqueness; this is not one-person-one-vote.
- Public boards combine legacy account votes and browser votes in South African calendar windows: today, Monday-start week, month and all time. Ties use publication date descending and then ID. Toggling keeps the original vote date. When an authenticated user changes a legacy vote, it transfers to their current browser without double-counting. Historical votes from an unknown signed-out account cannot be linked to a browser. Submission and admin authentication is unchanged.
- Review history is visible under My account. Admin controls require a database moderator role, checked on every review operation.
- Startup profiles have full routes at `/startups/[slug]`; old `?startup=` links redirect. Voting, sharing and external website links remain available on the detail page.
- Optional PNG/JPEG/WebP logos are resized/re-encoded in the browser as PNG (5 MB input limit; 4096px maximum input dimension; 512px output). The server validates size and PNG dimensions. Private Supabase Storage serves pending logos only to the owner/moderator; approved logos are visible with their listing. The database validates the uploader before attaching a logo. Uploading a logo is currently part of a new submission, not an edit to an existing listing.
- Submission and approval events atomically queue email notifications. Server routes send to the verified account email through Resend, never a recipient supplied by the browser. Durable sent markers, a two-minute lease and Resend idempotency keys protect normal retries against duplicates. Provider idempotency expires after 24 hours; an ambiguous send followed by a database failure can still duplicate after that window.
- Failed email attempts remain queued. Opening My account/Admin retries eligible messages, then retries every minute while that window is open. There is no always-running background scheduler yet. Email trouble does not roll back a saved submission or approval; the account UI shows when mail is waiting.

## Shared project boundaries

Startup SA reuses the FinanceAPP Supabase project by owner request. Its objects are `startup_moderators`, `startup_submissions`, `startups`, `startup_votes`, app-specific RPCs and the unexposed `startup_private` schema. The existing finance tables and their policies are unchanged. Accounts use the same Supabase identity directory; sessions are stored separately on each app's origin.

The browser receives only the public URL and publishable/anon key. The service key is used only on the server for OTP generation, email throttling, notification delivery and private logo storage. No database connection password is deployed. Domain ownership is not automatically verified: listings say “Reviewed listing,” not “Verified company.”

## Database operations

The initial migration is in `supabase/migrations/202609130001_startup_sa.sql`. It has been applied to the shared project; do not reapply or edit it. Future changes need new migrations.

`scripts/migrate-startup-supabase.mjs ENV_FILE CA_CERT` refuses collisions and preserves existing tables. `scripts/verify-startup-live.mjs ENV_FILE CA_CERT` checks the real database inside one transaction and rolls back all fixtures without sending emails.

After the owner supplies the exact admin email and that account has verified its email, run `scripts/set-startup-moderator.mjs ENV_FILE CA_CERT APPROVED_EMAIL`. Never automatically promote the first person to sign in.

## Launch status

The Site remains private. Email sign-in uses six-digit codes and khanyetariq@gmail.com has moderator access. Notification receipt in a real inbox should be checked during the next user submission and approval; automated tests do not send mail to real users. No fictional listings are seeded into Supabase.

Company/domain ownership verification, weighted engagement ranking, edit-and-resubmit, reports/takedowns, newsletter, payments and analytics are subsequent product work. Current ranking is transparent vote totals, not the future blended score from the business plan.
