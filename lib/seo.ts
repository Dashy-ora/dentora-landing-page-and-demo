import type { Metadata } from "next";
import { mediaUrl, siteUrl } from "./config";
import { t } from "./i18n";
import { otherLang, pagePath } from "./paths";
import type { Lang, PageData } from "./types";

/** Absolute URL of a page in one language. */
export function absoluteUrl(slug: string, lang: Lang, env: Record<string, string | undefined> = process.env): string {
  const path = pagePath(slug, lang);
  return `${siteUrl(env)}${path === "/" ? "" : path}` || siteUrl(env);
}

/** hreflang pairs plus x-default (Arabic, the default language). Every published page exists in both languages. */
export function languageAlternates(slug: string, env: Record<string, string | undefined> = process.env) {
  return {
    ar: absoluteUrl(slug, "ar", env),
    en: absoluteUrl(slug, "en", env),
    "x-default": absoluteUrl(slug, "ar", env),
  };
}

export function titleFor(pageTitle: string | null, lang: Lang): string {
  const name = t(lang).siteName;
  return pageTitle && pageTitle !== name ? `${pageTitle} | ${name}` : name;
}

export function buildMetadata(input: {
  lang: Lang;
  slug: string;
  title: string | null;
  description: string | null;
  shareImage?: PageData["share_image"];
  env?: Record<string, string | undefined>;
}): Metadata {
  const env = input.env ?? process.env;
  const title = titleFor(input.title, input.lang);
  const url = absoluteUrl(input.slug, input.lang, env);
  const images = input.shareImage ? [{ url: mediaUrl(input.shareImage.url, env), width: input.shareImage.width, height: input.shareImage.height, alt: input.shareImage.alt ?? undefined }] : undefined;
  return {
    metadataBase: new URL(siteUrl(env)),
    title,
    description: input.description ?? undefined,
    alternates: { canonical: url, languages: languageAlternates(input.slug, env) },
    openGraph: {
      type: "website",
      siteName: t(input.lang).siteName,
      title,
      description: input.description ?? undefined,
      url,
      locale: input.lang === "ar" ? "ar_EG" : "en_US",
      alternateLocale: otherLang(input.lang) === "ar" ? "ar_EG" : "en_US",
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description: input.description ?? undefined, images: images?.map((image) => image.url) },
  };
}

/** Pages that must not be indexed: not published, not found, or the plain "Back soon" state. */
export function noIndexMetadata(lang: Lang, env: Record<string, string | undefined> = process.env): Metadata {
  return { metadataBase: new URL(siteUrl(env)), title: t(lang).siteName, robots: { index: false, follow: false } };
}
