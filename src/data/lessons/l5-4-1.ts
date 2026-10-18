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
        ],
      },
    },
    capstone: {
      title: "DevAtlas: data operations runbook",
      brief: ["Write docs/runbooks/database.md for DevAtlas: migration rules (expand/contract, lock timeouts), backup schedule and retention, RPO/RTO targets, restore procedure with commands, replica read routing, and who to page. Add the restore-test workflow."],
      criteria: ["Concrete commands, not vague advice", "RPO/RTO stated and justified", "Restore test running on a schedule"],
      hints: ["Write it so someone new can follow it at 3 a.m."],
      solution: {
        text: ["A runbook plus an automated restore test is what turns backups into recoverability; you will reuse this format for every service in Phase 9."],
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
