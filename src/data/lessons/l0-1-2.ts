import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.1.2",
  title: "HTTP in depth: methods, status codes, headers, caching",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.1.1 What happens when you type a URL"],
  summary: "Speak HTTP fluently: pick the right method and status code, use headers on purpose, and make pages fast with caching instead of bigger servers.",
  terms: [
    { term: "Method (verb)", def: "What the client wants to do: GET (read), POST (create/submit), PUT (replace), PATCH (partial update), DELETE (remove)." },
    { term: "Status code", def: "A 3-digit result: 2xx success, 3xx redirect, 4xx client mistake, 5xx server failure." },
    { term: "Header", def: "A `Name: value` line of metadata on a request or response, e.g. `Content-Type: application/json`." },
    { term: "Safe method", def: "A method that should not change server state (GET, HEAD, OPTIONS)." },
    { term: "Idempotent", def: "Doing it once or ten times leaves the same result: GET, PUT, DELETE are idempotent; POST is not." },
    { term: "Cache-Control", def: "The header that tells browsers and CDNs whether and how long they may reuse a response." },
    { term: "ETag", def: "A version fingerprint of a response. The client sends it back with If-None-Match; if unchanged the server answers 304 Not Modified with no body." },
    { term: "Cookie", def: "A small value the server asks the browser to store and send back on later requests, typically to keep you logged in." },
  ],
  problem: [
    "Your API returns `200 OK` with `{\"error\": \"not found\"}` for missing users. The mobile team's retry logic thinks every call succeeded. The monitoring dashboard shows 0% errors while customers cannot log in.",
    "Meanwhile the homepage logo, which has not changed in a year, is downloaded on every page view by every visitor, 40 million times a day, costing real bandwidth money. Both problems are HTTP vocabulary problems: wrong status codes and missing cache headers.",
  ],
  concept: {
    analogy: [
      "HTTP is like ordering at a restaurant counter. The **method** is the kind of request (\"I'd like to see the menu\" = GET, \"I'd like to place an order\" = POST). The **headers** are details on the order slip (\"no onions\", \"takeaway\"). The **status code** is the reply (\"here you go\" = 200, \"we don't have that\" = 404, \"kitchen is on fire\" = 500). **Caching** is the customer keeping the menu instead of asking for a new copy every visit.",
    ],
    precise: [
      "An HTTP message is a start line, headers, a blank line and an optional body. Requests start with `METHOD /path HTTP/version`; responses start with `HTTP/version STATUS reason`. HTTP/2 and HTTP/3 change how bytes are framed on the wire, but the meaning (methods, headers, status codes) is the same.",
      "**Methods carry promises.** GET must be safe, so crawlers, prefetchers and caches can call it freely. PUT and DELETE must be idempotent, so clients can retry them after a timeout. POST has no such promise, which is why payment APIs add idempotency keys (Phase 4).",
      "**Status codes are a contract with machines.** Retries, alerts, browsers and CDNs all branch on the code, not on your JSON body. 4xx means \"the client must change something\"; 5xx means \"the server failed, retrying later might work\".",
      "**Caching** is controlled by response headers: `Cache-Control: max-age=31536000, immutable` lets a file be reused for a year without asking; `Cache-Control: no-cache` means \"store it but revalidate every time\" (using ETag/Last-Modified); `no-store` means never store it (sensitive data).",
    ],
  },
  underTheHood: {
    text: [
      "**Revalidation flow:** the first response includes `ETag: \"v7\"`. Next time, the browser sends `If-None-Match: \"v7\"`. If the content is unchanged the server replies `304 Not Modified` with headers only: one round trip, almost no bytes.",
      "**Fingerprinted assets** (e.g. `app.3f9a1c.js`) get a new file name whenever content changes, so they can be cached \"forever\" safely. The HTML that references them uses `no-cache` so users pick up new deploys immediately. This is how most modern build tools (including Vite, which built this app) work.",
      "**Cookies** are set with `Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax`. `HttpOnly` hides the cookie from JavaScript (limits XSS damage), `Secure` sends it only over HTTPS, `SameSite` limits cross-site sending (helps against CSRF).",
      "**CORS** is a browser rule: JavaScript on site A may only read responses from site B if B replies with `Access-Control-Allow-Origin` allowing A. It protects users, not servers: curl ignores it completely.",
    ],
    diagram: {
      title: "Conditional request with ETag",
      nodes: [
        { label: "1st GET", sub: "200 + ETag \"v7\"" },
        { label: "Browser cache", sub: "stores body + ETag" },
        { label: "2nd GET", sub: "If-None-Match: \"v7\"" },
        { label: "Server", sub: "unchanged?" },
        { label: "304", sub: "no body, reuse cache" },
      ],
      edges: ["store", "later", "compare", "yes"],
    },
  },
  handsOn: [
    {
      title: "A tiny API that uses HTTP correctly (Python standard library only)",
      text: ["No frameworks, so every header and status code is visible. Requires Python 3.10+."],
      code: {
        lang: "python",
        file: "server.py",
        code: `import hashlib, json
from http.server import BaseHTTPRequestHandler, HTTPServer

USERS = {"1": {"id": "1", "name": "Asha"}}

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status: int, body: dict, headers: dict | None = None) -> None:
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if not self.path.startswith("/users/"):
            return self.send_json(404, {"error": "route not found"})
        user = USERS.get(self.path.removeprefix("/users/"))
        if user is None:
            return self.send_json(404, {"error": "user not found"})       # not 200!
        etag = '"' + hashlib.sha256(json.dumps(user).encode()).hexdigest()[:16] + '"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)                                         # unchanged
            self.send_header("ETag", etag)
            return self.end_headers()
        self.send_json(200, user, {"ETag": etag, "Cache-Control": "no-cache"})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            return self.send_json(400, {"error": "body must be JSON"})
        if not body.get("name"):
            return self.send_json(422, {"error": "name is required"})
        new_id = str(len(USERS) + 1)
        USERS[new_id] = {"id": new_id, "name": body["name"]}
        self.send_json(201, USERS[new_id], {"Location": f"/users/{new_id}"})

HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()`,
      },
      notes: ["Run with `python3 server.py` and leave it running in one terminal."],
    },
    {
      title: "Talk to it with curl",
      code: {
        lang: "bash",
        code: `curl -i localhost:8000/users/1          # 200 + ETag
curl -i localhost:8000/users/99         # 404
curl -i -X POST localhost:8000/users -H 'Content-Type: application/json' -d '{"name":"Ravi"}'   # 201 + Location
curl -i -X POST localhost:8000/users -d 'not json'                                           # 400
curl -i -X POST localhost:8000/users -H 'Content-Type: application/json' -d '{}'             # 422`,
      },
      output: "HTTP/1.0 201 Created\nContent-Type: application/json\nLocation: /users/2\n\n{\"id\": \"2\", \"name\": \"Ravi\"}",
      notes: ["`-i` prints response headers. Python's simple server speaks HTTP/1.0, which is fine for learning."],
    },
    {
      title: "Watch revalidation return 304",
      code: {
        lang: "bash",
        code: `ETAG=$(curl -si localhost:8000/users/1 | grep -i '^etag' | cut -d' ' -f2 | tr -d '\\r')
curl -i localhost:8000/users/1 -H "If-None-Match: $ETAG"`,
      },
      output: "HTTP/1.0 304 Not Modified\nETag: \"…\"",
      notes: ["No body was sent. On a 2 MB response this saves 2 MB per repeat visit."],
    },
    {
      title: "Status codes you will use 95% of the time",
      code: {
        lang: "text",
        code: `200 OK                 success with a body
201 Created            POST created something (add a Location header)
204 No Content         success, nothing to return (common for DELETE)
301 / 308              permanent redirect (308 keeps the method)
302 / 307              temporary redirect (307 keeps the method)
304 Not Modified       use your cached copy
400 Bad Request        malformed request (bad JSON, wrong types)
401 Unauthorized       not authenticated: who are you?
403 Forbidden          authenticated, but not allowed
404 Not Found          no such resource
409 Conflict           state conflict (duplicate email, version mismatch)
422 Unprocessable      well-formed but fails validation
429 Too Many Requests  rate limited (send Retry-After)
500 Internal Error     bug on the server
502 / 503 / 504        bad gateway / unavailable / gateway timeout (infra)`,
      },
    },
    {
      title: "Inspect real caching headers",
      code: {
        lang: "bash",
        code: `curl -sI https://www.wikipedia.org | grep -iE 'cache-control|etag|age|last-modified'`,
      },
      notes: ["The exact values change over time. Look for `max-age`, `Age` (seconds the CDN has held it) and validators like ETag or Last-Modified."],
    },
  ],
  companies: [
    "**Stripe, GitHub and most public APIs** document their status codes precisely, because client SDKs decide whether to retry based on them: 429 and 5xx retry with backoff, other 4xx do not.",
    "**Static asset caching** is standard practice: fingerprinted JS/CSS/images served with `max-age=31536000, immutable` from a CDN, HTML with `no-cache`. This often removes most traffic from origin servers.",
    "**Observability** dashboards group requests by status class. An API that hides errors behind 200 breaks alerting, SLOs and on-call, which is why code reviews at mature companies flag it.",
  ],
  mistakes: [
    { mistake: "Returning 200 with an error body", why: "It feels simpler to always return 200", wrong: "Clients, retries, CDNs and alerts treat failures as success", fix: "Use the correct 4xx/5xx code and a consistent error body" },
    { mistake: "Changing data in a GET handler", why: "Links like /delete?id=5 are easy", wrong: "Crawlers, prefetchers and link previews trigger the change", fix: "GET must be safe; use POST/DELETE for changes" },
    { mistake: "Caching HTML for a long time", why: "Copying asset cache rules to everything", wrong: "Users keep the old page after a deploy and load missing old assets", fix: "HTML: no-cache. Fingerprinted assets: long max-age + immutable" },
    { mistake: "Confusing 401 and 403", why: "Both sound like 'not allowed'", wrong: "Clients prompt for login when they should show 'access denied' (or vice versa)", fix: "401 = not authenticated; 403 = authenticated but not permitted" },
    { mistake: "Caching personalised responses publicly", why: "Turning on CDN caching globally", wrong: "One user's account page is served to another user", fix: "Use Cache-Control: private or no-store for user-specific data; vary on auth" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Make status codes truthful; give every error a JSON body like `{\"error\": {\"code\": \"user_not_found\", \"message\": \"...\"}}`." },
    { tag: "Performance", text: "Fingerprint static assets and cache them for a year; revalidate HTML and API responses with ETags." },
    { tag: "Security", text: "Session cookies: HttpOnly, Secure, SameSite. Sensitive responses: Cache-Control: no-store." },
    { tag: "Maintainability", text: "Return 201 + Location for creates and 204 for deletes; be consistent across every endpoint." },
    { tag: "Cost", text: "Every cache hit at the CDN is bandwidth and compute you do not pay for at the origin." },
  ],
  interview: [
    { q: "What is the difference between PUT and PATCH, and which is idempotent?", a: "PUT replaces the whole resource with the representation you send; PATCH applies a partial change. PUT is idempotent by definition. PATCH may or may not be, depending on the patch format (e.g. 'set name=X' is, 'increment counter' is not)." },
    { q: "How does browser caching work?", a: "The server sets Cache-Control (max-age, no-cache, no-store, private/public) and validators (ETag, Last-Modified). Within max-age the browser reuses the response without a request. After that, it revalidates with If-None-Match/If-Modified-Since and gets 304 if unchanged. Fingerprinted assets can be cached for a year because a change produces a new URL." },
    { q: "When would you return 409 vs 422?", a: "422 when the request is understood but invalid by itself (missing name, bad email). 409 when it is valid but conflicts with current state (email already registered, optimistic-lock version mismatch)." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A logged-in user tries to delete another user's post. Which status code?",
      options: ["401 Unauthorized", "403 Forbidden", "404 Not Found", "400 Bad Request"],
      answer: 1,
      explanation: "They are authenticated (so not 401) but not allowed. Some APIs return 404 to avoid revealing that the resource exists, which is also acceptable when documented.",
    },
    {
      kind: "mcq",
      prompt: "Which header lets `app.3f9a1c.js` be reused for a year without any request?",
      options: ["Cache-Control: no-cache", "Cache-Control: max-age=31536000, immutable", "ETag: \"3f9a1c\"", "Expires: 0"],
      answer: 1,
      explanation: "no-cache forces revalidation every time; max-age with immutable allows reuse without asking.",
    },
    {
      kind: "bug",
      prompt: "After a deploy, some users see a blank page for hours. What is the most likely cause?",
      code: { lang: "text", code: "index.html  -> Cache-Control: max-age=86400\napp.<hash>.js -> Cache-Control: max-age=31536000, immutable\n(old hashed files deleted on deploy)" },
      options: ["The JS is cached too long", "index.html is cached for a day and points to deleted old JS files", "ETags are missing", "HTTP/2 is disabled"],
      answer: 1,
      explanation: "Cached HTML references old hashed files that no longer exist. Serve HTML with no-cache (and keep the previous release's assets for a while).",
    },
  ],
  cheatSheet: [
    "GET safe; PUT/DELETE idempotent; POST neither.",
    "2xx ok · 3xx redirect · 4xx client must change · 5xx server failed.",
    "201 + Location for create; 204 for delete; 422 validation; 409 conflict; 429 rate limit.",
    "401 = who are you? 403 = I know you, and no.",
    "Assets: hashed name + max-age=31536000, immutable. HTML: no-cache.",
    "ETag + If-None-Match → 304, no body.",
    "Cookies: HttpOnly, Secure, SameSite. Private data: no-store.",
    "CORS is enforced by browsers, not servers.",
  ],
  homework: {
    basic: {
      title: "Status code detective",
      brief: ["For each scenario pick the status code and explain in one line: (1) signup with an email that exists, (2) JSON with a missing closing brace, (3) user hits the API 200 times in a second, (4) database is down, (5) DELETE succeeded, (6) resource moved permanently to a new URL."],
      criteria: ["Six codes with one-line reasons", "Distinguishes 400/409/422 correctly"],
      hints: ["Is it the client's fault (4xx) or the server's (5xx)?"],
      solution: {
        text: [
          "1) 409 Conflict (valid request, conflicts with existing state). 2) 400 Bad Request (malformed). 3) 429 Too Many Requests with Retry-After. 4) 503 Service Unavailable (or 500 if unhandled; 503 signals 'try later'). 5) 204 No Content. 6) 301, or 308 if the method must be preserved.",
          "status_detective.py implements each scenario in a small standard-library server and probes it, so you see the code and the headers a client actually receives: Retry-After on 429 and 503, Location on 301. The client does not follow the redirect, so the 301 itself is visible.",
        ],
        code: { lang: "python", file: "status_detective.py", code: `"""Status code detective: each scenario implemented by a tiny server, then probed.

Run: python3 status_detective.py   (Python 3.10+, standard library only)
"""
import json
import threading
import time
from collections import deque
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

USERS = {"asha@example.com", "ravi@example.com"}
DB_UP = False  # pretend the database is down
hits: dict[str, deque[float]] = {}  # client IP -> request times in the last second


class Handler(BaseHTTPRequestHandler):
    def reply(self, status: int, body: dict | None = None, headers: dict | None = None) -> None:
        data = json.dumps(body).encode() if body is not None else b""
        self.send_response(status)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        if body is not None:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:  # POST /signup
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:  # (2) malformed: the client must fix the syntax
            return self.reply(400, {"error": {"code": "invalid_json"}})
        if body.get("email") in USERS:  # (1) valid request, clashes with existing state
            return self.reply(409, {"error": {"code": "email_taken"}})
        self.reply(201, {"email": body["email"]}, {"Location": "/users/3"})

    def do_GET(self) -> None:
        if self.path == "/old-pricing":  # (6) moved for good; GET-only, so 301 is fine
            return self.reply(301, headers={"Location": "/pricing"})
        if self.path == "/orders":  # (4) a dependency is down: temporary, retry later
            if not DB_UP:
                return self.reply(503, {"error": {"code": "db_unavailable"}}, {"Retry-After": "30"})
        if self.path == "/search":  # (3) more than 100 requests per second from one client
            now, window = time.monotonic(), hits.setdefault(self.client_address[0], deque())
            window.append(now)
            while window[0] < now - 1:
                window.popleft()
            if len(window) > 100:
                return self.reply(429, {"error": {"code": "rate_limited"}}, {"Retry-After": "1"})
        self.reply(200, {"ok": True})

    def do_DELETE(self) -> None:  # (5) done, nothing to return
        self.reply(204)

    def log_message(self, *args) -> None:  # keep the demo output clean
        pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # show the 301 itself instead of following it


OPENER = urllib.request.build_opener(NoRedirect, urllib.request.ProxyHandler({}))  # no proxy for localhost


def probe(method: str, path: str, body: bytes | None = None) -> tuple[int, str]:
    req = urllib.request.Request(f"http://127.0.0.1:{PORT}{path}", data=body, method=method)
    try:
        with OPENER.open(req) as resp:
            return resp.status, resp.reason
    except urllib.error.HTTPError as err:
        extra = [f"{h}: {err.headers[h]}" for h in ("Retry-After", "Location") if h in err.headers]
        return err.code, " ".join([err.reason, *extra])


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
PORT = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()

for _ in range(200):  # burn through the rate limit first
    last = probe("GET", "/search")
cases = [
    ("1 signup, email exists", probe("POST", "/signup", b'{"email": "asha@example.com"}')),
    ("2 JSON missing a brace", probe("POST", "/signup", b'{"email": "new@example.com"')),
    ("3 200 requests in 1 s", last),
    ("4 database is down", probe("GET", "/orders")),
    ("5 DELETE succeeded", probe("DELETE", "/users/2")),
    ("6 moved permanently", probe("GET", "/old-pricing")),
]
for name, (code, reason) in cases:
    print(f"{name:26} {code} {reason}")
server.shutdown()` },
        output: "1 signup, email exists     409 Conflict\n2 JSON missing a brace     400 Bad Request\n3 200 requests in 1 s      429 Too Many Requests Retry-After: 1\n4 database is down         503 Service Unavailable Retry-After: 30\n5 DELETE succeeded         204 No Content\n6 moved permanently        301 Moved Permanently Location: /pricing",
        pitfalls: ["Using 500 for validation errors", "Using 401 for rate limiting"],
      },
    },
    intermediate: {
      title: "Add PUT, DELETE and caching to the server",
      brief: ["Extend server.py with PUT /users/{id} (replace, 200 or 404), DELETE /users/{id} (204 or 404), and send 405 Method Not Allowed with an Allow header for unsupported methods. Prove with curl that PUT and DELETE are idempotent."],
      criteria: ["Correct codes for every path", "Allow header on 405", "curl transcript showing repeated PUT gives the same state"],
      hints: ["BaseHTTPRequestHandler calls do_PUT, do_DELETE, do_PATCH by name.", "Repeated DELETE: first 204, then 404, but server state is the same, so it is still idempotent."],
      solution: {
        text: ["Idempotency is about server state, not identical responses: a second DELETE returns 404, but the user is still gone, so the effect is the same."],
        code: {
          lang: "python",
          code: `    def do_PUT(self) -> None:
        uid = self.path.removeprefix("/users/")
        if uid not in USERS:
            return self.send_json(404, {"error": "user not found"})
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        if not body.get("name"):
            return self.send_json(422, {"error": "name is required"})
        USERS[uid] = {"id": uid, "name": body["name"]}       # full replace
        self.send_json(200, USERS[uid])

    def do_DELETE(self) -> None:
        uid = self.path.removeprefix("/users/")
        if USERS.pop(uid, None) is None:
            return self.send_json(404, {"error": "user not found"})
        self.send_response(204)
        self.end_headers()

    def do_PATCH(self) -> None:
        self.send_json(405, {"error": "method not allowed"}, {"Allow": "GET, POST, PUT, DELETE"})`,
        },
      },
    },
    challenge: {
      title: "Design a caching policy for a news site",
      brief: ["A news site has: hashed JS/CSS, article images, the homepage (changes every minute), article pages (rarely change after an hour), a logged-in 'My account' page and an /api/me endpoint. Write the Cache-Control header for each and justify it. Bonus: explain `stale-while-revalidate`."],
      criteria: ["Six headers with reasons", "No personalised data cached publicly", "Explains revalidation vs expiry"],
      hints: ["`s-maxage` applies only to shared caches (CDNs)."],
      solution: {
        text: [
          "Hashed JS/CSS: `public, max-age=31536000, immutable`. Images (not hashed): `public, max-age=86400` plus ETag. Homepage: `public, max-age=0, s-maxage=60, stale-while-revalidate=30` so the CDN refreshes every minute and serves slightly stale content while refetching. Articles: `public, s-maxage=3600, stale-while-revalidate=600`. My account: `private, no-store`. /api/me: `private, no-cache` with ETag, or `no-store` if it contains sensitive data.",
          "stale-while-revalidate lets a cache serve an expired copy immediately while it fetches a fresh one in the background, hiding origin latency from users.",
          "Expiry vs revalidation: max-age and s-maxage say how long a copy may be reused without asking at all. Revalidation (no-cache, or max-age=0 with an ETag) means the cache asks every time but only downloads the body if it changed; otherwise it gets a 304 with no body.",
          "cache_policy.py keeps the whole policy in one ordered table, serves each resource type with its header and proves revalidation: sending the ETag back returns 304 with 0 body bytes. In production the same table becomes CDN rules or nginx `location` blocks.",
        ],
        code: { lang: "python", file: "cache_policy.py", code: `"""Caching policy for a news site, served and checked end to end.

Run: python3 cache_policy.py   (Python 3.10+, standard library only)
"""
import hashlib
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# (path prefix, Cache-Control, send an ETag?)   First match wins, so order matters.
POLICY: list[tuple[str, str, bool]] = [
    # Content-hashed name: a change means a new URL, so cache "forever".
    ("/assets/", "public, max-age=31536000, immutable", False),
    # Same URL may get a new image (crop, correction): a day, then revalidate cheaply.
    ("/images/", "public, max-age=86400", True),
    # Personal pages must never land in a shared cache, or on disk.
    ("/account", "private, no-store", False),
    # Personal API: browser may keep it but must revalidate (304 if unchanged).
    ("/api/me", "private, no-cache", True),
    # Articles: browsers revalidate, CDN keeps 1 h and may serve stale for 10 min while refetching.
    ("/articles/", "public, max-age=0, s-maxage=3600, stale-while-revalidate=600", True),
    # Homepage changes every minute: CDN holds 60 s, serves stale up to 30 s during refresh.
    ("/", "public, max-age=0, s-maxage=60, stale-while-revalidate=30", True),
]


def policy_for(path: str) -> tuple[str, bool]:
    for prefix, header, etag in POLICY:
        if path.startswith(prefix):  # "/" is last, so it catches the homepage and other HTML
            return header, etag
    raise LookupError(path)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        body = f"content of {self.path}".encode()  # stand-in for the real page or file
        cache_control, use_etag = policy_for(self.path)
        etag = '"' + hashlib.sha256(body).hexdigest()[:12] + '"'
        if use_etag and self.headers.get("If-None-Match") == etag:
            self.send_response(304)  # unchanged: headers only, no body
            body = b""
        else:
            self.send_response(200)
        self.send_header("Cache-Control", cache_control)
        if use_etag:
            self.send_header("ETag", etag)
        if self.path.startswith(("/account", "/api/me")):
            self.send_header("Vary", "Cookie")  # belt and braces for any cache in between
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args) -> None:
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
base = f"http://127.0.0.1:{server.server_address[1]}"
threading.Thread(target=server.serve_forever, daemon=True).start()
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

for path in ["/assets/app.3f9a1c.js", "/images/flood.jpg", "/", "/articles/budget-2026",
             "/account", "/api/me"]:
    with opener.open(base + path) as resp:
        print(f"{path:24} {resp.status} {resp.headers['Cache-Control']}")
        etag = resp.headers.get("ETag")
    if etag:  # prove revalidation: send the validator back, expect 304 and no body
        try:
            opener.open(urllib.request.Request(base + path, headers={"If-None-Match": etag}))
        except urllib.error.HTTPError as err:  # urllib reports 304 as an "error"
            print(f"{'':24} {err.code} on revalidation, {len(err.read())} body bytes")
server.shutdown()` },
        output: "/assets/app.3f9a1c.js    200 public, max-age=31536000, immutable\n/images/flood.jpg        200 public, max-age=86400\n                         304 on revalidation, 0 body bytes\n/                        200 public, max-age=0, s-maxage=60, stale-while-revalidate=30\n                         304 on revalidation, 0 body bytes\n/articles/budget-2026    200 public, max-age=0, s-maxage=3600, stale-while-revalidate=600\n                         304 on revalidation, 0 body bytes\n/account                 200 private, no-store\n/api/me                  200 private, no-cache\n                         304 on revalidation, 0 body bytes",
        pitfalls: ["Putting `public` or `s-maxage` on anything that differs per user", "Using no-cache when you mean no-store: no-cache still stores the response"],
      },
    },
    capstone: {
      title: "DevAtlas: API conventions document",
      brief: ["Write `docs/api-conventions.md` for DevAtlas: status codes per situation, error body format, caching rules per resource type, and cookie flags. Every future endpoint will follow it."],
      criteria: ["Error format with example", "Table of situation → status code", "Caching rule for static assets, HTML and API"],
      hints: ["Short and specific beats long and vague."],
      solution: {
        text: ["A one-page document is enough; reviewers will point to it in every API pull request."],
        code: {
          lang: "markdown",
          file: "docs/api-conventions.md",
          code: `# DevAtlas API conventions

## Errors
All errors return JSON: { "error": { "code": "snake_case_code", "message": "Human text", "details": {} } }

| Situation | Status |
|---|---|
| Created | 201 + Location |
| Deleted | 204 |
| Malformed JSON | 400 |
| Not logged in / bad token | 401 |
| Logged in, not allowed | 403 |
| Missing resource | 404 |
| Duplicate / version conflict | 409 |
| Validation failed | 422 (details lists fields) |
| Rate limited | 429 + Retry-After |
| Unexpected bug | 500 (log a request id, never leak stack traces) |

## Caching
- /assets/* (hashed): public, max-age=31536000, immutable
- index.html: no-cache
- /api/* user data: private, no-cache + ETag

## Cookies
refresh_token: HttpOnly; Secure; SameSite=Strict; Path=/api/auth`,
        },
      },
    },
  },
  deeper: [
    { label: "MDN: HTTP response status codes", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status" },
    { label: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
    { label: "RFC 9110: HTTP Semantics", url: "https://www.rfc-editor.org/rfc/rfc9110" },
    { label: "MDN: Cross-Origin Resource Sharing (CORS)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
  ],
  nextPreview: "Next: the terminal. You will navigate a Linux machine, read logs, find the process eating your CPU and chain commands with pipes.",
};
