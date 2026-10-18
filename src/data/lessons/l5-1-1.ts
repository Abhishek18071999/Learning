import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.1.1",
  title: "Indexes and query plans: why your site is slow on Friday",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["Basic SQL: SELECT, WHERE, JOIN", "Docker installed"],
  summary: "Learn how B-tree indexes work, read EXPLAIN like a DBA, design composite indexes and avoid the classic mistakes that make queries slow under load.",
  terms: [
    { term: "Index", def: "A separate, sorted data structure that lets the database find rows without scanning the whole table." },
    { term: "B-tree", def: "A balanced tree with many keys per node. The default index type in MySQL (InnoDB) and PostgreSQL. Lookups are O(log n)." },
    { term: "Full table scan", def: "Reading every row to answer a query. Fine for tiny tables, a disaster for big ones." },
    { term: "Query plan", def: "The steps the database chose to run a query. Shown by EXPLAIN." },
    { term: "Composite index", def: "An index on several columns, e.g. (user_id, created_at). Column order matters." },
    { term: "Covering index", def: "An index that contains every column the query needs, so the table itself is never read." },
    { term: "Selectivity", def: "How well a condition narrows rows. `id = 5` is highly selective; `is_active = 1` often is not." },
  ],
  problem: [
    "Your e-commerce site slows to a crawl every Friday at 8 p.m. CPU on the database server hits 100%. Monday morning everything is fine. Nobody changed code.",
    "Here is why: the 'My orders' page runs `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`. There is no index on user_id. With 10 million orders the database reads every row for each page view. On a quiet Monday there are 5 such queries per second; during the Friday sale there are 500. The query was always bad. Traffic exposed it.",
  ],
  concept: {
    analogy: [
      "A table without an index is a book without an index page: to find every mention of 'Redis', you read all 600 pages. An index is the alphabetical list at the back: jump to 'R', find 'Redis: pages 41, 212, 388'. A **composite index** on (last name, first name) is a phone book: perfect for 'Sharma, Asha', useless for 'everyone named Asha' because the book is sorted by last name first.",
    ],
    precise: [
      "A B-tree index stores column values in sorted order with pointers to rows. Finding a value is O(log n): for 10 million rows, a handful of page reads instead of millions. In InnoDB, the table itself is a B-tree clustered by the primary key, and secondary indexes store the primary key to find the full row.",
      "The **leftmost-prefix rule**: an index on (a, b, c) can be used for conditions on a, on (a, b), or on (a, b, c), but not for b alone. Equality columns go first, then range or sort columns.",
      "Indexes are not free. Every INSERT, UPDATE and DELETE must update every index, and indexes use disk and memory. You index for your **actual queries**, not every column.",
    ],
  },
  underTheHood: {
    text: [
      "For `WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20` with an index on (user_id, created_at): the database seeks to user 42 in the tree, the entries are already sorted by created_at within that user, so it reads the last 20 entries backwards and stops. No sort, no scan. That is the difference between ~20 row reads and 10 million.",
      "The **query optimiser** estimates the cost of plans using table statistics (row counts, value distribution) and picks the cheapest. Stale statistics or functions on columns can make it choose badly.",
      "Wrapping an indexed column in a function, like `WHERE DATE(created_at) = '2026-10-16'`, usually prevents index use, because the index is sorted by created_at, not by DATE(created_at). Rewrite as a range: `created_at >= '2026-10-16' AND created_at < '2026-10-17'`.",
    ],
    diagram: {
      title: "B-tree lookup for user_id = 42",
      nodes: [
        { label: "Root page", sub: "1 … 50k … 100k" },
        { label: "Branch page", sub: "1 … 40 … 60" },
        { label: "Leaf page", sub: "(42, dates…) → PKs" },
        { label: "Rows", sub: "fetch 20 by PK" },
      ],
      edges: ["42 < 50k", "40 ≤ 42 < 60", "read 20"],
      caption: "Three or four page reads find the starting point among millions of rows.",
    },
  },
  handsOn: [
    {
      title: "Start MySQL 8 in Docker",
      code: {
        lang: "bash",
        code: `docker run -d --name mysql-lab -e MYSQL_ROOT_PASSWORD=devpass -p 3306:3306 mysql:8.4
# wait ~20 s for startup, then:
docker exec -it mysql-lab mysql -uroot -pdevpass`,
      },
      notes: ["This password is for a local throwaway container only. Never use inline passwords for real environments."],
    },
    {
      title: "Create a table with a million orders",
      code: {
        lang: "sql",
        file: "setup.sql",
        code: `CREATE DATABASE shop; USE shop;

CREATE TABLE orders (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  status     VARCHAR(20) NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL
);

-- generate 1,000,000 rows with a recursive CTE (MySQL 8+)
SET SESSION cte_max_recursion_depth = 1000000;
INSERT INTO orders (user_id, status, total, created_at)
WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 1000000)
SELECT FLOOR(RAND() * 50000) + 1,
       ELT(FLOOR(RAND() * 3) + 1, 'paid', 'shipped', 'cancelled'),
       ROUND(RAND() * 500, 2),
       NOW() - INTERVAL FLOOR(RAND() * 365) DAY
FROM seq;

ANALYZE TABLE orders;`,
      },
      notes: ["This takes from several seconds to a minute depending on your machine."],
    },
    {
      title: "Read the plan before indexing",
      code: {
        lang: "sql",
        code: `EXPLAIN SELECT id, total, created_at FROM orders
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;`,
      },
      output: "type: ALL   key: NULL   rows: ~1000000   Extra: Using where; Using filesort",
      notes: ["`type: ALL` = full table scan. `Using filesort` = a separate sort step. `rows` is an estimate. Both are red flags on a large table."],
    },
    {
      title: "Add the right composite index",
      code: {
        lang: "sql",
        code: `CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);

EXPLAIN SELECT id, total, created_at FROM orders
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;

-- MySQL 8.0.18+: actually runs the query and shows real timings
EXPLAIN ANALYZE SELECT id, total, created_at FROM orders
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;`,
      },
      output: "type: ref   key: idx_orders_user_created   rows: ~20   Extra: Backward index scan",
      notes: ["`type: ref` means an index lookup on equality. The sort disappeared because the index is already ordered. The exact Extra text varies by version."],
    },
    {
      title: "See an index get ignored",
      code: {
        lang: "sql",
        code: `CREATE INDEX idx_orders_created ON orders (created_at);

-- function on the column: the index cannot be used for the seek
EXPLAIN SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY;

-- sargable range: uses the index
EXPLAIN SELECT COUNT(*) FROM orders
WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE();`,
      },
      notes: ["'Sargable' = Search ARGument ABLE: written so an index can be used. MySQL 8.0.13+ also supports functional indexes if you really need to index an expression."],
    },
    {
      title: "PostgreSQL equivalent",
      code: { lang: "sql", code: `-- same idea, different output format
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, total, created_at FROM orders
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20;
-- look for "Index Scan Backward using idx_orders_user_created" vs "Seq Scan"` },
    },
  ],
  companies: [
    "**Slow query logs are standard.** Teams enable MySQL's slow query log or PostgreSQL's `pg_stat_statements` and review the top queries by total time every week. A few queries usually account for most of the load.",
    "**Index changes go through review and migrations**, just like code. On large tables, teams create indexes with online DDL (MySQL InnoDB supports many online index operations; PostgreSQL has `CREATE INDEX CONCURRENTLY`) to avoid blocking writes during business hours.",
    "**Load testing before events.** E-commerce and ticketing companies replay realistic traffic before sales, precisely to find the 'Friday 8 p.m.' query before customers do.",
  ],
  mistakes: [
    { mistake: "Indexing every column separately", why: "More indexes sounds faster", wrong: "Writes slow down, memory fills, and the optimiser still cannot combine them well for multi-column filters", fix: "Design composite indexes from real query patterns" },
    { mistake: "Wrong column order in a composite index", why: "Order seems arbitrary", wrong: "Index on (created_at, user_id) cannot seek by user_id", fix: "Equality columns first, then range/sort columns" },
    { mistake: "Functions on indexed columns in WHERE", why: "DATE(), LOWER() feel natural", wrong: "Index ignored, full scan", fix: "Rewrite as a range, or use a functional/expression index" },
    { mistake: "SELECT * everywhere", why: "Convenient", wrong: "Prevents covering indexes, transfers unneeded data", fix: "Select only the columns you use" },
    { mistake: "Testing only on tiny dev data", why: "Dev DB has 100 rows", wrong: "Every query is fast locally, slow in production", fix: "Test with production-like volumes and check EXPLAIN" },
    { mistake: "Huge OFFSET pagination", why: "LIMIT 20 OFFSET 200000 is easy", wrong: "The DB still reads and discards 200,000 rows", fix: "Keyset pagination: WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 20" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Index foreign keys and columns used in WHERE, JOIN and ORDER BY of hot queries. Verify with EXPLAIN, measure with EXPLAIN ANALYZE." },
    { tag: "Performance", text: "Use keyset (cursor) pagination for deep pages and infinite scroll." },
    { tag: "Reliability", text: "Create indexes on big tables online (CONCURRENTLY / online DDL) and schedule them off-peak." },
    { tag: "Cost", text: "Fix the top 5 slow queries before buying a bigger database instance: it is often a 10× cheaper win." },
    { tag: "Maintainability", text: "Name indexes consistently (idx_<table>_<cols>) and drop unused ones (check usage stats)." },
  ],
  interview: [
    { q: "How does a database index work?", a: "Typically a B-tree: values sorted in a balanced tree with pointers to rows, giving O(log n) lookups and ordered range scans. It trades extra storage and slower writes for much faster reads." },
    { q: "You have an index on (a, b). Which queries can use it?", a: "WHERE a = ?, WHERE a = ? AND b = ?, WHERE a = ? ORDER BY b, and range on b after equality on a. Not WHERE b = ? alone (leftmost-prefix rule), although some databases can do a less efficient skip scan." },
    { q: "A query is slow in production. What do you do?", a: "Get the exact query and parameters (slow log, APM), run EXPLAIN / EXPLAIN ANALYZE on production-like data, look for full scans, filesorts and bad row estimates, then fix with an index, a query rewrite or by reducing data fetched. Verify the plan changed and measure." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Index on (user_id, created_at). Which query CANNOT seek using it?",
      options: ["WHERE user_id = 7", "WHERE user_id = 7 AND created_at > '2026-01-01'", "WHERE created_at > '2026-01-01'", "WHERE user_id = 7 ORDER BY created_at"],
      answer: 2,
      explanation: "Leftmost-prefix rule: without user_id, the index is not sorted by created_at globally.",
    },
    {
      kind: "bug",
      prompt: "There is an index on email, yet this query does a full scan. Why?",
      code: { lang: "sql", code: "SELECT id FROM users WHERE LOWER(email) = 'asha@example.com';" },
      options: ["id is not indexed", "The function on the column prevents index use", "Strings cannot be indexed", "LIMIT is missing"],
      answer: 1,
      explanation: "The index is on email, not LOWER(email), so it cannot seek. (MySQL 8 may show `type: index`: it reads every entry of the email index because the index covers `id`, which is still a full scan.) Store emails normalised, use a case-insensitive collation, or create an expression index.",
    },
    {
      kind: "output",
      prompt: "EXPLAIN shows `type: ALL, rows: 1000000`. This means:",
      options: ["The index is used for all rows", "A full table scan of about a million rows", "One row is returned", "The query is cached"],
      answer: 1,
      explanation: "type ALL is a full table scan; rows is the optimiser's estimate of rows examined.",
    },
  ],
  cheatSheet: [
    "B-tree index: sorted, O(log n) lookup, ordered range scans.",
    "Composite index (a, b, c): usable for a; a,b; a,b,c. Not b alone.",
    "Equality columns first, then range/sort columns.",
    "No functions on indexed columns in WHERE; use ranges.",
    "EXPLAIN red flags: type ALL, Using filesort, huge rows estimate.",
    "EXPLAIN ANALYZE shows real timings (MySQL 8.0.18+, PostgreSQL).",
    "Keyset pagination beats big OFFSETs.",
    "Every index slows writes: index for real queries only.",
  ],
  homework: {
    basic: {
      title: "Index the admin search",
      brief: ["Admins run `SELECT id, total FROM orders WHERE status = 'paid' AND created_at >= ? AND created_at < ?`. Show EXPLAIN before and after adding the best index, and justify the column order."],
      criteria: ["EXPLAIN before and after", "Index column order justified with the equality-then-range rule"],
      hints: ["status is equality, created_at is a range."],
      solution: {
        text: ["(status, created_at): seek to status = 'paid', then scan the date range in order. Adding total makes it covering: (status, created_at, total), since InnoDB secondary indexes already include the primary key id."],
        code: { lang: "sql", code: "CREATE INDEX idx_orders_status_created_total ON orders (status, created_at, total);" },
        pitfalls: ["(created_at, status): the range on the first column stops the index from narrowing by status efficiently"],
      },
    },
    intermediate: {
      title: "Replace OFFSET pagination",
      brief: ["Rewrite the 'My orders' page from OFFSET to keyset pagination. Measure page 1 and page 5,000 for both approaches with EXPLAIN ANALYZE."],
      criteria: ["Correct keyset query with tie-breaker on id", "Index supports it", "Timings for both"],
      hints: ["The cursor is the last row's (created_at, id)."],
      solution: {
        text: ["Include id as a tie-breaker because created_at is not unique. The index (user_id, created_at, id) lets every page start with a seek, so page 5,000 is as fast as page 1."],
        code: { lang: "sql", code: `SELECT id, total, created_at FROM orders
WHERE user_id = 42
  AND (created_at, id) < ('2026-05-01 10:00:00', 812345)
ORDER BY created_at DESC, id DESC
LIMIT 20;` },
        pitfalls: ["Paginating by created_at alone and skipping or repeating rows with identical timestamps"],
      },
    },
    challenge: {
      title: "Find the Friday query",
      brief: ["Enable MySQL's slow query log in your container (long_query_time = 0.1), write a small script that hammers three different queries 1,000 times, then use the log (or mysqldumpslow) to rank them and fix the worst."],
      criteria: ["Slow log enabled with SQL commands", "Ranking of queries by total time", "Fix verified by re-running the load"],
      hints: ["SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 0.1;", "mysqldumpslow is included in the MySQL image."],
      solution: {
        text: [
          "Rank by total time (count × average), not by the single slowest execution: a 50 ms query run 100,000 times hurts more than a 5 s report run once a day. Fix the top one, re-run the load, compare.",
          "The script turns the slow log on with SET GLOBAL, sends it to a table (`log_output = 'TABLE'`) so it can be read back with SQL, and replays 1,000 requests: 800 'My orders', 150 order lookups by id and 50 'revenue for one day' queries. It groups the logged statements by fingerprint (numbers replaced by N, which is what mysqldumpslow does) and ranks them by total time.",
          "In production you would keep long_query_time = 0.1. While sampling, the script sets it to 0 for a short window so that fast-but-frequent queries are counted too; it restores the original settings at the end. With a file log, the same ranking is `mysqldumpslow -s t -t 3 /var/lib/mysql/<host>-slow.log` (`-s t` sorts by total time).",
          "The winner is the revenue query: `DATE(created_at) = …` cannot seek, so each call scans all 1,000,000 rows. The fix is the sargable range from the lesson plus a covering index on (created_at, total). In one run on MySQL 8.0 it dropped from about 9 s total (180 ms per call, 1,000,000 rows examined) to under 0.1 s (about 1.4 ms per call, about 2,700 rows examined). Your timings will differ; the rows-examined column is the number to watch.",
        ],
        code: {
          lang: "python",
          file: "find_friday_query.py",
          code: `"""Find the Friday query: enable the slow log, replay a realistic load, rank by total time, fix, re-run."""
import os
import random
import re
from collections import defaultdict

import pymysql

def connect() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ["MYSQL_PASSWORD"],          # never hard-code credentials
        database=os.environ.get("MYSQL_DB", "shop"),
        autocommit=True,
    )

def day_params() -> tuple:
    d = random.randint(1, 7)
    return (d, d)

QUERIES = {   # name -> (sql, params factory)
    "my_orders": ("SELECT id, total, created_at FROM orders WHERE user_id = %s "
                  "ORDER BY created_at DESC LIMIT 20", lambda: (random.randint(1, 50_000),)),
    "order_detail": ("SELECT * FROM orders WHERE id = %s", lambda: (random.randint(1, 1_000_000),)),
    "revenue_day": ("SELECT SUM(total) FROM orders "
                    "WHERE DATE(created_at) = CURDATE() - INTERVAL %s DAY", lambda: (random.randint(1, 7),)),
}
FIXED_REVENUE = ("SELECT SUM(total) FROM orders WHERE created_at >= CURDATE() - INTERVAL %s DAY "
                 "AND created_at < CURDATE() - INTERVAL %s DAY + INTERVAL 1 DAY", day_params)
MIX = ["my_orders"] * 800 + ["order_detail"] * 150 + ["revenue_day"] * 50   # 1,000 requests

def run_load(admin: pymysql.connections.Connection) -> None:
    with admin.cursor() as c:
        c.execute("TRUNCATE TABLE mysql.slow_log")
    app = connect()                      # new session: picks up the GLOBAL long_query_time
    random.seed(7)
    order = MIX[:]
    random.shuffle(order)
    with app.cursor() as c:
        for name in order:
            sql, params = QUERIES[name]
            c.execute(sql, params())
            c.fetchall()
    thread = app.thread_id()
    app.close()
    report(admin, thread)

def report(admin: pymysql.connections.Connection, thread: int) -> None:
    stats: dict[str, list[float]] = defaultdict(lambda: [0, 0.0, 0])   # calls, seconds, rows examined
    with admin.cursor() as c:
        c.execute("SELECT sql_text, query_time, rows_examined FROM mysql.slow_log "
                  "WHERE thread_id = %s AND sql_text LIKE 'SELECT%%FROM orders%%'", (thread,))
        for sql_text, query_time, rows in c.fetchall():
            text = sql_text.decode() if isinstance(sql_text, bytes) else sql_text
            fingerprint = re.sub(r"\\b\\d+\\b", "N", text)              # same idea as mysqldumpslow
            s = stats[fingerprint]
            s[0] += 1; s[1] += query_time.total_seconds(); s[2] += rows
    ranked = sorted(stats.items(), key=lambda kv: kv[1][1], reverse=True)
    for rank, (fp, (calls, secs, rows)) in enumerate(ranked, 1):
        print(f"{rank}. total {secs:7.3f}s  calls {calls:4d}  avg {secs / calls * 1000:8.2f} ms  "
              f"rows/call {rows / calls:>9.0f}  {fp[:70]}")

def main() -> None:
    admin = connect()                    # needs SYSTEM_VARIABLES_ADMIN for SET GLOBAL
    with admin.cursor() as c:
        c.execute("SELECT @@log_output, @@slow_query_log, @@long_query_time")
        saved = c.fetchone()
        c.execute("SET GLOBAL log_output = 'TABLE'")         # query the log with SQL (FILE works with mysqldumpslow)
        c.execute("SET GLOBAL slow_query_log = 'ON'")
        # Production setting is 0.1. While sampling we log everything, otherwise a 5 ms query
        # run 100,000 times would never appear in the log at all.
        c.execute("SET GLOBAL long_query_time = 0")
    try:
        print("== before ==")
        run_load(admin)
        with admin.cursor() as c:        # fix the worst: sargable range + covering index
            c.execute("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() "
                      "AND table_name = 'orders' AND index_name = 'idx_orders_created_total'")
            if c.fetchone()[0] == 0:
                c.execute("CREATE INDEX idx_orders_created_total ON orders (created_at, total)")
        QUERIES["revenue_day"] = FIXED_REVENUE
        print("== after ==")
        run_load(admin)
    finally:
        with admin.cursor() as c:        # put the server back the way we found it
            c.execute(f"SET GLOBAL log_output = '{saved[0]}'")
            c.execute("SET GLOBAL slow_query_log = %s", ("ON" if saved[1] else "OFF",))
            c.execute("SET GLOBAL long_query_time = %s", (float(saved[2]),))
        admin.close()

if __name__ == "__main__":
    main()`,
        },
        pitfalls: [
          "Leaving long_query_time = 0 on in production: the log grows by every statement. Sample for a short window, then restore it",
          "SET GLOBAL long_query_time only affects new connections; open the load connection after changing it",
        ],
      },
    },
    capstone: {
      title: "DevAtlas step 7: progress schema",
      brief: ["Design MySQL tables for users, lessons, lesson_progress (user, lesson, status, score, updated_at) and quiz_attempts. Write the 3 hottest queries the dashboard will run and design indexes for them."],
      criteria: ["Primary and foreign keys defined", "3 queries with matching indexes", "EXPLAIN shows index use with seeded data"],
      hints: ["The dashboard asks: my progress for all lessons; my last 10 quiz attempts; how many learners completed lesson X."],
      solution: {
        text: [
          "lesson_progress: PRIMARY KEY (user_id, lesson_id) serves 'my progress'. quiz_attempts: INDEX (user_id, created_at) serves 'last 10 attempts'. INDEX (lesson_id, status) serves completion counts. Each index maps to a named query.",
          "Foreign keys are table-level clauses (MySQL 8.0 ignores column-level REFERENCES). Each composite index also starts with a foreign key column, so InnoDB does not need an extra index for that FK; only quiz_attempts.lesson_id gets one created automatically.",
          "The seed uses deterministic expressions instead of RAND(), so the EXPLAIN output and results below are reproducible. Q1 is a `ref` lookup on the primary key, Q2 reads the index backwards and stops after 10 entries (no filesort), and Q3 is answered from the index alone (`Using index`).",
        ],
        code: {
          lang: "sql",
          file: "progress_schema.sql",
          code: `-- DevAtlas step 7: progress schema, seeded data, and the 3 dashboard queries with their plans (MySQL 8)
CREATE DATABASE IF NOT EXISTS devatlas;
USE devatlas;

CREATE TABLE users (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(254) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lessons (
  id       VARCHAR(16) PRIMARY KEY,                 -- natural key like '5.1.1'
  title    VARCHAR(200) NOT NULL,
  position INT NOT NULL UNIQUE
);

CREATE TABLE lesson_progress (
  user_id    BIGINT NOT NULL,
  lesson_id  VARCHAR(16) NOT NULL,
  status     VARCHAR(12) NOT NULL CHECK (status IN ('started', 'completed')),
  score      DECIMAL(4,3) NULL CHECK (score BETWEEN 0 AND 1),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id),                         -- Q1: my progress
  INDEX idx_progress_lesson_status (lesson_id, status),     -- Q3: completions per lesson (also serves the FK)
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (lesson_id) REFERENCES lessons (id)
);

CREATE TABLE quiz_attempts (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  lesson_id  VARCHAR(16) NOT NULL,
  score      DECIMAL(4,3) NOT NULL CHECK (score BETWEEN 0 AND 1),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempts_user_created (user_id, created_at),   -- Q2: my last 10 attempts (also serves the FK)
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (lesson_id) REFERENCES lessons (id)
);

-- Deterministic seed: 5,000 users, 20 lessons, ~67k progress rows, 100k quiz attempts
SET SESSION cte_max_recursion_depth = 100000;
INSERT INTO users (email, name)
WITH RECURSIVE s (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 5000)
SELECT CONCAT('learner', n, '@devatlas.dev'), CONCAT('Learner ', n) FROM s;

INSERT INTO lessons (id, title, position)
WITH RECURSIVE s (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 20)
SELECT CONCAT('5.', CEIL(n / 5), '.', (n - 1) % 5 + 1), CONCAT('Lesson ', n), n FROM s;

INSERT INTO lesson_progress (user_id, lesson_id, status, score)
SELECT u.id, l.id,
       IF((u.id + l.position) % 4 = 0, 'started', 'completed'),
       IF((u.id + l.position) % 4 = 0, NULL, ((u.id * 7 + l.position * 13) % 101) / 100)
FROM users u JOIN lessons l
WHERE (u.id * 7 + l.position) % 3 <> 0;

INSERT INTO quiz_attempts (user_id, lesson_id, score, created_at)
WITH RECURSIVE s (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 100000)
SELECT n % 5000 + 1,
       (SELECT id FROM lessons WHERE position = (n DIV 5000) % 20 + 1),
       ((n * 37) % 1001) / 1000,
       TIMESTAMP '2026-07-01 00:00:00' + INTERVAL n MINUTE
FROM s;

ANALYZE TABLE users, lessons, lesson_progress, quiz_attempts;

-- Q1: my progress for all lessons (dashboard grid)
EXPLAIN SELECT lesson_id, status, score FROM lesson_progress WHERE user_id = 42 ORDER BY lesson_id;
SELECT lesson_id, status, score FROM lesson_progress WHERE user_id = 42 ORDER BY lesson_id LIMIT 5;

-- Q2: my last 10 quiz attempts
EXPLAIN SELECT lesson_id, score, created_at FROM quiz_attempts
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10;
SELECT lesson_id, score, created_at FROM quiz_attempts
WHERE user_id = 42 ORDER BY created_at DESC LIMIT 3;

-- Q3: how many learners completed lesson 5.1.1
EXPLAIN SELECT COUNT(*) FROM lesson_progress WHERE lesson_id = '5.1.1' AND status = 'completed';
SELECT COUNT(*) AS completed FROM lesson_progress WHERE lesson_id = '5.1.1' AND status = 'completed';`,
        },
        output: "+--------------------------+---------+----------+----------+\n| Table                    | Op      | Msg_type | Msg_text |\n+--------------------------+---------+----------+----------+\n| devatlas.users           | analyze | status   | OK       |\n| devatlas.lessons         | analyze | status   | OK       |\n| devatlas.lesson_progress | analyze | status   | OK       |\n| devatlas.quiz_attempts   | analyze | status   | OK       |\n+--------------------------+---------+----------+----------+\n+----+-------------+-----------------+------------+------+---------------+---------+---------+-------+------+----------+-------+\n| id | select_type | table           | partitions | type | possible_keys | key     | key_len | ref   | rows | filtered | Extra |\n+----+-------------+-----------------+------------+------+---------------+---------+---------+-------+------+----------+-------+\n|  1 | SIMPLE      | lesson_progress | NULL       | ref  | PRIMARY       | PRIMARY | 8       | const |   14 |   100.00 | NULL  |\n+----+-------------+-----------------+------------+------+---------------+---------+---------+-------+------+----------+-------+\n+-----------+-----------+-------+\n| lesson_id | status    | score |\n+-----------+-----------+-------+\n| 5.1.1     | completed | 0.040 |\n| 5.1.2     | started   |  NULL |\n| 5.1.4     | completed | 0.430 |\n| 5.1.5     | completed | 0.560 |\n| 5.2.2     | completed | 0.820 |\n+-----------+-----------+-------+\n+----+-------------+---------------+------------+------+---------------------------+---------------------------+---------+-------+------+----------+---------------------+\n| id | select_type | table         | partitions | type | possible_keys             | key                       | key_len | ref   | rows | filtered | Extra               |\n+----+-------------+---------------+------------+------+---------------------------+---------------------------+---------+-------+------+----------+---------------------+\n|  1 | SIMPLE      | quiz_attempts | NULL       | ref  | idx_attempts_user_created | idx_attempts_user_created | 8       | const |   20 |   100.00 | Backward index scan |\n+----+-------------+---------------+------------+------+---------------------------+---------------------------+---------+-------+------+----------+---------------------+\n+-----------+-------+---------------------+\n| lesson_id | score | created_at          |\n+-----------+-------+---------------------+\n| 5.4.5     | 0.004 | 2026-09-05 00:01:00 |\n| 5.4.4     | 0.189 | 2026-09-01 12:41:00 |\n| 5.4.3     | 0.374 | 2026-08-29 01:21:00 |\n+-----------+-------+---------------------+\n+----+-------------+-----------------+------------+------+----------------------------+----------------------------+---------+-------------+------+----------+-------------+\n| id | select_type | table           | partitions | type | possible_keys              | key                        | key_len | ref         | rows | filtered | Extra       |\n+----+-------------+-----------------+------------+------+----------------------------+----------------------------+---------+-------------+------+----------+-------------+\n|  1 | SIMPLE      | lesson_progress | NULL       | ref  | idx_progress_lesson_status | idx_progress_lesson_status | 116     | const,const | 2499 |   100.00 | Using index |\n+----+-------------+-----------------+------------+------+----------------------------+----------------------------+---------+-------------+------+----------+-------------+\n+-----------+\n| completed |\n+-----------+\n|      2499 |\n+-----------+",
        pitfalls: [
          "A separate index on status alone: with two values it is not selective, and Q3 still has to visit rows",
          "Forgetting ANALYZE TABLE after a bulk load, so the optimiser plans with stale statistics",
        ],
      },
    },
  },
  deeper: [
    { label: "MySQL 8.4: Optimization and indexes", url: "https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html" },
    { label: "MySQL 8.4: EXPLAIN output format", url: "https://dev.mysql.com/doc/refman/8.4/en/explain-output.html" },
    { label: "PostgreSQL: Using EXPLAIN", url: "https://www.postgresql.org/docs/current/using-explain.html" },
    { label: "Use The Index, Luke (free book)", url: "https://use-the-index-luke.com/" },
  ],
  nextPreview: "Next: transactions and isolation levels. Two users buy the last ticket at the same moment: who gets it, and how do you make sure it is not both?",
};
