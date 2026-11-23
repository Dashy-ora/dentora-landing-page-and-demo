import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getNavigation } from "@/lib/data";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

// Request-time on purpose: the page list comes from the published site, which is not known at build time.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const navigation = await getNavigation("ar");
  if (navigation.status !== "ok") return [];
  const slugs = new Set(navigation.data.pages.map((page) => page.slug));
  return [...slugs].map((slug) => ({
    url: absoluteUrl(slug, "ar"),
    alternates: { languages: languageAlternates(slug) },
    changeFrequency: slug === "home" ? "weekly" : "monthly",
    priority: slug === "home" ? 1 : 0.7,
  }));
}
