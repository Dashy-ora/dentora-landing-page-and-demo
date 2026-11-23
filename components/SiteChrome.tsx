import { connection } from "next/server";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { TopBanner } from "./TopBanner";
import { trialUrl } from "@/lib/config";
import { requestNow } from "@/lib/clock";
import { getNavigation, getOffers } from "@/lib/data";
import type { Lang } from "@/lib/types";

/**
 * Header, top banner and footer around a page. Menus come from the cached navigation read; with no navigation (nothing
 * published, or the backend down with no copy) only a plain header is shown, and the page decides what to say.
 */
export async function SiteChrome({ lang, slug, children }: { lang: Lang; slug: string; children: ReactNode }) {
  await connection();
  const [navigation, offers] = await Promise.all([getNavigation(lang), getOffers(lang)]);
  const nav = navigation.status === "ok" ? navigation.data : null;
  const trial = trialUrl();
  return (
    <>
      <SiteHeader lang={lang} slug={slug} navigation={nav} trialUrl={trial} />
      {nav && offers.status === "ok" ? <TopBanner offers={offers.data.offers} now={requestNow()} lang={lang} trialUrl={trial} /> : null}
      {children}
      {nav ? <SiteFooter lang={lang} navigation={nav} /> : null}
    </>
  );
}
