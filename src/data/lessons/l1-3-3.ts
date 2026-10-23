import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.3",
  title: "Dependency injection",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.3.2 LINQ, generics and async/await"],
  summary: "Understand dependency injection as a pattern and a container, choose the right lifetime (singleton, scoped, transient), catch captive dependencies with provider validation, use the options pattern, and test by swapping fakes.",
  terms: [
    { term: "Dependency", def: "Something a class needs to do its job: a database context, an HTTP client, a clock, a logger, a configuration object." },
    { term: "Dependency injection (DI)", def: "A pattern: a class declares what it needs and receives it from outside, usually through its constructor. The class does not create or look up its dependencies." },
    { term: "DI container", def: "The object that maps registrations to instances and builds object graphs: in .NET, IServiceProvider. A container is one way to implement the DI pattern, not the pattern itself." },
    { term: "Inversion of Control", def: "The general idea that a framework or container creates and wires objects for you, so your code is called rather than calling everything itself." },
    { term: "Service descriptor", def: "One registration: service type, implementation type or factory, and lifetime. IServiceCollection holds descriptors; BuildServiceProvider turns them into a provider." },
    { term: "Service lifetime", def: "How long the container keeps an instance: Singleton (one for the app), Scoped (one per scope, usually one HTTP request), Transient (a new one on every resolution)." },
    { term: "Scope", def: "A boundary that owns scoped instances. ASP.NET Core creates one per HTTP request; background code creates one per unit of work with CreateScope or CreateAsyncScope." },
    { term: "Captive dependency", def: "A longer-lived service holding a shorter-lived one, such as a singleton holding a scoped DbContext. The short-lived object is created once and never released per request." },
    { term: "Composition root", def: "The one place where the object graph is assembled: Program.cs in ASP.NET Core, or a single startup function in a console app." },
    { term: "Service locator", def: "Asking a container for dependencies inside a method (IServiceProvider.GetService) instead of declaring them. It hides the dependency graph and makes tests need a container." },
    { term: "Options pattern", def: "Binding a configuration section to a typed class and injecting IOptions<T>, IOptionsSnapshot<T> or IOptionsMonitor<T> instead of reading string keys throughout the code." },
  ],
  problem: [
    "The progress service creates `new SmtpClient(\"smtp.prod\")` and `new MySqlConnection(\"...prod...\")` inside its methods. Tests send real emails and write to the production database. Switching to a different email provider means editing 30 classes, and nothing in a class signature tells you what it secretly reaches for.",
    "A different team registers their `DbContext` as a singleton \"for performance\". Under load, two requests share one context, and data from one user leaks into another's response. A third team wraps every class in an interface and injects a container into everything, so a 200-line script now needs 400 lines of wiring. DI solves the first problem; understanding lifetimes, ownership and the difference between the pattern and the container prevents the other two.",
  ],
  concept: {
    analogy: [
      "A chef who grows their own vegetables, raises chickens and builds the oven before cooking each meal will be slow and impossible to substitute. A chef who is **handed** ingredients and an oven can cook anywhere: in a test kitchen with plastic food, or in a five-star restaurant. DI is handing the chef the ingredients instead of making them find or build them.",
      "Lifetimes are like kitchen equipment: the **oven** is shared by everyone all day (singleton), each **order ticket** gets its own tray and stays with that order until it is finished (scoped), and **napkins** are fresh every time (transient). Handing a singleton chef a per-order tray is the captive-dependency bug: the tray is used once and then never replaced.",
    ],
    precise: [
      "**DI is two things, and confusing them causes most of the trouble.** The pattern is constructor injection: a class declares its dependencies, preferably as interfaces, and receives them from outside. The container is a tool that builds the graph from a list of registrations. You can use the pattern with no container at all - a composition root that calls `new ProgressService(email, clock)` is DI. You can also use a container badly - injecting `IServiceProvider` and resolving inside methods is the service-locator anti-pattern, not good DI. DI is not a global variable, not a requirement to have an interface for every class, and not a reason to hide dependencies.",
      "**Lifetimes** decide identity and ownership. Singleton: one instance in the root provider for the app's lifetime; it must be thread-safe and must not hold request data. Scoped: one instance per scope, and ASP.NET Core creates a scope per HTTP request; a DbContext and a unit of work belong here. Transient: a new instance on every resolution, even twice in one constructor. The **direction rule** is: a service may depend on services with the same or longer lifetime, never shorter. A singleton that depends on a scoped service creates a **captive dependency**: the scoped instance is created once, held forever, shared across requests and threads, and never disposed at the end of a request.",
      "**Register the interface, not the implementation.** `AddScoped<IProgressService, ProgressService>()` is the seam that lets a test pass a fake and lets production pass the real thing. Constructor injection makes the dependency graph visible in the signature, and `ValidateOnBuild` turns a missing registration into a startup failure instead of a request-time surprise. Service location (`sp.GetRequiredService<T>()` inside a method) compiles even when the registration is missing and fails only when that line runs, usually in production. Use a factory delegate (`AddSingleton<IClock>(_ => new SystemClock())`) when construction needs code, and `IServiceScopeFactory` only in infrastructure that genuinely outlives a request, such as a hosted service.",
      "**Options and validation.** Bind configuration once (`AddOptions<SmtpOptions>().Bind(config.GetSection(\"Smtp\"))`) and inject a typed object. `IOptions<T>` is a singleton snapshot computed once; `IOptionsSnapshot<T>` is scoped and recomputed per request; `IOptionsMonitor<T>` is a singleton with `CurrentValue` and `OnChange` for long-lived consumers. Validate with `ValidateDataAnnotations()` plus `ValidateOnStart()` so bad configuration fails at boot. Validate the provider with `ValidateScopes = true` and `ValidateOnBuild = true` so captive dependencies and missing registrations fail before traffic arrives. Tests can then swap a fake in one line. DI earns its cost when a graph has several implementations, lifetimes or test seams; for a small script, a pure function, or a class with one implementation that will never be substituted, explicit `new` is clearer.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Registration writes descriptors, not objects.** `builder.Services.AddScoped<IProgressService, ProgressService>()` appends a `ServiceDescriptor` holding the service type, implementation type, lifetime and an optional factory. `AddSingleton(TimeProvider.System)` stores an already-created instance. `TryAdd` avoids duplicate registrations; the last registration for a service type wins when you resolve a single instance, and `IEnumerable<T>` returns all of them. Nothing is constructed at this point.",
      "2. **Resolution walks the graph.** `BuildServiceProvider` turns descriptors into a root `IServiceProvider`. When an endpoint asks for `ProgressService`, the provider finds its descriptor, inspects the constructor, resolves each parameter recursively, and caches the result according to the lifetime. A missing registration throws `InvalidOperationException` at resolution time; `GetService<T>` returns null instead, which is exactly the failure mode that makes service location dangerous.",
      "3. **Scopes own scoped instances.** ASP.NET Core creates an `IServiceScope` per request and disposes it when the response completes. Scoped services are created in that scope's cache and released with it. The root provider is itself a scope for singletons. With `ValidateScopes = true`, resolving a scoped service from the root throws instead of silently creating a request-lifetime object that lives forever. Manual code uses `using var scope = provider.CreateScope()` or `await using var scope = provider.CreateAsyncScope()`.",
      "4. **Disposal follows ownership.** The container tracks the `IDisposable` and `IAsyncDisposable` instances it creates: singletons are disposed when the app shuts down, scoped instances when their scope ends, and transient disposables are tracked by the scope that resolved them until that scope is disposed. Never dispose an injected dependency yourself, and do not resolve a disposable transient in a tight loop: it stays alive until the scope ends. If you construct an object yourself, the container does not own it.",
      "5. **The captive dependency is a lifetime inversion.** A singleton is built in the root scope, so a scoped constructor parameter can only be satisfied from the root. Without validation, the container creates the scoped object in the root and hands it to the singleton; it is now a singleton in practice. With `ValidateScopes = true`, call-site validation rejects the registration. `ValidateOnBuild = true` checks every descriptor at startup, so the failure happens on the first build (development by default in ASP.NET Core, and you should enable it in tests and CI) rather than on the first unlucky request. Errors from building are wrapped in an `AggregateException`; the useful message is on the inner `InvalidOperationException`.",
      "6. **Service locator hides the same graph.** Injecting `IServiceProvider` and calling `GetRequiredService` inside a method defers every wiring mistake to runtime and makes the class untestable without a container. It also makes dependencies invisible to readers and to tools. The legitimate exceptions are framework infrastructure (middleware, hosted services, factories) and code that must choose an implementation at runtime; even then, prefer a factory interface that returns the dependency over passing the whole container.",
      "7. **Options are a small DI feature with large consequences.** `Configure<T>` registers the options infrastructure; `IOptions<T>` resolves a cached singleton value, `IOptionsSnapshot<T>` recomputes per scope (so it is suitable for per-request settings and must not be captured by a singleton), and `IOptionsMonitor<T>` keeps a singleton current and exposes `OnChange` for reloads. `ValidateDataAnnotations()` checks attributes, custom `Validate` delegates check cross-field rules, and `ValidateOnStart()` runs validation during startup. The same lifetime rules apply: a singleton taking `IOptionsSnapshot<T>` is a captive dependency.",
      "8. **Thread safety is a property of your code, not the container.** The container guarantees one instance for a singleton, not that the instance is safe to use concurrently. A scoped service is safe to keep per request only if you do not spawn background work that outlives the scope. A transient is not automatically cheap: allocating and disposing one per resolution can dominate a hot path. Choose the lifetime from ownership and concurrency first, then measure.",
    ],
    diagram: {
      title: "One request scope, three lifetimes",
      nodes: [
        { label: "HTTP request", sub: "CreateScope()" },
        { label: "Scope provider", sub: "scoped cache" },
        { label: "ProgressService", sub: "scoped" },
        { label: "AppDbContext", sub: "scoped" },
        { label: "IEmailSender", sub: "singleton in root" },
        { label: "Formatter", sub: "transient" },
      ],
      edges: ["owns", "builds", "builds", "shared from root", "new each resolve"],
      caption: "Scoped objects live and die with the request. The singleton is resolved from the root and shared by every scope; the transient is rebuilt even when requested twice in one graph.",
    },
  },
  handsOn: [
    {
      title: "Know the three lifetimes before you register anything",
      text: [
        "Read this table as a contract: the lifetime decides identity, disposal and the lifetime a dependent service is allowed to have. The last row is the bug the container cannot fix for you unless validation is on.",
      ],
      code: {
        lang: "text",
        file: "lifetimes.txt",
        code: `Lifetime    One instance per...        Typical use                         What you should see
Singleton   process (root scope)       config, caches, TimeProvider        same id on every request
Scoped      DI scope (HTTP request)    DbContext, unit of work             same id inside a request; new id between requests
Transient   every resolution           cheap stateless helpers             different id on every resolve, even in one graph

Dependency direction
  singleton -> singleton     OK
  singleton -> scoped        CAPTIVE: scoped object created once in the root, never per request
  scoped    -> singleton     OK (the short-lived object may use the long-lived one)
  scoped    -> scoped        OK
  transient -> anything      OK, but a transient captured by a singleton becomes a singleton in practice`,
      },
      notes: [
        "`Scoped` is not \"per user\" or \"per session\". It is per DI scope, and the web host creates one scope per request.",
        "A singleton must be thread-safe. A scoped service may keep request state; a transient should usually be stateless and cheap.",
      ],
    },
    {
      title: "Prove it: a singleton is reused, a scoped instance is per scope",
      text: [
        "This console program registers one of each lifetime, creates three scopes, and resolves two transients in each scope. Run it yourself; the GUID values change, but the pattern never does.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddSingleton<AppClock>();       // shared by the whole process
services.AddScoped<RequestContext>();    // one per CreateScope()
services.AddTransient<Formatter>();      // new on every resolution

using var provider = services.BuildServiceProvider(
    new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true });

Console.WriteLine("scope   singleton   scoped       transient x2");
for (var i = 1; i <= 3; i++)
{
    using var scope = provider.CreateScope();
    var sp = scope.ServiceProvider;
    var clock = sp.GetRequiredService<AppClock>();
    var ctx = sp.GetRequiredService<RequestContext>();
    var f1 = sp.GetRequiredService<Formatter>();
    var f2 = sp.GetRequiredService<Formatter>();

    Console.WriteLine($"{i,-7} {clock.Short,-11} {ctx.Short,-12} {f1.Short} {f2.Short} (same={ReferenceEquals(f1, f2)})");
}

sealed class AppClock
{
    public Guid Id { get; } = Guid.NewGuid();
    public string Short => Id.ToString("N")[..8];
}

sealed class RequestContext
{
    public Guid Id { get; } = Guid.NewGuid();
    public string Short => Id.ToString("N")[..8];
}

sealed class Formatter
{
    public Guid Id { get; } = Guid.NewGuid();
    public string Short => Id.ToString("N")[..8];
}`,
      },
      output: "scope   singleton   scoped       transient x2\n1       80aa8ead    59aa75fc     15ff1250 1ee8f6a1 (same=False)\n2       80aa8ead    41c737b5     85505d23 981776ca (same=False)\n3       80aa8ead    31ed7e1f     5323b427 99146f01 (same=False)",
      notes: [
        "Real output from `dotnet run` on .NET 10. The singleton id is identical in all three scopes; the scoped id changes with each `CreateScope()`; the two transients differ even inside one scope.",
        "The demo used the ASP.NET Core shared framework (`<FrameworkReference Include=\"Microsoft.AspNetCore.App\" />`), so no package restore was needed. A plain console app can add the `Microsoft.Extensions.DependencyInjection` package instead.",
        "This is the same result the HTTP `/ids` endpoint in the basic homework shows, except that the web host creates the scope for you once per request.",
      ],
    },
    {
      title: "Catch a captive dependency before the first request",
      text: [
        "A singleton that needs a scoped service is the most common lifetime bug in .NET. Build the provider with validation and the mistake fails immediately, with a message that names both types.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();
services.AddScoped<AppDbContext>();
services.AddSingleton<LeaderboardCache>();          // BUG: singleton needs a scoped service

try
{
    using var provider = services.BuildServiceProvider(
        new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true });
    Console.WriteLine("No error: validation is off or the bug is gone.");
}
catch (AggregateException ex)
{
    foreach (var inner in ex.InnerExceptions)
    {
        Console.WriteLine($"{inner.GetType().Name}: {inner.Message}");
    }
}

sealed class AppDbContext
{
    public Guid Id { get; } = Guid.NewGuid();
}

sealed class LeaderboardCache(AppDbContext db)
{
    public AppDbContext Db { get; } = db;
}`,
      },
      output: "InvalidOperationException: Error while validating the service descriptor 'ServiceType: LeaderboardCache Lifetime: Singleton ImplementationType: LeaderboardCache': Cannot consume scoped service 'AppDbContext' from singleton 'LeaderboardCache'.",
      notes: [
        "Real output from .NET 10. `BuildServiceProvider` threw an `AggregateException`; the message above is its inner `InvalidOperationException`.",
        "Fix 1: make `LeaderboardCache` scoped too if it only lives for a request. Fix 2: keep it a singleton but inject `IServiceScopeFactory`, create a scope per refresh, resolve the DbContext from that scope, and dispose the scope. For EF Core background work, `IDbContextFactory<T>` is usually cleaner.",
        "In Development, ASP.NET Core validates scopes by default. Enable both checks explicitly in tests and CI so a production configuration change cannot silently reintroduce the bug.",
      ],
    },
    {
      title: "Swap a fake in a test without changing the service",
      text: [
        "The service depends on `IEmailSender` and `TimeProvider`. A fake and a fixed clock are enough: one test constructs the service directly, and a second resolves it from a container where the fake is registered. Both real tests passed.",
      ],
      code: {
        lang: "csharp",
        file: "ProgressServiceTests.cs",
        code: `using Microsoft.Extensions.DependencyInjection;
using Xunit;

public interface IEmailSender
{
    Task SendAsync(string to, string body, CancellationToken ct);
}

public sealed class ProgressService(IEmailSender email, TimeProvider clock)
{
    public async Task<string> CompleteAsync(string to, string lessonId, CancellationToken ct)
    {
        var message = $"Finished {lessonId} at {clock.GetUtcNow():HH:mm} UTC";
        await email.SendAsync(to, message, ct);
        return message;
    }
}

public sealed class FakeEmailSender : IEmailSender
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
        var clock = new FixedClock(new DateTimeOffset(2026, 10, 18, 9, 30, 0, TimeSpan.Zero));
        var svc = new ProgressService(email, clock);

        await svc.CompleteAsync("a@x.dev", "1.3.3", CancellationToken.None);

        Assert.Equal(("a@x.dev", "Finished 1.3.3 at 09:30 UTC"), Assert.Single(email.Sent));
    }

    [Fact]
    public async Task The_container_swaps_the_fake_without_touching_the_service()
    {
        var email = new FakeEmailSender();
        var services = new ServiceCollection();
        services.AddSingleton<TimeProvider>(new FixedClock(new DateTimeOffset(2026, 10, 18, 9, 30, 0, TimeSpan.Zero)));
        services.AddSingleton<IEmailSender>(email);       // swap point: fake replaces the real sender
        services.AddScoped<ProgressService>();

        using var provider = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true });
        using var scope = provider.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<ProgressService>();

        var result = await svc.CompleteAsync("b@x.dev", "1.3.3", CancellationToken.None);

        Assert.Equal("Finished 1.3.3 at 09:30 UTC", result);
        Assert.Single(email.Sent);
    }
}`,
      },
      output: "Test run for C:\\Users\\cored\\AppData\\Local\\Temp\\opencode\\devatlas-di-133\\DiFakeTests\\bin\\Debug\\net10.0\\DiFakeTests.dll (.NETCoreApp,Version=v10.0)\nA total of 1 test files matched the specified pattern.\n\nPassed!  - Failed:     0, Passed:     2, Skipped:     0, Total:     2, Duration: 171 ms - DiFakeTests.dll (net10.0)",
      notes: [
        "Real output from `dotnet test` on .NET 10. No mocking library was needed: a hand-written fake records the calls and makes assertions obvious.",
        "The direct-construction test isolates business logic. The container test proves the registration and lifetime wiring, which is the part a fake cannot verify by itself.",
        "A fixed `TimeProvider` removes wall-clock flakiness; the same seam works for `DateTime.UtcNow` callers once they depend on `TimeProvider`.",
      ],
    },
    {
      title: "See the composition root, interfaces and options as one picture",
      text: [
        "Registration is where interfaces become choices. `AddSingleton<IEmailSender, ConsoleEmailSender>()` says \"whoever asks for the interface gets this implementation\"; a test replaces the same line with a fake. Options are registered separately and resolved through one of the three options interfaces. The arrows below are the whole wiring story for one request.",
      ],
      code: {
        lang: "mermaid",
        file: "composition-root.mmd",
        code: `flowchart TD
  Program["Program.cs: composition root"] -->|AddSingleton| Clock["TimeProvider.System"]
  Program -->|AddSingleton| Mail["IEmailSender to ConsoleEmailSender"]
  Program -->|AddScoped| Progress["ProgressService"]
  Program -->|AddScoped| Db["AppDbContext"]
  Program -->|Configure + AddOptions| Opt["SmtpOptions"]
  Progress --> Mail
  Progress --> Clock
  Progress --> Db
  ScopedSettings["scoped settings consumer"] -.->|IOptionsSnapshot| Opt
  Monitor["singleton settings consumer"] -.->|IOptionsMonitor| Opt
  Opt -->|ValidateOnStart| Boot["startup fails on bad config"]`,
      },
      notes: [
        "Singleton arrows leave the request scope; scoped arrows live inside it. A singleton may point to other singletons, never to a scoped box.",
        "`IOptions<T>` and `IOptionsMonitor<T>` are singletons; `IOptionsSnapshot<T>` is scoped, so it can be used beside the DbContext but must not be captured by the singleton `ProgressService`.",
        "`ValidateScopes` and `ValidateOnBuild` belong on `BuildServiceProvider` in tests and CI. `ValidateOnStart` belongs on the options registration in the app.",
      ],
    },
  ],
  companies: [
    "**Microsoft and ASP.NET Core (illustrative; behaviour documented in the linked docs):** logging, configuration, options, `IHttpClientFactory`, EF Core, authentication and your own services are all registered in the same container behind `WebApplicationBuilder.Services`. That is why lifetime knowledge is a standard .NET interview topic and why `ValidateScopes` exists in the framework.",
    "**EF Core and IHttpClientFactory (illustrative):** `AddDbContext` is scoped by default because a DbContext is a unit of work, not a thread-safe cache. `AddHttpClient` manages the lifetime of the underlying message handlers so sockets are reused without a long-lived client holding stale DNS forever. Both are lifetime decisions disguised as library calls.",
    "**Spring, Angular and FastAPI (illustrative):** the same pattern under different names. Spring has singleton, prototype and request-scoped beans; Angular has hierarchical injectors and provider scopes; FastAPI's `Depends` with `yield` gives request-scoped resources and cleanup. DI is not a .NET idea, and the lifetime rules transfer almost unchanged.",
    "**Background job processors (illustrative):** hosted services, Hangfire and Quartz workers are singletons. They cannot constructor-inject a scoped DbContext for the life of the process; they create a scope per job or use `IDbContextFactory`. This is the scope-factory pattern from the hands-on, used in production.",
    "**Configuration and secrets management (illustrative):** teams bind non-secret defaults from `appsettings.json` and override secrets with environment variables or a secret manager, then validate the resulting options at startup. An options class with `[Required]` and a `ValidateOnStart` call turns a missing SMTP host into a boot failure instead of a failed email at 2 a.m.",
  ],
  mistakes: [
    { mistake: "DbContext as a singleton", why: "'Reuse is faster'", wrong: "DbContext is not thread-safe; change tracking, connections and cached entities leak between requests", fix: "AddDbContext (scoped by default); IDbContextFactory for background work" },
    { mistake: "Service locator everywhere", why: "Injecting IServiceProvider and resolving inside methods feels flexible", wrong: "Hidden dependencies, runtime-only failures, tests need a container, and the graph is invisible", fix: "Constructor injection; use IServiceScopeFactory only in infrastructure that outlives a request" },
    { mistake: "new HttpClient() per request", why: "HttpClient is IDisposable, so 'using' seems correct", wrong: "Socket exhaustion under load; long-lived clients also ignore DNS changes", fix: "IHttpClientFactory / AddHttpClient" },
    { mistake: "Constructors with 10+ dependencies", why: "Adding 'just one more' service", wrong: "The class does too much; tests need endless setup and the graph is hard to reason about", fix: "Split the class by responsibility; move orchestration into a smaller service" },
    { mistake: "Stateful transient or singleton services with request data", why: "Storing the current user in a field", wrong: "Data races and users seeing each other's data", fix: "Keep singletons stateless or thread-safe; request data belongs in scoped services or parameters" },
    { mistake: "Leaving validation off because development 'works'", why: "The captive dependency only misbehaves under concurrency or after disposal", wrong: "Stale data, cross-request leaks, ObjectDisposedException in production", fix: "Build with ValidateScopes and ValidateOnBuild in tests and CI; make the lifetime direction explicit in code review" },
    { mistake: "Injecting IOptionsSnapshot into a singleton", why: "It is the options interface that looks most convenient", wrong: "The snapshot is scoped, so the singleton captures it; configuration also stops updating", fix: "Use IOptionsMonitor<T> in singletons, IOptionsSnapshot<T> in scoped services, IOptions<T> for a fixed startup snapshot" },
    { mistake: "An interface and a container for everything", why: "It looks like 'best practice' and is easy to copy", wrong: "One-implementation abstractions add indirection, obscure simple code and make a script depend on a framework", fix: "Inject where there is a real seam, lifetime or test need; use explicit new and pure functions at the edges" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Constructor injection of interfaces; register everything in one composition root or per-feature extension methods, and keep Program.cs short." },
    { tag: "Reliability", text: "Build the provider with ValidateScopes and ValidateOnBuild in tests and CI; use ValidateOnStart for options so bad configuration fails at boot." },
    { tag: "Reliability", text: "Respect the lifetime direction: a singleton may depend only on singletons. Use IServiceScopeFactory or IDbContextFactory for per-unit-of-work scoped work in background services." },
    { tag: "Performance", text: "Singletons for expensive, thread-safe objects; scoped for units of work; transient only for cheap stateless helpers. Use IHttpClientFactory for HTTP and measure before choosing a lifetime for speed." },
    { tag: "Security", text: "Keep secrets out of appsettings.json: use environment variables or a secret manager, bind them into validated options, and never log the option object." },
  ],
  interview: [
    { q: "Explain singleton, scoped and transient in ASP.NET Core.", a: "Singleton: one instance for the app, created in the root provider, must be thread-safe. Scoped: one instance per DI scope, and ASP.NET Core creates one scope per HTTP request; a DbContext is the canonical example. Transient: a new instance on every resolution, even twice in one object graph. The rule is that a service may depend on the same or a longer lifetime, never a shorter one; a singleton capturing a scoped service is a captive dependency. With ValidateScopes the container rejects that wiring, and ValidateOnBuild checks every registration at startup. Also mention disposal: the container owns and disposes what it creates, scoped objects when the scope ends and singletons at shutdown." },
    { q: "Why use dependency injection, and when is it overkill?", a: "The pattern decouples a class from concrete implementations: dependencies are declared in the constructor, so tests can pass fakes, environments can swap implementations, and lifetimes and disposal are managed in one place. The container is optional; a composition root that calls new is still DI. It is overkill for a small script, a pure function, a class with one implementation that will never be substituted, or a library that should not force a container on its consumers. Service location - injecting IServiceProvider and resolving inside methods - is the failure mode to avoid: it hides the graph and moves wiring errors to runtime." },
    { q: "How do you use a scoped service from a background service, and how do options fit?", a: "The background service is a singleton, so it must not hold a scoped instance. Inject IServiceScopeFactory, create a scope per unit of work with CreateAsyncScope, resolve the scoped service from that scope, and dispose the scope when the work ends; for EF Core, IDbContextFactory is often simpler. For configuration, use IOptionsMonitor<T> in the singleton so CurrentValue stays current and OnChange can react to reloads. IOptionsSnapshot<T> is scoped and would be another captive dependency in a singleton; IOptions<T> is a one-time singleton snapshot." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which lifetime does AddDbContext use by default?",
      options: ["Singleton", "Scoped", "Transient", "None"],
      answer: 1,
      explanation: "One DbContext per request scope. A DbContext is a unit of work and is not thread-safe, so it must not be shared across requests.",
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
    "Ask for dependencies in the constructor; depend on interfaces. DI is the pattern; IServiceProvider is just the container.",
    "Register in Program.cs: AddSingleton / AddScoped / AddTransient; the last registration for a service type wins.",
    "Singleton: app lifetime, thread-safe, no request state. Scoped: per request scope. Transient: per resolution.",
    "Never let a longer-lived service hold a shorter-lived one: that is a captive dependency.",
    "DbContext scoped; HttpClient via AddHttpClient; time via TimeProvider; per-job work via IServiceScopeFactory or IDbContextFactory.",
    "Options: IOptions<T> is a singleton snapshot; IOptionsSnapshot<T> is scoped per request; IOptionsMonitor<T> is a singleton with CurrentValue and OnChange.",
    "Validate options with ValidateDataAnnotations and ValidateOnStart. Validate the provider with ValidateScopes and ValidateOnBuild.",
    "Tests: construct classes directly with fakes; use a container test only to prove the wiring and lifetimes.",
    "Service locator is not DI: resolving inside a method hides dependencies and defers failures to runtime.",
    "Skip DI for scripts, pure functions, one-implementation classes and libraries; explicit new at the edge is clearer.",
  ],
  homework: {
    basic: {
      title: "Lifetime experiment",
      brief: ["Build the /ids endpoint in the solution below. Call it 3 times and record the results. Then explain in your own words what each lifetime did."],
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
      brief: ["Register `ConsoleEmailSender` in Development and an `SmtpEmailSender` (reading host/port from configuration) otherwise. Bind the SMTP settings with the options pattern, validate them at startup, and use the right options interface for each lifetime."],
      criteria: ["builder.Environment.IsDevelopment() decides the registration", "Settings bound from appsettings via the options pattern", "Validation runs at startup and no secret is committed to Git"],
      hints: ["builder.Services.AddOptions<SmtpOptions>().Bind(builder.Configuration.GetSection(\"Smtp\")).ValidateDataAnnotations().ValidateOnStart();", "A singleton must not inject IOptionsSnapshot<T>."],
      solution: {
        text: [
          "Secrets (the SMTP password) come from environment variables or user-secrets locally and a secret manager in the cloud; appsettings holds only non-secret defaults. The password is read from `Smtp__Password` (double underscore is the environment-variable separator for a nested key).",
          "`AddOptions<SmtpOptions>()` registers the options infrastructure, `Bind` maps the section, `ValidateDataAnnotations` enforces `[Required]` and `[Range]`, and `ValidateOnStart` runs the checks while the host starts rather than when the first email is sent.",
          "`SmtpEmailSender` uses `IOptionsMonitor<SmtpOptions>` because it is a singleton. A scoped service that needs the settings for one request can use `IOptionsSnapshot<SmtpOptions>`; a singleton must not, because the scoped snapshot would be captured.",
        ],
        code: {
          lang: "csharp",
          file: "Program.cs",
          code: `using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .ValidateOnStart();                       // bad config fails at boot, not on first email

if (builder.Environment.IsDevelopment())
    builder.Services.AddSingleton<IEmailSender, ConsoleEmailSender>();
else
    builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();

var app = builder.Build();
app.Run();

public sealed class SmtpOptions
{
    [Required] public required string Host { get; init; }
    [Range(1, 65535)] public int Port { get; init; } = 587;
    public string? Password { get; init; }       // env var Smtp__Password, never committed
}

public sealed class SmtpEmailSender(
    IOptionsMonitor<SmtpOptions> options,
    ILogger<SmtpEmailSender> log) : IEmailSender
{
    public Task SendAsync(string to, string body, CancellationToken ct)
    {
        var o = options.CurrentValue;            // latest validated configuration
        log.LogInformation("SMTP {Host}:{Port} to {To}", o.Host, o.Port, to);
        // send with an SMTP library (for example MailKit) using o.Host, o.Port, o.Password
        return Task.CompletedTask;
    }
}`,
        },
        pitfalls: ["Injecting IOptionsSnapshot<T> into the singleton sender: it is a captive scoped dependency and the value stops refreshing", "Committing the SMTP password to appsettings.json", "Validating only a boolean 'configured' flag instead of the host and port the code actually uses"],
      },
    },
    challenge: {
      title: "Catch captive dependencies in a test",
      brief: ["Write an xUnit test that builds the app's service collection with `ValidateScopes = true` and `ValidateOnBuild = true` and fails if any registration is invalid. Introduce a captive dependency on purpose and watch the test fail."],
      criteria: ["Test builds the provider with validation options", "Deliberate bug detected", "Bug removed and test green"],
      hints: ["services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true, ValidateOnBuild = true })"],
      solution: {
        text: ["Building with ValidateOnBuild checks every registered service can be constructed and ValidateScopes catches singletons depending on scoped services. Running this in CI catches DI mistakes before deployment.", "The second test keeps the deliberate bug as a permanent check that validation is really switched on: register a singleton that needs the scoped LeaderboardService and building the provider must throw. To watch the first test fail, add the same `AddSingleton<NightlyReport>()` line inside AddDevAtlasServices; remove it and both tests are green. The capstone below runs these tests against the real AddDevAtlasServices.", "The assertion is on the inner message because BuildServiceProvider wraps validation failures in an AggregateException; asserting on 'Cannot consume scoped service' keeps the test readable without depending on the exact type name in the wrapper."],
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
        pitfalls: ["Asserting on the exact wrapper type but not on the useful message", "Building a second, different service collection from the one Program.cs uses"],
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
    { label: ".NET dependency injection overview", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection" },
    { label: "Use IHttpClientFactory", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory" },
    { label: "Options pattern in .NET", url: "https://learn.microsoft.com/en-us/dotnet/core/extensions/options" },
    { label: "Integration tests in ASP.NET Core", url: "https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests" },
  ],
  nextPreview: "Next: Rust ownership, borrowing and lifetimes: memory safety without a garbage collector, and how to read borrow-checker errors calmly.",
};
