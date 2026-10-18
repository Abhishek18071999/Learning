import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.9",
  title: "SQL or NoSQL: choosing a data store",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["5.2.1 Document modeling and the aggregation pipeline", "5.3.1 Redis caching patterns and pgvector", "6.3.8 Scaling relational databases: replication, federation and sharding"],
  summary: "The four NoSQL families (key-value, document, wide-column, graph), what each is fast and slow at, ACID vs BASE, and a method to choose a store from your access patterns. Includes wide-column partition design, single-table key design, LSM trees, graph traversal and PostgreSQL JSONB as the middle ground.",
  terms: [
    { term: "Key-value store", def: "Stores values under a key with O(1) get/put by key (Redis, Memcached, DynamoDB at its simplest). No queries by value." },
    { term: "Document store", def: "Stores JSON-like documents with nested fields and secondary indexes (MongoDB, Couchbase, Firestore, Cosmos DB)." },
    { term: "Wide-column store", def: "Rows grouped into partitions by a partition key and sorted by clustering columns inside each partition (Cassandra, ScyllaDB, HBase, Bigtable)." },
    { term: "Graph database", def: "Stores nodes and relationships directly, so traversing many hops is cheap (Neo4j, Amazon Neptune)." },
    { term: "ACID", def: "Atomicity, consistency, isolation, durability: the transaction guarantees of relational databases." },
    { term: "BASE", def: "Basically available, soft state, eventually consistent: the trade-off many distributed NoSQL stores make for availability and scale." },
    { term: "Access pattern", def: "A concrete query the application runs, e.g. 'last 50 messages of a conversation, newest first'. NoSQL schemas are designed from these." },
    { term: "LSM tree", def: "Log-structured merge tree: writes go to memory and are flushed as sorted immutable files that are merged later. Makes writes very fast (Cassandra, RocksDB)." },
  ],
  problem: [
    "DevAtlas is adding three features: an AI tutor chat with every message stored, a 'friends who finished this lesson' panel, and event tracking for every click. A team member says 'relational databases don't scale, let's put everything in MongoDB'. Another says 'NoSQL loses data, keep everything in PostgreSQL'. Both are repeating slogans.",
    "Every store is a set of trade-offs optimised for certain access patterns. Choosing well means writing down the queries first, estimating volume, and then picking the store whose strengths match, often keeping PostgreSQL as the system of record and adding a specialised store only where the numbers justify it.",
  ],
  concept: {
    analogy: [
      "Storage is like a kitchen. A **relational database** is a full kitchen with labelled cupboards and recipes that combine anything (joins, transactions): flexible, but every dish needs a chef. A **key-value store** is a row of lockers: give the number, get the box, instantly, but you cannot ask 'which lockers contain apples?'. A **document store** is a set of lunchboxes, each packed with everything one person needs. A **wide-column store** is a filing cabinet with one drawer per customer, folders sorted by date. A **graph database** is a map of who knows whom, where 'friends of friends' is a short walk instead of a city-wide search.",
    ],
    precise: [
      "**Key-value**: get/put/delete by key, often in memory, sometimes with TTLs, counters, sorted sets (Redis). Ideal for sessions, caches, rate-limit counters, feature flags, leaderboards. Any query not by key needs a second structure you maintain yourself.",
      "**Document**: a whole aggregate (a learner profile with settings and badges) lives in one document, read and written in one operation, with flexible schema and secondary indexes. Ideal when data is read and written as a unit and relationships are mostly 'contains'. Joins across collections are limited and multi-document transactions, while supported in modern MongoDB, are more costly.",
      "**Wide-column**: you query by partition key, and within the partition you get rows sorted by clustering columns. Writes are extremely fast (LSM trees) and scale linearly by adding nodes. Ideal for huge append-heavy data with known queries: messages per conversation, events per device, time series. You design one table per query and must avoid partitions that grow without bound.",
      "**Graph**: relationships are first-class and traversals follow pointers, so 'friends of friends who finished lesson X' or fraud rings take milliseconds where SQL would need repeated self-joins. Not built for bulk aggregation over all nodes.",
      "**SQL is still the default** when you need joins, ad-hoc queries, strong transactions, constraints and a well-known operational story. PostgreSQL with JSONB, partitioning and replicas covers a huge range of workloads. The primer's guidance holds: choose NoSQL for semi-structured or very high-volume data with simple, known access patterns, very high write throughput, or no need for relational integrity.",
      "**ACID vs BASE.** Many NoSQL stores relax consistency to stay available and fast across nodes (BASE), with tunable levels (6.3.5). Several now offer ACID transactions too (MongoDB multi-document, DynamoDB TransactWriteItems, FoundationDB), usually with limits on size and latency. Read the guarantees of the exact product and version, not the category.",
    ],
  },
  underTheHood: {
    text: [
      "**Why wide-column writes are fast: the LSM tree.** A write is appended to a commit log (for durability) and inserted into an in-memory sorted table (memtable). When the memtable is full, it is flushed to disk as an immutable sorted file (SSTable). Reads check the memtable and then SSTables (using Bloom filters to skip files). Background compaction merges SSTables and drops overwritten or deleted values. Writes never update in place, so they are sequential and cheap; reads and compaction pay instead.",
      "**Why B-tree databases behave differently.** PostgreSQL and MySQL update pages in place in a B-tree, so reads are cheap and predictable, and writes cost more random I/O. Neither is 'better': LSM favours write-heavy workloads; B-trees favour read-heavy, mixed and transactional ones.",
      "**Query-first schema design.** In relational design you model entities and let queries join them. In DynamoDB or Cassandra you list every access pattern first and shape keys so each pattern is one partition read. Adding a new access pattern later may require a new table or index and a backfill. That is the real cost of NoSQL flexibility.",
    ],
    diagram: {
      title: "LSM tree write and read path",
      nodes: [
        { label: "Write", sub: "append to commit log" },
        { label: "Memtable", sub: "sorted, in memory" },
        { label: "SSTables on disk", sub: "immutable, sorted" },
        { label: "Compaction", sub: "merge, drop old versions" },
      ],
      edges: ["insert", "flush when full", "background"],
      caption: "Reads check the memtable, then SSTables newest-first, using Bloom filters to skip files that cannot contain the key.",
    },
  },
  handsOn: [
    {
      title: "Design a wide-column table from the query (Cassandra CQL)",
      text: ["Access pattern: 'show the latest 50 messages of a tutor conversation, newest first; scroll back by month'."],
      code: {
        lang: "sql",
        file: "tutor_messages.cql",
        code: `CREATE TABLE tutor_messages (
    conversation_id uuid,
    month           text,          -- '2026-10': bucket so one partition cannot grow forever
    sent_at         timeuuid,
    role            text,          -- 'learner' | 'tutor'
    body            text,
    PRIMARY KEY ((conversation_id, month), sent_at)
) WITH CLUSTERING ORDER BY (sent_at DESC)
  AND default_time_to_live = 63072000;   -- keep messages for 2 years

-- one partition, already sorted: a single fast read
SELECT role, body, sent_at FROM tutor_messages
WHERE conversation_id = 6b1d1c1e-6f2a-4bd8-9f39-2d1b2b1f3a10 AND month = '2026-10'
LIMIT 50;`,
      },
      notes: [
        "The partition key `(conversation_id, month)` decides which nodes store the data; `sent_at` sorts rows inside it. Queries that do not give the full partition key need another table or ALLOW FILTERING, which scans and is a red flag in production.",
        "This is valid CQL for Apache Cassandra 4 and 5 and ScyllaDB.",
      ],
    },
    {
      title: "Why unbounded partitions hurt, and how bucketing fixes it",
      code: {
        lang: "python",
        file: "partitions.py",
        code: `import random
from collections import Counter

rng = random.Random(9)
# 300 conversations; a few power users chat a lot, over 12 months
messages = []
for conv in range(300):
    per_month = int(rng.paretovariate(1.2) * 40)
    for month in range(1, 13):
        messages += [(f"c{conv}", f"2026-{month:02d}")] * per_month

by_conversation = Counter(c for c, _ in messages)
by_conversation_month = Counter(messages)

for name, parts in (("(conversation)", by_conversation), ("(conversation, month)", by_conversation_month)):
    sizes = sorted(parts.values())
    print(f"{name:22} partitions {len(sizes):5d}  median {sizes[len(sizes) // 2]:6d}  largest {sizes[-1]:7d} rows")`,
      },
      output: "(conversation)         partitions   300  median    804  largest   83940 rows\n(conversation, month)  partitions  3600  median     67  largest    6995 rows",
      notes: ["A guideline often quoted for Cassandra is to keep partitions well under about 100 MB and a few hundred thousand rows. Bucketing by time caps growth; the price is that 'all messages ever' now means reading several partitions."],
    },
    {
      title: "Friends of friends: a graph traversal",
      text: ["'Which of my friends or their friends finished lesson 6.3.9?' In a graph store this is a short walk from one node."],
      code: {
        lang: "python",
        file: "graph.py",
        code: `from collections import deque

friends = {
    "asha": ["ben", "chen"], "ben": ["asha", "dara", "eli"], "chen": ["asha", "fatima"],
    "dara": ["ben"], "eli": ["ben", "gus"], "fatima": ["chen", "gus"], "gus": ["eli", "fatima"],
}
finished = {"dara", "fatima", "gus"}

def within_hops(start: str, max_hops: int) -> dict[str, int]:
    seen, queue = {start: 0}, deque([start])
    while queue:
        person = queue.popleft()
        if seen[person] == max_hops:
            continue
        for f in friends[person]:
            if f not in seen:
                seen[f] = seen[person] + 1
                queue.append(f)
    return seen

reach = within_hops("asha", 2)
print("finished, by distance:", sorted((d, p) for p, d in reach.items() if p in finished))`,
      },
      output: "finished, by distance: [(2, 'dara'), (2, 'fatima')]",
      notes: [
        "The same query in Neo4j's Cypher: `MATCH (me:Learner {name:'asha'})-[:FRIEND*1..2]-(f:Learner)-[:FINISHED]->(:Lesson {id:'6.3.9'}) RETURN DISTINCT f.name`.",
        "In SQL each extra hop is another self-join on a friendships table; fine for 2 hops with good indexes, painful for 4–6 hops on millions of users.",
      ],
    },
    {
      title: "The middle ground: JSONB in PostgreSQL",
      code: {
        lang: "sql",
        file: "jsonb.sql",
        code: `CREATE TABLE learner_settings (
    learner_id bigint PRIMARY KEY,
    settings   jsonb  NOT NULL DEFAULT '{}'
);
CREATE INDEX learner_settings_gin ON learner_settings USING gin (settings jsonb_path_ops);

INSERT INTO learner_settings VALUES
  (1, '{"theme": "dark", "editor": {"font": "JetBrains Mono", "tab": 4}, "beta": ["ai-hints"]}');

-- containment query, served by the GIN index
SELECT learner_id FROM learner_settings WHERE settings @> '{"beta": ["ai-hints"]}';

-- update one nested field without rewriting the application object
UPDATE learner_settings SET settings = jsonb_set(settings, '{editor,tab}', '2') WHERE learner_id = 1;`,
      },
      notes: ["Flexible, schema-light data next to relational data, with transactions and joins. Many teams that 'need MongoDB for flexible schemas' are well served by a JSONB column."],
    },
  ],
  companies: [
    "**Polyglot persistence.** A typical modern stack: PostgreSQL or MySQL as the system of record, Redis for caching, sessions and rate limits, a search engine (Elasticsearch/OpenSearch) for text search, object storage for files, and a warehouse (BigQuery, Snowflake, Redshift) for analytics. Each copy is fed from the system of record.",
    "**Wide-column for messaging and events.** Discord has written publicly about storing trillions of messages in Cassandra and later ScyllaDB, partitioned by channel and time bucket, exactly the pattern in this lesson.",
    "**Single-table design on DynamoDB.** Amazon and many AWS customers design DynamoDB tables from a list of access patterns, overloading the partition and sort keys (e.g. PK = 'SCHOOL#12', SK = 'LEARNER#987') so each screen is one query.",
  ],
  mistakes: [
    { mistake: "Choosing NoSQL 'because it scales'", why: "Slogans instead of numbers", wrong: "Lost transactions and joins for a workload one PostgreSQL server could handle", fix: "Estimate volume and list access patterns first; default to SQL unless a pattern clearly needs something else" },
    { mistake: "Modelling NoSQL like SQL", why: "Normalising out of habit", wrong: "Many round trips per screen, application-side joins, slow pages", fix: "Design keys per access pattern; denormalise into documents or query tables" },
    { mistake: "Unbounded partitions or documents", why: "Appending forever to one key", wrong: "Huge partitions, slow reads, the 16 MB MongoDB document limit, hot nodes", fix: "Bucket by time or count; reference instead of embed for unbounded lists" },
    { mistake: "Assuming every NoSQL store is eventually consistent (or strongly consistent)", why: "Category-level thinking", wrong: "Bugs from stale reads, or overpaying for strong reads", fix: "Read the exact product's consistency and transaction guarantees and set them per query" },
    { mistake: "Scanning with filters in DynamoDB or Cassandra", why: "Queries added after the schema", wrong: "Full scans that cost money and time and grow with data", fix: "Add a table or index for the new access pattern and backfill it" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Keep one system of record (usually relational); treat other stores as derived views fed by CDC or events." },
    { tag: "Performance", text: "Write the access patterns with expected volume before choosing a store; pick the store where each pattern is a single key or partition read." },
    { tag: "Cost", text: "Every extra store adds operations, backups, monitoring and on-call knowledge; add one only when the numbers require it." },
    { tag: "Reliability", text: "Know each store's durability settings (fsync, replication factor, write concern) and set them deliberately." },
  ],
  interview: [
    { q: "When would you choose a NoSQL store over a relational database?", a: "When the access patterns are simple and known (by key or partition), volume or write throughput is beyond a comfortable single relational server, the data is semi-structured, and I do not need joins or multi-row transactions on that data. Examples: chat messages and events in a wide-column store, sessions and counters in a key-value store, relationship traversals in a graph store. Otherwise I default to SQL." },
    { q: "How do you design a Cassandra or DynamoDB table?", a: "Start from the access patterns, not entities. For each query, choose a partition key that gives every query exactly one partition and spreads load evenly, and a sort or clustering key that returns rows in the needed order. Denormalise into one table per pattern if needed, bound partition size with time buckets, and avoid scans." },
    { q: "Why are writes so fast in LSM-based stores?", a: "Writes go to a sequential commit log and an in-memory memtable; full memtables are flushed as immutable sorted files. Nothing is updated in place, so writes are sequential I/O. Reads may check several files (helped by Bloom filters) and compaction later merges files and removes old versions." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which store fits 'all clicks from every learner, 50,000 writes per second, queried per learner per day'?",
      options: ["A graph database", "A wide-column store partitioned by (learner, day)", "A single PostgreSQL table without indexes", "Memcached"],
      answer: 1,
      explanation: "High-volume appends with a known per-partition query is the wide-column sweet spot.",
    },
    {
      kind: "bug",
      prompt: "A MongoDB 'course' document embeds every learner's progress. Writes start failing for popular courses. Why?",
      options: ["MongoDB cannot store arrays", "The document grows without bound and hits the 16 MB limit (and every update rewrites a huge document)", "Indexes are missing", "Replication lag"],
      answer: 1,
      explanation: "Unbounded embedded arrays are an anti-pattern: reference progress in its own collection.",
    },
    {
      kind: "mcq",
      prompt: "You need flexible per-learner settings plus joins with the learners table and transactions. Best fit?",
      options: ["A separate document database", "A JSONB column in PostgreSQL", "A graph database", "A wide-column store"],
      answer: 1,
      explanation: "JSONB gives schema flexibility inside the relational system you already run.",
    },
  ],
  cheatSheet: [
    "Key-value: by key only; caches, sessions, counters, leaderboards.",
    "Document: whole aggregates; flexible schema; avoid unbounded arrays.",
    "Wide-column: partition key + clustering order; huge append-heavy data; one table per query.",
    "Graph: multi-hop relationships (social, fraud, recommendations).",
    "SQL default: joins, transactions, constraints, ad-hoc queries; JSONB for flexibility.",
    "LSM = fast writes; B-tree = fast reads.",
    "Design NoSQL from access patterns; bound partitions; no scans.",
    "One system of record; other stores are derived views.",
  ],
  homework: {
    basic: {
      title: "Choose stores for DevAtlas features",
      brief: [
        "Pick a store (and say why, with the access pattern) for: learner accounts and purchases, AI tutor messages (3 million per day), session tokens, 'friends who finished this lesson', full-text lesson search, click events for analytics (50 million per day), and per-learner editor settings.",
      ],
      criteria: ["Access pattern written for each", "Volume considered", "System of record identified"],
      hints: ["Several features can stay in PostgreSQL."],
      solution: {
        text: ["Most features stay in PostgreSQL; specialised stores appear only where the access pattern or volume demands them, and all of them can be rebuilt from the system of record or from the event stream."],
        code: {
          lang: "markdown",
          file: "docs/data-stores.md",
          code: `| Feature | Access pattern | Volume | Store | Why |
|---|---|---|---|---|
| Accounts, purchases | by id; joins; transactions | small | **PostgreSQL** (system of record) | ACID, constraints, ad-hoc queries |
| Tutor messages | last N per conversation, newest first | 3 M/day, append-only | PostgreSQL partitioned by month now; **Cassandra/ScyllaDB** if > 50 M/day | known query, append-heavy |
| Session tokens | get/set/expire by token | high read rate | **Redis** with TTL | O(1), expiry built in |
| Friends who finished | 1–2 hop traversal from a learner | 2 M learners, 20 friends each | PostgreSQL (2 hops, indexed) → **Neo4j** if deeper traversals appear | graph only if hops grow |
| Lesson search | full text, typo-tolerant, ranked | 500 lessons, many queries | PostgreSQL full-text now; **OpenSearch** if it grows | relevance scoring |
| Click events | append; analytics by day/lesson | 50 M/day | **Kafka → warehouse** (BigQuery/ClickHouse) | columnar scans, cheap storage |
| Editor settings | read/write as one object per learner | small | **JSONB column** in PostgreSQL | flexible, transactional |`,
        },
      },
    },
    intermediate: {
      title: "Single-table key design",
      brief: [
        "Implement a tiny DynamoDB-style store in Python: items have PK and SK strings; query(pk, sk_prefix) returns items in SK order. Design keys so these access patterns are each ONE query: (1) a school's profile, (2) all learners of a school, (3) one learner's quiz attempts, newest first, (4) a learner's attempts in October 2026.",
      ],
      criteria: ["Store supports query by PK + SK prefix in sorted order", "All four patterns answered with one query each", "Key design explained"],
      hints: ["Use prefixes like SCHOOL#, LEARNER#, ATTEMPT#2026-10-18T09:00 so sorting by SK sorts by time."],
      solution: {
        text: ["Overloading the sort key with typed prefixes lets one partition hold several item types, and ISO timestamps in the sort key make 'newest first' and 'by month' simple prefix and order queries. The trade-off: a new access pattern (e.g. 'all attempts on a quiz across learners') needs a secondary index."],
        code: {
          lang: "python",
          file: "single_table.py",
          code: `from bisect import insort

class Table:
    def __init__(self):
        self.partitions: dict[str, list[tuple[str, dict]]] = {}
    def put(self, pk: str, sk: str, **attrs):
        insort(self.partitions.setdefault(pk, []), (sk, attrs))
    def query(self, pk: str, sk_prefix: str = "", newest_first: bool = False):
        rows = [(sk, a) for sk, a in self.partitions.get(pk, []) if sk.startswith(sk_prefix)]
        return rows[::-1] if newest_first else rows

t = Table()
t.put("SCHOOL#12", "#PROFILE", name="Delhi Public School")
t.put("SCHOOL#12", "LEARNER#987", name="Asha")
t.put("SCHOOL#12", "LEARNER#988", name="Ben")
t.put("LEARNER#987", "ATTEMPT#2026-09-30T18:00", quiz="6.3.8", score=7)
t.put("LEARNER#987", "ATTEMPT#2026-10-02T09:15", quiz="6.3.9", score=9)
t.put("LEARNER#987", "ATTEMPT#2026-10-18T08:40", quiz="6.3.9", score=10)

print("1 profile:  ", t.query("SCHOOL#12", "#PROFILE"))
print("2 learners: ", [a["name"] for _, a in t.query("SCHOOL#12", "LEARNER#")])
print("3 attempts: ", [sk[8:] for sk, _ in t.query("LEARNER#987", "ATTEMPT#", newest_first=True)])
print("4 October:  ", [a["score"] for _, a in t.query("LEARNER#987", "ATTEMPT#2026-10")])`,
        },
        output: "1 profile:   [('#PROFILE', {'name': 'Delhi Public School'})]\n2 learners:  ['Asha', 'Ben']\n3 attempts:  ['2026-10-18T08:40', '2026-10-02T09:15', '2026-09-30T18:00']\n4 October:   [9, 10]",
      },
    },
    challenge: {
      title: "Build a toy LSM tree",
      brief: [
        "Implement put/get/delete with a memtable (dict) that flushes to immutable sorted SSTables when it reaches 4 entries, reads newest-first across memtable and SSTables, tombstones for deletes, and a compact() that merges all SSTables keeping only the newest version and dropping tombstones. Print the number of SSTables and stored entries before and after compaction.",
      ],
      criteria: ["Flush creates sorted immutable tables", "Reads see the newest version", "Deletes work via tombstones", "Compaction shrinks storage"],
      hints: ["Use a sentinel object for tombstones.", "Search SSTables from newest to oldest."],
      solution: {
        text: ["Writes only touch the memtable; old versions pile up in SSTables until compaction. This is why LSM stores have 'write amplification' and 'read amplification' trade-offs, and why compaction strategy (size-tiered, leveled, time-window) is a key tuning knob in Cassandra and RocksDB."],
        code: {
          lang: "python",
          file: "toy_lsm.py",
          code: `TOMBSTONE = object()

class LSM:
    def __init__(self, memtable_limit: int = 4):
        self.mem: dict[str, object] = {}
        self.sstables: list[list[tuple[str, object]]] = []   # oldest first
        self.limit = memtable_limit

    def put(self, key, value):
        self.mem[key] = value
        if len(self.mem) >= self.limit:
            self.sstables.append(sorted(self.mem.items()))     # flush: sorted, immutable
            self.mem = {}

    def delete(self, key):
        self.put(key, TOMBSTONE)

    def get(self, key):
        if key in self.mem:
            v = self.mem[key]
            return None if v is TOMBSTONE else v
        for table in reversed(self.sstables):                 # newest first
            for k, v in table:                                 # real stores binary-search + Bloom filter
                if k == key:
                    return None if v is TOMBSTONE else v
        return None

    def compact(self):
        merged: dict[str, object] = {}
        for table in self.sstables:                            # oldest to newest: newer overwrite
            merged.update(table)
        self.sstables = [sorted((k, v) for k, v in merged.items() if v is not TOMBSTONE)]

    def stats(self):
        return len(self.sstables), sum(len(t) for t in self.sstables)

db = LSM()
for i in range(12):
    db.put(f"learner:{i % 5}", f"progress-v{i}")
db.delete("learner:1")
db.put("learner:9", "new")
db.put("learner:8", "new")
db.put("learner:7", "new")
print("before compaction: sstables, entries =", db.stats())
print("learner:2 ->", db.get("learner:2"), "| learner:1 ->", db.get("learner:1"))
db.compact()
print("after compaction:  sstables, entries =", db.stats())
print("learner:2 ->", db.get("learner:2"), "| learner:1 ->", db.get("learner:1"))`,
        },
        output: "before compaction: sstables, entries = (4, 16)\nlearner:2 -> progress-v7 | learner:1 -> None\nafter compaction:  sstables, entries = (1, 7)\nlearner:2 -> progress-v7 | learner:1 -> None",
      },
    },
    capstone: {
      title: "DevAtlas: an architecture decision record for your data stores",
      brief: [
        "Write docs/adr/0003-data-stores.md for your capstone in the standard ADR format (context, decision, consequences, alternatives considered). Cover the system of record, any cache, and any specialised store you use or have rejected, with access patterns and volumes as evidence.",
      ],
      criteria: ["ADR format", "Access patterns and volumes as evidence", "At least one rejected alternative with reasons", "Consequences include operational cost"],
      hints: ["Michael Nygard's ADR template is short: Title, Status, Context, Decision, Consequences."],
      solution: {
        text: ["A good ADR is short, dated and honest about the downsides. It is written so a new teammate understands in two minutes why there is no MongoDB, and what would change the decision."],
        code: {
          lang: "markdown",
          file: "docs/adr/0003-data-stores.md",
          code: `# 3. Data stores: PostgreSQL as system of record, Redis for ephemeral data

Status: accepted · Date: 2026-10-18

## Context
Access patterns (expected at 250k DAU):
- Accounts, purchases, progress: by id, joins, transactions. ~2k reads/s, 200 writes/s.
- Tutor messages: last 50 per conversation. ~3 M/day (35/s avg, ~200/s peak), append-only.
- Sessions and rate limits: get/set with expiry. ~5k ops/s.
- Leaderboards: rank queries per week and school.
- Flexible editor settings per learner.

## Decision
- **PostgreSQL 17** (managed, Multi-AZ, one read replica) is the system of record, including
  tutor messages in a table partitioned by month, and settings in a JSONB column.
- **Redis** for sessions, rate-limit counters, caches and leaderboard sorted sets. Everything in
  Redis can be rebuilt from PostgreSQL.

## Consequences
- One database technology to operate, back up and monitor; the team already knows it.
- Tutor messages will need a different store if volume passes ~50 M/day; partitioning makes a
  later move (or archiving) straightforward.
- Redis outage degrades performance but not correctness (fallbacks to PostgreSQL, 6.3.4).

## Alternatives considered
- **MongoDB for everything**: flexible schema is already covered by JSONB; we would lose joins and
  constraints for purchases. Rejected.
- **Cassandra for tutor messages now**: fits the pattern, but 200 writes/s at peak is far below
  what PostgreSQL handles; a second database to operate is not justified yet. Revisit at 50 M/day.
- **Neo4j for friends**: only 1–2 hop queries today; indexed SQL is fast enough.`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer: NoSQL and SQL or NoSQL (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#nosql" },
    { label: "Apache Cassandra: data modeling", url: "https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/index.html" },
    { label: "Amazon DynamoDB: best practices for designing and architecting", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html" },
    { label: "Discord: how Discord stores trillions of messages", url: "https://discord.com/blog/how-discord-stores-trillions-of-messages" },
  ],
  nextPreview: "Next: caching strategies. Cache-aside, write-through, write-behind and refresh-ahead, how to invalidate safely, and how to survive a cache stampede.",
};
