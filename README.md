# Hustle Check

Hustle Check is a calculator for online side hustles. Pick one or type one, like AI clipping, and it shows what you could honestly earn. It is free and open source (MIT).

For the hustle you choose, the page shows:

- A 12 month earnings range (low, typical and high) that scales with the hours you give it.
- The market: trend, competition and three less crowded angles.
- The tools you need, with prices, a total, and a free way to start.
- A six check fit, with a verdict, based on your face, money and skill answers.
- Time to first dollar.
- Sources for each fact.

It is for side hustles only. If you type a real business, such as a restaurant, a shop or a salon, it says so and points you to nearby side hustles.

Every number is an estimate unless a source backs it. Estimates are marked est. Money can be $0. Everything is in USD.

## Built-in hustles

AI clipping, AI YouTube videos, Faceless TikTok, AI voiceovers, AI thumbnail design, AI UGC ads, Notion or Canva templates and AI newsletter.

## Use the page

Open https://za3ter123.github.io/hustle-check/ in a browser, or open `web/index.html` locally. There is no server, no account and no tracking.

1. Pick a hustle, or type one.
2. Move the hours slider from 2 to 20 hours a week. The earnings range updates.
3. Answer three quick questions: OK showing your face, money to start, skill level.
4. Read the market, tools, fit and sources. Copy the link to share the result.

If you type a hustle that is not built in, the page shows the closest ones. The Claude skill below can research it.

## Install the skill

From Claude Code:

```
/plugin marketplace add za3ter123/hustle-check
/plugin install hustle-check@hustle-check
```

Or copy it by hand: put the whole `skills/hustle-check` folder into `~/.claude/skills/`, so the files sit at `~/.claude/skills/hustle-check/SKILL.md` and `~/.claude/skills/hustle-check/calc.js`.

The skill needs web search and web fetch in Claude Code, and Node 20 or newer for the math. Ask Claude "hustle check: faceless TikTok" or run `/hustle-check faceless TikTok`.

It asks for one side hustle and refuses businesses the same way the page does. Then it asks four quick questions: hours a week, face, money to start and skill. It researches earnings, payout rules, tool prices, market trend, competition and less crowded angles with WebSearch and WebFetch. Each fact needs a page it opened and a quote from it. Anything it cannot source is marked est. It saves `hustle-check-<id>.json`, runs the shared `calc.js` for the numbers, prints a short summary and prints a link that opens the page with everything filled in.

## Data format

The page and the skill share one JSON payload, version 2. It holds the hustles, each with a 12 month ramp, market, tools, facts, an `estimated` list and sources. A share link is the page address plus `#d=` and the payload as base64url. The full format is in `SPEC-v2.md`.

## Run the tests

```
node --test web/
node gates/golden2.mjs
```

## Credits

- FACETS framework by Iman Gadzhi. Only the ideas behind its six questions are used, reworded in our own words. Hustle Check has no affiliation with him or his companies and uses none of his branding.
- [emotixco/claude-skills-founder](https://github.com/emotixco/claude-skills-founder) (MIT): the plugin and marketplace layout.
- [MaxKmet/idea-validation-agents](https://github.com/MaxKmet/idea-validation-agents) (MIT): the idea of refusing a verdict when the evidence is thin.
- [kzeitar/idea-sieve](https://github.com/kzeitar/idea-sieve) (MIT): the idea of a source for every claim.

## License

MIT. See `LICENSE`.
