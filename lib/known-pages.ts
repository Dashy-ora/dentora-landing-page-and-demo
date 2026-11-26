import { slugFromSegments } from "./paths";
import type { Lang } from "./types";

/** The styled not-found page. The proxy fetches it and answers with it under a 404 (a page cannot set its own status once it streams). */
export const NOT_FOUND_PATH = "/page-not-found";

/** Pages that exist as their own routes whatever the CMS says. */
const ALWAYS_KNOWN = new Set(["home", "demo", "page-not-found"]);

export function isAlwaysKnown(slug: string): boolean {
  return ALWAYS_KNOWN.has(slug);
}

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

/**
 * What the proxy can decide from the path alone, before it asks for the published-page list: a slug that cannot be a page is
 * unknown, a fixed route is known, and anything else needs the list.
 */
export function decideWithoutList(request: PageRequest): "unknown" | "known" | "needs-list" {
  if (request.slug === null) return "unknown";
  if (ALWAYS_KNOWN.has(request.slug)) return "known";
  return "needs-list";
}

/** What the published-page list said: `slugs` when it is known, null when the backend could not say (never a reason to 404). */
export type PageList = { slugs: string[] } | null;

/** True when the proxy should answer 404: the slug cannot be a page, or the site is published and does not list it. */
export function isUnknownPage(request: PageRequest, list: PageList): boolean {
  const decided = decideWithoutList(request);
  if (decided !== "needs-list") return decided === "unknown";
  if (list === null || request.slug === null) return false;
  return !list.slugs.includes(request.slug);
}
