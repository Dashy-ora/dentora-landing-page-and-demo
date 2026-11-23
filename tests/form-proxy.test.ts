import assert from "node:assert/strict";
import test from "node:test";
import { clientIp } from "@/lib/client-ip";
import { MAX_BODY_BYTES, proxyForm } from "@/lib/form-proxy";

const env = { DENTORA_API_URL: "http://backend.test", SITE_URL: "https://dentora.example" };
const payload = { language: "en", fields: { name: "Mona", email: "m@c.com" }, company_website: "" };

function post(body: unknown, headers: Record<string, string> = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("https://dentora.example/api/forms/contact", { method: "POST", body: raw, headers: { "content-type": "application/json", origin: "https://dentora.example", host: "dentora.example", ...headers } });
}
function upstream(status: number, body?: unknown, headers: Record<string, string> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test("forwards to POST /public/site/forms/{form} and answers 202 {received:true}", async () => {
  const up = upstream(202, { received: true });
  const res = await proxyForm(post(payload), "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal(res.status, 202);
  assert.deepEqual(await res.json(), { received: true });
  assert.equal(up.calls[0].url, "http://backend.test/api/v1/public/site/forms/contact");
  assert.equal(up.calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(up.calls[0].init.body)), payload);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("only the three contract keys go upstream, and never browser headers", async () => {
  const up = upstream(202);
  await proxyForm(post({ ...payload, extra: "x" }, { cookie: "a=b", authorization: "Bearer x" }), "contact", { env, fetchImpl: up.fetchImpl });
  assert.deepEqual(Object.keys(JSON.parse(String(up.calls[0].init.body))).sort(), ["company_website", "fields", "language"]);
  const names = Object.keys(up.calls[0].init.headers as Record<string, string>).map((n) => n.toLowerCase());
  for (const forbidden of ["cookie", "authorization", "origin", "x-forwarded-host", "forwarded"]) assert.ok(!names.includes(forbidden));
});

test("visitor address: forwarded as X-Forwarded-For only when the operator says how many proxies to trust", async () => {
  const headers = { "x-forwarded-for": "198.51.100.7, 203.0.113.9" };
  const none = upstream(202);
  await proxyForm(post(payload, headers), "contact", { env, fetchImpl: none.fetchImpl });
  assert.equal((none.calls[0].init.headers as Record<string, string>)["X-Forwarded-For"], undefined, "untrusted by default: a visitor cannot pick their own address");
  const one = upstream(202);
  await proxyForm(post(payload, headers), "contact", { env: { ...env, LANDING_TRUSTED_PROXY_HOPS: "1" }, fetchImpl: one.fetchImpl });
  assert.equal((one.calls[0].init.headers as Record<string, string>)["X-Forwarded-For"], "203.0.113.9");
  const two = upstream(202);
  await proxyForm(post(payload, headers), "contact", { env: { ...env, LANDING_TRUSTED_PROXY_HOPS: "2" }, fetchImpl: two.fetchImpl });
  assert.equal((two.calls[0].init.headers as Record<string, string>)["X-Forwarded-For"], "198.51.100.7");
});

test("clientIp: named header, hop count, garbage ignored", () => {
  const h = (v: Record<string, string>) => new Headers(v);
  assert.equal(clientIp(h({ "cf-connecting-ip": "203.0.113.5" }), { LANDING_CLIENT_IP_HEADER: "CF-Connecting-IP" }), "203.0.113.5");
  assert.equal(clientIp(h({ "cf-connecting-ip": "not-an-ip" }), { LANDING_CLIENT_IP_HEADER: "cf-connecting-ip" }), null);
  assert.equal(clientIp(h({ "x-forwarded-for": "2001:db8::1" }), { LANDING_TRUSTED_PROXY_HOPS: "1" }), "2001:db8::1");
  assert.equal(clientIp(h({ "x-forwarded-for": "evil" }), { LANDING_TRUSTED_PROXY_HOPS: "1" }), null);
  assert.equal(clientIp(h({ "x-forwarded-for": "1.2.3.4" }), {}), null);
});

test("maps 422 to per-field flags without the backend's wording", async () => {
  const up = upstream(422, { error: { code: "validation_failed", message: "The value is invalid.", fields: { "fields.email": ["The value is invalid."], "fields.phone": ["x"] } } });
  const res = await proxyForm(post(payload), "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal(res.status, 422);
  assert.deepEqual(await res.json(), { error: "invalid", fields: { email: true, phone: true } });
});

test("maps 429, 404, 413 and failures", async () => {
  const limited = await proxyForm(post(payload), "contact", { env, fetchImpl: upstream(429, undefined, { "Retry-After": "600" }).fetchImpl });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "600");
  assert.equal((await proxyForm(post(payload), "contact", { env, fetchImpl: upstream(404).fetchImpl })).status, 404);
  assert.equal((await proxyForm(post(payload), "contact", { env, fetchImpl: upstream(500).fetchImpl })).status, 503);
  assert.equal((await proxyForm(post(payload), "contact", { env, fetchImpl: (async () => { throw new Error("down"); }) as unknown as typeof fetch })).status, 503);
  assert.equal((await proxyForm(post(payload), "contact", { env: {} })).status, 503);
});

test("same-origin only", async () => {
  const up = upstream(202);
  const run = (headers: Record<string, string>) => proxyForm(new Request("https://dentora.example/api/forms/contact", { method: "POST", body: JSON.stringify(payload), headers: { "content-type": "application/json", host: "dentora.example", ...headers } }), "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal((await run({ origin: "https://evil.example" })).status, 403);
  assert.equal((await run({})).status, 403, "no Origin header");
  assert.equal((await run({ origin: "https://dentora.example", "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await run({ origin: "https://dentora.example", "sec-fetch-site": "same-origin" })).status, 202);
  assert.equal(up.calls.length, 1);
});

test("rejects unknown forms, non-JSON, oversized and malformed bodies before calling the backend", async () => {
  const up = upstream(202);
  assert.equal((await proxyForm(post(payload), "newsletter", { env, fetchImpl: up.fetchImpl })).status, 404);
  assert.equal((await proxyForm(post(payload, { "content-type": "text/plain" }), "contact", { env, fetchImpl: up.fetchImpl })).status, 415);
  assert.equal((await proxyForm(post({ ...payload, fields: { message: "x".repeat(MAX_BODY_BYTES) } }), "contact", { env, fetchImpl: up.fetchImpl })).status, 413);
  assert.equal((await proxyForm(post("{broken"), "contact", { env, fetchImpl: up.fetchImpl })).status, 422);
  assert.equal((await proxyForm(post({ language: "fr", fields: {} }), "contact", { env, fetchImpl: up.fetchImpl })).status, 422);
  assert.equal((await proxyForm(post({ language: "en", fields: [1] }), "contact", { env, fetchImpl: up.fetchImpl })).status, 422);
  assert.equal(up.calls.length, 0);
});
