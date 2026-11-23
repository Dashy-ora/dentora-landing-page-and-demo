import { discountLabel } from "./OfferCard";
import { ButtonLink } from "./ui";
import { offersFor } from "@/lib/offers";
import type { Lang, Offer } from "@/lib/types";

/** Live offers placed in "top_banner", re-checked against their window at request time. */
export function TopBanner({ offers, now, lang, trialUrl }: { offers: Offer[]; now: number; lang: Lang; trialUrl: string }) {
  const live = offersFor(offers, "top_banner", now);
  if (live.length === 0) return null;
  const offer = live[0];
  const discount = discountLabel(offer, lang);
  return (
    <div className="dt-highlight" data-top-banner>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-center md:px-6">
        <p className="font-semibold">
          {offer.title}
          {discount ? ` · ${discount}` : ""}
        </p>
        {offer.button ? <ButtonLink button={offer.button} lang={lang} trialUrl={trialUrl} variant="primary" /> : null}
      </div>
    </div>
  );
}
