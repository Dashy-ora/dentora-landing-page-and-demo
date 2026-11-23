import { apiBase } from "./config";

/** What a public read came back as. "missing" is a 404 (flag off, nothing published); "unavailable" is anything else that is not a 200. */
export type ReadResult =
  | { kind: "ok"; data: unknown }
  | { kind: "missing" }
  | { kind: "unavailable" };

/**
 * Headers for server-side reads. Deliberately minimal so the backend's public-host admission passes on a local setup:
 * one Host (set by the HTTP client), no Authorization, no Forwarded/X-Forwarded-*, no Origin, no Sec-Fetch-*.
 */
export function publicReadHeaders(): Record<string, string> {
  return { Accept: "application/json" };
}

type Options = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export async function fetchPublic(path: string, options: Options = {}): Promise<ReadResult> {
  const base = apiBase(options.env);
  if (!base) return { kind: "unavailable" };
  const fetcher = options.fetchImpl ?? fetch;
  try {
    const response = await fetcher(`${base}${path}`, {
      method: "GET",
      headers: publicReadHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 4000),
    });
    if (response.status === 404) return { kind: "missing" };
    if (response.status !== 200) return { kind: "unavailable" };
    const body = (await response.json()) as { data?: unknown };
    return body && typeof body === "object" && "data" in body && body.data !== undefined ? { kind: "ok", data: body.data } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
