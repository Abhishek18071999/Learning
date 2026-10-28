from pathlib import Path
lines = Path("src/data/lessons/l2-3-3.ts").read_text(encoding="utf-8").splitlines()
in_code = False
removable = 0
kept = 0
for i, line in enumerate(lines):
    if "code: `" in line:
        in_code = True
        continue
    if in_code and line.strip().endswith("`,"):
        in_code = False
        continue
    if in_code and line.strip() == "":
        prev = lines[i-1] if i else ""
        nxt = lines[i+1] if i+1 < len(lines) else ""
        if prev.startswith(" ") and nxt.startswith(" ") and (nxt.startswith("    ") or prev.startswith("    ")):
            removable += 1
        else:
            kept += 1
print("removable", removable, "kept", kept)
