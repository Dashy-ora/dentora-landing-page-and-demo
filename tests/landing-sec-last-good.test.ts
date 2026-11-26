// LANDING-SEC fix 1 (lib/fallback.ts:withFallback:last-good-copy-survives-unpublish): the last good copy is tied to the publish
// lifecycle. After a signed refresh of an area, and after the age limit, a backend failure never serves a copy from before.
import { cacheCalls } from "./next-cache-stub";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach, mock } from "node:test";
import { POST as revalidate } from "@/app/api/revalidate/route";
import { getDemo, getOffers, getPage } from "@/lib/data";
import { MAX_LAST_GOOD_AGE_MS, resetLastGood, withFallback } from "@/lib/fallback";
import { sign } from "@/lib/revalidate";

const SECRET = "landing-sec-dummy-secret-0123456789";
const DAY = 86_400_000;
const TEN_MINUTES = 10 * 60 * 1000;

type Mode = "published" | "unpublished" | "down";
let mode: Mode = "published";
let reads: string[] = [];
const originalFetch = globalThis.fetch;

function payload(): Record<string, unknown> {
  const now = Date.now();
  return {
    "/api/v1/public/site/en/navigation": { header: [], footer: [], pages: [{ slug: "home", title: "Home" }, { slug: "old-promo", title: "Old promo" }], contact: {}, social: [] },
    "/api/v1/public/site/en/offers": { offers: [{ id: "withdrawn-offer", title: "Withdrawn", promo_code: "OLD50", starts_at: new Date(now - DAY).toISOString(), ends_at: new Date(now + 30 * DAY).toISOString(), placements: ["strip"] }] },
    "/api/v1/public/site/en/pages/old-promo": { slug: "old-promo", title: "Unpublished page", blocks: [] },
    "/api/v1/public/site/demo": { enabled: true, modules: [], clinic: { name: "Old clinic" }, welcome: {}, trial: { url: "https://old-trial.example/x" } },
  };
}

beforeEach(() => {
  process.env.DENTORA_API_URL = "http://backend.test";
  process.env.LANDING_REVALIDATE_SECRET = SECRET;
  resetLastGood();
  mode = "published";
  reads = [];
  cacheCalls.length = 0;
  globalThis.fetch = (async (url: string | URL) => {
    const path = new URL(String(url)).pathname;
    reads.push(path);
    if (mode === "down") throw new Error("ECONNREFUSED (test outage)");
    const data = payload()[path];
    if (mode === "unpublished" || data === undefined) return new Response("{}", { status: 404 });
    return Response.json({ data });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.timers.reset();
});

async function signedRefresh(area: string): Promise<Response> {
  const body = JSON.stringify({ area, revision_id: null });
  const ts = Math.floor(Date.now() / 1000);
  return revalidate(new Request("https://landing.test/api/revalidate", { method: "POST", body, headers: { "x-dentora-timestamp": String(ts), "x-dentora-signature": sign(SECRET, ts, body) } }));
}

test("withdrawn offer: good read, signed refresh of offers, outage serves the defaults, never the old promo code", async () => {
  const before = await getOffers("en");
  assert.equal(before.status === "ok" && before.source, "live");
  mode = "unpublished";
  const refreshed = await signedRefresh("offers");
  assert.equal(refreshed.status, 200);
  assert.ok(cacheCalls.some(([name, tag]) => name === "revalidateTag" && tag === "offers"), "the tag is still revalidated");
  mode = "down";
  const after = await getOffers("en");
  assert.equal(after.status, "ok");
  if (after.status !== "ok") return;
  assert.equal(after.source, "default");
  assert.ok(!JSON.stringify(after.data).includes("OLD50"), "the withdrawn promo code is not served");
});

test("unpublished page: signed refresh of landing, outage gives a 404 or the defaults, never the old page", async () => {
  const before = await getPage("en", "old-promo");
  assert.equal(before.status === "ok" && before.source, "live");
  mode = "unpublished";
  await signedRefresh("landing");
  mode = "down";
  const after = await getPage("en", "old-promo");
  assert.ok(after.status === "missing" || after.source === "default", `got ${after.status === "ok" ? after.source : after.status}`);
  assert.ok(!(after.status === "ok" && after.data.title === "Unpublished page"));
});

test("switched-off demo: signed refresh of demo, outage serves the default demo settings, not the old trial link", async () => {
  await getDemo();
  mode = "unpublished";
  await signedRefresh("demo");
  mode = "down";
  const after = await getDemo();
  assert.equal(after.status === "ok" && after.source, "default");
  assert.notEqual(after.status === "ok" && after.data.trial.url, "https://old-trial.example/x");
});

test("a refresh drops only its own area: other areas keep their last good copy", async () => {
  await getOffers("en");
  await getDemo();
  await signedRefresh("landing");
  mode = "down";
  const offers = await getOffers("en");
  const demo = await getDemo();
  assert.equal(offers.status === "ok" && offers.source, "stale");
  assert.equal(demo.status === "ok" && demo.source, "stale");
});

test("a refresh that fails verification drops nothing", async () => {
  await getOffers("en");
  const body = JSON.stringify({ area: "offers", revision_id: null });
  const forged = await revalidate(new Request("https://landing.test/api/revalidate", { method: "POST", body, headers: { "x-dentora-timestamp": String(Math.floor(Date.now() / 1000)), "x-dentora-signature": "sha256=00" } }));
  assert.equal(forged.status, 401);
  mode = "down";
  const after = await getOffers("en");
  assert.equal(after.status === "ok" && after.source, "stale");
});

test("a copy older than the age limit is not served (another instance's refresh cannot reach this one)", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-12-10T12:00:00Z") });
  const before = await getOffers("en");
  assert.equal(before.status === "ok" && before.source, "live");
  mode = "down";
  mock.timers.tick(TEN_MINUTES - 1000);
  const young = await getOffers("en");
  assert.equal(young.status === "ok" && young.source, "stale", "within the limit the copy still covers an outage");
  mock.timers.tick(2000);
  const old = await getOffers("en");
  assert.equal(old.status === "ok" && old.source, "default");
  assert.ok(!JSON.stringify(old.status === "ok" ? old.data : null).includes("OLD50"));
});

test("withFallback: the age limit is 10 minutes; a 404 still clears, success still stores", async () => {
  assert.equal(MAX_LAST_GOOD_AGE_MS, TEN_MINUTES);
  let now = 1_000;
  const clock = () => now;
  await withFallback("k", async () => ({ n: 1 }), ["landing"], clock);
  now += MAX_LAST_GOOD_AGE_MS;
  assert.deepEqual(await withFallback("k", async () => { throw new Error("down"); }, ["landing"], clock), { status: "ok", data: { n: 1 }, stale: true });
  now += 1;
  assert.deepEqual(await withFallback("k", async () => { throw new Error("down"); }, ["landing"], clock), { status: "unavailable" });
  await withFallback("k", async () => ({ n: 2 }), ["landing"], clock);
  assert.deepEqual(await withFallback("k", async () => null, ["landing"], clock), { status: "missing" });
  assert.deepEqual(await withFallback("k", async () => { throw new Error("down"); }, ["landing"], clock), { status: "unavailable" });
});
