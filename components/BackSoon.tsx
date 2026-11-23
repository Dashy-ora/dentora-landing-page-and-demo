import { LogoMark } from "./Logo";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/** Plain page for "nothing published yet" and "backend down with no cached copy". No data, no links that could fail. */
export function BackSoon({ lang }: { lang: Lang }) {
  const s = t(lang).backSoon;
  return (
    <main id="content" className="flex flex-1 items-center justify-center px-4 py-16" data-state="back-soon">
      <div className="max-w-md text-center">
        <span className="dt-mark-ring mx-auto mb-4">
          <LogoMark size={26} />
        </span>
        <h1 className="text-page-title font-bold text-fg-strong">{s.title}</h1>
        <p className="mt-3 text-hero text-fg-secondary">{s.text}</p>
      </div>
    </main>
  );
}
