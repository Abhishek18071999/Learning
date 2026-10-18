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

// assumes User has a string? PasswordHash property; attemptedPassword comes from the login form
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
using Microsoft.Extensions.Logging;
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
        text: [
          "Keycloak (keycloak/keycloak:26.4 in Docker, `start-dev`): create a realm `devatlas` with realm roles learner and content-admin, and a test user. Add a client `devatlas-web` that is public (no secret, since a browser cannot keep one), has only the standard flow (no implicit flow, no direct access grants) and PKCE method S256. Set its redirect URI to http://localhost:5173/*, its web origin to http://localhost:5173 and its post-logout redirect URI to http://localhost:5173/*. Give it two protocol mappers: an Audience mapper that adds `devatlas-api` to access tokens, and a realm-role mapper that writes the roles to a flat `roles` claim.",
          "API: Auth:Authority = http://localhost:8080/realms/devatlas (the token's `iss`) and Auth:Audience = devatlas-api. JwtBearer downloads the realm's signing keys from the discovery document and rejects tokens with the wrong issuer, audience, signature or expiry. Without the audience mapper, Keycloak access tokens carry no devatlas-api audience and every call returns 401.",
          "SPA: oidc-client-ts runs Authorization Code + PKCE. The user store is InMemoryWebStorage, so tokens never touch localStorage or sessionStorage; only the transient sign-in state (state and code_verifier) sits in sessionStorage until the callback consumes it. Logout calls the provider's end_session endpoint, so the Keycloak session ends too.",
          "Verified end to end with a headless Chromium (Playwright) against this code, Keycloak 26.4 and the API from the capstone. The authorize request carried response_type=code and code_challenge_method=S256. After login the page showed asha's progress, fetched with a Bearer token through the proxy. localStorage and sessionStorage were both empty. After logout, signing in again showed the Keycloak password form.",
        ],
        code: {
          lang: "typescript",
          code: `// ---- web/src/auth/oidc.ts (npm i oidc-client-ts) ----
import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

// Authorization Code + PKCE with a public client. oidc-client-ts creates the code_verifier and
// S256 code_challenge itself; the only thing kept in sessionStorage is that short-lived sign-in state.
export const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_AUTHORITY,       // http://localhost:8080/realms/devatlas
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,       // devatlas-web
  redirect_uri: \`\${window.location.origin}/callback\`,
  post_logout_redirect_uri: \`\${window.location.origin}/\`,
  response_type: "code",
  scope: "openid profile",
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),   // tokens live in memory only
});

export const login = () => userManager.signinRedirect();

/** On /callback: exchange the one-time code (plus the PKCE verifier) for tokens, then clean the URL. */
export async function completeLogin(): Promise<User> {
  const user = await userManager.signinRedirectCallback();
  window.history.replaceState({}, "", "/");
  return user;
}

/** Ends the session at the provider too (end_session_endpoint with id_token_hint), not just in this tab. */
export const logout = () => userManager.signoutRedirect();

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new Error("Not signed in");
  const headers = new Headers(init.headers);
  headers.set("Authorization", \`Bearer \${user.access_token}\`);
  return fetch(\`/api\${path}\`, { ...init, headers });     // Vite proxies /api to the .NET API (no CORS needed)
}

// ---- web/src/App.tsx ----
import { useEffect, useState } from "react";
import type { User } from "oidc-client-ts";
import { apiFetch, completeLogin, login, logout, userManager } from "./auth/oidc";

type Progress = { lessonId: string; status: string; score: number };

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const signIn = window.location.pathname === "/callback" ? completeLogin() : userManager.getUser();
    signIn.then(setUser).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiFetch("/me/progress")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(\`API returned \${r.status}\`))))
      .then(setProgress)
      .catch((e: Error) => setError(e.message));
  }, [user]);

  if (error) return <p role="alert">{error}</p>;
  if (!user) return <button onClick={() => void login()}>Log in</button>;
  return (
    <main>
      <p>Signed in as {user.profile.preferred_username}</p>
      <ul>{progress?.map((p) => <li key={p.lessonId}>{p.lessonId}: {p.status} ({p.score})</li>)}</ul>
      <button onClick={() => void logout()}>Log out</button>
    </main>
  );
}

// ---- web/vite.config.ts (dev proxy: the SPA calls /api/..., Vite forwards to the API) ----
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { "/api": { target: "http://localhost:5000", rewrite: (p) => p.replace(/^\\/api/, "") } } },
});

// ---- web/.env (not secret: public client id and issuer URL) ----
// VITE_OIDC_AUTHORITY=http://localhost:8080/realms/devatlas
// VITE_OIDC_CLIENT_ID=devatlas-web`,
        },
        pitfalls: [
          "In-memory tokens disappear on page reload; call signinRedirect (or signinSilent) again, and the provider's session cookie makes that quick without retyping the password.",
          "Keycloak sets its login cookies with Secure. Browsers still send them to http://localhost, but most other hosts need HTTPS.",
        ],
      },
    },
    challenge: {
      title: "Refresh token rotation design",
      brief: ["Design refresh-token rotation with reuse detection for a BFF: each refresh returns a new refresh token and invalidates the old one; if an old one is used again, revoke the whole token family. Write the database schema and the algorithm."],
      criteria: ["Schema with token family and hashed tokens", "Reuse detection logic", "Logout and password-change revocation"],
      hints: ["Store only hashes of refresh tokens, like passwords."],
      solution: {
        text: [
          "Table refresh_tokens(id, user_id, family_id, token_hash, expires_at, replaced_by, revoked_at). On refresh: look up by hash. If the token was already replaced, that is reuse: someone kept a copy, so revoke every token in its family_id and force a new login. If it is revoked or expired, reject it. Otherwise create a new token in the same family, set replaced_by on the old one, and return the new one in an HttpOnly cookie. Logout revokes the family; a password change revokes every active token of the user.",
          "Only SHA-256 hashes are stored, so a database leak does not hand out usable tokens. A fast hash is enough here, unlike for passwords, because the token is 256 random bits and cannot be brute-forced. Marking the old token is a conditional UPDATE (`WHERE replaced_by IS NULL`) inside the same transaction as the insert. If two refreshes race with the same token, only one changes a row and the other is treated as reuse.",
          "The demo plays it through: two normal rotations; an attacker replaying the first (stolen) token, which kills the family so the legitimate holder of token #3 is also logged out; logout of one device while another keeps working; a password change; and an expired token. Time is passed in explicitly so the demo is deterministic.",
        ],
        code: {
          lang: "csharp", file: "Program.cs (Microsoft.Data.Sqlite 9.0.*)",
          code: `using System.Security.Cryptography;
using Microsoft.Data.Sqlite;

using var db = new SqliteConnection("Data Source=:memory:");      // MySQL/PostgreSQL in production; same schema
db.Open();
var store = new RefreshTokenStore(db);
var now = new DateTimeOffset(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);

var t1 = store.Issue("user-42", now);                              // login
var r2 = store.Refresh(t1, now.AddMinutes(10));
var r3 = store.Refresh(r2.Token!, now.AddMinutes(20));
Console.WriteLine($"refresh #1: {r2.Outcome}, refresh #2: {r3.Outcome}");
Console.WriteLine($"stolen #1 replayed: {store.Refresh(t1, now.AddMinutes(25)).Outcome}");
Console.WriteLine($"legit #3 after reuse: {store.Refresh(r3.Token!, now.AddMinutes(26)).Outcome}");

var t4 = store.Issue("user-42", now.AddMinutes(30));               // logs in again: new family
var phone = store.Issue("user-42", now.AddMinutes(31));            // second device
store.Logout(t4, now.AddMinutes(40));
Console.WriteLine($"after logout: {store.Refresh(t4, now.AddMinutes(41)).Outcome}, other device: {store.Refresh(phone, now.AddMinutes(41)).Outcome}");
Console.WriteLine($"password change revoked {store.RevokeAllForUser("user-42", now.AddMinutes(50))} active token(s)");
Console.WriteLine($"expired: {store.Refresh(store.Issue("user-7", now), now.AddDays(31)).Outcome}");

public enum Outcome { Rotated, Invalid, Expired, Revoked, ReuseDetected }
public sealed record RefreshResult(Outcome Outcome, string? Token = null);

public sealed class RefreshTokenStore
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);
    private readonly SqliteConnection _db;

    public RefreshTokenStore(SqliteConnection db)
    {
        _db = db;
        Exec("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          INTEGER PRIMARY KEY,
                user_id     TEXT NOT NULL,
                family_id   TEXT NOT NULL,              -- one family per login; rotation stays inside it
                token_hash  BLOB NOT NULL UNIQUE,       -- SHA-256 of the token; the token itself is never stored
                expires_at  INTEGER NOT NULL,           -- unix seconds
                replaced_by INTEGER NULL REFERENCES refresh_tokens(id),
                revoked_at  INTEGER NULL);
            CREATE INDEX IF NOT EXISTS ix_refresh_family ON refresh_tokens(family_id);
            CREATE INDEX IF NOT EXISTS ix_refresh_user ON refresh_tokens(user_id);
            """);
    }

    public string Issue(string userId, DateTimeOffset now) => Insert(userId, Guid.NewGuid().ToString("n"), now).Token;

    public RefreshResult Refresh(string token, DateTimeOffset now)
    {
        using var tx = _db.BeginTransaction();
        using var find = Cmd("SELECT id, user_id, family_id, expires_at, replaced_by, revoked_at FROM refresh_tokens WHERE token_hash = $h",
            ("$h", Hash(token)));
        using var row = find.ExecuteReader();
        if (!row.Read()) return new(Outcome.Invalid);
        var (id, userId, family, expires) = (row.GetInt64(0), row.GetString(1), row.GetString(2), row.GetInt64(3));
        bool used = !row.IsDBNull(4), revoked = !row.IsDBNull(5);
        row.Close();

        if (used)                                                     // an old token came back: someone kept a copy
        {
            RevokeFamily(family, now);
            tx.Commit();
            return new(Outcome.ReuseDetected);
        }
        if (revoked) return new(Outcome.Revoked);
        if (expires <= now.ToUnixTimeSeconds()) return new(Outcome.Expired);

        var (newId, newToken) = Insert(userId, family, now);
        // Conditional update: if a concurrent refresh already rotated this token, 0 rows change -> treat as reuse.
        using var mark = Cmd("UPDATE refresh_tokens SET replaced_by = $n WHERE id = $id AND replaced_by IS NULL AND revoked_at IS NULL",
            ("$n", newId), ("$id", id));
        if (mark.ExecuteNonQuery() != 1) { tx.Rollback(); return new(Outcome.ReuseDetected); }
        tx.Commit();
        return new(Outcome.Rotated, newToken);                        // send as HttpOnly; Secure; SameSite cookie
    }

    public void Logout(string token, DateTimeOffset now)
    {
        using var find = Cmd("SELECT family_id FROM refresh_tokens WHERE token_hash = $h", ("$h", Hash(token)));
        if (find.ExecuteScalar() is string family) RevokeFamily(family, now);
    }

    public int RevokeAllForUser(string userId, DateTimeOffset now)   // password change, "log out everywhere"
    {
        using var cmd = Cmd("UPDATE refresh_tokens SET revoked_at = $t WHERE user_id = $u AND revoked_at IS NULL AND replaced_by IS NULL",
            ("$t", now.ToUnixTimeSeconds()), ("$u", userId));
        return cmd.ExecuteNonQuery();
    }

    private void RevokeFamily(string family, DateTimeOffset now)
    {
        using var cmd = Cmd("UPDATE refresh_tokens SET revoked_at = $t WHERE family_id = $f AND revoked_at IS NULL",
            ("$t", now.ToUnixTimeSeconds()), ("$f", family));
        cmd.ExecuteNonQuery();
    }

    private (long Id, string Token) Insert(string userId, string family, DateTimeOffset now)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));   // 256 bits of randomness
        using var cmd = Cmd("""
            INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at) VALUES ($u, $f, $h, $e)
            RETURNING id
            """, ("$u", userId), ("$f", family), ("$h", Hash(token)), ("$e", (now + Lifetime).ToUnixTimeSeconds()));
        return ((long)cmd.ExecuteScalar()!, token);
    }

    // A fast hash is fine here (unlike passwords): the token is 256 random bits, so it cannot be guessed offline.
    private static byte[] Hash(string token) => SHA256.HashData(Convert.FromBase64String(token));

    private SqliteCommand Cmd(string sql, params (string Name, object Value)[] args)
    {
        var cmd = _db.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in args) cmd.Parameters.AddWithValue(name, value);
        return cmd;
    }

    private void Exec(string sql) { using var cmd = Cmd(sql); cmd.ExecuteNonQuery(); }
}`,
        },
        output: "refresh #1: Rotated, refresh #2: Rotated\nstolen #1 replayed: ReuseDetected\nlegit #3 after reuse: Revoked\nafter logout: Revoked, other device: Rotated\npassword change revoked 1 active token(s)\nexpired: Expired",
      },
    },
    capstone: {
      title: "DevAtlas: secure the API",
      brief: ["Add JWT bearer authentication against your chosen provider, a global 'require authenticated user' fallback policy, /me endpoints deriving identity from the token, a ContentAdmin policy for lesson management, and the ownership tests from the basic task."],
      criteria: ["Anonymous access only to /health and public content", "No endpoint accepts a user id it does not verify", "All authz tests pass in CI"],
      hints: ["builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build()); then .AllowAnonymous() on public endpoints."],
      solution: {
        text: [
          "A fallback policy makes 'secure by default' structural: forgetting RequireAuthorization on a new endpoint no longer exposes it. Only /health and the public lesson list opt out with AllowAnonymous().",
          "MapInboundClaims = false keeps the JWT claim names as issued (`sub`, `roles`, `preferred_username`) instead of the long Microsoft claim URIs, and NameClaimType/RoleClaimType tell ASP.NET Core which claims hold the name and the roles. IsInRole and RequireRole then work with the flat `roles` claim from the Keycloak mapper in the intermediate task. The user id is the token's `sub`, a string (a UUID in Keycloak), so the store is keyed by it.",
          "/me endpoints never accept a user id. /users/{userId}/progress does, so it checks per request that the caller is that user or a content admin and returns 403 otherwise.",
          "The tests replace JwtBearer with a header-driven test scheme that issues the same claim names as real tokens, and cover anonymous access (401), owner, other learner (403) and admin, and the ContentAdmin policy. The same build was also run against real Keycloak 26.4 tokens obtained with Authorization Code + PKCE: anonymous got 401; asha could save and read her own progress; asha creating a lesson got 403; maya (content-admin) creating a lesson got 201 and could read asha's progress; a token with a modified signature got 401.",
        ],
        code: {
          lang: "csharp",
          code: `// ---- DevAtlas.Api/Program.cs (Microsoft.AspNetCore.Authentication.JwtBearer 9.0.*) ----
using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddSingleton<IProgressStore, InMemoryProgressStore>();   // EF Core store from 4.1.2 in DevAtlas

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.Authority = builder.Configuration["Auth:Authority"];        // e.g. http://localhost:8080/realms/devatlas
    o.Audience = builder.Configuration["Auth:Audience"];          // e.g. devatlas-api
    o.RequireHttpsMetadata = !builder.Environment.IsDevelopment(); // plain-http Keycloak only in Development
    o.MapInboundClaims = false;                                   // keep JWT names: "sub", "roles"
    o.TokenValidationParameters.NameClaimType = "preferred_username";
    o.TokenValidationParameters.RoleClaimType = "roles";
});

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())  // deny by default
    .AddPolicy("ContentAdmin", p => p.RequireRole("content-admin"));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

// Public: explicitly anonymous
app.MapGet("/health", () => TypedResults.Ok(new { status = "ok" })).AllowAnonymous();
app.MapGet("/lessons", () => TypedResults.Ok(new[] { new LessonDto("4.1.3", "Authentication: JWT, OAuth2 and OIDC") }))
   .AllowAnonymous();

// Admin only
app.MapPost("/lessons", (LessonDto lesson) => TypedResults.Created($"/lessons/{lesson.Id}", lesson))
   .RequireAuthorization("ContentAdmin");

// Identity always comes from the validated token, never from the URL or body
var me = app.MapGroup("/me");
me.MapGet("/progress", (ClaimsPrincipal user, IProgressStore store) => TypedResults.Ok(store.For(user.UserId())));
me.MapPut("/progress/{lessonId}", (string lessonId, ProgressUpdate body, ClaimsPrincipal user, IProgressStore store) =>
{
    if (body.Score is < 0 or > 1)
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["score"] = ["Score must be between 0 and 1."] });
    store.Save(user.UserId(), new ProgressDto(lessonId, "completed", body.Score));
    return Results.NoContent();
});

// Someone else's data: owner or content admin, checked per request (403 otherwise)
app.MapGet("/users/{userId}/progress", (string userId, ClaimsPrincipal user, IProgressStore store) =>
    user.UserId() == userId || user.IsInRole("content-admin")
        ? Results.Ok(store.For(userId))
        : Results.Forbid());

app.Run();

public partial class Program { }

public sealed record LessonDto(string Id, string Title);
public sealed record ProgressDto(string LessonId, string Status, decimal Score);
public sealed record ProgressUpdate(decimal Score);

public static class ClaimsPrincipalExtensions
{
    public static string UserId(this ClaimsPrincipal user) =>
        user.FindFirstValue("sub") ?? throw new InvalidOperationException("Authenticated user without a sub claim");
}

public interface IProgressStore
{
    IReadOnlyList<ProgressDto> For(string userId);
    void Save(string userId, ProgressDto progress);
}

public sealed class InMemoryProgressStore : IProgressStore
{
    private readonly ConcurrentDictionary<(string User, string Lesson), ProgressDto> _rows = new();
    public IReadOnlyList<ProgressDto> For(string userId) =>
        _rows.Where(r => r.Key.User == userId).Select(r => r.Value).OrderBy(p => p.LessonId).ToList();
    public void Save(string userId, ProgressDto progress) => _rows[(userId, progress.LessonId)] = progress;
}

// ---- DevAtlas.Api.Tests/AuthorizationTests.cs (xunit + Microsoft.AspNetCore.Mvc.Testing 9.0.*) ----
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

// Test scheme: identity from headers, using the same claim names as real tokens ("sub", "roles").
public sealed class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> o, ILoggerFactory l, UrlEncoder e)
    : AuthenticationHandler<AuthenticationSchemeOptions>(o, l, e)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-User", out var sub))
            return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new List<Claim> { new("sub", sub!) };
        if (Request.Headers.TryGetValue("X-Test-Role", out var role)) claims.Add(new("roles", role!));
        var identity = new ClaimsIdentity(claims, "Test", nameType: "sub", roleType: "roles");
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "Test")));
    }
}

public sealed class TestAuthFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureTestServices(s => s
            .AddAuthentication("Test")
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { }));
}

public class AuthorizationTests(TestAuthFactory factory) : IClassFixture<TestAuthFactory>
{
    private HttpClient As(string? user, string? role = null)
    {
        var c = factory.CreateClient();
        if (user is not null) c.DefaultRequestHeaders.Add("X-Test-User", user);
        if (role is not null) c.DefaultRequestHeaders.Add("X-Test-Role", role);
        return c;
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/lessons")]
    public async Task Public_endpoints_allow_anonymous(string url) =>
        Assert.Equal(HttpStatusCode.OK, (await As(null).GetAsync(url)).StatusCode);

    [Theory]
    [InlineData("/me/progress")]
    [InlineData("/users/alice/progress")]
    public async Task Everything_else_requires_a_user(string url) =>
        Assert.Equal(HttpStatusCode.Unauthorized, (await As(null).GetAsync(url)).StatusCode);

    [Fact]
    public async Task Me_endpoints_use_the_token_identity()
    {
        var put = await As("alice").PutAsJsonAsync("/me/progress/4.1.3", new { score = 0.8 });
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);
        Assert.Contains("4.1.3", await As("alice").GetStringAsync("/me/progress"));
        Assert.Equal("[]", await As("bob").GetStringAsync("/me/progress"));
    }

    [Theory]
    [InlineData("alice", null, HttpStatusCode.OK)]           // owner
    [InlineData("bob", null, HttpStatusCode.Forbidden)]      // another learner
    [InlineData("carol", "content-admin", HttpStatusCode.OK)] // admin
    public async Task Users_progress_is_owner_or_admin(string user, string? role, HttpStatusCode expected) =>
        Assert.Equal(expected, (await As(user, role).GetAsync("/users/alice/progress")).StatusCode);

    [Theory]
    [InlineData(null, HttpStatusCode.Forbidden)]
    [InlineData("content-admin", HttpStatusCode.Created)]
    public async Task Creating_lessons_needs_ContentAdmin(string? role, HttpStatusCode expected)
    {
        var res = await As("dave", role).PostAsJsonAsync("/lessons", new { id = "9.9.9", title = "New" });
        Assert.Equal(expected, res.StatusCode);
    }
}`,
        },
        output: "$ dotnet test\nPassed!  - Failed:     0, Passed:    10, Skipped:     0, Total:    10",
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
