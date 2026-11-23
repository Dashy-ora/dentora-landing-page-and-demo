/**
 * Last-good-copy fallback (spec §7 "Backend failure"): when the backend fails, serve the last copy this server saw.
 * A 404 (unpublished or switched off) clears the copy, so an unpublish is never masked by stale content.
 * With no copy at all the caller shows the plain "Back soon" page.
 */
export type Loaded<T> =
  | { status: "ok"; data: T; stale: boolean }
  | { status: "missing" }
  | { status: "unavailable" };

type Store = Map<string, unknown>;
const holder = globalThis as unknown as { __dentoraLastGood?: Store };

function store(): Store {
  return (holder.__dentoraLastGood ??= new Map());
}

export function resetLastGood(): void {
  store().clear();
}

/** `load` returns the data, null for "not published" (404), and throws when the backend is unavailable. */
export async function withFallback<T>(key: string, load: () => Promise<T | null>): Promise<Loaded<T>> {
  try {
    const data = await load();
    if (data === null) {
      store().delete(key);
      return { status: "missing" };
    }
    store().set(key, data);
    return { status: "ok", data, stale: false };
  } catch {
    if (store().has(key)) return { status: "ok", data: store().get(key) as T, stale: true };
    return { status: "unavailable" };
  }
}
