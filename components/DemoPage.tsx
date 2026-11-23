import { connection } from "next/server";
import { Blocks, needsOffers, needsPricing, type BlockContext } from "./blocks";
import { FormSection } from "./FormSection";
import { LogoMark } from "./Logo";
import { SiteChrome } from "./SiteChrome";
import { CmsImage, SiteLink } from "./ui";
import { requestNow } from "@/lib/clock";
import { mediaUrl, trialUrl } from "@/lib/config";
import { demoBuildAvailable } from "@/lib/demo-build";
import { getDemo, getOffers, getPage, getPricing } from "@/lib/data";
import { t } from "@/lib/i18n";
import { DEMO_APP_PATH } from "@/lib/paths";
import type { Demo, Lang } from "@/lib/types";

/** Where the demo's own "Start a real trial" button goes: a same-site path is localised nowhere, an https URL is external. */
export function trialTarget(demo: Demo | null, lang: Lang, fallback: string): { href: string; label: string; external: boolean } {
  const raw = demo?.trial.url ?? fallback;
  // A same-site path points at a landing page, so English visitors stay under /en.
  const url = lang === "en" && raw.startsWith("/") && !raw.startsWith("/en") && !raw.startsWith("/demo") ? `/en${raw}` : raw;
  return { href: url, label: demo?.trial.label[lang] ?? t(lang).demo.trial, external: /^https?:\/\//i.test(url) };
}

/** `appAvailable` is false when the portal demo build is not synced in: the page then shows the trial call to action. */
export function DemoIntro({ demo, lang, fallbackTrial, appAvailable = true }: { demo: Demo | null; lang: Lang; fallbackTrial: string; appAvailable?: boolean }) {
  const s = t(lang).demo;
  const enabled = demo?.enabled === true && appAvailable;
  const trial = trialTarget(demo, lang, fallbackTrial);
  if (!enabled || !demo) {
    return (
      <section className="px-4 py-12 md:px-6" data-demo-state="trial">
        <div className="dt-hero mx-auto max-w-3xl text-center !p-8 md:!p-12">
          <LogoMark className="dt-watermark" size={260} />
          <h1 className="text-display font-bold text-white">{s.unavailableTitle}</h1>
          <p className="mx-auto mt-4 max-w-xl text-hero text-white/90">{s.unavailableText}</p>
          <div className="mt-6 flex justify-center">
            <SiteLink href={trial.href} external={trial.external} className="dt-btn dt-btn-lg dt-btn-tonal">{trial.label}</SiteLink>
          </div>
        </div>
      </section>
    );
  }
  const clinicName = demo.clinic.name[lang];
  return (
    <section className="px-4 py-12 md:px-6" data-demo-state="enabled">
      <div className="dt-hero mx-auto max-w-3xl !p-8 md:!p-12">
        <LogoMark className="dt-watermark" size={260} />
        <div className="flex items-center gap-3">
          {demo.clinic.logo_url ? (
            <CmsImage image={{ url: mediaUrl(demo.clinic.logo_url), mime: "", width: 56, height: 56, alt: clinicName }} className="h-14 w-14 rounded-control-lg bg-surface object-contain p-1" />
          ) : null}
          <span className="dt-pill dt-pill-info">{s.sampleNote}</span>
        </div>
        <h1 className="mt-4 text-display font-bold text-white">{clinicName}</h1>
        <p className="mt-4 text-hero text-white/90">{demo.welcome[lang]}</p>
        <p className="mt-2 text-white/80">{s.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SiteLink href={DEMO_APP_PATH} className="dt-btn dt-btn-lg dt-btn-tonal">{s.open}</SiteLink>
          <SiteLink href={trial.href} external={trial.external} className="dt-btn dt-btn-lg dt-btn-outline">{trial.label}</SiteLink>
        </div>
      </div>
    </section>
  );
}

/** /demo: the intro built from the published demo settings, or a trial call to action when the demo is off or unpublished. */
export async function DemoPage({ lang }: { lang: Lang }) {
  await connection();
  const [demo, page] = await Promise.all([getDemo(), getPage(lang, "demo")]);
  const settings = demo.status === "ok" ? demo.data : null;
  const appAvailable = demoBuildAvailable();
  const blocks = page.status === "ok" ? page.data.blocks : [];
  const [pricing, offers] = await Promise.all([needsPricing(blocks) ? getPricing(lang) : null, needsOffers(blocks) ? getOffers(lang) : null]);
  const ctx: BlockContext = {
    lang,
    trialUrl: trialUrl(),
    now: requestNow(),
    demoApp: appAvailable,
    pricing: pricing?.status === "ok" ? pricing.data : null,
    offers: offers?.status === "ok" ? offers.data.offers : null,
  };
  const enabled = settings?.enabled === true && appAvailable;
  return (
    <SiteChrome lang={lang} slug="demo">
      <main id="content" className="flex-1">
        <DemoIntro demo={settings} lang={lang} fallbackTrial={trialUrl()} appAvailable={appAvailable} />
        <Blocks blocks={blocks} ctx={ctx} />
        {!enabled ? (
          <section className="pb-12">
            <div className="mx-auto w-full max-w-xl px-4 md:px-6">
              <FormSection lang={lang} form="trial_interest" anchor="trial-interest" />
            </div>
          </section>
        ) : null}
      </main>
    </SiteChrome>
  );
}
