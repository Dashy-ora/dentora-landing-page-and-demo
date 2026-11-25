import { clientIp } from "./client-ip";
import { apiBase, siteUrl } from "./config";
import { signatureHeaders } from "./form-signature";

export const MAX_BODY_BYTES = 8192;
const FORMS = ["demo_request", "contact", "trial_interest"];

type Deps = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  nowMs?: number;
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });
}

/** Same-origin only: a browser POST always carries Origin. It must be this site (SITE_URL) or the Host the request came in on. */
export function sameOrigin(request: Request, env: Record<string, string | undefined>): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(siteUrl(env)).host);
  } catch {}
  const host = request.headers.get("host");
  if (host) allowed.add(host);
  return allowed.has(originHost);
}

/**
 * Same-origin form proxy to POST /public/site/forms/{form}. The browser never talks to the backend (which sends no CORS headers);
 * this forwards only the three contract keys, passes the visitor address as X-Forwarded-For (the backend honours it only from a
 * proxy listed in IDENTITY_TRUSTED_PROXIES) and maps the answer to a small, jargon-free shape.
 */
export async function proxyForm(request: Request, form: string, deps: Deps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const fetcher = deps.fetchImpl ?? fetch;
  if (!FORMS.includes(form)) return json(404, { error: "not_found" });
  if (!sameOrigin(request, env)) return json(403, { error: "forbidden" });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { error: "unsupported" });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json(413, { error: "too_large" });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let input: { language?: unknown; fields?: unknown; company_website?: unknown };
  try {
    input = JSON.parse(raw);
  } catch {
    return json(422, { error: "invalid", fields: {} });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json(422, { error: "invalid", fields: {} });
  const fields = input.fields;
  if ((input.language !== "ar" && input.language !== "en") || !fields || typeof fields !== "object" || Array.isArray(fields)) {
    return json(422, { error: "invalid", fields: {} });
  }
  const honeypot = typeof input.company_website === "string" ? input.company_website : "";

  const base = apiBase(env);
  if (!base) return json(503, { error: "unavailable" });
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const ip = clientIp(request.headers, env);
  if (ip) headers["X-Forwarded-For"] = ip;
  // Signed with LANDING_FORMS_SECRET (when set) over the exact bytes sent, so the backend keeps its per-visitor limit on any host.
  const body = JSON.stringify({ language: input.language, fields, company_website: honeypot });
  Object.assign(headers, signatureHeaders(form, ip, body, env, deps.nowMs ?? Date.now()));

  let upstream: Response;
  try {
    upstream = await fetcher(`${base}/public/site/forms/${form}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return json(503, { error: "unavailable" });
  }

  if (upstream.status === 202) return json(202, { received: true });
  if (upstream.status === 429) return json(429, { error: "rate_limited" }, { "Retry-After": upstream.headers.get("retry-after") ?? "600" });
  if (upstream.status === 422) {
    const failed: Record<string, true> = {};
    try {
      const body = (await upstream.json()) as { error?: { fields?: Record<string, unknown> } };
      for (const path of Object.keys(body.error?.fields ?? {})) {
        const match = /^fields\.(.+)$/.exec(path);
        if (match) failed[match[1]] = true;
      }
    } catch {}
    return json(422, { error: "invalid", fields: failed });
  }
  if (upstream.status === 404) return json(404, { error: "unavailable" });
  if (upstream.status === 413) return json(413, { error: "too_large" });
  return json(503, { error: "unavailable" });
}
