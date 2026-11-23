import { ButtonLink } from "./ui";
import { formatDate, formatMoney, formatNumber, t } from "@/lib/i18n";
import type { Lang, Offer } from "@/lib/types";

export function discountLabel(offer: Offer, lang: Lang): string | null {
  if (!offer.discount) return null;
  return offer.discount.kind === "percent"
    ? `${formatNumber(offer.discount.value, lang)}% ${t(lang).off}`
    : `${formatMoney(offer.discount.value, "EGP", lang)} ${t(lang).off}`;
}

export function OfferCard({ offer, lang, trialUrl, compact = false }: { offer: Offer; lang: Lang; trialUrl: string; compact?: boolean }) {
  const s = t(lang);
  const discount = discountLabel(offer, lang);
  return (
    <article className={compact ? "dt-highlight rounded-control-lg p-3" : "dt-card"} data-offer={offer.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="dt-pill dt-pill-info">{offer.badge ?? s.limitedOffer}</span>
        {discount ? <span className="dt-pill dt-pill-success">{discount}</span> : null}
      </div>
      <h3 className="mt-3 text-title font-semibold text-fg">{offer.title}</h3>
      {offer.description ? <p className="mt-1 text-fg-secondary">{offer.description}</p> : null}
      <p className="mt-3 text-caption text-fg-secondary">
        {s.validUntil} <time dateTime={offer.ends_at}>{formatDate(offer.ends_at, lang)}</time>
        {offer.promo_code ? (
          <>
            {" · "}
            {s.promoCode}: <span className="font-mono font-semibold text-fg">{offer.promo_code}</span>
          </>
        ) : null}
      </p>
      {offer.button ? (
        <div className="mt-4">
          <ButtonLink button={offer.button} lang={lang} trialUrl={trialUrl} variant="tonal" />
        </div>
      ) : null}
    </article>
  );
}
