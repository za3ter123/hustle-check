// Independent golden checks for the v2 calc (SPEC-v2.md), written before the builder ran.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { facets, scale, toolsCost, isBusiness, matchHustle, closest, validate, encode, decode } from "../web/calc.js";

const typical = [0, 0, 0, 0, 40, 90, 150, 220, 300, 380, 460, 550];
const h = {
  id: "ai-youtube", name: "AI YouTube videos", blurb: "x", baseHours: 6, capFactor: 2,
  ramp: { low: Array(12).fill(0), typical, high: typical.map(v => v * 4) },
  firstDollarMonth: 5, payoutNote: "x",
  market: { trend: "growing", interest: Array(12).fill(50), competition: "crowded", angles: [{ name: "a", why: "b" }, { name: "c", why: "d" }, { name: "e", why: "f" }] },
  tools: [{ job: "script", name: "A", plan: "Plus", priceMonthly: 20, url: "https://a.example", free: { name: "A free", note: "" } },
          { job: "voice", name: "B", plan: "Starter", priceMonthly: 5, url: "https://b.example", free: { name: "B free", note: "" } },
          { job: "edit", name: "C", plan: "Free", priceMonthly: 0, url: "https://c.example", free: { name: "C", note: "" } }],
  facts: { needsFace: "none", needsAudience: false, startupCost: { low: 0, high: 35 }, skillNeeded: "none", minHoursPerWeek: 4, scalable: "yes" },
  estimated: ["ramp"], sources: {},
};

// Scale: headline is month 12 typical, capped at 2x.
const s6 = scale(h, 6);
assert.equal(s6.headline, 550);
assert.equal(s6.strong, 2200);
assert.equal(s6.firstDollarMonth, 5);
assert.equal(scale(h, 20).headline, 1100, "cap at 2x");
assert.equal(scale(h, 20).strong, 4400);
assert.equal(scale(h, 2).headline, 183);
assert.equal(scale(h, 2).typical[4], 13);           // 40/3 = 13.3
assert.ok(scale(h, 6).low.every(v => v === 0), "low stays 0, no floor");
assert.equal(scale(h, 6).typical.length, 12);
assert.equal(h.ramp.typical[11], 550, "input not mutated");

// Tools cost.
assert.equal(toolsCost(h.tools, false).total, 25);
assert.equal(toolsCost(h.tools, true).total, 0);
assert.equal(toolsCost(h.tools, true).rows.length, 3);

// FACETS still works with v2 facts and a phone profile.
const prof = { hoursPerWeek: 6, budget: 0, face: "no", skill: "beginner", audience: "none" };
const f = facets(h.facts, prof);
assert.equal(f.letters.find(l => l.key === "C").value, "no", "35 start cost vs 0 budget");
assert.equal(facets(h.facts, { ...prof, budget: 50 }).score, 6);

// Business detection: refuse businesses, never refuse real side hustles.
for (const t of ["Open a car wash", "start a restaurant", "Build a software company", "a coffee shop", "my own store", "franchise", "nail salon", "open a bakery"])
  assert.equal(isBusiness(t), true, t);
for (const t of ["dropshipping", "Photoshop retouching", "Notion templates workshop", "OpenAI prompts", "AI clipping", "AI YouTube videos"])
  assert.equal(isBusiness(t), false, t);

// Matching built-in hustles.
const hs = [h, { ...h, id: "ai-clipping", name: "AI clipping" }, { ...h, id: "faceless-tiktok", name: "Faceless TikTok" }];
assert.equal(matchHustle("AI YouTube videos", hs), "ai-youtube");
assert.equal(matchHustle("ai clipping", hs), "ai-clipping");
assert.equal(matchHustle("knitting", hs), null);
const c = closest("tiktok videos", hs, 2);
assert.equal(c.length, 2);
assert.equal(c[0], "faceless-tiktok");

// Validate and link round trip.
const payload = { v: 2, checked: "2026-10", hustles: [h] };
validate(payload);
assert.throws(() => validate({ v: 1, hustles: [] }));
assert.throws(() => validate({ v: 2, hustles: [{ ...h, ramp: { low: [], typical: [], high: [] } }] }));
assert.deepEqual(decode("#d=" + encode(payload)), payload);

// The shipped presets file passes validation and has the 8 hustles.
const presets = JSON.parse(readFileSync(new URL("../web/presets.json", import.meta.url), "utf8"));
validate(presets);
assert.equal(presets.v, 2);
assert.equal(presets.hustles.length, 8);
for (const p of presets.hustles) {
  for (const t of p.tools) assert.ok(/^https:\/\//.test(t.url), `${p.id} tool url`);
  for (const list of Object.values(p.sources)) for (const src of list) assert.ok(/^https:\/\//.test(src.url) && src.title && src.quote, `${p.id} source`);
}

console.log("GOLDEN2-OK");
