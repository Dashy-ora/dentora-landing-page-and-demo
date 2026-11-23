/**
 * Server-side warning when built-in defaults are served instead of the API. Visitors never see it. Repeats for the same read are
 * throttled so a down backend does not flood the log.
 */
const THROTTLE_MS = 5 * 60 * 1000;
const holder = globalThis as unknown as { __dentoraDefaultWarned?: Map<string, number> };

export function warnDefaultsServed(path: string, reason: string, now: number = Date.now()): void {
  const warned = (holder.__dentoraDefaultWarned ??= new Map());
  const last = warned.get(path);
  if (last !== undefined && now - last < THROTTLE_MS) return;
  warned.set(path, now);
  console.warn(`[dentora-landing] Serving built-in default content for ${path}: ${reason}.`);
}

export function resetDefaultWarnings(): void {
  (holder.__dentoraDefaultWarned ??= new Map()).clear();
}
