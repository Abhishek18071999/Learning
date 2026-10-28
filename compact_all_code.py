from pathlib import Path
p = Path("src/data/lessons/l2-3-3.ts")
lines = p.read_text(encoding="utf-8").splitlines()
out = []
in_code = False
for line in lines:
    if not in_code and "code: `" in line:
        in_code = True
        out.append(line)
        continue
    if in_code:
        if "`" in line and "code: `" not in line:
            in_code = False
            out.append(line)
            continue
        if line.strip() == "":
            continue
        out.append(line)
        continue
    out.append(line)
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(lines), "->", len(out))
