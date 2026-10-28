import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.9.1",
  title: "The incident method: triage, diagnose, mitigate, postmortem",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["9.5.1 Logs, metrics, traces and DevSecOps"],
  summary: "Turn chaos into a repeatable loop: triage from the symptoms, isolate the failing layer, mitigate before you root-cause, then write a blameless postmortem. Practice reading signals and diagnosing a real failure mode, the way an on-call engineer does.",
  terms: [
    { term: "Incident", def: "An unexpected event that degrades service — a spike in errors, latency or downtime worth a coordinated response." },
    { term: "Triage", def: "Assessing severity and blast radius first, so the response matches the damage instead of the alarm volume." },
    { term: "MTTD / MTTR", def: "Mean time to detect and mean time to recover — the two numbers that measure how good your response is." },
    { term: "Blast radius", def: "Who and what is affected — one customer, one region, or everything — determines severity and who gets paged." },
    { term: "Mitigate", def: "Stop the bleeding first (rollback, scale out, feature flag off) before finding the root cause." },
    { term: "Blameless postmortem", def: "A written record of the incident that focuses on systems and process, not individuals, and produces action items." },
    { term: "Runbook", def: "A short, executable list of steps per symptom, so the on-call engineer does not start from zero at 3 am." },
  ],
  problem: [
    "Checkout error rate climbs to 12% at 2 am. The on-call engineer starts reading code line by line while customers pile up, because there is no triage step, no runbook and no idea what changed recently. Four hours later the 'fix' is applied without understanding what broke.",
    "The problem is not the specific failure — it is the missing method. A repeatable loop (triage → mitigate → diagnose → fix → postmortem) converts a panic into a checklist and cuts recovery time by orders of magnitude.",
  ],
  concept: {
    analogy: [
      "A production incident is a **fire**. Triage is sizing the fire and deciding who to evacuate; mitigation is closing the doors and cutting the fuel; diagnosis is finding what started it after the fire is contained; the postmortem is the fire marshal's report that changes the building codes so it does not happen again. You never start a diagnosis while the building is still burning.",
    ],
    precise: [
      "**Triage first:** severity (how bad), blast radius (who is affected), and who is on the bridge. A 12% error spike on one endpoint is a different response from a full-region outage.",
      "**Mitigate before you diagnose.** The fastest path back to healthy is usually not the root cause: roll back the last deploy, scale out, disable a feature flag, fail over. Buy time, then find the cause.",
      "**Diagnose from signals, not guesses.** Read the observability you built (lesson 9.5.1): error rate, latency percentiles, saturation. Each failure mode has a signature — CPU spikes look different from a connection-pool leak, which looks different from a slow database.",
      "**The fix needs a regression test.** Once the root cause is known, the fix must include a test that would have caught it, otherwise the same bug ships again.",
      "**A blameless postmortem is a learning artifact.** Timeline, what happened, what we will change, action items with owners. Blame drives information underground; blamelessness keeps the next incident shorter.",
    ],
  },
  underTheHood: {
    text: [
      "Most production failures are resource or dependency problems, and each has a signature in the data. CPU-bound: high CPU, low idle, slow but correct responses. Memory: growing resident set, eventual OOM kill, then a restart. Disk: writes fail or slow as the volume fills. Connection-pool exhaustion: latency grows while CPU stays low, and errors say 'connection pool timeout'. A slow dependency: one span dominates the trace.",
      "The trace is the highest-resolution instrument: it shows which span consumed the time, so you stop suspecting your code and start looking at the right service or query. The method is: pick the symptom, form a hypothesis from the signature, confirm it in logs/metrics/traces, then fix.",
      "The loop is cheap to rehearse. Running a drill against a deliberately broken system (a leaked pool, a slow query) builds the muscle memory so a real incident feels familiar.",
    ],
    diagram: {
      title: "The incident loop",
      nodes: [
        { label: "Alert", sub: "symptom" },
        { label: "Triage", sub: "severity + radius" },
        { label: "Mitigate", sub: "rollback / scale / flag" },
        { label: "Diagnose", sub: "signals → hypothesis" },
        { label: "Fix + test" },
        { label: "Postmortem", sub: "action items" },
      ],
      edges: ["then", "then", "then", "then", "then"],
    },
  },
  handsOn: [
    {
      title: "Read the signals",
      text: [
        "The first skill is mapping a set of signals to the likely failing layer. This is the rule-of-thumb an on-call engineer runs before looking at any log.",
      ],
      code: {
        lang: "python",
        file: "triage.py",
        code: `"""Incident triage: read the signals, name the likely layer, take the next step."""
def triage(cpu, mem, disk, error_rate, latency_ms) -> str:
    if cpu > 90:
        return "CPU-bound: profile for a hot loop, GC pressure or runaway threads"
    if mem > 90:
        return "memory: look for leaks, oversized caches, or a mis-sized heap"
    if disk > 90:
        return "disk full: rotate logs, clean caches, check the volume"
    if error_rate > 0.05:
        return "errors: a downstream dependency is failing; check error logs"
    if latency_ms > 2000:
        return "latency: trace the request; likely a slow DB query or saturated dependency"
    return "no single cause: correlate logs, traces and the last deploy"


incidents = [
    dict(cpu=97, mem=40, disk=20, error_rate=0.01, latency_ms=300),
    dict(cpu=30, mem=96, disk=20, error_rate=0.01, latency_ms=300),
    dict(cpu=60, mem=60, disk=97, error_rate=0.01, latency_ms=300),
]
for i, s in enumerate(incidents, 1):
    print(f"incident {i}: {triage(**s)}")`,
      },
      output: "incident 1: CPU-bound: profile for a hot loop, GC pressure or runaway threads\nincident 2: memory: look for leaks, oversized caches, or a mis-sized heap\nincident 3: disk full: rotate logs, clean caches, check the volume",
      notes: [
        "These rules are deliberately simple because they match 90% of first symptoms. The point is to form a hypothesis in seconds, then confirm it in the actual metrics.",
      ],
    },
    {
      title: "Break-fix: the leak that slows everything down",
      text: [
        "A service gets slower request by request, then times out. Run this and diagnose the cause before reading the answer below.",
      ],
      code: {
        lang: "python",
        file: "drill.py",
        code: `"""A service that gets slower over time. Run it and diagnose the cause."""
class Pool:
    def __init__(self, size: int):
        self.size = size
        self.in_use = 0

    def acquire(self):
        self.in_use += 1

    def release(self):
        pass   # BUG: does not decrement in_use


pool = Pool(size=5)
for i in range(8):
    pool.acquire()
    wait = 0 if pool.in_use <= pool.size else (i - pool.size + 1) * 100
    print(f"req {i}: in_use={pool.in_use} wait={wait}ms")
    pool.release()`,
      },
      output: "req 0: in_use=1 wait=0ms\nreq 1: in_use=2 wait=0ms\nreq 2: in_use=3 wait=0ms\nreq 3: in_use=4 wait=0ms\nreq 4: in_use=5 wait=0ms\nreq 5: in_use=6 wait=100ms\nreq 6: in_use=7 wait=200ms\nreq 7: in_use=8 wait=300ms",
      notes: [
        "The signature — latency rising while CPU stays low — points at a connection leak: `release()` never decrements, so `in_use` grows past the pool size and every later request waits. This is the classic 'connection pool timeout' you will meet against real databases and Redis.",
      ],
    },
    {
      title: "Find the bottleneck in a trace",
      text: [
        "When the symptom is latency, the trace is the instrument. One span will dominate; find it and you have found where to look.",
      ],
      code: {
        lang: "python",
        file: "latency_drill.py",
        code: `"""A latency drill: find the slow span in a request trace."""
spans = [
    {"name": "GET /checkout", "ms": 2100},
    {"name": "cart service", "ms": 300},
    {"name": "payment service", "ms": 1700},
    {"name": "db: insert order", "ms": 80},
]

total = spans[0]["ms"]
print(f"total {total}ms")
for s in spans[1:]:
    print(f"  {s['name']:20} {s['ms']:5}ms  {s['ms'] / total * 100:5.1f}%")
slowest = max(spans[1:], key=lambda s: s["ms"])
print(f"bottleneck: {slowest['name']} at {slowest['ms']}ms")`,
      },
      output: "total 2100ms\n  cart service           300ms   14.3%\n  payment service       1700ms   81.0%\n  db: insert order        80ms    3.8%\nbottleneck: payment service at 1700ms",
      notes: [
        "81% of the time is in the payment service — stop profiling the checkout endpoint and look at the payment dependency. Traces turn 'it is slow' into 'this specific span is slow'.",
      ],
    },
  ],
  companies: [
    "**On-call teams** open an incident with a triage template (severity, blast radius, who is on the bridge) and follow a runbook for the first 10 minutes, before any deep debugging.",
    "**Mitigation-first culture** (rollback, kill switch, feature flag) is why mature teams recover in minutes: they do not wait to understand the bug before stopping the bleeding.",
    "**Blameless postmortems** (Google SRE, GitHub, most SaaS) treat the incident as a system failure and produce action items, so the same class of outage never repeats.",
    "**Chaos engineering** (Netflix, Gremlin) runs planned failures in production to rehearse exactly this loop, so a real failure is a familiar drill.",
  ],
  mistakes: [
    {
      mistake: "Debugging before mitigating",
      why: "The instinct to find the cause first",
      wrong: "The outage continues while the engineer reads code",
      fix: "Roll back, scale or feature-flag off first; diagnose with the pressure off",
    },
    {
      mistake: "Confusing the alarm with the incident",
      why: "Responding to every alert as equal",
      wrong: "A noisy low-severity alert distracts from the real outage",
      fix: "Triage severity and blast radius before acting",
    },
    {
      mistake: "Fixing without a regression test",
      why: "Relief at getting it working again",
      wrong: "The same bug ships again in a few weeks",
      fix: "Every root-cause fix lands with a test that would have caught it",
    },
    {
      mistake: "Naming people in the postmortem",
      why: "Trying to assign responsibility",
      wrong: "People hide information next time, and the systemic cause stays unfixed",
      fix: "Write blameless postmortems focused on systems and process, with owners on action items",
    },
    {
      mistake: "No runbook, every incident starts from zero",
      why: "Assuming the engineer will remember",
      wrong: "Slow, inconsistent recovery at 3 am under stress",
      fix: "Write a short runbook per symptom and rehearse it in drills",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Always mitigate first, then diagnose; track MTTD and MTTR and drive both down over time.",
    },
    {
      tag: "Maintainability",
      text: "Keep a short runbook per symptom and update it from every postmortem.",
    },
    {
      tag: "Security",
      text: "Never paste production logs or traces containing PII or secrets into a shared or public tool.",
    },
    {
      tag: "Cost",
      text: "A fast rollback or feature flag costs nothing and saves hours of paid on-call time and lost revenue.",
    },
    {
      tag: "Performance",
      text: "Let the trace find the bottleneck — instrument before you guess, and profile the slow span, not the whole request.",
    },
  ],
  interview: [
    {
      q: "Walk me through how you handle a production incident.",
      a: "Triage first: severity, blast radius, who is on the bridge. Then mitigate — roll back the last deploy, scale out, or disable a feature flag — to stop the bleeding. Then diagnose from logs, metrics and traces, confirm the hypothesis, apply the fix with a regression test, and finish with a blameless postmortem that produces action items.",
    },
    {
      q: "Latency is climbing but CPU and memory look fine. What do you suspect and how do you confirm it?",
      a: "A connection-pool leak or a slow dependency. A pool leak shows growing wait time with low CPU and errors like 'connection pool timeout'; a slow dependency shows one span dominating the trace. Confirm with a trace and by checking pool metrics or the dependency's own latency.",
    },
    {
      q: "Why is a blameless postmortem important?",
      a: "Blame makes people hide information and slows future incidents; the goal is to fix the system, not punish a person. A blameless postmortem captures the timeline, root cause and action items, so each incident makes the next one shorter and less likely.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A deploy raises error rate to 15%. What do you do first?",
      options: [
        "Read the code to find the bug",
        "Roll back the deploy, then diagnose",
        "Write a postmortem",
        "Wait to see if it recovers",
      ],
      answer: 1,
      explanation: "Mitigate first — roll back stops the bleeding immediately. Diagnosis happens after the system is healthy.",
    },
    {
      kind: "output",
      prompt: "Which incident does this triage classify as 'memory'?",
      code: {
        lang: "python",
        code: `def triage(cpu, mem):
    return "memory" if mem > 90 else "cpu" if cpu > 90 else "ok"

print(triage(cpu=40, mem=97), triage(cpu=99, mem=30), triage(cpu=20, mem=20))`,
      },
      options: ["memory cpu ok", "ok memory cpu", "memory ok cpu", "cpu memory ok"],
      answer: 0,
      explanation: "(40, 97) → memory; (99, 30) → cpu; (20, 20) → ok.",
    },
    {
      kind: "bug",
      prompt: "The on-call engineer spends two hours reading code before rolling back a clearly bad deploy. What is wrong?",
      options: [
        "Diagnosis should come after mitigation; the outage lasted longer than necessary",
        "Code should never be read",
        "Rolling back is optional",
        "Nothing is wrong",
      ],
      answer: 0,
      explanation: "The fastest recovery is the rollback, not understanding the bug. Mitigate first, then diagnose at leisure.",
    },
  ],
  cheatSheet: [
    "Incident loop: triage → mitigate → diagnose → fix (+test) → postmortem.",
    "Mitigate first: rollback, scale out, feature flag off.",
    "Triage = severity + blast radius + who is on the bridge.",
    "Each failure has a signature: CPU, memory, disk, pool, slow dependency.",
    "The trace finds the bottleneck; profile the slow span, not the whole request.",
    "Every fix ships with a regression test.",
    "Blameless postmortem: timeline + what we will change + action items.",
    "Keep a runbook per symptom; rehearse with drills.",
  ],
  homework: {
    basic: {
      title: "Classify the signal",
      brief: [
        "Extend the triage function to also detect a database connection-pool exhaustion and Redis saturation from a richer signal dict, and classify three cases.",
      ],
      criteria: [
        "Pool exhaustion detected when connections reach the max",
        "Redis saturation detected by high redis latency",
        "Three cases classified correctly",
      ],
      hints: ["Check the most specific, highest-signal condition first (error rate)."],
      solution: {
        text: [
          "The order of checks matters: a saturated pool often also raises error rate, so check the specific resource signals before the generic ones to localise correctly.",
        ],
        code: {
          lang: "python",
          file: "signals.py",
          code: `"""Read a set of signals and name the failing layer."""
def triage(sig: dict) -> str:
    if sig["error_rate"] > 0.1:
        return "application errors"
    if sig["db_connections"] >= sig["db_pool_max"]:
        return "database connection pool exhausted"
    if sig["redis_latency_ms"] > 100:
        return "redis saturation"
    if sig["cpu"] > 90:
        return "cpu-bound"
    return "healthy"


cases = [
    {"error_rate": 0.3, "db_connections": 10, "db_pool_max": 50, "redis_latency_ms": 5, "cpu": 20},
    {"error_rate": 0.01, "db_connections": 50, "db_pool_max": 50, "redis_latency_ms": 5, "cpu": 30},
    {"error_rate": 0.01, "db_connections": 5, "db_pool_max": 50, "redis_latency_ms": 300, "cpu": 30},
]
for c in cases:
    print(triage(c))`,
        },
        output: "application errors\ndatabase connection pool exhausted\nredis saturation",
      },
    },
    intermediate: {
      title: "Fix the connection-pool leak",
      brief: [
        "The `release()` method in the drill does nothing. Fix it so the pool returns to zero after eight acquire/release cycles, and confirm with output.",
      ],
      criteria: [
        "release() decrements the in-use count",
        "Pool returns to 0 after balanced acquire/release",
        "Acquiring beyond the size raises a clear error",
      ],
      hints: ["Guard the acquire with a size check, and make release the inverse."],
      solution: {
        text: [
          "The fix is one line, but the lesson is bigger: always pair every acquire with a release (in C#, a `using`/`try-finally`), and add a metric so a leak is visible before users feel it.",
        ],
        code: {
          lang: "python",
          file: "fix_pool.py",
          code: `"""Fix the connection-pool leak: release must decrement."""
class Pool:
    def __init__(self, size):
        self.size = size
        self.in_use = 0

    def acquire(self):
        if self.in_use >= self.size:
            raise RuntimeError("pool exhausted")
        self.in_use += 1

    def release(self):
        self.in_use -= 1   # fixed: previously did nothing


pool = Pool(5)
for _ in range(8):
    pool.acquire()
    pool.release()
print("in_use after 8 acquire/release cycles:", pool.in_use)`,
        },
        output: "in_use after 8 acquire/release cycles: 0",
      },
    },
    challenge: {
      title: "Write an incident runbook",
      brief: [
        "Write a five-step runbook — triage, mitigate, diagnose, fix, postmortem — with one concrete action each, in the order you would follow at 3 am.",
      ],
      criteria: [
        "Five steps in the correct order",
        "Mitigate comes before diagnose",
        "Each step has a concrete action",
      ],
      hints: ["Start from the symptom, end with action items."],
      solution: {
        text: [
          "A runbook is deliberately short — a checklist, not a document. It exists so the first 10 minutes of any incident are automatic, no matter who is on call.",
        ],
        code: {
          lang: "python",
          file: "runbook.py",
          code: `"""A structured incident runbook: the steps every on-call follows."""
RUNBOOK = [
    ("1. Triage", "severity, blast radius, who is on the bridge"),
    ("2. Mitigate", "stop the bleeding first: rollback, scale, feature flag off"),
    ("3. Diagnose", "correlate logs, metrics, traces and the last deploy"),
    ("4. Fix", "root-cause fix, plus a test that would have caught it"),
    ("5. Postmortem", "timeline, what happened, what we will change, action items"),
]
for title, body in RUNBOOK:
    print(f"{title:16} {body}")`,
        },
        output: "1. Triage        severity, blast radius, who is on the bridge\n2. Mitigate      stop the bleeding first: rollback, scale, feature flag off\n3. Diagnose      correlate logs, metrics, traces and the last deploy\n4. Fix           root-cause fix, plus a test that would have caught it\n5. Postmortem    timeline, what happened, what we will change, action items",
      },
    },
    capstone: {
      title: "DevAtlas: incident command",
      brief: [
        "Build a tiny incident command that walks the five-step runbook for a given severity and summary, printing each step in order.",
      ],
      criteria: [
        "Takes severity and summary as inputs",
        "Prints all five steps in order",
        "Mitigate precedes diagnose",
      ],
      hints: ["Model the runbook as an ordered list of (step, action) tuples."],
      solution: {
        text: [
          "This is the shell of a real incident tool: the runbook is data, the loop is trivial, and each step would dispatch to a real action (rollback job, ticket, status update).",
        ],
        code: {
          lang: "python",
          file: "incident_cli.py",
          code: `"""A tiny incident command: walk the runbook and log each step."""
def incident(severity: str, summary: str):
    steps = [
        ("triage", f"sev={severity} {summary}"),
        ("mitigate", "roll back / disable feature flag"),
        ("diagnose", "correlate logs + last deploy"),
        ("fix", "apply root-cause fix"),
        ("postmortem", "blameless write-up + action items"),
    ]
    for i, (step, note) in enumerate(steps, 1):
        print(f"[{i:02d}] {step:10} {note}")


incident("SEV-2", "checkout error rate at 12%")`,
        },
        output: "[01] triage     sev=SEV-2 checkout error rate at 12%\n[02] mitigate   roll back / disable feature flag\n[03] diagnose   correlate logs + last deploy\n[04] fix        apply root-cause fix\n[05] postmortem blameless write-up + action items",
      },
    },
  },
  deeper: [
    { label: "Google SRE book: incident management", url: "https://sre.google/sre-book/managing-incidents/" },
    { label: "Google SRE book: postmortem culture", url: "https://sre.google/sre-book/postmortem-culture/" },
    { label: "PagerDuty: incident response best practices", url: "https://www.pagerduty.com/resources/learn/incident-response/" },
    { label: "atlassian incident management handbook", url: "https://www.atlassian.com/incident-management/handbook" },
  ],
  nextPreview: "Next: incident drills — the failure signature of CPU, memory, disk, network, database, Redis and Kubernetes, one drill at a time.",
};
