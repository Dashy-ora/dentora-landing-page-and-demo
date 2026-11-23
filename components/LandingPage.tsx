import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BackSoon } from "./BackSoon";
import { Blocks, needsOffers, needsPricing, type BlockContext } from "./blocks";
import { FormSection } from "./FormSection";
import { SiteChrome } from "./SiteChrome";
import { requestNow } from "@/lib/clock";
import { trialUrl } from "@/lib/config";
import { getNavigation, getOffers, getPage, getPricing } from "@/lib/data";
import { slugFromSegments } from "@/lib/paths";
import type { Lang } from "@/lib/types";

/** One CMS page by URL segments. 404 only when the site is published but this page is not; "Back soon" when nothing can be shown. */
export async function LandingPage({ lang, params }: { lang: Lang; params: Promise<{ slug?: string[] }> }) {
  const { slug: segments } = await params;
  const slug = slugFromSegments(segments);
  if (slug === null) notFound();
  await connection();
  const [page, navigation] = await Promise.all([getPage(lang, slug), getNavigation(lang)]);
  if (page.status === "missing" && navigation.status === "ok") notFound();
  if (page.status !== "ok") {
    return (
      <SiteChrome lang={lang} slug={slug}>
        <BackSoon lang={lang} />
      </SiteChrome>
    );
  }
  const data = page.data;
  const [pricing, offers] = await Promise.all([
    needsPricing(data.blocks) ? getPricing(lang) : null,
    needsOffers(data.blocks) ? getOffers(lang) : null,
  ]);
  const ctx: BlockContext = {
    lang,
    trialUrl: trialUrl(),
    now: requestNow(),
    pricing: pricing?.status === "ok" ? pricing.data : null,
    offers: offers?.status === "ok" ? offers.data.offers : null,
  };
  return (
    <SiteChrome lang={lang} slug={slug}>
      <main id="content" className="flex-1">
        {data.blocks.length === 0 ? <h1 className="mx-auto max-w-6xl px-4 py-10 text-display font-bold text-fg-strong md:px-6">{data.title}</h1> : null}
        <Blocks blocks={data.blocks} ctx={ctx} />
        {slug === "contact" ? (
          <section className="py-10 md:py-14">
            <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 md:grid-cols-2 md:px-6">
              <FormSection lang={lang} form="demo_request" anchor="demo-request" />
              <FormSection lang={lang} form="contact" anchor="contact-form" />
            </div>
          </section>
        ) : null}
      </main>
    </SiteChrome>
  );
}
