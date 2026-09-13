# Startup SA

An interactive first product preview for discovering emerging South African startups, inspired by Outbid's compact leaderboard and the supplied Startup SA business plan.

## Run

Requires Node.js 22.13 or newer.

```sh
npm run install:ci
npm run dev
```

The preview URL is printed by the development server. `npm run build` creates the Cloudflare Worker bundle; `npx tsc --noEmit` checks TypeScript.

## Implemented

- Responsive discovery board with highlighted leading entries and an editorial sidebar.
- Separate sample vote totals for today, this week (default), this month and all time.
- Combined search, category and city filters, plus a new-launch feed.
- Reversible demo votes, stored on the current device.
- Startup detail dialogs with shareable `?startup=slug` URLs that reopen on refresh.
- Validated startup draft form with local persistence and restoration.
- Ranking and community rules, custom favicon, and a feature-detected WebMCP discovery tool.

## Explicit preview boundaries

All eight companies, founder names, vote totals and movement figures are fictional sample content. Voting is a local interaction, not a secure or shared community vote. Drafts are saved only in browser storage and are not submitted or published. No production founder accounts, email/domain verification, moderation queue, database, payments, newsletter or analytics are connected.

The planned weighted ranking described in the rules is not the implemented sample-vote sort. Monetary bids do not affect community ranks.

## Next implementation slice

Connect authenticated identities and durable startup, submission and vote records; enforce voting uniqueness and moderation on the server; add email/domain verification; then replace samples with approved real listings. Public submissions should remain closed until those flows are complete.

## Source

`app/page.tsx` contains the preview data and UI, `app/globals.css` contains the responsive visual system, and `app/webmcp.ts` exposes the discovery tool. `.openai/hosting.json` retains the private Sites project identity. The React/Vinext starter also includes optional D1 and auth scaffolding for later implementation.
