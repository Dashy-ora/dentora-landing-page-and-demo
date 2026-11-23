import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { isUnknownPage, pageRequest } from "@/lib/known-pages";
import { proxy } from "@/proxy";

const list = { slugs: ["home", "pricing", "features/finance"] };
const unknown = (path: string, l: typeof list | null) => {
  const request = pageRequest(path);
  return request === null ? "untouched" : isUnknownPage(request, l);
};

test("known pages pass (200 path)", () => {
  assert.equal(unknown("/", list), false);
  assert.equal(unknown("/pricing", list), false);
  assert.equal(unknown("/en/pricing", list), false);
  assert.equal(unknown("/en", list), false);
  assert.equal(unknown("/features/finance", list), false);
  assert.equal(unknown("/demo", list), false);
  assert.equal(unknown("/en/demo", list), false);
});

test("unknown pages are 404", () => {
  assert.equal(unknown("/nope", list), true);
  assert.equal(unknown("/en/nope", list), true);
  assert.equal(unknown("/a/b/c", list), true);
  assert.equal(unknown("/Bad_Slug", null), true);
});

test("backend down: no list means the page renders (Back soon), never a 404", () => {
  assert.equal(unknown("/nope", null), false);
  assert.equal(unknown("/pricing", null), false);
});

test("demo app, api, assets, sitemap, robots and internals are untouched", () => {
  for (const path of ["/demo/app", "/demo/app/patients", "/api/forms/contact", "/api/revalidate", "/api/site-slugs/ar", "/sitemap.xml", "/robots.txt", "/logo.png", "/_next/static/x.js", "/demo/app/assets/a.js"]) {
    assert.equal(pageRequest(path), null, path);
  }
});

async function run(path: string, slugs: string[] | null, status = 200) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: URL | string) =>
    String(url).includes("page-not-found") ? new Response("<h1>Not found page</h1>") : status === 200 ? Response.json({ slugs }) : new Response("x", { status })) as typeof fetch;
  try {
    return await proxy(new NextRequest(`http://localhost:3000${path}`));
  } finally {
    globalThis.fetch = original;
  }
}

test("proxy: real 404 for unknown, pass-through otherwise", async () => {
  const miss = await run("/nope", ["pricing"]);
  assert.equal(miss.status, 404);
  assert.match(await miss.text(), /Not found page/);
  assert.equal((await run("/en/nope", ["pricing"])).status, 404);
  const hit = await run("/pricing", ["pricing"]);
  assert.equal(hit.status, 200);
  assert.equal(hit.headers.get("x-middleware-rewrite"), null);
  const down = await run("/nope", null, 503);
  assert.equal(down.headers.get("x-middleware-rewrite"), null);
  const demo = await run("/demo/app/patients", []);
  assert.equal(demo.headers.get("x-middleware-rewrite"), null);
});
