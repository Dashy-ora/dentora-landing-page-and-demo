import { isIP } from "node:net";

/**
 * The visitor address the backend's per-address form limit should see. Headers are only trusted when the operator says how
 * many reverse proxies sit in front of this server (LANDING_TRUSTED_PROXY_HOPS) or names a header the CDN overwrites
 * (LANDING_CLIENT_IP_HEADER, e.g. cf-connecting-ip). With neither set nothing is trusted and the backend sees this server's own address.
 */
export function clientIp(headers: Headers, env: Record<string, string | undefined> = process.env): string | null {
  const named = env.LANDING_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (named) {
    const value = headers.get(named)?.trim() ?? "";
    return isIP(value) ? value : null;
  }
  const hops = Number.parseInt(env.LANDING_TRUSTED_PROXY_HOPS ?? "0", 10);
  if (!Number.isInteger(hops) || hops < 1) return null;
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  const candidate = chain[chain.length - hops];
  return candidate && isIP(candidate) ? candidate : null;
}
