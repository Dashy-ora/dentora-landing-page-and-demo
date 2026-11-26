import { isIP } from "node:net";

/**
 * The visitor address the backend's per-address form limit should see. Headers are only trusted when the operator says how
 * many reverse proxies sit in front of this server (LANDING_TRUSTED_PROXY_HOPS) or names a header the platform or CDN overwrites
 * (LANDING_CLIENT_IP_HEADER). With neither set nothing is trusted and the backend sees this server's own address.
 *
 * The code cannot check who set the header, so the deployment must guarantee it:
 * - On Vercel use only `x-real-ip` (Vercel sets it to the visitor address).
 * - A CDN header such as `cf-connecting-ip` is safe only when the origin cannot be reached except through that CDN; on Vercel that
 *   also means protecting the `*.vercel.app` and deployment URLs, or a visitor can call them directly and pick their own address.
 */
export function clientIp(headers: Headers, env: Record<string, string | undefined> = process.env): string | null {
  const named = env.LANDING_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (named) {
    warnIfBothSourcesSet(env);
    return plainIp(headers.get(named)?.trim() ?? "");
  }
  const hops = trustedHops(env);
  if (hops < 1) return null;
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  return plainIp(chain[chain.length - hops] ?? "");
}

/** An IPv4 or IPv6 address, never one with a zone ID (`fe80::1%eth0`), which is local-only and makes a fresh limit key per value. */
function plainIp(value: string): string | null {
  if (!value || value.includes("%")) return null;
  return isIP(value) ? value : null;
}

function trustedHops(env: Record<string, string | undefined>): number {
  const hops = Number.parseInt(env.LANDING_TRUSTED_PROXY_HOPS ?? "0", 10);
  return Number.isInteger(hops) && hops >= 1 ? hops : 0;
}

/** True when the operator configured where the visitor address comes from. */
export function ipSourceConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.LANDING_CLIENT_IP_HEADER?.trim()) || trustedHops(env) >= 1;
}

// One warning of each kind per server process. Tests reset them with resetClientIpWarnings().
const warned = { both: false, none: false };

export function resetClientIpWarnings(): void {
  warned.both = false;
  warned.none = false;
}

function warnIfBothSourcesSet(env: Record<string, string | undefined>): void {
  if (warned.both || trustedHops(env) < 1) return;
  warned.both = true;
  console.warn(
    "[dentora-landing] Both LANDING_CLIENT_IP_HEADER and LANDING_TRUSTED_PROXY_HOPS are set. LANDING_CLIENT_IP_HEADER wins and " +
      "LANDING_TRUSTED_PROXY_HOPS is ignored; set only one (on Vercel: LANDING_CLIENT_IP_HEADER=x-real-ip).",
  );
}

/**
 * Called when a form is forwarded. With a backend configured and no visitor-address source, the backend cannot tell visitors
 * apart: every visitor then shares one form limit. The request is still forwarded (local development relies on it).
 */
export function warnIfNoIpSource(env: Record<string, string | undefined> = process.env): void {
  if (warned.none || !env.DENTORA_API_URL?.trim() || ipSourceConfigured(env)) return;
  warned.none = true;
  console.warn(
    "[dentora-landing] Forwarding a form with no visitor-address source configured (LANDING_CLIENT_IP_HEADER or " +
      "LANDING_TRUSTED_PROXY_HOPS): every visitor then shares one form limit at the backend. On Vercel set LANDING_CLIENT_IP_HEADER=x-real-ip.",
  );
}
