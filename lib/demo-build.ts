import { existsSync } from "node:fs";
import path from "node:path";

/**
 * True when the portal demo build has been synced into public/demo/app (`npm run sync:demo`). It is gitignored, so a fresh
 * checkout builds without it; /demo then shows the trial call to action instead of an "Open the demo" link that would 404.
 */
export function demoBuildAvailable(root: string = process.cwd()): boolean {
  return existsSync(path.join(root, "public", "demo", "app", "index.html"));
}
