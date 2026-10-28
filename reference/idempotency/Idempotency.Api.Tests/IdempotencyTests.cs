using System.Net;
using System.Text;
using System.Text.Json;
using DevAtlas.Idempotency;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DevAtlas.Idempotency.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly SqliteConnection KeepAlive = new("DataSource=:memory:");

    static ApiFactory()
    {
        KeepAlive.Open();
        using var db = new PurchasesDbContext(
            new DbContextOptionsBuilder<PurchasesDbContext>().UseSqlite(KeepAlive).Options);
        db.Database.EnsureCreated();                       // schema created exactly once
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.Single(d => d.ServiceType == typeof(DbContextOptions<PurchasesDbContext>));
            services.Remove(descriptor);
            services.AddDbContext<PurchasesDbContext>(o => o.UseSqlite(KeepAlive));
        });
    }
}

public class IdempotencyTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly string Request =
        """{"userId":"11111111-1111-1111-1111-111111111111","product":"pro plan","amount":49}""";

    private async Task ResetAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PurchasesDbContext>();
        await db.Purchases.ExecuteDeleteAsync();
        await db.IdempotencyRecords.ExecuteDeleteAsync();
    }

    private async Task<(HttpStatusCode status, string body)> PostReadAsync(string key, string? body = null)
    {
        var client = factory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post, "/v1/purchases")
        {
            Content = new StringContent(body ?? Request, Encoding.UTF8, "application/json"),
        };
        req.Headers.Add("Idempotency-Key", key);
        var res = await client.SendAsync(req);
        return (res.StatusCode, await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Missing_key_returns_400()
    {
        var client = factory.CreateClient();
        var res = await client.PostAsync("/v1/purchases",
            new StringContent(Request, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Replay_returns_identical_status_and_body_and_creates_one_row()
    {
        await ResetAsync();
        var first = await PostReadAsync("key-replay-1");
        Assert.Equal(HttpStatusCode.Created, first.status);

        var second = await PostReadAsync("key-replay-1");
        Assert.Equal(first.status, second.status);
        Assert.Equal(first.body, second.body);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PurchasesDbContext>();
        Assert.Equal(1, await db.Purchases.CountAsync());
        Assert.Equal(1, await db.IdempotencyRecords.CountAsync());
    }

    [Fact]
    public async Task Same_key_with_different_body_returns_422()
    {
        await ResetAsync();
        await PostReadAsync("key-mismatch-1");
        var (status, _) = await PostReadAsync("key-mismatch-1",
            """{"userId":"11111111-1111-1111-1111-111111111111","product":"free plan","amount":0}""");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, status);
    }

    [Fact]
    public async Task Same_key_while_in_progress_returns_409()
    {
        await ResetAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PurchasesDbContext>();
            db.IdempotencyRecords.Add(new IdempotencyRecord
            {
                Key = "key-busy-1",
                RequestFingerprint = Fingerprint(Request),
                Status = "in_progress",
            });
            await db.SaveChangesAsync();
        }

        var (status, _) = await PostReadAsync("key-busy-1");
        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    private static string Fingerprint(string body) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
                System.Text.Json.JsonSerializer.Deserialize<PurchaseRequest>(body, System.Text.Json.JsonSerializerOptions.Web)!,
                System.Text.Json.JsonSerializerOptions.Web)));
}
