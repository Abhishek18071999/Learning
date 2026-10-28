import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.7.3",
  title: "Reverse proxies, load balancing and NAT",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["9.7.2 Subnets, CIDR and IP addressing"],
  summary: "Route traffic like a production system: pick layer-4 or layer-7 balancing, understand the balancing algorithms, map host and path to upstreams with a reverse proxy, and see how NAT lets private networks reach the internet.",
  terms: [
    { term: "Reverse proxy", def: "A server that receives client requests and forwards them to upstream backends, hiding the topology and often terminating TLS." },
    { term: "Load balancer", def: "A proxy that distributes requests across multiple backends for scale and availability." },
    { term: "Layer 4 vs layer 7", def: "L4 balances on transport info (IP/port, no payload); L7 balances on application content (host, path, headers)." },
    { term: "Round-robin", def: "The simplest balancing: each backend in turn, regardless of load." },
    { term: "Least-connections", def: "Send each request to the backend with the fewest active connections, to balance uneven work." },
    { term: "NAT", def: "Network Address Translation — rewriting addresses (and ports) so many private hosts share one public IP." },
    { term: "Sticky session", def: "Pinning a user to a specific backend (by cookie or consistent hash) so state on that backend stays consistent." },
  ],
  problem: [
    "The DevAtlas API runs as one instance, and one slow request blocks everyone behind it. When it scales to three instances, traffic must spread across them, and the database — on a private subnet — must still reach the internet for updates.",
    "Three tools solve it: a load balancer spreads the load, a reverse proxy routes by host and path, and NAT lets private hosts reach the public internet. Each has a layer (4 or 7) and an algorithm, and choosing wrong is a classic scaling mistake.",
  ],
  concept: {
    analogy: [
      "A load balancer is a **restaurant host** sending guests to tables: round-robin seats each waiter in turn; least-connections seats the waiter with the fewest open tables. A reverse proxy is a **concierge** who reads the request ('dinner? pool?') and sends you to the right floor. NAT is the **office phone switchboard**: one public number, many internal extensions, the switchboard remembers who called whom.",
    ],
    precise: [
      "**Pick the layer by what you need to inspect.** L4 (TCP/UDP) is fast and sees only IP/port; it cannot route by URL. L7 terminates TLS and reads the HTTP host, path and headers, so it can route `/api` and `/ask` to different pools — at the cost of more work per connection.",
      "**Algorithms trade fairness for accuracy.** Round-robin is cheap and even but ignores load; least-connections follows the actual busyness of each backend. Sticky sessions trade perfect balance for correctness when a backend holds session state.",
      "**A reverse proxy is the front door.** It hides the backend topology, terminates TLS, adds headers (X-Forwarded-For), and routes by host and path. nginx and the cloud load balancers (ALB, Application Gateway) are the workhorses here.",
      "**NAT rewrites addresses.** Private hosts (10.x) share one public IP: the NAT box maps each outbound connection to a unique public port and translates the reply back. It is what lets an entire private subnet reach the internet through one address.",
    ],
  },
  underTheHood: {
    text: [
      "A reverse proxy accepts the client connection (terminating TLS if L7), matches the request against a routing table (host, path, headers), picks an upstream, opens a connection to it, and relays bytes. Because it owns both ends, it can add health checks, retries, timeouts and caching.",
      "Load-balancing algorithms operate on a backend list plus a small amount of state. Round-robin is a counter; least-connections needs a per-backend connection count; consistent hashing (for stickiness) hashes the client identifier onto a fixed ring so the same user always maps to the same backend, even as backends are added.",
      "NAT keeps a translation table: (private IP, private port, dest) → (public IP, public port). Outbound traffic is rewritten to the public address; replies are rewritten back. A NAT gateway in a cloud does exactly this for private subnets, so those hosts can download updates without being reachable from the internet.",
    ],
    diagram: {
      title: "A reverse proxy in front",
      nodes: [
        { label: "Client" },
        { label: "Proxy / LB", sub: "L4 or L7" },
        { label: "api-pool", sub: "host/path route" },
        { label: "ai-pool", sub: "/ask" },
        { label: "Backends" },
      ],
      edges: ["→", "routes", "routes", "forwards"],
    },
  },
  handsOn: [
    {
      title: "Pick L4 vs L7",
      text: [
        "The layer choice is the first routing decision. Here is the rule of thumb as code.",
      ],
      code: {
        lang: "python",
        file: "l4_l7.py",
        code: `"""L4 vs L7 load balancing: pick the layer for a need."""
def pick(need: str) -> str:
    n = need.lower()
    if "path" in n or "header" in n or "tls" in n:
        return "L7 (application layer)"
    return "L4 (transport layer)"


for need in ("route by URL path /api/*", "spread TCP connections", "route by Host header", "terminate TLS at the edge"):
    print(f"{need:40} -> {pick(need)}")`,
      },
      output: "route by URL path /api/*                 -> L7 (application layer)\nspread TCP connections                   -> L4 (transport layer)\nroute by Host header                     -> L7 (application layer)\nterminate TLS at the edge                -> L7 (application layer)",
      notes: [
        "Anything that needs to read the payload — paths, headers, TLS termination — is L7. Pure connection spreading is L4.",
      ],
    },
    {
      title: "Balancing algorithms",
      text: [
        "Round-robin spreads evenly; least-connections follows actual load. Both are a few lines of code.",
      ],
      code: {
        lang: "python",
        file: "round_robin.py",
        code: `"""Load-balancing algorithms: round-robin vs least-connections."""
servers = ["api-1", "api-2", "api-3"]


def round_robin(requests):
    return [servers[i % len(servers)] for i in range(requests)]


def least_connections(conns):
    return min(conns, key=conns.get)


print("round-robin 8 reqs:", round_robin(8))
print("least-connections:", least_connections({"api-1": 3, "api-2": 1, "api-3": 4}))`,
      },
      output: "round-robin 8 reqs: ['api-1', 'api-2', 'api-3', 'api-1', 'api-2', 'api-3', 'api-1', 'api-2']\nleast-connections: api-2",
      notes: [
        "Round-robin ignores load, so a backend handling a slow request still gets the next one. Least-connections avoids that, which is why it is the default for uneven workloads.",
      ],
    },
    {
      title: "NAT translation table",
      text: [
        "NAT maps many private hosts onto one public address by assigning each connection a unique public port.",
      ],
      code: {
        lang: "python",
        file: "nat.py",
        code: `"""NAT: translate private addresses to a public one and back."""
table = {}


def outbound(priv: str, pub_port: int) -> None:
    table[(priv, pub_port)] = True


for i in range(3):
    outbound(f"10.0.0.{i + 1}", 40000 + i)

print("NAT table (private -> public :port):")
for (priv, port) in table:
    print(f"  {priv} -> 203.0.113.5:{port}")`,
      },
      output: "NAT table (private -> public :port):\n  10.0.0.1 -> 203.0.113.5:40000\n  10.0.0.2 -> 203.0.113.5:40001\n  10.0.0.3 -> 203.0.113.5:40002",
      notes: [
        "The table is what lets the reply find the right internal host. Without the port mapping, three hosts sharing one public IP could not be told apart.",
      ],
    },
  ],
  companies: [
    "**Cloud ALBs / Application Gateways** are L7 reverse proxies that route by host and path, terminate TLS, and feed auto-scaling backend pools.",
    "**nginx** is the classic L7 reverse proxy: it routes by server block and location, adds headers, and can cache — often the front door of a self-managed stack.",
    "**NAT gateways** give private subnets outbound internet without exposing them inbound, a default pattern in every cloud VPC.",
    "**CDNs** act as massive reverse proxies at the edge, terminating TLS and caching close to users before any request reaches the origin.",
  ],
  mistakes: [
    {
      mistake: "Using L7 when L4 would do",
      why: "One proxy for everything",
      wrong: "Unnecessary TLS termination and payload parsing add latency and cost",
      fix: "Use L4 for pure connection spreading and TCP passthrough",
    },
    {
      mistake: "Sticky sessions as a band-aid for statelessness",
      why: "Storing session state on a single instance",
      wrong: "A failed instance loses user state, and load is uneven",
      fix: "Keep backends stateless (externalise session to Redis); use stickiness only when unavoidable",
    },
    {
      mistake: "Not adding X-Forwarded-For",
      why: "The backend logs only the proxy's IP",
      wrong: "You cannot tell where a request really came from during an investigation",
      fix: "Have the proxy set X-Forwarded-For (or X-Forwarded-Proto) and trust it only from the proxy",
    },
    {
      mistake: "Forgetting NAT for private subnets",
      why: "Assuming private hosts can reach the internet",
      wrong: "Dependency downloads and updates silently fail",
      fix: "Attach a NAT gateway to private subnets for outbound-only access",
    },
  ],
  bestPractices: [
    {
      tag: "Performance",
      text: "Use L4 for pass-through speed, L7 only when you need path/host routing or TLS termination.",
    },
    {
      tag: "Reliability",
      text: "Configure health checks so the proxy stops sending to failed backends, and set timeouts and retries.",
    },
    {
      tag: "Security",
      text: "Terminate TLS at the proxy, keep backends private, and only trust forwarded headers from your own proxy.",
    },
    {
      tag: "Maintainability",
      text: "Keep backends stateless and externalise session state so any instance can serve any request.",
    },
  ],
  interview: [
    {
      q: "What is the difference between L4 and L7 load balancing?",
      a: "L4 balances on transport info — IP and port — without looking at the payload, so it is fast and protocol-agnostic. L7 terminates TLS and reads the HTTP host, path and headers, so it can route different paths to different pools and apply HTTP-level rules, at higher cost per connection.",
    },
    {
      q: "When would you choose least-connections over round-robin?",
      a: "When requests have uneven duration. Round-robin can send a new request to a backend still chewing a slow one, while least-connections follows actual busyness. Round-robin is fine when all requests are roughly uniform and cheap.",
    },
    {
      q: "Why do you need NAT for a private subnet?",
      a: "Private hosts have RFC 1918 addresses that cannot be routed on the public internet. NAT translates them to a public address, mapping each outbound connection to a unique port so replies can be routed back — giving outbound internet without exposing the hosts inbound.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You must route /api and /ask to different backend pools. Which balancer do you need?",
      options: ["L4", "L7", "Either", "Neither"],
      answer: 1,
      explanation: "Routing by URL path requires reading the HTTP payload, which only an L7 proxy can do.",
    },
    {
      kind: "output",
      prompt: "Which backend does least-connections pick?",
      code: {
        lang: "python",
        code: `conns = {"a": 4, "b": 1, "c": 2}
print(min(conns, key=conns.get))`,
      },
      options: ["a", "b", "c"],
      answer: 1,
      explanation: "b has the fewest connections (1).",
    },
    {
      kind: "bug",
      prompt: "A backend stores login state locally, so sticky sessions pin users to one instance. That instance dies. What is the root problem?",
      options: [
        "The backend is stateful; state should live in a shared store (Redis), not on the instance",
        "Sticky sessions are always wrong",
        "The proxy should round-robin",
        "Nothing is wrong",
      ],
      answer: 0,
      explanation: "Sticky sessions are the symptom; local state is the disease. Externalise session state so any instance can serve any user.",
    },
  ],
  cheatSheet: [
    "L4 = IP/port only, fast; L7 = host/path/headers, TLS termination.",
    "Round-robin is cheap; least-connections follows load.",
    "Sticky sessions trade balance for correctness — prefer stateless backends.",
    "A reverse proxy hides topology, terminates TLS, and adds forwarded headers.",
    "NAT maps many private hosts to one public IP via a port table.",
    "Health checks stop the proxy from sending to dead backends.",
    "Keep backends stateless; externalise session state to Redis.",
  ],
  homework: {
    basic: {
      title: "Round-robin distribution",
      brief: ["Distribute seven requests across four servers with round-robin and print the sequence."],
      criteria: ["Each server is visited in rotation", "Seven picks are produced", "Runs offline"],
      hints: ["Index by `i % len(servers)`."],
      solution: {
        text: ["Round-robin is a counter modulo the number of backends — the simplest possible balancing, and the default in many proxies."],
        code: {
          lang: "python",
          file: "rr.py",
          code: `"""Round-robin pick for N requests."""
servers = ["a", "b", "c", "d"]
print([servers[i % len(servers)] for i in range(7)])`,
        },
        output: "['a', 'b', 'c', 'd', 'a', 'b', 'c']",
      },
    },
    intermediate: {
      title: "Least-connections pick",
      brief: ["Given per-backend connection counts, return the backend with the fewest active connections."],
      criteria: ["Returns the least-loaded backend", "Handles ties deterministically", "Runs offline"],
      hints: ["`min(dict, key=dict.get)`."],
      solution: {
        text: ["Least-connections follows actual load, so a slow backend stops receiving new work until it drains."],
        code: {
          lang: "python",
          file: "least_conn.py",
          code: `"""Least-connections pick."""
conns = {"a": 5, "b": 1, "c": 3}
print(min(conns, key=conns.get))`,
        },
        output: "b",
      },
    },
    challenge: {
      title: "Sticky sessions via consistent hashing",
      brief: ["Hash each user onto a fixed server so the same user always lands on the same backend, and confirm 'alice' is stable."],
      criteria: ["Same user maps to the same server", "Different users spread across servers", "Runs offline"],
      hints: ["MD5 the user id, take modulo the server count."],
      solution: {
        text: ["Consistent hashing gives stickiness without a central session map. It is still a fallback: stateless backends are the real answer."],
        code: {
          lang: "python",
          file: "sticky.py",
          code: `"""Sticky sessions via consistent hashing: same user -> same server."""
import hashlib

servers = ["api-1", "api-2", "api-3"]


def route(user_id: str) -> str:
    h = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
    return servers[h % len(servers)]


for u in ("alice", "bob", "carol", "alice"):
    print(f"{u:6} -> {route(u)}")`,
        },
        output: "alice  -> api-2\nbob    -> api-3\ncarol  -> api-2\nalice  -> api-2",
      },
    },
    capstone: {
      title: "DevAtlas: reverse-proxy routing table",
      brief: ["Build a routing table that maps host and path to an upstream, and match three requests against it."],
      criteria: ["Host-and-path matching", "Wildcard path prefix support", "Fallback for no match"],
      hints: ["Iterate the routes; a trailing `/*` is a prefix match."],
      solution: {
        text: ["This is the core of an L7 proxy config: a table of (host, path) → upstream, matched in order. Real configs (nginx, ALB rules) are this table written as configuration."],
        code: {
          lang: "python",
          file: "proxy_config.py",
          code: `"""A reverse-proxy routing table: host/path -> upstream."""
ROUTES = [
    ("api.example.com", "/lessons/*", "api-pool:80"),
    ("api.example.com", "/ask", "ai-pool:8000"),
    ("www.example.com", "/", "web-pool:3000"),
]


def match(host, path):
    for h, p, upstream in ROUTES:
        if host != h:
            continue
        if p.endswith("/*") and path.startswith(p[:-2]):
            return upstream
        if path == p or p == "/":
            return upstream
    return "404"


for req in (("api.example.com", "/lessons/7"), ("api.example.com", "/ask"), ("www.example.com", "/")):
    print(req, "->", match(*req))`,
        },
        output: "('api.example.com', '/lessons/7') -> api-pool:80\n('api.example.com', '/ask') -> ai-pool:8000\n('www.example.com', '/') -> web-pool:3000",
      },
    },
  },
  deeper: [
    { label: "nginx reverse proxy docs", url: "https://nginx.org/en/docs/http/ngx_http_proxy_module.html" },
    { label: "Cloudflare: What is a load balancer?", url: "https://www.cloudflare.com/learning/performance/what-is-load-balancing/" },
    { label: "Cloudflare: What is NAT?", url: "https://www.cloudflare.com/learning/network-layer/what-is-network-address-translation/" },
    { label: "AWS: Application Load Balancer", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html" },
  ],
  nextPreview: "Next: DevSecOps — SAST, DAST, dependency, container and secret scanning, wired into CI.",
};
