using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DevAtlas.Paging;

public readonly record struct CursorToken(long Ticks, long Id);

/// <summary>
/// Opaque cursors: base64url(JSON {t, id}) plus an HMAC-SHA256 signature, so a tampered
/// cursor fails verification and the endpoint can answer 400 instead of trusting it.
/// </summary>
public sealed class CursorService(string signingKey)
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
    private readonly byte[] _key = Encoding.UTF8.GetBytes(signingKey);

    public string Encode(CursorToken token)
    {
        var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new CursorPayload(token.Ticks, token.Id)));
        var signature = Base64Url(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload)));
        return $"{payload}.{signature}";
    }

    public bool TryDecode(string cursor, out CursorToken token)
    {
        token = default;
        if (string.IsNullOrEmpty(cursor)) return false;

        var dot = cursor.LastIndexOf('.');
        if (dot <= 0 || dot == cursor.Length - 1) return false;

        var payload = cursor[..dot];
        var signature = cursor[(dot + 1)..];
        var expected = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload));

        try
        {
            var actual = FromBase64Url(signature);
            if (!CryptographicOperations.FixedTimeEquals(actual, expected)) return false;

            var dto = JsonSerializer.Deserialize<CursorPayload>(FromBase64Url(payload), Json);
            if (dto is null || dto.T <= 0 || dto.Id <= 0) return false;
            token = new CursorToken(dto.T, dto.Id);
            return true;
        }
        catch (Exception e) when (e is FormatException or JsonException)
        {
            return false;
        }
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += new string('=', (4 - s.Length % 4) % 4);
        return Convert.FromBase64String(s);
    }
}

public sealed record CursorPayload(long T, long Id);
