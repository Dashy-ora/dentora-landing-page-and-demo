import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { proxyForm } from "@/lib/form-proxy";
import { formsSecret, signForm, signatureHeaders } from "@/lib/form-signature";

// Backend W65: the landing server signs each forwarded form so the backend keeps its per-visitor limit on any host.
const SECRET = "abcdefghijklmnopqrstuvwxyz012345";
const VECTOR_BODY = '{"language":"en","fields":{"name":"A"}}';

test("the signing string matches the backend's fixed vector", () => {
  assert.equal(signForm(SECRET, 1700000000, "contact", "203.0.113.7", VECTOR_BODY), "sha256=49a1df452a35bd91fda8de48d3d3524e454a4392c50d1631cae5bc1f93abc4ab");
  // No visitor address: the address part is empty, not left out.
  const expected = createHmac("sha256", SECRET).update(`1700000000.contact..${VECTOR_BODY}`).digest("hex");
  assert.equal(signForm(SECRET, 1700000000, "contact", null, VECTOR_BODY), `sha256=${expected}`);
});

test("no secret, or one shorter than 32 characters, adds no signature headers", () => {
  assert.equal(formsSecret({}), null);
  assert.equal(formsSecret({ LANDING_FORMS_SECRET: "short" }), null);
  assert.deepEqual(signatureHeaders("contact", "203.0.113.7", VECTOR_BODY, {}), {});
  assert.deepEqual(signatureHeaders("contact", "203.0.113.7", VECTOR_BODY, { LANDING_FORMS_SECRET: "x".repeat(31) }), {});
});

test("the forwarded call carries timestamp, signature and visitor address over the exact bytes sent", async () => {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => { calls.push(init); return new Response(null, { status: 202 }); }) as unknown as typeof fetch;
  const env = { DENTORA_API_URL: "http://backend.test", SITE_URL: "https://dentora.example", LANDING_FORMS_SECRET: SECRET, LANDING_CLIENT_IP_HEADER: "x-real-ip" };
  const request = new Request("https://dentora.example/api/forms/demo_request", { method: "POST", body: JSON.stringify({ language: "ar", fields: { name: "منى" }, company_website: "", extra: 1 }), headers: { "content-type": "application/json", origin: "https://dentora.example", host: "dentora.example", "x-real-ip": "198.51.100.23" } });
  const res = await proxyForm(request, "demo_request", { env, fetchImpl, nowMs: 1_700_000_123_456 });
  assert.equal(res.status, 202);
  const headers = calls[0].headers as Record<string, string>;
  const body = String(calls[0].body);
  assert.equal(headers["X-Dentora-Timestamp"], "1700000123");
  assert.equal(headers["X-Dentora-Visitor-Ip"], "198.51.100.23");
  assert.equal(headers["X-Dentora-Signature"], signForm(SECRET, 1700000123, "demo_request", "198.51.100.23", body));
  assert.ok(!body.includes("extra"), "the signed body is the trimmed one actually sent");
});

test("without a known visitor address the call is still signed, with no visitor header", async () => {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => { calls.push(init); return new Response(null, { status: 202 }); }) as unknown as typeof fetch;
  const env = { DENTORA_API_URL: "http://backend.test", SITE_URL: "https://dentora.example", LANDING_FORMS_SECRET: SECRET };
  const request = new Request("https://dentora.example/api/forms/contact", { method: "POST", body: JSON.stringify({ language: "en", fields: { name: "A" } }), headers: { "content-type": "application/json", origin: "https://dentora.example", host: "dentora.example", "x-real-ip": "198.51.100.23" } });
  await proxyForm(request, "contact", { env, fetchImpl, nowMs: 1_700_000_000_000 });
  const headers = calls[0].headers as Record<string, string>;
  assert.equal(headers["X-Dentora-Visitor-Ip"], undefined, "an untrusted header is never passed on");
  assert.equal(headers["X-Dentora-Signature"], signForm(SECRET, 1700000000, "contact", null, String(calls[0].body)));
});
