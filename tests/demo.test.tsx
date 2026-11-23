import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoIntro, trialTarget } from "@/components/DemoPage";
import { TopBanner } from "@/components/TopBanner";
import type { Demo } from "@/lib/types";
import { NOW, offer } from "./fixtures";

const demo = (over: Partial<Demo> = {}): Demo => ({
  enabled: true,
  modules: ["patients"],
  clinic: { name: { ar: "عيادة النيل", en: "Nile Smile Demo" }, logo_url: null },
  welcome: { ar: "أهلًا بك", en: "Welcome to the demo clinic" },
  trial: { url: "/contact", label: { ar: "ابدأ تجربة حقيقية", en: "Start a real trial" } },
  ...over,
});

test("enabled demo: intro from the published settings with an Open demo button to /demo/app", () => {
  const out = renderToStaticMarkup(<DemoIntro demo={demo()} lang="en" fallbackTrial="https://portal.example/trial" />);
  assert.match(out, /data-demo-state="enabled"/);
  assert.match(out, /Nile Smile Demo/);
  assert.match(out, /Welcome to the demo clinic/);
  assert.match(out, /href="\/demo\/app"[^>]*>Open the demo</);
  assert.match(out, /href="\/en\/contact"[^>]*>Start a real trial</);
});

test("Arabic intro uses the Arabic texts", () => {
  const out = renderToStaticMarkup(<DemoIntro demo={demo()} lang="ar" fallbackTrial="/contact" />);
  assert.match(out, /عيادة النيل/);
  assert.match(out, /href="\/contact"/);
});

test("demo switched off: a trial call to action instead, and no way into /demo/app", () => {
  const out = renderToStaticMarkup(<DemoIntro demo={demo({ enabled: false })} lang="en" fallbackTrial="https://portal.example/trial" />);
  assert.match(out, /data-demo-state="trial"/);
  assert.doesNotMatch(out, /\/demo\/app/);
  assert.match(out, /Start a real trial/);
});

test("demo unpublished (no settings at all): trial call to action with the configured trial link", () => {
  const out = renderToStaticMarkup(<DemoIntro demo={null} lang="en" fallbackTrial="https://portal.example/trial" />);
  assert.match(out, /data-demo-state="trial"/);
  assert.match(out, /href="https:\/\/portal\.example\/trial"/);
  assert.doesNotMatch(out, /\/demo\/app/);
});

test("trial target: https stays external, same-site paths stay in the visitor's language", () => {
  assert.deepEqual(trialTarget(demo({ trial: { url: "https://portal.example/start", label: { ar: "أ", en: "B" } } }), "en", "/x"), { href: "https://portal.example/start", label: "B", external: true });
  assert.equal(trialTarget(demo(), "en", "/x").href, "/en/contact");
  assert.equal(trialTarget(demo(), "ar", "/x").href, "/contact");
});

test("top banner shows only a live top_banner offer, checked against now", () => {
  const live = renderToStaticMarkup(<TopBanner offers={[offer()]} now={NOW} lang="en" trialUrl="/x" />);
  assert.match(live, /Winter offer/);
  assert.match(live, /20% off/);
  assert.equal(renderToStaticMarkup(<TopBanner offers={[offer({ ends_at: "2026-12-02T00:00:00Z" })]} now={NOW} lang="en" trialUrl="/x" />), "");
  assert.equal(renderToStaticMarkup(<TopBanner offers={[offer({ placements: ["strip"] })]} now={NOW} lang="en" trialUrl="/x" />), "");
});
