import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockView, Blocks, type BlockContext } from "@/components/blocks";
import { RootShell } from "@/components/RootShell";
import type { Block, Lang } from "@/lib/types";
import { NOW, blocks, offer, pricing } from "./fixtures";

const ctx = (over: Partial<BlockContext> = {}, lang: Lang = "en"): BlockContext => ({ lang, trialUrl: "https://portal.example/trial", now: NOW, pricing: pricing(), offers: [offer()], ...over });
const html = (block: Block, over: Partial<BlockContext> = {}, lang: Lang = "en") => renderToStaticMarkup(<BlockView block={block} ctx={ctx(over, lang)} />);

test("hero: heading, text, image and both buttons with mapped actions", () => {
  const out = html(blocks.hero);
  assert.match(out, /<h1[^>]*>Run your clinic<\/h1>/);
  assert.match(out, /All in one/);
  assert.match(out, /src="https:\/\/cdn\.example\/hero\.png"/);
  assert.match(out, /href="https:\/\/portal\.example\/trial"[^>]*>Start</);
  assert.match(out, /href="\/demo\/app"[^>]*>Demo</);
});

test("text: every paragraph", () => {
  const out = html(blocks.text);
  assert.match(out, /About us/);
  assert.match(out, /First paragraph/);
  assert.match(out, /Second paragraph/);
});

test("image: image with its alt text and caption", () => {
  const out = html(blocks.image);
  assert.match(out, /alt="alt pic"/);
  assert.match(out, /A caption/);
});

test("image_text: the image side follows the contract and flips with direction (logical, not left/right)", () => {
  const start = html(blocks.image_text);
  assert.match(start, /data-image-side="start"/);
  assert.match(start, /Beside text/);
  const end = html({ ...(blocks.image_text as Extract<Block, { type: "image_text" }>), image_side: "end" });
  assert.match(end, /data-image-side="end"/);
  assert.doesNotMatch(start + end, /\b(?:ml|mr|pl|pr|left|right)-/);
});

test("feature_grid: items, with a fallback icon for unknown keys", () => {
  const out = html(blocks.feature_grid);
  assert.match(out, /Booking/);
  assert.match(out, /Clear reports/);
  assert.equal((out.match(/<svg/g) ?? []).length, 2);
});

test("modules: shows module names in words, never keys or groups", () => {
  const out = html(blocks.modules);
  assert.match(out, /Billing and payments/);
  assert.doesNotMatch(out, /finance/);
  assert.doesNotMatch(out, />billing</);
});

test("plans: live catalog price, interval, highlight, setup fee, modules and the live offer", () => {
  const out = html(blocks.plans);
  assert.match(out, /EGP\s?1,500/);
  assert.match(out, /per month/);
  assert.match(out, /Most popular/);
  assert.match(out, /Setup fee/);
  assert.match(out, /Patient records/);
  assert.match(out, /Winter/);
  assert.match(out, /20% off/);
  assert.match(out, /WINTER20/);
  assert.match(out, /href="https:\/\/portal\.example\/trial"/);
});

test("plans: an offer whose window has ended is not shown even if the cached copy still lists it", () => {
  const expired = offer({ ends_at: "2026-12-05T00:00:00Z" });
  const out = html(blocks.plans, { pricing: pricing({ offers: [expired] }) });
  assert.doesNotMatch(out, /WINTER20/);
  assert.match(out, /EGP\s?1,500/);
});

test("plans: nothing from the backend gives a plain placeholder, never an error", () => {
  assert.match(html(blocks.plans, { pricing: null }), /Plans will appear here soon/);
});

test("plans: Arabic uses Arabic words with Western digits", () => {
  const out = html(blocks.plans, {}, "ar");
  assert.match(out, /شهريًا/);
  assert.match(out, /1,500/);
  assert.doesNotMatch(out, /[٠-٩]/);
});

test("offers: strip shows live strip offers only and hides itself when none are live", () => {
  assert.match(html(blocks.offers), /Winter offer/);
  assert.equal(html(blocks.offers, { offers: [offer({ placements: ["top_banner"] })] }), "");
  assert.equal(html(blocks.offers, { offers: [offer({ starts_at: "2027-01-01T00:00:00Z" })] }), "");
  assert.equal(html(blocks.offers, { offers: null }), "");
});

test("gallery: every image", () => {
  const out = html(blocks.gallery);
  assert.match(out, /g1\.png/);
  assert.match(out, /g2\.png/);
  assert.match(out, /One/);
});

test("stats: value and label", () => {
  const out = html(blocks.stats);
  assert.match(out, /120\+/);
  assert.match(out, /Clinics/);
});

test("testimonials: quote, name and role", () => {
  const out = html(blocks.testimonials);
  assert.match(out, /Great/);
  assert.match(out, /Dr\. Mona/);
  assert.match(out, /Owner/);
});

test("faq: native disclosure per question", () => {
  const out = html(blocks.faq);
  assert.match(out, /<details/);
  assert.match(out, /Is it secure\?/);
  assert.match(out, /Yes/);
});

test("logos: image logos and a text fallback", () => {
  const out = html(blocks.logos);
  assert.match(out, /l1\.png/);
  assert.match(out, /No logo clinic/);
});

test("cta: heading, text and the contact page link (English stays under /en)", () => {
  assert.match(html(blocks.cta, {}, "ar"), /href="\/contact"/);
  const en = html(blocks.cta, {}, "en");
  assert.match(en, /Ready\?/);
  assert.match(en, /href="\/en\/contact"/);
});

test("an unknown block type is skipped, not an error", () => {
  const out = renderToStaticMarkup(<Blocks blocks={[{ id: "x", type: "future_thing" } as unknown as Block, blocks.text]} ctx={ctx()} />);
  assert.match(out, /About us/);
});

test("buttons with an action this build cannot resolve are not rendered", () => {
  const hero = { ...(blocks.hero as Extract<Block, { type: "hero" }>), buttons: [{ label: "Bad", action: "javascript:alert(1)" }] };
  assert.doesNotMatch(html(hero), /Bad/);
});

test("RTL: Arabic pages are rtl, English pages are ltr, from the first byte", () => {
  const ar = renderToStaticMarkup(<RootShell lang="ar">x</RootShell>);
  const en = renderToStaticMarkup(<RootShell lang="en">x</RootShell>);
  assert.match(ar, /<html lang="ar" dir="rtl"/);
  assert.match(en, /<html lang="en" dir="ltr"/);
});

test("blocks use logical utilities only (no physical left/right classes) so RTL mirrors by itself", () => {
  const out = Object.values(blocks).map((block) => html(block)).join("");
  assert.doesNotMatch(out, /class="[^"]*\b(?:ml|mr|pl|pr|text-left|text-right|left|right)-/);
});
