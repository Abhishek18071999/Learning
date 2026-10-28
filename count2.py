from pathlib import Path
lines = Path("src/data/lessons/l2-3-3.ts").read_text(encoding="utf-8").splitlines()
in_code = False
outside = 0
inside = 0
for line in lines:
    if "code: `" in line:
        in_code = True
        continue
    if in_code and line.strip().endswith("`,"):
        in_code = False
        continue
    if line.strip() == "":
        if in_code: inside += 1
        else: outside += 1
print("outside", outside, "inside", inside, "total", len(lines))
