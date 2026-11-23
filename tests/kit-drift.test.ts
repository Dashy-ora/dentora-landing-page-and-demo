import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// The Dentora UI kit is copied byte for byte from the clinic portal (owner decision). Two guards:
//   1. a pinned checksum lock (ui-kit.lock.json), always checked;
//   2. a direct comparison with the portal's files, checked whenever the portal checkout is present (PORTAL_DIR to override).
const root = process.cwd(); // npm test runs from the repo root
const portal = path.resolve(root, process.env.PORTAL_DIR ?? "../.worktrees/clinic-portal-p4");
const sha = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");
const lock = JSON.parse(readFileSync(path.join(root, "ui-kit.lock.json"), "utf8")) as { indexCss: string; files: Record<string, string> };
const hasPortal = existsSync(path.join(portal, "src/styles/kit.css"));

async function tree(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await tree(full, base)));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out.sort();
}

test("copied kit files match the pinned checksums", async () => {
  for (const [file, expected] of Object.entries(lock.files)) {
    assert.equal(sha(await readFile(path.join(root, file))), expected, `${file} drifted from the pinned kit`);
  }
});

test("no extra or missing font files compared with the pin", async () => {
  const fonts = (await tree(path.join(root, "public/fonts"))).map((file) => `public/fonts/${file}`);
  assert.deepEqual(fonts, Object.keys(lock.files).filter((file) => file.startsWith("public/fonts/")).sort());
});

test("globals.css begins with the portal's index.css (theme mapping, font-face rules, Flowbite plugin)", async () => {
  const globals = await readFile(path.join(root, "app/globals.css"), "utf8");
  assert.match(globals, /@plugin "flowbite\/plugin"/);
  assert.match(globals, /@theme inline \{/);
  assert.match(globals, /font-family: "Sora"/);
  assert.match(globals, /font-family: "Tajawal"/);
  assert.match(globals, /@custom-variant dark \(&:where\(\.dark, \.dark \*\)\)/);
  assert.doesNotMatch(globals, /Geist|Arial|Helvetica/);
  if (!hasPortal) return;
  const index = await readFile(path.join(portal, "src/index.css"), "utf8");
  assert.ok(globals.startsWith(index), "app/globals.css no longer starts with the portal's src/index.css");
});

test("kit files equal the portal's versions (when the portal checkout is present)", { skip: !hasPortal && "portal checkout not found" }, async () => {
  for (const [from, to] of [["src/styles/tokens.css", "app/styles/tokens.css"], ["src/styles/kit.css", "app/styles/kit.css"]]) {
    assert.deepEqual(await readFile(path.join(root, to)), await readFile(path.join(portal, from)), `${to} differs from the portal's ${from}`);
  }
  assert.equal(sha(await readFile(path.join(portal, "src/index.css"))), lock.indexCss, "the portal's index.css changed: re-sync and run node scripts/kit-lock.mjs");
  const portalFonts = await tree(path.join(portal, "public/fonts"));
  const ours = (await tree(path.join(root, "public/fonts"))).sort();
  assert.deepEqual(ours, portalFonts);
  for (const file of portalFonts) {
    assert.deepEqual(await readFile(path.join(root, "public/fonts", file)), await readFile(path.join(portal, "public/fonts", file)), `font ${file} differs`);
  }
});

test("shared dependencies are pinned to the portal's versions", { skip: !hasPortal && "portal checkout not found" }, async () => {
  const ours = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const theirs = JSON.parse(await readFile(path.join(portal, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  assert.equal(ours.dependencies.flowbite, theirs.dependencies.flowbite);
  assert.equal(ours.dependencies.tailwindcss, theirs.dependencies.tailwindcss);
});

test("app dependencies are exact versions", async () => {
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) assert.match(version, /^\d+\.\d+\.\d+$/, `${name} is not pinned`);
});
