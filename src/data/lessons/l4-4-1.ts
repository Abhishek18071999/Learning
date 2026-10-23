import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.4.1",
  title: "REST, GraphQL and gRPC; versioning and pagination",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["4.1.1 Minimal APIs, middleware and DI", "0.1.2 HTTP in depth"],
  summary: "Design APIs other teams love to use: resource-oriented REST, when GraphQL or gRPC fit better, evolving APIs without breaking clients, and pagination, filtering and sorting that scale.",
  terms: [
    { term: "Resource", def: "A noun your API exposes (lessons, users, attempts), addressed by URLs like /lessons/4.4.1." },
    { term: "REST", def: "An architectural style using HTTP methods on resources, stateless requests and standard status codes." },
    { term: "GraphQL", def: "A query language where clients ask for exactly the fields they need from a typed schema, usually via one endpoint." },
    { term: "gRPC", def: "A high-performance RPC framework using HTTP/2 and Protocol Buffers, with generated clients in many languages." },
    { term: "Breaking change", def: "A change that makes existing clients fail: removing or renaming fields, changing types, tightening validation." },
    { term: "Offset vs cursor pagination", def: "Offset: ?page=3 (skip N rows). Cursor: ?after=<opaque token> (continue after the last seen item)." },
    { term: "Contract", def: "The agreed shape of requests and responses, ideally machine-readable (OpenAPI, GraphQL schema, .proto files)." },
  ],
  problem: [
    "The DevAtlas mobile app needs a lesson summary with progress for the dashboard. The REST API needs four calls (user, lessons, progress, recommendations), which is slow on mobile networks. Meanwhile, the Rust news service and the .NET API exchange thousands of small messages per second as JSON, burning CPU on serialisation.",
    "A week later someone renames `minutes` to `durationMinutes` in the API and every installed mobile app breaks until users update. Good API design picks the right style for each consumer and evolves contracts without breaking them.",
  ],
  concept: {
    analogy: [
      "**REST** is a **library with a catalogue**: each book (resource) has a shelf address, and you use standard actions (borrow, return). **GraphQL** is a **personal shopper**: you hand over one list of exactly what you want, and they assemble it from many shops. **gRPC** is a **direct phone line with a strict script** between two departments: fast and efficient, but both sides must have the same script (.proto).",
    ],
    precise: [
      "**REST guidelines**: plural nouns (/lessons, /lessons/{id}/attempts), HTTP methods for actions, correct status codes (0.1.2), consistent JSON naming, ProblemDetails for errors, filtering/sorting/pagination via query parameters, idempotency for retries (next lesson), and OpenAPI documentation. Great default for public and web APIs; works with HTTP caching.",
      "**GraphQL** fits clients with diverse data needs (mobile and web dashboards) and aggregation across services. Costs: caching is harder (POST to one endpoint), query cost must be limited (depth/complexity limits), and N+1 resolvers need batching (DataLoader).",
      "**gRPC** fits internal service-to-service calls: binary Protobuf, HTTP/2 multiplexing, streaming in both directions, deadlines and strongly typed generated clients. Browsers need gRPC-Web or a gateway, so it is less common for public web APIs.",
      "**Evolution rules**: additive changes are safe (new optional fields, new endpoints); removing, renaming or changing meaning is breaking. Version with a URL prefix (/v2) or header when you must break, deprecate with headers and timelines, and run old and new versions in parallel. **Pagination**: cursor-based for feeds and large or changing data (stable, fast with keyset queries from lesson 5.1.1); offset only for small, stable lists where page numbers matter.",
    ],
  },
  underTheHood: {
    text: [
      "Cursor pagination encodes the position of the last item (e.g. its created_at and id) in an opaque token, often base64 JSON, sometimes signed. The server decodes it and runs a keyset query `WHERE (created_at, id) < (@t, @id) ORDER BY created_at DESC, id DESC LIMIT n+1`; fetching n+1 rows tells you whether there is a next page without a COUNT.",
      "Protobuf encodes fields by number, not name, so renaming a field is safe on the wire but reusing or changing a field number breaks clients. That is why .proto files reserve deleted field numbers.",
      "GraphQL resolvers run per field; a list of 50 lessons each resolving 'progress' separately is an N+1 problem. DataLoader batches those 50 lookups into one query per tick.",
    ],
    diagram: {
      title: "Choosing an API style",
      nodes: [
        { label: "Public / web clients", sub: "REST + OpenAPI" },
        { label: "Many client shapes", sub: "GraphQL (BFF)" },
        { label: "Internal, high-volume", sub: "gRPC" },
        { label: "Events / async", sub: "queues (next lesson)" },
      ],
      edges: ["", "", ""],
    },
  },
  handsOn: [
    {
      title: "REST resource design for DevAtlas",
      code: {
        lang: "text",
        code: `GET    /v1/lessons?phase=4&sort=-updatedAt&limit=20&after=eyJ0Ijo…   list (filter, sort, cursor)
GET    /v1/lessons/4.4.1                                                one
POST   /v1/lessons                                                      create → 201 + Location
PATCH  /v1/lessons/4.4.1                                                partial update
DELETE /v1/lessons/4.4.1                                                204
GET    /v1/me/progress                                                  current user's progress
PUT    /v1/me/progress/4.4.1      { "status": "completed", "score": 0.9 }   idempotent upsert
POST   /v1/lessons/4.4.1/attempts                                       create a quiz attempt (not idempotent)

List response:
{ "items": [ … ], "nextCursor": "eyJ0Ijo…", "hasMore": true }`,
      },
    },
    {
      title: "Cursor pagination, end to end (Python + SQLite to run anywhere)",
      code: {
        lang: "python",
        file: "cursor_pagination.py",
        code: `import base64, json, sqlite3

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE news (id INTEGER PRIMARY KEY, published INTEGER, title TEXT)")
db.execute("CREATE INDEX idx_news_pub ON news (published DESC, id DESC)")
db.executemany("INSERT INTO news (id, published, title) VALUES (?, ?, ?)",
               [(i, 1000 + i // 2, f"story {i}") for i in range(1, 12)])   # some equal timestamps

def encode(row) -> str:
    return base64.urlsafe_b64encode(json.dumps({"p": row[1], "id": row[0]}).encode()).decode()

def decode(cursor: str) -> tuple[int, int]:
    d = json.loads(base64.urlsafe_b64decode(cursor))
    return d["p"], d["id"]

def page(limit: int, after: str | None = None) -> dict:
    if after:
        p, i = decode(after)
        rows = db.execute("SELECT id, published, title FROM news WHERE (published, id) < (?, ?) "
                          "ORDER BY published DESC, id DESC LIMIT ?", (p, i, limit + 1)).fetchall()
    else:
        rows = db.execute("SELECT id, published, title FROM news ORDER BY published DESC, id DESC LIMIT ?",
                          (limit + 1,)).fetchall()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return {"items": [r[2] for r in rows], "nextCursor": encode(rows[-1]) if has_more else None}

p1 = page(4); print(p1["items"])
p2 = page(4, p1["nextCursor"]); print(p2["items"])
p3 = page(4, p2["nextCursor"]); print(p3["items"], p3["nextCursor"])`,
      },
      output: "['story 11', 'story 10', 'story 9', 'story 8']\n['story 7', 'story 6', 'story 5', 'story 4']\n['story 3', 'story 2', 'story 1'] None",
      notes: ["Row-value comparison `(a, b) < (?, ?)` needs SQLite 3.15+, MySQL and PostgreSQL support it too. The id tie-breaker prevents skipping or repeating stories with equal timestamps."],
    },
    {
      title: "GraphQL: one query for the dashboard",
      code: {
        lang: "text",
        file: "dashboard.graphql",
        code: `query Dashboard {
  me {
    name
    streakDays
    progress(first: 5) {
      lesson { id title minutes }
      status
      score
    }
    recommendations(first: 3) { id title }
  }
}`,
      },
      notes: ["One round trip returns exactly these fields. The server must enforce depth/complexity limits and batch resolvers with DataLoader to avoid N+1."],
    },
    {
      title: "gRPC contract between services",
      code: {
        lang: "text",
        file: "news.proto",
        code: `syntax = "proto3";
package devatlas.news.v1;

service NewsService {
  rpc GetItem (GetItemRequest) returns (NewsItem);
  rpc ListItems (ListItemsRequest) returns (ListItemsResponse);
  rpc WatchItems (WatchRequest) returns (stream NewsItem);   // server streaming
}

message GetItemRequest { uint64 id = 1; }
message ListItemsRequest { string topic = 1; int32 page_size = 2; string page_token = 3; }
message ListItemsResponse { repeated NewsItem items = 1; string next_page_token = 2; }
message WatchRequest { string topic = 1; }

message NewsItem {
  uint64 id = 1;
  string title = 2;
  string url = 3;
  string topic = 4;
  reserved 5;                    // field 5 was removed; never reuse the number
  int64 published_unix = 6;
}`,
      },
      notes: ["Generate clients with protoc plugins: Grpc.Tools for C#, tonic-build for Rust, grpcio-tools for Python. Always set deadlines on gRPC calls."],
    },
    {
      title: "Evolve without breaking: deprecation in ASP.NET Core",
      code: {
        lang: "csharp",
        code: `// v1 keeps working; v2 adds the new shape
var v1 = app.MapGroup("/v1/lessons");
var v2 = app.MapGroup("/v2/lessons");

v1.MapGet("/{id}", (string id, ILessonStore s) => s.Find(id) is { } l
        ? Results.Ok(new { l.Id, l.Title, minutes = l.Minutes })
        : Results.NotFound())
  .AddEndpointFilter(async (ctx, next) =>
  {
      ctx.HttpContext.Response.Headers["Deprecation"] = "true";
      ctx.HttpContext.Response.Headers["Sunset"] = "Wed, 30 Jun 2027 00:00:00 GMT";
      ctx.HttpContext.Response.Headers.Link = "</v2/lessons>; rel=\\"successor-version\\"";
      return await next(ctx);
  });

v2.MapGet("/{id}", (string id, ILessonStore s) => s.Find(id) is { } l
        ? Results.Ok(new { l.Id, l.Title, duration = new { minutes = l.Minutes } })
        : Results.NotFound());`,
      },
      notes: ["Track who still calls v1 (logs/metrics by client), notify them, and remove v1 only after the sunset date and traffic reaches zero."],
    },
  ],
  companies: [
    "**Public APIs are REST-first**: Stripe, GitHub, Twilio and most SaaS vendors publish REST APIs with OpenAPI specs and careful versioning; Stripe famously pins each account to an API version and transforms responses for older versions.",
    "**GraphQL as a BFF**: companies with many client apps (web, iOS, Android) often place a GraphQL layer in front of microservices so each client gets exactly what its screens need.",
    "**gRPC internally**: large microservice estates use gRPC (or similar binary RPC) between services for efficiency, typed contracts and streaming, with REST or GraphQL at the edge.",
  ],
  mistakes: [
    { mistake: "Renaming or removing fields in place", why: "Cleaning up naming", wrong: "Installed mobile apps and partner integrations break", fix: "Add new fields, deprecate old ones, version only when unavoidable" },
    { mistake: "Verbs in REST URLs (/getLessons, /deleteUser)", why: "RPC habits", wrong: "Inconsistent API, ignores HTTP semantics and caching", fix: "Nouns + methods; actions as sub-resources only when needed (POST /lessons/{id}/publish)" },
    { mistake: "Offset pagination on large, changing feeds", why: "Page numbers are easy", wrong: "Slow deep pages; duplicates/skips when new items arrive", fix: "Cursor (keyset) pagination with a stable sort and tie-breaker" },
    { mistake: "GraphQL without query limits", why: "Flexibility is the point", wrong: "Expensive nested queries take down the server", fix: "Depth/complexity limits, persisted queries, timeouts, DataLoader" },
    { mistake: "No contract in source control", why: "'The code is the documentation'", wrong: "Client teams guess and break silently", fix: "OpenAPI/GraphQL schema/.proto in Git, with breaking-change checks in CI" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Contract files in Git; run breaking-change detection in CI (e.g. OpenAPI diff tools, buf breaking for Protobuf)." },
    { tag: "Performance", text: "Cursor pagination with keyset queries and a limit cap (e.g. max 100)." },
    { tag: "Reliability", text: "Deadlines/timeouts on every inter-service call, especially gRPC." },
    { tag: "Maintainability", text: "Consistent naming, error format and pagination shape across all endpoints." },
  ],
  interview: [
    { q: "REST vs GraphQL vs gRPC: when do you use each?", a: "REST for public and web APIs: simple, cacheable, widely understood. GraphQL when many clients need different shapes of related data or to aggregate services behind one schema, accepting more server complexity. gRPC for internal service-to-service calls needing efficiency, streaming and strict contracts." },
    { q: "How do you version an API?", a: "Avoid breaking changes with additive evolution. When a break is necessary, introduce a new version (URL prefix like /v2 or a header), run versions in parallel, mark the old one deprecated with Deprecation/Sunset headers and docs, monitor its usage, and remove it after a communicated date." },
    { q: "Why prefer cursor pagination over offset?", a: "Offset requires the database to scan and discard skipped rows, so deep pages get slower, and inserts during browsing cause duplicates or skips. A cursor encodes the last seen sort key, enabling an indexed keyset query that is fast at any depth and stable under inserts." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which change is backward compatible for existing JSON clients?",
      options: ["Renaming minutes to durationMinutes", "Adding a new optional field level", "Changing id from string to number", "Removing title"],
      answer: 1,
      explanation: "Clients ignore unknown fields; the others break existing code.",
    },
    {
      kind: "mcq",
      prompt: "Best fit for streaming price updates between two internal services at high volume?",
      options: ["REST polling every second", "gRPC server streaming", "GraphQL query", "Email"],
      answer: 1,
      explanation: "gRPC supports efficient streaming over HTTP/2 with typed messages.",
    },
    {
      kind: "bug",
      prompt: "Users scrolling the news feed see some stories twice. Pagination uses ?offset=20&limit=20 ordered by published DESC. Why?",
      options: ["The limit is too small", "New stories inserted at the top shift every offset, so earlier items reappear", "Missing CORS", "The client caches too much"],
      answer: 1,
      explanation: "Switch to cursor pagination keyed on (published, id).",
    },
  ],
  cheatSheet: [
    "REST: plural nouns + methods + status codes + ProblemDetails + OpenAPI.",
    "GraphQL: client-shaped queries; add limits and DataLoader.",
    "gRPC: Protobuf, HTTP/2, streaming, deadlines; internal calls.",
    "Additive changes safe; rename/remove/retype are breaking.",
    "Version when you must; Deprecation + Sunset headers; monitor usage.",
    "Cursor pagination: opaque token, keyset query, LIMIT n+1, tie-breaker id.",
    "Contracts in Git with breaking-change checks in CI.",
  ],
  homework: {
    basic: {
      title: "Design the DevAtlas REST API",
      brief: ["Write an OpenAPI 3 YAML for users/me, lessons (list with filter/sort/cursor, get), progress (list, upsert) and attempts (create, list). Include error responses using ProblemDetails."],
      criteria: ["Plural nouns, correct methods and codes", "Consistent list envelope with nextCursor", "Error schema reused via $ref"],
      hints: ["Define components.schemas.Problem once and reference it."],
      solution: {
        text: ["A compact spec with shared components keeps the API consistent and lets you generate clients and docs."],
        code: {
          lang: "yaml",
          file: "openapi.yaml (excerpt)",
          code: `openapi: 3.0.3
info: { title: DevAtlas API, version: "1.0" }
paths:
  /v1/lessons:
    get:
      parameters:
        - { name: phase, in: query, schema: { type: integer } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
        - { name: after, in: query, schema: { type: string } }
      responses:
        "200":
          description: A page of lessons
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: "#/components/schemas/Lesson" } }
                  nextCursor: { type: string, nullable: true }
        "400": { $ref: "#/components/responses/Problem" }
components:
  schemas:
    Lesson:
      type: object
      required: [id, title, minutes]
      properties: { id: { type: string }, title: { type: string }, minutes: { type: integer } }
    Problem:
      type: object
      properties: { type: { type: string }, title: { type: string }, status: { type: integer }, detail: { type: string } }
  responses:
    Problem:
      description: Error
      content: { application/problem+json: { schema: { $ref: "#/components/schemas/Problem" } } }`,
        },
      },
    },
    intermediate: {
      title: "Cursor pagination in the .NET API",
      brief: ["Implement GET /v1/lessons?limit&after with opaque cursors over (UpdatedAt, Id) in EF Core, returning { items, nextCursor }. Reject tampered cursors with 400."],
      criteria: ["Keyset query with tie-breaker", "LIMIT n+1 to detect more pages", "Invalid cursor → 400 ProblemDetails"],
      hints: ["Base64url-encode JSON {t, id}; optionally sign with HMAC to detect tampering."],
      solution: {
        text: [
          "Same algorithm as the Python version, plus tamper detection. The cursor is base64url(JSON {t, id}) followed by an HMAC-SHA256 signature; the endpoint decodes and verifies the signature before trusting the key, so a flipped character returns 400 instead of silently mis-paginating. The keyset query filters `where (UpdatedAt < t) or (UpdatedAt == t and Id < id)` ordered `UpdatedAt desc, Id desc`, and fetches `limit + 1` rows: the extra row is the only signal that another page exists, so ties never cause skipped or repeated rows.",
          "Verified with .NET 9, EF Core 9 and SQLite: `dotnet test` passes 6 tests — a full three-page walk over 7 rows with tied timestamps (7,6,5,4,3,2,1 in order, no repeats), an exact-limit page returning a null nextCursor, a tampered cursor and a garbage cursor both returning 400 ProblemDetails, and out-of-range `limit` values returning 400. The signing key is read from `CURSOR_SIGNING_KEY` (a dev fallback only runs outside Production).",
        ],
        code: { lang: "csharp", file: "Paging.Api (Data.cs, Cursor.cs, Program.cs) + Paging.Api.Tests", code: `// dotnet new web -n Paging.Api   &&   dotnet new xunit -n Paging.Api.Tests
// dotnet add Paging.Api.Tests reference Paging.Api
// set <TargetFramework>net9.0</TargetFramework> in both .csproj files
// dotnet add Paging.Api package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"
// dotnet add Paging.Api.Tests package Microsoft.AspNetCore.Mvc.Testing --version "9.0.*"
// dotnet add Paging.Api.Tests package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"

// ---- Data.cs ----
using Microsoft.EntityFrameworkCore;

public sealed class Lesson
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public DateTime UpdatedAt { get; set; }          // UTC
}

public sealed class LessonsDbContext(DbContextOptions<LessonsDbContext> options) : DbContext(options)
{
    public DbSet<Lesson> Lessons => Set<Lesson>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.Entity<Lesson>().HasIndex(l => new { l.UpdatedAt, l.Id });
}

// ---- Cursor.cs ----
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

public readonly record struct CursorToken(long Ticks, long Id);

public sealed class CursorService(string signingKey)
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
    private readonly byte[] _key = Encoding.UTF8.GetBytes(signingKey);

    public string Encode(CursorToken token)
    {
        var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new CursorPayload(token.Ticks, token.Id)));
        var signature = Base64Url(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload)));
        return $"{payload}.{signature}";
    }

    public bool TryDecode(string cursor, out CursorToken token)
    {
        token = default;
        if (string.IsNullOrEmpty(cursor)) return false;
        var dot = cursor.LastIndexOf('.');
        if (dot <= 0 || dot == cursor.Length - 1) return false;
        var payload = cursor[..dot];
        var signature = cursor[(dot + 1)..];
        var expected = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload));
        try
        {
            if (!CryptographicOperations.FixedTimeEquals(FromBase64Url(signature), expected)) return false;
            var dto = JsonSerializer.Deserialize<CursorPayload>(FromBase64Url(payload), Json);
            if (dto is null || dto.T <= 0 || dto.Id <= 0) return false;
            token = new CursorToken(dto.T, dto.Id);
            return true;
        }
        catch (Exception e) when (e is FormatException or JsonException) { return false; }
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += new string('=', (4 - s.Length % 4) % 4);
        return Convert.FromBase64String(s);
    }
}

public sealed record CursorPayload(long T, long Id);

// ---- Program.cs ----
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<LessonsDbContext>(o => o.UseSqlite("Data Source=lessons.db"));
builder.Services.AddProblemDetails();

var signingKey = Environment.GetEnvironmentVariable("CURSOR_SIGNING_KEY")
    ?? (builder.Environment.IsProduction()
        ? throw new InvalidOperationException("CURSOR_SIGNING_KEY must be set in production")
        : "dev-only-signing-key");
builder.Services.AddSingleton(new CursorService(signingKey));

var app = builder.Build();
app.UseExceptionHandler();

app.MapGet("/v1/lessons", async (int? limit, string? after, LessonsDbContext db, CursorService cursors) =>
{
    var take = limit ?? 20;
    if (take is < 1 or > 100)
        return Results.Problem(statusCode: 400, title: "Invalid limit", detail: "limit must be between 1 and 100");

    var query = db.Lessons.AsNoTracking();
    if (after is not null)
    {
        if (!cursors.TryDecode(after, out var token))
            return Results.Problem(statusCode: 400, title: "Invalid cursor",
                detail: "the after cursor is malformed or was tampered with");
        var t = new DateTime(token.Ticks, DateTimeKind.Utc);
        query = query.Where(l => l.UpdatedAt < t || (l.UpdatedAt == t && l.Id < token.Id));
    }

    // limit + 1: one extra row means another page exists.
    var rows = await query.OrderByDescending(l => l.UpdatedAt).ThenByDescending(l => l.Id)
        .Take(take + 1).ToListAsync();

    var hasMore = rows.Count > take;
    var items = rows.Take(take)
        .Select(l => new { id = l.Id, title = l.Title, updatedAt = l.UpdatedAt }).ToList();
    var last = items[^1];
    var nextCursor = hasMore ? cursors.Encode(new CursorToken(last.updatedAt.Ticks, last.id)) : null;
    return Results.Ok(new { items, nextCursor });
});

app.Run();

public partial class Program { }

// ---- Paging.Api.Tests/PagingTests.cs ----
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly SqliteConnection KeepAlive = new("DataSource=:memory:");
    static ApiFactory()
    {
        Environment.SetEnvironmentVariable("CURSOR_SIGNING_KEY", "test-key-441");
        KeepAlive.Open();
    }
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureServices(services =>
        {
            var d = services.Single(x => x.ServiceType == typeof(DbContextOptions<LessonsDbContext>));
            services.Remove(d);
            services.AddDbContext<LessonsDbContext>(o => o.UseSqlite(KeepAlive));
        });
}

public class PagingTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateTime Base = new(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);

    private async Task SeedAsync(params (long id, string title, DateTime updatedAt)[] rows)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LessonsDbContext>();
        await db.Database.EnsureCreatedAsync();
        await db.Lessons.ExecuteDeleteAsync();
        db.Lessons.AddRange(rows.Select(r => new Lesson { Id = r.id, Title = r.title, UpdatedAt = r.updatedAt }));
        await db.SaveChangesAsync();
    }

    private static async Task<(JsonElement body, HttpStatusCode status)> GetAsync(HttpClient c, string url)
    {
        var res = await c.GetAsync(url);
        return (JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement, res.StatusCode);
    }

    [Fact]
    public async Task Walks_all_pages_without_skipping_or_repeating_tied_rows()
    {
        var seed = Enumerable.Range(1, 7)
            .Select(i => (id: (long)i, title: $"lesson {i}", updatedAt: Base.AddHours((i - 1) / 2))).ToArray();
        await SeedAsync(seed);
        var client = factory.CreateClient();
        var seen = new List<long>();
        string? cursor = null;
        var pages = 0;
        do
        {
            var url = $"/v1/lessons?limit=3{(cursor is null ? "" : $"&after={Uri.EscapeDataString(cursor)}")}";
            var (body, status) = await GetAsync(client, url);
            Assert.Equal(HttpStatusCode.OK, status);
            foreach (var item in body.GetProperty("items").EnumerateArray())
                seen.Add(item.GetProperty("id").GetInt64());
            cursor = body.GetProperty("nextCursor").ValueKind == JsonValueKind.Null
                ? null : body.GetProperty("nextCursor").GetString();
            pages++;
        } while (cursor is not null && pages < 10);
        Assert.Equal(new long[] { 7, 6, 5, 4, 3, 2, 1 }, seen);
        Assert.Equal(3, pages);
    }

    [Fact]
    public async Task Exactly_limit_rows_return_no_nextCursor()
    {
        await SeedAsync((1, "a", Base.AddHours(1)), (2, "b", Base.AddHours(2)), (3, "c", Base.AddHours(3)));
        var client = factory.CreateClient();
        var (body, status) = await GetAsync(client, "/v1/lessons?limit=3");
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(3, body.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task Tampered_cursor_returns_400_ProblemDetails()
    {
        await SeedAsync((1, "a", Base), (2, "b", Base.AddHours(1)), (3, "c", Base.AddHours(2)), (4, "d", Base.AddHours(3)));
        var client = factory.CreateClient();
        var (first, _) = await GetAsync(client, "/v1/lessons?limit=2");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var res = await client.GetAsync($"/v1/lessons?after={Uri.EscapeDataString(cursor[..^4] + "AAAA")}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Garbage_cursor_returns_400()
    {
        var res = await factory.CreateClient().GetAsync("/v1/lessons?after=not-a-cursor");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task Out_of_range_limit_returns_400(int limit)
    {
        var res = await factory.CreateClient().GetAsync($"/v1/lessons?limit={limit}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}` },
        output: "$ dotnet test\n\nA total of 1 test files matched the specified pattern.\n\nPassed!  - Failed:     0, Passed:     6, Skipped:     0, Total:     6",
        pitfalls: ["Serialising the cursor payload with the default JSON options: the property names become \"T\" and \"Id\" (capitalised) and stay that way in the token. Set PropertyNamingPolicy = CamelCase so the payload is {\"t\":…,\"id\":…}."],
      },
    },
    challenge: {
      title: "Breaking-change detector",
      brief: ["Write a script that compares two OpenAPI JSON files and reports breaking changes: removed paths, removed response properties, newly required request properties, and type changes. Run it in CI on pull requests."],
      criteria: ["Detects the four change types", "Exit code 1 on breaking changes", "Clear report"],
      hints: ["Walk paths → methods → responses → schemas; resolve $ref first."],
      solution: {
        text: ["A focused checker catches the common breaks; mature teams use established tools (for example openapi-diff or oasdiff) that cover many more cases. The key idea is that contract changes get reviewed automatically, not discovered by clients."],
        code: {
          lang: "python",
          code: `import json, sys

def props(schema: dict) -> dict:
    return schema.get("properties", {}) if isinstance(schema, dict) else {}

def check(old: dict, new: dict) -> list[str]:
    problems = []
    for path, methods in old.get("paths", {}).items():
        if path not in new.get("paths", {}):
            problems.append(f"removed path {path}"); continue
        for method, op in methods.items():
            new_op = new["paths"][path].get(method)
            if new_op is None:
                problems.append(f"removed {method.upper()} {path}"); continue
            old_req = op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
            new_req = new_op.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
            for name in set(new_req.get("required", [])) - set(old_req.get("required", [])):
                problems.append(f"{method.upper()} {path}: request field '{name}' became required")
            old_res = op.get("responses", {}).get("200", {}).get("content", {}).get("application/json", {}).get("schema", {})
            new_res = new_op.get("responses", {}).get("200", {}).get("content", {}).get("application/json", {}).get("schema", {})
            for name, spec in props(old_res).items():
                if name not in props(new_res):
                    problems.append(f"{method.upper()} {path}: response field '{name}' removed")
                elif spec.get("type") != props(new_res)[name].get("type"):
                    problems.append(f"{method.upper()} {path}: response field '{name}' changed type")
    return problems

if __name__ == "__main__":
    found = check(json.load(open(sys.argv[1])), json.load(open(sys.argv[2])))
    print("\\n".join(found) or "no breaking changes")
    sys.exit(1 if found else 0)`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: API contract and pagination",
      brief: ["Prefix DevAtlas API routes with /v1, add cursor pagination to every list endpoint, publish the OpenAPI document as a CI artifact, and add a breaking-change check against main."],
      criteria: ["All lists return { items, nextCursor }", "OpenAPI artifact per build", "CI fails on breaking changes unless a version bump is made"],
      hints: ["Generate the OpenAPI document during the test job and diff against the main branch's artifact."],
      solution: {
        text: [
          "Contract checks turn API compatibility into an automated gate, like tests for behaviour. The workflow below does three things the brief asks for: the test job generates `openapi.json` (the intermediate solution's endpoint already returns the `{ items, nextCursor }` envelope under a `/v1` prefix, so every list gets the shape automatically), uploads it as a per-build artifact, and diffs it against the main branch's artifact with a small checker that exits non-zero on a breaking change. The version-bump escape hatch lets a deliberate major change through only when `openapi.json`'s `info.version` changed in the same PR.",
          "The checker below was run for real: `python check-contract.py openapi.main.json openapi.pr.json` reported `GET /v1/lessons: response field 'nextCursor' removed` and exited 1, while comparing a file against itself printed `no breaking changes` and exited 0. In production most teams reach for an established tool (oasdiff, openapi-diff) rather than this hand-rolled script, but the script is short enough to read in one sitting and covers the four most common breaks.",
        ],
        code: { lang: "yaml", file: ".github/workflows/contract-check.yml + scripts/check-contract.py", code: `# ---- .github/workflows/contract-check.yml ----
name: contract-check
on:
  pull_request:
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 9.0.x
      - name: Build and test (writes openapi.json)
        run: dotnet test DevAtlas.Api.Tests
      - uses: actions/upload-artifact@v4
        with:
          name: openapi-pr
          path: openapi.json
      - name: Compare the PR contract against main
        env:
          MAIN_OPENAPI_URL: https://devatlas.dev/artifacts/openapi.main.json
        run: |
          curl -sL "$MAIN_OPENAPI_URL" -o openapi.main.json
          python scripts/check-contract.py openapi.main.json openapi.json > breaking.txt || true
          if [ -s breaking.txt ] && ! grep -q '"version"' openapi.json; then
            echo "Breaking changes without a version bump:"; cat breaking.txt; exit 1
          fi
          echo "contract compatible (or version bumped)"

# ---- scripts/check-contract.py ----
import json
import sys

BREAKING = []

def resolve(schema, doc):
    while isinstance(schema, dict) and "$ref" in schema:
        ref = schema["$ref"].removeprefix("#/")
        schema = doc
        for part in ref.split("/"):
            schema = schema.get(part, {})
    return schema if isinstance(schema, dict) else {}

def props(schema):
    return schema.get("properties", {}) if isinstance(schema, dict) else {}

def compare(old, new):
    for path, methods in old.get("paths", {}).items():
        if path not in new.get("paths", {}):
            BREAKING.append(f"removed path {path}")
            continue
        for method, op in methods.items():
            new_op = new["paths"][path].get(method)
            if new_op is None:
                BREAKING.append(f"removed {method.upper()} {path}")
                continue
            def body(o):
                return o.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
            def response(o):
                return o.get("responses", {}).get("200", {}).get("content", {}).get("application/json", {}).get("schema", {})
            old_req, new_req = resolve(body(op), old), resolve(body(new_op), new)
            for name in set(new_req.get("required", [])) - set(old_req.get("required", [])):
                BREAKING.append(f"{method.upper()} {path}: request field '{name}' became required")
            old_res, new_res = resolve(response(op), old), resolve(response(new_op), new)
            for name, spec in props(old_res).items():
                if name not in props(new_res):
                    BREAKING.append(f"{method.upper()} {path}: response field '{name}' removed")
                elif spec.get("type") != props(new_res)[name].get("type"):
                    BREAKING.append(f"{method.upper()} {path}: response field '{name}' changed type")

def main():
    if len(sys.argv) != 3:
        print("usage: check-contract.py <old.json> <new.json>")
        sys.exit(2)
    compare(json.load(open(sys.argv[1], encoding="utf-8-sig")), json.load(open(sys.argv[2], encoding="utf-8-sig")))
    print("\\n".join(BREAKING) if BREAKING else "no breaking changes")
    sys.exit(1 if BREAKING else 0)

if __name__ == "__main__":
    main()` },
        output: "$ python check-contract.py openapi.main.json openapi.pr.json\nGET /v1/lessons: response field 'nextCursor' removed\n(exit 1)\n\n$ python check-contract.py openapi.main.json openapi.main.json\nno breaking changes\n(exit 0)",
        pitfalls: [
          "Comparing the generated document against the PR's own baseline instead of main's artifact: a PR that only re-orders properties would look 'fine' against itself. Always diff against the last published contract.",
          "Treating every contract change as a hard failure: that blocks legitimate versioned upgrades. Let a version bump in the same PR be the explicit escape hatch.",
        ],
      },
    },
  },
  deeper: [
    { label: "Microsoft REST API Guidelines", url: "https://github.com/microsoft/api-guidelines" },
    { label: "Google API Design Guide", url: "https://cloud.google.com/apis/design" },
    { label: "GraphQL: Learn", url: "https://graphql.org/learn/" },
    { label: "gRPC: Introduction", url: "https://grpc.io/docs/what-is-grpc/introduction/" },
  ],
  nextPreview: "Next: idempotency, rate limiting, queues and caching: making APIs safe to retry and resilient under load.",
};
