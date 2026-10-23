import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.1",
  title: "Python essentials: data model, functions and type hints",
  minutes: 85,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "Python 3.11+ installed (python --version)"],
  summary: "Learn how Python really handles names, objects, mutability and functions, why mutable defaults leak state, and how to use type hints as a checked contract without pretending they are runtime validation.",
  terms: [
    { term: "Object", def: "Everything in Python is an object with a type, a value and an identity (`id`). Functions, classes and modules are objects too." },
    { term: "Name / variable", def: "A label bound to an object. Assignment never copies; it binds a name to an object (or rebinds it to a different one)." },
    { term: "Identity", def: "Which object a name refers to. `id(x)` returns an integer that is unique while the object lives; `a is b` is true only when both names refer to the same object." },
    { term: "Mutable", def: "Can be changed in place: list, dict, set, bytearray. Immutable: int, float, str, tuple, frozenset, bytes." },
    { term: "Aliasing", def: "Two or more names (or containers) referring to the same object. A change made through one alias is visible through the others." },
    { term: "Copy (shallow vs deep)", def: "A shallow copy (`list(a)`, `a[:]`, `a.copy()`, `copy.copy(a)`) builds a new outer container whose elements are still shared. `copy.deepcopy(a)` recursively copies the graph, so nested objects are independent." },
    { term: "Function signature", def: "The parameter list plus annotations and return type. `/` marks positional-only parameters, `*` marks the start of keyword-only parameters, `*args` collects extra positionals and `**kwargs` collects extra keywords." },
    { term: "First-class function", def: "A function is an ordinary object: you can store it in a list or dict, pass it to another function, return it, and attach attributes to it." },
    { term: "Type hint", def: "An annotation like `def f(x: int) -> str` that documents types and lets tools such as mypy or pyright check them. Python does not enforce hints at runtime." },
    { term: "Gradual typing", def: "Typing a program one boundary at a time. Untyped values are treated as `Any`, which is compatible with everything, so checks improve as you add hints instead of demanding a rewrite." },
    { term: "Comprehension", def: "Compact syntax to build a list/dict/set: `[x*x for x in nums if x > 0]`. The result is a new object, which is often the cleanest way to avoid mutating while iterating." },
    { term: "Virtual environment", def: "An isolated folder of packages for one project, created with `python3 -m venv .venv`." },
  ],
  problem: [
    "A teammate writes a helper that adds a default tag to every news article. In testing it works. In production, articles start showing tags from completely unrelated articles, and the list keeps growing every request. The bug is one line: `def add_tag(tag, tags=[])`. The list was created once, when the module was imported, and every call appends to that same object.",
    "Fixing it requires more than deleting the brackets. You need a model of how Python binds names to objects, when an object is shared, what a copy actually copies, and what a function signature promises. This lesson builds that model, then uses type hints and a static checker to make the next mistake visible before it reaches production. The AI service in DevAtlas is written in Python, so these details are not academic: they decide whether one request can corrupt another.",
  ],
  concept: {
    analogy: [
      "Python variables are **name tags, not boxes**. When you write `a = [1, 2]` you create a list object and stick the tag `a` on it. `b = a` sticks a second tag on the **same** list. Change the list through `b`, and `a` sees it, because there is only one list. A copy is a new object with the same contents; a deep copy is a new object whose contents are new too.",
      "Default arguments are like a shopping list printed on a recipe card at the moment the recipe is written. Every time you cook, you use that same printed list, not a fresh one. If you add an ingredient to it, the addition is still there for the next person who follows the recipe. The professional habit is to write 'start with an empty list' on the card (the `None` default) and create the real list when cooking starts.",
    ],
    precise: [
      "Assignment binds a name to an object; it does not copy the object. **Mutable** objects (list, dict, set) can change in place, so every name bound to them observes the change. Immutable objects cannot change; an operation like `s + 'x'` or `n + 1` creates a new object and rebinds the name. `==` compares values, `is` compares identity, and `id(x)` exposes the identity as an integer.",
      "Function **default arguments are evaluated once, when the `def` statement executes**, not on each call. The resulting objects are stored on the function as `func.__defaults__` (positional defaults) and `func.__kwdefaults__` (keyword-only defaults). A mutable default is therefore shared by every call and every instance that calls the method. The fix is `None` as the default and a fresh object created inside the body; the same reasoning applies to `datetime.now()` defaults, which freeze the time at import.",
      "Arguments are passed by **object reference** (often called 'call by sharing'): the parameter is a new local name bound to the caller's object. Mutating the object is visible to the caller; rebinding the parameter name is not. A signature can make the contract explicit with positional-only parameters (`/`), keyword-only parameters (`*`), `*args` (a tuple of extra positionals) and `**kwargs` (a dict of extra keywords).",
      "Type hints are **metadata, not enforcement**. Python evaluates annotations at `def` time and stores them in `__annotations__`; calling `double('ab')` on `def double(x: int) -> int` still returns `'abab'`. Static checkers such as mypy and pyright read the annotations and the surrounding code to prove that calls and returns are consistent. That check is valuable at module boundaries and in refactors, and easy to over-apply in throwaway scripts. Runtime validation at a trust boundary is a separate job, done by Pydantic, dataclass validation or explicit checks.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Every value is an object with three facts.** A Python object has a type, a value and an identity. In CPython the identity is the address of the object's `PyObject` header, so `id(a)` prints something like `2361600932096`; the language only promises that the number is unique while the object is alive, so do not persist it or compare it across processes. `a is b` asks whether two names refer to the same object, while `a == b` asks the objects to compare their values. `[1] == [1]` is true and `[1] is [1]` is false, because the two list literals create two list objects with equal contents.",
      "2. **Names live in namespaces, not in the objects.** A module keeps its names in a dict; a function keeps its local names in a small array of slots, which is why local variable access compiles to a fast `LOAD_FAST` instruction. `a = b` compiles to loading the object reference from `b` and storing that same pointer under `a`; no constructor and no copy run. `del a` removes a name, not an object: the object survives as long as another name, container or stack slot refers to it. CPython frees it when the reference count reaches zero, with a cycle collector for self-referential graphs.",
      "3. **Mutability is a property of the type, not the name.** A list owns a resizable buffer of pointers; `append`, `sort`, `pop` and `d[k] = v` change that buffer in place. A tuple owns a fixed set of pointers, so `t = t + (4,)` builds a new tuple and rebinds `t`. The `+=` operator is a good probe: `list.__iadd__` mutates the existing list, while `int.__add__` and `str.__add__` return a new object, so `b += [9]` can change what `a` sees while `n += 1` cannot. Tuple immutability is shallow: a tuple cannot lose or replace an element, but an element that is a list can still be mutated.",
      "4. **Copies come in two depths.** `b = a.copy()`, `b = list(a)`, `b = a[:]` and `b = copy.copy(a)` all build a new outer container whose slots point at the same element objects. That is enough when the elements are immutable, and wrong when they are lists: mutating `a[0]` still shows through `b`. `copy.deepcopy(a)` walks the graph, copies each object and records the mapping in a memo dict, which both prevents an exponential blow-up and preserves internal sharing; it also handles cycles. For an immutable object a copy may legally return the same object, because no one can observe the difference.",
      "5. **Defaults are created at definition time.** When the interpreter executes a `def`, it evaluates the default expressions in the enclosing scope, builds the function object and stores the results in `__defaults__` (a tuple) and `__kwdefaults__` (a dict). The body runs later and looks the values up on the function object. Nothing in the call protocol re-evaluates them. That is why `def add_tag(tag, tags=[])` shares one list across calls, why a method with that default shares it across instances, and why `def stamp(when=datetime.now())` freezes the import time. Use `None` and create the value in the body; do not use a falsy check like `if not tags`, which also replaces a deliberately passed empty list.",
      "6. **A call is a binding algorithm, not a copy.** At the call site the interpreter evaluates the arguments, then binds them to parameters: positionals fill positional parameters left to right, keywords fill by name, extra positionals go into a tuple for `*args`, and extra keywords go into a dict for `**kwargs`. A `/` in the signature makes parameters positional-only, so a same-named keyword either raises `TypeError` or is collected by `**kwargs`; a `*` makes everything after it keyword-only. Inside the function the parameter is just another name for the caller's object, so `tags.append(x)` is visible to the caller and `tags = tags + [x]` is not.",
      "7. **Annotations are stored, then ignored by the interpreter.** By default in Python 3.11, annotations are evaluated when the `def` runs and kept in a dict such as `{'level': <class 'str'>, 'return': <class 'str'>}`. The bytecode for the body never consults that dict. `from __future__ import annotations` stores the source text instead (PEP 563), and Python is moving toward lazier evaluation (PEP 649) to avoid evaluating expensive or forward-referenced types at import. A subscripted generic such as `list[int]` is a `types.GenericAlias`; it is useful to checkers, but `isinstance(x, list[int])` raises `TypeError` because element types are not checked at runtime.",
      "8. **Gradual typing is the point, and `Any` is the escape hatch.** mypy and pyright build a model of your program, infer types for unannotated code and report contradictions. `Any` is compatible with every type in both directions, so one `Any` can silence a whole chain of errors; `# type: ignore[arg-type]` is the targeted version, and `--strict` turns on checks such as `disallow_untyped_defs`. A type error caught statically is a bug you never ship; a type error caught only by a test is a bug you were lucky to test. Hints pay for themselves at public function boundaries, data models and cross-module calls, and they are usually not worth the friction in a twenty-line scratch script.",
    ],
    diagram: {
      title: "One call, two names, one object",
      nodes: [
        { label: "caller", sub: "tags → list object" },
        { label: "argument", sub: "reference passed" },
        { label: "parameter", sub: "local name tags" },
        { label: "mutate", sub: "append changes object" },
        { label: "caller sees", sub: "['ai', 'rust']" },
      ],
      edges: ["binds", "same object", "in place", "visible"],
      caption: "The reference is copied; the object is not. Rebinding the parameter (`tags = tags + ['rust']`) would leave the caller's name on the original object.",
    },
  },
  handsOn: [
    {
      title: "Names point at objects, and copies decide what you share",
      text: [
        "Run this as one file. The two `id` values are equal because `b = a` copied a reference, not a list. The `grid` block then shows why a slice is only a shallow copy: `sliced` is a new list whose first slot still points at the same inner list as `grid`, while `deep` owns independent inner lists. The last block is the production bug from the introduction, plus the `None` fix.",
        "The exact `id` numbers are CPython memory addresses and differ on every run; what matters is that the two values match.",
      ],
      code: {
        lang: "python",
        file: "names_and_defaults.py",
        code: `import copy

a = [1, 2, 3]
b = a
print("id(a) =", id(a))
print("id(b) =", id(b))
print("a is b:", a is b)
b.append(4)
print("after b.append(4), a =", a)

c = a.copy()
c.append(5)
print("after c.append(5), a =", a, "| c =", c)

grid = [[1, 2], [3, 4]]
sliced = grid[:]
deep = copy.deepcopy(grid)
grid[0].append(99)
print("grid   =", grid)
print("sliced =", sliced)
print("deep   =", deep)
print("sliced[0] is grid[0]:", sliced[0] is grid[0])
print("deep[0] is grid[0]:  ", deep[0] is grid[0])
print("== value:", [1] == [1], "| is identity:", [1] is [1])

def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags

print(add_tag("ai"))
print(add_tag("rust"))
print("shared default:", add_tag.__defaults__)

def add_tag_fixed(tag, tags=None):
    result = [] if tags is None else list(tags)
    if tag not in result:
        result.append(tag)
    return result

print(add_tag_fixed("ai"))
print(add_tag_fixed("rust"))
print(add_tag_fixed("ai", ["rust"]))
print("fixed default:", add_tag_fixed.__defaults__)`,
      },
      output: "id(a) = 2361600932096\nid(b) = 2361600932096\na is b: True\nafter b.append(4), a = [1, 2, 3, 4]\nafter c.append(5), a = [1, 2, 3, 4] | c = [1, 2, 3, 4, 5]\ngrid   = [[1, 2, 99], [3, 4]]\nsliced = [[1, 2, 99], [3, 4]]\ndeep   = [[1, 2], [3, 4]]\nsliced[0] is grid[0]: True\ndeep[0] is grid[0]:   False\n== value: True | is identity: False\n['ai']\n['ai', 'rust']\nshared default: (['ai', 'rust'],)\n['ai']\n['rust']\n['rust', 'ai']\nfixed default: (None,)",
      notes: [
        "`a.copy()`, `list(a)` and `a[:]` are all shallow. The new list is safe to mutate at the top level, but any nested list is still shared. `copy.deepcopy` is the tool when nesting matters; it is also the honest way to demonstrate that a slice did not protect you.",
        "`add_tag.__defaults__` is not a debugging curiosity: it is the shared object itself. After two calls it contains `['ai', 'rust']`. The fixed version stores `None`, and a fresh list is built for every call, so `add_tag_fixed('rust')` returns exactly `['rust']`.",
        "The same trap appears with `def stamp(when=datetime.now())`: the timestamp is captured once at import. Use `when=None` and `when = when or datetime.now()` only if `None` is not a valid input; otherwise use `if when is None`.",
        "The same object model covers the core containers from the original lesson: `scores = [72, 91, 85]` (list), `user = {\"id\": 7, \"name\": \"Asha\"}` (dict), `seen = {\"ai\", \"rust\"}` (set) and `point = (12.9, 77.6)` (tuple). List, dict and set are mutable, so they can be aliased and changed; tuple is immutable. Dict and set membership is O(1) on average, while `x in list` is O(n).",
      ],
    },
    {
      title: "Read a signature: positional-only, keyword-only and first-class functions",
      text: [
        "A signature is executable documentation. Here `log` takes two positional-only parameters (before `/`), a keyword-only `prefix` (after `*`), and collects any extra keywords in `**extra`. `area` shows the error you get when you ignore the `/`, and `total` shows `*args` with a keyword-only accumulator.",
      ],
      code: {
        lang: "python",
        file: "signatures.py",
        code: `from collections.abc import Callable

def log(level: str, message: str, /, *, prefix: str = "", **extra: object) -> str:
    parts = [f"[{level.upper()}]"]
    if prefix:
        parts.append(prefix)
    parts.append(message)
    if extra:
        parts.append(str(extra))
    return " ".join(parts)

print(log("info", "server started"))
print(log("info", "server started", prefix="devatlas", pid=42))

def total(*nums: int, start: int = 0) -> int:
    return start + sum(nums)

print("total:", total(1, 2, 3), "| with start=10:", total(1, 2, 3, start=10))

def area(width: float, height: float, /, *, unit: str = "cm") -> float:
    return width * height

print("area:", area(2, 3), "| keyword-only defaults:", area.__kwdefaults__)

try:
    area(width=2, height=3)
except TypeError as exc:
    print("positional-only ->", exc)

print("annotations:", log.__annotations__)
print("annotation type:", type(log.__annotations__["level"]).__name__)

def double(x: int) -> int:
    return x * 2

print("double('ab') =", double("ab"))

ops: dict[str, Callable[[int, int], int]] = {
    "add": lambda a, b: a + b,
    "mul": lambda a, b: a * b,
}
print("function objects:", list(ops))
print("ops['add'](2, 3) =", ops["add"](2, 3))
print("sorted by len:", sorted(["bbb", "a", "cc"], key=len))`,
      },
      output: "[INFO] server started\n[INFO] devatlas server started {'pid': 42}\ntotal: 6 | with start=10: 16\narea: 6 | keyword-only defaults: {'unit': 'cm'}\npositional-only -> area() got some positional-only arguments passed as keyword arguments: 'width, height'\nannotations: {'level': <class 'str'>, 'message': <class 'str'>, 'prefix': <class 'str'>, 'extra': <class 'object'>, 'return': <class 'str'>}\nannotation type: type\ndouble('ab') = abab\nfunction objects: ['add', 'mul']\nops['add'](2, 3) = 5\nsorted by len: ['a', 'cc', 'bbb']",
      notes: [
        "The error message is the runtime's, not a hint: `area(width=2, height=3)` cannot fill positional-only parameters by name. Keyword-only `prefix` must be passed by name, which makes call sites self-documenting and lets you add parameters later without breaking positional callers.",
        "`log.__annotations__` proves that hints are ordinary data attached to the function; `type(...)` is `type` because `str` is a class object. Nothing in the function body reads that dict. `double('ab')` returns `'abab'` with no error, which is exactly why the next step runs a checker.",
        "Functions are values: `ops` maps names to lambdas, `sorted(..., key=len)` passes `len` as an argument, and `ops['add']` is called like any other object. The annotation `Callable[[int, int], int]` describes the shape of the values in the dict; it does not wrap or change them.",
      ],
    },
    {
      title: "Let mypy catch the error Python happily runs",
      text: [
        "The script writes three files: the typed helper, its tests, and a deliberately wrong `error.py`. It then runs the tests, checks the correct module, and checks the broken one. On Windows PowerShell, activate with `.venv\\Scripts\\Activate.ps1` and create the files in your editor instead of using the heredocs.",
      ],
      code: {
        lang: "bash",
        file: "check.sh",
        code: `python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install pytest mypy

cat > tags.py <<'PY'
from collections.abc import Iterable


def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    """Return a new list with tag appended. Never mutates the caller's list."""
    result = list(tags) if tags is not None else []
    if tag not in result:
        result.append(tag)
    return result


def normalise(tags: Iterable[str]) -> list[str]:
    """Lower-case, strip, de-duplicate, keep first-seen order."""
    seen: set[str] = set()
    out: list[str] = []
    for t in tags:
        clean = t.strip().lower()
        if clean and clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out
PY

cat > test_tags.py <<'PY'
from tags import add_tag, normalise


def test_add_tag_does_not_share_state():
    assert add_tag("ai") == ["ai"]
    assert add_tag("rust") == ["rust"]


def test_add_tag_does_not_mutate_input():
    original = ["ai"]
    add_tag("rust", original)
    assert original == ["ai"]


def test_normalise():
    assert normalise([" AI", "ai", "Rust ", ""]) == ["ai", "rust"]
PY

cat > error.py <<'PY'
def greet(name: str, times: int = 1) -> str:
    return f"Hello, {name}! " * times

print(greet("Asha", "3"))
print(greet(["Asha"], 2))
PY

pytest -q
mypy tags.py
mypy error.py`,
      },
      output: "...                                                                      [100%]\n3 passed in 0.02s\nSuccess: no issues found in 1 source file\nerror.py:4: error: Argument 2 to \"greet\" has incompatible type \"str\"; expected \"int\"  [arg-type]\nerror.py:5: error: Argument 1 to \"greet\" has incompatible type \"list[str]\"; expected \"str\"  [arg-type]\nFound 2 errors in 1 file (checked 1 source file)",
      notes: [
        "Run `error.py` and the first call raises `TypeError: can't multiply sequence by non-int of type 'str'`, so the program never reaches the second call. mypy reports both mistakes at once, before execution, and points at the call sites. `[arg-type]` is a stable error code you can ignore narrowly if a third-party stub is wrong.",
        "The correct `tags.py` passes because `add_tag` accepts `list[str] | None`, copies its input, and returns `list[str]`. The tests pass for the same reason. mypy does not execute the code and pytest does not read the hints; together they cover different failure modes, which is why professional projects run both.",
        "`--strict` adds checks such as `disallow_untyped_defs` and `warn_return_any`. pyright (the engine behind Pylance in VS Code) is an alternative with faster inference and slightly different rules. Pick one for CI, keep the editor on the same settings, and fix new errors as they appear instead of batching a painful migration.",
      ],
    },
    {
      title: "Compare mutability, copying and hint tools",
      text: [
        "Keep this table beside the exercises until the operations are automatic. The important line is the copy row: a copy protects the container, not the objects inside it.",
      ],
      code: {
        lang: "text",
        file: "semantics.txt",
        code: `MUTABLE vs IMMUTABLE -- what an operation does to other names
---------------------------------------------------------------------------
operation                  list / dict / set        int / str / tuple
a = b                      binds same object        binds same object
b.append(x) / b[k] = v     mutates in place         not available
b += x                     mutates (list.__iadd__)  rebinds to new object
b = b + x                  rebinds to new object    rebinds to new object
b[:] / b.copy()            new outer, shared inners same object (immutable)
copy.deepcopy(b)           fully independent         new equal object
usable as a dict key       no                       yes (if contents hashable)
---------------------------------------------------------------------------
Rule: a copy protects the container, not the objects inside it.

TYPE HINTS -- what each tool actually guarantees
---------------------------------------------------------------------------
tool        when it runs     catches                          cost
mypy        CI / editor      wrong args, returns, attributes months of value
pyright     editor (Pylance)same idea, faster inference       editor latency
assert      runtime          only the conditions you wrote    small
Pydantic    runtime boundary parses and validates input data  parsing cost
---------------------------------------------------------------------------
Hints document and check; asserts and Pydantic enforce. They are different jobs.`,
      },
      notes: [
        "`is` is not on this table because it is almost never the right comparison for a value. Use it for `None`, `True`, `False` and sentinels you created yourself; use `==` for numbers, strings, lists and dicts.",
        "A frozen dataclass prevents rebinding its fields, but a list field is still mutable. Immutability is usually shallow unless you make it deep on purpose.",
      ],
    },
    {
      title: "Draw one call to see binding, mutation and rebinding",
      text: [
        "Sketch the call before you debug it. The branch is the whole lesson: the same parameter name can either mutate the caller's object or bind a new one, and only the first is visible outside.",
      ],
      code: {
        lang: "mermaid",
        file: "call.mmd",
        code: `flowchart LR
    A["caller: tags = ['ai']"] -->|"passes reference"| B["parameter: tags"]
    B --> C{"what does the body do?"}
    C -->|"tags.append('rust')"| D["same list mutated<br/>caller sees ['ai', 'rust']"]
    C -->|"tags = tags + ['rust']"| E["new list bound locally<br/>caller still sees ['ai']"]`,
      },
      notes: [
        "Draw the same picture for `x += [9]` (mutates a list) and for an `int` (rebinds), and for a default argument (the arrow starts at the function object, not at the call). If you can draw it, you can predict the bug.",
        "GitHub and most Markdown viewers render `mermaid` blocks. Keep diagrams next to the code they explain; they age better than a paragraph of prose.",
      ],
    },
  ],
  companies: [
    "**mypy (verified in this lesson):** the checker installed with `pip` in the hands-on flagged both deliberate calls in `error.py` with `[arg-type]` and left the typed helper alone. mypy was started by Jukka Lehtosalo and later developed with Guido van Rossum at Dropbox; gradual typing was a design goal from the start, because a large Python codebase cannot be annotated in one commit.",
    "**pytest (verified in this lesson):** the three tests passed in 0.02 s while mypy checked types without running them. Most Python teams run pytest and a type checker in CI as separate gates: tests exercise behaviour, the checker proves consistency across call sites that tests may never reach.",
    "**FastAPI and Pydantic (illustrative):** FastAPI reads function annotations to parse query parameters and request bodies, and Pydantic validates the data against the annotated model at the trust boundary. This is the one place where hints are enforced at runtime, because a framework deliberately inspects them; plain Python functions still ignore them.",
    "**Reproducible environments (illustrative):** production teams pin dependencies (requirements files with exact versions, or lock files from tools like uv or Poetry) so the code that passed CI is the code that ships. Pinning the checker matters too: a new mypy release can fail CI with no code change. Adopting mypy on a large existing codebase is a gradual migration, not a big-bang rewrite.",
    "**Python SDKs and AI tooling (illustrative):** model training, data pipelines and most LLM application code are Python-first. SDKs from OpenAI, Anthropic and Hugging Face ship typed request and response models so editors can autocomplete fields and catch a misspelled parameter before a paid API call. The types are a developer-experience feature; the network still needs runtime validation and error handling.",
  ],
  mistakes: [
    { mistake: "Mutable default arguments", why: "`tags=[]` looks natural and works on the first call", wrong: "The list is created once at import, so state leaks between calls, requests and instances", fix: "Default to `None` and create the list inside the function; inspect `__defaults__` when you suspect it" },
    { mistake: "Using `is` to compare values", why: "`x is 5` and short strings sometimes work because of interning", wrong: "Behaviour changes with larger numbers, computed strings or another interpreter", fix: "Use `==` for values; reserve `is` for `None`, booleans and sentinels" },
    { mistake: "Assuming a slice or `.copy()` is independent", why: "The outer list is new, so it feels safe", wrong: "Mutating a nested list still changes the original through the shared inner object", fix: "Use `copy.deepcopy` for nested data, or rebuild the structure explicitly" },
    { mistake: "Confusing rebinding with mutation", why: "Both look like assignment", wrong: "`x = x + [9]` leaves the caller's list alone while `x += [9]` changes it", fix: "Look up whether the type defines `__iadd__`; prefer returning new values from helpers" },
    { mistake: "Modifying a list while iterating over it", why: "Removing items in a `for` loop seems direct", wrong: "Indexes shift and items are skipped silently", fix: "Build a new list with a comprehension, or iterate over a copy" },
    { mistake: "Catching every exception silently", why: "`except: pass` makes the error message disappear", wrong: "Bugs hide until data is corrupted and the traceback is long gone", fix: "Catch the specific exception, log with context, and re-raise what you cannot handle" },
    { mistake: "Treating type hints as runtime validation", why: "The annotations look like a schema", wrong: "A JSON body with a string where an `int` was promised flows straight into your code", fix: "Validate at the boundary with Pydantic or explicit checks; use hints for static analysis" },
    { mistake: "Silencing the checker with `Any` or blanket ignores", why: "It makes the red squiggles go away", wrong: "The check that would have caught the next bug is now disabled for the whole chain", fix: "Use a narrow `# type: ignore[code]` with a reason, or model the type properly" },
    { mistake: "Installing packages globally", why: "pip install works without a venv", wrong: "Projects break each other and deploys differ from your laptop", fix: "One virtual environment per project, with dependencies pinned in a requirements or lock file" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Type-hint public functions and data models, run mypy or pyright in CI, and format with a standard tool (e.g. ruff format or black) so reviews focus on logic." },
    { tag: "Reliability", text: "Prefer pure functions that return new values; never use mutable defaults, and copy input data before mutating it. Push I/O to the edges where it is easy to mock." },
    { tag: "Security", text: "Never use eval() on input, and never put secrets in code: read them from environment variables (os.environ). Type hints do not sanitise anything." },
    { tag: "Performance", text: "Use sets and dicts for membership checks: O(1) on average vs O(n) for lists. Reach for deepcopy only when independence is required; it walks the whole graph." },
    { tag: "Maintainability", text: "Validate untrusted input once, at the boundary, with a runtime schema; keep the rest of the code typed and trust it. Document why an `Any` or an ignore exists." },
  ],
  interview: [
    { q: "Explain names, objects, mutability and the mutable-default bug, with a concrete example.", a: "Start with the model: assignment binds a name to an object, and `b = a` makes two names refer to the same object, which you can prove with `id(a) == id(b)` and `a is b`. A list is mutable, so `b.append(3)` is visible through `a`; an int or string is immutable, so `n += 1` or `s += 'x'` creates a new object and rebinds only that name. Slices and `.copy()` create a new outer container but share the elements, so a nested list is still aliased; `copy.deepcopy` copies the graph and uses a memo to preserve internal sharing and handle cycles. A default such as `def add_tag(tag, tags=[])` is evaluated once when the `def` executes and stored in `add_tag.__defaults__`, so every call appends to the same list; the same applies to methods and to `datetime.now()` defaults. The fix is `tags=None` and a fresh list inside the function, and a test that calls the function twice and asserts the second result is independent. If asked to go deeper, mention that `+=` reflects this distinction: `list.__iadd__` mutates, `str.__add__` rebinds, and `is` compares identity while `==` compares value." },
    { q: "Is Python pass-by-value or pass-by-reference? What does a function actually receive, and how do signatures change the answer?", a: "Neither label fits exactly; the usual description is pass-by-object-reference or call by sharing. The caller evaluates an object and the callee binds a new local name to that same object. Mutating the object (`items.append(x)`, `d['k'] = v`) is visible to the caller because there is one object; rebinding the parameter (`items = items + [x]`, `items = None`) only changes the local name. That is why a function can safely return a new list without changing its input. The signature controls how arguments are matched, not whether they are copied: `/` makes parameters positional-only, `*` makes the rest keyword-only, `*args` collects extra positionals into a tuple and `**kwargs` collects extra keywords into a dict; those containers are new, but the objects inside them are still shared. Defaults are bound once at definition time, which is why a mutable default is shared across calls. A strong answer ends with the practical rule: copy at the boundary if you need ownership, and return new values instead of mutating arguments." },
    { q: "If Python ignores type hints at runtime, why use them at all? When are they worth the cost?", a: "Hints are a static contract. A checker such as mypy or pyright reads them with the rest of the program and proves that calls, returns and attribute access are consistent; that catches refactor breakage in code paths your tests may never execute, and it powers editor completion and rename. At runtime the interpreter only stores them in `__annotations__`, so `def double(x: int) -> int` still accepts a string; enforcement is a separate concern handled by Pydantic, dataclass validation or explicit checks at a trust boundary. Gradual typing is the economic argument: unannotated code is `Any`, which is compatible with everything, so you can annotate public functions and data models first and tighten over time. They are worth it for shared modules, APIs, data models and anything that will be refactored; they are often not worth it for a short script or heavily dynamic metaprogramming. The cost is annotation effort, checker configuration and occasional fights with third-party stubs, so use targeted ignores with error codes rather than blanket `Any`." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What is printed?",
      code: { lang: "python", code: "a = [1, 2]\nb = a\nb.append(3)\nprint(a)" },
      options: ["[1, 2]", "[1, 2, 3]", "Error", "[3]"],
      answer: 1,
      explanation: "b and a are two names for one list object. Appending through b changes the only list there is.",
    },
    {
      kind: "output",
      prompt: "What is printed?",
      code: { lang: "python", code: "def f(x):\n    x = x + [9]\n\nnums = [1]\nf(nums)\nprint(nums)" },
      options: ["[1, 9]", "[1]", "[9]", "None"],
      answer: 1,
      explanation: "`x + [9]` creates a new list and rebinds the local name x. The caller's list is untouched. (`x += [9]` or `x.append(9)` would mutate it.)",
    },
    {
      kind: "bug",
      prompt: "Why does this sometimes skip items?",
      code: { lang: "python", code: "for t in tags:\n    if t == \"\":\n        tags.remove(t)" },
      options: ["remove is slow", "Removing while iterating shifts indexes", "Strings cannot be compared", "It never skips"],
      answer: 1,
      explanation: "The iterator moves to the next index while the list shifted left, so the item after a removed one is skipped. Use `tags = [t for t in tags if t]`.",
    },
  ],
  cheatSheet: [
    "Variables are names bound to objects; `b = a` never copies, it aliases.",
    "`==` compares value, `is` compares identity (use `is` only for None and sentinels).",
    "Mutable: list, dict, set. Immutable: int, float, str, tuple, frozenset.",
    "`a[:]`, `list(a)` and `a.copy()` are shallow; `copy.deepcopy(a)` copies nested objects too.",
    "Never use mutable defaults; default to `None` and create the object inside. Defaults run once at `def` time and live in `__defaults__` / `__kwdefaults__`.",
    "Parameters are local names for the caller's objects: mutation escapes, rebinding does not.",
    "Signature marks: `/` positional-only, `*` keyword-only, `*args` tuple, `**kwargs` dict.",
    "Hints live in `__annotations__` and are not enforced; mypy/pyright check them statically.",
    "Gradual typing: `Any` disables checks. Annotate public boundaries and data models first.",
    "One venv per project (`python3 -m venv .venv`), pinned deps, pytest + mypy in CI; dict/set lookups are O(1) average, list `in` is O(n).",
  ],
  homework: {
    basic: {
      title: "Word frequency",
      brief: ["Write `top_words(text: str, n: int) -> list[tuple[str, int]]` returning the n most common words, case-insensitive, ignoring punctuation. Include 3 pytest tests."],
      criteria: ["Correct results with ties handled consistently", "Type hints and docstring", "Tests for empty text and n larger than unique words"],
      hints: ["`collections.Counter` has a most_common method.", "`re.findall(r\"[a-z']+\", text.lower())`"],
      solution: {
        text: [
          "Counter does the counting; a regex handles punctuation. `Counter.most_common` orders ties by first insertion, which is deterministic for a given input, so document that rather than pretending the order is alphabetical.",
          "The function returns a new list of tuples and never mutates its argument, which makes it safe to call from several places. The third test passes the same text twice and asserts the results are equal but not the same object, which makes the no-shared-state rule explicit.",
        ],
        code: {
          lang: "python",
          file: "words.py",
          code: `import re
from collections import Counter


def top_words(text: str, n: int) -> list[tuple[str, int]]:
    """Return the n most common words (case-insensitive)."""
    if n <= 0:
        return []
    words = re.findall(r"[a-z0-9']+", text.lower())
    return Counter(words).most_common(n)


def test_empty_text_is_empty() -> None:
    assert top_words("", 5) == []


def test_n_larger_than_unique_words() -> None:
    assert len(top_words("ai ai rust", 10)) == 2


def test_top_words_is_repeatable() -> None:
    text = "AI is here. AI is useful."
    first = top_words(text, 2)
    second = top_words(text, 2)
    assert first == second
    assert first is not second`,
        },
        pitfalls: ["Splitting on spaces only, so 'ai,' and 'ai' count separately", "Not handling n <= 0", "Assuming `most_common` sorts alphabetically on ties"],
      },
    },
    intermediate: {
      title: "Safe config loader",
      brief: ["Write `load_settings() -> Settings` that reads DATABASE_URL (required), LOG_LEVEL (default 'INFO') and MAX_WORKERS (int, default 4) from environment variables, using a dataclass. Raise a clear error listing all missing or invalid values at once."],
      criteria: ["Uses @dataclass(frozen=True)", "Collects all errors before raising", "Tests use monkeypatch to set env vars", "Explain why `frozen=True` does not make a list field immutable"],
      hints: ["pytest's monkeypatch fixture: monkeypatch.setenv('DATABASE_URL', '...')", "`frozen=True` blocks `settings.field = ...`; it does not deep-freeze a list or dict inside the field."],
      solution: {
        text: [
          "Collecting errors gives operators one useful message instead of fixing problems one restart at a time. `frozen=True` is still worth it: it stops accidental rebinding and makes the object hashable when all fields are hashable.",
          "Frozen is shallow. `MAX_WORKERS` is an int, so it is genuinely immutable, but if you later add `ALLOWED_HOSTS: list[str]`, the list can still be mutated in place. Use a tuple for immutable sequences.",
        ],
        code: {
          lang: "python",
          file: "settings.py",
          code: `import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    log_level: str = "INFO"
    max_workers: int = 4


def load_settings() -> Settings:
    errors: list[str] = []
    db = os.environ.get("DATABASE_URL", "")
    if not db:
        errors.append("DATABASE_URL is required")
    raw_workers = os.environ.get("MAX_WORKERS", "4")
    try:
        workers = int(raw_workers)
        if workers < 1:
            errors.append("MAX_WORKERS must be >= 1")
    except ValueError:
        errors.append(f"MAX_WORKERS must be an integer, got {raw_workers!r}")
        workers = 4
    if errors:
        raise ValueError("Invalid configuration: " + "; ".join(errors))
    return Settings(db, os.environ.get("LOG_LEVEL", "INFO").upper(), workers)`,
        },
      },
    },
    challenge: {
      title: "Deduplicate news articles",
      brief: ["Given a list of article dicts `{title, url, published_at}`, return unique articles where two are duplicates if their URLs match after removing tracking params (utm_*) and trailing slashes, or their titles match case-insensitively. Keep the earliest published. Aim for O(n)."],
      criteria: ["URL normalisation with urllib.parse", "O(n) using dicts/sets", "Tests covering both duplicate rules", "A test proving the input list and its article dicts are not mutated"],
      hints: ["urllib.parse.urlsplit, parse_qsl, urlencode, urlunsplit.", "Sort by published_at first, then keep the first seen."],
      solution: {
        text: [
          "Normalise both keys, sort once by date (O(n log n), acceptable) or track the earliest per key in one pass for O(n).",
          "`dedupe` builds a new list and only reads the input dicts, so the caller's data is untouched. That is a deliberate aliasing decision: returning the original dicts is cheap and safe here because nothing mutates them afterwards. If the caller might mutate a returned dict, copy it at the boundary.",
          "The sets are the only state. Keep them local to the call; a set stored in a default or on the module would repeat the mutable-default bug at a larger scale.",
        ],
        code: {
          lang: "python",
          file: "dedupe.py",
          code: `from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode


def norm_url(url: str) -> str:
    p = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(p.query) if not k.startswith("utm_")])
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), query, ""))


def dedupe(articles: list[dict]) -> list[dict]:
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    out: list[dict] = []
    for a in sorted(articles, key=lambda a: a["published_at"]):
        u, t = norm_url(a["url"]), a["title"].strip().lower()
        if u in seen_urls or t in seen_titles:
            continue
        seen_urls.add(u)
        seen_titles.add(t)
        out.append(a)
    return out`,
        },
      },
    },
    capstone: {
      title: "DevAtlas step 4: the AI service skeleton",
      brief: ["Create `services/ai/` with a venv, a `pyproject.toml` or `requirements.txt`, a `devatlas_ai/tags.py` module (from this lesson) and tests. Add a README section on how to run tests."],
      criteria: ["pytest passes from a clean checkout following the README", "mypy passes", ".venv is gitignored", "Add one test that calls `add_tag` twice and proves there is no shared state"],
      hints: ["Keep the package importable: `devatlas_ai/__init__.py`."],
      solution: {
        text: [
          "Layout: services/ai/devatlas_ai/__init__.py and tags.py (the typed helpers from this lesson), services/ai/tests/test_tags.py, a requirements.txt with exact pins for pytest and mypy, and a pyproject.toml that configures both tools. This is the folder the FastAPI service will live in.",
          "`pythonpath = [\".\"]` in the pytest config lets the tests import `devatlas_ai` without installing the package, and `[tool.mypy] strict = true` with `files` means a bare `mypy` checks the package and the tests.",
          "The .gitignore keeps .venv and tool caches out of git, so a clean checkout plus the README steps is all a teammate or CI needs. The output below is from running exactly those steps in a fresh folder (timing and checker versions will vary).",
        ],
        code: {
          lang: "python", file: "services/ai/devatlas_ai/tags.py",
          code: `"""Tag helpers shared by the DevAtlas AI service."""
from collections.abc import Iterable


def add_tag(tag: str, tags: list[str] | None = None) -> list[str]:
    """Return a new list with tag appended. Never mutates the caller's list."""
    result = list(tags) if tags is not None else []
    if tag not in result:
        result.append(tag)
    return result


def normalise(tags: Iterable[str]) -> list[str]:
    """Lower-case, strip, de-duplicate, keep first-seen order."""
    seen: set[str] = set()
    out: list[str] = []
    for t in tags:
        clean = t.strip().lower()
        if clean and clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out

# ---- services/ai/devatlas_ai/__init__.py ----
"""DevAtlas AI service package."""

# ---- services/ai/tests/test_tags.py ----
from devatlas_ai.tags import add_tag, normalise


def test_add_tag_does_not_share_state() -> None:
    assert add_tag("ai") == ["ai"]
    assert add_tag("rust") == ["rust"]


def test_add_tag_does_not_mutate_input() -> None:
    original = ["ai"]
    assert add_tag("rust", original) == ["ai", "rust"]
    assert original == ["ai"]


def test_add_tag_skips_duplicates() -> None:
    assert add_tag("ai", ["ai"]) == ["ai"]


def test_normalise() -> None:
    assert normalise([" AI", "ai", "Rust ", ""]) == ["ai", "rust"]

# ---- services/ai/requirements.txt ----
# Dev tools, pinned so CI and laptops run the same versions
pytest==9.1.1
mypy==2.4.0

# ---- services/ai/pyproject.toml ----
[project]
name = "devatlas-ai"
version = "0.1.0"
requires-python = ">=3.12"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.mypy]
strict = true
files = ["devatlas_ai", "tests"]

# ---- services/ai/.gitignore ----
.venv/
__pycache__/
.pytest_cache/
.mypy_cache/

# ---- services/ai/README.md (section) ----
## Running the AI service tests
cd services/ai
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
pytest -q
mypy`,
        },
        output: "....                                                                     [100%]\n4 passed in 0.04s\nSuccess: no issues found in 3 source files",
        pitfalls: ["Running tests with the global Python instead of the venv, so they pass on your laptop and fail in CI", "Committing .venv: it is large and machine specific", "Unpinned tool versions: a new mypy release can fail CI with no code change", "Using a list field in a frozen dataclass and calling the object immutable"],
      },
    },
  },
  deeper: [
    { label: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
    { label: "Python data model", url: "https://docs.python.org/3/reference/datamodel.html" },
    { label: "typing module docs", url: "https://docs.python.org/3/library/typing.html" },
    { label: "copy: shallow and deep copy operations", url: "https://docs.python.org/3/library/copy.html" },
    { label: "mypy: getting started", url: "https://mypy.readthedocs.io/en/stable/getting_started.html" },
    { label: "pytest documentation", url: "https://docs.pytest.org/" },
  ],
  nextPreview: "Next: OOP, dataclasses and protocols. Model DevAtlas's domain with classes that are small, typed and easy to test.",
};
