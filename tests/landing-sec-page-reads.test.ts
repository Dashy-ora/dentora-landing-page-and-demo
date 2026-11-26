// LANDING-SEC fix 3 (lib/data.ts:getPage:unique-slug-reads-spend-shared-landing-backend-read-quota): made-up slugs cannot each spend a
// backend read. /demo/app<x> now goes through the proxy, unrouted /api/* is a plain 404 (tests/landing-sec-api-catch-all.test.ts),
// and getPage does not read a page the live navigation does not list.
import { proxyMatcher } from "./next-matcher";
import "./next-cache-stub";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { getPage } from "@/lib/data";
import { resetLastGood } from "@/lib/fallback";
import { isUnknownPage, pageRequest } from "@/lib/known-pages";
import { config } from "@/proxy";

test("matcher (compiled by Next): runs for /demo/app-1 and /demo/appx, not for /demo/app or /demo/app/x", () => {
  const runs = proxyMatcher(config.matcher);
  assert.equal(runs("/demo/app-1"), true);
  assert.equal(runs("/demo/appx"), true);
  assert.equal(runs("/demo/app"), false);
  assert.equal(runs("/demo/app/x"), false);
  assert.equal(runs("/demo/app/c/1/patients"), false);
  assert.equal(runs("/demo/app/assets/a.js"), false);
  // Unchanged: pages run it; the API, internals and files skip it.
  for (const path of ["/", "/nope", "/pricing", "/demo", "/en", "/en/demo/app-1", "/apix"]) assert.equal(runs(path), true, path);
  for (const path of ["/api", "/api/zz-1", "/api/forms/contact", "/_next/static/x.js", "/robots.txt", "/sitemap.xml", "/logo.png"]) assert.equal(runs(path), false, path);
});

test("/demo/app-1 is an unknown page to the proxy, so it answers 404 without rendering", () => {
  const request = pageRequest("/demo/app-1");
  assert.deepEqual(request, { lang: "ar", slug: "demo/app-1" });
  assert.equal(isUnknownPage(request!, { slugs: ["home", "pricing", "demo"] }), true);
});

const originalFetch = globalThis.fetch;
let reads: string[] = [];
let backend: "up" | "down" | "unpublished" = "up";
const navigation = { header: [], footer: [], pages: [{ slug: "home", title: "Home" }, { slug: "pricing", title: "Pricing" }, { slug: "careers", title: "Careers" }], contact: {}, social: [] };
const pages: Record<string, unknown> = {
  "/api/v1/public/site/ar/pages/careers": { slug: "careers", title: "CMS-only page", blocks: [] },
  "/api/v1/public/site/ar/pages/pricing": { slug: "pricing", title: "Pricing", blocks: [] },
  "/api/v1/public/site/ar/pages/demo": { slug: "demo", title: "Demo", blocks: [] },
};

beforeEach(() => {
  process.env.DENTORA_API_URL = "http://backend.test";
  resetLastGood();
  reads = [];
  backend = "up";
  globalThis.fetch = (async (url: string | URL) => {
    const path = new URL(String(url)).pathname;
    reads.push(path);
    if (backend === "down") throw new Error("ECONNREFUSED (test outage)");
    if (backend === "unpublished") return new Response("{}", { status: 404 });
    if (path === "/api/v1/public/site/ar/navigation") return Response.json({ data: navigation });
    return path in pages ? Response.json({ data: pages[path] }) : new Response("{}", { status: 404 });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const pageReads = () => reads.filter((path) => path.includes("/pages/"));

test("getPage: a slug the live navigation does not list is missing with no backend page read", async () => {
  for (const slug of ["demo/app-1", "api/zz-1", "zz-random-7", "features/nope"]) {
    const result = await getPage("ar", slug);
    assert.equal(result.status, "missing", slug);
  }
  assert.deepEqual(pageReads(), []);
});

test("getPage: unique slugs cost no page reads at all, however many there are", async () => {
  for (let i = 0; i < 50; i += 1) {
    await getPage("ar", `demo/app-${i}`);
    await getPage("ar", `api/zz-${i}`);
  }
  assert.equal(pageReads().length, 0);
});

test("getPage: a listed slug is still read live, and a listed slug the backend 404s is missing", async () => {
  const careers = await getPage("ar", "careers");
  assert.equal(careers.status === "ok" && careers.source, "live");
  assert.deepEqual(pageReads(), ["/api/v1/public/site/ar/pages/careers"]);
  navigation.pages.push({ slug: "gone", title: "Gone" });
  try {
    assert.equal((await getPage("ar", "gone")).status, "missing");
  } finally {
    navigation.pages.pop();
  }
});

test("getPage: the fixed pages (home, demo) are read even when the navigation does not list them", async () => {
  const demo = await getPage("ar", "demo");
  assert.equal(demo.status === "ok" && demo.source, "live");
  await getPage("ar", "home");
  assert.deepEqual(pageReads(), ["/api/v1/public/site/ar/pages/demo", "/api/v1/public/site/ar/pages/home"]);
});

test("getPage: with a stale navigation copy (backend down) an unlisted slug is still missing without a page read", async () => {
  await getPage("ar", "careers");
  backend = "down";
  reads = [];
  assert.equal((await getPage("ar", "zz-random-8")).status, "missing");
  assert.deepEqual(pageReads(), []);
  const careers = await getPage("ar", "careers");
  assert.equal(careers.status === "ok" && careers.source, "stale");
});

test("getPage: with no navigation (no copy, backend down or unpublished) today's behaviour stays: defaults for fixed pages, missing otherwise", async () => {
  backend = "down";
  const pricing = await getPage("ar", "pricing");
  assert.equal(pricing.status === "ok" && pricing.source, "default");
  assert.equal((await getPage("ar", "zz-random-9")).status, "missing");
  assert.ok(pageReads().includes("/api/v1/public/site/ar/pages/pricing"), "the page is still tried when the navigation is unavailable");
  backend = "unpublished";
  const unpublished = await getPage("ar", "pricing");
  assert.equal(unpublished.status === "ok" && unpublished.source, "default");
});
