// LANDING-SEC fix 4 (proxy.ts:proxy:loadList-notFoundResponse-self-fetch-fanout): fixed routes and impossible slugs are decided
// without the page-list fetch, and the 404 render never re-enters the proxy. Adapted from the audit's v3-06 harness: the real
// proxy() runs, every same-origin fetch is modelled as a new invocation, and a page fetch re-enters the proxy only when Next's
// compiled matcher says it would.
import { proxyMatcher } from "./next-matcher";
import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

type Counts = { proxy: number; siteSlugs: number; render: number; selfFetches: number };
const SLUGS = ["home", "pricing", "about"];
const runsProxy = proxyMatcher(config.matcher);

async function visit(pathname: string, slugStatus = 200): Promise<{ status: number; counts: Counts; rendered: string[]; response: Response }> {
  const counts: Counts = { proxy: 0, siteSlugs: 0, render: 0, selfFetches: 0 };
  const rendered: string[] = [];
  const original = globalThis.fetch;
  async function invoke(url: string): Promise<Response> {
    const u = new URL(url);
    if (u.pathname.startsWith("/api/site-slugs/")) {
      counts.siteSlugs += 1;
      return slugStatus === 200 ? Response.json({ slugs: SLUGS }) : new Response("x", { status: slugStatus });
    }
    if (runsProxy(u.pathname)) {
      counts.proxy += 1;
      const response = await proxy(new NextRequest(u));
      if (response.status === 404) return response; // the proxy answered itself
    }
    counts.render += 1; // the page route renders
    rendered.push(u.pathname);
    return new Response(`<h1>rendered ${u.pathname}</h1>`, { status: 200 });
  }
  globalThis.fetch = (async (input: URL | string) => {
    counts.selfFetches += 1;
    return invoke(String(input));
  }) as typeof fetch;
  try {
    const response = await invoke(`https://landing.test${pathname}`);
    return { status: response.status, counts, rendered, response };
  } finally {
    globalThis.fetch = original;
  }
}

test("/ and /demo (and their English twins) make no site-slugs call", async () => {
  for (const pathname of ["/", "/demo", "/en", "/en/demo"]) {
    const { status, counts } = await visit(pathname);
    assert.equal(status, 200, pathname);
    assert.deepEqual(counts, { proxy: 1, siteSlugs: 0, render: 1, selfFetches: 0 }, pathname);
  }
});

test("the not-found pages skip the proxy entirely", async () => {
  for (const pathname of ["/page-not-found", "/en/page-not-found"]) {
    const { counts } = await visit(pathname);
    assert.deepEqual(counts, { proxy: 0, siteSlugs: 0, render: 1, selfFetches: 0 }, pathname);
  }
});

test("an unknown slug makes at most one site-slugs call and one render, and still answers the styled 404", async (t) => {
  for (const pathname of ["/zz-random-1", "/en/zz-random-2", "/demo/app-1"]) {
    const { status, counts, rendered, response } = await visit(pathname);
    t.diagnostic(`${pathname}: ${JSON.stringify(counts)}`);
    assert.equal(status, 404, pathname);
    assert.ok(counts.siteSlugs <= 1, `${pathname}: ${counts.siteSlugs} site-slugs calls`);
    assert.deepEqual(counts, { proxy: 1, siteSlugs: 1, render: 1, selfFetches: 2 }, pathname);
    assert.deepEqual(rendered, [pathname.startsWith("/en/") ? "/en/page-not-found" : "/page-not-found"]);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(await response.text(), /rendered \/(en\/)?page-not-found/);
  }
});

test("a slug that cannot be a page is a 404 without any site-slugs call", async () => {
  for (const pathname of ["/a/b/c", "/Bad_Slug"]) {
    const { status, counts } = await visit(pathname);
    assert.equal(status, 404, pathname);
    assert.equal(counts.siteSlugs, 0, pathname);
  }
});

test("a known CMS slug costs one site-slugs call and renders; with the list unavailable the page renders (fail-open)", async () => {
  const known = await visit("/pricing");
  assert.equal(known.status, 200);
  assert.deepEqual(known.counts, { proxy: 1, siteSlugs: 1, render: 1, selfFetches: 1 });
  const down = await visit("/zz-random-3", 504);
  assert.equal(down.status, 200);
  assert.deepEqual(down.rendered, ["/zz-random-3"]);
});
