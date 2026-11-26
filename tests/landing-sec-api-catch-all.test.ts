// LANDING-SEC fix 3, second entry: an /api path no handler claims is a plain 404 from app/api/[[...path]]/route.ts and never reaches the
// Arabic catch-all page (which would read the backend once per unique path). The real handlers and the demo-missing rewrite still win.
import "./next-matcher";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import nextConfig from "@/next.config";

const nextRequire = createRequire(path.join(process.cwd(), "package.json"));
const { getSortedRoutes, isDynamicRoute } = nextRequire("next/dist/shared/lib/router/utils/index.js");
const { getNamedRouteRegex } = nextRequire("next/dist/shared/lib/router/utils/route-regex.js");
const { getRouteMatcher } = nextRequire("next/dist/shared/lib/router/utils/route-matcher.js");
const { getPathMatch } = nextRequire("next/dist/shared/lib/router/utils/path-match.js");

/** Every page and route handler under app/, with route groups stripped as Next does. */
function appRoutes(dir = path.join(process.cwd(), "app"), prefix = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const segment = /^\(.*\)$/.test(entry.name) ? "" : `/${entry.name}`;
      routes.push(...appRoutes(path.join(dir, entry.name), prefix + segment));
    } else if (/^(page\.tsx|route\.ts)$/.test(entry.name)) {
      routes.push(prefix || "/");
    }
  }
  return routes;
}

/** The route Next's router picks for a pathname: a static route first, then dynamic routes in Next's own order. */
function resolve(pathname: string): string | null {
  const routes = [...new Set(appRoutes())];
  if (routes.includes(pathname) && !isDynamicRoute(pathname)) return pathname;
  for (const route of getSortedRoutes(routes.filter((r: string) => isDynamicRoute(r)))) {
    if (getRouteMatcher(getNamedRouteRegex(route, { prefixRouteKeys: false }))(pathname)) return route;
  }
  return null;
}

test("unrouted /api paths resolve to the /api catch-all, never to the catch-all page", () => {
  for (const pathname of ["/api", "/api/zz-1", "/api/forms", "/api/v1", "/api/v1/public/site/x", "/api/site-slugs", "/api/a/b/c/d"]) {
    assert.equal(resolve(pathname), "/api/[[...path]]", pathname);
  }
});

test("the real handlers still win over the /api catch-all", () => {
  assert.equal(resolve("/api/forms/contact"), "/api/forms/[form]");
  assert.equal(resolve("/api/revalidate"), "/api/revalidate");
  assert.equal(resolve("/api/site-slugs/ar"), "/api/site-slugs/[lang]");
  assert.equal(resolve("/api/v1/public/site/demo"), "/api/v1/public/site/demo");
  assert.equal(resolve("/api/demo-missing"), "/api/demo-missing");
  // Pages are untouched.
  assert.equal(resolve("/pricing"), "/[[...slug]]");
  assert.equal(resolve("/en/pricing"), "/en/[[...slug]]");
});

test("the next.config rewrite of /demo/app/<dotted> still lands on /api/demo-missing", async () => {
  const rewrites = (await nextConfig.rewrites!()) as { afterFiles: { source: string; destination: string }[] };
  const rule = rewrites.afterFiles.find((r) => getPathMatch(r.source, { removeUnnamedParams: true, strict: true })("/demo/app/assets/missing-0000.js") !== false);
  assert.equal(rule?.destination, "/api/demo-missing");
  assert.equal(resolve(rule!.destination), "/api/demo-missing");
});

test("the /api catch-all answers a plain, uncached 404 for every method", async () => {
  const catchAll = await import("@/app/api/[[...path]]/route");
  for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const) {
    const handler = catchAll[method];
    assert.equal(typeof handler, "function", method);
    const response = handler();
    assert.equal(response.status, 404, method);
    assert.equal(response.headers.get("cache-control"), "no-store", method);
    assert.match(response.headers.get("content-type") ?? "", /^text\/plain/, method);
  }
});
