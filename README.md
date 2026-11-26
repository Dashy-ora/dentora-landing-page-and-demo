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
| `npm run test:routes` | after a build: starts the server with no backend (unset, 503, 404, bad body, refused) and checks every route, the 404s, forms and revalidate |
| `npm run check` | tests, lint, build and the route check |
| `npm run sync:demo` | copy the portal demo build into `public/demo/app` |

The site works with no backend at all: see "Running with no backend" below. With a backend, publish the four website areas from the dashboard once (landing, demo, offers, forms) and the live content replaces the built-in defaults.

## Configuration

All in `.env.local` (never committed; `.env.example` is the template).

| Variable | Purpose |
|---|---|
| `DENTORA_API_URL` | Backend origin, for example `http://127.0.0.1:8000`. `/api/v1` is added for you. |
| `LANDING_REVALIDATE_SECRET` | Shared secret for the signed refresh call; at least 16 characters, identical to the backend's `LANDING_REVALIDATE_SECRET`. |
| `PORTAL_TRIAL_URL` | Optional. Target of every "Start a free trial" button. Empty means the trial request form on the Contact page (`/contact#trial-interest`, `/en/...` in English). Set it only to a real self-service sign-up page: the clinic portal has no sign-up. |
| `SITE_URL` | This site's public origin: canonical URLs, hreflang, sitemap, the same-origin check on form posts. |
| `LANDING_TRUSTED_PROXY_HOPS` or `LANDING_CLIENT_IP_HEADER` | Where to read the visitor address from; set one, never both. On Vercel: `LANDING_CLIENT_IP_HEADER=x-real-ip` only (see "Production" and "Security notes"). |
| `LANDING_FORMS_SECRET` | Optional: signs forwarded forms so the backend's form limit counts per visitor on any host (see "Deploy on Vercel"). |
| `PORTAL_DEMO_DIST` | Where `sync:demo` reads the portal demo build from. |

## Routes

| Route | What |
|---|---|
| `/[[...slug]]`, `/en/[[...slug]]` | Any published CMS page by slug (`home`, `pricing`, `features`, `features/<group>`, `contact`, `about`, `terms`, `privacy` and custom pages, one nesting level). |
| `/demo`, `/en/demo` | Demo intro from the published demo settings with an "Open the demo" button; a trial call to action (and the trial-interest form) when the demo is switched off, or when the demo build is not synced in. |
| `/demo/app/*` | The static clinic-portal demo build. Deep links fall back to `index.html`. |
| `/api/forms/{form}` | Same-origin proxy to `POST /public/site/forms/{form}`. |
| `/api/revalidate` | Signed refresh call from the backend (HMAC-SHA256). |
| `/api/*` (anything else) | A plain 404 (`app/api/[[...path]]/route.ts`), never a page. |
| `/sitemap.xml`, `/robots.txt` | From the published page list. |

Block types render one component each (`components/blocks`). Button actions map as `start_trial` to `PORTAL_TRIAL_URL` (default: the Contact page's trial request form), `book_demo` to the contact page's demo request form, `open_demo` to `/demo/app`, `contact` to the contact page, `page:<slug>` and `url:<https>` as written.

## How data is cached

Server components read the public endpoints through cached functions (`lib/data.ts`): `use cache` with `cacheTag(<area>)` and a short `cacheLife` (revalidate 60 seconds) as a safety net, which also keeps live catalog prices fresh. A signed `POST /api/revalidate` from the backend revalidates the area's tag at once. Offers are filtered again by `starts_at`/`ends_at` at request time, so an offer ends on time even from a cached copy. Every read falls back in this order: the live API, then the last good copy this server saw (`lib/fallback.ts`), then the built-in defaults. A 404 clears the copy (so an unpublish is never masked by stale content) and the defaults answer instead; so does a verified signed refresh, which drops every copy of its area. A copy older than 10 minutes (`MAX_LAST_GOOD_AGE_MS`) is never served. The in-memory copy is per server process: on several instances each has its own, and a refresh only reaches the instance that received it, so the age limit is what bounds an old copy on the others.

## The demo

The demo is the real clinic portal built in demo mode, running on sample data in the visitor's browser. It is built in the clinic portal and copied into `public/demo/app`, which **is committed here**, so a deploy from this repo alone has a working demo with no backend and no portal checkout. After every portal demo change, rebuild, sync and commit the folder:

```bash
cd <clinic-portal>
npm run build:demo             # writes dist-demo/ with base path /demo/app/
cd <this repo>
npm run sync:demo              # PORTAL_DEMO_DIST overrides the source folder
npm run build
```

`sync:demo` refuses a folder that is not a demo build. `next build` works without `public/demo/app`: `/demo` then shows the trial call to action and the trial-interest form, and "Open the demo" buttons in pages are left out, so no link leads nowhere (`lib/demo-build.ts` checks for `public/demo/app/index.html` on each request). `/demo/app` itself needs no backend and no server code: it is static files, every portal API call is answered in the visitor's browser, nothing loads from another origin, and the one optional request (`GET /api/v1/public/site/demo`, answered by this site) falls back to the built-in settings when it fails. The root opens straight into the sample clinic. Deep links (`/demo/app/c/...`) serve `index.html`; a missing file under `/demo/app` (a dot in the path) answers a plain 404, never HTML. On a plain static host, serve `index.html` for paths under `/demo/app` without a dot.

## Production

- **Reads need no sign-in.** The site calls the public endpoints from the server only, with `Accept: application/json` and nothing else: one Host, no Authorization, no Forwarded or X-Forwarded-* headers, no Origin. That satisfies the public-host admission style used by the backend (TLS, one Host, no forwarded authority, no credentials, same-origin, bounded per source). In production point `DENTORA_API_URL` at the backend's `https` origin; the W61 public endpoints do not enforce TLS themselves, but the older W32 website endpoints (`PublicWebsiteController`) do.
- **Read limit.** The backend limits public reads to 300 per minute per source address. All server-side reads come from this server's address; caching keeps the real number far below that, but do not run many uncached instances behind one address without checking.
- **Form submissions and the visitor address.** The browser posts to this site, which forwards to the backend with the visitor address as `X-Forwarded-For`, so the backend's limit of 5 per address per form per 10 minutes applies per visitor. The backend honours that header only from addresses listed in its `IDENTITY_TRUSTED_PROXIES`: add this server's egress address there. On this side, say where the visitor address comes from, with exactly one of: `LANDING_TRUSTED_PROXY_HOPS=1` when exactly one reverse proxy you run appends to `X-Forwarded-For`, or `LANDING_CLIENT_IP_HEADER=<header>` naming a header the platform or CDN always overwrites. On Vercel use only `LANDING_CLIENT_IP_HEADER=x-real-ip`. A CDN header such as `cf-connecting-ip` is safe only when the origin cannot be reached except through that CDN; on Vercel that also means protecting the `*.vercel.app` and deployment URLs (Deployment Protection, or a firewall rule), or a visitor calls them directly, sends the header themselves and picks their own address. If both variables are set the header wins and the server logs one warning. With neither set the header is never trusted (a visitor could otherwise pick their own address) and the backend sees this server's address, so all visitors share one limit: local development works that way, and with `DENTORA_API_URL` set the server logs one warning per process saying so. Addresses with a zone ID (`%`) are never used.
- **Refresh call.** Set `LANDING_REVALIDATE_SECRET` here and the same value plus `LANDING_REVALIDATE_URL=https://<site>/api/revalidate` on the backend. The backend signs `"<timestamp>.<raw body>"` with HMAC-SHA256 (`X-Dentora-Signature: sha256=<hex>`, `X-Dentora-Timestamp`); this site rejects other signatures and timestamps more than 5 minutes away. Without it, content still refreshes within about a minute.
- **TLS and hosting.** Serve the site over HTTPS behind your proxy/CDN. Set `SITE_URL` to the public https origin. The demo build is committed in `public/demo/app`; re-sync and commit it after portal demo changes.
- **Images.** Backend media URLs are used as returned (absolute, or root-relative to the backend origin). Production image storage is a go-live item on the backend side.

## Deploy on Vercel

The repo deploys as is: Next.js is detected, `vercel.json` pins `npm ci` and `npm run build`, Node is `24.x` (`package.json` engines), and the demo build is committed in `public/demo/app`, so nothing outside this repo is needed at build time. With no backend configured the site and the demo still work (built-in content, demo in the browser).

1. In Vercel: **Add New > Project**, import `Dashy-ora/dentora-landing-page-and-demo`, keep the root directory and the detected settings. Production branch: `main`.
2. **Environment variables** (Production; set Preview too if previews should reach a backend):

   | Variable | Value |
   |---|---|
   | `SITE_URL` | the public https origin, for example `https://dentora.example` |
   | `DENTORA_API_URL` | the backend's https origin; leave unset until the backend is hosted (built-in content is served) |
   | `LANDING_REVALIDATE_SECRET` | 16+ characters, the same value as the backend's `LANDING_REVALIDATE_SECRET` |
| `LANDING_FORMS_SECRET` | 32+ characters, the same value as the backend's `LANDING_FORMS_SECRET` (a different value from the revalidate secret) |
   | `LANDING_CLIENT_IP_HEADER` | `x-real-ip` (Vercel overwrites it with the visitor address) |
   | `PORTAL_TRIAL_URL` | optional, see Configuration |

   Do not set `PORTAL_DEMO_DIST` or `LANDING_TRUSTED_PROXY_HOPS` on Vercel.
3. **Domain:** add it under the project's Domains, then make `SITE_URL` match it and redeploy.
4. **Backend side:** `LANDING_REVALIDATE_URL=https://<domain>/api/revalidate` and the same `LANDING_REVALIDATE_SECRET`, plus the same `LANDING_FORMS_SECRET`. Vercel functions have no fixed outgoing address, so the backend cannot list this site in `IDENTITY_TRUSTED_PROXIES`; instead each forwarded form is signed (backend W65: `X-Dentora-Timestamp`, `X-Dentora-Signature` = HMAC-SHA256 over `"<timestamp>.<form>.<visitor ip>.<raw body>"`, `X-Dentora-Visitor-Ip`), and the backend counts the form limit per signed visitor address. Without the secret on both sides, all visitors share the limit of the calling address.
5. **Updating the demo:** in the portal `npm run build:demo`, here `npm run sync:demo`, then commit `public/demo/app` and push; Vercel redeploys.

Notes: the "Open the demo" buttons depend on `public/demo/app/index.html` being present when the site is BUILT (`DENTORA_DEMO_BUILD`, see `lib/demo-build.ts`), because Vercel serves `public/` from its CDN, not from the server functions. Preview deployments behind Vercel Authentication cannot read their own `/api/site-slugs`, so unknown pages there render the site instead of a 404; production is unaffected. The "last good copy" of backend content is kept per function instance for at most 10 minutes, so after a cold start, or a long backend outage, the built-in content answers.

## Security notes (LANDING-SEC)

What changed after the landing security audit (one entry per audit finding):

- **Last good copy** (`lib/fallback.ts`). Each copy keeps its areas and the time it was read. A verified, parsed signed refresh (`/api/revalidate`) drops every copy of its area, and a copy older than 10 minutes is never served. A withdrawn offer, a switched-off demo or an unpublished page is no longer served again on the next backend failure.
- **Form body cap** (`lib/form-proxy.ts`). The 8 KiB cap is counted while the body streams in; past it the stream is cancelled and the answer is 413, so a chunked body with no `Content-Length` is never buffered whole. A `Content-Length` that is not a plain non-negative integer is refused with 400.
- **Made-up page paths** (`proxy.ts`, `app/api/[[...path]]/route.ts`, `lib/data.ts`). `/demo/app-x` now goes through the proxy (only `/demo/app` and `/demo/app/...` skip it), and an `/api` path no handler claims is a plain 404 instead of the catch-all page. `getPage` reads the (shared, cached) navigation first: when it came from the live API or its last good copy, a slug it does not list is a 404 with no backend page read. So unique made-up paths no longer spend the backend's shared read limit.
- **404 fan-out** (`proxy.ts`, `lib/known-pages.ts`). Fixed routes (home, demo, page-not-found) and impossible slugs are decided without fetching the page list, and the not-found pages are outside the proxy matcher, so a missing page costs one proxy run, one `/api/site-slugs` call and one render of the not-found page (Next 16 has no rewrite with a status, so the styled page is still fetched once). When the list is unavailable the page still renders (fail-open).
- **Visitor address** (`lib/client-ip.ts`). Addresses with a zone ID (`%`) are refused. Setting both `LANDING_CLIENT_IP_HEADER` and `LANDING_TRUSTED_PROXY_HOPS` logs one warning (the header still wins). Forwarding a form with `DENTORA_API_URL` set and no visitor-address source logs one warning that every visitor then shares one form limit; the form is still sent.

Deployment checks for the owner (the code cannot enforce these):

1. In Vercel, `LANDING_CLIENT_IP_HEADER=x-real-ip` is set for Production and Preview (if previews reach a backend), and `LANDING_TRUSTED_PROXY_HOPS` is unset.
2. Vercel overwrites a forged `x-real-ip` on every hostname that reaches the functions: the custom domain, `*.vercel.app` and each deployment URL. If any other header is used, those hostnames must not be reachable except through the CDN that sets it.
3. The function request-body limit that applies to the project (and, when self-hosted, the body limit of every proxy in front, including for chunked bodies).
4. Firewall rules: whether a rate-limit or challenge rule covers page paths (each missing page still costs a proxy run, a page-list call and a not-found render).
5. Backend read-limit attribution: the backend's public read limit (300 per minute per source) is shared by every landing read from the same address; check which source address the backend sees for the landing site's reads and that the limit fits.

## Running with no backend

Leave `DENTORA_API_URL` unset (or let the API be down, slow, return 404/503, or send an unusable body) and the whole site still works from built-in defaults in `content/defaults/`. They use the public API's own types and follow the backend's local seed drafts (W61 `LocalWebsiteDataset`), so the site looks like the dashboard's starting point:

- every fixed page in Arabic and English with its blocks: `home`, `pricing`, `features`, `features/<group>` (patient-care, front-desk, finance, growth, operations, reports), `contact`, `demo`, `about`, `terms`, `privacy` (terms and privacy are placeholder text, as in the seed);
- navigation, footer, fictional contact details (hello@dentora.example, +20 100 000 0900) and the social link;
- pricing: Trial, Basic, Standard (highlighted) and Full with the seed's EGP prices, setup fees, modules and limits;
- one offer ("Launch offer", code LAUNCH20) whose dates are computed from the request time, so it is always live;
- the forms `demo_request`, `contact`, `trial_interest`; demo settings (enabled, all modules, "Nile Smile Demo", welcome text, trial button);
- images are local illustrations in `public/defaults/`, never links to the backend.

Rules: an unpublished area also shows the defaults (there is no "Back soon" page any more). An unknown slug still answers 404. The sitemap and the 404 proxy use the same fallback. Each time defaults are served, the server logs a throttled warning (`[dentora-landing] Serving built-in default content for ...`); visitors see nothing different. A form submitted while the backend is unset or unreachable does not pretend to succeed: it says "We couldn't send this right now. Call us on ... or email ..." with the contact details, keeps what was typed and stores nothing. `/api/revalidate` is unchanged (503 without a secret). `npm run test:routes` exercises all of this against a build.

## Known limits

- The sitemap and `robots.txt` are generated on request from the published page list.
