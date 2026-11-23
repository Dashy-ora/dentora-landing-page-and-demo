import assert from "node:assert/strict";
import test from "node:test";
import { resolveAction } from "@/lib/actions";
import { mediaUrl } from "@/lib/config";
import { otherLang, pagePath, slugFromSegments } from "@/lib/paths";
import { absoluteUrl, buildMetadata, languageAlternates, titleFor } from "@/lib/seo";

const env = { SITE_URL: "https://dentora.example/", DENTORA_API_URL: "http://127.0.0.1:8000" };

test("paths: Arabic at the root, English under /en", () => {
  assert.equal(pagePath("home", "ar"), "/");
  assert.equal(pagePath("home", "en"), "/en");
  assert.equal(pagePath("pricing", "ar"), "/pricing");
  assert.equal(pagePath("features/finance", "en"), "/en/features/finance");
  assert.equal(otherLang("ar"), "en");
});

test("slugs from URL segments: home, one nesting level, nothing odd", () => {
  assert.equal(slugFromSegments(undefined), "home");
  assert.equal(slugFromSegments([]), "home");
  assert.equal(slugFromSegments(["pricing"]), "pricing");
  assert.equal(slugFromSegments(["features", "finance"]), "features/finance");
  assert.equal(slugFromSegments(["a", "b", "c"]), null);
  assert.equal(slugFromSegments(["Bad_Slug"]), null);
  assert.equal(slugFromSegments(["..", "x"]), null);
});

test("button actions follow the contract table", () => {
  const trial = "https://portal.example/trial";
  assert.deepEqual(resolveAction("start_trial", "ar", trial), { href: trial, external: true });
  assert.deepEqual(resolveAction("start_trial", "ar", "/contact"), { href: "/contact", external: false });
  assert.deepEqual(resolveAction("book_demo", "ar", trial), { href: "/contact#demo-request", external: false });
  assert.deepEqual(resolveAction("book_demo", "en", trial), { href: "/en/contact#demo-request", external: false });
  assert.deepEqual(resolveAction("open_demo", "en", trial), { href: "/demo/app", external: false });
  assert.deepEqual(resolveAction("contact", "en", trial), { href: "/en/contact", external: false });
  assert.deepEqual(resolveAction("page:offers/ramadan", "ar", trial), { href: "/offers/ramadan", external: false });
  assert.deepEqual(resolveAction("page:pricing", "en", trial), { href: "/en/pricing", external: false });
  assert.deepEqual(resolveAction("url:https://example.com/x", "en", trial), { href: "https://example.com/x", external: true });
  for (const bad of ["url:http://example.com", "javascript:alert(1)", "url:javascript:alert(1)", "data:text/html,x", "page:../x", "nonsense"]) {
    assert.equal(resolveAction(bad, "en", trial), null, bad);
  }
});

test("SEO: canonical, hreflang pairs and x-default", () => {
  assert.equal(absoluteUrl("home", "ar", env), "https://dentora.example");
  assert.equal(absoluteUrl("home", "en", env), "https://dentora.example/en");
  assert.deepEqual(languageAlternates("pricing", env), {
    ar: "https://dentora.example/pricing",
    en: "https://dentora.example/en/pricing",
    "x-default": "https://dentora.example/pricing",
  });
  const meta = buildMetadata({ lang: "en", slug: "pricing", title: "Pricing", description: "Plans", shareImage: { url: "/storage/a.png", mime: "image/png", width: 1200, height: 630, alt: "x" }, env });
  assert.equal(meta.title, "Pricing | Dentora");
  assert.equal(meta.alternates?.canonical, "https://dentora.example/en/pricing");
  assert.equal(meta.alternates?.languages && (meta.alternates.languages as Record<string, string>).ar, "https://dentora.example/pricing");
  assert.equal(meta.description, "Plans");
  assert.deepEqual((meta.openGraph?.images as { url: string }[])[0].url, "http://127.0.0.1:8000/storage/a.png");
  assert.equal(titleFor(null, "ar"), "دينتورا");
});

test("media URLs: absolute kept, root-relative joined to the backend origin", () => {
  assert.equal(mediaUrl("https://cdn.example/a.png", env), "https://cdn.example/a.png");
  assert.equal(mediaUrl("/storage/a.png", env), "http://127.0.0.1:8000/storage/a.png");
});
