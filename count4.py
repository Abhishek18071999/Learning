from pathlib import Path
lines = Path("src/data/lessons/l2-3-3.ts").read_text(encoding="utf-8").splitlines()
in_code = False
inside = outside = 0
for line in lines:
    if not in_code and "code: `" in line:
        in_code = True
        continue
    if in_code:
        if "`" in line:
            in_code = False
        elif line.strip() == "":
            inside += 1
        continue
    if line.strip() == "":
        outside += 1
print("outside", outside, "inside", inside, "total", len(lines))
