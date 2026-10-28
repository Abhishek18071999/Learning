import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.9.2",
  title: "Incident drills: CPU, memory, disk, network, DB, Redis and K8s",
  minutes: 70,
  level: "Advanced",
  prerequisites: ["9.9.1 The incident method: triage, diagnose, mitigate, postmortem"],
  summary: "Recognise the failure signature of each resource before a real incident: CPU pinned, memory creeping to OOM, disk full, network timeouts, a slow query, Redis saturation and a crash-looping pod — each with its symptom, signal and fix.",
  terms: [
    { term: "CPU saturation", def: "Utilisation pinned near 100% with a growing run queue — a hot loop, GC pressure or too many threads." },
    { term: "Memory leak", def: "Resident set grows monotonically until an OOM kill restarts the process, then the cycle repeats." },
    { term: "Disk full", def: "The volume reaches 100% and writes fail — usually logs, caches or an unchecked dataset growth." },
    { term: "Connection pool exhaustion", def: "Latency climbs while CPU stays low and errors say 'pool timeout' — a leaked or under-sized pool." },
    { term: "Redis saturation", def: "Latency spikes as the command queue grows past what a single thread can serve." },
    { term: "CrashLoopBackOff / OOMKilled", def: "Kubernetes pod states: OOMKilled means the memory limit was hit; CrashLoopBackOff means the process keeps exiting on start." },
  ],
  problem: [
    "Each resource fails in its own characteristic way, and each demands a different fix. CPU needs a profiler; a memory leak needs a heap dump; a crash-looping pod needs its crash logs. Treating them all as 'the service is slow' wastes hours.",
    "The value of a drill is pattern recognition: see the signature, name the resource, apply the right tool. Rehearsed in advance, a real incident becomes a familiar exercise.",
  ],
  concept: {
    analogy: [
      "Each resource is a **vital sign** with its own disease. CPU pegged at 100% is a fever from a runaway loop; memory climbing is a slow bleed that eventually flatlines (OOM); disk full is a clogged drain; network timeouts are a broken nerve; a slow query is a blocked artery; Redis saturation is one cashier with a growing queue; a crash-looping pod is a patient who faints every time they stand up.",
    ],
    precise: [
      "**CPU:** high utilisation + low idle + slow-but-correct responses → profile for a hot loop or GC. Scale-out buys time but does not fix the loop.",
      "**Memory:** resident set grows, then an OOM kill restarts the process and it repeats → take a heap dump, look for a leak or an unbounded cache.",
      "**Disk:** writes fail or slow as the volume fills → rotate logs, clean caches, check dataset growth. Disk full also silently breaks databases and message queues.",
      "**Network:** timeouts and retries, often intermittent → check DNS, routes, firewall and the dependency's own health.",
      "**Database:** one span dominates the trace → find the slow query and fix the index or the query plan (lesson 5.1.1).",
      "**Redis:** latency climbs with the command queue past what one thread can serve → reduce hot keys, split the workload, or resize.",
      "**Kubernetes:** OOMKilled means raise the memory limit (or fix the leak); CrashLoopBackOff means read the crash logs — the pod exits on start.",
    ],
  },
  underTheHood: {
    text: [
      "Each signature is read from the observability you built in lesson 9.5.1: CPU and memory from metrics, latency from traces, errors from logs. The drill is the muscle memory of reading them together — high CPU with normal memory is a loop; low CPU with climbing latency is a pool or a slow dependency.",
      "The triage order matters: check the resource signals first (CPU, memory, disk, network), then the dependency signals (DB, Redis), then the orchestrator (Kubernetes). Each layer narrows the search, and the fix is specific to the layer.",
      "Drills are cheap because they are just these signatures encoded as tiny functions over fake data. Run the signature recogniser against a real incident's numbers and you have a diagnosis in seconds instead of minutes.",
    ],
    diagram: {
      title: "Resource → signature → fix",
      nodes: [
        { label: "CPU", sub: "pinned → profile" },
        { label: "Memory", sub: "creep → OOM" },
        { label: "Disk", sub: "full → rotate" },
        { label: "Network", sub: "timeouts" },
        { label: "DB/Redis", sub: "slow span / queue" },
        { label: "K8s", sub: "OOMKilled / CrashLoop" },
      ],
      edges: ["·", "·", "·", "·", "·"],
    },
  },
  handsOn: [
    {
      title: "CPU saturation",
      text: [
        "The signature: utilisation pinned high with a load that matches or exceeds the thread count. It points at a hot loop, not a lack of servers.",
      ],
      code: {
        lang: "python",
        file: "cpu_drill.py",
        code: `"""CPU saturation: utilisation stays pinned, queue grows."""
def signature(util, load, threads):
    if util > 0.9:
        return f"CPU-BOUND: util={util:.0%} load={load} (threads={threads}) -> profile hot loop"
    return "healthy"


print(signature(0.97, 8, 8))
print(signature(0.40, 2, 8))`,
      },
      output: "CPU-BOUND: util=97% load=8 (threads=8) -> profile hot loop\nhealthy",
      notes: [
        "Scaling out masks a hot loop; the profiler fixes it. If load ≫ threads, the work is queued — that is a throughput problem, not just a slow request.",
      ],
    },
    {
      title: "Memory leak to OOM",
      text: [
        "The signature: resident set climbs monotonically until the OOM killer restarts the process, and the cycle repeats. It is a leak or an unbounded cache.",
      ],
      code: {
        lang: "python",
        file: "mem_drill.py",
        code: `"""Memory leak: resident set grows, then OOM kill, then restart."""
rss = [120, 240, 480, 900, 1024]  # MB
for i, r in enumerate(rss):
    print(f"t={i} rss={r}MB -> {'OOM killed; next: restart' if r >= 1024 else 'growing'}")`,
      },
      output: "t=0 rss=120MB -> growing\nt=1 rss=240MB -> growing\nt=2 rss=480MB -> growing\nt=3 rss=900MB -> growing\nt=4 rss=1024MB -> OOM killed; next: restart",
      notes: [
        "The tell is the saw-tooth: growth, kill, restart, growth again. A heap dump before the kill shows exactly what is holding memory.",
      ],
    },
    {
      title: "Disk full",
      text: [
        "The signature: writes fail as the volume reaches 100%. It is usually logs or caches, and it silently breaks databases too.",
      ],
      code: {
        lang: "python",
        file: "disk_drill.py",
        code: `"""Disk full: writes fail as the volume fills."""
usage = [50, 75, 90, 100]
for u in usage:
    print(f"disk {u:3}% -> {'writes failing' if u >= 100 else 'ok'}")`,
      },
      output: "disk  50% -> ok\ndisk  75% -> ok\ndisk  90% -> ok\ndisk 100% -> writes failing",
      notes: [
        "Disk full is a sleeper: it works until it does not, then the database stops accepting writes. An alert at 80% beats discovering it at 100%.",
      ],
    },
  ],
  companies: [
    "**SRE teams** keep per-resource runbooks and alerts at thresholds (CPU > 90% for 10m, disk > 80%), so each signature triggers a known response.",
    "**Kubernetes operators** read `kubectl describe pod` for the exact reason — OOMKilled, CrashLoopBackOff, ImagePullBackOff — and the fix follows from the reason.",
    "**Database teams** use slow-query logs and EXPLAIN (lesson 5.1.1) to turn a latency incident into a one-line index fix.",
    "**Redis users** watch the command queue and hot keys, since a single slow command or hot key saturates Redis's single thread for everyone.",
  ],
  mistakes: [
    {
      mistake: "Scaling out a CPU-bound service instead of profiling",
      why: "More servers is the easy button",
      wrong: "The hot loop runs on every replica; cost goes up and latency barely moves",
      fix: "Profile first, fix the loop, then right-size",
    },
    {
      mistake: "Restarting a leaky process as a permanent fix",
      why: "The restart clears memory",
      wrong: "The leak returns and the cycle repeats forever",
      fix: "Take a heap dump and fix the actual leak",
    },
    {
      mistake: "Ignoring a 90% disk",
      why: "It is not full yet",
      wrong: "It fills overnight and the database stops writing",
      fix: "Alert at 80%, rotate logs, and investigate growth before it is critical",
    },
    {
      mistake: "Raising Kubernetes memory limits to hide a leak",
      why: "The pod stopped being killed",
      wrong: "The leak now consumes more before the same OOM, and costs more",
      fix: "Fix the leak; the limit is a guard, not a solution",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Alert on each resource at a threshold below failure (CPU 90%, memory 80%, disk 80%) so you act before users notice.",
    },
    {
      tag: "Performance",
      text: "Profile CPU-bound and memory leaks instead of masking them with scale; use traces to find slow spans and queries.",
    },
    {
      tag: "Cost",
      text: "Fixing the loop or leak is cheaper than running more replicas forever.",
    },
    {
      tag: "Maintainability",
      text: "Keep a per-resource runbook and rehearse the drills so each signature maps to a known fix.",
    },
  ],
  interview: [
    {
      q: "Latency is climbing but CPU is low. What do you suspect?",
      a: "A connection-pool leak or a slow dependency. Low CPU with rising latency points at waiting, not work. Confirm with a trace (which span dominates) and by checking pool or dependency metrics.",
    },
    {
      q: "A pod keeps restarting. How do you diagnose it?",
      a: "Describe the pod: `kubectl describe pod` shows the last state and reason. OOMKilled means the memory limit was hit; CrashLoopBackOff means the process exits on start — then read the logs. ImagePullBackOff is a different root cause entirely.",
    },
    {
      q: "Memory keeps climbing and the process restarts every few hours. What is the real fix?",
      a: "A leak. Restarting masks it. Take a heap dump, find the unbounded cache or retained reference, fix it, and keep the restart only as a stopgap. Raising the limit just delays the same kill.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "High CPU, normal memory, slow-but-correct responses. What is the likely cause?",
      options: ["A hot loop or GC pressure", "A disk that is full", "A network partition", "A bad certificate"],
      answer: 0,
      explanation: "Pinned CPU with correct output points at a hot loop or GC, not I/O or networking.",
    },
    {
      kind: "output",
      prompt: "Which pod state does this print for a pod with 4 restarts?",
      code: {
        lang: "python",
        code: `def status(restarts):
    return "CrashLoopBackOff" if restarts >= 3 else "Running"

print(status(4))`,
      },
      options: ["Running", "CrashLoopBackOff", "OOMKilled"],
      answer: 1,
      explanation: "4 ≥ 3, so it reports CrashLoopBackOff.",
    },
    {
      kind: "bug",
      prompt: "A team raises the Redis instance size every time latency spikes, but spikes return. What is the likely root cause?",
      options: [
        "A hot key or a few slow commands saturating Redis's single thread",
        "Redis is too small to ever work",
        "The network is broken",
        "Nothing is wrong",
      ],
      answer: 0,
      explanation: "Redis is single-threaded; one hot key or slow command queues everyone. Fix the hot key, don't just resize.",
    },
  ],
  cheatSheet: [
    "CPU pinned → profile a hot loop; scaling masks it.",
    "Memory creep + restart cycle → leak; heap dump, fix it.",
    "Disk 100% → rotate logs, clean caches, alert at 80%.",
    "Low CPU + rising latency → pool leak or slow dependency; trace it.",
    "One dominant span → the slow query; fix the index/plan.",
    "Redis saturated → hot key / slow command; single-threaded.",
    "OOMKilled → limit or leak; CrashLoopBackOff → read the crash logs.",
  ],
  homework: {
    basic: {
      title: "Network failure drill",
      brief: ["Model a network failure as a timeout that triggers a retry with backoff, and show the recovered case."],
      criteria: ["Down host reports a timeout", "Up host reports ok", "Runs offline"],
      hints: ["A boolean `up` decides the outcome."],
      solution: {
        text: ["Network failures are intermittent, so the response is a timeout plus a retry. This is the signature behind most 'it works now' reports."],
        code: {
          lang: "python",
          file: "net_drill.py",
          code: `"""Network failure: timeouts and retries."""
def net(up: bool) -> str:
    return "ok" if up else "timeout after 5s -> retry with backoff"


print("db host:", net(False))
print("db host:", net(True))`,
        },
        output: "db host: timeout after 5s -> retry with backoff\ndb host: ok",
      },
    },
    intermediate: {
      title: "Database slow-query drill",
      brief: ["Given a list of queries with durations, find the one that dominates the request."],
      criteria: ["Finds the slowest query", "Runs offline"],
      hints: ["`max(queries, key=lambda q: q['ms'])`."],
      solution: {
        text: ["One slow query is usually the whole story. The trace points to it, and EXPLAIN shows why — then an index fixes it (lesson 5.1.1)."],
        code: {
          lang: "python",
          file: "db_drill.py",
          code: `"""Database: the slow query dominates."""
def find_slow(queries):
    return max(queries, key=lambda q: q["ms"])


qs = [
    {"q": "SELECT * FROM lessons", "ms": 30},
    {"q": "SELECT * FROM progress WHERE user_id=?", "ms": 1800},
]
print("slow query:", find_slow(qs)["q"])`,
        },
        output: "slow query: SELECT * FROM progress WHERE user_id=?",
      },
    },
    challenge: {
      title: "Redis saturation drill",
      brief: ["Model Redis as having a maximum ops/sec and flag when the load crosses it."],
      criteria: ["Flags saturation past the limit", "Healthy below the limit", "Runs offline"],
      hints: ["Compare ops_sec against the max."],
      solution: {
        text: ["Redis is single-threaded, so there is a hard ceiling. The fix is removing hot keys or splitting the workload, not endlessly resizing."],
        code: {
          lang: "python",
          file: "redis_drill.py",
          code: `"""Redis saturation: latency climbs with the command queue."""
def redis(ops_sec, max_ops):
    return "saturated" if ops_sec >= max_ops else "ok"


for ops in (1000, 9000, 12000):
    print(f"{ops} ops/s -> {redis(ops, 10000)}")`,
        },
        output: "1000 ops/s -> ok\n9000 ops/s -> ok\n12000 ops/s -> saturated",
      },
    },
    capstone: {
      title: "DevAtlas: Kubernetes pod-state drill",
      brief: ["Classify a pod's state — Running, OOMKilled or CrashLoopBackOff — from its restart count and exit reason."],
      criteria: ["OOMKilled is detected by reason", "CrashLoopBackOff by restart count", "Healthy pods pass"],
      hints: ["Check reason first, then restart count."],
      solution: {
        text: ["This mirrors `kubectl describe pod`: the reason field (OOMKilled) and the restart count (CrashLoopBackOff) tell you the fix without reading logs first."],
        code: {
          lang: "python",
          file: "k8s_drill.py",
          code: `"""Kubernetes: CrashLoopBackOff and OOMKilled."""
def pod_status(restarts, reason):
    if reason == "OOMKilled":
        return "OOMKilled -> raise memory limits"
    if restarts >= 3:
        return "CrashLoopBackOff -> read the crash logs"
    return "Running"


print(pod_status(0, "Running"))
print(pod_status(5, ""))
print(pod_status(1, "OOMKilled"))`,
        },
        output: "Running\nCrashLoopBackOff -> read the crash logs\nOOMKilled -> raise memory limits",
      },
    },
  },
  deeper: [
    { label: "Google SRE book: monitoring distributed systems", url: "https://sre.google/sre-book/monitoring-distributed-systems/" },
    { label: "Kubernetes: pod lifecycle", url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/" },
    { label: "Brendan Gregg: Linux performance analysis", url: "https://www.brendangregg.com/linuxperf.html" },
    { label: "USE method: Utilisation, Saturation, Errors", url: "https://www.brendangregg.com/usemethod.html" },
  ],
  nextPreview: "Next: AI + DevOps — LLM-assisted code review, pipeline debugging, infrastructure and Kubernetes.",
};
