import { OfferCard } from "../OfferCard";
import { Section } from "../ui";
import { offersFor } from "@/lib/offers";
import type { OffersBlock } from "@/lib/types";
import type { BlockContext } from "./context";

/** The offers strip: live offers placed in "strip", re-filtered by their window at request time. Renders nothing when none are live. */
export function Offers({ block, ctx }: { block: OffersBlock; ctx: BlockContext }) {
  const offers = offersFor(ctx.offers ?? [], "strip", ctx.now);
  if (offers.length === 0) return null;
  return (
    <Section heading={block.heading}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-block="offers">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} lang={ctx.lang} trialUrl={ctx.trialUrl} />
        ))}
      </div>
    </Section>
  );
}
