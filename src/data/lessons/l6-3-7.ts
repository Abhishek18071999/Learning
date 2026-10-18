import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.7",
  title: "Load balancers, reverse proxies and service discovery",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["6.3.1 Scaling, CAP, load balancing and caching layers", "6.3.6 DNS and CDNs: getting closer to the user"],
  summary: "Layer 4 vs layer 7 load balancing, health and readiness checks, connection draining, sticky sessions vs stateless servers, what a reverse proxy adds (TLS termination, compression, rate limiting, caching), why 'power of two choices' beats round robin, and how services find each other with service discovery.",
  terms: [
    { term: "Layer 4 load balancer", def: "Balances TCP/UDP connections using IP addresses and ports only. Fast, protocol-agnostic, cannot see URLs or headers." },
    { term: "Layer 7 load balancer", def: "Understands HTTP: can route by path, host or header, terminate TLS, retry, and rewrite requests." },
    { term: "Reverse proxy", def: "A server in front of your app servers that receives client requests and forwards them, adding TLS, compression, caching, rate limits and a single public entry point." },
    { term: "Health check", def: "A periodic probe (TCP connect or HTTP GET /healthz) that removes failing backends from rotation." },
    { term: "Readiness vs liveness", def: "Readiness: may this instance receive traffic now? Liveness: is it stuck and should it be restarted?" },
    { term: "Connection draining", def: "When removing an instance, stop sending it new requests but let in-flight ones finish." },
    { term: "Sticky session", def: "The load balancer sends all requests from one user to the same server (via a cookie or IP hash)." },
    { term: "Service discovery", def: "How a service finds the current addresses of healthy instances of another service (DNS, a registry like Consul, or the platform such as Kubernetes)." },
  ],
  problem: [
    "DevAtlas adds a second API server behind a load balancer for the exam season. Within an hour, learners report being logged out randomly and losing half-finished quiz answers. Rolling back to one server fixes it. The team concludes 'horizontal scaling does not work for us'.",
    "It does work; the servers were not stateless. Sessions and draft answers lived in each server's memory, and the load balancer sent the next request to the other server. This lesson covers the load balancer and reverse proxy layer properly: how they route, how they detect failure, what they need from your app, and how services find each other once there are many of them.",
  ],
  concept: {
    analogy: [
      "A busy restaurant has a **host at the door** (the load balancer). The host knows which waiters are free, never seats guests in the section of a waiter who went home sick (health checks), and when a waiter's shift ends, stops giving them new tables but lets them finish serving the current ones (draining). If each waiter kept your order **only in their head**, a different waiter could not bring your dessert; the fix is writing orders on a **shared board in the kitchen** (a shared session store).",
      "The **reverse proxy** is the restaurant's front desk: one public address, checks reservations (TLS, auth), turns away people without shoes (rate limiting, bad requests), and hands you a menu from the stack by the door without bothering the kitchen (static files and caching).",
    ],
    precise: [
      "**Layer 4 vs layer 7.** L4 balancers (AWS NLB, Azure Load Balancer, HAProxy in TCP mode, Linux IPVS) forward connections without reading them: very high throughput, low latency, work for any TCP/UDP protocol. L7 balancers (AWS ALB, Azure Application Gateway, NGINX, Envoy, HAProxy HTTP mode) read HTTP: route /api to one pool and /static to another, terminate TLS, add headers, retry idempotent requests, and balance individual requests over long-lived HTTP/2 connections.",
      "**Health checks.** Active checks probe each backend every few seconds and mark it down after N failures, up after M successes. A good `/healthz` is cheap; a **readiness** check may also verify critical dependencies, but a **liveness** check must not, or a database outage restarts every pod and makes things worse.",
      "**Stateless servers enable horizontal scaling.** Keep sessions in signed cookies (JWT) or a shared store (Redis), files in object storage, and caches in a shared cache. Sticky sessions are a crutch: they unbalance load and lose sessions when a server dies. Use them only for genuinely stateful protocols (e.g. some WebSocket setups) and still plan for reconnection.",
      "**Balancing algorithms.** Round robin is fine when requests cost the same. When costs vary, **least outstanding requests** is best, but needs global knowledge. **Power of two choices** (pick two random backends, send to the less loaded one) gets most of that benefit with only local information, which is why Envoy, NGINX (`random two least_conn`) and HAProxy offer it.",
      "**Reverse proxy duties.** TLS termination (certificates in one place), HTTP/2 and HTTP/3 to clients, compression, request size limits, rate limiting, IP allow-lists, static file serving, response caching, and hiding internal topology. A reverse proxy is useful even with a single backend; a load balancer only makes sense with several.",
      "**Service discovery.** Server-side: callers talk to a stable name (a load balancer or a Kubernetes Service, `api.default.svc.cluster.local`) and the platform tracks instances. Client-side: callers query a registry (Consul, etcd, Eureka) and balance themselves. A service mesh (Istio, Linkerd) moves this into a sidecar proxy so every service gets discovery, retries, mTLS and metrics without code changes.",
    ],
  },
  underTheHood: {
    text: [
      "**Why round robin hurts tails.** With variable request costs, round robin keeps sending work to a server that is stuck on a slow request while others sit idle. Random choice is worse. Picking the less loaded of two random servers dramatically shortens the longest queues; checking all servers is better still but expensive at large scale and prone to 'herding' when many balancers see the same stale numbers.",
      "**What happens during a deploy.** The orchestrator marks an old instance not ready → the load balancer stops sending new requests → in-flight requests finish (drain timeout, e.g. 30 s) → the process receives SIGTERM, closes keep-alive connections and exits. If the app exits immediately on SIGTERM, in-flight requests fail with 502s on every deploy.",
      "**The load balancer is itself a single point of failure.** Managed load balancers are built from many nodes across zones behind DNS or anycast. Self-hosted ones run in pairs with a floating IP (keepalived/VRRP) or behind DNS with health-checked records.",
    ],
    diagram: {
      title: "Request path through the edge layer",
      nodes: [
        { label: "Client", sub: "HTTPS" },
        { label: "L4/L7 load balancer", sub: "TLS, health checks" },
        { label: "Reverse proxy / gateway", sub: "auth, limits, gzip" },
        { label: "Stateless API ×N", sub: "ready / draining" },
        { label: "Redis + DB", sub: "sessions, data" },
      ],
      edges: ["", "HTTP", "least outstanding", "shared state"],
    },
  },
  handsOn: [
    {
      title: "Compare balancing algorithms with uneven request costs",
      text: ["Ten servers at 90% load, request costs vary (exponential). The same random seed is used for every policy."],
      code: {
        lang: "python",
        file: "lb_policies.py",
        code: `import heapq, random

def run(policy: str, servers: int = 10, n: int = 100_000, load: float = 0.9, seed: int = 1) -> tuple[float, float]:
    rng = random.Random(seed)
    busy_until = [[] for _ in range(servers)]          # per server: finish times of queued requests
    t, rr, lat = 0.0, 0, []
    mean_service = 10.0                                 # ms; costs vary a lot (exponential)
    rate = load * servers / mean_service                # arrivals per ms
    for _ in range(n):
        t += rng.expovariate(rate)
        for q in busy_until:                            # drop finished work
            while q and q[0] <= t:
                heapq.heappop(q)
        if policy == "round robin":
            s = rr % servers; rr += 1
        elif policy == "random":
            s = rng.randrange(servers)
        elif policy == "two choices":
            a, b = rng.randrange(servers), rng.randrange(servers)
            s = a if len(busy_until[a]) <= len(busy_until[b]) else b
        else:                                           # least outstanding requests
            s = min(range(servers), key=lambda i: len(busy_until[i]))
        start = max(t, max(busy_until[s], default=t))
        done = start + rng.expovariate(1 / mean_service)
        heapq.heappush(busy_until[s], done)
        lat.append(done - t)
    lat.sort()
    return lat[n // 2], lat[int(n * 0.99)]

print("policy              p50 ms   p99 ms")
for p in ("random", "round robin", "two choices", "least outstanding"):
    p50, p99 = run(p)
    print(f"{p:18} {p50:7.1f}  {p99:7.1f}")`,
      },
      output: "policy              p50 ms   p99 ms\nrandom                64.1    379.4\nround robin           39.2    254.8\ntwo choices           26.1    107.0\nleast outstanding     14.1     79.1",
      notes: ["Looking at just two servers instead of one cuts p99 by more than half compared with round robin. In NGINX: `random two least_conn;` in the upstream block. In Envoy the default `LEAST_REQUEST` policy uses power of two choices."],
    },
    {
      title: "Why the second server logged everyone out",
      code: {
        lang: "python",
        file: "sessions.py",
        code: `import itertools

class Server:
    def __init__(self, name, store=None):
        self.name = name
        self.sessions = store if store is not None else {}     # in-memory unless shared
    def login(self, user):
        sid = f"sid-{user}"
        self.sessions[sid] = user
        return sid
    def whoami(self, sid):
        return self.sessions.get(sid, "ANONYMOUS (logged out!)")

def demo(servers):
    rr = itertools.cycle(servers)                              # round-robin load balancer
    sid = next(rr).login("asha")
    return [f"{s.name}: {s.whoami(sid)}" for s in (next(rr), next(rr), next(rr))]

print("in-memory sessions:", demo([Server("api-1"), Server("api-2")]))
shared = {}                                                    # stands in for Redis
print("shared store:      ", demo([Server("api-1", shared), Server("api-2", shared)]))`,
      },
      output: "in-memory sessions: ['api-2: ANONYMOUS (logged out!)', 'api-1: asha', 'api-2: ANONYMOUS (logged out!)']\nshared store:       ['api-2: asha', 'api-1: asha', 'api-2: asha']",
      notes: ["In ASP.NET Core, use `AddStackExchangeRedisCache` with distributed sessions, and persist Data Protection keys to a shared location so every instance can read the auth cookie. In FastAPI, keep sessions in signed cookies or Redis."],
    },
    {
      title: "A production reverse proxy with NGINX",
      code: {
        lang: "text",
        file: "nginx.conf",
        code: `limit_req_zone $binary_remote_addr zone=per_ip:10m rate=20r/s;

upstream api {
    random two least_conn;                   # power of two choices
    server api-1:8080 max_fails=3 fail_timeout=10s;
    server api-2:8080 max_fails=3 fail_timeout=10s;
    server api-3:8080 max_fails=3 fail_timeout=10s;
    keepalive 64;                             # reuse connections to backends
}

server {
    listen 443 ssl;
    http2 on;
    server_name api.devatlas.dev;
    ssl_certificate     /etc/ssl/devatlas/fullchain.pem;     # TLS terminates here
    ssl_certificate_key /etc/ssl/devatlas/privkey.pem;

    client_max_body_size 2m;                  # reject huge uploads early
    gzip on; gzip_types application/json text/css application/javascript;

    location /v1/ {
        limit_req zone=per_ip burst=40 nodelay;
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 2s;
        proxy_read_timeout 15s;
    }
}`,
      },
      notes: [
        "Your app must trust X-Forwarded-For / X-Forwarded-Proto only from the proxy's address (ASP.NET Core: ForwardedHeadersOptions.KnownProxies; Uvicorn: --forwarded-allow-ips), otherwise clients can spoof their IP.",
        "The `http2 on;` directive needs NGINX 1.25.1 or newer; older versions use `listen 443 ssl http2;`.",
      ],
    },
    {
      title: "Readiness, liveness and draining in Kubernetes",
      code: {
        lang: "yaml",
        file: "k8s/api-deployment.yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata: { name: api }
spec:
  replicas: 3
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      terminationGracePeriodSeconds: 40
      containers:
        - name: api
          image: ghcr.io/devatlas/api:1.8.2
          ports: [{ containerPort: 8080 }]
          readinessProbe:                       # gate traffic: checks DB/Redis reachability
            httpGet: { path: /readyz, port: 8080 }
            periodSeconds: 5
            failureThreshold: 2
          livenessProbe:                        # restart only if the process itself is stuck
            httpGet: { path: /livez, port: 8080 }
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:                            # let endpoints update before shutdown starts
              exec: { command: ["sleep", "10"] }
---
apiVersion: v1
kind: Service                                   # service discovery: other pods call http://api
metadata: { name: api }
spec:
  selector: { app: api }
  ports: [{ port: 80, targetPort: 8080 }]`,
      },
      notes: ["The `preStop` sleep covers the gap between Kubernetes deciding to stop a pod and every load balancer noticing; without it, deploys cause a burst of 502s. The `sleep` binary must exist in the image; recent Kubernetes versions also support a built-in `sleep` action for preStop."],
    },
  ],
  companies: [
    "**Managed L7 at the edge, mesh inside.** A common setup is a cloud L7 load balancer (AWS ALB, Azure Application Gateway / Front Door, Google Cloud Load Balancing) for public traffic, and Kubernetes Services or a service mesh (Envoy-based Istio, Linkerd) for service-to-service calls.",
    "**L4 for raw throughput.** Large platforms put fast L4 balancers in front of fleets of L7 proxies: the L4 tier spreads connections, the L7 tier does routing and TLS. Google's Maglev and Meta's Katran are public examples of such L4 balancers.",
    "**Graceful shutdown is a deploy requirement.** Teams test that a rolling deploy under load produces zero 5xx responses; the fix is almost always readiness checks plus draining plus handling SIGTERM.",
  ],
  mistakes: [
    { mistake: "Keeping sessions or uploads in server memory/disk", why: "It works on one server", wrong: "Random logouts and missing files as soon as there are two servers", fix: "Signed cookies or Redis for sessions; object storage for files" },
    { mistake: "Liveness probe that checks the database", why: "Wanting a 'deep' health check", wrong: "A DB blip restarts every pod at once, turning a small incident into a full outage", fix: "Liveness checks only the process; readiness may check critical dependencies" },
    { mistake: "No connection draining", why: "Default shutdown kills the process immediately", wrong: "Every deploy produces a spike of 502 errors", fix: "Readiness off → drain → SIGTERM handling; preStop delay in Kubernetes" },
    { mistake: "Trusting X-Forwarded-For from anyone", why: "Copying proxy config without the trust settings", wrong: "Attackers spoof IPs to bypass rate limits and audit logs", fix: "Accept forwarded headers only from known proxy addresses" },
    { mistake: "Retrying non-idempotent requests at the proxy", why: "proxy_next_upstream on all errors", wrong: "A timed-out POST /payments is replayed on another server: double charge", fix: "Retry only idempotent methods, or use idempotency keys (4.4.2)" },
    { mistake: "One self-hosted load balancer", why: "It is just NGINX on a VM", wrong: "The balancer becomes the new single point of failure", fix: "Managed LB, or an active-passive pair with a floating IP" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Stateless app servers, separate readiness and liveness checks, and graceful draining on every deploy." },
    { tag: "Performance", text: "Use least-outstanding or power-of-two-choices balancing when request costs vary; keep keep-alive connections to backends." },
    { tag: "Security", text: "Terminate TLS at the proxy, enforce request limits and rate limits there, and trust forwarded headers only from the proxy." },
    { tag: "Maintainability", text: "Let the platform do service discovery (Kubernetes Services, cloud LBs); avoid hard-coded IPs anywhere." },
  ],
  interview: [
    { q: "What is the difference between a layer 4 and a layer 7 load balancer?", a: "L4 balances TCP/UDP connections by IP and port without reading the payload: very fast and protocol-agnostic. L7 parses HTTP, so it can route by path or host, terminate TLS, add headers, retry, and balance individual requests within HTTP/2 connections, at some extra cost. Big systems often use L4 in front of a fleet of L7 proxies." },
    { q: "Why might users get logged out after you add a second server, and how do you fix it?", a: "Sessions were stored in each server's memory, so a request routed to the other server has no session. Sticky sessions hide it but unbalance load and fail when a server dies. The real fix is stateless servers: signed tokens or a shared session store like Redis, and shared data-protection keys so every server can validate cookies." },
    { q: "What is the difference between a load balancer and a reverse proxy?", a: "A load balancer spreads requests across several backends and removes unhealthy ones. A reverse proxy is a single entry point that forwards requests and adds features like TLS termination, compression, caching, rate limiting and hiding internal servers; it is useful even with one backend. Tools like NGINX, HAProxy and Envoy do both." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You need to route /api/* to one pool and /admin/* to another, and terminate TLS. Which balancer?",
      options: ["Layer 4", "Layer 7", "DNS round robin", "Either, they are the same"],
      answer: 1,
      explanation: "Path-based routing and TLS termination require reading HTTP: layer 7.",
    },
    {
      kind: "bug",
      prompt: "During a short database outage, Kubernetes restarts all API pods in a loop and recovery takes 20 minutes. What is wrong?",
      options: ["Too few replicas", "The liveness probe checks the database, so a DB problem kills healthy processes", "The readiness probe is missing", "The Service selector is wrong"],
      answer: 1,
      explanation: "Liveness should check only that the process works; dependency checks belong in readiness.",
    },
    {
      kind: "mcq",
      prompt: "Why does 'power of two choices' beat round robin when request costs vary?",
      options: ["It uses more servers", "It avoids sending new work to a server that is already stuck on slow requests, using only two samples", "It caches responses", "It sorts requests by size"],
      answer: 1,
      explanation: "Comparing two random servers avoids most long queues without needing a global view.",
    },
  ],
  cheatSheet: [
    "L4: connections, fast, any protocol. L7: HTTP-aware routing, TLS, retries.",
    "Reverse proxy: TLS, compression, limits, caching, single entry point.",
    "Stateless servers: sessions in cookies/Redis, files in object storage.",
    "Readiness gates traffic; liveness restarts stuck processes (no dependency checks).",
    "Deploys: not-ready → drain → SIGTERM → exit.",
    "Uneven costs: least outstanding or power of two choices.",
    "Discovery: platform name (k8s Service, LB) or registry (Consul, etcd).",
    "Retry only idempotent requests; trust X-Forwarded-For only from the proxy.",
  ],
  homework: {
    basic: {
      title: "Implement smooth weighted round robin",
      brief: [
        "New servers are bigger: api-big has weight 5, api-a and api-b weight 1. Implement NGINX's smooth weighted round robin (each round: add each server's weight to its current value, pick the highest, subtract the total weight from the winner) and print the first 14 picks. Explain why 'smooth' matters compared with sending 5 in a row to api-big.",
      ],
      criteria: ["Algorithm implemented as described", "Picks proportional to weights", "Explanation of the interleaving"],
      hints: ["Keep a dict of current values starting at 0."],
      solution: {
        text: ["The smooth version interleaves the small servers between the big server's picks instead of bursting five requests in a row at it, which keeps short-term load even and avoids bursts on any single backend."],
        code: {
          lang: "python",
          file: "smooth_wrr.py",
          code: `from collections import Counter

weights = {"api-big": 5, "api-a": 1, "api-b": 1}
current = {name: 0 for name in weights}
total = sum(weights.values())

picks = []
for _ in range(14):
    for name, w in weights.items():
        current[name] += w
    winner = max(current, key=current.get)
    current[winner] -= total
    picks.append(winner)

print(" ".join(p.replace("api-", "") for p in picks))
print(dict(Counter(picks)))`,
        },
        output: "big big a big b big big big big a big b big big\n{'api-big': 10, 'api-a': 2, 'api-b': 2}",
      },
    },
    intermediate: {
      title: "Health checks with rise and fall thresholds",
      brief: [
        "Write a health checker that probes three backends every tick. A backend is marked DOWN after 3 consecutive failures (fall) and UP again after 2 consecutive successes (rise). Feed it a scripted sequence of probe results and print the state changes. Explain why both thresholds exist.",
      ],
      criteria: ["Separate fall and rise counters", "Only state changes are logged", "Explanation of flapping"],
      hints: ["Reset the opposite counter on each result."],
      solution: {
        text: ["Without a fall threshold, one lost packet removes a healthy server; without a rise threshold, a server that is still crashing every few seconds gets traffic back immediately and fails it. The thresholds damp flapping. Real values (HAProxy defaults are fall 3, rise 2) trade detection speed for stability."],
        code: {
          lang: "python",
          file: "health.py",
          code: `FALL, RISE = 3, 2

class Backend:
    def __init__(self, name):
        self.name, self.up, self.fails, self.oks = name, True, 0, 0
    def observe(self, ok: bool, tick: int):
        if ok:
            self.oks, self.fails = self.oks + 1, 0
            if not self.up and self.oks >= RISE:
                self.up = True
                print(f"tick {tick:2d}: {self.name} UP")
        else:
            self.fails, self.oks = self.fails + 1, 0
            if self.up and self.fails >= FALL:
                self.up = False
                print(f"tick {tick:2d}: {self.name} DOWN")

# 1 = probe succeeded, 0 = failed
script = {
    "api-1": "1111111111111",
    "api-2": "1101111111111",     # one lost probe: should stay UP
    "api-3": "1100011010111",     # crashes, flaps, recovers
}
backends = {name: Backend(name) for name in script}
for tick in range(13):
    for name, results in script.items():
        backends[name].observe(results[tick] == "1", tick)
print("in rotation:", [b.name for b in backends.values() if b.up])`,
        },
        output: "tick  4: api-3 DOWN\ntick  6: api-3 UP\nin rotation: ['api-1', 'api-2', 'api-3']",
      },
    },
    challenge: {
      title: "Client-side service discovery with heartbeats",
      brief: [
        "Build a registry where instances register with a TTL and must heartbeat to stay listed. A client caches the instance list for a few seconds and picks with power of two choices using its own in-flight counts. Simulate an instance that stops heartbeating (crashed) and show when the registry drops it and when the client stops calling it.",
      ],
      criteria: ["Registry expires instances without heartbeats", "Client caches the list with its own TTL", "Timeline shows the detection delay"],
      hints: ["Detection delay ≈ registry TTL + client cache TTL. Print both."],
      solution: {
        text: ["api-3 crashes at t = 10 s, yet the client may still call it at t = 20 s: the registry keeps it for its 15 s TTL after the last heartbeat (t = 5 s), and the client's 5 s cache adds more. In the worst case the delay is registry TTL + heartbeat interval + client cache TTL. That is why client-side discovery also needs fast failure handling (timeouts and retrying on another instance), and why platforms push updates instead of relying only on polling."],
        code: {
          lang: "python",
          file: "discovery.py",
          code: `import random

class Registry:
    def __init__(self, ttl):
        self.ttl, self.last_beat = ttl, {}
    def heartbeat(self, inst, now):
        self.last_beat[inst] = now
    def instances(self, now):
        return sorted(i for i, t in self.last_beat.items() if now - t <= self.ttl)

class Client:
    def __init__(self, registry, cache_ttl, seed=4):
        self.reg, self.cache_ttl = registry, cache_ttl
        self.cached, self.fetched_at = [], None
        self.inflight, self.rng = {}, random.Random(seed)
    def pick(self, now):
        if self.fetched_at is None or now - self.fetched_at >= self.cache_ttl:
            self.cached, self.fetched_at = self.reg.instances(now), now
        a, b = self.rng.choice(self.cached), self.rng.choice(self.cached)
        return a if self.inflight.get(a, 0) <= self.inflight.get(b, 0) else b

reg = Registry(ttl=15)
client = Client(reg, cache_ttl=5)
crashed_at = 10
for now in range(0, 36, 5):
    for inst in ("api-1", "api-2", "api-3"):
        if not (inst == "api-3" and now >= crashed_at):
            reg.heartbeat(inst, now)
    picks = {client.pick(now) for _ in range(20)}
    print(f"t={now:2d}s registry={reg.instances(now)}  client may call api-3: {'api-3' in picks}")`,
        },
        output: "t= 0s registry=['api-1', 'api-2', 'api-3']  client may call api-3: True\nt= 5s registry=['api-1', 'api-2', 'api-3']  client may call api-3: True\nt=10s registry=['api-1', 'api-2', 'api-3']  client may call api-3: True\nt=15s registry=['api-1', 'api-2', 'api-3']  client may call api-3: True\nt=20s registry=['api-1', 'api-2', 'api-3']  client may call api-3: True\nt=25s registry=['api-1', 'api-2']  client may call api-3: False\nt=30s registry=['api-1', 'api-2']  client may call api-3: False\nt=35s registry=['api-1', 'api-2']  client may call api-3: False",
        pitfalls: ["Making the registry a single point of failure: Consul, etcd and ZooKeeper run as 3- or 5-node clusters."],
      },
    },
    capstone: {
      title: "DevAtlas: three stateless API replicas behind a proxy, with zero-downtime deploys",
      brief: [
        "Run your capstone API as three replicas behind NGINX (Docker Compose) or a Kubernetes Service. Move sessions to Redis or signed tokens, add /livez and /readyz, handle SIGTERM gracefully, and prove with a k6 run during a rolling restart that no request fails.",
      ],
      criteria: ["No in-memory sessions", "Separate liveness and readiness endpoints", "Graceful shutdown implemented", "k6 run during restart with 0% errors"],
      hints: ["Restart replicas one by one with `docker compose restart api-1` while k6 runs; or `kubectl rollout restart deployment/api`."],
      solution: {
        text: [
          "The app side is small: two endpoints and a shutdown hook that flips readiness to false, keeps serving while the balancer notices, then lets Uvicorn finish in-flight requests and exit. The example is FastAPI with Uvicorn (tested with FastAPI 0.146 and Uvicorn's `Server.handle_exit`); ASP.NET Core does the same with IHostApplicationLifetime.ApplicationStopping and health check tags.",
          "In Kubernetes, a terminating pod is removed from Service endpoints anyway, so the preStop sleep from the hands-on is enough there; the readiness flip matters most behind NGINX, HAProxy or a cloud load balancer that only learns about the drain through health checks.",
        ],
        code: {
          lang: "python",
          file: "app/health.py",
          code: `"""Liveness, readiness and graceful draining for the DevAtlas API.
Run: python -m app.health serve   (tests: python -m app.health)"""
import sys
import threading

import uvicorn
from fastapi import FastAPI, Response

DRAIN_SECONDS = 10            # longer than the balancer's check interval x failure threshold
app = FastAPI()
state = {"ready": True}


@app.get("/livez")
def livez() -> dict:
    return {"status": "alive"}                      # process works; no dependency checks


@app.get("/readyz")
def readyz(response: Response) -> dict:
    if not state["ready"]:
        response.status_code = 503
        return {"status": "draining"}
    # optional: a fast check of critical dependencies (e.g. Redis PING with a 50 ms timeout)
    return {"status": "ready"}


class DrainingServer(uvicorn.Server):
    """On SIGTERM: fail readiness first, keep serving, then shut down gracefully."""

    def handle_exit(self, sig, frame) -> None:
        if state["ready"]:
            state["ready"] = False
            threading.Timer(DRAIN_SECONDS, super().handle_exit, args=(sig, frame)).start()


def serve() -> None:
    config = uvicorn.Config(app, host="0.0.0.0", port=8080, timeout_graceful_shutdown=30)
    DrainingServer(config).run()


def self_test() -> None:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    assert client.get("/readyz").status_code == 200
    state["ready"] = False                          # what handle_exit does on SIGTERM
    assert client.get("/readyz").status_code == 503
    assert client.get("/livez").status_code == 200  # still alive while draining
    print("ok: ready -> draining, liveness unaffected")


if __name__ == "__main__":
    serve() if sys.argv[1:] == ["serve"] else self_test()`,
        },
        output: "ok: ready -> draining, liveness unaffected",
        pitfalls: ["DRAIN_SECONDS plus the graceful shutdown timeout must fit inside the orchestrator's grace period (terminationGracePeriodSeconds), or the process is killed mid-drain.", "Health endpoints behind auth: the balancer cannot reach them."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: load balancer, reverse proxy, application layer (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#load-balancer" },
    { label: "NGINX: HTTP load balancing", url: "https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/" },
    { label: "Envoy: load balancing overview", url: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview" },
    { label: "Kubernetes: liveness, readiness and startup probes", url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/" },
  ],
  nextPreview: "Next: scaling relational databases. Read replicas, federation, sharding and denormalisation, and how to choose a shard key you will not regret.",
};
