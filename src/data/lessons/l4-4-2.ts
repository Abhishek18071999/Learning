import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.4.2",
  title: "Idempotency, rate limiting, queues and caching",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["4.4.1 REST, GraphQL and gRPC", "2.1.2 Two pointers and sliding window"],
  summary: "Make APIs safe under retries and load: idempotency keys, rate limiting algorithms, background jobs with message queues and the outbox pattern, and caching with correct invalidation.",
  terms: [
    { term: "Idempotency key", def: "A unique key sent by the client with a non-idempotent request (like a payment) so the server can return the original result for retries instead of repeating the action." },
    { term: "Rate limiting", def: "Capping how many requests a client can make in a time window to protect a service and share capacity fairly." },
    { term: "Token bucket", def: "A rate-limiting algorithm: tokens refill at a steady rate up to a burst size; each request spends one." },
    { term: "Message queue", def: "A durable buffer between producers and consumers (RabbitMQ, SQS, Azure Service Bus) enabling asynchronous processing." },
    { term: "At-least-once delivery", def: "Messages may be delivered more than once (after failures), so consumers must be idempotent." },
    { term: "Outbox pattern", def: "Writing an event to an 'outbox' table in the same database transaction as the business change, then publishing it reliably." },
    { term: "Cache-aside", def: "Read from cache; on a miss, load from the database and store it in the cache with a TTL." },
  ],
  problem: [
    "A learner on a train clicks 'Buy course' on DevAtlas. The request times out on the phone, the app retries, and the card is charged twice. On Monday morning a partner's script calls the news API 5,000 times a second and slows it for everyone. Sending the weekly digest email inside the HTTP request makes the endpoint take 40 seconds and time out.",
    "These are the bread-and-butter reliability problems of real backends. Each has a standard solution: idempotency keys, rate limits, queues for background work, and caches that are invalidated correctly.",
  ],
  concept: {
    analogy: [
      "An **idempotency key** is a **receipt number**: if you show the cashier the same receipt number twice, they hand you the same receipt instead of charging you again. A **token bucket** is a **ticket dispenser** that adds one ticket per second up to ten; you can burst through ten quickly, then you must wait. A **queue** is a **restaurant order rail**: the waiter pins orders and goes back to customers; cooks take orders when ready.",
    ],
    precise: [
      "**Idempotency**: for POSTs with side effects, clients send `Idempotency-Key: <uuid>`. The server stores (key, request hash, response) atomically with the action; a retry with the same key returns the stored response; the same key with a different body is rejected (422). Keys expire after a retention window (e.g. 24 hours).",
      "**Rate limiting**: fixed window (simple, bursty at window edges), sliding window (accurate, more state), token bucket (allows controlled bursts; common in APIs and gateways). Limit per API key/user/IP, return `429 Too Many Requests` with `Retry-After`. In a multi-instance deployment, keep counters in Redis or enforce at the gateway.",
      "**Queues**: move slow or failure-prone work (emails, LLM summarisation, image processing) out of the request: the API enqueues a job and returns 202 Accepted; workers process with retries and a dead-letter queue for poison messages. Delivery is at-least-once, so consumers must be idempotent.",
      "**Outbox**: never 'save to DB then publish to queue' as two separate steps (the second can fail). Insert the event into an outbox table in the same transaction; a relay publishes it and marks it sent. **Caching**: cache-aside with TTLs, explicit invalidation on writes, and protection against stampedes (request coalescing or locking) for hot keys.",
    ],
  },
  underTheHood: {
    text: [
      "The idempotency record must be created atomically with the action: insert the key row first with a unique constraint (status = in_progress); a concurrent duplicate fails the insert and waits or returns 409; on completion, store the response. This avoids double execution even when two retries arrive at the same moment.",
      "Token bucket math: tokens = min(capacity, tokens + elapsed × rate); if tokens ≥ 1, allow and subtract 1. Store (tokens, last_refill) per key; in Redis do it atomically with a Lua script or use a library.",
      "Cache stampede: when a hot key expires, thousands of requests miss at once and all hit the database. Mitigations: single-flight (only one request recomputes, others wait), early probabilistic refresh, or serving stale data while refreshing in the background.",
    ],
    diagram: {
      title: "Outbox: reliable events",
      nodes: [
        { label: "API request", sub: "complete lesson" },
        { label: "DB transaction", sub: "progress row + outbox row" },
        { label: "Relay", sub: "reads unsent outbox" },
        { label: "Queue", sub: "lesson.completed" },
        { label: "Consumers", sub: "badges, emails (idempotent)" },
      ],
      edges: ["", "commit", "publish", "deliver ≥1×"],
    },
  },
  handsOn: [
    {
      title: "Idempotent POST with a key store",
      code: {
        lang: "python",
        file: "idempotency.py",
        code: `import hashlib, json, uuid

class IdempotencyStore:
    """In production: a DB table with UNIQUE(key) and the response stored in the same transaction."""
    def __init__(self) -> None:
        self.records: dict[str, tuple[str, dict]] = {}

    def run(self, key: str, body: dict, action) -> tuple[int, dict]:
        fingerprint = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        if key in self.records:
            stored_fp, stored_response = self.records[key]
            if stored_fp != fingerprint:
                return 422, {"error": "Idempotency-Key reused with a different request body"}
            return 200, stored_response                   # replay: no second charge
        response = action(body)
        self.records[key] = (fingerprint, response)
        return 201, response

charges: list[dict] = []
def charge(body: dict) -> dict:
    charges.append(body)
    return {"chargeId": f"ch_{len(charges)}", "amount": body["amount"]}

store = IdempotencyStore()
key = str(uuid.uuid4())
print(store.run(key, {"amount": 4900, "course": "devatlas-pro"}, charge))
print(store.run(key, {"amount": 4900, "course": "devatlas-pro"}, charge))   # client retry after timeout
print(store.run(key, {"amount": 9900, "course": "devatlas-pro"}, charge))
print("charges made:", len(charges))`,
      },
      output: "(201, {'chargeId': 'ch_1', 'amount': 4900})\n(200, {'chargeId': 'ch_1', 'amount': 4900})\n(422, {'error': 'Idempotency-Key reused with a different request body'})\ncharges made: 1",
    },
    {
      title: "Token bucket rate limiter",
      code: {
        lang: "python",
        file: "token_bucket.py",
        code: `from dataclasses import dataclass

@dataclass
class Bucket:
    tokens: float
    last: float

class TokenBucketLimiter:
    def __init__(self, rate_per_sec: float, burst: int) -> None:
        self.rate, self.burst = rate_per_sec, burst
        self.buckets: dict[str, Bucket] = {}

    def allow(self, key: str, now: float) -> tuple[bool, float]:
        """Returns (allowed, retry_after_seconds)."""
        b = self.buckets.setdefault(key, Bucket(tokens=self.burst, last=now))
        b.tokens = min(self.burst, b.tokens + (now - b.last) * self.rate)   # refill
        b.last = now
        if b.tokens >= 1:
            b.tokens -= 1
            return True, 0.0
        return False, (1 - b.tokens) / self.rate

limiter = TokenBucketLimiter(rate_per_sec=2, burst=3)
for t in [0, 0, 0, 0, 0.5, 1.0, 1.0, 1.0]:
    ok, retry = limiter.allow("partner-42", t)
    print(t, "allow" if ok else f"429 Retry-After {retry:.1f}s")`,
      },
      output: "0 allow\n0 allow\n0 allow\n0 429 Retry-After 0.5s\n0.5 allow\n1.0 allow\n1.0 429 Retry-After 0.5s\n1.0 429 Retry-After 0.5s",
    },
    {
      title: "Built-in rate limiting in ASP.NET Core",
      code: {
        lang: "csharp",
        code: `using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        partitionKey: ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
        factory: _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 20,                                   // burst
            TokensPerPeriod = 10, ReplenishmentPeriod = TimeSpan.FromSeconds(1),
            QueueLimit = 0,
        }));
});

app.UseRateLimiter();
app.MapGet("/v1/news", () => "...").RequireRateLimiting("per-user");`,
      },
      notes: ["These limiters are per instance. With several API replicas, use a distributed limiter (Redis) or enforce limits at the API gateway/CDN."],
    },
    {
      title: "Queue + worker with retries and a dead-letter queue (simulated)",
      code: {
        lang: "python",
        file: "worker.py",
        code: `import asyncio, random

async def send_digest(job: dict) -> None:
    if random.random() < 0.3:                          # flaky email provider
        raise ConnectionError("SMTP timeout")
    print(f"sent digest to {job['email']}")

async def worker(queue: asyncio.Queue, dead_letters: list, sent: set) -> None:
    while True:
        job = await queue.get()
        try:
            if job["id"] in sent:                       # idempotent consumer: skip duplicates
                continue
            await send_digest(job)
            sent.add(job["id"])
        except ConnectionError:
            job["attempts"] += 1
            if job["attempts"] >= 3:
                dead_letters.append(job)               # park for inspection, do not retry forever
            else:
                await asyncio.sleep(0.01 * 2 ** job["attempts"])   # backoff
                await queue.put(job)
        finally:
            queue.task_done()

async def main() -> None:
    random.seed(7)
    queue: asyncio.Queue = asyncio.Queue()
    dead, sent = [], set()
    for i in range(5):
        queue.put_nowait({"id": i, "email": f"user{i}@example.com", "attempts": 0})
    workers = [asyncio.create_task(worker(queue, dead, sent)) for _ in range(2)]
    await queue.join()
    for w in workers:
        w.cancel()
    print("sent:", len(sent), "dead-lettered:", [j["id"] for j in dead])

asyncio.run(main())`,
      },
      notes: ["In production the queue is a durable broker (SQS, Service Bus, RabbitMQ); the shape is identical: ack on success, retry with backoff, dead-letter after N attempts, idempotent processing. Exact output depends on the random failures."],
    },
    {
      title: "Cache-aside with invalidation and single-flight",
      code: {
        lang: "python",
        file: "cache.py",
        code: `import asyncio, time

class Cache:
    def __init__(self) -> None:
        self.data: dict[str, tuple[float, object]] = {}
        self.inflight: dict[str, asyncio.Future] = {}

    async def get_or_load(self, key: str, ttl: float, loader):
        hit = self.data.get(key)
        if hit and hit[0] > time.monotonic():
            return hit[1]
        if key in self.inflight:                          # single-flight: wait for the in-progress load
            return await self.inflight[key]
        fut = asyncio.get_running_loop().create_future()
        self.inflight[key] = fut
        try:
            value = await loader()
            self.data[key] = (time.monotonic() + ttl, value)
            fut.set_result(value)
            return value
        except Exception as e:
            fut.set_exception(e)
            raise
        finally:
            del self.inflight[key]

    def invalidate(self, key: str) -> None:
        self.data.pop(key, None)

db_calls = 0
async def load_lesson():
    global db_calls
    db_calls += 1
    await asyncio.sleep(0.05)
    return {"id": "4.4.2", "title": "Idempotency, rate limiting, queues and caching"}

async def main():
    cache = Cache()
    await asyncio.gather(*(cache.get_or_load("lesson:4.4.2", 60, load_lesson) for _ in range(100)))
    print("db calls for 100 concurrent requests:", db_calls)
    cache.invalidate("lesson:4.4.2")                     # after an update to the lesson
    await cache.get_or_load("lesson:4.4.2", 60, load_lesson)
    print("db calls after invalidation:", db_calls)

asyncio.run(main())`,
      },
      output: "db calls for 100 concurrent requests: 1\ndb calls after invalidation: 2",
    },
  ],
  companies: [
    "**Payments and orders**: Stripe's API popularised Idempotency-Key headers; most payment, order and booking APIs implement the same pattern because mobile networks make retries unavoidable.",
    "**API gateways and CDNs** (Azure API Management, AWS API Gateway, Cloudflare, Kong, NGINX) provide rate limiting, quotas per API key and 429 handling at the edge.",
    "**Event-driven backends**: the outbox pattern with a relay or change-data-capture (e.g. Debezium) is a standard way to publish domain events reliably; caches like Redis sit in front of databases for hot reads.",
  ],
  mistakes: [
    { mistake: "Retrying non-idempotent POSTs blindly", why: "Retries fix timeouts", wrong: "Double charges, duplicate orders", fix: "Idempotency keys stored atomically with the action" },
    { mistake: "Doing slow work in the request", why: "Simpler code path", wrong: "Timeouts, poor UX, lost work when the client disconnects", fix: "Enqueue a job, return 202, process in workers" },
    { mistake: "Save to DB then publish to the queue separately", why: "Two obvious steps", wrong: "Lost or phantom events when one step fails", fix: "Outbox pattern in the same transaction" },
    { mistake: "Non-idempotent consumers", why: "Assuming exactly-once delivery", wrong: "Duplicate emails, double-counted badges", fix: "Track processed message ids; design upserts" },
    { mistake: "Caching without an invalidation plan", why: "TTL feels like enough", wrong: "Users see stale data after edits; stampedes on expiry", fix: "Invalidate on write, sensible TTLs, single-flight for hot keys" },
    { mistake: "Per-instance rate limits behind a load balancer", why: "Built-in limiter works locally", wrong: "Effective limit multiplies with replica count", fix: "Distributed counters (Redis) or gateway-level limits" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Idempotency keys for side-effecting POSTs; idempotent consumers; retries with backoff and jitter; dead-letter queues." },
    { tag: "Reliability", text: "Return 429 with Retry-After; document limits per plan." },
    { tag: "Performance", text: "Cache hot reads close to the app; measure hit rates; protect hot keys from stampedes." },
    { tag: "Maintainability", text: "Outbox for domain events; message contracts versioned like APIs." },
  ],
  interview: [
    { q: "How do you make a payment endpoint safe to retry?", a: "Require an Idempotency-Key. Atomically record the key with a request fingerprint before or with the charge; on retry with the same key and body return the stored response; reject a reused key with a different body; handle concurrent duplicates with a unique constraint; expire keys after a retention period." },
    { q: "Compare rate-limiting algorithms.", a: "Fixed window counters are simple but allow bursts at window boundaries. Sliding window log is precise but stores timestamps per request. Sliding window counter approximates it cheaply. Token bucket allows bursts up to capacity and a steady refill rate, which suits APIs; leaky bucket smooths output to a constant rate." },
    { q: "What is the outbox pattern and why is it needed?", a: "When a service must update its database and publish an event, doing both separately can leave them inconsistent if one fails. The outbox writes the event into a table in the same transaction as the data change; a relay later publishes outbox rows and marks them sent, giving at-least-once publication. Consumers deduplicate." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A client retries POST /payments with the same Idempotency-Key and the same body. What should the server return?",
      options: ["A new charge", "The stored response of the first request", "409 always", "500"],
      answer: 1,
      explanation: "Replaying the original response makes retries safe.",
    },
    {
      kind: "output",
      prompt: "Token bucket with burst 3 and refill 2/s. At t=0, 4 requests arrive. How many are allowed?",
      options: ["4", "3", "2", "1"],
      answer: 1,
      explanation: "The bucket starts full with 3 tokens; the 4th gets 429.",
    },
    {
      kind: "bug",
      prompt: "Sometimes the 'lesson completed' event is never published, though the progress row is saved. Code: save progress, commit, then publish to the queue. Fix?",
      options: ["Publish first, then save", "Use the outbox pattern in the same transaction", "Increase the queue timeout", "Retry the HTTP request"],
      answer: 1,
      explanation: "A crash between commit and publish loses the event; the outbox makes both durable together.",
    },
  ],
  cheatSheet: [
    "Idempotency-Key + fingerprint + stored response; atomic with the action.",
    "Rate limit per key; 429 + Retry-After; distributed counters for many replicas.",
    "Token bucket: refill rate + burst capacity.",
    "Slow work → queue → 202 Accepted → workers.",
    "At-least-once delivery → idempotent consumers; DLQ after N attempts.",
    "Outbox: event row in the same transaction; relay publishes.",
    "Cache-aside + invalidate on write + single-flight for hot keys.",
  ],
  homework: {
    basic: {
      title: "Fixed window vs token bucket",
      brief: ["Implement a fixed-window limiter (N per minute) and show with timestamps how a client can send 2N requests within two seconds across a window boundary. Show the token bucket does not allow that."],
      criteria: ["Both limiters implemented", "Boundary burst demonstrated with explicit timestamps", "Explanation"],
      hints: ["Send N requests at t=59.9s and N at t=60.1s."],
      solution: {
        text: ["Fixed windows reset counters at boundaries, so requests just before and after the reset both pass. A token bucket only refills at its rate, so the burst is capped at its capacity."],
        code: {
          lang: "python",
          code: `class FixedWindow:
    def __init__(self, limit: int, window: float) -> None:
        self.limit, self.window, self.counts = limit, window, {}
    def allow(self, key: str, now: float) -> bool:
        bucket = (key, int(now // self.window))
        self.counts[bucket] = self.counts.get(bucket, 0) + 1
        return self.counts[bucket] <= self.limit

fw = FixedWindow(limit=5, window=60)
times = [59.9] * 5 + [60.1] * 5
print(sum(fw.allow("k", t) for t in times), "of 10 allowed within 0.2s")   # 10 of 10`,
        },
      },
    },
    intermediate: {
      title: "Idempotency in ASP.NET Core with EF Core",
      brief: ["Implement an endpoint filter that requires Idempotency-Key on POST /v1/purchases, stores (key, fingerprint, status, response) in an IdempotencyRecords table with a unique key, and replays responses. Handle a concurrent duplicate (unique violation) with 409."],
      criteria: ["Unique index on Key", "Replay returns identical status and body", "Different body with same key → 422"],
      hints: ["Insert the record with status 'in_progress' before running the action."],
      solution: {
        text: [
          "Insert first to claim the key (the unique index makes the claim atomic), run the action, then update the record with the response. A second request that fails to insert because of the unique violation re-reads the winning row: a different fingerprint returns 422, a row still `in_progress` returns 409, and a completed row replays the stored status and body verbatim.",
          "Two details that bite. First, fingerprint the model-bound request (the canonical JSON) rather than the raw body bytes: an endpoint filter cannot reliably read the raw body, but the handler already has the deserialised object, and canonical serialisation is stable across key order and whitespace. Second, record the response body only after the insert has assigned the generated Id, otherwise the replayed body has `id: 0` while the original had the real Id. Verified with .NET 9 + EF Core 9 + SQLite: `dotnet test` passes 4 tests — missing key 400, replay returns an identical body and leaves exactly one row, same key with a different body 422, and an in-progress key 409.",
        ],
        code: { lang: "csharp", file: "Idempotency.Api (Data.cs, RequireIdempotencyKeyFilter.cs, IdempotencyLogic.cs, Program.cs) + Idempotency.Api.Tests", code: `// dotnet new web -n Idempotency.Api   &&   dotnet new xunit -n Idempotency.Api.Tests
// dotnet add Idempotency.Api.Tests reference Idempotency.Api
// set <TargetFramework>net9.0</TargetFramework> in both .csproj files
// dotnet add Idempotency.Api package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"
// dotnet add Idempotency.Api.Tests package Microsoft.AspNetCore.Mvc.Testing --version "9.0.*"
// dotnet add Idempotency.Api.Tests package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"

// ---- Data.cs ----
using Microsoft.EntityFrameworkCore;

public sealed class Purchase
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public string Product { get; set; } = "";
    public decimal Amount { get; set; }
}

// One row per Idempotency-Key. The unique index on Key makes the claim atomic:
// whoever inserts first owns the key; everyone else must check and replay.
public sealed class IdempotencyRecord
{
    public long Id { get; set; }
    public string Key { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
    public string Status { get; set; } = "in_progress";   // in_progress | completed
    public int ResponseStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public string? ResponseContentType { get; set; }
}

public sealed class PurchasesDbContext(DbContextOptions<PurchasesDbContext> options) : DbContext(options)
{
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<IdempotencyRecord> IdempotencyRecords => Set<IdempotencyRecord>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IdempotencyRecord>().HasIndex(r => r.Key).IsUnique();
        modelBuilder.Entity<IdempotencyRecord>().HasIndex(r => r.Status);
    }
}

// ---- RequireIdempotencyKeyFilter.cs ----
public sealed class RequireIdempotencyKeyFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var key = context.HttpContext.Request.Headers["Idempotency-Key"].ToString();
        if (string.IsNullOrWhiteSpace(key))
            return ValueTask.FromResult<object?>(Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Missing Idempotency-Key",
                detail: "POST /v1/purchases requires an Idempotency-Key header"));
        return next(context);
    }
}

// ---- IdempotencyLogic.cs ----
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

public static class IdempotencyLogic
{
    public static IResult HandleExisting(IdempotencyRecord record, string fingerprint)
    {
        if (record.RequestFingerprint != fingerprint)
            return Results.Problem(statusCode: StatusCodes.Status422UnprocessableEntity,
                title: "Idempotency-Key reuse", detail: "the same key was used with a different request body");
        if (record.Status == "in_progress")
            return Results.Problem(statusCode: StatusCodes.Status409Conflict,
                title: "Request in progress", detail: "a request with this key is still running; retry shortly");
        return Results.Content(record.ResponseBody!, record.ResponseContentType, statusCode: record.ResponseStatusCode);
    }

    public static string Fingerprint(PurchaseRequest request) =>
        Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(request, JsonSerializerOptions.Web)));

    public static bool IsUniqueViolation(DbUpdateException e) =>
        e.InnerException is SqliteException sqlite &&
        (sqlite.SqliteErrorCode is 19 or 2067 || sqlite.SqliteExtendedErrorCode == 2067);
}

// ---- Program.cs ----
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<PurchasesDbContext>(o => o.UseSqlite("Data Source=purchases.db"));
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();

app.MapPost("/v1/purchases", async (PurchaseRequest request, PurchasesDbContext db, HttpContext http) =>
{
    var key = http.Request.Headers["Idempotency-Key"].ToString();
    var fingerprint = IdempotencyLogic.Fingerprint(request);

    // Replay or reject if the key was already seen.
    var existing = await db.IdempotencyRecords.SingleOrDefaultAsync(r => r.Key == key, http.RequestAborted);
    if (existing is not null)
        return IdempotencyLogic.HandleExisting(existing, fingerprint);

    // Claim the key: the unique index makes this insert atomic.
    try
    {
        db.IdempotencyRecords.Add(new IdempotencyRecord { Key = key, RequestFingerprint = fingerprint });
        await db.SaveChangesAsync(http.RequestAborted);
    }
    catch (DbUpdateException e) when (IdempotencyLogic.IsUniqueViolation(e))
    {
        var winner = await db.IdempotencyRecords.SingleAsync(r => r.Key == key, http.RequestAborted);
        return IdempotencyLogic.HandleExisting(winner, fingerprint);
    }

    // 1. Run the action.
    var purchase = new Purchase { UserId = request.UserId, Product = request.Product, Amount = request.Amount };
    db.Purchases.Add(purchase);
    await db.SaveChangesAsync(http.RequestAborted);                  // assigns purchase.Id

    // 2. Record the response so a retry replays it verbatim.
    var record = await db.IdempotencyRecords.SingleAsync(r => r.Key == key, http.RequestAborted);
    record.Status = "completed";
    record.ResponseStatusCode = StatusCodes.Status201Created;
    record.ResponseBody = JsonSerializer.Serialize(purchase, JsonSerializerOptions.Web);
    record.ResponseContentType = "application/json";
    await db.SaveChangesAsync(http.RequestAborted);

    return Results.Created($"/v1/purchases/{purchase.Id}", purchase);
}).AddEndpointFilter<RequireIdempotencyKeyFilter>();

app.Run();

public partial class Program { }

public sealed record PurchaseRequest(Guid UserId, string Product, decimal Amount);

// ---- Idempotency.Api.Tests/IdempotencyTests.cs (excerpt: the four behaviours) ----
[Fact]
public async Task Replay_returns_identical_status_and_body_and_creates_one_row()
{
    var first = await PostReadAsync("key-replay-1");
    Assert.Equal(HttpStatusCode.Created, first.status);
    var second = await PostReadAsync("key-replay-1");
    Assert.Equal(first.status, second.status);
    Assert.Equal(first.body, second.body);                       // byte-identical, including the real Id
    // ... assert Purchases.CountAsync() == 1 and IdempotencyRecords.CountAsync() == 1
}

[Fact]
public async Task Same_key_with_different_body_returns_422()
{
    await PostReadAsync("key-mismatch-1");
    var (status, _) = await PostReadAsync("key-mismatch-1", DIFFERENT_BODY);
    Assert.Equal(HttpStatusCode.UnprocessableEntity, status);
}

[Fact]
public async Task Same_key_while_in_progress_returns_409()
{
    // insert an IdempotencyRecord { Key = "key-busy-1", Status = "in_progress" } directly,
    // then POST with the same key -> the filter re-reads and returns 409 Conflict.
    var (status, _) = await PostReadAsync("key-busy-1");
    Assert.Equal(HttpStatusCode.Conflict, status);
}` },
        output: "$ dotnet test\n\nA total of 1 test files matched the specified pattern.\n\nPassed!  - Failed:     0, Passed:     4, Skipped:     0, Total:     4",
        pitfalls: ["Reading the raw request body in the filter with EnableBuffering() and expecting the JSON: the swapped-in buffering stream can be empty at that point, so the fingerprint hashes an empty string and every body looks identical. Fingerprint the model-bound request instead."],
      },
    },
    challenge: {
      title: "Implement the outbox relay",
      brief: ["Add an Outbox table to DevAtlas (Id, Type, Payload, CreatedAt, SentAt). When progress is completed, insert an outbox row in the same SaveChanges. Write a background service that polls unsent rows, publishes them (to a log or a real queue) and marks them sent, handling crashes between publish and update."],
      criteria: ["Same transaction for data and outbox", "Relay is safe to run after a crash (at-least-once)", "Consumers deduplicate by event id"],
      hints: ["Poll with ORDER BY CreatedAt LIMIT 100; use the event Id as the message id for consumer deduplication."],
      solution: {
        text: [
          "Because the relay might publish and then crash before marking the row sent, events can be published twice: that is why the event id travels with the message and consumers keep a processed-ids table. The domain change and its outbox row are written in one `SaveChanges`, the relay polls `WHERE SentAt IS NULL ORDER BY CreatedAt LIMIT 100`, and the consumer deduplicates on the event id (its primary key, so two concurrent duplicates cannot both insert). Many teams use a library (MassTransit, NServiceBus, Wolverine in .NET) that already implements these outbox and inbox patterns.",
          "Verified with .NET 9 + EF Core 9 + SQLite: `dotnet test` passes 3 tests — the progress row and outbox row commit together, a publisher that throws after delivering the message leaves the row unsent so the relay re-publishes it (at-least-once), and a consumer that sees the same event id twice awards the badge once. The hosted service wraps the relay in a `PeriodicTimer` and swallows `OperationCanceledException` on shutdown so it stops cleanly.",
        ],
        code: { lang: "csharp", file: "Outbox.Api (Data.cs, Relay.cs, Program.cs) + Outbox.Api.Tests", code: `// dotnet new web -n Outbox.Api   &&   dotnet new xunit -n Outbox.Api.Tests
// dotnet add Outbox.Api.Tests reference Outbox.Api
// set <TargetFramework>net9.0</TargetFramework> in both .csproj files
// dotnet add Outbox.Api package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"
// dotnet add Outbox.Api.Tests package Microsoft.AspNetCore.Mvc.Testing --version "9.0.*"
// dotnet add Outbox.Api.Tests package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"

// ---- Data.cs ----
using Microsoft.EntityFrameworkCore;

public sealed class Progress
{
    public long Id { get; set; }
    public string LessonId { get; set; } = "";
    public Guid UserId { get; set; }
    public DateTime CompletedAt { get; set; }
}

public sealed class OutboxMessage
{
    public Guid Id { get; set; }              // the event id, reused as the message id for dedupe
    public string Type { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
}

public sealed class ProcessedEvent
{
    public Guid Id { get; set; }
    public DateTime ProcessedAt { get; set; }
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Progress> Progress => Set<Progress>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<ProcessedEvent> ProcessedEvents => Set<ProcessedEvent>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.Entity<OutboxMessage>().HasIndex(m => new { m.SentAt, m.CreatedAt });
}

// ---- Relay.cs ----
public interface IEventPublisher
{
    Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default);
}

public sealed class LogEventPublisher(ILogger<LogEventPublisher> logger) : IEventPublisher
{
    public Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default)
    {
        logger.LogInformation("published {Type} {Id} {Payload}", type, eventId, payload);
        return Task.CompletedTask;
    }
}

public sealed class OutboxRelay
{
    public async Task<int> RelayBatchAsync(AppDbContext db, IEventPublisher publisher, CancellationToken ct = default)
    {
        var rows = await db.OutboxMessages
            .Where(m => m.SentAt == null).OrderBy(m => m.CreatedAt).Take(100).ToListAsync(ct);
        var published = 0;
        foreach (var row in rows)
        {
            await publisher.PublishAsync(row.Id, row.Type, row.Payload, ct);
            row.SentAt = DateTime.UtcNow;
            published++;
        }
        await db.SaveChangesAsync(ct);              // crash before this -> rows stay unsent
        return published;
    }
}

public sealed class OutboxRelayService(IServiceScopeFactory scopeFactory, IEventPublisher publisher, OutboxRelay relay)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        try
        {
            while (await timer.WaitForNextTickAsync(ct))
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await relay.RelayBatchAsync(db, publisher, ct);
            }
        }
        catch (OperationCanceledException) { }          // normal on shutdown
    }
}

public sealed class BadgeConsumer
{
    public async Task<bool> ProcessAsync(AppDbContext db, Guid eventId, CancellationToken ct = default)
    {
        if (await db.ProcessedEvents.AnyAsync(e => e.Id == eventId, ct)) return false;
        // ... award the badge (domain logic) ...
        db.ProcessedEvents.Add(new ProcessedEvent { Id = eventId, ProcessedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true;
    }
}

// ---- Program.cs ----
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=outbox.db"));
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<OutboxRelay>();
builder.Services.AddSingleton<IEventPublisher, LogEventPublisher>();
builder.Services.AddHostedService<OutboxRelayService>();

var app = builder.Build();
app.UseExceptionHandler();

app.MapPost("/v1/progress", async (ProgressRequest request, AppDbContext db) =>
{
    var progress = new Progress { LessonId = request.LessonId, UserId = request.UserId, CompletedAt = DateTime.UtcNow };
    db.Progress.Add(progress);
    db.OutboxMessages.Add(new OutboxMessage
    {
        Id = Guid.NewGuid(),
        Type = "lesson.completed",
        Payload = JsonSerializer.Serialize(
            new { lessonId = request.LessonId, userId = request.UserId }, JsonSerializerOptions.Web),
        CreatedAt = DateTime.UtcNow,
    });
    await db.SaveChangesAsync();                  // same transaction for both
    return Results.Created($"/v1/progress/{progress.Id}", progress);
});

app.Run();

public partial class Program { }

public sealed record ProgressRequest(string LessonId, Guid UserId);` },
        output: "$ dotnet test\n\nA total of 1 test files matched the specified pattern.\n\nPassed!  - Failed:     0, Passed:     3, Skipped:     0, Total:     3",
        pitfalls: [
          "Calling UseExceptionHandler() without AddProblemDetails(): on .NET 9 the middleware refuses to start. Add builder.Services.AddProblemDetails().",
          "Letting the PeriodicTimer's OperationCanceledException escape ExecuteAsync: it is thrown on shutdown and the host logs it as a crashed background service. Catch it.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: reliable background work",
      brief: ["Add a queue (Redis streams, RabbitMQ or a cloud queue) to DevAtlas: the API publishes lesson.completed via an outbox; a worker awards badges idempotently; the weekly digest is a scheduled job enqueueing one message per user. Add per-user rate limits on the AI /ask endpoint."],
      criteria: ["No slow work in HTTP handlers", "Duplicate events do not double-award badges", "429 with Retry-After on /ask abuse"],
      hints: ["Start with docker-compose services for the broker and worker."],
      solution: {
        text: [
          "With idempotency, queues, the outbox and rate limits, DevAtlas's backend handles retries, spikes and partial failures the way production systems must. Three ideas come together: the progress handler only writes the outbox row and returns 202 (no slow work on the request path); a worker drains the queue and awards the badge, deduplicating on the event id so a redelivered event cannot award twice; and a per-user rate limiter on `/v1/ask` answers abuse with 429 and a `Retry-After` header copied from the limiter's lease metadata.",
          "The queue is behind an `IEventBus` interface so the whole thing runs on an in-memory channel in tests and locally, and swaps to Redis Streams in production (docker-compose.yml runs Redis, the API and the worker together). Verified with .NET 9 + EF Core 9 + SQLite: `dotnet test` passes 3 tests — a duplicate `lesson.completed` awards one badge, the digest schedules one message per user, and the sixth request in a minute returns 429 with a `Retry-After` header.",
        ],
        code: { lang: "csharp", file: "DevAtlas.Api (Data.cs, Background.cs, Program.cs) + docker-compose.yml + tests", code: `// dotnet new web -n DevAtlas.Api   &&   dotnet new xunit -n DevAtlas.Api.Tests
// dotnet add DevAtlas.Api.Tests reference DevAtlas.Api
// set <TargetFramework>net9.0</TargetFramework> in both .csproj files
// dotnet add DevAtlas.Api package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"
// dotnet add DevAtlas.Api.Tests package Microsoft.AspNetCore.Mvc.Testing --version "9.0.*"
// dotnet add DevAtlas.Api.Tests package Microsoft.EntityFrameworkCore.Sqlite --version "9.0.*"

// ---- Data.cs ----
using Microsoft.EntityFrameworkCore;

public sealed class Progress { public long Id { get; set; } public string LessonId { get; set; } = ""; public Guid UserId { get; set; } public DateTime CompletedAt { get; set; } }
public sealed class OutboxMessage { public Guid Id { get; set; } public string Type { get; set; } = ""; public string Payload { get; set; } = ""; public DateTime CreatedAt { get; set; } public DateTime? SentAt { get; set; } }
public sealed class Badge { public Guid Id { get; set; } public Guid UserId { get; set; } public string Name { get; set; } = ""; }
public sealed class ProcessedEvent { public Guid Id { get; set; } public DateTime ProcessedAt { get; set; } }
public sealed class User { public Guid Id { get; set; } public string Email { get; set; } = ""; }

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Progress> Progress => Set<Progress>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<ProcessedEvent> ProcessedEvents => Set<ProcessedEvent>();
    public DbSet<User> Users => Set<User>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.Entity<OutboxMessage>().HasIndex(m => new { m.SentAt, m.CreatedAt });
}

// ---- Background.cs ----
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;

public interface IEventBus
{
    Task PublishAsync(string type, string payload, CancellationToken ct = default);
    Task DrainAsync(Func<string, string, CancellationToken, Task> handler, CancellationToken ct = default);
}

// In-memory for local/tests; production uses a Redis Streams implementation.
public sealed class InMemoryEventBus : IEventBus
{
    private readonly Channel<(string Type, string Payload)> _channel = Channel.CreateUnbounded<(string, string)>();
    public Task PublishAsync(string type, string payload, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync((type, payload), ct).AsTask();
    public async Task DrainAsync(Func<string, string, CancellationToken, Task> handler, CancellationToken ct = default)
    {
        while (_channel.Reader.TryRead(out var msg)) await handler(msg.Type, msg.Payload, ct);
    }
}

public sealed record LessonCompleted(Guid EventId, string LessonId, Guid UserId);

public sealed class BadgeAwarder
{
    public async Task<bool> AwardAsync(AppDbContext db, LessonCompleted evt, CancellationToken ct = default)
    {
        if (await db.ProcessedEvents.AnyAsync(e => e.Id == evt.EventId, ct)) return false;   // duplicate
        db.Badges.Add(new Badge { Id = Guid.NewGuid(), UserId = evt.UserId, Name = "First lesson" });
        db.ProcessedEvents.Add(new ProcessedEvent { Id = evt.EventId, ProcessedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class BadgeWorker(IServiceScopeFactory scopeFactory, IEventBus bus, BadgeAwarder awarder) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        try
        {
            while (await timer.WaitForNextTickAsync(ct))
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await bus.DrainAsync(async (type, payload, _) =>
                {
                    if (type != "lesson.completed") return;
                    var evt = JsonSerializer.Deserialize<LessonCompleted>(payload, JsonSerializerOptions.Web)!;
                    await awarder.AwardAsync(db, evt, ct);
                }, ct);
            }
        }
        catch (OperationCanceledException) { }
    }
}

public sealed class WeeklyDigestScheduler(IServiceScopeFactory scopeFactory, IEventBus bus) : BackgroundService
{
    public static async Task<int> ScheduleAsync(AppDbContext db, IEventBus bus, CancellationToken ct = default)
    {
        var users = await db.Users.Select(u => u.Id).ToListAsync(ct);
        foreach (var userId in users)
            await bus.PublishAsync("weekly.digest", JsonSerializer.Serialize(new { userId }, JsonSerializerOptions.Web), ct);
        return users.Count;
    }
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromDays(7));
        try
        {
            while (await timer.WaitForNextTickAsync(ct))
            {
                using var scope = scopeFactory.CreateScope();
                await ScheduleAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), bus, ct);
            }
        }
        catch (OperationCanceledException) { }
    }
}

// ---- Program.cs ----
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=app.db"));
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<IEventBus, InMemoryEventBus>();
builder.Services.AddSingleton<BadgeAwarder>();
builder.Services.AddHostedService<BadgeWorker>();
builder.Services.AddHostedService<WeeklyDigestScheduler>();

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        return ValueTask.CompletedTask;
    };
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Request.Headers["X-User-Id"].ToString(),
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

var app = builder.Build();
app.UseExceptionHandler();
app.UseRateLimiter();

// Fast path: no slow work here; the worker awards the badge later.
app.MapPost("/v1/progress", async (ProgressRequest request, AppDbContext db) =>
{
    var progress = new Progress { LessonId = request.LessonId, UserId = request.UserId, CompletedAt = DateTime.UtcNow };
    db.Progress.Add(progress);
    var eventId = Guid.NewGuid();
    db.OutboxMessages.Add(new OutboxMessage
    {
        Id = eventId, Type = "lesson.completed",
        Payload = JsonSerializer.Serialize(new LessonCompleted(eventId, request.LessonId, request.UserId), JsonSerializerOptions.Web),
        CreatedAt = DateTime.UtcNow,
    });
    await db.SaveChangesAsync();                        // progress + event in one transaction
    return Results.Accepted($"/v1/progress/{progress.Id}");
});

app.MapPost("/v1/ask", async (AskRequest request) =>
    Results.Ok(new { answer = $"you asked: {request.Question}" }))
    .RequireRateLimiting("per-user");

app.Run();
public partial class Program { }

public sealed record ProgressRequest(string LessonId, Guid UserId);
public sealed record AskRequest(string Question);

// ---- docker-compose.yml ----
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  api:
    build: ./DevAtlas.Api
    environment: [{ Redis__Connection: "redis:6379" }]
    depends_on: [redis]
    ports: ["8080:8080"]
  worker:
    build: ./DevAtlas.Api
    command: ["dotnet", "DevAtlas.Api.dll", "--worker"]
    environment: [{ Redis__Connection: "redis:6379" }]
    depends_on: [redis]` },
        output: "$ dotnet test\n\nA total of 1 test files matched the specified pattern.\n\nPassed!  - Failed:     0, Passed:     3, Skipped:     0, Total:     3",
        pitfalls: [
          "Expecting the rate limiter to set Retry-After by itself: it only sets the 429 status; you must copy the lease's RetryAfter metadata into the header in OnRejected.",
          "Keying the rate limit on the client IP instead of the authenticated user id: a shared NAT or proxy means one abuser blocks everyone behind it, and one user rotates IPs to escape.",
        ],
      },
    },
  },
  deeper: [
    { label: "Stripe Docs: Idempotent requests", url: "https://docs.stripe.com/api/idempotent_requests" },
    { label: "Rate limiting middleware in ASP.NET Core", url: "https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit" },
    { label: "microservices.io: Transactional outbox", url: "https://microservices.io/patterns/data/transactional-outbox.html" },
    { label: "AWS Builders' Library: Timeouts, retries and backoff with jitter", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" },
  ],
  nextPreview: "Next phase: databases in depth. Indexes and query plans: why your site is slow on Friday, and how to read EXPLAIN to fix it.",
};
