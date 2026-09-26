# Startup SA — launch readiness

Updated 22 September 2026. Changes are local; this task did not deploy the site, change DNS, send real emails, or alter the shared Supabase database.

## Email templates

Sign-in, submission receipt and approval now use a shared branded HTML template with plain-text alternatives. The design uses the updated monochrome theme: white/near-white surfaces, charcoal text and buttons, neutral gray details, and near-black dark-mode cards with light buttons. It includes responsive tables, inline fallback styles, dark-mode CSS, escaped user content, HTTPS links, accessible text, and no remote fonts or tracking pixels.

Run `node scripts/preview-emails.mjs` to generate six light/dark previews under `outputs/email-previews/`. Desktop and 390px previews were visually checked. Actual Gmail, Outlook and Apple Mail delivery/rendering remains an inbox acceptance test; clients that ignore dark-mode CSS retain the readable inline light palette.

## Security coverage

| Area | Implementation / verification |
| --- | --- |
| Secrets | `.env*` and `.dev.vars*` ignored; `.env.example` contains placeholders and public configuration only. Private paths return 404. Git history and browser bundles scanned without printing secret values. |
| Browser configuration | Only validated Supabase publishable/anon credentials are exposed. Service-role and Resend keys remain server-side. Production misconfiguration fails closed instead of showing fictional demo listings. |
| Identity | Server verifies Supabase bearer tokens and verified email status. RPCs derive ownership from `auth.uid()`. Submitted owner IDs do not grant access. |
| Permissions | RLS isolates submissions/votes; moderator checks protect review/admin RPCs. Account queries explicitly filter ownership. Reviews now check moderator status before privileged reads. |
| Database | Existing SQL uses parameterised RPC inputs and database constraints. Disposable Postgres tests verify other-user access, admin roles, voting, ownership and moderation. No Firebase or NoSQL backend exists in this app. |
| Live anonymous checks | Private submissions, votes, moderator records, email outbox, dashboard RPC and storage enumeration denied or empty using only the public key. No live records changed. |
| Errors | Submission/review responses no longer return raw database messages. Custom error page omits stack traces. Production source maps and mock sign-in are disabled. |
| Uploads | Browser resizes/re-encodes logos to PNG. Server validates full PNG chunks, CRCs, dimensions, decoded scanline bounds and filter bytes; rejects trailing payloads and unknown chunks; strips allowed metadata. Private storage ownership is enforced before attachment. |
| Upload retries | Failed/ambiguous edits do not delete the possibly committed logo. Orphaned uploads from genuinely failed edits may require an operator cleanup job after reference checks. |
| Abuse controls | Existing database login limits: one request per email/minute, five/hour, ten/network/ten minutes. Five submissions/owner/day and voting limits are retained. Login identifiers now use HMAC; sign-in and submission forms have honeypots. |
| HTTP protections | Per-response nonce CSP, no eval in production, same-origin API restrictions, anti-framing, nosniff, referrer/permissions policy, non-local HTTPS redirects and HSTS. Private pages/API responses use no-store. |
| Untrusted users | HTTP tests cover forged owner IDs, unauthenticated mutations, cross-origin calls, invalid login/honeypot data, private files and admin access. |

Application limits do not establish the shared Supabase project's direct Auth API rate limits or CAPTCHA configuration. Review those in the Supabase dashboard before launch without disrupting FinanceAPP. Live infrastructure TLS/DNS, storage settings drift, backups and provider-level controls require a deployment/account review; code tests are not a full penetration test.

## Privacy, SEO and usability

- Privacy and terms pages use `startupsSA`, `central@summit88.co.za` and `https://startupsafrica.summit88.co.za`. Privacy text describes public listing fields, private review data, cookies, retention, providers, shared authentication and rights/contact options. Operator review of actual retention and cross-border processing arrangements remains necessary.
- PostHog is integrated for public-page views, selected actions, and masked session replay, with query/hash stripping and private-route filtering. Sign-in dialogs are excluded from replay and automatic click capture is disabled. Collection requires a public PostHog project key (`phc_`); the ingestion host defaults to US Cloud. Cookieless mode must be enabled in the PostHog project.
- Titles/descriptions, Open Graph/Twitter metadata, a 1200×630 compressed PNG social card, SVG favicon and Apple touch icon are present. Public startup details and metadata render on the server; missing listings return 404.
- `/robots.txt` and `/sitemap.xml` use the canonical site configuration. Public pages are open to indexing; private routes stay excluded.
- Custom 404/error pages provide recovery navigation. Privacy/terms/contact links are available site-wide. The homepage has one prominent submission CTA and a secondary sign-in control.
- Increased contrast for secondary text, visible keyboard focus, reduced-motion support, mobile forms, logo alt text/dimensions and lazy decoding/loading are included. Checked homepage at 320px and submission/sign-in at 390px without horizontal overflow; this is not a full WCAG audit.
- Vinext's production RSC Link runtime failed during browser testing. Internal links use a small standard-anchor component, and CTA navigation loads a new document. This restores reliable navigation and refreshes CSP nonces; reconsider client navigation when the framework issue is resolved.

## Checks and observed performance

- `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` pass. Lint has no errors or warnings.
- `node scripts/verify-http-security.mjs http://localhost:5174` passed 25 checks with backend bindings. The local Wrangler worker requires a small gap between early-rejected requests; rapid synthetic requests produced its explicit “worker restarted mid-request” 503 message. No production load-test claim is made.
- `node --use-system-ca scripts/check-anonymous-access.mjs` passes read-only live Supabase checks.
- `node scripts/check-secrets.mjs` checks all reachable Git commits, current files and built browser assets. Pattern and configured-value scans are useful checks, not proof no unknown secret exists.
- `npm audit --omit=dev` reported zero vulnerabilities after updating `baseline-browser-mapping` to its patched version. Development dependencies are outside that audit scope.
- Local production response samples: homepage 10–51ms / 31,432 bytes; privacy page 6–7ms / 25,838 bytes; live leaderboard API 230–873ms / 1,227 bytes; social card 3–4ms / 44,235 bytes. These are localhost request timings, not Lighthouse/Core Web Vitals or mobile network measurements. The duplicate initial leaderboard fetch was removed.

## Deployment handover

1. Configure the existing private Supabase/Resend values on the deployment platform; do not commit credentials or copy `.dev.vars` into public assets.
2. Public defaults already match the supplied domain, legal name and contact. Environment variables `SITE_URL`, `LEGAL_ENTITY_NAME` and `PRIVACY_CONTACT_EMAIL` can override them.
3. Verify domain TLS, live security headers, transactional sender/domain configuration and actual inbox delivery. Complete one founder submission/edit and moderator approval with authorised accounts.
4. Configure PostHog, enable cookieless mode, and verify public-page collection and private-route exclusions against actual collected events.
5. Confirm legal text against actual operations and provider arrangements.

References: [PostHog web analytics installation](https://posthog.com/docs/web-analytics/installation), [PostHog session replay controls](https://posthog.com/docs/session-replay), [POPIA legislation](https://www.justice.gov.za/legislation/acts/2013-004.pdf), [Information Regulator contact](https://inforegulator.org.za/contact-us/).
