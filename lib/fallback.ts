/**
 * Last-good-copy fallback (spec §7 "Backend failure"): when the backend fails, serve the last copy this server saw.
 * The copy is tied to the publish lifecycle, so an unpublish is never masked by stale content:
 * - a 404 (unpublished or switched off) for the same key clears it;
 * - a verified signed refresh for an area (`/api/revalidate`) clears every copy of that area (`dropArea`);
 * - a copy older than MAX_LAST_GOOD_AGE_MS is never served. The copy is per server process, so a refresh that reached another
 *   instance cannot clear this one: the age limit is what bounds stale content across instances.
 * With no usable copy `lib/data.ts` serves the built-in defaults (content/defaults).
 */
export type Loaded<T> =
  | { status: "ok"; data: T; stale: boolean }
  | { status: "missing" }
  | { status: "unavailable" };

/** The oldest copy that may still be served during an outage (10 minutes). Past it, the read behaves as if there were no copy. */
export const MAX_LAST_GOOD_AGE_MS = 10 * 60 * 1000;

type Entry = { data: unknown; areas: readonly string[]; fetchedAt: number };
type Store = Map<string, Entry>;
const holder = globalThis as unknown as { __dentoraLastGoodEntries?: Store };

function store(): Store {
  return (holder.__dentoraLastGoodEntries ??= new Map());
}

export function resetLastGood(): void {
  store().clear();
}

/** Drops every copy read under `area` (called after a verified, parsed signed refresh for that area). */
export function dropArea(area: string): void {
  for (const [key, entry] of store()) {
    if (entry.areas.includes(area)) store().delete(key);
  }
}

/**
 * `load` returns the data, null for "not published" (404), and throws when the backend is unavailable. `areas` are the cache tags
 * of the read, so a signed refresh of any of them drops the copy. `now` is injectable for tests.
 */
export async function withFallback<T>(
  key: string,
  load: () => Promise<T | null>,
  areas: readonly string[] = [],
  now: () => number = Date.now,
): Promise<Loaded<T>> {
  try {
    const data = await load();
    if (data === null) {
      store().delete(key);
      return { status: "missing" };
    }
    store().set(key, { data, areas: [...areas], fetchedAt: now() });
    return { status: "ok", data, stale: false };
  } catch {
    const entry = store().get(key);
    if (entry && now() - entry.fetchedAt <= MAX_LAST_GOOD_AGE_MS) return { status: "ok", data: entry.data as T, stale: true };
    if (entry) store().delete(key);
    return { status: "unavailable" };
  }
}
