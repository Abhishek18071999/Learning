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
dotnet add package Pomelo.EntityFrameworkCore.MySql --version 9.0.0        # EF Core 9 provider
dotnet add package Microsoft.EntityFrameworkCore.Design --version "9.0.*"
dotnet tool install --global dotnet-ef --version "9.0.*"
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=localhost;Port=3306;Database=devatlas;User=root;Password=devpass"`,
      },
      notes: ["Keep every EF Core package (provider, Design, the dotnet-ef tool) on the same major version as your target framework (9.x for net9.0); check the Pomelo README for which EF Core version each provider release supports. The password is for a local throwaway container only."],
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
        code: `// Program.cs (add: using DevAtlas.Api.Data; using Microsoft.EntityFrameworkCore;)
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
        code: `using DevAtlas.Api.Data;
using Microsoft.EntityFrameworkCore;

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
using DevAtlas.Api.Data;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MySql;

public class ProgressTests : IAsyncLifetime
{
    private readonly MySqlContainer _mysql = new MySqlBuilder("mysql:8.4").Build();   // Testcontainers 4.x: image in the constructor

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
          "1) Migration: add a nullable State column. v1 ignores it. 2) Deploy app v2, which writes both Status and State and reads State ?? Status. 3) Once no v1 instance is left: backfill (UPDATE ... SET State = Status WHERE State IS NULL, in batches on big tables), make State NOT NULL, and make Status nullable. 4) Deploy app v3, which uses only State. 5) Once no v2 instance is left: migration drops Status.",
          "Making Status nullable in step 3 is easy to forget. v3 never writes Status, so while the column still exists as NOT NULL, every v3 insert fails until the contract step. Each migration has to be compatible with both app versions that run while it is live: (v1, v2) after step 1, (v2, v3) after step 3, and only v3 after step 5.",
          "The program applies the hand-written migrations one at a time to a real MySQL database. After each step it runs each app version's insert and read inside a transaction that it rolls back, then prints which versions still work. Read it as a deployment schedule: you may only roll out (or still be running) a version marked ok for the current schema.",
        ],
        code: {
          lang: "csharp", file: "Program.cs (Pomelo.EntityFrameworkCore.MySql 9.0.0)",
          code: `// Expand/contract rename of Progress.Status -> State, verified against MySQL.
// Migration ids follow EF's <timestamp>_<Name> format; in a real project generate them with
// dotnet ef migrations add <Name> and edit the generated Up/Down methods.
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

var cs = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
         ?? throw new InvalidOperationException("ConnectionStrings__Default is not set");
await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
    .UseMySql(cs, ServerVersion.AutoDetect(cs)).Options);
await db.Database.EnsureDeletedAsync();

// What each app version runs: v1 knows only Status, v2 writes both and reads State ?? Status, v3 knows only State.
var apps = new (string Name, string Write, string Read)[]
{
    ("v1", "INSERT INTO Progress (UserId, LessonId, Status) VALUES (1, '4.1.2', 'completed')", "SELECT Status FROM Progress"),
    ("v2", "INSERT INTO Progress (UserId, LessonId, Status, State) VALUES (1, '4.1.2', 'completed', 'completed')",
           "SELECT COALESCE(State, Status) FROM Progress"),
    ("v3", "INSERT INTO Progress (UserId, LessonId, State) VALUES (1, '4.1.2', 'completed')", "SELECT State FROM Progress"),
};

var migrator = db.GetService<IMigrator>();
foreach (var step in new[] { "20261018000001_Initial", "20261018000002_AddState", "20261018000003_BackfillState", "20261018000004_DropStatus" })
{
    await migrator.MigrateAsync(step);
    if (step.EndsWith("_Initial")) await db.Database.ExecuteSqlRawAsync(apps[0].Write);   // existing data from v1
    var results = new List<string>();
    foreach (var (name, write, read) in apps)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            await db.Database.ExecuteSqlRawAsync(write);
            await db.Database.ExecuteSqlRawAsync(read);
            results.Add($"{name} ok");
        }
        catch (Exception) { results.Add($"{name} BROKEN"); }
        await tx.RollbackAsync();
    }
    Console.WriteLine($"{step[15..],-14} {string.Join("  ", results)}");
}
var kept = await db.Database.SqlQueryRaw<string>("SELECT State AS Value FROM Progress").ToListAsync();
Console.WriteLine($"rows written by v1, after the rename: State = {string.Join(", ", kept)}");

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options);

[DbContext(typeof(AppDbContext)), Migration("20261018000001_Initial")]
public class Initial : Migration
{
    protected override void Up(MigrationBuilder m) => m.CreateTable("Progress", t => new
    {
        Id = t.Column<int>(nullable: false).Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
        UserId = t.Column<int>(nullable: false),
        LessonId = t.Column<string>(maxLength: 16, nullable: false),
        Status = t.Column<string>(maxLength: 16, nullable: false),
    }, constraints: t => t.PrimaryKey("PK_Progress", x => x.Id));
}

// Step 1 (expand): new nullable column. v1 keeps working; then deploy v2.
[DbContext(typeof(AppDbContext)), Migration("20261018000002_AddState")]
public class AddState : Migration
{
    protected override void Up(MigrationBuilder m) =>
        m.AddColumn<string>("State", "Progress", maxLength: 16, nullable: true);
}

// Step 2 (migrate data), only after every instance runs v2: backfill, require State,
// and relax Status so v3 (which never writes it) can insert. Then deploy v3.
[DbContext(typeof(AppDbContext)), Migration("20261018000003_BackfillState")]
public class BackfillState : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.Sql("UPDATE Progress SET State = Status WHERE State IS NULL;");   // batch this on large tables
        m.AlterColumn<string>("State", "Progress", maxLength: 16, nullable: false, oldNullable: true);
        m.AlterColumn<string>("Status", "Progress", maxLength: 16, nullable: true, oldNullable: false);
    }
}

// Step 3 (contract), only after every instance runs v3.
[DbContext(typeof(AppDbContext)), Migration("20261018000004_DropStatus")]
public class DropStatus : Migration
{
    protected override void Up(MigrationBuilder m) => m.DropColumn("Status", "Progress");
}`,
        },
        output: "Initial        v1 ok  v2 BROKEN  v3 BROKEN\nAddState       v1 ok  v2 ok  v3 BROKEN\nBackfillState  v1 BROKEN  v2 ok  v3 ok\nDropStatus     v1 BROKEN  v2 BROKEN  v3 ok\nrows written by v1, after the rename: State = completed",
      },
    },
    capstone: {
      title: "DevAtlas: MySQL persistence",
      brief: ["Replace the in-memory stores with EF Core + MySQL for users, progress and quiz attempts. Add migrations, Testcontainers integration tests in CI, and a docker-compose service for local MySQL."],
      criteria: ["Migrations committed and applied in CI tests", "No N+1 in list endpoints (query-count test)", "Unique indexes for business rules"],
      hints: ["GitHub Actions ubuntu runners have Docker available for Testcontainers."],
      solution: {
        text: [
          "With persistence, migrations and real-database tests, the API is production-shaped. Next: authentication so each user only sees their own progress.",
          "The model adds QuizAttempt with an index on (UserId, CreatedAt) that matches the 'latest attempts' query, next to the unique (UserId, LessonId) index on progress from the hands-on. `dotnet ef migrations add InitialCreate` generates the migration (committed, not shown); CI applies the same migrations to a throwaway MySQL with `Database.MigrateAsync()`, and production uses `dotnet ef migrations script --idempotent`.",
          "The user list is a single projection: the completed and attempt counts become subqueries inside one SELECT, so 20 users cost one query instead of 41. Keyset paging (`afterId`) and clamped limits keep the response bounded.",
          "Interceptors are resolved from DI (`sp.GetServices<IInterceptor>()`): production registers none, while the test host adds a CommandCounter. That lets the query-count assertion run against the real endpoint, routing and serialisation included. The counter saw exactly 1 query for the 20-user page.",
          "MySqlApiFactory starts a mysql:8.4 container with Testcontainers, points the app at it with UseSetting before the host is built, and runs the migrations once per test class. GitHub Actions ubuntu runners have Docker, so `dotnet test` works there unchanged.",
          "For local development, docker-compose.yml has one mysql:8.4 service with MYSQL_DATABASE=devatlas, MYSQL_ROOT_PASSWORD taken from a gitignored .env file, port 3306, a named volume for data and a `mysqladmin ping` healthcheck. The API reads `ConnectionStrings__Default` from user secrets or the environment, never from appsettings.json.",
        ],
        code: {
          lang: "csharp",
          code: `// ---- DevAtlas.Api/Program.cs (registration; also app.MapUserEndpoints()) ----
// using Microsoft.EntityFrameworkCore.Diagnostics;
var cs = builder.Configuration.GetConnectionString("Default")
         ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured");
builder.Services.AddDbContext<AppDbContext>((sp, o) => o
    .UseMySql(cs, ServerVersion.AutoDetect(cs))
    .AddInterceptors(sp.GetServices<IInterceptor>()));   // none in production; tests add a query counter

// ---- DevAtlas.Api/Data/AppDbContext.cs (additions to the hands-on model) ----
public class QuizAttempt
{
    public long Id { get; set; }
    public int UserId { get; set; }
    public required string LessonId { get; set; }
    public decimal Score { get; set; }
    public DateTime CreatedAt { get; set; }
}

// in AppDbContext:
public DbSet<QuizAttempt> Attempts => Set<QuizAttempt>();
// in OnModelCreating:
b.Entity<QuizAttempt>(e =>
{
    e.Property(a => a.LessonId).HasMaxLength(16);
    e.Property(a => a.Score).HasPrecision(4, 3);
    e.HasOne<User>().WithMany().HasForeignKey(a => a.UserId);
    e.HasIndex(a => new { a.UserId, a.CreatedAt });               // "last N attempts for a user"
});

// ---- DevAtlas.Api/Features/Users/UserEndpoints.cs ----
using DevAtlas.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Api.Features.Users;

public sealed record UserSummary(int Id, string Email, int Completed, int Attempts);
public sealed record AttemptDto(string LessonId, decimal Score, DateTime CreatedAt);

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/users");

        // One SQL query: the counts are correlated subqueries inside the same SELECT, not a query per user.
        g.MapGet("/", async (int? limit, int? afterId, AppDbContext db, CancellationToken ct) =>
            TypedResults.Ok(await db.Users.AsNoTracking()
                .Where(u => u.Id > (afterId ?? 0))
                .OrderBy(u => u.Id)
                .Take(Math.Clamp(limit ?? 20, 1, 100))
                .Select(u => new UserSummary(
                    u.Id,
                    u.Email,
                    u.Progress.Count(p => p.Status == "completed"),
                    db.Attempts.Count(a => a.UserId == u.Id)))
                .ToListAsync(ct)));

        g.MapGet("/{userId:int}/attempts", async (int userId, int? limit, AppDbContext db, CancellationToken ct) =>
            TypedResults.Ok(await db.Attempts.AsNoTracking()
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)                         // served by IX (UserId, CreatedAt)
                .Take(Math.Clamp(limit ?? 10, 1, 50))
                .Select(a => new AttemptDto(a.LessonId, a.Score, a.CreatedAt))
                .ToListAsync(ct)));
    }
}

// ---- DevAtlas.Api.Tests/PersistenceTests.cs (Testcontainers.MySql 4.16, Mvc.Testing 9.0.*) ----
using System.Data.Common;
using System.Net.Http.Json;
using DevAtlas.Api.Data;
using DevAtlas.Api.Features.Users;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MySql;

public sealed class CommandCounter : DbCommandInterceptor
{
    private int _count;
    public int Count => _count;
    public void Reset() => Interlocked.Exchange(ref _count, 0);
    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand c, CommandEventData e, InterceptionResult<DbDataReader> r, CancellationToken ct = default)
    { Interlocked.Increment(ref _count); return ValueTask.FromResult(r); }
}

// Real MySQL in Docker + the real app in memory, with the same migrations as production.
public sealed class MySqlApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly MySqlContainer _mysql = new MySqlBuilder("mysql:8.4").Build();
    public CommandCounter Counter { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Default", _mysql.GetConnectionString());
        builder.ConfigureTestServices(s => s.AddSingleton<IInterceptor>(Counter));
    }

    public async Task InitializeAsync()
    {
        await _mysql.StartAsync();
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public new async Task DisposeAsync() { await base.DisposeAsync(); await _mysql.DisposeAsync(); }
}

public class PersistenceTests(MySqlApiFactory factory) : IClassFixture<MySqlApiFactory>
{
    private AppDbContext NewDb() => factory.Services.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>();

    [Fact]
    public async Task Unique_index_rejects_a_second_progress_row()
    {
        var db = NewDb();
        var user = new User { Email = "dup@x.dev" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.Progress.Add(new LessonProgress { UserId = user.Id, LessonId = "4.1.2", UpdatedAt = DateTime.UtcNow });
        db.Progress.Add(new LessonProgress { UserId = user.Id, LessonId = "4.1.2", UpdatedAt = DateTime.UtcNow });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Listing_20_users_with_counts_is_a_single_query()
    {
        var db = NewDb();
        var start = DateTime.UtcNow;
        var users = Enumerable.Range(1, 20).Select(i => new User { Email = $"list{i}@x.dev" }).ToList();
        db.Users.AddRange(users);
        await db.SaveChangesAsync();
        foreach (var u in users)
        {
            db.Progress.Add(new LessonProgress { UserId = u.Id, LessonId = "4.1.1", Status = "completed", UpdatedAt = start });
            db.Progress.Add(new LessonProgress { UserId = u.Id, LessonId = "4.1.2", Status = "started", UpdatedAt = start });
            for (var k = 0; k < 3; k++)
                db.Attempts.Add(new QuizAttempt { UserId = u.Id, LessonId = "4.1.1", Score = 0.5m + k / 10m, CreatedAt = start.AddMinutes(k) });
        }
        await db.SaveChangesAsync();

        factory.Counter.Reset();
        var page = await factory.CreateClient().GetFromJsonAsync<List<UserSummary>>($"/users?limit=20&afterId={users[0].Id - 1}");

        Assert.Equal(20, page!.Count);
        Assert.All(page, u => Assert.Equal((1, 3), (u.Completed, u.Attempts)));
        Assert.True(factory.Counter.Count <= 2, $"Expected <= 2 queries, got {factory.Counter.Count}");
    }

    [Fact]
    public async Task Attempts_are_newest_first_and_limit_is_clamped()
    {
        var db = NewDb();
        var user = new User { Email = "attempts@x.dev" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 60; i++)
            db.Attempts.Add(new QuizAttempt { UserId = user.Id, LessonId = "4.1.2", Score = 0.9m, CreatedAt = t0.AddMinutes(i) });
        await db.SaveChangesAsync();

        var attempts = await factory.CreateClient().GetFromJsonAsync<List<AttemptDto>>($"/users/{user.Id}/attempts?limit=500");
        Assert.Equal(50, attempts!.Count);
        Assert.Equal(t0.AddMinutes(59), attempts[0].CreatedAt);
    }
}`,
        },
        output: "$ dotnet test        # Docker running; Testcontainers starts mysql:8.4\nPassed!  - Failed:     0, Passed:     3, Skipped:     0, Total:     3",
        pitfalls: [
          "The test project needs Microsoft.EntityFrameworkCore.Relational 9.0.* when the API references Microsoft.EntityFrameworkCore.Design (a private asset). Without it the test project resolves the older EF Core version that Pomelo 9.0.0 asks for, and fails with CS1705.",
        ],
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
