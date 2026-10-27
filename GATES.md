# Gates: Hustle Check v2 (final version)

OWNS: web/**, skills/**, .claude-plugin/**, README.md, LICENSE

Scope: The simple side-hustle calculator in the Mix design, built to SPEC-v2.md, plus the Claude skill. Local only until the owner approves. The v1 gates are superseded on 2026-10-27; v1 was rejected as bad UI/UX.

- [x] G1: Builder unit tests for web/calc.js pass
  CHECK: node --test web/
  EXPECT: (?m)^\S+ fail 0$
  EVIDENCE: 2026-10-27 tests 21 pass 21 fail 0

- [x] G2: Independent v2 golden checks pass: scale, tools cost, business refusal, matching, validate, the shipped presets (written before the build)
  CHECK: node gates/golden2.mjs
  EXPECT: GOLDEN2-OK
  EVIDENCE: 2026-10-27 GOLDEN2-OK

- [x] G3: No reference creator name or site outside README and SPEC (pattern has a positive control)
  CHECK: node gates/brand.mjs
  EXPECT: BRAND-OK
  EVIDENCE: 2026-10-27 BRAND-OK 19 files

- [x] G4: Plugin manifests validate
  CHECK: claude plugin validate .
  EXPECT: (?i)validation passed
  EVIDENCE: 2026-10-27 Validation passed

- [x] G5: Page works on a phone. A fresh verifier at 390x844 tries each of the 8 hustles, the hours slider (the headline equals month 12 typical), the playhead drag, the free switch, a business refusal, an unknown hustle fallback and a share link. Zero console errors, no sideways scroll, light and dark mode
  EVIDENCE: 2026-10-27 fresh verifier 12 of 13 PASS at 390x844; item 8 (est. on Fits you) FAIL, fixed; recheck by a second fresh verifier PASS on 4 hustles, source date contrast 6.71 light 6.50 dark, fallback labels right, no sideways scroll, console empty

- [x] G6: Every source URL in presets.json loads, and its quote appears on the page or is marked as unverifiable
  EVIDENCE: 2026-10-27 fresh checker, 74 entries: ok 70, mismatch 2 (InVideo fixed to Starter 20, Fiverr quote removed), blocked 2 (Upwork source removed, Midjourney price kept from a third party page)

- [x] G7: Skill works end to end on a hustle that is not built in; its link opens the page with the same numbers
  EVIDENCE: 2026-10-27 run 1 (KDP coloring books, with web research): research, refusal, validate, summary PASS; link lacked answers and zero ramp, fixed in SKILL.md. Run 2 (fresh verifier, no web tools): link decodes to hours 5 face no budget 20 skill beginner, validate passes, page shows 5h and headline 38 equal to summary, ramp est non-zero, all unsourced facts in estimated

- [x] G8: Owner tries the final page on his phone and approves before any public push
  EVIDENCE: 2026-10-27 owner said "Less go" after the Version 3 link and screenshots
