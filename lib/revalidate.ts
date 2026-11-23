import { createHmac, timingSafeEqual } from "node:crypto";
import { AREAS, type Area } from "./types";

/**
 * Verifies the backend's signed refresh call exactly as W61 signs it (App\Jobs\RevalidateLandingSite):
 *   X-Dentora-Timestamp: <unix seconds>
 *   X-Dentora-Signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>
 * The timestamp must be within 5 minutes of now. A secret shorter than 16 characters counts as unset (as on the backend).
 */
export const MAX_SKEW_SECONDS = 300;
export const MIN_SECRET_LENGTH = 16;

export type VerifyResult = "ok" | "not_configured" | "rejected";

export function sign(secret: string, timestamp: number | string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export function verifySignature(input: {
  secret: string | undefined;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds: number;
}): VerifyResult {
  const { secret, timestamp, signature, body, nowSeconds } = input;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return "not_configured";
  if (!timestamp || !signature || !/^[0-9]{1,12}$/.test(timestamp)) return "rejected";
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_SKEW_SECONDS) return "rejected";
  const expected = Buffer.from(sign(secret, timestamp, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "rejected";
  return "ok";
}

export type RefreshBody = { area: Area; revision_id: string | null };

export function parseRefreshBody(body: string): RefreshBody | null {
  try {
    const parsed = JSON.parse(body) as { area?: unknown; revision_id?: unknown };
    if (typeof parsed.area !== "string" || !(AREAS as readonly string[]).includes(parsed.area)) return null;
    const revision = parsed.revision_id ?? null;
    if (revision !== null && typeof revision !== "string") return null;
    return { area: parsed.area as Area, revision_id: revision };
  } catch {
    return null;
  }
}
