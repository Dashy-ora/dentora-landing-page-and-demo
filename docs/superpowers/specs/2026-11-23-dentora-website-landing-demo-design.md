# Dentora website: landing site, portal demo and dashboard Website module

Design spec, 23 Nov 2026. Approved section by section with the owner.

## 1. Goal

Give Dentora a public bilingual marketing site with a hands-on clinic-portal demo, all content managed from the system dashboard.

## 2. Owner decisions

| Topic | Decision |
|---|---|
| Demo | The real clinic-portal code in a separate demo build, running against built-in sample data in the visitor's browser. It is hosted by the landing site at `/demo/app`. No backend clinic data and no passkey bypass in the real portal. |
| Pages | Home, Pricing/packages, Features/modules (one page per group), Contact/Request a demo, Demo intro, About, Terms, Privacy, plus owner-created pages. The demo shows only the modules chosen in the dashboard. |
| Languages | Arabic and English, Arabic first (RTL), English under `/en`. Every CMS text has both languages. |
| Publishing | Draft, then preview, then publish with a recent passkey (5 minutes) by someone with publish rights. Every published version is kept, and rollback is one click. No second approver. |
| Dashboard layout | Sidebar **Website**, with four pages: **Landing page**, **Demo**, **Offers**, **Forms**. |
| Prices | Always read live from the commercial plan catalog. The CMS controls only how plans appear, never the amounts charged. |
| Branches | Backend `p4-backend` and frontends `p4-frontend`, started from the P3 branches, each in its own worktree. The landing repo stays on local `main` until the owner gives a GitHub remote. |

## 3. Packages and order

| # | Package | Repo / branch | Depends on |
|---|---|---|---|
| 1 | **W61** Platform website content | DentoraBackend `p4-backend` | P3 (`69e4403`) |
| 2 | **AD4-01** Website module | system-dashboard `p4-frontend` | W61 contract |
| 2 | **CP4-01** Portal demo mode and sample data | clinic-portal `p4-frontend` | W61 public demo settings endpoint |
| 3 | **LANDING-01** Landing site | dentora-landing-page-and-demo `main` | W61, CP4-01 build |

AD4-01 and CP4-01 run in parallel once W61 is pushed. Every package is committed, verified and pushed on its own.

```
Dashboard Website module ──(draft / preview / publish + passkey)──▶ Backend W61 (platform DB)
                                                                      │  plans + modules joined live from CommercialCatalog / ModuleCatalog
Landing site (Next.js 16) ◀──(public read, cached; refresh call on publish)──┘
   ├─ forms ─▶ W61 public submit ─▶ dashboard Website → Forms inbox
   └─ /demo/app ─▶ clinic-portal demo build ─▶ sample data in the browser
                      └─ reads published demo settings (modules shown, texts)
```

## 4. W61: backend platform website content

### 4.1 Boundaries
- It lives in the **platform (control plane) database**, with a new platform migration. Tenant databases do not change, so no tenant schema bump.
- It is separate from W32 (the per-clinic website CMS) but reuses its validation ideas: closed schema, plain bilingual text, no markup.
- It reuses the commercial `CommercialCatalog` (plans and prices) and `ModuleCatalog` (modules) read-only.
- Flag: `PLATFORM_WEBSITE_ENABLED`. It is false in `.env.example` and `phpunit.xml` and true in `.env.local.example`. When off, staff endpoints return 503 and public endpoints return 404.

### 4.2 Content areas (one draft each)

| Area | Contents |
|---|---|
| `landing` | Pages (fixed and custom), blocks per page, SEO per page, header and footer menus, contact details, social links, and plans display (order, highlighted plan, marketing text, bullets per plan) |
| `demo` | Enabled flag, modules shown (keys from `ModuleCatalog`), sample clinic name and logo, welcome text, "Start a real trial" button |
| `offers` | Offer list (see 4.4) |
| `forms` | Form definitions: `demo_request`, `contact` and `trial_interest`, each with its fields shown and required, bilingual labels and a thank-you message |

Each area has:
- **One draft document**, carrying an optimistic `version`.
- **Immutable published revisions.** Rollback is "republish revision X", which mints a new revision.
- **An unpublish action** for `landing` and `demo`. Unpublishing `demo` hides `/demo`.

### 4.3 Pages and blocks
- **Fixed pages:**
  - `home`, `pricing`, `features`;
  - one `features/<group>` page per module group;
  - `contact`, `demo`, `about`, `terms`, `privacy`.
- **Custom pages:**
  - Slug `[a-z0-9-]`, optionally nested one level (for example `offers/ramadan`).
  - Up to 30 pages.
- **Per page:**
  - `title`, `description` and share image (SEO);
  - whether it appears in the header or footer;
  - up to 40 blocks.
- **Block types:**

  | Block | Contents |
  |---|---|
  | `hero` | heading, text, image, up to 2 buttons |
  | `text` | plain paragraphs |
  | `image` | image |
  | `image_text` | image beside text |
  | `feature_grid` | up to 12 items: icon key, title, text |
  | `modules` | module keys from the catalog, with optional overrides |
  | `plans` | the plans table |
  | `offers` | an offers strip |
  | `gallery` | screenshots |
  | `stats` | stats |
  | `testimonials` | testimonials |
  | `faq` | questions and answers |
  | `logos` | client logos |
  | `cta` | a call to action |
- **Buttons:**
  - Actions are `start_trial`, `book_demo`, `open_demo`, `contact`, `page:<slug>` or `url:https://…`.
  - No `javascript:`, `data:` or http URLs.
- **Text rules:** every text is `{ar, en}`, both required.
  - Rejected (422): unknown keys, `<` and `>`, control characters other than newline, bidi override or embedding characters, BOM, and non-NFC text.
  - Size caps: 4 KB per text, 256 KB per page and 1 MB per area.

### 4.4 Offers
- **Fields:**
  - `id`, `title`, `description`, `badge`;
  - `discount`: `{kind: percent|amount_egp, value}`;
  - optional `promo_code`;
  - `applies_to`: plan ids and/or module keys;
  - `starts_at` and `ends_at` (Africa/Cairo);
  - `placements`: any of `strip`, `pricing_cards`, `top_banner`;
  - an optional button.
- **Live status:** an offer is public only while `starts_at <= now < ends_at`. The public API checks this on every read, so an offer expires without republishing.
- **Validation (422):**
  - `ends_at` must be after `starts_at`;
  - a percent discount must be between 1 and 90;
  - the plan ids must exist in the catalog.
- **Billing:** the dashboard shows a fixed note that the discount must also be configured in commercial plan settings for billing to apply it. W61 never changes prices or invoices.

### 4.5 Media
- **Uploads:**
  - PNG, JPG or WebP, at most 5 MB and 6000×6000 px.
  - The type is checked from the file content, not the extension.
  - The image is re-encoded to strip metadata (GD/Imagick, whichever the installation has). If neither is available, upload returns 503 instead of storing unprocessed files.
  - SVG is refused.
- **Alt text:** `{ar, en}` is required before an image can be referenced by published content.
- **Storage:**
  - A `PlatformMediaStore` adapter: a local public disk for `local`, and `Unavailable` by default (fail closed, 503).
  - Production cloud storage is a go-live item.
- **Immutable storage:** published media are content-addressed (hash in the URL), so editing a draft never breaks the live site.
- **Retiring images:** an image used by a published revision cannot be retired (409).

### 4.6 Form submissions
- **Public submit:** `POST /api/v1/public/site/forms/{form}`.
  - The fields must match the published form definition.
  - It includes a honeypot field.
  - Rate limits: 5 per IP per form per 10 minutes, plus a global cap.
  - The body is capped at 8 KB.
  - The response is `202 {received: true}` and never echoes data back.
- **Stored per submission:**
  - form, fields, language, created at;
  - `status` (`new|contacted|won|lost`), assignee (an operator), notes and a history of changes.
- **Personal data:** contact fields are encrypted at rest, following the existing encrypted-field pattern, and the dashboard reads them under its permission.
- **No email notification yet:** there is no provider. The dashboard shows a badge with the count of `new` submissions.
- **CSV export:** under the manage permission, audited.

### 4.7 Endpoints

**Staff (platform session):**

| Endpoint | Permission | Notes |
|---|---|---|
| `GET /platform/website/{area}/draft` | `website.read` | |
| `PUT /platform/website/{area}/draft` | `website.write` | `version` + UUID `Idempotency-Key` |
| `GET /platform/website/{area}/preview` | `website.read` | the draft rendered exactly as the public API would serve it |
| `GET /platform/website/{area}/revisions` | `website.read` | |
| `POST /platform/website/{area}/publication` | `website.publish` | actions `publish`, `republish {revision_id}` and `unpublish`; recent passkey (5 minutes) required for `publish` and `republish`; `unpublish` needs none |
| `GET` / `POST /platform/website/media` | read / `website.write` | |
| `POST /platform/website/media/{id}/retire` | `website.write` | |
| `GET /platform/website/submissions` and `GET …/{id}` | `website.submissions` | |
| `PATCH /platform/website/submissions/{id}` | `website.submissions` | status, assignee, notes; with version |
| `GET /platform/website/submissions/export` | `website.submissions` | |

**Public (no sign-in):**

| Endpoint | Notes |
|---|---|
| `GET /public/site/{lang}/pages/{slug}` | |
| `GET /public/site/{lang}/navigation` | |
| `GET /public/site/{lang}/pricing` | plans joined live with catalog prices, plus the live offers that apply to them |
| `GET /public/site/{lang}/offers` | |
| `GET /public/site/demo` | |
| `GET /public/site/{lang}/forms/{form}` | |
| `POST /public/site/forms/{form}` | |

**Rules for all of them:**
- **Audit and outbox:** every write is audited and emits outbox events `website.changed|published|submission_received`.
- **Human permission names** (Arabic and English):
  - `website.read` "View website";
  - `website.write` "Edit website drafts";
  - `website.publish` "Publish website";
  - `website.submissions` "Manage form submissions".
- **Administrator role:** `AccessCatalog::administrator('platform')` gains the four permissions for fresh installs. Existing roles are not silently expanded, following the W13 pattern; `dentora:local-setup` refreshes the local admin role.

### 4.8 Refresh call
After each publish, a queued job POSTs to `LANDING_REVALIDATE_URL`:
- the body is `{area, revision_id}`;
- it carries an HMAC-SHA256 signature over the body and timestamp, using `LANDING_REVALIDATE_SECRET`;
- the timestamp must be within 5 minutes;
- failures retry with backoff.

If the URL or secret is unset, nothing is sent and publishing still succeeds.

### 4.9 Local seed
`dentora:local-seed` saves **drafts** for all four areas:
- every fixed page;
- the plans display;
- two offers: one live and one scheduled;
- demo settings with all modules;
- the three forms.

It also stores three sample submissions.

- **No publishing in the seed:** publishing needs a recent passkey, which the seed cannot provide, and there is no bypass.
- **Owner step:** `LOCAL_SEED_DATA.md` tells the owner to publish each of the four areas once, from the dashboard (four clicks with a passkey).
- **Until then:** the local landing site shows its "Back soon" page.

## 5. AD4-01: dashboard Website module

Sidebar **Website** (shown with `website.read`), four pages:

1. **Landing page**
   - **Pages tab:**
     - Create, rename and delete custom pages, and open any page.
     - Edit its blocks: add, reorder, hide or remove them, each with a form specific to its block type and Arabic/English fields side by side.
     - Edit the page's SEO, and whether it appears in the menus.
   - **Plans display tab:** order, highlighted plan, marketing text and bullets. Prices are shown read-only from the catalog.
   - **Images tab:** upload, alt text, "used in" list and retire.
   - **Menus and footer tab.**
2. **Demo**
   - The enabled switch.
   - Module checkboxes, from the catalog, with names in words.
   - Sample clinic name and logo, welcome text, trial button.
   - **Preview:** shows the draft demo settings in the dashboard: modules shown, texts, and the intro card as it will look.
   - "Open live demo" opens the published `/demo/app`. The demo never reads drafts, because it cannot use a dashboard session from the landing domain.
3. **Offers**
   - A list with status chips: scheduled, live or ended.
   - Create and edit an offer with all the fields from 4.4.
   - The fixed billing note.
4. **Forms**
   - **Form settings:** fields shown and required, labels, thank-you message.
   - **Submissions inbox:** filters (form, status, date), a detail view, status, assignee, notes, history and CSV export.
   - A badge on the Forms page shows the count of new submissions.

**Shared behaviour:**
- Every editable page shows "Unpublished changes", **Preview** and **Publish**.
- **Publish** uses the existing one-click "Confirm with passkey" step-up.
- **Version history** lists the published revisions, each with a **Restore** action that republishes it.
- **Conflict:** a 409 shows "Someone else changed this — reload".
- **Field errors:** a 422 highlights the field that failed.
- No permission keys, flag names or codes appear on screen (jargon guard).

## 6. CP4-01: clinic-portal demo mode

- **Build:** the new script `npm run build:demo` sets `mode=demo`, with base path `/demo/app/` and output in `dist-demo/`. The normal `npm run build` is unchanged.
- **API layer:**
  - In demo mode the portal's API client is swapped at build time, by Vite mode and alias, for an in-browser demo adapter.
  - The adapter answers every request the portal makes from a sample dataset and keeps writes in memory for the tab's lifetime. A reload resets everything.
- **Sample clinic:** "Nile Smile Demo", two branches (Nasr City and Maadi), a demo owner signed in with every permission. Data in every module:
  - patients, including a minor with a guardian;
  - appointments for today and this week;
  - treatment plans and signed notes;
  - quotes, invoices, payments, a deposit, an installment plan and a refund;
  - insurance with a claim;
  - inventory with lots and near-expiry stock, and a received purchase order;
  - a kit, sterilization and assets;
  - CRM, forms, loyalty and workforce;
  - ledger, reports and advanced reports.
  The dataset is shaped by the pinned OpenAPI contract.
- **Module visibility:** the demo reads `GET /public/site/demo` once at start-up. Only the modules listed there are visible, and the plan entitlements are set to match. If that read fails, the demo uses the build-time default (all modules).
- **Passkey step-up:** in demo mode, "Confirm with passkey" confirms automatically, with the note "Not needed in the demo".
- **Banner:** a persistent banner reads "Demo — sample data" and links to the published trial button target.
- **Unknown requests:** a request with no sample data answers with a "Not available in the demo" state, never an error page.
- **Tests:**
  - every endpoint the portal can call has a demo handler or an explicit not-in-demo marker;
  - sample data validates against the contract shapes;
  - the production bundle (`dist/`) contains no demo adapter, sample data or auto-confirm code;
  - the jargon guard stays green;
  - `npm run check` passes.

## 7. LANDING-01: landing site

- **Stack:**
  - Next.js 16 (as installed), React 19, Tailwind 4.
  - The app follows `node_modules/next/dist/docs` for this version, using Cache Components: `use cache`, `cacheLife`, `cacheTag`, revalidation by tag.
- **Routes:**
  - `/[[...slug]]` renders Arabic pages; `/en/[[...slug]]` renders English pages;
  - `/demo` is the demo intro; `/demo/app/*` is the static demo build, copied from `clinic-portal/dist-demo` by `npm run sync:demo`, with an SPA fallback;
  - `/api/revalidate` is the signed refresh endpoint from 4.8;
  - plus the sitemap and robots file.
- **Layout and blocks:**
  - Arabic `dir="rtl"` by default, with a language switch.
  - Each block type is one component.
- **Look: the Dentora UI kit, exactly as the clinic portal uses it (owner decision).**
  - Copy these from clinic-portal (`src/index.css`, `src/styles/tokens.css`, `src/styles/kit.css`):
    - the `@theme inline` mapping;
    - the `--dt-*` light/dark tokens;
    - the `dt-*` component classes (buttons, inputs, cards, segments, labels);
    - the brand palette and ramp (teal `#0c717f`, navy `#15334a`, ink, mint, fog, `brand-50…900`);
    - the Flowbite plugin;
    - the self-hosted fonts (Sora for Latin and digits, Tajawal for Arabic via `unicode-range`) and the same `font-sans` stack;
    - light/dark mode by `.dark` on `<html>`.
  - The landing site's marketing blocks are composed only from these tokens and kit classes, with no new colours or fonts. Logos come from `DENTORA_Assets_Theme_Identity`.
  - The create-next-app defaults (Geist and Arial in `app/globals.css`) are removed.
  - A drift test fails if the copied kit files differ from the portal's versions, using a pinned copy with a checksum.
- **Data:**
  - **Fetching:** server components fetch the public W61 endpoints, cached by area tag with a short safety `cacheLife`.
  - **Offers:** filtered again by `starts_at`/`ends_at` at request time.
  - **Backend failure:** the site serves the last cached copy. With no copy at all, it shows a plain "Back soon" page.
- **SEO:**
  - per-page title, description and share image;
  - `hreflang` Arabic/English pairs, canonical URLs, sitemap and robots.
- **Forms:**
  - rendered from the published definitions;
  - client validation mirrors the server rules;
  - on 429 the visitor sees "Please try again in a few minutes";
  - on error, what the visitor typed is kept.
- **Config:** `DENTORA_API_URL`, `LANDING_REVALIDATE_SECRET` and `PORTAL_TRIAL_URL` go in `.env.local`, uncommitted; `.env.example` is committed.
- **Tests:**
  - unit tests for the block renderers, RTL rendering, the offer window, form error states and the "Back soon" fallback;
  - `next build` and lint;
  - a final browser check of Home, Pricing, a form submit and `/demo/app`.

## 8. Error handling

| Code | Meaning | Dashboard | Landing site |
|---|---|---|---|
| 409 | version conflict, media in use, same key with another body | "Reload" or explain | — |
| 422 | invalid field | highlight the field | client-side validation |
| 403 | permission, or recent passkey needed | "Confirm with passkey" or "No access" | — |
| 404 | flag off or unpublished | — | 404 page / "Back soon" |
| 429 | form rate limit | — | "Try again in a few minutes" |
| 503 | flag off, media store unavailable | "Not enabled" / "Image storage not set up" | serve the cache |

## 9. Out of scope / go-live items

- Email notifications for submissions (needs an email provider).
- Production image storage (cloud bucket or CDN).
- Hosting, domain and a GitHub remote for the landing repo.
- A real discount engine (offers stay display-only).
- Analytics and cookie consent.
- A/B testing.
- A rich-text editor (blocks are plain text by design).
