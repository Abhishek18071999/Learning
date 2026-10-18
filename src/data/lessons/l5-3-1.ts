import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.3.1",
  title: "Redis caching patterns and pgvector",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["4.4.2 Idempotency, rate limiting, queues and caching", "7.2.1 helpful (embeddings)"],
  summary: "Use Redis for what it does best (caching, counters, rate limits, leaderboards, short-lived state) with correct TTLs and invalidation, and store and search embeddings with PostgreSQL's pgvector extension.",
  terms: [
    { term: "Redis", def: "An in-memory data store with rich data structures (strings, hashes, lists, sets, sorted sets, streams), often used as a cache and for fast counters." },
    { term: "TTL", def: "Time to live: Redis deletes a key automatically after it expires." },
    { term: "Eviction policy", def: "What Redis removes when memory is full, e.g. allkeys-lru (least recently used)." },
    { term: "Sorted set", def: "A Redis set where each member has a score, kept ordered: ideal for leaderboards and time-ordered data." },
    { term: "Embedding", def: "A vector of numbers representing meaning; similar texts have nearby vectors (lesson 7.1.1)." },
    { term: "pgvector", def: "A PostgreSQL extension adding a vector column type, distance operators and approximate nearest-neighbour indexes (HNSW, IVFFlat)." },
    { term: "ANN index", def: "Approximate nearest-neighbour index: finds very likely nearest vectors much faster than checking every row." },
  ],
  problem: [
    "The DevAtlas dashboard runs eight queries per load; at peak the database CPU sits at 85% although most data changes rarely. The leaderboard query sorts 2 million attempts every time someone opens it. And the AI tutor needs to find the five most relevant lesson chunks among 50,000 by meaning, not keywords, in under 50 ms.",
    "Redis takes repeated reads and hot counters off the database; pgvector adds semantic search to the PostgreSQL you may already run, without a separate vector database.",
  ],
  concept: {
    analogy: [
      "Redis is a **whiteboard next to the filing room**: quick to read and write, perfect for things you look up constantly, but you accept that it can be wiped (so the filing room, the database, remains the source of truth). pgvector is a **library where books are shelved by topic similarity** instead of alphabetically, so 'books like this one' are physically close.",
    ],
    precise: [
      "**Cache-aside** (most common): read Redis; on miss read the database, write Redis with a TTL. On writes, update the database then delete (invalidate) the cache key. Use TTLs as a safety net even with invalidation. Key naming: `lesson:5.3.1`, `user:42:dashboard:v3` (versioned to invalidate a whole shape at once).",
      "**Beyond caching**: atomic counters (INCR) for views and rate limits (lesson 4.4.2), sorted sets (ZADD/ZREVRANGE) for leaderboards, sets for unique visitors, hashes for small objects, streams for lightweight queues, and distributed locks only with great care.",
      "**Operational facts**: Redis is in-memory, so size it and set `maxmemory` plus an eviction policy (allkeys-lru for pure caches). Persistence (RDB snapshots, AOF) exists but caches should be safe to lose. Managed options: Azure Cache for Redis, Amazon ElastiCache/MemoryDB, Redis Cloud, Valkey-based services.",
      "**pgvector**: `CREATE EXTENSION vector; embedding vector(1024)`; query with `ORDER BY embedding <=> $query LIMIT 5` (cosine distance; `<->` is L2, `<#>` negative inner product). Add an HNSW index for speed; filter with normal SQL WHERE clauses (tenant, language, permissions) in the same query.",
    ],
  },
  underTheHood: {
    text: [
      "Redis executes commands on a single main thread with an event loop, which makes each command atomic and very fast (sub-millisecond on a local network), but a slow command (KEYS * on millions of keys, huge ZRANGE) blocks everyone. Use SCAN instead of KEYS.",
      "Sorted sets are implemented with a skip list plus a hash table: ZADD and rank lookups are O(log n), ZREVRANGE for the top K is O(log n + K), which is why leaderboards are a natural fit.",
      "HNSW builds a multi-layer graph where each vector links to near neighbours; a search greedily walks from a coarse layer down to fine layers, visiting a small fraction of vectors. Parameters (m, ef_construction at build; ef_search at query time) trade recall for speed and memory. Exact search (no index) is fine for small tables.",
    ],
    diagram: {
      title: "Cache-aside read and write",
      nodes: [
        { label: "GET lesson", sub: "Redis hit? return" },
        { label: "Miss → DB", sub: "SELECT …" },
        { label: "SET key EX 300", sub: "fill cache" },
        { label: "UPDATE lesson", sub: "DB first" },
        { label: "DEL key", sub: "invalidate" },
      ],
      edges: ["miss", "", "later write", ""],
    },
  },
  handsOn: [
    {
      title: "Run Redis and PostgreSQL with pgvector",
      code: {
        lang: "bash",
        code: `docker run -d --name redis-lab -p 6379:6379 redis:7
docker run -d --name pg-lab -e POSTGRES_PASSWORD=devpass -p 5432:5432 pgvector/pgvector:pg17
pip install redis "psycopg[binary]" numpy`,
      },
      notes: ["Image tags change over time; use the versions your team targets. Passwords here are for local throwaway containers."],
    },
    {
      title: "Cache-aside with TTL and invalidation",
      code: {
        lang: "python",
        file: "cache_aside.py",
        code: `import json
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def load_lesson_from_db(lesson_id: str) -> dict:
    print(f"  (DB query for {lesson_id})")
    return {"id": lesson_id, "title": "Redis caching patterns and pgvector", "minutes": 75}

def get_lesson(lesson_id: str) -> dict:
    key = f"lesson:{lesson_id}:v1"
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)
    lesson = load_lesson_from_db(lesson_id)
    r.set(key, json.dumps(lesson), ex=300)          # TTL: 5 minutes, safety net
    return lesson

def update_lesson_title(lesson_id: str, title: str) -> None:
    # 1) write the source of truth (database) ... 2) invalidate
    r.delete(f"lesson:{lesson_id}:v1")

r.delete("lesson:5.3.1:v1")
print(get_lesson("5.3.1")["title"])     # miss → DB
print(get_lesson("5.3.1")["title"])     # hit
update_lesson_title("5.3.1", "Redis and pgvector")
print(get_lesson("5.3.1")["title"])     # miss again after invalidation
print("TTL seconds:", r.ttl("lesson:5.3.1:v1"))`,
      },
      output: "  (DB query for 5.3.1)\nRedis caching patterns and pgvector\nRedis caching patterns and pgvector\n  (DB query for 5.3.1)\nRedis caching patterns and pgvector\nTTL seconds: 300",
    },
    {
      title: "Leaderboard with a sorted set",
      code: {
        lang: "python",
        code: `board = "leaderboard:week:2026-42"
r.delete(board)
r.zincrby(board, 30, "asha"); r.zincrby(board, 45, "ravi"); r.zincrby(board, 20, "meera")
r.zincrby(board, 25, "asha")                               # asha completes another lesson
r.expire(board, 60 * 60 * 24 * 8)                          # keep last week's board a little longer

print(r.zrevrange(board, 0, 2, withscores=True))           # top 3
print("asha rank:", r.zrevrank(board, "asha") + 1)`,
      },
      output: "[('asha', 55.0), ('ravi', 45.0), ('meera', 20.0)]\nasha rank: 1",
    },
    {
      title: "pgvector: store and search embeddings",
      code: {
        lang: "python",
        file: "vectors.py",
        code: `import numpy as np
import psycopg

# Toy 4-dimensional "embeddings" so the example runs without a model.
# Real embedding models output hundreds to thousands of dimensions (lesson 7.2.1).
chunks = {
    "git-undo":      ("Use git revert to undo a pushed commit", [0.9, 0.1, 0.0, 0.1]),
    "git-conflict":  ("Resolve merge conflicts by editing markers", [0.8, 0.3, 0.1, 0.0]),
    "docker-layers": ("Order Dockerfile instructions for caching", [0.1, 0.9, 0.2, 0.0]),
    "sql-index":     ("Composite indexes follow the leftmost prefix", [0.0, 0.2, 0.9, 0.1]),
}

def vec(v: list[float]) -> str:
    return "[" + ",".join(str(x) for x in v) + "]"           # pgvector text format

with psycopg.connect("postgresql://postgres:devpass@localhost:5432/postgres", autocommit=True) as db:
    db.execute("CREATE EXTENSION IF NOT EXISTS vector")
    db.execute("DROP TABLE IF EXISTS chunks")
    db.execute("CREATE TABLE chunks (id text PRIMARY KEY, body text NOT NULL, lang text NOT NULL, embedding vector(4) NOT NULL)")
    for cid, (body, emb) in chunks.items():
        db.execute("INSERT INTO chunks VALUES (%s, %s, 'en', %s::vector)", (cid, body, vec(emb)))
    db.execute("CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)")

    query = [0.85, 0.2, 0.05, 0.05]                           # "how do I undo a git change?"
    rows = db.execute(
        "SELECT id, round((1 - (embedding <=> %s::vector))::numeric, 3) AS similarity "
        "FROM chunks WHERE lang = 'en' ORDER BY embedding <=> %s::vector LIMIT 2",
        (vec(query), vec(query)),
    ).fetchall()
    print(rows)`,
      },
      output: "[('git-undo', Decimal('0.990')), ('git-conflict', Decimal('0.989'))]",
      notes: ["`<=>` is cosine distance, so similarity = 1 − distance. Normal SQL filters (lang, tenant, permissions) combine with vector ordering in one query, a big practical advantage of keeping vectors in PostgreSQL."],
    },
  ],
  companies: [
    "**Redis in front of databases** is near-universal for hot reads, sessions, rate limiting and leaderboards; cache hit rate, memory usage and evictions are standard dashboard metrics.",
    "**Vectors in the main database**: many teams start RAG with pgvector because it reuses existing PostgreSQL operations (backups, access control, joins, filters) and only move to a dedicated vector database (Pinecone, Qdrant, Weaviate, Milvus) or a search engine at larger scale or for specific features.",
    "**Managed AI search**: cloud platforms offer vector search inside existing services (Azure AI Search, Amazon OpenSearch Service, Cosmos DB and MongoDB Atlas vector search), so the choice is often 'where does the rest of my data live?'.",
  ],
  mistakes: [
    { mistake: "Cache without TTL or invalidation", why: "It is fast, so cache forever", wrong: "Users see stale data indefinitely after updates", fix: "Invalidate on write and set a TTL as a safety net" },
    { mistake: "Treating Redis as the only copy of important data", why: "It is a database too", wrong: "Data loss on restart or eviction", fix: "Database is the source of truth; Redis holds rebuildable data (unless you deliberately configure durability)" },
    { mistake: "KEYS * in production", why: "Debugging convenience", wrong: "Blocks Redis for seconds on large datasets", fix: "SCAN with a pattern, or better key design" },
    { mistake: "Mixing embedding models or dimensions", why: "Upgrading the model for new rows only", wrong: "Similarity scores become meaningless", fix: "Re-embed everything; store the model name/version with each row" },
    { mistake: "No filtering in vector queries", why: "Demo code searches everything", wrong: "Results from other tenants or wrong languages; permission leaks", fix: "Combine WHERE filters with vector ordering; test access control" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Cache read-heavy, rarely changing data; track hit rate; avoid caching per-request unique data." },
    { tag: "Reliability", text: "Set maxmemory and an eviction policy; plan for cache loss (cold start) and stampedes." },
    { tag: "Security", text: "Redis: require auth/TLS, never expose it to the internet; pgvector rows inherit database access control." },
    { tag: "Cost", text: "Start vector search in PostgreSQL; move to a specialised store only when scale or features demand it." },
  ],
  interview: [
    { q: "How do you keep a cache consistent with the database?", a: "Cache-aside: write to the database first, then delete the cache key so the next read reloads it; set TTLs as a fallback; version keys when the cached shape changes. Accept brief staleness where acceptable, and for strict consistency avoid caching or use write-through with care." },
    { q: "What Redis data structure would you use for a leaderboard and why?", a: "A sorted set: ZINCRBY to add points, ZREVRANGE for the top K and ZREVRANK for a user's rank, all O(log n) or O(log n + K). Keys per period (weekly) with EXPIRE for automatic cleanup." },
    { q: "Why use pgvector instead of a dedicated vector database?", a: "If you already run PostgreSQL, pgvector adds vector search with HNSW indexes while keeping transactions, joins, SQL filters, backups and permissions in one place. Dedicated vector databases can offer more scale, features and tuning; choose them when measurements or requirements justify another system to operate." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "After updating a lesson in the database, what should the cache-aside code do?",
      options: ["Nothing; the TTL will handle it", "Delete (invalidate) the lesson's cache key", "Flush all of Redis", "Restart the app"],
      answer: 1,
      explanation: "Invalidate the specific key; the next read repopulates it. TTL is only a safety net.",
    },
    {
      kind: "mcq",
      prompt: "In pgvector, what does ORDER BY embedding <=> $q LIMIT 5 return?",
      options: ["5 random rows", "The 5 rows with the smallest cosine distance (most similar)", "The 5 largest vectors", "An error"],
      answer: 1,
      explanation: "<=> is cosine distance; smaller means more similar.",
    },
    {
      kind: "bug",
      prompt: "Redis latency spikes every few minutes when an admin job runs `KEYS user:*`. Fix?",
      options: ["More memory", "Use SCAN (incremental) or maintain a set of user keys", "Increase TTL", "Use DEL instead"],
      answer: 1,
      explanation: "KEYS is O(n) and blocks the single command thread.",
    },
  ],
  cheatSheet: [
    "Cache-aside: get → miss → DB → SET key EX ttl; on write: DB then DEL.",
    "Key names: entity:id:version; TTL always.",
    "INCR counters, ZSET leaderboards, SET uniques, STREAM queues.",
    "maxmemory + eviction policy; SCAN not KEYS; auth + TLS.",
    "pgvector: vector(n), <=> cosine, <-> L2, HNSW index.",
    "Filter with WHERE alongside vector ORDER BY.",
    "Store embedding model/version; re-embed on model change.",
  ],
  homework: {
    basic: {
      title: "Cache the dashboard",
      brief: ["Cache the DevAtlas dashboard summary per user for 60 seconds with cache-aside, invalidate it when the user completes a lesson, and measure the hit rate over 1,000 simulated requests."],
      criteria: ["Per-user key with TTL", "Invalidation on progress change", "Hit rate printed"],
      hints: ["Count hits and misses in two variables or with Redis INCR."],
      solution: {
        text: ["With 1,000 reads and occasional writes, hit rates above 90% are typical for dashboards; the exact value depends on your simulated write frequency."],
        code: {
          lang: "python",
          code: `import json, random
import redis

r = redis.Redis(decode_responses=True)
hits = misses = 0

def dashboard(user_id: int) -> dict:
    global hits, misses
    key = f"dash:{user_id}:v1"
    if (cached := r.get(key)) is not None:
        hits += 1
        return json.loads(cached)
    misses += 1
    data = {"user": user_id, "completed": random.randint(0, 73)}   # stands in for 8 SQL queries
    r.set(key, json.dumps(data), ex=60)
    return data

def complete_lesson(user_id: int) -> None:
    r.delete(f"dash:{user_id}:v1")

random.seed(3)
for _ in range(1000):
    uid = random.randint(1, 20)
    if random.random() < 0.05:
        complete_lesson(uid)
    dashboard(uid)
print(f"hit rate: {hits / (hits + misses):.0%}")`,
        },
      },
    },
    intermediate: {
      title: "Distributed rate limiter in Redis",
      brief: ["Implement a fixed-window limiter with INCR + EXPIRE that works across multiple API instances, then a sliding-window version with a sorted set of timestamps. Explain the race condition if you INCR and EXPIRE separately and how to avoid it."],
      criteria: ["Both versions", "Atomicity addressed (pipeline/MULTI or Lua)", "Tests with fixed timestamps"],
      hints: ["SET key 0 EX 60 NX, then INCR; or a Lua script."],
      solution: {
        text: ["If the process dies after INCR but before EXPIRE, the key never expires and the client is blocked forever. Use SET … NX EX to create the key with a TTL atomically, or a MULTI/EXEC transaction or Lua script."],
        code: {
          lang: "python",
          code: `def allow_fixed(key: str, limit: int, window: int) -> bool:
    r.set(key, 0, ex=window, nx=True)          # create with TTL only if missing (atomic)
    return r.incr(key) <= limit

def allow_sliding(key: str, limit: int, window: float, now: float) -> bool:
    pipe = r.pipeline(transaction=True)
    pipe.zremrangebyscore(key, 0, now - window)  # drop old timestamps
    pipe.zcard(key)
    _, count = pipe.execute()
    if count >= limit:
        return False
    r.zadd(key, {str(now): now})
    r.expire(key, int(window) + 1)
    return True`,
        },
      },
    },
    challenge: {
      title: "Benchmark exact vs HNSW search",
      brief: ["Insert 100,000 random 384-dimension vectors into pgvector. Measure query time and recall@10 for exact search (no index) and HNSW with different ef_search values. Plot or tabulate the trade-off."],
      criteria: ["Ground truth from exact search", "Recall computed per setting", "Table of latency vs recall"],
      hints: ["SET hnsw.ef_search = 40; before queries. Use numpy to generate vectors and COPY or executemany to insert."],
      solution: {
        text: ["Expect exact search to be slower but perfect, and HNSW to be much faster with recall approaching 1.0 as ef_search increases. Real embeddings cluster more than random vectors, so measure on your own data before tuning."],
      },
    },
    capstone: {
      title: "DevAtlas: Redis cache and pgvector store",
      brief: ["Add Redis to docker-compose; cache lesson and dashboard reads in the .NET API with invalidation; implement the weekly leaderboard with a sorted set; create the pgvector chunks table (with model name and lesson_id columns) for the RAG tutor."],
      criteria: ["Cache hit-rate metric exposed", "Leaderboard endpoint", "chunks table with HNSW index and filter columns"],
      hints: ["In .NET, IDistributedCache with the StackExchange Redis provider covers simple cache-aside; use StackExchange.Redis directly for sorted sets."],
      solution: {
        text: ["Redis now protects MySQL from repeated reads and powers the leaderboard, and PostgreSQL holds vectors for Phase 7's 'Ask the course' tutor."],
      },
    },
  },
  deeper: [
    { label: "Redis docs: Data types", url: "https://redis.io/docs/latest/develop/data-types/" },
    { label: "Redis docs: Key eviction", url: "https://redis.io/docs/latest/develop/reference/eviction/" },
    { label: "pgvector (GitHub README)", url: "https://github.com/pgvector/pgvector" },
    { label: "redis-py documentation", url: "https://redis.readthedocs.io/" },
  ],
  nextPreview: "Next: database operations: zero-downtime migrations, backups and restores, replication and sharding.",
};
