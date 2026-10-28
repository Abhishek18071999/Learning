using System.Text.Json;
using DevAtlas.Outbox;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=outbox.db"));
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<OutboxRelay>();
builder.Services.AddSingleton<IEventPublisher, LogEventPublisher>();
builder.Services.AddHostedService<OutboxRelayService>();

var app = builder.Build();
app.UseExceptionHandler();

app.MapPost("/v1/progress", async (ProgressRequest request, AppDbContext db) =>
{
    // Domain change and its event are written in ONE SaveChanges: either both commit
    // or neither does, so there is never a progress row without a corresponding event.
    var progress = new Progress { LessonId = request.LessonId, UserId = request.UserId, CompletedAt = DateTime.UtcNow };
    db.Progress.Add(progress);

    db.OutboxMessages.Add(new OutboxMessage
    {
        Id = Guid.NewGuid(),
        Type = "lesson.completed",
        Payload = JsonSerializer.Serialize(
            new { lessonId = request.LessonId, userId = request.UserId }, JsonSerializerOptions.Web),
        CreatedAt = DateTime.UtcNow,
    });

    await db.SaveChangesAsync();
    return Results.Created($"/v1/progress/{progress.Id}", progress);
});

app.Run();

public partial class Program { }

public sealed record ProgressRequest(string LessonId, Guid UserId);
