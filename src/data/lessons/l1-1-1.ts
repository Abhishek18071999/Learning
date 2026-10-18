import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.1",
  title: "Python essentials: data model, functions and type hints",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "Python 3.12+ installed (python3 --version)"],
  summary: "Learn how Python really handles variables, mutability and functions, and write typed, tested code like a professional from day one.",
  terms: [
    { term: "Object", def: "Everything in Python is an object with a type, a value and an identity (id)." },
    { term: "Name / variable", def: "A label bound to an object. Assignment never copies; it binds a name to an object." },
    { term: "Mutable", def: "Can be changed in place: list, dict, set. Immutable: int, str, tuple, frozenset." },
    { term: "Type hint", def: "An annotation like `def f(x: int) -> str` that documents types and lets tools such as mypy or pyright check them. Python does not enforce hints at runtime." },
    { term: "Virtual environment", def: "An isolated folder of packages for one project, created with `python3 -m venv .venv`." },
    { term: "Comprehension", def: "Compact syntax to build a list/dict/set: `[x*x for x in nums if x > 0]`." },
  ],
  problem: [
    "A teammate writes a helper that adds a default tag to every news article. In testing it works. In production, articles start showing tags from completely unrelated articles, and the list keeps growing every request.",
    "The bug is one line: `def add_tag(tag, tags=[])`. Understanding *why* that breaks requires knowing how Python names, objects and mutability actually work. This lesson builds that model, because the AI service in DevAtlas is written in Python and these bugs are expensive to find later.",
  ],
  concept: {
    analogy: [
      "Python variables are **name tags, not boxes**. When you write `a = [1, 2]` you create a list object and stick the tag `a` on it. `b = a` sticks a second tag on the **same** list. Change the list through `b`, and `a` sees it, because there is only one list.",
    ],
    precise: [
      "Assignment binds a name to an object. **Mutable** objects can change in place, so every name bound to them observes the change. Immutable objects cannot; operations like `s + 'x'` create a new object.",
      "Function **default arguments are evaluated once, when the function is defined**, not each call. A mutable default (`[]`, `{}`) is therefore shared across all calls. The fix is `None` as the default and creating the object inside.",
      "Arguments are passed by **object reference** (sometimes called 'call by sharing'): the function receives a reference to the same object. Mutating it affects the caller; rebinding the parameter name does not.",
    ],
  },
  underTheHood: {
    text: [
      "`id(x)` returns an object's identity, and `is` compares identity while `==` compares value. `[1] == [1]` is True but `[1] is [1]` is False: two different list objects with equal values.",
      "Function objects store their defaults in `func.__defaults__`. Calling `add_tag.__defaults__` after a few calls shows the shared list growing. This is the whole bug, visible.",
      "CPython (the standard interpreter) compiles your code to bytecode and runs it in a virtual machine. Objects are reference-counted and freed when no names point to them; a cycle collector handles reference cycles.",
    ],
    diagram: {
      title: "Names point to objects",
      nodes: [
        { label: "a", sub: "name" },
        { label: "list object", sub: "[1, 2, 3]" },
        { label: "b", sub: "name" },
      ],
      edges: ["→ same ←", "←"],
      caption: "`b = a` does not copy. Use `b = a.copy()` or `list(a)` for a shallow copy, `copy.deepcopy(a)` for nested structures.",
    },
  },
  handsOn: [
    {
      title: "Set up a project the professional way",
      code: {
        lang: "bash",
        code: `mkdir py-lab && cd py-lab
python3 -m venv .venv
source .venv/bin/activate        # Windows PowerShell: .venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install pytest mypy`,
      },
      notes: ["You may also see `uv` used in modern projects as a fast replacement for pip and venv. The concepts are identical; we use the standard library tools so nothing is hidden."],
    },
    {
      title: "See the mutable default bug",
      code: {
        lang: "python",
        file: "bug.py",
        code: `def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags

print(add_tag("ai"))
print(add_tag("rust"))           # expected ['rust']
print(add_tag.__defaults__)      # the shared list lives here`,
      },
      output: "['ai']\n['ai', 'rust']\n(['ai', 'rust'],)",
    },
    {
      title: "Fix it, with type hints",
      code: {
        lang: "python",
        file: "tags.py",
        code: `from collections.abc import Iterable

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
    return out`,
      },
      notes: [
        "`list[str] | None` needs Python 3.10+. `dict.fromkeys(...)` is a shorter way to de-duplicate while keeping order; the loop is shown so you can see the logic.",
        "Returning a new list instead of mutating input makes functions predictable and easy to test.",
      ],
    },
    {
      title: "Test it",
      code: {
        lang: "python",
        file: "test_tags.py",
        code: `from tags import add_tag, normalise

def test_add_tag_does_not_share_state():
    assert add_tag("ai") == ["ai"]
    assert add_tag("rust") == ["rust"]

def test_add_tag_does_not_mutate_input():
    original = ["ai"]
    add_tag("rust", original)
    assert original == ["ai"]

def test_normalise():
    assert normalise([" AI", "ai", "Rust ", ""]) == ["ai", "rust"]`,
      },
    },
    {
      title: "Run tests and the type checker",
      code: { lang: "bash", code: "pytest -q\nmypy tags.py" },
      output: "...                                                [100%]\n3 passed in 0.01s\nSuccess: no issues found in 1 source file",
    },
    {
      title: "Core data structures and when to use them",
      code: {
        lang: "python",
        code: `# list: ordered, mutable, O(1) append, O(n) "x in list"
scores = [72, 91, 85]

# dict: key -> value, average O(1) lookup, insertion-ordered (3.7+)
user = {"id": 7, "name": "Asha", "level": "beginner"}
level = user.get("level", "unknown")      # no KeyError

# set: unique items, average O(1) membership
seen = {"ai", "rust"}

# tuple: immutable, good for fixed records and dict keys
point = (12.9, 77.6)

# comprehensions
passed = [s for s in scores if s >= 80]
by_id = {u["id"]: u for u in [user]}`,
      },
    },
  ],
  companies: [
    "**Python dominates AI and data work.** Model training, data pipelines and most LLM application code (and the main SDKs from OpenAI, Anthropic, Hugging Face and others) are Python-first. Backend APIs for AI are commonly built with FastAPI.",
    "**Type hints are standard in serious codebases.** Teams run mypy or pyright in CI so refactors in large Python codebases do not break callers silently. Pydantic, used by FastAPI, uses type hints to validate data at runtime.",
    "**Reproducible environments.** Production teams pin dependencies (requirements files with exact versions, or lock files from tools like uv or Poetry) so the code that passed CI is the code that ships.",
  ],
  mistakes: [
    { mistake: "Mutable default arguments", why: "It looks natural and works on the first call", wrong: "State leaks between calls and requests", fix: "Default to None and create the object inside the function" },
    { mistake: "Using `is` to compare values", why: "`x is 5` sometimes works due to small-int caching", wrong: "Random failures with larger numbers or strings", fix: "Use `==` for values; `is` only for None and singletons" },
    { mistake: "Installing packages globally", why: "pip install works without a venv", wrong: "Projects break each other; deploys differ from your laptop", fix: "One virtual environment per project and pinned dependencies" },
    { mistake: "Catching every exception silently", why: "`except: pass` makes errors disappear", wrong: "Bugs hide until data is corrupted", fix: "Catch specific exceptions, log them, re-raise if you cannot handle them" },
    { mistake: "Modifying a list while iterating over it", why: "Removing items in a for loop seems direct", wrong: "Items are skipped silently", fix: "Build a new list with a comprehension" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Type-hint public functions, run mypy or pyright in CI, and format with a standard tool (e.g. ruff format or black) so reviews focus on logic." },
    { tag: "Reliability", text: "Prefer pure functions that return new values; push I/O (files, network, DB) to the edges where it is easy to mock." },
    { tag: "Security", text: "Never use eval() on input, and never put secrets in code: read them from environment variables (os.environ)." },
    { tag: "Performance", text: "Use sets and dicts for membership checks: O(1) on average vs O(n) for lists." },
  ],
  interview: [
    { q: "Explain mutable vs immutable types with an example of a bug.", a: "Lists, dicts and sets are mutable; ints, strings and tuples are not. The classic bug is a mutable default argument: the default list is created once at definition time and shared by every call, so items accumulate. Use None and create the list inside." },
    { q: "Is Python pass-by-value or pass-by-reference?", a: "Neither exactly: it is pass-by-object-reference. The function gets a reference to the same object. Mutating it is visible to the caller; reassigning the parameter only rebinds the local name." },
    { q: "Why use type hints if Python ignores them at runtime?", a: "They document intent, enable editor autocomplete, and let static checkers catch type errors before runtime. Libraries like Pydantic also use them for runtime validation." },
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
    "Variables are names bound to objects; assignment never copies.",
    "Mutable: list, dict, set. Immutable: int, float, str, tuple.",
    "Never use mutable defaults; use `None`.",
    "`==` compares value, `is` compares identity (use for None).",
    "One venv per project: `python3 -m venv .venv`.",
    "dict/set lookups are O(1) average; list `in` is O(n).",
    "Type hints + mypy/pyright + pytest from day one.",
  ],
  homework: {
    basic: {
      title: "Word frequency",
      brief: ["Write `top_words(text: str, n: int) -> list[tuple[str, int]]` returning the n most common words, case-insensitive, ignoring punctuation. Include 3 pytest tests."],
      criteria: ["Correct results with ties handled consistently", "Type hints and docstring", "Tests for empty text and n larger than unique words"],
      hints: ["`collections.Counter` has a most_common method.", "`re.findall(r\"[a-z']+\", text.lower())`"],
      solution: {
        text: ["Counter does the counting; a regex handles punctuation. Counter.most_common orders ties by first occurrence, which is deterministic."],
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
    return Counter(words).most_common(n)`,
        },
        pitfalls: ["Splitting on spaces only, so 'ai,' and 'ai' count separately", "Not handling n <= 0"],
      },
    },
    intermediate: {
      title: "Safe config loader",
      brief: ["Write `load_settings() -> Settings` that reads DATABASE_URL (required), LOG_LEVEL (default 'INFO') and MAX_WORKERS (int, default 4) from environment variables, using a dataclass. Raise a clear error listing all missing or invalid values at once."],
      criteria: ["Uses @dataclass(frozen=True)", "Collects all errors before raising", "Tests use monkeypatch to set env vars"],
      hints: ["pytest's monkeypatch fixture: monkeypatch.setenv('DATABASE_URL', '...')"],
      solution: {
        text: ["Collecting errors gives operators one useful message instead of fixing problems one restart at a time."],
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
      criteria: ["URL normalisation with urllib.parse", "O(n) using dicts/sets", "Tests covering both duplicate rules"],
      hints: ["urllib.parse.urlsplit, parse_qsl, urlencode, urlunsplit.", "Sort by published_at first, then keep the first seen."],
      solution: {
        text: ["Normalise both keys, sort once by date (O(n log n), acceptable) or track the earliest per key in one pass for O(n)."],
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
        seen_urls.add(u); seen_titles.add(t); out.append(a)
    return out`,
        },
      },
    },
    capstone: {
      title: "DevAtlas step 4: the AI service skeleton",
      brief: ["Create `services/ai/` with a venv, a `pyproject.toml` or `requirements.txt`, a `devatlas_ai/tags.py` module (from this lesson) and tests. Add a README section on how to run tests."],
      criteria: ["pytest passes from a clean checkout following the README", "mypy passes", ".venv is gitignored"],
      hints: ["Keep the package importable: `devatlas_ai/__init__.py`."],
      solution: {
        text: [
          "Layout: services/ai/devatlas_ai/__init__.py and tags.py (the typed helpers from this lesson), services/ai/tests/test_tags.py, a requirements.txt with exact pins for pytest and mypy, and a pyproject.toml that configures both tools. This is the folder the FastAPI service will live in.",
          "`pythonpath = [\".\"]` in the pytest config lets the tests import `devatlas_ai` without installing the package, and `[tool.mypy] strict = true` with `files` means a bare `mypy` checks the package and the tests.",
          "The .gitignore keeps .venv and tool caches out of git, so a clean checkout plus the README steps is all a teammate or CI needs. The output below is from running exactly those steps in a fresh folder (timing will vary).",
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
        pitfalls: ["Running tests with the global Python instead of the venv, so they pass on your laptop and fail in CI", "Committing .venv: it is large and machine specific", "Unpinned tool versions: a new mypy release can fail CI with no code change"],
      },
    },
  },
  deeper: [
    { label: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
    { label: "Python data model", url: "https://docs.python.org/3/reference/datamodel.html" },
    { label: "typing module docs", url: "https://docs.python.org/3/library/typing.html" },
    { label: "pytest documentation", url: "https://docs.pytest.org/" },
  ],
  nextPreview: "Next: OOP, dataclasses and protocols. Model DevAtlas's domain with classes that are small, typed and easy to test.",
};
