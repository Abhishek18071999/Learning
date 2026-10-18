import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.1.3",
  title: "Authentication: JWT, OAuth2 and OIDC",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["4.1.2 EF Core, validation and testing", "3.5.1 XSS, CORS, CSP and Core Web Vitals"],
  summary: "Understand authentication vs authorisation, sessions vs tokens, how JWTs work and fail, OAuth 2.0 and OpenID Connect flows, password storage, and policy-based authorisation in ASP.NET Core.",
  terms: [
    { term: "Authentication (AuthN)", def: "Proving who you are (login)." },
    { term: "Authorisation (AuthZ)", def: "Deciding what an authenticated identity may do." },
    { term: "Session cookie", def: "A random id stored in an HttpOnly cookie that maps to server-side session data." },
    { term: "JWT", def: "JSON Web Token: a signed, base64url-encoded JSON payload (claims) that a server can verify without a database lookup. Signed, not encrypted." },
    { term: "Claim", def: "A statement in a token, like sub (user id), email, role, exp (expiry)." },
    { term: "OAuth 2.0", def: "A framework for delegated authorisation: an app gets an access token to call an API on a user's behalf without seeing their password." },
    { term: "OpenID Connect (OIDC)", def: "An identity layer on OAuth 2.0 that adds login: an ID token and standard user info (Sign in with Google/Microsoft)." },
    { term: "PKCE", def: "Proof Key for Code Exchange: protects the OAuth authorisation code flow for browser and mobile apps." },
  ],
  problem: [
    "DevAtlas progress endpoints currently trust a `userId` in the URL: anyone can read or overwrite anyone's progress by changing a number. The first login prototype stores SHA-256 password hashes without salt and puts a never-expiring JWT in localStorage.",
    "Broken authentication and broken access control consistently rank among the most serious web security risks (OWASP Top 10). Getting identity right means using proven protocols and libraries, short-lived tokens, safe storage, and checking authorisation on every request on the server.",
  ],
  concept: {
    analogy: [
      "A **session cookie** is a **cloakroom ticket**: a meaningless number; the cloakroom (server) keeps your coat (session data). A **JWT** is a **signed festival wristband**: the guards can check it is genuine and see your access level by looking at it, without calling the office, but they cannot easily take it back before it expires.",
      "**OAuth** is a **valet key**: you give the parking attendant a key that only starts the car and opens the doors, not the boot, instead of your house keys. **OIDC** adds an **ID card** so the app also knows who you are.",
    ],
    precise: [
      "**Passwords**: never store them; store a slow, salted hash (Argon2id, bcrypt, or PBKDF2 with a high iteration count). ASP.NET Core Identity's PasswordHasher does this. Add rate limiting and account lockout to stop guessing, and prefer passkeys/MFA where possible.",
      "**JWT**: header.payload.signature. The server verifies the signature (HMAC secret or, better for distributed systems, an asymmetric key from the identity provider), issuer, audience and expiry. Keep access tokens short-lived (minutes) and use refresh tokens (stored in HttpOnly cookies, rotated) to get new ones. JWTs cannot be revoked individually without extra infrastructure, which is the main trade-off versus sessions.",
      "**OAuth 2.0 + OIDC**: for user login in web and mobile apps use the **Authorization Code flow with PKCE**: redirect to the identity provider, user logs in there, app receives a one-time code, exchanges it for tokens. The implicit flow and password grant are deprecated for new apps. Use a provider (Microsoft Entra ID, Auth0, Okta, Keycloak, Cognito) instead of building your own identity server.",
      "**Authorisation**: check on the server for every request: authenticated? Has the role/permission? Owns this resource? 'Users can only access their own progress' must be enforced by comparing the token's subject with the resource's owner, not by hiding buttons in the UI.",
    ],
  },
  underTheHood: {
    text: [
      "A JWT payload is only base64url-encoded: anyone can decode it (try jwt.io with a test token). Never put secrets in it. The signature only proves it was issued by someone holding the key and has not been modified.",
      "Validation steps: parse, check alg is the expected one (never accept 'none'), verify signature with the right key (from the issuer's JWKS endpoint for OIDC), check exp/nbf with small clock skew, check iss and aud. ASP.NET Core's JwtBearer handler does this when configured with Authority and Audience.",
      "In the authorization code + PKCE flow, the app creates a random code_verifier and sends its hash (code_challenge) with the login redirect; when exchanging the code, it sends the verifier. An attacker who intercepts the code cannot exchange it without the verifier.",
    ],
    diagram: {
      title: "Authorization Code + PKCE (OIDC login)",
      nodes: [
        { label: "App", sub: "redirect + code_challenge" },
        { label: "Identity provider", sub: "user logs in, MFA" },
        { label: "App callback", sub: "receives one-time code" },
        { label: "Token endpoint", sub: "code + code_verifier" },
        { label: "Tokens", sub: "ID token, access token, refresh" },
      ],
      edges: ["", "redirect back", "", ""],
    },
  },
  handsOn: [
    {
      title: "Decode a JWT to see that it is not encrypted",
      code: {
        lang: "python",
        file: "decode_jwt.py",
        code: `import base64, json

token = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
         "eyJzdWIiOiI0MiIsImVtYWlsIjoiYXNoYUBleGFtcGxlLmNvbSIsInJvbGUiOiJsZWFybmVyIiwiZXhwIjoxOTAwMDAwMDAwfQ."
         "signature-not-checked-here")

def b64url_decode(part: str) -> bytes:
    return base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))

header, payload, _sig = token.split(".")
print(json.loads(b64url_decode(header)))
print(json.loads(b64url_decode(payload)))`,
      },
      output: "{'alg': 'HS256', 'typ': 'JWT'}\n{'sub': '42', 'email': 'asha@example.com', 'role': 'learner', 'exp': 1900000000}",
      notes: ["Anyone holding the token can read its claims. Verification (signature, issuer, audience, expiry) is what makes it trustworthy; libraries do that for you."],
    },
    {
      title: "Protect the API with JWT bearer authentication (tokens from an OIDC provider)",
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `// dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
using System.Security.Claims;

builder.Services.AddAuthentication().AddJwtBearer(options =>
{
    options.Authority = builder.Configuration["Auth:Authority"];   // e.g. https://login.example.com/ (issuer)
    options.Audience = builder.Configuration["Auth:Audience"];     // e.g. api://devatlas
    // Signature keys are fetched from the authority's metadata (JWKS); issuer, audience
    // and lifetime are validated by default.
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("ContentAdmin", p => p.RequireRole("content-admin"));

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

// Only the authenticated user's own progress: the user id comes from the token, not the URL
app.MapGet("/me/progress", async (ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
{
    var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
    return TypedResults.Ok(await db.Progress.AsNoTracking().Where(p => p.UserId == userId)
        .Select(p => new { p.LessonId, p.Status, p.Score }).ToListAsync(ct));
}).RequireAuthorization();

app.MapPost("/lessons", (CreateLessonRequest req) => TypedResults.Ok())   // admin-only
   .RequireAuthorization("ContentAdmin");`,
      },
      notes: ["By default the handler maps the JWT `sub` claim to ClaimTypes.NameIdentifier; claim mapping differs between versions and providers, so log the claims once in development to confirm. The numeric user id here assumes your identity provider's subject maps to your users table (often via a lookup by sub)."],
    },
    {
      title: "Resource-based authorisation: owner or admin",
      code: {
        lang: "csharp",
        code: `public static class Ownership
{
    public static bool CanEditProgress(ClaimsPrincipal user, int ownerId) =>
        user.IsInRole("content-admin") ||
        user.FindFirstValue(ClaimTypes.NameIdentifier) == ownerId.ToString();
}

app.MapDelete("/users/{userId:int}/progress/{lessonId}", async (int userId, string lessonId, ClaimsPrincipal user, AppDbContext db) =>
{
    if (!Ownership.CanEditProgress(user, userId))
        return Results.Forbid();                                  // 403: authenticated, not allowed
    var deleted = await db.Progress.Where(p => p.UserId == userId && p.LessonId == lessonId).ExecuteDeleteAsync();
    return deleted == 0 ? Results.NotFound() : Results.NoContent();
}).RequireAuthorization();`,
      },
    },
    {
      title: "Storing passwords correctly (if you must host credentials yourself)",
      code: {
        lang: "csharp",
        code: `using Microsoft.AspNetCore.Identity;

var hasher = new PasswordHasher<User>();                        // PBKDF2 with salt and many iterations
string hash = hasher.HashPassword(user, "correct horse battery staple");

var result = hasher.VerifyHashedPassword(user, hash, attemptedPassword);
if (result == PasswordVerificationResult.SuccessRehashNeeded)
{
    user.PasswordHash = hasher.HashPassword(user, attemptedPassword);   // upgrade old hashes transparently
}
bool ok = result != PasswordVerificationResult.Failed;`,
      },
      notes: ["Full ASP.NET Core Identity adds lockout, email confirmation, 2FA and passkey support. For most apps, delegating login to an OIDC provider is safer than storing passwords at all."],
    },
    {
      title: "Frontend: where tokens live",
      code: {
        lang: "text",
        code: `Recommended for browser apps (one of):
  A) Backend-for-frontend (BFF): the server does the OIDC flow and keeps tokens;
     the browser only holds an HttpOnly, Secure, SameSite session cookie.
  B) SPA with Authorization Code + PKCE via a vetted library (e.g. the provider's SDK):
     short-lived access token in memory; refresh handled by the library
     (rotating refresh tokens or silent renew), never in localStorage.

Avoid:
  ✗ long-lived JWTs in localStorage (readable by any XSS)
  ✗ implicit flow / tokens in URL fragments
  ✗ rolling your own crypto or token format`,
      },
    },
  ],
  companies: [
    "**Identity is outsourced**: most companies use an identity provider (Entra ID for enterprises, Auth0/Okta, AWS Cognito, Google Identity, Keycloak self-hosted) for login, MFA, social login and SSO, and their APIs validate tokens issued by it.",
    "**Enterprise SSO**: B2B products are often required to support SAML or OIDC single sign-on and SCIM user provisioning before large customers will buy.",
    "**Zero-trust service calls**: services authenticate each other with short-lived tokens or mTLS and authorise per request, rather than trusting anything inside the network.",
  ],
  mistakes: [
    { mistake: "Trusting user ids from the URL or body", why: "The frontend sends the right id", wrong: "Insecure direct object references: users read/modify others' data", fix: "Derive identity from the validated token; check ownership server-side" },
    { mistake: "Fast hashes (SHA-256, MD5) for passwords", why: "They are 'secure hashes'", wrong: "GPUs crack billions of guesses per second after a leak", fix: "Argon2id/bcrypt/PBKDF2 via a library; never roll your own" },
    { mistake: "Long-lived JWTs without revocation", why: "Avoiding refresh complexity", wrong: "Stolen tokens work for days; logout does not really log out", fix: "Short access-token lifetimes, rotating refresh tokens, revocation on logout/password change" },
    { mistake: "Skipping issuer/audience validation", why: "Tutorial code disables checks", wrong: "Tokens issued for other apps are accepted", fix: "Validate iss, aud, exp, signature with the provider's keys" },
    { mistake: "Authorisation only in the UI", why: "Admin buttons are hidden", wrong: "Direct API calls bypass the UI", fix: "Policies and ownership checks on every endpoint" },
  ],
  bestPractices: [
    { tag: "Security", text: "Use an OIDC provider with Authorization Code + PKCE; enable MFA." },
    { tag: "Security", text: "Short-lived access tokens; refresh tokens in HttpOnly Secure SameSite cookies or handled by a BFF." },
    { tag: "Security", text: "Deny by default: require authorisation globally and allow anonymous endpoints explicitly." },
    { tag: "Reliability", text: "Write tests that a user cannot access another user's resources (they catch the most common real bug)." },
  ],
  interview: [
    { q: "Sessions vs JWTs?", a: "Sessions store state server-side and give the browser a random id in an HttpOnly cookie: easy revocation, needs a session store. JWTs are self-contained signed tokens: stateless verification and good for distributed APIs, but hard to revoke before expiry and larger. Common practice: short-lived JWT access tokens plus revocable refresh tokens, or sessions via a BFF for browser apps." },
    { q: "Explain the OAuth 2.0 Authorization Code flow with PKCE.", a: "The app generates a code verifier and sends its hash with a redirect to the authorisation server. After the user authenticates and consents, the server redirects back with a short-lived code. The app exchanges code plus verifier for tokens at the token endpoint. PKCE prevents intercepted codes from being used, which makes the flow safe for public clients like SPAs and mobile apps." },
    { q: "Authentication vs authorisation, with an example of a bug in each?", a: "Authentication establishes identity; a bug is accepting an expired or wrongly signed token. Authorisation decides permissions; a classic bug is an endpoint that lets any logged-in user fetch /invoices/123 belonging to another customer because it does not check ownership." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A JWT payload contains a user's email. Who can read it?",
      options: ["Only the server with the signing key", "Anyone who has the token (it is only base64url-encoded)", "Nobody, it is encrypted", "Only the identity provider"],
      answer: 1,
      explanation: "Standard JWTs (JWS) are signed, not encrypted.",
    },
    {
      kind: "bug",
      prompt: "Any logged-in user can view any other user's progress. Why?",
      code: { lang: "csharp", code: "app.MapGet(\"/users/{id:int}/progress\", (int id, AppDbContext db) =>\n    db.Progress.Where(p => p.UserId == id).ToListAsync())\n   .RequireAuthorization();" },
      options: ["RequireAuthorization is not applied", "The endpoint trusts the id in the URL without checking it matches the caller", "ToListAsync leaks data", "Missing CORS"],
      answer: 1,
      explanation: "Authentication alone is not authorisation. Compare the route id with the token's subject (or use /me/progress).",
    },
    {
      kind: "mcq",
      prompt: "Which OAuth flow should a new single-page app use for user login?",
      options: ["Implicit flow", "Resource owner password grant", "Authorization Code with PKCE", "Client credentials"],
      answer: 2,
      explanation: "Implicit and password grants are deprecated; client credentials is for machine-to-machine.",
    },
  ],
  cheatSheet: [
    "AuthN = who; AuthZ = what they may do. Check both on the server.",
    "Passwords: Argon2id/bcrypt/PBKDF2 via library; rate limit + lockout + MFA.",
    "JWT = signed, readable. Validate alg, signature, iss, aud, exp.",
    "Short access tokens + rotating refresh tokens (HttpOnly cookies / BFF).",
    "Login: OIDC Authorization Code + PKCE with a provider.",
    "Identity from the token, never from the URL; ownership checks.",
    "401 not authenticated; 403 not allowed.",
  ],
  homework: {
    basic: {
      title: "Ownership tests",
      brief: ["Write integration tests (WebApplicationFactory with a test authentication handler) proving: anonymous → 401, user A reading their progress → 200, user A reading user B's progress → 403, admin → 200."],
      criteria: ["Test auth handler sets claims from a header", "Four tests pass", "Endpoint uses token identity, not trust"],
      hints: ["Register a custom AuthenticationHandler in the test host that reads 'X-Test-User' and 'X-Test-Role'."],
      solution: {
        text: ["A fake authentication scheme in tests lets you exercise authorisation logic without a real identity provider."],
        code: {
          lang: "csharp",
          code: `using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

public sealed class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> o, ILoggerFactory l, UrlEncoder e)
    : AuthenticationHandler<AuthenticationSchemeOptions>(o, l, e)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var id))
            return Task.FromResult(AuthenticateResult.NoResult());           // → 401 on protected endpoints
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, id!) };
        if (Request.Headers.TryGetValue("X-Test-Role", out var role)) claims.Add(new(ClaimTypes.Role, role!));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
    }
}

// In WebApplicationFactory.ConfigureWebHost:
// services.AddAuthentication(defaultScheme: "Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });`,
        },
      },
    },
    intermediate: {
      title: "Log in with a real OIDC provider",
      brief: ["Register DevAtlas with a free-tier identity provider (or run Keycloak in Docker), configure the React app to log in with Authorization Code + PKCE using the provider's SDK, and call /me/progress with the access token."],
      criteria: ["No tokens in localStorage", "API validates issuer and audience", "Logout clears the session at the provider"],
      hints: ["Keycloak: docker run -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev (check the Keycloak docs for your version's variables)."],
      solution: {
        text: ["Steps: create a realm/tenant, a public SPA client with the redirect URI http://localhost:5173/callback and PKCE, an API audience, and a test user. In the API set Auth:Authority to the realm issuer URL and Auth:Audience to the API identifier. Use the provider's SPA SDK (or oidc-client-ts) with in-memory token storage."],
      },
    },
    challenge: {
      title: "Refresh token rotation design",
      brief: ["Design refresh-token rotation with reuse detection for a BFF: each refresh returns a new refresh token and invalidates the old one; if an old one is used again, revoke the whole token family. Write the database schema and the algorithm."],
      criteria: ["Schema with token family and hashed tokens", "Reuse detection logic", "Logout and password-change revocation"],
      hints: ["Store only hashes of refresh tokens, like passwords."],
      solution: {
        text: [
          "Table refresh_tokens(id, user_id, family_id, token_hash, expires_at, replaced_by, revoked_at). On refresh: look up by hash; if revoked or already replaced → token reuse detected → revoke all tokens in family_id and force re-login; else create a new token in the same family, set replaced_by on the old one, return the new one in an HttpOnly cookie. Logout or password change revokes all families for the user.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: secure the API",
      brief: ["Add JWT bearer authentication against your chosen provider, a global 'require authenticated user' fallback policy, /me endpoints deriving identity from the token, a ContentAdmin policy for lesson management, and the ownership tests from the basic task."],
      criteria: ["Anonymous access only to /health and public content", "No endpoint accepts a user id it does not verify", "All authz tests pass in CI"],
      hints: ["builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()); then .AllowAnonymous() on public endpoints."],
      solution: {
        text: ["A fallback policy makes 'secure by default' structural: forgetting RequireAuthorization on a new endpoint no longer exposes it."],
      },
    },
  },
  deeper: [
    { label: "OWASP Authentication Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" },
    { label: "OWASP Password Storage Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
    { label: "Configure JWT bearer authentication in ASP.NET Core", url: "https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication" },
    { label: "OAuth 2.0 for Browser-Based Apps (IETF draft/BCP)", url: "https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/" },
  ],
  nextPreview: "Next: FastAPI for AI and data services: Pydantic models, async endpoints and dependency injection in Python.",
};
