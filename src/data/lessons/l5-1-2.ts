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
    # conn must not be in autocommit mode. Avoid "with conn:" here: psycopg 3 and PyMySQL
    # close the connection when that block exits, so the retry would hit a closed connection.
    for i in range(attempts):
        try:
            result = work(conn)
            conn.commit()
            return result
        except Exception as e:
            conn.rollback()                    # end the failed transaction; the connection stays usable
            args = getattr(e, "args", ())
            code = str(getattr(e, "sqlstate", None) or (args[0] if args else ""))
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
          "Session A: BEGIN; SELECT seats_left FROM sessions WHERE id=1; → 5. Session B: UPDATE … SET seats_left=4 (autocommit). Session A: SELECT again → still 5 under REPEATABLE READ, because InnoDB gives the transaction a consistent snapshot taken at its first read. Under READ COMMITTED every statement gets a fresh snapshot, so A sees B's commit immediately.",
          "A detail worth knowing: inside the same REPEATABLE READ transaction, `SELECT … FOR UPDATE` returned 4, while the plain SELECT before and after it returned 5. Locking reads (and UPDATE/DELETE) always work on the latest committed row version; only plain reads use the snapshot. That is why read-then-update code must use a locking read or an atomic UPDATE.",
          "Locking: A: BEGIN; SELECT … FOR UPDATE; B: UPDATE the same row → blocks until A commits or rolls back, and both decrements are applied. If A never finishes, B fails after innodb_lock_wait_timeout with error 1205. B's plain SELECT does not wait at all, because MVCC readers never block on row locks.",
          "Every result in the comments was observed on MySQL 8.0 by running these exact statements on two connections.",
        ],
        code: {
          lang: "sql",
          file: "isolation_transcript.sql",
          code: `-- Two terminals, both: docker exec -it mysql-lab mysql -uroot -p shop
-- [A] / [B] says which terminal runs the next lines. Results observed on MySQL 8.0 are in comments.

-- Setup (either terminal)
CREATE TABLE sessions (id INT PRIMARY KEY, seats_left INT NOT NULL);
INSERT INTO sessions VALUES (1, 5);

-- ===== 1. REPEATABLE READ keeps a snapshot =====
-- [A]
SELECT @@transaction_isolation;                           -- REPEATABLE-READ (InnoDB default)
BEGIN;
SELECT seats_left FROM sessions WHERE id = 1;             -- 5  (the snapshot is taken at this first read)
-- [B]  autocommit: committed immediately
UPDATE sessions SET seats_left = 4 WHERE id = 1;          -- Query OK, 1 row affected
-- [A]
SELECT seats_left FROM sessions WHERE id = 1;             -- still 5: plain reads use the snapshot
SELECT seats_left FROM sessions WHERE id = 1 FOR UPDATE;  -- 4: locking reads see the latest committed row
SELECT seats_left FROM sessions WHERE id = 1;             -- 5 again: back to the snapshot
COMMIT;
SELECT seats_left FROM sessions WHERE id = 1;             -- 4: new transaction, new snapshot

-- ===== 2. Same steps under READ COMMITTED =====
-- [A]
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT seats_left FROM sessions WHERE id = 1;             -- 4
-- [B]
UPDATE sessions SET seats_left = 3 WHERE id = 1;
-- [A]
SELECT seats_left FROM sessions WHERE id = 1;             -- 3: every statement takes a fresh snapshot
COMMIT;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- ===== 3. SELECT ... FOR UPDATE makes the other writer wait =====
-- [A]
BEGIN;
SELECT seats_left FROM sessions WHERE id = 1 FOR UPDATE;  -- 3, row is now locked by A
-- [B]
SET SESSION innodb_lock_wait_timeout = 5;
UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1;   -- hangs ...
-- [A]
UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1;
COMMIT;
-- [B] the UPDATE returns as soon as A commits: Query OK, 1 row affected (2.00 sec)
SELECT seats_left FROM sessions WHERE id = 1;             -- 1: both decrements applied, none lost

-- ===== 4. Lock wait timeout =====
-- [A]
BEGIN;
SELECT seats_left FROM sessions WHERE id = 1 FOR UPDATE;  -- 1, and A does not commit
-- [B]
UPDATE sessions SET seats_left = seats_left - 1 WHERE id = 1;
-- after 5 s: ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
SELECT seats_left FROM sessions WHERE id = 1;             -- 1, instantly: plain reads never wait for row locks
-- [A]
ROLLBACK;`,
        },
        pitfalls: [
          "Forgetting that the mysql client is in autocommit mode: without BEGIN, each SELECT is its own transaction and you will not see the snapshot effect",
          "Leaving terminal A's transaction open and wondering why every later write from B hangs",
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
          "Timeline: T1 reads count(on_call)=2, T2 reads count=2, T1 sets mentor A off, T2 sets mentor B off, both commit → zero on call. No row was written by both, so row-level conflict detection does not fire: this is write skew. A CHECK constraint cannot help either, because the rule ('at least one row') spans several rows and each row on its own is valid.",
          "The script replays that exact interleaving with two connections. Under REPEATABLE READ (snapshot isolation in PostgreSQL) both commits succeed and nobody is on call. Under SERIALIZABLE, PostgreSQL's SSI notices the read/write dependency cycle and fails T2's commit with SQLSTATE 40001; the retry wrapper re-runs the whole check-then-write, T2 now sees only one mentor on call and is refused.",
          "The MySQL-style fix is to lock the set the decision depends on: `SELECT id FROM mentors WHERE on_call ORDER BY id FOR UPDATE`, then count in the application (PostgreSQL does not allow FOR UPDATE with count(*)). T2 blocks on the row locks, and when T1 commits, its locking read sees the latest committed rows, finds one mentor and refuses. The same function behaves the same way on MySQL 8.0 under its default REPEATABLE READ.",
        ],
        code: {
          lang: "python",
          file: "write_skew.py",
          code: `"""Write skew: 'at least one mentor on call', reproduced and fixed in PostgreSQL."""
import os
import random
import threading
import time

import psycopg
from psycopg import IsolationLevel

DSN = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/postgres")  # password via PGPASSWORD
RETRYABLE = {"40001", "40P01"}

def connect(level: IsolationLevel) -> psycopg.Connection:
    conn = psycopg.connect(DSN)
    conn.isolation_level = level
    return conn

def reset() -> None:
    with psycopg.connect(DSN, autocommit=True) as db:
        db.execute("DROP TABLE IF EXISTS mentors")
        db.execute("CREATE TABLE mentors (id int PRIMARY KEY, name text NOT NULL, on_call boolean NOT NULL)")
        db.execute("INSERT INTO mentors VALUES (1, 'Asha', true), (2, 'Ravi', true)")

def on_call_names() -> list[str]:
    with psycopg.connect(DSN) as db:
        return [r[0] for r in db.execute("SELECT name FROM mentors WHERE on_call ORDER BY id")]

def count_on_call(conn: psycopg.Connection) -> int:
    return conn.execute("SELECT count(*) FROM mentors WHERE on_call").fetchone()[0]

def go_off(conn: psycopg.Connection, mentor_id: int) -> None:
    conn.execute("UPDATE mentors SET on_call = false WHERE id = %s", (mentor_id,))

def request_off_call(conn: psycopg.Connection, mentor_id: int) -> bool:
    """The whole check-then-write as one unit of work (what the retry wrapper re-runs)."""
    if count_on_call(conn) < 2:
        return False
    go_off(conn, mentor_id)
    return True

def run_in_transaction(conn, work, attempts: int = 5):
    for i in range(attempts):
        try:
            result = work(conn)
            conn.commit()
            return result
        except psycopg.Error as e:
            conn.rollback()
            if e.sqlstate not in RETRYABLE or i == attempts - 1:
                raise
            time.sleep((2 ** i) * 0.01 * random.random())

def race(level: IsolationLevel) -> None:
    reset()
    t1, t2 = connect(level), connect(level)
    seen1, seen2 = count_on_call(t1), count_on_call(t2)     # both read before either writes
    print(f"T1 sees {seen1} on call, T2 sees {seen2} on call")
    go_off(t1, 1)                                          # different rows: no write-write conflict
    go_off(t2, 2)
    t1.commit()
    try:
        t2.commit()
        print("T2 commit: OK")
    except psycopg.errors.SerializationFailure as e:
        t2.rollback()
        print(f"T2 commit: {e.sqlstate} serialization failure -> retrying the whole transaction")
        allowed = run_in_transaction(t2, lambda c: request_off_call(c, 2))
        print(f"T2 retry: request {'granted' if allowed else 'refused, Asha is already off call'}")
    print(f"{level.name}: on call now = {on_call_names()}\\n")
    t1.close(); t2.close()

def request_off_call_locking(conn: psycopg.Connection, mentor_id: int) -> bool:
    """MySQL-style fix (works in PostgreSQL too): lock the rows the decision depends on."""
    rows = conn.execute("SELECT id FROM mentors WHERE on_call ORDER BY id FOR UPDATE").fetchall()
    if len(rows) < 2:
        return False
    go_off(conn, mentor_id)
    return True

def race_with_locks() -> None:
    reset()
    t1, t2 = connect(IsolationLevel.READ_COMMITTED), connect(IsolationLevel.READ_COMMITTED)
    results: dict[str, bool] = {}
    request_off_call_locking(t1, 1)                        # T1 holds both row locks, not committed yet
    worker = threading.Thread(target=lambda: results.update(t2=run_in_transaction(
        t2, lambda c: request_off_call_locking(c, 2))))
    worker.start()
    time.sleep(0.5)                                        # T2 is now blocked on the row locks
    t1.commit()                                            # T2 wakes up and re-checks the current rows
    worker.join()
    print(f"FOR UPDATE: T1 granted, T2 {'granted' if results['t2'] else 'refused'}; on call now = {on_call_names()}")
    t1.close(); t2.close()

if __name__ == "__main__":
    race(IsolationLevel.REPEATABLE_READ)                   # snapshot isolation: anomaly
    race(IsolationLevel.SERIALIZABLE)                      # SSI detects it, one transaction retries
    race_with_locks()`,
        },
        output: "T1 sees 2 on call, T2 sees 2 on call\nT2 commit: OK\nREPEATABLE_READ: on call now = []\n\nT1 sees 2 on call, T2 sees 2 on call\nT2 commit: 40001 serialization failure -> retrying the whole transaction\nT2 retry: request refused, Asha is already off call\nSERIALIZABLE: on call now = ['Ravi']\n\nFOR UPDATE: T1 granted, T2 refused; on call now = ['Ravi']",
        pitfalls: [
          "Retrying only the failed COMMIT or UPDATE: the decision was made on stale data, so the whole transaction (including the read) must run again",
          "Using SERIALIZABLE without a retry loop: 40001 errors are expected behaviour under load, not bugs",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: safe live-session booking",
      brief: ["Add live mentoring sessions to DevAtlas (sessions, bookings tables) with an atomic booking endpoint, CHECK and UNIQUE constraints, deadlock-aware retries, and a concurrency test that fires 200 parallel bookings at a 20-seat session."],
      criteria: ["Exactly 20 bookings after the test", "No duplicate bookings per user", "Endpoint returns 409 when full"],
      hints: ["Use Testcontainers MySQL (lesson 4.1.2) for the concurrency test."],
      solution: {
        text: [
          "The atomic UPDATE with rowcount check plus the bookings insert in one transaction is enough; constraints guarantee correctness even if a future code path forgets the rule.",
          "`UPDATE live_sessions SET seats_left = seats_left - 1 WHERE id = @id AND seats_left > 0` decides and takes the seat in one statement. If it affects no row, the session is full (409) or does not exist (404). The booking insert runs in the same transaction, so a duplicate booking (error 1062 from the `one_booking_per_user` primary key) rolls back and gives the seat back.",
          "CHECK (seats_left BETWEEN 0 AND capacity) is the safety net (MySQL 8.0.16+ enforces CHECK). Deadlocks (1213) and lock wait timeouts (1205) retry the whole transaction with jittered backoff, up to five attempts.",
          "The test starts a real MySQL 8.0 in a Testcontainer, fires 200 parallel POSTs at a 20-seat session through WebApplicationFactory and checks the HTTP results and the database: exactly 20 × 201 Created, 180 × 409, 20 distinct users booked, seats_left = 0. It passes on .NET 9 (`dotnet test`, about 15 to 30 s including the container start).",
        ],
        code: {
          lang: "csharp",
          file: "Booking.Api/Program.cs + Booking.Tests/BookingTests.cs",
          code: `// dotnet add Booking.Api package MySqlConnector
// dotnet add Booking.Tests package Microsoft.AspNetCore.Mvc.Testing; dotnet add Booking.Tests package Testcontainers.MySql

// Booking.Api/Program.cs: atomic live-session booking (MySQL 8 via MySqlConnector)
using MySqlConnector;

var builder = WebApplication.CreateBuilder(args);
var cs = builder.Configuration.GetConnectionString("Booking")
         ?? throw new InvalidOperationException("ConnectionStrings:Booking is not configured");  // env/secret store, not code
builder.Services.AddSingleton(new MySqlDataSource(cs));
var app = builder.Build();

await using (var conn = await app.Services.GetRequiredService<MySqlDataSource>().OpenConnectionAsync())
    await new MySqlCommand(BookingService.Schema, conn).ExecuteNonQueryAsync();   // real apps: a migration

app.MapPost("/sessions/{sessionId:long}/bookings", async (long sessionId, BookRequest req, MySqlDataSource db) =>
    await BookingService.BookAsync(db, sessionId, req.UserId) switch
    {
        BookingOutcome.Booked => Results.Created($"/sessions/{sessionId}/bookings/{req.UserId}", new { sessionId, req.UserId }),
        BookingOutcome.Full => Results.Conflict(new { error = "session is full" }),
        BookingOutcome.AlreadyBooked => Results.Conflict(new { error = "you already booked this session" }),
        _ => Results.NotFound(),
    });

app.Run();

public record BookRequest(long UserId);
public enum BookingOutcome { Booked, Full, AlreadyBooked, NotFound }

public static class BookingService
{
    public const string Schema = """
        CREATE TABLE IF NOT EXISTS live_sessions (
          id         BIGINT AUTO_INCREMENT PRIMARY KEY,
          title      VARCHAR(200) NOT NULL,
          capacity   INT NOT NULL CHECK (capacity > 0),
          seats_left INT NOT NULL,
          CONSTRAINT seats_in_range CHECK (seats_left BETWEEN 0 AND capacity)
        );
        CREATE TABLE IF NOT EXISTS bookings (
          session_id BIGINT NOT NULL,
          user_id    BIGINT NOT NULL,
          booked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT one_booking_per_user PRIMARY KEY (session_id, user_id),
          FOREIGN KEY (session_id) REFERENCES live_sessions (id)
        );
        """;

    public static async Task<BookingOutcome> BookAsync(MySqlDataSource db, long sessionId, long userId)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await TryBookAsync(db, sessionId, userId);
            }
            catch (MySqlException e) when (attempt < 5 &&
                e.ErrorCode is MySqlErrorCode.LockDeadlock or MySqlErrorCode.LockWaitTimeout)
            {
                await Task.Delay(Random.Shared.Next(5, 25) * attempt);   // backoff with jitter, then rerun everything
            }
        }
    }

    private static async Task<BookingOutcome> TryBookAsync(MySqlDataSource db, long sessionId, long userId)
    {
        await using var conn = await db.OpenConnectionAsync();
        await using var tx = await conn.BeginTransactionAsync();

        // 1) check and decrement in ONE statement: no window for another request to sneak in
        var take = new MySqlCommand(
            "UPDATE live_sessions SET seats_left = seats_left - 1 WHERE id = @id AND seats_left > 0", conn, tx);
        take.Parameters.AddWithValue("@id", sessionId);
        if (await take.ExecuteNonQueryAsync() == 0)
        {
            await tx.RollbackAsync();
            var exists = new MySqlCommand("SELECT COUNT(*) FROM live_sessions WHERE id = @id", conn);
            exists.Parameters.AddWithValue("@id", sessionId);
            return Convert.ToInt64(await exists.ExecuteScalarAsync()) > 0 ? BookingOutcome.Full : BookingOutcome.NotFound;
        }

        // 2) the booking row in the same transaction; the primary key rejects a second booking by the same user
        var insert = new MySqlCommand("INSERT INTO bookings (session_id, user_id) VALUES (@s, @u)", conn, tx);
        insert.Parameters.AddWithValue("@s", sessionId);
        insert.Parameters.AddWithValue("@u", userId);
        try
        {
            await insert.ExecuteNonQueryAsync();
        }
        catch (MySqlException e) when (e.ErrorCode == MySqlErrorCode.DuplicateKeyEntry)
        {
            await tx.RollbackAsync();                                    // gives the seat back
            return BookingOutcome.AlreadyBooked;
        }
        await tx.CommitAsync();
        return BookingOutcome.Booked;
    }
}

public partial class Program;   // lets WebApplicationFactory<Program> find the app

// ─────────────────────────────────────────────────────────────────────────────
// Booking.Tests/BookingTests.cs: 200 parallel requests against real MySQL in a Testcontainer
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using MySqlConnector;
using Testcontainers.MySql;

public sealed class BookingTests : IAsyncLifetime
{
    private readonly MySqlContainer _mysql = new MySqlBuilder("mysql:8.0").Build();

    public Task InitializeAsync() => _mysql.StartAsync();
    public Task DisposeAsync() => _mysql.DisposeAsync().AsTask();

    [Fact]
    public async Task Two_hundred_parallel_bookings_fill_exactly_twenty_seats()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.UseSetting("ConnectionStrings:Booking", _mysql.GetConnectionString()));
        var client = factory.CreateClient();                              // starts the app, creates the schema
        await using var db = new MySqlConnection(_mysql.GetConnectionString());
        await db.OpenAsync();
        await new MySqlCommand(
            "INSERT INTO live_sessions (id, title, capacity, seats_left) VALUES (1, 'SQL office hours', 20, 20)", db)
            .ExecuteNonQueryAsync();

        var responses = await Task.WhenAll(Enumerable.Range(1, 200).Select(userId =>
            client.PostAsJsonAsync("/sessions/1/bookings", new BookRequest(userId))));

        Assert.Equal(20, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(180, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(20L, await ScalarAsync(db, "SELECT COUNT(DISTINCT user_id) FROM bookings WHERE session_id = 1"));
        Assert.Equal(0L, await ScalarAsync(db, "SELECT seats_left FROM live_sessions WHERE id = 1"));

        // a second session: the same user cannot book twice, and the seat is given back
        await new MySqlCommand("INSERT INTO live_sessions (id, title, capacity, seats_left) VALUES (2, 'Docker Q&A', 5, 5)", db)
            .ExecuteNonQueryAsync();
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/sessions/2/bookings", new BookRequest(7))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/sessions/2/bookings", new BookRequest(7))).StatusCode);
        Assert.Equal(4L, await ScalarAsync(db, "SELECT seats_left FROM live_sessions WHERE id = 2"));
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/sessions/99/bookings", new BookRequest(7))).StatusCode);
    }

    private static async Task<long> ScalarAsync(MySqlConnection db, string sql) =>
        Convert.ToInt64(await new MySqlCommand(sql, db).ExecuteScalarAsync());
}`,
        },
        pitfalls: [
          "Reading seats_left in C#, checking it, then writing the new value: exactly the lost update from the hands-on, just slower",
          "Inserting the booking in a separate transaction: a crash between the two statements loses a seat",
          "Testing with the EF InMemory provider or SQLite: neither reproduces MySQL's locking, so the race never shows up",
        ],
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
