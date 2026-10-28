using System.Net;
using System.Text;
using DevAtlas.Outbox;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DevAtlas.Outbox.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly SqliteConnection KeepAlive = new("DataSource=:memory:");
    static ApiFactory()
    {
        KeepAlive.Open();
        using var db = NewDb();
        db.Database.EnsureCreated();
    }
    internal static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(KeepAlive).Options);
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureServices(services =>
        {
            var d = services.Single(x => x.ServiceType == typeof(DbContextOptions<AppDbContext>));
            services.Remove(d);
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(KeepAlive));
        });
}

public sealed class CrashAfterPublishPublisher : IEventPublisher
{
    public int Published;
    public Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default)
    {
        Published++;                                  // the queue accepted the message ...
        throw new InvalidOperationException("crash after publish, before marking sent");
    }
}

public sealed class RecordingPublisher : IEventPublisher
{
    public readonly List<Guid> Published = new();
    public Task PublishAsync(Guid eventId, string type, string payload, CancellationToken ct = default)
    {
        Published.Add(eventId);
        return Task.CompletedTask;
    }
}

public class OutboxTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static async Task ResetAsync()
    {
        using var db = ApiFactory.NewDb();
        await db.OutboxMessages.ExecuteDeleteAsync();
        await db.Progress.ExecuteDeleteAsync();
        await db.ProcessedEvents.ExecuteDeleteAsync();
    }

    [Fact]
    public async Task Progress_and_outbox_are_written_in_the_same_transaction()
    {
        await ResetAsync();
        var client = factory.CreateClient();
        var res = await client.PostAsync("/v1/progress", new StringContent(
            """{"lessonId":"4.4.2","userId":"11111111-1111-1111-1111-111111111111"}""",
            Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);

        using var db = ApiFactory.NewDb();
        Assert.Equal(1, await db.Progress.CountAsync());
        Assert.Equal(1, await db.OutboxMessages.CountAsync());
        Assert.Equal("lesson.completed", (await db.OutboxMessages.SingleAsync()).Type);
    }

    [Fact]
    public async Task Crash_between_publish_and_mark_republishes_the_same_event()
    {
        await ResetAsync();
        var eventId = Guid.NewGuid();
        using (var db = ApiFactory.NewDb())
        {
            db.OutboxMessages.Add(new OutboxMessage { Id = eventId, Type = "lesson.completed", Payload = "{}", CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
        }

        var relay = new OutboxRelay();

        // First pass: publish succeeds but the process dies before marking -> the row stays unsent.
        var crashing = new CrashAfterPublishPublisher();
        using (var db = ApiFactory.NewDb())
            await Assert.ThrowsAsync<InvalidOperationException>(() => relay.RelayBatchAsync(db, crashing));
        Assert.Equal(1, crashing.Published);                              // it WAS published

        using (var db = ApiFactory.NewDb())
            Assert.Null((await db.OutboxMessages.SingleAsync()).SentAt);   // ...but never marked sent

        // Second pass publishes the same event again: at-least-once delivery.
        var recording = new RecordingPublisher();
        using (var db = ApiFactory.NewDb())
            Assert.Equal(1, await relay.RelayBatchAsync(db, recording));
        Assert.Equal(new[] { eventId }, recording.Published.ToArray());
    }

    [Fact]
    public async Task Consumer_deduplicates_by_event_id()
    {
        await ResetAsync();
        var eventId = Guid.NewGuid();
        var consumer = new BadgeConsumer();
        using var db = ApiFactory.NewDb();

        Assert.True(await consumer.ProcessAsync(db, eventId));            // awarded once
        Assert.False(await consumer.ProcessAsync(db, eventId));           // duplicate -> skipped
        Assert.Equal(1, await db.ProcessedEvents.CountAsync());
    }
}
