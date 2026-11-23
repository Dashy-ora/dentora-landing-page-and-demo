import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { MAX_SKEW_SECONDS, parseRefreshBody, sign, verifySignature } from "@/lib/revalidate";

const secret = "0123456789abcdef-secret";
const body = JSON.stringify({ area: "landing", revision_id: "5b7e0f9e-2c1a-4b6d-8f3a-1d2e3f4a5b6c" });
const ts = 1_795_000_000;

// Reference implementation straight from the backend's RevalidateLandingSite::signed():
//   'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret)
const backendSignature = (s: string, t: number, b: string) => `sha256=${createHmac("sha256", s).update(`${t}.${b}`).digest("hex")}`;

const check = (over: Partial<Parameters<typeof verifySignature>[0]> = {}) =>
  verifySignature({ secret, timestamp: String(ts), signature: backendSignature(secret, ts, body), body, nowSeconds: ts, ...over });

test("accepts a signature made exactly as W61 signs it", () => {
  assert.equal(check(), "ok");
  assert.equal(sign(secret, ts, body), backendSignature(secret, ts, body));
});

test("rejects a wrong secret, a tampered body and a bad or missing signature", () => {
  assert.equal(check({ signature: backendSignature("another-secret-value-1", ts, body) }), "rejected");
  assert.equal(check({ body: body.replace("landing", "offers") }), "rejected");
  assert.equal(check({ signature: null }), "rejected");
  assert.equal(check({ signature: "sha256=deadbeef" }), "rejected");
  assert.equal(check({ signature: backendSignature(secret, ts, body).replace("sha256=", "") }), "rejected");
  assert.equal(check({ signature: "" }), "rejected");
});

test("the timestamp is part of the signed text and must be within 5 minutes", () => {
  assert.equal(check({ nowSeconds: ts + MAX_SKEW_SECONDS }), "ok");
  assert.equal(check({ nowSeconds: ts + MAX_SKEW_SECONDS + 1 }), "rejected");
  assert.equal(check({ nowSeconds: ts - MAX_SKEW_SECONDS }), "ok");
  assert.equal(check({ nowSeconds: ts - MAX_SKEW_SECONDS - 1 }), "rejected");
  assert.equal(check({ timestamp: String(ts + 1) }), "rejected", "replaying the signature with another timestamp");
  assert.equal(check({ timestamp: "abc" }), "rejected");
  assert.equal(check({ timestamp: null }), "rejected");
});

test("an unset or short secret (< 16 characters, like the backend) means not configured", () => {
  assert.equal(check({ secret: undefined }), "not_configured");
  assert.equal(check({ secret: "" }), "not_configured");
  assert.equal(check({ secret: "short" }), "not_configured");
});

test("refresh body: only the four known areas", () => {
  assert.deepEqual(parseRefreshBody(body), { area: "landing", revision_id: "5b7e0f9e-2c1a-4b6d-8f3a-1d2e3f4a5b6c" });
  assert.deepEqual(parseRefreshBody('{"area":"demo","revision_id":null}'), { area: "demo", revision_id: null });
  for (const area of ["offers", "forms"]) assert.equal(parseRefreshBody(JSON.stringify({ area, revision_id: null }))?.area, area);
  assert.equal(parseRefreshBody('{"area":"media","revision_id":null}'), null);
  assert.equal(parseRefreshBody("not json"), null);
  assert.equal(parseRefreshBody('{"area":"landing","revision_id":5}'), null);
});
