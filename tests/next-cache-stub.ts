import { createRequire } from "node:module";
import path from "node:path";

// Test-only stand-in for next/cache. "use cache" is inert outside the Next server and the real cacheLife/cacheTag/revalidateTag
// throw there, so these only record what they were asked to do. Import this file before anything that loads lib/data.ts or a
// route handler that calls revalidateTag (the tests run as CommonJS under tsx, so a primed require cache is what they get).
export const cacheCalls: unknown[][] = [];

const stub = {
  cacheLife: (...args: unknown[]) => cacheCalls.push(["cacheLife", ...args]),
  cacheTag: (...args: unknown[]) => cacheCalls.push(["cacheTag", ...args]),
  revalidateTag: (...args: unknown[]) => cacheCalls.push(["revalidateTag", ...args]),
  revalidatePath: (...args: unknown[]) => cacheCalls.push(["revalidatePath", ...args]),
};

const nextRequire = createRequire(path.join(process.cwd(), "package.json"));
const resolved = nextRequire.resolve("next/cache");
nextRequire.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: stub } as unknown as NodeJS.Module;
