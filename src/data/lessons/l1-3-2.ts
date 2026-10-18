import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.2",
  title: "LINQ, generics and async/await",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.3.1 C# fundamentals and the .NET runtime"],
  summary: "Query collections expressively with LINQ (and avoid its traps), write reusable type-safe code with generics, and use Task-based async/await correctly in servers.",
  terms: [
    { term: "LINQ", def: "Language Integrated Query: methods like Where, Select, OrderBy, GroupBy that work on any IEnumerable<T> (and, via providers, on databases)." },
    { term: "IEnumerable<T>", def: "A sequence you can iterate. LINQ over it is usually lazy: nothing runs until you iterate." },
    { term: "Deferred execution", def: "A LINQ query is a recipe; it executes when enumerated (foreach, ToList, Count...). Enumerating twice runs it twice." },
    { term: "IQueryable<T>", def: "A query that a provider (like EF Core) translates to another language such as SQL instead of running in memory." },
    { term: "Generic", def: "A type or method with type parameters, like List<T> or T Max<T>(T a, T b) where T : IComparable<T>." },
    { term: "Task", def: "An object representing an asynchronous operation that may produce a value later (Task<T>)." },
    { term: "CancellationToken", def: "A signal passed through async calls so work can be stopped when the request is aborted or times out." },
  ],
  problem: [
    "The DevAtlas leaderboard endpoint loads every quiz attempt into memory, then filters and sorts in C#. With 2 million rows it uses gigabytes of RAM and takes 12 seconds. A second bug: a LINQ query enumerated three times hits the database three times.",
    "Meanwhile another endpoint calls `.Result` on a Task to 'make it synchronous' and under load the server stops responding. LINQ, generics and async are everyday C# tools; using them well is the difference between a fast API and a fragile one.",
  ],
  concept: {
    analogy: [
      "A LINQ query is a **written order at a restaurant**, not the meal. Writing 'filter, sort, take 10' costs nothing; the kitchen only cooks when someone asks for the food (`ToList`, `foreach`). Hand the order to the kitchen twice and it cooks twice.",
      "async/await is the same waiter from lesson 1.1.3: while one request waits for the database, the thread serves other requests instead of standing still.",
    ],
    precise: [
      "LINQ methods chain: `Where` filters, `Select` projects, `OrderBy` sorts, `GroupBy` groups, `Take/Skip` page, `Any/All/Count/Sum/Average` aggregate, `First/FirstOrDefault/Single` pick. On `IEnumerable<T>` they run in memory, lazily. On `IQueryable<T>` (EF Core) the whole chain becomes one SQL query; filter and page **before** materialising with ToList.",
      "**Generics** give reuse without losing types. Constraints (`where T : class`, `where T : IComparable<T>`, `where T : new()`) say what T must support. The runtime specialises generics, so `List<int>` stores ints without boxing.",
      "**async/await**: an `async` method returns `Task`/`Task<T>`; `await` releases the thread while I/O is pending and resumes afterwards. Rules: async all the way (never `.Result`/`.Wait()` in app code), pass CancellationToken, use `Task.WhenAll` for independent calls.",
    ],
  },
  underTheHood: {
    text: [
      "The compiler turns LINQ lambdas into delegates (for IEnumerable) or expression trees (for IQueryable). EF Core walks the expression tree and generates SQL. Calling a method EF cannot translate inside a query either fails or forces client-side evaluation, depending on where it appears.",
      "The compiler rewrites an async method into a state machine. At each `await` on an incomplete task, the method returns to its caller and registers a continuation. In ASP.NET Core there is no UI-thread SynchronizationContext, so continuations run on thread-pool threads.",
      "Blocking on async code (`.Result`) holds a thread-pool thread while waiting. Under load the pool runs out of threads (thread-pool starvation): requests queue up and latency explodes even though CPU is idle.",
    ],
    diagram: {
      title: "IQueryable → SQL",
      nodes: [
        { label: "db.Attempts", sub: "IQueryable" },
        { label: ".Where(...)", sub: "expression tree" },
        { label: ".OrderBy .Take(10)", sub: "still not run" },
        { label: ".ToListAsync()", sub: "translate + execute" },
        { label: "SQL", sub: "WHERE … ORDER BY … LIMIT 10" },
      ],
      edges: ["", "", "materialise", ""],
    },
  },
  handsOn: [
    {
      title: "LINQ essentials on in-memory data",
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `List<Attempt> attempts =
[
    new("asha", "1.3.1", 90), new("ravi", "1.3.1", 55),
    new("asha", "1.3.2", 70), new("meera", "1.3.1", 95),
    new("ravi", "1.3.2", 80),
];

var top = attempts
    .Where(a => a.Lesson == "1.3.1")
    .OrderByDescending(a => a.Score)
    .Select(a => $"{a.User}:{a.Score}")
    .Take(2);
Console.WriteLine(string.Join(", ", top));

var averageByUser = attempts
    .GroupBy(a => a.User)
    .Select(g => new { User = g.Key, Avg = g.Average(a => a.Score) })
    .OrderBy(x => x.User);
foreach (var x in averageByUser) Console.WriteLine($"{x.User} {x.Avg:F1}");

Console.WriteLine(attempts.Any(a => a.Score < 60));                   // True
Console.WriteLine(attempts.FirstOrDefault(a => a.User == "zoe") is null); // True

record Attempt(string User, string Lesson, int Score);   // types go after top-level statements`,
      },
      output: "meera:95, asha:90\nasha 80.0\nmeera 95.0\nravi 67.5\nTrue\nTrue",
    },
    {
      title: "Deferred execution, demonstrated",
      code: {
        lang: "csharp",
        code: `var numbers = new List<int> { 1, 2, 3 };
var evens = numbers.Where(n => { Console.WriteLine($"checking {n}"); return n % 2 == 0; });

numbers.Add(4);                         // added AFTER the query was written
Console.WriteLine(evens.Count());       // runs now, sees 4
Console.WriteLine(evens.Count());       // runs AGAIN: every check printed twice

var snapshot = evens.ToList();          // materialise once, reuse freely`,
      },
      notes: ["With EF Core, 'runs again' means 'queries the database again'. Materialise once when you need the results more than once."],
    },
    {
      title: "Generics with constraints",
      code: {
        lang: "csharp",
        code: `static T MaxBy<T, TKey>(IEnumerable<T> items, Func<T, TKey> key) where TKey : IComparable<TKey>
{
    using var e = items.GetEnumerator();
    if (!e.MoveNext()) throw new InvalidOperationException("Sequence is empty");
    T best = e.Current;
    while (e.MoveNext())
        if (key(e.Current).CompareTo(key(best)) > 0) best = e.Current;
    return best;
}

// A tiny generic in-memory cache
sealed class Cache<TKey, TValue> where TKey : notnull
{
    private readonly Dictionary<TKey, (TValue Value, DateTime Expires)> _items = new();
    public TValue GetOrAdd(TKey key, Func<TValue> factory, TimeSpan ttl)
    {
        if (_items.TryGetValue(key, out var hit) && hit.Expires > DateTime.UtcNow) return hit.Value;
        var value = factory();
        _items[key] = (value, DateTime.UtcNow + ttl);
        return value;
    }
}`,
      },
      notes: [".NET 6+ already includes Enumerable.MaxBy; writing it yourself shows how constraints work. In real apps use IMemoryCache (thread-safe) rather than this simple cache."],
    },
    {
      title: "async/await done right",
      code: {
        lang: "csharp",
        code: `using System.Net.Http.Json;

static async Task<Repo?> GetRepoAsync(HttpClient http, string name, CancellationToken ct)
    => await http.GetFromJsonAsync<Repo>($"https://api.github.com/repos/{name}", ct);

using var http = new HttpClient();
http.DefaultRequestHeaders.UserAgent.ParseAdd("devatlas-demo/1.0");
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));   // overall timeout

// Independent calls in parallel: total time ≈ slowest call
var tasks = new[] { "dotnet/runtime", "dotnet/aspnetcore" }
    .Select(n => GetRepoAsync(http, n, cts.Token));
Repo?[] repos = await Task.WhenAll(tasks);
foreach (var r in repos) Console.WriteLine($"{r?.full_name}: {r?.stargazers_count}");

record Repo(string full_name, int stargazers_count);   // property names match the JSON`,
      },
      notes: ["In ASP.NET Core you get HttpClient from IHttpClientFactory (next lesson) and the request's CancellationToken from the framework."],
    },
    {
      title: "EF Core: filter in the database, not in memory",
      code: {
        lang: "csharp",
        code: `// BAD: loads every row, then filters in C#
var bad = (await db.Attempts.ToListAsync(ct))
    .Where(a => a.LessonId == lessonId)
    .OrderByDescending(a => a.Score).Take(10).ToList();

// GOOD: one SQL query with WHERE, ORDER BY and LIMIT/TOP
var good = await db.Attempts
    .Where(a => a.LessonId == lessonId)
    .OrderByDescending(a => a.Score)
    .Take(10)
    .Select(a => new { a.UserId, a.Score })      // fetch only needed columns
    .AsNoTracking()                               // read-only: skip change tracking
    .ToListAsync(ct);`,
      },
      notes: ["EF Core setup is covered in lesson 4.1.2; the shape of the query is the lesson here."],
    },
  ],
  companies: [
    "**LINQ is everywhere in .NET codebases**, both in memory and through EF Core. Code reviews routinely flag 'ToList() too early' and 'N+1 queries' as performance issues.",
    "**Async all the way** is a standard rule in ASP.NET Core services; teams monitor thread-pool queue length because starvation from blocking calls is a classic production incident.",
    "**Generic repositories and result types** appear in many enterprise codebases; mature teams keep generics simple and avoid deeply nested abstractions that hide what SQL is running.",
  ],
  mistakes: [
    { mistake: "Materialising too early (ToList before Where)", why: "Easier to debug in memory", wrong: "Whole tables loaded into RAM; slow and expensive", fix: "Compose Where/OrderBy/Take/Select on IQueryable, then ToListAsync" },
    { mistake: "Enumerating a query multiple times", why: "Not realising LINQ is lazy", wrong: "Repeated database queries or repeated expensive work", fix: "Materialise once with ToList/ToArray when reused" },
    { mistake: ".Result or .Wait() on tasks", why: "Calling async code from sync code", wrong: "Thread-pool starvation and deadlocks in some contexts", fix: "Make the call chain async; await everywhere" },
    { mistake: "async void methods", why: "Event-handler style", wrong: "Exceptions crash the process and cannot be awaited", fix: "Return Task; async void only for UI event handlers" },
    { mistake: "Ignoring CancellationToken", why: "Extra parameter to pass around", wrong: "Work continues after the client has gone, wasting resources", fix: "Accept and forward CancellationToken in every async method" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Filter, project (Select) and page in the database; AsNoTracking for read-only queries." },
    { tag: "Reliability", text: "Async all the way with CancellationToken; Task.WhenAll for independent calls." },
    { tag: "Maintainability", text: "Prefer clear method-syntax LINQ; break long chains into well-named variables." },
    { tag: "Performance", text: "Avoid LINQ in extremely hot loops where allocations matter; measure with BenchmarkDotNet before optimising." },
  ],
  interview: [
    { q: "What is deferred execution in LINQ?", a: "Most LINQ operators build a query that runs only when enumerated (foreach, ToList, Count). The data source is read at that moment, and enumerating again runs the query again. Operators like ToList, Count, First force immediate execution." },
    { q: "IEnumerable vs IQueryable?", a: "IEnumerable executes in memory with delegates. IQueryable carries an expression tree that a provider like EF Core translates to SQL. Keep queries IQueryable until filtering and paging are composed, so the database does the work." },
    { q: "Why not use .Result in ASP.NET Core?", a: "It blocks a thread-pool thread while waiting for I/O. Under load, many blocked threads cause thread-pool starvation: requests queue and latency spikes. In contexts with a synchronization context it can also deadlock. Use await throughout." },
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
    "Where · Select · OrderBy · GroupBy · Take/Skip · Any/Count/Sum · FirstOrDefault.",
    "LINQ is lazy; enumerate once (ToList) if reused.",
    "IQueryable: compose, then ToListAsync. Select only needed columns. AsNoTracking for reads.",
    "Generics: List<T>, where T : constraint.",
    "async Task<T>; await; never .Result/.Wait()/async void.",
    "Pass CancellationToken everywhere; Task.WhenAll for parallel I/O.",
  ],
  homework: {
    basic: {
      title: "LINQ drills",
      brief: ["Using the Attempt list from the hands-on, write queries for: (1) users who passed every lesson they attempted (score ≥ 60), (2) the best attempt per lesson, (3) lessons sorted by number of attempts, (4) a page of 2 results ordered by score."],
      criteria: ["Four correct queries", "Each uses method syntax", "Outputs printed"],
      hints: ["GroupBy then All for (1); GroupBy + MaxBy for (2)."],
      solution: {
        text: ["GroupBy is the workhorse; .NET 6+ MaxBy simplifies 'best per group'."],
        code: {
          lang: "csharp",
          code: `var allPassed = attempts.GroupBy(a => a.User)
    .Where(g => g.All(a => a.Score >= 60)).Select(g => g.Key);          // asha, meera
var bestPerLesson = attempts.GroupBy(a => a.Lesson)
    .Select(g => g.MaxBy(a => a.Score)!);                              // meera 1.3.1, ravi 1.3.2
var byPopularity = attempts.GroupBy(a => a.Lesson)
    .OrderByDescending(g => g.Count()).Select(g => $"{g.Key}:{g.Count()}");
var page2 = attempts.OrderByDescending(a => a.Score).Skip(2).Take(2);   // 2nd page of size 2`,
        },
      },
    },
    intermediate: {
      title: "Async aggregator with timeout",
      brief: ["Write `async Task<Dictionary<string, int>> GetStarsAsync(IEnumerable<string> repos, CancellationToken ct)` that fetches GitHub star counts in parallel (max 4 at a time with SemaphoreSlim), skips failures, and respects a 5-second overall timeout."],
      criteria: ["SemaphoreSlim limits concurrency", "Linked cancellation token with timeout", "Failures logged and skipped"],
      hints: ["CancellationTokenSource.CreateLinkedTokenSource(ct) then CancelAfter(5s)."],
      solution: {
        text: ["Same pattern as Python's semaphore + timeout from lesson 1.1.3, in C#."],
        code: {
          lang: "csharp",
          code: `static async Task<Dictionary<string, int>> GetStarsAsync(HttpClient http, IEnumerable<string> repos, CancellationToken ct)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(5));
    using var gate = new SemaphoreSlim(4);
    var results = new System.Collections.Concurrent.ConcurrentDictionary<string, int>();

    await Task.WhenAll(repos.Select(async name =>
    {
        await gate.WaitAsync(cts.Token);
        try
        {
            var repo = await http.GetFromJsonAsync<Repo>($"https://api.github.com/repos/{name}", cts.Token);
            if (repo is not null) results[name] = repo.stargazers_count;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            Console.Error.WriteLine($"skip {name}: {ex.GetType().Name}");
        }
        finally { gate.Release(); }
    }));
    return new Dictionary<string, int>(results);
}`,
        },
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
    { label: "Microsoft Learn: LINQ overview", url: "https://learn.microsoft.com/en-us/dotnet/csharp/linq/" },
    { label: "Generics in .NET", url: "https://learn.microsoft.com/en-us/dotnet/standard/generics/" },
    { label: "Asynchronous programming with async and await", url: "https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/" },
    { label: "EF Core: Efficient querying", url: "https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying" },
  ],
  nextPreview: "Next: dependency injection. Service lifetimes, constructor injection and why it makes ASP.NET Core apps testable.",
};
