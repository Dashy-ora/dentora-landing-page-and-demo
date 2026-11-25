import { createHmac } from "node:crypto";

/** Shorter secrets are treated as "not configured" (the backend does the same). */
export const MIN_FORMS_SECRET_LENGTH = 32;

export function formsSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.LANDING_FORMS_SECRET?.trim() ?? "";
  return secret.length >= MIN_FORMS_SECRET_LENGTH ? secret : null;
}

/**
 * Signs a forwarded form (backend W65): HMAC-SHA256 with LANDING_FORMS_SECRET over
 * "<timestamp>.<form>.<visitor ip or empty>.<raw body>". The backend then trusts the visitor address for the per-visitor form
 * limit whatever address this server calls from (Vercel has no fixed outgoing address). Same value on both sides.
 */
export function signForm(secret: string, timestamp: number, form: string, ip: string | null, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${form}.${ip ?? ""}.${body}`).digest("hex")}`;
}

/** The three headers added to the forwarded call, or none when no secret is configured. */
export function signatureHeaders(form: string, ip: string | null, body: string, env: Record<string, string | undefined> = process.env, nowMs: number = Date.now()): Record<string, string> {
  const secret = formsSecret(env);
  if (!secret) return {};
  const timestamp = Math.floor(nowMs / 1000);
  const headers: Record<string, string> = { "X-Dentora-Timestamp": String(timestamp), "X-Dentora-Signature": signForm(secret, timestamp, form, ip, body) };
  if (ip) headers["X-Dentora-Visitor-Ip"] = ip;
  return headers;
}
