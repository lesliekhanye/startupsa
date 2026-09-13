# Startup SA

South African startup discovery with a compact community leaderboard. React/Vinext runs on Cloudflare Workers; Supabase provides Postgres and authenticated identities.

## Development

Node.js 22.13+ is required. Run `npm run install:ci`, put runtime credentials matching `.env.example` in ignored `.dev.vars`, then run `npm run dev`. Production environment values are configured in Sites; never put secrets in `.openai/hosting.json` or browser code.

`npm run build` builds the Worker. `npx tsc --noEmit` checks types. `npm run test:database` runs the Postgres migration and permission tests in an isolated PGlite database.

## Connected flows

- Email-code sign-in: server generates a Supabase OTP and sends it using the configured Resend sender. The browser verifies the code directly with Supabase. No project-wide auth templates are changed.
- Founders submit validated listings. Database ownership is derived from the verified session, never from submitted owner IDs. Retry IDs prevent duplicate submissions after uncertain network responses.
- Submissions remain private to their owner and Startup SA moderators. Moderators can approve or reject, and rejection requires a reason. Approved listings become public atomically.
- Public boards count active votes in South African calendar windows: today, Monday-start week, month and all time. Ties use publication date descending and then ID. One vote record per account per startup; toggling keeps the original vote date.
- Review history is visible under My account. Admin controls require a database moderator role, checked on every review operation.
- Profile links reopen the correct record after loading. Real website links use only HTTP(S). Missing configuration shows a labelled demo; a failed live connection shows an error rather than silently substituting samples.

## Shared project boundaries

Startup SA reuses the FinanceAPP Supabase project by owner request. Its objects are `startup_moderators`, `startup_submissions`, `startups`, `startup_votes`, app-specific RPCs and the unexposed `startup_private` schema. The existing finance tables and their policies are unchanged. Accounts use the same Supabase identity directory; sessions are stored separately on each app's origin.

The browser receives only the public URL and publishable/anon key. The service key is used only on the server for OTP generation and email throttling. No database connection password is deployed. Domain ownership is not automatically verified: listings say “Reviewed listing,” not “Verified company.”

## Database operations

The initial migration is in `supabase/migrations/202609130001_startup_sa.sql`. It has been applied to the shared project; do not reapply or edit it. Future changes need new migrations.

`scripts/migrate-startup-supabase.mjs ENV_FILE CA_CERT` refuses collisions and preserves existing tables. `scripts/verify-startup-live.mjs ENV_FILE CA_CERT` checks the real database inside one transaction and rolls back all fixtures without sending emails.

After the owner supplies the exact admin email and that account has verified its email, run `scripts/set-startup-moderator.mjs ENV_FILE CA_CERT APPROVED_EMAIL`. Never automatically promote the first person to sign in.

## Launch status

The Site remains private. Production email delivery still needs an actual user-requested sign-in to verify receipt. A moderator email must be selected before the review queue can be operated by the owner. No fictional listings are seeded into Supabase.

Company/domain ownership verification, weighted engagement ranking, edit-and-resubmit, reports/takedowns, newsletter, payments and analytics are subsequent product work. Current ranking is transparent vote totals, not the future blended score from the business plan.
