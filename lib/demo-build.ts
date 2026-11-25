import { existsSync } from "node:fs";
import path from "node:path";

/** Where the synced portal demo build lives, relative to the project root. */
export const DEMO_INDEX = path.join("public", "demo", "app", "index.html");

/**
 * True when the portal demo build is in public/demo/app (`npm run sync:demo`, committed). Without it, /demo shows the trial call
 * to action instead of an "Open the demo" link that would 404.
 *
 * Decided at BUILD time (next.config.ts sets DENTORA_DEMO_BUILD): on serverless hosts such as Vercel, public/ is served from the
 * CDN and is not part of the server function's files, so a runtime file check would always say "no demo". Passing `root`
 * checks a folder directly (tests, scripts).
 */
export function demoBuildAvailable(root?: string): boolean {
  if (root !== undefined) return existsSync(path.join(root, DEMO_INDEX));
  return process.env.DENTORA_DEMO_BUILD === "1";
}
