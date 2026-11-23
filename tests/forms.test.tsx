import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FormView } from "@/components/FormView";
import { buildPayload, interpretResponse, runSubmit, validateForm } from "@/lib/forms";
import { form } from "./fixtures";

const respond = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  (async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers })) as unknown as typeof fetch;
const good = { name: "Dr Mona", email: "Mona@Clinic.com", phone: "+20 100 123 4567", branches: "3", message: "Hello" };

test("renders the published fields, labels, required marks and the hidden honeypot", () => {
  const out = renderToStaticMarkup(<FormView definition={form} lang="en" />);
  for (const label of ["Name", "Email", "Phone", "Branches", "Message"]) assert.match(out, new RegExp(`>${label}`));
  assert.match(out, /<input[^>]*name="company_website"/);
  assert.match(out, /<input[^>]*tabindex="-1"[^>]*name="company_website"|<input[^>]*name="company_website"[^>]*tabindex="-1"/);
  assert.match(out, /aria-hidden="true"/);
  assert.match(out, /placeholder="you@clinic\.com"/);
  assert.match(out, /<textarea[^>]*maxLength="2000"|<textarea[^>]*maxlength="2000"/);
});

test("client validation mirrors the server rules", () => {
  assert.deepEqual(validateForm(form, good), {});
  assert.deepEqual(validateForm(form, { ...good, name: "  " }), { name: "required" });
  assert.equal(validateForm(form, { ...good, email: "no-at-sign" }).email, "invalid");
  assert.equal(validateForm(form, { ...good, email: "a b@c.com" }).email, "invalid");
  assert.equal(validateForm(form, { ...good, phone: "12" }).phone, "invalid");
  assert.equal(validateForm(form, { ...good, phone: "abc12345" }).phone, "invalid");
  assert.equal(validateForm(form, { ...good, branches: "0" }).branches, "invalid");
  assert.equal(validateForm(form, { ...good, branches: "501" }).branches, "invalid");
  assert.equal(validateForm(form, { ...good, branches: "2.5" }).branches, "invalid");
  assert.equal(validateForm(form, { ...good, name: "x".repeat(121) }).name, "invalid");
  assert.equal(validateForm(form, { ...good, name: "bad‮one" }).name, "invalid", "bidi override characters are refused");
  assert.equal(validateForm(form, { ...good, name: "line\nbreak" }).name, "invalid", "newline only allowed in long text");
  assert.equal(validateForm(form, { ...good, message: "line\nbreak" }).message, undefined);
  assert.deepEqual(validateForm(form, { name: "A" }), {}, "optional fields may be empty");
  assert.deepEqual(validateForm(form, {}), { name: "required" });
});

test("payload: trimmed, email lower-cased, number as integer, empty optional fields left out", () => {
  const payload = buildPayload(form, { ...good, phone: "", message: "  " }, "ar", "");
  assert.deepEqual(payload, { language: "ar", fields: { name: "Dr Mona", email: "mona@clinic.com", branches: 3 }, company_website: "" });
});

test("202 shows the thank-you state and clears the form", async () => {
  const result = await runSubmit({ definition: form, values: good, lang: "en", honeypot: "", fetchImpl: respond(202, { received: true }) });
  assert.deepEqual(result, { status: "success", errors: {}, values: {} });
});

test("422 marks the failed fields and keeps everything the visitor typed", async () => {
  const result = await runSubmit({ definition: form, values: good, lang: "en", honeypot: "", fetchImpl: respond(422, { error: "invalid", fields: { email: true } }) });
  assert.equal(result.status, "idle");
  assert.deepEqual(result.errors, { email: "invalid" });
  assert.deepEqual(result.values, good);
});

test("429 says to try again in a few minutes and keeps the input", async () => {
  const result = await runSubmit({ definition: form, values: good, lang: "en", honeypot: "", fetchImpl: respond(429, { error: "rate_limited" }) });
  assert.equal(result.status, "rate_limited");
  assert.deepEqual(result.values, good);
  assert.match(renderToStaticMarkup(<FormView definition={form} lang="en" />), /Submit|Send/);
});

test("server and network failures keep the input", async () => {
  for (const fetchImpl of [respond(500), (async () => { throw new Error("offline"); }) as unknown as typeof fetch]) {
    const result = await runSubmit({ definition: form, values: good, lang: "en", honeypot: "", fetchImpl });
    assert.equal(result.status, "error");
    assert.deepEqual(result.values, good);
  }
});

test("client validation failure sends nothing and keeps the input", async () => {
  let called = false;
  const spy = (async () => { called = true; return new Response(null, { status: 202 }); }) as unknown as typeof fetch;
  const result = await runSubmit({ definition: form, values: { ...good, email: "bad" }, lang: "en", honeypot: "", fetchImpl: spy });
  assert.equal(called, false);
  assert.deepEqual(result.errors, { email: "invalid" });
  assert.deepEqual(result.values, { ...good, email: "bad" });
});

test("the honeypot value is passed through untouched", async () => {
  let body = "";
  const spy = (async (_u: string, init: RequestInit) => { body = String(init.body); return new Response(null, { status: 202 }); }) as unknown as typeof fetch;
  await runSubmit({ definition: form, values: good, lang: "en", honeypot: "http://spam", fetchImpl: spy });
  assert.equal(JSON.parse(body).company_website, "http://spam");
});

test("response interpretation", async () => {
  assert.deepEqual(await interpretResponse(new Response(null, { status: 202 })), { kind: "success" });
  assert.deepEqual(await interpretResponse(new Response(null, { status: 429 })), { kind: "rate_limited" });
  assert.deepEqual(await interpretResponse(new Response("not json", { status: 422 })), { kind: "invalid", fields: {} });
  assert.deepEqual(await interpretResponse(new Response(null, { status: 404 })), { kind: "unreachable" });
  assert.deepEqual(await interpretResponse(new Response(null, { status: 503 })), { kind: "unreachable" });
  assert.deepEqual(await interpretResponse(new Response(null, { status: 500 })), { kind: "error" });
});

test("messages are plain and bilingual, with the contract wording for 429", async () => {
  const { t } = await import("@/lib/i18n");
  assert.equal(t("en").form.rateLimited, "Please try again in a few minutes.");
  assert.match(t("ar").form.rateLimited, /بضع دقائق/);
});
