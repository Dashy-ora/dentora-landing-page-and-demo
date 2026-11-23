import type { Lang, Offer, Pricing } from "@/lib/types";

/** Everything a block may need besides its own content. `now` is fixed per request so offers are filtered consistently. */
export type BlockContext = {
  lang: Lang;
  trialUrl: string;
  now: number;
  /** Pricing joined with live offers; null when the backend has none (or the page has no plans block). */
  pricing: Pricing | null;
  /** Live offers list for the strip block; null when unavailable. */
  offers: Offer[] | null;
};
