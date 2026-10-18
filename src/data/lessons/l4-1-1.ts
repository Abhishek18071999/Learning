import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.1.1",
  title: "Minimal APIs, middleware and DI",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["1.3.3 Dependency injection", "0.1.2 HTTP in depth"],
  summary: "Build a real ASP.NET Core Web API: the request pipeline and middleware, minimal API endpoints grouped by feature, typed results, validation, problem details for errors, configuration, logging and OpenAPI.",
  terms: [
    { term: "ASP.NET Core", def: "Microsoft's cross-platform web framework for .NET, used for APIs, web apps and real-time services." },
    { term: "Kestrel", def: "The fast, cross-platform web server built into ASP.NET Core." },
    { term: "Middleware", def: "A component in the request pipeline that can inspect or change the request/response and decide whether to call the next one." },
    { term: "Minimal API", def: "Defining endpoints with app.MapGet/MapPost and lambdas, instead of controller classes." },
    { term: "Route group", def: "MapGroup(\"/lessons\") to share a URL prefix and settings (auth, tags, filters) among related endpoints." },
    { term: "ProblemDetails", def: "The standard JSON error format (RFC 9457) with type, title, status, detail and extensions." },
    { term: "OpenAPI", def: "A machine-readable description of your API (formerly Swagger), used for docs, client generation and testing." },
  ],
  problem: [
    "DevAtlas needs its main API: lessons, progress, quiz results. The first prototype puts everything in one 600-line Program.cs, returns `200 OK` with `{\"error\": ...}` for failures (lesson 0.1.2), logs with Console.WriteLine, and has the database password in appsettings.json committed to Git.",
    "A production API needs a clear request pipeline, endpoints organised by feature, consistent error responses, validation at the edge, configuration per environment, structured logs and machine-readable docs. ASP.NET Core provides all of these; this lesson assembles them into a structure you can grow.",
  ],
  concept: {
    analogy: [
      "The middleware pipeline is an **airport security line**: every passenger (request) passes through stations in order: ID check (authentication), bag scan (validation), customs (authorisation), gate (endpoint). Any station can stop a passenger and send them back with a reason (an error response), and on the way out (response) the same stations can stamp the passport (headers, logging).",
    ],
    precise: [
      "`WebApplication.CreateBuilder` sets up configuration (appsettings.json, appsettings.{Environment}.json, environment variables, user secrets in Development), logging and the DI container. `builder.Build()` creates the app; `app.Use…` adds middleware in order; `app.Map…` adds endpoints; `app.Run()` starts Kestrel.",
      "**Order matters**: exception handling first (so it catches everything), then HTTPS redirection, CORS, authentication, authorisation, then endpoints. A middleware that short-circuits (returns without calling next) stops the rest.",
      "**Minimal APIs** bind parameters automatically: route values (`{id}`), query strings, JSON body (complex types), services from DI, and special types like `CancellationToken` and `HttpContext`. Return `TypedResults.Ok(x)`, `TypedResults.NotFound()`, etc., so OpenAPI knows the possible responses.",
      "Organise endpoints by feature with extension methods and `MapGroup`: `app.MapLessonEndpoints()` in Features/Lessons/LessonEndpoints.cs. Keep business logic in services (testable without HTTP).",
    ],
  },
  underTheHood: {
    text: [
      "Each middleware is a delegate `RequestDelegate next => async context => { …before…; await next(context); …after… }`. The pipeline is these delegates nested, so code before `next` runs on the way in and code after runs on the way out, in reverse order.",
      "Routing (`UseRouting` is added implicitly in minimal hosting) matches the URL to an endpoint early, so later middleware (authorisation, CORS) can read the endpoint's metadata (like `.RequireAuthorization()`), then the endpoint executes at the end.",
      "Configuration is layered: later sources override earlier ones. Environment variables use `__` for nesting (`ConnectionStrings__Default`), which is how containers and cloud platforms inject settings and secrets.",
    ],
    diagram: {
      title: "Request pipeline",
      nodes: [
        { label: "Kestrel", sub: "HTTP request" },
        { label: "ExceptionHandler", sub: "→ ProblemDetails" },
        { label: "CORS / Auth", sub: "who, from where" },
        { label: "Routing + endpoint", sub: "bind, validate, run" },
        { label: "Response", sub: "back out through middleware" },
      ],
      edges: ["", "next()", "next()", ""],
    },
  },
  handsOn: [
    {
      title: "Create the project",
      code: {
        lang: "bash",
        code: `dotnet new web -n DevAtlas.Api
cd DevAtlas.Api
dotnet add package Microsoft.AspNetCore.OpenApi
dotnet run          # note the http://localhost:<port> printed in the console`,
      },
      notes: ["`dotnet new webapi` creates a richer template; `web` starts nearly empty so every line is yours. Package versions resolve to ones compatible with your SDK."],
    },
    {
      title: "Program.cs: the composition root and pipeline",
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using DevAtlas.Api.Features.Lessons;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();                 // RFC 9457 error bodies
builder.Services.AddOpenApi();                        // .NET 9+: built-in OpenAPI document
builder.Services.AddSingleton<ILessonStore, InMemoryLessonStore>();

var app = builder.Build();

app.UseExceptionHandler();                            // unhandled exceptions → 500 ProblemDetails
app.UseStatusCodePages();                             // empty 4xx/5xx → ProblemDetails
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                                 // GET /openapi/v1.json
}

app.Use(async (context, next) =>                      // tiny custom middleware: timing header
{
    var started = System.Diagnostics.Stopwatch.GetTimestamp();
    context.Response.OnStarting(() =>
    {
        var ms = System.Diagnostics.Stopwatch.GetElapsedTime(started).TotalMilliseconds;
        context.Response.Headers["Server-Timing"] = $"app;dur={ms:F1}";
        return Task.CompletedTask;
    });
    await next(context);
});

app.MapGet("/health", () => TypedResults.Ok(new { status = "ok" }));
app.MapLessonEndpoints();

app.Run();

public partial class Program { }                     // lets integration tests reference the app`,
      },
      notes: ["AddOpenApi/MapOpenApi are built in from .NET 9. On .NET 8 use the Swashbuckle package (AddEndpointsApiExplorer + AddSwaggerGen) instead."],
    },
    {
      title: "A feature module: endpoints, DTOs, validation",
      code: {
        lang: "csharp",
        file: "Features/Lessons/LessonEndpoints.cs",
        code: `using Microsoft.AspNetCore.Http.HttpResults;

namespace DevAtlas.Api.Features.Lessons;

public sealed record LessonDto(string Id, string Title, int Minutes);
public sealed record CreateLessonRequest(string Id, string Title, int Minutes);

public static class LessonEndpoints
{
    public static IEndpointRouteBuilder MapLessonEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/lessons").WithTags("Lessons");

        group.MapGet("/", (ILessonStore store, string? q) =>
            TypedResults.Ok(store.Search(q)));

        group.MapGet("/{id}", Results<Ok<LessonDto>, NotFound> (string id, ILessonStore store) =>
            store.Find(id) is { } lesson ? TypedResults.Ok(lesson) : TypedResults.NotFound());

        group.MapPost("/", Results<Created<LessonDto>, ValidationProblem, Conflict> (CreateLessonRequest req, ILessonStore store) =>
        {
            var errors = Validate(req);
            if (errors.Count > 0) return TypedResults.ValidationProblem(errors);          // 400 with field errors
            if (store.Find(req.Id) is not null) return TypedResults.Conflict();           // 409
            var lesson = new LessonDto(req.Id, req.Title.Trim(), req.Minutes);
            store.Add(lesson);
            return TypedResults.Created($"/lessons/{lesson.Id}", lesson);                 // 201 + Location
        });

        return app;
    }

    private static Dictionary<string, string[]> Validate(CreateLessonRequest r)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(r.Id)) errors["id"] = ["Id is required."];
        if (string.IsNullOrWhiteSpace(r.Title) || r.Title.Length > 120) errors["title"] = ["Title is required (max 120 characters)."];
        if (r.Minutes is < 5 or > 240) errors["minutes"] = ["Minutes must be between 5 and 240."];
        return errors;
    }
}`,
      },
      notes: ["The `Results<…>` return type documents every possible response for OpenAPI and is checked by the compiler. Larger projects often use FluentValidation or endpoint filters for validation; the principle (validate at the edge, return 400 with field errors) is the same."],
    },
    {
      title: "The store behind an interface",
      code: {
        lang: "csharp",
        file: "Features/Lessons/LessonStore.cs",
        code: `using System.Collections.Concurrent;

namespace DevAtlas.Api.Features.Lessons;

public interface ILessonStore
{
    IReadOnlyList<LessonDto> Search(string? query);
    LessonDto? Find(string id);
    void Add(LessonDto lesson);
}

public sealed class InMemoryLessonStore : ILessonStore           // singleton → must be thread-safe
{
    private readonly ConcurrentDictionary<string, LessonDto> _items = new()
    {
        ["4.1.1"] = new("4.1.1", "Minimal APIs, middleware and DI", 75),
    };

    public IReadOnlyList<LessonDto> Search(string? query) =>
        _items.Values
            .Where(l => string.IsNullOrWhiteSpace(query) || l.Title.Contains(query, StringComparison.OrdinalIgnoreCase))
            .OrderBy(l => l.Id)
            .ToList();

    public LessonDto? Find(string id) => _items.GetValueOrDefault(id);
    public void Add(LessonDto lesson) => _items[lesson.Id] = lesson;
}`,
      },
    },
    {
      title: "Try it",
      code: {
        lang: "bash",
        code: `PORT=5000   # use the port printed by dotnet run
curl -i localhost:$PORT/lessons/4.1.1
curl -i localhost:$PORT/lessons/9.9.9
curl -i -X POST localhost:$PORT/lessons -H 'Content-Type: application/json' -d '{"id":"4.1.2","title":"EF Core","minutes":70}'
curl -i -X POST localhost:$PORT/lessons -H 'Content-Type: application/json' -d '{"id":"","title":"","minutes":1}'`,
      },
      output: "HTTP/1.1 400 Bad Request\nContent-Type: application/problem+json\n\n{\"type\":\"https://tools.ietf.org/html/rfc9110#section-15.5.1\",\"title\":\"One or more validation errors occurred.\",\"status\":400,\"errors\":{\"id\":[\"Id is required.\"],\"title\":[\"Title is required (max 120 characters).\"],\"minutes\":[\"Minutes must be between 5 and 240.\"]}}",
      notes: ["Exact `type` URLs and field ordering may differ by version; the shape (problem+json with an errors object) is the contract clients rely on."],
    },
    {
      title: "Configuration and structured logging",
      code: {
        lang: "csharp",
        code: `// appsettings.json (non-secret defaults)
// { "Content": { "MaxSearchResults": 50 }, "Logging": { "LogLevel": { "Default": "Information" } } }

public sealed class ContentOptions { public int MaxSearchResults { get; init; } = 50; }

builder.Services.Configure<ContentOptions>(builder.Configuration.GetSection("Content"));

app.MapGet("/search", (string q, Microsoft.Extensions.Options.IOptions<ContentOptions> opts, ILogger<Program> log) =>
{
    log.LogInformation("Search {Query} (max {Max})", q, opts.Value.MaxSearchResults);   // structured: fields, not concatenation
    return TypedResults.Ok(Array.Empty<string>());
});

// Secrets: dotnet user-secrets set "ConnectionStrings:Default" "..." (development)
//          ConnectionStrings__Default env var or Key Vault / Secrets Manager (production)`,
      },
    },
  ],
  companies: [
    "**Feature-oriented structure** (vertical slices) is common in modern .NET services: each feature folder holds its endpoints, DTOs, validation and handlers, which keeps changes local.",
    "**ProblemDetails everywhere**: consistent error bodies make client SDKs, API gateways and logging simpler; many API guidelines (and Microsoft's own) recommend RFC 9457.",
    "**OpenAPI-first workflows**: teams publish the OpenAPI document from CI, generate TypeScript clients for the frontend (lesson 1.2.3 capstone) and run contract tests against it.",
  ],
  mistakes: [
    { mistake: "Everything in Program.cs", why: "Minimal APIs make it easy", wrong: "Unreadable file, merge conflicts, untestable logic", fix: "Extension methods per feature + MapGroup; services for logic" },
    { mistake: "Wrong middleware order", why: "Order seems arbitrary", wrong: "Auth runs after the endpoint, or exceptions escape as raw 500s", fix: "Exception handling first; CORS, authentication, authorisation before endpoints" },
    { mistake: "Returning entities directly", why: "Less code", wrong: "Leaks internal fields, couples API to the database schema", fix: "Return DTOs (records) shaped for the client" },
    { mistake: "Secrets in appsettings.json", why: "Convenient config", wrong: "Leaked credentials in Git", fix: "User secrets locally, environment variables or a vault in production" },
    { mistake: "String-concatenated logs", why: "Habit", wrong: "Logs cannot be queried by field; sensitive data accidentally logged", fix: "Message templates with named placeholders; never log secrets or tokens" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "UseExceptionHandler + AddProblemDetails; never leak stack traces to clients in production." },
    { tag: "Maintainability", text: "Typed results, DTO records and per-feature endpoint files with MapGroup." },
    { tag: "Security", text: "Validate every input at the edge; return 400/422 with field-level errors." },
    { tag: "Reliability", text: "Health endpoint, structured logs and OpenAPI from day one." },
  ],
  interview: [
    { q: "What is middleware in ASP.NET Core and why does order matter?", a: "Middleware are components chained into the request pipeline; each can act before and after calling the next. Order determines what runs first and what can short-circuit: exception handling must wrap everything, and authentication must run before authorisation and before endpoints that require it." },
    { q: "Minimal APIs vs controllers?", a: "Both run on the same pipeline and support DI, validation and OpenAPI. Minimal APIs are lighter and pair well with feature-based organisation; controllers group actions in classes with attribute routing and filters. Choose one style per service for consistency." },
    { q: "How do you handle errors consistently in an API?", a: "Centralise with exception-handling middleware mapping unexpected exceptions to 500 ProblemDetails (with a trace id, no stack trace), return typed 4xx results for expected failures (validation, not found, conflict), and log with structured context." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Where should app.UseExceptionHandler() go?",
      options: ["After MapGet calls", "Early, before other middleware, so it wraps the rest", "It does not matter", "Only in Development"],
      answer: 1,
      explanation: "Middleware only catches exceptions thrown by middleware and endpoints that run after it.",
    },
    {
      kind: "mcq",
      prompt: "How do you set ConnectionStrings:Default with an environment variable?",
      options: ["ConnectionStrings:Default=…", "ConnectionStrings__Default=…", "CONNECTIONSTRINGS.DEFAULT=…", "It is not possible"],
      answer: 1,
      explanation: "Double underscore maps to the ':' section separator.",
    },
    {
      kind: "bug",
      prompt: "Users get stack traces in error responses in production. Likely cause?",
      code: { lang: "csharp", code: "app.UseDeveloperExceptionPage();\napp.MapLessonEndpoints();" },
      options: ["Missing OpenAPI", "The developer exception page is enabled unconditionally", "MapLessonEndpoints throws", "Kestrel bug"],
      answer: 1,
      explanation: "Use the developer page only in Development (it is the default there in recent templates) and UseExceptionHandler + ProblemDetails elsewhere.",
    },
  ],
  cheatSheet: [
    "Builder: config, logging, DI. App: middleware (Use…), endpoints (Map…), Run.",
    "Order: ExceptionHandler → HTTPS → CORS → AuthN → AuthZ → endpoints.",
    "Minimal APIs: MapGroup per feature, TypedResults, Results<…> unions.",
    "Bind: route, query, body, services, CancellationToken.",
    "Errors: ProblemDetails; validation → ValidationProblem (field errors).",
    "Config layers; env vars with __; secrets never in appsettings.",
    "ILogger with message templates; OpenAPI document in CI.",
  ],
  homework: {
    basic: {
      title: "Complete the lessons CRUD",
      brief: ["Add PUT /lessons/{id} (replace, 200/404/400) and DELETE /lessons/{id} (204/404) to LessonEndpoints with validation reuse."],
      criteria: ["Correct status codes", "Validation shared with POST", "Results<…> return types"],
      hints: ["Reuse the Validate method; check existence before replacing."],
      solution: {
        text: ["PUT replaces the whole resource and is idempotent; DELETE returns 204 with no body."],
        code: {
          lang: "csharp",
          code: `group.MapPut("/{id}", Results<Ok<LessonDto>, NotFound, ValidationProblem> (string id, CreateLessonRequest req, ILessonStore store) =>
{
    var errors = Validate(req with { Id = id });
    if (errors.Count > 0) return TypedResults.ValidationProblem(errors);
    if (store.Find(id) is null) return TypedResults.NotFound();
    var updated = new LessonDto(id, req.Title.Trim(), req.Minutes);
    store.Add(updated);
    return TypedResults.Ok(updated);
});

group.MapDelete("/{id}", Results<NoContent, NotFound> (string id, ILessonStore store) =>
    store.Remove(id) ? TypedResults.NoContent() : TypedResults.NotFound());

// add to ILessonStore: bool Remove(string id);
// InMemoryLessonStore: public bool Remove(string id) => _items.TryRemove(id, out _);`,
        },
      },
    },
    intermediate: {
      title: "Correlation id middleware",
      brief: ["Write middleware that reads an incoming `X-Correlation-Id` header (or generates one), adds it to the response, and pushes it into the logging scope so every log line for the request includes it."],
      criteria: ["Header echoed on every response", "Generated when missing", "Appears in logs via BeginScope"],
      hints: ["logger.BeginScope(new Dictionary<string, object> { [\"CorrelationId\"] = id })"],
      solution: {
        text: ["Correlation ids let you follow one user request across logs of several services; OpenTelemetry traces (lesson 9.5.1) generalise the idea."],
        code: {
          lang: "csharp",
          code: `app.Use(async (context, next) =>
{
    const string header = "X-Correlation-Id";
    var id = context.Request.Headers.TryGetValue(header, out var v) && !string.IsNullOrWhiteSpace(v)
        ? v.ToString()
        : Guid.NewGuid().ToString("n");
    context.Response.Headers[header] = id;
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Correlation");
    using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = id }))
    {
        await next(context);
    }
});`,
        },
      },
    },
    challenge: {
      title: "Integration tests with WebApplicationFactory",
      brief: ["Create DevAtlas.Api.Tests (xUnit) using Microsoft.AspNetCore.Mvc.Testing to start the API in memory and test: GET /health 200, POST invalid lesson 400 with field errors, POST then GET returns the lesson, duplicate POST 409."],
      criteria: ["Tests run without a real server or port", "Assertions on status codes and JSON bodies", "Runs in CI"],
      hints: ["`public partial class Program { }` at the end of Program.cs makes the auto-generated Program class accessible to the test project."],
      solution: {
        text: ["WebApplicationFactory hosts the full pipeline in memory, so tests cover routing, binding, validation and serialisation, not just your service classes."],
        code: {
          lang: "csharp",
          code: `using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

public class LessonApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_then_get()
    {
        var create = await _client.PostAsJsonAsync("/lessons", new { id = "t.1", title = "Test", minutes = 30 });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var lesson = await _client.GetFromJsonAsync<LessonDto>("/lessons/t.1");
        Assert.Equal("Test", lesson!.Title);
        var dup = await _client.PostAsJsonAsync("/lessons", new { id = "t.1", title = "Test", minutes = 30 });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
    }

    [Fact]
    public async Task Invalid_lesson_returns_validation_problem()
    {
        var res = await _client.PostAsJsonAsync("/lessons", new { id = "", title = "", minutes = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("minutes", await res.Content.ReadAsStringAsync());
    }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: API skeleton",
      brief: ["Turn services/api/DevAtlas.Api into the real API: health, lessons feature module, ProblemDetails, OpenAPI, correlation ids and integration tests in CI."],
      criteria: ["dotnet test runs integration tests in CI", "OpenAPI JSON generated", "No secrets in config files"],
      hints: ["Commit appsettings.json with safe defaults only; document required environment variables in .env.example."],
      solution: {
        text: ["This API becomes the backbone the React app talks to; the next lesson replaces the in-memory store with EF Core and MySQL behind the same interface."],
      },
    },
  },
  deeper: [
    { label: "Minimal APIs overview", url: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/overview" },
    { label: "ASP.NET Core middleware", url: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/" },
    { label: "Handle errors in ASP.NET Core APIs", url: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api" },
    { label: "RFC 9457: Problem Details for HTTP APIs", url: "https://www.rfc-editor.org/rfc/rfc9457" },
  ],
  nextPreview: "Next: EF Core, migrations and testing: persisting DevAtlas data in MySQL properly.",
};
