import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.7.1",
  title: "OSI, TCP/IP, DNS and TLS: the network one layer at a time",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["0.1.1 What happens when you type a URL"],
  summary: "Stop guessing which layer is broken. Learn the OSI stack as a debugging map, the TCP and TLS handshakes that every request performs, how DNS turns a name into an address, and how to read CIDR ranges so you can plan and divide networks.",
  terms: [
    { term: "OSI model", def: "Seven layers (physical → application) used to reason about where a networking problem lives: is it a wire, a packet, a port or an app issue?" },
    { term: "TCP", def: "Reliable, ordered, connection-oriented transport. Opens with a three-way handshake (SYN, SYN-ACK, ACK) and acknowledges every byte." },
    { term: "UDP", def: "Fast, connectionless transport with no handshake or retries — used by DNS and real-time traffic where a lost packet beats a delayed one." },
    { term: "DNS", def: "The directory that resolves a hostname to an IP address, cached at several layers so a bad record can linger after the change." },
    { term: "TLS", def: "The protocol that encrypts and authenticates a TCP connection; TLS 1.3 completes in one round trip before any application data." },
    { term: "CIDR", def: "Compact IP-range notation such as 10.0.0.0/24, where the /N counts the fixed (network) bits." },
    { term: "Subnet", def: "A subdivision of a larger network — a VPC split into public and private blocks across availability zones." },
    { term: "Handshake", def: "The opening exchange that sets up a session before data flows (TCP's three-way, TLS's ClientHello/ServerHello)." },
  ],
  problem: [
    "A DevAtlas deploy works locally but the API cannot reach Redis in production, and a separate report says the site is slow. 'It is a network problem' is not diagnosable — the network is seven layers, and the fix is completely different at each one.",
    "The team needs a mental map: which layer carries the symptom, what a healthy handshake looks like, and which command reveals each layer's state. Without it, every outage is a long guessing game.",
  ],
  concept: {
    analogy: [
      "The OSI model is a **shipping journey**: layer 7 is the letter you wrote, layer 6 the envelope, layer 5 the phone call agreeing the courier will come, layer 4 the courier confirming each parcel arrived, layer 3 the address on the label, layer 2 the truck on a specific street, and layer 1 the road itself. A lost parcel has a different fix depending on which stage failed.",
    ],
    precise: [
      "**The stack is a debugging map.** When something fails, walk down from the top: app logic (7) → TLS (6) → session (5) → TCP/UDP port (4) → IP/routing (3) → link (2) → wire (1). 'Cannot connect' at layer 4 is a different problem from 'connected but slow' at layer 7.",
      "**TCP is reliable because it acknowledges.** The three-way handshake (SYN → SYN-ACK → ACK) establishes sequence numbers, then every byte is acknowledged; missing bytes are retransmitted. That reliability costs latency and overhead, which is why DNS and game traffic use UDP.",
      "**TLS rides on TCP and adds two guarantees:** encryption (no eavesdropping) and authentication (the server proves its identity with a certificate). TLS 1.3 collapses the handshake to one round trip. After it, the application data is opaque to the network.",
      "**DNS is cached everywhere.** A name resolves through the local cache, the resolver, and the authoritative server, each with a TTL. When DNS 'does not work', check which layer is stale before blaming the record.",
      "**CIDR is how you plan addresses.** 10.0.0.0/24 means the first 24 bits are the network; the rest are hosts. Planning subnets is just choosing a larger prefix and splitting it into blocks that are big enough, but not wasteful, for each purpose.",
    ],
  },
  underTheHood: {
    text: [
      "One HTTPS request becomes nested envelopes. The application writes an HTTP request; TLS wraps it in an encrypted record; TCP splits it into segments with sequence numbers and sends them to a port; IP wraps each segment in a packet addressed to the destination; the link layer turns packets into frames with MAC addresses; the physical layer sends bits.",
      "At the other end the process reverses. A firewall drops the packet (layer 3) or a NAT rewrites the address (layer 3/4); a load balancer terminates TLS and opens a fresh connection to the backend (layer 4 or 7). Each hop is where a specific class of bug lives.",
      "The two handshakes matter because they add latency before data moves: TCP's SYN→SYN-ACK→ACK is one round trip, then TLS's ClientHello→ServerHello is another. On a high-latency link that is most of the user-perceived delay, which is why connection reuse and keep-alive matter.",
    ],
    diagram: {
      title: "One request, seven layers",
      nodes: [
        { label: "App", sub: "HTTP GET" },
        { label: "TLS", sub: "encrypt" },
        { label: "TCP", sub: "segments :443" },
        { label: "IP", sub: "packets" },
        { label: "Link", sub: "frames" },
        { label: "Physical", sub: "bits" },
      ],
      edges: ["wraps", "segments", "packets", "frames", "sends"],
    },
  },
  handsOn: [
    {
      title: "Follow a request down the stack",
      text: [
        "The OSI model is not theory to memorise — it is the order in which a request is wrapped. Walk one HTTPS call down and back up.",
      ],
      code: {
        lang: "python",
        file: "layers.py",
        code: `"""Follow one HTTPS request down the stack and back up."""
def follow(route: str) -> list[str]:
    return [
        f"7 app:    HTTP GET {route}",
        "6 present: TLS encrypts it (handshake first)",
        "5 session: opens a TCP connection",
        "4 trans:   TCP segments to port 443",
        "3 net:     IP packets to the server address",
        "2 link:    Ethernet frames on the local network",
        "1 phys:    bits on the wire",
    ]


for line in follow("/api/lessons"):
    print(line)`,
      },
      output: "7 app:    HTTP GET /api/lessons\n6 present: TLS encrypts it (handshake first)\n5 session: opens a TCP connection\n4 trans:   TCP segments to port 443\n3 net:     IP packets to the server address\n2 link:    Ethernet frames on the local network\n1 phys:    bits on the wire",
      notes: [
        "When a request fails, name the layer before touching anything: 'DNS returned nothing' (3), 'port refused' (4), 'certificate invalid' (6), '500 from the app' (7). The fix lives one layer down.",
      ],
    },
    {
      title: "The TCP and TLS handshakes",
      text: [
        "Before any data moves, two handshakes run. Reading them tells you where the latency and the failure are.",
      ],
      code: {
        lang: "python",
        file: "tcp_handshake.py",
        code: `"""TCP and TLS handshakes, as state machines with sequence numbers."""
def tcp_handshake():
    print("TCP 3-way handshake")
    print("  client -> server: SYN      seq=1000")
    print("  server -> client: SYN-ACK  seq=5000 ack=1001")
    print("  client -> server: ACK      seq=1001 ack=5001")
    print("  ... data flows with ack = last received byte + 1 ...")
    print("  close: FIN -> ACK -> FIN -> ACK")


def tls_handshake():
    print("TLS 1.3 handshake (1 round trip)")
    print("  client -> server: ClientHello  (versions, cipher suites, key share)")
    print("  server -> client: ServerHello  (chosen suite, key share) + Certificate + Finished")
    print("  client -> server: Finished")
    print("  ... application data is now encrypted ...")


tcp_handshake()
print()
tls_handshake()`,
      },
      output: "TCP 3-way handshake\n  client -> server: SYN      seq=1000\n  server -> client: SYN-ACK  seq=5000 ack=1001\n  client -> server: ACK      seq=1001 ack=5001\n  ... data flows with ack = last received byte + 1 ...\n  close: FIN -> ACK -> FIN -> ACK\n\nTLS 1.3 handshake (1 round trip)\n  client -> server: ClientHello  (versions, cipher suites, key share)\n  server -> client: ServerHello  (chosen suite, key share) + Certificate + Finished\n  client -> server: Finished\n  ... application data is now encrypted ...",
      notes: [
        "A connection that hangs at SYN (no SYN-ACK) is usually a firewall or a dead host; a failure at ServerHello is TLS configuration or a bad certificate.",
      ],
    },
    {
      title: "Read a CIDR range",
      text: [
        "Planning a network starts with a CIDR block. Python's `ipaddress` does the arithmetic so you can reason about ranges instead of bit-flipping.",
      ],
      code: {
        lang: "python",
        file: "cidr.py",
        code: `"""CIDR: turn a prefix into network, broadcast, host count and subnets."""
import ipaddress


def analyze(cidr: str) -> None:
    net = ipaddress.ip_network(cidr, strict=False)
    hosts = list(net.hosts())
    print(cidr)
    print(f"  network      {net.network_address}")
    print(f"  broadcast    {net.broadcast_address}")
    print(f"  netmask      {net.netmask}")
    print(f"  first usable {hosts[0]}")
    print(f"  last usable  {hosts[-1]}")
    print(f"  addresses    {net.num_addresses} (usable {net.num_addresses - 2})")


analyze("10.0.0.0/24")
print()
print("split into /26 subnets:")
for sub in ipaddress.ip_network("10.0.0.0/24").subnets(new_prefix=26):
    print(f"  {sub}")`,
      },
      output: "10.0.0.0/24\n  network      10.0.0.0\n  broadcast    10.0.0.255\n  netmask      255.255.255.0\n  first usable 10.0.0.1\n  last usable  10.0.0.254\n  addresses    256 (usable 254)\n\nsplit into /26 subnets:\n  10.0.0.0/26\n  10.0.0.64/26\n  10.0.0.128/26\n  10.0.0.192/26",
      notes: [
        "A /24 has 256 addresses but 254 usable (network + broadcast are reserved). Splitting it into /26 quarters gives four 64-address subnets — the move you make when dividing a VPC into public and private blocks.",
      ],
    },
  ],
  companies: [
    "**Cloud VPCs** (AWS, Azure) are entirely CIDR planning: you pick a /16, split it into public/private subnets across availability zones, and route between them. Every subnet, route table and NAT mapping traces back to a CIDR decision.",
    "**CDNs and load balancers** terminate TLS at the edge (layer 6/7) and open fresh TCP connections to origin servers, which is why origin latency and connection reuse dominate performance.",
    "**On-call engineers** triage with layer language: 'DNS is slow' (layer 3), 'TLS handshake failures spike' (layer 6), 'app returns 503' (layer 7) — and the runbook for each is different.",
    "**Distributed systems** rely on TCP's guarantees and TLS's encryption for every internal call; teams set retries and timeouts (lesson 6.3.12) on top of those semantics.",
  ],
  mistakes: [
    {
      mistake: "Blaming 'the network' for a layer-7 bug",
      why: "One umbrella word for seven layers",
      wrong: "Hours lost chasing packets when the app returned a 500",
      fix: "Name the layer from the symptom before acting",
    },
    {
      mistake: "Forgetting DNS caches have TTLs",
      why: "Assuming a change is instant",
      wrong: "A stale record keeps routing traffic to the old host for hours",
      fix: "Check TTL, then the local cache, resolver and authoritative server in order",
    },
    {
      mistake: "Treating /24 as '24 hosts'",
      why: "Confusing the mask with the host count",
      wrong: "Under-sized subnets that run out of addresses in production",
      fix: "The /N counts network bits; hosts = 2^(32-N), minus network and broadcast",
    },
    {
      mistake: "Ignoring handshake latency",
      why: "Only measuring the body of the request",
      wrong: "Every cold connection pays TCP + TLS round trips before data moves",
      fix: "Reuse connections (keep-alive, connection pools) and keep the handshake off the hot path",
    },
    {
      mistake: "Opening a new TLS connection per request",
      why: "Cleaner code, one call per connection",
      wrong: "Handshake cost dominates and the origin slows under connection churn",
      fix: "Use pooled HTTP clients that reuse sockets (HttpClientFactory in ASP.NET Core)",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Triage with layer language and keep a symptom→command cheat sheet; verify each layer bottom-up.",
    },
    {
      tag: "Performance",
      text: "Reuse TCP and TLS connections (connection pooling, keep-alive) so the handshake is not paid per request.",
    },
    {
      tag: "Security",
      text: "Terminate TLS with current certificates and strong cipher suites; never send secrets over plain HTTP.",
    },
    {
      tag: "Maintainability",
      text: "Plan CIDR blocks on paper (or with `ipaddress`) before creating subnets; document the allocation.",
    },
    {
      tag: "Cost",
      text: "Right-size subnets — too small means rework, too large means wasted address space that is hard to reclaim in cloud.",
    },
  ],
  interview: [
    {
      q: "Walk me through what happens, layer by layer, when a browser loads an HTTPS page.",
      a: "Layer 7: the app builds an HTTP GET. Layer 6: TLS wraps it — first a handshake (ClientHello → ServerHello + certificate → Finished). Layer 5/4: TCP opens with SYN → SYN-ACK → ACK, then sends the bytes in acknowledged segments to port 443. Layer 3: IP packets route to the server address. Layer 2/1: frames and bits on the wire. The server unwraps in reverse and returns the response.",
    },
    {
      q: "Why does DNS sometimes return a stale address after you change a record?",
      a: "DNS is cached at multiple layers with a TTL: the client OS, the resolver, and downstream resolvers. Until the old record's TTL expires, caches keep returning the old address. That is why you lower the TTL well before a migration.",
    },
    {
      q: "What is the difference between TCP and UDP, and where would you use each in a backend?",
      a: "TCP is reliable and ordered with a handshake and acknowledgements — used for HTTP, databases, gRPC, anything that must not lose data. UDP is connectionless with no guarantees — used for DNS and real-time streaming where a retransmitted packet arrives too late to matter.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A service cannot connect and the SYN never gets a SYN-ACK back. Which layer should you investigate first?",
      options: ["Application (7)", "Transport / firewall (3–4)", "The JSON payload format", "The database schema"],
      answer: 1,
      explanation: "A missing SYN-ACK points at the network/firewall/transport layer — the packet is not reaching a listening service.",
    },
    {
      kind: "output",
      prompt: "How many usable host addresses are in a /28?",
      options: ["14", "16", "28", "256"],
      answer: 0,
      explanation: "2^(32-28) = 16 total, minus the network and broadcast addresses = 14 usable.",
    },
    {
      kind: "bug",
      prompt: "You changed an A record and most users see the new IP instantly, but one office still gets the old one. What is the most likely cause?",
      options: [
        "The office's resolver cache still holds the old record until its TTL expires",
        "TLS is broken",
        "The server is down",
        "UDP does not retry",
      ],
      answer: 0,
      explanation: "DNS is cached per resolver with a TTL; that office's cache has not expired yet, so it still returns the old address.",
    },
  ],
  cheatSheet: [
    "OSI = a debugging map: name the layer before you act.",
    "TCP handshake: SYN → SYN-ACK → ACK; then every byte is acknowledged.",
    "TLS 1.3 handshake is one round trip; it adds encryption + authentication.",
    "UDP: no handshake, no retries — DNS and real-time traffic.",
    "DNS is cached with a TTL; lower the TTL before a migration.",
    "CIDR: /N counts network bits; hosts = 2^(32-N) minus 2.",
    "Reuse connections (pooling, keep-alive) so the handshake is paid once.",
    "Walk bottom-up: wire → link → IP → port → TLS → app.",
  ],
  homework: {
    basic: {
      title: "Read three CIDR blocks",
      brief: [
        "Print the network, broadcast and usable host count for a /28, a /26 and a /30 using `ipaddress`. Explain why the /30 is special.",
      ],
      criteria: [
        "Correct network and broadcast for each block",
        "Correct usable host count",
        "Explains why a /30 has only two usable addresses",
      ],
      hints: ["`net.hosts()` and `net.num_addresses` do the arithmetic."],
      solution: {
        text: [
          "A /30 leaves 2 bits for hosts: 4 addresses, minus network and broadcast, so exactly 2 usable — the standard size for a point-to-point link between two routers.",
        ],
        code: {
          lang: "python",
          file: "subnet_basic.py",
          code: `"""Given a prefix, print its network, broadcast and usable host count."""
import ipaddress

for cidr in ("10.0.0.0/28", "172.16.5.0/26", "192.168.1.0/30"):
    net = ipaddress.ip_network(cidr, strict=False)
    print(f"{cidr:14} network={net.network_address} broadcast={net.broadcast_address} usable={net.num_addresses - 2}")`,
        },
        output: "10.0.0.0/28    network=10.0.0.0 broadcast=10.0.0.15 usable=14\n172.16.5.0/26  network=172.16.5.0 broadcast=172.16.5.63 usable=62\n192.168.1.0/30 network=192.168.1.0 broadcast=192.168.1.3 usable=2",
      },
    },
    intermediate: {
      title: "A TCP connection state machine",
      brief: [
        "Model the states a TCP connection passes through on the client and the server side, from closed to established to closed. Print each side's sequence.",
      ],
      criteria: [
        "Client and server paths are distinct",
        "States are in the correct order",
        "Includes the teardown states (FIN-WAIT, TIME-WAIT, CLOSE-WAIT)",
      ],
      hints: ["The server enters CLOSE-WAIT after receiving FIN; the client enters TIME-WAIT last."],
      solution: {
        text: [
          "TIME-WAIT on the client is a feature: it waits so any late packets from the old connection are not mistaken for a new one on the same port.",
        ],
        code: {
          lang: "python",
          file: "tcp_state.py",
          code: `"""Walk a TCP connection through its states."""
def states(role: str) -> list[str]:
    if role == "client":
        return ["CLOSED", "SYN-SENT", "ESTABLISHED", "FIN-WAIT-1", "FIN-WAIT-2", "TIME-WAIT", "CLOSED"]
    return ["LISTEN", "SYN-RECEIVED", "ESTABLISHED", "CLOSE-WAIT", "LAST-ACK", "CLOSED"]


for role in ("client", "server"):
    print(f"{role}: {' -> '.join(states(role))}")`,
        },
        output: "client: CLOSED -> SYN-SENT -> ESTABLISHED -> FIN-WAIT-1 -> FIN-WAIT-2 -> TIME-WAIT -> CLOSED\nserver: LISTEN -> SYN-RECEIVED -> ESTABLISHED -> CLOSE-WAIT -> LAST-ACK -> CLOSED",
      },
    },
    challenge: {
      title: "Plan a VPC across two availability zones",
      brief: [
        "From a 10.0.0.0/16 VPC, carve a public and a private subnet for each of two availability zones using /20 blocks, and print the allocation.",
      ],
      criteria: [
        "Four non-overlapping /20 subnets",
        "Each AZ gets a public and a private block",
        "No two subnets overlap",
      ],
      hints: ["`ip_network(...).subnets(new_prefix=20)` lists the /20 blocks in order."],
      solution: {
        text: [
          "This is exactly how a cloud VPC is laid out: a /16 split into per-AZ public and private subnets, so a failure in one AZ leaves the other serving traffic.",
        ],
        code: {
          lang: "python",
          file: "vpc_plan.py",
          code: `"""Plan subnets across two availability zones from a VPC CIDR."""
import ipaddress

vpc = ipaddress.ip_network("10.0.0.0/16")
subnets = list(vpc.subnets(new_prefix=20))
azs = ["us-east-1a", "us-east-1b"]
plan = {}
for i, az in enumerate(azs):
    plan[az] = [subnets[i * 2], subnets[i * 2 + 1]]

for az, blocks in plan.items():
    print(f"{az}: public={blocks[0]} private={blocks[1]}")`,
        },
        output: "us-east-1a: public=10.0.0.0/20 private=10.0.16.0/20\nus-east-1b: public=10.0.32.0/20 private=10.0.48.0/20",
      },
    },
    capstone: {
      title: "DevAtlas: symptom-to-command cheat sheet",
      brief: [
        "Build the debugging cheat sheet you would hand an on-call engineer: for each symptom, the exact command that reveals the failing layer. Include DNS, port, TLS, latency and packet-loss symptoms.",
      ],
      criteria: [
        "Five symptoms with a real, runnable command each",
        "Each command maps to a specific OSI layer",
        "Windows-friendly commands (PowerShell / cmd)",
      ],
      hints: ["Think `nslookup`, `netstat`, `openssl s_client`, `ping`, `tracert`, `curl`."],
      solution: {
        text: [
          "A cheat sheet turns panic into a checklist: run the one command that matches the symptom, and you have already localised the layer. Keep it short enough to read during an incident.",
        ],
        code: {
          lang: "python",
          file: "net_debug.py",
          code: `"""Map a symptom to the command that diagnoses it."""
SYMPTOM_TO_CMD = {
    "DNS won't resolve": "nslookup example.com",
    "port not listening": "netstat -ano | findstr :5432",
    "TLS cert expired": "openssl s_client -connect host:443",
    "slow to a service": "tracert <host>  /  curl -w time_total",
    "packet loss": "ping -t <host>",
}
for symptom, cmd in SYMPTOM_TO_CMD.items():
    print(f"{symptom:22} -> {cmd}")`,
        },
        output: "DNS won't resolve      -> nslookup example.com\nport not listening     -> netstat -ano | findstr :5432\nTLS cert expired       -> openssl s_client -connect host:443\nslow to a service      -> tracert <host>  /  curl -w time_total\npacket loss            -> ping -t <host>",
      },
    },
  },
  deeper: [
    { label: "The Cloudflare 'How DNS works' guide", url: "https://www.cloudflare.com/learning/dns/what-is-dns/" },
    { label: "The TLS 1.3 handshake (Cloudflare)", url: "https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/" },
    { label: "Computer Networking: A Top-Down Approach (Kurose & Ross)", url: "https://gaia.cs.umass.edu/kurose_ross/index.php" },
    { label: "ipaddress — Python stdlib docs", url: "https://docs.python.org/3/library/ipaddress.html" },
  ],
  nextPreview: "Next: subnets, CIDR and IP addressing in depth — planning and dividing networks for a real multi-tier deployment.",
};
