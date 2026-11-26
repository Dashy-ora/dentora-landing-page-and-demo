// LANDING-SEC fixes 5 and 6 (lib/client-ip.ts:clientIp:named-header-trusted-without-peer-check and
// lib/client-ip.ts:clientIp:null-identity-shared-form-limit): guardrails around the visitor-address configuration, which only the
// deployment can make safe (see README "Security notes (LANDING-SEC)").
import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import { clientIp, resetClientIpWarnings } from "@/lib/client-ip";
import { proxyForm } from "@/lib/form-proxy";

afterEach(() => {
  mock.restoreAll();
  resetClientIpWarnings();
});

const h = (values: Record<string, string>) => new Headers(values);

test("clientIp rejects addresses with a zone ID (%), from a named header or from X-Forwarded-For", () => {
  for (const value of ["fe80::1%eth0", "fe80::1%25eth0", "fe80::1%1", "::1%lo"]) {
    assert.equal(clientIp(h({ "x-real-ip": value }), { LANDING_CLIENT_IP_HEADER: "x-real-ip" }), null, value);
    assert.equal(clientIp(h({ "x-forwarded-for": `198.51.100.7, ${value}` }), { LANDING_TRUSTED_PROXY_HOPS: "1" }), null, value);
  }
  // Plain addresses still pass.
  assert.equal(clientIp(h({ "x-real-ip": "2001:db8::1" }), { LANDING_CLIENT_IP_HEADER: "x-real-ip" }), "2001:db8::1");
  assert.equal(clientIp(h({ "x-real-ip": "203.0.113.5" }), { LANDING_CLIENT_IP_HEADER: "x-real-ip" }), "203.0.113.5");
  assert.equal(clientIp(h({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" }), { LANDING_TRUSTED_PROXY_HOPS: "1" }), "203.0.113.9");
});

test("both LANDING_CLIENT_IP_HEADER and LANDING_TRUSTED_PROXY_HOPS set: one warning per process, and the header still wins", () => {
  const warn = mock.method(console, "warn", () => {});
  const env = { LANDING_CLIENT_IP_HEADER: "x-real-ip", LANDING_TRUSTED_PROXY_HOPS: "1" };
  const headers = h({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "198.51.100.7" });
  for (let i = 0; i < 3; i += 1) assert.equal(clientIp(headers, env), "203.0.113.5");
  assert.equal(warn.mock.callCount(), 1);
  const message = String(warn.mock.calls[0].arguments[0]);
  assert.match(message, /LANDING_CLIENT_IP_HEADER/);
  assert.match(message, /LANDING_TRUSTED_PROXY_HOPS/);
});

test("only one source set: no warning", () => {
  const warn = mock.method(console, "warn", () => {});
  clientIp(h({ "x-real-ip": "203.0.113.5" }), { LANDING_CLIENT_IP_HEADER: "x-real-ip" });
  clientIp(h({ "x-forwarded-for": "203.0.113.5" }), { LANDING_TRUSTED_PROXY_HOPS: "1" });
  clientIp(h({ "x-real-ip": "203.0.113.5" }), { LANDING_CLIENT_IP_HEADER: "x-real-ip", LANDING_TRUSTED_PROXY_HOPS: "0" });
  assert.equal(warn.mock.callCount(), 0);
});

const SITE = { DENTORA_API_URL: "http://backend.test", SITE_URL: "https://dentora.example" };
function post(visitor: string) {
  return new Request("https://dentora.example/api/forms/contact", {
    method: "POST",
    headers: { host: "dentora.example", origin: "https://dentora.example", "content-type": "application/json", "x-real-ip": visitor },
    body: JSON.stringify({ language: "en", fields: { name: "A", email: "a@example.test" }, company_website: "" }),
  });
}
function upstream() {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return new Response(JSON.stringify({ received: true }), { status: 202 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test("a form forwarded with a backend and no visitor-address source logs one warning that every visitor shares one limit, and is still sent", async () => {
  const warn = mock.method(console, "warn", () => {});
  const up = upstream();
  for (const visitor of ["198.51.100.10", "203.0.113.20", "192.0.2.30"]) {
    const response = await proxyForm(post(visitor), "contact", { env: SITE, fetchImpl: up.fetchImpl });
    assert.equal(response.status, 202, "not refused: local development relies on it");
  }
  assert.equal(up.calls.length, 3);
  assert.equal(warn.mock.callCount(), 1);
  assert.match(String(warn.mock.calls[0].arguments[0]), /every visitor then shares one form limit/);
});

test("no warning when a visitor-address source is configured, or when no backend is configured", async () => {
  const warn = mock.method(console, "warn", () => {});
  const up = upstream();
  await proxyForm(post("198.51.100.10"), "contact", { env: { ...SITE, LANDING_CLIENT_IP_HEADER: "x-real-ip" }, fetchImpl: up.fetchImpl });
  await proxyForm(post("198.51.100.10"), "contact", { env: { ...SITE, LANDING_TRUSTED_PROXY_HOPS: "1" }, fetchImpl: up.fetchImpl });
  assert.equal((await proxyForm(post("198.51.100.10"), "contact", { env: { SITE_URL: SITE.SITE_URL }, fetchImpl: up.fetchImpl })).status, 503);
  assert.equal(warn.mock.callCount(), 0);
});
