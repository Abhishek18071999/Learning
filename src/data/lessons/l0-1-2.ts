import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.1.2",
  title: "HTTP in depth: methods, status codes, headers, caching",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.1.1 What happens when you type a URL"],
  summary: "Speak HTTP fluently: choose methods that can be retried safely, return status codes machines can branch on, use headers on purpose, and make responses fast with validators and caching instead of bigger servers.",
  terms: [
    { term: "Method (verb)", def: "What the client wants to do: GET (read), POST (create/submit), PUT (replace), PATCH (partial update), DELETE (remove), HEAD (headers only), OPTIONS (capabilities)." },
    { term: "Status code", def: "A 3-digit result: 1xx informational, 2xx success, 3xx redirect, 4xx client mistake, 5xx server failure." },
    { term: "Header", def: "A `Name: value` line of metadata on a request or response, e.g. `Content-Type: application/json`. Header names are case-insensitive." },
    { term: "Safe method", def: "A method that must not change server state: GET, HEAD, OPTIONS and TRACE. Crawlers, prefetchers and caches may call safe methods freely." },
    { term: "Idempotent", def: "Repeating the same request leaves the same server state: GET, HEAD, OPTIONS, PUT and DELETE are idempotent; POST is not; PATCH depends on the patch format." },
    { term: "Cache-Control", def: "The header that tells browsers and CDNs whether and how long they may reuse a response, and whether they must revalidate it." },
    { term: "ETag", def: "A version fingerprint of a response. The client sends it back with If-None-Match; if unchanged the server answers 304 Not Modified with no body." },
    { term: "Cookie", def: "A small value the server asks the browser to store and send back on later requests, typically to keep you logged in." },
    { term: "Freshness lifetime", def: "How long a cached response may be reused without contacting the server: `max-age` applies to every cache, `s-maxage` only to shared caches, and `Expires` is an absolute date." },
    { term: "Validator", def: "A cheap fingerprint of a stored response, either an ETag (strong or weak) or a Last-Modified date, that a conditional request sends back so the server can answer 304 instead of resending the body." },
    { term: "Revalidation", def: "A conditional request made after freshness expires: `If-None-Match` or `If-Modified-Since`. A 304 means reuse the stored body; a 200 means replace it." },
    { term: "Vary", def: "A response header listing request headers that are part of the cache key. `Vary: Accept-Encoding` keeps gzip and identity versions apart; `Vary: *` makes a response effectively uncacheable." },
  ],
  problem: [
    "Your API returns `200 OK` with `{\"error\": \"not found\"}` for missing users. The mobile team's retry logic thinks every call succeeded. The monitoring dashboard shows 0% errors while customers cannot log in.",
    "Meanwhile the homepage logo, which has not changed in a year, is downloaded on every page view by every visitor, 40 million times a day, costing real bandwidth money. Both problems are HTTP vocabulary problems: wrong status codes and missing cache headers. The fix is not a bigger server; it is a contract that clients, proxies and caches can actually read.",
  ],
  concept: {
    analogy: [
      "HTTP is like ordering at a restaurant counter. The **method** is the kind of request (\"I'd like to see the menu\" = GET, \"I'd like to place an order\" = POST, \"replace my whole order with this one\" = PUT). The **headers** are details on the order slip (\"no onions\", \"takeaway\", \"I speak English\"). The **status code** is the reply (\"here you go\" = 200, \"we don't have that\" = 404, \"kitchen is on fire\" = 500). **Caching** is the customer keeping the menu instead of asking for a new copy every visit, and an **ETag** is the menu's version number: the customer asks \"is it still version 7?\" and the counter can answer \"yes, same one\" (304) without reprinting it.",
    ],
    precise: [
      "An HTTP message is a start line, headers, a blank line and an optional body. Requests start with `METHOD /path HTTP/version`; responses start with `HTTP/version STATUS reason`. HTTP/2 and HTTP/3 change how bytes are framed on the wire, but the meaning (methods, headers, status codes) is the same. Header names are case-insensitive; header values are often case-sensitive and may be quoted, comma-separated or repeated.",
      "**Methods carry promises.** GET must be safe, so crawlers, prefetchers and caches can call it freely. PUT and DELETE must be idempotent, so clients can retry them after a timeout. POST has no such promise, which is why payment APIs add idempotency keys: the client sends a unique key, and the server returns the original result instead of creating a second charge. PATCH is idempotent only if the patch itself is (\"set name to Asha\" is; \"increment the counter\" is not).",
      "**Status codes are a contract with machines.** Retries, alerts, browsers and CDNs branch on the code, not on your JSON body. 4xx means \"the client must change something\" (400 malformed, 401 unauthenticated, 403 forbidden, 404 missing, 405 wrong method, 409 conflict, 422 invalid, 429 rate limited). 5xx means \"the server failed\" (500 bug, 502 bad upstream response, 503 unavailable, 504 upstream timeout), and retrying later might work.",
      "**Caching** is controlled by response headers. `Cache-Control: max-age=31536000, immutable` lets a fingerprinted file be reused for a year without asking. `no-cache` means \"store it but revalidate every time\" (using ETag or Last-Modified); `no-store` means never store it (sensitive data); `private` keeps it out of shared caches. `stale-while-revalidate` lets a cache serve an expired copy immediately while it refreshes in the background, and `Vary` names the request headers that select one stored variant over another.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Safe and idempotent are different promises.** A method is *safe* when it has no intended side effect: GET, HEAD, OPTIONS and TRACE. A method is *idempotent* when doing it once or ten times leaves the same server state: GET, HEAD, OPTIONS, PUT and DELETE. Safe implies idempotent, but not the reverse: PUT and DELETE change state, yet repeating them converges. This matters because browsers prefetch links, crawlers follow GETs, proxies retry after a dropped connection, and mobile clients retry after a timeout. A GET that deletes a row will be triggered by a link preview; a POST that charges a card will double-charge on retry unless the client sends an `Idempotency-Key` and the server deduplicates it. PUT replaces the whole representation, so a concurrent editor can silently clobber another's changes; use `If-Match` with an ETag to turn that race into a 412 Precondition Failed, or use PATCH with a format whose semantics you understand.",
      "2. **Status families, and the codes that actually change behaviour.** 1xx is informational (100 Continue, 101 Switching Protocols). 2xx is success: 200 with a body, 201 Created with `Location`, 204 No Content with no body, 206 Partial Content for ranges. 3xx is redirection: 301 and 308 are permanent, 302 and 307 temporary, and 304 Not Modified is the conditional-request answer. 4xx is the client's problem: 400 malformed syntax, 401 not authenticated (send `WWW-Authenticate`), 403 authenticated but not allowed, 404 missing, 405 wrong method (send `Allow`), 409 conflict with current state, 422 well-formed but invalid, 429 rate limited (send `Retry-After`). 5xx is the server's: 500 unhandled bug, 502 a bad response from an upstream, 503 temporarily unavailable or overloaded, 504 an upstream timeout. Clients and SDKs retry 408, 425, 429, 500, 502, 503 and 504 with backoff; they generally do not retry other 4xx. A 204 or 304 must not carry a body. A 401 without `WWW-Authenticate` is technically incomplete, and a 500 that leaks a stack trace is a security bug, not a debugging aid.",
      "3. **Headers are the metadata that changes meaning.** `Host` is required in HTTP/1.1 and tells a shared IP which site you want (TLS carries the same name as SNI). `Content-Type` says how to parse the body (`application/json; charset=utf-8`); `Accept` says what the client can parse, which is how one URL serves JSON or HTML. `Authorization` carries credentials, normally `Bearer <token>`; never put a token in a URL, because URLs end up in logs, Referer headers and browser history. `Cache-Control` and the validators (`ETag`, `Last-Modified`, `If-None-Match`, `If-Modified-Since`) control reuse. `Vary` names the request headers that make two responses different, so a shared cache does not hand a gzip body to a client that asked for identity, or a French page to an English client. `Set-Cookie` carries `HttpOnly` (hide from JavaScript), `Secure` (HTTPS only), `SameSite` (limit cross-site sending), `Path` and `Max-Age`. `Content-Length` and `Transfer-Encoding: chunked` are two ways to frame a body. `Connection: keep-alive` asks to reuse the socket; HTTP/2 and HTTP/3 make that reuse the default.",
      "4. **Freshness: how long a cache may answer without asking.** `Cache-Control: max-age=600` lets every cache reuse the response for 600 seconds. `s-maxage` overrides it for shared caches such as a CDN, which is how a page can be fresh for a minute at the edge but always revalidated in the browser. `Expires` is an absolute date and suffers from clock skew, so `max-age` is preferred. `public` allows shared caching; `private` allows only the browser; `no-cache` allows storage but requires revalidation before every reuse; `no-store` forbids storage entirely. `immutable` tells the browser not to revalidate even on reload, which is safe only for content-hashed URLs. `must-revalidate` forbids serving stale after expiry, while `stale-while-revalidate=30` explicitly allows 30 seconds of staleness while a refresh runs. `Age` reports how many seconds a shared cache has already held the response. Without explicit headers, caches may apply heuristic freshness (often 10% of the time since `Last-Modified`), which is why \"it worked in testing\" is not a caching strategy.",
      "5. **Validators turn a full download into a cheap question.** An ETag is an opaque fingerprint; a strong ETag (`\"v7\"`) promises byte-for-byte identity, while a weak ETag (`W/\"v7\"`) promises semantic equivalence (the gzip and identity encodings can share one). `Last-Modified` has one-second granularity and is easy to generate from a database timestamp. On the next request the cache sends `If-None-Match: \"v7\"` (and may also send `If-Modified-Since`); `If-None-Match` wins when both are present. If nothing changed, the server returns 304 with validators and updated cache headers but no body, and the cache reuses the stored bytes. For writes, `If-Match` is the optimistic-locking tool: the server compares the client's ETag with the current one and returns 412 if someone else won the race. A 304 saves bandwidth but still costs a round trip, and the server still has to compute the validator; derive it from a cheap version column or a hash of the body, not from an expensive query you were trying to avoid.",
      "6. **stale-while-revalidate and stale-if-error change the latency and failure story.** After `max-age` expires, a cache may serve the stale copy for up to `stale-while-revalidate=N` seconds while it fetches a fresh one in the background. The user gets an immediate response and the origin gets one refresh instead of a stampede. `stale-if-error=N` allows the cache to keep serving the stale copy when the origin returns 5xx or times out, which turns a partial outage into a degraded but usable experience. Both are trade-offs: a news homepage can tolerate 30 seconds of staleness; an account balance, a stock price or a one-time token cannot. `must-revalidate` deliberately disables the stale window, and some CDNs support these directives only on certain plans, so verify the behaviour you are paying for instead of assuming the header is honoured.",
      "7. **Compression and connection semantics decide how many bytes and round trips you pay.** The client advertises `Accept-Encoding: gzip, deflate, br, zstd`; the server picks one and replies with `Content-Encoding`. Compress text (HTML, CSS, JavaScript, JSON, SVG, fonts), not already-compressed media (JPEG, PNG, WebP, MP4, zip), where CPU cost buys almost nothing. Always send `Vary: Accept-Encoding`, or a shared cache can serve a gzip body to a client that cannot decode it. Compression plus reflected secrets is the BREACH attack, so do not compress responses that mix secrets and attacker-controlled input. A body is framed either by `Content-Length` or by `Transfer-Encoding: chunked` when the length is unknown. HTTP/1.1 keeps the TCP connection open by default and processes one response at a time, so a slow response blocks the ones behind it; HTTP/2 multiplexes many streams over one connection but still stalls on a lost TCP packet; HTTP/3 runs over QUIC and removes that transport stall. Measure the real path: in this lesson GitHub's JSON was 1350 bytes plain and 517 bytes with gzip, and MDN answered with `Content-Encoding: br` and `Vary: Accept-Encoding`.",
      "8. **CORS is a browser rule, not a server firewall.** A page from origin A may read a response from origin B only if B returns an `Access-Control-Allow-Origin` that matches A (or `*` when credentials are not used). Non-simple requests (custom headers, `PUT`, `DELETE`, JSON `Content-Type`) trigger a preflight `OPTIONS` carrying `Access-Control-Request-Method` and `Access-Control-Request-Headers`; the server answers with `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age` and the origin. With cookies or `Authorization`, the browser sends credentials and the server must name an explicit origin plus `Access-Control-Allow-Credentials: true`; `*` is not allowed. CORS protects the user's browser from cross-site reads; it does not stop curl, a server, or an attacker who can already run code. Never use CORS as authorization, and never assume a request is safe because it passed a preflight. GitHub's real preflight for its API returned 204 with `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE` and a long `Access-Control-Allow-Headers` list.",
    ],
    diagram: {
      title: "One cacheable response, from origin to 304",
      nodes: [
        { label: "Origin", sub: "200 + ETag + Cache-Control" },
        { label: "Browser cache", sub: "body + validator" },
        { label: "Fresh window", sub: "age < max-age" },
        { label: "Revalidate", sub: "If-None-Match" },
        { label: "304", sub: "headers only" },
        { label: "Reuse", sub: "no body transfer" },
      ],
      edges: ["store", "within lifetime", "expired", "unchanged", "reuse"],
      caption: "Freshness avoids the request entirely; a validator makes the request cheap. A 304 still costs one round trip, which is why stale-while-revalidate exists.",
    },
  },
  handsOn: [
    {
      title: "Dump a real response's headers",
      text: [
        "`curl -I` sends a HEAD request and prints only the response headers. Run it against GitHub's public API and read the dump from top to bottom: status line, cache policy, validators, content negotiation, CORS and security headers.",
      ],
      code: { lang: "powershell", code: "curl.exe -sI https://api.github.com/users/octocat | findstr /b /i \"HTTP/ Content-Type: Cache-Control: Vary: ETag: Last-Modified: Access-Control-Allow-Origin: Strict-Transport-Security: X-Content-Type-Options: Content-Length: Accept-Ranges: X-RateLimit-Limit: X-RateLimit-Remaining:\"" },
      output: `HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=60, s-maxage=60
Vary: Accept,Accept-Encoding, Accept, X-Requested-With
ETag: W/"dc09526b8ef849ee85d06b6016dc428bf1092369a38d0d71999e0427e8cf113b"
Last-Modified: Tue, 22 Sep 2026 11:46:44 GMT
Access-Control-Allow-Origin: *
Strict-Transport-Security: max-age=31536000; includeSubdomains; preload
X-Content-Type-Options: nosniff
Accept-Ranges: bytes
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 50
Content-Length: 1350`,
      notes: [
        "`Cache-Control: public, max-age=60, s-maxage=60` means a browser may reuse this for 60 s and a shared CDN for 60 s. `Vary` adds `Accept`, `Accept-Encoding` and `X-Requested-With` to the cache key, so a JSON variant is not confused with another representation.",
        "`ETag` and `Last-Modified` are validators for the next request. `Content-Type` says how to parse the body; `Content-Length: 1350` is the size HEAD would have returned. `Accept-Ranges: bytes` advertises range requests.",
        "`Access-Control-Allow-Origin: *` is CORS; `Strict-Transport-Security` and `X-Content-Type-Options` are security headers. The unfiltered dump also carried `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy` and `Access-Control-Expose-Headers`. `X-RateLimit-*` are API quota metadata, not part of HTTP itself.",
        "Values are per request: the filtered output omits `Date` and `X-GitHub-Request-Id`, which change on every call, and the remaining quota moves. Header names are case-insensitive; the server's capitalisation is cosmetic.",
        "`curl -I` is HEAD, so it shows headers only. `curl -i` does a GET and prints headers plus body; `curl -sI` is the same as `-I` but quiet. Compression is negotiated separately: asking GitHub for gzip turned the same 1350-byte JSON into 517 bytes, and MDN answered with `Content-Encoding: br` and `Vary: Accept-Encoding`.",
      ],
    },
    {
      title: "Ask whether anything changed, and get a 304",
      text: [
        "httpbin's `/etag` endpoint returns a known ETag. Fetch it, send it back in `If-None-Match`, and compare the bytes transferred. The last two commands print the status and body size so the saving is visible.",
      ],
      code: {
        lang: "powershell",
        code: `curl.exe -sI https://httpbin.org/etag/devatlas-v1 | findstr /b /i "HTTP/ Content-Type: Content-Length: ETag:"
"--- conditional ---"
curl.exe -sI -H "If-None-Match: devatlas-v1" https://httpbin.org/etag/devatlas-v1 | findstr /b /i "HTTP/ Content-Type: Content-Length: ETag:"
"--- bytes ---"
curl.exe -s -o NUL -w "first: %{http_code} %{size_download} bytes\\n" https://httpbin.org/etag/devatlas-v1
curl.exe -s -o NUL -w "cond:  %{http_code} %{size_download} bytes\\n" -H "If-None-Match: devatlas-v1" https://httpbin.org/etag/devatlas-v1`,
      },
      output: `HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 269
ETag: devatlas-v1
--- conditional ---
HTTP/1.1 304 NOT MODIFIED
ETag: devatlas-v1
--- bytes ---
first: 200 269 bytes
cond:  304 0 bytes`,
      notes: [
        "The 304 has no body and `size_download` is 0. The client reuses the stored bytes; the server only confirms that the validator still matches.",
        "The ETag is opaque: do not parse it, sort it or assume it is a hash. Send it back exactly as received. A weak ETag (`W/\"...\"`) is compared with the weak comparison function, not byte-for-byte.",
        "`If-Modified-Since` is the date-based fallback; when both validators are present, `If-None-Match` takes precedence. `If-Match` is the write-side counterpart: if the ETag no longer matches, the server returns 412 instead of overwriting someone else's change.",
        "A 304 still costs a round trip, so it saves bandwidth, not latency. `stale-while-revalidate` hides that round trip by serving the stale copy while the refresh happens in the background.",
      ],
    },
    {
      title: "A five-method API with honest status codes",
      text: [
        "This extends the tiny server from earlier with PUT, DELETE, PATCH, a redirect and a rate limit. The client at the bottom starts the server on an ephemeral port and prints what a real HTTP client sees. Run it; every line is a contract, not a convention.",
      ],
      code: {
        lang: "python",
        file: "http_tour.py",
        code: `import hashlib, http.client, json, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
USERS = {"1": {"id": "1", "name": "Asha", "email": "asha@example.com"}}
NEXT_ID = 2
def etag_for(user):
    return '"' + hashlib.sha256(json.dumps(user, sort_keys=True).encode()).hexdigest()[:16] + '"'
class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def reply(self, status, body=None, headers=None):
        data = b"" if body is None else json.dumps(body).encode()
        self.send_response(status)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        if body is not None:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if data:
            self.wfile.write(data)
    def read_json(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        return json.loads(raw) if raw else {}
    def do_GET(self):
        if self.path == "/old-pricing":
            return self.reply(301, headers={"Location": "/pricing"})
        if self.path == "/pricing":
            return self.reply(200, {"plan": "free"})
        if self.path == "/limited":
            return self.reply(429, {"error": "rate limited"}, {"Retry-After": "30"})
        if not self.path.startswith("/users/"):
            return self.reply(404, {"error": "route not found"})
        user = USERS.get(self.path.removeprefix("/users/"))
        if user is None:
            return self.reply(404, {"error": "user not found"})
        etag = etag_for(user)
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", "0")
            return self.end_headers()
        self.reply(200, user, {"ETag": etag, "Cache-Control": "no-cache"})
    def do_POST(self):
        if self.path != "/users":
            return self.reply(404, {"error": "route not found"})
        try:
            body = self.read_json()
        except json.JSONDecodeError:
            return self.reply(400, {"error": "body must be JSON"})
        if not body.get("name") or not body.get("email"):
            return self.reply(422, {"error": "name and email are required"})
        if any(u["email"] == body["email"] for u in USERS.values()):
            return self.reply(409, {"error": "email already registered"})
        global NEXT_ID
        new_id = str(NEXT_ID)
        NEXT_ID += 1
        USERS[new_id] = {"id": new_id, "name": body["name"], "email": body["email"]}
        self.reply(201, USERS[new_id], {"Location": f"/users/{new_id}"})
    def do_PUT(self):
        uid = self.path.removeprefix("/users/")
        if uid not in USERS:
            return self.reply(404, {"error": "user not found"})
        try:
            body = self.read_json()
        except json.JSONDecodeError:
            return self.reply(400, {"error": "body must be JSON"})
        if not body.get("name") or not body.get("email"):
            return self.reply(422, {"error": "name and email are required"})
        USERS[uid] = {"id": uid, "name": body["name"], "email": body["email"]}
        self.reply(200, USERS[uid], {"ETag": etag_for(USERS[uid])})
    def do_DELETE(self):
        uid = self.path.removeprefix("/users/")
        if USERS.pop(uid, None) is None:
            return self.reply(404, {"error": "user not found"})
        self.reply(204)
    def do_PATCH(self):
        self.reply(405, {"error": "method not allowed"}, {"Allow": "GET, POST, PUT, DELETE"})
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
PORT = server.server_address[1]
threading.Thread(target=server.serve_forever, daemon=True).start()
def call(method, path, body=None, headers=None):
    conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=5)
    conn.request(method, path, body=None if body is None else json.dumps(body).encode(), headers=headers or {})
    resp = conn.getresponse()
    data = resp.read()
    result = (resp.status, {k.lower(): v for k, v in resp.getheaders()}, data)
    conn.close()
    return result
def show(label, method, path, body=None, headers=None):
    status, headers, data = call(method, path, body, headers)
    extra = " ".join(f"{n}={headers[n]}" for n in ("location", "allow", "retry-after", "etag") if n in headers)
    print(f"{label:34} {status}  {extra:28} body={data.decode() if data else ''}")
first = call("GET", "/users/1")[1]["etag"]
cases = [
    ("GET /users/1", "GET", "/users/1", None, None),
    ("GET /users/1 If-None-Match", "GET", "/users/1", None, {"If-None-Match": first}),
    ("GET /users/99", "GET", "/users/99", None, None),
    ("POST /users (new)", "POST", "/users", {"name": "Ravi", "email": "ravi@example.com"}, None),
    ("POST /users (duplicate email)", "POST", "/users", {"name": "Ravi", "email": "ravi@example.com"}, None),
    ("POST /users (missing email)", "POST", "/users", {"name": "Mira"}, None),
    ("PUT /users/1 (replace)", "PUT", "/users/1", {"name": "Asha R.", "email": "asha@example.com"}, None),
    ("PUT /users/1 (same body again)", "PUT", "/users/1", {"name": "Asha R.", "email": "asha@example.com"}, None),
    ("DELETE /users/2", "DELETE", "/users/2", None, None),
    ("DELETE /users/2 (again)", "DELETE", "/users/2", None, None),
    ("PATCH /users/1", "PATCH", "/users/1", {"name": "A"}, None),
    ("GET /old-pricing", "GET", "/old-pricing", None, None),
    ("GET /limited", "GET", "/limited", None, None),
]
for case in cases:
    show(*case)
server.shutdown()`,
      },
      output: `GET /users/1                       200  etag="6bf253eba232d960"      body={"id": "1", "name": "Asha", "email": "asha@example.com"}
GET /users/1 If-None-Match         304  etag="6bf253eba232d960"      body=
GET /users/99                      404                               body={"error": "user not found"}
POST /users (new)                  201  location=/users/2            body={"id": "2", "name": "Ravi", "email": "ravi@example.com"}
POST /users (duplicate email)      409                               body={"error": "email already registered"}
POST /users (missing email)        422                               body={"error": "name and email are required"}
PUT /users/1 (replace)             200  etag="c09a1153c194abe4"      body={"id": "1", "name": "Asha R.", "email": "asha@example.com"}
PUT /users/1 (same body again)     200  etag="c09a1153c194abe4"      body={"id": "1", "name": "Asha R.", "email": "asha@example.com"}
DELETE /users/2                    204                               body=
DELETE /users/2 (again)            404                               body={"error": "user not found"}
PATCH /users/1                     405  allow=GET, POST, PUT, DELETE body={"error": "method not allowed"}
GET /old-pricing                   301  location=/pricing            body=
GET /limited                       429  retry-after=30               body={"error": "rate limited"}`,
      notes: [
        "A successful create is `201` with `Location: /users/2`; the client can follow that to the new resource. A successful delete is `204` with no body. `304` is also bodyless.",
        "The same PUT twice returns the same body and the same ETag: server state converged, so PUT is idempotent. The second DELETE returns `404` instead of `204`, but the user is still gone, so DELETE is still idempotent. This is the distinction interviewers listen for.",
        "`400` is malformed syntax; `422` is well-formed but missing a required field; `409` is a valid request that conflicts with existing state. Three different fixes for the client.",
        "`405` must include `Allow`, and `429` should include `Retry-After`. `301` is permanent; if the method must be preserved on a permanent move, use `308` instead.",
        "The earlier, smaller version of this server produced `HTTP/1.0 201 Created`, `Location: /users/2` and `{\"id\": \"2\", \"name\": \"Ravi\"}` for the same POST. This version keeps that contract and adds the other methods, conditional GET, the redirect and the rate limit.",
        "The server is intentionally plain `http.server`; a framework such as ASP.NET Core, Express or FastAPI does the same semantics but hides the header plumbing. The contract is what matters, not the framework.",
      ],
    },
    {
      title: "Methods and status codes at a glance",
      text: [
        "Keep this table next to you when designing an endpoint. *Safe* means no intended state change; *idempotent* means repeating the request leaves the same server state. The status table names the codes that change client behaviour, not every code in the registry.",
      ],
      code: {
        lang: "text",
        file: "methods-status.txt",
        code: `METHOD   SAFE?  IDEMPOTENT?  BODY?  SUCCESS  USE WHEN
GET      yes    yes          no     200      read; caches, crawlers and prefetchers may call it
HEAD     yes    yes          no     200      headers only (curl -I)
OPTIONS  yes    yes          no     204      capabilities or CORS preflight
POST     no     no           yes    201      create or submit; add Idempotency-Key to retry
PUT      no     yes          yes    200/204  replace the whole resource
PATCH    no     maybe        yes    200      partial update; the patch format decides idempotency
DELETE   no     yes          no     204      remove; a second call may be 404, state unchanged

STATUS  MEANING                         NEXT?   WATCH OUT
200     OK, body follows                no      never hide errors here
201     Created                         no      send Location
204     No Content                      no      must not send a body
206     Partial Content                 range   Range requests
301     Moved Permanently               follow  may rewrite POST to GET; use 308 to preserve the method
302     Found (temporary)               follow  historically loose; use 307 to preserve the method
304     Not Modified                    reuse   no body; reuse the cached copy
307/308 Temporary/Permanent Redirect    follow  method and body are preserved
400     Bad Request                     no      malformed syntax or wrong types
401     Unauthorized                    no      not authenticated; send WWW-Authenticate
403     Forbidden                       no      authenticated but not allowed
404     Not Found                       no      missing; sometimes used to hide 403
405     Method Not Allowed              no      send Allow
409     Conflict                        no      duplicate or version conflict
412     Precondition Failed             no      If-Match lost an optimistic-lock race
422     Unprocessable Content           no      well-formed but invalid
429     Too Many Requests               retry   send Retry-After
500     Internal Server Error           maybe   bug; log a request id, never leak a stack trace
502     Bad Gateway                     retry   upstream returned a bad response
503     Service Unavailable             retry   overload or maintenance; send Retry-After
504     Gateway Timeout                 retry   upstream was too slow`,
      },
      notes: [
        "The retry column is a default, not a law: retry only operations you know are safe to repeat. POST needs an idempotency key before a client may retry it.",
        "`301`/`302` are historical and some clients rewrite the method; `307`/`308` preserve both method and body. Choose deliberately instead of copying whichever constant your framework defaults to.",
      ],
    },
    {
      title: "Draw the cache decision",
      text: [
        "This is the decision a browser or CDN makes for every cacheable response. The 304 branch saves bytes; the stale-while-revalidate branch saves latency. If a box is missing from your design, your cache behaviour is accidental.",
      ],
      code: {
        lang: "mermaid",
        file: "cache-decision.mmd",
        code: `flowchart TD
  A[Request] --> B{Cached copy?}
  B -- no --> C[GET origin]
  B -- yes --> D{age < max-age?}
  D -- yes --> E[Serve from cache]
  D -- no --> F{Validator?}
  F -- no --> C
  F -- yes --> G[Send If-None-Match]
  G --> H{304?}
  H -- yes --> I[Serve cached body]
  H -- no --> J[Replace with 200 body]
  C --> K[Store body + ETag]
  K --> E`,
      },
      notes: [
        "Add a `stale-while-revalidate` branch between `expired` and `revalidate` for content that can tolerate a few seconds of staleness. Add a `stale-if-error` branch for outages.",
        "The diagram is also a review checklist: `Vary` belongs on the cache key, `no-store` bypasses the whole chart, and personalized responses must never reach a shared cache.",
      ],
    },
  ],
  companies: [
    "**GitHub REST API (verified in this lesson):** the header dump in step 1 shows `Cache-Control: public, max-age=60, s-maxage=60`, `ETag`, `Last-Modified`, `Vary: Accept,Accept-Encoding, Accept, X-Requested-With`, CORS headers and `X-RateLimit-*` quota headers. GitHub's real preflight returned `204` with `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE`. Conditional GETs plus rate-limit headers are how clients poll a public API without downloading unchanged bodies or hammering the quota.",
    "**Wikimedia / Wikipedia (verified in this lesson):** the homepage answered `Cache-Control: s-maxage=86400, must-revalidate, max-age=3600` with a weak `ETag`, an `Age` counter and `Set-Cookie` values carrying `HttpOnly` and `secure`. In our test the edge answered `200` rather than `304` to `If-None-Match`, a useful reminder that a validator only saves bytes when the CDN in front of the origin actually honours it.",
    "**MDN and Cloudflare (verified in this lesson):** MDN returned `Content-Encoding: br` with `Vary: Accept-Encoding` and a one-hour `max-age`; a Cloudflare-fronted homepage returned `Cache-Control: no-store`. Brotli saves bytes, but only if the cache key includes the encoding, otherwise a client that cannot decode it receives garbage.",
    "**Stripe (illustrative):** Stripe's API is the canonical example of idempotency keys for POST: the client sends a unique `Idempotency-Key`, and a retried payment returns the original result instead of charging twice. They also document their status codes precisely because SDKs decide whether to retry from the code, not from the prose.",
    "**Vite and modern bundlers (illustrative):** content-hashed filenames such as `app.3f9a1c.js` let static assets be served with `max-age=31536000, immutable`, while the HTML that references them stays `no-cache`. Vite built this app, and the deploy pattern is the same one used by most single-page applications: new hash, new URL, no cache purge required.",
  ],
  mistakes: [
    { mistake: "Returning 200 with an error body", why: "It feels simpler to always return 200", wrong: "Clients, retries, CDNs and alerts treat failures as success", fix: "Use the correct 4xx/5xx code and a consistent error body with a stable code" },
    { mistake: "Changing data in a GET handler", why: "Links like /delete?id=5 are easy", wrong: "Crawlers, prefetchers and link previews trigger the change", fix: "GET must be safe; use POST/DELETE for changes" },
    { mistake: "Caching HTML for a long time", why: "Copying asset cache rules to everything", wrong: "Users keep the old page after a deploy and load missing old assets", fix: "HTML: no-cache. Fingerprinted assets: long max-age + immutable" },
    { mistake: "Confusing 401 and 403", why: "Both sound like 'not allowed'", wrong: "Clients prompt for login when they should show 'access denied' (or vice versa)", fix: "401 = not authenticated; 403 = authenticated but not permitted" },
    { mistake: "Caching personalised responses publicly", why: "Turning on CDN caching globally", wrong: "One user's account page is served to another user", fix: "Use Cache-Control: private or no-store for user-specific data; vary on auth" },
    { mistake: "Retrying POST without an idempotency key", why: "The network failed, so retrying feels safe", wrong: "A payment or order is created twice", fix: "Send a unique Idempotency-Key and have the server deduplicate it, or use PUT when the operation is a replacement" },
    { mistake: "Using no-cache when you mean no-store", why: "The names sound equally strict", wrong: "Sensitive responses are written to disk and can be read later by another user of the same device", fix: "no-cache = store but revalidate; no-store = never store. Use no-store for tokens and personal data" },
    { mistake: "Forgetting Vary: Accept-Encoding", why: "Compression is configured at the proxy, far from the cache rules", wrong: "A shared cache serves a gzip body to a client that sent no Accept-Encoding, or the reverse", fix: "Send Vary: Accept-Encoding on every compressed response and include it in the CDN cache key" },
    { mistake: "Using 301 or 302 when the method must survive", why: "They are the codes most examples use", wrong: "A POST is rewritten to GET, or its body is dropped, during the redirect", fix: "Use 308 for a permanent move and 307 for a temporary one when method and body matter" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Make status codes truthful; give every error a JSON body like `{\"error\": {\"code\": \"user_not_found\", \"message\": \"...\"}}`, and log a request id on 5xx." },
    { tag: "Performance", text: "Fingerprint static assets and cache them for a year; revalidate HTML and API responses with ETags; compress text responses and send `Vary: Accept-Encoding`." },
    { tag: "Security", text: "Session cookies: HttpOnly, Secure, SameSite. Sensitive responses: Cache-Control: no-store. Never put tokens in URLs, and do not treat CORS as authorization." },
    { tag: "Maintainability", text: "Return 201 + Location for creates, 204 for deletes and 405 + Allow for wrong methods; document the status table once and use it everywhere." },
    { tag: "Cost", text: "Every cache hit at the CDN is bandwidth and compute you do not pay for at the origin; `s-maxage` and `stale-while-revalidate` cut both cost and latency." },
  ],
  interview: [
    { q: "Explain safe vs idempotent. Why does it matter for retries and caching, and where does PATCH fit?", a: "Safe means no intended state change: GET, HEAD, OPTIONS and TRACE. Idempotent means repeating the request leaves the same server state: GET, HEAD, OPTIONS, PUT and DELETE. Safe implies idempotent, but PUT and DELETE are idempotent without being safe. This matters because browsers prefetch GETs, crawlers follow them, proxies retry dropped connections and mobile clients retry timeouts. A safe GET can be called speculatively; an idempotent PUT or DELETE can be retried after a timeout; a POST cannot, because a retry may create a second order or charge a card twice. That is why payment APIs accept an Idempotency-Key on POST and return the original result for a duplicate key. DELETE is still idempotent even though the second call returns 404: the server state is the same, only the response differs. PATCH is idempotent only if the patch is, so 'set name to Asha' is idempotent while 'increment the counter' is not. PUT also replaces the whole representation, so a concurrent edit can be lost; use If-Match with an ETag to return 412 rather than clobber someone else's change.",
    },
    { q: "Walk through a conditional GET from the first response to a 304. What exactly is sent, what is saved, and when does it not help?", a: "The first response is 200 with a body, a validator (ETag and often Last-Modified) and a freshness policy such as max-age=60. The cache stores the body, the validator and the headers. Within max-age it reuses the response with no request at all. After expiry it sends a conditional request: If-None-Match with the stored ETag, and optionally If-Modified-Since; when both are present, If-None-Match wins. The server compares the validator with the current representation. If unchanged it returns 304 with the validators and updated cache headers but no body, and the cache reuses the stored bytes. If changed it returns 200 with a new body and new validators. A 304 saves bandwidth but still costs a round trip, and the server still has to compute the validator, so derive it from a cheap version column or a body hash rather than an expensive query. A weak ETag is compared semantically, which lets gzip and identity representations share one validator. For writes, If-Match is the optimistic-lock counterpart: a stale ETag produces 412. It does not help when the CDN ignores the condition (as Wikimedia's edge did in our test), when the response is personalised and must not be stored, or when the round trip itself is the bottleneck; stale-while-revalidate exists for that last case.",
    },
    { q: "Design the status codes and caching for a users API. Walk through create, read, replace, delete, validation, duplicate, rate limit and an upstream failure.", a: "POST /users: 201 with Location on success, 400 for malformed JSON, 422 for missing or invalid fields, 409 when the email is already registered, 429 with Retry-After when the client exceeds its budget. GET /users/{id}: 200 with the user, ETag and Cache-Control: private, no-cache (or no-store if it contains sensitive data), 404 when missing, 401 when there is no valid token, 403 when the caller may not read that user. PUT /users/{id}: 200 with the replaced representation or 204 if there is nothing to return, 404 when the id does not exist, 409 for a version conflict and 412 when If-Match fails. DELETE: 204 on success, 404 when already gone (still idempotent). Wrong method: 405 with Allow. Server-side failures: 500 for an unhandled bug with a request id and no stack trace, 502 when an upstream returns a bad response, 503 when a dependency is down or the service is overloaded with Retry-After, 504 when an upstream times out. On caching: hashed assets get public, max-age=31536000, immutable; HTML gets no-cache; /api/me gets private, no-cache plus an ETag; anything personalised must never get public or s-maxage. Add Vary: Accept-Encoding for compressed responses and Vary: Authorization (or a private directive) if a shared cache could otherwise mix users. CORS goes on the response, but it is not authorization: the token check still happens on the server.",
    },
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
      options: ["Cache-Control: no-cache", "ETag: \"3f9a1c\"", "Cache-Control: max-age=31536000, immutable", "Expires: 0"],
      answer: 2,
      explanation: "no-cache forces revalidation every time; ETag alone only makes revalidation cheap; max-age with immutable allows reuse without asking.",
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
    "GET safe; PUT/DELETE idempotent; POST neither; PATCH depends on the patch.",
    "2xx ok · 3xx redirect · 4xx client must change · 5xx server failed.",
    "201 + Location for create; 204 for delete; 422 validation; 409 conflict; 429 + Retry-After.",
    "401 = who are you? 403 = I know you, and no. 404 can hide a 403.",
    "Assets: hashed name + max-age=31536000, immutable. HTML: no-cache.",
    "ETag + If-None-Match → 304, no body. If-Match → 412 on a lost race.",
    "no-cache stores then revalidates; no-store never stores; private = browser only; s-maxage = shared cache only.",
    "stale-while-revalidate serves stale while refreshing; Vary: Accept-Encoding keys compressed variants.",
    "Cookies: HttpOnly, Secure, SameSite. Private data: no-store.",
    "CORS is enforced by browsers, not servers. Preflight is OPTIONS; credentials forbid `*`.",
  ],
  homework: {
    basic: {
      title: "Status code detective",
      brief: ["For each scenario pick the status code and explain in one line: (1) signup with an email that exists, (2) JSON with a missing closing brace, (3) user hits the API 200 times in a second, (4) database is down, (5) DELETE succeeded, (6) resource moved permanently to a new URL."],
      criteria: ["Six codes with one-line reasons", "Distinguishes 400/409/422 correctly", "Names the header each response should carry (Retry-After, Location, Allow)"],
      hints: ["Is it the client's fault (4xx) or the server's (5xx)?", "A syntactically valid request can still conflict with current state."],
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
        pitfalls: ["Using 500 for validation errors", "Using 401 for rate limiting", "Forgetting Retry-After on 429 and 503"],
      },
    },
    intermediate: {
      title: "Add PUT, DELETE and caching to the server",
      brief: ["Extend server.py with PUT /users/{id} (replace, 200 or 404), DELETE /users/{id} (204 or 404), and send 405 Method Not Allowed with an Allow header for unsupported methods. Prove with curl that PUT and DELETE are idempotent, and show a 304 from an ETag."],
      criteria: ["Correct codes for every path", "Allow header on 405 and ETag on GET/PUT", "curl transcript showing repeated PUT gives the same state and a conditional GET returns 304"],
      hints: ["BaseHTTPRequestHandler calls do_PUT, do_DELETE, do_PATCH by name.", "Repeated DELETE: first 204, then 404, but server state is the same, so it is still idempotent.", "Reuse the ETag helper from the hands-on server; compare If-None-Match before building the body."],
      solution: {
        text: ["Idempotency is about server state, not identical responses: a second DELETE returns 404, but the user is still gone, so the effect is the same. PUT is a full replacement, so the second identical PUT leaves the same representation and the same ETag.", "Add the ETag check to GET and send the new ETag from PUT. Then `curl -i -H 'If-None-Match: <etag>'` returns 304 with no body, which proves the cache contract end to end."],
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
        etag = '"' + hashlib.sha256(json.dumps(USERS[uid], sort_keys=True).encode()).hexdigest()[:16] + '"'
        self.send_json(200, USERS[uid], {"ETag": etag})

    def do_DELETE(self) -> None:
        uid = self.path.removeprefix("/users/")
        if USERS.pop(uid, None) is None:
            return self.send_json(404, {"error": "user not found"})
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_PATCH(self) -> None:
        self.send_json(405, {"error": "method not allowed"}, {"Allow": "GET, POST, PUT, DELETE"})`,
        },
        pitfalls: ["Returning 200 with an error body for a missing user", "Forgetting Content-Length: 0 on 204", "Treating a second DELETE's 404 as proof that DELETE is not idempotent"],
      },
    },
    challenge: {
      title: "Design a caching policy for a news site",
      brief: ["A news site has: hashed JS/CSS, article images, the homepage (changes every minute), article pages (rarely change after an hour), a logged-in 'My account' page and an /api/me endpoint. Write the Cache-Control header for each and justify it. Bonus: explain `stale-while-revalidate` and where `Vary` is required."],
      criteria: ["Six headers with reasons", "No personalised data cached publicly", "Explains revalidation vs expiry and the stale window", "Names at least one Vary dimension"],
      hints: ["`s-maxage` applies only to shared caches (CDNs).", "Hashed names make a URL immutable; HTML is the thing that must update."],
      solution: {
        text: [
          "Hashed JS/CSS: `public, max-age=31536000, immutable`. Images (not hashed): `public, max-age=86400` plus ETag. Homepage: `public, max-age=0, s-maxage=60, stale-while-revalidate=30` so the CDN refreshes every minute and serves slightly stale content while refetching. Articles: `public, s-maxage=3600, stale-while-revalidate=600`. My account: `private, no-store`. /api/me: `private, no-cache` with ETag, or `no-store` if it contains sensitive data.",
          "stale-while-revalidate lets a cache serve an expired copy immediately while it fetches a fresh one in the background, hiding origin latency from users. stale-if-error extends the same idea to 5xx and timeouts. Neither belongs on a balance, a price or a one-time token.",
          "Expiry vs revalidation: max-age and s-maxage say how long a copy may be reused without asking at all. Revalidation (no-cache, or max-age=0 with an ETag) means the cache asks every time but only downloads the body if it changed; otherwise it gets a 304 with no body.",
          "cache_policy.py keeps the whole policy in one ordered table, serves each resource type with its header and proves revalidation: sending the ETag back returns 304 with 0 body bytes. In production the same table becomes CDN rules or nginx `location` blocks. Add `Vary: Accept-Encoding` to compressed responses and `Vary: Cookie` only as belt-and-braces next to a private directive, never instead of one.",
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
        pitfalls: ["Putting `public` or `s-maxage` on anything that differs per user", "Using no-cache when you mean no-store: no-cache still stores the response", "Adding `stale-while-revalidate` to money or security data"],
      },
    },
    capstone: {
      title: "DevAtlas: API conventions document",
      brief: ["Write `docs/api-conventions.md` for DevAtlas: status codes per situation, error body format, caching rules per resource type, cookie flags and the method/idempotency table. Every future endpoint will follow it."],
      criteria: ["Error format with example", "Table of situation → status code, including 409/412/422/429", "Caching rule for static assets, HTML and API", "Method/idempotency table and cookie flags"],
      hints: ["Short and specific beats long and vague.", "Write the table before the first endpoint, not after the first incident."],
      solution: {
        text: ["A one-page document is enough; reviewers will point to it in every API pull request.", "Keep the method table next to the status table so a new endpoint cannot pick a 200 for a create or a POST for a retryable replacement."],
        code: {
          lang: "markdown",
          file: "docs/api-conventions.md",
          code: `# DevAtlas API conventions

## Methods
GET safe and idempotent; HEAD/OPTIONS safe; PUT and DELETE idempotent; POST neither.
A retryable POST must carry an Idempotency-Key and the server must deduplicate it.

## Errors
All errors return JSON: { "error": { "code": "snake_case_code", "message": "Human text", "details": {}, "request_id": "..." } }

| Situation | Status | Header |
|---|---|---|
| Created | 201 | Location |
| Deleted | 204 | none |
| Malformed JSON | 400 | none |
| Not logged in / bad token | 401 | WWW-Authenticate |
| Logged in, not allowed | 403 | none |
| Missing resource | 404 | none |
| Wrong method | 405 | Allow |
| Duplicate / version conflict | 409 | none |
| Stale If-Match | 412 | ETag |
| Validation failed | 422 | none (details lists fields) |
| Rate limited | 429 | Retry-After |
| Dependency down / overload | 503 | Retry-After |
| Bad upstream response | 502 | none |
| Upstream timeout | 504 | none |
| Unexpected bug | 500 (log a request id, never leak stack traces) | none |

## Caching
- /assets/* (hashed): public, max-age=31536000, immutable
- index.html: no-cache
- /api/* user data: private, no-cache + ETag
- Never public or s-maxage on personalised data; send Vary: Accept-Encoding on compressed responses.

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
    { label: "RFC 9111: HTTP Caching", url: "https://www.rfc-editor.org/rfc/rfc9111" },
    { label: "MDN: Cross-Origin Resource Sharing (CORS)", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
    { label: "MDN: Cache-Control header", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control" },
  ],
  nextPreview: "Next: the terminal. You will navigate a Linux machine, read logs, find the process eating your CPU and chain commands with pipes.",
};
