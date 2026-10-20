import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.2",
  title: "Scale from one server to millions of users",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.3.2 The design method: requirements, estimates and numbers to know", "6.3.7 Load balancers, reverse proxies and service discovery", "6.3.10 Caching strategies: cache-aside, write-through, write-behind, refresh-ahead"],
  summary: "Take one app on one machine and grow it to millions of daily users, adding one building block at a time (separate database, CDN, load balancer, cache, read replicas, queues, sharding) only when a measured bottleneck asks for it, and naming the price of each step.",
  terms: [
    { term: "DAU", def: "Daily active users: distinct users who use the product on a given day. Traffic estimates start from it." },
    { term: "Peak factor", def: "Peak traffic divided by average traffic. Usually 2 to 10; design for the peak, budget for the average." },
    { term: "Stateless app server", def: "A server that keeps no user data in memory or on local disk between requests, so any server can handle any request and you can add or remove servers freely." },
    { term: "Cache-aside", def: "The app reads the cache first; on a miss it reads the database and stores the result in the cache with a TTL. On a write it updates the database and deletes the cached key." },
    { term: "Read replica", def: "A copy of the database that receives the primary's changes asynchronously and serves reads. It scales reads, not writes, and can lag behind." },
    { term: "Sharding", def: "Splitting rows across several independent primaries by a shard key (often user_id). The only building block here that scales writes, and the most expensive one to undo." },
    { term: "Cache stampede", def: "Many requests miss the same expired hot key at once and all query the database together." },
  ],
  problem: [
    "DevAtlas launches on one VM: the API, MySQL and the uploaded images all on one box. It is fine for months. Then a popular YouTuber recommends the course on a Sunday evening: 40,000 learners sign up in two hours, pages take 9 seconds, the database runs out of connections, and the box is restarted twice. On Monday the team argues: one engineer wants Kubernetes and microservices, another wants to shard MySQL, a third just wants a bigger VM.",
    "All three are guessing. The skill this lesson teaches is to look at the numbers, find the one resource that ran out first, add the smallest building block that fixes it, and repeat. Most products never need the later steps; the ones that do reach them one measured bottleneck at a time.",
  ],
  concept: {
    analogy: [
      "A street food stall. At first one cook takes orders, cooks and washes plates (one server). When the queue grows, you hire someone to wash plates in the back (separate database). Then a second and third cook with one person at the front sending customers to whoever is free (load balancer + stateless servers). You keep the ten most popular dishes pre-made on the counter (cache). You open a second kitchen that copies the menu and only serves (read replicas). Finally you open stalls in other neighbourhoods, each with its own customers (sharding). Nobody opens five neighbourhoods on day one.",
    ],
    precise: [
      "**The loop.** Estimate or measure the load (requests per second, reads vs writes, bytes), find the resource that saturates first (CPU, memory, disk I/O, connections, bandwidth), apply the building block for that resource, then measure again. Each fix moves the bottleneck somewhere else.",
      "**The usual order** (the System Design Primer's 'scaling on AWS' case follows it): 1) move the database off the app machine; 2) serve static files from object storage and a CDN; 3) put a load balancer in front of several stateless app servers (sessions in Redis or signed tokens, files in object storage); 4) add a cache for repeated reads; 5) add read replicas when cached reads still overload the database; 6) move slow work to queues and workers; 7) shard when a single primary cannot take the writes or hold the data. Autoscaling and multiple availability zones come along the way for reliability.",
      "**Each block has a price.** Load balancer: servers must be stateless. Cache: stale data and invalidation bugs. Replicas: replication lag, so a user may not see their own write. Queues: work becomes eventually consistent and needs retries and dead-letter handling. Sharding: no cross-shard joins or transactions, and hot shards. Say the price out loud whenever you add a block.",
      "**Vertical first, when it is cheap.** A bigger machine is often the fastest fix and buys months. It stops working when the next size up does not exist or costs too much, and it never removes the single point of failure.",
    ],
  },
  underTheHood: {
    text: [
      "**Turning users into requests.** 10 million DAU × 22 requests a day = 220 million requests a day; divided by 86,400 seconds ≈ 2,500 requests per second on average, and about 7,600 at a 3× peak. Writes are only 2 of the 22, so about 700 writes per second at peak. That ratio decides everything: a read-heavy system scales with caches and replicas for a long time; a write-heavy one reaches sharding sooner.",
      "**Why the database is usually the hard part.** App servers hold no state, so adding one is a config change. The database holds the state: every copy must agree, and every write must land somewhere durable. Reads can be multiplied (cache, replicas) because a slightly old copy is often fine. Writes can only be spread by splitting the data itself (sharding) or by doing fewer of them (batching through a queue).",
      "**The 80/20 cache rule is an assumption, not a law.** Caching 20% of items serves 80% of reads only when popularity is skewed enough. With Zipf-distributed popularity it ranges from about half to almost all reads (see the hands-on). Measure your hit ratio; don't size the cache from a slogan.",
      "**What real companies did.** Instagram, at about 14 million users with a tiny team, ran stateless Django servers behind an Elastic Load Balancer, PostgreSQL sharded across instances with a streaming replica each, Memcached and Redis for caching and feeds, a task queue for fan-out, and photos in S3 behind CloudFront. Pinterest went from 1 web server and 1 MySQL database (2010) to 180 web and 240 API servers and 88 MySQL primaries with a replica each (October 2012), choosing simple application-level sharding over automatic clustering. GitHub kept most core tables in one MySQL cluster, scaled reads with replicas, and only in 2019 to 2021 split that cluster by schema domain (using Vitess for some moves) as it grew past 950,000 queries per second.",
    ],
    diagram: {
      title: "One bottleneck at a time",
      nodes: [
        { label: "One box", sub: "app + DB + files" },
        { label: "Split DB + CDN", sub: "first ~1M DAU" },
        { label: "LB + N app servers", sub: "stateless" },
        { label: "Cache, then replicas", sub: "scale reads" },
        { label: "Queues, then shards", sub: "scale writes" },
      ],
      edges: ["CPU/RAM full", "app CPU full", "DB reads full", "DB writes full"],
      caption: "The thresholds come from your own measurements; the numbers in the hands-on are round assumptions for one mid-size machine.",
    },
  },
  handsOn: [
    {
      title: "Turn daily users into requests, storage, bandwidth and cache size",
      text: ["Every scaling decision starts with these numbers. The script uses explicit assumptions (20 reads and 2 writes per user per day, 5 KB responses, 2 KB per write, 3× peak); change them to your product's."],
      code: { lang: "python", file: "estimate.py", code: `from dataclasses import dataclass

SECONDS_PER_DAY = 86_400


@dataclass(frozen=True)
class Workload:
    dau: int                    # daily active users
    reads_per_user: int = 20
    writes_per_user: int = 2
    read_kb: float = 5.0        # average response size
    write_kb: float = 2.0       # average stored size per write
    peak_factor: float = 3.0    # peak traffic / average traffic (2 to 10 is typical)
    years: int = 5
    copies: int = 3             # primary + 2 replicas (backups not included)
    hot_fraction: float = 0.2   # share of read volume to keep in cache (80/20 assumption)


def estimate(w: Workload) -> dict[str, float]:
    reads, writes = w.dau * w.reads_per_user, w.dau * w.writes_per_user
    avg_rps = (reads + writes) / SECONDS_PER_DAY
    return {
        "avg rps": avg_rps,
        "peak rps": avg_rps * w.peak_factor,
        "peak write qps": writes / SECONDS_PER_DAY * w.peak_factor,
        "storage GB/day": writes * w.write_kb / 1e6,
        f"storage TB/{w.years}y x{w.copies}": writes * w.write_kb * 365 * w.years * w.copies / 1e9,
        "ingress MB/s (avg)": writes / SECONDS_PER_DAY * w.write_kb / 1e3,
        "egress MB/s (avg)": reads / SECONDS_PER_DAY * w.read_kb / 1e3,
        "cache GB": reads * w.read_kb * w.hot_fraction / 1e6,
    }


rows = {dau: estimate(Workload(dau)) for dau in (1_000, 100_000, 1_000_000, 10_000_000)}
names = list(next(iter(rows.values())))
print(f"{'':22}" + "".join(f"{dau:>12,}" for dau in rows))
for name in names:
    print(f"{name:22}" + "".join(f"{r[name]:>12,.2f}" for r in rows.values()))` },
      output: "                             1,000     100,000   1,000,000  10,000,000\navg rps                       0.25       25.46      254.63    2,546.30\npeak rps                      0.76       76.39      763.89    7,638.89\npeak write qps                0.07        6.94       69.44      694.44\nstorage GB/day                0.00        0.40        4.00       40.00\nstorage TB/5y x3              0.02        2.19       21.90      219.00\ningress MB/s (avg)            0.00        0.00        0.05        0.46\negress MB/s (avg)             0.00        0.12        1.16       11.57\ncache GB                      0.02        2.00       20.00      200.00",
      notes: ["Read across a row: storage and cache grow linearly with users, but even 10M DAU is only ~7,600 requests per second at peak, which a handful of app servers handle. The hard part at that size is the database, not the web tier."],
    },
    {
      title: "Evolve the design one bottleneck at a time",
      text: ["This simulation grows from 1,000 to 100 million daily users. At each size it finds the first resource over capacity, applies the matching building block, and checks again. The capacities are round assumptions; the order of the fixes is the lesson."],
      code: { lang: "python", file: "evolve.py", code: `"""Grow a system from 1k to 10M daily users and fix one bottleneck at a time.
Capacities are round assumptions for one mid-size machine; replace them with your own load-test numbers."""
import math
from dataclasses import dataclass, field

SINGLE_BOX_RPS = 300          # app + database on one machine
APP_SERVER_RPS = 1_000        # one stateless app server
DB_READ_QPS = 3_000           # one database (or replica) serving reads
DB_WRITE_QPS = 1_000          # one primary accepting writes
ORIGIN_MBPS = 100             # static bytes/s the app tier can serve before it hurts
CACHE_HIT = 0.8               # share of reads answered by the cache


@dataclass
class Design:
    split: bool = False         # app and database on separate machines
    app_servers: int = 1        # more than 1 needs a load balancer
    cache: bool = False
    replicas: int = 0
    shards: int = 1
    cdn: bool = False
    log: list[str] = field(default_factory=list)


def load(dau: int) -> dict[str, float]:
    peak = 3 / 86_400
    return {"rps": dau * 22 * peak, "reads": dau * 20 * peak, "writes": dau * 2 * peak,
            "static_mb": dau * 20 * peak * 0.2}       # 200 KB of images/JS per page view


def bottleneck(d: Design, l: dict[str, float]) -> str | None:
    if not d.split:
        return "single box" if l["rps"] > SINGLE_BOX_RPS else None
    if l["rps"] > d.app_servers * APP_SERVER_RPS:
        return "app tier"
    if not d.cdn and l["static_mb"] > ORIGIN_MBPS:
        return "static bandwidth"
    reads = l["reads"] * (1 - CACHE_HIT if d.cache else 1)
    if reads > d.shards * (1 + d.replicas) * DB_READ_QPS:
        return "db reads"
    if l["writes"] > d.shards * DB_WRITE_QPS:
        return "db writes"
    return None


def fix(d: Design, problem: str, l: dict[str, float]) -> str:
    if problem == "single box":
        d.split = True
        return "move the database to its own machine"
    if problem == "app tier":
        d.app_servers = math.ceil(l["rps"] / APP_SERVER_RPS) + 1     # N+1 for failures and deploys
        return f"load balancer + {d.app_servers} stateless app servers (sessions in Redis)"
    if problem == "static bandwidth":
        d.cdn = True
        return "serve images/JS from object storage + CDN"
    if problem == "db reads" and not d.cache:
        d.cache = True
        return f"cache-aside with Redis ({CACHE_HIT:.0%} hit ratio)"
    if problem == "db reads":
        d.replicas += 1
        return f"add read replica #{d.replicas}"
    d.shards *= 2
    return f"shard by user_id into {d.shards} primaries"


design = Design()
for dau in (1_000, 10_000, 100_000, 1_000_000, 3_000_000, 10_000_000, 30_000_000, 100_000_000):
    l = load(dau)
    while (problem := bottleneck(design, l)):
        print(f"{dau:>11,} DAU  peak {l['rps']:>8,.0f} rps  bottleneck: {problem:16} -> {fix(design, problem, l)}")
    print(f"{dau:>11,} DAU  peak {l['rps']:>8,.0f} rps  ok")` },
      output: "      1,000 DAU  peak        1 rps  ok\n     10,000 DAU  peak        8 rps  ok\n    100,000 DAU  peak       76 rps  ok\n  1,000,000 DAU  peak      764 rps  bottleneck: single box       -> move the database to its own machine\n  1,000,000 DAU  peak      764 rps  bottleneck: static bandwidth -> serve images/JS from object storage + CDN\n  1,000,000 DAU  peak      764 rps  ok\n  3,000,000 DAU  peak    2,292 rps  bottleneck: app tier         -> load balancer + 4 stateless app servers (sessions in Redis)\n  3,000,000 DAU  peak    2,292 rps  ok\n 10,000,000 DAU  peak    7,639 rps  bottleneck: app tier         -> load balancer + 9 stateless app servers (sessions in Redis)\n 10,000,000 DAU  peak    7,639 rps  bottleneck: db reads         -> cache-aside with Redis (80% hit ratio)\n 10,000,000 DAU  peak    7,639 rps  ok\n 30,000,000 DAU  peak   22,917 rps  bottleneck: app tier         -> load balancer + 24 stateless app servers (sessions in Redis)\n 30,000,000 DAU  peak   22,917 rps  bottleneck: db reads         -> add read replica #1\n 30,000,000 DAU  peak   22,917 rps  bottleneck: db writes        -> shard by user_id into 2 primaries\n 30,000,000 DAU  peak   22,917 rps  bottleneck: db writes        -> shard by user_id into 4 primaries\n 30,000,000 DAU  peak   22,917 rps  ok\n100,000,000 DAU  peak   76,389 rps  bottleneck: app tier         -> load balancer + 78 stateless app servers (sessions in Redis)\n100,000,000 DAU  peak   76,389 rps  bottleneck: db writes        -> shard by user_id into 8 primaries\n100,000,000 DAU  peak   76,389 rps  ok",
      notes: [
        "Nothing changes until about 1M DAU: a single well-tuned box goes a long way. Splitting the database and adding a CDN come first because they are cheap and reversible.",
        "Sharding appears only at 30M DAU in this model, after the cache and a replica, because writes are 1/11 of the traffic. With a write-heavy workload (chat, telemetry) it would come much earlier. Change the ratio in `load()` and watch the order change.",
      ],
    },
    {
      title: "How much does a cache really absorb?",
      code: { lang: "python", file: "zipf_cache.py", code: `"""Does caching 20% of items really serve 80% of reads? It depends on how skewed popularity is.
With Zipf popularity, item k is requested in proportion to 1 / k**s. Caching the top \`cached\`
items then serves sum(1/k**s for k <= cached) / sum(1/k**s for all k) of reads."""
from itertools import accumulate

ITEMS = 1_000_000

for s in (0.6, 0.8, 1.0, 1.2):
    weights = [1 / k**s for k in range(1, ITEMS + 1)]
    cumulative = list(accumulate(weights))
    total = cumulative[-1]
    hit = {pct: cumulative[int(ITEMS * pct) - 1] / total for pct in (0.01, 0.05, 0.20)}
    print(f"skew s={s}:  cache 1% -> {hit[0.01]:4.0%}   5% -> {hit[0.05]:4.0%}   20% -> {hit[0.20]:4.0%} of reads")` },
      output: "skew s=0.6:  cache 1% ->  16%   5% ->  30%   20% ->  52% of reads\nskew s=0.8:  cache 1% ->  36%   5% ->  52%   20% ->  71% of reads\nskew s=1.0:  cache 1% ->  68%   5% ->  79%   20% ->  89% of reads\nskew s=1.2:  cache 1% ->  91%   5% ->  95%   20% ->  98% of reads",
      notes: ["With mild skew (s = 0.6) caching 20% of items serves only about half the reads; with strong skew (s = 1.2) 1% of items serve 91%. Real lesson pages, product pages and profiles are usually strongly skewed, which is why caches work so well, but the only reliable number is the hit ratio you measure."],
    },
    {
      title: "Cache-aside with Redis: TTL jitter and delete on write",
      text: ["The pattern from 6.3.10 in front of a pretend 20 ms database query, against a real local Redis (tested with Redis 7.0 and redis-py 8.1)."],
      code: { lang: "python", file: "cache_aside.py", code: `"""Cache-aside in front of a slow database, with TTL jitter and delete-on-write.
Needs a local Redis: redis-server, then  pip install redis  and  python cache_aside.py"""
import json
import os
import random
import time

import redis

r = redis.Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)
DB = {"lesson:6.4.2": {"title": "Scale from one server to millions of users", "minutes": 80}}
db_queries = 0
BASE_TTL = 300                                          # seconds


def db_get(key: str) -> dict:
    global db_queries
    db_queries += 1
    time.sleep(0.02)                                    # pretend the query takes 20 ms
    return DB[key]


def get(key: str) -> dict:
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)
    value = db_get(key)                                 # miss: read from the database ...
    ttl = BASE_TTL + random.randint(0, BASE_TTL // 10)  # ... and cache it; jitter spreads expiries
    r.set(key, json.dumps(value), ex=ttl)
    return value


def update(key: str, value: dict) -> None:
    DB[key] = value                                     # 1. write the source of truth
    r.delete(key)                                       # 2. invalidate; the next read refills


r.delete("lesson:6.4.2")
for _ in range(1_000):
    get("lesson:6.4.2")
print(f"1000 reads -> {db_queries} database query")
update("lesson:6.4.2", {**DB["lesson:6.4.2"], "minutes": 85})
print("after update:", get("lesson:6.4.2")["minutes"], "minutes,", db_queries, "database queries in total")
print("ttl in range:", BASE_TTL <= r.ttl("lesson:6.4.2") <= BASE_TTL * 1.1)` },
      output: "1000 reads -> 1 database query\nafter update: 85 minutes, 2 database queries in total\nttl in range: True",
      notes: [
        "Delete rather than update the cached value on write: two concurrent writers updating the cache in the wrong order can leave an old value cached until the TTL expires.",
        "The random part of the TTL stops thousands of keys cached at the same moment (for example after a deploy) from expiring at the same moment.",
      ],
    },
  ],
  companies: [
    "**Instagram (about 14 million users, early 2010s):** stateless Django app servers behind an Amazon ELB and NGINX, PostgreSQL sharded across instances with a streaming replica each, Memcached plus Redis for feeds and sessions, a Gearman task queue for fan-out, photos in S3 served through CloudFront. Mostly managed building blocks run by a handful of engineers.",
    "**Pinterest (2010 to 2012):** grew from 1 web server and 1 MySQL database to 180 web servers, 240 API servers and 88 MySQL primaries with one replica each. After automatic clustering tools failed them, they chose plain application-level sharding: the shard id is built into every 64-bit object id, so no lookup table is needed.",
    "**GitHub (2019 to 2021):** one MySQL cluster (`mysql1`) held most core tables and served about 950,000 queries per second, mostly from replicas. They grouped tables into schema domains, blocked cross-domain joins with linters, then moved domains to separate clusters (some with Vitess), cutting load on those hosts by half. Splitting by feature came before splitting rows.",
  ],
  mistakes: [
    { mistake: "Starting with microservices and Kubernetes", why: "It is what big companies use", wrong: "A small team spends months on infrastructure and network failures while one monolith on two servers would have served the traffic", fix: "Modular monolith, managed database, load balancer; split services when a team or a bottleneck needs it" },
    { mistake: "Adding servers without finding the bottleneck", why: "More machines feels like progress", wrong: "Ten app servers all wait on the same slow query; p99 does not move and the database gets more connections", fix: "Measure first: CPU, I/O, connections, slow-query log, p99 per endpoint" },
    { mistake: "Expecting read replicas to fix write load", why: "'Add replicas' is the standard database answer", wrong: "The primary still takes every write; replicas lag further behind under write pressure", fix: "Cache and replicas for reads; batching, queues and finally sharding for writes" },
    { mistake: "Keeping state on the app server", why: "It works with one server", wrong: "Users are logged out or lose uploads when the load balancer sends them to another server", fix: "Sessions in Redis or signed tokens, files in object storage, before adding the second server" },
    { mistake: "Sharding too early", why: "Planning for 'web scale'", wrong: "Every query needs a shard key, joins move to code, migrations multiply, for a load one database could carry", fix: "Exhaust indexes, query fixes, a bigger instance, caching and replicas first; shard when writes or data size force it" },
    { mistake: "Reading your own write from a replica", why: "All reads were sent to replicas", wrong: "A learner saves their profile and sees the old one on refresh", fix: "Send a user's reads to the primary for a short window after they write, or wait for the replica to reach the write's position" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "From day one run at least two app instances behind a load balancer and a database with a standby in another zone: the first scaling step is also the first availability step." },
    { tag: "Performance", text: "Fix the bottleneck you measured, with the cheapest block that fixes it. Re-measure after every change: the bottleneck moves." },
    { tag: "Cost", text: "Prefer managed load balancers, databases and caches; autoscale the stateless tier on CPU or request count so you pay for the peak only during the peak." },
    { tag: "Maintainability", text: "Write down each scaling trigger (metric, threshold, next step) in a scaling plan, so the next decision is a lookup, not a Monday argument." },
  ],
  interview: [
    { q: "Walk me through scaling a web app from one server to ten million users.", a: "Start with numbers: 10M DAU × ~20 requests ≈ 2,500 rps average, ~7,500 at peak, with a 10:1 read:write ratio. Then step by step, each triggered by a bottleneck: move the database to its own server; put static files on object storage and a CDN; add a load balancer and make app servers stateless (sessions in Redis) so I can scale out and autoscale; add a cache-aside layer for hot reads; add read replicas when cached reads still overload the database, handling replica lag with read-your-own-writes; move slow work like emails and image processing to queues; shard by user_id only when one primary can't take the writes. At each step I'd name the trade-off: statelessness, staleness, lag, eventual consistency, lost joins." },
    { q: "Your read replicas are healthy but users complain they don't see their own updates. What is happening and how do you fix it?", a: "Replication is asynchronous, so a replica can be a second or more behind; a read right after a write may hit a replica that hasn't applied it. Fixes: route a user's reads to the primary for a few seconds after they write (track the last write time in a cookie or Redis); or record the primary's log position after the write and only read from a replica that has replayed past it (in PostgreSQL, compare against pg_last_wal_replay_lsn()); or update the client's local state from the write response. Monitor lag and alert on it." },
    { q: "When would you shard, and how would you choose the shard key?", a: "Only when a single tuned primary can't handle the write rate or the data size, after indexing, query fixes, vertical scaling, caching, replicas and batching. Choose a key that spreads load evenly and keeps the queries that run together on one shard: for a user-centric app, user_id, so a user's data is co-located. Watch for hot keys (a celebrity account) and plan how to split them; use many logical shards mapped to fewer physical servers so you can move them later, as Pinterest did with 4,096 logical shards." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The primary database is at 90% CPU and 80% of its time is spent on INSERT and UPDATE statements. The cache hit ratio is 95%. What helps most?",
      options: ["Add two more read replicas", "Increase the cache TTL", "Batch writes through a queue, and plan sharding by user_id", "Add a CDN"],
      answer: 2,
      explanation: "The load is writes. Replicas, cache and CDN all offload reads; only doing fewer writes (batching) or spreading them (sharding) helps.",
    },
    {
      kind: "bug",
      prompt: "After adding a second app server behind a load balancer, some users are randomly logged out and some uploaded avatars return 404. What is the root cause?",
      options: ["The load balancer algorithm is round robin", "Sessions and uploads are stored on each app server's memory and disk", "The database needs a read replica", "The CDN cache is stale"],
      answer: 1,
      explanation: "State on the app server breaks as soon as requests can land on a different server. Move sessions to Redis or signed tokens and files to object storage.",
    },
    {
      kind: "output",
      prompt: "10 million DAU, each making 20 reads and 2 writes per day. Roughly how many requests per second is that on average?",
      options: ["About 250", "About 2,500", "About 25,000", "About 250,000"],
      answer: 1,
      explanation: "220 million requests a day ÷ 86,400 seconds ≈ 2,546 per second on average (about 7,600 at a 3× peak).",
    },
  ],
  cheatSheet: [
    "Loop: estimate → find the saturated resource → smallest fix → re-measure.",
    "Users to load: DAU × requests per user ÷ 86,400 = average rps; × 2 to 10 for peak.",
    "Usual order: split DB → CDN → LB + stateless servers → cache → replicas → queues → shards.",
    "Reads scale with cache and replicas; writes only with batching or sharding.",
    "Stateless servers: sessions in Redis or tokens, files in object storage.",
    "Replicas lag: read-your-own-writes by routing recent writers to the primary.",
    "Cache-aside: delete on write, TTL with jitter, protect hot keys from stampedes.",
    "Every block has a price: say it (staleness, lag, eventual consistency, lost joins).",
  ],
  homework: {
    basic: {
      title: "Name the bottleneck",
      brief: [
        "Write a function that takes a metrics snapshot (app CPU and server count, database CPU and share of time on reads, cache hit ratio, replica lag, share of egress that is static files, p99) and returns the bottleneck plus the building block that fixes it. Run it on at least five snapshots, including one where nothing is saturated.",
      ],
      criteria: ["Distinguishes app, static, read and write bottlenecks", "Cache is suggested before replicas", "A case with no saturated resource does not suggest more machines"],
      hints: ["Check the cheapest explanations first: static files and the app tier, then reads, then writes."],
      solution: {
        text: ["Order the checks so that cheap, common causes come first, and make the database branch ask 'reads or writes?' before suggesting anything. The last case matters most in real life: a slow system with idle machines needs profiling, not hardware."],
        code: { lang: "python", file: "diagnose.py", code: `"""Name the bottleneck from a metrics snapshot and the building block that fixes it."""
from typing import TypedDict


class Snapshot(TypedDict):
    app_cpu: float            # average across app servers, 0..1
    app_servers: int
    db_cpu: float
    db_read_share: float      # share of DB time spent on SELECTs, 0..1
    cache_hit: float | None   # None = no cache yet
    replica_lag_s: float | None
    static_share: float       # share of app egress that is images/JS/CSS
    p99_ms: float


def diagnose(s: Snapshot) -> str:
    if s["static_share"] > 0.5:
        return "static files fill the app's bandwidth -> object storage + CDN"
    if s["app_cpu"] > 0.7:
        if s["app_servers"] == 1:
            return "one app server is saturated -> load balancer + stateless app servers"
        return "app tier saturated -> add app servers (autoscale on CPU or requests)"
    if s["db_cpu"] > 0.7 and s["db_read_share"] > 0.7:
        if s["cache_hit"] is None or s["cache_hit"] < 0.8:
            return "repeated reads hit the database -> cache-aside (or raise the hit ratio)"
        return "reads still saturate the database -> add read replicas"
    if s["db_cpu"] > 0.7:
        return "writes saturate the primary -> batch/queue writes, then shard"
    if s["replica_lag_s"] is not None and s["replica_lag_s"] > 5:
        return "replicas fall behind -> fewer heavy reports on replicas, bigger replicas, check write volume"
    return "no saturated resource: profile slow queries and code before adding machines"


cases: dict[str, Snapshot] = {
    "launch week": Snapshot(app_cpu=0.92, app_servers=1, db_cpu=0.40, db_read_share=0.9, cache_hit=None, replica_lag_s=None, static_share=0.2, p99_ms=1800),
    "image-heavy feed": Snapshot(app_cpu=0.55, app_servers=3, db_cpu=0.30, db_read_share=0.9, cache_hit=None, replica_lag_s=None, static_share=0.8, p99_ms=900),
    "popular lessons": Snapshot(app_cpu=0.35, app_servers=4, db_cpu=0.88, db_read_share=0.93, cache_hit=None, replica_lag_s=None, static_share=0.1, p99_ms=1200),
    "cache is warm": Snapshot(app_cpu=0.40, app_servers=6, db_cpu=0.81, db_read_share=0.85, cache_hit=0.92, replica_lag_s=None, static_share=0.1, p99_ms=700),
    "progress events": Snapshot(app_cpu=0.45, app_servers=8, db_cpu=0.90, db_read_share=0.30, cache_hit=0.95, replica_lag_s=1.0, static_share=0.1, p99_ms=650),
    "slow but idle": Snapshot(app_cpu=0.20, app_servers=2, db_cpu=0.25, db_read_share=0.8, cache_hit=0.9, replica_lag_s=0.2, static_share=0.1, p99_ms=2400),
}
for name, snapshot in cases.items():
    print(f"{name:17} {diagnose(snapshot)}")` },
        output: "launch week       one app server is saturated -> load balancer + stateless app servers\nimage-heavy feed  static files fill the app's bandwidth -> object storage + CDN\npopular lessons   repeated reads hit the database -> cache-aside (or raise the hit ratio)\ncache is warm     reads still saturate the database -> add read replicas\nprogress events   writes saturate the primary -> batch/queue writes, then shard\nslow but idle     no saturated resource: profile slow queries and code before adding machines",
      },
    },
    intermediate: {
      title: "Read-your-own-writes over a lagging replica",
      brief: [
        "Model a primary and a replica that applies changes 2 seconds late. Write a router that sends reads to the replica, except for a user who wrote in the last few seconds. Show that a naive router returns the old profile photo right after an update, that yours does not, and that other users still read from the replica.",
      ],
      criteria: ["Replica returns stale data during the lag", "Recent writers read from the primary", "Other users are unaffected", "The sticky window is tied to measured lag"],
      hints: ["Keep the time of each user's last write; in production that lives in a cookie or Redis so every app server sees it."],
      solution: {
        text: ["The sticky window must be longer than the worst replica lag you tolerate, so alert when lag approaches it. In PostgreSQL a more precise option is to remember the primary's WAL position after the write and read from a replica only once pg_last_wal_replay_lsn() has passed it."],
        code: { lang: "python", file: "ryw.py", code: `"""Read-your-own-writes on top of asynchronous replicas: after a user writes, send that
user's reads to the primary until the replica has certainly caught up."""
from dataclasses import dataclass, field

STICKY_SECONDS = 5.0          # must exceed the worst replica lag you accept (monitor it!)


@dataclass
class Database:
    name: str
    lag: float = 0.0                                   # seconds behind the primary
    versions: dict[str, list[tuple[float, str]]] = field(default_factory=dict)

    def read(self, key: str, now: float) -> str | None:
        visible = [v for written_at, v in self.versions.get(key, []) if written_at + self.lag <= now]
        return visible[-1] if visible else None


class Router:
    def __init__(self, primary: Database, replica: Database) -> None:
        self.primary, self.replica = primary, replica
        self.last_write: dict[str, float] = {}         # in production: a cookie or Redis key

    def write(self, user: str, key: str, value: str, now: float) -> None:
        for db in (self.primary, self.replica):        # replication; the replica applies it after \`lag\`
            db.versions.setdefault(key, []).append((now, value))
        self.last_write[user] = now

    def read(self, user: str, key: str, now: float, sticky: bool = True) -> str:
        recent = now - self.last_write.get(user, -1e9) < STICKY_SECONDS
        db = self.primary if sticky and recent else self.replica
        return f"{db.name}: {db.read(key, now)}"


router = Router(Database("primary"), Database("replica", lag=2.0))
router.write("asha", "profile:asha:photo", "old.jpg", now=0.0)
router.write("asha", "profile:asha:photo", "new.jpg", now=100.0)
for t in (100.1, 101.0, 103.0, 106.0):
    print(f"t={t:5.1f}  naive -> {router.read('asha', 'profile:asha:photo', t, sticky=False):16}"
          f"  sticky -> {router.read('asha', 'profile:asha:photo', t)}")
print("other user at t=100.1 ->", router.read("ravi", "profile:asha:photo", 100.1))` },
        output: "t=100.1  naive -> replica: old.jpg  sticky -> primary: new.jpg\nt=101.0  naive -> replica: old.jpg  sticky -> primary: new.jpg\nt=103.0  naive -> replica: new.jpg  sticky -> primary: new.jpg\nt=106.0  naive -> replica: new.jpg  sticky -> replica: new.jpg\nother user at t=100.1 -> replica: old.jpg",
        pitfalls: ["Keeping the last-write time in one app server's memory: with several servers behind a load balancer the next request may land elsewhere."],
      },
    },
    challenge: {
      title: "Stop a cache stampede",
      brief: [
        "Simulate 2,000 concurrent requests for a hot key that has just expired, in front of a 50 ms database query. Count database queries without protection, then implement single-flight (only the first request refreshes the key; the others wait for its result) and show the count drops to one.",
      ],
      criteria: ["2,000 concurrent requests", "Database query count printed for both versions", "Single-flight version makes exactly one query", "All callers get the same value"],
      hints: ["With asyncio, store the in-flight refresh as a Task per key and let every caller await it."],
      solution: {
        text: [
          "Single-flight works inside one process. Across many app servers, use a short Redis lock (SET key NX PX 3000) so only one server refreshes, and let the others serve the stale value or wait briefly. Probabilistic early expiration (refreshing a little before the TTL, more likely as expiry nears) avoids the synchronized expiry altogether.",
        ],
        code: { lang: "python", file: "stampede.py", code: `"""2,000 requests arrive for a hot key the moment it expires. Without protection every one of them
queries the database; with single-flight (one refresh per key, everyone else awaits it) only one does."""
import asyncio

db_queries = 0


async def db_load(key: str) -> str:
    global db_queries
    db_queries += 1
    await asyncio.sleep(0.05)                     # a 50 ms query
    return f"value of {key}"


class Cache:
    def __init__(self, single_flight: bool) -> None:
        self.data: dict[str, str] = {}
        self.inflight: dict[str, asyncio.Task[str]] = {}
        self.single_flight = single_flight

    async def get(self, key: str) -> str:
        if key in self.data:
            return self.data[key]
        if not self.single_flight:
            value = await db_load(key)
        else:
            task = self.inflight.get(key)
            if task is None:                      # first caller starts the refresh ...
                task = asyncio.create_task(db_load(key))
                self.inflight[key] = task
                task.add_done_callback(lambda _: self.inflight.pop(key, None))
            value = await task                    # ... everyone awaits the same result
        self.data[key] = value
        return value


async def burst(single_flight: bool) -> int:
    global db_queries
    db_queries = 0
    cache = Cache(single_flight)                  # empty cache = the key just expired
    results = await asyncio.gather(*(cache.get("lesson:6.4.2") for _ in range(2_000)))
    assert len(set(results)) == 1
    return db_queries


print("no protection:  database queries =", asyncio.run(burst(False)))
print("single-flight:  database queries =", asyncio.run(burst(True)))` },
        output: "no protection:  database queries = 2000\nsingle-flight:  database queries = 1",
        pitfalls: ["Forgetting to remove the in-flight entry when the refresh fails, so every later request awaits a failed task."],
      },
    },
    capstone: {
      title: "DevAtlas: a scaling plan from 10k to 1M learners",
      brief: [
        "Write the scaling plan for your DevAtlas capstone: a workload model with explicit assumptions, estimates for 10k and 1M registered learners (use estimate.py), the stage you run today, a table of triggers (metric and threshold → bottleneck → next building block → trade-off), what you deliberately are not doing yet, and how you will keep the plan honest.",
      ],
      criteria: ["Assumptions and estimates with numbers", "At least five triggers, each with a metric, a threshold and a trade-off", "An explicit 'not yet' list with reasons", "A load-test and review plan"],
      hints: ["A learner platform is read-heavy with bursty evening peaks; progress events are the main writes."],
      solution: {
        text: ["A plan like this turns 'should we use Kubernetes?' into 'has a trigger fired?'. The numbers come from estimate.py with DevAtlas assumptions (60 reads and 10 writes per active learner per day, 5× evening peak). The thresholds are starting points to tune after the first load test."],
        code: { lang: "markdown", file: "docs/scaling-plan.md", code: `# DevAtlas scaling plan: 10k to 1M learners

Owner: platform team · Status: accepted · Review: when any trigger below fires

## 1. Workload model (assumptions, checked against our analytics monthly)

| Assumption | Value | Why |
|---|---|---|
| Daily active / registered learners | 20% | typical for a course platform with a daily streak |
| Reads per active learner per day | 60 | lesson pages, quiz loads, progress dashboard |
| Writes per active learner per day | 10 | progress events, quiz answers, homework submissions |
| Average API response | 8 KB | lesson bodies come from the CDN, the API returns JSON only |
| Average stored write | 1 KB | progress and quiz rows |
| Peak / average traffic | 5x | evening study hours in IST, exam season |

Estimates from \`estimate.py\` (lesson 6.4.2) with these numbers:

| | 10k registered (2k DAU) | 1M registered (200k DAU) |
|---|---|---|
| Peak API requests/s | 8 | 810 |
| Peak writes/s | 1.2 | 116 |
| New data per day | 20 MB | 2 GB |
| Data after 5 years, 3 copies | 0.1 TB | 11 TB |
| Hot cache (20% of daily read volume) | 0.2 GB | 19 GB |

## 2. Stage 0 (today, up to ~50k registered): keep it boring

- React app on a CDN (static hosting); ASP.NET Core API as **2 instances** behind the cloud load balancer, so a deploy or crash never takes the site down.
- MySQL: one managed primary with automatic backups and a standby in another zone (failover, not read scaling).
- MongoDB for lesson content and news, managed, 3-node replica set.
- Redis (managed, 1 GB) for sessions, rate limits and the lesson cache.
- FastAPI AI service: 1 instance, called asynchronously for anything slower than 2 s.

## 3. Triggers and the building block each one unlocks

| Signal (sustained 15 min at peak) | Bottleneck | Next step | Trade-off we accept |
|---|---|---|---|
| API CPU > 70% or p99 > 500 ms with idle DB | app tier | autoscale API 2 → N on CPU and request count | must stay stateless: no in-memory sessions, files in blob storage |
| MySQL CPU > 70%, > 70% of time in SELECTs, cache hit < 80% | repeated reads | cache-aside for lesson metadata, dashboards and leaderboards (TTL 5 min + jitter, delete on write) | stale data for up to one TTL on non-critical pages |
| Same, cache hit ≥ 80% | read volume | 1 to 2 MySQL read replicas for dashboards and reports; read-your-own-writes by routing a learner to the primary for 5 s after a write | replica lag; one more thing to monitor (alert at lag > 2 s) |
| Primary write latency p99 > 50 ms or > 60% IOPS | write volume | batch progress events through a queue (one insert per 100 events); archive rows older than 1 year | progress appears seconds later, not instantly |
| AI service p95 > 5 s or queue age > 60 s | AI throughput | worker pool + queue, per-user rate limit, cache identical questions | answers become async (notify when ready) |
| Writes still saturate a tuned primary | single primary | shard progress tables by \`user_id\` (not before ~10x today's peak) | no cross-shard joins; reports move to a warehouse |

## 4. What we are deliberately not doing yet

- **Microservices or Kubernetes:** a 3-person team; the modular monolith plus managed services meets the 1M target.
- **Multi-region active-active:** learners are mostly in India; one region with a CDN covers latency. Revisit if more than 30% of traffic is outside Asia.
- **Sharding:** 116 writes/s at 1M learners is about 12% of our planning number for one tuned MySQL primary (1,000 writes/s, to be confirmed by a load test).

## 5. How we know this plan is still right

- A k6 load test at 2x the next stage's peak before each stage change, kept in CI as a nightly job.
- Dashboards for every trigger above, with alerts at 80% of the threshold.
- A restore drill every quarter: restore last night's backup into staging and run the smoke tests.` },
      },
    },
  },
  deeper: [
    { label: "System Design Primer: design a system that scales to millions of users on AWS (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/scaling_aws/README.md" },
    { label: "Video: System Design BASICS: Horizontal vs. Vertical Scaling (Gaurav Sen, 2018)", url: "https://www.youtube.com/watch?v=xpDnVSmNFX0" },
    { label: "Instagram Engineering: What Powers Instagram", url: "https://instagram-engineering.com/what-powers-instagram-hundreds-of-instances-dozens-of-technologies-adf2e22da2ad" },
    { label: "High Scalability: Scaling Pinterest, from 0 to 10s of billions of page views a month", url: "https://highscalability.com/scaling-pinterest-from-0-to-10s-of-billions-of-page-views-a/" },
    { label: "GitHub Blog: Partitioning GitHub's relational databases to handle scale", url: "https://github.blog/engineering/infrastructure/partitioning-githubs-relational-databases-scale/" },
  ],
  nextPreview: "Next phase: AI engineering. How LLMs really work: tokens, embeddings, attention and sampling, and what that means for cost, latency and hallucinations.",
};
