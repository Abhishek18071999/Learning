using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Idempotency;

public sealed class Purchase
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public string Product { get; set; } = "";
    public decimal Amount { get; set; }
}

/// <summary>
/// One row per Idempotency-Key. The unique index on Key makes the claim atomic:
/// whoever inserts first owns the key; everyone else must check and replay.
/// </summary>
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
