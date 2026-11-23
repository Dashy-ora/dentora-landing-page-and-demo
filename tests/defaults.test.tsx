import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { beforeEach } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockView } from "@/components/blocks";
import { DemoIntro } from "@/components/DemoPage";
import { FormView, UnreachableMessage } from "@/components/FormView";
import { TopBanner } from "@/components/TopBanner";
import { DEFAULT_CONTACT, PAGE_SLUGS, defaultDemo, defaultForm, defaultNavigation, defaultOffers, defaultPage, defaultPages, defaultPricing } from "@/content/defaults";
import { resolveAction } from "@/lib/actions";
import { mediaUrl } from "@/lib/config";
import { resetDefaultWarnings, warnDefaultsServed } from "@/lib/default-log";
import { demoBuildAvailable } from "@/lib/demo-build";
import { runSubmit } from "@/lib/forms";
import { isLive, offersFor } from "@/lib/offers";
import { isDemo, isFormDefinition, isNavigation, isOffersData, isPageData, isPricing } from "@/lib/shape";
import { LANGS, type Demo, type FormDefinition, type FormKey, type Navigation, type OffersData, type PageData, type Pricing } from "@/lib/types";
import type { BlockContext } from "@/components/blocks";

// Compile-time check: the defaults are assignable to the public API types (a mismatch fails `tsc`, so `next build`).
const _page: PageData | null = defaultPage("ar", "home");
const _nav: Navigation = defaultNavigation("en");
const _pricing: Pricing = defaultPricing("en", 0);
const _offers: OffersData = defaultOffers("en", 0);
const _demo: Demo = defaultDemo();
const _form: FormDefinition = defaultForm("en", "contact");
void [_page, _nav, _pricing, _offers, _demo, _form];

const NOW = Date.parse("2026-11-23T10:00:00Z");

test("every fixed page exists in both languages with blocks, and the shapes pass the runtime guards", () => {
  assert.deepEqual(PAGE_SLUGS.slice(0, 3), ["home", "pricing", "features"]);
  for (const slug of ["features/patient-care", "features/front-desk", "features/finance", "features/growth", "features/operations", "features/reports", "contact", "demo", "about", "terms", "privacy"]) {
    assert.ok(PAGE_SLUGS.includes(slug), slug);
  }
  for (const lang of LANGS) {
    for (const slug of PAGE_SLUGS) {
      const page = defaultPage(lang, slug);
      assert.ok(page, `${lang}/${slug}`);
      assert.ok(isPageData(page) && page.blocks.length > 0 && page.title.length > 0);
      assert.equal(page.language, lang);
    }
    assert.equal(defaultPage(lang, "nope"), null);
    assert.equal(defaultPages(lang).length, PAGE_SLUGS.length);
    assert.ok(isNavigation(defaultNavigation(lang)) && isPricing(defaultPricing(lang, NOW)) && isOffersData(defaultOffers(lang, NOW)) && isDemo(defaultDemo()));
    for (const key of ["demo_request", "contact", "trial_interest"] as FormKey[]) assert.ok(isFormDefinition(defaultForm(lang, key)));
  }
});

test("every default block renders, with local images only and no raw module keys or backend links", () => {
  const pricing = defaultPricing("en", NOW);
  const ctx: BlockContext = { lang: "en", trialUrl: "/contact", now: NOW, pricing, offers: pricing.offers };
  for (const lang of LANGS) {
    for (const page of defaultPages(lang)) {
      for (const block of page.blocks) {
        const html = renderToStaticMarkup(<BlockView block={block} ctx={{ ...ctx, lang }} />);
        assert.ok(html.length > 0 || block.type === "offers", `${lang}/${page.slug}/${block.type}`);
        assert.doesNotMatch(html.replaceAll(/xmlns="[^"]*"/g, ""), /https?:\/\//, "no remote URLs");
      }
    }
  }
  const json = JSON.stringify(defaultPages("en"));
  assert.doesNotMatch(json, /"url":"https?:/);
  assert.equal(mediaUrl("/defaults/hero-clinic.svg", { DENTORA_API_URL: "http://backend.test" }), "/defaults/hero-clinic.svg", "default images never point at the backend");
});

test("navigation: header, footer, all pages, fictional contact details and a social link", () => {
  const nav = defaultNavigation("en");
  assert.deepEqual(nav.header.map((l) => l.slug), ["home", "pricing", "features", "contact", "demo"]);
  assert.deepEqual(nav.footer.map((l) => l.slug), ["contact", "about", "terms", "privacy"]);
  assert.equal(nav.pages.length, PAGE_SLUGS.length);
  assert.equal(nav.contact.email, DEFAULT_CONTACT.email);
  assert.equal(nav.contact.phone, "+20 100 000 0900");
  assert.equal(nav.social[0].network, "facebook");
});

test("pricing: Trial, Basic, Standard (highlighted) and Full with the seed's EGP prices and modules", () => {
  const { plans } = defaultPricing("en", NOW);
  assert.deepEqual(plans.map((p) => p.name), ["Dentora Trial (30 days)", "Dentora Basic", "Dentora Standard", "Dentora Full"]);
  assert.deepEqual(plans.map((p) => p.price_minor), [0, 120000, 250000, 450000]);
  assert.deepEqual(plans.map((p) => p.setup_fee_minor), [null, 250000, 500000, 1000000]);
  assert.deepEqual(plans.map((p) => p.highlighted), [false, false, true, false]);
  assert.deepEqual(plans.map((p) => p.modules.length), [8, 7, 13, 31]);
  assert.ok(plans.every((p) => p.currency === "EGP" && p.modules.every((m) => m.name !== m.key)));
  assert.deepEqual(plans[3].maintenance, { month: 450000, year: 4500000 });
  assert.deepEqual(defaultPricing("ar", NOW).plans.map((p) => p.highlighted), [false, false, true, false]);
});

test("the default offer is live whenever the site is served, and only 'live' in its window", () => {
  for (const now of [NOW, Date.parse("2030-01-01T00:00:00Z"), Date.now()]) {
    const { offers } = defaultOffers("en", now);
    assert.equal(offers.length, 1);
    assert.ok(isLive(offers[0], now), "live at its own now");
    assert.ok(!isLive(offers[0], now - 8 * 86_400_000), "not live before its start");
    assert.ok(!isLive(offers[0], now + 181 * 86_400_000), "ended after its end");
    assert.equal(offersFor(offers, "pricing_cards", now).length, 1);
    assert.equal(offers[0].status, "live");
    assert.equal(offers[0].promo_code, "LAUNCH20");
    assert.equal(defaultPricing("en", now).offers[0].starts_at, offers[0].starts_at);
  }
  const plans = defaultPricing("en", NOW).plans;
  assert.deepEqual(plans.filter((p) => p.offer_ids.length > 0).map((p) => p.name), ["Dentora Standard", "Dentora Full"]);
  const banner = renderToStaticMarkup(<TopBanner offers={[{ ...defaultOffers("en", NOW).offers[0], placements: ["top_banner"] }]} now={NOW} lang="en" trialUrl="/x" />);
  assert.match(banner, /Launch offer/);
});

test("forms: the three definitions with the seed's fields; the honeypot is the contract's", () => {
  const demo = defaultForm("en", "demo_request");
  assert.deepEqual(demo.fields.map((f) => f.key), ["name", "clinic_name", "email", "phone", "branches", "message"]);
  assert.equal(defaultForm("ar", "contact").title, "تواصل معنا");
  assert.deepEqual(defaultForm("en", "trial_interest").fields.filter((f) => f.required).map((f) => f.key), ["name", "clinic_name", "phone"]);
  assert.equal(demo.honeypot_field, "company_website");
});

test("demo defaults: enabled, all modules, Nile Smile Demo, welcome text and the trial button", () => {
  const demo = defaultDemo();
  assert.equal(demo.enabled, true);
  assert.equal(demo.modules.length, 31);
  assert.equal(demo.clinic.name.en, "Nile Smile Demo");
  assert.ok(demo.welcome.ar.length > 0 && demo.trial.label.en === "Start a real trial");
});

test("/demo without the portal demo build shows the trial call to action and no way into /demo/app", () => {
  const out = renderToStaticMarkup(<DemoIntro demo={defaultDemo()} lang="en" fallbackTrial="/contact" appAvailable={false} />);
  assert.match(out, /data-demo-state="trial"/);
  assert.match(out, /Start a real trial|Start your trial/);
  assert.doesNotMatch(out, /\/demo\/app/);
  const withBuild = renderToStaticMarkup(<DemoIntro demo={defaultDemo()} lang="en" fallbackTrial="/contact" />);
  assert.match(withBuild, /data-demo-state="enabled"/);
  assert.match(withBuild, /href="\/demo\/app"/);
  // Open-the-demo buttons inside pages are dropped too, not left dead.
  assert.equal(resolveAction("open_demo", "en", "/contact", false), null);
  assert.deepEqual(resolveAction("open_demo", "en", "/contact"), { href: "/demo/app", external: false });
});

test("demoBuildAvailable looks for public/demo/app/index.html", () => {
  const root = mkdtempSync(path.join(tmpdir(), "dentora-demo-"));
  assert.equal(demoBuildAvailable(root), false);
  mkdirSync(path.join(root, "public", "demo", "app"), { recursive: true });
  assert.equal(demoBuildAvailable(root), false);
  writeFileSync(path.join(root, "public", "demo", "app", "index.html"), "<html></html>");
  assert.equal(demoBuildAvailable(root), true);
});

const contact = defaultForm("en", "contact");
const typed = { name: "Dr Mona", email: "mona@clinic.com", message: "Hello" };
const answer = (status: number) => (async () => new Response(JSON.stringify({ error: "unavailable" }), { status })) as unknown as typeof fetch;

test("a form with no API shows the contact message, not success, and keeps what was typed", async () => {
  for (const status of [503, 404]) {
    const result = await runSubmit({ definition: contact, values: typed, lang: "en", honeypot: "", fetchImpl: answer(status) });
    assert.equal(result.status, "unreachable");
    assert.deepEqual(result.values, typed);
  }
  const en = renderToStaticMarkup(<UnreachableMessage lang="en" contact={{ phone: DEFAULT_CONTACT.phone, email: DEFAULT_CONTACT.email }} />);
  assert.match(en, /We couldn&#x27;t send this right now\. Call us on .*\+20 100 000 0900.* or email .*hello@dentora\.example/);
  const ar = renderToStaticMarkup(<UnreachableMessage lang="ar" contact={{ phone: DEFAULT_CONTACT.phone, email: DEFAULT_CONTACT.email }} />);
  assert.match(ar, /تعذّر إرسال الطلب الآن\. اتصل بنا على .*\+20 100 000 0900.* أو راسلنا على .*hello@dentora\.example/);
  assert.match(renderToStaticMarkup(<UnreachableMessage lang="en" contact={{ phone: null, email: "a@b.co" }} />), /Email us at/);
  assert.doesNotMatch(renderToStaticMarkup(<FormView definition={contact} lang="en" contact={{ phone: "1", email: "a@b.co" }} />), /data-form-state="success"/);
});

test("a default-rendered form lists its fields", () => {
  const html = renderToStaticMarkup(<FormView definition={defaultForm("ar", "demo_request")} lang="ar" />);
  assert.match(html, /اسم العيادة/);
  assert.match(html, /name="company_website"/);
});

beforeEach(() => resetDefaultWarnings());

test("serving defaults logs one server-side warning per read, throttled", () => {
  const seen: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { seen.push(String(args[0])); };
  try {
    warnDefaultsServed("/public/site/ar/navigation", "DENTORA_API_URL is not set", 1000);
    warnDefaultsServed("/public/site/ar/navigation", "DENTORA_API_URL is not set", 2000);
    warnDefaultsServed("/public/site/en/navigation", "the API is unavailable", 2000);
    warnDefaultsServed("/public/site/ar/navigation", "again", 1000 + 6 * 60 * 1000);
  } finally {
    console.warn = original;
  }
  assert.equal(seen.length, 3);
  assert.match(seen[0], /built-in default content for \/public\/site\/ar\/navigation: DENTORA_API_URL is not set/);
});

test("shape guards reject unusable answers", () => {
  assert.equal(isPageData({ slug: "x" }), false);
  assert.equal(isNavigation({ header: [] }), false);
  assert.equal(isPricing(null), false);
  assert.equal(isDemo({ enabled: "yes" }), false);
  assert.equal(isFormDefinition([]), false);
});
