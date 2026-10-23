import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.1",
  title: "The event loop, promises and async/await",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["Basic JavaScript syntax", "Node.js 20+ installed (node -v)"],
  summary: "Build an exact mental model of the JavaScript event loop so you can predict execution order, run work concurrently without blocking, and never let a floating promise take down a server.",
  terms: [
    { term: "Call stack", def: "The list of function frames currently executing, last in first out. JavaScript runs one stack at a time on one thread, and a function runs to completion before anything else can use that thread." },
    { term: "Event loop", def: "The scheduler that runs one queued task at a time, then drains all microtasks, then picks the next task. It never runs two pieces of your JavaScript at the same instant." },
    { term: "Macrotask (task)", def: "A unit of work taken from a queue by the event loop: a due setTimeout/setInterval, an I/O completion, a UI or message event. Exactly one macrotask runs per loop turn, after microtasks are empty." },
    { term: "Microtask", def: "A higher-priority callback queued by a promise reaction (.then/.catch/.finally), an await continuation, or queueMicrotask. The whole microtask queue is drained after every callback, before the next macrotask or render." },
    { term: "Poll phase", def: "The libuv phase that collects ready I/O events, runs their callbacks, and blocks waiting for I/O when there is nothing else to do (bounded by the next timer)." },
    { term: "Check phase", def: "The libuv phase right after poll, where setImmediate callbacks run. Inside an I/O callback, setImmediate reliably runs before a setTimeout(fn, 0) scheduled at the same moment." },
    { term: "Promise", def: "An object representing a future value. It is pending, then fulfilled with a value or rejected with a reason. A promise settles once; later calls cannot change it." },
    { term: "Promise state", def: "pending → fulfilled or rejected (together called settled). Calling .then on a settled promise queues its reaction as a microtask immediately; on a pending one it stores the reaction until settlement." },
    { term: "async/await", def: "Syntax over promises. An async function returns a promise immediately, runs synchronously until its first await, then resumes as a microtask when the awaited value settles. A throw becomes a rejection." },
    { term: "libuv", def: "The C library under Node.js that owns the event loop, its phases, and a small thread pool (default 4 threads) used for file system, dns.lookup, crypto and zlib work. Network I/O is handled by the OS, not that pool." },
    { term: "Concurrency vs parallelism", def: "Concurrency means several tasks are in progress in overlapping time windows, interleaved by one thread while they wait. Parallelism means they literally execute at the same instant on different cores (worker_threads, cluster, another process)." },
    { term: "Unhandled rejection", def: "A rejected promise with no handler attached by the end of the turn in which it rejected. Since Node 15 the default is to throw and exit with code 1, which kills the process." },
  ],
  problem: [
    "The DevAtlas dashboard loads the user, their courses and the news feed. Written with three sequential `await`s it takes about 900 ms; the three calls are independent, so starting them together takes about 300 ms. Nothing throws and nothing logs an error - the code just waits three times in a row, and a reviewer reads it as perfectly ordinary.",
    "Meanwhile, on the Node.js API, one endpoint parses a large JSON file synchronously. While it runs, every other user's request waits, because one function is occupying the only thread that runs your JavaScript. Both problems come from the same missing mental model: what runs now, what waits in a queue, and what \"waiting\" even means when there is only one thread. Get that model right and ordering surprises, slow dashboards, frozen UIs and processes that die with exit code 1 stop being mysteries.",
  ],
  concept: {
    analogy: [
      "Picture a restaurant with **one chef** (the JavaScript thread). The chef cooks one dish at a time (the call stack) and never leaves a dish half-plated. Slow things - an oven, a delivery - go to helpers: the browser or Node's I/O system. When something is ready, a ticket goes on the rail. The chef takes the next ticket only after finishing the current dish. **VIP tickets** (microtasks: promise callbacks) are always served before regular tickets (macrotasks: timers, I/O), and the chef clears the entire VIP rail before touching the regular one.",
      "That same kitchen explains the two words people confuse. One chef with ten ovens is **concurrency**: ten dishes are in progress at once, but only one pair of hands moves at any instant, and the chef is free while the ovens work. Three chefs is **parallelism**: three dishes are genuinely cooking at the same instant, which needs three kitchens (worker threads or processes). Hiring more chefs does not help if the bottleneck is one oven, and adding ovens does not help if the chef is chopping for ten minutes.",
    ],
    precise: [
      "JavaScript executes one task at a time on one thread per event loop. Synchronous code runs to completion; asynchronous APIs (timers, network, disk) are executed by the host - libuv in Node, the browser's networking and rendering engine in a page - which queues a callback when the work finishes. The loop is: run the current task to completion → drain the **entire** microtask queue → in a browser, maybe render → take the next macrotask. Node adds a second, separate `process.nextTick` queue around each callback, so its exact interleaving with promises is Node's detail rather than the language spec. The ordering that is guaranteed everywhere is why `Promise.resolve().then(fn)` always runs before a `setTimeout(fn, 0)` scheduled at the same time, and why an infinite microtask chain starves timers and painting forever.",
      "`await x` does not block the thread; it suspends the async function and returns control to the caller. Everything after the await becomes a continuation that is queued as a microtask when `x` settles. An async function starts executing synchronously up to its first await and returns a promise immediately, so `console.log` before the await runs in the current task while code after it runs later. Awaiting a non-promise (`await null`) still costs one microtask tick, because the value is wrapped in an already-resolved promise.",
      "\"Parallel\" in JavaScript usually means concurrent I/O, not simultaneous execution. `Promise.all([a(), b(), c()])` starts all three and waits for the slowest, so its duration is the maximum, not the sum; the three waits overlap because the thread is idle while the OS or another thread does the work. A `Promise.all` over 5,000 URLs is still one thread and 5,000 sockets, which is why production code bounds concurrency. Genuine parallelism for CPU work needs `worker_threads` in Node, Web Workers in a browser, or another process; moving work there costs message passing and cannot share ordinary objects.",
      "Promises turn callback ordering into a state machine. A promise is pending, then fulfilled with a value or rejected with a reason, and settlement is permanent. `.then` returns a **new** promise, which is why returning a promise from a `.then` callback makes the chain wait for it, while forgetting the return makes the chain resolve early with `undefined`. `async`/`await` is the same machinery with better syntax: an async function's return value fulfils its promise, a throw rejects it, and an unhandled rejection is reported at the end of the turn - by default in Node 15+ that report is fatal, exit code 1.",
    ],
  },
  underTheHood: {
    text: [
      "1. **The call stack is the whole story for synchronous code.** Every function call pushes a frame; returning pops it. Because the stack belongs to one thread, a function runs to completion and nothing else - no timer, no click handler, no other request - can run until it returns. `JSON.parse` of a 40 MB string, a busy `for` loop, or an accidental infinite recursion all hold that stack. Recursion also has a finite depth (roughly 10,000 frames in V8), which is why deep recursion throws `RangeError: Maximum call stack size exceeded` instead of politely returning.",
      "2. **Node's loop walks phases in a fixed order.** libuv runs `timers` (due `setTimeout`/`setInterval`) → `pending callbacks` (deferred system errors such as a failed TCP connect) → `idle, prepare` (internal) → `poll` (I/O callbacks, new connections) → `check` (`setImmediate`) → `close callbacks` (handle close events), then repeats. Microtasks are **not** a phase: after every callback in every phase, Node drains `process.nextTick` and then the promise queue before moving on. That is the detail that explains most ordering puzzles.",
      "3. **The poll phase is where a healthy server spends its time.** If I/O is ready, poll runs those callbacks; if nothing is ready and no timer is due, it blocks, waiting for I/O, until the next timer is due. This blocking wait is why one Node process can hold thousands of idle connections: waiting costs no CPU and no stack. It also explains the classic `setTimeout(fn, 0)` versus `setImmediate(fn)` question: inside an I/O callback, check runs after poll in the same turn, so `setImmediate` wins; when both are scheduled from the main module the order is not guaranteed, and the docs tell you not to depend on it. Timer delays are also clamped: anything below 1 ms becomes 1 ms, and values above 2,147,483,647 ms become 1 ms with a warning.",
      "4. **`process.nextTick` is not a promise, and its priority is subtler than the folklore.** Node keeps a separate nextTick queue that it drains after the current operation completes, before the loop proceeds to the next phase or callback. Inside an I/O callback, a nextTick queued there runs before a promise microtask queued at the same moment - our trace below shows `nextTick` then `microtask`. At the top level of an ES module, the same Node 24 build ran the module's promise callbacks first, while the identical code in CommonJS ran the nextTick first; that difference comes from how module evaluation interacts with V8's microtask checkpoint, and it is a good reason not to build logic on it. What is reliable: both queues drain to empty before the next phase, and a nextTick that re-queues itself starves timers and I/O just like a self-resolving promise. Prefer `queueMicrotask` for the same intent - it uses the standard microtask queue and is portable to browsers.",
      "5. **Inside a promise: reactions, not callbacks.** `.then(fn)` stores `fn` as a reaction on the promise. When the promise settles, the reaction is queued as a microtask, and `fn`'s return value resolves the promise returned by `.then`. Returning a thenable makes the outer promise adopt its state (the resolution procedure), which is how `return fetch(...)` inside `.then` flattens instead of producing a promise of a promise. `await` compiles to roughly the same thing: attach a reaction, suspend the function, resume as a microtask, then either deliver the value or rethrow the rejection. That is also why a `try/catch` around an `await` catches a rejection, and why an async function that throws never throws synchronously to its caller - it returns a rejected promise.",
      "6. **Combinators are scheduling decisions, not magic.** `Promise.all` attaches handlers to every input immediately, resolves with an array in input order when all fulfil, and rejects on the first rejection - but it does **not** cancel the others, which keep running and settling (their rejections are already handled, so they do not become unhandled). `allSettled` never rejects: it waits for every input and returns `{status, value}` or `{status, reason}` in input order. `race` settles with the first input to settle (success or failure), and `any` fulfils with the first success, rejecting with an `AggregateError` only if every input fails. In every case the elapsed time is governed by the slowest (or first) promise, not by the number of calls, and every callback still runs on the same single thread.",
      "7. **A rejection with no handler is a process-level event.** Node checks at the end of the turn whether a rejected promise ever got a handler. If not, the default mode `throw` prints the error, emits `unhandledRejection`, and exits with code 1; `--unhandled-rejections=warn` logs instead and `none` ignores it, but those flags hide bugs rather than fix them. A throw inside a `setTimeout` or an async function called without `await` (a \"floating\" promise) therefore does not crash the caller - it crashes the process later, at a stack trace that no longer includes the call site. In a container that means a restart loop; in a serverless function it means a failed invocation that may still have billed you for the work.",
      "8. **What this looks like when you measure it.** Running a small script that reads a file and, inside that I/O callback, queues a nextTick, a promise microtask, a `setImmediate` and a `setTimeout(0)`, the real order was: the poll callback body, then `nextTick`, then `microtask`, then `check`, then `timer`. Read that trace against the phase list above and the loop stops being abstract. Watch two numbers in production: **event-loop lag** (`perf_hooks.monitorEventLoopDelay`, or `eventLoopUtilization`) and request latency at the p99. When lag climbs while CPU is pegged, the fix is to move work off the loop - chunk it, yield with `setImmediate`, push it to a `worker_threads` pool or a job queue - not to add more `await`s.",
    ],
    diagram: {
      title: "One turn of the loop: phases, then the repeat",
      nodes: [
        { label: "Sync code", sub: "call stack runs to completion" },
        { label: "Timers", sub: "due setTimeout" },
        { label: "Poll", sub: "I/O ready, or wait" },
        { label: "Check", sub: "setImmediate" },
        { label: "Close", sub: "closed handles" },
        { label: "Microtasks", sub: "drain after every callback" },
      ],
      edges: ["stack empty", "timer due", "I/O done", "immediate", "next turn"],
      caption: "Microtasks (and Node's separate process.nextTick queue) are not a phase: they drain after every callback, so a promise queued in poll runs before the check phase. A microtask that keeps re-queueing itself starves every later phase.",
    },
  },
  handsOn: [
    {
      title: "Predict the order",
      text: ["Write down your prediction before running. The output is a direct consequence of three rules: synchronous code first, the whole microtask queue next, then one macrotask."],
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
      notes: [
        "Run with `node order.mjs`. The async function body runs synchronously until its first await; `await null` still suspends and resumes as a microtask. Microtasks interleave in the order they were queued.",
        "The timer is a macrotask, so it runs after every microtask even though its delay is 0. `setTimeout(fn, 0)` means \"not before the next turn\", never \"now\".",
        "In Node, `process.nextTick` has its own queue. Run the same file as CommonJS with a `process.nextTick` call added and it prints before `3 microtask 1`; at the top level of this ES module, Node 24 ran the promises first. Either way both queues finish before the timer.",
      ],
    },
    {
      title: "Sequential vs concurrent",
      text: ["Both blocks call the same three functions. The only difference is whether each call is awaited before the next one starts."],
      code: {
        lang: "javascript",
        file: "parallel.mjs",
        code: `const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const getUser = () => wait(300, { id: 1 });
const getCourses = () => wait(300, ["Git", "Docker"]);
const getNews = () => wait(300, ["Rust 2024 edition"]);

let t0 = performance.now();
const u1 = await getUser();
const c1 = await getCourses();
const n1 = await getNews();
console.log(\`sequential: \${Math.round(performance.now() - t0)} ms\`);

t0 = performance.now();
const [u2, c2, n2] = await Promise.all([getUser(), getCourses(), getNews()]);
console.log(\`parallel:   \${Math.round(performance.now() - t0)} ms\`);
console.log(u2.id, c2.join("/"), n2[0]);`,
      },
      output: "sequential: 938 ms\nparallel:   310 ms\n1 Git/Docker Rust 2024 edition",
      notes: [
        "Real numbers from one run on Node 24; yours will differ by a few milliseconds. The shape is what matters: three 300 ms waits cost about 900 ms in sequence and about 300 ms together.",
        "Each `wait` starts its timer when the function is **called**, not when it is awaited. `Promise.all` does not start anything either: the array expression calls all three functions first, then all waits for them.",
        "This is concurrency, not parallelism. One thread, one timer list, three waits overlapping because the thread is idle. Sequential code is not slower because of overhead; it is slower because it refuses to overlap idle time.",
        "Timeouts belong on every network call: pass `AbortSignal.timeout(3000)` to `fetch` so one hung socket cannot hold the dashboard open forever.",
      ],
    },
    {
      title: "Handle partial failure",
      text: ["`Promise.all` is all-or-nothing. Run this to see what a dashboard can do instead when one widget's API is down."],
      code: {
        lang: "javascript",
        file: "settled.mjs",
        code: `const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
const getUser = () => wait(50, { id: 1, name: "Ada" });
const getCourses = () => wait(80, ["Git", "Docker"]);
const getNews = () =>
  wait(20).then(() => {
    throw new Error("news API returned 503");
  });

try {
  await Promise.all([getUser(), getCourses(), getNews()]);
} catch (err) {
  console.log(\`Promise.all rejected early: \${err.message}\`);
}

const results = await Promise.allSettled([getUser(), getCourses(), getNews()]);
for (const r of results) {
  if (r.status === "fulfilled") {
    console.log(\`fulfilled: \${JSON.stringify(r.value)}\`);
  } else {
    console.log(\`rejected:  \${r.reason.message}\`);
  }
}
console.log(\`statuses: \${results.map((r) => r.status).join(", ")}\`);`,
      },
      output: "Promise.all rejected early: news API returned 503\nfulfilled: {\"id\":1,\"name\":\"Ada\"}\nfulfilled: [\"Git\",\"Docker\"]\nrejected:  news API returned 503\nstatuses: fulfilled, fulfilled, rejected",
      notes: [
        "`Promise.all` rejected after about 20 ms, when the failing call settled, not after 80 ms: fail-fast is the point. It does not cancel the other two, which kept running; their handlers were already attached, so their results were simply discarded.",
        "`allSettled` never rejects. Results keep input order, so the third entry always belongs to the news call no matter which finished first. `reason` is whatever was thrown, which is not always an `Error` - normalise it before showing it to users.",
        "Use `all` when every value is required, `allSettled` for dashboards and batch jobs where partial success is useful, `race` for timeouts, and `any` for mirrored endpoints where the first success wins.",
      ],
    },
    {
      title: "Macrotask, microtask and phase, side by side",
      text: ["Keep this table next to you when you read async code. The first table is the ordering rule; the second is where each Node callback is actually taken from."],
      code: {
        lang: "text",
        file: "queues.txt",
        code: `                      MACROTASK (task)                    MICROTASK
examples              setTimeout, setInterval, I/O,       .then/.catch/.finally, await,
                      UI event, setImmediate              queueMicrotask
queued by             the host (libuv / browser)          the promise machinery
per turn              exactly one                         all of them, until empty
runs before           after every microtask               the next macrotask
can starve            -                                   timers, I/O and rendering

WHERE A CALLBACK IS TAKEN FROM (Node.js / libuv, in order)
PHASE                WHAT RUNS THERE                     EXAMPLE
1 timers             setTimeout / setInterval when due   setTimeout(fn, 0)
2 pending callbacks  deferred system errors              TCP ECONNREFUSED
3 idle, prepare      internal only                       -
4 poll               I/O callbacks, new connections      fs.readFile, net socket
5 check              setImmediate                        setImmediate(fn)
6 close callbacks    handle close events                 socket.on("close")

Not phases: process.nextTick (drains first), then promise microtasks (drain second),
after every callback above. Then the loop repeats from timers.`,
      },
      notes: [
        "`setImmediate` is a macrotask in the check phase, not \"immediate\" in the microtask sense: a promise callback queued at the same time still runs first.",
        "The browser has no `setImmediate` and no libuv; it runs tasks, drains microtasks, then may render at most once per frame (~16.7 ms at 60 Hz). A 200 ms task freezes scrolling and input for 12 frames.",
      ],
    },
    {
      title: "Draw the starvation loop",
      text: ["The most common event-loop bug in production is not a wrong order; it is a queue that never empties. Trace the cycle below and you can predict which of your features will stop responding."],
      code: {
        lang: "mermaid",
        file: "starvation.mmd",
        code: `flowchart TD
  A[Task starts] --> B[Queue a microtask]
  B --> C{Microtask queue empty?}
  C -- no --> D[Run the next microtask]
  D --> B
  C -- yes --> E[Next macrotask: timers, I/O]
  E --> F[Render, if the browser is due]
  F --> A`,
      },
      notes: [
        "If every microtask queues another microtask, `C` never takes the yes branch: timers do not fire, I/O callbacks do not run, and the page never paints. The browser still responds to nothing, because rendering happens between tasks, not between microtasks.",
        "The same shape appears with `process.nextTick` in Node, where it also blocks the poll phase: health checks time out while the process is technically alive. Fix it by breaking the chain with a macrotask (`setImmediate`, `setTimeout`) or by chunking the work and yielding.",
      ],
    },
  ],
  companies: [
    "**Node.js and libuv (illustrative; see the Node docs in Deeper):** the phase model in this lesson is libuv's, not a teaching simplification. Node exposes it for operators through `perf_hooks.monitorEventLoopDelay` and `eventLoopUtilization`, and API teams alert on event-loop lag the way frontend teams alert on INP - a rising lag with flat CPU usually means synchronous work on the loop.",
    "**Google and web.dev (illustrative; INP):** Interaction to Next Paint made \"long tasks on the main thread\" a ranking-relevant metric. The documented remedies are exactly the concepts here: yield to the main thread between chunks, defer non-urgent work, and move heavy computation to a Web Worker, because a microtask or task that runs for 200 ms delays the next paint.",
    "**Netflix-style backend-for-frontend services (illustrative):** a BFF that assembles a page from many downstream APIs gains most of its latency budget by starting calls together, but production implementations cap concurrency per dependency (a small pool, not `Promise.all` over thousands of rows) and use `allSettled` so one failing widget degrades instead of blanking the page.",
    "**Serverless platforms such as AWS Lambda and Vercel Functions (illustrative):** one invocation usually owns one event loop, and you are billed for wall-clock time while it is alive. Sequential awaits multiply billed duration; blocking CPU work raises latency for that invocation and can trip the platform timeout, while async I/O keeps the instance cheap and responsive.",
    "**Payment and API platforms such as Stripe (illustrative):** retries are only safe because clients bound them, back off with jitter, and key idempotent writes. Their SDKs also surface rejected promises instead of swallowing them, because in Node an unhandled rejection is a process exit - and in a container that becomes a restart loop, not a log line.",
  ],
  mistakes: [
    { mistake: "Sequential awaits for independent calls", why: "await reads like normal, top-to-bottom code", wrong: "Latency adds up: three 300 ms calls take 900 ms instead of 300 ms, and the bill for serverless time grows with it", fix: "Start all calls first, then `await Promise.all([...])`; keep sequential awaits only when call B needs A's result" },
    { mistake: "await inside a loop over independent items", why: "A for loop with await is the most obvious way to write it", wrong: "The loop serialises the work: 100 requests at 50 ms each take 5 seconds", fix: "`await Promise.all(items.map(fn))`, or a bounded pool such as `mapLimit(items, 10, fn)` when the list is large" },
    { mistake: "Using forEach with an async callback", why: "forEach looks like a loop that would wait", wrong: "forEach ignores the returned promises, so the code after it runs immediately and failures become unhandled rejections", fix: "Use `for...of` with await (sequential) or `Promise.all(items.map(...))` (concurrent)" },
    { mistake: "Forgetting to return a promise inside .then", why: "The callback does the work, so it looks finished", wrong: "The chain resolves early with undefined, and the caller proceeds before the inner work completes", fix: "`return fetch(...)` inside the callback, or use async/await, which does this implicitly" },
    { mistake: "Floating promises", why: "Calling an async function without await still starts it", wrong: "Nobody sees its rejection: Node reports it at the end of the turn and exits with code 1", fix: "Await it, return it, or attach `.catch`; at a boundary, log with context and decide deliberately" },
    { mistake: "Expecting Promise.all to cancel the rest", why: "Fail-fast sounds like cancellation", wrong: "The other requests keep running, consuming sockets and quota, after the caller has already failed", fix: "Give each call an AbortController and abort the group in the catch block; or use allSettled when you want every result" },
    { mistake: "Believing async makes CPU work non-blocking", why: "An async function returns immediately, so it feels off-thread", wrong: "JSON.parse, hashing and big loops still run on the only thread, freezing requests or the UI", fix: "Move CPU work to worker_threads / a Web Worker / a job queue; async only helps when you are waiting on I/O" },
    { mistake: "Treating setTimeout(fn, 0) as immediate", why: "Zero reads as now", wrong: "The callback waits for the current task and every microtask, and timers are clamped to about 1 ms", fix: "Use `queueMicrotask` to run after the current task, or `setImmediate` to yield to the next check phase in Node" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Start independent I/O together with `Promise.all`; for large lists use a bounded pool (5 to 20 in flight) so you gain concurrency without exhausting sockets or rate limits." },
    { tag: "Reliability", text: "Every network call gets a timeout (`AbortSignal.timeout(ms)`) and explicit error handling; use `allSettled` when a partial result is still useful to the user." },
    { tag: "Reliability", text: "Never leave a promise floating. Await it, return it, or attach `.catch`; in Node an unhandled rejection exits with code 1, so treat it as a defect, not noise." },
    { tag: "Maintainability", text: "Prefer async/await over nested `.then` chains, keep one style per codebase, and make the return of a promise explicit in helper functions." },
    { tag: "Cost", text: "Concurrent I/O shortens billed wall-clock time on serverless and container platforms, and a bounded pool protects downstream services from traffic spikes you caused." },
  ],
  interview: [
    { q: "Explain the difference between microtasks and macrotasks, and where the event loop drains each.", a: "A macrotask is a unit taken from the task queue: a due timer, an I/O completion, a UI or message event. A microtask is a promise reaction, an await continuation or a `queueMicrotask` callback. After each macrotask the loop runs the current callback to completion, then drains the **entire** microtask queue - including microtasks queued while draining - before taking the next macrotask or rendering. In Node the `process.nextTick` queue drains before the promise queue after each callback in each phase, though at the very top level of an ES module the module's own promise callbacks can run first, so do not build logic on the nextTick-versus-promise race. That is why `Promise.resolve().then(fn)` runs before `setTimeout(fn, 0)` scheduled at the same time, why the async body before its first await runs synchronously, and why a microtask that keeps re-queueing itself starves timers and painting. In a browser, rendering is also between tasks, which is why long tasks hurt INP." },
    { q: "Is Node.js single-threaded? Explain concurrency and parallelism in that runtime.", a: "Your JavaScript runs on one thread, one call stack, one event loop at a time - so two callbacks never execute simultaneously. Concurrency comes from asynchronous I/O: the OS handles network sockets and libuv's thread pool (default 4 threads) handles file system, `dns.lookup`, crypto and zlib, and the loop is free while those waits are in flight. That is enough to hold thousands of idle connections, because waiting costs no CPU. Parallelism for CPU-bound work needs extra threads or processes: `worker_threads` (shared memory via `SharedArrayBuffer` if needed), a cluster or multiple containers. The practical consequence: `Promise.all` overlaps waits, not computation, and a synchronous 500 ms parse still blocks every request on that loop. Measure event-loop lag to see it." },
    { q: "Promise.all vs Promise.allSettled vs race vs any - and what happens to the promises that lose?", a: "`all` fulfils with an array in input order when every promise fulfils and rejects with the first rejection; the other promises are not cancelled and keep running, but their outcomes are already handled internally so they do not become unhandled rejections. `allSettled` waits for all and returns `{status: 'fulfilled', value}` or `{status: 'rejected', reason}` in input order, which is what dashboards and batch jobs want. `race` settles with the first promise to settle, success or failure - useful for a timeout guard. `any` fulfils with the first success and rejects with an `AggregateError` only if all fail, useful for mirrors. None of them cancel work; cancellation is a separate mechanism (`AbortController` plus a signal), and you must call `abort()` yourself. Elapsed time is roughly the slowest (or first) promise, not the sum, and all callbacks still share one thread." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What is the output order?",
      code: { lang: "javascript", code: "setTimeout(() => console.log('A'), 0);\nPromise.resolve().then(() => console.log('B'));\nconsole.log('C');" },
      options: ["A B C", "C A B", "C B A", "B C A"],
      answer: 2,
      explanation: "Synchronous code first (C), then the whole microtask queue (B), then the timer macrotask (A). The zero delay does not move A ahead of B.",
    },
    {
      kind: "bug",
      prompt: "Why does 'done' print before all saves finish?",
      code: { lang: "javascript", code: "items.forEach(async (item) => {\n  await save(item);\n});\nconsole.log('done');" },
      options: ["save is synchronous", "forEach ignores the returned promises", "await is not allowed in arrow functions", "console.log is async"],
      answer: 1,
      explanation: "forEach discards each callback's promise. Use `await Promise.all(items.map(save))` or a for...of loop; with forEach, a rejected save also becomes an unhandled rejection.",
    },
    {
      kind: "mcq",
      prompt: "Three independent API calls take 200, 300 and 400 ms. With Promise.all, total time is about:",
      options: ["200 ms", "400 ms", "900 ms", "300 ms"],
      answer: 1,
      explanation: "They run concurrently, so you wait for the slowest one: ~400 ms. Sequential awaits would cost ~900 ms.",
    },
  ],
  cheatSheet: [
    "Order: sync code → drain all microtasks → (render) → next macrotask; Node's nextTick queue is separate and drained around each callback.",
    "Microtasks: .then/.catch/.finally, await continuations, queueMicrotask. Macrotasks: timers, I/O, events, setImmediate.",
    "An async function runs synchronously until its first await, then resumes as a microtask; `await null` still costs one tick.",
    "Node phases: timers → pending → poll → check (setImmediate) → close. Microtasks drain after every callback.",
    "Independent calls: `await Promise.all([a(), b()])`. Total time is the slowest call, not the sum.",
    "Partial results: `allSettled`. First to settle: `race`. First success: `any`. `all` rejects fast but cancels nothing.",
    "await inside a loop is serial: use `map` + `Promise.all`, or a bounded `mapLimit` pool.",
    "Never `forEach(async ...)`; return or await every promise, and give every request an AbortSignal timeout.",
    "Unhandled rejection → exit code 1 in Node 15+; `process.exitCode` and handlers exist but do not fix the bug.",
    "CPU-bound work blocks the loop: worker_threads, Web Workers or a job queue. Concurrency is not parallelism.",
  ],
  homework: {
    basic: {
      title: "Let a rejection kill a throwaway process",
      brief: [
        "Run the command below twice in a scratch directory: once as written, and once with `.catch((err) => console.log('handled:', err.message))` appended to the rejection. Write down the exit code you expect before each run.",
        "Then explain, in three sentences, what your API process does at 3 a.m. when a background job forgets to await a promise.",
      ],
      criteria: [
        "Both runs recorded with the exact command and the real exit code",
        "A one-line rule for when Node decides a rejection is unhandled",
        "One production symptom and one concrete fix",
      ],
      hints: [
        "In PowerShell read `$LASTEXITCODE`; in bash use `echo $?`.",
        "A rejection is unhandled if no handler is attached by the end of the turn in which it rejected - not at the moment it rejects.",
      ],
      solution: {
        text: [
          "The first run prints its log line, then the rejection surfaces as a fatal error and the process exits with code 1. Node waits until the end of the turn (including microtask draining) before deciding that no handler will ever arrive, which is why the synchronous `console.log` still ran first.",
          "The second run attaches `.catch`, so the rejection is handled: one log line and exit code 0. That is the whole difference between a noisy log and a dead process.",
          "A floating promise in a server therefore kills the whole process, not just the request: in-flight requests are dropped, and an orchestrator restarts the container, producing a crash loop. Fixes: await or return the promise, attach `.catch` at the boundary, and set a non-zero `process.exitCode` after logging if you choose to recover. `--unhandled-rejections=warn` only hides the exit from you.",
        ],
        code: {
          lang: "powershell",
          file: "exit-codes.ps1",
          code: `# no handler: crash, exit code 1
node -e "Promise.reject(new Error('news API returned 503')); console.log('scheduled, nothing awaited')"
"exit code: $LASTEXITCODE"

# handled: exit code 0
node -e "Promise.reject(new Error('news API returned 503')).catch((err) => console.log('handled:', err.message))"
"exit code: $LASTEXITCODE"`,
        },
        output: `scheduled, nothing awaited
[eval]:1
Promise.reject(new Error('news API returned 503')); console.log('scheduled, nothing awaited')
               ^

Error: news API returned 503
    at [eval]:1:16
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12
    at [eval]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:449:60)
    at evalFunction (node:internal/process/execution:283:30)
    at evalTypeScript (node:internal/process/execution:295:3)
    at node:internal/main/eval_string:71:3

Node.js v24.18.0
exit code: 1
handled: news API returned 503
exit code: 0`,
        pitfalls: [
          "Checking the exit code in the same pipeline that hides it (for example piping through a formatter)",
          "Assuming a `.catch` attached later in the same tick is too late - it is not, handlers may attach until the turn ends",
        ],
      },
    },
    intermediate: {
      title: "Concurrency-limited map",
      brief: [
        "Implement `mapLimit(items, limit, fn)` that runs async `fn` over items with at most `limit` in flight, returning results in input order. Test it with 10 items, limit 3, and log the maximum concurrency observed.",
      ],
      criteria: ["Never exceeds the limit", "Results preserve input order", "A rejection rejects the overall promise"],
      hints: ["Start `limit` workers; each takes the next index from a shared counter until none are left.", "Count in-flight calls inside the test fn and track the maximum."],
      solution: {
        text: [
          "Worker-pool pattern: the shared index is safe because JavaScript runs one piece of code at a time, so `next++` cannot race between workers. The `await` inside each worker is where the loop becomes free to run the other workers.",
          "The limit protects the downstream service and your socket pool; it is not a CPU knob. Ten workers on one thread still execute one callback at a time, and each callback is trivial - the waiting is what overlaps.",
          "Results are written at their input index, so completion order never leaks into the output. A rejection from any worker rejects `Promise.all(workers)` and propagates to the caller; the other workers finish their current item and then stop taking new ones.",
        ],
        code: {
          lang: "javascript",
          file: "mapLimit.mjs",
          code: `const wait = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

export async function mapLimit(items, limit, fn) {
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
}

let inFlight = 0;
let maxSeen = 0;
const results = await mapLimit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, async (n) => {
  inFlight++;
  maxSeen = Math.max(maxSeen, inFlight);
  await wait(20);
  inFlight--;
  return n * n;
});
console.log(\`results: \${results.join(",")}\`);
console.log(\`max in flight: \${maxSeen}\`);`,
        },
        output: "results: 1,4,9,16,25,36,49,64,81,100\nmax in flight: 3",
        pitfalls: ["Pushing results in completion order instead of by index", "Creating all promises up front (which already starts them all) and then 'limiting' only the awaiting"],
      },
    },
    challenge: {
      title: "Repair a dashboard loader (and retry without a herd)",
      brief: [
        "A teammate's loader has four bugs: an `await` inside a `for` loop over three independent endpoints, a `forEach(async ...)` that saves widgets, a `.then` callback that forgets to `return` the write, and a floating `logVisit()` call. Rewrite it so the three widgets load concurrently, every promise is awaited or returned, and a failing news call is retried with exponential backoff plus jitter while the other widgets still render.",
        "Explain why jitter matters and what `retry` must not retry.",
      ],
      criteria: ["All four bugs identified in writing, with the fix for each", "Widgets load concurrently; partial failure is returned, not thrown", "Retry uses exponential backoff with jitter and skips non-retryable errors"],
      hints: ["`endpoints` is an object: `Object.keys` plus `map` gives you a list of promises in one line.", "Attach the status code to the error so the retry policy can inspect it."],
      solution: {
        text: [
          "The loop awaited each endpoint before starting the next, so three 300 ms calls took 900 ms; `Promise.allSettled(names.map(call))` starts them together and still lets one widget fail. `forEach(async ...)` returned nothing awaitable, so failures escaped as unhandled rejections and the function returned before the writes finished - `Promise.all` over the mapped writes fixes both. A missing `return` inside `.then` made the chain resolve before the write completed. `logVisit()` was called without await or catch, so a failure there would crash the process instead of being logged: return it, await it, or attach `.catch`.",
          "Jitter spreads retries out. Without it, thousands of clients that failed at the same instant all retry at the same instant, hitting the recovering service in synchronized waves - the thundering herd. Retry only transient failures: network errors, 5xx and 429. Never retry 4xx such as 400 or 404, and only retry writes that are idempotent or carry an idempotency key.",
          "Backoff means the second attempt waits longer than the first, so a struggling dependency gets breathing room; equal jitter keeps a random part of each delay. The retry wrapper returns as soon as one attempt succeeds, so the dashboard keeps its partial-result behaviour.",
        ],
        code: {
          lang: "javascript",
          file: "dashboard.mjs",
          code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const retryable = (err) => !err.status || err.status >= 500 || err.status === 429;

export async function retry(fn, { retries = 3, baseMs = 200 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !retryable(err)) throw err;
      const delay = baseMs * 2 ** attempt;
      await sleep(delay / 2 + Math.random() * (delay / 2)); // equal jitter
    }
  }
}

export async function loadDashboard(fetchJson) {
  const endpoints = { user: "/api/me", progress: "/api/progress", news: "/api/news?limit=5" };
  const names = Object.keys(endpoints);
  const call = (name) =>
    name === "news" ? retry(() => fetchJson(endpoints[name])) : fetchJson(endpoints[name]);
  const settled = await Promise.allSettled(names.map(call));
  const data = {};
  const errors = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") data[names[i]] = result.value;
    else errors.push({ widget: names[i], message: result.reason.message });
  });
  return { ...data, errors };
}

let newsAttempts = 0;
const fakeFetchJson = async (url) => {
  await sleep(20);
  if (url === "/api/me") return { id: 1, name: "Ada" };
  if (url === "/api/progress") return { lessons: 12 };
  newsAttempts++;
  if (newsAttempts < 3) {
    const err = new Error("upstream unavailable");
    err.status = 503;
    throw err;
  }
  return ["Rust 2024 edition"];
};

console.log(JSON.stringify(await loadDashboard(fakeFetchJson)));
console.log(\`news attempts: \${newsAttempts}\`);`,
        },
        output: "{\"user\":{\"id\":1,\"name\":\"Ada\"},\"progress\":{\"lessons\":12},\"news\":[\"Rust 2024 edition\"],\"errors\":[]}\nnews attempts: 3",
        pitfalls: ["Retrying 400/404 because the policy only checks 'did it throw'", "Awaiting the retry of one widget before starting the other two", "Retrying a POST without an idempotency key"],
      },
    },
    capstone: {
      title: "DevAtlas step 5: dashboard data loader",
      brief: [
        "Write `loadDashboard()` for the DevAtlas frontend. It must fetch the user, progress and news in parallel, give each request a 3 s timeout, and return partial data with per-widget errors instead of failing the whole page.",
        "Add a note in `docs/architecture.md` saying which requests are independent and why they are started together - the next step will reuse this loader on the dashboard page.",
      ],
      criteria: ["Uses Promise.allSettled", "Each fetch has a timeout", "Returns { user, progress, news, errors }"],
      hints: ["Write a small `fetchJson<T>` helper that checks `res.ok` and passes `AbortSignal.timeout(3000)`.", "Map each settled result to either data or an error entry; the UI renders whatever is available."],
      solution: {
        text: [
          "One `Promise.allSettled` starts all three requests in the same turn, so the page waits for the slowest widget rather than the sum. Each request carries its own timeout, so a hung connection fails that widget instead of holding the page.",
          "The returned object always has the same shape: missing widgets are `null` and every failure appears in `errors` with the widget name. The UI does not need to know which request failed to render the rest.",
        ],
        code: {
          lang: "typescript",
          file: "loadDashboard.ts",
          code: `type Widget = "user" | "progress" | "news";

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`);
  return (await res.json()) as T;
};

export async function loadDashboard() {
  const names: Widget[] = ["user", "progress", "news"];
  const settled = await Promise.allSettled([
    fetchJson("/api/me"),
    fetchJson("/api/progress"),
    fetchJson("/api/news?limit=5"),
  ]);

  const data: Record<Widget, unknown | null> = { user: null, progress: null, news: null };
  const errors: { widget: Widget; message: string }[] = [];

  settled.forEach((result, i) => {
    const widget = names[i];
    if (result.status === "fulfilled") data[widget] = result.value;
    else errors.push({ widget, message: (result.reason as Error).message });
  });

  return { ...data, errors };
}`,
        },
        pitfalls: ["Returning only the successful widgets, so the UI cannot tell 'empty' from 'failed'", "Using Promise.all and losing every widget when the news feed is down"],
      },
    },
  },
  deeper: [
    { label: "MDN: JavaScript execution model (event loop, tasks, microtasks)", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model" },
    { label: "Node.js: The event loop, timers and process.nextTick()", url: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick" },
    { label: "MDN: Promise.all()", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all" },
    { label: "MDN: Promise.allSettled()", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled" },
    { label: "Node.js: process (exit codes, unhandledRejection)", url: "https://nodejs.org/api/process.html" },
    { label: "Jake Archibald: Tasks, microtasks, queues and schedules", url: "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/" },
  ],
  nextPreview: "Next: closures, scope and modules. Why a loop of callbacks prints the same number, and how JavaScript modules keep code organised.",
};
