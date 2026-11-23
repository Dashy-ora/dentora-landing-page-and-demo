import { Icon } from "../Icon";
import { discountLabel } from "../OfferCard";
import { Section, SiteLink } from "../ui";
import { liveOffers } from "@/lib/offers";
import { formatMoney, t } from "@/lib/i18n";
import { resolveAction } from "@/lib/actions";
import type { Lang, Plan } from "@/lib/types";
import type { PlansBlock } from "@/lib/types";
import type { BlockContext } from "./context";

function interval(plan: Plan, lang: Lang): string | null {
  const s = t(lang);
  return plan.interval === "month" ? s.perMonth : plan.interval === "year" ? s.perYear : null;
}

/** Plans table: prices come live from the backend catalog (never typed into the CMS); offers are re-checked against their window now. */
export function Plans({ block, ctx }: { block: PlansBlock; ctx: BlockContext }) {
  const s = t(ctx.lang);
  const pricing = ctx.pricing;
  if (!pricing || pricing.plans.length === 0) {
    return (
      <Section heading={block.heading}>
        <p className="text-fg-secondary" data-block="plans">{s.noPlans}</p>
      </Section>
    );
  }
  const live = liveOffers(pricing.offers, ctx.now).filter((offer) => offer.placements.includes("pricing_cards"));
  const trial = resolveAction("start_trial", ctx.lang, ctx.trialUrl);
  return (
    <Section heading={block.heading}>
      <ul className={`grid items-stretch gap-5 md:grid-cols-2 ${pricing.plans.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`} data-block="plans">
        {pricing.plans.map((plan) => {
          const offers = live.filter((offer) => plan.offer_ids.includes(offer.id));
          const unit = interval(plan, ctx.lang);
          return (
            <li key={plan.id} className={`dt-card flex flex-col gap-4 ${plan.highlighted ? "!border-accent shadow-xs" : ""}`} data-plan-highlighted={plan.highlighted ? "true" : "false"}>
              <div>
                {plan.highlighted ? <span className="dt-pill dt-pill-info mb-2">{s.mostPopular}</span> : null}
                <h3 className="text-title font-bold text-fg">{plan.name}</h3>
                {plan.tagline ? <p className="mt-1 text-fg-secondary">{plan.tagline}</p> : null}
              </div>
              <p className="flex flex-wrap items-baseline gap-2">
                {plan.price_minor === null ? (
                  <span className="text-title font-semibold text-fg">{s.priceOnRequest}</span>
                ) : plan.price_minor === 0 ? (
                  <span className="text-display font-bold text-fg-strong" data-price>{s.free}</span>
                ) : (
                  <>
                    <span className="text-display font-bold text-fg-strong tabular-nums" data-price>{formatMoney(plan.price_minor, plan.currency, ctx.lang)}</span>
                    {unit ? <span className="text-fg-secondary">{unit}</span> : null}
                  </>
                )}
              </p>
              {plan.setup_fee_minor ? (
                <p className="text-caption text-fg-secondary">
                  {s.setupFee}: <span className="tabular-nums">{formatMoney(plan.setup_fee_minor, plan.currency, ctx.lang)}</span>
                </p>
              ) : null}
              {offers.length > 0 ? (
                <ul className="space-y-2" data-plan-offers>
                  {offers.map((offer) => (
                    <li key={offer.id} className="dt-highlight rounded-control-lg px-3 py-2 text-caption">
                      <strong>{offer.badge ?? offer.title}</strong>
                      {discountLabel(offer, ctx.lang) ? ` · ${discountLabel(offer, ctx.lang)}` : null}
                      {offer.promo_code ? ` · ${s.promoCode}: ${offer.promo_code}` : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {plan.bullets.length > 0 ? (
                <ul className="space-y-2">
                  {plan.bullets.map((bullet, index) => (
                    <li key={index} className="flex items-start gap-2 text-fg">
                      <Icon name="check" className="mt-0.5 shrink-0 text-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {plan.modules.length > 0 ? (
                <div>
                  <p className="dt-section-label mb-2">{s.includedModules}</p>
                  <ul className="flex flex-wrap gap-2">
                    {plan.modules.map((module) => (
                      <li key={module.key} className="dt-pill dt-pill-neutral">{module.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {trial ? (
                <SiteLink href={trial.href} external={trial.external} className={`dt-btn dt-btn-lg mt-auto ${plan.highlighted ? "dt-btn-primary" : "dt-btn-outline"}`}>
                  {s.choosePlan}
                </SiteLink>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
