using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Paging;

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
