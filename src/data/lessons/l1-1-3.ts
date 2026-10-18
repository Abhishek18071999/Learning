import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.3",
  title: "Async Python and packaging",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.1.2 OOP, dataclasses and protocols", "1.2.1 is helpful (same event-loop idea in JavaScript)"],
  summary: "Use asyncio to run many I/O tasks concurrently with timeouts and limits, know when threads or processes are the better tool, and package a project properly with pyproject.toml.",
  terms: [
    { term: "Coroutine", def: "A function defined with `async def`. Calling it returns a coroutine object that runs only when awaited or scheduled." },
    { term: "Event loop", def: "The asyncio scheduler that runs coroutines, switching between them whenever one awaits I/O." },
    { term: "await", def: "Pause this coroutine until the awaited operation finishes, letting others run meanwhile." },
    { term: "Task", def: "A coroutine scheduled to run concurrently, created with asyncio.create_task or a TaskGroup." },
    { term: "GIL", def: "Global Interpreter Lock: in standard CPython only one thread executes Python bytecode at a time, so threads do not speed up CPU-bound Python code (free-threaded builds exist from 3.13 but are optional)." },
    { term: "pyproject.toml", def: "The standard file describing a Python project: name, version, dependencies, build system and tool settings." },
    { term: "Editable install", def: "`pip install -e .` links your source folder into the environment so code changes take effect without reinstalling." },
  ],
  problem: [
    "The DevAtlas news ingester fetches 50 RSS feeds one after another. Each takes about 400 ms, mostly waiting on the network, so a run takes 20 seconds while the CPU sits idle. One slow feed sometimes hangs for minutes and blocks everything.",
    "Separately, a teammate cannot run your service because they do not know which packages to install or how to import your modules. Async solves the waiting; packaging solves the sharing.",
  ],
  concept: {
    analogy: [
      "One waiter (one thread) serving 50 tables. A synchronous waiter takes an order, walks to the kitchen, **stands there until the food is ready**, serves it, then goes to the next table. An async waiter takes an order, hands it to the kitchen, and **serves other tables while the food cooks**. Same single waiter, far more tables served, as long as most time is spent waiting on the kitchen (I/O).",
    ],
    precise: [
      "asyncio is **single-threaded concurrency**: coroutines voluntarily give up control at each `await`, and the event loop resumes whichever one's I/O is ready. Great for network calls, databases and files when you have many of them; useless for CPU-heavy work, which never awaits.",
      "Choose the tool by workload: **I/O-bound, many tasks** → asyncio (or threads for blocking libraries). **CPU-bound** → `multiprocessing` / `ProcessPoolExecutor` to use multiple cores, or a native library (NumPy) that releases the GIL.",
      "Production async code always has three things: **timeouts** (`asyncio.timeout`), **concurrency limits** (`asyncio.Semaphore`), and **structured error handling** (`asyncio.TaskGroup`, Python 3.11+, cancels sibling tasks if one fails).",
      "Packaging: a `pyproject.toml` declares metadata and dependencies; a `src/` layout prevents accidentally importing uncommitted local files; `pip install -e .` makes your package importable everywhere in the venv.",
    ],
  },
  underTheHood: {
    text: [
      "`await` on a socket read registers interest with the OS (via selectors like epoll/kqueue) and returns control to the loop. When the OS says data is ready, the loop resumes the coroutine exactly after its await.",
      "Calling a **blocking** function inside a coroutine (e.g. `requests.get`, `time.sleep`) freezes the whole loop: every other task stops. Use async libraries (httpx, aiohttp, asyncpg) or push blocking calls to a thread with `asyncio.to_thread`.",
      "`asyncio.gather` runs awaitables concurrently and returns results in input order. `TaskGroup` is the newer structured alternative: when the `async with` block exits, all tasks are done, and an error cancels the rest.",
    ],
    diagram: {
      title: "One thread, many waits",
      nodes: [
        { label: "fetch(feed1)", sub: "await network" },
        { label: "fetch(feed2)", sub: "await network" },
        { label: "fetch(feed3)", sub: "await network" },
        { label: "Event loop", sub: "resume whoever is ready" },
      ],
      edges: ["switch", "switch", "OS: data ready"],
      caption: "Total time ≈ slowest request, not the sum, as long as nothing blocks the loop.",
    },
  },
  handsOn: [
    {
      title: "Sequential vs concurrent (no network needed)",
      code: {
        lang: "python",
        file: "demo.py",
        code: `import asyncio, time

async def fetch(name: str, seconds: float) -> str:
    await asyncio.sleep(seconds)          # stands in for a network call
    return f"{name} done"

async def sequential() -> None:
    for i in range(5):
        await fetch(f"feed{i}", 0.4)

async def concurrent() -> None:
    results = await asyncio.gather(*(fetch(f"feed{i}", 0.4) for i in range(5)))
    print(results[0], "...", len(results), "results")

for fn in (sequential, concurrent):
    t = time.perf_counter()
    asyncio.run(fn())
    print(f"{fn.__name__}: {time.perf_counter() - t:.2f}s")`,
      },
      output: "sequential: 2.00s\nfeed0 done ... 5 results\nconcurrent: 0.40s",
    },
    {
      title: "Production pattern: limit, timeout, collect errors",
      code: {
        lang: "python",
        file: "ingest.py",
        code: `# pip install httpx
import asyncio
import httpx

FEEDS = [
    "https://blog.python.org/feeds/posts/default?alt=rss",
    "https://github.blog/feed/",
    "https://this-domain-does-not-exist.invalid/rss",
]

async def fetch(client: httpx.AsyncClient, sem: asyncio.Semaphore, url: str) -> tuple[str, int | str]:
    async with sem:                                   # at most N requests in flight
        try:
            async with asyncio.timeout(5):            # Python 3.11+
                r = await client.get(url, follow_redirects=True)
                r.raise_for_status()
                return url, len(r.content)
        except Exception as exc:                      # one bad feed must not kill the run
            return url, f"error: {type(exc).__name__}"

async def main() -> None:
    sem = asyncio.Semaphore(10)
    async with httpx.AsyncClient(headers={"User-Agent": "devatlas-ingester/0.1"}) as client:
        results = await asyncio.gather(*(fetch(client, sem, u) for u in FEEDS))
    for url, outcome in results:
        print(f"{outcome!s:>20}  {url}")

asyncio.run(main())`,
      },
      output: "               52341  https://blog.python.org/feeds/...\n              101920  https://github.blog/feed/\n    error: ConnectError  https://this-domain-does-not-exist.invalid/rss",
      notes: ["Sizes vary with each feed's current content. One shared AsyncClient reuses connections (lesson 0.1.1: avoid repeated handshakes)."],
    },
    {
      title: "TaskGroup: fail fast when every result is required",
      code: {
        lang: "python",
        code: `async def load_dashboard() -> dict:
    async with asyncio.TaskGroup() as tg:              # Python 3.11+
        user = tg.create_task(fetch_user())
        progress = tg.create_task(fetch_progress())
    # here both finished; if one raised, the other was cancelled
    # and an ExceptionGroup propagates
    return {"user": user.result(), "progress": progress.result()}`,
      },
    },
    {
      title: "Blocking and CPU work: threads and processes",
      code: {
        lang: "python",
        code: `import asyncio, hashlib
from concurrent.futures import ProcessPoolExecutor

def legacy_blocking_call() -> str:          # e.g. a library with no async version
    import time; time.sleep(1); return "ok"

def cpu_heavy(n: int) -> str:
    data = b"x"
    for _ in range(n):
        data = hashlib.sha256(data).digest()
    return data.hex()[:8]

async def main() -> None:
    # blocking I/O → thread, so the event loop keeps running
    print(await asyncio.to_thread(legacy_blocking_call))
    # CPU-bound → processes, to use several cores
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as pool:
        hashes = await asyncio.gather(*(loop.run_in_executor(pool, cpu_heavy, 200_000) for _ in range(4)))
    print(hashes)

if __name__ == "__main__":                  # required for process pools on Windows/macOS
    asyncio.run(main())`,
      },
    },
    {
      title: "Package the project",
      code: {
        lang: "text",
        file: "pyproject.toml",
        code: `[build-system]
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
devatlas-ingest = "devatlas_ai.ingest:cli"

[tool.pytest.ini_options]
testpaths = ["tests"]`,
      },
      notes: ["Layout: `src/devatlas_ai/__init__.py`, `src/devatlas_ai/ingest.py` (with a `cli()` function), `tests/`. Install with `pip install -e \".[dev]\"`; the `devatlas-ingest` command now exists in the venv. Version numbers here are minimums; pin exact versions for deployments with a lock or requirements file."],
    },
  ],
  companies: [
    "**Async web services**: FastAPI and other ASGI frameworks run on asyncio, so one process can serve many concurrent requests that mostly wait on databases and LLM APIs. LLM-calling services in particular benefit, since each call can take seconds.",
    "**Fan-out with limits**: scrapers, ingestion jobs and LLM batch jobs use semaphores to respect rate limits; exceeding a provider's rate limit gets requests rejected (HTTP 429).",
    "**Internal packages**: companies publish shared code (clients, logging setup, models) as versioned internal packages to a private index such as AWS CodeArtifact, Azure Artifacts or JFrog Artifactory.",
  ],
  mistakes: [
    { mistake: "Calling blocking code inside async functions", why: "requests or time.sleep look harmless", wrong: "The entire event loop freezes; all requests stall", fix: "Use async libraries or asyncio.to_thread" },
    { mistake: "Unbounded gather over thousands of URLs", why: "More concurrency feels faster", wrong: "Rate-limit bans, socket exhaustion, memory spikes", fix: "asyncio.Semaphore or batched processing" },
    { mistake: "No timeouts", why: "Defaults seem fine", wrong: "One hung server blocks the job forever", fix: "asyncio.timeout around every external call" },
    { mistake: "Using asyncio for CPU-bound work", why: "'async is faster'", wrong: "No speedup at all; the loop is blocked while computing", fix: "ProcessPoolExecutor or a native library" },
    { mistake: "Forgetting await", why: "Calling an async function looks like a normal call", wrong: "A coroutine object is returned and nothing runs ('coroutine was never awaited' warning)", fix: "await it, or create a task; enable type checking" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Every external call: timeout, bounded concurrency, error captured per item." },
    { tag: "Performance", text: "Reuse one async HTTP client per process for connection pooling." },
    { tag: "Maintainability", text: "pyproject.toml + src layout + editable install; pin exact versions for deploys." },
    { tag: "Reliability", text: "Prefer TaskGroup when all results are required so failures cancel siblings cleanly." },
  ],
  interview: [
    { q: "When would you use asyncio vs threads vs processes in Python?", a: "asyncio for many concurrent I/O-bound operations with async libraries; threads for I/O with blocking libraries; processes for CPU-bound work because of the GIL in standard CPython. Many services combine them: async server, to_thread for a blocking SDK, a process pool for heavy computation." },
    { q: "What happens if you call time.sleep(5) in an async handler?", a: "It blocks the event loop thread for 5 seconds, so every other coroutine, including other users' requests, stops. Use await asyncio.sleep or move blocking work to a thread." },
    { q: "gather vs TaskGroup?", a: "gather runs awaitables concurrently and returns results in order; by default the first exception propagates while other tasks keep running unless you handle it, and return_exceptions=True collects errors. TaskGroup (3.11+) gives structured concurrency: if one task fails, the others are cancelled and errors are raised together as an ExceptionGroup." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "Roughly how long does this take?",
      code: { lang: "python", code: "import asyncio\nasync def w(): await asyncio.sleep(1)\nasync def main(): await asyncio.gather(w(), w(), w())\nasyncio.run(main())" },
      options: ["~1 s", "~3 s", "~0 s", "It never finishes"],
      answer: 0,
      explanation: "The three sleeps overlap, so it takes about as long as the longest: ~1 s.",
    },
    {
      kind: "bug",
      prompt: "This async API slows to a crawl under load. Why?",
      code: { lang: "python", code: "@app.get(\"/price\")\nasync def price():\n    r = requests.get(\"https://api.example.com/price\")\n    return r.json()" },
      options: ["FastAPI cannot return JSON", "requests.get blocks the event loop", "Missing await on r.json()", "GET should be POST"],
      answer: 1,
      explanation: "requests is synchronous. Use httpx.AsyncClient with await, or define the handler with plain def so the framework runs it in a thread pool.",
    },
    {
      kind: "mcq",
      prompt: "You need to resize 10,000 images in Python as fast as possible on an 8-core machine. Best choice?",
      options: ["asyncio.gather", "One thread", "ProcessPoolExecutor", "await asyncio.sleep(0) between images"],
      answer: 2,
      explanation: "CPU-bound work needs multiple processes to use multiple cores under the GIL (unless the library releases it).",
    },
  ],
  cheatSheet: [
    "async def + await; run with asyncio.run(main()).",
    "Concurrent: asyncio.gather(...) or async with asyncio.TaskGroup().",
    "Limit: asyncio.Semaphore(n). Timeout: async with asyncio.timeout(s).",
    "Blocking I/O → asyncio.to_thread. CPU-bound → ProcessPoolExecutor.",
    "Never time.sleep / requests in async code.",
    "One shared AsyncClient for connection reuse.",
    "pyproject.toml + src/ layout + pip install -e \".[dev]\".",
  ],
  homework: {
    basic: {
      title: "Concurrent downloader",
      brief: ["Write a script that downloads 10 URLs concurrently with httpx, limited to 3 at a time, with a 5 s timeout each, and prints status code and size, sorted by size."],
      criteria: ["Semaphore of 3", "Per-request timeout", "Errors reported per URL without stopping others"],
      hints: ["Reuse the ingest.py pattern."],
      solution: {
        text: ["Same structure as ingest.py with a smaller semaphore and sorting the results; errors are values, not exceptions, so sorting must handle them."],
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
      hints: ["A coroutine object cannot be re-awaited; pass `lambda: fetch(url)`."],
      solution: {
        text: ["The factory is the key insight: each attempt needs a fresh coroutine."],
        code: {
          lang: "python",
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

def test_retry():
    calls = 0
    async def flaky():
        nonlocal calls
        calls += 1
        if calls < 3:
            raise ConnectionError("boom")
        return "ok"
    assert asyncio.run(retry(flaky, base=0.01)) == "ok"
    assert calls == 3`,
        },
      },
    },
    challenge: {
      title: "Benchmark the three models",
      brief: ["Compute SHA-256 chains (CPU-bound) and simulated downloads (asyncio.sleep, I/O-bound) using: sequential, threads, processes, asyncio. Produce a table of timings and explain each result with the GIL and event-loop model."],
      criteria: ["4 approaches × 2 workloads", "Timings table", "Correct explanation for each cell"],
      hints: ["For I/O with threads use time.sleep in a ThreadPoolExecutor."],
      solution: {
        text: [
          "Expected pattern (numbers vary by machine): I/O-bound: threads and asyncio ≈ the single longest wait; processes also fast but with startup overhead; sequential = sum. CPU-bound: threads ≈ sequential (GIL, on standard CPython); processes ≈ sequential / cores; asyncio ≈ sequential (nothing awaits). The table is a strong portfolio artefact because it shows you measured instead of guessing.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: async feed fetcher package",
      brief: ["Turn services/ai into a proper package with pyproject.toml and src layout. Add `devatlas_ai/feeds.py` with an async `fetch_all(urls)` using a semaphore, timeouts and per-feed errors, exposed as the `devatlas-ingest` command."],
      criteria: ["pip install -e \".[dev]\" works on a clean venv", "devatlas-ingest command runs", "Unit test with a fake transport (httpx.MockTransport)"],
      hints: ["httpx.MockTransport(lambda request: httpx.Response(200, text='<rss/>')) avoids the network in tests."],
      solution: {
        text: ["Inject the AsyncClient so tests pass one built on MockTransport; production builds a real one. This is the Protocol/injection idea from the previous lesson, applied to HTTP."],
        code: {
          lang: "python",
          file: "tests/test_feeds.py",
          code: `import asyncio, httpx
from devatlas_ai.feeds import fetch_all

def test_fetch_all_reports_errors_per_feed():
    def handler(request: httpx.Request) -> httpx.Response:
        if "bad" in str(request.url):
            return httpx.Response(500)
        return httpx.Response(200, text="<rss/>")
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    results = asyncio.run(fetch_all(["https://ok.test/rss", "https://bad.test/rss"], client=client))
    assert results["https://ok.test/rss"] == "<rss/>"
    assert results["https://bad.test/rss"].startswith("error")`,
        },
      },
    },
  },
  deeper: [
    { label: "Python docs: asyncio", url: "https://docs.python.org/3/library/asyncio.html" },
    { label: "Python docs: concurrent.futures", url: "https://docs.python.org/3/library/concurrent.futures.html" },
    { label: "Python Packaging User Guide", url: "https://packaging.python.org/en/latest/tutorials/packaging-projects/" },
    { label: "HTTPX: Async support", url: "https://www.python-httpx.org/async/" },
  ],
  nextPreview: "Next: testing with pytest. Fixtures, parametrize and mocking at the right boundaries, so you can change code without fear.",
};
