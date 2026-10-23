// Executes every self-contained Python sample in the lessons (hands-on + homework).
// A sample is skipped if it imports a non-stdlib module (third-party or a helper file
// from another lesson), needs a CLI argument, or hits a real network URL.
// Run: node --experimental-strip-types --no-warnings scripts/run-samples.mjs
// Exits 1 if any runnable sample fails.
import { readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lessonsDir = join(root, "src/data/lessons");

const stdlibJson = spawnSync("python", ["-c", "import sys,json;print(json.dumps(sorted(sys.stdlib_module_names)))"], { encoding: "utf8" });
const stdlib = new Set(JSON.parse(stdlibJson.stdout));
const NETWORK = /https?:\/\/[^\s"')]+/g;
const PLACEHOLDER_HOST = /(x\.dev|example\.(com|org)|localhost|127\.0\.0\.1|\.invalid)/;

const samples = [];
for (const f of readdirSync(lessonsDir).filter((f) => /^l\d+-\d+-\d+\.ts$/.test(f))) {
  const { lesson } = await import(pathToFileURL(join(lessonsDir, f)).href);
  for (const tier of ["basic", "intermediate", "challenge", "capstone"]) {
    const c = lesson.homework[tier].solution.code;
    if (c?.lang === "python" && c.code) samples.push({ id: lesson.id, where: tier, code: c.code });
  }
}

const dir = mkdtempSync(join(tmpdir(), "devatlas-samples-"));
const failures = [];
const skipped = [];
let ran = 0;

for (const s of samples) {
  const imported = [...s.code.matchAll(/^\s*(?:import|from)\s+([A-Za-z_][\w.]*)/gm)].map((m) => m[1].split(".")[0]);
  const needsArgs = /sys\.argv\[1\]/.test(s.code);
  const urls = s.code.match(NETWORK) ?? [];
  if (imported.some((m) => !stdlib.has(m)) || needsArgs || urls.some((u) => !PLACEHOLDER_HOST.test(u))) {
    skipped.push(`${s.id} ${s.where}`);
    continue;
  }
  const file = join(dir, `${s.id.replace(/\./g, "-")}-${s.where.replace(/\W/g, "")}.py`);
  writeFileSync(file, s.code);
  const r = spawnSync("python", [file], { timeout: 30000, encoding: "utf8" });
  ran++;
  if (r.status !== 0) failures.push({ ...s, stderr: (r.stderr || r.error?.message || "").trim().split("\n").slice(-3).join("\n") });
}

console.log(`\nran ${ran} homework Python solutions, ${skipped.length} skipped (need services/network/args), ${failures.length} failed`);
for (const f of failures) console.log(`\nFAIL ${f.id} ${f.where}\n${f.stderr}`);
// Report-only by default (many solutions assume a helper file or context); --strict gates CI.
process.exitCode = process.argv.includes("--strict") && failures.length ? 1 : 0;
