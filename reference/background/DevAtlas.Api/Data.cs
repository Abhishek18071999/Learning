using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Background;

public sealed class Progress
{
    public long Id { get; set; }
    public string LessonId { get; set; } = "";
    public Guid UserId { get; set; }
    public DateTime CompletedAt { get; set; }
}

public sealed class OutboxMessage
{
    public Guid Id { get; set; }
    public string Type { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
}

public sealed class Badge
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
}

/// <summary>The event id is the primary key, so a duplicate event cannot be processed twice.</summary>
public sealed class ProcessedEvent
{
    public Guid Id { get; set; }
    public DateTime ProcessedAt { get; set; }
}

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
}

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
