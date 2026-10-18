import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.1.1",
  title: "SOLID, patterns and clean architecture",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["1.1.2 OOP, dataclasses and protocols", "1.3.3 Dependency injection"],
  summary: "Write code that stays easy to change: the SOLID principles explained with real refactors, the handful of design patterns worth knowing, and clean/hexagonal architecture with the dependency rule, without over-engineering.",
  terms: [
    { term: "Coupling", def: "How much one module depends on the details of another. Low coupling makes changes local." },
    { term: "Cohesion", def: "How closely the responsibilities inside one module belong together. High cohesion = one clear purpose." },
    { term: "SOLID", def: "Five principles: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion." },
    { term: "Design pattern", def: "A named, reusable solution to a recurring design problem (Strategy, Adapter, Factory, Observer, Decorator…)." },
    { term: "Clean / hexagonal architecture", def: "Organising code so business rules sit at the centre and depend on nothing external; databases, web frameworks and APIs are plugged in at the edges through interfaces (ports and adapters)." },
    { term: "Dependency rule", def: "Source-code dependencies point inward: infrastructure depends on the domain, never the other way around." },
    { term: "YAGNI", def: "You Aren't Gonna Need It: do not build abstractions for hypothetical future needs." },
  ],
  problem: [
    "The DevAtlas `ProgressService` grew to 1,400 lines: it validates input, calculates scores, writes to MySQL, sends emails, updates Redis, publishes events and formats HTTP responses. Every feature touches it, every change breaks something unrelated, and tests need a real database and SMTP server.",
    "Architecture is about making the expensive changes cheap. Principles and patterns are tools for that, not goals. Used well they localise change; used dogmatically they produce 'enterprise' layers nobody understands.",
  ],
  concept: {
    analogy: [
      "Clean architecture is like a **power socket standard**: your laptop (business logic) defines the plug shape it needs; any power company (database, email provider) provides an adapter that fits. Change the provider, and the laptop never notices. Patterns are **common joinery techniques** in carpentry: you do not invent a new joint for every table.",
    ],
    precise: [
      "**S — Single responsibility**: a module should have one reason to change (one stakeholder or concern). **O — Open/closed**: add new behaviour by adding code (a new strategy class) rather than editing a growing if/else. **L — Liskov substitution**: subtypes must honour the base type's contract (no surprises for callers). **I — Interface segregation**: small, focused interfaces instead of one 'god interface'. **D — Dependency inversion**: high-level policy depends on abstractions it owns; low-level details implement them.",
      "**Patterns worth knowing first**: Strategy (swap algorithms), Adapter (wrap an external API in your interface), Factory (centralise creation), Decorator (add behaviour like caching or retries around an object), Observer/Pub-Sub (notify listeners), Repository (collection-like access to persistence), Template method sparingly, Builder for complex construction.",
      "**Clean/hexagonal architecture**: Domain (entities, rules, no framework imports) → Application (use cases orchestrating the domain through ports/interfaces) → Infrastructure (EF Core, Redis, SMTP, HTTP clients implementing ports) → Presentation (API endpoints). Dependencies point inward; the composition root wires them (lesson 1.3.3).",
      "**Pragmatism**: start simple (a well-structured module), extract abstractions when a second implementation or a test need appears, and prefer composition. Every abstraction has a cost in indirection.",
    ],
  },
  underTheHood: {
    text: [
      "Why dependency inversion matters for testing: if the use case depends on an `IEmailSender` it owns, tests pass a fake; if it calls `SmtpClient` directly, tests need a mail server. The same seam lets you swap providers in production.",
      "Open/closed via polymorphism: a dictionary or registry of strategies replaces a growing switch. Adding a new quiz type means registering a new scorer class; the dispatcher never changes and its tests keep passing.",
      "Decorators compose cross-cutting behaviour without editing the core class: CachedLessonRepository wraps LessonRepository; RetryingHttpClient wraps HttpClient. ASP.NET Core middleware, Python decorators and tower layers are all this pattern.",
    ],
    diagram: {
      title: "Dependency rule (clean architecture)",
      nodes: [
        { label: "API endpoints", sub: "presentation" },
        { label: "Infrastructure", sub: "EF Core, Redis, SMTP" },
        { label: "Application", sub: "use cases + ports" },
        { label: "Domain", sub: "entities, rules" },
      ],
      edges: ["calls", "implements ports of", "uses"],
      caption: "Arrows point inward. The domain imports nothing from the outer rings.",
    },
  },
  handsOn: [
    {
      title: "Before: a function that does everything",
      code: {
        lang: "python",
        file: "before.py",
        code: `def complete_lesson(user_id, lesson_id, answers, db, smtp):
    lesson = db.query("SELECT * FROM lessons WHERE id = %s", lesson_id)
    if lesson["type"] == "mcq":
        score = sum(a == c for a, c in zip(answers, lesson["correct"])) / len(lesson["correct"])
    elif lesson["type"] == "code":
        score = 1.0 if answers[0].strip() == lesson["solution"].strip() else 0.0
    else:
        raise ValueError("unknown type")
    db.execute("INSERT INTO progress VALUES (%s, %s, %s)", user_id, lesson_id, score)
    if score >= 0.67:
        smtp.send(db.query("SELECT email FROM users WHERE id = %s", user_id), "Well done!")
    return {"status": 200, "body": {"score": score}}`,
      },
      notes: ["Mixes scoring rules, persistence, notification and HTTP formatting; every new quiz type edits this function; tests need a database and an SMTP server."],
    },
    {
      title: "After: domain, ports, use case, adapters",
      code: {
        lang: "python",
        file: "after.py",
        code: `from dataclasses import dataclass
from typing import Protocol

# ---- Domain: pure rules, no I/O ----
class Scorer(Protocol):
    def score(self, answers: list[str]) -> float: ...

@dataclass(frozen=True)
class McqScorer:
    correct: tuple[str, ...]
    def score(self, answers: list[str]) -> float:
        return sum(a == c for a, c in zip(answers, self.correct)) / len(self.correct)

@dataclass(frozen=True)
class CodeScorer:
    solution: str
    def score(self, answers: list[str]) -> float:
        return 1.0 if answers and answers[0].strip() == self.solution.strip() else 0.0

PASS_MARK = 0.67

# ---- Application: ports (owned here) + use case ----
class LessonRepository(Protocol):
    def scorer_for(self, lesson_id: str) -> Scorer: ...

class ProgressRepository(Protocol):
    def save(self, user_id: int, lesson_id: str, score: float) -> None: ...

class Notifier(Protocol):
    def congratulate(self, user_id: int, lesson_id: str) -> None: ...

@dataclass
class CompleteLesson:
    lessons: LessonRepository
    progress: ProgressRepository
    notifier: Notifier

    def __call__(self, user_id: int, lesson_id: str, answers: list[str]) -> float:
        score = self.lessons.scorer_for(lesson_id).score(answers)
        self.progress.save(user_id, lesson_id, score)
        if score >= PASS_MARK:
            self.notifier.congratulate(user_id, lesson_id)
        return score

# ---- Infrastructure adapters (here: in-memory fakes; real ones wrap MySQL/SMTP) ----
class InMemoryLessons:
    def __init__(self, scorers: dict[str, Scorer]) -> None:
        self.scorers = scorers
    def scorer_for(self, lesson_id: str) -> Scorer:
        return self.scorers[lesson_id]

class InMemoryProgress:
    def __init__(self) -> None:
        self.rows: list[tuple[int, str, float]] = []
    def save(self, user_id: int, lesson_id: str, score: float) -> None:
        self.rows.append((user_id, lesson_id, score))

class RecordingNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[int, str]] = []
    def congratulate(self, user_id: int, lesson_id: str) -> None:
        self.sent.append((user_id, lesson_id))

# ---- Composition root + a test ----
lessons = InMemoryLessons({"6.1.1": McqScorer(("b", "c", "a")), "1.1.1": CodeScorer("print('hi')")})
progress, notifier = InMemoryProgress(), RecordingNotifier()
complete = CompleteLesson(lessons, progress, notifier)

print(round(complete(7, "6.1.1", ["b", "c", "x"]), 2), notifier.sent)   # 2/3 = 0.67 rounded, but 0.666… < PASS_MARK
print(complete(7, "6.1.1", ["b", "c", "a"]), notifier.sent)
print(complete(7, "1.1.1", ["print('hi') "]), notifier.sent)`,
      },
      output: "0.67 []\n1.0 [(7, '6.1.1')]\n1.0 [(7, '6.1.1'), (7, '1.1.1')]",
      notes: ["Note the first call: 2 of 3 correct is 0.666…, which prints as 0.67 but is below the pass mark, so no congratulation. Boundary cases like this are exactly what unit tests on pure domain code catch cheaply. Adding a new quiz type means adding a Scorer class (open/closed). The use case is tested with fakes in microseconds. HTTP formatting lives in the endpoint, not here."],
    },
    {
      title: "Decorator: add caching without touching the repository",
      code: {
        lang: "python",
        code: `class CachedLessons:
    """Decorator: same interface, adds caching around another LessonRepository."""
    def __init__(self, inner: LessonRepository) -> None:
        self.inner = inner
        self.cache: dict[str, Scorer] = {}
        self.misses = 0

    def scorer_for(self, lesson_id: str) -> Scorer:
        if lesson_id not in self.cache:
            self.misses += 1
            self.cache[lesson_id] = self.inner.scorer_for(lesson_id)
        return self.cache[lesson_id]

cached = CachedLessons(lessons)
complete_cached = CompleteLesson(cached, progress, notifier)
for _ in range(100):
    complete_cached(8, "6.1.1", ["b", "c", "a"])
print("repository calls:", cached.misses)`,
      },
      output: "repository calls: 1",
    },
    {
      title: "Adapter: wrap a third-party API in your own port",
      code: {
        lang: "python",
        code: `class ThirdPartyMailer:                       # imagine a vendor SDK with its own vocabulary
    def deliver(self, recipient_address: str, subject_line: str, html: str) -> dict:
        return {"queued": True, "to": recipient_address}

class MailerNotifier:                          # adapter: implements OUR Notifier port
    def __init__(self, sdk: ThirdPartyMailer, emails: dict[int, str]) -> None:
        self.sdk, self.emails = sdk, emails
    def congratulate(self, user_id: int, lesson_id: str) -> None:
        self.sdk.deliver(self.emails[user_id], "Lesson complete 🎉", f"<p>You finished {lesson_id}.</p>")

# Switching vendors later = writing one new adapter; CompleteLesson never changes.`,
      },
    },
    {
      title: "Folder structure for the .NET API",
      code: {
        lang: "text",
        code: `services/api/
  DevAtlas.Domain/          entities, value objects, domain rules (no EF, no ASP.NET references)
  DevAtlas.Application/     use cases, ports (interfaces), DTOs
  DevAtlas.Infrastructure/  EF Core DbContext, repositories, Redis, email adapters
  DevAtlas.Api/             endpoints, auth, DI composition root
  tests/                    Domain + Application unit tests (fakes), API integration tests

Project references point inward:
  Api → Application, Infrastructure ;  Infrastructure → Application, Domain ;  Application → Domain`,
      },
      notes: ["For small services, folders in one project (Features/…) are enough; split into projects when the compiler-enforced dependency rule pays for itself."],
    },
  ],
  companies: [
    "**Ports and adapters** let companies swap payment providers, email vendors, LLM providers and databases with contained changes, and run fast unit tests; this is common in fintech, e-commerce and AI products where vendors change.",
    "**Vertical slice + clean core**: many modern .NET and Java teams organise by feature (slices) while keeping domain logic free of framework code, balancing structure with simplicity.",
    "**Over-engineering is a real cost**: experienced teams push back on interfaces with one implementation and no test need, deep inheritance and pattern-for-pattern's-sake; code review guidelines often include YAGNI explicitly.",
  ],
  mistakes: [
    { mistake: "God classes/services", why: "Adding 'just one more method' to the existing class", wrong: "Every change touches it; merge conflicts and regressions", fix: "Split by responsibility and use case" },
    { mistake: "Domain logic inside controllers or SQL", why: "Fastest place to write it", wrong: "Rules duplicated and untestable", fix: "Pure domain/application code called by thin endpoints" },
    { mistake: "Interfaces for everything up front", why: "Following clean architecture dogmatically", wrong: "Indirection without benefit; harder navigation", fix: "Extract an interface when you need a second implementation or a test seam" },
    { mistake: "Inheritance to share code", why: "Reuse seems obvious", wrong: "Fragile base classes; LSP violations", fix: "Composition, strategies and small helpers" },
    { mistake: "Domain depending on infrastructure", why: "Importing EF/ORM types into entities", wrong: "Domain changes when the database changes", fix: "Dependency rule: domain owns ports; infrastructure implements them" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "High cohesion, low coupling: modules with one reason to change, talking through small interfaces." },
    { tag: "Maintainability", text: "Keep business rules pure (no I/O) so they are trivial to test." },
    { tag: "Reliability", text: "Use decorators for cross-cutting concerns (caching, retries, metrics) instead of sprinkling them through logic." },
    { tag: "Maintainability", text: "Apply YAGNI: abstract on the second real use, not the first imagined one." },
  ],
  interview: [
    { q: "Explain the Dependency Inversion Principle with an example.", a: "High-level policy should not depend on low-level details; both depend on abstractions owned by the policy. Example: a CompleteLesson use case depends on a Notifier interface it defines; an SMTP adapter implements it. Tests use a fake notifier, and switching email vendors changes only the adapter." },
    { q: "Which design patterns do you use most and why?", a: "Strategy for interchangeable algorithms (scoring rules, pricing), Adapter to wrap third-party SDKs behind my interfaces, Decorator for caching/retries/logging around services, Factory for complex creation, Repository for persistence access, and Observer/pub-sub for events. I use them when they reduce change cost, not by default." },
    { q: "What is clean (hexagonal) architecture?", a: "Business rules at the centre with no dependency on frameworks, databases or UI; use cases define ports (interfaces); adapters at the edges implement them for databases, messaging, HTTP and external APIs. Dependencies point inward, which keeps the core testable and replaceable parts swappable." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A pricing function has a growing if/elif for each new discount type. Which principle and pattern help?",
      options: ["Liskov + Singleton", "Open/closed + Strategy", "Interface segregation + Builder", "None"],
      answer: 1,
      explanation: "New discounts become new strategy classes registered in a map; the dispatcher stays closed for modification.",
    },
    {
      kind: "bug",
      prompt: "class ReadOnlyList(MutableList) raises an error in add(). Code that accepts MutableList now crashes. Which principle is violated?",
      options: ["Single responsibility", "Liskov substitution", "Open/closed", "DRY"],
      answer: 1,
      explanation: "A subtype must be usable wherever its base type is expected. Model read-only lists as a separate, smaller interface.",
    },
    {
      kind: "mcq",
      prompt: "In clean architecture, which layer may import EF Core?",
      options: ["Domain", "Application", "Infrastructure", "All of them"],
      answer: 2,
      explanation: "Frameworks and databases belong to the outer layer.",
    },
  ],
  cheatSheet: [
    "S: one reason to change. O: extend by adding. L: subtypes keep promises.",
    "I: small interfaces. D: depend on abstractions you own.",
    "Patterns: Strategy, Adapter, Decorator, Factory, Repository, Observer.",
    "Clean architecture: Domain ← Application ← Infrastructure/API.",
    "Pure domain logic = fast tests with fakes.",
    "Composition over inheritance.",
    "YAGNI: abstract on the second real need.",
  ],
  homework: {
    basic: {
      title: "Refactor a pricing switch with Strategy",
      brief: ["Refactor `price(course, user)` that uses if/elif for student, team, early-bird and coupon discounts into strategies selected from a registry. Add a 'regional pricing' discount without editing existing code paths."],
      criteria: ["One class/function per discount", "Registry-based dispatch", "Tests per strategy"],
      hints: ["A dict from discount name to a callable is enough in Python."],
      solution: {
        text: ["Each rule becomes independently testable; adding regional pricing is one new entry."],
        code: {
          lang: "python",
          code: `from decimal import Decimal
from typing import Callable

Discount = Callable[[Decimal, dict], Decimal]

DISCOUNTS: dict[str, Discount] = {
    "student": lambda price, ctx: price * Decimal("0.5"),
    "team": lambda price, ctx: price * (Decimal("0.8") if ctx.get("seats", 1) >= 5 else Decimal("1")),
    "early_bird": lambda price, ctx: price - Decimal("10"),
}

def register(name: str):
    def wrap(fn: Discount) -> Discount:
        DISCOUNTS[name] = fn
        return fn
    return wrap

@register("regional")                      # new rule, no existing code edited
def regional(price: Decimal, ctx: dict) -> Decimal:
    return price * Decimal(str(ctx.get("ppp_factor", 1)))

def final_price(base: Decimal, discount: str | None, ctx: dict) -> Decimal:
    price = DISCOUNTS[discount](base, ctx) if discount else base
    return max(price, Decimal("0")).quantize(Decimal("0.01"))

assert final_price(Decimal("49"), "student", {}) == Decimal("24.50")
assert final_price(Decimal("100"), "regional", {"ppp_factor": 0.4}) == Decimal("40.00")`,
        },
      },
    },
    intermediate: {
      title: "Ports and adapters for the LLM provider",
      brief: ["Define an `LlmClient` port (complete(system, user) -> str) for the DevAtlas AI service, write two adapters (a real provider SDK and a fake returning canned answers), and a `CachingLlmClient` decorator keyed by a hash of the prompt."],
      criteria: ["Use case depends only on the port", "Decorator adds caching transparently", "Tests use the fake"],
      hints: ["hashlib.sha256((system + '\\n' + user).encode()).hexdigest() as the cache key."],
      solution: {
        text: ["The same seam later lets you add a routing decorator (small vs large model, lesson 7.1.1 challenge) or a metrics decorator without touching use cases."],
        code: {
          lang: "python",
          code: `import hashlib
from typing import Protocol

class LlmClient(Protocol):
    def complete(self, system: str, user: str) -> str: ...

class FakeLlm:
    def __init__(self) -> None:
        self.calls = 0
    def complete(self, system: str, user: str) -> str:
        self.calls += 1
        return f"answer to: {user}"

class CachingLlmClient:
    def __init__(self, inner: LlmClient) -> None:
        self.inner, self.cache = inner, {}
    def complete(self, system: str, user: str) -> str:
        key = hashlib.sha256(f"{system}\\n{user}".encode()).hexdigest()
        if key not in self.cache:
            self.cache[key] = self.inner.complete(system, user)
        return self.cache[key]

fake = FakeLlm()
llm = CachingLlmClient(fake)
llm.complete("tutor", "What is a JWT?"); llm.complete("tutor", "What is a JWT?")
assert fake.calls == 1`,
        },
      },
    },
    challenge: {
      title: "Architecture decision record",
      brief: ["Write an ADR (Architecture Decision Record) for DevAtlas: 'Adopt ports and adapters for external integrations'. Include context, decision, alternatives considered (direct SDK calls, full clean architecture with separate projects), consequences (positive and negative)."],
      criteria: ["Standard ADR sections", "Honest negatives", "Concrete scope (which integrations)"],
      hints: ["Keep it to one page; ADRs are numbered and immutable once accepted (superseded by new ones)."],
      solution: {
        text: ["ADRs capture why a decision was made, which is what future maintainers need most."],
        code: {
          lang: "markdown",
          file: "docs/adr/0003-ports-and-adapters.md",
          code: `# 3. Ports and adapters for external integrations

Status: Accepted (2026-10-18)

## Context
DevAtlas calls an LLM provider, an email provider and a payment provider. Vendors and pricing change,
and tests currently need network access.

## Decision
Use cases depend on small interfaces (ports) owned by the application layer: LlmClient, EmailSender,
PaymentGateway. Each vendor gets an adapter in infrastructure. Cross-cutting behaviour (caching, retries,
metrics) is added with decorators. Internal code (repositories for our own DB) uses ports only where tests need them.

## Alternatives
- Call SDKs directly: least code today; vendor lock-in and slow, flaky tests.
- Full clean architecture with four projects for every service: strong boundaries; too much ceremony for our team size.

## Consequences
+ Vendor swaps touch one adapter; unit tests run without network.
+ Decorators give caching/retries/metrics in one place.
- One more indirection when reading code; adapters must be kept thin.
- Port design mistakes are costly to change; review new ports carefully.`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: refactor to a clean core",
      brief: ["Restructure the .NET API and the Python AI service so domain/use-case code has no framework or database imports, external services sit behind ports, and endpoints are thin. Add an ADR describing the structure and a test that fails if the Domain project references EF Core (architecture test)."],
      criteria: ["Dependency rule enforced (project references or architecture tests)", "Use cases unit-tested with fakes", "ADR committed"],
      hints: [".NET: NetArchTest or ArchUnitNET can assert 'Domain should not depend on Microsoft.EntityFrameworkCore'. Python: import-linter."],
      solution: {
        text: [
          "Python AI service layout: `devatlas_ai/domain` (pure rules: `Scorer`, `McqScorer`, `PASS_MARK`), `devatlas_ai/application` (ports such as `ProgressRepository` and `Notifier`, plus the `CompleteLesson` use case), `devatlas_ai/infrastructure` (adapters, e.g. `PostgresProgress` wrapping psycopg) and `devatlas_ai/api` (thin FastAPI routes that only translate HTTP to a use-case call). The .NET API gets the same four rings as projects, with the inward-only project references from the hands-on.",
          "The test below enforces the dependency rule with **grimp**, the import-graph library that import-linter is built on: it builds the real import graph (including third-party packages) and asserts that domain and application never reach FastAPI, pydantic, psycopg, SQLAlchemy, Redis, httpx or an LLM SDK, even indirectly, and that no inner ring imports an outer one. The same test file unit-tests the use case with fakes, so it runs in milliseconds with no database. In CI you can express the same rules as an import-linter `layers` contract and run `lint-imports`; on the .NET side NetArchTest or ArchUnitNET asserts that `DevAtlas.Domain` does not depend on `Microsoft.EntityFrameworkCore`.",
          "To prove the test bites, add `from devatlas_ai.infrastructure.postgres_progress import PostgresProgress` to `domain/grading.py`: it then fails with `devatlas_ai.domain reaches psycopg: devatlas_ai.domain.grading -> devatlas_ai.infrastructure.postgres_progress -> psycopg`, showing the whole chain to fix.",
          "Commit `docs/adr/0004-clean-core.md` next to the challenge's ADR: it records the four rings, the rule that ports live in the application layer, and that this test is the enforcement. Automated architecture tests keep the structure from eroding as the team grows, the same way unit tests protect behaviour.",
        ],
        code: {
          lang: "python",
          file: "tests/test_architecture.py",
          code: `"""Architecture + use-case tests for the DevAtlas AI service clean core.

Layout: devatlas_ai/{domain, application, infrastructure, api}. Dependencies must point inward:
api -> application -> domain, infrastructure -> application/domain. Run: pytest -q
"""
import grimp
import pytest

from devatlas_ai.application.complete_lesson import CompleteLesson
from devatlas_ai.domain.grading import McqScorer, Scorer

FRAMEWORKS = ["fastapi", "pydantic", "psycopg", "sqlalchemy", "redis", "anthropic", "httpx"]
INNER_LAYERS = ["devatlas_ai.domain", "devatlas_ai.application"]
# (importer, must not reach) pairs for the dependency rule inside our own package
INWARD_ONLY = [
    ("devatlas_ai.domain", "devatlas_ai.application"),
    ("devatlas_ai.domain", "devatlas_ai.infrastructure"),
    ("devatlas_ai.domain", "devatlas_ai.api"),
    ("devatlas_ai.application", "devatlas_ai.infrastructure"),
    ("devatlas_ai.application", "devatlas_ai.api"),
]


@pytest.fixture(scope="module")
def graph() -> grimp.ImportGraph:
    return grimp.build_graph("devatlas_ai", include_external_packages=True)


@pytest.mark.parametrize("layer", INNER_LAYERS)
def test_inner_layers_import_no_frameworks(graph: grimp.ImportGraph, layer: str) -> None:
    for framework in FRAMEWORKS:
        if framework not in graph.modules:  # not imported anywhere in the service
            continue
        chain = graph.find_shortest_chain(importer=layer, imported=framework, as_packages=True)
        assert chain is None, f"{layer} reaches {framework}: {' -> '.join(chain)}"


@pytest.mark.parametrize(("importer", "imported"), INWARD_ONLY)
def test_dependencies_point_inward(graph: grimp.ImportGraph, importer: str, imported: str) -> None:
    chain = graph.find_shortest_chain(importer=importer, imported=imported, as_packages=True)
    assert chain is None, f"dependency rule broken: {' -> '.join(chain)}"


# ---- use case tested with fakes: no database, no SMTP, microseconds ----
class FakeLessons:
    def __init__(self, scorers: dict[str, Scorer]) -> None:
        self.scorers = scorers

    def scorer_for(self, lesson_id: str) -> Scorer:
        return self.scorers[lesson_id]


class FakeProgress:
    def __init__(self) -> None:
        self.rows: list[tuple[int, str, float]] = []

    def save(self, user_id: int, lesson_id: str, score: float) -> None:
        self.rows.append((user_id, lesson_id, score))


class FakeNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[int, str]] = []

    def congratulate(self, user_id: int, lesson_id: str) -> None:
        self.sent.append((user_id, lesson_id))


@pytest.mark.parametrize(("answers", "congratulated"), [(["b", "c", "a"], True), (["b", "c", "x"], False)])
def test_complete_lesson(answers: list[str], congratulated: bool) -> None:
    progress, notifier = FakeProgress(), FakeNotifier()
    use_case = CompleteLesson(FakeLessons({"6.1.1": McqScorer(("b", "c", "a"))}), progress, notifier)
    score = use_case(7, "6.1.1", answers)
    assert progress.rows == [(7, "6.1.1", score)]
    assert (notifier.sent == [(7, "6.1.1")]) is congratulated`,
        },
        output: "$ python -m pytest -q\n.........                                                                [100%]\n9 passed",
      },
    },
  },
  deeper: [
    { label: "refactoring.guru: Design patterns", url: "https://refactoring.guru/design-patterns" },
    { label: "Alistair Cockburn: Hexagonal architecture", url: "https://alistair.cockburn.us/hexagonal-architecture/" },
    { label: "Microsoft: Common web application architectures", url: "https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures" },
    { label: "ADR GitHub organisation (templates)", url: "https://adr.github.io/" },
  ],
  nextPreview: "Next: monolith vs microservices, event-driven architecture and CQRS: choosing the architecture style that fits your team and domain.",
};
