// Checks every curated link (lessons "go deeper" + resources read/video/practice).
// Run: node scripts/check-links.mjs
// Only a definitive 404/410 fails the build; 403/429/timeouts are reported as
// "unverified" because many good sites block bots or are slow.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDERS = /(^https?:\/\/(x|example|localhost|127\.0\.0\.1)|\.invalid(\/|$))/i;
const urls = new Map();
const add = (url, where) => {
  if (!url.startsWith("http") || PLACEHOLDERS.test(url)) return;
  if (!urls.has(url)) urls.set(url, new Set());
  urls.get(url).add(where);
};

const readUrlFields = (dir, filter) => {
  for (const f of readdirSync(dir).filter(filter)) {
    const text = readFileSync(join(dir, f), "utf8");
    for (const m of text.matchAll(/url:\s*"([^"]+)"/g)) add(m[1], f.replace(/\.ts$/, ""));
  }
};

readUrlFields(join(root, "src/data/lessons"), (f) => /^l\d+-\d+-\d+\.ts$/.test(f));
readUrlFields(join(root, "src/data/resources"), (f) => f.endsWith(".ts"));

async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        method,
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (compatible; DevAtlasLinkCheck/1.0)" },
      });
      if (res.status < 400) return { ok: true };
      if (method === "GET") return { dead: res.status === 404 || res.status === 410, why: res.status };
    } catch (e) {
      if (method === "GET") return { dead: false, why: e.name };
    } finally {
      clearTimeout(timer);
    }
  }
}

const list = [...urls.keys()];
const dead = [];
const unverified = [];
const queue = [...list];
let done = 0;
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    const r = await check(url);
    done++;
    if (r.ok) continue;
    const row = [url, r.why, [...urls.get(url)].slice(0, 3).join("; ")];
    (r.dead ? dead : unverified).push(row);
    if (done % 100 === 0) console.error(`checked ${done}/${list.length}`);
  }
}
await Promise.all(Array.from({ length: 32 }, worker));
console.log(`\nchecked ${list.length} URLs: ${dead.length} dead, ${unverified.length} unverified`);
for (const [url, why, where] of dead) console.log(`  DEAD ${why}\t${url}\t(${where})`);
for (const [url, why, where] of unverified) console.log(`  skip ${why}\t${url}\t(${where})`);
process.exitCode = dead.length ? 1 : 0;
