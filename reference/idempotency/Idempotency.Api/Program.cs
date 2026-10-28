using System.Text.Json;
using DevAtlas.Idempotency;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<PurchasesDbContext>(o => o.UseSqlite("Data Source=purchases.db"));
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();

app.MapPost("/v1/purchases", async (PurchaseRequest request, PurchasesDbContext db, HttpContext http) =>
{
    var key = http.Request.Headers["Idempotency-Key"].ToString();
    var fingerprint = IdempotencyLogic.Fingerprint(request);

    // Replay or reject if the key was already seen.
    var existing = await db.IdempotencyRecords.SingleOrDefaultAsync(r => r.Key == key, http.RequestAborted);
    if (existing is not null)
        return IdempotencyLogic.HandleExisting(existing, fingerprint);

    // Claim the key: the unique index makes this insert atomic.
    try
    {
        db.IdempotencyRecords.Add(new IdempotencyRecord { Key = key, RequestFingerprint = fingerprint });
        await db.SaveChangesAsync(http.RequestAborted);
    }
    catch (DbUpdateException e) when (IdempotencyLogic.IsUniqueViolation(e))
    {
        var winner = await db.IdempotencyRecords.SingleAsync(r => r.Key == key, http.RequestAborted);
        return IdempotencyLogic.HandleExisting(winner, fingerprint);
    }

    // 1. Run the action.
    var purchase = new Purchase { UserId = request.UserId, Product = request.Product, Amount = request.Amount };
    db.Purchases.Add(purchase);
    await db.SaveChangesAsync(http.RequestAborted);                  // assigns purchase.Id

    // 2. Record the response so a retry replays it verbatim.
    var record = await db.IdempotencyRecords.SingleAsync(r => r.Key == key, http.RequestAborted);
    record.Status = "completed";
    record.ResponseStatusCode = StatusCodes.Status201Created;
    record.ResponseBody = JsonSerializer.Serialize(purchase, JsonSerializerOptions.Web);
    record.ResponseContentType = "application/json";
    await db.SaveChangesAsync(http.RequestAborted);

    return Results.Created($"/v1/purchases/{purchase.Id}", purchase);
}).AddEndpointFilter<RequireIdempotencyKeyFilter>();

app.Run();

public partial class Program { }

public sealed record PurchaseRequest(Guid UserId, string Product, decimal Amount);
