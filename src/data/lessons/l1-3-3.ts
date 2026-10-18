import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.3",
  title: "Dependency injection",
  minutes: 55,
  level: "Intermediate",
  prerequisites: ["1.3.2 LINQ, generics and async/await"],
  summary: "Understand dependency injection from first principles, use the built-in .NET container with the right lifetimes (singleton, scoped, transient), and avoid the captive-dependency bug.",
  terms: [
    { term: "Dependency", def: "Something a class needs to do its job: a database context, an HTTP client, a clock, a logger." },
    { term: "Dependency injection (DI)", def: "Giving a class its dependencies from outside (usually through the constructor) instead of the class creating them." },
    { term: "Inversion of Control", def: "The general idea that a framework or container creates and wires objects for you." },
    { term: "Service lifetime", def: "How long the container keeps an instance: Singleton (one for the app), Scoped (one per request), Transient (new each time)." },
    { term: "Captive dependency", def: "A longer-lived service holding a shorter-lived one (a singleton holding a scoped DbContext), causing shared state and bugs." },
    { term: "Composition root", def: "The single place where services are registered and wired: Program.cs in ASP.NET Core." },
  ],
  problem: [
    "The progress service creates `new SmtpClient(\"smtp.prod\")` and `new MySqlConnection(\"...prod...\")` inside its methods. Tests send real emails and hit the production database. Switching to a different email provider means editing 30 classes.",
    "A different team registers their `DbContext` as a singleton 'for performance'. Under load, two requests share one context, and data from one user leaks into another's response. Dependency injection solves the first problem; understanding lifetimes prevents the second.",
  ],
  concept: {
    analogy: [
      "A chef who grows their own vegetables, raises chickens and builds the oven before cooking each meal will be slow and impossible to substitute. A chef who is **handed** ingredients and an oven can cook anywhere: in a test kitchen with plastic food, or in a five-star restaurant. DI is handing the chef the ingredients.",
      "Lifetimes are like kitchen equipment: the **oven** is shared by everyone all day (singleton), each **order ticket** gets its own tray (scoped per request), and **napkins** are fresh every time (transient).",
    ],
    precise: [
      "A class declares what it needs in its constructor, preferably as interfaces (`IEmailSender`, `IAttemptReader`, `TimeProvider`). The container builds the object graph: to create `ProgressService` it first creates its dependencies, recursively.",
      "**Lifetimes**: Singleton = one instance for the app's lifetime (must be thread-safe; e.g. configuration, IHttpClientFactory, caches). Scoped = one per scope; ASP.NET Core creates a scope per HTTP request (e.g. EF Core DbContext, unit-of-work). Transient = a new instance every resolution (lightweight, stateless services).",
      "**Rule**: a service may depend on services with the same or longer lifetime, never shorter. ASP.NET Core's container validates scopes in Development and throws if a singleton resolves a scoped service.",
    ],
  },
  underTheHood: {
    text: [
      "`builder.Services.AddScoped<IProgressService, ProgressService>()` stores a descriptor (service type, implementation type, lifetime). At runtime, when a controller or endpoint needs IProgressService, the provider looks up the descriptor, resolves constructor parameters recursively, caches the instance according to the lifetime, and disposes IDisposable instances when their scope ends.",
      "Each HTTP request gets its own `IServiceScope`; scoped services live in it and are disposed when the response finishes. That is why a DbContext (scoped) is safe per request but not shared across requests.",
      "DI is not only a .NET thing: FastAPI's `Depends`, Spring in Java, Angular's injector and Python Protocols with constructor injection (lesson 1.1.2) are the same idea.",
    ],
    diagram: {
      title: "Resolving one request",
      nodes: [
        { label: "HTTP request", sub: "new scope" },
        { label: "Endpoint", sub: "needs IProgressService" },
        { label: "ProgressService", sub: "scoped" },
        { label: "AppDbContext", sub: "scoped" },
        { label: "IEmailSender", sub: "singleton" },
      ],
      edges: ["", "resolve", "needs", "needs"],
    },
  },
  handsOn: [
    {
      title: "Without DI vs with DI",
      code: {
        lang: "csharp",
        code: `// Without DI: hard-wired, untestable
public class ProgressServiceBad
{
    public void Complete(string email, string lessonId)
    {
        var smtp = new SmtpEmailSender("smtp.prod.example.com");   // can't replace in tests
        smtp.Send(email, $"Finished {lessonId}");
    }
}

// With DI: depends on an abstraction, receives it from outside
public interface IEmailSender { Task SendAsync(string to, string body, CancellationToken ct); }

public sealed class ProgressService(IEmailSender email, TimeProvider clock)
{
    public async Task<string> CompleteAsync(string to, string lessonId, CancellationToken ct)
    {
        var message = $"Finished {lessonId} at {clock.GetUtcNow():HH:mm} UTC";
        await email.SendAsync(to, message, ct);
        return message;
    }
}`,
      },
      notes: ["TimeProvider (.NET 8+) is the built-in abstraction for 'now', so tests can control time."],
    },
    {
      title: "Register services in Program.cs (the composition root)",
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IEmailSender, ConsoleEmailSender>();   // stateless, thread-safe
builder.Services.AddScoped<ProgressService>();                       // one per request
builder.Services.AddHttpClient("github", c => c.BaseAddress = new Uri("https://api.github.com/"));

var app = builder.Build();

app.MapPost("/lessons/{id}/complete", async (string id, ProgressService svc, CancellationToken ct) =>
    Results.Ok(await svc.CompleteAsync("learner@example.com", id, ct)));

app.Run();

sealed class ConsoleEmailSender(ILogger<ConsoleEmailSender> log) : IEmailSender
{
    public Task SendAsync(string to, string body, CancellationToken ct)
    {
        log.LogInformation("Email to {To}: {Body}", to, body);   // structured logging
        return Task.CompletedTask;
    }
}`,
      },
      notes: ["Create the project with `dotnet new web -n DevAtlas.Api`. Minimal API handlers receive services as parameters; controllers receive them through constructors."],
    },
    {
      title: "Test with fakes, no container needed",
      code: {
        lang: "csharp",
        file: "ProgressServiceTests.cs",
        code: `public sealed class FakeEmailSender : IEmailSender
{
    public List<(string To, string Body)> Sent { get; } = [];
    public Task SendAsync(string to, string body, CancellationToken ct)
    {
        Sent.Add((to, body));
        return Task.CompletedTask;
    }
}

public sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}

public class ProgressServiceTests
{
    [Fact]
    public async Task Sends_completion_email_with_time()
    {
        var email = new FakeEmailSender();
        var svc = new ProgressService(email, new FixedClock(new DateTimeOffset(2026, 10, 18, 9, 30, 0, TimeSpan.Zero)));

        await svc.CompleteAsync("a@x.dev", "1.3.3", CancellationToken.None);

        Assert.Equal(("a@x.dev", "Finished 1.3.3 at 09:30 UTC"), Assert.Single(email.Sent));
    }
}`,
      },
    },
    {
      title: "See lifetimes with your own eyes",
      code: {
        lang: "csharp",
        code: `builder.Services.AddSingleton<SingletonId>();
builder.Services.AddScoped<ScopedId>();
builder.Services.AddTransient<TransientId>();

app.MapGet("/ids", (SingletonId s, ScopedId sc1, ScopedId sc2, TransientId t1, TransientId t2) => new
{
    singleton = s.Id,
    scopedSame = sc1.Id == sc2.Id,          // true: same request scope
    transientSame = t1.Id == t2.Id,         // false: new each time
});

class SingletonId { public Guid Id { get; } = Guid.NewGuid(); }
class ScopedId    { public Guid Id { get; } = Guid.NewGuid(); }
class TransientId { public Guid Id { get; } = Guid.NewGuid(); }`,
      },
      output: "GET /ids → {\"singleton\":\"…same on every request…\",\"scopedSame\":true,\"transientSame\":false}",
    },
    {
      title: "The captive dependency bug, and the fix",
      code: {
        lang: "csharp",
        code: `// BUG: singleton captures a scoped DbContext → shared across requests and threads
builder.Services.AddSingleton<LeaderboardCache>();      // ctor(AppDbContext db)  ✗
// In Development, ASP.NET Core throws:
// "Cannot consume scoped service 'AppDbContext' from singleton 'LeaderboardCache'."

// FIX: create a scope when the singleton needs the database
public sealed class LeaderboardCache(IServiceScopeFactory scopes)
{
    public async Task RefreshAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // ... query with db, store results in the singleton's memory
    }
}`,
      },
    },
  ],
  companies: [
    "**ASP.NET Core is built on DI**: logging, configuration, HttpClient, EF Core, authentication and your own services all come from the container. Understanding lifetimes is a standard .NET interview topic.",
    "**Swappable infrastructure**: teams register different implementations per environment (a fake payment gateway in staging, the real one in production) or per feature flag, without touching business code.",
    "**Background services** (IHostedService) are singletons; the scope-factory pattern above is how they safely use scoped services like DbContext for each unit of work.",
  ],
  mistakes: [
    { mistake: "DbContext as a singleton", why: "'Reuse is faster'", wrong: "DbContext is not thread-safe; data and change tracking leak between requests", fix: "AddDbContext (scoped by default); IDbContextFactory for background work" },
    { mistake: "Service locator everywhere", why: "Injecting IServiceProvider and resolving inside methods", wrong: "Hidden dependencies; hard to test and reason about", fix: "Constructor injection; use IServiceScopeFactory only in infrastructure code" },
    { mistake: "new HttpClient() per request", why: "HttpClient is IDisposable so 'using' seems right", wrong: "Socket exhaustion under load; DNS changes ignored by long-lived clients", fix: "IHttpClientFactory / AddHttpClient" },
    { mistake: "Constructors with 10+ dependencies", why: "Adding 'just one more' service", wrong: "The class does too much; tests need endless setup", fix: "Split the class by responsibility" },
    { mistake: "Stateful transient or singleton services with request data", why: "Storing the current user in a field", wrong: "Data races and users seeing each other's data", fix: "Keep singletons stateless or thread-safe; request data belongs in scoped services or parameters" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Constructor injection of interfaces; register everything in one composition root (or per-feature extension methods)." },
    { tag: "Reliability", text: "Enable ValidateScopes and ValidateOnBuild in all environments' tests to catch captive dependencies early." },
    { tag: "Reliability", text: "Inject TimeProvider instead of DateTime.UtcNow for testable time." },
    { tag: "Performance", text: "Singletons for expensive, thread-safe objects; IHttpClientFactory for HTTP." },
  ],
  interview: [
    { q: "Explain singleton, scoped and transient in ASP.NET Core.", a: "Singleton: one instance for the app, must be thread-safe. Scoped: one per request scope, typical for DbContext. Transient: new instance each resolution, for lightweight stateless services. A service must not depend on a shorter-lived one; a singleton capturing a scoped service is a captive dependency bug." },
    { q: "Why use dependency injection?", a: "It decouples classes from concrete implementations: they declare what they need and receive it. This enables testing with fakes, swapping implementations per environment, centralised configuration and controlled lifetimes and disposal." },
    { q: "How do you use a scoped service from a background service?", a: "Inject IServiceScopeFactory, create a scope per unit of work, resolve the scoped service from it, and dispose the scope when done. Or use IDbContextFactory for EF Core." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which lifetime does AddDbContext use by default?",
      options: ["Singleton", "Scoped", "Transient", "None"],
      answer: 1,
      explanation: "One DbContext per request scope.",
    },
    {
      kind: "bug",
      prompt: "Users occasionally see another user's cart. The CartService is registered like this:",
      code: { lang: "csharp", code: "builder.Services.AddSingleton<CartService>();\n\npublic class CartService {\n    public string? CurrentUserId { get; set; }\n    public List<Item> Items { get; } = new();\n}" },
      options: ["List is not thread-safe only", "A singleton holds per-user state shared across all requests", "The property should be private", "It should be a record"],
      answer: 1,
      explanation: "Per-user or per-request state must not live in a singleton. Make it scoped, or store carts by user id in a proper store.",
    },
    {
      kind: "mcq",
      prompt: "A singleton depends on a transient service. What lifetime does the transient instance effectively get?",
      options: ["Transient", "Scoped", "Singleton: it is created once and held by the singleton", "It is recreated per call"],
      answer: 2,
      explanation: "It is resolved once when the singleton is built and lives as long as the singleton. Fine if it is stateless and thread-safe; a bug otherwise.",
    },
  ],
  cheatSheet: [
    "Ask for dependencies in the constructor; depend on interfaces.",
    "Register in Program.cs: AddSingleton / AddScoped / AddTransient.",
    "Singleton: app lifetime, thread-safe. Scoped: per request. Transient: per resolve.",
    "Never let a longer-lived service hold a shorter-lived one.",
    "DbContext scoped; HttpClient via AddHttpClient; time via TimeProvider.",
    "Background services: IServiceScopeFactory per unit of work.",
    "Tests: construct classes directly with fakes; no container needed.",
  ],
  homework: {
    basic: {
      title: "Lifetime experiment",
      brief: ["Build the /ids endpoint from the hands-on. Call it 3 times and record the results. Then explain in your own words what each lifetime did."],
      criteria: ["Results from 3 calls", "Correct explanation of each line"],
      hints: ["curl localhost:5000/ids (check the port printed by dotnet run)."],
      solution: {
        text: [
          "Run it with `dotnet run`, then call `curl http://localhost:5000/ids` three times (use the port dotnet run prints). The GUIDs are random, but the pattern is always the same. A real run (ids shortened to 8 hex digits):",
          "Call 1: `{\"singleton\":\"88929624\",\"scoped\":\"f2e39fbc\",\"scopedSame\":true,\"transient1\":\"b469e58d\",\"transient2\":\"602ddef5\",\"transientSame\":false}`",
          "Call 2: `{\"singleton\":\"88929624\",\"scoped\":\"3a24811f\",\"scopedSame\":true,\"transient1\":\"33a73256\",\"transient2\":\"6e9e79a4\",\"transientSame\":false}`",
          "Call 3: `{\"singleton\":\"88929624\",\"scoped\":\"8069dc9e\",\"scopedSame\":true,\"transient1\":\"9c8abbd7\",\"transient2\":\"116b1062\",\"transientSame\":false}`",
          "Singleton: the same id on all 3 calls, because one instance is created on first use and kept for the app's lifetime.",
          "Scoped: `scopedSame` is true inside each call (both parameters came from the same request scope), but the scoped id changes between calls, because every HTTP request gets a new scope.",
          "Transient: `transientSame` is always false, and all ids are new each call, because the container builds a new instance for every resolution, even twice in one request.",
        ],
        code: {
          lang: "csharp", file: "Program.cs",
          code: `// dotnet new web -n LifetimeLab, then replace Program.cs with this file
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SingletonId>();   // one instance for the whole app
builder.Services.AddScoped<ScopedId>();         // one instance per HTTP request
builder.Services.AddTransient<TransientId>();   // a new instance every time it is resolved

var app = builder.Build();

app.MapGet("/ids", (SingletonId s, ScopedId sc1, ScopedId sc2, TransientId t1, TransientId t2) => new
{
    singleton = s.Short,
    scoped = sc1.Short,
    scopedSame = sc1.Id == sc2.Id,        // same request scope -> same instance
    transient1 = t1.Short,
    transient2 = t2.Short,
    transientSame = t1.Id == t2.Id,       // two resolutions -> two instances
});

app.Run();

abstract class IdHolder
{
    public Guid Id { get; } = Guid.NewGuid();
    public string Short => Id.ToString()[..8];   // first 8 hex digits are enough to compare
}
sealed class SingletonId : IdHolder;
sealed class ScopedId : IdHolder;
sealed class TransientId : IdHolder;`,
        },
        pitfalls: ["Reading the singleton id in two separate `dotnet run` sessions and concluding it changes: it lives for one process, not forever", "Expecting scoped to mean 'per user' or 'per session': it means per request scope"],
      },
    },
    intermediate: {
      title: "Swap implementations by environment",
      brief: ["Register `ConsoleEmailSender` in Development and an `SmtpEmailSender` (reading host/port from configuration) otherwise. Bind the SMTP settings with the options pattern."],
      criteria: ["builder.Environment.IsDevelopment() decides the registration", "Settings bound from appsettings via IOptions<T>", "No secrets in appsettings.json committed to Git"],
      hints: ["builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(\"Smtp\"));"],
      solution: {
        text: ["Secrets (SMTP password) come from environment variables or user-secrets locally and a secret manager in the cloud; appsettings holds only non-secret defaults."],
        code: {
          lang: "csharp",
          code: `// Program.cs, before builder.Build()
builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"));
if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IEmailSender, ConsoleEmailSender>();
else
    builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();

// types go after the top-level statements (or in their own files)
public sealed class SmtpOptions
{
    public required string Host { get; init; }
    public int Port { get; init; } = 587;
    public string? Password { get; init; }       // from env var Smtp__Password, never committed
}

public sealed class SmtpEmailSender(Microsoft.Extensions.Options.IOptions<SmtpOptions> options) : IEmailSender
{
    public Task SendAsync(string to, string body, CancellationToken ct)
    {
        var o = options.Value;
        // use an SMTP library (e.g. MailKit) with o.Host, o.Port, o.Password
        return Task.CompletedTask;
    }
}`,
        },
      },
    },
    challenge: {
      title: "Catch captive dependencies in a test",
      brief: ["Write an xUnit test that builds the app's service collection with `ValidateScopes = true` and `ValidateOnBuild = true` and fails if any registration is invalid. Introduce a captive dependency on purpose and watch the test fail."],
      criteria: ["Test builds the provider with validation options", "Deliberate bug detected", "Bug removed and test green"],
      hints: ["services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true })"],
      solution: {
        text: ["Building with ValidateOnBuild checks every registered service can be constructed and ValidateScopes catches singletons depending on scoped services. Running this in CI catches DI mistakes before deployment.", "The second test keeps the deliberate bug as a permanent check that validation is really switched on: register a singleton that needs the scoped LeaderboardService and building the provider must throw. To watch the first test fail, add the same `AddSingleton<NightlyReport>()` line inside AddDevAtlasServices; remove it and both tests are green. The capstone below runs these tests against the real AddDevAtlasServices."],
        code: {
          lang: "csharp",
          code: `[Fact]
public void Service_registrations_are_valid()
{
    var services = new ServiceCollection();
    services.AddLogging();
    services.AddDevAtlasServices();        // your extension method registering everything
    using var provider = services.BuildServiceProvider(new ServiceProviderOptions
    {
        ValidateScopes = true,
        ValidateOnBuild = true,
    });
}

[Fact]
public void Validation_catches_a_captive_dependency()
{
    var services = new ServiceCollection();
    services.AddLogging();
    services.AddDevAtlasServices();
    services.AddSingleton<NightlyReport>();   // deliberate bug: a singleton that needs a scoped service
    var ex = Assert.Throws<AggregateException>(() => services.BuildServiceProvider(new ServiceProviderOptions
    {
        ValidateScopes = true,
        ValidateOnBuild = true,
    }));
    Assert.Contains("Cannot consume scoped service", ex.Message);
}

private sealed class NightlyReport(LeaderboardService leaderboard)   // LeaderboardService is scoped
{
    public LeaderboardService Leaderboard { get; } = leaderboard;
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: API composition root",
      brief: ["In DevAtlas.Api, register IEmailSender, TimeProvider, LeaderboardService and an IAttemptReader (in-memory for now) through an `AddDevAtlasServices()` extension method. Expose GET /leaderboard/{lessonId}."],
      criteria: ["All registrations in one extension method", "Correct lifetimes with a comment justifying each", "Validation test from the challenge passes"],
      hints: ["public static IServiceCollection AddDevAtlasServices(this IServiceCollection s)"],
      solution: {
        text: [
          "Grouping registrations in an extension method keeps Program.cs short and lets tests reuse the exact same wiring.",
          "`AddDevAtlasServices` registers four things, each with a comment saying why: TimeProvider and the console email sender are singletons (stateless, thread-safe); the in-memory IAttemptReader is a singleton because it is one shared read-only list; LeaderboardService (from the 1.3.2 capstone) is scoped, so it stays correct when the EF Core reader in lesson 4.1.2 becomes scoped. A singleton LeaderboardService would then capture a scoped reader, which is exactly the bug from this lesson.",
          "The endpoint receives LeaderboardService as a parameter, validates `top` and returns typed results (200 with the entries, or a 400 validation problem). `public partial class Program;` lets the test project start the app in memory with WebApplicationFactory (package Microsoft.AspNetCore.Mvc.Testing).",
          "The tests are the challenge's validation test against the real extension method, the same check with a deliberate captive dependency (it must throw), and two endpoint tests. Verified on .NET 9 (`<TargetFramework>net9.0</TargetFramework>` in Directory.Build.props, nullable and warnings-as-errors on): `dotnet test` passed 4 of 4. The output is three curl calls against `dotnet run`.",
        ],
        code: {
          lang: "csharp",
          file: "services/api/DevAtlas.Api/ServiceCollectionExtensions.cs",
          code: `using DevAtlas.Core;

namespace DevAtlas.Api;

public static class ServiceCollectionExtensions
{
    /// <summary>The composition root: every DevAtlas registration, shared by Program.cs and the tests.</summary>
    public static IServiceCollection AddDevAtlasServices(this IServiceCollection services)
    {
        // Singleton: TimeProvider.System is stateless and thread-safe. Tests swap in a fixed clock.
        services.AddSingleton(TimeProvider.System);

        // Singleton: ConsoleEmailSender keeps no state and only uses ILogger, which is itself a singleton.
        services.AddSingleton<IEmailSender, ConsoleEmailSender>();

        // Singleton for now: one shared, read-only in-memory list. The EF Core reader (lesson 4.1.2) wraps a
        // scoped DbContext, so that registration will become AddScoped; nothing that uses it has to change.
        services.AddSingleton<IAttemptReader>(_ => new InMemoryAttemptReader(SeedData.Attempts));

        // Scoped: one per request. A scoped service may depend on a singleton or a scoped reader, so this
        // stays correct when the reader becomes scoped. As a singleton it would capture that reader.
        services.AddScoped<LeaderboardService>();

        return services;
    }
}

public sealed class ConsoleEmailSender(ILogger<ConsoleEmailSender> log) : IEmailSender
{
    public Task SendAsync(string to, string body, CancellationToken ct)
    {
        log.LogInformation("Email to {To}: {Body}", to, body);
        return Task.CompletedTask;
    }
}

public sealed class InMemoryAttemptReader(IEnumerable<Attempt> attempts) : IAttemptReader
{
    private readonly IReadOnlyList<Attempt> _attempts = [.. attempts];   // copied once, never mutated

    public Task<IReadOnlyList<Attempt>> GetForLessonAsync(string lessonId, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        IReadOnlyList<Attempt> result = _attempts.Where(a => a.LessonId == lessonId).ToList();
        return Task.FromResult(result);
    }
}

public static class SeedData
{
    public static readonly Attempt[] Attempts =
    [
        new("asha", "1.3.1", 90), new("asha", "1.3.1", 70),
        new("ravi", "1.3.1", 55), new("ravi", "1.3.1", 85),
        new("meera", "1.3.1", 95), new("zoe", "1.3.1", 80),
        new("meera", "1.3.2", 60),
    ];
}

// ---- services/api/DevAtlas.Api/Program.cs ----
using DevAtlas.Api;
using DevAtlas.Core;
using Microsoft.AspNetCore.Http.HttpResults;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDevAtlasServices();          // Program.cs stays short: wiring lives in one method

var app = builder.Build();

app.MapGet("/leaderboard/{lessonId}",
    async Task<Results<Ok<IReadOnlyList<LeaderboardEntry>>, ValidationProblem>> (
        string lessonId, LeaderboardService leaderboard, CancellationToken ct, int top = 10) =>
    {
        if (top is < 1 or > 100)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["top"] = ["Must be between 1 and 100."] });
        return TypedResults.Ok(await leaderboard.TopAsync(lessonId, top, ct));
    });

app.Run();

public partial class Program;   // makes the entry point visible to WebApplicationFactory<Program> in tests

// ---- services/api/DevAtlas.Core/IEmailSender.cs ----
namespace DevAtlas.Core;

public interface IEmailSender
{
    Task SendAsync(string to, string body, CancellationToken ct);
}

// ---- services/api/DevAtlas.Api.Tests/CompositionRootTests.cs ----
using System.Net;
using System.Net.Http.Json;
using DevAtlas.Api;
using DevAtlas.Core;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace DevAtlas.Api.Tests;

public class CompositionRootTests
{
    private static readonly ServiceProviderOptions Validate = new() { ValidateScopes = true, ValidateOnBuild = true };

    [Fact]
    public void Service_registrations_are_valid()
    {
        var services = new ServiceCollection().AddLogging().AddDevAtlasServices();
        using var provider = services.BuildServiceProvider(Validate);   // throws if anything is miswired
        using var scope = provider.CreateScope();
        Assert.NotNull(scope.ServiceProvider.GetRequiredService<LeaderboardService>());
    }

    [Fact]
    public void Validation_catches_a_captive_dependency()
    {
        var services = new ServiceCollection().AddLogging().AddDevAtlasServices();
        services.AddSingleton<NightlyReport>();                          // deliberate bug: singleton -> scoped
        var ex = Assert.Throws<AggregateException>(() => services.BuildServiceProvider(Validate));
        Assert.Contains("Cannot consume scoped service 'DevAtlas.Core.LeaderboardService'", ex.Message);
    }

    private sealed class NightlyReport(LeaderboardService leaderboard)
    {
        public LeaderboardService Leaderboard { get; } = leaderboard;
    }
}

public class LeaderboardEndpointTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Returns_the_top_learners_for_a_lesson()
    {
        var entries = await factory.CreateClient().GetFromJsonAsync<LeaderboardEntry[]>("/leaderboard/1.3.1?top=2");
        Assert.NotNull(entries);
        Assert.Equal([new("meera", 95.0), new LeaderboardEntry("asha", 80.0)], entries);
    }

    [Fact]
    public async Task Rejects_an_out_of_range_top()
    {
        var response = await factory.CreateClient().GetAsync("/leaderboard/1.3.1?top=0");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}`,
        },
        output: "$ curl \"http://localhost:5055/leaderboard/1.3.1?top=3\"\n[{\"user\":\"meera\",\"average\":95},{\"user\":\"asha\",\"average\":80},{\"user\":\"zoe\",\"average\":80}]\n$ curl \"http://localhost:5055/leaderboard/1.3.1?top=0\"\n{\"type\":\"https://tools.ietf.org/html/rfc9110#section-15.5.1\",\"title\":\"One or more validation errors occurred.\",\"status\":400,\"errors\":{\"top\":[\"Must be between 1 and 100.\"]}}\n$ curl \"http://localhost:5055/leaderboard/9.9.9\"\n[]",
        pitfalls: [
          "Registering LeaderboardService as a singleton because it 'has no state': it is only as long-lived as its shortest-lived dependency",
          "Building a second, different service collection in tests: the validation test must call the same AddDevAtlasServices that Program.cs uses",
          "Forgetting `public partial class Program;` on .NET 9: the top-level Program class is internal and WebApplicationFactory<Program> does not compile in the test project",
        ],
      },
    },
  },
  deeper: [
    { label: "Dependency injection in ASP.NET Core", url: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection" },
    { label: ".NET dependency injection guidelines", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines" },
    { label: "Use IHttpClientFactory", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory" },
    { label: "Options pattern in .NET", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/options" },
  ],
  nextPreview: "Next: Rust ownership, borrowing and lifetimes: memory safety without a garbage collector, and how to read borrow-checker errors calmly.",
};
