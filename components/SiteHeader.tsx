import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { SiteLink } from "./ui";
import { resolveAction } from "@/lib/actions";
import { t } from "@/lib/i18n";
import { otherLang, pagePath } from "@/lib/paths";
import type { Lang, Navigation } from "@/lib/types";

export function SiteHeader({ lang, slug, navigation, trialUrl }: { lang: Lang; slug: string; navigation: Navigation | null; trialUrl: string }) {
  const s = t(lang);
  const links = (navigation?.header ?? []).filter((link) => link.slug !== "home");
  const other = otherLang(lang);
  const trial = navigation ? resolveAction("start_trial", lang, trialUrl) : null;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface" data-site-header>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2">
        {s.skipToContent}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 md:px-6">
        <SiteLink href={pagePath("home", lang)} className="flex items-center gap-2 text-accent" aria-label={s.siteName}>
          <LogoMark size={26} />
          <span className="text-title font-bold text-fg-strong">{s.siteName}</span>
        </SiteLink>

        <nav className="ms-6 hidden items-center gap-1 md:flex" aria-label={s.menu}>
          {links.map((link) => (
            <SiteLink key={link.slug} href={pagePath(link.slug, lang)} className="dt-btn dt-btn-ghost">
              {link.title}
            </SiteLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <SiteLink href={pagePath(slug, other)} className="dt-btn dt-btn-outline dt-btn-sm" lang={other} hrefLang={other} aria-label={s.switchLanguageLabel}>
            {s.switchLanguage}
          </SiteLink>
          <div className="hidden lg:block">
            <ThemeToggle lang={lang} />
          </div>
          {trial ? (
            <SiteLink href={trial.href} external={trial.external} className="dt-btn dt-btn-primary hidden sm:inline-flex">
              {s.startTrial}
            </SiteLink>
          ) : null}
          {links.length > 0 ? (
            <details className="relative md:hidden">
              <summary className="dt-icon-btn dt-icon-btn-bordered list-none" aria-label={s.menu}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </summary>
              <div className="dt-menu absolute end-0 top-12 z-40">
                {links.map((link) => (
                  <SiteLink key={link.slug} href={pagePath(link.slug, lang)} className="dt-menu-item">
                    {link.title}
                  </SiteLink>
                ))}
                {trial ? (
                  <SiteLink href={trial.href} external={trial.external} className="dt-menu-item font-semibold text-accent">
                    {s.startTrial}
                  </SiteLink>
                ) : null}
                <div className="p-2">
                  <ThemeToggle lang={lang} />
                </div>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </header>
  );
}
