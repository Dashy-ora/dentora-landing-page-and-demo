import type { Lang } from "./types";

/** CMS page slug -> public path. `home` is the root; English lives under /en. */
export function pagePath(slug: string, lang: Lang): string {
  const base = lang === "en" ? "/en" : "";
  if (slug === "home" || slug === "") return base || "/";
  return `${base}/${slug}`;
}

const SEGMENT = /^[a-z0-9-]{1,60}$/;

/** URL segments -> CMS slug, or null when the path cannot be a page (more than one nesting level, odd characters). */
export function slugFromSegments(segments: string[] | undefined): string | null {
  if (!segments || segments.length === 0) return "home";
  if (segments.length > 2) return null;
  if (!segments.every((segment) => SEGMENT.test(segment))) return null;
  return segments.join("/");
}

export function otherLang(lang: Lang): Lang {
  return lang === "ar" ? "en" : "ar";
}

export const DEMO_APP_PATH = "/demo/app";
