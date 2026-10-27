# Hustle Check v2 spec (final version)

Owner rulings, 2026-10-27:
- It is a simple calculator for online side hustles: AI clipping, AI YouTube videos, faceless TikTok, AI voiceovers and the like. It is not for real businesses.
- The flow is one input and one result page. The design is the "Mix" demo: scratchpad mockups/m-mix/index.html.
- A real business typed in gets a plain refusal and nearby side hustle suggestions.
- Every number is either sourced or labeled "est.". Money is honest and can be $0. This replaces the v1 SPEC.md flow; v1 rules on strict sources and no positive floor still hold.

## Page (web/)
One screen that scrolls:
1. The input field, plus quick picks for the built-in hustles. The quick picks wrap.
2. Money hero:
   - The headline is month-12 typical at the chosen hours.
   - Hours slider, 2 to 20 h, default 6, sitting directly under the headline.
   - A 12-month timeline chart with a low, typical and high band and a draggable playhead.
   - The payout note.
   - A "Strong" line equal to month-12 high.
3. Market: trend word plus sparkline, competition, and 3 less crowded angles.
4. Tools: rows of job, tool, plan and price; a "Free way to start" switch; the total; "Prices change. Check before you buy." and a "checked <month year>" line.
5. Fits you: three one-tap questions (OK showing your face, money to start, skill level), defaulted to no / $0 / beginner. Hours comes from the slider. Then six FACETS marks in words, plus the verdict.
6. Time to first dollar: a 12-step track.
7. Sources: one collapsed list; each fact links its sources.
8. Share: copy link.

**Typed text**, checked in this order:
1. A business word means the refusal state.
2. A match to a built-in hustle means that result.
3. Otherwise, when the page runs inside Claude (the artifact `sample` capability resolves), ask Claude for a payload in the same shape. Every number in it is labeled "AI estimate, not checked". Business detection is also asked there.
4. Otherwise show "No numbers for this one yet", the 3 closest built-in hustles, and a note that the Claude skill can research it.

Currency is USD only, with no location step. There is no mention of Claude on the page, except the fallback note in step 4. Light and dark mode come from the Mix tokens. Phone first, and tap targets are 44px or more.

## Data (web/presets.json, v: 2)
```
{ v: 2, checked: "2026-10", hustles: [ {
  id, name, blurb,
  baseHours: 6, capFactor: 2,
  ramp: { low:[12], typical:[12], high:[12] },      // USD a month at baseHours, months 1..12
  firstDollarMonth, payoutNote,
  market: { trend: "growing"|"flat"|"shrinking", interest:[12] 0..100, competition: "low"|"medium"|"crowded",
            angles: [ {name, why} x3 ] },
  tools: [ {job, name, plan, priceMonthly, url, free: {name, note}} ],
  facts: { needsFace: "none"|"optional"|"required", needsAudience: bool, startupCost: {low,high},
           skillNeeded: "none"|"basic"|"skilled"|"expert", minHoursPerWeek, scalable: "yes"|"partly"|"no" },
  estimated: [keys that are est., e.g. "ramp","market.interest"],
  sources: { <key>: [ {title, url, quote, date} ] }
} ] }
```
Built-in hustles (8): AI clipping, AI YouTube videos, faceless TikTok, AI voiceovers, AI thumbnail design, AI UGC ads, Notion or Canva templates, and AI newsletter.

## Calc (web/calc.js, reused and extended)
- Keep: `facets(facts, profile)` with its v1 rules and verdicts. Keep `encode` and `decode` with the same base64url `#d=` format.
- New: `scale(hustle, hours)` returns `{factor, low[], typical[], high[], headline, strong, firstDollarMonth}`, where factor = min(hours / baseHours, capFactor), every array value is multiplied by factor and rounded to a whole dollar, headline = typical[11] and strong = high[11].
- New: `toolsCost(tools, free)` returns `{total, rows}`. When free is on, every price is 0.
- New: `isBusiness(text)` is true for company, restaurant, shop or store as whole words, car wash, salon, franchise, "open a", "start a company", factory and warehouse. It is false for dropshipping, photoshop, workshop and OpenAI.
- New: `matchHustle(text, hustles)` returns an id or null.
- New: `closest(text, hustles, n)` returns ids.
- `validate(payload)` throws a plain message when the payload is bad.

## Skill (skills/hustle-check/)
It asks for one side hustle and refuses businesses the same way the page does. It researches with WebSearch and WebFetch:
- earnings
- payout rules
- tools and current prices
- market trend
- competition
- less crowded angles

It quotes sources and labels gaps "est.". It builds one hustle in the v2 shape, runs the shared calc.js through node for the numbers, prints a short summary, and prints a link to the page with `#d=`.

## Repo
Push nothing until the owner approves. Credit FACETS in the README only, and keep the brand gate.
