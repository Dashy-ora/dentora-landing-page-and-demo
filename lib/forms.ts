import type { FormDefinition, FormField, Lang } from "./types";

/** Client-side rules mirroring PlatformWebsiteSubmissions::fields() on the backend (W61). The server stays the authority. */
export type FieldProblem = "required" | "invalid";
export type FieldValues = Record<string, string>;
export type FieldErrors = Record<string, FieldProblem>;

const CONTROL_SINGLE = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩﻿]/u;
const CONTROL_MULTI = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F‪-‮⁦-⁩﻿]/u;
const PHONE = /^\+?[0-9][0-9 ]{5,19}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

function clean(value: string, max: number, multiline: boolean): string | null {
  const text = value.normalize("NFC").trim();
  if (text === "" || [...text].length > max || (multiline ? CONTROL_MULTI : CONTROL_SINGLE).test(text)) return null;
  return text;
}

/** Normalised value for one field, or null when the rules reject it. Empty optional fields are skipped by the caller. */
export function normaliseField(field: FormField, raw: string): string | number | null {
  switch (field.type) {
    case "number": {
      const text = raw.trim();
      if (!/^[0-9]{1,6}$/.test(text)) return null;
      const n = Number(text);
      return n >= 1 && n <= field.max ? n : null;
    }
    case "email": {
      const text = raw.trim();
      return text.length <= 254 && text.length <= field.max && EMAIL.test(text) ? text.toLowerCase() : null;
    }
    case "phone": {
      const text = raw.trim();
      return text.length <= field.max && PHONE.test(text) ? text : null;
    }
    case "textarea":
      return clean(raw, field.max, true);
    default:
      return clean(raw, field.max, false);
  }
}

export function validateForm(definition: FormDefinition, values: FieldValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of definition.fields) {
    const raw = values[field.key] ?? "";
    if (raw.trim() === "") {
      if (field.required) errors[field.key] = "required";
      continue;
    }
    if (normaliseField(field, raw) === null) errors[field.key] = "invalid";
  }
  return errors;
}

/** Body for the same-origin proxy: only shown fields, empty optional ones left out, numbers as integers. */
export function buildPayload(definition: FormDefinition, values: FieldValues, language: Lang, honeypot: string) {
  const fields: Record<string, string | number> = {};
  for (const field of definition.fields) {
    const raw = values[field.key] ?? "";
    if (raw.trim() === "") continue;
    const normalised = normaliseField(field, raw);
    if (normalised !== null) fields[field.key] = normalised;
  }
  return { language, fields, company_website: honeypot };
}

export type SubmitOutcome =
  | { kind: "success" }
  | { kind: "invalid"; fields: FieldErrors }
  | { kind: "rate_limited" }
  /** The backend is unset, unreachable or has the form switched off: nothing was sent, the visitor is shown how to reach us instead. */
  | { kind: "unreachable" }
  | { kind: "error" };

/** Maps the proxy's response to what the visitor sees. The visitor's input is never cleared by anything but `success`. */
export async function interpretResponse(response: Response): Promise<SubmitOutcome> {
  if (response.status === 202) return { kind: "success" };
  if (response.status === 429) return { kind: "rate_limited" };
  if (response.status === 503 || response.status === 404) return { kind: "unreachable" };
  if (response.status === 422) {
    try {
      const body = (await response.json()) as { fields?: Record<string, unknown> };
      const fields: FieldErrors = {};
      for (const key of Object.keys(body.fields ?? {})) fields[key] = "invalid";
      return { kind: "invalid", fields };
    } catch {
      return { kind: "invalid", fields: {} };
    }
  }
  return { kind: "error" };
}

export type SubmitState = {
  status: "idle" | "success" | "rate_limited" | "unreachable" | "error";
  errors: FieldErrors;
  /** What stays in the inputs. Only a successful send clears them. */
  values: FieldValues;
};

/**
 * One submit attempt end to end: client validation, the same-origin POST, and the resulting screen state.
 * Errors of every kind keep the visitor's input; field errors from the server (422) are shown per field.
 */
export async function runSubmit(input: {
  definition: FormDefinition;
  values: FieldValues;
  lang: Lang;
  honeypot: string;
  fetchImpl?: typeof fetch;
}): Promise<SubmitState> {
  const { definition, values, lang, honeypot } = input;
  const problems = validateForm(definition, values);
  if (Object.keys(problems).length > 0) return { status: "idle", errors: problems, values };
  let outcome: SubmitOutcome;
  try {
    const response = await (input.fetchImpl ?? fetch)(`/api/forms/${definition.key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildPayload(definition, values, lang, honeypot)),
    });
    outcome = await interpretResponse(response);
  } catch {
    outcome = { kind: "error" };
  }
  switch (outcome.kind) {
    case "success": return { status: "success", errors: {}, values: {} };
    case "invalid": return { status: "idle", errors: outcome.fields, values };
    case "rate_limited": return { status: "rate_limited", errors: {}, values };
    case "unreachable": return { status: "unreachable", errors: {}, values };
    default: return { status: "error", errors: {}, values };
  }
}
