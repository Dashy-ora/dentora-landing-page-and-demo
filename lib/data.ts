import { cacheLife, cacheTag } from "next/cache";
import { fetchPublic, type ReadResult } from "./api";
import { withFallback, type Loaded } from "./fallback";
import type { Area, Demo, FormDefinition, FormKey, Lang, Navigation, OffersData, PageData, Pricing } from "./types";

/**
 * Cached public reads (Cache Components). Each read is tagged by the backend area it comes from, so the signed refresh call
 * (`/api/revalidate`) drops exactly what a publish changed. The short `cacheLife` is only a safety net: it also keeps the live
 * catalog prices fresh, which no publish announces. A backend failure throws inside the cached scope so nothing bad is cached,
 * and `withFallback` then serves the last good copy.
 */
async function cachedRead(path: string, tags: Area[]): Promise<ReadResult> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag(...tags);
  const result = await fetchPublic(path);
  // A failure must not stick for the whole safety window (and must never be thrown out of a cache scope: that leaves the
  // response stream open). The shortest cacheLife wins, so a failed read is retried within seconds.
  if (result.kind === "unavailable") cacheLife({ stale: 0, revalidate: 5, expire: 10 });
  return result;
}

function read<T>(path: string, tags: Area[]): Promise<Loaded<T>> {
  return withFallback<T>(path, async () => {
    const result = await cachedRead(path, tags);
    if (result.kind === "ok") return result.data as T;
    if (result.kind === "missing") return null;
    throw new Error("The backend is unavailable.");
  });
}

export const getPage = (lang: Lang, slug: string) => read<PageData>(`/public/site/${lang}/pages/${slug}`, ["landing"]);
export const getNavigation = (lang: Lang) => read<Navigation>(`/public/site/${lang}/navigation`, ["landing"]);
export const getPricing = (lang: Lang) => read<Pricing>(`/public/site/${lang}/pricing`, ["landing", "offers"]);
export const getOffers = (lang: Lang) => read<OffersData>(`/public/site/${lang}/offers`, ["offers"]);
export const getDemo = () => read<Demo>("/public/site/demo", ["demo"]);
export const getForm = (lang: Lang, key: FormKey) => read<FormDefinition>(`/public/site/${lang}/forms/${key}`, ["forms"]);
