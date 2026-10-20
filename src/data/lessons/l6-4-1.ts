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
          "The doc follows the framework: requirements with an explicit out-of-scope list, estimates (the burst after a lesson is published, not the 3.5/s average, sizes the system), API and data model, a high-level design with per-channel queues, preferences and quiet hours, and idempotency keys per (event, user, channel).",
          "Failure modes are listed per dependency, and the trade-offs section says when the design would change: one service with per-channel queues is enough at this volume.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/notifications.md",
          code: `# Design: DevAtlas notifications

Author: Asha · Status: in review · Reviewers: platform, mobile

## 1. Requirements

**Functional**
- Notify learners when (a) a lesson they follow is published, (b) their streak is at risk (no activity by 19:00 local time), (c) a mentor replies to their question.
- Channels: in-app (bell + unread count), email, mobile push. Users choose channels per notification type and set quiet hours (default 22:00 to 08:00 local).
- In-app history: newest first, paginated, mark as read.

**Non-functional**
- Mentor replies delivered in-app within 5 s p95, push/email within 60 s.
- Never send the same notification twice on the same channel (dedupe), never during the user's quiet hours (none of these notifications is urgent enough to override them).
- A provider outage (email or push) must not block the other channels or the API.

**Out of scope:** SMS, marketing campaigns, per-device notification settings, digest emails (the weekly digest already exists).

## 2. Estimates

| | Value |
|---|---|
| DAU | 100,000 (registered 400,000) |
| Notifications per active user per day | 3 → 300,000/day ≈ **3.5/s average** |
| Burst: lesson published to followers | up to 400,000 in one go; drained at 500/s → ~13 minutes |
| Streak-at-risk job | ~40,000 users/day, spread by time zone (19:00 local) |
| In-app storage | 300,000 × 300 bytes ≈ 90 MB/day; keep 90 days ≈ **8 GB** |
| Email volume | ~60,000/day (most users choose email only for mentor replies) |

The burst, not the average, sizes the system: the queue absorbs it and workers drain it at the providers' rate limits.

## 3. API and data model

- \`GET /v1/notifications?cursor=…&limit=20\`, \`POST /v1/notifications/read {ids}\`, \`GET/PUT /v1/me/notification-preferences\`
- \`notifications(id, user_id, type, payload_json, created_at, read_at)\`, index \`(user_id, created_at DESC)\`
- \`notification_preferences(user_id, type, channels_mask, quiet_start, quiet_end, timezone)\`
- \`deliveries(idempotency_key PRIMARY KEY, channel, status, attempts, last_error)\` where \`idempotency_key = sha256(event_id | user_id | channel)\`
- Redis: \`unread:{user_id}\` counter (INCR on create, reset on read)

## 4. High-level design

\`\`\`
LessonPublished / MentorReplied events ─┐
Streak scheduler (every 15 min per TZ) ─┴─▶ Notification service
        reads preferences + quiet hours, expands followers in batches of 1,000
        writes in-app row + INCR unread  ──▶ WebSocket/SSE push to open tabs
        enqueues per channel ──▶ [email queue] ─▶ email worker ─▶ email provider
                              └▶ [push queue]  ─▶ push worker  ─▶ APNs / FCM
        failures after 5 attempts (backoff 1 s → 5 min) ─▶ DLQ + alert
\`\`\`

- **Idempotency:** each worker does \`INSERT INTO deliveries … ON CONFLICT DO NOTHING\` before calling the provider; a redelivered message with an existing \`sent\` row is acknowledged and skipped.
- **Quiet hours:** messages that fall inside them are enqueued with a delay until \`quiet_end\` (queue delay feature), not dropped.
- **Rate limits:** workers use a token bucket per provider (e.g. 100 emails/s) so bursts never trigger provider throttling.

## 5. Failure modes

| Failure | Behaviour |
|---|---|
| Email provider down | email queue grows; in-app and push unaffected; alert when queue age > 10 min |
| Duplicate event delivery | idempotency key → second send skipped |
| Notification service crash mid-fan-out | follower batches are checkpointed by last user_id; restart resumes |
| Push token invalid (app uninstalled) | provider returns "unregistered" → delete token, no retry |
| Redis down | unread count falls back to \`COUNT(*)\` on unread rows (indexed), slower but correct |

## 6. Trade-offs and evolution

- One service with per-channel queues instead of a service per channel: less to run at 3.5/s; split a channel only if its volume or team ownership demands it.
- Fan-out on write for in-app rows is cheap at 400k users; above ~5M followers per lesson, store one row per lesson and merge at read time (the news-feed hybrid).`,
        },
      },
    },
    intermediate: {
      title: "Mock interview: design a typeahead",
      brief: ["Design search autocomplete for DevAtlas (lessons, terms) at 2,000 QPS with p99 < 50 ms. Record yourself or write the answer following the framework; include data structures (lesson 2.3.3), caching, updating suggestions and personalisation."],
      criteria: ["All framework steps", "Top-K per prefix strategy", "Freshness/update pipeline"],
      hints: ["Precompute top-K per prefix offline; serve from memory; debounce on the client."],
      solution: {
        text: [
          "The estimate decides the design: the whole suggestion index is about 72 MB, so it fits in memory on every server and the read path needs no database. Top-K per prefix is precomputed offline, so serving is a dictionary lookup and p99 is dominated by the network.",
          "Freshness comes from an hourly versioned snapshot swapped atomically, with a privacy filter (minimum distinct users) on query logs. Personalisation re-ranks the top 50 per prefix. The embedded `build_index` function was run on a small sample to check it returns the expected top-K lists.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/typeahead.md",
          code: `# Design: search typeahead for DevAtlas

Format: 45-minute interview answer, written out · Target: 2,000 QPS, p99 < 50 ms server-side

## 1. Requirements (5 min)

**Functional:** as the learner types in the search box, show up to 8 suggestions: lesson titles, glossary terms (e.g. "idempotency"), and popular past queries. Prefix match, case-insensitive. Selecting a suggestion opens the lesson or runs the search.

**Non-functional:** p99 < 50 ms at the server (the client adds debounce + network), 2,000 QPS peak, available even if the search backend is down (suggestions are a convenience), new lessons appear within 1 hour, no offensive or private queries ever suggested.

**Out of scope:** typo tolerance beyond simple normalisation, full-text search results (separate service), multi-language.

## 2. Estimates (5 min)

| | Value |
|---|---|
| Suggestion corpus | 1,200 lesson titles + 3,000 terms + 50,000 popular queries ≈ **55,000 terms** |
| Prefixes (up to 12 chars) | ≈ 55,000 × 8 distinct ≈ 440,000, many shared → ~300,000 |
| Index size | 300,000 prefixes × top 10 × ~24 bytes ≈ **72 MB**: fits in memory on every server |
| Traffic | 2,000 QPS peak; with a 150 ms client debounce, one search session ≈ 3 requests |
| Query logs | 5M queries/day × 50 bytes = 250 MB/day for the aggregation job |

72 MB in RAM means no database on the read path: the whole problem becomes "build a good index offline, serve it from memory".

## 3. API and data model (5 min)

- \`GET /v1/suggest?q=doc&limit=8\` → \`[{"text": "Docker", "type": "lesson", "id": "9.1.1"}, …]\`, \`Cache-Control: public, max-age=300\`
- Index snapshot: \`prefix → [suggestion ids]\` plus \`id → {text, type, target}\`, versioned (\`suggest-2026-10-18T14.bin\`) in object storage.

## 4. High-level design (10 min)

\`\`\`
query logs ─┐                                         ┌▶ suggestion server ×3 (index in memory)
lessons    ─┼▶ hourly build job ─▶ snapshot in S3 ─────┤        ▲
glossary   ─┘   (aggregate, filter, score, top-K)      └▶ ...    │ GET /v1/suggest
                                                    browser ─▶ CDN (short prefixes cached) ─▶ LB
\`\`\`

- **Score:** \`0.6 × log(query count, 7 days, time-decayed) + 0.3 × lesson popularity + 0.1 × freshness boost\` for lessons published in the last 14 days.
- **Top-K per prefix, precomputed** (lesson 2.3.3: a trie with cached top-K at each node, flattened to a hash map for O(1) lookup). Lookup is one dictionary read: microseconds, so p99 is dominated by the network.
- **Client:** debounce 150 ms, cancel in-flight requests (AbortController), cache results per prefix for the session, start at 2 characters.
- **CDN:** 1 and 2-character prefixes (~1,300 keys) take ~40% of traffic and are identical for everyone; cache them at the edge for 5 minutes.

\`\`\`python
import heapq
from collections import defaultdict


def build_index(scores: dict[str, float], k: int = 10, max_prefix: int = 12) -> dict[str, list[str]]:
    """prefix -> top-k suggestions by score; built offline, served from memory."""
    buckets: defaultdict[str, list[tuple[float, str]]] = defaultdict(list)
    for term, score in scores.items():
        t = term.lower()
        for n in range(1, min(len(t), max_prefix) + 1):
            heap = buckets[t[:n]]
            heapq.heappush(heap, (score, term))
            if len(heap) > k:
                heapq.heappop(heap)                    # keep only the k best per prefix
    return {p: [t for _, t in sorted(h, reverse=True)] for p, h in buckets.items()}
\`\`\`

## 5. Deep dives (15 min)

**Freshness pipeline.** Hourly job: read the last 7 days of query logs, drop queries seen from fewer than 20 distinct users (privacy: no one-off queries containing names or emails), drop anything matching the blocklist, merge with lesson titles and terms, score, build top-10 per prefix, write a versioned snapshot. Servers poll for a new version every minute and swap it atomically (build the new dict, then replace one reference), so there is never a half-loaded index. A new lesson therefore appears in at most ~61 minutes; if product wants instant, the publish event can also push the title into a small "recent" overlay merged at read time.

**Personalisation.** Fetch top 50 for the prefix instead of top 8, then re-rank in the server using the learner's current phase and the topics of their last 10 lessons (sent as a compact claim or fetched from a 1-hour Redis cache). Cost: ~0.2 ms of CPU per request; disables CDN caching for logged-in users at 3+ characters, which is acceptable at 2,000 QPS.

**Hot prefixes and failure.** Every server holds the full index, so there are no hot shards. If the snapshot store is down, servers keep serving the last snapshot. If all suggestion servers are down, the client hides the dropdown; search itself still works.

## 6. Trade-offs and evolution

- Precomputed top-K trades freshness (up to 1 hour) and memory for constant-time reads; real-time counting (Redis sorted set per prefix) would be fresher but costs one sorted-set write per prefix of every search (~8 per query, 40M writes/day at 5M queries) and a Redis round trip on every keystroke.
- At 10× corpus (550k terms, ~720 MB) the index still fits in memory on a 2 GB instance; at 100× shard by first two characters and route at the load balancer.
- Measure: suggestion click-through rate, p99 latency, % of searches that used a suggestion.`,
        },
      },
    },
    challenge: {
      title: "Design a distributed job scheduler",
      brief: ["Design a service that runs millions of scheduled jobs (like the weekly digest and feed refreshes) at the right time with at-least-once execution and no job running twice concurrently. Cover storage, polling vs timing wheels, leader election or partitioning, and failure recovery."],
      criteria: ["Correctness guarantees stated", "Scaling approach", "Failure scenarios handled"],
      hints: ["Partition jobs by id across workers; claim jobs with a lease (visibility timeout)."],
      solution: {
        text: [
          "State the guarantees first: at-least-once execution with idempotent handlers, and leases so a job runs on one healthy worker at a time. Exactly-once is not achievable when a worker can die after doing the work and before recording it.",
          "Jobs live in PostgreSQL, partitioned into 64 logical partitions that workers lease, so there is no leader to elect. Workers claim due jobs with `FOR UPDATE SKIP LOCKED` and a lease, and complete them only if they still hold the lease. The claim and completion SQL was run on PostgreSQL 16: two concurrent claimers got disjoint jobs, an expired lease was reclaimed by another worker, and the stale owner's completion updated 0 rows.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/job-scheduler.md",
          code: `# Design: distributed job scheduler

Status: proposal · Replaces: cron entries on one VM (single point of failure, no retries)

## 1. Requirements

**Functional:** register one-off and recurring jobs (cron syntax), run each at its time, retry failures with backoff, pause/cancel, see history. Current users: weekly digest (400k users, one job per user), feed refresh (every 15 min per topic, ~200 topics), streak reminders, lesson re-embedding.

**Guarantees (stated up front, because everything else follows from them):**
- **At-least-once execution.** Exactly-once is impossible when a worker can die after doing the work but before recording it, so every job handler must be idempotent (digest send keyed by \`user_id + ISO week\`).
- **No concurrent duplicates while the owner is healthy:** a job is claimed with a lease; only the lease holder may complete it.
- **Timeliness:** start within 30 s of \`next_run_at\` at p99.

**Out of scope:** DAG workflows with dependencies (use Temporal if needed), sub-second precision.

## 2. Estimates

| | Value |
|---|---|
| Stored jobs | ~1M (400k digest + 400k reminder + small rest), ~1 KB each → 1 GB |
| Peak firing rate | digest batch: 400k jobs spread over 1 hour (by time zone) ≈ 110/s; normal ≈ 20/s |
| Job duration | 50 ms (email enqueue) to 5 min (re-embedding) |

110 claims/s is easily handled by one PostgreSQL primary; the hard part is correctness under failure, not throughput.

## 3. Design

\`\`\`
API (create / pause / cancel) ──▶ jobs table in PostgreSQL, 64 logical partitions
                                     ▲ claim due jobs every 1 s (lease)
              worker-1 (partitions 0-31)     worker-2 (partitions 32-63)
                     │ run handler                  │ run handler
                     ▼                              ▼
          queues, email, embeddings ...    job_runs history (for the UI)
\`\`\`

**Polling vs timing wheel.** Workers poll an index on \`(partition_no, next_run_at)\` every second. A timing wheel in memory would be more precise, but needs its own persistence and rebuild-on-restart logic; with a 30 s timeliness target, polling an index is simpler and cheap (one index range scan per second per worker).

**Partitioning instead of leader election.** Each job gets \`partition_no = id % 64\`. Workers take partitions through a lease table (\`partition_owner\`, renewed every 10 s, expires after 30 s), so when a worker dies its partitions move within 30 s and when one is added it takes free partitions. There is no single leader to fail over; the database's row locks are the coordination mechanism.

\`\`\`sql
CREATE TABLE jobs (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    partition_no  smallint    NOT NULL,              -- id % 64, owned by one worker group
    kind          text        NOT NULL,              -- 'weekly_digest', 'feed_refresh', ...
    payload       jsonb       NOT NULL,
    schedule      text,                              -- cron expression; NULL = one-off
    next_run_at   timestamptz NOT NULL,
    lease_owner   text,
    lease_expires timestamptz,
    attempts      int         NOT NULL DEFAULT 0
);
CREATE INDEX jobs_due ON jobs (partition_no, next_run_at);

-- Claim up to 100 due jobs in my partitions; a lease (not a lock held during execution) marks them taken.
WITH due AS (
    SELECT id FROM jobs
    WHERE partition_no = ANY($1)                     -- partitions this worker owns
      AND next_run_at <= now()
      AND (lease_expires IS NULL OR lease_expires < now())   -- free, or the previous owner died
    ORDER BY next_run_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED                           -- concurrent claimers never wait on each other
)
UPDATE jobs j
SET lease_owner = $2, lease_expires = now() + interval '5 minutes', attempts = attempts + 1
FROM due WHERE j.id = due.id
RETURNING j.id, j.kind;

-- On success: release the lease and schedule the next run (only if I still own it).
UPDATE jobs SET lease_owner = NULL, lease_expires = NULL, attempts = 0, next_run_at = $3
WHERE id = $4 AND lease_owner = $2;
\`\`\`

\`FOR UPDATE SKIP LOCKED\` lets two workers claim at the same moment without blocking or double-claiming. Verified on PostgreSQL 16: two claimers get disjoint rows, an expired lease is reclaimed by another worker, and the stale owner's completion update matches 0 rows.

## 4. Failure scenarios

| Scenario | What happens |
|---|---|
| Worker crashes mid-job | lease expires after 5 min; another worker reclaims and re-runs it (idempotent handler) |
| Job runs longer than the lease | worker renews the lease every 100 s while running; if renewal fails (it lost ownership), it aborts the job |
| Worker paused (GC, network) then resumes | its completion \`UPDATE … WHERE lease_owner = me\` matches 0 rows, so it cannot overwrite the new owner's result |
| Handler keeps failing | \`next_run_at = now() + 2^attempts × 10 s\` (max 1 h); after 8 attempts move to \`failed\`, alert, show in UI |
| Database primary fails over | workers retry connections; jobs due during the ~30 s outage run late, none are lost (state is in the DB) |
| Thundering herd at 00:00 Monday | digest jobs are created with \`next_run_at\` spread across the hour (by time zone + \`user_id % 60\` minutes) |

## 5. Scaling and alternatives

- **10× (1,100 claims/s):** still one primary; increase claim batch size to 500 and add workers. **100×:** move partitions to separate databases (partition_no → shard) or switch to a queue with delayed delivery.
- **Managed alternatives:** cloud scheduler + queue (EventBridge Scheduler + SQS, Cloud Scheduler + Pub/Sub), Temporal for long workflows, Kubernetes CronJobs for a handful of jobs. We build this because we already run PostgreSQL and need per-user jobs at 1M scale, which cron-style tools do not model well.
- **Metrics:** due-but-unclaimed jobs (lag), claim-to-start latency p99, failures by kind, lease expiries (a rising count means jobs outgrow their lease).`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: design docs for chat and feed",
      brief: ["Add docs/design/chat.md (learner–mentor chat) and docs/design/feed.md (news feed with topics) to DevAtlas following the framework, with Mermaid diagrams, estimates, alternatives and rollout plans."],
      criteria: ["Both docs complete", "Diagrams render on GitHub", "Reviewed by a peer (or AI reviewer) with comments addressed"],
      hints: ["Keep each under three pages; link ADRs for major decisions."],
      solution: {
        text: [
          "Two short docs, each following the framework: requirements, estimates that justify not using heavyweight infrastructure (15 messages/s; 3.5 feed reads/s), a Mermaid diagram, alternatives with their trade-offs, a staged rollout behind flags with success metrics, and a review log showing comments and how they were addressed. Both Mermaid diagrams (a `sequenceDiagram` and a `flowchart`) were rendered with mermaid-cli to check they parse.",
          "The chat design picks SSE plus POST over WebSockets because traffic is low and mostly one-way at a time; the feed uses one timeline per topic because topics are few and followers many, the opposite of a social network. Design docs are portfolio pieces that demonstrate senior-level thinking; link them from the project README.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/chat.md + docs/design/feed.md",
          code: `<!-- ===================== docs/design/chat.md ===================== -->
# Design: learner–mentor chat

Status: approved 2026-10-14 · ADRs: 0007 (SSE vs WebSocket), 0008 (messages in PostgreSQL)

## Requirements
- 1:1 conversations between a learner and an assigned mentor; text + code blocks + lesson links; history; read receipts; unread badge.
- New message visible to an online recipient in < 1 s p95; offline mentor gets a push/email after 2 minutes unread.
- Messages never lost once the sender sees "sent"; ordered per conversation; no duplicates on screen.
- Out of scope: group chat, file uploads, voice, end-to-end encryption (messages are moderated).

## Estimates
| | Value |
|---|---|
| Learners with a mentor / mentors | 20,000 / 400 |
| Messages | 20,000 × 4/day = 80,000/day ≈ 1/s average, 15/s peak (evening) |
| Concurrent connections | 6,000 at peak (learners online with the chat panel open) |
| Storage | 80,000 × 1 KB × 365 ≈ 29 GB/year |

15 messages/s and 6,000 connections fit on two gateway pods and the existing PostgreSQL. No Kafka, no Cassandra.

## Design
\`\`\`mermaid
sequenceDiagram
  participant L as Learner (browser)
  participant G as Chat gateway (SSE)
  participant C as Chat API
  participant DB as PostgreSQL
  participant R as Redis pub/sub
  participant M as Mentor (browser)
  L->>C: POST /conversations/42/messages {client_id}
  C->>DB: INSERT ... seq = last_seq + 1 (ON CONFLICT client_id DO NOTHING)
  C-->>L: 201 {id, seq}
  C->>R: PUBLISH conv:42 {id, seq, body}
  R->>G: message for subscribers of conv:42
  G-->>M: SSE event (id = seq)
  M->>C: POST /conversations/42/read {up_to_seq}
\`\`\`

- **Transport: SSE down, HTTPS POST up** (ADR-0007). Chat is low-volume and mostly one direction at a time; SSE works through our proxies and CDN, reconnects automatically with \`Last-Event-ID\`, and the gateway resends messages with \`seq\` greater than it.
- **Ordering and dedupe:** \`seq\` assigned in the same transaction as the insert (\`UPDATE conversations SET last_seq = last_seq + 1 … RETURNING last_seq\`); clients send a \`client_id\` UUID, unique per conversation, so retried POSTs do not create duplicates.
- **Data:** \`messages(conversation_id, seq, id, sender_id, body, created_at)\` PK \`(conversation_id, seq)\`; history via \`WHERE conversation_id = $1 AND seq < $cursor ORDER BY seq DESC LIMIT 50\`.
- **Offline notification:** a delayed job (scheduler from the challenge) fires 2 minutes after a message; it sends a push only if \`read_up_to < seq\`.

## Alternatives considered
| Option | Why not (now) |
|---|---|
| WebSockets | bidirectional power we do not need; sticky connections and custom reconnect logic |
| Polling every 5 s | 6,000 clients → 1,200 requests/s mostly empty, and 2.5 s average delay |
| Managed chat SaaS | ~$0.05 per MAU (~$1,000/month) and moderation data leaves our system |

## Rollout
1. Behind flag \`chat_v1\` for 5 mentors and 100 learners; dashboards: delivery latency p95, reconnects/min, unread notifications sent.
2. 25% of mentor pairs after one week with no message loss (reconciliation job compares DB counts with client acks).
3. 100%; remove the email-based "ask your mentor" form after 30 days.

## Review log
- *Reviewer (Ravi): "What if Redis pub/sub drops a message?"* → Addressed: pub/sub is only a fast path; on reconnect or a \`seq\` gap the client fetches missing messages from the API.
- *Reviewer (AI review): "seq increments can contend on hot conversations."* → Accepted risk: a 1:1 conversation peaks at a few messages/s; row-lock contention is negligible.

<!-- ===================== docs/design/feed.md ===================== -->
# Design: news feed with topics

Status: approved 2026-10-16 · Builds on: news ingester (ADR-0004)

## Requirements
- Personal feed of tech-news articles and new lessons for topics a learner follows (e.g. "Kubernetes", "Rust", "AI"); newest and most relevant first; infinite scroll.
- Feed loads in < 300 ms p95; an ingested article appears within 15 minutes.
- Out of scope: user posts, comments, following people.

## Estimates
| | Value |
|---|---|
| Articles ingested | 3,000/day from 400 sources, ~40 topics |
| Followers per topic | median 8,000; "AI" has 180,000 |
| Feed reads | 100,000 DAU × 3 opens = 300,000/day ≈ 3.5/s, peak 20/s |
| Fan-out on write cost | 3,000 articles × avg 3 topics × 8,000 followers ≈ 72M feed inserts/day: too many for little benefit |

## Design
\`\`\`mermaid
flowchart LR
  ing[Rust ingester] -->|NewsIngested| tag[AI tagger]
  tag --> mongo[(MongoDB articles)]
  tag --> tl[(Redis: topic timelines<br/>ZSET per topic, last 1,000)]
  user([Learner]) --> api[Feed API]
  api -->|followed topics| prefs[(MySQL preferences)]
  api -->|ZREVRANGEBYSCORE per topic| tl
  api -->|merge + rank top 20| cache[(Redis: feed page cache 60 s)]
\`\`\`

- **Fan-out on read per topic.** Topics are few (40) and followers many, the opposite of a social network, so we store one timeline per topic, not one per user. A feed request merges the followed topics' timelines (a learner follows 6 on average → 6 \`ZREVRANGEBYSCORE\` calls in one pipeline, ~2 ms).
- **Ranking:** \`score = recency decay (half-life 18 h) × source quality (0.5–1.0) × 1.3 if it matches the learner's current phase\`; dedupe articles tagged with several followed topics.
- **Pagination:** cursor = \`(score, article_id)\` of the last item, stable while new articles arrive.

## Alternatives considered
| Option | Trade-off |
|---|---|
| Fan-out on write per user | fastest reads, but 72M inserts/day and storage per user for 3.5 reads/s |
| Query MongoDB per request | simplest; 120 ms p95 measured for a 6-topic \`$in\` sort, OK today but no room for ranking |
| Hybrid topic timelines (chosen) | ~2 ms merge, 40 small ZSETs (≈ 40 × 1,000 × 50 B = 2 MB) |

## Rollout
1. Shadow mode: compute the new feed for 5% of users and log overlap with the current chronological list.
2. A/B 50/50 for two weeks; success = +10% article click-through without lower lesson starts.
3. Ship; keep the chronological view as a "Latest" tab.

## Review log
- *Reviewer (Meera): "AI topic has 180k followers; is that a hot key?"* → Addressed: reads of one ZSET at 20 req/s are trivial for Redis; plus 60 s page cache.
- *Reviewer (AI review): "What if Redis is flushed?"* → Addressed: timelines rebuild from MongoDB (last 7 days) on startup in ~10 s; feed falls back to the MongoDB query meanwhile.`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "Video: TinyURL / URL shortener system design (codeKarle, 2020)", url: "https://www.youtube.com/watch?v=AVztRY77xxA" },
    { label: "Video: Rate limiter system design, token bucket and leaky bucket (ByteByteGo, 2025)", url: "https://www.youtube.com/watch?v=YXkOdWBwqaA" },
    { label: "System Design Primer: Design Pastebin.com (or Bit.ly)", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md" },
    { label: "High Scalability: real architectures", url: "https://highscalability.com/" },
    { label: "Google SRE Book (free online)", url: "https://sre.google/sre-book/table-of-contents/" },
  ],
  nextPreview: "Next phase: AI engineering. How LLMs really work: tokens, embeddings, attention and sampling, and what that means for cost, latency and hallucinations.",
};
