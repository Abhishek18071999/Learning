import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.2",
  title: "LINQ, generics and async/await",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["1.3.1 C# fundamentals and the .NET runtime"],
  summary: "Write LINQ that runs where you think it runs, use generics and constraints without fighting the compiler, and understand async/await down to the state machine, the deadlock and the cancellation token.",
  terms: [
    { term: "LINQ", def: "Language Integrated Query: operators such as Where, Select, OrderBy and GroupBy that work on any IEnumerable<T>, and through providers such as EF Core, on IQueryable<T>." },
    { term: "IEnumerable<T>", def: "A sequence you can iterate. LINQ over it uses delegates and normally runs in memory, lazily, one element at a time." },
    { term: "Deferred execution", def: "A query is a recipe, not a result. It runs when enumerated (foreach, ToList, Count, First), and it runs again on the next enumeration." },
    { term: "IQueryable<T>", def: "A sequence that carries an expression tree. A provider such as EF Core translates the composed query into SQL instead of running it in C#." },
    { term: "Expression tree", def: "A data structure describing code (`Expression<Func<T, bool>>`) rather than a compiled delegate. EF Core walks it to build WHERE, ORDER BY and JOIN clauses." },
    { term: "Generic constraint", def: "A `where T : ...` clause stating what a type parameter must support, such as `class`, `struct`, `new()`, `notnull`, an interface or a base class." },
    { term: "Task", def: "A reference-type object representing an asynchronous operation that may produce a value later (Task<T>). It can be awaited many times and cached or shared." },
    { term: "ValueTask", def: "A struct wrapper around a Task or an IValueTaskSource. It avoids an allocation when the operation completes synchronously, but it should normally be awaited only once." },
    { term: "SynchronizationContext", def: "An abstraction that decides where continuations run. A UI thread or classic ASP.NET request context has one; ASP.NET Core does not." },
    { term: "ConfigureAwait(false)", def: "Tells the await not to capture the current SynchronizationContext. Library code uses it to avoid forcing continuations onto a caller's context and to avoid deadlocks." },
    { term: "CancellationToken", def: "A cooperative stop signal passed through async calls so work can end when a request is aborted or a timeout expires." },
    { term: "IAsyncEnumerable<T>", def: "An asynchronous stream: `await foreach` pulls one element at a time while the producer awaits I/O, without buffering the whole result in memory." },
  ],
  problem: [
    "The DevAtlas leaderboard endpoint loads every quiz attempt into memory, then filters and sorts in C#. With 2 million rows it uses gigabytes of RAM and takes 12 seconds. A second bug: one LINQ query is enumerated three times, so the same database work happens three times, and the results can even differ if rows change between enumerations.",
    "Meanwhile another endpoint calls `.Result` on a Task to 'make it synchronous', and under load the server stops responding even though CPU is idle. A third endpoint exports a CSV by buffering every row into a list first. LINQ, generics and async are everyday C# tools; using them well is the difference between a fast API and a fragile one, and the key is knowing **when** a query runs and **where** a continuation runs.",
  ],
  concept: {
    analogy: [
      "A LINQ query is a **written order at a restaurant**, not the meal. Writing 'filter, sort, take 10' costs nothing; the kitchen only cooks when someone asks for the food (`ToList`, `foreach`, `Count`). Hand the order to the kitchen twice and it cooks twice, which is why a deferred query enumerated three times does three times the work.",
      "async/await is the same waiter from lesson 1.1.3. While one table waits for the kitchen, the waiter serves other tables instead of standing still. Calling `.Result` is a waiter who blocks the kitchen doorway while waiting for one dish: the dish may be ready, but nobody can bring it out, and the whole restaurant stalls. Generics are the menu template: 'any dish that can be compared by price' rather than a separate menu for pasta, rice and dessert, with the constraint as a compile-time promise that the comparison is possible.",
    ],
    precise: [
      "LINQ operators compose. `Where` filters, `Select` projects, `OrderBy`/`ThenBy` sort, `GroupBy` groups, `Take`/`Skip` page, `Any`/`All`/`Count`/`Sum`/`Average` aggregate, and `First`/`FirstOrDefault`/`Single` pick. On `IEnumerable<T>` they run in memory and lazily; `ToList`, `ToArray`, `Count`, `First` and `Any` force execution immediately. `First` throws `InvalidOperationException` when nothing matches; `FirstOrDefault` returns `default(T)`, which is `null` for a reference type and `0` for `int`, so a missing row can silently look like a real zero.",
      "`IEnumerable<T>` carries delegates (`Func<T, bool>`). `IQueryable<T>` carries an **expression tree** (`Expression<Func<T, bool>>`) that a provider translates. With EF Core, compose `Where`, `OrderBy`, `Take` and `Select` while the query is still `IQueryable`, then materialise with `ToListAsync`. Filtering after `ToList` moves the work to your process; filtering before it lets the database use indexes and return fewer rows. Project only the columns you need and use `AsNoTracking()` for read-only queries.",
      "**Generics** give reuse without losing type information. Constraints (`where T : class`, `where T : struct`, `where T : new()`, `where T : IComparable<T>`, `where T : notnull`) are promises the compiler enforces. The JIT specialises generic code for value types, so `List<int>` stores ints without boxing, while reference types share one implementation. `new()` requires a public parameterless constructor; calling `new T()` without it is compile error CS0304.",
      "**async/await** is a compiler rewrite, not a thread. An `async` method becomes a state machine; at an incomplete `await` it returns a `Task` to the caller and registers a continuation. When the I/O completes, the continuation resumes the state machine, either on the captured `SynchronizationContext` or on the thread pool. `Task` is a heap object you can await repeatedly; `ValueTask` is a struct that avoids an allocation when the result is already available, but it is normally single-use. Never block with `.Result`/`.Wait()`; pass a `CancellationToken`; use `Task.WhenAll` for independent I/O; stream with `IAsyncEnumerable<T>` instead of buffering.",
    ],
  },
  underTheHood: {
    text: [
      "1. **A deferred query is an iterator.** `Where` does not loop over the source. It returns an object whose `GetEnumerator` returns an iterator that, on each `MoveNext`, pulls one element from the source, runs the predicate and yields a match. The compiler turns your lambda into a delegate (for `IEnumerable`) or an expression tree (for `IQueryable`), and a `yield return` method into another state machine. Nothing is read until the first `MoveNext`, which is why adding item 4 after building the query still changes the result, and why enumerating twice repeats every side effect.",
      "2. **Immediate operators end the recipe.** `ToList`, `ToArray`, `Count`, `Sum`, `First`, `Single`, `Any` and `All` enumerate now. That is a feature: call `Any()` instead of `Count() > 0` to stop at the first row, and materialise with `ToList()` once when you need the results more than once. In EF Core, each enumeration of an unmaterialised query is another round trip; three enumerations are three queries, and if the data changes in between, three different answers.",
      "3. **Method syntax and query syntax are the same program.** `from a in attempts where ... orderby ... select ...` is syntactic sugar over `attempts.Where(...).OrderBy(...).Select(...)`. The compiler emits identical calls, and query syntax supports only a subset of operators (`let`, `join`, `group by`, `into` are convenient). Choose the form that reads best; a long chain is often clearer as named intermediate variables than as one line.",
      "4. **IEnumerable runs in memory; IQueryable runs in the provider.** `IQueryable<T>` is an `IEnumerable<T>` that also exposes an `Expression` and a `Provider`. Each operator appends a node to the tree. On `ToListAsync`, EF Core walks the tree, translates it to SQL, executes it and materialises rows. A method EF cannot translate (a custom C# helper, for example) throws at translation time in modern EF Core; it does not silently switch to client evaluation. `AsEnumerable()` is an explicit boundary: everything after it runs in memory.",
      "5. **Generics are specialised, not boxed.** For `List<int>`, the JIT generates code that stores raw ints; for `List<string>`, reference types share a generic implementation. Constraints are checked at compile time and encoded in metadata, so a generic method can call `CompareTo`, `new T()` or interface members without casts. `class`/`struct` also select the right `default` and nullability rules, and `notnull` removes nullable warnings for dictionary keys.",
      "6. **The async state machine.** The compiler generates a struct or class implementing `IAsyncStateMachine` with a `MoveNext` method and fields for locals, the awaiter and the builder. The first `MoveNext` runs synchronously until the first incomplete `await`. It calls `GetAwaiter()`, checks `IsCompleted`, and if false stores the awaiter and returns an incomplete `Task`. When the operation completes, the awaiter schedules `MoveNext` again, which resumes at the right label. Exceptions are captured and placed on the returned Task; that is why an unobserved Task can hide a failure.",
      "7. **Where the continuation runs.** Awaiting captures the current `SynchronizationContext` (or `TaskScheduler`) unless you call `ConfigureAwait(false)`. In a UI app or classic ASP.NET, that context is single-threaded, so the continuation must return to that one thread. In ASP.NET Core there is no `SynchronizationContext`, so continuations normally run on thread-pool threads. `Task` can be awaited many times and cached; `ValueTask` is a struct that avoids an allocation on the synchronous path but is normally await-once, and wrapping it in a `Task` or storing it for later can be a bug.",
      "8. **The classic deadlock.** A single-threaded context is running a method that calls `GetValueAsync().Result`. The async method hits an incomplete await and captures the context, then `.Result` blocks the only thread that could run the continuation. The continuation sits in the context's queue forever: the thread waits for the task, and the task waits for the thread. `ConfigureAwait(false)` in the library avoids capturing that context, but the real fix in application code is to await all the way. In ASP.NET Core the usual failure is not a deadlock but **thread-pool starvation**: blocked threads stop serving requests, the pool injects threads slowly, and latency climbs while CPU stays low.",
      "9. **Cancellation and streaming.** A `CancellationToken` is cooperative: it does not kill a thread, it asks code to stop. Pass it to every async call, check it with `ThrowIfCancellationRequested()`, and combine the caller's token with a timeout using `CancellationTokenSource.CreateLinkedTokenSource`. For large or open-ended results, `IAsyncEnumerable<T>` with `await foreach` pulls items as they arrive, so memory stays bounded; `EnumeratorCancellation` lets the consumer's token reach the producer. Buffering the whole stream into a `List<T>` gives the memory profile you were trying to avoid.",
    ],
    diagram: {
      title: "One query, two execution models",
      nodes: [
        { label: "Query", sub: "Where · Select · Take" },
        { label: "IEnumerable", sub: "delegates, in memory" },
        { label: "IQueryable", sub: "expression tree" },
        { label: "SQL", sub: "WHERE … ORDER BY … LIMIT" },
        { label: "Materialise", sub: "ToList / await" },
        { label: "Continuation", sub: "state machine resumes" },
      ],
      edges: ["in memory", "or expression tree", "translated", "rows", "awaited"],
      caption: "The query can take the in-memory path or the provider path; the provider turns the expression tree into SQL. The `await` is a separate decision: it releases the thread while the result is on its way.",
    },
  },
  handsOn: [
    {
      title: "Deferred execution, operators and First vs FirstOrDefault",
      text: [
        "Build the query, add an item, then enumerate. The `checks` count proves when the predicate ran. The rest of the program shows method and query syntax producing identical results, and the different failure modes of `First` and `FirstOrDefault`.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `List<Attempt> attempts =
[
    new("asha", "1.3.1", 90), new("ravi", "1.3.1", 55),
    new("asha", "1.3.2", 70), new("meera", "1.3.1", 95),
    new("ravi", "1.3.2", 80),
];

// --- deferred execution: a recipe, not a result ---
var numbers = new List<int> { 1, 2, 3 };
var checks = 0;
var evens = numbers.Where(n =>
{
    checks++;
    Console.WriteLine($"  checking {n}");
    return n % 2 == 0;
});

numbers.Add(4);
Console.WriteLine($"query built, checks = {checks}");
Console.WriteLine("first enumeration:");
Console.WriteLine($"  result: {string.Join(",", evens)}");
Console.WriteLine($"checks after first = {checks}");
Console.WriteLine("second enumeration:");
Console.WriteLine($"  result: {string.Join(",", evens)}");
Console.WriteLine($"checks after second = {checks}");
Console.WriteLine("materialise once with ToList:");
var snapshot = evens.ToList();
Console.WriteLine($"  snapshot: {string.Join(",", snapshot)} (checks now {checks})");

// --- method syntax and query syntax compile to the same calls ---
var querySyntax =
    from a in attempts
    where a.Lesson == "1.3.1"
    orderby a.Score descending
    select $"{a.User}:{a.Score}";
var methodSyntax = attempts
    .Where(a => a.Lesson == "1.3.1")
    .OrderByDescending(a => a.Score)
    .Select(a => $"{a.User}:{a.Score}");
Console.WriteLine($"query syntax:  {string.Join(", ", querySyntax)}");
Console.WriteLine($"method syntax: {string.Join(", ", methodSyntax)}");

// --- Any / First / FirstOrDefault ---
Console.WriteLine($"Any(score < 60): {attempts.Any(a => a.Score < 60)}");
Console.WriteLine($"First(score >= 95): {attempts.First(a => a.Score >= 95).User}");
var missing = attempts.FirstOrDefault(a => a.User == "zoe");
Console.WriteLine($"FirstOrDefault(user == zoe): {(missing is null ? "<null>" : missing.User)}");
try
{
    _ = attempts.First(a => a.User == "zoe");
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"First(user == zoe): threw InvalidOperationException: {ex.Message}");
}

// --- GroupBy + aggregate ---
Console.WriteLine("averages by user:");
foreach (var row in attempts
    .GroupBy(a => a.User)
    .Select(g => new { User = g.Key, Avg = g.Average(a => a.Score) })
    .OrderBy(x => x.User))
{
    Console.WriteLine($"  {row.User}: {row.Avg:F1}");
}

record Attempt(string User, string Lesson, int Score);`,
      },
      output: `query built, checks = 0
first enumeration:
  checking 1
  checking 2
  checking 3
  checking 4
  result: 2,4
checks after first = 4
second enumeration:
  checking 1
  checking 2
  checking 3
  checking 4
  result: 2,4
checks after second = 8
materialise once with ToList:
  checking 1
  checking 2
  checking 3
  checking 4
  snapshot: 2,4 (checks now 12)
query syntax:  meera:95, asha:90, ravi:55
method syntax: meera:95, asha:90, ravi:55
Any(score < 60): True
First(score >= 95): meera
FirstOrDefault(user == zoe): <null>
First(user == zoe): threw InvalidOperationException: Sequence contains no matching element
averages by user:
  asha: 80.0
  meera: 95.0
  ravi: 67.5`,
      notes: [
        "`checks` is 0 after the query is built, 4 after the first enumeration, 8 after the second and 12 after `ToList`. The `ToList` is not free: it enumerates again, then stores the result. The difference is that you can reuse the snapshot without re-running the predicate.",
        "The query syntax and method syntax lines are identical because the compiler emits the same `Where`/`OrderByDescending`/`Select` calls. Query syntax is not a different engine.",
        "`FirstOrDefault` returned `<null>` here because `Attempt` is a reference type. For `int`, the same call returns `0`, which is indistinguishable from a real score of zero unless you check the source or use `int?`.",
      ],
    },
    {
      title: "Generics with constraints",
      text: [
        "`Create<T>()` promises `T` has a public parameterless constructor and is a reference type. `Largest<T>()` promises `T` can compare itself to another `T`. The compiler enforces both promises; the JIT generates specialised code for `int` and `decimal`, so no boxing happens.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `static T Create<T>() where T : class, new()
{
    var item = new T();
    Console.WriteLine($"  created {typeof(T).Name}");
    return item;
}

static T Largest<T>(IEnumerable<T> items) where T : IComparable<T>
{
    using var e = items.GetEnumerator();
    if (!e.MoveNext()) throw new InvalidOperationException("Sequence is empty");
    var best = e.Current;
    while (e.MoveNext())
        if (e.Current.CompareTo(best) > 0) best = e.Current;
    return best;
}

var first = Create<Widget>();
var second = Create<Widget>();
Console.WriteLine($"  same instance: {ReferenceEquals(first, second)}");
Console.WriteLine($"Largest<int>:    {Largest(new[] { 3, 9, 4 })}");
Console.WriteLine($"Largest<decimal>: {Largest(new[] { 2.5m, 1.25m, 7.75m })}");
Console.WriteLine($"Largest<string>: {Largest(new[] { "apple", "pear", "fig" })}");

sealed class Widget
{
    public string Name { get; set; } = "widget";
}`,
      },
      output: `  created Widget
  created Widget
  same instance: False
Largest<int>:    9
Largest<decimal>: 7.75
Largest<string>: pear`,
      notes: [
        "Removing `new()` and keeping `new T()` fails at compile time with CS0304: 'Cannot create an instance of the variable type T because it does not have the new() constraint.' That is the point of constraints: the error moves from a runtime surprise to the compiler.",
        "`Largest<string>` works because `string` implements `IComparable<string>` (ordinal comparison here). `Largest<Widget>` would not compile until `Widget` implements `IComparable<Widget>`, which is exactly the guarantee the method needs.",
        "In real apps prefer `Enumerable.MaxBy` from .NET 6+; this version exists to show what the constraint buys you. For a cache, `where TKey : notnull` is the usual constraint on the key type.",
      ],
    },
    {
      title: "Async timing and the .Result deadlock, reproduced",
      text: [
        "The first half times three simulated I/O calls sequentially and then concurrently. The second half runs the same kind of async method on a single-threaded `SynchronizationContext`, then blocks it with `.Result`. A watchdog prints a verdict after one second; without it, the program would hang forever.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using System.Collections.Concurrent;
using System.Diagnostics;
static async Task<string> FetchAsync(string name, int ms)
{
    await Task.Delay(ms);
    return $"{name}({ms}ms)";
}
var sw = Stopwatch.StartNew();
var a = await FetchAsync("A", 300);
var b = await FetchAsync("B", 200);
var c = await FetchAsync("C", 100);
sw.Stop();
Console.WriteLine($"sequential:   {sw.ElapsedMilliseconds} ms -> {a}, {b}, {c}");
sw.Restart();
var all = await Task.WhenAll(
    FetchAsync("A", 300),
    FetchAsync("B", 200),
    FetchAsync("C", 100));
sw.Stop();
Console.WriteLine($"Task.WhenAll: {sw.ElapsedMilliseconds} ms -> {string.Join(", ", all)}");
static async Task<int> GetValueAsync()
{
    Console.WriteLine("  GetValueAsync: before await");
    await Task.Delay(100);
    Console.WriteLine("  GetValueAsync: continuation (needs the same context)");
    return 42;
}
var context = new SingleThreadContext();
var done = 0;
var pump = new Thread(() =>
{
    SynchronizationContext.SetSynchronizationContext(context);
    context.Post(_ =>
    {
        Console.WriteLine("  pump: calling GetValueAsync().Result");
        var value = GetValueAsync().Result;
        Console.WriteLine($"  pump: got {value}");
        Interlocked.Exchange(ref done, 1);
    }, null);
    context.Run();
}) { IsBackground = true };
pump.Start();

Thread.Sleep(1000);
if (done == 0)
{
    Console.WriteLine("main: no progress after 1000 ms -> classic .Result deadlock");
    Console.WriteLine("main: the continuation was queued to the blocked context, so it can never run");
    Console.WriteLine("fix: await all the way (or ConfigureAwait(false) in library code)");
    Environment.Exit(0);
}
Console.WriteLine("main: completed");

sealed class SingleThreadContext : SynchronizationContext
{
    private readonly BlockingCollection<(SendOrPostCallback Callback, object? State)> _queue = new();

    public override void Post(SendOrPostCallback d, object? state) => _queue.Add((d, state));
    public override void Send(SendOrPostCallback d, object? state) => throw new NotSupportedException();

    public void Run()
    {
        foreach (var (callback, state) in _queue.GetConsumingEnumerable())
            callback(state);
    }
}`,
      },
      output: `sequential:   631 ms -> A(300ms), B(200ms), C(100ms)
Task.WhenAll: 307 ms -> A(300ms), B(200ms), C(100ms)
  pump: calling GetValueAsync().Result
  GetValueAsync: before await
main: no progress after 1000 ms -> classic .Result deadlock
main: the continuation was queued to the blocked context, so it can never run
fix: await all the way (or ConfigureAwait(false) in library code)`,
      notes: [
        "Sequential is about 630 ms (300 + 200 + 100 plus overhead); `Task.WhenAll` is about 307 ms, the slowest call. The calls are independent, so there is no reason to pay their sum.",
        "In ASP.NET Core there is no `SynchronizationContext`, so `.Result` usually produces thread-pool starvation rather than this exact deadlock. The single-threaded context is the clearest reproduction of the mechanism, and the rule is the same: do not block an async call.",
        "`ConfigureAwait(false)` is the library-author fix for the capture half of the problem. Application code should still await all the way; `ConfigureAwait(false)` does not make `.Result` safe.",
      ],
    },
    {
      title: "Compare the shapes: IEnumerable vs IQueryable, Task vs ValueTask",
      text: ["Keep these two tables next to each other. The first decides where your query runs; the second decides what your async method allocates."],
      code: {
        lang: "text",
        file: "comparison.txt",
        code: `IEnumerable<T>                              IQueryable<T>
runs in memory (LINQ to Objects)            builds an expression tree for a provider
predicates are Func<T, bool> delegates      predicates are Expression<Func<T, bool>>
Where/Select run once per item in C#        WHERE/SELECT run in the database
no translation step                         provider may reject an untranslatable method
good for lists, arrays, in-memory data      good for EF Core, remote or composable sources
materialise late to limit CPU work          materialise late to keep one SQL statement

Task                                        ValueTask
reference type, one heap object             struct wrapper, often allocation-free
safe to await many times                    normally await once
safe to cache, share or store in a field    do not cache or await twice (unless backed by Task)
the default choice for public async APIs    for hot paths and custom IValueTaskSource`,
      },
      notes: [
        "`AsEnumerable()` is an explicit switch from the right column to the left: everything after it runs in memory. Use it deliberately, not to make an EF Core error disappear.",
        "`ValueTask` is not automatically faster. If the method usually completes asynchronously it still wraps a `Task`, and the struct adds subtle single-use rules. Measure before replacing `Task`.",
      ],
    },
    {
      title: "Mermaid: the async state machine",
      text: ["The boxes are the states of a compiled `async` method. The important transition is the middle one: an incomplete `await` returns a `Task` to the caller and gives the thread back, and the continuation later resumes at the same point."],
      code: {
        lang: "mermaid",
        file: "async-state.mmd",
        code: `flowchart TD
  A["Caller awaits GetRepoAsync()"] --> B["Runs synchronously to the first await"]
  B --> C{"Awaited task complete?"}
  C -- "yes" --> D["Continue without yielding"]
  C -- "no" --> E["Capture context, return incomplete Task"]
  E --> F["Thread is released to serve other work"]
  F --> G["I/O completes; continuation is scheduled"]
  G --> H["State machine resumes at the await"]
  H --> D
  D --> I["Return value or exception on the Task"]`,
      },
      notes: [
        "`ConfigureAwait(false)` changes the 'capture context' box: the continuation no longer has to return to the captured context. It is a library optimisation and a deadlock guard, not a replacement for awaiting.",
        "For a stream of results, the same machinery repeats per element with `IAsyncEnumerable<T>` and `await foreach`; the state machine moves to the next item instead of buffering the whole set.",
      ],
    },
  ],
  companies: [
    "**Microsoft and the .NET team (illustrative; documented platform behaviour):** LINQ, async/await, `ConfigureAwait` and `IAsyncEnumerable` are platform features with published design guidelines. Framework and library code uses `ConfigureAwait(false)` because it must not assume the caller's context; application code in ASP.NET Core usually does not need it.",
    "**EF Core teams (illustrative):** the difference between `IQueryable` and `IEnumerable` is a daily code-review topic. Translating a query, projecting only needed columns, avoiding N+1 queries and using `AsNoTracking` for reads are standard performance work in .NET services.",
    "**High-traffic ASP.NET Core services (illustrative):** thread-pool starvation from blocking calls is a classic production incident. Teams watch request queueing and thread-pool metrics because CPU can look healthy while every request waits for a blocked thread.",
    "**Library authors (illustrative):** `ValueTask` and `IAsyncEnumerable<T>` appear in high-throughput APIs such as `System.IO.Pipelines` and `System.Threading.Channels`, where avoiding an allocation per operation and streaming instead of buffering both matter.",
    "**Streaming and export services (illustrative):** CSV exports, log tailing and large API pages use `IAsyncEnumerable<T>` with `await foreach` so memory stays bounded. Buffering the same data into a `List<T>` first is the pattern that turns a small export into an out-of-memory incident.",
  ],
  mistakes: [
    { mistake: "Materialising too early (ToList before Where)", why: "It is easier to debug a list in memory", wrong: "The whole table is loaded into RAM, then filtered in C#; memory and time grow with the table, not the result", fix: "Compose Where/OrderBy/Take/Select on IQueryable, then ToListAsync" },
    { mistake: "Enumerating a deferred query multiple times", why: "The variable looks like a result, not a recipe", wrong: "Repeated database queries or repeated expensive work, sometimes with different data each time", fix: "Materialise once with ToList/ToArray when you reuse it, or keep one enumeration" },
    { mistake: ".Result or .Wait() on tasks", why: "Calling async code from sync code feels simpler", wrong: "Deadlock on a single-threaded context, or thread-pool starvation and latency spikes under load", fix: "Make the call chain async and await everywhere; never block a request thread" },
    { mistake: "async void methods", why: "Event-handler style is copied into ordinary methods", wrong: "Exceptions crash the process and the caller cannot await or catch the operation", fix: "Return Task/Task<T>; use async void only for UI event handlers" },
    { mistake: "Ignoring CancellationToken", why: "It is one more parameter to pass around", wrong: "Work continues after the client disconnects or the timeout expires, wasting database and CPU time", fix: "Accept and forward CancellationToken in every async method; link it to timeouts" },
    { mistake: "Using FirstOrDefault without checking the default", why: "It avoids the exception that First throws", wrong: "For int the missing value is 0, so 'no row' looks like a real zero; for a reference type it is null and a later dereference throws", fix: "Check for null/default, use int? when absence is meaningful, or use First when absence is a bug" },
    { mistake: "Calling ConfigureAwait(false) everywhere as a cargo cult", why: "It is repeated in blog posts about deadlocks", wrong: "Application code loses the context it may need, and the code does not become safe from .Result", fix: "Use ConfigureAwait(false) in libraries that do not need the caller's context; in ASP.NET Core app code, await normally" },
    { mistake: "Awaiting a ValueTask twice or storing it", why: "It looks like a cheaper Task", wrong: "A ValueTask backed by a pooled IValueTaskSource can be invalid after the first await; caching it breaks callers", fix: "Await a ValueTask once, convert with AsTask() if you need to await or store it repeatedly" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Keep queries IQueryable while composing; filter, project and page in the database, and use AsNoTracking for read-only results." },
    { tag: "Reliability", text: "Async all the way: no .Result/.Wait(), Task.WhenAll for independent calls, and a CancellationToken on every async boundary." },
    { tag: "Maintainability", text: "Prefer method syntax for clear pipelines and query syntax for joins and grouping; name intermediate steps instead of writing one unreadable chain." },
    { tag: "Performance", text: "Avoid LINQ in extremely hot loops when allocations matter; benchmark with BenchmarkDotNet before replacing readable code." },
    { tag: "Cost", text: "Stream with IAsyncEnumerable<T> instead of buffering large results; memory and database round trips are direct cost drivers." },
  ],
  interview: [
    { q: "Explain deferred versus immediate execution, and how it changes an EF Core query.", a: "Most LINQ operators build a recipe: `Where` returns an iterator that reads the source only when `MoveNext` is called. `ToList`, `ToArray`, `Count`, `First` and `Any` execute immediately. Enumerating a deferred query twice runs it twice, including side effects and database round trips. With EF Core, the query is an `IQueryable` carrying an expression tree; compose `Where`, `OrderBy`, `Take` and `Select` first, then call `ToListAsync` so the provider emits one SQL statement with WHERE, ORDER BY and LIMIT. Calling `ToList` early switches to `IEnumerable` and moves the work into memory. Also mention `First` throws when empty while `FirstOrDefault` returns `default(T)`." },
    { q: "Why use generics, and what do `where T : class`, `new()` and `IComparable<T>` actually guarantee?", a: "Generics give reuse with compile-time type safety and, for value types, specialised code without boxing. Constraints are promises the compiler checks: `class` means a reference type (and enables null comparisons), `struct` means a non-nullable value type, `new()` requires a public parameterless constructor so `new T()` compiles, and `IComparable<T>` lets the method call `CompareTo` without a cast. Without the constraint, `new T()` fails with CS0304 and `CompareTo` needs reflection or a cast. The JIT specialises `List<int>` while reference types share an implementation. Keep constraints minimal and meaningful." },
    { q: "What happens inside an async method, and why can `.Result` deadlock?", a: "The compiler turns the method into a state machine. It runs synchronously to the first incomplete `await`, captures the awaiter and the current `SynchronizationContext`, returns an incomplete `Task`, and schedules a continuation for when the I/O completes. If the context is single-threaded and the caller blocks on `.Result`, the continuation is queued to the same thread that is blocked, so neither can progress: a deadlock. ASP.NET Core has no SynchronizationContext, so the usual symptom is thread-pool starvation instead. Use `await` throughout; libraries can use `ConfigureAwait(false)` to avoid capturing the caller's context. `Task` is a reusable heap object, `ValueTask` is a single-use struct for allocation-sensitive paths, and `CancellationToken` plus `IAsyncEnumerable<T>` handle cancellation and streaming." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "csharp", code: "var xs = new List<int> { 1, 2 };\nvar q = xs.Select(x => x * 10);\nxs.Add(3);\nConsole.WriteLine(string.Join(\",\", q));" },
      options: ["10,20", "10,20,30", "Error", "1,2,3"],
      answer: 1,
      explanation: "The query runs when string.Join enumerates it, after 3 was added.",
    },
    {
      kind: "bug",
      prompt: "This endpoint uses 3 GB of RAM. Why?",
      code: { lang: "csharp", code: "var recent = db.Attempts.ToList()\n    .Where(a => a.CreatedAt > since)\n    .Take(50);" },
      options: ["Take is slow", "ToList loads the whole table before filtering", "Where needs async", "since is a DateTime"],
      answer: 1,
      explanation: "Move Where and Take before materialising: db.Attempts.Where(...).Take(50).ToListAsync().",
    },
    {
      kind: "mcq",
      prompt: "Three independent HTTP calls each take 300 ms. With Task.WhenAll, total time is about:",
      options: ["900 ms", "300 ms", "100 ms", "0 ms"],
      answer: 1,
      explanation: "They run concurrently; you wait for the slowest.",
    },
  ],
  cheatSheet: [
    "Where · Select · OrderBy · GroupBy · Take/Skip · Any/Count/Sum · First/FirstOrDefault.",
    "Deferred until enumerated: foreach, ToList, Count, First, Any. Enumerating twice runs twice.",
    "Materialise once with ToList when reused; otherwise keep the single enumeration.",
    "IEnumerable = delegates in memory. IQueryable = expression tree translated by a provider.",
    "Compose IQueryable first, then ToListAsync; Select only needed columns; AsNoTracking for reads.",
    "First throws on empty; FirstOrDefault returns default(T): null for classes, 0 for int.",
    "Generics: where T : class / struct / new() / notnull / IComparable<T> / base or interface.",
    "async Task; await; never .Result/.Wait()/async void; Task.WhenAll for independent I/O.",
    "ConfigureAwait(false) in libraries; Task for reusable results, ValueTask once on hot paths.",
    "Pass CancellationToken; link timeouts; use IAsyncEnumerable<T> + await foreach for streams.",
  ],
  homework: {
    basic: {
      title: "LINQ drills",
      brief: ["Using the Attempt list from the hands-on, write queries for: (1) users who passed every lesson they attempted (score ≥ 60), (2) the best attempt per lesson, (3) lessons sorted by number of attempts, (4) a page of 2 results ordered by score."],
      criteria: ["Four correct queries", "Each uses method syntax", "Outputs printed"],
      hints: ["GroupBy then All for (1); GroupBy + MaxBy for (2)."],
      solution: {
        text: [
          "GroupBy is the workhorse; .NET 6+ MaxBy simplifies 'best per group'.",
          "(1) groups by user and keeps groups where All attempts are 60 or more. (2) groups by lesson and takes MaxBy score. (3) orders the lesson groups by Count, with ThenBy on the id so ties come out in a stable order. (4) is the general paging formula Skip((page - 1) * pageSize).Take(pageSize) after an OrderBy; paging without an order gives arbitrary pages.",
        ],
        code: {
          lang: "csharp",
          file: "Program.cs",
          code: `List<Attempt> attempts =
[
    new("asha", "1.3.1", 90), new("ravi", "1.3.1", 55),
    new("asha", "1.3.2", 70), new("meera", "1.3.1", 95),
    new("ravi", "1.3.2", 80),
];

// (1) users who passed every lesson they attempted
var allPassed = attempts.GroupBy(a => a.User)
    .Where(g => g.All(a => a.Score >= 60))
    .Select(g => g.Key);

// (2) best attempt per lesson (MaxBy is built in since .NET 6)
var bestPerLesson = attempts.GroupBy(a => a.Lesson)
    .Select(g => g.MaxBy(a => a.Score)!);

// (3) lessons by number of attempts, most attempted first (ties by id for a stable order)
var byPopularity = attempts.GroupBy(a => a.Lesson)
    .OrderByDescending(g => g.Count()).ThenBy(g => g.Key)
    .Select(g => $"{g.Key}:{g.Count()}");

// (4) page 2 of size 2, ordered by score
const int page = 2, pageSize = 2;
var pageItems = attempts.OrderByDescending(a => a.Score)
    .Skip((page - 1) * pageSize).Take(pageSize);

Console.WriteLine($"passed everything: {string.Join(", ", allPassed)}");
Console.WriteLine($"best per lesson:   {string.Join(", ", bestPerLesson.Select(a => $"{a.Lesson} {a.User} {a.Score}"))}");
Console.WriteLine($"by popularity:     {string.Join(", ", byPopularity)}");
Console.WriteLine($"page {page}:            {string.Join(", ", pageItems.Select(a => $"{a.User}:{a.Score}"))}");

record Attempt(string User, string Lesson, int Score);`,
        },
        output: "passed everything: asha, meera\nbest per lesson:   1.3.1 meera 95, 1.3.2 ravi 80\nby popularity:     1.3.1:3, 1.3.2:2\npage 2:            ravi:80, asha:70",
      },
    },
    intermediate: {
      title: "Async aggregator with timeout",
      brief: ["Write `async Task<Dictionary<string, int>> GetStarsAsync(IEnumerable<string> repos, CancellationToken ct)` that fetches GitHub star counts in parallel (max 4 at a time with SemaphoreSlim), skips failures, and respects a 5-second overall timeout."],
      criteria: ["SemaphoreSlim limits concurrency", "Linked cancellation token with timeout", "Failures logged and skipped"],
      hints: ["CancellationTokenSource.CreateLinkedTokenSource(ct) then CancelAfter(5s)."],
      solution: {
        text: [
          "Same pattern as Python's semaphore + timeout from lesson 1.1.3, in C#.",
          "A linked CancellationTokenSource combines the caller's token with a 5-second CancelAfter. Every repo is its own task that waits for one of 4 semaphore slots. `WaitAsync` sits inside the try, because the timeout can fire while a task is still queued for a slot, and the slot is released only if it was taken.",
          "The catch filter decides what 'skip' means: HTTP errors, a body that is not the expected JSON (JsonException), and our own timeout are logged and skipped, so the method returns whatever finished in time. If the caller's token was cancelled, the exception propagates instead: the caller asked to stop, so returning a partial answer would be wrong.",
          "Checked with a stub HttpMessageHandler (one 404, one HTML body, one response slower than 5 s): the method returned the two good repos after about 5 s and logged the other three.",
        ],
        code: {
          lang: "csharp",
          code: `using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;

static async Task<Dictionary<string, int>> GetStarsAsync(HttpClient http, IEnumerable<string> repos, CancellationToken ct)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(5));                 // overall budget for the whole batch
    using var gate = new SemaphoreSlim(4);                    // at most 4 requests in flight
    var results = new ConcurrentDictionary<string, int>();

    await Task.WhenAll(repos.Select(async name =>
    {
        var acquired = false;
        try
        {
            await gate.WaitAsync(cts.Token);                  // inside try: the timeout can fire while waiting
            acquired = true;
            var repo = await http.GetFromJsonAsync<Repo>($"https://api.github.com/repos/{name}", cts.Token);
            if (repo is not null) results[name] = repo.stargazers_count;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException
                                   || (ex is OperationCanceledException && !ct.IsCancellationRequested))
        {
            // HTTP error, unexpected body, or our 5 s budget ran out: log and skip this repo.
            // If the CALLER cancelled (ct), the exception propagates instead.
            Console.Error.WriteLine($"skip {name}: {ex.GetType().Name}");
        }
        finally
        {
            if (acquired) gate.Release();                     // only release a slot we actually took
        }
    }));
    return new Dictionary<string, int>(results);
}`,
        },
        pitfalls: [
          "Awaiting `gate.WaitAsync` outside the try: a timeout while queued escapes Task.WhenAll and the whole method throws, losing the results that did arrive",
          "Catching only HttpRequestException: a proxy error page or HTML body throws JsonException from GetFromJsonAsync and takes down the whole batch",
          "Swallowing the caller's cancellation as if it were a per-repo failure",
        ],
      },
    },
    challenge: {
      title: "Generic paged result",
      brief: ["Write `record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total)` and an extension method `ToPagedAsync<T>(this IQueryable<T> query, int page, int pageSize, CancellationToken ct)` that runs a Count and a Skip/Take query. Explain why offset paging gets slow on deep pages and when to use keyset paging (lesson 5.1.1)."],
      criteria: ["Generic extension method", "Validates page and pageSize", "Correct explanation of offset cost"],
      hints: ["CountAsync and ToListAsync are in Microsoft.EntityFrameworkCore."],
      solution: {
        text: ["OFFSET n still makes the database read and discard n rows, so cost grows with page depth. For infinite scroll or deep pages use keyset (WHERE (CreatedAt, Id) < (@lastCreatedAt, @lastId)) with a matching index."],
        code: {
          lang: "csharp",
          code: `public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public static class PagingExtensions
{
    public static async Task<PagedResult<T>> ToPagedAsync<T>(
        this IQueryable<T> query, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1) throw new ArgumentOutOfRangeException(nameof(page));
        if (pageSize is < 1 or > 100) throw new ArgumentOutOfRangeException(nameof(pageSize));
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new PagedResult<T>(items, page, pageSize, total);
    }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: leaderboard service (in memory)",
      brief: ["In DevAtlas.Core add `LeaderboardService` with an async method returning the top N learners by average score for a lesson, written against an `IAttemptReader` interface. Test it with an in-memory implementation."],
      criteria: ["Async with CancellationToken", "Pure LINQ logic tested with xUnit", "Interface ready for an EF Core implementation later"],
      hints: ["Return a record LeaderboardEntry(string User, double Average)."],
      solution: {
        text: [
          "Keep the ranking logic in Core against an interface; the EF Core implementation in lesson 4.1.2 will push the same query into SQL.",
          "`LeaderboardService` depends only on `IAttemptReader`, takes a CancellationToken and forwards it, and validates its arguments with the .NET 8 throw helpers. The ranking is one LINQ chain: GroupBy user, Average, OrderByDescending, then ThenBy name so ties always come out in the same order, then Take.",
          "The in-memory reader lives in the test project and honours cancellation like a real store would. The xUnit tests cover ordering with a tie, the Take limit, an unknown lesson, invalid arguments and cancellation. `dotnet test` result: Passed 6, Failed 0 (built with nullable and warnings-as-errors from Directory.Build.props).",
        ],
        code: {
          lang: "csharp", file: "DevAtlas.Core/Leaderboard.cs",
          code: `namespace DevAtlas.Core;

public sealed record Attempt(string User, string LessonId, int Score);

public sealed record LeaderboardEntry(string User, double Average);

/// <summary>Read side of attempt storage. In memory today, EF Core in lesson 4.1.2.</summary>
public interface IAttemptReader
{
    Task<IReadOnlyList<Attempt>> GetForLessonAsync(string lessonId, CancellationToken ct);
}

public sealed class LeaderboardService(IAttemptReader reader)
{
    public async Task<IReadOnlyList<LeaderboardEntry>> TopAsync(string lessonId, int count, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(lessonId);
        ArgumentOutOfRangeException.ThrowIfLessThan(count, 1);

        var attempts = await reader.GetForLessonAsync(lessonId, ct);
        return Rank(attempts, count);
    }

    // Pure ranking logic: average per user, best first, ties broken by name so the order is stable.
    private static IReadOnlyList<LeaderboardEntry> Rank(IEnumerable<Attempt> attempts, int count) =>
        attempts
            .GroupBy(a => a.User)
            .Select(g => new LeaderboardEntry(g.Key, Math.Round(g.Average(a => a.Score), 1)))
            .OrderByDescending(e => e.Average)
            .ThenBy(e => e.User, StringComparer.Ordinal)
            .Take(count)
            .ToList();
}

// ---- DevAtlas.Core.Tests/InMemoryAttemptReader.cs ----
using DevAtlas.Core;

namespace DevAtlas.Core.Tests;

public sealed class InMemoryAttemptReader(IEnumerable<Attempt> attempts) : IAttemptReader
{
    private readonly List<Attempt> _attempts = [.. attempts];

    public Task<IReadOnlyList<Attempt>> GetForLessonAsync(string lessonId, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();   // behave like a real store when the caller gives up
        IReadOnlyList<Attempt> result = _attempts.Where(a => a.LessonId == lessonId).ToList();
        return Task.FromResult(result);
    }
}

// ---- DevAtlas.Core.Tests/LeaderboardServiceTests.cs ----
using DevAtlas.Core;

namespace DevAtlas.Core.Tests;

public class LeaderboardServiceTests
{
    private static readonly Attempt[] Attempts =
    [
        new("asha", "1.3.1", 90), new("asha", "1.3.1", 70),   // asha averages 80
        new("ravi", "1.3.1", 55), new("ravi", "1.3.1", 85),   // ravi averages 70
        new("meera", "1.3.1", 95),
        new("zoe", "1.3.1", 80),                              // ties with asha on 80
        new("meera", "1.3.2", 10),                            // other lesson: ignored
    ];

    private static LeaderboardService CreateService() => new(new InMemoryAttemptReader(Attempts));

    [Fact]
    public async Task Ranks_by_average_score_and_breaks_ties_by_name()
    {
        var top = await CreateService().TopAsync("1.3.1", 10);

        Assert.Equal(
            [new("meera", 95.0), new("asha", 80.0), new("zoe", 80.0), new LeaderboardEntry("ravi", 70.0)],
            top);
    }

    [Fact]
    public async Task Returns_at_most_count_entries()
    {
        var top = await CreateService().TopAsync("1.3.1", 2);
        Assert.Equal(["meera", "asha"], top.Select(e => e.User));
    }

    [Fact]
    public async Task Unknown_lesson_gives_an_empty_leaderboard()
    {
        Assert.Empty(await CreateService().TopAsync("9.9.9", 5));
    }

    [Theory]
    [InlineData("", 5)]
    [InlineData("1.3.1", 0)]
    public async Task Rejects_invalid_arguments(string lessonId, int count)
    {
        await Assert.ThrowsAnyAsync<ArgumentException>(() => CreateService().TopAsync(lessonId, count));
    }

    [Fact]
    public async Task Passes_the_cancellation_token_to_the_reader()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAsync<OperationCanceledException>(() => CreateService().TopAsync("1.3.1", 3, cts.Token));
    }
}`,
        },
        pitfalls: ["Ordering by average alone: users with equal averages come out in arbitrary order and tests become flaky", "Returning the LINQ query without ToList: it re-runs on every enumeration, and with EF Core the DbContext may be gone by then", "Calling .Result on the reader's task inside the service instead of awaiting it"],
      },
    },
  },
  deeper: [
    { label: "Microsoft Learn: Deferred execution and lazy evaluation", url: "https://learn.microsoft.com/en-us/dotnet/standard/linq/deferred-execution-lazy-evaluation" },
    { label: "EF Core: Efficient querying", url: "https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying" },
    { label: "Generics in .NET", url: "https://learn.microsoft.com/en-us/dotnet/standard/generics/" },
    { label: "Asynchronous programming with async and await", url: "https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/" },
    { label: "Task.ConfigureAwait documentation", url: "https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.configureawait" },
    { label: "Generate and consume asynchronous streams", url: "https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/generate-consume-asynchronous-stream" },
  ],
  nextPreview: "Next: dependency injection. Service lifetimes, constructor injection and why it makes ASP.NET Core apps testable.",
};
