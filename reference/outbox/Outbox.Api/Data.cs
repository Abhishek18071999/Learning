using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Outbox;

public sealed class Progress
{
    public long Id { get; set; }
    public string LessonId { get; set; } = "";
    public Guid UserId { get; set; }
    public DateTime CompletedAt { get; set; }
}

/// <summary>
/// One row per domain event that still needs to be published. The relay polls rows
/// where SentAt is null; the row and the domain change are written in one transaction.
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; set; }              // the event id, reused as the message id for dedupe
    public string Type { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
}

/// <summary>Consumers record every event id they have processed, so a duplicate is a no-op.</summary>
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OutboxMessage>().HasIndex(m => new { m.SentAt, m.CreatedAt });
    }
}
