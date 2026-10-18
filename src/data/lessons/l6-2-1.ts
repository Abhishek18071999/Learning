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
          "Eight contexts, each with exactly one writer for its data. Events are past-tense facts; the interaction table shows which links must stay synchronous because a user is waiting.",
          "The first extraction is the AI tutor (already a separate Python service in DevAtlas) because it differs on scaling, technology, cost and failure modes, and its interface is narrow. News is second. Learning, Assessment and Community stay together because one page touches all three.",
        ],
        code: {
          lang: "markdown",
          file: "docs/bounded-contexts.md",
          code: `# DevAtlas bounded contexts

Status: draft for review · Scope: today's modular monolith (ASP.NET Core API) plus the AI and news services

## Contexts, data ownership and events

| Context | Owns (only this context writes it) | Store | Publishes | Consumes |
|---|---|---|---|---|
| **Identity** | users, roles, refresh tokens, login audit | MySQL \`identity_*\` tables | \`UserRegistered\`, \`UserDeleted\` | none |
| **Learning** | enrollments, lesson progress, streaks | MySQL \`learning_*\` tables | \`LessonStarted\`, \`LessonCompleted\`, \`StreakBroken\` | \`UserDeleted\`, \`QuizSubmitted\`, \`PurchaseCompleted\` |
| **Assessment** | quizzes, attempts, homework grades | MySQL \`assessment_*\` tables | \`QuizSubmitted\`, \`HomeworkGraded\` | \`LessonPublished\` (to build the question pool) |
| **Content** | lesson documents, versions, media | MongoDB \`lessons\` collection | \`LessonPublished\`, \`LessonRetired\` | none |
| **Billing** | plans, purchases, invoices, refunds | MySQL \`billing_*\` tables + payment provider | \`PurchaseCompleted\`, \`RefundIssued\` | \`UserDeleted\` |
| **Community** | comments, badges, leaderboard | MySQL \`community_*\` tables, Redis leaderboard | \`CommentPosted\`, \`BadgeAwarded\` | \`LessonCompleted\`, \`QuizSubmitted\`, \`UserDeleted\` |
| **News** | feeds, articles, topic tags, digests | MongoDB \`news\` collection | \`NewsIngested\`, \`DigestPublished\` | none |
| **AI Tutor** | lesson chunks + embeddings, answer logs, eval runs | PostgreSQL + pgvector | \`TutorAnswered\` | \`LessonPublished\`, \`LessonRetired\`, \`NewsIngested\` |

Rules that follow from the table:

- No context reads another context's tables. Learning asks Content for a lesson through \`content/api.py\` (in process) or \`GET /v1/lessons/{id}\`; it never queries the \`lessons\` collection directly.
- Events are past-tense facts with an id, a \`schema_version\` and the minimum data consumers need, for example \`LessonCompleted {event_id, schema_version: 1, user_id, lesson_id, score, completed_at}\`.
- \`UserDeleted\` is the only event every context must handle (GDPR erasure within 30 days).

## Interaction map (sync vs async)

| From → To | Style | Why |
|---|---|---|
| Learning → Content (get lesson) | sync, in process | the page cannot render without it |
| Learning → Community (award badge) | async event \`LessonCompleted\` | badges may lag a few seconds; Learning must not fail if Community does |
| Billing → Learning (unlock course) | async event \`PurchaseCompleted\` | payment webhooks retry; the handler is idempotent on \`purchase_id\` |
| Content → AI Tutor (re-embed lesson) | async event \`LessonPublished\` | embedding 80 lessons takes ~4 minutes and calls a paid API |
| Web → AI Tutor (\`/ask\`) | sync HTTP, streamed | the learner is waiting for the answer |

## First extraction candidate: AI Tutor

It is already a separate FastAPI service, and it should stay the first and only extraction for now because it differs from the rest on every axis that justifies a service boundary:

1. **Different scaling profile.** An \`/ask\` request holds a connection for 2 to 6 s waiting for the LLM, while a typical API request finishes in 30 ms. Sharing a process would let 200 concurrent tutor sessions exhaust the API's thread pool.
2. **Different technology.** The embedding, retrieval and evaluation tooling is Python; the API is C#.
3. **Different cost and failure modes.** It calls a paid LLM provider; rate limits or outages there must degrade only the tutor ("Tutor is busy, try again"), not lessons or progress.
4. **Narrow interface.** It needs \`LessonPublished\` events in and one \`/ask\` endpoint out, so the boundary is cheap to keep stable.

**Second candidate (later): News**, because ingestion is a scheduled batch job (Rust) with no user-facing latency requirement. **Not candidates:** Learning, Assessment and Community share requests and data so tightly (one lesson page touches all three) that splitting them would turn in-process calls into network calls with no autonomy gain for a team of our size.`,
        },
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
        text: [
          "The document justifies every service (including why the core stays a monolith), gives each piece of data exactly one owner, chooses sync or async per interaction with its failure behaviour, and lists every event with producers and consumers. The Mermaid diagram uses only standard `flowchart` syntax and was rendered with mermaid-cli to check it parses.",
          "Interviewers and new teammates read this first; it shows you can reason about trade-offs, not just write code. Keep the ADR table current: when a decision changes, add a new ADR that supersedes the old one and update this page.",
        ],
        code: {
          lang: "markdown",
          file: "docs/architecture.md",
          code: `# DevAtlas architecture

Last reviewed: 2026-10-18 · Owners: platform team · Decisions: [docs/adr](adr/)

DevAtlas is a **modular monolith plus two specialised services**. One team of 4 to 6 engineers owns everything, so we split only where scaling, technology or failure isolation forces it.

## Context diagram

\`\`\`mermaid
flowchart LR
  learner([Learner browser]) -->|HTTPS| cdn[CDN + React SPA]
  cdn -->|REST + JWT| api[ASP.NET Core API<br/>modular monolith]
  cdn -->|/ask, streamed| ai[FastAPI AI service]
  api --> mysql[(MySQL<br/>users, progress, billing)]
  api --> mongo[(MongoDB<br/>lessons, news)]
  api -->|outbox| bus{{Redis Streams<br/>event bus}}
  bus --> ai
  ai --> pg[(PostgreSQL + pgvector<br/>chunks, embeddings)]
  ai -->|HTTPS| llm[LLM provider]
  cron[Daily scheduler] --> ingester[Rust news ingester]
  ingester --> mongo
  ingester -->|NewsIngested| bus
  pay[Payment provider] -->|webhook| api
\`\`\`

## Services and why each exists

| Service | Separate? | Why |
|---|---|---|
| ASP.NET Core API (Identity, Learning, Assessment, Content, Billing, Community modules) | **No, one deployable** | These modules share most requests (one lesson page touches Learning, Assessment and Community). In-process calls keep p95 at 45 ms and let us refactor across modules in one PR. Boundaries are enforced by architecture tests (ADR-0005). |
| FastAPI AI service | **Yes** | Python ML tooling; requests hold connections for 2 to 6 s on the LLM; paid-provider outages and rate limits must not affect lessons or progress (ADR-0002). |
| Rust news ingester | **Yes** | Scheduled batch job, CPU-bound RSS/HTML parsing of ~400 feeds in under 90 s; no user-facing traffic; can crash and retry without anyone noticing (ADR-0004). |
| React SPA | **Yes** (static files) | Served from a CDN; deploys independently of the API. |

## Data ownership

| Data | Owner | Store | Other readers get it via |
|---|---|---|---|
| users, roles, refresh tokens | API · Identity | MySQL \`identity_*\` | JWT claims; \`GET /v1/me\` |
| enrollments, progress, streaks | API · Learning | MySQL \`learning_*\` | \`LessonCompleted\` events; \`GET /v1/me/progress\` |
| quizzes, attempts | API · Assessment | MySQL \`assessment_*\` | \`QuizSubmitted\` events |
| purchases, invoices | API · Billing | MySQL \`billing_*\` | \`PurchaseCompleted\` events |
| lesson documents | API · Content | MongoDB \`lessons\` | \`GET /v1/lessons/{id}\`; \`LessonPublished\` events |
| articles, digests | News ingester | MongoDB \`news\` | \`GET /v1/news\`; \`NewsIngested\` events |
| chunks, embeddings, eval runs | AI service | PostgreSQL + pgvector | nobody; only the AI service queries it |

No service or module writes to a store it does not own, and there are no cross-module JOINs.

## Communication

| Interaction | Style | Reason | Failure behaviour |
|---|---|---|---|
| SPA → API (lessons, progress) | sync REST | user is waiting | 3 s timeout, retry GETs once |
| SPA → AI service \`/ask\` | sync HTTP, streamed tokens | user is waiting; first token target p95 < 3 s | "Tutor is busy" message; lesson page unaffected |
| Learning → Community (badges, leaderboard) | async, in-process event | badges may lag; Learning must not fail | handler errors logged and retried |
| Content → AI (re-embed lesson) | async, Redis Streams | embedding takes minutes and costs money | consumer group retries; DLQ after 5 attempts |
| Payment provider → Billing | async webhook | provider retries for 3 days | idempotent on \`purchase_id\` |
| Ingester → AI (summarise + tag) | async, Redis Streams | batch, no latency need | backlog drains on next run |

Events leave the API through a transactional **outbox** table polled every 500 ms, so a committed change always produces its event (at-least-once). Every consumer is idempotent on \`event_id\`.

## Events catalogue

| Event (v1) | Producer | Consumers | Key fields |
|---|---|---|---|
| \`UserRegistered\` | Identity | Learning, Community | user_id, registered_at |
| \`UserDeleted\` | Identity | all modules, AI service | user_id, requested_at (erase within 30 days) |
| \`LessonPublished\` | Content | AI service, Assessment | lesson_id, version, published_at |
| \`LessonCompleted\` | Learning | Community | user_id, lesson_id, score, completed_at |
| \`QuizSubmitted\` | Assessment | Learning, Community | user_id, quiz_id, score_ratio |
| \`PurchaseCompleted\` | Billing | Learning | purchase_id, user_id, plan |
| \`NewsIngested\` | News ingester | AI service | article_id, source, published_at |

All events carry \`event_id\`, \`schema_version\` and \`occurred_at\`. Changes are additive; renames go through the consumers-first rollout in ADR-0006.

## Decisions that led here

| ADR | Decision | Status |
|---|---|---|
| 0001 | Start as a modular monolith | Accepted |
| 0002 | Run the AI tutor as a separate Python service | Accepted |
| 0003 | Ports and adapters for external integrations (LLM, email, payments) | Accepted |
| 0004 | News ingester in Rust as a scheduled job | Accepted |
| 0005 | Enforce module boundaries with architecture tests in CI | Accepted |
| 0006 | Outbox + Redis Streams for events; revisit Kafka above 2,000 events/s | Accepted |

## When we would split further

Extract a module from the API only when one of these becomes true: a second team owns it and is blocked by shared releases; it needs to scale 10× differently from the rest; or its failures keep taking down unrelated features. Billing is the most likely first candidate because of PCI scope.`,
        },
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
