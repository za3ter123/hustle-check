// Hustle Check math. Pure functions, no DOM. Rules live in SPEC-v2.md (FACETS rules from SPEC.md).
// The page loads a generated copy (inline.js) so it also works from file://.
// After editing this file run: node web/make-inline.mjs

// v2 facts use none/basic/skilled/expert; profiles use beginner/comfortable/expert.
const RANK = { none: 0, basic: 0, beginner: 0, some: 1, skilled: 1, comfortable: 1, expert: 2 };
const SKILL = { none: "no special skill", basic: "basic skill", some: "some skill", skilled: "some skill", expert: "expert skill" };
const FACE = { required: "your face on camera or in person", optional: "your face sometimes", none: "no face" };

const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const fix0 = (x) => x + 0; // turns -0 into 0
const whole = (x) => fix0(Math.round(x));
const half = (x) => fix0(Math.round(x * 2) / 2);
const hi = (range) => (range && isNum(range.high) ? range.high : null);
const cents = (x) => fix0(Math.round(x * 100) / 100);
// Currencies whose main unit is worth a lot, so money rounds to 0.01 instead of whole units.
const CENTS = ["KWD", "BHD", "OMR", "JOD"];

// Money for reasons: "15.50 KWD", "400 USD". Cent currencies always show 2 decimals, others only when the amount has cents.
function cash(x, currency) {
  const v = cents(x);
  const d = CENTS.includes(currency) || !Number.isInteger(v) ? 2 : 0;
  return `${v.toLocaleString("en", { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`;
}

function letter(key, value, reason) {
  return { key, value, reason };
}

function faceLetter(f, p) {
  const need = f.needsFace;
  if (need == null) return letter("F", "unknown", "Not known if it needs your face.");
  if (need !== "required") return letter("F", "yes", need === "none" ? "Works with no face shown." : "Showing your face is optional.");
  if (p.face === "yes") return letter("F", "yes", "Needs your face. You said that is fine.");
  if (p.face == null) return letter("F", "unknown", "Needs your face. Not known if that is fine for you.");
  return letter("F", "no", `Needs ${FACE.required}. You said ${p.face === "no" ? "no" : "only if needed"}.`);
}

function audienceLetter(f, p) {
  if (f.needsAudience == null) return letter("A", "unknown", "Not known if it needs an audience.");
  if (f.needsAudience === false) return letter("A", "yes", "Can earn without an audience.");
  if (p.audience == null) return letter("A", "unknown", "Needs an audience. Yours is not known.");
  if (p.audience !== "none") return letter("A", "yes", `Needs an audience. You have a ${p.audience} one.`);
  return letter("A", "no", "Needs an audience first. You have none yet.");
}

function capitalLetter(f, p, currency) {
  const cost = hi(f.startupCost);
  if (cost == null) return letter("C", "unknown", "Start-up cost not known.");
  const need = `Needs about ${cash(cost, currency)} to start.`;
  if (!isNum(p.budget)) return letter("C", "unknown", `${need} Your budget is not known.`);
  return letter("C", cost <= p.budget ? "yes" : "no", `${need} Your budget is ${cash(p.budget, currency)}.`);
}

function expertiseLetter(f, p) {
  const need = RANK[f.skillNeeded];
  if (need == null) return letter("E", "unknown", "Skill needed not known.");
  const have = RANK[p.skill];
  if (have == null) return letter("E", "unknown", "Your skill level is not known.");
  const label = SKILL[f.skillNeeded];
  if (need <= have) return letter("E", "yes", `Needs ${label}. You said ${p.skill}.`);
  return letter("E", "no", `Needs ${label}. You said ${p.skill}.`);
}

function timeLetter(f, p) {
  const need = f.minHoursPerWeek;
  if (!isNum(need)) return letter("T", "unknown", "Hours needed not known.");
  if (!isNum(p.hoursPerWeek)) return letter("T", "unknown", `Needs about ${half(need)} h a week. Your hours are not known.`);
  if (need > p.hoursPerWeek) return letter("T", "no", `Needs about ${half(need)} h a week. You have ${half(p.hoursPerWeek)}.`);
  if (need > 14) return letter("T", "no", `Needs about ${half(need)} h a week, which is hours every day.`);
  return letter("T", "yes", `Needs about ${half(need)} h a week. You have ${half(p.hoursPerWeek)}.`);
}

function scaleLetter(f) {
  if (f.scalable == null) return letter("S", "unknown", "Not known if income can grow without more hours.");
  if (f.scalable === "yes") return letter("S", "yes", "Income can grow without more hours.");
  if (f.scalable === "partly") return letter("S", "no", "Partly. Some income can grow, most still needs your hours.");
  return letter("S", "no", "Income grows only with more hours.");
}

export function facets(facts, profile, currency = "USD") {
  const f = facts || {};
  const p = profile || {};
  const letters = [faceLetter(f, p), audienceLetter(f, p), capitalLetter(f, p, currency), expertiseLetter(f, p), timeLetter(f, p), scaleLetter(f)];
  const score = letters.filter((l) => l.value === "yes").length;
  const unknowns = letters.filter((l) => l.value === "unknown").length;
  const verdict = unknowns >= 3 ? "no-data" : score === 6 ? "strong" : score >= 4 ? "closer" : "risky";
  return { letters, score, unknowns, verdict };
}

// Earnings at the chosen hours: ramp x min(hours / baseHours, capFactor), whole dollars, no floor.
export function scale(hustle, hours) {
  const factor = Math.min(hours / hustle.baseHours, hustle.capFactor);
  const by = (a) => a.map((v) => whole(v * factor));
  const low = by(hustle.ramp.low), typical = by(hustle.ramp.typical), high = by(hustle.ramp.high);
  return { factor, low, typical, high, headline: typical[11], strong: high[11], firstDollarMonth: hustle.firstDollarMonth };
}

// Monthly tool cost. Free on swaps every tool for its free way to start.
export function toolsCost(tools, free) {
  const rows = (tools || []).map((t) => ({
    job: t.job, url: t.url,
    name: free ? t.free.name : t.name,
    plan: free ? t.free.note || "" : t.plan,
    price: free ? 0 : t.priceMonthly,
  }));
  return { total: rows.reduce((s, r) => s + r.price, 0), rows };
}

// Real businesses get refused. Whole words keep dropshipping, Photoshop, workshop and OpenAI out.
const BUSINESS = /\b(compan(y|ies)|restaurants?|shops?|stores?|car ?wash(es)?|salons?|franchises?|factor(y|ies)|warehouses?|open an?|start a company)\b/i;
export function isBusiness(text) {
  return BUSINESS.test(String(text || ""));
}

const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (text) => String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean).map(stem);

// A built-in hustle id when the text names one (or names one plus extra words), else null.
export function matchHustle(text, hustles) {
  const t = words(text);
  if (!t.length) return null;
  for (const h of hustles || []) {
    for (const label of [h.name, h.id]) {
      const n = words(label);
      if (n.length && n.every((w) => t.includes(w))) return h.id;
    }
  }
  return null;
}

// The n built-in hustles closest to the text: word overlap with the name, blurb words break ties, list order breaks the rest.
export function closest(text, hustles, n = 3) {
  const t = new Set(words(text));
  const score = (h) => {
    const name = new Set(words(h.name));
    const hit = [...name].filter((w) => t.has(w)).length;
    const union = new Set([...name, ...t]).size || 1;
    const blurb = new Set(words(h.blurb));
    return hit / union + [...t].filter((w) => blurb.has(w)).length * 0.01;
  };
  return (hustles || []).map((h, i) => ({ id: h.id, s: score(h), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i).slice(0, n).map((x) => x.id);
}

// Checks a v2 payload ({v: 2, hustles: [...]}) from presets, a share link or an AI estimate. Throws a plain message.
export function validate(payload) {
  const bad = (msg) => { throw new Error(msg); };
  const str = (x) => typeof x === "string" && x.trim().length > 0;
  const https = (x) => typeof x === "string" && /^https:\/\/[^\s]+$/i.test(x);
  const oneOf = (x, list) => list.includes(x);
  const nums12 = (a, max = Infinity) => Array.isArray(a) && a.length === 12 && a.every((v) => isNum(v) && v >= 0 && v <= max);
  if (!payload || typeof payload !== "object") bad("The data is empty.");
  if (payload.v !== 2) bad("The data is from an old version.");
  if (!Array.isArray(payload.hustles) || !payload.hustles.length) bad("The data has no side hustles in it.");
  for (const h of payload.hustles) {
    if (!h || typeof h !== "object") bad("A side hustle in the data is empty.");
    const name = str(h.name) ? h.name : "A side hustle";
    const need = (ok, what) => ok || bad(`${name}: ${what}.`);
    need(str(h.id) && str(h.name), "needs an id and a name");
    need(isNum(h.baseHours) && h.baseHours > 0, "needs base hours above 0");
    need(isNum(h.capFactor) && h.capFactor >= 1, "needs a cap factor of 1 or more");
    const r = h.ramp || {};
    need(nums12(r.low) && nums12(r.typical) && nums12(r.high), "needs 12 months of low, typical and high earnings, none below 0");
    need(r.low.every((v, i) => v <= r.typical[i] && r.typical[i] <= r.high[i]), "earnings must go low, then typical, then high");
    need(h.firstDollarMonth === null || (Number.isInteger(h.firstDollarMonth) && h.firstDollarMonth >= 1 && h.firstDollarMonth <= 12), "first dollar month must be 1 to 12");
    need(typeof h.payoutNote === "string", "needs a payout note");
    const m = h.market || {};
    need(oneOf(m.trend, ["growing", "flat", "shrinking"]), "trend must be growing, flat or shrinking");
    need(nums12(m.interest, 100), "needs 12 months of interest from 0 to 100");
    need(oneOf(m.competition, ["low", "medium", "crowded"]), "competition must be low, medium or crowded");
    need(Array.isArray(m.angles) && m.angles.length === 3 && m.angles.every((a) => a && str(a.name) && typeof a.why === "string"), "needs 3 less crowded angles");
    need(Array.isArray(h.tools) && h.tools.every((t) => t && str(t.job) && str(t.name) && typeof t.plan === "string" && isNum(t.priceMonthly) && t.priceMonthly >= 0 && https(t.url) && t.free && str(t.free.name)), "each tool needs a job, name, plan, price, https link and a free option");
    const f = h.facts || {};
    need(oneOf(f.needsFace, ["none", "optional", "required"]) && typeof f.needsAudience === "boolean" && f.startupCost && isNum(f.startupCost.low) && isNum(f.startupCost.high)
      && oneOf(f.skillNeeded, ["none", "basic", "skilled", "expert"]) && isNum(f.minHoursPerWeek) && oneOf(f.scalable, ["yes", "partly", "no"]), "facts are incomplete");
    need(Array.isArray(h.estimated) && h.estimated.every((k) => typeof k === "string"), "estimated must be a list");
    need(h.sources && typeof h.sources === "object" && !Array.isArray(h.sources), "sources must be an object");
    for (const list of Object.values(h.sources)) need(Array.isArray(list) && list.every((s) => s && str(s.title) && https(s.url)), "each source needs a title and an https link");
  }
  return payload;
}

// Share links stay short: quotes cut to 120 characters. JSON files keep the full text.
export const LINK_QUOTE = 120;
const cut = (s, n) => (typeof s === "string" && [...s].length > n ? [...s].slice(0, n - 1).join("") + "…" : s);
const isObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
const mapVals = (o, fn) => (isObj(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fn(v)])) : o);
const cutSources = (list) => (Array.isArray(list) ? list.map((s) => (isObj(s) && "quote" in s ? { ...s, quote: cut(s.quote, LINK_QUOTE) } : s)) : list);
function linkCopy(p) {
  if (!isObj(p) || !Array.isArray(p.hustles)) return p;
  return { ...p, hustles: p.hustles.map((h) => (isObj(h) && "sources" in h ? { ...h, sources: mapVals(h.sources, cutSources) } : h)) };
}

export function encode(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(linkCopy(payload)));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decode(str) {
  if (typeof str !== "string") throw new Error("Share data must be text.");
  let s = str.replace(/\s+/g, "");
  const at = s.indexOf("#d=");
  if (at >= 0) s = s.slice(at + 3);
  else if (s.startsWith("d=")) s = s.slice(2);
  if (!s || !/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) throw new Error("This is not a Hustle Check link.");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  // v2 links carry a built-in hustle id or the full hustle list
  if (!isObj(data) || !(Array.isArray(data.hustles) || typeof data.id === "string")) throw new Error("The link has no side hustle in it.");
  return data;
}
