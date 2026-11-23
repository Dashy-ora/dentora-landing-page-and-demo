import { LogoMark } from "./Logo";
import { SiteLink } from "./ui";
import { t } from "@/lib/i18n";
import { pagePath } from "@/lib/paths";
import type { Lang } from "@/lib/types";

export function NotFoundView({ lang }: { lang: Lang }) {
  const s = t(lang).notFound;
  return (
    <main id="content" className="flex flex-1 items-center justify-center px-4 py-16" data-state="not-found">
      <div className="max-w-md text-center">
        <span className="dt-mark-ring mx-auto mb-4">
          <LogoMark size={26} />
        </span>
        <h1 className="text-page-title font-bold text-fg-strong">{s.title}</h1>
        <p className="mt-3 landing-lead text-fg-secondary">{s.text}</p>
        <div className="mt-6">
          <SiteLink href={pagePath("home", lang)} className="dt-btn dt-btn-primary dt-btn-lg">{s.home}</SiteLink>
        </div>
      </div>
    </main>
  );
}
