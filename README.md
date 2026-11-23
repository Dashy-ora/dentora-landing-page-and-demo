# Dentora landing site and demo (LANDING-01)

The public, bilingual Dentora website. Arabic is the default (RTL, at `/`), English lives under `/en`. Content is managed from the system dashboard (Website module) and read from the backend's public site API (W61, OpenAPI 0.62.0, tag "Public site"). The clinic-portal demo build is served at `/demo/app`.

Design spec: `docs/superpowers/specs/2026-11-23-dentora-website-landing-demo-design.md` (section 7).

## Stack

Next.js 16.4.6 (App Router, Cache Components: `use cache`, `cacheLife`, `cacheTag`), React 19, Tailwind 4.3.4, Flowbite 4.0.2. Read `node_modules/next/dist/docs/` before changing framework code: this Next version differs from older ones.

The look is the Dentora UI kit, copied byte for byte from the clinic portal (owner decision): `app/styles/tokens.css`, `app/styles/kit.css`, the `@theme inline` mapping and `@font-face` rules at the top of `app/globals.css` (a copy of the portal's `src/index.css`), the Flowbite plugin and the self-hosted Sora and Tajawal fonts in `public/fonts`. Light and dark mode is `.dark` on `<html>`. Do not edit those files here. To pick up a portal change, copy the files again and run `node scripts/kit-lock.mjs`; the drift test (`tests/kit-drift.test.ts`) fails while the copy, the pinned `ui-kit.lock.json` and the portal disagree.

## Run it

```bash
cp .env.example .env.local     # local, uncommitted; fill in the values
npm install
npm run sync:demo              # copy the portal demo build (see below), once and after every portal demo change
npm run dev                    # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | unit tests (`node:test` through `tsx`): blocks, RTL, offer window, forms, fallback, signature, kit drift |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | production build and server |
| `npm run check` | tests, lint and build |
| `npm run sync:demo` | copy the portal demo build into `public/demo/app` |

With nothing published in the backend (or no backend), every page shows the plain "Back soon" page. Publish the four website areas from the dashboard once (landing, demo, offers, forms) and the site fills in.

## Configuration

All in `.env.local` (never committed; `.env.example` is the template).

| Variable | Purpose |
|---|---|
| `DENTORA_API_URL` | Backend origin, for example `http://127.0.0.1:8000`. `/api/v1` is added for you. |
| `LANDING_REVALIDATE_SECRET` | Shared secret for the signed refresh call; at least 16 characters, identical to the backend's `LANDING_REVALIDATE_SECRET`. |
| `PORTAL_TRIAL_URL` | Target of every "Start a trial" button. |
| `SITE_URL` | This site's public origin: canonical URLs, hreflang, sitemap, the same-origin check on form posts. |
| `LANDING_TRUSTED_PROXY_HOPS` or `LANDING_CLIENT_IP_HEADER` | Optional: where to read the visitor address from (see "Production"). |
| `PORTAL_DEMO_DIST` | Where `sync:demo` reads the portal demo build from. |

## Routes

| Route | What |
|---|---|
| `/[[...slug]]`, `/en/[[...slug]]` | Any published CMS page by slug (`home`, `pricing`, `features`, `features/<group>`, `contact`, `about`, `terms`, `privacy` and custom pages, one nesting level). |
| `/demo`, `/en/demo` | Demo intro from the published demo settings with an "Open the demo" button; a trial call to action (and the trial-interest form) when the demo is switched off or unpublished. |
| `/demo/app/*` | The static clinic-portal demo build. Deep links fall back to `index.html`. |
| `/api/forms/{form}` | Same-origin proxy to `POST /public/site/forms/{form}`. |
| `/api/revalidate` | Signed refresh call from the backend (HMAC-SHA256). |
| `/sitemap.xml`, `/robots.txt` | From the published page list. |

Block types render one component each (`components/blocks`). Button actions map as `start_trial` to `PORTAL_TRIAL_URL`, `book_demo` to the contact page's demo request form, `open_demo` to `/demo/app`, `contact` to the contact page, `page:<slug>` and `url:<https>` as written.

## How data is cached

Server components read the public endpoints through cached functions (`lib/data.ts`): `use cache` with `cacheTag(<area>)` and a short `cacheLife` (revalidate 60 seconds) as a safety net, which also keeps live catalog prices fresh. A signed `POST /api/revalidate` from the backend revalidates the area's tag at once. Offers are filtered again by `starts_at`/`ends_at` at request time, so an offer ends on time even from a cached copy. If the backend fails, the last good copy this server saw is served (`lib/fallback.ts`); a 404 (unpublished or switched off) clears the copy; with no copy at all the page shows "Back soon". The in-memory copy is per server process: on several instances each has its own.

## The demo

The demo is the real clinic portal built in demo mode, running on sample data in the visitor's browser. It is not part of this repo and must be synced in **before `next build` and before every deploy** (the files are copied into `public/demo/app`, which is gitignored):

```bash
cd <clinic-portal>
npm run build:demo             # writes dist-demo/ with base path /demo/app/
cd <this repo>
npm run sync:demo              # PORTAL_DEMO_DIST overrides the source folder
npm run build
```

`sync:demo` refuses a folder that is not a demo build. Without it `/demo` still works but "Open the demo" leads nowhere.

## Production

- **Reads need no sign-in.** The site calls the public endpoints from the server only, with `Accept: application/json` and nothing else: one Host, no Authorization, no Forwarded or X-Forwarded-* headers, no Origin. That satisfies the public-host admission style used by the backend (TLS, one Host, no forwarded authority, no credentials, same-origin, bounded per source). In production point `DENTORA_API_URL` at the backend's `https` origin; the W61 public endpoints do not enforce TLS themselves, but the older W32 website endpoints (`PublicWebsiteController`) do.
- **Read limit.** The backend limits public reads to 300 per minute per source address. All server-side reads come from this server's address; caching keeps the real number far below that, but do not run many uncached instances behind one address without checking.
- **Form submissions and the visitor address.** The browser posts to this site, which forwards to the backend with the visitor address as `X-Forwarded-For`, so the backend's limit of 5 per address per form per 10 minutes applies per visitor. The backend honours that header only from addresses listed in its `IDENTITY_TRUSTED_PROXIES`: add this server's egress address there. On this side, say where the visitor address comes from: `LANDING_TRUSTED_PROXY_HOPS=1` when exactly one reverse proxy appends to `X-Forwarded-For`, or `LANDING_CLIENT_IP_HEADER=cf-connecting-ip` (or similar) when a CDN overwrites a header. With neither set the header is never trusted (a visitor could otherwise pick their own address) and the backend sees this server's address, so all visitors share one limit. Local development works that way.
- **Refresh call.** Set `LANDING_REVALIDATE_SECRET` here and the same value plus `LANDING_REVALIDATE_URL=https://<site>/api/revalidate` on the backend. The backend signs `"<timestamp>.<raw body>"` with HMAC-SHA256 (`X-Dentora-Signature: sha256=<hex>`, `X-Dentora-Timestamp`); this site rejects other signatures and timestamps more than 5 minutes away. Without it, content still refreshes within about a minute.
- **TLS and hosting.** Serve the site over HTTPS behind your proxy/CDN. Set `SITE_URL` to the public https origin. The demo build must be synced before the build, as above.
- **Images.** Backend media URLs are used as returned (absolute, or root-relative to the backend origin). Production image storage is a go-live item on the backend side.

## Known limits

- An unknown URL renders the 404 page with `noindex`, but the HTTP status is 200 because the page streams (Cache Components). A true 404 status would need a `proxy.ts` slug check; not done.
- The sitemap and `robots.txt` are generated on request from the published page list.
