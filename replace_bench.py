from pathlib import Path
p = Path("src/data/lessons/l2-3-3.ts")
lines = p.read_text(encoding="utf-8").splitlines()
start = next(i for i, l in enumerate(lines) if "code: `import bisect" in l)
end = next(i for i, l in enumerate(lines) if 'print("timings vary by machine and by Python build")`,' in l)
code = Path(r"C:\Users\cored\AppData\Local\Temp\opencode\trie\bench3.py").read_text(encoding="utf-8").splitlines()
new = ["        code: `" + code[0]] + code[1:-1] + [code[-1] + "`,"]
out = lines[:start] + new + lines[end+1:]
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print(len(lines), "->", len(out))
