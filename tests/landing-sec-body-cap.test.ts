// LANDING-SEC fix 2 (lib/form-proxy.ts:proxyForm:request-text-before-body-cap): the 8 KiB cap is enforced while the body streams in,
// so a chunked body with no Content-Length is never buffered whole, and a malformed Content-Length is refused.
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import test from "node:test";
import { MAX_BODY_BYTES, proxyForm } from "@/lib/form-proxy";

const env = { DENTORA_API_URL: "http://backend.test", SITE_URL: "https://dentora.example", LANDING_CLIENT_IP_HEADER: "x-real-ip" };
const browser = { "content-type": "application/json", origin: "https://dentora.example", host: "dentora.example" };
const TOTAL = 1024 * 1024; // 1 MiB
const CHUNK = 1024;

function upstream() {
  const calls: unknown[] = [];
  const fetchImpl = (async (...args: unknown[]) => {
    calls.push(args);
    return new Response(null, { status: 202 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

function streamed(byte = 0x61) {
  const state = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (state.pulled >= TOTAL) return controller.close();
      const n = Math.min(CHUNK, TOTAL - state.pulled);
      state.pulled += n;
      controller.enqueue(new Uint8Array(n).fill(byte));
    },
    cancel() {
      state.cancelled = true;
    },
  });
  const request = new Request("https://dentora.example/api/forms/contact", { method: "POST", body, headers: browser, duplex: "half" } as RequestInit);
  return { request, state };
}

test("a streamed 1 MiB body with no Content-Length: 413 after about MAX_BODY_BYTES, the stream is cancelled, nothing is forwarded", async (t) => {
  const up = upstream();
  const { request, state } = streamed();
  assert.equal(request.headers.get("content-length"), null);
  const response = await proxyForm(request, "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "too_large" });
  t.diagnostic(`pulled ${state.pulled} of ${TOTAL} bytes (cap ${MAX_BODY_BYTES}, chunk ${CHUNK})`);
  assert.ok(state.pulled <= MAX_BODY_BYTES + 2 * CHUNK, `read ${state.pulled} bytes of ${TOTAL}`);
  assert.equal(state.cancelled, true);
  assert.equal(up.calls.length, 0);
});

test("a real chunked 1 MiB POST through a Node HTTP server: 413 long before the whole body is read", async (t) => {
  const up = upstream();
  let handlerBytes = 0;
  let handlerStatus = 0;
  const server = http.createServer(async (incoming, outgoing) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) if (typeof value === "string") headers.set(key, value);
    const counted = Readable.from((async function* () {
      for await (const chunk of incoming) {
        handlerBytes += (chunk as Buffer).length;
        yield chunk;
      }
    })());
    const request = new Request(`http://${incoming.headers.host}${incoming.url}`, { method: incoming.method, headers, body: Readable.toWeb(counted) as ReadableStream, duplex: "half" } as RequestInit);
    const response = await proxyForm(request, "contact", { env, fetchImpl: up.fetchImpl });
    handlerStatus = response.status;
    outgoing.writeHead(response.status, { "content-type": "application/json", connection: "close" });
    outgoing.end(await response.text());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  const clientStatus = await new Promise<number>((resolve) => {
    const client = http.request({ host: "127.0.0.1", port, method: "POST", path: "/api/forms/contact", headers: { ...browser, "transfer-encoding": "chunked" } }, (reply) => {
      reply.resume();
      resolve(reply.statusCode ?? 0);
    });
    client.on("error", () => resolve(handlerStatus)); // the server may close the socket while the client is still writing
    const buffer = Buffer.alloc(16 * 1024, 0x61);
    let written = 0;
    const pump = () => {
      while (written < TOTAL) {
        written += buffer.length;
        if (!client.write(buffer)) return void client.once("drain", pump);
      }
      client.end();
    };
    pump();
  });
  server.closeAllConnections();
  server.close();
  t.diagnostic(`handler read ${handlerBytes} of ${TOTAL} bytes, client saw ${clientStatus}`);
  assert.equal(handlerStatus, 413);
  assert.ok(clientStatus === 413 || clientStatus === 0, `client saw ${clientStatus}`);
  // The Node stream bridge buffers a couple of 16 KiB socket chunks ahead of the reader; the whole 1 MiB is never read.
  assert.ok(handlerBytes <= MAX_BODY_BYTES + 4 * 16 * 1024, `the handler read ${handlerBytes} bytes of ${TOTAL}`);
  assert.equal(up.calls.length, 0);
});

test("a Content-Length that is not a plain non-negative integer is refused before anything is read", async () => {
  for (const length of ["abc", "-1", "1e3", "12.5", ""]) {
    const up = upstream();
    const request = new Request("https://dentora.example/api/forms/contact", { method: "POST", body: JSON.stringify({ language: "en", fields: { name: "A" }, company_website: "" }), headers: { ...browser, "content-length": length } });
    const response = await proxyForm(request, "contact", { env, fetchImpl: up.fetchImpl });
    assert.equal(response.status, 400, `content-length ${JSON.stringify(length)}`);
    assert.deepEqual(await response.json(), { error: "invalid", fields: {} });
    assert.equal(up.calls.length, 0);
  }
});

test("a body at the cap is still decoded as UTF-8 and forwarded; one byte over is 413", async () => {
  const text = (size: number) => {
    const base = JSON.stringify({ language: "en", fields: { message: "" }, company_website: "" });
    // Fill with a two-byte character plus ASCII so multi-byte decoding is exercised right up to the cap.
    const room = size - Buffer.byteLength(base);
    const message = "é".repeat(Math.floor(room / 2)) + "a".repeat(room % 2);
    return JSON.stringify({ language: "en", fields: { message }, company_website: "" });
  };
  const exact = text(MAX_BODY_BYTES);
  assert.equal(Buffer.byteLength(exact), MAX_BODY_BYTES);
  const up = upstream();
  const ok = await proxyForm(new Request("https://dentora.example/api/forms/contact", { method: "POST", body: exact, headers: browser }), "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal(ok.status, 202);
  assert.equal((JSON.parse(String((up.calls[0] as [string, RequestInit])[1].body)) as { fields: { message: string } }).fields.message, (JSON.parse(exact) as { fields: { message: string } }).fields.message);
  const over = await proxyForm(new Request("https://dentora.example/api/forms/contact", { method: "POST", body: exact + " ", headers: browser }), "contact", { env, fetchImpl: up.fetchImpl });
  assert.equal(over.status, 413);
});
