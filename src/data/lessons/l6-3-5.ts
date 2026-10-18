import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.5",
  title: "Consistency patterns: strong, eventual and weak",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.3.4 Availability: failover, replication and the nines"],
  summary: "Understand weak, eventual and strong consistency and what CAP really forces you to choose. Fix the classic 'I changed it but still see the old value' bug with read-your-own-writes, reason about quorums (R + W > N), and avoid lost updates with versions and CRDTs.",
  terms: [
    { term: "Strong consistency", def: "After a write completes, every read sees it. The system behaves as if there were one copy of the data." },
    { term: "Eventual consistency", def: "If writes stop, all copies converge to the same value after some delay. Reads in the meantime may be stale." },
    { term: "Weak consistency", def: "After a write, reads may or may not see it, and the system makes no effort to make it visible later (best effort, e.g. live video frames)." },
    { term: "Replication lag", def: "How far an asynchronous replica is behind the primary, in time or in log position." },
    { term: "Read-your-own-writes", def: "A guarantee that a user always sees their own changes, even if other users may briefly see old data." },
    { term: "Quorum", def: "With N copies, a write waits for W acknowledgements and a read asks R copies. If R + W > N, every read overlaps the latest write." },
    { term: "CAP theorem", def: "When the network is partitioned, a replicated system must choose: refuse some requests (consistency) or answer with possibly stale data (availability)." },
    { term: "CRDT", def: "Conflict-free replicated data type: a data structure (counter, set) whose copies can be updated independently and always merge to the same result." },
  ],
  problem: [
    "A learner uploads a new profile photo on DevAtlas, the page reloads, and the old photo is still there. They upload it again. And again. Support gets a ticket: 'photo upload is broken'. Nothing is broken: the write went to the PostgreSQL primary, and the page read came from a read replica that was 800 ms behind.",
    "Every system with copies of data (replicas, caches, CDNs, search indexes) has to decide how stale a read may be. Choosing strong consistency everywhere is slow and fragile; choosing eventual consistency everywhere produces bugs like this one and worse ones like double-spending. The skill is choosing per feature, and knowing the patterns that give users a consistent experience on top of eventually consistent storage.",
  ],
  concept: {
    analogy: [
      "Think of a **class notice board** copied to every classroom. **Strong consistency**: the teacher may not leave the office until every board shows the new notice; slow, but nobody ever reads an old one. **Eventual consistency**: the teacher pins the notice in the main hall and a student copies it to other boards during the day; by evening every board agrees. **Weak consistency**: the teacher shouts the announcement once; if you were not in the room, you missed it. **Read-your-own-writes**: whoever wrote the notice walks back to the main hall to check it, so the author is never confused, even if other rooms are still behind.",
    ],
    precise: [
      "**Weak consistency** suits real-time data where only the latest moment matters: video calls, multiplayer game positions, memcached entries that may be evicted. Losing an update is acceptable.",
      "**Eventual consistency** suits data where a short delay is harmless: DNS, email, like counts, feeds, search indexes, asynchronous replicas. Data is replicated asynchronously; the system is available and fast, but readers can see old values for milliseconds to minutes.",
      "**Strong consistency** suits data where a stale read causes real damage: balances, inventory, unique usernames, permissions, password changes. Data is replicated synchronously or all reads and writes go to one leader. It costs latency and, during partitions, availability.",
      "**CAP, precisely.** Networks do partition, so the real choice is between **CP** (during a partition, reject or block requests that cannot be served consistently) and **AP** (keep answering, possibly with stale or conflicting data, and reconcile later). Outside partitions there is still a latency vs consistency trade-off (PACELC, lesson 6.3.1).",
      "**Session guarantees** give users a consistent view without global strong consistency: **read-your-own-writes** (route a user's reads to the primary, or to a replica that has caught up to their last write), **monotonic reads** (a user never sees time go backwards, e.g. by sticking each user to one replica) and **consistent prefix** (you never see an answer before its question).",
      "**Quorums.** With N replicas, if each write waits for W acknowledgements and each read asks R replicas, then R + W > N guarantees overlap: at least one replica in every read has the newest version. Typical setting: N = 3, W = 2, R = 2. Cassandra and DynamoDB-style stores expose this as tunable consistency.",
    ],
  },
  underTheHood: {
    text: [
      "**Why replicas lag.** With asynchronous replication, the primary commits locally, answers the client, then ships its write-ahead log to replicas, which replay it. Under heavy write load, long transactions, slow replica disks or network hiccups, the replica falls behind: usually milliseconds, sometimes seconds or minutes.",
      "**How to read your own writes with replicas.** Option 1: after a user writes, send their reads to the primary for a short window (e.g. 5 seconds), tracked in their session. Option 2 (precise): remember the log position (PostgreSQL LSN) returned after the write; on read, use a replica only if it has replayed at least that position, else use the primary or wait briefly.",
      "**Conflicts in multi-writer systems.** If two replicas accept writes to the same key during a partition, someone must decide the winner. **Last-write-wins** (by timestamp) is simple but silently loses one update and depends on clocks. **Version vectors** detect concurrent writes so the application can merge them. **CRDTs** (counters, sets, registers) are designed so that merging is automatic and always gives the same result.",
    ],
    diagram: {
      title: "The stale profile photo",
      nodes: [
        { label: "1. POST /photo", sub: "write to primary" },
        { label: "Primary", sub: "commits at LSN 0/5A0" },
        { label: "Replica", sub: "replayed up to LSN 0/590" },
        { label: "2. GET /profile", sub: "reads old photo" },
      ],
      edges: ["", "async WAL, 800 ms lag", ""],
      caption: "Fix: route the author's reads to the primary (or a caught-up replica) until the replica passes the write's LSN.",
    },
  },
  handsOn: [
    {
      title: "Reproduce the stale read and fix it with read-your-own-writes",
      text: ["A tiny simulation with a fake clock: the replica applies writes 800 ms late. Compare naive replica reads with a session that remembers when the user last wrote."],
      code: {
        lang: "python",
        file: "ryw.py",
        code: `class Primary:
    def __init__(self):
        self.data, self.log = {}, []          # log of (commit_time_ms, key, value)
    def write(self, now, key, value):
        self.data[key] = value
        self.log.append((now, key, value))

class Replica:
    def __init__(self, primary, lag_ms):
        self.primary, self.lag_ms = primary, lag_ms
    def read(self, now, key):
        value = None
        for t, k, v in self.primary.log:      # replay only what has arrived
            if k == key and t + self.lag_ms <= now:
                value = v
        return value

class Session:
    """Routes reads to the primary for a window after the user's own write."""
    def __init__(self, window_ms):
        self.window_ms, self.last_write_ms = window_ms, None
    def read(self, now, key, primary, replica):
        if self.last_write_ms is not None and now - self.last_write_ms < self.window_ms:
            return primary.data.get(key), "primary"
        return replica.read(now, key), "replica"

primary = Primary()
replica = Replica(primary, lag_ms=800)
primary.write(0, "photo:42", "old.png")

primary.write(10_000, "photo:42", "new.png")
session = Session(window_ms=5_000)
session.last_write_ms = 10_000

for t in (10_050, 10_500, 11_000, 16_000):
    naive = replica.read(t, "photo:42")
    smart, source = session.read(t, "photo:42", primary, replica)
    print(f"t={t:>6} ms  naive replica: {naive:8}  read-your-writes: {smart:8} (from {source})")`,
      },
      output: "t= 10050 ms  naive replica: old.png   read-your-writes: new.png  (from primary)\nt= 10500 ms  naive replica: old.png   read-your-writes: new.png  (from primary)\nt= 11000 ms  naive replica: new.png   read-your-writes: new.png  (from primary)\nt= 16000 ms  naive replica: new.png   read-your-writes: new.png  (from replica)",
      notes: ["Only the author's reads go to the primary, and only briefly, so the primary's extra load is tiny. Other users may see the old photo for under a second, which is fine for a photo and not fine for a bank balance."],
    },
    {
      title: "Quorums: when do reads see the latest write?",
      text: ["Three replicas. A write reaches W of them. A read asks R of them. Enumerate every possible combination and count how often the read includes at least one up-to-date replica."],
      code: {
        lang: "python",
        file: "quorum.py",
        code: `from itertools import combinations

N = 3
replicas = range(N)

def fresh_read_ratio(w: int, r: int) -> float:
    total = fresh = 0
    for written in combinations(replicas, w):        # replicas holding the new value
        for asked in combinations(replicas, r):      # replicas the reader contacts
            total += 1
            fresh += bool(set(written) & set(asked))
    return fresh / total

print(" W  R  R+W>N  reads that see the latest write")
for w, r in [(1, 1), (1, 2), (2, 1), (2, 2), (3, 1), (1, 3)]:
    print(f" {w}  {r}  {str(r + w > N):5}  {fresh_read_ratio(w, r):6.0%}")`,
      },
      output: " W  R  R+W>N  reads that see the latest write\n 1  1  False     33%\n 1  2  False     67%\n 2  1  False     67%\n 2  2  True     100%\n 3  1  True     100%\n 1  3  True     100%",
      notes: [
        "W = 3, R = 1 gives fast reads but every write fails if any replica is down. W = 1, R = 3 is the opposite. W = 2, R = 2 tolerates one replica down for both reads and writes.",
        "Quorum overlap is necessary but not sufficient for full linearisability (concurrent writes and sloppy quorums complicate it); it is still the right first model.",
      ],
    },
    {
      title: "Last-write-wins loses data; a CRDT counter does not",
      text: ["Two data centres each count 'lesson completed' events during a partition, then sync."],
      code: {
        lang: "python",
        file: "crdt_counter.py",
        code: `# Last-write-wins register: each side stores (timestamp, value)
eu = (1000, 0)
us = (1000, 0)
for _ in range(7):
    eu = (eu[0] + 1, eu[1] + 1)          # 7 completions in Europe
for _ in range(5):
    us = (us[0] + 2, us[1] + 1)          # 5 completions in the US, clock runs a bit fast
lww = max(eu, us)                         # merge: keep the later timestamp
print("last-write-wins total:", lww[1])

# G-Counter CRDT: each replica only increments its own slot; merge = max per slot
eu_c = {"eu": 0, "us": 0}
us_c = {"eu": 0, "us": 0}
for _ in range(7):
    eu_c["eu"] += 1
for _ in range(5):
    us_c["us"] += 1
merged = {k: max(eu_c[k], us_c[k]) for k in eu_c}
print("G-Counter total:      ", sum(merged.values()))`,
      },
      output: "last-write-wins total: 5\nG-Counter total:       12",
      notes: ["LWW kept the US value because its clock was ahead, silently dropping 7 events. The G-Counter merge is commutative and idempotent, so syncing in any order, any number of times, gives 12. Redis Enterprise (active-active), Riak and Azure Cosmos DB use CRDT ideas for multi-region writes."],
    },
    {
      title: "Measure replica lag in PostgreSQL",
      code: {
        lang: "sql",
        file: "replica_lag.sql",
        code: `-- On the primary: how far behind is each replica, in bytes and time?
SELECT application_name,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS bytes_behind,
       replay_lag
FROM pg_stat_replication;

-- After a write on the primary: remember this position in the user's session
SELECT pg_current_wal_lsn();          -- e.g. 0/5A0

-- On a replica: has it replayed the user's write yet?
SELECT pg_last_wal_replay_lsn() >= '0/5A0'::pg_lsn AS caught_up;`,
      },
      notes: ["This is the precise form of read-your-own-writes: route the read to the replica only if `caught_up` is true. Alert when `replay_lag` stays above a few seconds."],
    },
  ],
  companies: [
    "**Per-feature consistency.** Large shops show eventually consistent product reviews, recommendations and 'items sold' counts, but use strongly consistent paths for checkout, payments and stock reservation.",
    "**Tunable consistency in databases.** Cassandra lets each query choose ONE, QUORUM or ALL. DynamoDB reads are eventually consistent by default, with a strongly consistent read option at higher cost. Azure Cosmos DB offers five levels from strong to eventual, including session consistency (read-your-own-writes per client).",
    "**Read-your-writes in practice.** Many web apps route a user's reads to the primary for a few seconds after that user writes, or pin them with a cookie, which solves most 'I don't see my change' tickets without making every read slow.",
  ],
  mistakes: [
    { mistake: "Reading from a replica right after a write", why: "All reads were routed to replicas to offload the primary", wrong: "Users do not see their own changes and repeat actions (double posts, double payments)", fix: "Read-your-own-writes: primary for a window after writes, or LSN-based routing" },
    { mistake: "Calling a distributed system 'CA'", why: "Misreading CAP", wrong: "No plan for partitions, so behaviour during one is undefined", fix: "Partitions happen; decide per operation whether to block (CP) or serve stale (AP)" },
    { mistake: "Strong consistency everywhere", why: "Feels safest", wrong: "High latency, cross-region coordination on every like and view, outages during partitions", fix: "Strong only where stale reads cause harm; eventual elsewhere" },
    { mistake: "Last-write-wins on counters and sets", why: "It is the default in many stores", wrong: "Concurrent updates are silently lost; clock skew decides the winner", fix: "Atomic increments on one leader, or CRDTs for multi-writer" },
    { mistake: "Ignoring caches as replicas", why: "Thinking only of the database", wrong: "A 1-hour cache TTL makes a permission change take an hour to apply", fix: "Treat caches, CDNs and search indexes as eventually consistent copies; invalidate on writes" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Write down a consistency level per feature, with the cost of a stale read, before choosing storage." },
    { tag: "Maintainability", text: "Implement read-your-own-writes and monotonic reads at the data-access layer, not scattered in handlers." },
    { tag: "Performance", text: "Use eventual consistency for high-volume, low-risk data (views, likes, feeds) to keep latency low." },
    { tag: "Security", text: "Permissions, password changes and token revocation need strong consistency or immediate cache invalidation." },
  ],
  interview: [
    { q: "Explain strong, eventual and weak consistency with examples.", a: "Strong: every read after a write sees it, like a bank balance in a relational database. Eventual: reads may be stale for a while but copies converge, like DNS, email or like counts. Weak: no guarantee a read ever sees a write, like dropped frames in a video call or an evicted memcached entry. Choose by the cost of a stale read." },
    { q: "Users complain they do not see their changes right after saving. What is happening and how do you fix it?", a: "Reads are served by asynchronous replicas or caches that lag the primary. Fix with read-your-own-writes: route that user's reads to the primary for a short window after a write, or record the write's log position and only read from replicas that have replayed it. Also invalidate caches on write." },
    { q: "What does R + W > N give you?", a: "With N replicas, writes acknowledged by W and reads querying R, the read set and write set must overlap, so at least one replica in every read has the newest acknowledged write. N = 3, W = 2, R = 2 is common because it tolerates one node down for both reads and writes." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which feature most needs strong consistency?",
      options: ["Number of likes on a post", "Search results for 'Python'", "Stock left for an item during checkout", "Recommended lessons"],
      answer: 2,
      explanation: "Overselling stock causes real harm; the others tolerate a short delay.",
    },
    {
      kind: "output",
      prompt: "N = 5 replicas, writes wait for W = 3. What is the smallest R that guarantees a read sees the latest write?",
      options: ["1", "2", "3", "5"],
      answer: 2,
      explanation: "R + W > N → R > 2, so R = 3.",
    },
    {
      kind: "bug",
      prompt: "An admin removes a user's access, but the user keeps using the admin page for an hour. Most likely cause?",
      options: ["The database lost the write", "Permissions are cached with a 1-hour TTL and not invalidated on change", "The CDN is down", "Strong consistency is too slow"],
      answer: 1,
      explanation: "Caches are copies too. Invalidate (or version) permission caches on every change.",
    },
  ],
  cheatSheet: [
    "Weak: best effort (video, games). Eventual: converges (DNS, likes). Strong: always latest (money, stock).",
    "CAP: during a partition choose CP (block) or AP (serve stale).",
    "Read-your-own-writes: primary for a window, or LSN-based routing.",
    "Monotonic reads: stick a user to one replica.",
    "Quorum: R + W > N; N=3, W=2, R=2 is the classic setting.",
    "LWW loses concurrent updates; CRDTs merge safely.",
    "Caches, CDNs and search indexes are eventually consistent copies.",
  ],
  homework: {
    basic: {
      title: "Choose a consistency level per feature",
      brief: [
        "For DevAtlas, decide strong, eventual (with an acceptable delay) or weak consistency for: quiz score submission, global leaderboard, lesson view counter, password change, AI tutor chat history, live 'who is online' indicator, course purchase. Justify each with the cost of a stale read.",
      ],
      criteria: ["Every feature classified", "Cost of a stale read stated", "At least one feature uses a session guarantee"],
      hints: ["Ask: what goes wrong if this read is 5 seconds old? 5 minutes old?"],
      solution: {
        text: ["The pattern: money, security and things a user just did need strong or session guarantees; aggregates and presence can lag."],
        code: {
          lang: "markdown",
          file: "docs/consistency-levels.md",
          code: `| Feature | Level | Acceptable staleness | Cost of a stale read |
|---|---|---|---|
| Quiz score submission | Strong write + read-your-own-writes | 0 for the learner | Learner thinks the answer was lost and resubmits |
| Global leaderboard | Eventual | 30 s | A rank is briefly off; nobody is harmed |
| Lesson view counter | Eventual (batched) | minutes | Analytics slightly behind |
| Password change | Strong; revoke sessions immediately | 0 | Attacker keeps access with the old password |
| AI tutor chat history | Read-your-own-writes + monotonic reads | 0 for the author | Messages "disappear" and reappear, very confusing |
| "Who is online" | Weak | seconds, may be wrong | A dot is the wrong colour |
| Course purchase | Strong (single leader, transaction) | 0 | Double charge or access without payment |`,
        },
      },
    },
    intermediate: {
      title: "Monotonic reads with sticky replicas",
      brief: [
        "Extend the simulation: two replicas with different lags (100 ms and 2,000 ms). A user who reads from a random replica on each request can see a new value and then an old one ('time goes backwards'). Show it happening, then fix it by hashing the user id to always pick the same replica, and show the fix.",
      ],
      criteria: ["A run where the value goes backwards", "Sticky routing by hash", "A run where it never goes backwards"],
      hints: ["Use a seeded random.Random so the run is reproducible.", "Hash with zlib.crc32, not Python's hash(), which is randomised per process."],
      solution: {
        text: ["Sticky routing gives monotonic reads for free: one replica only moves forward in time. If that replica fails, the user moves to another and might see an older state once; tracking the last-seen LSN in the session closes that gap too."],
        code: {
          lang: "python",
          file: "monotonic.py",
          code: `import random, zlib

log = [(-10_000, "v1"), (1000, "v2")]               # (commit time ms, value)

def read(lag_ms: int, now: int) -> str:
    return [v for t, v in log if t + lag_ms <= now][-1]

lags = [100, 2000]
rng = random.Random(3)

def history(pick):
    return [read(lags[pick(t)], t) for t in range(1200, 3200, 250)]

random_reads = history(lambda t: rng.randrange(2))
user_id = "learner-42"
sticky = zlib.crc32(user_id.encode()) % len(lags)
sticky_reads = history(lambda t: sticky)

def went_backwards(h):
    return any(a == "v2" and b == "v1" for a, b in zip(h, h[1:]))

print("random replica:", " ".join(random_reads), "| backwards:", went_backwards(random_reads))
print(f"sticky replica {sticky}:", " ".join(sticky_reads), "| backwards:", went_backwards(sticky_reads))`,
        },
        output: "random replica: v2 v2 v1 v1 v2 v2 v1 v1 | backwards: True\nsticky replica 0: v2 v2 v2 v2 v2 v2 v2 v2 | backwards: False",
      },
    },
    challenge: {
      title: "Quorum reads with read repair",
      brief: [
        "Implement a tiny key-value store with N = 3 replicas, each storing (version, value). put() writes to the first W reachable replicas with version = max seen + 1. get() reads R replicas, returns the highest version, and repairs stale replicas it contacted. Simulate one replica being down during a write, then coming back, and show read repair fixing it.",
      ],
      criteria: ["W and R configurable", "Highest version wins", "Stale replicas repaired on read", "Event log printed"],
      hints: ["Read repair is how Dynamo-style stores (Cassandra, Riak) heal replicas without a background job."],
      solution: {
        text: ["Read repair spreads the newest version to replicas that missed a write, as a side effect of normal reads. Real stores also run anti-entropy (Merkle-tree comparisons) for keys that are rarely read."],
        code: {
          lang: "python",
          file: "quorum_kv.py",
          code: `class Replica:
    def __init__(self, name):
        self.name, self.up, self.store = name, True, {}

class QuorumKV:
    def __init__(self, n=3, w=2, r=2):
        self.replicas = [Replica(f"r{i}") for i in range(n)]
        self.w, self.r = w, r

    def put(self, key, value):
        up = [x for x in self.replicas if x.up]
        if len(up) < self.w:
            raise RuntimeError("not enough replicas for write quorum")
        version = max((x.store.get(key, (0, None))[0] for x in up), default=0) + 1
        for x in up[: self.w]:
            x.store[key] = (version, value)
        print(f"put {key}={value} v{version} -> {[x.name for x in up[: self.w]]}")

    def get(self, key):
        asked = [x for x in self.replicas if x.up][: self.r]
        if len(asked) < self.r:
            raise RuntimeError("not enough replicas for read quorum")
        newest = max((x.store.get(key, (0, None)) for x in asked), key=lambda vv: vv[0])
        for x in asked:
            if x.store.get(key, (0, None))[0] < newest[0]:
                x.store[key] = newest
                print(f"  read repair: {x.name} updated to v{newest[0]}")
        return newest[1]

    def dump(self, key):
        return {x.name: x.store.get(key) for x in self.replicas}

kv = QuorumKV()
kv.put("plan", "free")
kv.replicas[0].up = False
print("r0 goes down")
kv.put("plan", "pro")
kv.replicas[0].up = True
print("r0 comes back:", kv.dump("plan"))
print("get ->", kv.get("plan"))
print("after repair:", kv.dump("plan"))`,
        },
        output: "put plan=free v1 -> ['r0', 'r1']\nr0 goes down\nput plan=pro v2 -> ['r1', 'r2']\nr0 comes back: {'r0': (1, 'free'), 'r1': (2, 'pro'), 'r2': (2, 'pro')}\n  read repair: r0 updated to v2\nget -> pro\nafter repair: {'r0': (2, 'pro'), 'r1': (2, 'pro'), 'r2': (2, 'pro')}",
      },
    },
    capstone: {
      title: "DevAtlas: implement read-your-own-writes",
      brief: [
        "If your capstone uses a read replica (or a cache), implement read-your-own-writes in the data-access layer: after a write, store the time (or LSN) in the user's session; for the next 5 seconds (or until the replica catches up) route that user's reads to the primary. Add a test that writes and immediately reads with an artificially lagging replica, and add a metric for how often reads are routed to the primary.",
      ],
      criteria: ["Routing in one place, not in every handler", "Test with a simulated lagging replica", "Metric for primary-routed reads"],
      hints: ["In ASP.NET Core, EF Core can use two DbContexts (primary, replica); in FastAPI, two engines with a dependency that picks one."],
      solution: {
        text: [
          "A small router object decides per request which connection to use, based on a timestamp in the session. Keeping it in one place means new endpoints get the guarantee automatically. The metric tells you whether the window is too long (too many primary reads) or the replica lag too high.",
        ],
        code: {
          lang: "python",
          file: "app/db_router.py",
          code: `import time
from dataclasses import dataclass, field

STICKY_SECONDS = 5.0


@dataclass
class Router:
    primary: object
    replica: object
    clock: callable = time.monotonic
    stats: dict = field(default_factory=lambda: {"primary_reads": 0, "replica_reads": 0})

    def for_write(self, session: dict):
        session["last_write"] = self.clock()
        return self.primary

    def for_read(self, session: dict):
        last = session.get("last_write")
        if last is not None and self.clock() - last < STICKY_SECONDS:
            self.stats["primary_reads"] += 1
            return self.primary
        self.stats["replica_reads"] += 1
        return self.replica


def test_reads_own_write_from_primary():
    now = [100.0]
    r = Router(primary="P", replica="R", clock=lambda: now[0])
    s: dict = {}
    assert r.for_read(s) == "R"
    r.for_write(s)
    now[0] += 1
    assert r.for_read(s) == "P"
    now[0] += 5
    assert r.for_read(s) == "R"
    assert r.stats == {"primary_reads": 1, "replica_reads": 2}


if __name__ == "__main__":
    test_reads_own_write_from_primary()
    print("ok")`,
        },
        output: "ok",
        pitfalls: ["Storing last_write in server memory: with several API instances it must live in the session cookie or Redis.", "Forgetting background jobs: a job that writes then reads needs the same rule."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: consistency patterns and CAP (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#consistency-patterns" },
    { label: "Werner Vogels: Eventually Consistent", url: "https://www.allthingsdistributed.com/2008/12/eventually_consistent.html" },
    { label: "Jepsen: consistency models", url: "https://jepsen.io/consistency" },
    { label: "Azure Cosmos DB consistency levels", url: "https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels" },
  ],
  nextPreview: "Next: DNS and CDNs. How a name becomes an IP address, why TTLs bite during migrations, and how push and pull CDNs put your content next to your users.",
};
