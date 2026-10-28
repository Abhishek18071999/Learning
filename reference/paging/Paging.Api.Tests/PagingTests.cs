using System.Net;
using System.Text.Json;
using DevAtlas.Paging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DevAtlas.Paging.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly SqliteConnection KeepAlive = new("DataSource=:memory:");

    static ApiFactory()
    {
        Environment.SetEnvironmentVariable("CURSOR_SIGNING_KEY", "test-key-441");
        KeepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<LessonsDbContext>));
            services.Remove(descriptor);
            services.AddDbContext<LessonsDbContext>(o => o.UseSqlite(KeepAlive));
        });
    }
}

public class PagingTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateTime Base = new(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);

    private async Task SeedAsync(params (long id, string title, DateTime updatedAt)[] rows)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LessonsDbContext>();
        await db.Database.EnsureCreatedAsync();
        await db.Lessons.ExecuteDeleteAsync();                     // tests share one in-memory database
        db.Lessons.AddRange(rows.Select(r => new Lesson { Id = r.id, Title = r.title, UpdatedAt = r.updatedAt }));
        await db.SaveChangesAsync();
    }

    private static async Task<(JsonElement body, HttpStatusCode status)> GetAsync(HttpClient client, string url)
    {
        var res = await client.GetAsync(url);
        return (JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement, res.StatusCode);
    }

    [Fact]
    public async Task Walks_all_pages_without_skipping_or_repeating_tied_rows()
    {
        var seed = Enumerable.Range(1, 7)
            .Select(i => (id: (long)i, title: $"lesson {i}", updatedAt: Base.AddHours((i - 1) / 2)))
            .ToArray();
        await SeedAsync(seed);

        var client = factory.CreateClient();
        var seen = new List<long>();
        string? cursor = null;
        var pages = 0;

        do
        {
            var url = $"/v1/lessons?limit=3{(cursor is null ? "" : $"&after={Uri.EscapeDataString(cursor)}")}";
            var (body, status) = await GetAsync(client, url);
            Assert.Equal(HttpStatusCode.OK, status);
            foreach (var item in body.GetProperty("items").EnumerateArray())
                seen.Add(item.GetProperty("id").GetInt64());
            cursor = body.GetProperty("nextCursor").ValueKind == JsonValueKind.Null
                ? null
                : body.GetProperty("nextCursor").GetString();
            pages++;
        } while (cursor is not null && pages < 10);

        Assert.Equal(new long[] { 7, 6, 5, 4, 3, 2, 1 }, seen);
        Assert.Equal(3, pages);
    }

    [Fact]
    public async Task Exactly_limit_rows_return_no_nextCursor()
    {
        await SeedAsync(
            (1, "a", Base.AddHours(1)), (2, "b", Base.AddHours(2)), (3, "c", Base.AddHours(3)));

        var client = factory.CreateClient();
        var (body, status) = await GetAsync(client, "/v1/lessons?limit=3");
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(3, body.GetProperty("items").GetArrayLength());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task Tampered_cursor_returns_400_ProblemDetails()
    {
        await SeedAsync((1, "a", Base), (2, "b", Base.AddHours(1)), (3, "c", Base.AddHours(2)), (4, "d", Base.AddHours(3)));

        var client = factory.CreateClient();
        var (first, _) = await GetAsync(client, "/v1/lessons?limit=2");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var tampered = cursor[..^4] + "AAAA";

        var res = await client.GetAsync($"/v1/lessons?after={Uri.EscapeDataString(tampered)}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Invalid cursor", body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Garbage_cursor_returns_400()
    {
        var client = factory.CreateClient();
        var res = await client.GetAsync("/v1/lessons?after=not-a-cursor");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task Out_of_range_limit_returns_400(int limit)
    {
        var client = factory.CreateClient();
        var res = await client.GetAsync($"/v1/lessons?limit={limit}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
