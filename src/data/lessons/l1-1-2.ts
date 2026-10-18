import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.2",
  title: "OOP, dataclasses and protocols",
  minutes: 65,
  level: "Beginner",
  prerequisites: ["1.1.1 Python essentials"],
  summary: "Model real domains with classes, use dataclasses to remove boilerplate, prefer composition over inheritance, and use Protocols to write code that is easy to test and swap.",
  terms: [
    { term: "Class", def: "A blueprint that bundles data (attributes) and behaviour (methods). An object is one instance of it." },
    { term: "self", def: "The first parameter of a method: the specific object the method is called on." },
    { term: "Dataclass", def: "A class decorated with @dataclass; Python generates __init__, __repr__ and __eq__ from the field list." },
    { term: "Inheritance", def: "A class reusing and extending another class (`class Admin(User)`). An 'is-a' relationship." },
    { term: "Composition", def: "A class holding other objects as fields and delegating work to them. A 'has-a' relationship." },
    { term: "Protocol", def: "A typing.Protocol describes the methods an object must have, without requiring inheritance (structural typing, 'duck typing' that the type checker can verify)." },
    { term: "Encapsulation", def: "Keeping an object's data consistent by changing it only through its methods." },
  ],
  problem: [
    "The DevAtlas progress code passes dictionaries everywhere: `{\"user\": 7, \"lesson\": \"1.1.1\", \"score\": 0.8}`. One function writes `\"score\"`, another reads `\"scores\"`, and a third stores 80 instead of 0.8. Bugs appear far from where the data was created.",
    "Later the team wants to send notifications by email in production but print them in tests. The code calls the email library directly in 20 places. Classes give data a shape and rules; protocols let you swap implementations without touching callers.",
  ],
  concept: {
    analogy: [
      "A class is a **form template** at a government office: it lists the fields every application must have and the rules for filling them in. Each filled-in form is an object. A Protocol is a **job description**: 'must be able to send(message)'. Anyone who can do that job can be hired, whether they came from the email department or the SMS department.",
    ],
    precise: [
      "Classes give you **named, typed fields** and **methods that keep data valid**. A dataclass removes the boilerplate: you list fields with types and get a constructor, readable printing and equality for free. `frozen=True` makes instances immutable, which avoids accidental changes and makes them hashable.",
      "**Composition over inheritance**: inheritance couples the child to every detail of the parent; deep hierarchies become rigid. Composition (an object that *has* a notifier, *has* a repository) keeps parts small and swappable. Use inheritance for genuine 'is-a' relationships with shared behaviour, and keep hierarchies shallow.",
      "**Protocols** (Python 3.8+) let a function say 'I need something with a `send(to, text)` method'. Any class with that method fits, no base class required. A type checker (mypy/pyright) verifies it. This is the same idea as interfaces in C# and traits in Rust.",
    ],
  },
  underTheHood: {
    text: [
      "Attribute lookup on `obj.x` checks the instance's `__dict__`, then the class, then parent classes in the Method Resolution Order (`Class.__mro__`). Methods are functions stored on the class; `obj.method()` passes `obj` as `self`.",
      "`@dataclass` inspects the class annotations at definition time and writes `__init__`, `__repr__` and `__eq__` methods for you. `__post_init__` runs after the generated `__init__`, the right place for validation.",
      "Python has no truly private attributes. A leading underscore (`_balance`) is a convention meaning 'internal, do not touch'. `@property` lets you expose a computed or validated attribute with plain attribute syntax.",
    ],
    diagram: {
      title: "Composition with a Protocol",
      nodes: [
        { label: "ProgressService", sub: "has a Notifier" },
        { label: "Notifier (Protocol)", sub: "send(to, text)" },
        { label: "EmailNotifier", sub: "production" },
        { label: "FakeNotifier", sub: "tests" },
      ],
      edges: ["depends on", "implemented by", "or"],
    },
  },
  handsOn: [
    {
      title: "From dict to dataclass with validation",
      code: {
        lang: "python",
        file: "progress.py",
        code: `from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass(frozen=True)
class QuizResult:
    user_id: int
    lesson_id: str
    score: float                          # 0.0 .. 1.0
    taken_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        if not 0.0 <= self.score <= 1.0:
            raise ValueError(f"score must be between 0 and 1, got {self.score}")

    @property
    def passed(self) -> bool:
        return self.score >= 0.67

r = QuizResult(user_id=7, lesson_id="1.1.1", score=0.8)
print(r.passed, r.lesson_id)
QuizResult(7, "1.1.1", 80)              # raises ValueError immediately`,
      },
      output: "True 1.1.1\nValueError: score must be between 0 and 1, got 80",
      notes: ["`field(default_factory=...)` is required for defaults computed per instance; it is the dataclass cure for the mutable-default bug from lesson 1.1.1."],
    },
    {
      title: "A class that protects its own rules",
      code: {
        lang: "python",
        file: "streak.py",
        code: `from datetime import date, timedelta

class Streak:
    """Tracks consecutive learning days. The only way to change it is record()."""

    def __init__(self) -> None:
        self._days: set[date] = set()

    def record(self, day: date) -> None:
        self._days.add(day)

    def current(self, today: date) -> int:
        d = today if today in self._days else today - timedelta(days=1)
        count = 0
        while d in self._days:
            count += 1
            d -= timedelta(days=1)
        return count

s = Streak()
for offset in (0, 1, 2, 4):
    s.record(date(2026, 10, 18) - timedelta(days=offset))
print(s.current(date(2026, 10, 18)))`,
      },
      output: "3",
    },
    {
      title: "Protocol + composition: swappable notifiers",
      code: {
        lang: "python",
        file: "notify.py",
        code: `from typing import Protocol

class Notifier(Protocol):
    def send(self, to: str, text: str) -> None: ...

class EmailNotifier:
    def __init__(self, smtp_host: str) -> None:
        self.smtp_host = smtp_host
    def send(self, to: str, text: str) -> None:
        print(f"[smtp {self.smtp_host}] to={to}: {text}")   # real code would use smtplib

class FakeNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []
    def send(self, to: str, text: str) -> None:
        self.sent.append((to, text))

class ProgressService:
    def __init__(self, notifier: Notifier) -> None:      # depends on the Protocol only
        self.notifier = notifier

    def complete_lesson(self, email: str, lesson_id: str) -> None:
        self.notifier.send(email, f"Well done! You finished lesson {lesson_id}.")

ProgressService(EmailNotifier("smtp.example.com")).complete_lesson("a@x.dev", "1.1.2")

fake = FakeNotifier()
ProgressService(fake).complete_lesson("a@x.dev", "1.1.2")
assert fake.sent == [("a@x.dev", "Well done! You finished lesson 1.1.2.")]
print("test passed")`,
      },
      output: "[smtp smtp.example.com] to=a@x.dev: Well done! You finished lesson 1.1.2.\ntest passed",
      notes: ["Neither notifier inherits from Notifier. They fit because they have the right method. mypy or pyright will flag a class whose send signature does not match."],
    },
    {
      title: "When inheritance is the right tool",
      code: {
        lang: "python",
        code: `class AppError(Exception):
    """Base for errors our API turns into HTTP responses."""
    status = 500

class NotFound(AppError):
    status = 404

class ValidationFailed(AppError):
    status = 422

try:
    raise NotFound("lesson 9.9.9 does not exist")
except AppError as e:                      # one handler catches the whole family
    print(e.status, e)`,
      },
      output: "404 lesson 9.9.9 does not exist",
      notes: ["Exception hierarchies are a classic good use of inheritance: real 'is-a', shared handling, shallow tree."],
    },
  ],
  companies: [
    "**Data models at boundaries.** Production Python services define request, response and domain models as classes (dataclasses or Pydantic models in FastAPI) so invalid data is rejected at the edge instead of deep inside business logic.",
    "**Ports and adapters.** Teams define small interfaces (Protocols) for databases, queues, email and LLM providers, with a real adapter for production and a fake for tests. Swapping a provider then touches one adapter, not the whole codebase.",
    "**Flat hierarchies.** Code review in mature teams usually pushes back on inheritance chains deeper than one or two levels; composition is the default.",
  ],
  mistakes: [
    { mistake: "Passing dicts everywhere", why: "Dicts are quick to create", wrong: "Typos in keys and wrong units fail far from the cause", fix: "Use dataclasses or Pydantic models with types and validation" },
    { mistake: "Deep inheritance trees", why: "Inheritance looks like reuse", wrong: "A change in a base class breaks distant subclasses (fragile base class)", fix: "Prefer composition; keep inheritance shallow and for real 'is-a'" },
    { mistake: "Mutable shared defaults in classes", why: "`tags: list = []` as a class attribute or dataclass field", wrong: "All instances share one list (dataclasses refuse it with an error)", fix: "`field(default_factory=list)`" },
    { mistake: "Classes with only data and no rules, plus 'manager' functions that modify them", why: "Habit from procedural code", wrong: "Invariants are enforced in some places and forgotten in others", fix: "Put validation and state changes in the class (e.g. __post_init__, methods)" },
    { mistake: "Calling external services directly inside business logic", why: "Fastest to write", wrong: "Untestable code; switching providers means editing everywhere", fix: "Depend on a Protocol and inject the implementation" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Model domain data with dataclasses (frozen when possible); validate in __post_init__." },
    { tag: "Maintainability", text: "Depend on Protocols, inject implementations through the constructor." },
    { tag: "Reliability", text: "Keep invariants inside the class; expose behaviour via methods, not public mutation." },
    { tag: "Performance", text: "Use `@dataclass(slots=True)` (3.10+) for many small objects to cut memory use." },
  ],
  interview: [
    { q: "Composition vs inheritance?", a: "Inheritance models 'is-a' and shares implementation, but couples the subclass to the parent's internals. Composition models 'has-a': an object holds collaborators and delegates. Composition is more flexible and testable, so I default to it and keep inheritance shallow for real hierarchies like exceptions." },
    { q: "What is a Protocol in Python and why use it?", a: "A typing construct describing required methods and attributes. Any class with matching members satisfies it without inheriting (structural typing). It lets me depend on capabilities, inject fakes in tests and have the type checker verify compatibility." },
    { q: "What does @dataclass generate?", a: "__init__, __repr__ and __eq__ from annotated fields; optionally ordering, immutability (frozen) with __hash__, and __slots__. __post_init__ is available for validation." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What is printed?",
      code: { lang: "python", code: "from dataclasses import dataclass\n\n@dataclass\nclass P:\n    x: int\n    y: int\n\nprint(P(1, 2) == P(1, 2))" },
      options: ["False", "True", "Error", "None"],
      answer: 1,
      explanation: "Dataclasses generate __eq__ comparing fields. A plain class would compare identity and print False.",
    },
    {
      kind: "mcq",
      prompt: "Your service needs to send SMS in production and record messages in tests. Best design?",
      options: ["if TESTING: ... else: ... inside the service", "Inject an object satisfying a Notifier protocol", "Subclass the SMS library", "Global variable for the SMS client"],
      answer: 1,
      explanation: "Dependency injection with a small interface keeps the service clean and testable.",
    },
    {
      kind: "bug",
      prompt: "Why does this raise an error when the class is defined?",
      code: { lang: "python", code: "from dataclasses import dataclass\n\n@dataclass\nclass Course:\n    title: str\n    tags: list[str] = []" },
      options: ["str needs a default", "Mutable default list is not allowed; use field(default_factory=list)", "list[str] is invalid syntax", "Dataclasses cannot have lists"],
      answer: 1,
      explanation: "Dataclasses detect mutable defaults (list, dict, set) and raise ValueError to prevent shared state.",
    },
  ],
  cheatSheet: [
    "`@dataclass(frozen=True)` for value-like domain objects.",
    "Validate in `__post_init__`; computed values with `@property`.",
    "`field(default_factory=list)` for mutable defaults.",
    "Composition by default; inheritance only for shallow 'is-a'.",
    "Protocol = interface without inheritance; checked by mypy/pyright.",
    "Inject collaborators via `__init__`; use fakes in tests.",
    "`_name` = internal by convention.",
  ],
  homework: {
    basic: {
      title: "Model a Course",
      brief: ["Create frozen dataclasses `Lesson(id, title, minutes)` and `Course(title, lessons: tuple[Lesson, ...])` with a `total_minutes` property and validation that minutes > 0 and lesson ids are unique."],
      criteria: ["Frozen dataclasses with type hints", "Validation raises clear ValueErrors", "3 pytest tests"],
      hints: ["Use a tuple for lessons so the frozen Course is truly immutable."],
      solution: {
        text: ["Validation lives in __post_init__ so an invalid Course can never exist."],
        code: {
          lang: "python",
          file: "course.py",
          code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    minutes: int

    def __post_init__(self) -> None:
        if self.minutes <= 0:
            raise ValueError(f"lesson {self.id}: minutes must be > 0")

@dataclass(frozen=True)
class Course:
    title: str
    lessons: tuple[Lesson, ...]

    def __post_init__(self) -> None:
        ids = [l.id for l in self.lessons]
        if len(ids) != len(set(ids)):
            raise ValueError("lesson ids must be unique")

    @property
    def total_minutes(self) -> int:
        return sum(l.minutes for l in self.lessons)`,
        },
      },
    },
    intermediate: {
      title: "Repository protocol",
      brief: ["Define a `ProgressRepository` Protocol with `save(result)` and `for_user(user_id)`. Implement `InMemoryProgressRepository`. Write a `ProgressService.average_score(user_id)` that depends only on the protocol, and test it with the in-memory version."],
      criteria: ["Service never imports the concrete repository", "Average of no results returns 0.0", "Tests pass"],
      hints: ["Reuse QuizResult from the hands-on section."],
      solution: {
        text: ["The in-memory repository doubles as a test fake; a MySQL implementation later must only satisfy the same two methods."],
        code: {
          lang: "python",
          file: "repo.py",
          code: `from typing import Protocol
from collections import defaultdict
from progress import QuizResult

class ProgressRepository(Protocol):
    def save(self, result: QuizResult) -> None: ...
    def for_user(self, user_id: int) -> list[QuizResult]: ...

class InMemoryProgressRepository:
    def __init__(self) -> None:
        self._by_user: defaultdict[int, list[QuizResult]] = defaultdict(list)
    def save(self, result: QuizResult) -> None:
        self._by_user[result.user_id].append(result)
    def for_user(self, user_id: int) -> list[QuizResult]:
        return list(self._by_user[user_id])

class ProgressService:
    def __init__(self, repo: ProgressRepository) -> None:
        self.repo = repo
    def average_score(self, user_id: int) -> float:
        results = self.repo.for_user(user_id)
        return sum(r.score for r in results) / len(results) if results else 0.0

def test_average():
    repo = InMemoryProgressRepository()
    svc = ProgressService(repo)
    assert svc.average_score(1) == 0.0
    repo.save(QuizResult(1, "a", 1.0)); repo.save(QuizResult(1, "b", 0.5))
    assert svc.average_score(1) == 0.75`,
        },
      },
    },
    challenge: {
      title: "Refactor an inheritance mess",
      brief: ["Given `class Report`, `class PdfReport(Report)`, `class EmailedPdfReport(PdfReport)`, `class EmailedCsvReport(CsvReport)`... the combinations explode. Redesign with composition: a Report has a Formatter (PDF/CSV) and a Delivery (email/S3/download). Show that adding a new format needs one new class, not N."],
      criteria: ["Two small protocols", "Report composes them", "Explanation of the class-count difference"],
      hints: ["With inheritance, formats × deliveries classes; with composition, formats + deliveries."],
      solution: {
        text: ["With inheritance, 3 formats × 3 deliveries = 9 subclasses, and each new format adds 3 more. With composition it is 3 + 3 = 6 small classes, and a new format adds exactly 1."],
        code: {
          lang: "python",
          code: `from typing import Protocol

class Formatter(Protocol):
    def render(self, rows: list[dict]) -> bytes: ...

class Delivery(Protocol):
    def deliver(self, name: str, data: bytes) -> None: ...

class CsvFormatter:
    def render(self, rows: list[dict]) -> bytes:
        if not rows:
            return b""
        header = ",".join(rows[0])
        lines = [",".join(str(r[k]) for k in rows[0]) for r in rows]
        return "\\n".join([header, *lines]).encode()

class PrintDelivery:
    def deliver(self, name: str, data: bytes) -> None:
        print(name, data.decode())

class Report:
    def __init__(self, formatter: Formatter, delivery: Delivery) -> None:
        self.formatter, self.delivery = formatter, delivery
    def run(self, name: str, rows: list[dict]) -> None:
        self.delivery.deliver(name, self.formatter.render(rows))

Report(CsvFormatter(), PrintDelivery()).run("scores.csv", [{"user": 1, "score": 0.9}])`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: domain models",
      brief: ["In services/ai/devatlas_ai/models.py, add frozen dataclasses for Lesson, Chunk and QuizResult with validation, plus a Notifier protocol. Use them in the existing tags and dedupe code instead of raw dicts."],
      criteria: ["No raw dicts crossing module boundaries", "mypy passes", "Tests for validation errors"],
      hints: ["Convert to/from dicts only at the edges (JSON in, JSON out)."],
      solution: {
        text: [
          "Typed models at module boundaries are what make the later FastAPI service straightforward: Pydantic request models can map directly onto them.",
          "models.py holds frozen dataclasses that validate in __post_init__, so an invalid Lesson, Chunk or QuizResult cannot exist. Lesson reuses `normalise` and `add_tag` from tags.py; because it is frozen, `with_tag` returns a new Lesson via `dataclasses.replace`.",
          "The dedupe code from lesson 1.1.1 now takes and returns `Article` objects. The only place a raw dict is read is `Article.from_dict`, the JSON edge. Run with `pytest -q && mypy` from services/ai (the skeleton from the previous capstone).",
        ],
        code: {
          lang: "python", file: "services/ai/devatlas_ai/models.py",
          code: `"""Typed domain models. Raw dicts are converted here, at the edge, and nowhere else."""
import re
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Protocol

from devatlas_ai.tags import add_tag, normalise

LESSON_ID = re.compile(r"^\\d+\\.\\d+\\.\\d+$")


@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    minutes: int
    tags: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not LESSON_ID.match(self.id):
            raise ValueError(f"lesson id must look like 1.2.3, got {self.id!r}")
        if not self.title.strip():
            raise ValueError(f"lesson {self.id}: title must not be empty")
        if self.minutes <= 0:
            raise ValueError(f"lesson {self.id}: minutes must be > 0")
        # frozen: assign the cleaned tags through object.__setattr__
        object.__setattr__(self, "tags", tuple(normalise(self.tags)))

    def with_tag(self, tag: str) -> "Lesson":
        """Return a copy with one more tag; the original is unchanged."""
        return replace(self, tags=tuple(add_tag(tag.strip().lower(), list(self.tags))))


@dataclass(frozen=True)
class Chunk:
    """A slice of lesson text, the unit the AI service will embed and search."""
    lesson_id: str
    index: int
    text: str

    def __post_init__(self) -> None:
        if self.index < 0:
            raise ValueError("chunk index must be >= 0")
        if not self.text.strip():
            raise ValueError(f"chunk {self.lesson_id}#{self.index} is empty")


@dataclass(frozen=True)
class QuizResult:
    user_id: int
    lesson_id: str
    score: float  # 0.0 .. 1.0
    taken_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        if not 0.0 <= self.score <= 1.0:
            raise ValueError(f"score must be between 0 and 1, got {self.score}")

    @property
    def passed(self) -> bool:
        return self.score >= 0.67


@dataclass(frozen=True)
class Article:
    title: str
    url: str
    published_at: datetime

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Article":
        """The only place a raw article dict is read (JSON in)."""
        return cls(str(raw["title"]), str(raw["url"]), datetime.fromisoformat(raw["published_at"]))


class Notifier(Protocol):
    def send(self, to: str, text: str) -> None: ...

# ---- services/ai/devatlas_ai/dedupe.py ----
from collections.abc import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from devatlas_ai.models import Article


def norm_url(url: str) -> str:
    p = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(p.query) if not k.startswith("utm_")])
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), query, ""))


def dedupe(articles: Iterable[Article]) -> list[Article]:
    """Keep the earliest article per normalised URL or case-insensitive title."""
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    out: list[Article] = []
    for a in sorted(articles, key=lambda a: a.published_at):
        u, t = norm_url(a.url), a.title.strip().lower()
        if u in seen_urls or t in seen_titles:
            continue
        seen_urls.add(u)
        seen_titles.add(t)
        out.append(a)
    return out

# ---- services/ai/tests/test_models.py ----
from datetime import datetime

import pytest

from devatlas_ai.dedupe import dedupe
from devatlas_ai.models import Article, Chunk, Lesson, Notifier, QuizResult


def test_lesson_normalises_tags_and_with_tag_returns_copy() -> None:
    lesson = Lesson("1.1.2", "OOP", 65, tags=(" Python", "python", "OOP"))
    assert lesson.tags == ("python", "oop")
    tagged = lesson.with_tag("Protocols")
    assert tagged.tags == ("python", "oop", "protocols")
    assert lesson.tags == ("python", "oop")


@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"id": "one", "title": "x", "minutes": 5}, "lesson id"),
        ({"id": "1.1.1", "title": "  ", "minutes": 5}, "title"),
        ({"id": "1.1.1", "title": "x", "minutes": 0}, "minutes"),
    ],
)
def test_lesson_validation(kwargs: dict[str, object], message: str) -> None:
    with pytest.raises(ValueError, match=message):
        Lesson(**kwargs)  # type: ignore[arg-type]


def test_chunk_and_quiz_validation() -> None:
    with pytest.raises(ValueError, match="empty"):
        Chunk("1.1.1", 0, "   ")
    with pytest.raises(ValueError, match="between 0 and 1"):
        QuizResult(7, "1.1.1", 80)
    assert QuizResult(7, "1.1.1", 0.8).passed


def test_dedupe_works_on_models() -> None:
    raw = [
        {"title": "Rust 2.0", "url": "https://a.dev/rust/?utm_source=x", "published_at": "2026-10-02T10:00:00"},
        {"title": "rust 2.0", "url": "https://b.dev/other", "published_at": "2026-10-01T10:00:00"},
        {"title": "Python 4", "url": "https://a.dev/py", "published_at": "2026-10-03T10:00:00"},
    ]
    result = dedupe(Article.from_dict(r) for r in raw)
    assert [a.url for a in result] == ["https://b.dev/other", "https://a.dev/py"]
    assert result[0].published_at == datetime(2026, 10, 1, 10)


def test_fake_satisfies_notifier() -> None:
    class FakeNotifier:
        def __init__(self) -> None:
            self.sent: list[tuple[str, str]] = []

        def send(self, to: str, text: str) -> None:
            self.sent.append((to, text))

    fake = FakeNotifier()
    notifier: Notifier = fake  # mypy checks the structural match here
    notifier.send("a@x.dev", "hi")
    assert fake.sent == [("a@x.dev", "hi")]`,
        },
        output: "...........                                                              [100%]\n11 passed in 0.07s\nSuccess: no issues found in 6 source files",
        pitfalls: ["Assigning `self.tags = ...` in __post_init__ of a frozen dataclass raises FrozenInstanceError; use object.__setattr__ or normalise before constructing", "Using `list[str]` for tags on a frozen dataclass: the object is 'frozen' but the list can still be mutated, and the instance is no longer hashable", "Calling `from_dict` deep in business logic instead of at the edge, which brings raw dicts back"],
      },
    },
  },
  deeper: [
    { label: "Python docs: Classes tutorial", url: "https://docs.python.org/3/tutorial/classes.html" },
    { label: "Python docs: dataclasses", url: "https://docs.python.org/3/library/dataclasses.html" },
    { label: "PEP 544: Protocols", url: "https://peps.python.org/pep-0544/" },
    { label: "mypy: Protocols and structural subtyping", url: "https://mypy.readthedocs.io/en/stable/protocols.html" },
  ],
  nextPreview: "Next: async Python and packaging. Fetch 50 URLs in the time of one, and package your code so anyone can install it.",
};
