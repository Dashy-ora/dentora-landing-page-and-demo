import assert from "node:assert/strict";
import test from "node:test";
import { isLive, liveOffers, offersFor } from "@/lib/offers";
import { offer } from "./fixtures";

const o = offer({ starts_at: "2026-12-01T00:00:00Z", ends_at: "2026-12-31T00:00:00Z" });
const at = (iso: string) => Date.parse(iso);

test("window is starts_at <= now < ends_at", () => {
  assert.equal(isLive(o, at("2026-11-30T23:59:59Z")), false);
  assert.equal(isLive(o, at("2026-12-01T00:00:00Z")), true, "start is inclusive");
  assert.equal(isLive(o, at("2026-12-15T00:00:00Z")), true);
  assert.equal(isLive(o, at("2026-12-30T23:59:59Z")), true);
  assert.equal(isLive(o, at("2026-12-31T00:00:00Z")), false, "end is exclusive");
});

test("works with Date objects and rejects unparsable windows", () => {
  assert.equal(isLive(o, new Date("2026-12-15T00:00:00Z")), true);
  assert.equal(isLive({ starts_at: "nope", ends_at: "2026-12-31T00:00:00Z" }, at("2026-12-15T00:00:00Z")), false);
});

test("a cached copy that still says 'live' is filtered again at request time", () => {
  const stale = [offer({ status: "live", ends_at: "2026-12-05T00:00:00Z" }), offer({ id: "b", status: "scheduled", starts_at: "2026-12-01T00:00:00Z" })];
  assert.deepEqual(liveOffers(stale, at("2026-12-10T00:00:00Z")).map((x) => x.id), ["b"]);
});

test("offersFor filters by placement as well", () => {
  const list = [offer({ id: "s", placements: ["strip"] }), offer({ id: "t", placements: ["top_banner"] })];
  const now = at("2026-12-10T00:00:00Z");
  assert.deepEqual(offersFor(list, "strip", now).map((x) => x.id), ["s"]);
  assert.deepEqual(offersFor(list, "top_banner", now).map((x) => x.id), ["t"]);
  assert.deepEqual(offersFor(list, "pricing_cards", now), []);
});
