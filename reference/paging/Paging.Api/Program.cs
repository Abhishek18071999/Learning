using DevAtlas.Paging;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<LessonsDbContext>(o => o.UseSqlite("Data Source=lessons.db"));
builder.Services.AddProblemDetails();

// The signing key never lives in source control: require it from the environment in
// production, fall back to a dev-only key locally so `dotnet run` just works.
var signingKey = Environment.GetEnvironmentVariable("CURSOR_SIGNING_KEY")
    ?? (builder.Environment.IsProduction()
        ? throw new InvalidOperationException("CURSOR_SIGNING_KEY must be set in production")
        : "dev-only-signing-key");
builder.Services.AddSingleton(new CursorService(signingKey));

var app = builder.Build();
app.UseExceptionHandler();

app.MapGet("/v1/lessons", async (int? limit, string? after, LessonsDbContext db, CursorService cursors) =>
{
    var take = limit ?? 20;
    if (take is < 1 or > 100)
    {
        return Results.Problem(statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid limit", detail: "limit must be between 1 and 100");
    }

    var query = db.Lessons.AsNoTracking();

    if (after is not null)
    {
        if (!cursors.TryDecode(after, out var token))
        {
            return Results.Problem(statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid cursor", detail: "the after cursor is malformed or was tampered with");
        }
        var t = new DateTime(token.Ticks, DateTimeKind.Utc);
        query = query.Where(l => l.UpdatedAt < t || (l.UpdatedAt == t && l.Id < token.Id));
    }

    // Take limit + 1: one extra row means another page exists.
    var rows = await query
        .OrderByDescending(l => l.UpdatedAt)
        .ThenByDescending(l => l.Id)
        .Take(take + 1)
        .ToListAsync();

    var hasMore = rows.Count > take;
    var items = rows.Take(take)
        .Select(l => new { id = l.Id, title = l.Title, updatedAt = l.UpdatedAt })
        .ToList();
    var last = items[^1];
    var nextCursor = hasMore ? cursors.Encode(new CursorToken(last.updatedAt.Ticks, last.id)) : null;

    return Results.Ok(new { items, nextCursor });
});

app.Run();

public partial class Program { }
