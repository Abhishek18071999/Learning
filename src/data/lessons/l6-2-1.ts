import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.2.1",
  title: "Monolith, microservices, events and CQRS",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.1.1 SOLID, patterns and clean architecture", "4.4.2 Idempotency, rate limiting, queues and caching"],
  summary: "Choose an architecture style for the team and domain you actually have: modular monoliths, microservices and their real costs, event-driven communication, sagas for multi-service workflows, and CQRS read models.",
  terms: [
    { term: "Monolith", def: "One deployable application containing all features. A modular monolith has strong internal module boundaries." },
    { term: "Microservices", def: "Many small, independently deployable services, each owning its data and a business capability." },
    { term: "Bounded context", def: "A boundary within which a domain model and its language are consistent (Domain-Driven Design). Good service boundaries follow them." },
    { term: "Event-driven architecture", def: "Services communicate by publishing facts ('LessonCompleted') that others react to, instead of calling each other directly." },
    { term: "Saga", def: "A sequence of local transactions across services coordinated by events or an orchestrator, with compensating actions on failure." },
    { term: "CQRS", def: "Command Query Responsibility Segregation: separate models (and sometimes stores) for writes and for reads." },
    { term: "Eventual consistency", def: "Different parts of the system converge to the same state after a delay instead of instantly." },
  ],
  problem: [
    "A startup with six engineers splits DevAtlas into 14 microservices because 'that is how big companies do it'. Six months later: a local dev setup needs 14 containers, a single feature requires coordinated changes in five services, debugging means correlating logs across them, and the cloud bill tripled. Meanwhile their actual bottleneck (one slow query) is unchanged.",
    "Architecture style is a trade-off between team autonomy, operational complexity, consistency and performance. Choosing well means knowing the costs, starting simple, and splitting along real boundaries when the pain justifies it.",
  ],
  concept: {
    analogy: [
      "A **monolith** is one restaurant with one kitchen: easy to coordinate, everyone shares the fridge. **Microservices** are a food court: each stall runs independently with its own staff and fridge, great for scale and autonomy, but now you need shared seating, payment, cleaning and a way to deliver a combo meal from three stalls. **Events** are the food court's announcement board: stalls post 'order #42 ready' and anyone interested reacts.",
    ],
    precise: [
      "**Start with a modular monolith** for most teams: one deployable, modules with clear interfaces and private data (separate schemas or table prefixes, no reaching into other modules' tables). You get refactoring speed and simple operations, and a path to extract services later.",
      "**Microservices pay off** when many teams need to deploy independently, parts of the system have very different scaling or technology needs, or fault isolation matters. Costs: network calls (latency, partial failure), distributed data (no cross-service transactions), observability, versioning, platform engineering. Each service owns its data; others access it only via its API or events.",
      "**Communication**: synchronous (HTTP/gRPC) is simple but couples availability (if the callee is down, the caller fails); asynchronous events decouple in time and availability but are eventually consistent. Use events for 'something happened' facts and commands/RPC for 'please do this now and tell me the result'.",
      "**Sagas** replace distributed transactions: each step commits locally and publishes an event; failures trigger compensations (refund, release seat). **CQRS**: writes go through a domain model; reads come from denormalized read models updated by events, which is useful for complex dashboards and search, overkill for simple CRUD.",
    ],
  },
  underTheHood: {
    text: [
      "The fallacies of distributed computing (the network is reliable, latency is zero, bandwidth is infinite…) all become your problems with microservices: every call needs timeouts, retries with idempotency (lesson 4.4.2), circuit breakers and tracing.",
      "Reliable event publishing needs the outbox pattern; reliable consumption needs idempotent handlers (at-least-once delivery). Event schemas are contracts and must evolve compatibly like APIs (lesson 4.4.1).",
      "Read models lag behind writes. UIs handle this by showing the user's own change optimistically, or reading from the write side right after a command (read-your-writes), as with replicas in 5.4.1.",
    ],
    diagram: {
      title: "Purchase saga (choreography with events)",
      nodes: [
        { label: "Orders", sub: "OrderPlaced" },
        { label: "Payments", sub: "PaymentSucceeded / Failed" },
        { label: "Enrollment", sub: "EnrollmentCreated" },
        { label: "Email", sub: "Welcome sent" },
        { label: "On failure", sub: "compensate: refund / cancel" },
      ],
      edges: ["event", "event", "event", ""],
    },
  },
  handsOn: [
    {
      title: "A modular monolith boundary in practice",
      code: {
        lang: "text",
        code: `devatlas/
  modules/
    learning/          lessons, progress        public API: learning/api.py (functions/interfaces)
    billing/           purchases, invoices      public API: billing/api.py
    community/         comments, forums         public API: community/api.py
  shared/              logging, auth helpers (small!)
  app.py               composition root

Rules (checked in CI with an import linter):
  - modules import only other modules' api.py, never their internals
  - each module owns its tables; no cross-module JOINs
  - cross-module reactions via in-process events (LessonCompleted → community awards badge)`,
      },
      notes: ["Python: import-linter can enforce these contracts. .NET: separate projects or architecture tests. Extracting billing into its own service later is then mostly mechanical."],
    },
    {
      title: "In-process events: decouple modules before you need a broker",
      code: {
        lang: "python",
        file: "events.py",
        code: `from collections import defaultdict
from dataclasses import dataclass
from typing import Callable

@dataclass(frozen=True)
class LessonCompleted:
    user_id: int
    lesson_id: str
    score: float

_handlers: defaultdict[type, list[Callable]] = defaultdict(list)

def subscribe(event_type: type):
    def wrap(fn: Callable) -> Callable:
        _handlers[event_type].append(fn)
        return fn
    return wrap

def publish(event) -> None:
    for handler in _handlers[type(event)]:
        handler(event)

# community module reacts without the learning module knowing it exists
badges: dict[int, set[str]] = defaultdict(set)

@subscribe(LessonCompleted)
def award_badges(e: LessonCompleted) -> None:
    if e.score == 1.0:
        badges[e.user_id].add(f"perfect:{e.lesson_id}")

@subscribe(LessonCompleted)
def update_leaderboard(e: LessonCompleted) -> None:
    print(f"leaderboard +{round(e.score * 10)} for user {e.user_id}")

# learning module
def complete_lesson(user_id: int, lesson_id: str, score: float) -> None:
    # ...save progress in learning's own tables...
    publish(LessonCompleted(user_id, lesson_id, score))

complete_lesson(7, "6.2.1", 1.0)
complete_lesson(7, "6.1.1", 0.67)
print(dict(badges))`,
      },
      output: "leaderboard +10 for user 7\nleaderboard +7 for user 7\n{7: {'perfect:6.2.1'}}",
      notes: ["Swapping publish() for an outbox + message broker turns the same handlers into separate services, without changing the learning module."],
    },
    {
      title: "Saga with compensation (orchestrated)",
      code: {
        lang: "python",
        file: "saga.py",
        code: `class PaymentDeclined(Exception): ...

def charge(order):        print(f"charge {order['amount']}");  return "ch_1"
def refund(charge_id):    print(f"refund {charge_id}")
def reserve_seat(order):
    if order["session_full"]:
        raise RuntimeError("session full")
    print("seat reserved"); return "seat_9"
def release_seat(seat):   print(f"release {seat}")
def enroll(order):        print("enrolled")

def purchase_saga(order: dict) -> str:
    done: list = []                                   # compensations to run on failure, newest first
    try:
        charge_id = charge(order);       done.append(lambda: refund(charge_id))
        seat = reserve_seat(order);      done.append(lambda: release_seat(seat))
        enroll(order)
        return "completed"
    except Exception as e:
        print(f"failed: {e}; compensating")
        for undo in reversed(done):
            undo()
        return "compensated"

print(purchase_saga({"amount": 4900, "session_full": False}))
print(purchase_saga({"amount": 4900, "session_full": True}))`,
      },
      output: "charge 4900\nseat reserved\nenrolled\ncompleted\ncharge 4900\nfailed: session full; compensating\nrefund ch_1\ncompensated",
      notes: ["Across real services each step is a message to another service, the orchestrator persists saga state (so it survives restarts), and every step and compensation is idempotent. Libraries and workflow engines (Temporal, MassTransit sagas, AWS Step Functions, Azure Durable Functions) provide this durability."],
    },
    {
      title: "CQRS read model for the dashboard",
      code: {
        lang: "python",
        code: `# Write side: normalized progress rows (source of truth). Read side: one document per user,
# updated from events, shaped exactly like the dashboard needs.
dashboard_read_model: dict[int, dict] = {}

@subscribe(LessonCompleted)
def project_dashboard(e: LessonCompleted) -> None:
    view = dashboard_read_model.setdefault(e.user_id, {"completed": 0, "avg_score": 0.0, "last": None})
    n = view["completed"]
    view["avg_score"] = round((view["avg_score"] * n + e.score) / (n + 1), 3)
    view["completed"] = n + 1
    view["last"] = e.lesson_id

complete_lesson(9, "5.1.1", 1.0)
complete_lesson(9, "5.1.2", 0.5)
print(dashboard_read_model[9])        # one key lookup instead of several JOINs`,
      },
      output: "leaderboard +10 for user 9\nleaderboard +5 for user 9\n{'completed': 2, 'avg_score': 0.75, 'last': '5.1.2'}",
    },
  ],
  companies: [
    "**Modular monoliths are common and successful**: many well-known products run large monolithic codebases with strict internal modules (Shopify has written publicly about its modular Rails monolith), extracting services only where needed.",
    "**Microservices at scale**: companies with hundreds of engineers (Netflix, Amazon, Uber are frequently cited) use microservices for team autonomy, with heavy investment in platform tooling: service templates, observability, service mesh, contract testing.",
    "**Events everywhere**: Kafka and cloud event buses (EventBridge, Event Grid, Pub/Sub) carry domain events for analytics, search indexing, notifications and integrations; workflow engines (Temporal, Step Functions) run long-running sagas.",
  ],
  mistakes: [
    { mistake: "Microservices first for a small team", why: "Copying big-company architecture", wrong: "Slow delivery, complex ops, distributed bugs", fix: "Modular monolith; extract services when a real need appears" },
    { mistake: "Shared database between services", why: "Easy data access", wrong: "Hidden coupling; schema changes break other services", fix: "Each service owns its data; share via APIs or events" },
    { mistake: "Synchronous call chains", why: "Service A calls B calls C calls D", wrong: "Latency adds up and any outage cascades", fix: "Async events where possible; timeouts, circuit breakers, caching" },
    { mistake: "Distributed transactions across services", why: "Wanting ACID everywhere", wrong: "Fragile two-phase commits or silent inconsistency", fix: "Sagas with compensations; design for eventual consistency" },
    { mistake: "CQRS/event sourcing for simple CRUD", why: "Trendy patterns", wrong: "Much more code and eventual-consistency bugs for no benefit", fix: "Use CQRS only where read and write needs truly differ" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Draw boundaries around business capabilities/bounded contexts; enforce them with tooling." },
    { tag: "Reliability", text: "Outbox for publishing, idempotent consumers, versioned event schemas, dead-letter queues." },
    { tag: "Reliability", text: "Every remote call: timeout, retry with backoff only if idempotent, circuit breaker, tracing." },
    { tag: "Cost", text: "Count the operational cost of each new service (deploys, monitoring, on-call) before creating it." },
  ],
  interview: [
    { q: "Monolith or microservices for a new product?", a: "Usually a modular monolith: fastest to build, test, deploy and refactor while the domain is still being discovered, with clear module boundaries and data ownership. Move to microservices when independent deployment across many teams, different scaling needs or fault isolation justify the operational cost, extracting along the module boundaries." },
    { q: "How do you keep data consistent across microservices?", a: "Each service owns its data and commits locally. Cross-service workflows use sagas: events or an orchestrator drive steps and compensating actions on failure. Publishing uses the outbox pattern; consumers are idempotent. The system is eventually consistent, and the UI is designed for that." },
    { q: "What is CQRS and when is it worth it?", a: "Separating the write model (commands, validation, invariants) from read models (denormalized views optimised for queries), often updated by events. Worth it when reads are complex, high-volume or need different storage (search, dashboards); not worth it for straightforward CRUD." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Two services both read and write the same 'users' table directly. What is the main problem?",
      options: ["Too many indexes", "Hidden coupling: neither can change the schema independently", "It is always faster", "Nothing"],
      answer: 1,
      explanation: "Shared databases defeat independent deployment; one owner, others use its API or events.",
    },
    {
      kind: "mcq",
      prompt: "Payment succeeds but seat reservation fails in a purchase saga. What should happen?",
      options: ["Leave the payment", "Run the compensating action: refund the payment", "Retry forever", "Roll back with a distributed transaction"],
      answer: 1,
      explanation: "Sagas undo completed steps with compensations.",
    },
    {
      kind: "bug",
      prompt: "A user completes a lesson, but the dashboard (a CQRS read model) still shows the old count for a second. Is this a bug?",
      options: ["Yes, CQRS is broken", "Expected eventual consistency; show the user's change optimistically or read from the write side right after the command", "The database is corrupt", "Caching must be disabled"],
      answer: 1,
      explanation: "Read models lag by design; UX patterns hide the lag.",
    },
  ],
  cheatSheet: [
    "Default: modular monolith with enforced module boundaries.",
    "Microservices for team autonomy/scale/isolation; pay in ops complexity.",
    "Each service owns its data. No shared databases.",
    "Sync calls couple availability; events decouple (eventually consistent).",
    "Sagas + compensations instead of distributed transactions.",
    "Outbox + idempotent consumers + versioned events.",
    "CQRS only where reads and writes truly differ.",
  ],
  homework: {
    basic: {
      title: "Find the bounded contexts",
      brief: ["List DevAtlas's bounded contexts (e.g. Learning, Assessment, Billing, Community, Content, News) with the data each owns, the events each publishes and consumes, and which would be the first candidate to extract as a service and why."],
      criteria: ["Clear data ownership per context", "Events named in past tense", "Justified extraction candidate"],
      hints: ["Good extraction candidates have different scaling or technology needs (e.g. the AI service)."],
      solution: {
        text: [
          "Learning (lessons, progress; publishes LessonCompleted), Assessment (quizzes, attempts; publishes QuizSubmitted), Billing (purchases, invoices; publishes PurchaseCompleted, consumes nothing from Learning), Community (comments, badges; consumes LessonCompleted), Content (lesson documents; publishes LessonPublished), News (articles; publishes NewsIngested). First extraction: the AI/News pipeline, already in Python/Rust with different scaling (LLM latency, scheduled ingestion), which is exactly why DevAtlas starts with those as separate services.",
        ],
      },
    },
    intermediate: {
      title: "Enforce module boundaries",
      brief: ["Set up import-linter (Python) or architecture tests (.NET) so modules can only import each other's public API. Introduce a forbidden import on purpose and show CI failing."],
      criteria: ["Contract configuration committed", "Failing example demonstrated", "Runs in CI"],
      hints: ["import-linter contract type 'independence' or 'forbidden'."],
      solution: {
        text: ["Automated boundary checks keep a modular monolith modular; without them boundaries erode under deadline pressure."],
        code: {
          lang: "text",
          file: ".importlinter",
          code: `[importlinter]
root_package = devatlas

[importlinter:contract:modules-only-use-public-api]
name = Modules use each other only through api.py
type = forbidden
source_modules =
    devatlas.modules.community
forbidden_modules =
    devatlas.modules.learning.repository
    devatlas.modules.learning.models
    devatlas.modules.billing.repository`,
        },
      },
    },
    challenge: {
      title: "Event schema evolution",
      brief: ["LessonCompleted v1 has {user_id, lesson_id, score}. Product wants time_spent_seconds and to rename score to score_ratio. Design v2 so old consumers keep working, write the consumer code that accepts both, and describe the rollout order."],
      criteria: ["Additive change first", "Consumers tolerant of both versions", "Rollout order avoids breakage"],
      hints: ["Consumers first, producers second, cleanup last."],
      solution: {
        text: ["Add fields rather than renaming: v2 adds score_ratio and time_spent_seconds while still sending score. Deploy consumers that prefer score_ratio and fall back to score, then producers sending both, then (much later, once all consumers are updated) stop sending score. Include a schema_version field and validate schemas with a registry if you use Kafka."],
        code: {
          lang: "python",
          code: `def handle_lesson_completed(payload: dict) -> tuple[int, str, float, int | None]:
    score = payload.get("score_ratio", payload.get("score"))       # tolerant reader
    if score is None:
        raise ValueError("missing score")
    return payload["user_id"], payload["lesson_id"], float(score), payload.get("time_spent_seconds")

assert handle_lesson_completed({"user_id": 1, "lesson_id": "6.2.1", "score": 0.9})[2] == 0.9
assert handle_lesson_completed({"user_id": 1, "lesson_id": "6.2.1", "score": 0.9, "score_ratio": 0.9, "time_spent_seconds": 600})[3] == 600`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: architecture document",
      brief: ["Write docs/architecture.md for DevAtlas: context diagram (Mermaid), services and why each is separate (or not), data ownership table, sync vs async communication per interaction, the events catalogue, and the ADRs that led there."],
      criteria: ["Every service justified", "Events catalogue with producers/consumers", "Diagram renders on GitHub"],
      hints: ["Reuse the Mermaid architecture from the capstone page and extend it."],
      solution: {
        text: ["Interviewers and new teammates read this first; it shows you can reason about trade-offs, not just write code."],
      },
    },
  },
  deeper: [
    { label: "Martin Fowler: Microservices", url: "https://martinfowler.com/articles/microservices.html" },
    { label: "Martin Fowler: MonolithFirst", url: "https://martinfowler.com/bliki/MonolithFirst.html" },
    { label: "microservices.io: Saga pattern", url: "https://microservices.io/patterns/data/saga.html" },
    { label: "Martin Fowler: CQRS", url: "https://martinfowler.com/bliki/CQRS.html" },
  ],
  nextPreview: "Next: scalability. Back-of-envelope estimates, load balancing, caching layers and the CAP theorem.",
};
