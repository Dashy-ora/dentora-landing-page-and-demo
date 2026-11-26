import { cacheLife, cacheTag } from "next/cache";
import { fetchPublic, type ReadResult } from "./api";
import { defaultDemo, defaultForm, defaultNavigation, defaultOffers, defaultPage, defaultPricing } from "@/content/defaults";
import { apiBase } from "./config";
import { requestNow } from "./clock";
import { warnDefaultsServed } from "./default-log";
import { withFallback, type Loaded } from "./fallback";
import { isAlwaysKnown } from "./known-pages";
import { isDemo, isFormDefinition, isNavigation, isOffersData, isPageData, isPricing, type Guard } from "./shape";
import type { Area, Demo, FormDefinition, FormKey, Lang, Navigation, OffersData, PageData, Pricing } from "./types";

/**
 * Cached public reads (Cache Components). Each read is tagged by the backend area it comes from, so the signed refresh call
 * (`/api/revalidate`) drops exactly what a publish changed. The short `cacheLife` is only a safety net: it also keeps the live
 * catalog prices fresh, which no publish announces. A backend failure throws inside the cached scope so nothing bad is cached,
 * and `withFallback` then serves the last good copy. When there is no copy either (no `DENTORA_API_URL`, unreachable, timed out,
 * 404 or an invalid shape) the built-in defaults in `content/defaults` are served, with a server-side warning.
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

/** Where a result came from: the live API, the last good copy of it, or the built-in defaults. */
export type Source = "live" | "stale" | "default";
export type Resolved<T> = { status: "ok"; data: T; source: Source } | { status: "missing" };

/** Live API, then the last good copy. Never throws; "unavailable" covers no API configured, outage, timeout and bad shape. */
function fromApi<T>(path: string, tags: Area[], guard: Guard): Promise<Loaded<T>> {
  if (!apiBase()) return Promise.resolve({ status: "unavailable" });
  return withFallback<T>(
    path,
    async () => {
      const result = await cachedRead(path, tags);
      if (result.kind === "ok") {
        if (!guard(result.data)) throw new Error("The backend sent an unexpected shape.");
        return result.data as T;
      }
      if (result.kind === "missing") return null;
      throw new Error("The backend is unavailable.");
    },
    tags,
  );
}

function reasonFor(loaded: Loaded<unknown>): string {
  if (!apiBase()) return "DENTORA_API_URL is not set";
  return loaded.status === "missing" ? "the API has nothing published (404)" : "the API is unavailable or sent an unusable answer";
}

function fromLoaded<T>(path: string, loaded: Loaded<T>, makeDefault: () => T | null): Resolved<T> {
  if (loaded.status === "ok") return { status: "ok", data: loaded.data, source: loaded.stale ? "stale" : "live" };
  const data = makeDefault();
  if (data === null) return { status: "missing" };
  warnDefaultsServed(path, reasonFor(loaded));
  return { status: "ok", data, source: "default" };
}

async function read<T>(path: string, tags: Area[], guard: Guard, makeDefault: () => T | null): Promise<Resolved<T>> {
  return fromLoaded(path, await fromApi<T>(path, tags, guard), makeDefault);
}

export const getNavigation = (lang: Lang) => read<Navigation>(`/public/site/${lang}/navigation`, ["landing"], isNavigation, () => defaultNavigation(lang));
export const getPricing = (lang: Lang) => read<Pricing>(`/public/site/${lang}/pricing`, ["landing", "offers"], isPricing, () => defaultPricing(lang, requestNow()));
export const getOffers = (lang: Lang) => read<OffersData>(`/public/site/${lang}/offers`, ["offers"], isOffersData, () => defaultOffers(lang, requestNow()));
export const getDemo = () => read<Demo>("/public/site/demo", ["demo"], isDemo, () => defaultDemo());
export const getForm = (lang: Lang, key: FormKey) => read<FormDefinition>(`/public/site/${lang}/forms/${key}`, ["forms"], isFormDefinition, () => defaultForm(lang, key));

/**
 * A page by slug. A slug the live site does not have stays "missing" (a real 404) as long as the live site is published; with the
 * site unpublished or unreachable the fixed default pages answer, and an unknown slug is still "missing".
 *
 * The navigation (one shared, cached read) is read first. When it came from the live API or its last good copy, a slug it does not
 * list is "missing" without a backend page read, so unique made-up slugs cannot each spend a read from the backend's shared
 * per-source read limit. With the navigation unpublished or unavailable the page is read as before.
 */
export async function getPage(lang: Lang, slug: string): Promise<Resolved<PageData>> {
  const path = `/public/site/${lang}/pages/${slug}`;
  const navigation = await fromApi<Navigation>(`/public/site/${lang}/navigation`, ["landing"], isNavigation);
  if (navigation.status === "ok" && !isAlwaysKnown(slug) && !navigation.data.pages.some((page) => page?.slug === slug)) {
    return { status: "missing" };
  }
  const loaded = await fromApi<PageData>(path, ["landing"], isPageData);
  if (loaded.status === "missing" && navigation.status === "ok") return { status: "missing" };
  return fromLoaded(path, loaded, () => defaultPage(lang, slug));
}
