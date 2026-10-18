import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.1",
  title: "The event loop, promises and async/await",
  minutes: 65,
  level: "Intermediate",
  prerequisites: ["Basic JavaScript syntax", "Node.js 20+ installed (node -v)"],
  summary: "Build an exact mental model of the JavaScript event loop so you can predict execution order, run work in parallel safely and never block the UI or your server.",
  terms: [
    { term: "Call stack", def: "The list of functions currently executing. JavaScript runs one stack at a time: single-threaded." },
    { term: "Event loop", def: "The mechanism that takes the next queued task when the call stack is empty." },
    { term: "Macrotask (task)", def: "A queued callback such as setTimeout, I/O completion or a UI event." },
    { term: "Microtask", def: "A higher-priority queue for promise callbacks (.then, await continuations) and queueMicrotask." },
    { term: "Promise", def: "An object representing a future value: pending, then fulfilled or rejected." },
    { term: "async/await", def: "Syntax over promises. `await` pauses the async function and resumes it as a microtask when the promise settles." },
  ],
  problem: [
    "The DevAtlas dashboard loads the user, their courses and the news feed. Written with three sequential `await`s, it takes 900 ms. The three calls do not depend on each other. Running them in parallel takes 300 ms.",
    "Meanwhile, on the Node.js API, one endpoint parses a large JSON file synchronously. While it runs, every other user's request waits. Both problems come from not understanding the event loop.",
  ],
  concept: {
    analogy: [
      "Picture a restaurant with **one chef** (the JavaScript thread). The chef cooks one dish at a time (the call stack). Slow things, like waiting for an oven, are handed to helpers (the browser or Node's I/O system). When the oven beeps, a ticket goes into a queue. The chef only picks a new ticket after finishing the current dish. **VIP tickets** (microtasks: promise callbacks) are always served before regular tickets (macrotasks: timers, I/O).",
    ],
    precise: [
      "JavaScript runs on one thread per event loop. Asynchronous APIs (timers, network, file I/O) are executed by the host environment (browser or Node.js via libuv), which queues callbacks when work completes.",
      "The loop: run the current task to completion → **drain the entire microtask queue** → (in browsers, maybe render) → take the next macrotask. So `Promise.resolve().then(fn)` always runs before `setTimeout(fn, 0)`.",
      "`await x` splits the function: everything after it becomes a continuation scheduled as a microtask once `x` settles. Code that is CPU-heavy and synchronous blocks everything, because the chef never returns to the queue.",
    ],
  },
  underTheHood: {
    text: [
      "Node's event loop (libuv) runs in phases: timers → pending callbacks → poll (I/O) → check (setImmediate) → close callbacks. Microtasks (and `process.nextTick`, which runs even before promise microtasks) are drained between each callback.",
      "In browsers, rendering happens between tasks at most once per frame (~16.7 ms at 60 Hz). A task that runs for 200 ms freezes scrolling and clicks: this is what Interaction to Next Paint (INP) measures.",
    ],
    diagram: {
      title: "One turn of the event loop",
      nodes: [
        { label: "Call stack", sub: "run sync code" },
        { label: "Microtasks", sub: "drain ALL" },
        { label: "Render", sub: "browser, if due" },
        { label: "Macrotask", sub: "next timer / I/O" },
      ],
      edges: ["stack empty", "queue empty", "next task"],
      caption: "A microtask that keeps scheduling microtasks starves timers and rendering forever.",
    },
  },
  handsOn: [
    {
      title: "Predict the order",
      text: ["Write down your prediction before running."],
      code: {
        lang: "javascript",
        file: "order.mjs",
        code: `console.log("1 sync start");

setTimeout(() => console.log("5 timeout"), 0);

Promise.resolve()
  .then(() => console.log("3 microtask 1"))
  .then(() => console.log("4 microtask 2"));

(async () => {
  console.log("2 async fn body runs synchronously");
  await null;
  console.log("3b after await (microtask)");
})();

console.log("2b sync end");`,
      },
      output: "1 sync start\n2 async fn body runs synchronously\n2b sync end\n3 microtask 1\n3b after await (microtask)\n4 microtask 2\n5 timeout",
      notes: ["Run with `node order.mjs`. The async function body runs synchronously until its first await. Microtasks interleave in the order they were queued."],
    },
    {
      title: "Sequential vs parallel",
      code: {
        lang: "javascript",
        file: "parallel.mjs",
        code: `const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const getUser = () => wait(300, { id: 1 });
const getCourses = () => wait(300, ["Git", "Docker"]);
const getNews = () => wait(300, ["Rust 2024 edition"]);

console.time("sequential");
const u1 = await getUser();
const c1 = await getCourses();
const n1 = await getNews();
console.timeEnd("sequential");

console.time("parallel");
const [u2, c2, n2] = await Promise.all([getUser(), getCourses(), getNews()]);
console.timeEnd("parallel");`,
      },
      output: "sequential: ~900ms\nparallel: ~300ms",
      notes: ["Top-level await works in ES modules (.mjs or \"type\": \"module\"). The calls start when the functions are called, not when awaited: `Promise.all` just waits for all of them."],
    },
    {
      title: "Handle partial failure",
      code: {
        lang: "javascript",
        code: `// Promise.all rejects as soon as ANY promise rejects.
// For a dashboard, show what loaded and degrade the rest:
const results = await Promise.allSettled([getUser(), getCourses(), fetchNewsThatFails()]);
for (const r of results) {
  if (r.status === "fulfilled") render(r.value);
  else showWidgetError(r.reason);
}`,
      },
      notes: ["Promise.any resolves with the first success (useful for mirrors); Promise.race settles with the first to settle (useful for timeouts)."],
    },
    {
      title: "Add a timeout with AbortController",
      code: {
        lang: "javascript",
        file: "fetch-timeout.mjs",
        code: `async function fetchJson(url, ms = 3000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`);
  return res.json();
}

try {
  const data = await fetchJson("https://api.github.com/repos/nodejs/node");
  console.log(data.full_name, data.stargazers_count);
} catch (err) {
  console.error("Request failed:", err.name, err.message);
}`,
      },
      notes: ["`fetch` is global in Node 18+. `AbortSignal.timeout` is available in modern browsers and Node 17.3+. fetch only rejects on network errors; you must check `res.ok` for 4xx/5xx."],
    },
    {
      title: "Do not block the loop",
      code: {
        lang: "javascript",
        code: `// BAD: blocks every request for the duration
app.get("/report", (req, res) => {
  const data = JSON.parse(fs.readFileSync("huge.json", "utf8"));
  res.json(summarise(data));
});

// BETTER: async I/O; for heavy CPU work move it to a worker_thread or a job queue
app.get("/report", async (req, res) => {
  const text = await fs.promises.readFile("huge.json", "utf8");
  res.json(await runInWorker(text)); // runInWorker: your worker_threads wrapper
});`,
      },
      notes: ["Async I/O frees the thread while waiting for disk. Parsing a huge JSON string is still CPU work on the main thread, which is why the heavy part belongs in a worker or background job."],
    },
  ],
  companies: [
    "**Node.js powers high-concurrency I/O services** (APIs, gateways, real-time apps) because one thread can handle many simultaneous connections while they wait on the network. Teams monitor **event-loop lag** as a key health metric; when it rises, something is blocking.",
    "**Frontend teams track INP** (Interaction to Next Paint), a Core Web Vital that Google uses in search ranking signals. Long tasks on the main thread are the usual cause, so heavy work gets split up, deferred or moved to Web Workers.",
    "**Fan-out with limits.** Backend-for-frontend services call many downstream APIs in parallel with `Promise.all`, but cap concurrency (e.g. with a small pool) so they do not overload dependencies or hit rate limits.",
  ],
  mistakes: [
    { mistake: "Sequential awaits for independent calls", why: "await reads like normal code", wrong: "Latency adds up: 3 × 300 ms instead of 300 ms", fix: "Start all calls first, then `await Promise.all([...])`" },
    { mistake: "Using forEach with async callbacks", why: "forEach looks like a loop", wrong: "forEach does not await; errors become unhandled rejections and code continues early", fix: "Use `for...of` with await (sequential) or `Promise.all(items.map(...))` (parallel)" },
    { mistake: "Not checking res.ok after fetch", why: "Assuming fetch rejects on 404/500", wrong: "Error pages get parsed as data or throw confusing JSON errors", fix: "`if (!res.ok) throw new Error(...)`" },
    { mistake: "Unbounded Promise.all over thousands of items", why: "Parallel feels faster", wrong: "Thousands of sockets, rate-limit bans, memory spikes", fix: "Batch or use a concurrency limit (e.g. 5 to 20 at a time)" },
    { mistake: "CPU-heavy work on the main thread", why: "It works fine with small test data", wrong: "The UI freezes or every API request stalls", fix: "Chunk work, use Worker threads / Web Workers, or a job queue" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Parallelise independent I/O with Promise.all; bound concurrency for large lists." },
    { tag: "Reliability", text: "Every network call gets a timeout (AbortSignal.timeout) and error handling; use allSettled when partial results are acceptable." },
    { tag: "Reliability", text: "Handle rejections: always `await` or `.catch` a promise. In Node, unhandled rejections crash the process by default (since v15)." },
    { tag: "Maintainability", text: "Prefer async/await over nested .then chains; keep one style per codebase." },
  ],
  interview: [
    { q: "Explain the difference between microtasks and macrotasks.", a: "After each macrotask (timer, I/O, event), the event loop drains the entire microtask queue (promise callbacks, await continuations, queueMicrotask) before taking the next macrotask or rendering. So promise callbacks always run before a setTimeout(0) that was scheduled at the same time." },
    { q: "Is Node.js single-threaded?", a: "Your JavaScript runs on a single thread per event loop, but Node uses a thread pool (libuv) for some I/O like file system and DNS lookups, and the OS handles network I/O asynchronously. You can also use worker_threads for CPU-bound work." },
    { q: "Promise.all vs Promise.allSettled?", a: "all rejects on the first rejection and gives you all values only if every promise fulfils; allSettled waits for every promise and returns each result with a status. Use all when everything is required, allSettled when partial success is fine." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What is the output order?",
      code: { lang: "javascript", code: "setTimeout(() => console.log('A'), 0);\nPromise.resolve().then(() => console.log('B'));\nconsole.log('C');" },
      options: ["A B C", "C A B", "C B A", "B C A"],
      answer: 2,
      explanation: "Synchronous code first (C), then microtasks (B), then the timer macrotask (A).",
    },
    {
      kind: "bug",
      prompt: "Why does 'done' print before all saves finish?",
      code: { lang: "javascript", code: "items.forEach(async (item) => {\n  await save(item);\n});\nconsole.log('done');" },
      options: ["save is synchronous", "forEach ignores the returned promises", "await is not allowed in arrow functions", "console.log is async"],
      answer: 1,
      explanation: "forEach discards each callback's promise. Use `await Promise.all(items.map(save))` or a for...of loop.",
    },
    {
      kind: "mcq",
      prompt: "Three independent API calls take 200, 300 and 400 ms. With Promise.all, total time is about:",
      options: ["200 ms", "400 ms", "900 ms", "300 ms"],
      answer: 1,
      explanation: "They run concurrently, so you wait for the slowest one: ~400 ms.",
    },
  ],
  cheatSheet: [
    "Order: sync code → all microtasks → (render) → next macrotask.",
    "Microtasks: .then, await continuations, queueMicrotask. Macrotasks: setTimeout, I/O, events.",
    "An async function runs synchronously until its first await.",
    "Independent calls: `await Promise.all([a(), b()])`.",
    "Partial results OK: `Promise.allSettled`.",
    "fetch: check `res.ok`; add `AbortSignal.timeout(ms)`.",
    "Never `forEach(async ...)`.",
    "CPU-heavy work → Worker threads / Web Workers / job queue.",
  ],
  homework: {
    basic: {
      title: "Order puzzles",
      brief: ["Write three snippets mixing setTimeout, Promise.then, async/await and queueMicrotask. Predict each output order in a comment, run them, and explain any surprise."],
      criteria: ["3 snippets with predictions written before running", "Actual output pasted", "Explanation using the terms task and microtask"],
      hints: ["Try a .then that schedules another setTimeout, and a setTimeout that resolves a promise."],
      solution: {
        text: ["Apply the rule mechanically: finish the current task, drain microtasks (including ones added while draining), then the next task. Most surprises come from forgetting that an async function body is synchronous until the first await."],
        code: { lang: "javascript", code: `setTimeout(() => {
  console.log("t1");
  Promise.resolve().then(() => console.log("m-inside-t1"));
}, 0);
setTimeout(() => console.log("t2"), 0);
// Output: t1, m-inside-t1, t2  (microtasks drain between the two timer tasks)` },
      },
    },
    intermediate: {
      title: "Concurrency-limited map",
      brief: ["Implement `mapLimit(items, limit, fn)` that runs async fn over items with at most `limit` in flight, returning results in input order. Test it with 10 items, limit 3, and log the max concurrency observed."],
      criteria: ["Never exceeds limit", "Results preserve input order", "A rejection rejects the overall promise"],
      hints: ["Start `limit` workers; each worker takes the next index from a shared counter until none are left."],
      solution: {
        text: ["Worker pool pattern: the shared index is safe because JavaScript runs one piece of code at a time, so `next++` cannot race."],
        code: {
          lang: "javascript",
          file: "mapLimit.mjs",
          code: `export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}`,
        },
        pitfalls: ["Pushing results in completion order instead of by index", "Creating all promises up front (which already starts them all) and then 'limiting' the awaiting"],
      },
    },
    challenge: {
      title: "Retry with exponential backoff",
      brief: ["Write `retry(fn, { retries, baseMs })` that retries on failure with delays baseMs × 2^attempt plus random jitter, gives up after `retries`, and does not retry 4xx errors (except 429). Explain why jitter matters."],
      criteria: ["Correct delay sequence", "Distinguishes retryable from non-retryable errors", "Explanation of the thundering-herd problem"],
      hints: ["Attach the status code to your error objects so retry can inspect it."],
      solution: {
        text: [
          "Jitter spreads retries out. Without it, thousands of clients that failed at the same moment all retry at the same moment, hitting the recovering service in synchronized waves (thundering herd).",
        ],
        code: {
          lang: "javascript",
          code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const retryable = (err) => !err.status || err.status >= 500 || err.status === 429;

export async function retry(fn, { retries = 3, baseMs = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !retryable(err)) throw err;
      const delay = baseMs * 2 ** attempt;
      await sleep(delay / 2 + Math.random() * (delay / 2)); // "equal jitter"
    }
  }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas step 5: dashboard data loader",
      brief: ["Write `loadDashboard()` for the DevAtlas frontend that fetches user, progress and news in parallel with a 3 s timeout each, and returns partial data with per-widget errors instead of failing the whole page."],
      criteria: ["Uses Promise.allSettled", "Each fetch has a timeout", "Returns { user, progress, news, errors }"],
      hints: ["Reuse fetchJson from the hands-on section."],
      solution: {
        text: ["Map each settled result to either data or an error entry; the UI renders whatever is available."],
        code: {
          lang: "typescript",
          code: `export async function loadDashboard() {
  const [user, progress, news] = await Promise.allSettled([
    fetchJson("/api/me"), fetchJson("/api/progress"), fetchJson("/api/news?limit=5"),
  ]);
  const pick = (r: PromiseSettledResult<unknown>) => (r.status === "fulfilled" ? r.value : null);
  const errors = [user, progress, news]
    .map((r, i) => (r.status === "rejected" ? ["user", "progress", "news"][i] : null))
    .filter(Boolean);
  return { user: pick(user), progress: pick(progress), news: pick(news), errors };
}`,
        },
      },
    },
  },
  deeper: [
    { label: "MDN: The event loop / JavaScript execution model", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model" },
    { label: "MDN: Using promises", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises" },
    { label: "Node.js: The event loop, timers and process.nextTick()", url: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick" },
    { label: "web.dev: Interaction to Next Paint (INP)", url: "https://web.dev/articles/inp" },
  ],
  nextPreview: "Next: closures, scope and modules. Why a loop of callbacks prints the same number, and how JavaScript modules keep code organised.",
};
