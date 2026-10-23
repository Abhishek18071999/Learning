import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.6.1",
  title: "Debugging and profiling: find the real bottleneck",
  minutes: 80,
  level: "Intermediate",
  prerequisites: [
    "1.1.1 Python essentials: data model, functions and type hints",
    "1.1.4 Testing with pytest",
    "0.2.1 The terminal: files, permissions, processes and pipes",
  ],
  summary: "Turn \"it is slow\" or \"it is wrong\" into a reproducible case, a falsifiable hypothesis and a measurement that proves the fix, using pdb, cProfile, py-spy, flame graphs and tracemalloc in one loop.",
  terms: [
    { term: "Stack trace", def: "A report of the active calls when something failed. Python prints the most recent call last, so the final frame is where the exception surfaced; the frames above it are the callers that led there." },
    { term: "Breakpoint", def: "A deliberate pause at a file and line, or at a function's first line. It can carry a condition, so the debugger stops only when that condition is true." },
    { term: "Watch expression", def: "An expression the debugger evaluates in the paused frame every time execution stops, so you can watch a value change without editing the code." },
    { term: "pdb", def: "Python's standard interactive debugger, built on the bdb module and sys.settrace. It can step, inspect frames, evaluate expressions and run post-mortem on a traceback." },
    { term: "Logging", def: "Discrete, timestamped records of what happened, emitted at levels such as DEBUG, INFO, WARNING and ERROR. Cheap per event, expensive at volume if handlers write synchronously." },
    { term: "Tracing", def: "Following one request across services as a tree of spans, each with a start, end and parent, linked by a correlation ID. It shows where time went across process boundaries, not which function inside one process is hot." },
    { term: "Profiler", def: "A tool that measures where a process spends time or memory and aggregates the result over many calls. It answers \"what is expensive overall\", not \"what happened to request 8f3c\"." },
    { term: "Deterministic profiler", def: "A profiler that records every call and return, such as cProfile. Counts and totals are exact, overhead is high, and functions called very often are penalised by the instrumentation itself." },
    { term: "Sampling profiler", def: "A profiler that snapshots the call stack periodically, such as py-spy. Overhead is low and it can attach to a running process, but results are statistical and short functions may be missed." },
    { term: "Flame graph", def: "An aggregation of many stack samples. Each rectangle is a stack frame; width is the share of samples or time, and vertical position is stack depth. The horizontal order is a merge order, not a timeline." },
    { term: "tracemalloc", def: "A standard-library allocation tracer. It records Python allocations with the traceback that made them and can compare snapshots, reporting current and peak traced memory by file and line." },
    { term: "CPU time vs wall time", def: "CPU time is time actually executing on a processor; wall time is elapsed clock time. Wall time also includes waiting for I/O, locks, timers, garbage collection and downstream services." },
  ],
  problem: [
    "The workspace summary endpoint used to answer in 200 ms. Now it takes 3 seconds for large workspaces while CPU sits at 18%. The team guesses the database is slow, adds an index, then a cache, then more workers. Nothing improves. In the same week, a learner reports that their study streak shows 2 days when they studied the last three days in a row.",
    "Both reports are vague, and both invite guessing. Guessing feels productive because it produces action, but it spends days on changes that were never tied to evidence. The debugging loop replaces that with a cheap sequence: reproduce the failure, shrink it, state a hypothesis, instrument one thing, and verify. Profiling applies the same discipline to performance: measure where time or memory actually goes before changing code. In this lesson a profile shows 119,902 regex compilations inside a tag counter; caching ten validated tags removes them and makes the function about four times faster.",
  ],
  concept: {
    analogy: [
      "A doctor does not operate on the first symptom. They take a history, examine the patient, run the cheapest test that can distinguish between two likely causes, and only then treat. A fever could be an infection, an inflammatory condition or a reaction to a drug; the treatment for one can be harmful for another. Debugging works the same way: the symptom is \"slow\" or \"wrong\", but the cause is a specific mechanism, and the test you choose should be able to rule a mechanism out.",
      "A stack trace is a photograph of the call stack at one instant. A profile is a time-lapse made of thousands of such photographs, aggregated. A flame graph is a census of those photographs: it counts which stacks appeared and how often, then draws the result as nested bars. Photograph, time-lapse, census: same underlying frames, three different questions.",
    ],
    precise: [
      "**Debugging is hypothesis testing, not editing.** The loop is: reproduce the failure with a deterministic input; shrink the input or the code path until only the trigger remains; state a hypothesis that predicts an observable difference; instrument the smallest thing that can falsify it; verify the fix with the same reproduction and a regression test. A hypothesis that cannot fail is a guess wearing a lab coat.",
      "**Each observation tool answers a different question.** A log answers \"what happened, in order, for this request\". A trace answers \"where did this request spend time across services\". A profile answers \"which functions consume CPU, wall time or memory across many requests\". Use the cheapest tool that can discriminate between your current hypotheses, and do not instrument everything at once.",
      "**Measurement has units and biases.** cProfile records every call, so its overhead grows with call count and its absolute seconds are inflated; compare ratios on a fixed workload, not wall times from production. Sampling profilers trade exactness for low overhead. Wall time includes waiting; CPU time does not. A flame graph's width is time or sample share, and its vertical axis is stack depth, never time.",
      "**A fix is not proven until the same measurement changes.** Re-run the identical workload, seeds and repetitions; check correctness before speed; report the metric you optimised (CPU, wall, peak memory) and the variance. Then keep a regression test for the bug and, for performance, a benchmark that fails when the metric regresses.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Reproduce deterministically.** A bug you cannot reproduce is a rumour. Record the exact input, the seed, the Python version, installed packages, environment variables and the time window. Replace randomness with `random.Random(seed)` and freeze remote data in a fixture. Classify the failure: always, sometimes, once. \"Sometimes\" usually means time, ordering, concurrency, or state left by an earlier request; that classification decides whether a debugger or a log is the right instrument. For a performance report, record the workload size and the machine, because \"3 seconds\" without a workload is not a measurement.",
      "2. **Shrink before you stare.** Delta debugging removes input chunks while the failure persists; binary search over a list of candidate changes does the same for code; `git bisect` finds the commit that introduced the behaviour. The goal is a minimal case that still fails and is fast to run. Shrinking also sharpens the hypothesis: a 500-line JSON file becomes three records, and the trigger becomes visible. Write the failing test at this point, before the fix, so the reproduction survives the debugging session.",
      "3. **State one falsifiable hypothesis.** Write down what you expect to see before you instrument: \"the count is lost because the final run never reaches the else branch\", \"the handler sleeps on a downstream call\", \"the regex is compiled per tag\". Then choose the cheapest observation that distinguishes it from its rival. Change one variable at a time. Keep a short log of observation, hypothesis, experiment and result; it prevents looping and makes the eventual write-up trivial. Timebox each hypothesis so a wrong guess costs minutes, not an afternoon.",
      "4. **Read the stack trace from the failure outward.** Python prints the most recent call last. The last frame is the failure site; the frames above are the callers. The exception type and message are the claim; the frame's source line is the context. Chained exceptions matter: \"During handling of the above exception, another exception occurred\" means a second failure replaced the first, and \"The above exception was the direct cause\" comes from `raise ... from`. Use `traceback.TracebackException` or `logging.exception` to preserve the chain. C extensions and threads may omit frames; `faulthandler` can dump stacks on a segfault or timeout, and a traceback from a worker thread tells you which thread actually failed.",
      "5. **Understand what a breakpoint does.** pdb installs a trace function, stops the frame before the target line, and gives you a prompt with the frame's globals and locals. `p` evaluates an expression, `pp` pretty-prints, `where` prints the stack, `up` and `down` move between frames, `next` steps over calls, `step` enters them, `until` runs to a later line, and `jump` moves the instruction pointer (dangerous, but useful in a scratch session). Conditional breakpoints (`break 10, best > current`) keep you out of a hot loop. A debugger pauses one thread and changes timing, so a race can vanish while attached: that is a heisenbug, and logs or a sampling profiler are better witnesses.",
      "6. **Logs, traces and profiles are not interchangeable.** A log is an event at a chosen level; structured fields plus a request ID make it searchable, and lazy formatting (`log.debug(\"%s\", expensive())` is still eager; use `if log.isEnabledFor(...)` for expensive arguments) keeps disabled levels cheap. A trace is a set of spans with parent-child links and a shared trace ID; it crosses service boundaries and exposes queueing, retries and downstream latency. A profile is an aggregate inside one process. Logging every function call is a home-made, high-overhead profiler with no aggregation; tracing every request at full fidelity is expensive at scale, so production systems sample traces and keep errors.",
      "7. **Know how the profiler gets its numbers.** cProfile is deterministic: it hooks call and return events, counts them exactly, and charges self time (`tottime`) to the function and cumulative time (`cumtime`) to it plus its callees. Per-call overhead means a function called a million times looks worse than it is; recursion also complicates cumulative totals. Sampling profilers such as py-spy read another process's stacks at a fixed frequency (often 100 Hz), unwind Python frames without importing code into the target, and can show wall-clock time including time blocked off-CPU. That makes py-spy suitable for staging or production, where cProfile's overhead would change the behaviour you are measuring.",
      "8. **Read a flame graph by geometry, not colour.** Width is the share of samples or time; vertical position is stack depth; horizontal order is an arbitrary merge order, not chronology. Top-down, follow the wide path from the root: it shows the call chain that owns the time. Bottom-up (or an inverted/icicle graph), start from wide leaf frames: those are the functions doing the work or waiting. A wide shallow frame is a direct hotspot; a deep narrow tower is call overhead; a wide frame with a gap may be missing native frames or unresolved symbols. Compare two flame graphs from the same workload before and after a change rather than reading absolute widths as milliseconds.",
      "9. **Separate CPU from I/O, and current memory from peak.** If wall time is much larger than CPU time, the process is waiting: disk, network, a lock, a timer, garbage collection, or a downstream service. If wall and CPU are close, it is CPU-bound and a function-level profile is appropriate. For memory, `tracemalloc.start()` then `take_snapshot()` records Python allocations with tracebacks; `statistics(\"lineno\")` groups them, and comparing two snapshots finds growth. Tracemalloc does not see every allocation in C extensions, memory-mapped files or allocator arenas, so RSS can exceed traced memory. Measure peak as well as current: a short-lived 500 MB list can pass a final-memory check and still take the process down.",
    ],
    diagram: {
      title: "The debugging loop, not a straight line",
      nodes: [
        { label: "Reproduce", sub: "seeded, minimal" },
        { label: "Shrink", sub: "input or commit" },
        { label: "Hypothesise", sub: "one prediction" },
        { label: "Instrument", sub: "pdb, log, profile" },
        { label: "Verify", sub: "same measurement" },
      ],
      edges: ["same failure", "minimal case", "expected signal", "evidence"],
      caption: "Verification either confirms the fix or sends you back with a sharper hypothesis. The regression test and benchmark are what make the loop stop for good.",
    },
  },
  handsOn: [
    {
      title: "Reproduce it, then stop in the debugger",
      text: [
        "`study_streak` should return the longest run of `True`. For this week it returns 2, but the last three days are all `True`, so the answer should be 3. Start with the smallest failing input and set a breakpoint on the return line before changing anything.",
        "Save this as `buggy.py`, then run `python -m pdb buggy.py`. The commands used below, in order, were `break 10`, `continue`, `p days`, `p best`, `p current`, `p current > best`, `next`, `quit`. The transcript is real: the inputs print, `best` is 2 while `current` is 3, and stepping once shows the function returning 2.",
      ],
      code: {
        lang: "python",
        file: "buggy.py",
        code: `def study_streak(days: list[bool]) -> int:
    best = 0
    current = 0
    for d in days:
        if d:
            current += 1
        else:
            best = max(best, current)
            current = 0
    return best


if __name__ == "__main__":
    week = [True, True, False, True, True, True]
    print("streak:", study_streak(week))`,
      },
      output: `> c:\\users\\cored\\appdata\\local\\temp\\opencode\\debuglesson\\buggy.py(1)<module>()
-> def study_streak(days: list[bool]) -> int:
(Pdb) Breakpoint 1 at c:\\users\\cored\\appdata\\local\\temp\\opencode\\debuglesson\\buggy.py:10
(Pdb) > c:\\users\\cored\\appdata\\local\\temp\\opencode\\debuglesson\\buggy.py(10)study_streak()
-> return best
(Pdb) [True, True, False, True, True, True]
(Pdb) 2
(Pdb) 3
(Pdb) True
(Pdb) --Return--
> c:\\users\\cored\\appdata\\local\\temp\\opencode\\debuglesson\\buggy.py(10)study_streak()->2
-> return best
(Pdb) `,
      notes: [
        "The pause is at `return best`, and the frame already tells the story: `current` is 3, `best` is only 2, and `current > best` is `True`. A run that ends at the end of the list never reaches the `else`, so `best` is never updated for it. Fix it by updating `best` on every iteration, or by comparing once more after the loop. Paths and line numbers are from this machine; yours will differ.",
        "Core commands: `break 10` (or `b 10`, `b study_streak`), `p expr`, `pp expr`, `next` (over), `step` (into), `continue`, `until 20`, `where`, `up`, `down`, `q`. `python -m pdb -c continue script.py` runs until an exception and drops you into post-mortem mode, where `p` works on the failing frame.",
        "A debugger changes timing. If the bug disappears while attached, do not conclude it is gone: add structured logs around the ordering you suspect, or sample the stacks with py-spy. Never merge a breakpoint or a stray `pdb.set_trace()` into production code.",
      ],
    },
    {
      title: "Profile the slow function instead of guessing",
      text: [
        "This tag counter processes 60,000 seeded events with one to three tags each. It looks ordinary, but it compiles the same regular expression for every tag and then matches it. cProfile sorts by `tottime`, the time spent in the function itself rather than in its callees.",
        "Save this as `profile_tags.py` and run `python profile_tags.py`. Read the `ncalls` column first: 119,902 calls to `re.compile` come from roughly 120,000 tags.",
      ],
      code: {
        lang: "python",
        file: "profile_tags.py",
        code: `import cProfile
import io
import pstats
import random
import re

TAGS = ["python", "debugging", "profiling", "testing", "async",
        "sql", "http", "git", "docker", "types"]


def make_events(n: int = 60000, seed: int = 7) -> list[dict]:
    rnd = random.Random(seed)
    events = []
    for i in range(n):
        k = rnd.randint(1, 3)
        events.append({"id": i, "tags": [rnd.choice(TAGS) for _ in range(k)]})
    return events


def top_tags(events: list[dict], limit: int = 5) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for event in events:
        for tag in event["tags"]:
            tag = tag.strip().lower()
            pattern = re.compile(r"^[a-z0-9-]+$")
            if not pattern.match(tag):
                continue
            counts[tag] = counts.get(tag, 0) + 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]


if __name__ == "__main__":
    events = make_events()
    profiler = cProfile.Profile()
    profiler.enable()
    top_tags(events)
    profiler.disable()
    stream = io.StringIO()
    pstats.Stats(profiler, stream=stream).strip_dirs().sort_stats("tottime").print_stats(8)
    print(stream.getvalue())`,
      },
      output: `         839520 function calls (839516 primitive calls) in 0.228 seconds

   Ordered by: internal time
   List reduced from 56 to 8 due to restriction <8>

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.108    0.108    0.228    0.228 profile_tags.py:20(top_tags)
   119902    0.033    0.000    0.045    0.000 __init__.py:272(_compile)
   119902    0.025    0.000    0.025    0.000 {method 'match' of 're.Pattern' objects}
   119902    0.023    0.000    0.068    0.000 __init__.py:225(compile)
   119927    0.012    0.000    0.012    0.000 {built-in method builtins.isinstance}
   119904    0.011    0.000    0.011    0.000 {method 'get' of 'dict' objects}
   119902    0.008    0.000    0.008    0.000 {method 'lower' of 'str' objects}
   119902    0.007    0.000    0.007    0.000 {method 'strip' of 'str' objects}`,
      notes: [
        "`tottime` is self time; `cumtime` includes callees. `re.compile` costs 0.068 s cumulative, about 30% of the 0.228 s run, and `match` adds 0.025 s. `top_tags` itself has the largest self time (0.108 s) because the loop, sort and dict operations live there. The profile names the mechanism; it does not suggest an index or a bigger server.",
        "cProfile is deterministic and instruments every call, so its seconds are inflated and biased toward functions called very often. Use it on a fixed, reproducible workload and compare ratios before and after. For a file-based profile: `python -m cProfile -o tags.prof profile_tags.py`, then `python -m pstats tags.prof` and `sort tottime`.",
        "The obvious fixes are to compile the pattern once at module level, cache validation per unique raw tag, and replace the manual counting dict with `collections.Counter`. Verify each step; do not stack three changes and guess which one helped.",
      ],
    },
    {
      title: "Measure memory, then prove the fix with the same workload",
      text: [
        "Before optimising, capture the memory cost of keeping a normalised copy of every tag for every event: a plausible \"cache\" that saves CPU and quietly multiplies allocations. Then time the slow and fast implementations on the same seeded events, checking that they return the same answer.",
        "`time.perf_counter()` measures wall time; `time.process_time()` measures CPU time. Both implementations are CPU-bound here, so the two should be close. Taking the minimum of seven runs reduces interference from the operating system, which is more honest for a CPU-bound microbenchmark than a single sample.",
      ],
      code: {
        lang: "python",
        file: "bench_tags.py",
        code: `import re
import time
import tracemalloc
from collections import Counter

from profile_tags import make_events, top_tags

VALID_TAG = re.compile(r"^[a-z0-9-]+$")


def top_tags_fast(events: list[dict], limit: int = 5) -> list[tuple[str, int]]:
    counts: Counter[str] = Counter()
    normalised: dict[str, str] = {}
    for event in events:
        for raw in event["tags"]:
            tag = normalised.get(raw)
            if tag is None:
                candidate = raw.strip().lower()
                tag = candidate if VALID_TAG.match(candidate) else ""
                normalised[raw] = tag
            if tag:
                counts[tag] += 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]


events = make_events()

tracemalloc.start()
cache = {e["id"]: [t.strip().lower() for t in e["tags"]] for e in events}
snapshot = tracemalloc.take_snapshot()
current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"cached rows: {len(cache)}, peak traced memory: {peak / 1024 / 1024:.1f} MiB")
print("top allocations by line:")
for stat in snapshot.statistics("lineno")[:4]:
    frame = stat.traceback[0]
    name = frame.filename.replace("\\\\", "/").rsplit("/", 1)[-1]
    print(f"  {name}:{frame.lineno:<3} {stat.size / 1024:7.0f} KiB  {stat.count:>6} blocks")


def bench(fn, runs: int = 7) -> tuple[float, float]:
    wall, cpu = [], []
    for _ in range(runs):
        w0, c0 = time.perf_counter(), time.process_time()
        fn(events)
        wall.append((time.perf_counter() - w0) * 1000)
        cpu.append((time.process_time() - c0) * 1000)
    return min(wall), min(cpu)


assert top_tags(events) == top_tags_fast(events)
slow_wall, slow_cpu = bench(top_tags)
fast_wall, fast_cpu = bench(top_tags_fast)
print(f"slow top_tags : wall {slow_wall:6.1f} ms   cpu {slow_cpu:6.1f} ms   (best of 7)")
print(f"fast top_tags : wall {fast_wall:6.1f} ms   cpu {fast_cpu:6.1f} ms   (best of 7)")
print(f"speedup       : wall {slow_wall / fast_wall:5.1f}x    cpu {slow_cpu / fast_cpu:5.1f}x")`,
      },
      output: `cached rows: 60000, peak traced memory: 13.8 MiB
top allocations by line:
  bench_tags.py:29    14121 KiB  239903 blocks
  tracemalloc.py:558       0 KiB       1 blocks
slow top_tags : wall   65.2 ms   cpu   62.5 ms   (best of 7)
fast top_tags : wall   17.4 ms   cpu   15.6 ms   (best of 7)
speedup       : wall   3.7x    cpu   4.0x`,
      notes: [
        "Line 29 is the cache comprehension: 14,121 KiB across 239,903 blocks. That is the price of one small list per event plus a normalised string per tag. The fast version caches only the ten distinct raw tags, not 60,000 rows. Tracemalloc reports Python allocations; it does not include every C-extension buffer or allocator arena, so compare it with process RSS rather than treating it as total memory.",
        "Wall and CPU are close (65.2 vs 62.5 ms slow, 17.4 vs 15.6 ms fast), so the work is CPU-bound. If you saw wall 900 ms and CPU 60 ms, you would stop profiling functions and look at I/O, locks, timers, garbage collection or downstream calls instead.",
        "The `assert` is part of the experiment: it prevents a fast-but-wrong result from looking like a win. The 4x speedup comes from removing 119,902 regex compilations and 119,902 validations, not from a faster machine. Rerun on your own machine and report the numbers you observe.",
      ],
    },
    {
      title: "Choose the lens: logs, traces, profiles",
      text: [
        "Logs, traces and profiles overlap in what they can reveal, but each is cheapest at one question. Pick the tool that can falsify your current hypothesis with the least new overhead. The second table below is the one people skip: without separating wall time from CPU time, you can profile the wrong system entirely.",
      ],
      code: {
        lang: "text",
        file: "observability.txt",
        code: `Tool        Question answered                                  Unit                     Overhead                  Best for
logging     What happened, in order, for this request?         event + level            low until volume; sync I/O notable    exceptions, audit trail, ordering
tracing     Where did this request spend time across services? span (start, end, parent) medium; often sampled   distributed latency, queues, retries
profiling   Which functions consume CPU, time or memory?       samples or call counts   high for deterministic, low for sampling  local hotspots, memory growth

Timing
wall time   elapsed clock; includes waiting
CPU time    time actually executing on a CPU
wall >> CPU I/O, locks, sleep, GC, downstream calls: do not start with a function profiler
wall ~ CPU  CPU-bound: function and line profiling are appropriate

Profilers
cProfile    every call and return; exact counts; high overhead; call-count bias
py-spy      periodic stack samples; low overhead; attaches to a running process; wall-clock and native frames`,
      },
      notes: [
        "For one slow request, start with its trace or structured logs and compare span durations. For a service that is slow for everyone, profile a representative workload. cProfile is ideal for a reproducible local case; py-spy is the tool you reach for in staging or production, where attaching a deterministic profiler would change the timing.",
        "Logging can become the bottleneck: synchronous handlers, formatting huge objects, and emitting DEBUG in a hot loop all cost wall time. Trace sampling keeps cost bounded. A profile without a workload description cannot be compared with any other profile.",
      ],
    },
    {
      title: "Close the loop, and make the fix permanent",
      text: [
        "A debugging session is a loop, not a checklist. Each pass should end with evidence: a value in a frame, a changed profile row, a timing difference. If the evidence contradicts the hypothesis, discard the hypothesis rather than explaining it away. The final step is what stops the same bug from returning: a regression test for correctness and, for performance, a benchmark with a threshold.",
      ],
      code: {
        lang: "mermaid",
        file: "debug-loop.mmd",
        code: `flowchart LR
  R[Reproduce] --> S[Shrink]
  S --> H[Hypothesise]
  H --> I[Instrument]
  I --> V{Verify}
  V -->|contradicted| H
  V -->|confirmed| G[Guard with test]
  G --> D[Done]`,
      },
      notes: [
        "Timebox a hypothesis (20 minutes is a reasonable default) and write the expected observation before you instrument. An unfalsifiable hypothesis, such as \"the database is slow\", produces activity without information.",
        "Verify with the same reproduction and the same benchmark you used before the change. Then delete temporary print statements and debugger hooks, but keep the test, the benchmark and a short note recording the workload, metric and result.",
        "The loop works for performance too. \"The database is slow\" is a hypothesis; a trace showing a 2.4 s span around one query is evidence; a profile showing the query is fast but the serialisation is slow rejects it and sharpens the next pass.",
      ],
    },
  ],
  companies: [
    "**CPython core team (verified in this lesson):** the `pdb`, `cProfile` and `tracemalloc` modules used here ship with CPython 3.11.15, the interpreter that produced every transcript in this lesson. They need no third-party service, which is why they are the default first instruments on a developer machine. `pdb` is built on `bdb` and `sys.settrace`; `cProfile` is a C extension that records call events; `tracemalloc` traces Python allocations and keeps tracebacks.",
    "**Microsoft (illustrative):** the VS Code Python extension's debugger is built on debugpy and exposes the same concepts as pdb: breakpoints by line and condition, watch expressions, call-stack navigation and variable inspection. Teams often move from a terminal pdb session to an IDE when they need to inspect nested objects, but the mental model and the commands map one-to-one.",
    "**Sentry (illustrative):** error monitoring groups stack traces into issues, attaches breadcrumbs and request context, and can link a slow transaction to a profile. The useful part for this lesson is the discipline it enforces: an error report without the input, the version and the surrounding events is hard to reproduce, so the tooling captures them automatically.",
    "**Datadog (illustrative):** APM traces spans across services and a continuous profiler aggregates CPU and wall-clock samples; vendor documentation describes correlating a slow trace with the flame graph of the service that produced it. That combination is the production version of the local loop: trace to find the service, profile to find the function.",
    "**Grafana Labs (illustrative):** Pyroscope stores continuous CPU profiles and renders them as flame graphs, which is useful when a process cannot be paused under a debugger. It also illustrates the sampling trade-off: low overhead and always-on coverage, at the cost of statistical rather than exact call counts.",
  ],
  mistakes: [
    { mistake: "Optimising the first plausible cause", why: "An index or a cache is a concrete action, and action feels like progress", wrong: "Days of work on the database while the profile shows regex compilation in your own loop", fix: "Reproduce and measure first; change the largest measured cost, then re-measure" },
    { mistake: "Reading cumtime as if it were self time", why: "The biggest number in the table looks like the hottest function", wrong: "You rewrite a wrapper whose cumtime is high only because it calls the real hotspot", fix: "Use tottime for self cost and cumtime for call paths; open the callee rows before editing" },
    { mistake: "Trusting cProfile's absolute seconds", why: "The output looks like a precise measurement", wrong: "You conclude a function is 40% of production time when most of that is profiler overhead on millions of calls", fix: "Compare ratios on a fixed workload, or use a sampling profiler with low overhead" },
    { mistake: "Timing once, with no warm-up and no repeats", why: "One run is fast to produce and easy to paste into a report", wrong: "The first run includes imports and cold caches, and OS noise makes a 2x claim meaningless", fix: "Warm up, run several times, report min or median plus the workload and machine" },
    { mistake: "Using wall time as if it were CPU time", why: "A stopwatch is the obvious way to measure duration", wrong: "You optimise a CPU loop when 85% of the wall time is a downstream call or a lock", fix: "Measure both; if wall is much larger than CPU, investigate waiting before functions" },
    { mistake: "Logging everything and calling it observability", why: "More logs feel safer, and disk is cheap", wrong: "Synchronous logging dominates the request, secrets and personal data leak into logs, and finding the signal becomes impossible", fix: "Use levels, structured fields, sampling, correlation IDs and redaction; log decisions, not every loop iteration" },
    { mistake: "Debugging a race with a breakpoint", why: "The debugger is the tool you already know", wrong: "The extra pause hides the interleaving, the bug disappears, and you ship it again", fix: "Use logs with timestamps and thread/process IDs, stress the schedule, or sample stacks; treat a vanishing bug as evidence about timing" },
    { mistake: "Fixing without a regression test or a re-measurement", why: "The symptom is gone and the team moves on", wrong: "The same bug returns, or a fast-but-wrong fix passes review", fix: "Keep the minimal reproduction as a test, assert correctness, and re-run the same benchmark before declaring the performance fix done" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Write the failing test before the fix, keep the minimal reproduction, and verify with the same input, seed and environment that exposed the bug." },
    { tag: "Maintainability", text: "Keep a short hypothesis log (observation, hypothesis, experiment, result) and delete temporary instrumentation; leave the test and the benchmark behind." },
    { tag: "Performance", text: "Measure wall and CPU time, profile before optimising, compare ratios on a fixed workload, and report the metric you actually improved." },
    { tag: "Cost", text: "Use low-overhead sampling in production, sample traces, and keep verbose logs and tracemalloc snapshots for staging or a bounded investigation." },
    { tag: "Security", text: "Redact secrets and personal data from logs, traces and profiles: a stack frame can contain request bodies, tokens and file paths, and profiles are often uploaded to shared services." },
  ],
  interview: [
    { q: "A production endpoint is slow, but CPU is low. How do you investigate?", a: "Start by defining the workload and the metric: which endpoint, which request size, what latency, and for which users. Then separate waiting from computing. A trace of one representative request is the cheapest first step: it shows time in the handler, in database spans, in downstream calls and in queueing. If the trace shows a large span around a dependency, the bottleneck is there; if it shows time unaccounted for inside the service, sample the stacks with py-spy, including idle/off-CPU time, to see whether threads are blocked on a lock, a socket, a timer or the GIL. Low CPU with high wall time is the signature of waiting, not of a hot loop, so cProfile would be the wrong first instrument. Once you have a hypothesis, reproduce locally with the same payload, use cProfile for CPU-bound code or I/O instrumentation for waits, fix the largest measured contributor, and verify with the same trace and latency percentiles." },
    { q: "How do you debug a bug you cannot reproduce?", a: "Treat reproduction as the first deliverable. Capture everything that defines the failing case: exact input, request ID, user/tenant, Python and package versions, environment variables, feature flags, time window and the sequence of preceding requests. Add structured logs with a correlation ID and log decisions and state transitions rather than \"entered function\". Compare a working and a failing case to find the smallest difference; shrink the input with delta debugging and, for a regression, use git bisect to find the commit. If it is intermittent, classify it: concurrency, ordering, a cache with stale state, a timeout, or data left by an earlier request. Stress the suspected schedule, increase logging around it, and consider a sampling profiler or faulthandler rather than a breakpoint, which changes timing. Once reproduced, freeze it as a test before touching the fix." },
    { q: "Explain cProfile tottime versus cumtime, and when you would use a sampling profiler instead.", a: "In pstats, `tottime` is the time spent in the function's own bytecode, excluding calls it makes; `cumtime` is the time in the function plus everything it called. Sort by tottime to find leaf hotspots, and by cumtime to understand which call paths own the total time. cProfile is deterministic: it records every call and return, so counts are exact, but per-call overhead inflates functions called very often, and recursion complicates cumulative accounting. That makes it excellent for a reproducible local workload and a poor fit for production. A sampling profiler such as py-spy snapshots stacks at a fixed rate, so overhead stays low, it can attach to a running process without importing code into it, and it can measure wall-clock time including time blocked off-CPU. The trade-off is statistical noise: short functions may never be sampled, and counts are estimates. Use cProfile to explain a known CPU-bound case precisely; use py-spy when you need the real production behaviour, are chasing I/O or lock waits, or cannot afford to perturb the process." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A pstats table sorted by `tottime` shows `parse` with high `tottime` but low `cumtime`. What does that mean?",
      options: ["`parse` burns CPU in its own code", "`parse` spends most of its time waiting for callees", "`parse` is blocked on I/O", "`parse` is never called"],
      answer: 0,
      explanation: "`tottime` excludes callees, so high self time with low cumulative time means the function's own work is the cost. Waiting would show up as wall time, not self CPU time.",
    },
    {
      kind: "output",
      prompt: "A request takes 900 ms of wall time and 70 ms of CPU time. What should you investigate next?",
      options: ["A tighter loop in the handler", "I/O, locks, timers, GC or downstream calls", "A faster regex", "The size of the Python bytecode cache"],
      answer: 1,
      explanation: "Wall time far above CPU time means the process is waiting, not computing. Function-level CPU profiling is not the first tool; look at spans, blocking calls and off-CPU samples.",
    },
    {
      kind: "bug",
      prompt: "At `return best`, pdb shows `best = 2` and `current = 3`, and the input ends with three `True` values. What is the bug?",
      options: ["`best` is never updated for a run that ends at the end of the list", "`current` is counted twice", "The input list is mutated", "The loop skips every third element"],
      answer: 0,
      explanation: "The update to `best` only happens in the `else` branch. A run that finishes at the end of the list never reaches it, so the final `current` is discarded.",
    },
  ],
  cheatSheet: [
    "Loop: reproduce → shrink → hypothesise → instrument → verify → guard with a test.",
    "Stack trace: Python prints the most recent call last. The last frame is the failure site; walk upward for the path.",
    "pdb: `b file:line`, `b func`, `b 10, x > 3`, `p`/`pp`, `n`, `s`, `c`, `until`, `where`, `up`/`down`, `q`.",
    "cProfile: `tottime` = self time; `cumtime` = self plus callees. Sort by tottime for hotspots, cumtime for paths.",
    "cProfile overhead grows with call count; compare ratios on a fixed workload, never absolute production seconds.",
    "py-spy: sampling, low overhead, attaches to a running process, can show wall-clock and off-CPU waits.",
    "Flame graph: width = time or sample share, y = stack depth, x = merge order. Top-down for the path, bottom-up for wide leaves.",
    "tracemalloc: `start()`, `take_snapshot()`, `statistics(\"lineno\")`; current and peak; Python allocations only, not all RSS.",
    "Wall >> CPU means waiting; wall ≈ CPU means CPU-bound. Measure both before choosing a profiler.",
    "Prove the fix with the same benchmark and a regression test; delete the temporary instrumentation.",
  ],
  deeper: [
    { label: "Python docs: pdb — the Python debugger", url: "https://docs.python.org/3/library/pdb.html" },
    { label: "Python docs: profile and cProfile", url: "https://docs.python.org/3/library/profile.html" },
    { label: "Python docs: tracemalloc", url: "https://docs.python.org/3/library/tracemalloc.html" },
    { label: "py-spy: a sampling profiler for Python", url: "https://github.com/benfred/py-spy" },
    { label: "Brendan Gregg: flame graphs", url: "https://www.brendangregg.com/flamegraphs.html" },
    { label: "OpenTelemetry: Python instrumentation", url: "https://opentelemetry.io/docs/languages/python/" },
  ],
  homework: {
    basic: {
      title: "Fix the streak and prove it",
      brief: [
        "Run `buggy.py` under pdb, record `best` and `current` at the return line, then fix the function so a run that ends at the end of the list is counted.",
        "Add cases for an all-True list and an all-False list, and keep the original week as a regression case.",
      ],
      criteria: ["The pdb transcript shows the failing values", "The fixed function returns 3, 4 and 0 for the three cases", "The original failing input remains as a test case"],
      hints: ["Compare `best` with `current` after the loop, or update `best` on every iteration.", "Check the empty list too: what should the answer be?"],
      solution: {
        text: [
          "The bug is an update that only runs in the `else` branch. Updating `best` after every iteration is simpler than adding a special case after the loop, and it also handles an empty list correctly.",
          "The output below is from the fixed script on this machine. The three cases cover a run at the end, a run covering the whole list, and no study days at all.",
        ],
        code: {
          lang: "python",
          file: "fixed_streak.py",
          code: `def study_streak(days: list[bool]) -> int:
    best = 0
    current = 0
    for d in days:
        current = current + 1 if d else 0
        best = max(best, current)
    return best


if __name__ == "__main__":
    print("week:", study_streak([True, True, False, True, True, True]))
    print("all studied:", study_streak([True] * 4))
    print("none:", study_streak([False, False]))`,
        },
        output: "week: 3\nall studied: 4\nnone: 0",
        pitfalls: ["Adding `max` only after the loop without handling the empty list", "Changing the input to make the test pass", "Deleting the failing case after the fix"],
      },
    },
    intermediate: {
      title: "Write a profile report, not a guess",
      brief: [
        "Profile `top_tags` and name the three largest costs with their `tottime` and `cumtime` values. Propose two fixes, apply one at a time, and measure each on the same 60,000-event workload.",
        "Your report should distinguish the cost of regex compilation, the cost of matching, and the cost of the counting loop.",
      ],
      criteria: ["Numbers quoted from the profile, not estimated", "One change per measurement with a before/after ratio", "A correctness check for every variant"],
      hints: ["A module-level compiled pattern removes the repeated `re.compile` calls.", "There are only ten distinct raw tags; caching validation is bounded by that vocabulary."],
      solution: {
        text: [
          "The baseline spends about 0.068 s in `re.compile` (cumulative) and 0.025 s in `match` for roughly 120,000 tags. The counting loop is the other large self-time block. Compiling once and caching validation by raw tag removes the compile and match work; `Counter` makes the counting intent explicit.",
          "Measure each variant against the baseline on the same seeded events, and assert that all variants return the same top tags. A report that says \"faster\" without the workload and the metric is not reproducible.",
        ],
        code: {
          lang: "python",
          file: "profile_report.py",
          code: `import cProfile
import io
import pstats
import re
import time
from collections import Counter

from profile_tags import make_events, top_tags

VALID = re.compile(r"^[a-z0-9-]+$")


def precompiled(events: list[dict], limit: int = 5) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for event in events:
        for tag in event["tags"]:
            tag = tag.strip().lower()
            if VALID.match(tag):
                counts[tag] = counts.get(tag, 0) + 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]


def cached(events: list[dict], limit: int = 5) -> list[tuple[str, int]]:
    counts: Counter[str] = Counter()
    normalised: dict[str, str] = {}
    for event in events:
        for raw in event["tags"]:
            tag = normalised.get(raw)
            if tag is None:
                candidate = raw.strip().lower()
                tag = candidate if VALID.match(candidate) else ""
                normalised[raw] = tag
            if tag:
                counts[tag] += 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]


events = make_events()
expected = top_tags(events)
variants = {"precompiled": precompiled, "cached": cached}
for name, fn in variants.items():
    assert fn(events) == expected, name

profiler = cProfile.Profile()
profiler.enable()
top_tags(events)
profiler.disable()
stream = io.StringIO()
pstats.Stats(profiler, stream=stream).strip_dirs().sort_stats("tottime").print_stats(5)
print(stream.getvalue())

for name, fn in variants.items():
    best = min(
        (lambda: (lambda t0: (fn(events), time.perf_counter() - t0)[1])(time.perf_counter()))()
        for _ in range(5)
    )
    print(f"{name:12} {best * 1000:7.1f} ms (best of 5)")`,
        },
        pitfalls: ["Optimising the sort when compilation is the measured cost", "Skipping the equality check and changing the output", "Reporting one noisy run instead of repeated measurements"],
      },
    },
    challenge: {
      title: "Build a reproducible benchmark harness",
      brief: [
        "Write a harness that fixes the seed and workload size, warms up each variant, runs several repetitions, and reports min, median and p95 wall time plus peak traced memory. It must fail loudly if two variants disagree.",
        "Emit a JSON artifact with the workload, machine-independent configuration and all metrics so two runs can be compared without pasting tables into a document.",
      ],
      criteria: ["Seed and workload are explicit and identical for every variant", "Warm-up and multiple repetitions with a stated statistic", "A correctness assertion and a JSON artifact"],
      hints: ["Separate data generation from the timed region.", "Use `time.perf_counter` for wall time and `tracemalloc` around one isolated run, not during the timed loops."],
      solution: {
        text: [
          "The harness keeps the workload definition in one place, generates it once, and times only the function under test. Reporting min and median makes noise visible; p95 is useful for latency but needs more samples than a microbenchmark usually takes.",
          "Peak memory is measured in a separate pass because tracemalloc itself slows execution. The equality assertion turns a fast-but-wrong optimisation into a failure instead of a result.",
        ],
        code: {
          lang: "python",
          file: "harness.py",
          code: `import json
import platform
import statistics
import time
import tracemalloc

from profile_tags import make_events, top_tags
from bench_tags import top_tags_fast

EVENTS = make_events(60000, seed=7)
VARIANTS = {"slow": top_tags, "fast": top_tags_fast}


def percentiles(samples: list[float]) -> dict[str, float]:
    ordered = sorted(samples)
    p95 = ordered[min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1))))]
    return {"min_ms": min(ordered), "median_ms": statistics.median(ordered), "p95_ms": p95}


def measure(fn, runs: int = 9, warmup: int = 2) -> dict[str, float]:
    for _ in range(warmup):
        fn(EVENTS)
    samples = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn(EVENTS)
        samples.append((time.perf_counter() - t0) * 1000)
    return percentiles(samples)


expected = top_tags(EVENTS)
for name, fn in VARIANTS.items():
    assert fn(EVENTS) == expected, f"{name} produced a different result"

report = {"python": platform.python_version(), "events": len(EVENTS), "seed": 7, "variants": {}}
for name, fn in VARIANTS.items():
    tracemalloc.start()
    fn(EVENTS)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    report["variants"][name] = measure(fn) | {"peak_mib": peak / 1024 / 1024}

print(json.dumps(report, indent=2))`,
        },
        pitfalls: ["Including data generation in the timed region", "Measuring memory while tracemalloc slows the run", "No correctness assertion", "Reporting a single run"],
      },
    },
    capstone: {
      title: "DevAtlas: a reproducible debugging and profiling workflow",
      brief: [
        "Create one command that reproduces a seeded DevAtlas case, captures a non-interactive pdb transcript, writes a cProfile artifact and a tracemalloc/benchmark report, and runs the regression tests.",
        "Document where each artifact lives, how to compare two benchmark runs, and how to attach py-spy in staging without changing application code.",
      ],
      criteria: ["A single script or Make target reproduces every artifact from a clean checkout", "pdb, cProfile and benchmark outputs are saved under `artifacts/`", "The benchmark compares before and after with correctness checks", "The runbook states how to attach py-spy and how to redact sensitive data"],
      hints: ["Feed pdb commands from a file so the run is non-interactive.", "Use `python -m cProfile -o` and `pstats` rather than parsing human-readable text.", "Keep the benchmark workload seeded and separate from artifact formatting."],
      solution: {
        text: [
          "The workflow below is deliberately boring: one entry point, deterministic inputs, artifacts with timestamps, and tests that run after the measurements. A teammate can reproduce a report without reconstructing your shell history.",
          "`repro.sh` expects `buggy.py`, `pdbcmds.txt`, `profile_tags.py`, `bench_tags.py`, `harness.py` and a pytest suite in the repository root. The pdb commands file contains `break 10`, `continue`, `p best`, `p current` and `quit`. The comparison step in the runbook is a diff of two JSON reports from the same workload, never a table copied from a terminal.",
        ],
        code: {
          lang: "bash",
          file: "repro.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="artifacts/$STAMP"
mkdir -p "$OUT"

python -m pdb buggy.py < pdbcmds.txt > "$OUT/pdb.txt" 2>&1 || true
python profile_tags.py > "$OUT/profile.txt"
python bench_tags.py > "$OUT/bench.txt"
python harness.py > "$OUT/harness.json"

python -m pytest -q | tee "$OUT/tests.txt"

printf 'artifacts in %s\\n' "$OUT"`,
        },
        pitfalls: ["Using a breakpoint in the production path", "Letting pdb wait for input in CI", "Storing profiles that contain secrets or personal data", "Comparing benchmarks from different workloads"],
      },
    },
  },
  nextPreview: "Next: JavaScript and TypeScript, starting with the event loop and async/await.",
};
