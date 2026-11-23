import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { fetchPublic, publicReadHeaders } from "@/lib/api";
import { resetLastGood, withFallback } from "@/lib/fallback";

beforeEach(() => resetLastGood());

test("backend down and no copy at all: unavailable (lib/data then serves the built-in defaults)", async () => {
  const r = await withFallback("k", async () => { throw new Error("down"); });
  assert.equal(r.status, "unavailable");
});

test("backend down after a good read: the last cached copy is served, marked stale", async () => {
  await withFallback("k", async () => ({ n: 1 }));
  const r = await withFallback("k", async () => { throw new Error("down"); });
  assert.deepEqual(r, { status: "ok", data: { n: 1 }, stale: true });
});

test("a newer good read replaces the copy", async () => {
  await withFallback("k", async () => ({ n: 1 }));
  await withFallback("k", async () => ({ n: 2 }));
  const r = await withFallback("k", async () => { throw new Error("down"); });
  assert.equal(r.status === "ok" && (r.data as { n: number }).n, 2);
});

test("404 (unpublished or switched off) is missing and drops the copy, so an unpublish is never masked", async () => {
  await withFallback("k", async () => ({ n: 1 }));
  assert.deepEqual(await withFallback("k", async () => null), { status: "missing" });
  assert.equal((await withFallback("k", async () => { throw new Error("down"); })).status, "unavailable");
});

test("copies are per key", async () => {
  await withFallback("a", async () => 1);
  assert.equal((await withFallback("b", async () => { throw new Error("down"); })).status, "unavailable");
});

const env = { DENTORA_API_URL: "http://backend.test" };
const reply = (status: number, body?: unknown) => (async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as unknown as typeof fetch;

test("fetchPublic maps 200, 404 and everything else", async () => {
  assert.deepEqual(await fetchPublic("/public/site/ar/navigation", { env, fetchImpl: reply(200, { data: { a: 1 } }) }), { kind: "ok", data: { a: 1 } });
  assert.deepEqual(await fetchPublic("/x", { env, fetchImpl: reply(404, { error: {} }) }), { kind: "missing" });
  for (const status of [429, 500, 503]) assert.deepEqual(await fetchPublic("/x", { env, fetchImpl: reply(status) }), { kind: "unavailable" });
  assert.deepEqual(await fetchPublic("/x", { env, fetchImpl: (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch }), { kind: "unavailable" });
  assert.deepEqual(await fetchPublic("/x", { env, fetchImpl: reply(200, { nope: 1 }) }), { kind: "unavailable" });
  assert.deepEqual(await fetchPublic("/x", { env: {}, fetchImpl: reply(200, { data: 1 }) }), { kind: "unavailable" }, "no DENTORA_API_URL");
});

test("server-side reads go to /api/v1 and send nothing the backend's public-host admission rejects", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const spy = (async (url: string, init: RequestInit) => { seen = { url, init }; return new Response(JSON.stringify({ data: 1 })); }) as unknown as typeof fetch;
  await fetchPublic("/public/site/en/pricing", { env, fetchImpl: spy });
  assert.equal(seen?.url, "http://backend.test/api/v1/public/site/en/pricing");
  const names = Object.keys(publicReadHeaders()).map((n) => n.toLowerCase());
  for (const forbidden of ["authorization", "forwarded", "x-forwarded-host", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-port", "origin", "sec-fetch-site", "cookie"]) {
    assert.ok(!names.includes(forbidden), `${forbidden} must not be sent on reads`);
  }
  assert.equal(seen?.init.method, "GET");
});

test("DENTORA_API_URL may already end in /api/v1", async () => {
  let url = "";
  const spy = (async (u: string) => { url = u; return new Response(JSON.stringify({ data: 1 })); }) as unknown as typeof fetch;
  await fetchPublic("/public/site/demo", { env: { DENTORA_API_URL: "http://backend.test/api/v1/" }, fetchImpl: spy });
  assert.equal(url, "http://backend.test/api/v1/public/site/demo");
});
