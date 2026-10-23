import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.3",
  title: "Async Python and packaging",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["1.1.2 OOP, dataclasses and protocols", "1.2.1 is helpful (same event-loop idea in JavaScript)"],
  summary: "Use asyncio to run many I/O tasks concurrently with timeouts and limits, understand what the event loop can and cannot speed up, and package a project properly with pyproject.toml and a wheel.",
  terms: [
    { term: "Coroutine", def: "A function declared with `async def`. Calling it does not run the body; it returns a coroutine object that runs when awaited or scheduled as a Task, and can pause at each await." },
    { term: "Event loop", def: "The single-threaded scheduler at the centre of asyncio. It runs ready callbacks, asks the OS which sockets are ready, and resumes the coroutine waiting on each one. Between awaits, one coroutine runs to completion." },
    { term: "await", def: "A suspension point. It hands control back to the event loop until the awaited operation finishes, then resumes this coroutine where it stopped. Awaiting is sequential: it does not start a second copy of anything." },
    { term: "Task", def: "A coroutine wrapped and scheduled on the loop by `asyncio.create_task` or a TaskGroup. It starts eagerly, runs concurrently with the caller, and holds a result, an exception and a cancellation state." },
    { term: "GIL", def: "Global Interpreter Lock. In standard CPython only one thread runs Python bytecode at a time, so threads do not speed up pure-Python CPU work. They do help blocking I/O because the lock is released during system calls. Free-threaded builds exist from 3.13 but are optional." },
    { term: "Semaphore", def: "A counter with a wait queue. `async with sem` decrements on entry and increments on exit, blocking when the count is zero. It bounds how many operations are in flight, not how many tasks exist." },
    { term: "Cancellation", def: "A request, delivered as `CancelledError` at a task's next await, to stop it. It is cooperative: code that never awaits cannot be interrupted, and `CancelledError` derives from `BaseException`, so it must normally be re-raised after cleanup." },
    { term: "TaskGroup", def: "Structured concurrency from Python 3.11. Tasks created inside `async with asyncio.TaskGroup()` must all finish before the block exits; if one fails, the rest are cancelled and the failures surface together as an `ExceptionGroup`." },
    { term: "pyproject.toml", def: "The standard project file (PEP 518 and PEP 621). `[build-system]` names the build backend; `[project]` holds name, version, dependencies and entry points; `[tool.*]` configures pytest, mypy and friends." },
    { term: "src layout", def: "Putting importable code in `src/<package>/` and tests outside it. The project root is then not importable, so tests only pass when the package is installed, which catches missing files and packaging mistakes early." },
    { term: "Wheel", def: "A built distribution: a zip of the package plus `<name>-<version>.dist-info/` metadata. Installing a wheel is an unzip, not a build. `py3-none-any` means pure Python, any OS and CPU." },
    { term: "venv", def: "A directory holding its own interpreter link and `site-packages`. It isolates one project's dependencies from the system Python and from other projects; `pip install -e .` links your source into it for development." },
  ],
  problem: [
    "The DevAtlas news ingester fetches 50 RSS feeds one after another. Each takes about 400 ms, almost all of it waiting on the network, so a run takes 20 seconds while the CPU sits idle. One slow feed occasionally hangs for minutes and blocks every feed behind it. Adding CPU or threads does not fix a program that spends its life waiting; changing how it waits does.",
    "Separately, a teammate clones the repository and cannot run the service: they do not know which packages to install, imports fail depending on which directory they run from, and the version that works on your laptop is not the version in production. Async is about concurrency; packaging is about making that code reproducible for someone else. This lesson measures both instead of trusting either.",
  ],
  concept: {
    analogy: [
      "One waiter serving 50 tables. A synchronous waiter takes an order, walks to the kitchen, **stands there until the food is ready**, serves it, then goes to the next table. An async waiter takes an order, hands it to the kitchen, and **serves other tables while the food cooks**. Same single waiter, far more tables served, as long as most of the time is spent waiting on the kitchen (I/O). If the waiter stops to cook a dish personally, every table waits: that is a blocking call on the event loop.",
      "For packaging, think recipe card versus meal kit. Your source tree is a **recipe card**: it describes the dish but depends on your kitchen, your pans and your ingredient versions. A **wheel** is a sealed meal kit: the exact ingredients, labelled and ready to reheat. A venv is a clean kitchen, and `pyproject.toml` is the label that says what is inside and what it needs.",
    ],
    precise: [
      "asyncio buys **I/O concurrency, not CPU speed**. Fifty requests of 400 ms take about 20 s sequentially and about 0.4 s plus overhead concurrently, because the waits overlap. The same change does nothing for a CPU-bound loop: with no await, there is no point at which the loop can switch. The gain is throughput - more operations in flight, so more completed per second - and it does not make any single request faster. If a request needs three dependent 100 ms calls, async helps only if they can be issued together; otherwise it is still 300 ms.",
      "The event loop is one thread running a ready queue plus an OS selector (epoll on Linux, kqueue on macOS, IOCP on Windows). A coroutine runs until it awaits or returns; awaiting a socket registers the file descriptor with the selector and suspends the task. When the OS reports readiness, a callback schedules the task again. There is no preemption, so a long computation starves every other task just as surely as `time.sleep` does. Tasks are the unit of scheduling; awaiting a coroutine directly runs it inside the current task and creates no concurrency.",
      "Coordination has three separate concerns. **Fan-out**: `asyncio.gather` runs awaitables concurrently and returns results in input order; `TaskGroup` gives structured concurrency, cancelling siblings when one fails. **Backpressure**: a `Semaphore(n)` caps how many operations are in flight, while an `asyncio.Queue(maxsize)` with worker tasks caps memory for streams. **Deadlines and cancellation**: `asyncio.timeout` or `wait_for` cancel the work and raise `TimeoutError`, and cancellation is cooperative, so cleanup runs in `finally` and `CancelledError` must be re-raised.",
      "Packaging is a separate discipline: `pyproject.toml` declares the build backend and metadata, a `src/` layout makes the installed package the only importable one, and a venv isolates dependencies. `python -m build` produces an sdist and a wheel; the wheel is what you install and promote. `[project.scripts]` turns a function into a console command. A floor like `httpx>=0.27` is not a reproduction; a lock file or exact pins plus hashes is.",
    ],
  },
  underTheHood: {
    text: [
      "**What the win actually is.** Time a sequential run and a concurrent run of the same 50 waits. Sequential: 50 x 400 ms plus overhead, about 20 s. Concurrent: roughly 400 ms plus scheduling and connection overhead, because all 50 waits overlap. That is a 40x wall-clock improvement with no extra CPU. Now replace the waits with SHA-256 chains: the concurrent version takes the same time as sequential, because every task computes until it finishes and never yields. Async optimises **waiting**, so measure the fraction of time spent waiting before choosing it.",
      "**Inside the loop.** `asyncio.run` creates a loop and drives it until the main coroutine finishes. Each iteration computes a timeout from the nearest timer, calls the selector's `select(timeout)`, processes ready I/O events, then runs the callbacks they scheduled. A socket read registers its file descriptor with `add_reader`; when the descriptor is ready, the callback sets the future's result, which schedules the waiting task. Timers (sleeps and timeouts) live in a heap ordered by deadline. Everything happens on one thread, so tasks need no locks between awaits, but nothing runs in parallel either.",
      "**Coroutine, Future, Task.** Calling an `async def` function returns a coroutine object and runs none of the body; forgetting to await it produces the `coroutine was never awaited` warning and zero work. A Future is a placeholder for a result. A Task wraps a coroutine and drives it on the loop; `create_task` schedules it to start soon, not immediately. `gather` wraps its awaitables in tasks for you. Keep a strong reference to every task you create: a task with no reference can be garbage-collected mid-flight, and its exception may never be retrieved. Store fire-and-forget tasks in a set and discard them in a done callback, or use a TaskGroup.",
      "**await vs gather vs TaskGroup.** `await f(); await g()` is serial: g starts after f finishes. `asyncio.gather(f(), g())` starts both and returns `[f_result, g_result]` in input order. By default the first exception propagates to the awaiter while the other tasks keep running; `return_exceptions=True` turns errors into values instead. A TaskGroup waits for every task in its block, cancels the siblings if one fails, and raises an `ExceptionGroup` that you can handle with `except*`. Use gather for best-effort fan-out where one bad item must not stop the rest, and TaskGroup when all results are required and partial work is worthless. For speed alone they are equivalent; the difference is error and lifetime semantics.",
      "**Bounded concurrency.** Creating 10,000 tasks does not create 10,000 OS threads, but each task still holds a stack frame and its arguments, and 10,000 simultaneous sockets exhaust file descriptors or earn HTTP 429s. `Semaphore(10)` lets ten operations into the critical section and parks the rest on the loop; no thread is blocked while they wait. For a stream of work, use `asyncio.Queue(maxsize=N)` plus a fixed number of worker tasks: the queue's capacity is backpressure, and `join()` lets the producer wait for completion. Pick the limit from the downstream capacity - database pool size, provider rate limit, memory per request - and measure queue wait as well as request latency.",
      "**Timeouts and cancellation.** `asyncio.wait_for(aw, seconds)` runs the awaitable and, on timeout, cancels it and raises `TimeoutError` after cancellation finishes. `asyncio.timeout(seconds)` is the modern context-manager form: it cancels the enclosing task's scope and converts the cancellation into `TimeoutError`, and nested scopes compose. `CancelledError` inherits from `BaseException` since Python 3.8, so `except Exception` will not swallow it - good - while a bare `except:` will, which breaks shutdown. Catch it only to clean up and re-raise. `finally` blocks and async context managers still run. A blocking C call cannot be cancelled until it returns, which is why libraries expose separate connect, read and pool timeouts. `asyncio.shield` protects a critical cleanup from cancellation, at the cost of delaying shutdown.",
      "**Why blocking calls freeze the loop.** The loop is one thread. `time.sleep` parks that thread, so no callback, timer or task can run: every request in the process stalls. `requests.get` performs DNS and socket I/O synchronously from the coroutine's thread; the GIL may be released during the system call, but no other thread is running the loop, so the process still stops making progress. A CPU loop never reaches an await, so the loop cannot switch even though the thread is busy. Symptoms are distinctive: latency spikes on every endpoint at once, health checks time out, and CPU may look idle (blocked on I/O) or pegged (CPU loop). Fix it with an async client, `asyncio.to_thread` for a blocking SDK, `loop.run_in_executor`, or a process pool for CPU work. Run with `PYTHONASYNCIODEBUG=1` to log callbacks that exceed `slow_callback_duration` - the warning names the exact blocking function.",
      "**Packaging the project.** Create a venv, then declare the build in `pyproject.toml`: `[build-system]` names the backend, `[project]` carries name, version, `requires-python`, runtime dependencies and optional dev extras. The src layout (`src/devatlas_ai/`) means the repository root is not importable, so a missing module fails in tests rather than in production. `pip install -e \".[dev]\"` installs dependencies and links the source for live edits. `python -m build` creates an sdist (`.tar.gz`) and a wheel (`.whl`) in `dist/`; the wheel is a zip containing the package plus `<name>-<version>.dist-info/` with `METADATA`, `WHEEL`, `RECORD` and `entry_points.txt`. A `[project.scripts]` entry becomes a launcher executable in the venv, so users run `devatlas-ingest`, not `python -m devatlas_ai.ingest`.",
      "**Pinning and shipping.** `httpx>=0.27` says \"at least this version\", so a fresh install next month may resolve differently. A lock file (pip-tools, uv, Poetry, PDM) or exact `==` pins reproduces the environment; `~=` allows only patch releases inside a minor version. Install with `--require-hashes` from a trusted index to defend against tampered or substituted packages. Build the wheel once in CI, store it, and promote that same artifact through staging and production; never rebuild from a moving branch. Use private indexes for internal packages, keep the venv out of git, and record the supported Python versions in `requires-python` and the CI matrix.",
    ],
    diagram: {
      title: "One coroutine through the event loop",
      nodes: [
        { label: "create_task()", sub: "schedules coroutine" },
        { label: "Ready queue", sub: "runs until await" },
        { label: "OS selector", sub: "epoll / kqueue / IOCP" },
        { label: "fd ready", sub: "callback fires" },
        { label: "Resume", sub: "after the await" },
      ],
      edges: ["schedule", "register fd", "data arrives", "task scheduled"],
      caption: "One thread, one ready queue. The loop only switches when a coroutine awaits, so any code that never awaits owns the thread until it returns.",
    },
  },
  handsOn: [
    {
      title: "Measure what concurrency buys, and what blocks it",
      text: [
        "Five waits of 0.4 s, written three ways, then the same 0.5 s operation written twice: once with `await asyncio.sleep`, once with blocking `time.sleep`, while a ticker task tries to run every 0.1 s. The numbers below are real Python 3.11 output.",
      ],
      code: {
        lang: "python",
        file: "models.py",
        code: `import asyncio
import time

ticks = 0


async def fetch(name: str, seconds: float) -> str:
    await asyncio.sleep(seconds)          # stands in for a network call
    return f"{name} done"


async def sequential() -> None:
    for i in range(5):
        await fetch(f"feed{i}", 0.4)


async def gathered() -> None:
    await asyncio.gather(*(fetch(f"feed{i}", 0.4) for i in range(5)))


async def grouped() -> None:
    async with asyncio.TaskGroup() as tg:        # Python 3.11+
        for i in range(5):
            tg.create_task(fetch(f"feed{i}", 0.4))


async def ticker() -> None:
    global ticks
    while True:
        await asyncio.sleep(0.1)
        ticks += 1


async def wait_async() -> None:
    await asyncio.sleep(0.5)              # yields to the loop


async def wait_blocking() -> None:
    time.sleep(0.5)                       # never yields: the loop is frozen


async def measure(work) -> None:
    global ticks
    ticks = 0
    task = asyncio.create_task(ticker())
    t = time.perf_counter()
    await work()
    elapsed = time.perf_counter() - t
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print(f"{work.__name__:14} {elapsed:.2f}s  ticker ticks: {ticks}")


if __name__ == "__main__":
    for fn in (sequential, gathered, grouped):
        t = time.perf_counter()
        asyncio.run(fn())
        print(f"{fn.__name__:11} {time.perf_counter() - t:.2f}s")
    asyncio.run(measure(wait_async))
    asyncio.run(measure(wait_blocking))`,
      },
      output: "sequential  2.03s\ngathered    0.40s\ngrouped     0.41s\nwait_async     0.51s  ticker ticks: 4\nwait_blocking  0.50s  ticker ticks: 0",
      notes: [
        "2.03 s is 5 x 0.4 s plus overhead. Both concurrent versions cost about one wait, not five, because the sleeps overlap. gather and TaskGroup have the same timing here; they differ in error handling, not speed.",
        "The ticker is the point. With `await`, the loop ran it four times in half a second. With `time.sleep`, the same half second produced zero ticks: every other task was frozen. A CPU loop behaves like time.sleep because it never reaches an await.",
      ],
    },
    {
      title: "Bound the fan-out and cap the wait",
      text: [
        "Nine 0.5 s jobs with at most three in flight, then a 2 s operation given only 0.5 s to finish. `wait_for` cancels the inner task and raises `TimeoutError`; the surrounding program keeps running.",
      ],
      code: {
        lang: "python",
        file: "bounded.py",
        code: `import asyncio
import time

LIMIT = 3


async def job(i: int, seconds: float, gate: asyncio.Semaphore) -> str:
    async with gate:                      # at most LIMIT inside this block
        await asyncio.sleep(seconds)
        return f"job{i} ok"


async def run(urls: list[tuple[int, float]]) -> None:
    gate = asyncio.Semaphore(LIMIT)
    t = time.perf_counter()
    results = await asyncio.gather(*(job(i, s, gate) for i, s in urls))
    print(f"bounded run: {time.perf_counter() - t:.2f}s, {len(results)} results")


async def slow() -> str:
    await asyncio.sleep(2.0)
    return "late"


async def timeout_demo() -> None:
    t = time.perf_counter()
    try:
        await asyncio.wait_for(slow(), timeout=0.5)
    except asyncio.TimeoutError:
        print(f"wait_for: TimeoutError after {time.perf_counter() - t:.2f}s")


if __name__ == "__main__":
    urls = [(i, 0.5) for i in range(9)]   # nine 0.5 s waits, three at a time
    asyncio.run(run(urls))
    asyncio.run(timeout_demo())`,
      },
      output: "bounded run: 1.53s, 9 results\nwait_for: TimeoutError after 0.51s",
      notes: [
        "1.53 s is about ceil(9 / 3) x 0.5 s. Unbounded, the same nine jobs would finish in about 0.5 s but open nine sockets at once; against a real provider that is how you collect HTTP 429s. The semaphore bounds work in flight, not the number of tasks created.",
        "`wait_for` cancelled the 2 s sleep after 0.51 s. In new code prefer `async with asyncio.timeout(0.5):`; it raises `TimeoutError` too and composes with nested scopes. Let `CancelledError` propagate after your cleanup.",
      ],
    },
    {
      title: "Build a wheel, inspect it, run its entry point",
      text: [
        "This package uses a `src/` layout, a `pyproject.toml` with a console script and no runtime dependencies. Build it, list the wheel with the standard library, install it into a clean venv and run the command. These are POSIX commands; on Windows activate with `.venv\\Scripts\\activate` and the launcher is `devatlas-ingest.exe`.",
      ],
      code: {
        lang: "bash",
        file: "build.sh",
        code: `python -m venv .venv
. .venv/bin/activate
pip install -q build
cat pyproject.toml
python -m build
python -m zipfile -l dist/devatlas_ai-0.1.0-py3-none-any.whl
pip install -q dist/devatlas_ai-0.1.0-py3-none-any.whl
devatlas-ingest https://example.com/rss`,
      },
      output: "$ cat pyproject.toml\n[build-system]\nrequires = [\"setuptools>=68\"]\nbuild-backend = \"setuptools.build_meta\"\n\n[project]\nname = \"devatlas-ai\"\nversion = \"0.1.0\"\ndescription = \"DevAtlas ingestion helpers\"\nrequires-python = \">=3.11\"\ndependencies = []\n\n[project.optional-dependencies]\ndev = [\"pytest>=8\"]\n\n[project.scripts]\ndevatlas-ingest = \"devatlas_ai.ingest:cli\"\n\n$ python -m build\n* Building sdist...\n* Building wheel from sdist\n...\n* Building wheel...\nSuccessfully built devatlas_ai-0.1.0.tar.gz and devatlas_ai-0.1.0-py3-none-any.whl\n\n$ python -m zipfile -l dist/devatlas_ai-0.1.0-py3-none-any.whl\nFile Name                                             Modified             Size\ndevatlas_ai/__init__.py                        2026-10-22 19:22:32           57\ndevatlas_ai/ingest.py                          2026-10-22 19:22:32          182\ndevatlas_ai-0.1.0.dist-info/METADATA           2026-10-22 19:25:06          183\ndevatlas_ai-0.1.0.dist-info/WHEEL              2026-10-22 19:25:06           91\ndevatlas_ai-0.1.0.dist-info/entry_points.txt   2026-10-22 19:25:06           59\ndevatlas_ai-0.1.0.dist-info/top_level.txt      2026-10-22 19:25:06           12\ndevatlas_ai-0.1.0.dist-info/RECORD             2026-10-22 19:25:06          567\n\n$ devatlas-ingest https://example.com/rss\nqueued https://example.com/rss",
      notes: [
        "Two artifacts came out. The sdist is source plus build instructions; the wheel is already built and installs by unzipping. The `dist-info` directory is the metadata pip reads, and `entry_points.txt` records the console script declared under `[project.scripts]`.",
        "`python -m zipfile -l` is the standard library: no extra tool needed to audit what you are about to ship. Install the wheel in a fresh venv and run the command there; if it only works in your dev environment, the package is incomplete.",
        "The build log is trimmed at the `...` line: the elided lines are setuptools copying files. The `Successfully built` line, the wheel listing and the command output are verbatim.",
      ],
    },
    {
      title: "Choose the primitive, then choose the artifact",
      text: [
        "Two tables to keep nearby. The timings in the first are the measured ones from the previous steps, not a model. The second separates development artifacts from shipping artifacts, which are easy to confuse.",
      ],
      code: {
        lang: "text",
        file: "cheats.txt",
        code: `FIVE INDEPENDENT 0.4 s WAITS (measured, Python 3.11)
approach          wall time    concurrency    on first error
sequential        2.03 s       none           aborts the run
asyncio.gather    0.40 s       all five       propagates; siblings keep running
TaskGroup         0.41 s       all five       cancels siblings; ExceptionGroup
Semaphore(3)      ceil(n/3)*t  at most three  depends on gather/TaskGroup

PACKAGING: WHAT EACH PIECE IS FOR
piece             job
venv              isolated interpreter and site-packages
pyproject.toml    build backend, metadata, dependencies, entry points
src/ layout       only the installed package is importable
pip install -e .  editable link for development
python -m build   sdist (.tar.gz) plus wheel (.whl)
wheel             install is unzip; the artifact you promote
[project.scripts] creates the console command in the venv
lock file         exact versions, optionally hashes`,
      },
      notes: [
        "`Semaphore(n)` does not make a single operation faster; it makes the whole batch predictable and keeps you inside someone else's rate limit. `gather` with `return_exceptions=True` plus per-item error values is the usual ingestion choice.",
        "Use `pip install -e \".[dev]\"` while developing and `pip install dist/name.whl` when testing what you will ship. They are different questions: does my source work, and does my artifact work.",
      ],
    },
    {
      title: "Draw the packaging lifecycle",
      text: [
        "Development and release are two different paths through the same metadata. Draw the path once, then make CI follow it: editable install for the inner loop, a built wheel for everything after.",
      ],
      code: {
        lang: "mermaid",
        file: "packaging.mmd",
        code: `flowchart LR
  A[clone repo] --> B[python -m venv .venv]
  B --> C[pip install -e ".[dev]"]
  C --> D[write code + pytest]
  D --> E[python -m build]
  E --> F[dist/*.whl + *.tar.gz]
  F --> G[install wheel in clean venv]
  G --> H[devatlas-ingest]`,
      },
      notes: [
        "`[project.scripts]` maps `devatlas-ingest` to `devatlas_ai.ingest:cli`; the installer writes a small launcher into the venv. The same metadata is readable at runtime with `importlib.metadata.version(\"devatlas-ai\")`.",
        "Pin for deployment: `httpx==0.27.2`, or a lock file plus `--require-hashes`. A `>=` floor lets a new release change production on the next install, which is exactly the surprise packaging is supposed to remove.",
      ],
    },
  ],
  companies: [
    "**Async web services (FastAPI, Starlette, aiohttp, Uvicorn):** one process handles many requests that spend most of their time waiting on databases, caches and upstream APIs. The framework runs on an event loop, so one blocking call in a handler stalls every other request in that worker; teams enforce async clients and use thread pools only at known boundaries.",
    "**LLM and third-party API fan-out (illustrative):** batch jobs issue hundreds of calls that each take seconds. A semaphore matched to the provider's rate limit, a timeout per call, and retries with jitter are the difference between a completed batch and a wall of HTTP 429s or a stuck job.",
    "**Scrapers and data ingestion (illustrative):** crawlers use bounded concurrency per host, queues for backpressure, and TaskGroup when a partial page is useless. They also cap total in-flight requests so memory and file descriptors stay predictable under a large feed list.",
    "**Internal package registries (illustrative; AWS CodeArtifact, Azure Artifacts, JFrog Artifactory):** shared clients, logging setup and models ship as versioned internal packages. Teams pin them in applications and configure the private index explicitly, which also reduces dependency-confusion risk.",
    "**Build once, promote everywhere (illustrative; PyPI trusted publishing, GitHub Actions):** mature teams build the wheel in CI, attach it to a release and install that exact file in staging and production. Rebuilding from a branch on the deploy host means the artifact you tested is not the artifact you run.",
  ],
  mistakes: [
    { mistake: "Calling blocking code inside async functions", why: "requests and time.sleep look harmless and are familiar", wrong: "The whole event loop freezes and every request in the worker stalls, not just the one that called it", fix: "Use async libraries (httpx, asyncpg) or asyncio.to_thread for a blocking SDK" },
    { mistake: "Unbounded gather over thousands of URLs", why: "More concurrency feels faster", wrong: "Rate-limit bans, socket and file-descriptor exhaustion, memory spikes, and a batch that fails all at once", fix: "asyncio.Semaphore, a Queue with workers, or batches sized to the downstream limit" },
    { mistake: "No timeouts on external calls", why: "The library defaults seem reasonable, or there are none", wrong: "One hung server blocks the job forever and the semaphore slot is never released", fix: "asyncio.timeout or wait_for around every call, plus connect and read timeouts in the client" },
    { mistake: "Using asyncio for CPU-bound work", why: "'async is faster' is repeated without the I/O qualifier", wrong: "No speedup at all, and the loop is blocked while computing, so other tasks starve", fix: "ProcessPoolExecutor, multiprocessing, or a native library that releases the GIL" },
    { mistake: "Forgetting await", why: "Calling an async function looks like a normal call", wrong: "A coroutine object is created, nothing runs, and the 'never awaited' warning is easy to miss", fix: "Await it or create a task; enable type checking and warnings-as-errors in tests" },
    { mistake: "Swallowing CancelledError", why: "A broad except looks defensive", wrong: "Shutdown and timeouts hang: the task ignores the cancellation and the loop waits for it", fix: "Catch CancelledError only to clean up, then re-raise; never use a bare except in async code" },
    { mistake: "Fire-and-forget create_task with no reference", why: "It starts the work and looks convenient", wrong: "The task can be garbage-collected mid-flight, and its exception is reported as 'never retrieved' or lost", fix: "Keep tasks in a set with a done callback, or use a TaskGroup so lifetime is scoped" },
    { mistake: "Testing from the repo root without installing", why: "It works on the author's machine", wrong: "The import resolves to the working directory, so missing package data and broken entry points only appear in production", fix: "Use a src layout and run tests after pip install -e \".[dev]\" in a clean venv" },
    { mistake: "Shipping with >= floors and no lock", why: "A minimum version is easy to write", wrong: "A new transitive release changes production on the next install, and the bug cannot be reproduced", fix: "Pin exact versions or use a lock file, add hashes for deployment, and promote a built wheel" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Every external call gets a timeout, bounded concurrency and a per-item error path, so one bad dependency cannot take down the batch." },
    { tag: "Performance", text: "Reuse one AsyncClient per process for connection pooling, and only add concurrency where the work actually waits." },
    { tag: "Maintainability", text: "pyproject.toml, src layout and an editable install: the repo, the tests and the shipped artifact all describe the same package." },
    { tag: "Security", text: "Install from a trusted index with pinned versions and hashes; do not let an unvetted transitive release or a name-squatted package into production." },
    { tag: "Cost", text: "Bounded concurrency lets a small instance finish the batch; unbounded fan-out mostly buys retries, rate-limit errors and larger instances." },
  ],
  interview: [
    { q: "When would you use asyncio, threads or processes in Python?", a: "Pick by workload, not by fashion. asyncio for many concurrent I/O-bound operations with async libraries: it uses one thread and one event loop, so thousands of waits cost little. Threads for I/O with blocking libraries that have no async version; the GIL is released during system calls, so threads still overlap network waits, though each thread costs memory and context switches. Processes for CPU-bound work, because standard CPython runs one thread's bytecode at a time; ProcessPoolExecutor uses multiple cores and pays serialization and startup costs. Real services combine them: an async server, asyncio.to_thread for a legacy SDK, and a process pool for heavy computation. Say explicitly that asyncio does not speed up CPU work and that threads do not either for pure Python." },
    { q: "Compare gather and TaskGroup, and explain cancellation.", a: "Both run awaitables concurrently; gather returns results in input order, while TaskGroup scopes lifetime and errors. With gather, the first exception propagates to the awaiter and the remaining tasks keep running unless you cancel them; return_exceptions=True turns failures into values, which is how ingestion jobs report per-feed errors. TaskGroup, added in 3.11, waits for all tasks in the async with block, cancels siblings when one fails, and raises an ExceptionGroup you can handle with except*. Cancellation is cooperative: task.cancel() injects CancelledError at the next await, cleanup runs in finally, and the error must be re-raised; a blocking call cannot be interrupted until it returns. Timeouts build on the same mechanism: wait_for and asyncio.timeout cancel the work and raise TimeoutError, and asyncio.timeout composes with nested scopes." },
    { q: "How do you package a Python service so a teammate can run exactly what you run?", a: "Create a venv, declare everything in pyproject.toml, use a src layout, and install the package rather than relying on the working directory. [build-system] names the backend; [project] carries name, version, requires-python, dependencies and optional dev extras; [project.scripts] creates the console command. pip install -e \".[dev]\" gives the development loop and pytest against the installed package. For release, python -m build produces an sdist and a wheel, and the wheel is the artifact I install in a clean venv and promote. Pinning closes the loop: exact versions or a lock file, hashes for deployment, and the same wheel in staging and production. The test is simple: clone, create a venv, install the wheel, run the command, and nothing depends on my laptop." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "Roughly how long does this take?",
      code: { lang: "python", code: "import asyncio\nasync def w(): await asyncio.sleep(1)\nasync def main(): await asyncio.gather(w(), w(), w())\nasyncio.run(main())" },
      options: ["~1 s", "~3 s", "~0 s", "It never finishes"],
      answer: 0,
      explanation: "The three sleeps overlap, so it takes about as long as the longest: ~1 s. Awaiting them one by one would take ~3 s.",
    },
    {
      kind: "bug",
      prompt: "This async API slows to a crawl under load. Why?",
      code: { lang: "python", code: "@app.get(\"/price\")\nasync def price():\n    r = requests.get(\"https://api.example.com/price\")\n    return r.json()" },
      options: ["FastAPI cannot return JSON", "requests.get blocks the event loop", "Missing await on r.json()", "GET should be POST"],
      answer: 1,
      explanation: "requests is synchronous. Every other request in the worker waits while it runs. Use httpx.AsyncClient with await, or define the handler with plain def so the framework runs it in a thread pool.",
    },
    {
      kind: "mcq",
      prompt: "You must fetch 1,000 URLs but the provider allows only 8 requests in flight. What bounds the work?",
      options: ["asyncio.gather", "asyncio.Semaphore(8)", "asyncio.TaskGroup", "asyncio.to_thread"],
      answer: 1,
      explanation: "gather and TaskGroup start everything at once; TaskGroup structures errors but does not limit. A Semaphore(8) caps in-flight requests. to_thread is for blocking calls, not rate limiting.",
    },
  ],
  cheatSheet: [
    "async def + await; run with asyncio.run(main()). Awaiting is sequential; create_task or gather creates concurrency.",
    "Async buys I/O concurrency, not CPU speed. CPU-bound work belongs in processes.",
    "gather: results in input order; return_exceptions=True turns errors into values.",
    "TaskGroup (3.11+): cancel siblings on failure, raise ExceptionGroup, nothing outlives the block.",
    "Semaphore(n) bounds in flight; Queue(maxsize) + workers gives backpressure for streams.",
    "Timeout: asyncio.timeout or wait_for. CancelledError is BaseException: clean up, then re-raise.",
    "Blocking call in async → to_thread / run_in_executor. PYTHONASYNCIODEBUG=1 names slow callbacks.",
    "Package: pyproject.toml [build-system] + [project], src layout, venv, pip install -e \".[dev]\".",
    "python -m build → sdist + wheel; wheel = package + dist-info; [project.scripts] makes the command.",
    "Pin exact versions or lock; build once, install the same wheel everywhere; never commit .venv.",
  ],
  homework: {
    basic: {
      title: "Concurrent downloader",
      brief: ["Write a script that downloads 10 URLs concurrently with httpx, limited to 3 at a time, with a 5 s timeout each, and prints status code and size, sorted by size."],
      criteria: ["Semaphore of 3", "Per-request timeout", "Errors reported per URL without stopping others"],
      hints: ["Reuse the bounded.py pattern.", "One AsyncClient for all requests, or you lose connection reuse."],
      solution: {
        text: ["Same structure as bounded.py with a smaller semaphore and sorting the results; errors are values, not exceptions, so sorting must handle them."],
        code: {
          lang: "python",
          code: `import asyncio, httpx

async def get(client, sem, url):
    async with sem:
        try:
            async with asyncio.timeout(5):
                r = await client.get(url, follow_redirects=True)
                return url, r.status_code, len(r.content)
        except Exception as exc:
            return url, type(exc).__name__, -1

async def main(urls):
    sem = asyncio.Semaphore(3)
    async with httpx.AsyncClient() as client:
        rows = await asyncio.gather(*(get(client, sem, u) for u in urls))
    for url, status, size in sorted(rows, key=lambda r: r[2], reverse=True):
        print(f"{status!s:>18} {size:>9}  {url}")

asyncio.run(main(["https://example.com", "https://www.python.org", "https://httpbin.org/delay/10"]))`,
        },
      },
    },
    intermediate: {
      title: "Retry with backoff, async edition",
      brief: ["Write `async def retry(coro_factory, attempts=3, base=0.2)` that retries a failing coroutine with exponential backoff and jitter. Test it with a fake that fails twice then succeeds."],
      criteria: ["Takes a factory (a coroutine can only be awaited once)", "Backoff with jitter", "Test proves 3 calls happened"],
      hints: ["A coroutine object cannot be re-awaited; pass `lambda: fetch(url)`.", "Jitter avoids every client retrying at the same instant."],
      solution: {
        text: ["The factory is the key insight: each attempt needs a fresh coroutine. The run below prints a real result from Python 3.11."],
        code: {
          lang: "python",
          file: "retry.py",
          code: `import asyncio, random

async def retry(factory, attempts: int = 3, base: float = 0.2):
    for i in range(attempts):
        try:
            return await factory()
        except Exception:
            if i == attempts - 1:
                raise
            delay = base * 2 ** i
            await asyncio.sleep(delay / 2 + random.random() * delay / 2)

async def main() -> None:
    calls = 0
    async def flaky() -> str:
        nonlocal calls
        calls += 1
        if calls < 3:
            raise ConnectionError("boom")
        return "ok"
    print(await retry(flaky, base=0.01), "after", calls, "calls")

if __name__ == "__main__":
    asyncio.run(main())`,
        },
        output: "ok after 3 calls",
        pitfalls: ["Retrying a 4xx that will never succeed", "Retrying without a cap or timeout, so one dead dependency consumes the whole job"],
      },
    },
    challenge: {
      title: "Benchmark the three models",
      brief: ["Compute SHA-256 chains (CPU-bound) and simulated downloads (asyncio.sleep, I/O-bound) using: sequential, threads, processes, asyncio. Produce a table of timings and explain each result with the GIL and event-loop model."],
      criteria: ["4 approaches × 2 workloads", "Timings table", "Correct explanation for each cell"],
      hints: ["For I/O with threads use time.sleep in a ThreadPoolExecutor.", "Run each measurement twice; the pattern matters, not the second decimal."],
      solution: {
        text: [
          "One script runs the same 8 work items through each approach: a 300,000-round SHA-256 chain (CPU-bound) and a 0.5 s wait (I/O-bound; `time.sleep` for sequential, threads and processes, `asyncio.sleep` for asyncio). Each runner is a plain function, so the timing code is written once.",
          "Expected pattern (numbers vary by machine): I/O-bound: threads and asyncio ≈ the single longest wait; processes also fast but with startup overhead; sequential = sum. CPU-bound: threads ≈ sequential (GIL, on standard CPython); processes ≈ sequential / cores; asyncio ≈ sequential (nothing awaits). The table is a strong portfolio artefact because it shows you measured instead of guessing.",
          "One run on a 4-core Linux machine (Python 3.13) printed: sequential 1.07 s CPU / 4.00 s I/O; threads 1.17 s / 0.50 s; processes 0.34 s / 1.01 s; asyncio 1.06 s / 0.50 s. Processes took 1 s on the I/O workload because the default pool has one worker per core: 8 waits on 4 workers is two rounds of 0.5 s, plus process start-up.",
        ],
        code: {
          lang: "python",
          file: "bench.py",
          code: `"""Benchmark sequential, threads, processes and asyncio on CPU- and I/O-bound work."""
import asyncio
import hashlib
import time
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

JOBS = 8              # number of work items per run
CHAIN = 300_000       # SHA-256 rounds per CPU item
WAIT = 0.5            # seconds of simulated network wait per I/O item


def cpu_job(n: int = CHAIN) -> str:
    data = b"x"
    for _ in range(n):
        data = hashlib.sha256(data).digest()
    return data.hex()[:8]


def io_job(seconds: float = WAIT) -> str:
    time.sleep(seconds)            # a blocking "download"
    return "ok"


async def io_job_async(seconds: float = WAIT) -> str:
    await asyncio.sleep(seconds)   # a non-blocking "download"
    return "ok"


async def cpu_job_async(n: int = CHAIN) -> str:
    return cpu_job(n)              # no await inside: the loop cannot switch


def sequential(job: Callable[[], str]) -> None:
    for _ in range(JOBS):
        job()


def threads(job: Callable[[], str]) -> None:
    with ThreadPoolExecutor(max_workers=JOBS) as pool:
        list(pool.map(lambda _: job(), range(JOBS)))


def processes(job: Callable[[], str]) -> None:
    with ProcessPoolExecutor() as pool:   # one worker per core by default
        futures = [pool.submit(job) for _ in range(JOBS)]
        for f in futures:
            f.result()


def with_asyncio(job: Callable[[], str]) -> None:
    async_job = io_job_async if job is io_job else cpu_job_async

    async def main() -> None:
        await asyncio.gather(*(async_job() for _ in range(JOBS)))

    asyncio.run(main())


def timed(runner: Callable[[Callable[[], str]], None], job: Callable[[], str]) -> float:
    start = time.perf_counter()
    runner(job)
    return time.perf_counter() - start


if __name__ == "__main__":     # required for process pools on Windows/macOS
    runners = [sequential, threads, processes, with_asyncio]
    print(f"{'approach':<12} {'cpu-bound':>10} {'io-bound':>10}")
    for runner in runners:
        cpu = timed(runner, cpu_job)
        io = timed(runner, io_job)
        print(f"{runner.__name__:<12} {cpu:>9.2f}s {io:>9.2f}s")`,
        },
        pitfalls: [
          "Running the CPU job \"with asyncio\" inside a coroutine gives no speed-up; that is the point of the cell, not a bug in the benchmark.",
          "Keep the `if __name__ == \"__main__\":` guard, or ProcessPoolExecutor re-runs the module in every worker on Windows and macOS.",
          "Do not trust a single run: repeat it and look at the pattern, not the second decimal.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: async feed fetcher package",
      brief: ["Turn services/ai into a proper package with pyproject.toml and src layout. Add `devatlas_ai/feeds.py` with an async `fetch_all(urls)` using a semaphore, timeouts and per-feed errors, exposed as the `devatlas-ingest` command. Build a wheel and install that wheel in a clean venv."],
      criteria: ["pip install -e \".[dev]\" works on a clean venv", "devatlas-ingest command runs", "Unit test with a fake transport (httpx.MockTransport)", "python -m build produces a wheel that installs and runs the command"],
      hints: ["httpx.MockTransport(lambda request: httpx.Response(200, text='<rss/>')) avoids the network in tests.", "Test the wheel, not just the editable install: they can differ."],
      solution: {
        text: [
          "Inject the AsyncClient so tests pass one built on MockTransport; production builds a real one. This is the Protocol/injection idea from the previous lesson, applied to HTTP.",
          "Move the package to `services/ai/src/devatlas_ai/` (tags.py, models.py and dedupe.py from the previous capstones come along unchanged) and add feeds.py. `fetch_all` uses the ingest.py pattern: one semaphore, `asyncio.timeout` per request, and every failure turned into an `\"error: <Name>\"` value. It closes the client only if it created it, so a test's injected client is left alone.",
          "pyproject.toml declares httpx as a runtime dependency, the dev extras, and `[project.scripts]`, which makes `pip install -e \".[dev]\"` create the `devatlas-ingest` command. With a src layout and an installed package, pytest no longer needs `pythonpath`. The output is `pytest -q && mypy` from services/ai in a fresh venv (12 tests including the earlier tags and models tests), then the command run without arguments. For release, `python -m build` writes a wheel and an sdist; install the wheel in a clean venv and run `devatlas-ingest` there, so you verify the artifact rather than the working tree.",
        ],
        code: {
          lang: "python",
          file: "services/ai/src/devatlas_ai/feeds.py",
          code: `"""Fetch many feeds concurrently: bounded, with timeouts, one error never stops the run."""
import asyncio
import sys

import httpx

MAX_IN_FLIGHT = 10
TIMEOUT_S = 5.0


async def _fetch_one(client: httpx.AsyncClient, sem: asyncio.Semaphore, url: str) -> tuple[str, str]:
    async with sem:                                  # at most MAX_IN_FLIGHT requests at once
        try:
            async with asyncio.timeout(TIMEOUT_S):
                r = await client.get(url, follow_redirects=True)
                r.raise_for_status()
                return url, r.text
        except Exception as exc:                     # per-feed error, reported as a value
            return url, f"error: {type(exc).__name__}"


async def fetch_all(urls: list[str], client: httpx.AsyncClient | None = None) -> dict[str, str]:
    """Return {url: body or 'error: <ExceptionName>'}. Tests inject a client on MockTransport."""
    own_client = client is None
    if client is None:
        client = httpx.AsyncClient(headers={"User-Agent": "devatlas-ingester/0.1"})
    try:
        sem = asyncio.Semaphore(MAX_IN_FLIGHT)
        pairs = await asyncio.gather(*(_fetch_one(client, sem, u) for u in urls))
        return dict(pairs)
    finally:
        if own_client:                               # only close what we created
            await client.aclose()


def cli() -> None:
    """Entry point for the \`devatlas-ingest\` command: devatlas-ingest URL [URL ...]."""
    urls = sys.argv[1:]
    if not urls:
        sys.exit("usage: devatlas-ingest URL [URL ...]")
    for url, body in asyncio.run(fetch_all(urls)).items():
        print(f"{body if body.startswith('error') else len(body)}\\t{url}")

# ---- services/ai/tests/test_feeds.py ----
import asyncio, httpx
from devatlas_ai.feeds import fetch_all

def test_fetch_all_reports_errors_per_feed() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if "bad" in str(request.url):
            return httpx.Response(500)
        return httpx.Response(200, text="<rss/>")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    results = asyncio.run(fetch_all(["https://ok.test/rss", "https://bad.test/rss"], client=client))
    assert results["https://ok.test/rss"] == "<rss/>"
    assert results["https://bad.test/rss"].startswith("error")
# ---- services/ai/pyproject.toml ----
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "devatlas-ai"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27"]

[project.optional-dependencies]
dev = ["pytest>=8", "mypy>=1.10"]

[project.scripts]
devatlas-ingest = "devatlas_ai.feeds:cli"

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.mypy]
strict = true
files = ["src", "tests"]`,
        },
        output: "............                                                             [100%]\n12 passed in 0.08s\nSuccess: no issues found in 8 source files\n$ devatlas-ingest\nusage: devatlas-ingest URL [URL ...]",
        pitfalls: [
          "Closing a client the caller passed in: the next test (or caller) gets 'client has been closed'",
          "Forgetting `[build-system]`, or pointing `[project.scripts]` at a module path that does not match the src layout, so the command is not created or fails on import",
          "A test that reaches the real network: it is slow, flaky and fails in CI without internet. MockTransport keeps it in memory",
          "Only ever testing the editable install: build the wheel and install it in a clean venv before calling the package done",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: Coroutines and Tasks (gather, TaskGroup, timeouts)", url: "https://docs.python.org/3/library/asyncio-task.html" },
    { label: "Python docs: Developing with asyncio (debug mode, blocking calls)", url: "https://docs.python.org/3/library/asyncio-dev.html" },
    { label: "Python Packaging User Guide: packaging a project", url: "https://packaging.python.org/en/latest/tutorials/packaging-projects/" },
    { label: "Python Packaging User Guide: pyproject.toml specification", url: "https://packaging.python.org/en/latest/specifications/pyproject-toml/" },
    { label: "Python docs: venv - creation of virtual environments", url: "https://docs.python.org/3/library/venv.html" },
    { label: "pip docs: repeatable installs", url: "https://pip.pypa.io/en/stable/topics/repeatable-installs/" },
  ],
  nextPreview: "Next: testing with pytest. Fixtures, parametrize and mocking at the right boundaries, so you can change code without fear.",
};
