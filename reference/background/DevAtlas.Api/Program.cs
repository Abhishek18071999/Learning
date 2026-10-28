using System.Text.Json;
using System.Threading.RateLimiting;
using DevAtlas.Background;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=app.db"));
builder.Services.AddProblemDetails();

// Queue + workers. Production swaps InMemoryEventBus for a Redis Streams implementation.
builder.Services.AddSingleton<IEventBus, InMemoryEventBus>();
builder.Services.AddSingleton<BadgeAwarder>();
builder.Services.AddHostedService<BadgeWorker>();
builder.Services.AddHostedService<WeeklyDigestScheduler>();

// Per-user rate limit on the AI /ask endpoint: 5 requests/minute, hard reject with 429.
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
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

var app = builder.Build();
app.UseExceptionHandler();
app.UseRateLimiter();

// Fast path: no slow work here. The badge is awarded later by the worker.
app.MapPost("/v1/progress", async (ProgressRequest request, AppDbContext db) =>
{
    var progress = new Progress { LessonId = request.LessonId, UserId = request.UserId, CompletedAt = DateTime.UtcNow };
    db.Progress.Add(progress);

    var eventId = Guid.NewGuid();
    db.OutboxMessages.Add(new OutboxMessage
    {
        Id = eventId,
        Type = "lesson.completed",
        Payload = JsonSerializer.Serialize(new LessonCompleted(eventId, request.LessonId, request.UserId),
            JsonSerializerOptions.Web),
        CreatedAt = DateTime.UtcNow,
    });
    await db.SaveChangesAsync();                  // progress + event in one transaction
    return Results.Accepted($"/v1/progress/{progress.Id}");
});

// Rate-limited AI endpoint: the limiter answers 429 with a Retry-After header on abuse.
app.MapPost("/v1/ask", async (AskRequest request) =>
    Results.Ok(new { answer = $"you asked: {request.Question}" }))
    .RequireRateLimiting("per-user");

app.Run();

public partial class Program { }

public sealed record ProgressRequest(string LessonId, Guid UserId);
public sealed record AskRequest(string Question);
