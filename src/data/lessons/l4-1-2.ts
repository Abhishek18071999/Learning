import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.1.2",
  title: "EF Core, validation and testing",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["4.1.1 Minimal APIs, middleware and DI", "5.1.1 helpful (indexes)"],
  summary: "Persist data with Entity Framework Core: model entities and relationships, manage schema with migrations, write efficient queries, handle concurrency, and test against a real database with Testcontainers.",
  terms: [
    { term: "ORM", def: "Object-relational mapper: maps classes to tables and LINQ queries to SQL. EF Core is .NET's main ORM." },
    { term: "DbContext", def: "A session with the database: tracks loaded entities, runs queries and saves changes. Scoped per request." },
    { term: "Entity", def: "A class mapped to a table, with an identity (primary key)." },
    { term: "Migration", def: "A versioned, code-generated change to the database schema (create table, add column, add index)." },
    { term: "Change tracking", def: "EF remembers loaded entities and their original values to generate UPDATE statements on SaveChanges." },
    { term: "N+1 query problem", def: "Loading a list (1 query) then each item's related data separately (N queries)." },
    { term: "Optimistic concurrency", def: "Detecting that a row changed since you read it (via a version column) and rejecting the stale update." },
  ],
  problem: [
    "The in-memory store loses all data on restart. Moving to MySQL by hand-writing SQL strings in every endpoint invites injection bugs, schema drift between developers' machines and production, and slow pages from accidental N+1 queries.",
    "EF Core gives typed queries, parameterised SQL, migrations that evolve the schema safely, and transactions, but it also makes it easy to write slow code without noticing. This lesson covers both the power and the traps.",
  ],
  concept: {
    analogy: [
      "EF Core is a **translator** between your C# objects and the database's SQL. A good translator is fast and accurate, but if you keep asking 'and the next one?' one sentence at a time (N+1), the conversation takes forever. Migrations are the **minutes of every meeting** where the schema changed, so any new database can replay them and end up identical.",
    ],
    precise: [
      "Define entities (classes) and a DbContext with DbSet<T> properties. Configure keys, lengths, indexes and relationships with the fluent API in OnModelCreating (or attributes). Register with `AddDbContext` (scoped) and a provider (MySQL via Pomelo.EntityFrameworkCore.MySql, PostgreSQL via Npgsql, SQL Server).",
      "**Migrations**: `dotnet ef migrations add Name` generates C# describing schema changes; `dotnet ef database update` applies them, or generate SQL scripts (`dotnet ef migrations script --idempotent`) for controlled deployments. Commit migrations to Git.",
      "**Query well**: filter and project with Where/Select before ToListAsync (lesson 1.3.2), use `AsNoTracking()` for reads, load related data with `Include` or projections to avoid N+1, page results, and check the generated SQL in logs.",
      "**Concurrency and transactions**: SaveChanges wraps changes in a transaction. A concurrency token (row version) makes EF throw DbUpdateConcurrencyException if someone else updated the row first, which you turn into a 409 Conflict.",
    ],
  },
  underTheHood: {
    text: [
      "A LINQ query on DbSet<T> builds an expression tree; the provider translates it to SQL with parameters, so user input never becomes SQL text (no injection). Use `ToQueryString()` or logging at Information level for Microsoft.EntityFrameworkCore.Database.Command to see the SQL.",
      "When you load entities with tracking, EF stores snapshots. SaveChanges compares current values with snapshots and issues UPDATEs only for changed columns. Tracking costs memory and CPU, hence AsNoTracking for read-only endpoints.",
      "Lazy loading (navigation properties loading on access) is off by default in EF Core; it hides N+1 queries, so most teams leave it off and load explicitly.",
    ],
    diagram: {
      title: "Schema evolution with migrations",
      nodes: [
        { label: "Change entity", sub: "add property" },
        { label: "migrations add", sub: "C# migration file" },
        { label: "Review + commit", sub: "PR" },
        { label: "CI: script --idempotent", sub: "SQL artifact" },
        { label: "Deploy: apply", sub: "before new code" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Packages and a local MySQL",
      code: {
        lang: "bash",
        code: `docker run -d --name devatlas-mysql -e MYSQL_ROOT_PASSWORD=devpass -e MYSQL_DATABASE=devatlas -p 3306:3306 mysql:8.4
dotnet add package Pomelo.EntityFrameworkCore.MySql
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet tool install --global dotnet-ef
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Port=3306;Database=devatlas;User=root;Password=devpass"`,
      },
      notes: ["Check that the Pomelo provider version supports your EF Core / .NET version (its README lists compatibility). The password is for a local throwaway container only."],
    },
    {
      title: "Entities and DbContext",
      code: {
        lang: "csharp",
        file: "Data/AppDbContext.cs",
        code: `using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Api.Data;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public List<LessonProgress> Progress { get; set; } = [];
}

public class LessonProgress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public required string LessonId { get; set; }
    public string Status { get; set; } = "started";      // started | completed
    public decimal? Score { get; set; }
    public DateTime UpdatedAt { get; set; }
    public byte[] Version { get; set; } = [];             // concurrency token (see note)
}

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<LessonProgress> Progress => Set<LessonProgress>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.Property(u => u.Email).HasMaxLength(254);
            e.HasIndex(u => u.Email).IsUnique();
        });
        b.Entity<LessonProgress>(e =>
        {
            e.Property(p => p.LessonId).HasMaxLength(16);
            e.Property(p => p.Status).HasMaxLength(16);
            e.Property(p => p.Score).HasPrecision(4, 3);
            e.HasIndex(p => new { p.UserId, p.LessonId }).IsUnique();   // one row per user+lesson
            e.Property(p => p.Version).IsConcurrencyToken();
        });
    }
}`,
      },
      notes: ["SQL Server has a native rowversion type (`IsRowVersion()`); MySQL does not, so a common approach is a concurrency token you update yourself (e.g. a Guid or counter set on every save) or a timestamp column. The exact strategy depends on the provider; check its docs."],
    },
    {
      title: "Register and migrate",
      code: {
        lang: "csharp",
        code: `// Program.cs
var cs = builder.Configuration.GetConnectionString("Default")
         ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured");
builder.Services.AddDbContext<AppDbContext>(o => o.UseMySql(cs, ServerVersion.AutoDetect(cs)));

// terminal:
// dotnet ef migrations add InitialCreate
// dotnet ef database update
// dotnet ef migrations script --idempotent -o migrate.sql    # for production pipelines`,
      },
    },
    {
      title: "Efficient queries and writes in endpoints",
      code: {
        lang: "csharp",
        file: "Features/Progress/ProgressEndpoints.cs",
        code: `using Microsoft.EntityFrameworkCore;

public sealed record ProgressDto(string LessonId, string Status, decimal? Score);
public sealed record CompleteRequest(decimal Score);

public static class ProgressEndpoints
{
    public static void MapProgressEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/users/{userId:int}/progress");

        // Read: no tracking, project only needed columns, single query
        g.MapGet("/", async (int userId, AppDbContext db, CancellationToken ct) =>
            TypedResults.Ok(await db.Progress
                .AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderBy(p => p.LessonId)
                .Select(p => new ProgressDto(p.LessonId, p.Status, p.Score))
                .ToListAsync(ct)));

        // Write: upsert one row, handle concurrency
        g.MapPut("/{lessonId}", async (int userId, string lessonId, CompleteRequest req, AppDbContext db, CancellationToken ct) =>
        {
            if (req.Score is < 0 or > 1)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["score"] = ["Score must be between 0 and 1."] });

            var row = await db.Progress.SingleOrDefaultAsync(p => p.UserId == userId && p.LessonId == lessonId, ct);
            if (row is null)
            {
                row = new LessonProgress { UserId = userId, LessonId = lessonId };
                db.Progress.Add(row);
            }
            row.Status = "completed";
            row.Score = req.Score;
            row.UpdatedAt = DateTime.UtcNow;
            row.Version = Guid.NewGuid().ToByteArray();        // new token on every write

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Conflict(new { error = "Progress was updated elsewhere. Reload and retry." });
            }
            return Results.Ok(new ProgressDto(row.LessonId, row.Status, row.Score));
        });
    }
}`,
      },
    },
    {
      title: "Spot and fix N+1",
      code: {
        lang: "csharp",
        code: `// ✗ N+1: 1 query for users + 1 query per user for progress
var users = await db.Users.ToListAsync(ct);
foreach (var u in users)
    u.Progress = await db.Progress.Where(p => p.UserId == u.Id).ToListAsync(ct);

// ✓ One query with a JOIN via Include
var withProgress = await db.Users.Include(u => u.Progress).AsNoTracking().ToListAsync(ct);

// ✓ Often better: project exactly what the endpoint returns
var summary = await db.Users
    .Select(u => new { u.Email, Completed = u.Progress.Count(p => p.Status == "completed") })
    .ToListAsync(ct);`,
      },
    },
    {
      title: "Integration test against real MySQL with Testcontainers",
      code: {
        lang: "csharp",
        file: "ProgressTests.cs",
        code: `// dotnet add package Testcontainers.MySql
using Microsoft.EntityFrameworkCore;
using Testcontainers.MySql;

public class ProgressTests : IAsyncLifetime
{
    private readonly MySqlContainer _mysql = new MySqlBuilder().WithImage("mysql:8.4").Build();

    public Task InitializeAsync() => _mysql.StartAsync();
    public Task DisposeAsync() => _mysql.DisposeAsync().AsTask();

    [Fact]
    public async Task Unique_index_prevents_duplicate_progress_rows()
    {
        var cs = _mysql.GetConnectionString();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseMySql(cs, ServerVersion.AutoDetect(cs)).Options;
        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();                       // same migrations as production

        var user = new User { Email = "a@x.dev" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.Progress.Add(new LessonProgress { UserId = user.Id, LessonId = "4.1.2", UpdatedAt = DateTime.UtcNow });
        db.Progress.Add(new LessonProgress { UserId = user.Id, LessonId = "4.1.2", UpdatedAt = DateTime.UtcNow });

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
}`,
      },
      notes: ["Testcontainers needs Docker on the machine or CI runner. The in-memory EF provider does not enforce unique indexes or SQL semantics, so it would let this bug through."],
    },
  ],
  companies: [
    "**EF Core is the default data access layer** in most new .NET services; teams that need maximum control for hot paths add Dapper or raw SQL for specific queries while keeping EF for the rest.",
    "**Migrations in pipelines**: production schema changes are applied by a pipeline step (idempotent scripts or migration bundles) with review, backups and backward-compatible changes (expand-then-contract, lesson 5.4.1), not by applications migrating themselves at startup in multi-instance deployments.",
    "**Real databases in tests**: Testcontainers (available for .NET, Java, Go, Python, Node) has become a common way to run integration tests against the same database engine as production.",
  ],
  mistakes: [
    { mistake: "N+1 queries", why: "Looping and querying per item", wrong: "Hundreds of queries per request; slow pages under load", fix: "Include or projections; check SQL logs and query counts in tests" },
    { mistake: "Tracking queries for read-only endpoints", why: "Default behaviour", wrong: "Extra memory and CPU per request", fix: "AsNoTracking() or projections with Select" },
    { mistake: "Testing with the InMemory provider", why: "Fast and easy", wrong: "Misses constraints, SQL translation errors and transactions", fix: "SQLite for simple cases or Testcontainers with the real engine" },
    { mistake: "Applying migrations automatically on startup with many instances", why: "Convenient in development", wrong: "Race conditions and partially applied schemas in production", fix: "Apply migrations in a deployment step before rolling out new code" },
    { mistake: "No unique indexes for business rules", why: "Relying on 'check then insert' in code", wrong: "Duplicates under concurrency", fix: "Enforce with unique indexes and handle the exception" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Project to DTOs, AsNoTracking for reads, paginate, index what you filter on (lesson 5.1.1)." },
    { tag: "Reliability", text: "Enforce invariants in the database (unique, foreign keys, not null) as well as in code." },
    { tag: "Maintainability", text: "Commit migrations; review the generated code and SQL; never edit applied migrations." },
    { tag: "Reliability", text: "Integration-test data access against the real engine with Testcontainers in CI." },
  ],
  interview: [
    { q: "What is the N+1 problem and how do you fix it in EF Core?", a: "Loading a list with one query and then related data for each item with another query, producing N+1 round trips. Fix with Include for eager loading, or better, a Select projection that pulls exactly the needed data in one query; detect it via SQL logging or query-count assertions." },
    { q: "How do you handle concurrent updates?", a: "Optimistic concurrency: a concurrency token (row version) is included in the UPDATE's WHERE clause. If another update changed it, zero rows are affected and EF throws DbUpdateConcurrencyException; the API returns 409 and the client reloads or merges." },
    { q: "How do you deploy schema changes safely?", a: "Generate migrations, review them, produce idempotent SQL or migration bundles in CI, back up, apply before deploying code, and make changes backward compatible (add columns as nullable, backfill, then enforce) so old and new app versions work during rollout." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which query is best for a read-only list endpoint showing lesson ids and scores?",
      options: [
        "db.Progress.ToListAsync() then filter in C#",
        "db.Progress.Where(...).Select(p => new { p.LessonId, p.Score }).AsNoTracking().ToListAsync()",
        "Lazy loading each row",
        "db.Database.ExecuteSqlRaw with string concatenation",
      ],
      answer: 1,
      explanation: "Filter and project in SQL, skip tracking for reads.",
    },
    {
      kind: "bug",
      prompt: "Two requests both create progress for the same user and lesson, creating duplicates. Code checks 'if not exists then insert'. Root fix?",
      options: ["Add a lock statement", "A unique index on (UserId, LessonId) and handling the exception", "Retry the request", "Use AsNoTracking"],
      answer: 1,
      explanation: "Check-then-insert races under concurrency; the database constraint is the reliable guard.",
    },
    {
      kind: "mcq",
      prompt: "Why is the EF Core InMemory provider risky for testing data access?",
      options: ["It is slow", "It does not behave like a relational database (constraints, SQL translation)", "It needs Docker", "It is deprecated in .NET 8"],
      answer: 1,
      explanation: "Tests pass that would fail on a real database.",
    },
  ],
  cheatSheet: [
    "AddDbContext (scoped) + provider; connection string from secrets/env.",
    "Fluent config: lengths, precision, unique indexes, relationships.",
    "dotnet ef migrations add · database update · script --idempotent.",
    "Reads: Where → Select → AsNoTracking → ToListAsync.",
    "Avoid N+1: Include or projections; log SQL.",
    "Concurrency token → DbUpdateConcurrencyException → 409.",
    "Test with Testcontainers, not InMemory.",
  ],
  homework: {
    basic: {
      title: "Quiz attempts table",
      brief: ["Add a QuizAttempt entity (UserId, LessonId, Score, CreatedAt) with an index for 'last 10 attempts for a user', a migration, and GET /users/{id}/attempts?limit=10."],
      criteria: ["Composite index (UserId, CreatedAt)", "Projection + AsNoTracking", "limit validated (1–50)"],
      hints: ["e.HasIndex(a => new { a.UserId, a.CreatedAt })"],
      solution: {
        text: ["The index matches the query's WHERE and ORDER BY (lesson 5.1.1), so the database reads only the needed rows."],
        code: {
          lang: "csharp",
          code: `public class QuizAttempt
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public required string LessonId { get; set; }
    public decimal Score { get; set; }
    public DateTime CreatedAt { get; set; }
}
// OnModelCreating: b.Entity<QuizAttempt>().HasIndex(a => new { a.UserId, a.CreatedAt });

g.MapGet("/attempts", async (int userId, int? limit, AppDbContext db, CancellationToken ct) =>
{
    var take = Math.Clamp(limit ?? 10, 1, 50);
    return TypedResults.Ok(await db.Set<QuizAttempt>().AsNoTracking()
        .Where(a => a.UserId == userId)
        .OrderByDescending(a => a.CreatedAt)
        .Take(take)
        .Select(a => new { a.LessonId, a.Score, a.CreatedAt })
        .ToListAsync(ct));
});`,
        },
      },
    },
    intermediate: {
      title: "Detect N+1 in a test",
      brief: ["Write a test that counts SQL commands executed by an endpoint (using an EF Core interceptor) and fails if listing 20 users runs more than 2 queries."],
      criteria: ["DbCommandInterceptor counting commands", "Test fails on the N+1 version and passes on the fixed version"],
      hints: ["Override ReaderExecuting and increment a counter."],
      solution: {
        text: ["An interceptor turns 'it feels slow' into a precise regression test."],
        code: {
          lang: "csharp",
          code: `using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

public sealed class CommandCounter : DbCommandInterceptor
{
    public int Count;
    public override InterceptionResult<DbDataReader> ReaderExecuting(DbCommand c, CommandEventData e, InterceptionResult<DbDataReader> r)
    { Interlocked.Increment(ref Count); return r; }
    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand c, CommandEventData e, InterceptionResult<DbDataReader> r, CancellationToken ct = default)
    { Interlocked.Increment(ref Count); return ValueTask.FromResult(r); }
}

// options: new DbContextOptionsBuilder<AppDbContext>().UseMySql(cs, version).AddInterceptors(counter).Options
// Assert.True(counter.Count <= 2, $"Expected <= 2 queries, got {counter.Count}");`,
        },
      },
    },
    challenge: {
      title: "Zero-downtime column rename",
      brief: ["Rename LessonProgress.Status to State without downtime while two app versions run side by side. Write the sequence of migrations and deployments (expand, migrate data, switch code, contract)."],
      criteria: ["No step breaks the old or new app version", "Data backfilled", "Old column dropped only at the end"],
      hints: ["Never rename in one step: add the new column first."],
      solution: {
        text: [
          "1) Migration: add nullable State column. 2) Deploy app v2 that writes both Status and State and reads State ?? Status. 3) Backfill: UPDATE ... SET State = Status WHERE State IS NULL (in batches). 4) Make State non-null. 5) Deploy app v3 that uses only State. 6) Migration: drop Status. Each step is compatible with the versions running during that step.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: MySQL persistence",
      brief: ["Replace the in-memory stores with EF Core + MySQL for users, progress and quiz attempts. Add migrations, Testcontainers integration tests in CI, and a docker-compose service for local MySQL."],
      criteria: ["Migrations committed and applied in CI tests", "No N+1 in list endpoints (query-count test)", "Unique indexes for business rules"],
      hints: ["GitHub Actions ubuntu runners have Docker available for Testcontainers."],
      solution: {
        text: ["With persistence, migrations and real-database tests, the API is production-shaped. Next: authentication so each user only sees their own progress."],
      },
    },
  },
  deeper: [
    { label: "EF Core documentation", url: "https://learn.microsoft.com/en-us/ef/core/" },
    { label: "EF Core migrations overview", url: "https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/" },
    { label: "Handling concurrency conflicts", url: "https://learn.microsoft.com/en-us/ef/core/saving/concurrency" },
    { label: "Testcontainers for .NET", url: "https://dotnet.testcontainers.org/" },
  ],
  nextPreview: "Next: authentication and authorisation with JWT, OAuth2 and OpenID Connect.",
};
