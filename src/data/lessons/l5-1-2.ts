import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.1.2",
  title: "Transactions, isolation levels and locking",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["5.1.1 Indexes and query plans"],
  summary: "Use transactions to keep data correct under concurrency: ACID, isolation levels and the anomalies they prevent, row locks and SELECT … FOR UPDATE, atomic updates, deadlocks and how to retry safely.",
  terms: [
    { term: "Transaction", def: "A group of statements that succeed or fail together: BEGIN … COMMIT (or ROLLBACK)." },
    { term: "ACID", def: "Atomicity (all or nothing), Consistency (rules hold), Isolation (concurrent transactions do not interfere badly), Durability (committed data survives crashes)." },
    { term: "Isolation level", def: "How much concurrent transactions can see of each other: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE." },
    { term: "Lost update", def: "Two transactions read the same value, both modify it, and one write silently overwrites the other." },
    { term: "Row lock", def: "A lock on specific rows, e.g. taken by UPDATE or SELECT … FOR UPDATE, blocking other writers until commit." },
    { term: "Deadlock", def: "Two transactions each wait for a lock the other holds; the database aborts one of them." },
    { term: "MVCC", def: "Multi-version concurrency control: readers see a consistent snapshot without blocking writers (used by PostgreSQL and MySQL InnoDB)." },
  ],
  problem: [
    "DevAtlas runs a live mentoring session with 20 seats. At 9:00 a.m., 300 learners click 'Book seat' at once. The code reads `seats_left`, checks it is above zero, then writes `seats_left - 1`. The session ends up with 27 bookings and a negative seat count.",
    "This is the classic lost update, and it appears in inventory, ticketing, wallets, counters and anything else that reads, decides and writes. Transactions, the right isolation level, locks or atomic statements fix it; knowing which to use is a core backend skill.",
  ],
  concept: {
    analogy: [
      "A transaction is a **bank teller window with a 'closed' sign**: everything you do at the window (withdraw from one account, deposit into another) either completes fully or not at all. Isolation decides **how much you can see of other windows' half-finished work**. A row lock is **holding the last concert ticket in your hand** while you pay: others must wait until you finish or give it back.",
    ],
    precise: [
      "**Atomicity** solves partial failures (debit without credit). **Isolation** solves concurrency anomalies: dirty reads (seeing uncommitted data), non-repeatable reads (a row changes between two reads), phantoms (new rows appear in a range), lost updates and write skew.",
      "Defaults differ: **PostgreSQL** uses READ COMMITTED; **MySQL InnoDB** uses REPEATABLE READ. Neither default prevents a read-check-write lost update by itself if the code reads, computes in the application, then writes.",
      "**Fixes, simplest first**: (1) make it one atomic statement: `UPDATE sessions SET seats_left = seats_left - 1 WHERE id = ? AND seats_left > 0` and check affected rows; (2) pessimistic locking: `SELECT … FOR UPDATE` inside a transaction, then update; (3) optimistic concurrency: a version column checked in the UPDATE (lesson 4.1.2); (4) SERIALIZABLE isolation with retries; (5) constraints (CHECK seats_left >= 0, UNIQUE (session_id, user_id)) as a safety net.",
      "Keep transactions **short**: no network calls or user waits inside them, because they hold locks and old MVCC versions. Always handle deadlocks and serialization failures by retrying the whole transaction.",
    ],
  },
  underTheHood: {
    text: [
      "With MVCC, each transaction reads a snapshot: rows have versions, and readers see the version committed as of their snapshot, so reads do not block writes. Writes to the same row still conflict: the second writer waits for the first to commit or roll back.",
      "`SELECT … FOR UPDATE` takes exclusive row locks on matching rows (and in MySQL REPEATABLE READ, gap/next-key locks on index ranges to prevent phantoms). Without a suitable index, the database may lock far more rows than you expect, which is another reason indexes matter.",
      "Deadlock detection: the database keeps a wait-for graph; a cycle means deadlock, and it aborts one victim with an error (MySQL 1213, PostgreSQL 40P01). Consistent lock ordering (always lock rows in ascending id order) prevents most deadlocks.",
    ],
    diagram: {
      title: "Lost update without locking",
      nodes: [
        { label: "T1 reads seats=1", sub: "" },
        { label: "T2 reads seats=1", sub: "" },
        { label: "T1 writes 0, books", sub: "" },
        { label: "T2 writes 0, books", sub: "overwrites!" },
        { label: "2 bookings, 1 seat", sub: "bug" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Reproduce the lost update (Python + SQLite, runs anywhere)",
      code: {
        lang: "python",
        file: "lost_update.py",
        code: `import sqlite3, threading, time, os, tempfile

path = os.path.join(tempfile.mkdtemp(), "seats.db")
setup = sqlite3.connect(path)
setup.execute("CREATE TABLE sessions (id INTEGER PRIMARY KEY, seats_left INTEGER NOT NULL)")
setup.execute("CREATE TABLE bookings (session_id INTEGER, user_id INTEGER)")
setup.execute("INSERT INTO sessions VALUES (1, 5)")
setup.commit()

def book_naive(user_id: int) -> None:
    db = sqlite3.connect(path, timeout=10, isolation_level=None)     # autocommit: each statement alone
    seats = db.execute("SELECT seats_left FROM sessions WHERE id = 1").fetchone()[0]
    if seats > 0:
        time.sleep(0.01)                                               # app work between read and write
        db.execute("UPDATE sessions SET seats_left = ? WHERE id = 1", (seats - 1,))
        db.execute("INSERT INTO bookings VALUES (1, ?)", (user_id,))

threads = [threading.Thread(target=book_naive, args=(u,)) for u in range(20)]
for t in threads: t.start()
for t in threads: t.join()
print("bookings:", setup.execute("SELECT COUNT(*) FROM bookings").fetchone()[0],
      "seats_left:", setup.execute("SELECT seats_left FROM sessions").fetchone()[0])`,
      },
      output: "bookings: 20 seats_left: 4   (numbers vary, but bookings exceed the 5 seats)",
      notes: ["Many threads read the same seats_left before anyone writes. The exact numbers depend on timing; the point is that bookings exceed capacity."],
    },
    {
      title: "Fix 1: one atomic conditional UPDATE",
      code: {
        lang: "python",
        code: `def book_atomic(user_id: int) -> bool:
    db = sqlite3.connect(path, timeout=10, isolation_level=None)
    db.execute("BEGIN IMMEDIATE")                       # take the write lock up front (SQLite)
    cur = db.execute("UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1 AND seats_left > 0")
    if cur.rowcount == 1:                                # we got a seat
        db.execute("INSERT INTO bookings VALUES (1, ?)", (user_id,))
        db.execute("COMMIT")
        return True
    db.execute("ROLLBACK")
    return False

setup.execute("DELETE FROM bookings"); setup.execute("UPDATE sessions SET seats_left = 5"); setup.commit()
threads = [threading.Thread(target=book_atomic, args=(u,)) for u in range(20)]
for t in threads: t.start()
for t in threads: t.join()
print("bookings:", setup.execute("SELECT COUNT(*) FROM bookings").fetchone()[0],
      "seats_left:", setup.execute("SELECT seats_left FROM sessions").fetchone()[0])`,
      },
      output: "bookings: 5 seats_left: 0",
      notes: ["The check and the decrement happen in one statement, so no other transaction can sneak in between. The booking insert is in the same transaction, so seats and bookings always agree."],
    },
    {
      title: "Fix 2 in MySQL/PostgreSQL: SELECT … FOR UPDATE",
      code: {
        lang: "sql",
        code: `BEGIN;
-- lock the session row; concurrent bookers wait here until we commit
SELECT seats_left FROM sessions WHERE id = 1 FOR UPDATE;
-- application checks seats_left > 0, then:
UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1;
INSERT INTO bookings (session_id, user_id) VALUES (1, 42);
COMMIT;

-- safety nets regardless of application code:
ALTER TABLE sessions ADD CONSTRAINT seats_non_negative CHECK (seats_left >= 0);   -- MySQL 8.0.16+ enforces CHECK
ALTER TABLE bookings ADD CONSTRAINT one_booking_per_user UNIQUE (session_id, user_id);`,
      },
      notes: ["Use FOR UPDATE when the decision needs more than one statement (e.g. check user eligibility, then book). Keep the transaction short."],
    },
    {
      title: "Transfers: atomicity and lock ordering",
      code: {
        lang: "sql",
        code: `-- Move 100 credits from wallet 7 to wallet 3, safely
BEGIN;
SELECT id, balance FROM wallets WHERE id IN (3, 7) ORDER BY id FOR UPDATE;   -- lock in a consistent order
UPDATE wallets SET balance = balance - 100 WHERE id = 7 AND balance >= 100;  -- check affected rows = 1
UPDATE wallets SET balance = balance + 100 WHERE id = 3;
INSERT INTO ledger (from_wallet, to_wallet, amount) VALUES (7, 3, 100);
COMMIT;`,
      },
      notes: ["If two transfers lock (3 then 7) and (7 then 3) in different orders, they can deadlock. Always lock in id order."],
    },
    {
      title: "Retry wrapper for deadlocks and serialization failures",
      code: {
        lang: "python",
        code: `import random, time

RETRYABLE = {"1213", "1205", "40001", "40P01"}   # MySQL deadlock/lock wait; Postgres serialization/deadlock

def run_in_transaction(conn, work, attempts: int = 5):
    for i in range(attempts):
        try:
            with conn:                         # many drivers: commit on success, rollback on exception
                return work(conn)
        except Exception as e:
            code = str(getattr(e, "sqlstate", None) or getattr(e, "args", [""])[0])
            if code not in RETRYABLE or i == attempts - 1:
                raise
            time.sleep((2 ** i) * 0.01 * random.random())   # backoff with jitter (lesson 1.2.1)`,
      },
      notes: ["How the error code is exposed differs by driver (e.g. psycopg's e.sqlstate, PyMySQL's e.args[0]); adapt the extraction to your driver. Retry the whole transaction, never a single statement."],
    },
  ],
  companies: [
    "**Ticketing and inventory**: e-commerce and booking systems use atomic conditional updates or row locks for stock and seats, plus unique constraints to stop duplicate orders; very hot items sometimes use queues or Redis counters in front of the database.",
    "**Money movement**: banks and fintechs use double-entry ledgers in transactions, consistent lock ordering, idempotency keys (lesson 4.4.2) and strict isolation for balance checks.",
    "**Operational monitoring**: teams track deadlocks, lock waits and long-running transactions (MySQL performance_schema, PostgreSQL pg_stat_activity and pg_locks); a long transaction left open by a bug can block writes and bloat storage.",
  ],
  mistakes: [
    { mistake: "Read-check-write in application code without locking", why: "Looks correct in single-user tests", wrong: "Lost updates under concurrency: overselling, negative balances", fix: "Atomic conditional UPDATE, FOR UPDATE, or optimistic versioning" },
    { mistake: "Long transactions with network calls inside", why: "Wrapping the whole request in a transaction", wrong: "Locks held for seconds; throughput collapses; deadlocks rise", fix: "Do external calls outside; keep transactions short" },
    { mistake: "Not retrying deadlocks", why: "Treating them as fatal bugs", wrong: "Random user-facing errors under load", fix: "Retry the whole transaction with backoff for deadlock/serialization errors" },
    { mistake: "Relying on default isolation to prevent everything", why: "Assuming the database 'handles it'", wrong: "Write skew and lost updates still happen", fix: "Know your engine's default; use explicit locking or SERIALIZABLE where needed" },
    { mistake: "No constraints as a safety net", why: "Trusting application code", wrong: "One buggy code path corrupts data permanently", fix: "CHECK, UNIQUE, FOREIGN KEY, NOT NULL constraints" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Prefer single atomic statements; check affected row counts." },
    { tag: "Reliability", text: "Constraints for invariants (CHECK, UNIQUE, FK) even when code also checks." },
    { tag: "Performance", text: "Short transactions; index the columns used in locking WHERE clauses; consistent lock order." },
    { tag: "Reliability", text: "Retry deadlocks and serialization failures; alert on rising rates." },
  ],
  interview: [
    { q: "Explain isolation levels and the anomalies they prevent.", a: "READ UNCOMMITTED allows dirty reads. READ COMMITTED prevents dirty reads but allows non-repeatable reads and phantoms. REPEATABLE READ keeps reads stable within a transaction (in InnoDB, also using gap locks for locking reads). SERIALIZABLE makes transactions behave as if run one at a time, preventing write skew, at the cost of more blocking or aborts that need retries." },
    { q: "How do you prevent overselling the last item?", a: "Make the check and decrement atomic: UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0 and check that one row was affected, inside a transaction with the order insert. Alternatively SELECT … FOR UPDATE or optimistic versioning, plus a CHECK constraint qty >= 0." },
    { q: "What causes deadlocks and how do you handle them?", a: "Two transactions acquire locks in different orders and wait on each other. Reduce them with consistent lock ordering, short transactions and good indexes; handle the remaining ones by catching the deadlock error and retrying the whole transaction with backoff." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which statement safely books a seat without a race?",
      options: [
        "SELECT seats_left; then UPDATE … SET seats_left = <value from app>",
        "UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1 AND seats_left > 0 (and check affected rows)",
        "UPDATE sessions SET seats_left = 0",
        "SELECT seats_left FROM sessions",
      ],
      answer: 1,
      explanation: "The condition and decrement happen atomically in one statement.",
    },
    {
      kind: "mcq",
      prompt: "Default isolation level of MySQL InnoDB?",
      options: ["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"],
      answer: 2,
      explanation: "InnoDB defaults to REPEATABLE READ; PostgreSQL defaults to READ COMMITTED.",
    },
    {
      kind: "bug",
      prompt: "Two transfers occasionally fail with deadlock errors. One locks wallet A then B; the other locks B then A. Best fix?",
      options: ["Increase lock timeout", "Always lock wallets in ascending id order (and retry on deadlock)", "Use READ UNCOMMITTED", "Remove the transaction"],
      answer: 1,
      explanation: "Consistent ordering removes the cycle; retries handle rare remaining cases.",
    },
  ],
  cheatSheet: [
    "BEGIN … COMMIT/ROLLBACK; keep it short.",
    "Anomalies: dirty read, non-repeatable read, phantom, lost update, write skew.",
    "Defaults: PostgreSQL READ COMMITTED; MySQL InnoDB REPEATABLE READ.",
    "Atomic: UPDATE … SET x = x - 1 WHERE … AND x > 0 → check rowcount.",
    "Pessimistic: SELECT … FOR UPDATE. Optimistic: version column.",
    "Constraints as safety net: CHECK, UNIQUE, FK.",
    "Lock in consistent order; retry deadlocks (1213 / 40P01) and 40001.",
  ],
  homework: {
    basic: {
      title: "Wallet transfer with invariants",
      brief: ["Using SQLite in Python, implement transfer(from_id, to_id, amount) in one transaction: fail without changes if funds are insufficient, write a ledger row, and prove with 50 concurrent random transfers that the total balance never changes and no balance goes negative."],
      criteria: ["Single transaction per transfer", "CHECK (balance >= 0) constraint", "Invariant test passes"],
      hints: ["Use BEGIN IMMEDIATE in SQLite to serialise writers."],
      solution: {
        text: ["Atomic conditional debit plus a CHECK constraint make insufficient funds impossible; the sum is invariant because each transfer debits and credits the same amount in one transaction."],
        code: {
          lang: "python",
          code: `import os, random, sqlite3, tempfile, threading

path = os.path.join(tempfile.mkdtemp(), "wallet.db")
s = sqlite3.connect(path)
s.execute("CREATE TABLE wallets (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL CHECK (balance >= 0))")
s.execute("CREATE TABLE ledger (src INTEGER, dst INTEGER, amount INTEGER)")
s.executemany("INSERT INTO wallets VALUES (?, ?)", [(i, 100) for i in range(1, 6)])
s.commit()

def transfer(src: int, dst: int, amount: int) -> bool:
    db = sqlite3.connect(path, timeout=10, isolation_level=None)
    db.execute("BEGIN IMMEDIATE")
    try:
        cur = db.execute("UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?", (amount, src, amount))
        if cur.rowcount != 1:
            db.execute("ROLLBACK"); return False
        db.execute("UPDATE wallets SET balance = balance + ? WHERE id = ?", (amount, dst))
        db.execute("INSERT INTO ledger VALUES (?, ?, ?)", (src, dst, amount))
        db.execute("COMMIT"); return True
    except Exception:
        db.execute("ROLLBACK"); raise

random.seed(1)
jobs = [threading.Thread(target=transfer, args=(random.randint(1, 5), random.randint(1, 5), random.randint(1, 80))) for _ in range(50)]
for j in jobs: j.start()
for j in jobs: j.join()
total, minimum = s.execute("SELECT SUM(balance), MIN(balance) FROM wallets").fetchone()
assert total == 500 and minimum >= 0
print("total", total, "min", minimum)`,
        },
      },
    },
    intermediate: {
      title: "Observe isolation in MySQL",
      brief: ["With two MySQL sessions (two terminals running `docker exec -it mysql-lab mysql -uroot -p…`), demonstrate: (1) REPEATABLE READ gives the same result for a repeated SELECT inside a transaction even after the other session commits; (2) SELECT … FOR UPDATE makes the second session wait. Record each step."],
      criteria: ["Step-by-step transcript of both sessions", "Correct explanation of each observation"],
      hints: ["SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED; to compare."],
      solution: {
        text: [
          "Session A: BEGIN; SELECT seats_left FROM sessions WHERE id=1; → 5. Session B: UPDATE … SET seats_left=4; COMMIT. Session A: SELECT again → still 5 under REPEATABLE READ (snapshot), 4 under READ COMMITTED. Locking: A: BEGIN; SELECT … FOR UPDATE; B: UPDATE same row → blocks until A commits or rolls back (or innodb_lock_wait_timeout expires, error 1205).",
        ],
      },
    },
    challenge: {
      title: "Write skew and SERIALIZABLE",
      brief: ["Model 'at least one mentor must be on call': two mentors each check that the other is on call and then go off call at the same time. Show this anomaly under snapshot-based isolation and fix it with SERIALIZABLE (PostgreSQL) or SELECT … FOR UPDATE on the relevant rows (MySQL). Explain why a row-level check alone fails."],
      criteria: ["Anomaly reproduced or reasoned with a precise timeline", "Fix with explanation", "Retry handling for serialization failures"],
      hints: ["Each transaction reads both rows but writes only its own row, so there is no direct write-write conflict."],
      solution: {
        text: [
          "Timeline: T1 reads count(on_call)=2, T2 reads count=2, T1 sets mentor A off, T2 sets mentor B off, both commit → zero on call. No row was written by both, so row-level conflict detection does not fire: this is write skew. Fixes: PostgreSQL SERIALIZABLE detects the dangerous read/write dependency and aborts one transaction with 40001 (retry it); or lock the set being checked with SELECT … FROM mentors WHERE on_call FOR UPDATE so the second transaction waits and re-checks.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: safe live-session booking",
      brief: ["Add live mentoring sessions to DevAtlas (sessions, bookings tables) with an atomic booking endpoint, CHECK and UNIQUE constraints, deadlock-aware retries, and a concurrency test that fires 200 parallel bookings at a 20-seat session."],
      criteria: ["Exactly 20 bookings after the test", "No duplicate bookings per user", "Endpoint returns 409 when full"],
      hints: ["Use Testcontainers MySQL (lesson 4.1.2) for the concurrency test."],
      solution: {
        text: ["The atomic UPDATE with rowcount check plus the bookings insert in one transaction is enough; constraints guarantee correctness even if a future code path forgets the rule."],
      },
    },
  },
  deeper: [
    { label: "PostgreSQL: Transaction isolation", url: "https://www.postgresql.org/docs/current/transaction-iso.html" },
    { label: "MySQL 8.4: InnoDB transaction isolation levels", url: "https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html" },
    { label: "MySQL 8.4: Deadlocks in InnoDB", url: "https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks.html" },
    { label: "Designing Data-Intensive Applications, ch. 7 (book)", url: "https://dataintensive.net/" },
  ],
  nextPreview: "Next: data modeling and normalization: designing schemas that stay correct as the product grows.",
};
