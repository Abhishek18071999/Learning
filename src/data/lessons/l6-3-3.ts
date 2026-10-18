import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.3",
  title: "Performance vs scalability, latency vs throughput",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.3.2 The design method: requirements, estimates and numbers to know"],
  summary: "Tell a performance problem (slow for one user) from a scalability problem (fast for one, slow under load). Understand latency vs throughput, why latency explodes near full utilisation, Amdahl's law and the Universal Scalability Law, and find bottlenecks with the USE method.",
  terms: [
    { term: "Performance problem", def: "The system is slow even for a single user. Fix the code, query or algorithm." },
    { term: "Scalability problem", def: "The system is fast for one user but slows down or fails as load grows. Fix contention, shared resources or architecture." },
    { term: "Latency", def: "The time to complete one operation, e.g. 120 ms for one request. Measured in percentiles." },
    { term: "Throughput", def: "How many operations complete per unit of time, e.g. 2,000 requests per second." },
    { term: "Utilisation", def: "The fraction of time a resource is busy. At 100% there is no spare capacity and requests queue." },
    { term: "Saturation", def: "Work that is waiting because a resource is fully busy (queue length, run-queue, pending connections)." },
    { term: "Amdahl's law", def: "The speedup from adding workers is limited by the part of the work that cannot run in parallel." },
    { term: "Contention", def: "Workers waiting for the same shared thing: a lock, a database row, a connection pool." },
  ],
  problem: [
    "DevAtlas's quiz submission endpoint takes 40 ms in development. In production it is fine all week, but every Friday before the homework deadline p99 latency jumps to 4 seconds and some requests time out. The team adds two more API servers. Nothing improves; the next Friday is worse.",
    "They treated a scalability problem as a capacity problem without finding the bottleneck. The real cause was a single 'quiz_stats' row that every submission updated, so all requests queued on one row lock. More servers just meant more requests waiting on the same lock. This lesson teaches how to tell these situations apart and how to measure instead of guess.",
  ],
  concept: {
    analogy: [
      "A coffee shop. **Performance** is how long one barista takes to make one coffee. If a latte takes 10 minutes even when the shop is empty, you have a performance problem: train the barista or buy a better machine. **Scalability** is what happens when 50 people walk in. If there is only one espresso machine shared by five baristas, hiring a sixth barista does not help; they all wait for the machine. That machine is the **bottleneck**, and the line in front of it is **saturation**.",
      "**Latency** is how long you wait for your coffee. **Throughput** is how many coffees the shop sells per hour. A shop can have great throughput and terrible latency (a huge line that moves steadily), so you always need to look at both.",
    ],
    precise: [
      "**Performance vs scalability.** A service is scalable if adding resources increases throughput roughly in proportion. Test with one user first (performance), then increase load step by step (scalability). If latency is high at one user, profile the code. If latency is fine at low load and grows with load, look for the saturated resource.",
      "**Latency vs throughput.** Aim for the maximum throughput at an acceptable latency, usually expressed as an SLO like 'p99 under 300 ms at 2,000 requests per second'. Throughput without a latency limit is meaningless, because any system can queue more work.",
      "**Why latency explodes near 100%.** In a simple queue, average time in the system is about S / (1 − U), where S is the service time and U the utilisation. At 50% busy, requests take 2× the service time; at 90%, 10×; at 99%, 100×. Tail latency (p99) grows even faster. That is why healthy systems run with headroom.",
      "**Limits to scaling.** Amdahl's law: if 10% of the work is serial (a global lock, a single writer), the maximum speedup is 10× no matter how many servers you add. The Universal Scalability Law adds a second cost, coherency (servers coordinating with each other), which can make throughput go **down** after a point.",
      "**Finding the bottleneck: the USE method.** For every resource (CPU, memory, disk, network, connection pools, locks, thread pools) check **U**tilisation, **S**aturation and **E**rrors. The resource with high utilisation and a growing queue is your bottleneck.",
    ],
  },
  underTheHood: {
    text: [
      "**Queueing in one picture.** Requests arrive randomly, not evenly. Even at 70% average utilisation, short bursts arrive faster than the servers can handle them, a queue forms, and the unlucky requests at the back of the burst see high latency. As utilisation rises, bursts overlap and queues stop draining, so latency grows non-linearly.",
      "**Contention and coherency.** Contention is waiting for a shared resource (a row lock, a mutex, a pool). Coherency is the cost of keeping copies in agreement (cache invalidation messages, distributed locks, cross-node transactions). Contention flattens the throughput curve; coherency bends it downward. Removing shared state is therefore the most powerful scalability fix.",
      "**Latency adds up in sequence; throughput is set by the slowest stage.** A request that goes through gateway → API → database has latency equal to the sum of the stages, but the system's maximum throughput is the throughput of the slowest stage. Speeding up any other stage does not raise the ceiling.",
    ],
    diagram: {
      title: "Throughput is capped by the slowest stage",
      nodes: [
        { label: "Load balancer", sub: "50,000 rps capacity" },
        { label: "API servers ×4", sub: "8,000 rps capacity" },
        { label: "DB row lock", sub: "~900 rps: the bottleneck" },
        { label: "Disk", sub: "20,000 IOPS" },
      ],
      edges: ["", "", ""],
      caption: "Adding API servers raises a capacity that is not the limit. Removing the hot row lock raises the real ceiling.",
    },
  },
  handsOn: [
    {
      title: "See latency explode near full utilisation (simulation)",
      text: ["This simulates 4 workers that each need 20 ms per request (capacity 200 requests per second) and increases the load. The random seed is fixed, so you get the same numbers."],
      code: {
        lang: "python",
        file: "queue_sim.py",
        code: `import heapq, random

def simulate(arrival_rps: float, servers: int, service_ms: float, n: int = 200_000, seed: int = 7):
    rng = random.Random(seed)
    free_at = [0.0] * servers                 # when each worker becomes free (ms)
    t, latencies = 0.0, []
    for _ in range(n):
        t += rng.expovariate(arrival_rps / 1000)          # next arrival (ms)
        start = max(t, heapq.heappop(free_at))            # wait for the first free worker
        done = start + rng.expovariate(1 / service_ms)
        heapq.heappush(free_at, done)
        latencies.append(done - t)
    latencies.sort()
    pct = lambda p: latencies[int(p * n) - 1]
    return pct(0.50), pct(0.99), n / (t / 1000)

print("load   rps   p50 ms   p99 ms")
for load in (0.3, 0.5, 0.7, 0.8, 0.9, 0.95):
    rps = load * 4 * 1000 / 20                          # 4 workers, 20 ms each = 200 rps capacity
    p50, p99, thr = simulate(rps, servers=4, service_ms=20)
    print(f"{load:4.0%}  {thr:5.0f}  {p50:7.1f}  {p99:7.1f}")`,
      },
      output: "load   rps   p50 ms   p99 ms\n 30%     60     14.1     92.2\n 50%    100     15.6     95.3\n 70%    140     20.5    110.0\n 80%    160     26.8    136.8\n 90%    180     44.2    327.7\n 95%    190     75.3    775.9",
      notes: [
        "Going from 80% to 95% load adds only 19% more throughput but multiplies p99 by more than 5. That is the 'knee' of the curve; healthy production systems stay to the left of it.",
        "Service times here are random (exponential), which is a pessimistic but common model. Real systems differ in detail, not in shape.",
      ],
    },
    {
      title: "Amdahl's law: why more servers stop helping",
      code: {
        lang: "python",
        file: "amdahl.py",
        code: `def speedup(parallel_fraction: float, workers: int) -> float:
    serial = 1 - parallel_fraction
    return 1 / (serial + parallel_fraction / workers)

print("workers   95% parallel   90% parallel   50% parallel")
for n in (1, 2, 4, 8, 16, 64, 1024):
    print(f"{n:7d}   {speedup(0.95, n):12.1f}   {speedup(0.90, n):12.1f}   {speedup(0.50, n):12.1f}")`,
      },
      output: "workers   95% parallel   90% parallel   50% parallel\n      1            1.0            1.0            1.0\n      2            1.9            1.8            1.3\n      4            3.5            3.1            1.6\n      8            5.9            4.7            1.8\n     16            9.1            6.4            1.9\n     64           15.4            8.8            2.0\n   1024           19.6            9.9            2.0",
      notes: ["If every request must pass through one serial step (a global lock, one leader, one hot row), that step decides the ceiling. Find and remove serial steps before buying hardware."],
    },
    {
      title: "Reproduce the Friday bug: a hot row lock",
      text: ["Every submission does `UPDATE quiz_stats SET submissions = submissions + 1 WHERE quiz_id = 42`. All transactions on quiz 42 serialise on that row. Two fixes that remove the contention:"],
      code: {
        lang: "sql",
        file: "hot_row_fix.sql",
        code: `-- Fix 1: append-only rows, aggregate on read (or in a periodic job)
CREATE TABLE quiz_submission_events (
    quiz_id    bigint      NOT NULL,
    learner_id bigint      NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- writes never touch the same row, so they never wait on each other
INSERT INTO quiz_submission_events (quiz_id, learner_id) VALUES (42, 1001);

-- Fix 2: split the counter into N slots and sum them when reading
CREATE TABLE quiz_stats_slots (
    quiz_id     bigint NOT NULL,
    slot        int    NOT NULL,          -- 0..15
    submissions bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (quiz_id, slot)
);
-- each write picks a random slot: 16x less contention
UPDATE quiz_stats_slots SET submissions = submissions + 1
WHERE quiz_id = 42 AND slot = floor(random() * 16)::int;
SELECT sum(submissions) FROM quiz_stats_slots WHERE quiz_id = 42;`,
      },
      notes: ["How you would have found it: `pg_stat_activity` showing many sessions with `wait_event_type = 'Lock'`, and the slow query log showing the same UPDATE. That is the USE method applied to a lock: utilisation 100%, saturation = the waiting sessions."],
    },
    {
      title: "The 60-second USE checklist on a Linux server",
      code: {
        lang: "bash",
        file: "use-checklist.sh",
        code: `uptime                 # load averages: is work queuing for CPU? (saturation)
vmstat 1 5             # r = run-queue (CPU saturation), si/so = swapping (memory saturation)
mpstat -P ALL 1 3      # per-core utilisation: one core at 100% = single-threaded bottleneck
iostat -xz 1 3         # %util and aqu-sz per disk: disk utilisation and queue
free -m                # memory used vs available
sar -n DEV 1 3         # network throughput per interface vs link speed
ss -s                  # socket summary: many connections in a backlog = saturation
dmesg -T | tail        # errors: OOM killer, disk or network errors`,
      },
      notes: ["These tools come from the sysstat and procps packages on most distributions. The same thinking applies to application resources: check pool utilisation, waiting requests and errors for DB connection pools, thread pools and queues."],
    },
  ],
  companies: [
    "**Load testing to find the knee.** Teams run step load tests (k6, Gatling, Locust) that raise traffic every few minutes and plot p99 against throughput. The point where latency turns sharply upward becomes the maximum safe load per instance, which feeds autoscaling targets.",
    "**Utilisation targets.** Many teams autoscale on CPU at 50–70%, not 90%, exactly because of the queueing curve. Databases and message brokers are often kept even lower because they are harder to scale quickly.",
    "**Removing contention.** Counters that every request updates (likes, views, stock levels) are a famous source of scalability bugs. Large sites use sharded counters, append-only event tables, or in-memory counters flushed periodically.",
  ],
  mistakes: [
    { mistake: "Adding servers without finding the bottleneck", why: "Scaling out is the reflex", wrong: "Cost goes up; the shared resource (DB, lock, pool) is hit harder and latency gets worse", fix: "Apply the USE method to every resource; scale the saturated one" },
    { mistake: "Measuring performance only with one user", why: "Development machines have no load", wrong: "Contention and queueing are invisible until production traffic arrives", fix: "Run step load tests and plot latency against throughput" },
    { mistake: "Reporting throughput without latency", why: "Throughput looks impressive", wrong: "'10,000 rps' with a p99 of 8 seconds is useless to users", fix: "State capacity as throughput at a latency SLO" },
    { mistake: "Running hot to save money", why: "Idle capacity looks wasteful", wrong: "At 90–95% utilisation, small bursts cause huge tail latency", fix: "Keep headroom; autoscale on leading signals such as queue length" },
    { mistake: "Global locks and hot rows", why: "The simplest code for counters and unique sequences", wrong: "Throughput flat-lines no matter how many servers you add (Amdahl)", fix: "Shard counters, append-only events, or move coordination off the request path" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Profile single-request performance first; then load test for scalability. They are different problems with different fixes." },
    { tag: "Reliability", text: "Define capacity as 'throughput at p99 under X ms' and alert before you reach the knee of the curve." },
    { tag: "Performance", text: "Use the USE method on every resource, including application ones: connection pools, thread pools, locks and queues." },
    { tag: "Cost", text: "Remove serial steps and contention before buying hardware; it often gives 10× more than adding servers." },
  ],
  interview: [
    { q: "What is the difference between a performance problem and a scalability problem?", a: "A performance problem means the system is slow even for one user, so you optimise code, queries or algorithms. A scalability problem means it is fast for one user but degrades as load increases, usually because of a saturated shared resource (database, lock, pool, network). You tell them apart by measuring latency at increasing load." },
    { q: "Why does latency grow so fast near 100% utilisation?", a: "Requests arrive in random bursts. Near full utilisation the servers have no spare capacity to drain queues created by bursts, so waiting time grows roughly as service time divided by (1 − utilisation): 10× at 90%, 100× at 99%. Tail latency grows even faster, so systems keep headroom." },
    { q: "You added servers but throughput did not increase. What do you check?", a: "That the app tier was actually the bottleneck. I check utilisation, saturation and errors of shared resources: database CPU and locks, connection pool waits, a single-threaded component, network limits, or a downstream rate limit. Amdahl's law says any serial step caps the speedup, so I look for hot rows, global locks and single leaders." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "An endpoint takes 3 seconds even with no other traffic. What kind of problem is it?",
      options: ["Scalability problem", "Performance problem", "Availability problem", "Consistency problem"],
      answer: 1,
      explanation: "Slow for a single user means a performance problem: profile the request.",
    },
    {
      kind: "output",
      prompt: "Using average time ≈ S / (1 − U), a request with 10 ms service time at 90% utilisation takes about…",
      options: ["11 ms", "19 ms", "100 ms", "900 ms"],
      answer: 2,
      explanation: "10 / (1 − 0.9) = 100 ms. Ninety percent of that time is waiting in the queue.",
    },
    {
      kind: "bug",
      prompt: "Throughput stays at about 900 requests per second whether you run 4 or 12 API servers, and database CPU is only 30%. What is the most likely cause?",
      options: ["The database needs more CPU", "A lock or hot row serialises requests (contention)", "The load balancer is too fast", "The servers need more RAM"],
      answer: 1,
      explanation: "Flat throughput with low CPU points to waiting, not work: check lock waits and pool waits.",
    },
  ],
  cheatSheet: [
    "Performance = slow for one; scalability = slow under load.",
    "Latency = time per operation; throughput = operations per second. Report both.",
    "Average time ≈ S / (1 − U): 2× at 50%, 10× at 90%, 100× at 99%.",
    "Throughput ceiling = slowest stage; latency = sum of stages.",
    "Amdahl: serial fraction s caps speedup at 1/s.",
    "USE: Utilisation, Saturation, Errors for every resource.",
    "Kill contention: shard counters, append-only events, no global locks.",
  ],
  homework: {
    basic: {
      title: "Find the safe load for one worker",
      brief: [
        "One worker serves a request in 20 ms on average. Using average latency ≈ S / (1 − U), print the average latency at 30%, 60%, 80%, 90% and 95% utilisation, and compute the highest throughput (requests per second) that keeps the average under 100 ms.",
      ],
      criteria: ["Table printed for the five loads", "Maximum throughput derived from the formula, not guessed"],
      hints: ["Capacity of one worker = 1000 / 20 = 50 requests per second.", "Solve S / (1 − U) = 100 for U."],
      solution: {
        text: ["Rearranging gives U = 1 − S / target = 1 − 20/100 = 0.8, so the worker can take 80% of its 50 rps capacity: 40 requests per second. Above that, average latency exceeds the target, and p99 exceeded it much earlier."],
        code: {
          lang: "python",
          file: "safe_load.py",
          code: `service_ms = 20
capacity_rps = 1000 / service_ms

for u in (0.30, 0.60, 0.80, 0.90, 0.95):
    print(f"utilisation {u:4.0%}  avg latency {service_ms / (1 - u):6.1f} ms  at {u * capacity_rps:4.1f} rps")

target_ms = 100
max_u = 1 - service_ms / target_ms
print(f"max utilisation for avg <= {target_ms} ms: {max_u:.0%} -> {max_u * capacity_rps:.0f} rps")`,
        },
        output: "utilisation  30%  avg latency   28.6 ms  at 15.0 rps\nutilisation  60%  avg latency   50.0 ms  at 30.0 rps\nutilisation  80%  avg latency  100.0 ms  at 40.0 rps\nutilisation  90%  avg latency  200.0 ms  at 45.0 rps\nutilisation  95%  avg latency  400.0 ms  at 47.5 rps\nmax utilisation for avg <= 100 ms: 80% -> 40 rps",
        pitfalls: ["Using the average as the SLO: users feel p99, which is several times the average near the knee."],
      },
    },
    intermediate: {
      title: "One fast server or two slow ones?",
      brief: [
        "Using the simulation from the hands-on, compare one worker at 10 ms per request with two workers at 20 ms per request (same total capacity, 100 rps). Run both at 50%, 80% and 95% load and print p50 and p99. Which is better, when, and why?",
      ],
      criteria: ["Same total capacity in both setups", "Both percentiles reported", "A conclusion explained with queueing, not opinion"],
      hints: ["Reuse simulate() with servers=1, service_ms=10 and servers=2, service_ms=20."],
      solution: {
        text: [
          "At every load the single fast worker has the lower median, because each request is served twice as fast once it starts. At high load the two workers catch up on the tail, because one slow request no longer blocks everyone behind it. In practice you also want two of anything for availability (6.3.4), so the usual answer is 'scale out, but make each request fast too'.",
        ],
        code: {
          lang: "python",
          file: "fast_vs_many.py",
          code: `import heapq, random

def simulate(arrival_rps, servers, service_ms, n=200_000, seed=7):
    rng = random.Random(seed)
    free_at = [0.0] * servers
    t, lat = 0.0, []
    for _ in range(n):
        t += rng.expovariate(arrival_rps / 1000)
        start = max(t, heapq.heappop(free_at))
        done = start + rng.expovariate(1 / service_ms)
        heapq.heappush(free_at, done)
        lat.append(done - t)
    lat.sort()
    return lat[n // 2 - 1], lat[int(0.99 * n) - 1]

print("load   1 x 10ms p50/p99      2 x 20ms p50/p99")
for load in (0.5, 0.8, 0.95):
    rps = load * 100
    a = simulate(rps, 1, 10)
    b = simulate(rps, 2, 20)
    print(f"{load:4.0%}   {a[0]:6.1f} / {a[1]:6.1f}      {b[0]:6.1f} / {b[1]:6.1f}")`,
        },
        output: "load   1 x 10ms p50/p99      2 x 20ms p50/p99\n 50%     13.8 /   93.1        19.3 /  113.0\n 80%     34.3 /  229.9        40.5 /  237.6\n 95%    130.2 / 1542.8       135.6 / 1540.0",
        pitfalls: ["Concluding 'one big server is always better': it is a single point of failure and cannot be scaled further."],
      },
    },
    challenge: {
      title: "Fit the Universal Scalability Law to load-test data",
      brief: [
        "A load test measured throughput (rps) at N servers: 1 → 1,000; 2 → 1,900; 4 → 3,400; 8 → 5,300; 16 → 6,500; 32 → 5,900. Fit the USL, X(N) = λN / (1 + σ(N − 1) + κN(N − 1)), with λ = 1,000, by grid search over σ (contention) and κ (coherency). Report σ, κ, the N with maximum throughput, and what the numbers say about the system.",
      ],
      criteria: ["Fit uses only the standard library", "Error metric stated", "Peak N computed from the fitted model", "Interpretation of σ and κ"],
      hints: ["Peak N ≈ sqrt((1 − σ) / κ).", "Use the sum of squared relative errors so small and large N count equally."],
      solution: {
        text: [
          "σ ≈ 5% means about 5% of the work is serialised (contention). κ ≈ 0.3% looks tiny, but it is multiplied by N(N − 1), so coordination between servers makes throughput fall after about 18 servers (the measurements already dip at 32). Adding servers beyond ~16 is wasteful; reducing shared state (κ) would raise the ceiling more than any amount of hardware.",
        ],
        code: {
          lang: "python",
          file: "usl_fit.py",
          code: `import math

measured = {1: 1000, 2: 1900, 4: 3400, 8: 5300, 16: 6500, 32: 5900}
LAMBDA = 1000

def usl(n, sigma, kappa):
    return LAMBDA * n / (1 + sigma * (n - 1) + kappa * n * (n - 1))

def error(sigma, kappa):
    return sum(((usl(n, sigma, kappa) - x) / x) ** 2 for n, x in measured.items())

best = min(((s / 1000, k / 100000) for s in range(0, 201) for k in range(0, 501)),
           key=lambda p: error(*p))
sigma, kappa = best
peak_n = math.sqrt((1 - sigma) / kappa)

print(f"sigma (contention) = {sigma:.3f}")
print(f"kappa (coherency)  = {kappa:.5f}")
print(f"peak at N = {peak_n:.0f}, throughput {usl(peak_n, sigma, kappa):,.0f} rps")
for n, x in measured.items():
    print(f"N={n:2d}  measured {x:5d}  model {usl(n, sigma, kappa):7.0f}")`,
        },
        output: "sigma (contention) = 0.050\nkappa (coherency)  = 0.00291\npeak at N = 18, throughput 6,568 rps\nN= 1  measured  1000  model    1000\nN= 2  measured  1900  model    1894\nN= 4  measured  3400  model    3376\nN= 8  measured  5300  model    5288\nN=16  measured  6500  model    6535\nN=32  measured  5900  model    5886",
        pitfalls: ["Extrapolating far beyond measured N: refit after every architectural change."],
      },
    },
    capstone: {
      title: "DevAtlas: find the knee of your API",
      brief: [
        "Run a step load test against your capstone API (k6 stages that add 25 virtual users every 2 minutes). Plot p99 against throughput, mark the knee, apply the USE checklist at the knee to name the bottleneck, fix it, and re-run. Write docs/performance.md with before/after numbers.",
      ],
      criteria: ["Step profile, not one constant load", "Knee identified with numbers", "Bottleneck named with evidence (metric or log)", "Before/after comparison"],
      hints: ["k6 can tag each stage; or export per-second results with --out json and group by time."],
      solution: {
        text: [
          "The report shows the method, not just a number: where the knee was, which resource was saturated (with the metric that proved it), the fix, and the new knee. Example values below come from a typical first run where the bottleneck was the database connection pool.",
        ],
        code: {
          lang: "markdown",
          file: "docs/performance.md",
          code: `# API performance and scalability report

## Single-request performance (1 virtual user)
| Endpoint | p50 | p99 | Notes |
|---|---|---|---|
| GET /v1/lessons | 12 ms | 25 ms | served from Redis |
| GET /v1/me/progress | 18 ms | 40 ms | one indexed query |
| POST /v1/quiz/submit | 35 ms | 70 ms | insert + stats update |

## Step load test (25 VUs added every 2 min, 4 API pods)
| Throughput (rps) | p99 submit | Error rate |
|---|---|---|
| 300 | 80 ms | 0% |
| 600 | 110 ms | 0% |
| 900 | 240 ms | 0% |
| 1,050 | 1,900 ms | 2.1% (timeouts) |

**Knee: ~900 rps.** Past it, p99 grows 8x for 17% more traffic.

## Bottleneck at the knee (USE)
- API CPU 45%: not saturated.
- PostgreSQL CPU 35%: not saturated.
- Connection pool: 10/10 busy on every pod, "waiting for connection" p99 1.6 s -> **saturated**.
- Evidence: pool wait-time histogram in Grafana; pg_stat_activity showed 40 active sessions, 0 lock waits.

## Fix
Pool raised from 10 to 20 per pod (80 total, below max_connections 200), and the
stats update moved to an append-only events table (removes the hot row seen at higher load).

## After
| Throughput (rps) | p99 submit | Error rate |
|---|---|---|
| 900 | 95 ms | 0% |
| 1,500 | 160 ms | 0% |
| 1,900 | 420 ms | 0.1% |

New knee ~1,800 rps; next saturated resource: PostgreSQL CPU (78%). Trigger: add a read
replica for progress reads when sustained peak passes 1,200 rps.`,
        },
        pitfalls: ["Load generator saturation: watch the k6 machine's CPU, or you are measuring your laptop.", "Testing against an empty database: indexes and caches behave differently with production-sized data."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: performance vs scalability, latency vs throughput (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#performance-vs-scalability" },
    { label: "Brendan Gregg: the USE method", url: "https://www.brendangregg.com/usemethod.html" },
    { label: "A Word on Scalability (Werner Vogels)", url: "https://www.allthingsdistributed.com/2006/03/a_word_on_scalability.html" },
    { label: "The Tail at Scale (Dean & Barroso)", url: "https://research.google/pubs/the-tail-at-scale/" },
  ],
  nextPreview: "Next: availability. Failover, replication, what 99.9% really allows, and why five reliable services in a chain are less reliable than any one of them.",
};
