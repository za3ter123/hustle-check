// Fails if the reference creator's name or site appears outside README credits.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const banned = /iman|gadzhi|consulting\.com|monetise mania/i;
const skip = new Set(["README.md", "SPEC.md", "gates", ".git", "GATES.md"]);
const hits = [];
let scanned = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    scanned++;
    readFileSync(p, "utf8").split("\n").forEach((line, i) => { if (banned.test(line)) hits.push(`${relative(root, p)}:${i + 1}`); });
  }
})(root);
// Positive control: the pattern must catch a known string.
if (!banned.test("Iman Gadzhi")) throw new Error("pattern broken");
if (scanned < 5) throw new Error(`only ${scanned} files scanned`);
if (hits.length) { console.log(hits.join("\n")); process.exit(1); }
console.log(`BRAND-OK ${scanned} files`);
