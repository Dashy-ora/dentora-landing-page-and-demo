import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import path from "node:path";

// Next's own matcher compiler (the build uses it for proxy.ts) pulls in server modules that need a global AsyncLocalStorage, as in
// the Next server. Import this file before anything that loads next/server.
(globalThis as unknown as { AsyncLocalStorage?: typeof AsyncLocalStorage }).AsyncLocalStorage ??= AsyncLocalStorage;

const nextRequire = createRequire(path.join(process.cwd(), "package.json"));
const { getMiddlewareMatchers } = nextRequire("next/dist/build/analysis/get-page-static-info.js");
const { getMiddlewareRouteMatcher } = nextRequire("next/dist/shared/lib/router/utils/middleware-route-matcher.js");

/** True when Next would run the proxy for `pathname` with this `matcher` (compiled exactly as `next build` does). */
export function proxyMatcher(matcher: string | string[]): (pathname: string) => boolean {
  const run = getMiddlewareRouteMatcher(getMiddlewareMatchers(matcher, { i18n: undefined, basePath: "" }));
  return (pathname: string) => run(pathname, { headers: {} }, {}) === true;
}
