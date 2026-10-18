import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.12",
  title: "Communication: TCP, UDP, RPC and REST between services",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["0.1.1 What happens when you type a URL", "4.4.1 REST, GraphQL and gRPC; versioning and pagination", "6.3.11 Asynchronism: message queues, task queues and back pressure"],
  summary: "Pick TCP or UDP, RPC or REST for each kind of communication, then make service-to-service calls survive real networks: connection reuse, timeouts and deadline propagation, retry budgets, circuit breakers, bulkheads and hedged requests.",
  terms: [
    { term: "TCP", def: "Connection-oriented transport: handshake, ordered and reliable byte stream, flow and congestion control. Used by HTTP/1.1, HTTP/2, databases, SSH." },
    { term: "UDP", def: "Connectionless datagrams: no handshake, no ordering or delivery guarantee, low overhead. Used by DNS, VoIP, video calls, games, and QUIC (HTTP/3)." },
    { term: "RPC", def: "Remote procedure call: calling a function on another machine as if it were local (gRPC, Thrift). Contract-first, efficient binary encoding." },
    { term: "REST", def: "Resource-oriented HTTP APIs: nouns in URLs, standard methods (GET, PUT, DELETE…), status codes, cacheable responses." },
    { term: "Deadline", def: "An absolute time by which the whole request must finish; each downstream call gets only the time that remains." },
    { term: "Circuit breaker", def: "Stops calling a failing dependency for a while (open), tries a few calls (half-open), and resumes when they succeed (closed)." },
    { term: "Bulkhead", def: "Separate pools (connections, threads) per dependency so one slow dependency cannot use up all resources." },
    { term: "Retry amplification", def: "Retries at several layers multiply: 3 layers × 3 attempts = up to 27 calls to the bottom service." },
  ],
  problem: [
    "DevAtlas's lesson page calls the progress service, which calls the recommendations service, which calls the AI ranking service. One afternoon the AI ranking service slows from 100 ms to 8 seconds. Within minutes every lesson page times out, the progress service runs out of threads, and the API gateway returns 503s for everything, including login, which never touches AI ranking at all.",
    "One slow dependency took down the whole platform because every hop waited too long, retried too eagerly and shared its resources with everything else. The choice of protocol matters, but the discipline around each call (timeouts, deadlines, retries, breakers, isolation) matters more once you have more than one service.",
  ],
  concept: {
    analogy: [
      "**TCP** is a registered letter service: every page is numbered, the receiver confirms each one, lost pages are resent, and pages are put back in order. **UDP** is shouting across a playground: fast, no setup, but some words get lost and nobody repeats them; for a live football commentary that is fine, because an old word is useless anyway.",
      "Calling another service is like asking a colleague for help with a deadline. A good engineer says **'I need this by 3 p.m.'** (deadline), does not ask the same busy person ten times in a row (retry budget), stops asking someone who is clearly off sick for an hour (circuit breaker), and does not let one slow colleague block the whole team (bulkhead).",
    ],
    precise: [
      "**TCP vs UDP.** Use TCP when every byte must arrive intact and in order: web APIs, databases, file transfer, email. Use UDP when latency matters more than completeness and late data is worthless: voice, video, multiplayer game state, DNS lookups, metrics (StatsD). QUIC builds reliable, multiplexed streams on top of UDP and powers HTTP/3, avoiding TCP's head-of-line blocking across streams.",
      "**RPC vs REST.** RPC (gRPC with Protocol Buffers) exposes actions (`GetProgress`, `RankLessons`), has a strict typed contract, efficient binary encoding, streaming and HTTP/2 multiplexing: ideal for internal service-to-service calls where you control both sides. REST exposes resources over plain HTTP: universally understood, cacheable, debuggable with curl, ideal for public APIs and browsers. Disadvantages: RPC couples clients to the contract and is harder to cache and inspect; REST can need many round trips and over-fetches.",
      "**Connections are expensive; reuse them.** A new HTTPS connection costs a TCP handshake (1 round trip) plus a TLS 1.3 handshake (1 more round trip) before the first request. Across regions that is 100+ ms. Use connection pools, keep-alive and HTTP/2, and create one HTTP client per dependency for the lifetime of the process.",
      "**Timeouts and deadlines.** Every network call needs a timeout. Better, propagate a deadline: the edge sets 'this request must finish in 800 ms', and each hop passes on the remaining budget (gRPC does this natively with deadlines; over HTTP use a header). A service that receives a request with 5 ms left should fail fast instead of starting work nobody will wait for.",
      "**Retries, safely.** Retry only idempotent operations (GET, PUT, DELETE, or POST with an idempotency key), only on transient errors (timeouts, 503, connection reset), with exponential backoff and jitter, and at **one** layer, ideally the one closest to the caller. Limit retries with a **retry budget** (e.g. retries may add at most 10% extra load).",
      "**Circuit breakers and bulkheads.** A breaker opens after the failure rate passes a threshold, failing calls immediately (or serving a fallback), then half-opens to probe recovery. Bulkheads give each dependency its own connection pool or concurrency limit, so the slow AI ranking service can exhaust only its own 20 slots, not all 200 worker threads.",
    ],
  },
  underTheHood: {
    text: [
      "**What the TCP handshake costs.** SYN → SYN-ACK → ACK takes one round trip before data can flow; TLS 1.3 adds one more (TLS 1.2 added two). TCP slow start then begins with a small congestion window, so the first few kilobytes are slower than a warm connection. That is why connection reuse beats almost any micro-optimisation for service-to-service calls.",
      "**Why one slow dependency exhausts everything.** Little's law again: in-flight requests = rate × latency. At 200 requests per second, if a dependency goes from 0.1 s to 8 s, in-flight calls jump from 20 to 1,600. Without a tight timeout and a bulkhead, those 1,600 calls hold threads, sockets and memory that every other endpoint needed.",
      "**Retry amplification.** If the gateway, the progress service and the recommendations service each retry 3 times, one user request can turn into 27 calls to the struggling service, exactly when it is least able to handle them. That is how retries turn a slowdown into an outage.",
    ],
    diagram: {
      title: "Deadline propagation through a call chain",
      nodes: [
        { label: "Gateway", sub: "deadline = now + 800 ms" },
        { label: "Progress svc", sub: "used 50 ms, passes 750" },
        { label: "Recommendations", sub: "used 100 ms, passes 650" },
        { label: "AI ranking", sub: "timeout = min(own, 650)" },
      ],
      edges: ["remaining 800", "remaining 750", "remaining 650"],
      caption: "Each hop gets only what is left; when the budget runs out, the hop fails fast or returns a fallback.",
    },
  },
  handsOn: [
    {
      title: "TCP streams vs UDP datagrams on your own machine",
      code: {
        lang: "python",
        file: "tcp_udp.py",
        code: `import socket, threading

def tcp_echo_server(sock: socket.socket) -> None:
    conn, _ = sock.accept()
    with conn:
        data = b""
        while chunk := conn.recv(4096):            # TCP is a byte stream: read until the peer closes
            data += chunk
        conn.sendall(data.upper())

tcp = socket.create_server(("127.0.0.1", 0))
threading.Thread(target=tcp_echo_server, args=(tcp,), daemon=True).start()
with socket.create_connection(tcp.getsockname()) as c:   # 3-way handshake happens here
    c.sendall(b"hello ")
    c.sendall(b"over tcp")                          # two sends, may arrive as one chunk
    c.shutdown(socket.SHUT_WR)
    reply = b""
    while chunk := c.recv(4096):
        reply += chunk
print("TCP reply:", reply.decode())

udp_server = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_server.bind(("127.0.0.1", 0))
client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
client.sendto(b"position x=10", udp_server.getsockname())   # no handshake, no connection
client.sendto(b"position x=11", udp_server.getsockname())
for _ in range(2):
    data, addr = udp_server.recvfrom(1024)                    # one datagram per call
    print("UDP datagram:", data.decode())`,
      },
      output: "TCP reply: HELLO OVER TCP\nUDP datagram: position x=10\nUDP datagram: position x=11",
      notes: [
        "TCP has no message boundaries: two sends can arrive as one recv, or one send as several. Protocols on top of TCP (HTTP, gRPC framing) add their own framing. UDP keeps each datagram separate, but on a real network a datagram can be lost, duplicated or reordered; on localhost you will rarely see it.",
      ],
    },
    {
      title: "What connection reuse saves across regions",
      code: {
        lang: "python",
        file: "connection_cost.py",
        code: `RTT_MS = 80            # e.g. Frankfurt <-> Virginia
SERVER_MS = 5
REQUESTS = 10

def new_connection_each_time() -> float:
    tcp, tls13, request = RTT_MS, RTT_MS, RTT_MS + SERVER_MS
    return REQUESTS * (tcp + tls13 + request)

def pooled_keep_alive() -> float:
    return RTT_MS * 2 + REQUESTS * (RTT_MS + SERVER_MS)       # handshake once

def http2_parallel() -> float:
    return RTT_MS * 2 + (RTT_MS + SERVER_MS)                   # one connection, 10 streams at once

for name, ms in (("new connection per call", new_connection_each_time()),
                 ("pooled keep-alive (sequential)", pooled_keep_alive()),
                 ("HTTP/2, 10 calls multiplexed", http2_parallel())):
    print(f"{name:32} {ms:6.0f} ms")`,
      },
      output: "new connection per call            2450 ms\npooled keep-alive (sequential)     1010 ms\nHTTP/2, 10 calls multiplexed        245 ms",
      notes: ["In .NET use IHttpClientFactory (or one static HttpClient with a PooledConnectionLifetime); in Python one `httpx.Client` per dependency; in Node an `undici` Agent. Creating a client per request is one of the most common performance bugs."],
    },
    {
      title: "Retry amplification and retry budgets",
      code: {
        lang: "python",
        file: "amplification.py",
        code: `def calls_to_bottom(layers: int, attempts_per_layer: int) -> int:
    return attempts_per_layer ** layers

for layers in (1, 2, 3, 4):
    print(f"{layers} layer(s) x 3 attempts -> up to {calls_to_bottom(layers, 3):3d} calls per user request")

# Retry budget: retries may add at most 10% on top of normal requests
requests, budget_ratio, failures = 1_000, 0.10, 400
retries_allowed = min(failures, int(requests * budget_ratio))
print(f"with a 10% budget during an outage: {retries_allowed} retries instead of {failures * 2}")`,
      },
      output: "1 layer(s) x 3 attempts -> up to   3 calls per user request\n2 layer(s) x 3 attempts -> up to   9 calls per user request\n3 layer(s) x 3 attempts -> up to  27 calls per user request\n4 layer(s) x 3 attempts -> up to  81 calls per user request\nwith a 10% budget during an outage: 100 retries instead of 800",
      notes: ["Retry at one layer only (usually the caller nearest the user or the client library), and let deeper layers fail fast. Envoy, Linkerd and gRPC support retry budgets or throttling natively."],
    },
    {
      title: "A circuit breaker in 40 lines",
      code: {
        lang: "python",
        file: "breaker.py",
        code: `class CircuitBreaker:
    def __init__(self, failure_threshold=3, reset_after=10.0):
        self.state, self.failures, self.opened_at = "closed", 0, 0.0
        self.threshold, self.reset_after = failure_threshold, reset_after

    def call(self, fn, now: float, fallback):
        if self.state == "open":
            if now - self.opened_at < self.reset_after:
                return fallback(), "open: fast fallback"
            self.state = "half-open"                     # let one probe through
        try:
            result = fn()
        except Exception:
            self.failures += 1
            if self.state == "half-open" or self.failures >= self.threshold:
                self.state, self.opened_at = "open", now
            return fallback(), f"failed ({self.state})"
        self.state, self.failures = "closed", 0
        return result, "ok (closed)"

healthy = {"ok": False}
def rank_lessons():
    if not healthy["ok"]:
        raise TimeoutError("ranking timed out")
    return ["6.3.12", "6.4.1"]

def popular_lessons():
    return ["popular-1", "popular-2"]                   # cheap fallback

cb = CircuitBreaker()
for t in (0, 1, 2, 3, 5, 12, 13, 25):
    healthy["ok"] = t >= 20                             # dependency recovers at t=20
    result, status = cb.call(rank_lessons, t, popular_lessons)
    print(f"t={t:2d}s  {status:22} {result}")`,
      },
      output: "t= 0s  failed (closed)        ['popular-1', 'popular-2']\nt= 1s  failed (closed)        ['popular-1', 'popular-2']\nt= 2s  failed (open)          ['popular-1', 'popular-2']\nt= 3s  open: fast fallback    ['popular-1', 'popular-2']\nt= 5s  open: fast fallback    ['popular-1', 'popular-2']\nt=12s  failed (open)          ['popular-1', 'popular-2']\nt=13s  open: fast fallback    ['popular-1', 'popular-2']\nt=25s  ok (closed)            ['6.3.12', '6.4.1']",
      notes: ["Production libraries: Polly (.NET, `AddResilienceHandler` in Microsoft.Extensions.Http.Resilience), resilience4j (Java), and the breakers in Envoy and service meshes. They use failure rates over a sliding window rather than a simple counter."],
    },
  ],
  companies: [
    "**gRPC inside, REST outside.** Many companies expose REST/JSON (or GraphQL) to browsers and partners and use gRPC between internal services for typed contracts, streaming and efficiency. Google, Netflix, Uber and Square have all described large internal gRPC deployments.",
    "**Deadlines everywhere.** Google's internal RPC stack propagates deadlines on every call; gRPC exposes this to everyone. A request that has exceeded its deadline is cancelled across all services it touched, freeing resources immediately.",
    "**Resilience in the platform.** Service meshes (Istio, Linkerd) and gateways (Envoy) apply timeouts, retries with budgets, outlier detection and circuit breaking uniformly, so individual teams do not each reinvent them.",
  ],
  mistakes: [
    { mistake: "No timeouts (or library defaults of minutes)", why: "Calls 'usually' return fast", wrong: "One slow dependency holds every thread; the whole service stalls", fix: "Explicit connect and read timeouts on every call, derived from the latency budget" },
    { mistake: "Retrying at every layer", why: "Each team adds retries independently", wrong: "Retry storms multiply load 9×–27× during incidents", fix: "Retry at one layer, with backoff, jitter and a retry budget" },
    { mistake: "Retrying non-idempotent calls", why: "Generic retry middleware", wrong: "Duplicate payments, duplicate messages", fix: "Retry only idempotent methods or requests with idempotency keys" },
    { mistake: "A new HTTP client or connection per request", why: "Looks clean in code", wrong: "Handshake latency on every call, socket exhaustion", fix: "One pooled client per dependency for the process lifetime" },
    { mistake: "Shared pools for all dependencies", why: "One global thread pool or connection limit", wrong: "One slow dependency starves unrelated endpoints", fix: "Bulkheads: per-dependency concurrency limits and pools" },
    { mistake: "UDP for data that must arrive", why: "Lower latency", wrong: "Silent loss and reordering corrupt state", fix: "TCP (or QUIC) for reliable data; UDP only when late data is useless or the app handles loss" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Every remote call has a timeout; propagate deadlines; fail fast when the remaining budget is too small." },
    { tag: "Reliability", text: "Circuit breakers with fallbacks for non-critical dependencies; bulkheads to isolate them." },
    { tag: "Performance", text: "Reuse connections (pools, keep-alive, HTTP/2); keep chatty services in the same region." },
    { tag: "Maintainability", text: "gRPC with versioned protobuf contracts internally; REST with OpenAPI for public APIs." },
  ],
  interview: [
    { q: "When would you use UDP instead of TCP?", a: "When low latency matters more than reliability and late data is useless: voice and video calls, multiplayer game state, live metrics, DNS lookups. The application handles loss (or ignores it). QUIC/HTTP/3 also runs on UDP but rebuilds reliability per stream to avoid head-of-line blocking." },
    { q: "RPC or REST for communication between your services?", a: "Internally I prefer gRPC: typed contracts, generated clients, efficient binary encoding, streaming, deadlines and HTTP/2 multiplexing. For public or browser-facing APIs, REST (or GraphQL) is easier to consume, cache and debug. The decision is less important than consistent timeouts, retries and versioning." },
    { q: "How do you stop one slow service from taking down the others?", a: "Tight timeouts and deadline propagation so callers stop waiting, retries only at one layer with a budget, circuit breakers with fallbacks so callers fail fast while the dependency is unhealthy, bulkheads so it can only exhaust its own pool, and load shedding at the edge. Then test it by injecting latency." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A multiplayer game sends player positions 30 times per second. Which transport fits best?",
      options: ["TCP, because it is reliable", "UDP, because a late position is useless and the next update replaces it", "SMTP", "HTTP/1.1 polling"],
      answer: 1,
      explanation: "Retransmitting old positions only adds delay; UDP lets the game use the newest data.",
    },
    {
      kind: "output",
      prompt: "Three service layers each retry failed calls up to 3 attempts. How many calls can one user request cause at the bottom service?",
      options: ["3", "9", "27", "81"],
      answer: 2,
      explanation: "3 × 3 × 3 = 27. Retry at one layer only.",
    },
    {
      kind: "bug",
      prompt: "The AI ranking service slows to 8 s. Login (which never calls it) starts failing too. Most likely cause?",
      options: ["Login has a bug", "Calls to ranking have no tight timeout and share the same thread/connection pool, so they exhaust it", "DNS failure", "The database is down"],
      answer: 1,
      explanation: "Slow calls hold shared resources; add timeouts, a breaker and a bulkhead.",
    },
  ],
  cheatSheet: [
    "TCP: reliable, ordered, handshake. UDP: fast, lossy; voice, games, DNS. QUIC = reliable streams over UDP.",
    "gRPC inside (typed, fast, deadlines); REST outside (simple, cacheable).",
    "New HTTPS connection ≈ 2 RTT before the request: pool and keep alive.",
    "Every call: timeout; better: propagate a deadline.",
    "Retry: idempotent only, transient errors only, one layer, backoff + jitter, budget.",
    "Circuit breaker: closed → open → half-open; serve a fallback.",
    "Bulkheads: per-dependency pools and concurrency limits.",
  ],
  homework: {
    basic: {
      title: "Choose the protocol and style for each call",
      brief: [
        "For each DevAtlas interaction choose TCP or UDP and REST, gRPC, WebSocket/SSE or a queue, with a reason: browser loads lesson list; mobile app submits a quiz; progress service asks recommendations service for 10 lessons; live 'class quiz' showing answers in real time; AI tutor streaming tokens to the browser; voice practice with a tutor; nightly export to the data warehouse.",
      ],
      criteria: ["Transport and style for each", "Reason tied to latency, reliability or audience", "At least one async choice"],
      hints: ["Streaming from server to browser is a natural fit for Server-Sent Events."],
      solution: {
        text: ["The pattern: REST for public request/response, gRPC between internal services, push channels for live updates, UDP-based media for voice, and queues or batch for work that can wait."],
        code: {
          lang: "markdown",
          file: "docs/communication.md",
          code: `| Interaction | Transport | Style | Why |
|---|---|---|---|
| Browser loads lesson list | TCP (HTTP/2 or 3 via CDN) | REST, cacheable GET | public, cacheable, simple |
| Mobile submits a quiz | TCP | REST POST + Idempotency-Key | must arrive once; retry-safe |
| Progress -> recommendations | TCP (HTTP/2) | gRPC with deadline | internal, typed, low latency |
| Live class quiz | TCP | WebSocket (two-way) | server pushes answers instantly |
| AI tutor token stream | TCP | Server-Sent Events | one-way stream, works through proxies |
| Voice practice | UDP | WebRTC (SRTP) | late audio is useless; jitter buffers handle loss |
| Nightly warehouse export | TCP | queue/batch job, files to object storage | not user-facing; retries without blocking anyone |`,
        },
      },
    },
    intermediate: {
      title: "Deadline propagation",
      brief: [
        "Simulate a chain gateway → progress → recommendations → ranking. The gateway sets an 800 ms deadline. Each hop has its own processing time and passes on the remaining budget minus a 10 ms safety margin. A hop with less than its minimum useful time left returns a fallback immediately instead of calling downward. Run once with ranking at 100 ms and once at 8,000 ms; print what each hop did.",
      ],
      criteria: ["Remaining budget passed downward", "Fail-fast when the budget is too small", "Fallback used instead of a timeout cascade"],
      hints: ["Represent each hop as (name, own_ms, min_useful_ms)."],
      solution: {
        text: ["With propagation, the slow ranking call is cut off at exactly the remaining budget and the recommendations hop returns a fallback, so the page still renders within 800 ms. Without it, each hop's own default timeout (often 30 s or more) would stack up."],
        code: {
          lang: "python",
          file: "deadlines.py",
          code: `MARGIN_MS = 10

def call_chain(ranking_ms: int, deadline_ms: int = 800) -> None:
    hops = [("progress", 50, 20), ("recommendations", 100, 50)]
    remaining = deadline_ms
    print(f"-- ranking takes {ranking_ms} ms, deadline {deadline_ms} ms")
    for name, own_ms, min_useful in hops:
        remaining -= own_ms
        print(f"{name:16} used {own_ms:3d} ms, {remaining} ms left")
    budget = remaining - MARGIN_MS
    if budget < 30:
        print("ranking          skipped: not enough budget -> fallback")
        return
    if ranking_ms <= budget:
        print(f"ranking          ok in {ranking_ms} ms, {budget - ranking_ms} ms to spare")
    else:
        print(f"ranking          cancelled at {budget} ms -> recommendations returns popular lessons")

call_chain(100)
call_chain(8_000)`,
        },
        output: "-- ranking takes 100 ms, deadline 800 ms\nprogress         used  50 ms, 750 ms left\nrecommendations  used 100 ms, 650 ms left\nranking          ok in 100 ms, 540 ms to spare\n-- ranking takes 8000 ms, deadline 800 ms\nprogress         used  50 ms, 750 ms left\nrecommendations  used 100 ms, 650 ms left\nranking          cancelled at 640 ms -> recommendations returns popular lessons",
      },
    },
    challenge: {
      title: "Hedged requests for tail latency",
      brief: [
        "A service's latency is usually 20–40 ms but 2% of calls take 400–1,000 ms (garbage collection, noisy neighbours). Implement hedging: if no answer after the hedge delay (the p95), send a second request to another replica and take whichever finishes first. Simulate 100,000 calls and report p50, p99 and the extra load caused by hedges.",
      ],
      criteria: ["Seeded simulation", "Hedge only after the delay", "p99 before/after and extra load reported"],
      hints: ["Latency with a hedge = min(first, delay + second)."],
      solution: {
        text: ["Hedging after the p95 sends about 5% extra requests and removes most of the slow tail, because it is unlikely that both replicas are slow at the same time. This technique comes from Google's 'The Tail at Scale'. Only hedge idempotent reads, and cancel the loser."],
        code: {
          lang: "python",
          file: "hedging.py",
          code: `import random

rng = random.Random(21)

def latency() -> float:
    if rng.random() < 0.02:
        return rng.uniform(400, 1000)        # slow outlier
    return rng.uniform(20, 40)

def pct(values, p):
    s = sorted(values)
    return s[int(len(s) * p) - 1]

N = 100_000
plain = [latency() for _ in range(N)]
hedge_delay = pct(plain, 0.95)

hedged, extra = [], 0
for _ in range(N):
    first = latency()
    if first <= hedge_delay:
        hedged.append(first)
    else:
        extra += 1
        hedged.append(min(first, hedge_delay + latency()))

print(f"hedge after {hedge_delay:.0f} ms")
print(f"plain  p50 {pct(plain, .5):5.0f} ms  p99 {pct(plain, .99):5.0f} ms")
print(f"hedged p50 {pct(hedged, .5):5.0f} ms  p99 {pct(hedged, .99):5.0f} ms  extra load {extra / N:.1%}")`,
        },
        output: "hedge after 39 ms\nplain  p50    30 ms  p99   706 ms\nhedged p50    30 ms  p99    69 ms  extra load 4.8%",
      },
    },
    capstone: {
      title: "DevAtlas: a resilient HTTP client",
      brief: [
        "Build one client wrapper that every service-to-service call in your capstone uses: pooled connections, connect/read timeouts, a deadline header passed downstream, retries (max 2) with backoff and jitter only for idempotent methods and transient errors, and a circuit breaker per host with a fallback. Test it without a network using httpx.MockTransport.",
      ],
      criteria: ["Single shared client", "Timeouts and deadline header", "Retries only for safe methods and transient failures", "Breaker opens and serves fallback", "Tests with a mock transport"],
      hints: ["httpx.MockTransport(handler) lets a function play the server.", "In .NET the equivalent is IHttpClientFactory + Microsoft.Extensions.Http.Resilience."],
      solution: {
        text: [
          "The wrapper centralises policy so each call site only says what it wants and what to return if the dependency is down. Tested with httpx's MockTransport, so it runs anywhere; swap in a real transport for production.",
        ],
        code: {
          lang: "python",
          file: "app/http_client.py",
          code: `import random
import time

import httpx

IDEMPOTENT = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}
TRANSIENT_STATUS = {502, 503, 504}


class Breaker:
    def __init__(self, threshold: int = 3, reset_s: float = 10.0):
        self.failures, self.opened_at, self.threshold, self.reset_s = 0, None, threshold, reset_s

    def allow(self) -> bool:
        return self.opened_at is None or time.monotonic() - self.opened_at >= self.reset_s

    def record(self, ok: bool) -> None:
        if ok:
            self.failures, self.opened_at = 0, None
        else:
            self.failures += 1
            if self.failures >= self.threshold:
                self.opened_at = time.monotonic()


class ServiceClient:
    def __init__(self, base_url: str, transport: httpx.BaseTransport | None = None):
        self.http = httpx.Client(base_url=base_url, transport=transport,
                                 timeout=httpx.Timeout(2.0, connect=0.5),
                                 limits=httpx.Limits(max_connections=20))   # bulkhead per dependency
        self.breaker = Breaker()

    def request(self, method: str, path: str, *, deadline: float, fallback, retries: int = 2, **kw):
        if not self.breaker.allow():
            return fallback()
        attempts = retries + 1 if method in IDEMPOTENT else 1
        for attempt in range(attempts):
            remaining = deadline - time.monotonic()
            if remaining <= 0.01:
                break
            try:
                r = self.http.request(method, path, timeout=min(2.0, remaining),
                                      headers={"X-Deadline-Ms": str(int(remaining * 1000))}, **kw)
                if r.status_code not in TRANSIENT_STATUS:
                    self.breaker.record(r.status_code < 500)
                    return r
            except httpx.TransportError:
                pass
            self.breaker.record(False)
            time.sleep(random.uniform(0, min(0.2, 0.05 * 2 ** attempt)))   # full jitter, tiny for tests
        return fallback()


if __name__ == "__main__":
    calls = {"n": 0}
    def flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        assert "X-Deadline-Ms" in request.headers
        return httpx.Response(503) if calls["n"] == 1 else httpx.Response(200, json={"ok": True})

    c = ServiceClient("http://recs", transport=httpx.MockTransport(flaky))
    r = c.request("GET", "/v1/recs", deadline=time.monotonic() + 1, fallback=lambda: "fallback")
    assert r.json() == {"ok": True} and calls["n"] == 2                  # retried once

    down = ServiceClient("http://rank", transport=httpx.MockTransport(lambda req: httpx.Response(503)))
    results = [down.request("GET", "/rank", deadline=time.monotonic() + 1, fallback=lambda: "popular")
               for _ in range(3)]
    assert results == ["popular"] * 3 and not down.breaker.allow()         # breaker open

    posted = {"n": 0}
    def count_posts(req):
        posted["n"] += 1
        return httpx.Response(503)
    p = ServiceClient("http://quiz", transport=httpx.MockTransport(count_posts))
    p.request("POST", "/submit", deadline=time.monotonic() + 1, fallback=lambda: None)
    assert posted["n"] == 1                                                # POST never retried
    print("ok: retry on 503, breaker opens, POST not retried, deadline header sent")`,
        },
        output: "ok: retry on 503, breaker opens, POST not retried, deadline header sent",
        pitfalls: ["Sleeping in a request thread is acceptable for tiny backoffs; for longer ones, return the fallback and let a queue retry later.", "A breaker per process means each instance learns separately; that is usually fine and avoids a shared dependency."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: communication (TCP, UDP, RPC, REST) (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#communication" },
    { label: "gRPC: deadlines", url: "https://grpc.io/docs/guides/deadlines/" },
    { label: "Google SRE Book: Addressing Cascading Failures", url: "https://sre.google/sre-book/addressing-cascading-failures/" },
    { label: "Microsoft: build resilient HTTP apps (.NET)", url: "https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience" },
  ],
  nextPreview: "Next: design cases. You will now combine every building block in this module, starting with four classic problems (URL shortener, chat, news feed, rate limiter) and then the primer's larger cases.",
};
