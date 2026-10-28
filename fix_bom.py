from pathlib import Path
p = Path("src/data/lessons/l2-3-3.ts")
s = p.read_text(encoding="utf-8")
s = s.replace("\ufeff", "")
p.write_text(s, encoding="utf-8")
print("bom removed", "\ufeff" in p.read_text(encoding="utf-8"))
