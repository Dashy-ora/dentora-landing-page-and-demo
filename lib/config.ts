// Environment access. Secrets stay server-side; nothing here is exposed to the browser.

/** DENTORA_API_URL may be the origin ("http://127.0.0.1:8000") or already end in /api/v1. */
export function apiBase(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.DENTORA_API_URL?.trim();
  if (!raw) return null;
  const url = raw.replace(/\/+$/, "");
  return /\/api\/v1$/.test(url) ? url : `${url}/api/v1`;
}

export function apiOrigin(env: Record<string, string | undefined> = process.env): string | null {
  const base = apiBase(env);
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export function trialUrl(env: Record<string, string | undefined> = process.env): string {
  return env.PORTAL_TRIAL_URL?.trim() || "/contact";
}

/** Image URLs from the backend: absolute as-is, root-relative against the backend origin. */
export function mediaUrl(url: string, env: Record<string, string | undefined> = process.env): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/defaults/")) return url; // built-in default images live in public/, never on the backend
  if (url.startsWith("/")) {
    const origin = apiOrigin(env);
    return origin ? `${origin}${url}` : url;
  }
  return url;
}
