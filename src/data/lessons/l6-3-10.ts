import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.10",
  title: "Caching strategies: cache-aside, write-through, write-behind, refresh-ahead",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["5.3.1 Redis caching patterns and pgvector", "6.3.5 Consistency patterns: strong, eventual and weak", "6.3.9 SQL or NoSQL: choosing a data store"],
  summary: "Where to cache (client, CDN, web server, database, application) and what (query results or objects), the four update strategies and their trade-offs, safe invalidation (including the cache-aside race), eviction policies, hot keys, TTL jitter and stampede protection with locks and probabilistic early refresh.",
  terms: [
    { term: "Cache-aside (lazy loading)", def: "The application reads the cache; on a miss it reads the database and fills the cache. Writes go to the database and invalidate the cache." },
    { term: "Write-through", def: "Every write goes to the cache and the database synchronously, so the cache is always populated and fresh." },
    { term: "Write-behind (write-back)", def: "Writes go to the cache and are flushed to the database later, asynchronously and often in batches." },
    { term: "Refresh-ahead", def: "The cache refreshes popular entries shortly before they expire, so readers rarely see a miss." },
    { term: "Eviction policy", def: "How a full cache chooses what to remove: LRU (least recently used), LFU (least frequently used), TTL-based, random." },
    { term: "Cache stampede", def: "A popular key expires and many requests miss at once, all hitting the database together (also called dogpile or thundering herd)." },
    { term: "Negative caching", def: "Caching 'not found' results briefly, so repeated lookups for missing data do not hit the database." },
    { term: "Hot key", def: "A single cache key that receives a large share of traffic and can overload one cache node." },
  ],
  problem: [
    "Black Friday is next week and DevAtlas is running a sale. The course page runs 14 queries and is opened 3,000 times per second at peak. The team adds Redis with a 5-minute TTL on everything. On the day, the database is fine most of the time, but every 5 minutes it spikes to 100% CPU for a few seconds, and twice the page shows the old price after the price was changed.",
    "Both problems are caching strategy problems, not Redis problems: every popular key expired at the same moment and thousands of requests rebuilt it together (a stampede), and an invalidation race put an old price back into the cache. Caching is easy to add and hard to get right; this lesson covers the strategies, the races and the protections.",
  ],
  concept: {
    analogy: [
      "A school library keeps the most requested books **on a cart at the front desk** (the cache). **Cache-aside**: when someone asks for a book not on the cart, the librarian fetches it from the stacks and leaves a copy on the cart. **Write-through**: when a new edition arrives, the librarian updates both the stacks and the cart at once. **Write-behind**: new notes are put on the cart now and filed into the stacks at the end of the day (fast, but a fire before evening loses them). **Refresh-ahead**: the librarian swaps in fresh copies of popular books before they get worn out. A **stampede** is 200 students arriving at once for a book that just left the cart, all sending the librarian into the stacks for the same title.",
    ],
    precise: [
      "**Where to cache.** Client (browser Cache-Control), CDN (6.3.6), web server/reverse proxy (response caching), database (its own buffer cache; tune memory), application (in-process memory or a distributed cache like Redis/Memcached). Cache at the highest layer that is still correct.",
      "**What to cache.** Caching **database query results** is easy but hard to invalidate (which queries does this write affect?). Caching **objects** (the assembled course page model, a learner profile) maps cleanly to invalidation: when a course changes, delete `course:{id}`. Prefer object-level caching for anything that changes.",
      "**Cache-aside** is the default: only requested data is cached, the cache can fail without losing data, but each miss costs three trips (cache, DB, cache set) and data can be stale until TTL or invalidation. **Write-through** keeps the cache fresh and is good for data read right after it is written, but slows writes and caches data nobody reads (add a TTL). **Write-behind** gives fast writes and batching, but data is at risk until flushed and the system is more complex. **Refresh-ahead** removes miss latency for hot keys but wastes work if predictions are wrong.",
      "**Invalidation.** On writes, **delete** the key rather than setting a new value (avoids writing a stale value computed from an old read); always set a TTL as a safety net; for strict cases use **versioned keys** (`course:42:v17`) so a new version is a new key and old values can never come back.",
      "**Stampedes.** Add **jitter** to TTLs so keys do not expire together; use **single-flight** (one request rebuilds while others wait or get the stale value, via a lock such as Redis `SET lock:key token NX PX 5000`); or **probabilistic early refresh** (XFetch): each reader may refresh slightly before expiry with a probability that grows as expiry approaches, so exactly one usually refreshes early.",
    ],
  },
  underTheHood: {
    text: [
      "**The cache-aside race.** Reader A misses and reads price = 100 from the database. Before A writes the cache, writer B updates the price to 80 and deletes the key. A now sets the cache to 100. The cache holds the old price until TTL. Mitigations: short TTLs, a delayed second delete after writes, versioned keys, or setting the cache only if the key's version has not moved (compare-and-set). Systems such as Meta's memcache use 'leases' to solve exactly this.",
      "**Eviction.** Redis evicts according to `maxmemory-policy`: `allkeys-lru` and `allkeys-lfu` suit pure caches; `volatile-*` policies evict only keys with a TTL; `noeviction` returns errors when full (right for a primary data store, wrong for a cache). Real workloads are skewed (a few keys get most traffic), so a cache holding a small fraction of keys often gets a high hit ratio.",
      "**Hot keys.** One extremely popular key (a sale banner, a celebrity's profile) can saturate a single Redis shard. Fixes: a small in-process cache in front of Redis for that key (a few seconds TTL), or replicating the key under several names (`banner#1..#8`) and picking one at random.",
    ],
    diagram: {
      title: "Cache-aside with stampede protection",
      nodes: [
        { label: "Request", sub: "GET course:42" },
        { label: "Redis", sub: "hit → return" },
        { label: "Lock (SET NX PX)", sub: "one winner rebuilds" },
        { label: "Database", sub: "1 query, not 1,000" },
        { label: "Redis SET + TTL", sub: "TTL with jitter" },
      ],
      edges: ["miss", "winner", "", ""],
      caption: "Losers of the lock briefly wait and re-read the cache, or serve a stale copy kept under a longer TTL.",
    },
  },
  handsOn: [
    {
      title: "The four strategies side by side",
      text: ["Same workload for each strategy: 3 writes, then 6 reads of the same key. Count database work and see what each strategy costs."],
      code: {
        lang: "python",
        file: "strategies.py",
        code: `class Store:
    def __init__(self):
        self.db, self.cache = {}, {}
        self.db_reads = self.db_writes = 0
        self.pending = {}                       # write-behind buffer

    def db_get(self, k):
        self.db_reads += 1
        return self.db.get(k)

    def db_put(self, k, v):
        self.db_writes += 1
        self.db[k] = v

def cache_aside(s, op, k, v=None):
    if op == "write":
        s.db_put(k, v); s.cache.pop(k, None)     # write DB, invalidate
    else:
        if k not in s.cache:
            s.cache[k] = s.db_get(k)
        return s.cache[k]

def write_through(s, op, k, v=None):
    if op == "write":
        s.db_put(k, v); s.cache[k] = v            # write both, synchronously
    else:
        return s.cache.get(k) if k in s.cache else s.db_get(k)

def write_behind(s, op, k, v=None):
    if op == "write":
        s.cache[k] = v; s.pending[k] = v          # DB later
    else:
        return s.cache[k]

def flush(s):
    for k, v in s.pending.items():
        s.db_put(k, v)
    s.pending.clear()

for name, fn in (("cache-aside", cache_aside), ("write-through", write_through), ("write-behind", write_behind)):
    s = Store()
    for price in (100, 90, 80):
        fn(s, "write", "price:42", price)
    reads = [fn(s, "read", "price:42") for _ in range(6)]
    at_risk = len(s.pending)
    if fn is write_behind:
        flush(s)
    print(f"{name:13} reads={reads[-1]} db_reads={s.db_reads} db_writes={s.db_writes} unflushed_before_flush={at_risk}")`,
      },
      output: "cache-aside   reads=80 db_reads=1 db_writes=3 unflushed_before_flush=0\nwrite-through reads=80 db_reads=0 db_writes=3 unflushed_before_flush=0\nwrite-behind  reads=80 db_reads=0 db_writes=1 unflushed_before_flush=1",
      notes: [
        "Write-behind collapsed three writes into one database write, but until the flush the latest price existed only in the cache: if Redis had crashed, it would be lost. Use it for data you can afford to lose or rebuild (view counts, presence), never for payments.",
        "Refresh-ahead is shown in the challenge homework.",
      ],
    },
    {
      title: "Reproduce the cache-aside race that brought back the old price",
      code: {
        lang: "python",
        file: "race.py",
        code: `db = {"price:42": 100}
cache: dict[str, int] = {}
log = []

# Step-by-step interleaving of reader A and writer B
a_value = db["price:42"]; log.append("A: miss, reads 100 from DB")
db["price:42"] = 80;      log.append("B: updates DB to 80")
cache.pop("price:42", None); log.append("B: deletes cache key")
cache["price:42"] = a_value; log.append("A: sets cache to 100 (stale!)")

print("\\n".join(log))
print("DB:", db["price:42"], "| cache:", cache["price:42"])

# Fix: versioned keys. Writers bump the version; readers fill only the key for the version they read.
db = {"price:42": 100, "price:42:version": 7}
cache = {}
version, value = db["price:42:version"], db["price:42"]          # A reads value + version together
db["price:42"], db["price:42:version"] = 80, 8                     # B writes, bumps version
cache[f"price:42:v{version}"] = value                              # A fills an old-version key
current = db["price:42:version"]
print("readers look up", f"price:42:v{current}", "->", cache.get(f"price:42:v{current}", "miss, read DB = 80"))`,
      },
      output: "A: miss, reads 100 from DB\nB: updates DB to 80\nB: deletes cache key\nA: sets cache to 100 (stale!)\nDB: 80 | cache: 100\nreaders look up price:42:v8 -> miss, read DB = 80",
      notes: ["With versioned keys the stale fill lands under an old key nobody reads any more (it expires by TTL). The current version number is tiny and can itself be cached briefly or kept in the row the reader already loads."],
    },
    {
      title: "A stampede, and two protections",
      text: ["1,000 requests per second for one key whose rebuild takes 200 ms. Count database queries in the second after the key expires."],
      code: {
        lang: "python",
        file: "stampede.py",
        code: `REBUILD_MS, RPS = 200, 1000
arrivals = [i * 1000 / RPS for i in range(RPS)]      # one request per ms for 1 s after expiry

def no_protection():
    db_queries, ready_at = 0, None
    for t in arrivals:
        if ready_at is None or t < ready_at:           # still a miss: everyone rebuilds
            db_queries += 1
            ready_at = ready_at or t + REBUILD_MS
    return db_queries

def single_flight():
    db_queries, lock_until = 0, None
    for t in arrivals:
        if lock_until is None:                         # first miss takes the lock
            db_queries += 1
            lock_until = t + REBUILD_MS
        # others wait for the winner (or serve the stale copy) instead of querying
    return db_queries

print("no protection: ", no_protection(), "DB queries")
print("single-flight: ", single_flight(), "DB query")`,
      },
      output: "no protection:  200 DB queries\nsingle-flight:  1 DB query",
      notes: [
        "In Redis the lock is one command: `SET lock:course:42 <random-token> NX PX 5000`. Only the request that gets OK rebuilds; release it with a small Lua script that deletes the key only if it still holds your token.",
        "Waiting requests can poll the cache every 20–50 ms, or you can keep a second copy with a longer TTL and serve it while the rebuild runs (stale-while-revalidate inside the app).",
      ],
    },
    {
      title: "How big must the cache be? LRU on a skewed workload",
      code: {
        lang: "python",
        file: "lru_hit_ratio.py",
        code: `import random
from collections import OrderedDict

class LRU:
    def __init__(self, capacity: int):
        self.capacity, self.data = capacity, OrderedDict()
        self.hits = self.misses = 0
    def get(self, key):
        if key in self.data:
            self.data.move_to_end(key); self.hits += 1
            return
        self.misses += 1
        self.data[key] = True
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)          # evict least recently used

rng = random.Random(1)
keys = 100_000
weights = [1 / (rank + 1) for rank in range(keys)]      # Zipf-like: popular keys dominate
requests = rng.choices(range(keys), weights, k=200_000)

for share in (0.001, 0.01, 0.05, 0.2):
    cache = LRU(int(keys * share))
    for k in requests:
        cache.get(k)
    print(f"cache holds {share:5.1%} of keys -> hit ratio {cache.hits / len(requests):.0%}")`,
      },
      output: "cache holds  0.1% of keys -> hit ratio 29%\ncache holds  1.0% of keys -> hit ratio 51%\ncache holds  5.0% of keys -> hit ratio 66%\ncache holds 20.0% of keys -> hit ratio 78%",
      notes: ["Skew is why caching works: a cache holding a few percent of keys can absorb most reads. Measure your own key popularity (Redis `--hotkeys` with an LFU policy, or sampling in the app) before sizing."],
    },
  ],
  companies: [
    "**Memcache at Meta.** The paper 'Scaling Memcache at Facebook' describes cache-aside with delete-on-write, leases to prevent stale sets and stampedes, and regional pools, at billions of requests per second. It is the classic reference for these races.",
    "**Write-behind for counters.** View counts, likes and 'last seen' timestamps are commonly incremented in Redis and flushed to the database in batches every few seconds, cutting database writes by orders of magnitude.",
    "**TTL jitter and request coalescing** are standard in CDNs and API gateways (e.g. NGINX `proxy_cache_lock`, Varnish request coalescing), and in application libraries such as Go's `singleflight`.",
  ],
  mistakes: [
    { mistake: "Same TTL for every key", why: "One config value", wrong: "Popular keys expire together; periodic database spikes (synchronised stampedes)", fix: "Add random jitter (e.g. TTL × 0.9–1.1) and single-flight rebuilds" },
    { mistake: "Updating the cache instead of deleting on write", why: "Seems more efficient", wrong: "Concurrent writers leave an older value in the cache", fix: "Delete on write (or versioned keys); let the next read refill" },
    { mistake: "No TTL at all", why: "Relying on invalidation", wrong: "One missed invalidation path leaves wrong data forever", fix: "Always set a TTL as a safety net, even with explicit invalidation" },
    { mistake: "Caching query results for data that changes often", why: "Easy to wrap any query", wrong: "Impossible to know which cached queries a write affects; stale results", fix: "Cache objects with clear keys; invalidate by key" },
    { mistake: "Write-behind for important data", why: "Fast writes", wrong: "A cache crash loses writes that were already acknowledged to users", fix: "Write-behind only for losable or rebuildable data; otherwise write-through or DB first" },
    { mistake: "Treating Redis as always available", why: "It rarely fails", wrong: "Redis outage → all traffic falls back to the database at once → database collapses", fix: "Timeouts, circuit breaker, and load-test the fallback; keep a small in-process cache for the hottest keys" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Cache objects at the highest correct layer; measure hit ratio per key prefix and size the cache from real key popularity." },
    { tag: "Reliability", text: "TTL with jitter on every key, single-flight rebuilds for expensive keys, and a tested fallback when the cache is down." },
    { tag: "Maintainability", text: "Centralise cache keys and invalidation in one module per entity, so every write path invalidates correctly." },
    { tag: "Security", text: "Never put user-specific data under shared keys; include the user or tenant in the key and keep secrets out of caches." },
  ],
  interview: [
    { q: "Compare cache-aside, write-through and write-behind.", a: "Cache-aside: the app reads the cache, on a miss loads from the DB and fills the cache; writes go to the DB and delete the key. Simple and resilient, but misses are slow and data can be stale. Write-through: writes update cache and DB synchronously; fresh cache, slower writes, caches unread data. Write-behind: writes go to the cache and are flushed later in batches; fastest writes, but data is at risk until flushed and it is more complex." },
    { q: "What is a cache stampede and how do you prevent it?", a: "When a hot key expires, many concurrent requests miss and all rebuild it from the database at once. Prevent it with TTL jitter so keys do not expire together, a lock or single-flight so only one request rebuilds while others wait or get a stale copy, and probabilistic early refresh so one reader refreshes slightly before expiry." },
    { q: "Why delete the cache key on write instead of updating it?", a: "Updating can race: two writers or a reader with an old value can leave a stale value in the cache. Deleting means the next read loads the current value. There is still a small race with a concurrent reader's late fill, which short TTLs, versioned keys or leases close." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which strategy risks losing acknowledged writes if the cache crashes?",
      options: ["Cache-aside", "Write-through", "Write-behind", "Refresh-ahead"],
      answer: 2,
      explanation: "Write-behind acknowledges before the database has the data.",
    },
    {
      kind: "bug",
      prompt: "Every 10 minutes the database spikes to 100% CPU for a few seconds. All cache keys are set with TTL 600 at deploy time. Cause?",
      options: ["Redis is too small", "Keys expire together and many requests rebuild them at once", "Replication lag", "The CDN is purging"],
      answer: 1,
      explanation: "Synchronised expiry causes stampedes; add jitter and single-flight.",
    },
    {
      kind: "mcq",
      prompt: "A Redis instance used purely as a cache fills up. Which maxmemory-policy is usually right?",
      options: ["noeviction", "allkeys-lru or allkeys-lfu", "volatile-ttl only", "No policy, add RAM forever"],
      answer: 1,
      explanation: "For a cache, evicting the least useful keys is correct; noeviction makes writes fail.",
    },
  ],
  cheatSheet: [
    "Layers: client → CDN → web server → app (in-process / Redis) → DB buffer.",
    "Cache objects, not arbitrary query results.",
    "Cache-aside: default. Write-through: fresh, slower writes. Write-behind: fast, risky. Refresh-ahead: no miss latency for hot keys.",
    "On write: delete the key (or bump a version); always keep a TTL.",
    "Stampede: TTL jitter + single-flight lock + early refresh.",
    "Pure cache: allkeys-lru / allkeys-lfu; set maxmemory.",
    "Hot key: in-process cache or key replicas.",
    "Test the cache-down fallback under load.",
  ],
  homework: {
    basic: {
      title: "Spread expirations with TTL jitter",
      brief: [
        "At deploy time 10,000 keys are cached with TTL 600 s. Simulate how many keys expire in each 30-second window with no jitter and with ±10% jitter, and print the busiest window for each. Explain the effect on the database.",
      ],
      criteria: ["Seeded randomness", "Busiest-window comparison", "Explanation"],
      hints: ["Jittered TTL = 600 × uniform(0.9, 1.1)."],
      solution: {
        text: ["Without jitter all 10,000 rebuilds land in the same window; with ±10% jitter they spread across about 120 seconds, so the busiest 30-second window has roughly a quarter of the keys. Combined with single-flight, the database sees a gentle stream instead of a wall."],
        code: {
          lang: "python",
          file: "jitter.py",
          code: `import random
from collections import Counter

rng = random.Random(2)
KEYS, TTL, WINDOW = 10_000, 600, 30

def busiest(ttls):
    windows = Counter(int(t // WINDOW) for t in ttls)
    w, n = windows.most_common(1)[0]
    return w * WINDOW, n, len(windows)

plain = [TTL] * KEYS
jittered = [TTL * rng.uniform(0.9, 1.1) for _ in range(KEYS)]
for name, ttls in (("no jitter", plain), ("+/-10% jitter", jittered)):
    start, n, used = busiest(ttls)
    print(f"{name:14} busiest window starts at {start}s with {n:5d} expiries ({used} windows used)")`,
        },
        output: "no jitter      busiest window starts at 600s with 10000 expiries (1 windows used)\n+/-10% jitter  busiest window starts at 570s with  2545 expiries (4 windows used)",
      },
    },
    intermediate: {
      title: "Write-behind for lesson view counts",
      brief: [
        "Implement a view counter that increments in memory (standing in for Redis INCR) and flushes accumulated deltas to the database every N increments or on demand, using one UPSERT per key per flush. Simulate 10,000 views over 50 lessons, report database writes with and without write-behind, and the maximum number of views at risk if the cache crashes just before a flush.",
      ],
      criteria: ["Deltas, not absolute values, are flushed", "Database writes counted", "Data at risk quantified"],
      hints: ["Flushing deltas (UPDATE ... SET views = views + :delta) stays correct even with several app instances flushing."],
      solution: {
        text: ["Batching turns 10,000 database writes into fewer than 1,000, and a longer flush interval or fewer distinct keys cuts that further. The risk is bounded by the flush interval: at most one batch of views can be lost, which is acceptable for analytics and unacceptable for money."],
        code: {
          lang: "python",
          file: "view_counter.py",
          code: `import random
from collections import Counter

class ViewCounter:
    def __init__(self, flush_every: int):
        self.pending: Counter[str] = Counter()
        self.flush_every, self.since_flush = flush_every, 0
        self.db: Counter[str] = Counter()
        self.db_writes = 0
        self.max_at_risk = 0

    def view(self, lesson: str):
        self.pending[lesson] += 1
        self.since_flush += 1
        self.max_at_risk = max(self.max_at_risk, self.since_flush)
        if self.since_flush >= self.flush_every:
            self.flush()

    def flush(self):
        for lesson, delta in self.pending.items():   # UPDATE lessons SET views = views + delta
            self.db[lesson] += delta
            self.db_writes += 1
        self.pending.clear()
        self.since_flush = 0

rng = random.Random(4)
lessons = [f"6.3.{i}" for i in range(50)]
views = rng.choices(lessons, [1 / (i + 1) for i in range(50)], k=10_000)

counter = ViewCounter(flush_every=500)
for lesson in views:
    counter.view(lesson)
counter.flush()

assert sum(counter.db.values()) == len(views)
print(f"without write-behind: {len(views)} DB writes")
print(f"with write-behind:    {counter.db_writes} DB writes")
print(f"max views at risk before a flush: {counter.max_at_risk}")`,
        },
        output: "without write-behind: 10000 DB writes\nwith write-behind:    973 DB writes\nmax views at risk before a flush: 500",
      },
    },
    challenge: {
      title: "Probabilistic early refresh (XFetch)",
      brief: [
        "Implement XFetch: a reader refreshes the key early if now − delta × beta × ln(random()) ≥ expiry, where delta is how long the rebuild takes. Simulate 200 requests per second for one key (TTL 60 s, rebuild 0.5 s) over 10 minutes and compare: number of rebuilds and number of requests that saw a miss, for plain expiry vs XFetch with beta = 1.",
      ],
      criteria: ["Formula implemented correctly (ln of a value in (0, 1] is negative)", "Misses and rebuilds counted", "Comparison explained"],
      hints: ["With XFetch, one reader typically refreshes a moment before expiry, so nobody sees a miss."],
      solution: {
        text: ["XFetch (Vattani, Chierichetti and Lowenstein, 'Optimal Probabilistic Cache Stampede Prevention') needs no locks: each reader independently decides, with a probability that grows near expiry, to refresh early. Readers keep getting the cached value while one of them recomputes, so misses vanish. Slightly more rebuilds happen than with plain expiry, which is the price of never stampeding."],
        code: {
          lang: "python",
          file: "xfetch.py",
          code: `import math, random

TTL, DELTA, RPS, DURATION = 60.0, 0.5, 200, 600

def simulate(xfetch: bool, beta: float = 1.0, seed: int = 8):
    rng = random.Random(seed)
    expiry, rebuilding_until = TTL, None
    rebuilds = misses = 0
    for i in range(RPS * DURATION):
        now = i / RPS
        if rebuilding_until is not None and now >= rebuilding_until:
            expiry, rebuilding_until = rebuilding_until + TTL, None      # new value stored
        if now >= expiry and rebuilding_until is None:
            misses += 1                                                  # real miss: rebuild synchronously
            rebuilds += 1
            rebuilding_until = now + DELTA
        elif now >= expiry:
            misses += 1                                                  # waiting on someone else's rebuild
        elif xfetch and rebuilding_until is None:
            if now - DELTA * beta * math.log(1 - rng.random()) >= expiry:
                rebuilds += 1                                            # refresh early, serve cached value
                rebuilding_until = now + DELTA
    return rebuilds, misses

for name, x in (("plain expiry", False), ("XFetch beta=1", True)):
    rebuilds, misses = simulate(x)
    print(f"{name:14} rebuilds {rebuilds:3d}   requests that missed {misses:4d}")`,
        },
        output: "plain expiry   rebuilds   9   requests that missed  900\nXFetch beta=1  rebuilds  10   requests that missed    0",
        pitfalls: ["Using random() directly inside log: random() can return 0.0 and log(0) fails; use 1 − random(), which is in (0, 1]."],
      },
    },
    capstone: {
      title: "DevAtlas: a production cache module",
      brief: [
        "Add a cache module to your capstone that implements cache-aside for one hot read (e.g. the course page model) with: namespaced keys, TTL with jitter, delete-on-write invalidation called from the write path, single-flight rebuild with a Redis lock, a timeout and fallback to the database if Redis is unavailable, and hit/miss metrics. Include tests with a fake Redis.",
      ],
      criteria: ["All six features present", "Works with redis-py's API", "Tests cover hit, miss, lock contention and Redis down"],
      hints: ["redis-py: r.get(k), r.set(k, v, ex=..., nx=True, px=...), r.delete(k)."],
      solution: {
        text: [
          "The module wraps the pattern so endpoints only call get_course(id) and invalidate_course(id). The fake client implements the three redis-py methods used, so the tests run without a server; the same code works with `redis.Redis(socket_timeout=0.05)`.",
        ],
        code: {
          lang: "python",
          file: "app/cache.py",
          code: `import json
import random
import time
import uuid

try:  # redis-py's errors do not inherit from the built-in ConnectionError
    from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
    REDIS_ERRORS: tuple = (RedisConnectionError, RedisTimeoutError, ConnectionError, TimeoutError)
except ImportError:  # running the self-test without redis-py installed
    REDIS_ERRORS = (ConnectionError, TimeoutError)

TTL_S = 300
LOCK_MS = 5_000
stats = {"hit": 0, "miss": 0, "fallback": 0}


def _ttl() -> int:
    return int(TTL_S * random.uniform(0.9, 1.1))           # jitter


def get_course(r, course_id: int, load_from_db, wait_s: float = 0.05, tries: int = 20) -> dict:
    key = f"devatlas:course:{course_id}:v1"
    try:
        for _ in range(tries):
            cached = r.get(key)
            if cached is not None:
                stats["hit"] += 1
                return json.loads(cached)
            token = uuid.uuid4().hex
            if r.set(f"lock:{key}", token, nx=True, px=LOCK_MS):   # single-flight winner
                stats["miss"] += 1
                value = load_from_db(course_id)
                r.set(key, json.dumps(value), ex=_ttl())
                if r.get(f"lock:{key}") == token:                    # use a Lua script in production
                    r.delete(f"lock:{key}")
                return value
            time.sleep(wait_s)                                       # someone else is rebuilding
    except REDIS_ERRORS:
        stats["fallback"] += 1
    return load_from_db(course_id)                                   # Redis down or slow: go to the DB


def invalidate_course(r, course_id: int) -> None:
    try:
        r.delete(f"devatlas:course:{course_id}:v1")
    except REDIS_ERRORS:
        pass  # the TTL is the safety net; also log and alert


class FakeRedis:
    def __init__(self, down: bool = False):
        self.data, self.down = {}, down
    def _check(self):
        if self.down:
            raise ConnectionError("redis down")
    def get(self, k):
        self._check(); return self.data.get(k)
    def set(self, k, v, ex=None, px=None, nx=False):
        self._check()
        if nx and k in self.data:
            return None
        self.data[k] = v
        return True
    def delete(self, k):
        self._check(); self.data.pop(k, None)


if __name__ == "__main__":
    calls = []
    def db(cid):
        calls.append(cid); return {"id": cid, "price": 80}

    r = FakeRedis()
    assert get_course(r, 42, db) == {"id": 42, "price": 80}          # miss -> DB
    assert get_course(r, 42, db)["price"] == 80 and len(calls) == 1   # hit
    invalidate_course(r, 42)
    get_course(r, 42, db)
    assert len(calls) == 2                                            # refilled after invalidation
    r.data["lock:devatlas:course:7:v1"] = "other"                    # someone else holds the lock
    assert get_course(r, 7, db, wait_s=0, tries=3)["id"] == 7         # gives up waiting, reads DB
    assert get_course(FakeRedis(down=True), 9, db)["id"] == 9         # Redis down -> fallback
    print("ok", stats)`,
        },
        output: "ok {'hit': 1, 'miss': 2, 'fallback': 1}",
        pitfalls: ["Without a socket timeout, a slow Redis makes every request slow instead of falling back.", "Catching only the built-in ConnectionError: redis-py raises redis.exceptions.ConnectionError and TimeoutError, which derive from RedisError, so the fallback would never run in production."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: cache (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#cache" },
    { label: "Scaling Memcache at Facebook (NSDI 2013)", url: "https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala" },
    { label: "Redis: key eviction policies", url: "https://redis.io/docs/latest/develop/reference/eviction/" },
    { label: "AWS: caching best practices", url: "https://aws.amazon.com/caching/best-practices/" },
  ],
  nextPreview: "Next: asynchronism. Message queues, task queues and back pressure: how to take slow work off the request path without losing jobs or drowning your workers.",
};
