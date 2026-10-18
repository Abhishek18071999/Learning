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
        text: ["Attempts: 1e6 × 10 × 200 B = 2 GB/day ≈ 730 GB/year before indexes and replicas (often ×2–3 with indexes). Requests: 1e6 × 120 = 120 million/day ≈ 1,389 average RPS; × 6 ≈ 8,300 peak RPS. Egress: 120e6 × 15 KB ≈ 1.8 TB/day ≈ 54 TB/month, which makes CDN caching and compression a priority and is a significant cost line."],
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
          "Example budget: gateway + auth 30 ms; embed question 80 ms (parallel with loading user context 40 ms); vector search 40 ms; rerank 150 ms; prompt assembly 10 ms; LLM time to first token 1.5–2 s; total ≈ 2.3 s p95. Optimisations: cache embeddings for repeated questions (saves ~80 ms on hits), use prompt caching for the long static system prompt (can cut time to first token noticeably), or skip reranking when retrieval scores are already decisive.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: capacity plan and load test in CI",
      brief: ["Write docs/capacity.md (estimates, assumptions, bottlenecks, scaling plan) and add a nightly k6 run against a staging environment with thresholds that fail the job on regressions."],
      criteria: ["Assumptions explicit", "Thresholds based on SLOs", "Trend of p95 over time visible"],
      hints: ["Store k6 summary JSON as an artifact and chart it."],
      solution: {
        text: ["Performance regressions are then caught like test failures, not discovered by users on launch day."],
      },
    },
  },
  deeper: [
    { label: "Google SRE Book: Handling Overload", url: "https://sre.google/sre-book/handling-overload/" },
    { label: "The Tail at Scale (Dean & Barroso)", url: "https://research.google/pubs/the-tail-at-scale/" },
    { label: "k6 documentation", url: "https://grafana.com/docs/k6/latest/" },
    { label: "Designing Data-Intensive Applications (book)", url: "https://dataintensive.net/" },
  ],
  nextPreview: "Next: system design cases. URL shortener, chat, news feed and rate limiter, using a framework you can apply in any interview.",
};
