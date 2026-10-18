import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.8",
  title: "Scaling relational databases: replication, federation and sharding",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["5.1.1 Indexes and query plans: why your site is slow on Friday", "5.4.1 Migrations, backups, replication and sharding", "6.3.5 Consistency patterns: strong, eventual and weak"],
  summary: "The scaling ladder for relational databases, in the order you should climb it: tune, cache, read replicas, bigger hardware, federation, denormalisation, partitioning and sharding. How to choose a shard key, hash vs range vs directory sharding, cross-shard queries, globally unique ids and resharding.",
  terms: [
    { term: "Primary-replica replication", def: "One primary accepts writes and streams changes to read-only replicas that serve reads. (The primer calls it master-slave.)" },
    { term: "Multi-primary replication", def: "Several nodes accept writes and replicate to each other; needs conflict resolution. (The primer calls it master-master.)" },
    { term: "Federation", def: "Splitting databases by function: users in one database, lessons in another, billing in a third." },
    { term: "Sharding", def: "Splitting one large table's rows across several databases by a shard key, so each shard holds a subset." },
    { term: "Shard key", def: "The column used to decide which shard a row lives on, e.g. learner_id or school_id." },
    { term: "Hot spot", def: "A shard (or partition) that gets far more traffic or data than the others, so it saturates first." },
    { term: "Denormalisation", def: "Storing redundant copies of data (e.g. a counter or an author's name) to avoid expensive joins or aggregations on read." },
    { term: "Partitioning", def: "Splitting one table into pieces inside a single database server (e.g. one partition per month)." },
  ],
  problem: [
    "DevAtlas's quiz_attempts table has 2 billion rows. Writes at the Friday deadline start timing out, nightly reports lock the table, and the database server is the largest instance the cloud offers. Someone proposes 'let's just shard it' and someone else proposes 'let's move to MongoDB'.",
    "Sharding is powerful and expensive: every query, migration, backup and on-call shift gets harder. Most teams that shard too early could have solved their problem with an index, a cache or a replica; most teams that shard too late do it in a panic. This lesson gives you the ladder, the triggers for each rung, and the knowledge to choose a shard key you will not regret.",
  ],
  concept: {
    analogy: [
      "A growing library. First you **organise the shelves better** (indexes, tuning). Then you put **photocopies of popular books at extra desks** so more people can read at once (read replicas). Then you **split the library into buildings by subject**: science in one, history in another (federation). When even the science building is full, you split it **by the first letter of the author's surname** across several buildings (sharding). Now finding 'all books published in 2024' means visiting every building, which is the price of sharding.",
    ],
    precise: [
      "**Climb the ladder in order.** (1) Tune: indexes, query plans, connection pooling, removing N+1 queries (5.1.1). (2) Cache hot reads (6.3.10). (3) Read replicas for read-heavy load. (4) A bigger server: often the cheapest step, and modern servers are huge. (5) Federation: separate databases per domain. (6) Denormalise and precompute expensive reads. (7) Partition big tables inside one server. (8) Shard. Each step has a measurable trigger; write it down.",
      "**Read replicas** add read capacity and failover targets. Costs: replication lag (stale reads, see 6.3.5), every replica must also replay every write, and writes do not scale at all. Route reads that must be fresh to the primary.",
      "**Multi-primary** setups let several nodes accept writes, but concurrent updates to the same row conflict. They suit geographically separate writers on mostly separate data; for most apps a single primary with failover is simpler and safer.",
      "**Federation** splits by function: smaller databases, more of the working set fits in memory, and teams can scale each independently. Costs: no joins or transactions across databases, so the application joins in code or uses events to keep copies in sync.",
      "**Sharding** splits rows by a key. **Hash sharding** (hash(key) mod N, or consistent hashing) spreads load evenly but makes range queries visit every shard. **Range sharding** (A–F, G–M…, or by date) keeps ranges together but creates hot spots for sequential keys. **Directory sharding** keeps a lookup table key → shard, allowing you to move individual tenants, at the cost of an extra lookup.",
      "**A good shard key** has high cardinality, spreads writes evenly, and keeps the data of your most frequent queries on one shard. For a multi-tenant SaaS, the tenant (school_id) is often ideal: almost every query is 'within one school'. Bad keys: low-cardinality columns (country), monotonically increasing values under range sharding (created_at, auto-increment ids), and anything that changes.",
    ],
  },
  underTheHood: {
    text: [
      "**What sharding breaks.** Unique constraints and foreign keys across shards (enforce in the app or with global tables), auto-increment ids (use UUIDv7, Snowflake-style ids or per-shard ranges), joins across shards (denormalise or scatter-gather), transactions across shards (avoid, or use sagas, see 6.2.1), and aggregate queries (scatter to every shard, gather and merge). Schema migrations must run on every shard.",
      "**Resharding.** With hash mod N, going from N to N+1 shards moves almost every row; consistent hashing moves about 1/N (6.3.1). Many systems avoid the problem with many **logical shards** (e.g. 1,024) mapped onto a few physical servers; growing means moving whole logical shards to new servers, never re-hashing rows.",
      "**Denormalisation in practice.** Keep a `submissions_count` on the quiz row updated by the application or a trigger, a materialised view refreshed periodically, or a separate read model built from events (CQRS, 6.2.1). It trades write complexity and possible staleness for fast reads, which suits read-heavy systems (often 100:1 or more).",
    ],
    diagram: {
      title: "The scaling ladder (climb only as far as the numbers require)",
      nodes: [
        { label: "Tune + index", sub: "hours, free" },
        { label: "Cache + replicas", sub: "days" },
        { label: "Bigger server", sub: "minutes, $$" },
        { label: "Federate + denormalise", sub: "weeks" },
        { label: "Partition + shard", sub: "months, ongoing cost" },
      ],
      edges: ["still slow", "writes saturate", "still too big", "single table too big"],
    },
  },
  handsOn: [
    {
      title: "Evaluate shard keys by how evenly they spread data",
      text: ["Synthetic DevAtlas data: 200,000 attempts. Learners are spread across countries and schools very unevenly, like real data. Compare three candidate keys on 8 shards."],
      code: {
        lang: "python",
        file: "shard_keys.py",
        code: `import random, zlib
from collections import Counter

rng = random.Random(42)
countries = ["IN"] * 55 + ["US"] * 15 + ["BR"] * 10 + ["DE"] * 5 + ["NG"] * 5 + ["ID"] * 5 + ["FR"] * 3 + ["JP"] * 2
schools = [f"school-{i}" for i in range(2_000)]
school_weights = [1 / (i + 1) ** 0.8 for i in range(2_000)]   # a few big schools, many small ones

rows = []
for _ in range(200_000):
    rows.append({
        "learner_id": rng.randrange(1, 5_000_000),
        "country": rng.choice(countries),
        "school_id": rng.choices(schools, school_weights)[0],
    })

SHARDS = 8
def shard_of(value) -> int:
    return zlib.crc32(str(value).encode()) % SHARDS

for key in ("country", "school_id", "learner_id"):
    counts = Counter(shard_of(r[key]) for r in rows)
    sizes = [counts.get(s, 0) for s in range(SHARDS)]
    avg = sum(sizes) / SHARDS
    print(f"{key:10}  biggest shard {max(sizes) / avg:4.2f}x average, empty shards: {sizes.count(0)}")`,
      },
      output: "country     biggest shard 4.80x average, empty shards: 3\nschool_id   biggest shard 1.27x average, empty shards: 0\nlearner_id  biggest shard 1.01x average, empty shards: 0",
      notes: [
        "Country has 8 distinct values, so hashing cannot help: India's 55% lands on one shard. Learner id spreads perfectly but scatters each school across all shards, so 'school dashboard' queries hit every shard. School id is a good compromise if the biggest school fits comfortably in one shard; very big tenants can be split further or given their own shard (directory sharding).",
      ],
    },
    {
      title: "Range sharding on a time-ordered key creates a hot spot",
      code: {
        lang: "python",
        file: "hotspot.py",
        code: `import zlib
from collections import Counter

SHARDS = 4
# attempt ids grow over time; today's ids are 900,000..999,999
todays_ids = range(900_000, 1_000_000)

def range_shard(attempt_id: int) -> int:          # 0-249,999 -> 0, 250,000-499,999 -> 1, ...
    return min(attempt_id // 250_000, SHARDS - 1)

def hash_shard(attempt_id: int) -> int:
    return zlib.crc32(attempt_id.to_bytes(8, "big")) % SHARDS

for name, fn in (("range", range_shard), ("hash", hash_shard)):
    c = Counter(fn(i) for i in todays_ids)
    print(f"{name:5} today's writes per shard: {[c.get(s, 0) for s in range(SHARDS)]}")`,
      },
      output: "range today's writes per shard: [0, 0, 0, 100000]\nhash  today's writes per shard: [25000, 25000, 25000, 25000]",
      notes: ["With range sharding, all of today's inserts land on the last shard while the others sit idle. Range sharding works when the key is not sequential, or when old ranges are mostly read (e.g. time-series archives with a separate write tier)."],
    },
    {
      title: "Globally unique, time-sortable ids without a central counter",
      text: ["Auto-increment ids stop working across shards. A Snowflake-style id packs a timestamp, a shard (or worker) number and a per-millisecond sequence into 64 bits."],
      code: {
        lang: "python",
        file: "snowflake.py",
        code: `EPOCH_MS = 1_704_067_200_000          # 2024-01-01T00:00:00Z, our custom epoch
SHARD_BITS, SEQ_BITS = 10, 12           # 1,024 shards, 4,096 ids per ms per shard

def make_id(now_ms: int, shard: int, seq: int) -> int:
    return ((now_ms - EPOCH_MS) << (SHARD_BITS + SEQ_BITS)) | (shard << SEQ_BITS) | seq

def parse_id(i: int) -> tuple[int, int, int]:
    seq = i & ((1 << SEQ_BITS) - 1)
    shard = (i >> SEQ_BITS) & ((1 << SHARD_BITS) - 1)
    ms = (i >> (SHARD_BITS + SEQ_BITS)) + EPOCH_MS
    return ms, shard, seq

now = 1_760_000_000_000                 # a fixed instant in 2025
a = make_id(now, shard=7, seq=0)
b = make_id(now, shard=7, seq=1)
c = make_id(now + 1, shard=2, seq=0)
print(a, b, c)
print("sortable by time:", a < b < c)
print("decoded:", parse_id(c))
years = (1 << 41) / 1000 / 86400 / 365.25
print(f"41 timestamp bits last {years:.0f} years from the epoch")`,
      },
      output: "234599166771228672 234599166771228673 234599166775402496\nsortable by time: True\ndecoded: (1760000000001, 2, 0)\n41 timestamp bits last 70 years from the epoch",
      notes: ["UUIDv7 (RFC 9562) gives a similar time-ordered property in a standard 128-bit format and is supported by many libraries; PostgreSQL 18 adds a built-in uuidv7() function. Time-ordered ids keep B-tree inserts at the 'right edge' of the index, which is much faster than random UUIDv4 ids."],
    },
    {
      title: "Partitioning inside one PostgreSQL server, and sharding with Citus",
      code: {
        lang: "sql",
        file: "partitioning.sql",
        code: `-- Declarative range partitioning: one partition per month, same server
CREATE TABLE quiz_attempts (
    id          bigint      NOT NULL,
    school_id   bigint      NOT NULL,
    learner_id  bigint      NOT NULL,
    score       int         NOT NULL,
    created_at  timestamptz NOT NULL,
    PRIMARY KEY (id, created_at)                 -- the partition key must be in the PK
) PARTITION BY RANGE (created_at);

CREATE TABLE quiz_attempts_2026_10 PARTITION OF quiz_attempts
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE quiz_attempts_2026_11 PARTITION OF quiz_attempts
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- Old data leaves instantly, without a huge DELETE
ALTER TABLE quiz_attempts DETACH PARTITION quiz_attempts_2026_10;

-- Denormalised read model for dashboards, refreshed every few minutes
CREATE MATERIALIZED VIEW school_weekly_scores AS
SELECT school_id, date_trunc('week', created_at) AS week, avg(score) AS avg_score, count(*) AS attempts
FROM quiz_attempts GROUP BY 1, 2;
CREATE UNIQUE INDEX ON school_weekly_scores (school_id, week);
REFRESH MATERIALIZED VIEW CONCURRENTLY school_weekly_scores;

-- Sharding across servers with the Citus extension: distribute by tenant
-- SELECT create_distributed_table('quiz_attempts', 'school_id');`,
      },
      notes: ["Partitioning makes maintenance (dropping old data, vacuuming, index builds) cheap and lets the planner skip irrelevant partitions, but it does not add servers. Sharding (Citus, Vitess for MySQL, or application-level) does, at the costs listed above."],
    },
  ],
  companies: [
    "**Tenant sharding in SaaS.** Many B2B products shard by customer (tenant) so nearly every query stays on one shard; very large customers get dedicated shards. Directory-based routing lets them move a tenant between shards without touching the others.",
    "**Logical shards.** Large social and messaging platforms have described creating thousands of logical shards up front and mapping them to a smaller number of physical databases, so growth means moving logical shards, not re-hashing rows. Vitess (created at YouTube) automates this for MySQL; Citus does it for PostgreSQL.",
    "**Read replicas first.** Most web products run for years on one primary plus a few read replicas and a cache. Teams typically adopt sharding only for a few very large tables while keeping everything else unsharded.",
  ],
  mistakes: [
    { mistake: "Sharding before tuning", why: "Sharding sounds like the 'real' scaling solution", wrong: "Months of work and permanent complexity for a problem an index or a replica would have solved", fix: "Climb the ladder; shard only when writes or size exceed one big server, with numbers to prove it" },
    { mistake: "A low-cardinality or skewed shard key", why: "Country or plan type looked natural", wrong: "One shard holds most of the data and is the bottleneck", fix: "High-cardinality keys that match your access pattern; measure distribution on real data" },
    { mistake: "Range sharding on a sequential key", why: "Ranges look tidy", wrong: "All new writes hit the last shard", fix: "Hash the key, or use a non-sequential key" },
    { mistake: "hash(key) mod N with few shards", why: "Simplest formula", wrong: "Adding a shard moves almost every row", fix: "Consistent hashing or many logical shards mapped to physical servers" },
    { mistake: "Ignoring cross-shard queries", why: "Designing only for the main use case", wrong: "Admin reports and leaderboards hit every shard and time out", fix: "Denormalised read models, a separate analytics store, or scatter-gather with limits" },
    { mistake: "Reading your own writes from a lagging replica", why: "All reads routed to replicas", wrong: "Users see stale data right after saving", fix: "Read-your-own-writes routing (6.3.5)" },
  ],
  bestPractices: [
    { tag: "Cost", text: "Write the trigger for each scaling step (e.g. 'add a replica at 60% primary CPU at peak'); do not pay for complexity early." },
    { tag: "Performance", text: "Choose the shard key from your top queries: the most frequent ones should touch exactly one shard." },
    { tag: "Maintainability", text: "Start with many logical shards and a routing layer, so resharding is moving shards, not rewriting data." },
    { tag: "Reliability", text: "Automate migrations, backups and restore drills per shard; one forgotten shard is a data-loss incident." },
  ],
  interview: [
    { q: "Your database is overloaded. What do you do, in order?", a: "Measure what is overloaded (reads or writes, CPU, I/O, locks). Then: tune queries and indexes, add caching for hot reads, add read replicas for read load, scale up the server, federate by domain, denormalise expensive reads, partition big tables, and only then shard for write throughput or data size. Each step has trade-offs, so I stop as soon as the numbers are met." },
    { q: "How do you choose a shard key?", a: "From the access patterns: the key should have high cardinality, spread writes evenly and keep the data of the most frequent queries together, like tenant_id for a SaaS. Avoid low-cardinality, skewed or sequential keys (with range sharding) and keys that change. Check the distribution on real data and plan for very large tenants." },
    { q: "What problems does sharding introduce?", a: "Cross-shard joins, transactions, unique constraints and aggregates become hard; ids need a global scheme (Snowflake, UUIDv7); migrations, backups and monitoring multiply; hot shards appear if the key is skewed; and resharding moves data. Mitigations: tenant-aligned keys, denormalised read models, logical shards with a routing layer, and tooling like Vitess or Citus." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Reads are 95% of the load and the primary's CPU is at 85%. What is usually the best next step?",
      options: ["Shard the database", "Add read replicas and cache hot reads", "Switch to multi-primary replication", "Federate by function"],
      answer: 1,
      explanation: "Read-heavy load is the cheapest kind to scale: replicas and caches.",
    },
    {
      kind: "bug",
      prompt: "Attempts are range-sharded by attempt_id (auto-increment) across 4 shards. Shard 4 is at 100% CPU, shards 1–3 are idle. Why?",
      options: ["Shard 4 has a slower disk", "New ids are always in the last range, so all inserts go to the last shard", "Hashing is uneven", "Replication lag"],
      answer: 1,
      explanation: "Sequential keys plus range sharding create a write hot spot.",
    },
    {
      kind: "mcq",
      prompt: "Which is the best shard key for a multi-school learning platform where almost every query is 'within one school'?",
      options: ["country", "created_at", "school_id", "score"],
      answer: 2,
      explanation: "Tenant id keeps each school's queries on one shard; watch for very large schools.",
    },
  ],
  cheatSheet: [
    "Ladder: tune → cache → replicas → scale up → federate → denormalise → partition → shard.",
    "Replicas scale reads, not writes; mind replication lag.",
    "Federation: split by function; no cross-DB joins.",
    "Hash sharding: even, but ranges scatter. Range: ranges stay together, hot spots on sequential keys.",
    "Directory sharding: lookup table, can move tenants.",
    "Shard key: high cardinality, even, matches top queries, never changes.",
    "Ids: Snowflake or UUIDv7, not auto-increment.",
    "Many logical shards → painless resharding.",
  ],
  homework: {
    basic: {
      title: "Pick the next rung on the ladder",
      brief: [
        "For each situation, name the next step and the evidence you would collect first: (a) dashboard page takes 4 s, DB CPU 20%, one query does a sequential scan; (b) DB CPU 80% at peak, 92% reads; (c) the users table and the analytics events table compete for cache memory; (d) 40,000 writes/s on one table, largest instance already in use; (e) monthly reports lock the attempts table for 10 minutes.",
      ],
      criteria: ["One step per situation", "Evidence named", "No sharding unless writes or size demand it"],
      hints: ["Only one of the five really needs sharding."],
      solution: {
        text: ["The pattern: identify what is saturated, then pick the cheapest step that removes it. Only (d) is a write-throughput problem that one server cannot solve."],
        code: {
          lang: "markdown",
          file: "docs/db-scaling-decisions.md",
          code: `| Situation | Evidence to collect | Next step |
|---|---|---|
| (a) 4 s page, CPU 20%, seq scan | EXPLAIN (ANALYZE, BUFFERS) of the query | Add the right composite index; fix N+1 queries |
| (b) CPU 80%, 92% reads | Top queries by total time (pg_stat_statements); cache hit ratio | Cache hot reads in Redis; add a read replica; route reads with read-your-own-writes |
| (c) users vs events compete for memory | Buffer cache usage per table; working-set size | Federate: move analytics events to their own database (or a columnar store) |
| (d) 40k writes/s on one table, max instance | Write rate trend, WAL volume, lock waits | Shard that table by tenant (Citus / application routing); keep other tables unsharded |
| (e) reports lock the table | Lock waits during report window | Run reports on a replica or a materialised view; partition by month so reports scan less |`,
        },
      },
    },
    intermediate: {
      title: "Directory sharding: move one big tenant",
      brief: [
        "Implement directory-based sharding: a dict school_id → shard. New schools go to the shard with the fewest learners. Then 'school-1' grows to 40% of all learners; move it to a new dedicated shard by changing only its directory entry, and print the per-shard sizes before and after. Count how many schools had to move.",
      ],
      criteria: ["Placement by least-loaded shard", "Move changes one directory entry", "Before/after sizes printed"],
      hints: ["In real life the move is: copy data, catch up with replication, switch the directory entry, delete old copy."],
      solution: {
        text: ["Only one school moves, and every other school keeps its location, which is the main advantage of directory sharding over hash mod N. The directory itself must be highly available and cached by every app server."],
        code: {
          lang: "python",
          file: "directory_shards.py",
          code: `import random

rng = random.Random(5)
learners = {f"school-{i}": rng.randint(200, 2_000) for i in range(2, 61)}
directory: dict[str, str] = {}
shards = {"s1": 0, "s2": 0, "s3": 0}

def place(school: str, size: int) -> None:
    target = min(shards, key=shards.get)               # least-loaded shard
    directory[school] = target
    shards[target] += size

for school, size in learners.items():
    place(school, size)

# school-1 signs a national contract and becomes huge
learners["school-1"] = int(sum(learners.values()) * 0.4 / 0.6)
place("school-1", learners["school-1"])
print("before:", shards, "school-1 on", directory["school-1"])

# move it to a dedicated shard: one directory change
old = directory["school-1"]
shards[old] -= learners["school-1"]
shards["s4-dedicated"] = learners["school-1"]
directory["school-1"] = "s4-dedicated"
print("after: ", shards)
print("schools moved: 1 of", len(directory))`,
        },
        output: "before: {'s1': 21466, 's2': 63113, 's3': 20951} school-1 on s2\nafter:  {'s1': 21466, 's2': 20901, 's3': 20951, 's4-dedicated': 42212}\nschools moved: 1 of 60",
      },
    },
    challenge: {
      title: "Scatter-gather: a global top 10 across shards",
      brief: [
        "Learners' weekly scores are sharded by learner_id across 6 shards. Implement 'global top 10' efficiently: each shard returns only its local top 10, and the coordinator merges them. Prove the result equals the top 10 of all data combined, and print how many rows travelled over the network compared with sending everything.",
      ],
      criteria: ["Per-shard top-k", "Merge with heapq", "Equality check against a full sort", "Network rows compared"],
      hints: ["The global top 10 must be inside the union of each shard's top 10. Why?"],
      solution: {
        text: ["Any row in the global top 10 is also in its own shard's top 10 (fewer than 10 rows on that shard can beat it), so per-shard top-k is exact and sends 60 rows instead of 300,000. The same idea works for COUNT and SUM (send partial aggregates) but not for medians or distinct counts, which need sketches such as t-digest or HyperLogLog."],
        code: {
          lang: "python",
          file: "scatter_gather.py",
          code: `import heapq, random

rng = random.Random(11)
SHARDS, K = 6, 10
shards = [[] for _ in range(SHARDS)]
for learner_id in range(300_000):
    shards[learner_id % SHARDS].append((rng.randint(0, 100_000), learner_id))

def shard_top_k(rows, k):                     # runs on each shard (ORDER BY score DESC LIMIT k)
    return heapq.nlargest(k, rows)

partials = [shard_top_k(rows, K) for rows in shards]
merged = heapq.nlargest(K, (row for part in partials for row in part))

everything = sorted((row for rows in shards for row in rows), reverse=True)[:K]
print("exact:", merged == everything)
print("rows sent: scatter-gather", sum(len(p) for p in partials), "vs naive", sum(len(s) for s in shards))
print("top 3:", merged[:3])`,
        },
        output: "exact: True\nrows sent: scatter-gather 60 vs naive 300000\ntop 3: [(99999, 182868), (99999, 176239), (99999, 87554)]",
      },
    },
    capstone: {
      title: "DevAtlas: a data-scaling plan with triggers",
      brief: [
        "Write docs/data-scaling.md for your capstone: current size and growth of the largest tables, the access patterns per table, the next three scaling steps with a measurable trigger for each, the shard key you would choose if you ever shard (with the queries it keeps local and the ones it breaks), and your id strategy.",
      ],
      criteria: ["Numbers for the biggest tables", "Each step has a trigger metric", "Shard key justified by queries", "Id strategy compatible with sharding"],
      hints: ["pg_total_relation_size and pg_stat_user_tables give sizes and read/write counts."],
      solution: {
        text: ["A model plan is mostly about deferring work safely: it shows the team when to act, and makes today's choices (ids, tenant column on every table) compatible with tomorrow's sharding."],
        code: {
          lang: "markdown",
          file: "docs/data-scaling.md",
          code: `# DevAtlas data-scaling plan

## Biggest tables (2026-10)
| Table | Rows | Size incl. indexes | Growth/month | Reads:writes |
|---|---|---|---|---|
| quiz_attempts | 180 M | 61 GB | +15 M rows | 3:1 |
| lesson_progress | 12 M | 4 GB | +1 M | 40:1 |
| tutor_messages | 30 M | 22 GB | +4 M | 5:1 |

## Access patterns
- 90% of queries filter by school_id and/or learner_id.
- Cross-school queries: global leaderboard (served from Redis), admin analytics (nightly export to the warehouse).

## Next steps and triggers
1. **Read replica for lesson_progress reads**: when primary CPU > 60% at the 09:00 peak for 3 school days.
2. **Monthly partitions for quiz_attempts** (detach after 24 months to cold storage): when the table passes 300 M rows or autovacuum takes > 1 h.
3. **Shard quiz_attempts and tutor_messages by school_id (Citus)**: when write rate > 15k/s at peak or the primary needs a bigger instance than db.r7g.8xlarge.

## If we shard: key = school_id
- Stays local: learner dashboard, school dashboard, teacher reports, quiz submission.
- Breaks: global leaderboard (already in Redis), cross-school analytics (warehouse), learners who change school (migrate their rows; rare).
- Big tenants: the national contract school would get a dedicated shard (directory entry).

## Ids
All new tables use UUIDv7 primary keys (time-ordered, unique across shards).
Every tenant-owned table already has school_id NOT NULL, indexed, so distribution later is a config change, not a migration of every table.`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer: RDBMS replication, federation, sharding, denormalisation, SQL tuning (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#relational-database-management-system-rdbms" },
    { label: "PostgreSQL: table partitioning", url: "https://www.postgresql.org/docs/current/ddl-partitioning.html" },
    { label: "Citus: choosing a distribution column", url: "https://docs.citusdata.com/en/stable/sharding/data_modeling.html" },
    { label: "Vitess: sharding concepts", url: "https://vitess.io/docs/reference/features/sharding/" },
  ],
  nextPreview: "Next: SQL or NoSQL. Key-value, document, wide-column and graph stores, what each is good at, and how to choose by access pattern instead of by hype.",
};
