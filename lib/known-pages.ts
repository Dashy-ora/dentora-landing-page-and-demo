import { slugFromSegments } from "./paths";
import type { Lang } from "./types";

/** Where the proxy sends unknown pages. The proxy rewrites there with status 404 (a page cannot set its own status once it streams). */
export const NOT_FOUND_PATH = "/page-not-found";

/** Pages that exist as their own routes whatever the CMS says. */
const ALWAYS_KNOWN = new Set(["home", "demo", "page-not-found"]);

/** What the proxy checks. Everything else (api, demo app, _next, files with an extension) is left alone. */
export type PageRequest = { lang: Lang; slug: string | null };

export function pageRequest(pathname: string): PageRequest | null {
  if (pathname === "/api" || pathname.startsWith("/api/")) return null;
  if (pathname === "/demo/app" || pathname.startsWith("/demo/app/")) return null;
  if (pathname.startsWith("/_next/")) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && segments[segments.length - 1].includes(".")) return null; // assets, sitemap.xml, robots.txt
  const english = segments[0] === "en";
  return { lang: english ? "en" : "ar", slug: slugFromSegments(english ? segments.slice(1) : segments) };
}

/** What the published-page list said: `slugs` when it is known, null when the backend could not say (never a reason to 404). */
export type PageList = { slugs: string[] } | null;

/** True when the proxy should answer 404: the slug cannot be a page, or the site is published and does not list it. */
export function isUnknownPage(request: PageRequest, list: PageList): boolean {
  if (request.slug === null) return true;
  if (ALWAYS_KNOWN.has(request.slug)) return false;
  if (list === null) return false;
  return !list.slugs.includes(request.slug);
}
