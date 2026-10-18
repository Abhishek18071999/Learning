import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.1",
  title: "URL shortener, chat, news feed, rate limiter",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["6.3.1 Scaling, CAP, load balancing and caching layers"],
  summary: "Practise system design with a repeatable framework, applied to four classic cases. Learn to clarify requirements, estimate, sketch the high-level design, deep-dive the hard parts and narrate trade-offs, in interviews and in real design reviews.",
  terms: [
    { term: "Functional requirements", def: "What the system must do (shorten a URL, send a message)." },
    { term: "Non-functional requirements", def: "Qualities: latency, availability, durability, consistency, scale, cost, security." },
    { term: "Fan-out on write / read", def: "Precomputing feeds when content is posted (push) vs assembling them when a user reads (pull)." },
    { term: "WebSocket", def: "A persistent, bidirectional connection between browser and server, used for real-time chat and notifications." },
    { term: "Base62", def: "Encoding numbers with 0-9, a-z, A-Z (62 symbols), producing short URL-safe ids." },
    { term: "Hot key", def: "A single key receiving disproportionate traffic (a celebrity's posts, a viral link)." },
  ],
  problem: [
    "In system design interviews and real design reviews, engineers fail less from not knowing technologies and more from jumping straight to boxes and arrows: they design for the wrong requirements, ignore scale, and cannot explain why they chose anything.",
    "A simple, repeatable framework plus four well-understood cases gives you building blocks (IDs, caches, queues, fan-out, real-time connections, rate limits) that combine into almost any system you will be asked about, including DevAtlas's own news feed and chat with mentors.",
  ],
  concept: {
    analogy: [
      "System design is **planning a building with the client in the room**. An architect first asks how many people will live there, the budget and the must-haves; sketches the floor plan; then details the tricky parts (the staircase, the load-bearing walls) while explaining options. Starting with the colour of the bathroom tiles impresses nobody.",
    ],
    precise: [
      "**Framework (about 45 minutes)**: (1) Requirements, 5 min: functional, non-functional, out of scope. (2) Estimates, 5 min: QPS read/write, storage, bandwidth. (3) API and data model, 5–10 min. (4) High-level design, 10 min: clients, LB, services, data stores, caches, queues. (5) Deep dives, 15 min: the hardest 2–3 parts, bottlenecks, failure modes. (6) Wrap-up: trade-offs, monitoring, evolution.",
      "**Narrate trade-offs** for every choice: what you gain, what it costs, what you would do at 10× scale. Interviewers evaluate reasoning, not a single 'right' answer.",
      "**Reusable building blocks**: unique ID generation; caching with TTLs; CDNs; queues for async work; fan-out strategies; WebSockets/SSE for real time; rate limiting; replication and partitioning; idempotency; observability.",
    ],
  },
  underTheHood: {
    text: [
      "**URL shortener**: read-heavy (100:1). Generate ids with a counter + base62 (7 characters ≈ 3.5 trillion values) or random ids with collision checks; store id → long URL in a key-value store; cache hot ids in Redis/CDN; redirect with 301 (cacheable, fewer analytics) or 302 (every click hits you).",
      "**Chat**: clients keep WebSocket connections to gateway servers; a presence service tracks which gateway holds each user; messages are written to a partitioned store (by conversation id) and routed to recipients' gateways via pub/sub; offline users get push notifications; per-conversation sequence numbers keep order; clients deduplicate with message ids.",
      "**News feed**: fan-out on write (push the post id into followers' feed lists) makes reads fast but celebrities with millions of followers cause write storms; fan-out on read (merge followed users' recent posts at read time) is the opposite. Hybrid: push for normal users, pull for celebrities, then rank.",
      "**Rate limiter**: token bucket or sliding window counters in Redis keyed by client and endpoint; enforce at the gateway; return 429 with Retry-After; fail open or closed deliberately when Redis is down.",
    ],
    diagram: {
      title: "URL shortener (read path)",
      nodes: [
        { label: "GET /aZ3k9Qx", sub: "browser" },
        { label: "CDN / edge", sub: "cached 301?" },
        { label: "Redirect service", sub: "stateless ×N" },
        { label: "Redis", sub: "id → URL (hot)" },
        { label: "KV store", sub: "id → URL (all)" },
      ],
      edges: ["", "miss", "lookup", "miss"],
    },
  },
  handsOn: [
    {
      title: "Case 1, URL shortener: ids with base62",
      code: {
        lang: "python",
        file: "shortener.py",
        code: `import string

ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase   # 62 symbols

def encode(n: int) -> str:
    if n == 0:
        return ALPHABET[0]
    out = []
    while n:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))

def decode(s: str) -> int:
    n = 0
    for ch in s:
        n = n * 62 + ALPHABET.index(ch)
    return n

print(encode(125), decode(encode(125)))
print(len(encode(62**7 - 1)), f"{62**7:,} ids fit in 7 characters")

class Shortener:
    def __init__(self, start: int = 10_000_000) -> None:
        self.counter = start                     # in production: a DB sequence or ID-range allocator per node
        self.store: dict[str, str] = {}
    def shorten(self, url: str) -> str:
        self.counter += 1
        code = encode(self.counter)
        self.store[code] = url
        return code
    def resolve(self, code: str) -> str | None:
        return self.store.get(code)

s = Shortener()
code = s.shorten("https://devatlas.dev/lessons/6.4.1?utm_source=newsletter")
print(code, "->", s.resolve(code))`,
      },
      output: "21 125\n7 3,521,614,606,208 ids fit in 7 characters\nFXsl -> https://devatlas.dev/lessons/6.4.1?utm_source=newsletter",
      notes: ["Sequential ids are guessable; if links must be private, use random ids (with collision checks) or encrypt the counter. Allocating id ranges per server avoids a central bottleneck."],
    },
    {
      title: "Case 1, numbers that drive the design",
      code: {
        lang: "text",
        code: `Assume 100M new URLs/month, 100:1 read:write.
  writes   ≈ 100M / (30 × 86,400) ≈ 40/s        reads ≈ 4,000/s (peak ~20,000/s)
  storage  ≈ 100M × 500 bytes × 12 months ≈ 600 GB/year  (+ indexes, replicas)
  cache    20% of URLs get 80% of traffic → cache the daily hot set in Redis (a few GB)

Design: stateless shortener API + KV store (DynamoDB/Cassandra/PostgreSQL partitioned by code)
        + Redis + CDN caching 301s for very hot links; async click analytics via a queue.`,
      },
    },
    {
      title: "Case 2, news feed: hybrid fan-out",
      code: {
        lang: "python",
        file: "feed.py",
        code: `from collections import defaultdict, deque
import heapq, itertools

CELEBRITY_THRESHOLD = 3                      # followers above this → pull model (tiny for the demo)
followers: defaultdict[str, set[str]] = defaultdict(set)
posts: defaultdict[str, list[tuple[int, str]]] = defaultdict(list)       # author → [(ts, text)]
feeds: defaultdict[str, deque] = defaultdict(lambda: deque(maxlen=500))   # precomputed (push)
clock = itertools.count(1)

def follow(user: str, author: str) -> None:
    followers[author].add(user)

def post(author: str, text: str) -> None:
    ts = next(clock)
    posts[author].append((ts, text))
    if len(followers[author]) <= CELEBRITY_THRESHOLD:                    # normal user: fan-out on write
        for f in followers[author]:
            feeds[f].appendleft((ts, author, text))

def read_feed(user: str, following: list[str], k: int = 5) -> list[str]:
    pulled = [(ts, a, t) for a in following if len(followers[a]) > CELEBRITY_THRESHOLD
              for ts, t in posts[a][-k:]]                                   # celebrities: fan-out on read
    merged = heapq.nlargest(k, list(feeds[user]) + pulled)                # newest first
    return [f"{a}: {t}" for _, a, t in merged]

for u in ["asha", "ravi", "meera", "zoe"]:
    follow(u, "devatlas")                    # 4 followers → celebrity
follow("asha", "ravi")
post("ravi", "Finished the graphs lesson!")
post("devatlas", "New lesson: system design cases")
post("ravi", "Dijkstra finally clicked")
print(read_feed("asha", ["ravi", "devatlas"]))`,
      },
      output: "['ravi: Dijkstra finally clicked', 'devatlas: New lesson: system design cases', 'ravi: Finished the graphs lesson!']",
      notes: ["Production feeds add ranking (relevance, recency, engagement), pagination with cursors, and store feed lists in Redis or a wide-column store."],
    },
    {
      title: "Case 3, chat: the moving parts",
      code: {
        lang: "text",
        code: `Clients ⇄ WebSocket gateways (stateful connections, many per server)
            │  on connect: presence[user] = gateway-id  (Redis, TTL heartbeat)
            ▼
Chat service: validate, assign per-conversation sequence number, write message
            │  store: messages partitioned by conversation_id (Cassandra/DynamoDB/PostgreSQL partitions)
            ▼
Pub/sub (Redis/Kafka/NATS): route to gateways holding recipients' connections
Offline recipients → push notification service (APNs/FCM)

Guarantees: at-least-once delivery + client dedupe by message_id; ordering per conversation by sequence;
read receipts as separate lightweight events; history via cursor pagination.`,
      },
    },
    {
      title: "Case 4, rate limiter: placement and failure modes",
      code: {
        lang: "text",
        code: `Where:    API gateway / edge (cheapest place to reject) + service-level limits for expensive endpoints
Key:      api_key or user_id (+ endpoint), IP as fallback for anonymous traffic
Algorithm: token bucket (bursts OK) or sliding-window counter (lesson 4.4.2), state in Redis
Response: 429 + Retry-After + X-RateLimit-Remaining headers
Scale:    Redis cluster sharded by key; Lua script for atomic check-and-decrement
Failure:  Redis down → fail open (allow, protect availability) for normal endpoints,
          fail closed (deny) for abuse-sensitive ones like login or SMS sending; alert either way`,
      },
    },
  ],
  companies: [
    "**Design reviews mirror interviews**: real teams write design docs with requirements, estimates, alternatives and risks, reviewed by senior engineers before building, which is exactly the framework above.",
    "**These cases are real products**: link shorteners power marketing analytics; feeds power social and news apps; chat powers support tools and collaboration apps; rate limiters protect every public API.",
    "**Interview loops**: mid-level and senior roles commonly include one or two system design rounds; interviewers look for requirement gathering, estimation, sound building blocks, explicit trade-offs and awareness of failure modes.",
  ],
  mistakes: [
    { mistake: "Jumping to a diagram", why: "Wanting to show knowledge", wrong: "Designing for the wrong requirements or scale", fix: "Spend the first minutes clarifying requirements and estimating" },
    { mistake: "Name-dropping technologies without reasons", why: "Kafka/Kubernetes sound impressive", wrong: "No evidence of judgement", fix: "For each component say why, the alternative, and the cost" },
    { mistake: "Ignoring failure modes", why: "Happy-path thinking", wrong: "Designs that collapse when one component fails", fix: "Ask 'what if this is slow or down?' for each dependency" },
    { mistake: "Over-designing for imaginary scale", why: "Assuming 'web scale'", wrong: "Complex, expensive system for 100 RPS", fix: "Size from estimates; show how the design evolves at 10× and 100×" },
    { mistake: "Silent thinking", why: "Concentrating", wrong: "Interviewer cannot follow or help", fix: "Think aloud, check assumptions, summarise decisions" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Write design docs: context, requirements, estimates, design, alternatives, risks, rollout." },
    { tag: "Reliability", text: "For every dependency define timeouts, fallbacks and what degrades gracefully." },
    { tag: "Performance", text: "Identify read vs write ratios early; they decide caching and data layout." },
    { tag: "Cost", text: "Include a cost estimate; it often changes the design." },
  ],
  interview: [
    { q: "Design a URL shortener.", a: "Clarify: custom aliases? analytics? expiry? Estimate: ~40 writes/s, ~4k reads/s at 100M URLs/month. API: POST /urls → code; GET /{code} → 301/302. ID: counter + base62 (7 chars) with range allocation, or random with collision check. Store in a partitioned KV store; cache hot codes in Redis and at the CDN; send click events to a queue for analytics. Discuss 301 vs 302, abuse prevention, and private links." },
    { q: "Fan-out on write vs fan-out on read for a news feed?", a: "Write-time fan-out pushes post ids into each follower's feed: fast reads, expensive for accounts with millions of followers. Read-time fan-out merges followed accounts' posts on demand: cheap writes, slower reads. Most large systems use a hybrid: push for normal accounts, pull for celebrities, then rank and cache." },
    { q: "How do you keep chat messages ordered and not duplicated?", a: "Assign a monotonically increasing sequence number per conversation on the server (single writer per conversation partition), deliver at least once, and have clients deduplicate by message id and order by sequence. Use cursor-based history pagination by sequence." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "First thing to do in a system design interview?",
      options: ["Draw the database schema", "Clarify requirements and constraints", "Pick Kubernetes", "Write code"],
      answer: 1,
      explanation: "Requirements and scale determine every later decision.",
    },
    {
      kind: "output",
      prompt: "How many distinct ids fit in 6 base62 characters (approximately)?",
      options: ["~57 thousand", "~56.8 billion", "~3.5 trillion", "~1 million"],
      answer: 1,
      explanation: "62^6 = 56,800,235,584 ≈ 56.8 billion.",
    },
    {
      kind: "mcq",
      prompt: "A celebrity with 50 million followers posts. Which feed strategy avoids a write storm?",
      options: ["Fan-out on write to all followers", "Fan-out on read for that author's posts", "Email every follower", "Disable the feed"],
      answer: 1,
      explanation: "Pull celebrity posts at read time and merge them into precomputed feeds.",
    },
  ],
  cheatSheet: [
    "Framework: requirements → estimates → API/data → high level → deep dives → trade-offs.",
    "Always: read/write ratio, peak QPS, storage/year, latency target.",
    "Shortener: base62 ids, KV store, Redis + CDN, async analytics.",
    "Feed: hybrid fan-out, ranking, cursor pagination.",
    "Chat: WebSocket gateways, presence, partitioned messages, pub/sub, per-conversation sequence.",
    "Rate limiter: gateway, token bucket in Redis, 429 + Retry-After, fail open/closed by risk.",
    "Narrate trade-offs and failure modes.",
  ],
  homework: {
    basic: {
      title: "Design document: DevAtlas notifications",
      brief: ["Write a one-page design doc for notifications (in-app, email, push) when a lesson is published, a streak is at risk, or a mentor replies. Use the framework, including estimates and failure modes."],
      criteria: ["Requirements and out-of-scope list", "Estimates", "High-level design with a queue, preferences and idempotency"],
      hints: ["Users choose channels and quiet hours; providers fail and rate-limit."],
      solution: {
        text: [
          "Events (LessonPublished, StreakAtRisk, MentorReplied) → notification service reads user preferences and quiet hours → per-channel queues (email, push, in-app) with idempotency keys per (user, event) → channel workers calling providers with retries, backoff and DLQs. In-app notifications stored per user with cursor pagination and unread counts in Redis. Estimates: 100k DAU × 3 notifications/day ≈ 3.5/s average, bursts when a lesson is published to all users, smoothed by the queue.",
        ],
      },
    },
    intermediate: {
      title: "Mock interview: design a typeahead",
      brief: ["Design search autocomplete for DevAtlas (lessons, terms) at 2,000 QPS with p99 < 50 ms. Record yourself or write the answer following the framework; include data structures (lesson 2.3.3), caching, updating suggestions and personalisation."],
      criteria: ["All framework steps", "Top-K per prefix strategy", "Freshness/update pipeline"],
      hints: ["Precompute top-K per prefix offline; serve from memory; debounce on the client."],
      solution: {
        text: ["Offline job aggregates query logs and content into top-K suggestions per prefix (trie with cached top-K or a KV map prefix → list), published to stateless suggestion servers that load it into memory; clients debounce (lesson 1.2.2) and cache; CDN can cache short prefixes; personalisation re-ranks the top 50 using the user's recent topics. Updates roll out by versioned snapshots every hour."],
      },
    },
    challenge: {
      title: "Design a distributed job scheduler",
      brief: ["Design a service that runs millions of scheduled jobs (like the weekly digest and feed refreshes) at the right time with at-least-once execution and no job running twice concurrently. Cover storage, polling vs timing wheels, leader election or partitioning, and failure recovery."],
      criteria: ["Correctness guarantees stated", "Scaling approach", "Failure scenarios handled"],
      hints: ["Partition jobs by id across workers; claim jobs with a lease (visibility timeout)."],
      solution: {
        text: [
          "Store jobs (id, next_run_at, payload, lease_owner, lease_expires) partitioned by id. Workers own partitions (via a coordination service or consistent hashing), poll due jobs with an index on next_run_at, and claim them with a conditional update setting a lease. Execution is at-least-once, so jobs are idempotent; leases expire if a worker dies and another worker retries. Recurring jobs compute the next run after success. Managed alternatives: cloud schedulers + queues, Temporal, Kubernetes CronJobs for small scale.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: design docs for chat and feed",
      brief: ["Add docs/design/chat.md (learner–mentor chat) and docs/design/feed.md (news feed with topics) to DevAtlas following the framework, with Mermaid diagrams, estimates, alternatives and rollout plans."],
      criteria: ["Both docs complete", "Diagrams render on GitHub", "Reviewed by a peer (or AI reviewer) with comments addressed"],
      hints: ["Keep each under three pages; link ADRs for major decisions."],
      solution: {
        text: ["Design docs are portfolio pieces that demonstrate senior-level thinking; link them from the project README."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "High Scalability: real architectures", url: "https://highscalability.com/" },
    { label: "Google SRE Book (free online)", url: "https://sre.google/sre-book/table-of-contents/" },
  ],
  nextPreview: "Next phase: AI engineering. How LLMs really work: tokens, embeddings, attention and sampling, and what that means for cost, latency and hallucinations.",
};
