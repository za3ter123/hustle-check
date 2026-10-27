import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { facets, scale, toolsCost, isBusiness, matchHustle, closest, validate, encode, decode, LINK_QUOTE } from "./calc.js";
import { buildInline } from "./make-inline.mjs";


const profile = { location: { country: "X", city: "Y" }, hoursPerWeek: 10, budget: 300, goalPerMonth: 500, face: "no", skill: "beginner", audience: "none" };
const facts = { needsFace: "none", needsAudience: false, startupCost: { low: 100, high: 300 }, skillNeeded: "none", minHoursPerWeek: 8, scalable: "yes", profitPerHour: { low: 5, high: 15 }, fixedPerMonth: 20, rampMonths: 2 };
const get = (r, k) => r.letters.find((l) => l.key === k);

test("all yes gives strong with six reasons in FACETS order", () => {
  const r = facets(facts, profile);
  assert.deepEqual(r.letters.map((l) => l.key), ["F", "A", "C", "E", "T", "S"]);
  assert.equal(r.score, 6);
  assert.equal(r.unknowns, 0);
  assert.equal(r.verdict, "strong");
  assert.ok(r.letters.every((l) => l.reason.length > 0));
});

test("capital: equal to budget is yes, above is no with the spec reason", () => {
  assert.equal(get(facets(facts, profile), "C").value, "yes");
  const r = facets({ ...facts, startupCost: { low: 150, high: 400 } }, profile);
  assert.equal(get(r, "C").value, "no");
  assert.equal(get(r, "C").reason, "Needs about 400 USD to start. Your budget is 300 USD.");
});

test("face rules", () => {
  const req = { ...facts, needsFace: "required" };
  assert.equal(get(facets(req, profile), "F").value, "no");
  assert.equal(get(facets(req, { ...profile, face: "if-needed" }), "F").value, "no");
  assert.equal(get(facets(req, { ...profile, face: "yes" }), "F").value, "yes");
  assert.equal(get(facets({ ...facts, needsFace: "optional" }, profile), "F").value, "yes");
});

test("audience rules", () => {
  const need = { ...facts, needsAudience: true };
  assert.equal(get(facets(need, profile), "A").value, "no");
  assert.equal(get(facets(need, { ...profile, audience: "small" }), "A").value, "yes");
  assert.equal(get(facets({ ...facts, needsAudience: null }, profile), "A").value, "unknown");
});

test("expertise ranks", () => {
  assert.equal(get(facets({ ...facts, skillNeeded: "some" }, profile), "E").value, "no");
  assert.equal(get(facets({ ...facts, skillNeeded: "some" }, { ...profile, skill: "comfortable" }), "E").value, "yes");
  assert.equal(get(facets({ ...facts, skillNeeded: "expert" }, { ...profile, skill: "comfortable" }), "E").value, "no");
  assert.equal(get(facets({ ...facts, skillNeeded: "expert" }, { ...profile, skill: "expert" }), "E").value, "yes");
});

test("time: over your hours or over 14 a week is no", () => {
  assert.equal(get(facets({ ...facts, minHoursPerWeek: 10 }, profile), "T").value, "yes");
  assert.equal(get(facets({ ...facts, minHoursPerWeek: 11 }, profile), "T").value, "no");
  assert.equal(get(facets({ ...facts, minHoursPerWeek: 15 }, { ...profile, hoursPerWeek: 40 }), "T").value, "no");
  assert.equal(get(facets({ ...facts, minHoursPerWeek: 14 }, { ...profile, hoursPerWeek: 40 }), "T").value, "yes");
  assert.equal(get(facets(facts, { ...profile, hoursPerWeek: 0 }), "T").value, "no");
});

test("partly scalable is no and says partly", () => {
  const s = get(facets({ ...facts, scalable: "partly" }, profile), "S");
  assert.equal(s.value, "no");
  assert.match(s.reason, /^Partly/);
});

test("verdict bands and unknown counting", () => {
  assert.equal(facets({ ...facts, scalable: "no" }, profile).verdict, "closer");
  assert.equal(facets({ ...facts, scalable: "no", needsAudience: true }, profile).verdict, "closer");
  assert.equal(facets({ ...facts, scalable: "no", needsAudience: true, skillNeeded: "expert" }, profile).verdict, "risky");
  const two = facets({ ...facts, needsFace: null, scalable: null }, profile);
  assert.equal(two.unknowns, 2);
  assert.equal(two.score, 4);
  assert.equal(two.verdict, "closer");
  assert.equal(facets({ ...facts, needsFace: null, scalable: null, startupCost: { low: 1, high: null } }, profile).verdict, "no-data");
});

test("null facts and null profile give unknown, never a throw", () => {
  const r = facets(null, null);
  assert.equal(r.unknowns, 6);
  assert.equal(r.verdict, "no-data");
});


const presets = JSON.parse(readFileSync(new URL("./presets.json", import.meta.url), "utf8"));
const H = presets.hustles[0];

test("v2 skill words: basic counts as beginner level, skilled needs comfortable", () => {
  assert.equal(get(facets({ ...facts, skillNeeded: "basic" }, profile), "E").value, "yes");
  assert.equal(get(facets({ ...facts, skillNeeded: "basic" }, profile), "E").reason, "Needs basic skill. You said beginner.");
  assert.equal(get(facets({ ...facts, skillNeeded: "skilled" }, profile), "E").value, "no");
  assert.equal(get(facets({ ...facts, skillNeeded: "skilled" }, { ...profile, skill: "comfortable" }), "E").value, "yes");
});

test("scale: factor capped, whole dollars, headline and strong read month 12", () => {
  const h = { ...H, baseHours: 4, capFactor: 1.5, ramp: { low: Array(12).fill(1), typical: Array(12).fill(10), high: Array(12).fill(33) } };
  const s = scale(h, 5);
  assert.equal(s.factor, 1.25);
  assert.equal(s.typical[0], 13); // 12.5 rounds up
  assert.equal(s.low[0], 1);
  assert.equal(s.high[11], 41); // 41.25
  assert.equal(s.headline, s.typical[11]);
  assert.equal(s.strong, s.high[11]);
  assert.equal(scale(h, 100).factor, 1.5, "cap");
  assert.equal(scale(h, 0).headline, 0, "zero hours is $0, never negative zero");
  assert.ok(Object.is(scale(h, 0).low[0], 0));
});

test("scale on every shipped hustle: headline equals month 12 typical at 2, 6 and 20 h", () => {
  for (const h of presets.hustles) for (const hrs of [2, 6, 20]) {
    const s = scale(h, hrs);
    assert.equal(s.headline, Math.round(h.ramp.typical[11] * Math.min(hrs / h.baseHours, h.capFactor)), h.id + hrs);
    assert.ok(s.low.every((v, i) => v <= s.typical[i] && s.typical[i] <= s.high[i]), h.id);
  }
});

test("toolsCost: paid sum, free is all zero with free names", () => {
  const tools = [{ job: "a", name: "A", plan: "Pro", priceMonthly: 12.5, url: "https://a.example", free: { name: "A free", note: "n" } },
    { job: "b", name: "B", plan: "Free", priceMonthly: 0, url: "https://b.example", free: { name: "B" } }];
  assert.equal(toolsCost(tools, false).total, 12.5);
  const f = toolsCost(tools, true);
  assert.equal(f.total, 0);
  assert.deepEqual(f.rows.map((r) => [r.name, r.plan, r.price]), [["A free", "n", 0], ["B", "", 0]]);
  assert.equal(toolsCost(undefined, false).total, 0);
});

test("isBusiness: refuses businesses, keeps side hustles", () => {
  for (const t of ["Open a car wash", "carwash", "start a company", "Shoe STORE", "hair salons", "a franchise", "open an ice cream truck", "small factory", "warehouse job"]) assert.equal(isBusiness(t), true, t);
  for (const t of ["dropshipping", "photoshop", "workshop", "OpenAI apps", "storeys", "", null, "Faceless TikTok", "AI newsletter"]) assert.equal(isBusiness(t), false, String(t));
});

test("matchHustle: names, ids, plurals and extra words; nothing for unknown or empty", () => {
  for (const h of presets.hustles) {
    assert.equal(matchHustle(h.name, presets.hustles), h.id, h.name);
    assert.equal(matchHustle(h.name.toUpperCase() + " for beginners", presets.hustles), h.id, h.name);
  }
  assert.equal(matchHustle("knitting", presets.hustles), null);
  assert.equal(matchHustle("", presets.hustles), null);
  assert.equal(matchHustle("ai", presets.hustles), null);
});

test("closest: n ids, best overlap first, list order when nothing overlaps", () => {
  const c = closest("knitting", presets.hustles, 3);
  assert.deepEqual(c, presets.hustles.slice(0, 3).map((h) => h.id));
  assert.equal(closest("tiktok", presets.hustles, 1)[0], "faceless-tiktok");
  assert.equal(closest("x", [], 3).length, 0);
});

test("validate: the shipped presets pass, bad shapes throw plain messages", () => {
  assert.equal(validate(presets), presets);
  const bad = (h, re) => assert.throws(() => validate({ v: 2, hustles: [{ ...H, ...h }] }), re);
  bad({ ramp: { ...H.ramp, typical: H.ramp.typical.slice(1) } }, /12 months/);
  bad({ ramp: { ...H.ramp, low: H.ramp.high } }, /low, then typical/);
  bad({ firstDollarMonth: 13 }, /first dollar/);
  bad({ market: { ...H.market, trend: "up" } }, /trend/);
  bad({ market: { ...H.market, angles: [] } }, /angles/);
  bad({ tools: [{ ...H.tools[0], url: "javascript:alert(1)" }] }, /https/);
  bad({ sources: { x: [{ title: "t", url: "http://x.example" }] } }, /https/);
  bad({ facts: { ...H.facts, skillNeeded: "some" } }, /facts/);
  bad({ baseHours: 0 }, /base hours/);
  assert.throws(() => validate(null), /empty/);
  assert.throws(() => validate({ v: 2, hustles: [] }), /no side hustles/);
  assert.doesNotThrow(() => validate({ v: 2, hustles: [{ ...H, firstDollarMonth: null }] }));
});

test("share link round trip: built-in id and full hustle, every accepted form", () => {
  const byId = { v: 2, id: H.id, hours: 9, face: "yes", budget: 50, skill: "expert" };
  const s = encode(byId);
  assert.match(s, /^[A-Za-z0-9_-]+$/);
  for (const form of [s, "#d=" + s, "d=" + s, "https://example.org/index.html#d=" + s, "  " + s.slice(0, 10) + "\n" + s.slice(10)]) assert.deepEqual(decode(form), byId);
  const full = { v: 2, hustles: [{ ...H, name: "Ünïcode ✓" }], hours: 6 };
  const back = decode(encode(full));
  assert.equal(back.hustles[0].name, "Ünïcode ✓");
  for (const list of Object.values(back.hustles[0].sources)) for (const src of list) assert.ok([...src.quote].length <= LINK_QUOTE);
  validate(back);
});

test("bad share strings throw", () => {
  for (const bad of ["", "#d=", "#d=not*valid", "abc$", "A", encode([1, 2]), encode({ v: 2 }), encode(null), btoa("{oops").replace(/=+$/, ""), btoa("\xff\xfe").replace(/=+$/, "")]) {
    assert.throws(() => decode(bad), undefined, JSON.stringify(bad));
  }
  assert.throws(() => decode(42));
});

test("inline.js matches calc.js and presets.json (run: node web/make-inline.mjs)", () => {
  const onDisk = readFileSync(new URL("./inline.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.equal(onDisk, buildInline());
  for (const name of ["facets", "scale", "toolsCost", "isBusiness", "matchHustle", "closest", "validate", "encode", "decode"]) assert.match(onDisk, new RegExp(`function ${name}[(]`), name);
});

test("skills/hustle-check/calc.js is a byte-identical copy of web/calc.js (run: node web/make-inline.mjs)", () => {
  const web = readFileSync(new URL("./calc.js", import.meta.url));
  const skill = readFileSync(new URL("../skills/hustle-check/calc.js", import.meta.url));
  assert.ok(web.equals(skill), "copies differ");
});
