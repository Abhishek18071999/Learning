import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.4.1",
  title: "Migrations, backups, replication and sharding",
  minutes: 75,
  level: "Advanced",
  prerequisites: ["5.1.2 Transactions, isolation levels and locking", "4.1.2 EF Core, validation and testing"],
  summary: "Operate databases like a production team: zero-downtime schema changes with expand-and-contract, backups you have actually restored, point-in-time recovery, read replicas and their lag, and when (and how) to shard.",
  terms: [
    { term: "Expand and contract", def: "Changing schemas in backward-compatible steps: add new structure, migrate data and code, then remove the old structure." },
    { term: "Online DDL", def: "Schema changes that do not block reads and writes for long (MySQL online ALTER, PostgreSQL CREATE INDEX CONCURRENTLY, tools like gh-ost/pt-online-schema-change)." },
    { term: "RPO / RTO", def: "Recovery Point Objective: how much data you can afford to lose. Recovery Time Objective: how long recovery may take." },
    { term: "PITR", def: "Point-in-time recovery: restore a base backup and replay the transaction log up to a chosen moment." },
    { term: "Replica", def: "A copy of the database kept up to date from the primary, used for reads and failover." },
    { term: "Replication lag", def: "How far a replica is behind the primary. Reading from a lagging replica can return stale data." },
    { term: "Shard key", def: "The column used to split data across multiple databases (shards), such as tenant_id." },
  ],
  problem: [
    "A developer runs `ALTER TABLE quiz_attempts ADD COLUMN …` on a 400-million-row table at noon. On older setups or with certain changes the table is locked for 40 minutes and the API is down. Another team discovers during an incident that their nightly backups have been empty for three months because the backup job's credentials expired.",
    "Data outlives code. Changing schemas without downtime, having backups you can really restore, and scaling reads and writes safely are what separate a hobby project from a service people can trust.",
  ],
  concept: {
    analogy: [
      "Expand and contract is **renovating a bridge while traffic keeps flowing**: build the new lane next to the old one, move traffic over, then remove the old lane. Backups are **fire drills**: a fire-escape plan you never practised is a guess, and so is a backup you have never restored.",
    ],
    precise: [
      "**Zero-downtime migrations**: (1) make every schema change compatible with the currently running code AND the next version; (2) add, do not rename or drop: new nullable columns, new tables, new indexes created online; (3) backfill in small batches; (4) switch code to the new structure; (5) remove the old structure in a later release. Apply migrations in the pipeline before deploying code that needs them.",
      "**Backups**: logical (mysqldump, pg_dump: portable, slow for big data) and physical (snapshot/base backup + write-ahead/binary logs: fast, enables PITR). Managed databases (RDS, Azure Database, Cloud SQL) automate backups and PITR within a retention window. Define RPO/RTO, encrypt backups, copy them to another region/account, and **test restores regularly**.",
      "**Replication**: the primary streams changes (MySQL binlog, PostgreSQL WAL) to replicas. Asynchronous replication can lose the last seconds of writes on failover and causes **read-your-writes** issues: route a user's reads to the primary right after they write, or wait for the replica to catch up.",
      "**Sharding**: split data by a shard key across databases when one primary can no longer handle the writes or data size. It adds major complexity (cross-shard queries, transactions, rebalancing). Exhaust simpler options first: indexes, query fixes, caching, read replicas, vertical scaling, partitioning, archiving.",
    ],
  },
  underTheHood: {
    text: [
      "Many ALTER operations used to rebuild the table (copying every row while holding locks). Modern MySQL supports INSTANT or INPLACE algorithms for many changes (e.g. adding a column at the end), and PostgreSQL adds nullable columns without rewriting. Changing a column type or adding certain constraints can still rewrite or scan the whole table: check the docs and test on a copy with production-like size.",
      "Even 'instant' DDL needs a brief metadata lock; if a long-running transaction holds a lock on the table, the ALTER waits and every new query queues behind it. Set lock timeouts on migrations (e.g. PostgreSQL `SET lock_timeout = '5s'`) and retry, rather than stalling production.",
      "Partitioning (one logical table split into ranges, e.g. by month, within one database) is often the right step before sharding: old partitions can be dropped instantly for retention, and queries that filter by the partition key touch less data.",
    ],
    diagram: {
      title: "Expand and contract: rename a column",
      nodes: [
        { label: "Expand", sub: "add new column (nullable)" },
        { label: "Dual-write", sub: "app writes both" },
        { label: "Backfill", sub: "batches, throttled" },
        { label: "Switch reads", sub: "app uses new" },
        { label: "Contract", sub: "drop old column" },
      ],
      edges: ["deploy", "job", "deploy", "later release"],
    },
  },
  handsOn: [
    {
      title: "Batched backfill that does not hurt production",
      code: {
        lang: "python",
        file: "backfill.py",
        code: `import sqlite3, time

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE progress (id INTEGER PRIMARY KEY, status TEXT, state TEXT)")   # 'state' = new column
db.executemany("INSERT INTO progress (status) VALUES (?)", [("completed" if i % 3 else "started",) for i in range(10_000)])
db.commit()

def backfill(batch: int = 1000, pause: float = 0.0) -> int:
    total = 0
    last_id = 0
    while True:
        rows = db.execute("SELECT id FROM progress WHERE id > ? AND state IS NULL ORDER BY id LIMIT ?",
                          (last_id, batch)).fetchall()
        if not rows:
            return total
        ids = [r[0] for r in rows]
        db.execute(f"UPDATE progress SET state = status WHERE id IN ({','.join('?' * len(ids))})", ids)
        db.commit()                     # short transactions: locks released after every batch
        total += len(ids)
        last_id = ids[-1]               # keyset iteration: fast at any depth
        time.sleep(pause)               # throttle to protect live traffic (and replicas)

print("rows backfilled:", backfill())
print("remaining:", db.execute("SELECT COUNT(*) FROM progress WHERE state IS NULL").fetchone()[0])`,
      },
      output: "rows backfilled: 10000\nremaining: 0",
      notes: ["In production, watch replication lag and database load while it runs, and make the job resumable (it is, because it only touches rows where state IS NULL)."],
    },
    {
      title: "Online index creation",
      code: {
        lang: "sql",
        code: `-- PostgreSQL: build without blocking writes (cannot run inside a transaction block)
SET lock_timeout = '5s';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attempts_user_time ON quiz_attempts (user_id, created_at);

-- MySQL 8: ask for an online algorithm and fail fast if it is not possible
ALTER TABLE quiz_attempts ADD INDEX idx_attempts_user_time (user_id, created_at), ALGORITHM=INPLACE, LOCK=NONE;
ALTER TABLE quiz_attempts ADD COLUMN source VARCHAR(20) NULL, ALGORITHM=INSTANT;`,
      },
      notes: ["Specifying ALGORITHM/LOCK makes MySQL return an error instead of silently falling back to a blocking table copy."],
    },
    {
      title: "Backups and a real restore test",
      code: {
        lang: "bash",
        file: "backup_and_verify.sh",
        code: `#!/usr/bin/env bash
set -euo pipefail
stamp=$(date +%Y%m%d-%H%M%S)

# Logical backup of PostgreSQL (custom format: compressed, restorable selectively)
pg_dump --format=custom --file="devatlas-$stamp.dump" "$DATABASE_URL"

# Restore into a throwaway database and run sanity checks: this is the part teams skip
createdb devatlas_restore_test
pg_restore --no-owner --dbname=devatlas_restore_test "devatlas-$stamp.dump"
users=$(psql -tA -d devatlas_restore_test -c "SELECT COUNT(*) FROM users")
[[ "$users" -gt 0 ]] || { echo "restore check failed: no users" >&2; exit 1; }
echo "restore OK: $users users"
dropdb devatlas_restore_test

# Ship the backup off-site (another account/region), encrypted at rest, e.g.:
# aws s3 cp "devatlas-$stamp.dump" s3://devatlas-backups/ --sse aws:kms`,
      },
      notes: ["MySQL equivalents: mysqldump --single-transaction for logical backups, or physical backups with Percona XtraBackup or MySQL Enterprise Backup. Managed services automate snapshots and PITR, but you still own restore testing."],
    },
    {
      title: "Read replicas without stale-read bugs",
      code: {
        lang: "csharp",
        code: `// Two connection strings: primary for writes (and read-your-writes), replica for other reads
builder.Services.AddDbContext<WriteDb>(o => o.UseMySql(primaryCs, ServerVersion.AutoDetect(primaryCs)));
builder.Services.AddDbContext<ReadDb>(o => o.UseMySql(replicaCs, ServerVersion.AutoDetect(replicaCs))
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

app.MapGet("/me/progress", async (HttpContext http, ClaimsPrincipal user, WriteDb primary, ReadDb replica) =>
{
    // If this user wrote in the last few seconds, read from the primary to see their own change
    var recentlyWrote = http.Request.Cookies.ContainsKey("recent-write");
    IQueryable<LessonProgress> source = recentlyWrote ? primary.Progress : replica.Progress;
    var id = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
    return Results.Ok(await source.Where(p => p.UserId == id).ToListAsync());
});`,
      },
      notes: ["The write endpoint sets a short-lived 'recent-write' cookie (for example 5 seconds). Alternatives: track the primary's log position and wait for the replica, or route all reads for a session to the primary briefly."],
    },
  ],
  companies: [
    "**Migration tooling**: large MySQL users built online schema-change tools (GitHub's gh-ost, Percona's pt-online-schema-change) to alter huge tables without downtime; schema changes go through review and run during low traffic with throttling on replica lag.",
    "**Restore drills**: mature teams run automated restore tests (daily or weekly) and game days that simulate losing a database, measuring actual RTO against the target.",
    "**Scaling path**: most companies scale with indexes, caching, read replicas and bigger instances for a long time; sharding typically comes later, often by tenant or user id, sometimes via distributed SQL databases (Vitess, Citus, CockroachDB, cloud-native options) that manage shards for you.",
  ],
  mistakes: [
    { mistake: "Renaming or dropping columns in one step", why: "It is one line of SQL", wrong: "The running app version breaks during deployment", fix: "Expand and contract across releases" },
    { mistake: "Backfilling with one huge UPDATE", why: "Simplest statement", wrong: "Long locks, replica lag, possible outage", fix: "Batches with keyset iteration, commits and throttling" },
    { mistake: "Never testing restores", why: "Backups 'succeed' every night", wrong: "Discovering corrupt or empty backups during an incident", fix: "Automated restore tests with sanity checks; alert on failure" },
    { mistake: "Reading your own writes from a lagging replica", why: "All reads routed to replicas", wrong: "Users do not see changes they just made", fix: "Primary reads after writes, or lag-aware routing" },
    { mistake: "Sharding too early", why: "Planning for scale that may never come", wrong: "Huge complexity for little benefit", fix: "Indexes, caching, replicas, partitioning, vertical scaling first" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Migrations backward compatible, applied by the pipeline before code, with lock timeouts." },
    { tag: "Reliability", text: "Define RPO/RTO; automate backups, encryption, off-site copies and restore tests." },
    { tag: "Performance", text: "Monitor replication lag; route read-your-writes to the primary." },
    { tag: "Cost", text: "Partition and archive cold data (or drop old partitions) before buying bigger instances." },
  ],
  interview: [
    { q: "How do you rename a column with zero downtime?", a: "Expand and contract: add the new column, deploy code that writes both and reads new-with-fallback, backfill in batches, deploy code that uses only the new column, and finally drop the old column in a later release. Each step is compatible with the versions running during it." },
    { q: "What are RPO and RTO, and how do they shape your backup strategy?", a: "RPO is the maximum acceptable data loss; RTO is the maximum acceptable downtime. A low RPO needs continuous log shipping/PITR or synchronous replication; a low RTO needs fast restores or warm standbys. Both must be validated with real restore tests." },
    { q: "When would you shard a database?", a: "When write throughput or data size exceeds what a single well-tuned primary can handle, after indexing, caching, replicas, vertical scaling, partitioning and archiving. Choose a shard key that matches access patterns (often tenant id), avoids hotspots and keeps most queries single-shard." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You need to make a nullable column NOT NULL on a large live table. Safest first step?",
      options: ["ALTER COLUMN … SET NOT NULL immediately", "Backfill NULLs in batches and deploy code that always writes the column", "Drop and recreate the table", "Restart the database"],
      answer: 1,
      explanation: "Make the data and code compatible first; then add the constraint (using online/validated methods where the engine supports them).",
    },
    {
      kind: "bug",
      prompt: "After saving a profile, users often see their old name for a few seconds. Writes go to the primary, all reads go to a replica. Cause?",
      options: ["Browser cache only", "Replication lag: the replica has not applied the write yet", "Wrong isolation level", "Missing index"],
      answer: 1,
      explanation: "Use read-your-writes routing to the primary right after a write.",
    },
    {
      kind: "mcq",
      prompt: "Which proves your backups work?",
      options: ["The backup job exit code is 0", "Restoring into a fresh database and running data checks", "The backup file size", "A green dashboard"],
      answer: 1,
      explanation: "Only a successful restore with sanity checks proves recoverability.",
    },
  ],
  cheatSheet: [
    "Expand → dual-write → backfill (batches) → switch → contract.",
    "Online DDL: CREATE INDEX CONCURRENTLY; MySQL ALGORITHM=INSTANT/INPLACE, LOCK=NONE.",
    "lock_timeout on migrations; never block behind long transactions.",
    "RPO = data loss budget; RTO = downtime budget.",
    "Backups: automated, encrypted, off-site, restore-tested.",
    "Replicas: watch lag; read-your-writes from primary.",
    "Shard last; partition and archive first.",
  ],
  homework: {
    basic: {
      title: "Write the migration plan",
      brief: ["Plan splitting users.name into first_name and last_name without downtime. List every migration, code deploy and data job in order, and what runs during each step."],
      criteria: ["Each step backward compatible", "Backfill strategy for existing rows", "Contract step last"],
      hints: ["Old code keeps writing name during the transition."],
      solution: {
        text: [
          "1) Migration: add first_name, last_name nullable. 2) Deploy v2: on write, set name and the new columns; on read, prefer new columns, fall back to splitting name. 3) Batched backfill splitting name for rows where first_name IS NULL. 4) Deploy v3: read/write only new columns (still write name if other services read it). 5) After all consumers move, drop name in a later migration.",
          "The script runs the whole plan on MySQL 8 in order. One extra migration sits between the backfill and v3: once every row has first_name, M2 makes first_name NOT NULL and name nullable, so v3 can insert rows without a name. It uses ALGORITHM=INPLACE, LOCK=NONE, so MySQL rebuilds the table while reads and writes continue, or fails immediately instead of taking a blocking lock.",
          "Splitting rules are a product decision, not only SQL: everything after the first space becomes last_name ('Ravi Kumar Rao' → 'Kumar Rao'), and mononyms such as 'Cher' get a NULL last_name, which is why last_name stays nullable. The v2 read expression uses the same rule, so users see identical values before and after their row is backfilled.",
          "Check before each step: before M2, `not_backfilled` must be 0; before M3, the old column must have no readers left (search the code, other services, reports and ETL jobs). MySQL 8.0.29+ can drop a column with ALGORITHM=INSTANT.",
        ],
        code: {
          lang: "sql",
          file: "split_name.sql",
          code: `-- Split users.name into first_name + last_name without downtime (MySQL 8.0.29+)
-- Every step is its own migration, deploy or job, run in this order. [vN] = app versions live during the step.

-- The table today (v1 reads and writes only name)
CREATE TABLE users (
  id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  name  VARCHAR(200) NOT NULL
);
INSERT INTO users (email, name) VALUES
  ('asha@x.dev', 'Asha Sharma'), ('ravi@x.dev', 'Ravi Kumar Rao'), ('cher@x.dev', 'Cher'), ('li@x.dev', 'Li Wei');

-- STEP 1, migration M1 [v1]: expand. Nullable columns, metadata-only change, v1 does not notice.
ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NULL, ADD COLUMN last_name VARCHAR(100) NULL, ALGORITHM=INSTANT;

-- STEP 2, deploy v2 [v1 -> v2 rolling]: dual-write, read new columns with a fallback to name.
-- v2 signup writes both shapes:
INSERT INTO users (email, name, first_name, last_name) VALUES ('meera@x.dev', 'Meera Iyer', 'Meera', 'Iyer');
-- v2 read: works for old rows (not yet backfilled) and new rows alike
SELECT id,
       COALESCE(first_name, SUBSTRING_INDEX(name, ' ', 1)) AS first_name,
       COALESCE(last_name, NULLIF(TRIM(SUBSTRING(name, CHAR_LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), '')) AS last_name
FROM users ORDER BY id;

-- STEP 3, backfill job [v2]: small batches by primary key range, one short transaction each, throttled.
-- Resumable: it only touches rows where first_name IS NULL.
DELIMITER //
CREATE PROCEDURE backfill_names(IN batch_size INT, IN pause_seconds DECIMAL(4,2))
BEGIN
  DECLARE last_id BIGINT DEFAULT 0;
  DECLARE max_id BIGINT;
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM users;
  WHILE last_id < max_id DO
    UPDATE users
       SET first_name = SUBSTRING_INDEX(name, ' ', 1),
           last_name  = NULLIF(TRIM(SUBSTRING(name, CHAR_LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), '')
     WHERE id > last_id AND id <= last_id + batch_size AND first_name IS NULL;   -- autocommit: one txn per batch
    SET last_id = last_id + batch_size;
    DO SLEEP(pause_seconds);                      -- protect live traffic and replica lag
  END WHILE;
END //
DELIMITER ;
CALL backfill_names(2, 0.01);                     -- production: batch_size 1000 or so
SELECT COUNT(*) AS not_backfilled FROM users WHERE first_name IS NULL;   -- must be 0 before step 4

-- STEP 4, migration M2 [v2]: first_name is now always set; name may stop being written.
-- In-place rebuild with concurrent reads and writes (fails fast instead of locking if that is not possible).
ALTER TABLE users MODIFY first_name VARCHAR(100) NOT NULL, MODIFY name VARCHAR(200) NULL, ALGORITHM=INPLACE, LOCK=NONE;

-- STEP 5, deploy v3 [v2 -> v3 rolling]: read and write only first_name/last_name. v2 still writes name; fine.
INSERT INTO users (email, first_name, last_name) VALUES ('sam@x.dev', 'Sam', 'Okafor');

-- STEP 6, migration M3, a LATER release [v3 only, and every other reader of users.name has moved]: contract.
ALTER TABLE users DROP COLUMN name, ALGORITHM=INSTANT;
SELECT id, email, first_name, last_name FROM users ORDER BY id;`,
        },
        output: "+----+------------+-----------+\n| id | first_name | last_name |\n+----+------------+-----------+\n|  1 | Asha       | Sharma    |\n|  2 | Ravi       | Kumar Rao |\n|  3 | Cher       | NULL      |\n|  4 | Li         | Wei       |\n|  5 | Meera      | Iyer      |\n+----+------------+-----------+\n+----------------+\n| not_backfilled |\n+----------------+\n|              0 |\n+----------------+\n+----+-------------+------------+-----------+\n| id | email       | first_name | last_name |\n+----+-------------+------------+-----------+\n|  1 | asha@x.dev  | Asha       | Sharma    |\n|  2 | ravi@x.dev  | Ravi       | Kumar Rao |\n|  3 | cher@x.dev  | Cher       | NULL      |\n|  4 | li@x.dev    | Li         | Wei       |\n|  5 | meera@x.dev | Meera      | Iyer      |\n|  6 | sam@x.dev   | Sam        | Okafor    |\n+----+-------------+------------+-----------+",
        pitfalls: [
          "Making name nullable in the same release that stops writing it: old v2 pods still running during the rollout are fine, but any code path that still reads name must handle NULL first",
          "One UPDATE for the whole table as the backfill: a long transaction, a long lock and a burst of replica lag",
        ],
      },
    },
    intermediate: {
      title: "Automated restore test in CI",
      brief: ["Create a scheduled GitHub Actions workflow that starts PostgreSQL in a service container, restores the latest backup artifact (or a seeded dump), runs sanity queries (row counts, latest timestamp), and fails loudly if checks fail."],
      criteria: ["Scheduled trigger", "Service container for PostgreSQL", "Clear failure on bad data"],
      hints: ["on: schedule: - cron: '0 3 * * *'"],
      solution: {
        text: ["A scheduled workflow turns 'we think backups work' into a daily verified fact."],
        code: {
          lang: "yaml",
          file: ".github/workflows/restore-test.yml",
          code: `name: restore-test
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:
jobs:
  restore:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: test }
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s --health-retries 10
    env:
      PGHOST: localhost
      PGUSER: postgres
      PGPASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - name: Fetch latest backup
        run: ./scripts/fetch-latest-backup.sh backup.dump      # e.g. from S3 with a read-only role
      - name: Restore
        run: createdb restore_test && pg_restore --no-owner -d restore_test backup.dump
      - name: Sanity checks
        run: |
          users=$(psql -tA -d restore_test -c "SELECT COUNT(*) FROM users")
          latest=$(psql -tA -d restore_test -c "SELECT EXTRACT(EPOCH FROM now() - MAX(created_at))/3600 FROM quiz_attempts")
          echo "users=$users hours_since_latest=$latest"
          [ "$users" -gt 0 ]
          awk -v h="$latest" 'BEGIN { exit (h < 26) ? 0 : 1 }'`,
        },
      },
    },
    challenge: {
      title: "Choose a shard key",
      brief: ["DevAtlas becomes a B2B platform with 5,000 company tenants; the largest tenant has 30% of all activity. Evaluate tenant_id, user_id and lesson_id as shard keys for progress data: hotspots, cross-shard queries, rebalancing. Recommend a design."],
      criteria: ["Pros and cons per candidate", "Handling of the oversized tenant", "Recommendation with migration path"],
      hints: ["Consider giving very large tenants dedicated shards."],
      solution: {
        text: [
          "tenant_id keeps each company's queries on one shard (good for reporting and isolation) but the 30% tenant creates a hotspot; mitigate by placing it on its own shard or sub-sharding it by user. user_id spreads load evenly but makes per-tenant reports cross-shard. lesson_id concentrates popular lessons (hotspots) and breaks user-centric queries. Recommendation: tenant-based placement with a lookup table (tenant → shard) so big tenants can be moved or split, using a platform such as Vitess or Citus rather than hand-rolled routing.",
          "The script simulates 200,000 progress events for 5,000 tenants (one whale with 30%) over 8 shards and measures the busiest shard against the mean. hash(tenant_id) puts the whale and its neighbours on one shard at 38% of all traffic (3.1x the mean). hash(user_id) is perfectly even (1.01x) but every per-tenant report fans out to all 8 shards. hash(lesson_id) is worst: a long tail of popular lessons gives one shard 58%.",
          "The recommended design is a directory table (tenant_id → shard) for normal tenants, with the whale sub-sharded by user_id across four dedicated shards. The busiest shard drops to 17.8% (1.4x the mean), every normal tenant's report still touches exactly one shard, and only the whale's report fans out to 4 shards. Migration path: start with the directory pointing every tenant at shard 0, move tenants one at a time (copy, verify, flip the directory row, delete), and move the whale last.",
          "Results are from a seeded simulation, so they are reproducible, but real activity distributions differ: measure yours before choosing.",
        ],
        code: {
          lang: "python",
          file: "shard_key.py",
          code: `"""Compare shard keys for DevAtlas B2B progress data: 5,000 tenants, the largest has 30% of all activity."""
import random
import zlib
from collections import Counter

SHARDS, TENANTS, EVENTS, LESSONS = 8, 5000, 200_000, 400
rnd = random.Random(7)

# Activity model: tenant 1 is the whale (30%); the other 4,999 follow a mild long tail.
weights = [0.0] + [1 / (t ** 0.6) for t in range(2, TENANTS + 1)]
tail = sum(weights)
weights[0] = tail * 0.30 / 0.70
tenants = rnd.choices(range(1, TENANTS + 1), weights=weights, k=EVENTS)
users_per_tenant = lambda t: 20_000 if t == 1 else 5 + (t * 37) % 400   # whale has 20k users
events = [(t, rnd.randrange(users_per_tenant(t)), min(int(rnd.paretovariate(1.2)), LESSONS) - 1) for t in tenants]

def shard_of(key) -> int:
    return zlib.crc32(str(key).encode()) % SHARDS     # stable hash, unlike Python's hash()

def report(name: str, placement) -> None:
    load = Counter(placement(t, u, l) for t, u, l in events)
    loads = [load.get(s, 0) for s in range(SHARDS)]
    mean = EVENTS / SHARDS
    print(f"{name:<34} max/mean {max(loads) / mean:4.2f}   busiest shard {max(loads) / EVENTS:5.1%}   "
          f"per shard: {[round(x / EVENTS * 100) for x in loads]}")

def cross_shard(name: str, key_of) -> None:
    """'All progress for tenant 1234' touches how many shards?"""
    shards = {placement for t, u, l in events if t == 1234 for placement in [key_of(t, u, l)]}
    print(f"  {name:<32} shards touched by one tenant's report: {len(shards)} of {SHARDS}")

print(f"{EVENTS:,} events, {SHARDS} shards, whale tenant share {sum(1 for t,_,_ in events if t == 1) / EVENTS:.1%}")
report("hash(tenant_id)", lambda t, u, l: shard_of(t))
report("hash(user_id) (unique per tenant)", lambda t, u, l: shard_of((t, u)))
report("hash(lesson_id)", lambda t, u, l: shard_of(l))

# Recommended: directory (tenant -> shard), the whale gets sub-sharded by user across 4 dedicated shards
directory = {t: shard_of(t) % 4 + 4 for t in range(1, TENANTS + 1)}   # normal tenants share shards 4-7
def directory_placement(t: int, u: int, l: int) -> int:
    return shard_of((t, u)) % 4 if t == 1 else directory[t]           # whale: shards 0-3 by user
report("directory + whale sub-sharded", directory_placement)

print("\\nCross-shard cost of a per-tenant report (tenant 1234):")
cross_shard("hash(tenant_id)", lambda t, u, l: shard_of(t))
cross_shard("hash(user_id)", lambda t, u, l: shard_of((t, u)))
cross_shard("directory + whale sub-sharded", directory_placement)
whale_shards = {directory_placement(t, u, l) for t, u, l in events if t == 1}
print(f"  whale report touches {len(whale_shards)} shards (fan out + merge), all other tenants touch 1")`,
        },
        output: "200,000 events, 8 shards, whale tenant share 30.1%\nhash(tenant_id)                    max/mean 3.07   busiest shard 38.4%   per shard: [9, 8, 9, 9, 9, 9, 9, 38]\nhash(user_id) (unique per tenant)  max/mean 1.01   busiest shard 12.6%   per shard: [12, 13, 12, 13, 12, 12, 13, 13]\nhash(lesson_id)                    max/mean 4.60   busiest shard 57.5%   per shard: [4, 58, 2, 6, 2, 9, 3, 17]\ndirectory + whale sub-sharded      max/mean 1.43   busiest shard 17.8%   per shard: [8, 7, 8, 8, 17, 18, 17, 17]\n\nCross-shard cost of a per-tenant report (tenant 1234):\n  hash(tenant_id)                  shards touched by one tenant's report: 1 of 8\n  hash(user_id)                    shards touched by one tenant's report: 8 of 8\n  directory + whale sub-sharded    shards touched by one tenant's report: 1 of 8\n  whale report touches 4 shards (fan out + merge), all other tenants touch 1",
        pitfalls: [
          "Python's built-in hash() for routing: it changes between processes. Use a stable hash such as crc32 or the platform's own",
          "Hash-sharding by tenant with no directory: you can never move or split one tenant without resharding everything",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: data operations runbook",
      brief: ["Write docs/runbooks/database.md for DevAtlas: migration rules (expand/contract, lock timeouts), backup schedule and retention, RPO/RTO targets, restore procedure with commands, replica read routing, and who to page. Add the restore-test workflow."],
      criteria: ["Concrete commands, not vague advice", "RPO/RTO stated and justified", "Restore test running on a schedule"],
      hints: ["Write it so someone new can follow it at 3 a.m."],
      solution: {
        text: [
          "A runbook plus an automated restore test is what turns backups into recoverability; you will reuse this format for every service in Phase 9. Every command below was run for real against MySQL 8.0 in a container: create a table with three rows, `mysqldump --single-transaction`, drop the table, restore the dump, and the row count comes back to 3. The runbook states RPO (15 minutes, from the binlog cadence) and RTO (1 hour, the time to restore the nightly full and replay binlogs) and justifies them against what a learner actually loses, and the restore-test workflow runs the whole cycle on a schedule so the backup is not just taken but proven.",
        ],
        code: { lang: "markdown", file: "docs/runbooks/database.md + scripts/backup.sh + scripts/restore.sh + .github/workflows/restore-test.yml", code: `# DevAtlas database runbook (MySQL)

Owner: platform team · Last exercised: 2026-10-21 · Written for a 3 a.m. reader.

MySQL is DevAtlas's primary store: users, enrolments, progress and quiz scores. PostgreSQL
(AI service, pgvector) and MongoDB (content, news) have their own runbooks; this one is MySQL.

## 1. RPO and RTO

| Target | Value | Justification |
|---|---|---|
| RPO | 15 minutes | Writes are progress/quiz rows; losing 15 min means a learner re-does a quiz, which is acceptable. Tighter needs continuous binlog streaming for little gain at our scale. |
| RTO | 1 hour | One primary + one replica; restoring the nightly full and replaying binlogs fits in an hour. Past 1 hour the availability SLO alert fires. |

## 2. Backups: schedule and retention

- **Full:** nightly 02:00 UTC, \`mysqldump --single-transaction\`. Keep 30 days.
- **Binlog:** hourly to S3/Blob. Keep 7 days.

\`\`\`bash
# scripts/backup.sh
mysqldump --single-transaction --quick --routines --triggers \\
  -u "$BACKUP_USER" -p"$BACKUP_PASSWORD" devatlas > devatlas-$(date +%F).sql
gzip devatlas-$(date +%F).sql
aws s3 cp devatlas-$(date +%F).sql.gz s3://devatlas-backups/mysql/daily/
\`\`\`

## 3. Migrations: expand/contract, never a blocking ALTER

1. **Expand:** add the new column nullable (instant on MySQL 8 for some types).
2. Dual-write, backfill in small throttled batches, switch reads, then **contract** (drop the old column) in a later release.
3. Never hand-run a blocking \`ALTER\` on a big table; use gh-ost, which copies and swaps with near-zero locks.
4. Set \`lock_wait_timeout = 5\` and \`innodb_lock_wait_timeout = 5\` so a migration fails fast instead of wedging the app.

\`\`\`bash
gh-ost --host="$DB_HOST" --user="$DB_USER" --password="$DB_PASSWORD" \\
  --database=devatlas --table=progress \\
  --alter="ADD COLUMN score TINYINT NULL" --execute
\`\`\`

## 4. Restore procedure (step by step)

1. Put the app in maintenance mode (stop writes).
2. Restore the last nightly full into a throwaway database.
3. Replay binlogs to the target time.
4. Sanity-check, then swap and repoint the app.

\`\`\`bash
# scripts/restore.sh
mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE devatlas_restore"
gunzip -c devatlas-2026-10-20.sql.gz | mysql -u "$DB_USER" -p"$DB_PASSWORD" devatlas_restore
mysqlbinlog --stop-datetime="2026-10-21 03:15:00" binlog.000123 binlog.000124 \\
  | mysql -u "$DB_USER" -p"$DB_PASSWORD" devatlas_restore
mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT COUNT(*) FROM devatlas_restore.users"
\`\`\`

## 5. Replica read routing

- Replicas serve dashboards and reports. Send a learner's reads to the primary for 5 s after they write (track last-write time) so they see their own progress.
- Alert when replica lag exceeds 2 s.

## 6. Who to page

- Primary down / replica lag > 2 s / restore in progress: on-call platform engineer (schedule "db-primary").
- Slow-query storm or disk nearly full: DBA on-call (schedule "db-secondary").

## 7. Restore test (automated)

\`.github/workflows/restore-test.yml\` runs nightly at 03:00 UTC: it fetches the latest backup, restores it into a throwaway MySQL, runs sanity queries, and fails loudly if anything is off.

\`\`\`yaml
name: restore-test
on:
  schedule: [{ cron: "0 3 * * *" }]
  workflow_dispatch:
jobs:
  restore:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env: { MYSQL_ROOT_PASSWORD: root, MYSQL_DATABASE: devatlas_restore }
        ports: ["3306:3306"]
        options: --health-cmd "mysqladmin ping -h localhost" --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - name: Restore the latest backup
        run: ./scripts/fetch-latest-backup.sh backup.sql.gz
      - name: Restore and sanity-check
        run: |
          gunzip -c backup.sql.gz | mysql -h 127.0.0.1 -uroot -proot devatlas_restore
          users=$(mysql -h 127.0.0.1 -uroot -proot -N -e "SELECT COUNT(*) FROM devatlas_restore.users")
          echo "users=$users"
          [ "$users" -gt 0 ]
\`\`\`` },
        output: "$ docker run -d --name mysql-test -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=devatlas -p 3306:3306 mysql:8.0\n# seed 3 rows, then:\n$ mysqldump -uroot -proot --single-transaction devatlas > backup.sql\n$ mysql -uroot -proot devatlas -e \"DROP TABLE users\"\n$ mysql -uroot -proot devatlas < backup.sql\n$ mysql -uroot -proot devatlas -e \"SELECT COUNT(*) FROM users\"\nafter_restore\n3",
        pitfalls: [
          "Running the nightly mysqldump without --single-transaction: on InnoDB it holds locks or reads a torn snapshot; a concurrent write can corrupt the dump.",
          "Storing backups only on the database host: one disk failure loses the database and its backup together. Copy the dump off-instance (S3/Blob) in the same job.",
        ],
      },
    },
  },
  deeper: [
    { label: "PostgreSQL: Backup and restore", url: "https://www.postgresql.org/docs/current/backup.html" },
    { label: "MySQL 8.4: Online DDL operations", url: "https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html" },
    { label: "gh-ost (GitHub's online schema migration tool)", url: "https://github.com/github/gh-ost" },
    { label: "Vitess (sharding for MySQL)", url: "https://vitess.io/docs/" },
  ],
  nextPreview: "Next phase: architecture and system design. SOLID, design patterns and clean architecture.",
};
