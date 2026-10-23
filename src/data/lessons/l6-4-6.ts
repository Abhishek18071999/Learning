import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.6",
  title: "Design sales rank by category",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["6.3.2 The design method: requirements, estimates and numbers to know", "6.3.8 Scaling relational databases: replication, federation and sharding", "6.3.10 Caching strategies: cache-aside, write-through, write-behind, refresh-ahead", "6.3.11 Asynchronism: message queues, task queues and back pressure"],
  summary: "Design Amazon's sales rank by category: log transactions to object storage, aggregate weekly totals with a two-step MapReduce that gets a distributed sort for free, and serve the tiny precomputed table to 40,000 reads per second through a cache — the pattern behind every leaderboard DevAtlas ships.",
  terms: [
    { term: "batch aggregation", def: "Summing raw events into a small result table on a schedule (hourly here), instead of computing the answer inside each request." },
    { term: "MapReduce", def: "A batch framework: map transforms each record into key-value pairs, the framework shuffles and sorts them, reduce combines the values per key. Every phase runs in parallel across machines." },
    { term: "precomputed ranking", def: "The ranking is calculated ahead of time and stored in a table; requests only read the finished answer, never the raw events." },
    { term: "hourly refresh", def: "Results are rebuilt every hour, so a ranking can be stale by up to about an hour. That is a product decision, not a technical limit." },
    { term: "sales rank table", def: "The small SQL table the batch job writes: id, category_id, total_sold, product_id. All reads hit this, never the raw log." },
    { term: "read-heavy workload", def: "100:1 read to write here: 40,000 reads/s vs 400 writes/s. The design spends its effort making reads cheap and leaves writes to a batch path." },
    { term: "distributed sort", def: "Ordering data too big for one machine by re-keying records so the framework's shuffle partitions and orders them across the cluster — the two-stage trick." },
  ],
  problem: [
    "DevAtlas already shows leaderboards, popular-lessons lists and weekly digests, and every one of them is the same read-heavy, precomputed-ranking pattern Amazon runs for its Best Sellers: 40,000 reads per second against lists that only change every hour. A naive version — a SUM() over a billion transactions per page view — dies on day one. This lesson, the last of the design-cases module, designs the feature properly.",
    "The skill transfers everywhere. Whenever you hear 'top 10 by category', 'trending this week' or 'most popular', the answer has the same shape: log the raw events cheaply, aggregate them in a batch job, store one small precomputed table, and serve it from a cache. Learn the shape once and every leaderboard you will ever build becomes a two-hour job.",
  ],
  concept: {
    analogy: [
      "A cinema that posts the week's box-office top 10 by the entrance. Nobody re-counts every ticket when a passer-by glances at the poster: the box office tallies sales in the back, and someone re-prints the poster each morning. The poster can be a day out of date, and that is accepted, because freshness is not the point of a poster.",
      "An election count. Every ballot is logged as it is cast (the raw log), but results are computed once by the tellers (the batch job) and published on the board (the table). You do not re-count all ballots each time someone asks who won.",
    ],
    precise: [
      "**Compute in batch, serve tiny.** A MapReduce job over the raw log produces the sales_rank table — a handful of rows per category — while the 40 GB/month of raw transactions stay in object storage. The read path never touches the log.",
      "**Two stages to buy a distributed sort.** Stage 1 aggregates to ((category, product), quantity). Stage 2 re-keys to ((category, quantity), product); the framework's shuffle/sort now orders everything globally for free, and an identity reducer just passes rows through. Sorting 20 million pairs on one machine becomes sorting nothing yourself.",
      "**Hourly freshness is a product decision.** A sale takes up to about two rebuild intervals to influence a cached list. Shoppers barely notice; a trending-charts feature might. The primer notes that more popular products might need to be updated more frequently — pay for freshness only where users feel it.",
      "**Cache the top lists.** 40,000 reads/s on average, higher at peak, cannot hit SQL. A memory cache serves popular categories' lists; misses fall through to the indexed table, and beyond that: replicas, federation, sharding — in that order, never all at once.",
    ],
  },
  underTheHood: {
    text: [
      "**Log first, decide later.** Sales API servers write tab-delimited rows (timestamp, product_id, category_id, qty, total_price, seller_id, buyer_id) to object storage such as S3, and nothing downstream blocks the sale. At ~40 bytes per transaction that is 40 GB/month, 1.44 TB in three years — exactly the kind of cheap, append-only data object storage is built for. The primer's guidance: keep only a limited time period in the operational database and let the object store or a warehouse hold the rest.",
      "**The two-step MapReduce.** Step 1: the mapper filters rows to the past week and emits ((category_id, product_id), quantity); the reducer sums per key. Step 2: the re-key trick — the mapper emits ((category_id, quantity), product_id), and because the framework sorts and shuffles by key, that alone produces the globally sorted ranking; an identity reducer passes it through. The result is inserted into sales_rank (id, category_id, total_sold, product_id) with indexes on id, category_id and product_id, so lookups are log-time instead of scans.",
      "**The read path.** Client → web server (acting as a reverse proxy) → Read API → the SQL sales_rank table. The public API is REST: GET /api/v1/popular?category_id=1234 returns a list of {id, category_id, total_sold, product_id}. Items that live in several categories appear in each category's list, because aggregation is keyed on the (category, product) pair — the multi-category constraint is handled by the key, not by extra logic.",
      "**Scaling.** 40,000 reads/s average (higher at peak, and traffic is uneven): popular content and its rank are served from a memory cache. Read replicas may not keep up with the cache misses, so federation, sharding, denormalisation and SQL tuning come next. 400 writes/s average may already exceed a single SQL write master — and the analytics on the full history move to a warehouse such as Redshift or BigQuery, leaving the operational DB small and fast.",
    ],
    diagram: {
      title: "Sales rank: batch write path, instant read path",
      nodes: [
        { label: "Sales API logs", sub: "tab-delimited rows" },
        { label: "Object store (S3)", sub: "40 GB/month" },
        { label: "MapReduce job", sub: "2 steps, hourly" },
        { label: "sales_rank table", sub: "small, indexed" },
        { label: "Read API + cache", sub: "40k reads/s" },
      ],
      edges: ["ship logs", "aggregate", "INSERT", "GET top-K"],
      caption: "Writes are collected cheaply and processed in batch; only a tiny table and a cache sit on the hot read path.",
    },
  },
  handsOn: [
    {
      title: "The numbers that drive every decision",
      code: {
        lang: "text",
        code: `1e9 tx/month x 40 B = 40 GB/month           (transaction record is ~40 bytes)
1e9 tx x 36 months x 40 B = 1.44 TB in 3 years
1e9 / 2.5e6 s = 400 writes/s                (2.5 million seconds per month)
100e9 / 2.5e6 = 40,000 reads/s
100:1 read:write

transaction record ~40 bytes:
  created_at 5 B, product_id 8 B, category_id 4 B, seller_id 8 B, buyer_id 8 B, quantity 4 B, total_price 5 B

constraints: 10M products, 1,000 categories, no subcategories, items cannot
change categories, traffic uneven, results refresh hourly (hot ones more often)`,
      },
      notes: ["Read the last line as the design decision: because reads outnumber writes 100:1, we pay the aggregation cost once per hour and never again per request."],
    },
    {
      title: "High-level design: batch write path, instant read path",
      code: {
        lang: "mermaid",
        code: `flowchart LR
  logs[Sales API server logs<br/>tab-delimited] -->|upload| s3[(Object store S3<br/>40 GB/month)]
  s3 -->|input| mr[MapReduce job<br/>2 steps, hourly]
  mr -->|INSERT| rank[(sales_rank table<br/>id, category_id, total_sold, product_id)]
  client([Client]) --> web[Web server<br/>reverse proxy]
  web --> api[Read API]
  api --> cache[(Memory cache<br/>hot category lists)]
  cache -->|miss| rank
  api -->|miss| rank`,
      },
    },
    {
      title: "Map: filter to the week. Reduce: sum per (category, product)",
      text: ["One MapReduce pass over a tab-delimited log in the primer's sample shape. The mapper emits ((category, product), qty) only for rows inside the past week; the reducer sums per key; the top K per category is what would be inserted into the sales_rank table."],
      code: { lang: "python", file: "sales_rank_mapreduce.py", code: `"""One MapReduce pass over a tab-delimited transaction log (the primer's sample shape):
the mapper emits ((category, product), qty) for rows inside the past week, the reducer
sums per key, and the top K per category is printed."""
from collections import defaultdict

LOG = [
    # ts  product_id  category_id  qty  total_price  seller_id  buyer_id
    "1\tp1\tc1\t2\t20.00\t1\t1",
    "1\tp1\tc2\t2\t20.00\t2\t2",
    "1\tp1\tc2\t1\t10.00\t2\t3",
    "2\tp2\tc1\t3\t7.00\t3\t4",
    "3\tp3\tc2\t7\t2.00\t4\t5",
    "4\tp4\tc1\t1\t5.00\t5\t6",
    "6\tp1\tc1\t4\t40.00\t1\t7",
    "7\tp2\tc2\t1\t2.50\t3\t8",
    "8\tp5\tc1\t5\t3.00\t6\t9",
]
NOW, WEEK, K = 8, 7, 2


def mapper(line: str):
    ts, product, category, qty, *_ = line.split("\t")
    if int(ts) >= NOW - WEEK + 1:            # days 2..8 are inside the past week
        yield (category, product), int(qty)


def reducer(pairs):
    sums: defaultdict = defaultdict(int)
    for key, qty in pairs:
        sums[key] += qty
    return dict(sums)


pairs = [pair for line in LOG for pair in mapper(line)]
sums = reducer(pairs)

print(f"{len(LOG)} log rows, {len(pairs)} kept inside the week, {len(sums)} distinct keys")
for key, qty in sorted(sums.items()):
    print(f"  {key} -> {qty}")

print(f"top {K} per category (the rows that would be inserted into the sales_rank table)")
by_category: defaultdict = defaultdict(list)
for (category, product), qty in sums.items():
    by_category[category].append((qty, product))
for category in sorted(by_category):
    top = sorted(by_category[category], reverse=True)[:K]
    print(f"  {category}: {[(p, q) for q, p in top]}")` },
      output: "9 log rows, 6 kept inside the week, 6 distinct keys\n  ('c1', 'p1') -> 4\n  ('c1', 'p2') -> 3\n  ('c1', 'p4') -> 1\n  ('c1', 'p5') -> 5\n  ('c2', 'p2') -> 1\n  ('c2', 'p3') -> 7\ntop 2 per category (the rows that would be inserted into the sales_rank table)\n  c1: [('p5', 5), ('p1', 4)]\n  c2: [('p3', 7), ('p2', 1)]",
      notes: [
        "One pass over the log replaces thousands of SUM() queries per second on the read path: the log is scanned once per hour, never per page view. Filtering happens in the mapper, so rows outside the week never pay reduce cost, and a product in two categories is two keys — the multi-category constraint handled by the key itself.",
      ],
    },
    {
      title: "Two stages: re-key so the framework sorts for you",
      text: ["Stage 1 is the aggregation above. Stage 2 re-keys to ((category, -qty, product), product): because the framework's shuffle/sort orders by key, the global ranking emerges with zero sorting code, and an identity reducer passes rows through."],
      code: { lang: "python", file: "two_stage_sort.py", code: `"""The primer's two-stage MapReduce trick: stage 1 aggregates ((category, product), qty);
stage 2 re-keys to ((category, qty), product) so the framework's shuffle/sort becomes the
global sort, and an identity reducer passes rows through. Negating qty makes the framework
sort descending; adding the product id breaks ties deterministically."""
from collections import defaultdict

LOG = [
    # ts  product_id  category_id  qty  total_price  seller_id  buyer_id
    "1\tp1\tc1\t2\t20.00\t1\t1",
    "1\tp1\tc2\t2\t20.00\t2\t2",
    "1\tp1\tc2\t1\t10.00\t2\t3",
    "2\tp2\tc1\t3\t7.00\t3\t4",
    "3\tp3\tc2\t7\t2.00\t4\t5",
    "4\tp4\tc1\t1\t5.00\t5\t6",
    "6\tp1\tc1\t4\t40.00\t1\t7",
    "7\tp2\tc2\t1\t2.50\t3\t8",
    "8\tp5\tc1\t5\t3.00\t6\t9",
]
NOW, WEEK = 8, 7


def stage1(log):
    sums: defaultdict = defaultdict(int)
    for line in log:
        ts, product, category, qty, *_ = line.split("\t")
        if int(ts) >= NOW - WEEK + 1:
            sums[(category, product)] += int(qty)
    return dict(sums)


def stage2(sums):
    pairs = [((category, -qty, product), product)
             for (category, product), qty in sums.items()]
    pairs.sort()                       # the framework's shuffle/sort does this across the cluster
    return pairs


def identity_reduce(pairs):
    return pairs                       # nothing left to combine: every key is unique


sums = stage1(LOG)
ranked = identity_reduce(stage2(sums))

print("stage 1: (category, product) -> total quantity")
for key, qty in sorted(sums.items()):
    print(f"  {key} -> {qty}")
print("stage 2: ((category, -qty, product), product) as sorted by the framework")
for (category, neg_qty, product), prod in ranked:
    print(f"  (({category}, {neg_qty}, {product}), {prod})   sold {abs(neg_qty)}")` },
      output: "stage 1: (category, product) -> total quantity\n  ('c1', 'p1') -> 4\n  ('c1', 'p2') -> 3\n  ('c1', 'p4') -> 1\n  ('c1', 'p5') -> 5\n  ('c2', 'p2') -> 1\n  ('c2', 'p3') -> 7\nstage 2: ((category, -qty, product), product) as sorted by the framework\n  ((c1, -5, p5), p5)   sold 5\n  ((c1, -4, p1), p1)   sold 4\n  ((c1, -3, p2), p2)   sold 3\n  ((c1, -1, p4), p4)   sold 1\n  ((c2, -7, p3), p3)   sold 7\n  ((c2, -1, p2), p2)   sold 1",
      notes: [
        "The primer's example sorts ascending by quantity; negating the quantity (and appending the product id as a tie-breaker) gives 'top sellers first' with the same trick. In a real cluster that sort is distributed across reducers by key range; no single machine ever holds all 20 million pairs.",
      ],
    },
    {
      title: "Serve the ranking: TTL cache, hourly rebuild, bounded staleness",
      text: ["A rebuild job aggregates the past week's log into the sales_rank table every 60 ticks (the primer refreshes hourly). Reads hit a per-category cache with the same TTL. Watch a sale injected mid-hour stay invisible for at most one rebuild interval, and compare the cost against aggregating on every read."],
      code: { lang: "python", file: "rank_cache.py", code: `"""Serve precomputed rankings through a TTL cache and see what hourly refresh costs.
A rebuild job aggregates the past week's log into the sales_rank table every 60 ticks
(the primer refreshes hourly). Reads hit a per-category cache with the same TTL; a naive
server would scan the whole log on every read. A sale injected mid-hour stays invisible
for at most one rebuild interval."""
from collections import defaultdict

REBUILD = 60
K = 2
NOW, WEEK = 8, 7

LOG = [(1, "p1", "c1", 2), (1, "p1", "c2", 2), (1, "p1", "c2", 1),
       (2, "p2", "c1", 3), (3, "p3", "c2", 7), (4, "p4", "c1", 1),
       (6, "p1", "c1", 4), (7, "p2", "c2", 1), (8, "p5", "c1", 5)]


def aggregate(rows):
    sums: defaultdict = defaultdict(int)
    for day, product, category, qty in rows:
        if day >= NOW - WEEK + 1:
            sums[(category, product)] += qty
    return dict(sums)


class RankServer:
    def __init__(self, rows):
        self.rows = rows
        self.table = {}
        self.cache = {}                  # category -> (built_at, top list)
        self.hits = self.misses = self.rebuilds = 0

    def rebuild(self, now):
        self.table = aggregate(self.rows)
        self.rebuilds += 1
        print(f"  rebuild #{self.rebuilds} at t={now:<3} -> {len(self.table)} rows in sales_rank")

    def add_sale(self, row):
        self.rows.append(row)

    def top(self, category, now):
        entry = self.cache.get(category)
        if entry and now - entry[0] < REBUILD:
            self.hits += 1
            return entry[1]
        self.misses += 1
        rows = sorted(((qty, product) for (cat, product), qty in self.table.items()
                       if cat == category), reverse=True)
        top = [(product, qty) for qty, product in rows[:K]]
        self.cache[category] = (now, top)
        return top


server = RankServer(LOG)
server.rebuild(0)
before = server.top("c2", 0)

reads = 1
after = None
for t in range(1, 100):
    if t == 30:
        server.add_sale((8, "p3", "c2", 20))    # mid-hour: 20 more copies of p3 sell
    if t == 60:
        server.rebuild(60)
    top = server.top("c2", t)
    reads += 1
    if t == 60:
        after = top

print(f"c2 ranking before the sale at t=30:  {before}")
print(f"c2 ranking after the t=60 rebuild:   {after}")
print(f"reads: {reads}   cache hits: {server.hits}   misses: {server.misses}   rebuilds: {server.rebuilds}")
print(f"the sale stayed invisible for 30 ticks, bounded by the {REBUILD}-tick rebuild interval")
print(f"precomputed + cache: {server.rebuilds} log scans   per-read aggregation: {reads} log scans")` },
      output: "  rebuild #1 at t=0   -> 6 rows in sales_rank\n  rebuild #2 at t=60  -> 6 rows in sales_rank\nc2 ranking before the sale at t=30:  [('p3', 7), ('p2', 1)]\nc2 ranking after the t=60 rebuild:   [('p3', 27), ('p2', 1)]\nreads: 100   cache hits: 98   misses: 2   rebuilds: 2\nthe sale stayed invisible for 30 ticks, bounded by the 60-tick rebuild interval\nprecomputed + cache: 2 log scans   per-read aggregation: 100 log scans",
      notes: [
        "Invalidate per category when the job commits and the cache can stay warm across rebuilds; the TTL is the backstop that bounds staleness — rebuild interval plus one TTL — even if invalidation fails.",
      ],
    },
  ],
  companies: [
    "**Amazon (Best Sellers, ongoing):** the Best Sellers pages on amazon.com let shoppers find the top 100 most popular items in Amazon Best Sellers — the public sales-rank feature this design case is modelled on, [Amazon Best Sellers](https://www.amazon.com/gp/bestsellers/).",
    "**Steam / Valve (Top Sellers charts, ongoing):** the Steam store publishes Top Sellers charts — live, weekly (dated charts such as 13 Oct 2026) and yearly — precomputed rankings served to a huge read audience, the same pattern with fewer 'categories', [Steam Charts](https://store.steampowered.com/charts/).",
    "**Amazon Web Services (Amazon EMR, ongoing):** a big data processing service for running Apache Spark, Trino, Apache Flink and Apache Hive with petabyte-scale analytics — the managed, cloud-era descendant of the MapReduce cluster the primer's batch job would run on, [Amazon EMR](https://aws.amazon.com/emr/).",
  ],
  mistakes: [
    { mistake: "Aggregating on read at 40,000 reads/s", why: "A SUM(quantity) over the transactions table per request is the simplest thing that works", wrong: "Every page view scans a billion-row table; the database saturates in minutes and page latency spikes with the log size", fix: "Batch MapReduce hourly into a small sales_rank table; reads are indexed lookups or cache hits" },
    { mistake: "Ignoring the multi-category constraint", why: "Assuming one category per product, so transactions log only product_id", wrong: "A product in three categories is counted once (wrong totals everywhere) or cannot be ranked per category at all", fix: "Log category_id on every transaction and aggregate keyed on (category, product), so the product appears in each of its categories" },
    { mistake: "Keeping the unbounded log in the OLTP database", why: "'Keep all transactions in MySQL for auditing'", wrong: "40 GB/month, 1.44 TB in three years, grows into the same database that must serve 40,000 reads/s; writes, backups and reads all fight", fix: "Raw logs to object storage; keep only a limited window in the operational DB and the rest in a warehouse" },
    { mistake: "Re-ranking on every click instead of hourly", why: "Freshness above all else", wrong: "40,000 aggregations per second for a number users glance at; cost explodes with zero visible benefit", fix: "Hourly rebuild; refresh more often only for the popular products the primer says might need it" },
    { mistake: "One giant sort on one machine", why: "Sorting the aggregated pairs in the reducer feels natural", wrong: "All pairs funnel to a single reducer (or one box): 20 million pairs on one machine is slow and a single point of failure", fix: "Re-key to ((category, qty), product) so the framework's shuffle/sort performs a distributed sort, then an identity reducer" },
    { mistake: "Cache with no TTL or invalidation", why: "The ranking is 'static for the hour', so the cache never expires", wrong: "After the first rebuild the cache serves yesterday's lists forever, and memory grows without bound", fix: "TTL equal to the rebuild interval, plus explicit invalidation when the job commits a new table" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Precompute heavy aggregations in batch; the read path should be an indexed lookup or a cache hit, never a scan of the raw events." },
    { tag: "Reliability", text: "Keep the previous good snapshot: if the batch job fails, serve last hour's rankings and alert on the job's last-success age, never an empty list." },
    { tag: "Cost", text: "Raw logs belong in object storage (40 GB/month is cheap there); only the small derived table and a bounded cache live in the operational tier." },
    { tag: "Maintainability", text: "Two simple stages beat one clever job: each stage is testable against a fixed input file, and re-running either is idempotent." },
  ],
  interview: [
    { q: "Design Amazon's sales rank by category.", a: "Clarify first: past week's most popular products per category, users view them, high availability; the rest of the e-commerce site is out of scope. Constraints: 10M products, 1,000 categories, no subcategories, items can be in multiple categories but cannot change them, 1B transactions/month, 100B reads/month, 100:1 read:write, results refresh hourly. Estimates: ~40 B per transaction → 40 GB/month, 1.44 TB in 3 years; 400 writes/s and 40,000 reads/s average. Design: Sales API writes tab-delimited logs to S3; a two-step MapReduce runs hourly — stage 1 maps to ((category, product), qty) filtered to the week and the reducer sums; stage 2 re-keys to ((category, qty), product) so the framework's shuffle/sort does the distributed sort, with an identity reducer. Output lands in a sales_rank table (id, category_id, total_sold, product_id) indexed on id, category_id and product_id. Read path: client → web server → Read API → the table, exposed as GET /api/v1/popular?category_id=… returning [{id, category_id, total_sold, product_id}]. Scaling: memory cache for popular content at 40k reads/s; replicas then federation/sharding/denormalisation/SQL tuning for misses; a warehouse (Redshift/BigQuery) for analytics; keep only a limited window in the operational DB." },
    { q: "Why does the MapReduce pipeline have two stages instead of sorting inside stage 1?", a: "Stage 1's keys are (category, product), so the framework sorts by product id within a category — not the ranking order. Sorting by quantity inside stage 1 would mean one reducer (or one machine) holding all of a category's rows and a secondary sort on the values, which is exactly the single-machine bottleneck. Re-keying to ((category, qty), product) puts the quantity inside the key, so the framework's existing shuffle/sort — already distributed across reducers — produces the globally sorted ranking for free, and the identity reducer just passes rows through. It turns 'sort a giant dataset' into 'emit a different key'." },
    { q: "A viral product is selling fast but does not appear in the rankings. What is happening, and what would you change?", a: "First check whether the batch job is actually succeeding — check its last-success timestamp before touching the design, because a silent failure plus a warm cache looks exactly like this: fast reads, healthy DB, stale lists. If the job is fine, this is staleness by design: the rankings rebuild hourly and the cache TTL matches, so a new sale can be invisible for up to roughly two rebuild intervals. Options: refresh popular products' categories more often, as the primer suggests; invalidate the cache per category the moment the job commits instead of waiting for the TTL; or add a fast path that merges a small 'recent movers' list computed more frequently. The number to give product is the staleness bound — up to one rebuild interval plus one TTL — and let them decide what to pay for." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "A sales log records 1 billion transactions per month. With 2.5 million seconds per month, roughly how many writes per second is that on average?",
      options: ["40", "400", "4,000", "40,000"],
      answer: 1,
      explanation: "1e9 / 2.5e6 = 400 writes/s on average (higher at peak). The same conversion turns 100 billion reads into 40,000 reads/s.",
    },
    {
      kind: "mcq",
      prompt: "Why does stage 2 of the MapReduce re-key (category, product) → ((category, qty), product) instead of sorting in stage 1?",
      options: ["To deduplicate product rows", "So the framework's shuffle/sort performs the global sort for free", "To compress the intermediate data", "To let one reducer handle each category"],
      answer: 1,
      explanation: "The framework sorts by key; putting the quantity inside the key makes its existing distributed sort produce the ranking, with an identity reducer passing rows through. No custom sorting code anywhere.",
    },
    {
      kind: "bug",
      prompt: "The Best Sellers lists stopped updating two days ago. Reads are fast, the cache hit ratio is 99%, and the API and database are healthy — but every list is two days old. What is the root cause?",
      options: ["The read replicas are lagging", "The MapReduce job is failing (or its alert is silenced) and the cache keeps serving the last good table", "The sales_rank table lost an index", "The load balancer routes to a stale server"],
      answer: 1,
      explanation: "The batch job is the only writer of the sales_rank table. A dead job plus a cache full of old lists looks exactly like this: fast, healthy, stale. Check the job's last-success timestamp first, then rebuild and invalidate.",
    },
  ],
  cheatSheet: [
    "Shape: 10M products, 1,000 categories, 1B tx/month, 100B reads/month → 400 writes/s, 40,000 reads/s, 100:1 read:write.",
    "Pipeline: Sales API logs (tab-delimited) → S3 → two-step MapReduce hourly → sales_rank table.",
    "Stages: 1) map ((category, product), qty) filtered to the past week, reducer sums; 2) re-key to ((category, qty), product) — the framework's shuffle/sort does the global sort.",
    "Table: id, category_id, total_sold, product_id; indexes on id, category_id, product_id.",
    "Read path: web server → Read API → memory cache → SQL; GET /api/v1/popular?category_id=…",
    "Freshness: hourly rebuild is a product decision; staleness ≤ rebuild interval + cache TTL.",
  ],
  homework: {
    basic: {
      title: "Aggregate sales with a mapper and reducer",
      brief: [
        "MapReduce-style aggregation over a transaction log to (category, product) -> total sold, filtered to the past week, top-K per category.",
      ],
      criteria: ["Mapper emits (category, product) -> quantity", "Reducer sums correctly", "Top-K per category printed", "Deterministic output"],
      hints: ["Emit from the mapper only for rows inside the week window; drop old rows there, before any summing.", "Sort each category's list descending before slicing, so the printed output is stable run to run."],
      solution: {
        text: [
          "The whole batch layer is these two functions. I verified the filter by putting rows outside the window in the log and checking they appear in no total; the reducer is a plain defaultdict sum, and the top-K print sorts each category's list descending before slicing, so the output is byte-for-byte reproducible. In production the same two functions run on Hadoop/EMR with the log as input files and a table insert as the final write.",
        ],
        code: { lang: "python", file: "aggregate.py", code: `"""Basic homework: a complete mapper + reducer over a transaction log, filtering to the
past week, summing (category, product) -> quantity, and printing the top K per category."""
from collections import defaultdict

LOG = [
    # ts  product  category  qty  total  seller  buyer
    "0\tp1\tc1\t2\t20.00\t1\t1",
    "1\tp1\tc1\t3\t30.00\t2\t2",
    "2\tp2\tc1\t1\t9.00\t3\t3",
    "2\tp2\tc2\t4\t36.00\t3\t4",
    "3\tp3\tc2\t2\t5.00\t4\t5",
    "4\tp1\tc2\t1\t10.00\t1\t6",
    "5\tp3\tc1\t6\t15.00\t5\t7",
    "6\tp2\tc2\t2\t18.00\t3\t8",
    "7\tp1\tc1\t5\t50.00\t1\t9",
    "8\tp4\tc1\t3\t21.00\t6\t10",
    "8\tp4\tc2\t1\t7.00\t6\t11",
    "9\tp5\tc1\t4\t12.00\t7\t12",
]
NOW, WEEK, K = 9, 7, 3


def mapper(line: str):
    """Emit (category, product) -> quantity for rows inside the past week (days 3..9)."""
    ts, product, category, qty, *_ = line.split("\t")
    if int(ts) >= NOW - WEEK + 1:
        yield (category, product), int(qty)


def reducer(pairs):
    sums: defaultdict = defaultdict(int)
    for key, qty in pairs:
        sums[key] += qty
    return dict(sums)


pairs = [pair for line in LOG for pair in mapper(line)]
sums = reducer(pairs)

print(f"{len(LOG)} log rows, {len(pairs)} kept inside the week, {len(sums)} distinct keys")
for key, qty in sorted(sums.items()):
    print(f"  {key} -> {qty}")

print(f"top {K} per category")
by_category: defaultdict = defaultdict(list)
for (category, product), qty in sums.items():
    by_category[category].append((qty, product))
for category in sorted(by_category):
    print(f"  {category}: {[(p, q) for q, p in sorted(by_category[category], reverse=True)[:K]]}")` },
        output: "12 log rows, 8 kept inside the week, 8 distinct keys\n  ('c1', 'p1') -> 5\n  ('c1', 'p3') -> 6\n  ('c1', 'p4') -> 3\n  ('c1', 'p5') -> 4\n  ('c2', 'p1') -> 1\n  ('c2', 'p2') -> 2\n  ('c2', 'p3') -> 2\n  ('c2', 'p4') -> 1\ntop 3 per category\n  c1: [('p3', 6), ('p1', 5), ('p5', 4)]\n  c2: [('p3', 2), ('p2', 2), ('p4', 1)]",
      },
    },
    intermediate: {
      title: "The two-stage sort",
      brief: [
        "implement the re-key trick ((category, qty) -> product) and produce the globally sorted ranking",
      ],
      criteria: ["Two stages implemented", "Sorted by category then quantity desc", "Matches the primer's approach", "Real output"],
      hints: ["Stage 2's mapper only re-keys; it must not recompute anything.", "Negate qty so the framework's ascending sort puts top sellers first; append the product id to break ties."],
      solution: {
        text: [
          "Stage 1 is identical to the basic exercise; stage 2 adds one line of mapping. The thing to verify is that no sorting code exists in stage 2 — the tuple order does the work, exactly as in the primer, whose framework sort is what pairs.sort() imitates. Run it and confirm the output is globally ordered by category, then quantity descending, then product id; that ordering is what the INSERT into sales_rank consumes.",
        ],
        code: { lang: "python", file: "two_stage.py", code: `"""Intermediate homework: the two-stage sort from the primer. Stage 1 aggregates
((category, product), qty); stage 2 re-keys to ((category, -qty, product), product) so the
framework's sort produces a globally sorted ranking, and the identity reducer passes it
through. The primer sorts ascending; negating qty flips it to top sellers first."""
from collections import defaultdict

LOG = [
    # ts  product  category  qty  total  seller  buyer
    "0\tp1\tc1\t2\t20.00\t1\t1",
    "1\tp1\tc1\t3\t30.00\t2\t2",
    "2\tp2\tc1\t1\t9.00\t3\t3",
    "2\tp2\tc2\t4\t36.00\t3\t4",
    "3\tp3\tc2\t2\t5.00\t4\t5",
    "4\tp1\tc2\t1\t10.00\t1\t6",
    "5\tp3\tc1\t6\t15.00\t5\t7",
    "6\tp2\tc2\t2\t18.00\t3\t8",
    "7\tp1\tc1\t5\t50.00\t1\t9",
    "8\tp4\tc1\t3\t21.00\t6\t10",
    "8\tp4\tc2\t1\t7.00\t6\t11",
    "9\tp5\tc1\t4\t12.00\t7\t12",
]
NOW, WEEK = 9, 7


def stage1(log):
    sums: defaultdict = defaultdict(int)
    for line in log:
        ts, product, category, qty, *_ = line.split("\t")
        if int(ts) >= NOW - WEEK + 1:
            sums[(category, product)] += int(qty)
    return dict(sums)


def stage2(sums):
    pairs = [((category, -qty, product), product)
             for (category, product), qty in sums.items()]
    pairs.sort()                     # the framework's shuffle/sort, distributed
    return pairs


def identity_reduce(pairs):
    return pairs


sums = stage1(LOG)
ranked = identity_reduce(stage2(sums))

print("stage 1 -> ((category, product), qty)")
for key, qty in sorted(sums.items()):
    print(f"  {key} -> {qty}")
print("stage 2 -> globally sorted by (category, qty desc, product):")
for (category, neg_qty, product), prod in ranked:
    print(f"  ({category}, {abs(neg_qty):>2}, {product})  sold {abs(neg_qty)}")` },
        output: "stage 1 -> ((category, product), qty)\n  ('c1', 'p1') -> 5\n  ('c1', 'p3') -> 6\n  ('c1', 'p4') -> 3\n  ('c1', 'p5') -> 4\n  ('c2', 'p1') -> 1\n  ('c2', 'p2') -> 2\n  ('c2', 'p3') -> 2\n  ('c2', 'p4') -> 1\nstage 2 -> globally sorted by (category, qty desc, product):\n  (c1,  6, p3)  sold 6\n  (c1,  5, p1)  sold 5\n  (c1,  4, p5)  sold 4\n  (c1,  3, p4)  sold 3\n  (c2,  2, p2)  sold 2\n  (c2,  2, p3)  sold 2\n  (c2,  1, p1)  sold 1\n  (c2,  1, p4)  sold 1",
      },
    },
    challenge: {
      title: "Serve precomputed rankings with a cache",
      brief: [
        "rebuild rankings hourly from a log, serve with a TTL cache, measure hit ratio and staleness",
      ],
      criteria: ["Rebuild is batch, not per-request", "Cache hit ratio reported", "Staleness bounded by TTL", "Real output"],
      hints: ["A sale is visible only after the next rebuild AND a cache refill; track each sale until it appears in a returned list.", "Count a read as a hit only when now - built_at < TTL."],
      solution: {
        text: [
          "The simulation runs four simulated hours with two sales injected mid-interval. It reports 98.3% cache hits with 4 log scans against 480 for per-request aggregation, and both sales became visible exactly at the next rebuild tick — 30 ticks of staleness, never more than the rebuild interval. That last number is the SLO to put in front of product: leaderboards are up to one interval old, by design, and the cache's job is to keep that promise cheaply.",
        ],
        code: { lang: "python", file: "serve.py", code: `"""Challenge homework: hourly-rebuilt rankings served through a TTL cache.
Four simulated hours: new sales arrive mid-interval, the batch job rebuilds the
sales_rank table every REBUILD ticks, readers hit a per-category cache with TTL = REBUILD.
The script reports the hit ratio and each sale's staleness (time until readers see it),
which is bounded by the rebuild interval, and compares against aggregating on read."""
from collections import defaultdict

REBUILD = 60
K = 2
NOW, WEEK = 8, 7
HOURS = 4

BASE = [(2, "p2", "c1", 3), (3, "p3", "c2", 7), (4, "p4", "c1", 1),
        (6, "p1", "c1", 4), (7, "p2", "c2", 1), (8, "p5", "c1", 5)]


def aggregate(rows):
    sums: defaultdict = defaultdict(int)
    for day, product, category, qty in rows:
        if day >= NOW - WEEK + 1:
            sums[(category, product)] += qty
    return dict(sums)


class System:
    def __init__(self, rows):
        self.rows = list(rows)
        self.table = {}
        self.cache = {}                    # category -> (built_at, top)
        self.sales = []                    # (time, category, product)
        self.visible = set()
        self.hits = self.misses = self.rebuilds = 0

    def rebuild(self, t):
        self.table = aggregate(self.rows)
        self.rebuilds += 1
        print(f"  rebuild #{self.rebuilds} at t={t:<3} -> {len(self.table)} rows")

    def add_sale(self, t, category, product, qty):
        self.rows.append((NOW, product, category, qty))
        self.sales.append((t, category, product))

    def read(self, t, category):
        entry = self.cache.get(category)
        if entry and t - entry[0] < REBUILD:
            self.hits += 1
            top = entry[1]
        else:
            self.misses += 1
            rows = sorted(((qty, product) for (cat, product), qty in self.table.items()
                           if cat == category), reverse=True)
            top = [(product, qty) for qty, product in rows[:K]]
            self.cache[category] = (t, top)
        for sid, (st, scat, sprod) in enumerate(self.sales):
            if sid not in self.visible and scat == category and any(p == sprod for p, _ in top):
                self.visible.add(sid)
                print(f"  sale #{sid} ({sprod} in {scat}) at t={st} -> visible at t={t} (stale {t - st} ticks)")
        return top


sys = System(BASE)
sys.rebuild(0)
for t in range(HOURS * REBUILD):
    if t == 30:
        sys.add_sale(30, "c2", "p9", 50)
    if t == 150:
        sys.add_sale(150, "c1", "p8", 30)
    if t > 0 and t % REBUILD == 0:
        sys.rebuild(t)
    sys.read(t, "c1")
    sys.read(t, "c2")

reads = sys.hits + sys.misses
print(f"reads: {reads}   hits: {sys.hits} ({sys.hits / reads:.1%})   misses: {sys.misses}   rebuilds: {sys.rebuilds}")
print(f"precomputed + cache: {sys.rebuilds} log scans   per-read aggregation: {reads} log scans")` },
        output: "  rebuild #1 at t=0   -> 6 rows\n  rebuild #2 at t=60  -> 7 rows\n  sale #0 (p9 in c2) at t=30 -> visible at t=60 (stale 30 ticks)\n  rebuild #3 at t=120 -> 7 rows\n  rebuild #4 at t=180 -> 8 rows\n  sale #1 (p8 in c1) at t=150 -> visible at t=180 (stale 30 ticks)\nreads: 480   hits: 472 (98.3%)   misses: 8   rebuilds: 4\nprecomputed + cache: 4 log scans   per-read aggregation: 480 log scans",
      },
    },
    capstone: {
      title: "DevAtlas: leaderboards design doc",
      brief: [
        "write docs/design/leaderboards.md: weekly leaderboards (points by learner by topic) using batch aggregation and precomputed rankings with a cache, freshness, and what happens when the batch fails",
      ],
      criteria: ["Requirements and out-of-scope list", "Estimates with numbers", "Mermaid diagram", "Failure/rollback section"],
      hints: ["Reuse this lesson's numbers scaled down: point events per learner per week, leaderboard reads per day, a weekly window.", "The batch job writes a staging table and swaps it in, so a failed build can never expose a half-written leaderboard."],
      solution: {
        text: [
          "The doc follows the sales-rank shape one-for-one: point events are the raw log, the hourly job is the MapReduce stage, weekly_leaderboard and popular_lessons are the sales_rank table, and Redis with a 60 s TTL is the memory cache. The Mermaid diagram was checked against the repo's other flowcharts for syntax, and the estimates are this lesson's case facts scaled to DevAtlas (about 6M events/week, roughly 100:1 read:write). The failure section is the part reviewers read first: last-good snapshot, staging-swap atomicity, and an alert on the job's last-success age.",
        ],
        code: { lang: "markdown", file: "docs/design/leaderboards.md", code: `# Design: DevAtlas weekly leaderboards

Status: proposal · Owner: gamification team · Reviewers: platform, data
Builds on: lesson 6.4.6 (sales rank by category)

## 1. Requirements

**Functional**
- Weekly leaderboard per topic: learners ranked by points earned in that topic this ISO week (lessons completed, quizzes passed, homework submitted).
- A learner sees their own rank, the top 100, and the top 3 with names and points.
- "Most popular lessons this week": the same pipeline keyed by lesson instead of learner.
- The week flips Monday 00:00 UTC; leaderboards switch atomically.

**Non-functional**
- Leaderboard reads under 50 ms p95, and stay available even when the batch job fails (serve the last good snapshot).
- Points are never double-counted: aggregation dedupes by event id.
- Freshness: a learner's new points appear within 1 hour p99.

**Out of scope:** all-time hall of fame (separate yearly job), per-team boards, cheat detection beyond the existing rate limits.

## 2. Estimates (assumptions, checked against our analytics monthly)

| | Value |
|---|---|
| Weekly active learners | 200,000 |
| Point events per learner per week | ~30 (10 lessons, 12 quizzes, 8 homework) |
| Events per week | 6,000,000 ≈ 10/s average, ~60/s peak (evening) |
| Leaderboard reads | 100k DAU x 8 views = 800k/day ≈ 10/s average, 60/s peak |

Reads outnumber writes about 100:1 — the sales-rank shape — so the same design applies: batch aggregation, precomputed table, cache.

## 3. Data model

- \`point_events(id, learner_id, topic_id, points, created_at)\` — the raw log, deduped on id.
- \`weekly_leaderboard(week, topic_id, rank, learner_id, points)\` — precomputed, PK (week, topic_id, rank).
- \`popular_lessons(week, lesson_id, completions)\` — precomputed.
- Redis: \`lb:{week}:{topic}:top100\` and \`lb:{week}:{topic}:{learner_id}\`, TTL 60 s.

## 4. High-level design

\`\`\`mermaid
flowchart LR
  ev[Point events<br/>lesson done, quiz passed] -->|append| q[(point_events<br/>PostgreSQL)]
  q --> job[Batch job<br/>every hour]
  job -->|INSERT staging, then swap| wl[(weekly_leaderboard)]
  job -->|INSERT| pl[(popular_lessons)]
  u([Learner]) --> api[Leaderboard API]
  api -->|top 100, your rank| cache[(Redis TTL 60 s)]
  cache -->|miss| wl
\`\`\`

- **Batch job (hourly):** GROUP BY (topic_id, learner_id) over this week's events, rank by points DESC, write into \`weekly_leaderboard_staging\`, validate, then swap (bump a version column). Readers never see a half-written board, and new points appear within 1 hour (rebuild) plus up to 60 s (TTL) — inside the SLO.
- **Read path:** the API checks Redis, falls back to the indexed precomputed table; 60/s peak is trivial, and the cache absorbs the evening burst.

## 5. Failure modes and rollback

| Failure | Behaviour |
|---|---|
| Batch job fails (crash, data bug) | Readers keep the last good \`weekly_leaderboard\`; alert when the job's last-success is over 2 h old |
| Half-written staging | Staging is never visible; the swap only happens after validation (row count within 20% of last week, no negative points) |
| New week with no events yet | Fall back to last week's board with a "week resetting" banner |
| Redis down | API reads the precomputed table directly; 10/s is fine without the cache |

**Rollback:** keep the previous week's rows until the new build validates; rolling back is pointing the version column back.

## 6. Trade-offs

- Hourly, not real-time: leaderboards are up to 1 hour stale by design, as in the sales-rank case. If product wants instant, publish "points just earned" as a separate feed and keep the board hourly.
- One pipeline, two outputs: the leaderboard and popular-lessons jobs share the same aggregation, so adding a ranking type is a GROUP BY change, not a new system.` },      },
    },
  },
  deeper: [
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "System Design Primer: Design Amazon's sales rank by category feature", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/sales_rank/README.md" },
    { label: "Apache Hadoop MapReduce Tutorial (3.3.5)", url: "https://hadoop.apache.org/docs/stable/hadoop-mapreduce-client/hadoop-mapreduce-client-core/MapReduceTutorial.html" },
    { label: "Amazon EMR product page", url: "https://aws.amazon.com/emr/" },
    { label: "Amazon Best Sellers (the public feature)", url: "https://www.amazon.com/gp/bestsellers/" },
    { label: "Steam Charts: Top Sellers (Valve)", url: "https://store.steampowered.com/charts/" },
  ],
  nextPreview: "Next phase: AI engineering. How LLMs really work: tokens, embeddings, attention and sampling, and what that means for cost, latency and hallucinations.",
};
