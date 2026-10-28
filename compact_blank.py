from pathlib import Path
p = Path("src/data/lessons/l2-3-3.ts")
lines = p.read_text(encoding="utf-8").splitlines()
in_code = False
out = []
for i, line in enumerate(lines):
    if "code: `" in line:
        in_code = True
        out.append(line)
        continue
    if in_code and line.strip().endswith("`,"):
        in_code = False
        out.append(line)
        continue
    if in_code and line.strip() == "":
        prev = lines[i-1] if i else ""
        nxt = lines[i+1] if i+1 < len(lines) else ""
        if prev.startswith(" ") and nxt.startswith(" ") and nxt.strip() not in ("", "`,"):
            continue
    out.append(line)
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(lines), "->", len(out))
