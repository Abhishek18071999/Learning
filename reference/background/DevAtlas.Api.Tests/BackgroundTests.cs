using System.Net;
using System.Text;
using DevAtlas.Background;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Background.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program> { }

public class BackgroundTests : IClassFixture<ApiFactory>
{
    private static readonly SqliteConnection KeepAlive = new("DataSource=:memory:");
    static BackgroundTests()
    {
        KeepAlive.Open();
        using var db = NewDb();
        db.Database.EnsureCreated();
    }

    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(KeepAlive).Options);

    private static async Task ResetAsync()
    {
        using var db = NewDb();
        await db.Badges.ExecuteDeleteAsync();
        await db.ProcessedEvents.ExecuteDeleteAsync();
        await db.Users.ExecuteDeleteAsync();
        await db.Progress.ExecuteDeleteAsync();
        await db.OutboxMessages.ExecuteDeleteAsync();
    }

    [Fact]
    public async Task Duplicate_events_do_not_double_award_badges()
    {
        await ResetAsync();
        var evt = new LessonCompleted(Guid.NewGuid(), "4.4.2", Guid.NewGuid());
        var awarder = new BadgeAwarder();
        using var db = NewDb();

        Assert.True(await awarder.AwardAsync(db, evt));       // awarded once
        Assert.False(await awarder.AwardAsync(db, evt));      // duplicate -> skipped
        Assert.Equal(1, await db.Badges.CountAsync());
    }

    [Fact]
    public async Task Digest_schedules_one_message_per_user()
    {
        await ResetAsync();
        using (var db = NewDb())
        {
            db.Users.AddRange(
                new User { Id = Guid.NewGuid(), Email = "a@x.dev" },
                new User { Id = Guid.NewGuid(), Email = "b@x.dev" },
                new User { Id = Guid.NewGuid(), Email = "c@x.dev" });
            await db.SaveChangesAsync();
        }

        var bus = new InMemoryEventBus();
        using var db2 = NewDb();
        Assert.Equal(3, await WeeklyDigestScheduler.ScheduleAsync(db2, bus));
    }

    [Fact]
    public async Task Ask_returns_429_with_retry_after_after_the_limit()
    {
        var client = new ApiFactory().CreateClient();

        static HttpRequestMessage Ask(string q)
        {
            var m = new HttpRequestMessage(HttpMethod.Post, "/v1/ask")
            {
                Content = new StringContent($"{{\"question\":\"{q}\"}}", Encoding.UTF8, "application/json"),
            };
            m.Headers.Add("X-User-Id", "u1");
            return m;
        }

        for (var i = 0; i < 5; i++)
        {
            var res = await client.SendAsync(Ask($"q{i}"));
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        var sixth = await client.SendAsync(Ask("again"));
        Assert.Equal(HttpStatusCode.TooManyRequests, sixth.StatusCode);
        Assert.True(sixth.Headers.Contains("Retry-After"), "expected a Retry-After header");
    }
}
