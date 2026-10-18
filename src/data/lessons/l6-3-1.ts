import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.1",
  title: "Scaling, CAP, load balancing and caching layers",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.2.1 Monolith, microservices, events and CQRS", "5.4.1 Migrations, backups, replication and sharding"],
  summary: "Reason about scale with numbers: back-of-envelope estimates, latency budgets and percentiles, horizontal vs vertical scaling, load balancing algorithms and health checks, multi-layer caching, and consistency trade-offs (CAP/PACELC).",
  terms: [
    { term: "Throughput", def: "Work done per unit of time, e.g. requests per second (RPS)." },
    { term: "Latency percentiles", def: "p50 is the median; p99 means 99% of requests are faster. Tail latency (p99) is what unhappy users feel." },
    { term: "Vertical vs horizontal scaling", def: "Vertical: a bigger machine. Horizontal: more machines behind a load balancer." },
    { term: "Stateless service", def: "A service that keeps no per-user state in memory between requests, so any instance can serve any request." },
    { term: "Load balancer", def: "Distributes requests across instances (L4: TCP connections; L7: HTTP-aware routing) and removes unhealthy ones." },
    { term: "CAP theorem", def: "During a network partition, a distributed data system must choose between consistency and availability." },
    { term: "Little's law", def: "Average items in a system = arrival rate × average time in the system (L = λ × W). Useful for sizing concurrency." },
  ],
  problem: [
    "A partner school will send 50,000 students to DevAtlas on the first day of term. The team must answer before then: how many API instances, database connections and how much cache memory are needed? Where does the time go in a request? What breaks first?",
    "Guessing leads to either outages or wasted money. Engineers who can estimate with simple arithmetic, design stateless tiers behind load balancers, and add the right caches at the right layers can answer these questions in an afternoon and verify them with a load test.",
  ],
  concept: {
    analogy: [
      "Scaling a service is like running **checkout lanes in a supermarket**. Vertical scaling hires a faster cashier; horizontal scaling opens more lanes, and the load balancer is the person directing shoppers to the shortest line (and closing lanes whose cashier fainted). Caching is **putting the most popular items by the door** so most shoppers never walk to the back of the store (the database).",
    ],
    precise: [
      "**Estimate first**: daily active users × requests per user per day ÷ 86,400 ≈ average RPS; multiply by a peak factor (often 3–10×). Combine with per-request cost (CPU ms, DB queries, bytes) to size instances, connections, storage and bandwidth. Use powers of ten and round aggressively; the goal is order of magnitude.",
      "**Latency budget**: break a target (e.g. p99 300 ms) into parts: network, gateway, app, cache, database, downstream calls. Sequential calls add up; parallel calls cost the slowest. Track percentiles, not averages.",
      "**Horizontal scaling** requires stateless app servers (sessions in cookies/Redis, files in object storage), a load balancer with health checks, and connection limits to shared resources (database pools). The database is usually the hardest tier to scale: caches and read replicas first, then partitioning/sharding.",
      "**Caching layers**: browser (Cache-Control), CDN (static and cacheable API responses), application/in-process cache, distributed cache (Redis), database buffer cache. Each layer trades freshness for speed. **CAP/PACELC**: during partitions choose consistency (reject or block) or availability (serve possibly stale data); else (normal operation) choose between latency and consistency. Most systems pick per operation: strong consistency for payments, eventual for feeds and counters.",
    ],
  },
  underTheHood: {
    text: [
      "Little's law sizes concurrency: at 2,000 RPS with 50 ms average time in the database, about 100 queries are in flight on average, so pools and database max_connections must handle that (plus peaks) across all instances.",
      "Load-balancing algorithms: round robin (simple), least connections / least outstanding requests (better for uneven request costs), consistent hashing (stickiness for caches, minimal reshuffling when nodes change). Health checks remove failing instances; readiness checks keep instances out until warmed up.",
      "Queueing theory in one sentence: as utilisation approaches 100%, waiting time grows sharply (non-linearly). Keep steady-state CPU and connection pool utilisation well below saturation (often 50–70%) to absorb spikes.",
    ],
    diagram: {
      title: "Request path with caching layers",
      nodes: [
        { label: "Browser cache", sub: "Cache-Control" },
        { label: "CDN edge", sub: "static + cacheable API" },
        { label: "Load balancer", sub: "health checks" },
        { label: "Stateless app ×N", sub: "in-process cache" },
        { label: "Redis", sub: "shared cache" },
        { label: "DB primary + replicas", sub: "source of truth" },
      ],
      edges: ["miss", "miss", "", "miss", "miss"],
    },
  },
  handsOn: [
    {
      title: "Back-of-envelope sizing in code",
      code: {
        lang: "python",
        file: "estimate.py",
        code: `import math

dau = 50_000                    # daily active learners after the school launch
requests_per_user = 120         # page loads, API calls, quiz submissions
peak_factor = 6                 # everyone logs in at 9 a.m.
cpu_ms_per_request = 8          # measured from profiling
cores_per_instance = 2
target_utilisation = 0.6        # headroom for spikes
db_queries_per_request = 3
cache_hit_rate = 0.8            # fraction of DB reads served by Redis
db_time_ms = 4                  # average per query

avg_rps = dau * requests_per_user / 86_400
peak_rps = avg_rps * peak_factor
cpu_cores = peak_rps * cpu_ms_per_request / 1000 / target_utilisation
instances = math.ceil(cpu_cores / cores_per_instance) + 1        # +1 for redundancy (N+1)
db_qps = peak_rps * db_queries_per_request * (1 - cache_hit_rate)
db_in_flight = db_qps * db_time_ms / 1000                         # Little's law

print(f"average RPS      {avg_rps:8.0f}")
print(f"peak RPS         {peak_rps:8.0f}")
print(f"app instances    {instances:8d}")
print(f"DB queries/sec   {db_qps:8.0f}")
print(f"DB in flight     {db_in_flight:8.1f}")`,
      },
      output: "average RPS            69\npeak RPS              417\napp instances           4\nDB queries/sec        250\nDB in flight          1.0",
      notes: ["Conclusion: this launch is comfortably handled by a few instances; the numbers tell you where to focus (the cache hit rate is the biggest lever on database load). Always validate estimates with a load test."],
    },
    {
      title: "Why percentiles, not averages",
      code: {
        lang: "python",
        code: `import random, statistics

random.seed(1)
latencies = [random.gauss(80, 15) for _ in range(990)] + [random.uniform(800, 2000) for _ in range(10)]   # 1% slow
latencies.sort()

def pct(p: float) -> float:
    return latencies[int(len(latencies) * p) - 1]

print(f"mean {statistics.mean(latencies):.0f} ms | p50 {pct(0.50):.0f} | p95 {pct(0.95):.0f} | p99 {pct(0.99):.0f} | max {latencies[-1]:.0f}")`,
      },
      output: "mean 94 ms | p50 80 | p95 105 | p99 121 | max 1962",
      notes: ["Exact numbers depend on the random seed and how a percentile is defined; the pattern is what matters: the mean hides the slow tail. With many backend calls per page, the chance of hitting a slow one grows quickly, so tail latency dominates user experience."],
    },
    {
      title: "Load balancer + stateless app with Docker Compose and NGINX",
      code: {
        lang: "text",
        file: "nginx.conf",
        code: `upstream api {
    least_conn;                              # send to the instance with fewest active connections
    server api1:8080 max_fails=3 fail_timeout=10s;
    server api2:8080 max_fails=3 fail_timeout=10s;
    server api3:8080 max_fails=3 fail_timeout=10s;
}

server {
    listen 80;
    location / {
        proxy_pass http://api;
        proxy_next_upstream error timeout http_502 http_503;   # retry another instance (safe for idempotent requests)
        proxy_connect_timeout 2s;
        proxy_read_timeout 10s;
    }
}`,
      },
      notes: ["Cloud load balancers (AWS ALB, Azure Application Gateway / Front Door, Google Cloud Load Balancing) and Kubernetes Services do the same with managed health checks (lesson 9.4.1)."],
    },
    {
      title: "Consistent hashing: adding a cache node moves only a fraction of keys",
      code: {
        lang: "python",
        file: "consistent_hash.py",
        code: `import bisect, hashlib

def h(key: str) -> int:
    return int(hashlib.md5(key.encode()).hexdigest(), 16)

class Ring:
    def __init__(self, nodes: list[str], vnodes: int = 100) -> None:
        self.ring = sorted((h(f"{n}#{i}"), n) for n in nodes for i in range(vnodes))
        self.points = [p for p, _ in self.ring]
    def node_for(self, key: str) -> str:
        i = bisect.bisect(self.points, h(key)) % len(self.ring)
        return self.ring[i][1]

keys = [f"lesson:{i}" for i in range(10_000)]
before = Ring(["cache-a", "cache-b", "cache-c"])
after = Ring(["cache-a", "cache-b", "cache-c", "cache-d"])
moved = sum(before.node_for(k) != after.node_for(k) for k in keys)

modulo_moved = sum(h(k) % 3 != h(k) % 4 for k in keys)
print(f"consistent hashing moved {moved / len(keys):.0%} of keys; modulo hashing moved {modulo_moved / len(keys):.0%}")`,
      },
      output: "consistent hashing moved 27% of keys; modulo hashing moved 75%",
      notes: ["The ideal for 3→4 nodes is 1/4 (25%) of keys moving; 27% is close, and more virtual nodes bring it closer."],
    },
  ],
  companies: [
    "**Capacity planning** before launches and seasonal peaks (sales, exam season, sports events) combines estimates like the above with load tests (k6, JMeter, Locust, Gatling) and pre-scaling, since autoscaling reacts with a delay.",
    "**SLOs on percentiles**: teams define objectives such as 'p99 < 300 ms for 99.9% of minutes' and alert on burn rate (lesson 9.6.1), because averages hide user pain.",
    "**Consistency per operation**: e-commerce sites show eventually consistent recommendations and review counts but use strongly consistent paths for payments and inventory; social feeds tolerate seconds of staleness.",
  ],
  mistakes: [
    { mistake: "Scaling without measuring", why: "Assuming the app servers are the bottleneck", wrong: "More instances overload the database; costs rise, latency does not improve", fix: "Profile and find the saturated resource first" },
    { mistake: "Stateful app servers", why: "In-memory sessions and uploads on local disk", wrong: "Users lose sessions on scale-in; sticky sessions unbalance load", fix: "Sessions in cookies/Redis; files in object storage" },
    { mistake: "Reporting averages", why: "Easy to compute", wrong: "Tail latency problems stay invisible", fix: "Track p50/p95/p99 and maximums" },
    { mistake: "Every instance opens a big DB pool", why: "Default pool sizes", wrong: "N instances × pool size exceeds max_connections during scale-out", fix: "Size pools with Little's law; use a pooler (PgBouncer, RDS Proxy)" },
    { mistake: "Running at 90%+ utilisation", why: "Cost saving", wrong: "Queueing delays explode during small spikes", fix: "Keep headroom; autoscale on leading signals" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Estimate, then load test; size for peak with headroom and N+1 redundancy." },
    { tag: "Reliability", text: "Stateless app tier; health and readiness checks; timeouts everywhere." },
    { tag: "Performance", text: "Cache at the highest layer that is correct (CDN > app > Redis > DB)." },
    { tag: "Cost", text: "Track cost per request/user; scale down off-peak; cache hit rate is often the cheapest lever." },
  ],
  interview: [
    { q: "How would you estimate the capacity needed for a launch?", a: "Start from users and behaviour: DAU × requests per user ÷ 86,400 for average RPS, times a peak factor. Multiply by measured per-request cost (CPU ms, queries, bytes) to get cores, instances (with headroom and redundancy), database QPS after caching, connections via Little's law, storage and bandwidth. Then validate with a load test." },
    { q: "Explain the CAP theorem practically.", a: "When a network partition separates replicas, a system must either refuse some requests to stay consistent or keep serving with possibly stale data. Outside partitions there is still a latency vs consistency trade-off (PACELC). Real systems choose per operation: strong consistency for money, eventual for feeds and counters." },
    { q: "Why use consistent hashing?", a: "To map keys to nodes so that adding or removing a node moves only about 1/N of the keys, instead of nearly all keys with modulo hashing. It is used for distributed caches, sharded stores and sticky load balancing." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "1,000,000 requests per day, peak factor 5. Approximate peak RPS?",
      options: ["~12", "~58", "~5,000", "~1,000,000"],
      answer: 1,
      explanation: "1,000,000 / 86,400 ≈ 11.6 average; × 5 ≈ 58.",
    },
    {
      kind: "mcq",
      prompt: "A service has p50 = 40 ms and p99 = 2 s. What should you investigate?",
      options: ["Nothing, the median is great", "The slow tail: GC pauses, lock contention, slow queries, cold caches, downstream timeouts", "Only the network", "Increase the average"],
      answer: 1,
      explanation: "Tail latency affects many users, especially when a page makes several calls.",
    },
    {
      kind: "bug",
      prompt: "After autoscaling from 4 to 20 API instances during a spike, the database starts rejecting connections. Why?",
      options: ["Autoscaling is broken", "Each instance opens its own pool; 20 × pool size exceeds the DB's max connections", "The load balancer is down", "Cache hit rate improved"],
      answer: 1,
      explanation: "Size pools for the maximum instance count or use a connection pooler.",
    },
  ],
  cheatSheet: [
    "Avg RPS = DAU × req/user ÷ 86,400; × peak factor.",
    "Little's law: in-flight = rate × time.",
    "Percentiles (p95/p99), not averages.",
    "Stateless app tier + LB + health checks; DB scales last.",
    "LB algorithms: round robin, least connections, consistent hashing.",
    "Cache layers: browser → CDN → app → Redis → DB.",
    "CAP/PACELC: choose consistency vs availability/latency per operation.",
    "Headroom: keep utilisation well below 100%.",
  ],
  homework: {
    basic: {
      title: "Estimate DevAtlas at 1 million learners",
      brief: ["Extend estimate.py for 1,000,000 DAU, including storage growth per year (quiz attempts at 200 bytes each, 10 per user per day) and egress bandwidth (average response 15 KB). State every assumption."],
      criteria: ["Peak RPS, instances, DB QPS", "Storage per year in GB", "Bandwidth per month in TB"],
      hints: ["1,000,000 × 10 × 200 bytes × 365 days."],
      solution: {
        text: [
          "Every assumption is a named, commented field of a frozen dataclass, so changing one input and re-running is trivial, and the reviewer can challenge each number separately.",
          "Attempts: 1e6 × 10 × 200 B = 2 GB/day ≈ 730 GB/year raw, about 2.9 TB once indexes (×2) and a replica (×2) are counted. Requests: 120 million/day ≈ 1,389 average RPS, ≈ 8,333 at peak, which needs about 57 two-core instances at 60% CPU. Egress ≈ 1.8 TB/day ≈ 54 TB/month, which makes CDN caching and compression a priority and is a significant cost line.",
          "What breaks first: 5,000 database queries per second at peak even with an 80% cache hit rate. That needs read replicas for progress reads and connection pooling (57 instances × a default pool of 10 = 570 connections), long before the app tier becomes a problem.",
        ],
        code: {
          lang: "python",
          file: "estimate_1m.py",
          code: `"""Back-of-envelope sizing for DevAtlas at 1,000,000 daily active learners.
Every input is an explicit, labelled assumption; change one and re-run."""
import math
from dataclasses import dataclass

SECONDS_PER_DAY = 86_400
DAYS_PER_YEAR = 365
DAYS_PER_MONTH = 30


@dataclass(frozen=True)
class Assumptions:
    dau: int = 1_000_000                 # daily active learners
    requests_per_user: int = 120         # page loads + API calls per learner per day (from 6.3.1)
    peak_factor: int = 6                 # 9 a.m. school start vs the daily average
    cpu_ms_per_request: float = 8        # measured by profiling the API
    cores_per_instance: int = 2
    target_utilisation: float = 0.6      # headroom for spikes
    db_queries_per_request: int = 3
    cache_hit_rate: float = 0.8          # share of DB reads served by Redis
    db_time_ms: float = 4                # average time per query
    attempts_per_user: int = 10          # quiz attempts per learner per day
    attempt_bytes: int = 200             # one attempt row
    index_overhead: float = 2.0          # indexes roughly double table size
    replicas: int = 2                    # primary + one replica store a full copy each
    avg_response_kb: float = 15          # average compressed response size


def estimate(a: Assumptions) -> dict[str, float | int]:
    avg_rps = a.dau * a.requests_per_user / SECONDS_PER_DAY
    peak_rps = avg_rps * a.peak_factor
    cores = peak_rps * a.cpu_ms_per_request / 1000 / a.target_utilisation
    instances = math.ceil(cores / a.cores_per_instance) + 1                    # N+1 redundancy
    db_qps = peak_rps * a.db_queries_per_request * (1 - a.cache_hit_rate)
    db_in_flight = db_qps * a.db_time_ms / 1000                                # Little's law
    raw_gb_year = a.dau * a.attempts_per_user * a.attempt_bytes * DAYS_PER_YEAR / 1e9
    stored_gb_year = raw_gb_year * a.index_overhead * a.replicas
    egress_tb_month = a.dau * a.requests_per_user * a.avg_response_kb * 1e3 * DAYS_PER_MONTH / 1e12
    return {
        "average RPS": avg_rps,
        "peak RPS": peak_rps,
        "app instances (2 cores)": instances,
        "DB queries/sec at peak": db_qps,
        "DB queries in flight": db_in_flight,
        "attempt data GB/year (raw)": raw_gb_year,
        "attempt data GB/year (indexes x replicas)": stored_gb_year,
        "egress TB/month": egress_tb_month,
    }


if __name__ == "__main__":
    for name, value in estimate(Assumptions()).items():
        shown = f"{value:,}" if isinstance(value, int) else f"{value:,.1f}"
        print(f"{name:42} {shown:>10}")`,
        },
        output: "average RPS                                   1,388.9\npeak RPS                                      8,333.3\napp instances (2 cores)                            57\nDB queries/sec at peak                        5,000.0\nDB queries in flight                             20.0\nattempt data GB/year (raw)                      730.0\nattempt data GB/year (indexes x replicas)     2,920.0\negress TB/month                                  54.0",
      },
    },
    intermediate: {
      title: "Load test the API",
      brief: ["Write a k6 (or Locust) script that ramps to 200 virtual users hitting the lessons list and progress endpoints. Report p50/p95/p99 latency and error rate, find the bottleneck (CPU, DB, pool), fix one thing and re-run."],
      criteria: ["Script committed", "Before/after percentiles", "Root cause identified"],
      hints: ["k6 thresholds can fail the run: http_req_duration: ['p(95)<300']."],
      solution: {
        text: ["A typical first bottleneck is a missing index or an N+1 query; the second is connection pool exhaustion. Fix one, re-run, and record the improvement."],
        code: {
          lang: "javascript",
          file: "load.js",
          code: `import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<300", "p(99)<800"] },
};

const BASE = __ENV.BASE_URL || "http://localhost:8080";

export default function () {
  const list = http.get(\`\${BASE}/v1/lessons?limit=20\`);
  check(list, { "lessons 200": (r) => r.status === 200 });
  const me = http.get(\`\${BASE}/v1/me/progress\`, { headers: { Authorization: \`Bearer \${__ENV.TOKEN}\` } });
  check(me, { "progress 200": (r) => r.status === 200 });
  sleep(1);
}`,
        },
      },
    },
    challenge: {
      title: "Latency budget for /ask",
      brief: ["Write a latency budget for the AI tutor's /ask endpoint with a p95 target of 3 s for the first token: gateway, auth, embedding the question, vector search, prompt assembly, LLM time to first token, streaming. Propose two optimisations with estimated savings."],
      criteria: ["Every hop listed with a budget", "Parallelisable steps identified", "Optimisations with numbers"],
      hints: ["Embedding and fetching user context can run in parallel; prompt caching reduces LLM time to first token."],
      solution: {
        text: [
          "Budget the critical path, not the sum of every hop: the three independent lookups run in parallel, so only the slowest one counts. Adding p95s gives a conservative upper bound; tracing each span gives the real distribution.",
          "The useful insight is the ratio: the LLM is about 84% of the path, so the biggest wins are in how you call the model (prompt caching, prompt size) and in removing whole steps (skipping the reranker when retrieval is decisive). The eval-set percentages are example numbers; replace them with your own measurements.",
        ],
        code: {
          lang: "markdown",
          file: "docs/latency-budget-ask.md",
          code: `# Latency budget: \`POST /ask\` (AI tutor)

**Target:** time to first token (TTFT) p95 ≤ 3,000 ms, measured at the browser. Prompt ≈ 6,000 tokens (system prompt 2,500 + 5 retrieved chunks 3,000 + question and history 500).

## Budget per hop (p95)

| # | Hop | Budget | Runs | Notes |
|---|---|---|---|---|
| 1 | Browser → CDN → gateway (TLS reuse, routing) | 40 ms | sequential | HTTP/2 connection already open from the lesson page |
| 2 | Auth (JWT verified locally) + rate-limit check (Redis) | 5 ms | sequential | no call to the identity service |
| 3a | Embed the question (embedding API) | 120 ms | **parallel** | slowest branch of step 3 |
| 3b | Load learner context (current lesson, progress) | 40 ms | **parallel** | one indexed MySQL read through the API |
| 3c | Load last 6 conversation turns (Redis) | 5 ms | **parallel** | |
| 4 | Vector search, pgvector HNSW, top 20 chunks | 40 ms | sequential | needs 3a |
| 5 | Rerank 20 → 5 chunks (cross-encoder) | 150 ms | sequential | needs 4 |
| 6 | Prompt assembly | 10 ms | sequential | template + token count |
| 7 | LLM time to first token | 2,000 ms | sequential | provider p95 for a 6k-token prompt, from our traces |
| 8 | First token back to the browser (SSE) | 30 ms | sequential | proxy buffering disabled |
| | **Critical path** | **2,395 ms** | | 1 + 2 + max(3a, 3b, 3c) + 4 + 5 + 6 + 7 + 8 |
| | Headroom | 605 ms (20%) | | absorbs retries and noisy neighbours |

Done sequentially, step 3 would cost 165 ms instead of 120 ms; running it with \`asyncio.gather\` saves 45 ms on every request. Adding p95s is conservative (they rarely all happen on the same request), so this budget is an upper bound; the real p95 comes from tracing each span with OpenTelemetry.

The LLM is 84% of the critical path (2,000 of 2,395 ms). Everything we control adds up to 395 ms, so optimising our code alone cannot rescue a slow provider.

## Optimisation 1: prompt caching for the static prefix

Put the 2,500-token system prompt first and mark it cacheable with the provider's prompt-caching feature, so repeat requests skip re-processing it.

- **Estimated saving:** 300 to 500 ms of TTFT on cache hits. Prefill time scales roughly with uncached prompt length, and 2,500 of 6,000 tokens (42%) become cached.
- **Expected hit rate:** above 90% during school hours (the prefix is identical for every learner and a request arrives every few seconds, well within the cache lifetime).
- **Side effect:** cached input tokens are billed at a lower rate, so cost drops too.
- **Verify:** A/B 200 requests each way, compare TTFT p50 and p95 from traces.

## Optimisation 2: skip the reranker when retrieval is decisive

If the top vector hit beats the second by a cosine margin ≥ 0.08, send the top 5 straight to the prompt.

- **Measured on the 120-question eval set:** the rule triggers on 58% of questions, and recall@3 stays at 0.90 (it drops to 0.82 if we skip reranking for every question, which is why we keep it for the rest).
- **Saving:** 150 ms on 58% of requests ≈ 87 ms on average. The p95 improves less, because the slow tail is dominated by LLM time.

## Not doing (yet)

- **Smaller model for simple questions:** would cut TTFT by roughly half, but routing errors hurt answer quality; revisit after the router has its own eval.
- **Caching question embeddings:** 120 ms saved on hits, but only 9% of questions repeat exactly in our logs, so ~11 ms on average. Not worth the extra moving part yet.

## Alerts

Page if TTFT p95 > 3 s for 10 minutes (burn-rate alert, lesson 9.6.1). Dashboard each hop as a span so a regression points to its own row in this table.`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: capacity plan and load test in CI",
      brief: ["Write docs/capacity.md (estimates, assumptions, bottlenecks, scaling plan) and add a nightly k6 run against a staging environment with thresholds that fail the job on regressions."],
      criteria: ["Assumptions explicit", "Thresholds based on SLOs", "Trend of p95 over time visible"],
      hints: ["Store k6 summary JSON as an artifact and chart it."],
      solution: {
        text: [
          "The capacity plan states every assumption with its source, turns them into estimates (using the basic tier's script), names the bottlenecks in the order they will be hit, and ties the nightly load test to the SLOs, so a regression fails the job exactly like a failing test.",
          "The k6 script was run with k6 v2.3.0 (the `grafana/k6` Docker image) against a stub API at `SCALE=0.05`: it wrote `trend.json` (for example `{\"date\":\"2026-10-18\",\"lessons_p95_ms\":31,\"progress_p95_ms\":49,\"error_rate\":0,\"max_vus\":20}`), and lowering one threshold below the measured p95 made k6 exit with code 99 and `thresholds on metrics 'http_req_duration{endpoint:progress}' have been crossed`. The workflow passes `actionlint` (with shellcheck).",
          "The p95 trend lives as one JSON line per night on a `perf-data` branch and is rendered as a table in the job summary, so a slow drift is visible weeks before a threshold breaks.",
        ],
        code: {
          lang: "markdown",
          file: "docs/capacity.md",
          code: `# DevAtlas capacity plan

Last updated: 2026-10-18 · Next review: before the January term launch · Estimates: \`scripts/estimate_1m.py\` (homework basic)

## Targets (SLOs)

| Endpoint | p95 | p99 | Availability |
|---|---|---|---|
| \`GET /v1/lessons\` (cached list) | 200 ms | 500 ms | 99.5% of requests succeed |
| \`GET /v1/me/progress\` (per user, DB read) | 300 ms | 800 ms | 99.5% |
| \`POST /ask\` (AI tutor, first token) | 3 s | 6 s | 99% (provider outages excluded) |

## Assumptions

| Input | Value | Source |
|---|---|---|
| DAU now / in 12 months | 50,000 / 250,000 | school contracts signed + sales pipeline |
| Requests per learner per day | 120 | access logs, median of 14 days |
| Peak factor | 6× | 09:00 school start, measured on the pilot |
| CPU per request | 8 ms | profiler on the API, p50 |
| DB queries per request / cache hit rate | 3 / 80% | APM traces, Redis INFO |
| Average response | 15 KB compressed | CDN logs |
| Quiz attempts | 10 per learner per day, 200 bytes each | product analytics |

## Estimates

| | 50k DAU (now) | 250k DAU (12 months) |
|---|---|---|
| Average / peak RPS | 69 / 417 | 347 / 2,083 |
| API instances (2 cores, 60% target CPU, N+1) | 4 | 15 |
| DB queries/s at peak (after cache) | 250 | 1,250 |
| DB queries in flight (Little's law, 4 ms) | 1 | 5 (×4 bursts = 20) |
| Attempt data per year (indexes × 2 copies) | 146 GB | 730 GB |
| Egress per month | 2.7 TB | 13.5 TB |

## Bottlenecks, in the order we expect to hit them

1. **MySQL connections.** 15 instances × the default pool of 10 = 150, right at MySQL's default \`max_connections\` of 151. Fix now: cap each pool at 8 (Little's law says 20 concurrent queries is plenty) and raise \`max_connections\` to 300.
2. **Cache hit rate.** Every 10 points of hit rate lost adds 625 queries/s at 250k DAU. Alert if the Redis hit rate drops below 75% for 15 minutes.
3. **Egress cost.** 13.5 TB/month; serve lesson JSON through the CDN with \`Cache-Control: public, max-age=300\` (lesson content changes at most daily).
4. **LLM provider rate limits** for \`/ask\`: at 2% of peak requests that is ~40 requests/s; request a quota increase before January and queue above it.

## Scaling plan

- **Now (50k):** 4 API pods, HPA 4 to 20 pods on CPU 60%; MySQL primary + 1 read replica (db.r6g.large); Redis 1 GB.
- **At 150k DAU or DB CPU > 60% at peak:** route progress reads to the replica; MySQL to db.r6g.xlarge.
- **At 250k:** 15 pods baseline at 08:30 on school days (scheduled pre-scaling, because the HPA reacts in about 2 minutes and the 09:00 spike is a step); second read replica.
- **Not needed before 1M DAU:** sharding, Kafka, multi-region active-active.

## Nightly load test

Staging runs at one quarter of production size (4 API pods). The nightly profile ramps to 400 virtual users, about 760 requests/s, which is 35% above staging's share of the 250k-DAU peak (2,083 / 4 ≈ 520 requests/s). Thresholds are the SLOs above, so a regression fails the job like a failing test. Each run appends one line to \`history.jsonl\` on the \`perf-data\` branch, and the job summary shows the p95 trend for the last 14 nights; a slow upward drift is visible long before a threshold breaks.

\`\`\`javascript
// load/nightly.js
// Nightly capacity check against staging. Thresholds come from the SLOs in docs/capacity.md.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8080";
const SCALE = Number(__ENV.SCALE || 1); // 1 = full nightly profile; 0.05 for a smoke run

export const options = {
  stages: [
    { duration: \`\${Math.ceil(120 * SCALE)}s\`, target: Math.ceil(100 * SCALE) },
    { duration: \`\${Math.ceil(600 * SCALE)}s\`, target: Math.ceil(400 * SCALE) },
    { duration: \`\${Math.ceil(60 * SCALE)}s\`, target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.005"],                              // SLO: 99.5% success
    "http_req_duration{endpoint:lessons}": ["p(95)<200", "p(99)<500"],
    "http_req_duration{endpoint:progress}": ["p(95)<300", "p(99)<800"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["med", "p(95)", "p(99)", "max"],
};

export default function () {
  const headers = { Authorization: \`Bearer \${__ENV.TOKEN}\` };
  const list = http.get(\`\${BASE}/v1/lessons?limit=20\`, { tags: { endpoint: "lessons" } });
  check(list, { "lessons 200": (r) => r.status === 200 });
  const me = http.get(\`\${BASE}/v1/me/progress\`, { headers, tags: { endpoint: "progress" } });
  check(me, { "progress 200": (r) => r.status === 200 });
  sleep(1);
}

// Write a compact JSON file the workflow uploads and appends to the p95 trend.
export function handleSummary(data) {
  const p95 = (name) => data.metrics[name] ? Math.round(data.metrics[name].values["p(95)"]) : null;
  const trend = {
    date: new Date().toISOString().slice(0, 10),
    lessons_p95_ms: p95("http_req_duration{endpoint:lessons}"),
    progress_p95_ms: p95("http_req_duration{endpoint:progress}"),
    error_rate: data.metrics.http_req_failed.values.rate,
    max_vus: data.metrics.vus_max.values.max,
  };
  return { "summary.json": JSON.stringify(data), "trend.json": JSON.stringify(trend) + "\\n" };
}
\`\`\`

\`\`\`yaml
# .github/workflows/nightly-load.yml
name: nightly-load-test
on:
  schedule:
    - cron: "0 2 * * *"          # 02:00 UTC, outside school hours
  workflow_dispatch:
permissions:
  contents: write                # push results to the perf-data branch
concurrency: nightly-load
jobs:
  k6:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 against staging
        id: k6
        continue-on-error: true  # record the trend even when thresholds fail
        env:
          TOKEN: \${{ secrets.STAGING_LOADTEST_TOKEN }}
        run: |
          chmod 777 load
          docker run --rm -v "$PWD/load:/load" -w /load \\
            -e BASE_URL=https://staging-api.devatlas.dev -e TOKEN \\
            grafana/k6:2.3.0 run --quiet nightly.js
      - uses: actions/upload-artifact@v4
        with:
          name: k6-summary-\${{ github.run_id }}
          path: load/summary.json
      - name: Append to p95 history and show the last 14 nights
        run: |
          git fetch origin perf-data && git worktree add perf origin/perf-data
          cat load/trend.json >> perf/history.jsonl
          cd perf
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add history.jsonl && git commit -m "perf: nightly $(date -u +%F)"
          git push origin HEAD:perf-data
          { echo "| date | lessons p95 ms | progress p95 ms | errors |"; echo "|---|---|---|---|"
            tail -n 14 history.jsonl | jq -r '"| \\(.date) | \\(.lessons_p95_ms) | \\(.progress_p95_ms) | \\(.error_rate) |"'
          } >> "$GITHUB_STEP_SUMMARY"
      - name: Fail the job on threshold breach
        if: steps.k6.outcome == 'failure'
        run: echo "::error::k6 thresholds crossed, see summary" && exit 1
\`\`\``,
        },
        pitfalls: [
          "Load testing production by accident: point the job at staging and keep the token in a secret.",
          "Thresholds without SLOs are arbitrary; derive them from the targets the product actually promises.",
          "Running the test from a laptop or a tiny runner can make the load generator the bottleneck; watch its CPU.",
        ],
      },
    },
  },
  deeper: [
    { label: "Google SRE Book: Handling Overload", url: "https://sre.google/sre-book/handling-overload/" },
    { label: "The Tail at Scale (Dean & Barroso)", url: "https://research.google/pubs/the-tail-at-scale/" },
    { label: "k6 documentation", url: "https://grafana.com/docs/k6/latest/" },
    { label: "Designing Data-Intensive Applications (book)", url: "https://dataintensive.net/" },
  ],
  nextPreview: "Next: the design method. A four-step way to approach any design, plus the powers of two and latency numbers that let you estimate in your head.",
};
