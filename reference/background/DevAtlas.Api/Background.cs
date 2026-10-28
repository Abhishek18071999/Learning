using System.Text.Json;
using System.Threading.Channels;
using DevAtlas.Background;
using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Background;

/// <summary>
/// A queue abstraction. Production uses Redis Streams (see docker-compose.yml and the
/// RedisStreamEventBus note); tests and local runs use the in-memory implementation.
/// </summary>
public interface IEventBus
{
    Task PublishAsync(string type, string payload, CancellationToken ct = default);
    Task DrainAsync(Func<string, string, CancellationToken, Task> handler, CancellationToken ct = default);
}

public sealed class InMemoryEventBus : IEventBus
{
    private readonly Channel<(string Type, string Payload)> _channel =
        Channel.CreateUnbounded<(string, string)>();

    public Task PublishAsync(string type, string payload, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync((type, payload), ct).AsTask();

    public async Task DrainAsync(Func<string, string, CancellationToken, Task> handler, CancellationToken ct = default)
    {
        while (_channel.Reader.TryRead(out var msg))
            await handler(msg.Type, msg.Payload, ct);
    }
}

public sealed record LessonCompleted(Guid EventId, string LessonId, Guid UserId);

/// <summary>
/// Awards a badge idempotently: the ProcessedEvent primary key is the event id, so a
/// duplicate lesson.completed event cannot award the badge twice.
/// </summary>
public sealed class BadgeAwarder
{
    public async Task<bool> AwardAsync(AppDbContext db, LessonCompleted evt, CancellationToken ct = default)
    {
        if (await db.ProcessedEvents.AnyAsync(e => e.Id == evt.EventId, ct)) return false;
        db.Badges.Add(new Badge { Id = Guid.NewGuid(), UserId = evt.UserId, Name = "First lesson" });
        db.ProcessedEvents.Add(new ProcessedEvent { Id = evt.EventId, ProcessedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true;
    }
}

/// <summary>Consumes lesson.completed events off the bus and awards badges off the request path.</summary>
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

/// <summary>Weekly digest: a scheduled job that enqueues one message per user.</summary>
public sealed class WeeklyDigestScheduler(IServiceScopeFactory scopeFactory, IEventBus bus) : BackgroundService
{
    public static async Task<int> ScheduleAsync(AppDbContext db, IEventBus bus, CancellationToken ct = default)
    {
        var users = await db.Users.Select(u => u.Id).ToListAsync(ct);
        foreach (var userId in users)
            await bus.PublishAsync("weekly.digest",
                JsonSerializer.Serialize(new { userId }, JsonSerializerOptions.Web), ct);
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
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await ScheduleAsync(db, bus, ct);
            }
        }
        catch (OperationCanceledException) { }
    }
}
