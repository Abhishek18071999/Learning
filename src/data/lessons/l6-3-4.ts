import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.4",
  title: "Availability: failover, replication and the nines",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.3.3 Performance vs scalability, latency vs throughput", "5.4.1 Migrations, backups, replication and sharding"],
  summary: "Measure availability in nines and turn it into minutes of allowed downtime, compute the availability of components in series and in parallel, and design failover (active-passive and active-active) with replication, health checks, fencing and error budgets.",
  terms: [
    { term: "Availability", def: "The fraction of time (or of requests) a service works correctly, e.g. 99.9%." },
    { term: "The nines", def: "Shorthand for availability: three nines = 99.9% (about 8.8 hours of downtime a year), four nines = 99.99% (about 53 minutes)." },
    { term: "Single point of failure (SPOF)", def: "A component whose failure takes the whole system down because nothing can take over." },
    { term: "Failover", def: "Moving traffic from a failed component to a healthy standby, automatically or by hand." },
    { term: "Active-passive", def: "One node serves traffic; a standby waits and takes over if the active one fails." },
    { term: "Active-active", def: "All nodes serve traffic at the same time; if one fails, the others absorb its share." },
    { term: "MTBF / MTTR", def: "Mean time between failures and mean time to recovery. Availability ≈ MTBF / (MTBF + MTTR)." },
    { term: "Split brain", def: "Two nodes both believe they are the primary and accept writes, so their data diverges." },
    { term: "Error budget", def: "The downtime your SLO allows (100% − SLO). You can 'spend' it on risky releases; when it is gone, you slow down." },
  ],
  problem: [
    "DevAtlas promises schools '99.9% availability'. The API runs on three servers, so the team feels safe. But each request also passes through a load balancer, the API, Redis, PostgreSQL and an auth provider, each with its own failures. One night the single PostgreSQL server's disk fills up, the whole platform is down for 2 hours, and the month's promise is broken in one incident.",
    "Availability is not a feeling; it is arithmetic over every component on the request path. This lesson shows how to calculate it, where the single points of failure hide, and how failover and replication remove them, with the trade-offs each brings.",
  ],
  concept: {
    analogy: [
      "A hospital never relies on one generator. It has a **backup generator** that starts automatically when mains power fails (**active-passive**). Its emergency department has **several doctors on shift at once**; if one goes home sick, the others take the patients (**active-active**). And the hospital runs **monthly generator tests**, because a backup that has never been started is not a backup.",
    ],
    precise: [
      "**Nines to minutes.** 99.9% allows about 43.8 minutes of downtime per month; 99.99% about 4.4 minutes; 99.999% about 26 seconds. Each extra nine costs much more: more redundancy, automation and on-call discipline.",
      "**In series** (a request needs A *and* B): availability multiplies, A_total = A₁ × A₂. Five components at 99.9% give about 99.5%. **In parallel** (A *or* B can serve): A_total = 1 − (1 − A₁) × (1 − A₂). Two components at 99% give 99.99%. Redundancy only helps if failures are independent (different machines, racks, zones).",
      "**Active-passive failover.** A heartbeat between active and standby; when heartbeats stop, the standby takes over the IP address or the DNS name and resumes service. A **hot** standby is already running and in sync; a **cold** standby must start first, so downtime is longer. Writes not yet replicated to the standby can be lost.",
      "**Active-active.** All nodes serve; a load balancer or DNS spreads traffic. Easy for stateless app servers. For databases it means multi-primary writes and conflict resolution, which is much harder; most teams use one writer with failover instead.",
      "**Replication is the data side of failover.** Synchronous replication waits for the replica before confirming a write (no data loss, more latency). Asynchronous replication confirms first (fast, but a failover can lose the last seconds of writes). Lesson 6.3.8 goes deeper.",
      "**MTTR is often the cheaper lever.** Availability ≈ MTBF / (MTBF + MTTR). Halving recovery time (good alerts, automated failover, runbooks, quick rollbacks) improves availability as much as halving failures.",
    ],
  },
  underTheHood: {
    text: [
      "**Detecting failure is the hard part.** A missed heartbeat might mean the node is dead, or just slow, or that the network between monitor and node is broken. If the monitor promotes the standby while the old primary is still alive and reachable by some clients, you get **split brain**: two primaries accepting different writes. Real systems use a **quorum** (a majority of independent observers must agree the node is down) and **fencing** (the old primary is cut off from storage or given a stale token so its writes are rejected).",
      "**Failover takes time.** Detection (e.g. 3 missed heartbeats × 5 s = 15 s) + promotion + clients reconnecting + DNS TTLs or connection pools refreshing. Managed databases typically fail over in tens of seconds to a couple of minutes. During that window requests fail, so clients need retries with backoff.",
      "**Correlated failures defeat redundancy.** Two replicas in the same rack, the same availability zone, the same bad config push, or the same expired certificate fail together. Spread replicas across zones, roll out changes gradually, and remember that the parallel formula assumes independence.",
    ],
    diagram: {
      title: "Active-passive database failover",
      nodes: [
        { label: "App servers", sub: "connect via DNS name" },
        { label: "Primary DB", sub: "accepts writes" },
        { label: "Standby DB", sub: "replicates, read-only" },
        { label: "Monitor (quorum)", sub: "promotes + fences" },
      ],
      edges: ["writes", "WAL stream", "heartbeats"],
      caption: "When the quorum agrees the primary is gone, it fences the old primary, promotes the standby and points the DNS name at it.",
    },
  },
  handsOn: [
    {
      title: "Turn nines into allowed downtime",
      code: {
        lang: "python",
        file: "nines.py",
        code: `PERIODS = {"year": 365.25 * 86400, "month": 365.25 * 86400 / 12, "week": 7 * 86400, "day": 86400}

def fmt(seconds: float) -> str:
    h, rem = divmod(round(seconds), 3600)
    m, s = divmod(rem, 60)
    return f"{h}h {m:02d}m {s:02d}s"

print(f"{'SLO':>9}  " + "  ".join(f"{p:>12}" for p in PERIODS))
for slo in (0.99, 0.999, 0.9995, 0.9999, 0.99999):
    row = "  ".join(f"{fmt((1 - slo) * secs):>12}" for secs in PERIODS.values())
    print(f"{slo:9.3%}  {row}")`,
      },
      output: "      SLO          year         month          week           day\n  99.000%   87h 39m 36s    7h 18m 18s    1h 40m 48s    0h 14m 24s\n  99.900%    8h 45m 58s    0h 43m 50s    0h 10m 05s    0h 01m 26s\n  99.950%    4h 22m 59s    0h 21m 55s    0h 05m 02s    0h 00m 43s\n  99.990%    0h 52m 36s    0h 04m 23s    0h 01m 00s    0h 00m 09s\n  99.999%    0h 05m 16s    0h 00m 26s    0h 00m 06s    0h 00m 01s",
      notes: ["At four nines, one 5-minute database failover per month already breaks the SLO. That is why four nines needs automated failover and why most products choose three nines or 99.95%."],
    },
    {
      title: "Availability in series and in parallel",
      code: {
        lang: "python",
        file: "availability.py",
        code: `from math import prod

def series(*parts: float) -> float:
    return prod(parts)

def parallel(*parts: float) -> float:
    return 1 - prod(1 - p for p in parts)

lb, api_node, redis, db, auth = 0.9999, 0.995, 0.999, 0.9995, 0.9995

one_api = series(lb, api_node, redis, db, auth)
three_api = series(lb, parallel(api_node, api_node, api_node), redis, db, auth)
db_with_standby = parallel(db, db)
best = series(lb, parallel(api_node, api_node, api_node), redis, db_with_standby, auth)

for name, a in [("1 API node", one_api), ("3 API nodes", three_api), ("3 API + DB standby", best)]:
    print(f"{name:20} {a:.4%}  -> {(1 - a) * 365.25 * 24:5.1f} h down per year")`,
      },
      output: "1 API node           99.2912%  ->  62.1 h down per year\n3 API nodes          99.7901%  ->  18.4 h down per year\n3 API + DB standby   99.8400%  ->  14.0 h down per year",
      notes: [
        "Three API nodes help a lot because one node was the weakest link. After that, the remaining series components (Redis at 99.9%, auth at 99.95%) dominate; adding a fourth API node would change almost nothing.",
        "The DB standby result assumes instant, independent failover. Real failover takes tens of seconds and failures can be correlated, so treat it as an upper bound.",
      ],
    },
    {
      title: "Active-passive at the load balancer with NGINX",
      code: {
        lang: "text",
        file: "nginx.conf",
        code: `upstream api {
    server api-blue:8080  max_fails=2 fail_timeout=5s;
    server api-green:8080 backup;          # passive: used only when the active one is marked down
}

server {
    listen 80;
    location / {
        proxy_pass http://api;
        proxy_next_upstream error timeout http_502 http_503;   # retry on the backup (idempotent requests)
        proxy_connect_timeout 1s;
        proxy_read_timeout 5s;
    }
    location = /healthz { return 200 "ok\\n"; }   # health of the proxy itself
}`,
      },
      notes: [
        "Open-source NGINX uses passive health checks (it marks a server down after real requests fail). Cloud load balancers and NGINX Plus run active checks against an endpoint such as `/healthz` that should verify the app's own dependencies are reachable.",
        "The load balancer is now a SPOF itself. Managed load balancers are redundant across zones; self-hosted ones use a floating IP with keepalived (VRRP) for active-passive.",
      ],
    },
    {
      title: "MTBF vs MTTR: which lever is cheaper?",
      code: {
        lang: "python",
        file: "mttr.py",
        code: `def availability(mtbf_h: float, mttr_h: float) -> float:
    return mtbf_h / (mtbf_h + mttr_h)

base = availability(mtbf_h=720, mttr_h=2)            # one incident a month, 2 h to recover
fewer_failures = availability(mtbf_h=1440, mttr_h=2)  # half as many incidents
faster_recovery = availability(mtbf_h=720, mttr_h=0.25)  # automated failover: 15 min

for name, a in [("baseline", base), ("2x fewer failures", fewer_failures), ("15-min recovery", faster_recovery)]:
    print(f"{name:18} {a:.4%}")`,
      },
      output: "baseline           99.7230%\n2x fewer failures  99.8613%\n15-min recovery    99.9653%",
      notes: ["Cutting recovery from 2 hours to 15 minutes beats halving failures. Alerts that fire in one minute, runbooks, automatic failover and one-click rollback are availability features."],
    },
  ],
  companies: [
    "**Multi-AZ by default.** Cloud teams run app servers in at least two availability zones behind a managed load balancer, and use managed databases with a synchronous standby in another zone (e.g. Amazon RDS Multi-AZ, Azure SQL zone-redundant). Failover is automatic and typically takes from tens of seconds to a couple of minutes.",
    "**Error budgets.** Google's SRE practice turns the SLO into a budget: with 99.9%, about 43 minutes a month can be 'spent'. While budget remains, teams ship fast; when it runs out, they freeze risky launches and fix reliability.",
    "**Game days and chaos engineering.** Netflix's Chaos Monkey randomly terminates instances in production so that failover is exercised all the time. Many teams run planned 'game days' where they kill a database primary on purpose and time the recovery.",
  ],
  mistakes: [
    { mistake: "Counting only the app servers", why: "They are the visible part", wrong: "A single database, cache, load balancer or DNS provider silently caps availability", fix: "List every component on the request path and multiply" },
    { mistake: "Never testing failover", why: "It is scary to break production on purpose", wrong: "The standby is misconfigured, out of date, or the runbook is wrong when it matters", fix: "Regular failover drills; measure recovery time" },
    { mistake: "Replicas in the same failure domain", why: "Default placement or cost", wrong: "One rack, zone or power failure takes out primary and standby together", fix: "Spread replicas across zones; avoid shared dependencies" },
    { mistake: "Failover without fencing", why: "Assuming a silent node is dead", wrong: "Split brain: two primaries accept conflicting writes; data must be reconciled by hand", fix: "Quorum-based detection plus fencing (STONITH, revoking access, fencing tokens)" },
    { mistake: "Promising more nines than dependencies allow", why: "Marketing numbers", wrong: "An SLO of 99.99% on top of a 99.9% auth provider is impossible to meet", fix: "Compute the ceiling from dependencies; add fallbacks or lower the SLO" },
    { mistake: "No retries in clients", why: "Assuming failover is invisible", wrong: "Every failover becomes a burst of user-visible errors", fix: "Retries with exponential backoff and jitter for idempotent operations" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Remove single points of failure on the critical path: at least two of everything, in different zones." },
    { tag: "Reliability", text: "Automate failover, protect it with quorum and fencing, and drill it regularly." },
    { tag: "Reliability", text: "Invest in MTTR: fast alerts, runbooks, one-click rollback, automatic restarts." },
    { tag: "Cost", text: "Pick the SLO the business needs; each extra nine multiplies cost. Use error budgets to balance speed and reliability." },
  ],
  interview: [
    { q: "What is the availability of three services in series, each 99.9%? And of two in parallel at 99%?", a: "In series: 0.999³ ≈ 99.7%, so about 26 hours of downtime a year. In parallel: 1 − 0.01² = 99.99%, assuming failures are independent. Series dependencies reduce availability; redundancy increases it." },
    { q: "Compare active-passive and active-active.", a: "Active-passive: one node serves and a standby takes over on failure. It is simpler, avoids write conflicts, but wastes the standby's capacity and has a failover gap. Active-active: all nodes serve, so capacity is used and losing one node just shifts load; easy for stateless services, but for databases it needs multi-writer conflict resolution, so most systems keep a single writer with failover." },
    { q: "How do you prevent split brain during failover?", a: "Do not trust a single observer: require a quorum (majority) to declare the primary dead, then fence the old primary before promoting the new one, for example by revoking its storage or network access, or by using fencing tokens so storage rejects writes from an older leader term." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "Roughly how much downtime per month does a 99.9% SLO allow?",
      options: ["About 4 minutes", "About 43 minutes", "About 7 hours", "About 1 day"],
      answer: 1,
      explanation: "0.1% of a 30.4-day month ≈ 43.8 minutes.",
    },
    {
      kind: "output",
      prompt: "A request passes through four components in series, each 99.9% available. What is the end-to-end availability?",
      options: ["99.9%", "About 99.6%", "About 99.99%", "96%"],
      answer: 1,
      explanation: "0.999⁴ ≈ 0.996. Series components multiply, so availability goes down.",
    },
    {
      kind: "bug",
      prompt: "After a network blip, both database nodes accept writes for 10 minutes and the data diverges. What was missing?",
      options: ["A bigger disk", "Quorum-based failure detection and fencing of the old primary", "More read replicas", "A CDN"],
      answer: 1,
      explanation: "That is split brain. Fencing makes sure only one node can write.",
    },
  ],
  cheatSheet: [
    "99.9% ≈ 43.8 min/month; 99.99% ≈ 4.4 min/month; 99.999% ≈ 26 s/month.",
    "Series: multiply. Parallel: 1 − Π(1 − A).",
    "Active-passive: simple, failover gap. Active-active: uses all capacity, conflicts for writes.",
    "Hot standby = running and in sync; cold = must start first.",
    "Async replication can lose recent writes on failover; sync costs latency.",
    "Availability ≈ MTBF / (MTBF + MTTR); MTTR is often cheaper to fix.",
    "Quorum + fencing prevent split brain.",
    "Different zones; drill failover; budget errors.",
  ],
  homework: {
    basic: {
      title: "Compute DevAtlas's availability ceiling",
      brief: [
        "The DevAtlas request path: CDN 99.99%, load balancer 99.99%, three API nodes at 99.5% each (in parallel), Redis 99.9%, PostgreSQL primary 99.95% with a hot standby (treat as two in parallel), auth provider 99.95%. Compute end-to-end availability and downtime per month. Then show the effect of making Redis optional (if Redis is down, the API reads from PostgreSQL, so Redis leaves the series path).",
      ],
      criteria: ["series() and parallel() helpers", "Downtime in minutes per month", "Before/after for the Redis fallback", "One sentence naming the next weakest link"],
      hints: ["A dependency with a working fallback is no longer in series."],
      solution: {
        text: [
          "With Redis on the critical path, the ceiling is about 99.83%. Making Redis optional (graceful degradation) lifts it to about 99.93%, gaining about 44 minutes a month. The next weakest link is the auth provider at 99.95%: cache validated tokens or verify JWTs locally so a short auth outage does not stop logged-in learners.",
        ],
        code: {
          lang: "python",
          file: "devatlas_availability.py",
          code: `from math import prod

MINUTES_PER_MONTH = 365.25 * 24 * 60 / 12

def series(*p): return prod(p)
def parallel(*p): return 1 - prod(1 - x for x in p)

cdn, lb, api, redis, db, auth = 0.9999, 0.9999, 0.995, 0.999, 0.9995, 0.9995
api_tier = parallel(api, api, api)
db_tier = parallel(db, db)

with_redis = series(cdn, lb, api_tier, redis, db_tier, auth)
redis_optional = series(cdn, lb, api_tier, db_tier, auth)

for name, a in [("Redis on critical path", with_redis), ("Redis optional (fallback)", redis_optional)]:
    print(f"{name:26} {a:.4%}  {(1 - a) * MINUTES_PER_MONTH:5.1f} min down/month")
print(f"gain: {(redis_optional - with_redis) * MINUTES_PER_MONTH:.1f} min/month")`,
        },
        output: "Redis on critical path     99.8300%   74.5 min down/month\nRedis optional (fallback)  99.9300%   30.7 min down/month\ngain: 43.8 min/month",
        pitfalls: ["Fallbacks must be load-tested: if every request falls back to PostgreSQL at once, the database may collapse (6.3.10 covers this)."],
      },
    },
    intermediate: {
      title: "Track an error budget",
      brief: [
        "DevAtlas has a monthly SLO of 99.9% of minutes available (30-day month). This month's incidents: 12 min (bad deploy), 3 min (DB failover), 18 min (auth provider outage), 9 min (expired certificate). Write a script that prints the budget, the time spent, what remains, and a release policy decision: 'ship normally' above 25% remaining, 'only low-risk changes' between 0 and 25%, 'freeze' below 0.",
      ],
      criteria: ["Budget derived from the SLO", "Per-incident breakdown", "Decision rule implemented, not hand-written"],
      hints: ["30 × 24 × 60 × 0.001 = 43.2 minutes."],
      solution: {
        text: ["42 of 43.2 minutes are spent, so only 3% of the budget remains and the policy says low-risk changes only. The breakdown also shows where to invest: two of four incidents (deploy and certificate) were self-inflicted and preventable with canary releases and certificate-expiry alerts."],
        code: {
          lang: "python",
          file: "error_budget.py",
          code: `SLO = 0.999
budget_min = 30 * 24 * 60 * (1 - SLO)

incidents = {
    "bad deploy": 12,
    "DB failover": 3,
    "auth provider outage": 18,
    "expired certificate": 9,
}

spent = sum(incidents.values())
remaining = budget_min - spent
share = remaining / budget_min

print(f"budget {budget_min:.1f} min, spent {spent} min, remaining {remaining:.1f} min ({share:.0%})")
for name, minutes in sorted(incidents.items(), key=lambda kv: -kv[1]):
    print(f"  {name:22} {minutes:3d} min  {minutes / budget_min:4.0%} of budget")

if share > 0.25:
    decision = "ship normally"
elif share >= 0:
    decision = "only low-risk changes"
else:
    decision = "freeze: reliability work only"
print("policy:", decision)`,
        },
        output: "budget 43.2 min, spent 42 min, remaining 1.2 min (3%)\n  auth provider outage    18 min   42% of budget\n  bad deploy              12 min   28% of budget\n  expired certificate      9 min   21% of budget\n  DB failover              3 min    7% of budget\npolicy: only low-risk changes",
      },
    },
    challenge: {
      title: "Fencing tokens: make split brain harmless",
      brief: [
        "Simulate a leader lease with fencing tokens. A lock service hands out leases with increasing tokens. Leader A gets token 1, pauses (a long GC pause), its lease expires, B gets token 2 and writes. Then A wakes up and tries to write with token 1. Implement a storage class that rejects writes carrying a token lower than the highest it has seen, and print the sequence of events.",
      ],
      criteria: ["Monotonic tokens issued by the lock service", "Storage rejects stale tokens", "Event log shows A's late write rejected"],
      hints: ["The storage, not the old leader, must enforce the rule: the old leader does not know it is stale."],
      solution: {
        text: [
          "The key idea (popularised by Martin Kleppmann) is that a lease alone is not safe, because a paused process cannot know its lease expired. The resource being protected must check a monotonically increasing token. ZooKeeper's zxid, etcd's revision and the term number in Raft can serve as such tokens.",
        ],
        code: {
          lang: "python",
          file: "fencing.py",
          code: `class LockService:
    def __init__(self) -> None:
        self.token = 0
        self.holder: str | None = None

    def acquire(self, who: str) -> int:
        self.token += 1
        self.holder = who
        print(f"lock: lease granted to {who} with token {self.token}")
        return self.token


class Storage:
    def __init__(self) -> None:
        self.highest_token = 0
        self.data: dict[str, str] = {}

    def write(self, who: str, token: int, key: str, value: str) -> bool:
        if token < self.highest_token:
            print(f"storage: REJECT {who} token {token} < {self.highest_token}")
            return False
        self.highest_token = token
        self.data[key] = value
        print(f"storage: {who} wrote {key}={value} (token {token})")
        return True


lock, db = LockService(), Storage()
token_a = lock.acquire("A")
db.write("A", token_a, "plan", "v1")
print("A: long GC pause... lease expires")
token_b = lock.acquire("B")
db.write("B", token_b, "plan", "v2")
print("A: wakes up, still thinks it is leader")
db.write("A", token_a, "plan", "v1-stale")
print("final:", db.data)`,
        },
        output: "lock: lease granted to A with token 1\nstorage: A wrote plan=v1 (token 1)\nA: long GC pause... lease expires\nlock: lease granted to B with token 2\nstorage: B wrote plan=v2 (token 2)\nA: wakes up, still thinks it is leader\nstorage: REJECT A token 1 < 2\nfinal: {'plan': 'v2'}",
        pitfalls: ["Using wall-clock timestamps as tokens: clocks drift and jump; use a counter from the coordination service."],
      },
    },
    capstone: {
      title: "DevAtlas: availability plan and failover runbook",
      brief: [
        "Write docs/availability.md for your capstone: the SLO and why, every component on the request path with its availability and whether it is in series or has a fallback, the computed ceiling, the single points of failure and how you remove them, and a step-by-step runbook for a database failover including how you verify it worked.",
      ],
      criteria: ["Ceiling computed from the dependency table", "Every SPOF has a mitigation or an accepted risk", "Runbook has detection, action, verification and communication steps"],
      hints: ["Write the runbook so someone woken at 3 a.m. can follow it."],
      solution: {
        text: ["The plan is useful because it is concrete: it names components, numbers and owners, and the runbook has commands and checks rather than intentions."],
        code: {
          lang: "markdown",
          file: "docs/availability.md",
          code: `# DevAtlas availability plan

## SLO
99.9% of minutes per month with the API answering /healthz and p99 < 1 s.
Why not 99.99%: schools tolerate a few minutes a month; four nines would need
multi-region active-active (cost x3) and our auth provider only offers 99.95%.

## Dependencies on the request path
| Component | Availability | Path | Mitigation |
|---|---|---|---|
| CDN | 99.99% | series | managed, multi-PoP |
| Load balancer | 99.99% | series | managed, 2 AZs |
| API (3 pods, 2 AZs) | 99.5% each | parallel | HPA, PodDisruptionBudget |
| Redis | 99.9% | **fallback** to PostgreSQL | timeouts 50 ms, circuit breaker |
| PostgreSQL | 99.95% + standby | parallel (failover) | Multi-AZ, automatic failover |
| Auth (JWKS) | 99.95% | **fallback**: cached keys 24 h | verify JWTs locally |
Ceiling ≈ 99.98% with both fallbacks working (computed with scripts/devatlas_availability.py).

## SPOFs and decisions
- Single region: accepted risk; restore in a second region from backups (RTO 4 h, RPO 5 min).
- Migrations that lock tables: must follow the zero-downtime checklist (5.4.1).

## Runbook: database primary failure
1. **Detect**: alert "DB primary unreachable" (3 failed checks, 30 s) or app 5xx > 5%.
2. **Confirm**: cloud console shows failover in progress or completed; do not promote by hand while automatic failover is running.
3. **If automatic failover did not start within 2 min**: trigger it from the console/CLI (forced failover) and note the time.
4. **Verify**: \`SELECT pg_is_in_recovery();\` returns false on the new primary; app error rate back under 0.1%; write a test quiz attempt.
5. **Pools**: if errors persist, restart API pods in a rolling way so pools reconnect to the new primary.
6. **Communicate**: status page update at detection, at mitigation and at resolution.
7. **After**: rebuild a standby, post-incident review within 3 working days, record minutes spent from the error budget.`,
        },
        pitfalls: ["A runbook nobody has followed is a guess. Run it in staging and time each step."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: availability patterns and availability in numbers (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#availability-patterns" },
    { label: "Google SRE Book: Embracing Risk (error budgets)", url: "https://sre.google/sre-book/embracing-risk/" },
    { label: "How to do distributed locking (Martin Kleppmann, fencing tokens)", url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html" },
    { label: "AWS Well-Architected: Reliability pillar", url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html" },
  ],
  nextPreview: "Next: consistency patterns. Strong, eventual and weak consistency, what CAP really forces you to choose, and how to stop users seeing stale data right after they change something.",
};
