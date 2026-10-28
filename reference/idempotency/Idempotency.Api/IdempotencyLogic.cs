using System.Security.Cryptography;
using System.Text.Json;
using DevAtlas.Idempotency;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DevAtlas.Idempotency;

internal static class IdempotencyLogic
{
    public static IResult HandleExisting(IdempotencyRecord record, string fingerprint)
    {
        if (record.RequestFingerprint != fingerprint)
        {
            return Results.Problem(statusCode: StatusCodes.Status422UnprocessableEntity,
                title: "Idempotency-Key reuse", detail: "the same key was used with a different request body");
        }
        if (record.Status == "in_progress")
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict,
                title: "Request in progress", detail: "a request with this key is still running; retry shortly");
        }
        return Results.Content(record.ResponseBody!, record.ResponseContentType, statusCode: record.ResponseStatusCode);
    }

    public static string Fingerprint(PurchaseRequest request) =>
        Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(request, JsonSerializerOptions.Web)));

    public static bool IsUniqueViolation(DbUpdateException e) =>
        e.InnerException is SqliteException sqlite &&
        (sqlite.SqliteErrorCode is 19 or 2067 || sqlite.SqliteExtendedErrorCode == 2067);
}
