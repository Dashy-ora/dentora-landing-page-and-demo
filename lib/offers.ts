import type { Offer } from "./types";

/**
 * An offer is public only while starts_at <= now < ends_at. The backend checks this on every read, but the landing site caches
 * reads for up to a minute (and serves the last copy when the backend is down), so the window is checked again at request time.
 */
export function isLive(offer: Pick<Offer, "starts_at" | "ends_at">, now: Date | number): boolean {
  const at = typeof now === "number" ? now : now.getTime();
  const start = Date.parse(offer.starts_at);
  const end = Date.parse(offer.ends_at);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start <= at && at < end;
}

export function liveOffers(offers: Offer[], now: Date | number): Offer[] {
  return offers.filter((offer) => isLive(offer, now));
}

export function offersFor(offers: Offer[], placement: "strip" | "pricing_cards" | "top_banner", now: Date | number): Offer[] {
  return liveOffers(offers, now).filter((offer) => offer.placements.includes(placement));
}
