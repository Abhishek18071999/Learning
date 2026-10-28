using DevAtlas.Outbox;
using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Outbox;

public interface IEventPublisher
{
    Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default);
}

/// <summary>Production publisher: writes the event to the log (or a real queue) once.</summary>
public sealed class LogEventPublisher(ILogger<LogEventPublisher> logger) : IEventPublisher
{
    public Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default)
    {
        logger.LogInformation("published {Type} {Id} {Payload}", type, eventId, payload);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Polls unsent rows in CreatedAt order and publishes them, marking each sent only after a
/// successful publish. If the process dies between the publish and the UPDATE, the row is
/// still unsent and is published again on the next poll: delivery is at-least-once.
/// </summary>
public sealed class OutboxRelay
{
    public async Task<int> RelayBatchAsync(AppDbContext db, IEventPublisher publisher, CancellationToken ct = default)
    {
        var rows = await db.OutboxMessages
            .Where(m => m.SentAt == null)
            .OrderBy(m => m.CreatedAt)
            .Take(100)
            .ToListAsync(ct);

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

/// <summary>Runs the relay on a timer. In production this is a hosted service.</summary>
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

/// <summary>
/// Idempotent consumer: awards the badge only if the event id has not been seen. The
/// ProcessedEvent primary key is the event id, so two concurrent duplicates cannot both
/// insert it.
/// </summary>
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
