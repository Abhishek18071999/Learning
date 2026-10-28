using DevAtlas.Idempotency;

/// <summary>
/// Requires an Idempotency-Key header on the route it is attached to. The claim / replay
/// / fingerprint logic lives in the handler, which fingerprints the model-bound request
/// (the canonical JSON) rather than the raw body bytes.
/// </summary>
public sealed class RequireIdempotencyKeyFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var key = context.HttpContext.Request.Headers["Idempotency-Key"].ToString();
        if (string.IsNullOrWhiteSpace(key))
        {
            return ValueTask.FromResult<object?>(Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Missing Idempotency-Key",
                detail: "POST /v1/purchases requires an Idempotency-Key header"));
        }
        return next(context);
    }
}
