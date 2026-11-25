import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// The demo ships inside this repo (public/demo/app, copied by `npm run sync:demo`), so a deploy from git alone has a working
// demo with no backend and no portal checkout. It is plain static files: every file the page asks for must be there.
const root = path.resolve(import.meta.dirname, "..");
const app = path.join(root, "public", "demo", "app");

test("the demo build is part of the repo, not ignored", () => {
  const ignored = readFileSync(path.join(root, ".gitignore"), "utf8").split("\n").map((line) => line.trim());
  assert.ok(!ignored.includes("/public/demo/app"), "public/demo/app must be committed");
  assert.ok(existsSync(path.join(app, "index.html")), "run `npm run sync:demo` and commit public/demo/app");
});

test("the demo page loads only its own files, and every one of them exists", () => {
  const index = readFileSync(path.join(app, "index.html"), "utf8");
  const refs = [...index.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(ref.startsWith("/demo/app/"), `${ref} is outside the demo folder`);
    assert.ok(existsSync(path.join(app, ref.slice("/demo/app/".length))), `${ref} is missing`);
  }
});
