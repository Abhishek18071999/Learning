import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.1.1",
  title: "What happens when you type a URL",
  minutes: 50,
  level: "Beginner",
  prerequisites: ["None. This is where everyone starts."],
  summary: "Follow one request from your keyboard to a server and back: DNS, TCP, TLS and HTTP, and how to see each step yourself.",
  terms: [
    { term: "URL", def: "Uniform Resource Locator. The address of a resource, e.g. https://devatlas.dev/lessons?id=1: scheme, host, path, query." },
    { term: "DNS", def: "Domain Name System. The internet's phone book: it turns a name like devatlas.dev into an IP address." },
    { term: "IP address", def: "A number that identifies a machine on a network, e.g. 93.184.215.14 (IPv4) or 2606:2800::1 (IPv6)." },
    { term: "TCP", def: "Transmission Control Protocol. Gives a reliable, ordered stream of bytes between two machines." },
    { term: "TLS", def: "Transport Layer Security. Encrypts the connection and proves the server is who it claims to be. The S in HTTPS." },
    { term: "HTTP", def: "HyperText Transfer Protocol. The request/response language browsers and APIs speak." },
    { term: "Latency", def: "The time a message takes to travel. Each network round trip adds latency." },
    { term: "TTL", def: "Time To Live. How long a DNS answer may be cached before it must be looked up again." },
  ],
  problem: [
    "A customer in Mumbai says your site \"takes forever to load\". A customer in London says it is fine. Your server CPU is at 5%. Nothing is broken in your code.",
    "Where is the time going? You cannot answer that question until you know every step between a click and a rendered page. Every senior engineer carries this map in their head, and it is the most common opening question in web interviews for a reason: almost every performance and outage investigation starts here.",
  ],
  concept: {
    analogy: [
      "Think of sending a sealed letter to a company you have never contacted. First you look up their address in a directory (**DNS**). Then you call ahead to agree that you will send pages and they will confirm each one (**TCP**). You agree a secret code so nobody in the post office can read it, and you check their official ID card (**TLS**). Finally you write the actual request in a format both sides understand (**HTTP**), and they post a reply.",
    ],
    precise: [
      "A browser request is a stack of protocols, each solving one problem. **DNS** resolves a hostname to an IP address. **TCP** opens a reliable connection to that IP on a port (443 for HTTPS) with a three-way handshake. **TLS** negotiates encryption keys and verifies the server's certificate against trusted certificate authorities. **HTTP** then sends a request (method, path, headers, optional body) and receives a response (status code, headers, body).",
      "Each step costs one or more **round trips**. Mumbai to a server in Virginia is roughly 200 ms per round trip, so DNS + TCP + TLS + the HTTP request can cost close to a second before your server does any work. That is why the London user is fine and the Mumbai user is not, and why CDNs, connection reuse and HTTP/2 and HTTP/3 exist.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Parse the URL.** The browser splits `https://devatlas.dev/lessons?id=1` into scheme `https`, host `devatlas.dev`, path `/lessons` and query `id=1`.",
      "2. **DNS lookup.** The browser checks its own cache, then the OS cache, then asks a recursive resolver (often your ISP, or 1.1.1.1 / 8.8.8.8). On a cache miss the resolver walks the hierarchy: root servers, then the `.dev` servers, then the domain's authoritative name server, which returns an A (IPv4) or AAAA (IPv6) record with a TTL.",
      "3. **TCP handshake.** SYN, SYN-ACK, ACK: one round trip before any data is sent.",
      "4. **TLS handshake.** With TLS 1.3 this is one extra round trip. The server sends its certificate; the browser checks the domain name, the expiry date and the signature chain up to a trusted root.",
      "5. **HTTP request and response.** The browser sends `GET /lessons?id=1` with headers such as `Host`, `Accept` and cookies. The server (often behind a load balancer) runs your code and replies with, say, `200 OK` and HTML.",
      "6. **Render.** The browser parses HTML, discovers CSS, JS and images, and fetches those too, reusing the same connection where it can.",
    ],
    diagram: {
      title: "One HTTPS request, step by step",
      nodes: [
        { label: "Browser", sub: "parse URL" },
        { label: "DNS", sub: "name → IP" },
        { label: "TCP", sub: "3-way handshake" },
        { label: "TLS 1.3", sub: "keys + certificate" },
        { label: "HTTP", sub: "GET → 200 OK" },
        { label: "Render", sub: "HTML, CSS, JS" },
      ],
      edges: ["cache miss?", "IP:443", "1 RTT", "1 RTT", "bytes"],
      caption: "RTT = round-trip time. On a far-away network, the handshakes alone can cost more than your server's processing time.",
    },
  },
  handsOn: [
    {
      title: "Look up a domain yourself",
      text: ["`dig` ships with macOS and most Linux distros (on Debian/Ubuntu: `sudo apt install dnsutils`). On Windows use `nslookup`, or run these inside WSL."],
      code: { lang: "bash", code: "dig +short example.com\ndig example.com A +noall +answer   # shows the TTL too\nnslookup example.com              # Windows alternative" },
      output: "example.com.   3600   IN   A   <an IPv4 address>",
      notes: ["The number before `IN` is the TTL in seconds. The exact IP and TTL you see may differ: they are controlled by the domain owner and your resolver's cache."],
    },
    {
      title: "Watch every phase with curl",
      text: ["`curl -w` prints timings for each phase. Run it twice: the second time DNS is usually cached by your OS or resolver."],
      code: {
        lang: "bash",
        file: "timing.sh",
        code: `curl -s -o /dev/null https://example.com -w '
  dns lookup:     %{time_namelookup}s
  tcp connect:    %{time_connect}s
  tls handshake:  %{time_appconnect}s
  first byte:     %{time_starttransfer}s
  total:          %{time_total}s
  http version:   %{http_version}
  status:         %{response_code}
'`,
      },
      output: "  dns lookup:     0.012s\n  tcp connect:    0.098s\n  tls handshake:  0.205s\n  first byte:     0.311s\n  total:          0.312s\n  http version:   2\n  status:         200",
      notes: [
        "Each value is cumulative from the start, not per phase. TLS cost = `time_appconnect - time_connect`.",
        "`first byte` minus `tls handshake` is roughly network round trip + server processing. If that is large while the handshakes are small, the slowness is in your server, not the network.",
      ],
    },
    {
      title: "Send a raw HTTP request",
      text: ["HTTP/1.1 is just text. `-v` shows exactly what goes over the wire after TLS decrypts it."],
      code: { lang: "bash", code: "curl -v https://example.com 2>&1 | grep -E '^[<>]'" },
      output: "> GET / HTTP/2\n> Host: example.com\n> User-Agent: curl/8.x\n> Accept: */*\n< HTTP/2 200\n< content-type: text/html\n< cache-control: max-age=...",
      notes: ["Lines starting with `>` are sent by you, `<` are received. Your curl version and headers will differ slightly."],
    },
    {
      title: "Do the same in the browser",
      text: [
        "Open DevTools (F12), go to the **Network** tab, reload the page and click the first (document) request. The **Timing** tab shows the same phases: DNS lookup, initial connection, SSL, waiting for server response (TTFB) and content download.",
      ],
    },
  ],
  companies: [
    "**CDNs (Cloudflare, Akamai, Amazon CloudFront, Azure Front Door)** exist almost entirely because of round trips. They terminate TCP and TLS at an edge location near the user, so the Mumbai user's handshakes travel 20 ms instead of 200 ms, and cached content never reaches your origin at all.",
    "**DNS is a common single point of failure.** Several large outages in recent years were caused by DNS misconfigurations or DNS provider failures rather than application code. Teams that operate at scale keep DNS TTLs deliberate: short (60 to 300 s) on records they may need to fail over quickly, longer on stable records to reduce lookups.",
    "**Connection reuse matters at scale.** Services call each other millions of times per minute. Reusing connections (HTTP keep-alive, HTTP/2 multiplexing, connection pools) avoids paying the TCP and TLS handshake on every call. A classic .NET bug is creating a new `HttpClient` per request, which exhausts sockets under load.",
  ],
  mistakes: [
    { mistake: "Blaming the server for every slow page", why: "The server is the part you control and can see", wrong: "You optimise code for weeks while 70% of the time is network handshakes", fix: "Measure phases first with curl -w or DevTools Timing, then optimise the biggest one" },
    { mistake: "Setting a long DNS TTL before a migration", why: "Defaults like 86400 s are copied without thought", wrong: "You switch servers but users keep hitting the old IP for up to a day", fix: "Lower the TTL (e.g. 300 s) at least one old-TTL period before the change, then raise it again" },
    { mistake: "Ignoring certificate expiry", why: "Certificates are set up once and forgotten", wrong: "The site goes down with a browser security error on a weekend", fix: "Automate renewal (e.g. Let's Encrypt via certbot, or managed certs on your cloud) and alert on expiry" },
    { mistake: "Opening a new connection for every API call", why: "It is the simplest code to write", wrong: "Extra handshakes add latency, and socket exhaustion appears under load", fix: "Reuse clients and connection pools (one shared HttpClient / requests.Session / fetch keep-alive)" },
    { mistake: "Thinking HTTPS only hides passwords", why: "Encryption is the visible part", wrong: "Skipping HTTPS on 'non-sensitive' pages lets attackers inject scripts or ads", fix: "Use HTTPS everywhere and enable HSTS" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Put static assets behind a CDN and enable HTTP/2 or HTTP/3 so many files share one connection." },
    { tag: "Performance", text: "Use `<link rel=\"preconnect\">` for third-party origins the page will definitely need, so handshakes start early." },
    { tag: "Security", text: "HTTPS everywhere, HSTS enabled, TLS 1.2 minimum (prefer 1.3), certificates renewed automatically." },
    { tag: "Reliability", text: "Treat DNS changes like code changes: review them, lower TTLs before migrations, and know how to roll back." },
    { tag: "Cost", text: "CDN caching cuts origin traffic, which reduces compute and data-transfer bills, often the largest line items for web apps." },
  ],
  interview: [
    { q: "What happens when you type a URL into the browser and press Enter?", a: "Walk the layers in order: URL parsing, DNS resolution (browser, OS, resolver, root, TLD, authoritative), TCP handshake to port 443, TLS handshake with certificate validation, HTTP request and response, then rendering and sub-resource fetches. Mention caching at each step and the round-trip cost. Strong answers add CDNs, keep-alive and HTTP/2." },
    { q: "Users in one region report slowness but your servers look healthy. How do you investigate?", a: "Separate network time from server time. Use real user monitoring or curl -w from that region to compare DNS, connect, TLS and TTFB. If handshakes dominate, the fix is a CDN or a regional deployment. If TTFB dominates only for that region, check routing, the load balancer and regional dependencies." },
    { q: "Why does DNS TTL matter during a migration?", a: "Resolvers cache answers for the TTL. If the TTL is a day, some users keep the old IP for a day after the change. Lower it in advance, migrate, verify, then raise it." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which step turns `devatlas.dev` into an IP address?",
      options: ["TCP handshake", "DNS resolution", "TLS handshake", "HTTP GET"],
      answer: 1,
      explanation: "DNS maps names to addresses. TCP, TLS and HTTP all need the IP first.",
    },
    {
      kind: "output",
      prompt: "curl -w prints `time_connect: 0.100s` and `time_appconnect: 0.300s`. How long did the TLS handshake take?",
      options: ["0.100 s", "0.200 s", "0.300 s", "0.400 s"],
      answer: 1,
      explanation: "curl timings are cumulative from the start. TLS = appconnect − connect = 0.300 − 0.100 = 0.200 s.",
    },
    {
      kind: "bug",
      prompt: "A team moves to a new server on Friday evening. Half the users still reach the old server on Saturday. What did they most likely forget?",
      options: ["To restart the browser", "To lower the DNS TTL before the change", "To renew the TLS certificate", "To enable HTTP/2"],
      answer: 1,
      explanation: "With a long TTL, resolvers keep serving the cached old IP until it expires. Lower the TTL well before migrating.",
    },
  ],
  cheatSheet: [
    "Order: URL → DNS → TCP → TLS → HTTP → render.",
    "DNS caches: browser → OS → recursive resolver → root → TLD → authoritative.",
    "TCP handshake = 1 RTT. TLS 1.3 = 1 RTT. TLS 1.2 = 2 RTT.",
    "`curl -w` timings are cumulative. Subtract to get each phase.",
    "TTFB (time to first byte) = network + server processing.",
    "CDNs cut latency by terminating connections near the user.",
    "Lower DNS TTL before migrations. Automate certificate renewal.",
    "Reuse connections: one shared HTTP client, keep-alive, HTTP/2.",
  ],
  homework: {
    basic: {
      title: "Time five websites",
      brief: ["Run the `curl -w` timing script against five sites you use (include one hosted far from you). Record DNS, TCP, TLS and TTFB for each, run each twice, and explain why the second run differs."],
      criteria: ["A table with 5 sites × 2 runs × 4 phases", "Per-phase times computed by subtraction, not cumulative values", "One sentence per site on where the time went"],
      hints: ["Phase = current cumulative value minus the previous one.", "The second run often has near-zero DNS time. Why?"],
      solution: {
        text: [
          "Compute per-phase values: DNS = namelookup; TCP = connect − namelookup; TLS = appconnect − connect; server+network wait = starttransfer − appconnect.",
          "On the second run DNS drops to near zero because the OS or resolver cached the answer for the record's TTL. TCP and TLS stay roughly the same because curl opens a fresh connection each run.",
          "Far-away sites show larger TCP and TLS times, roughly one RTT each, while TTFB depends on both distance and server work. Sites behind a CDN show small TCP/TLS times even if the company is far away.",
        ],
        code: { lang: "bash", file: "phases.sh", code: `for url in https://example.com https://github.com; do
  curl -s -o /dev/null "$url" -w "%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}\\n" |
  awk -v u="$url" '{printf "%-25s dns=%.3f tcp=%.3f tls=%.3f wait=%.3f\\n", u, $1, $2-$1, $3-$2, $4-$3}'
done` },
        pitfalls: ["Reporting cumulative numbers as phase durations", "Running only once, so the effect of caching is missed"],
      },
    },
    intermediate: {
      title: "Explain a slow region",
      brief: ["Your API is hosted in one region. Users on another continent see a 1.2 s TTFB while local users see 150 ms. Server logs say each request takes 40 ms. Write a one-page diagnosis: where the extra time comes from, how you would prove it, and two fixes ranked by effort."],
      criteria: ["Breaks the 1.2 s into round trips with reasonable numbers", "Names a measurement method for each claim", "Two fixes with trade-offs (cost, complexity)"],
      hints: ["Count round trips: DNS, TCP, TLS, request. Multiply by the RTT.", "What changes if the connection is reused?"],
      solution: {
        text: [
          "With a ~250 ms RTT: DNS miss (~1 RTT to a far resolver path, often less) + TCP (1 RTT) + TLS 1.2 (2 RTT) or 1.3 (1 RTT) + request/response (1 RTT) + 40 ms server ≈ 4 to 5 RTTs ≈ 1.0 to 1.3 s. That matches the report; the server is not the problem.",
          "Prove it with curl -w or a synthetic check from that region, and with browser RUM timing data (Navigation Timing API).",
          "Fix 1 (low effort): put a CDN or edge proxy in front, so handshakes terminate near users and the edge keeps warm connections to your origin. Fix 2 (higher effort and cost): deploy the API in a second region with geo-routing; this also needs a data strategy (read replicas, or accepting cross-region writes).",
          "Also check quick wins: TLS 1.3, HTTP/2 and keep-alive so returning requests skip the handshakes.",
        ],
      },
    },
    challenge: {
      title: "Build a tiny DNS-aware latency probe",
      brief: ["Write a script (Python or Node) that takes a list of URLs, measures DNS time and total request time for each, and prints a sorted report. Bonus: run it from two cloud regions (free tier) and compare."],
      criteria: ["Measures DNS separately from the HTTP request", "Handles failures (timeout, DNS error) without crashing", "Sorted, readable output"],
      hints: ["In Python, `socket.getaddrinfo` does a DNS lookup you can time with `time.perf_counter()`.", "Set a timeout on every network call."],
      solution: {
        text: ["Time the DNS lookup and the request separately, catch errors per URL, and keep the slowest first so problems stand out."],
        code: {
          lang: "python",
          file: "probe.py",
          code: `import socket, sys, time, urllib.parse, urllib.request

def probe(url: str, timeout: float = 5.0) -> dict:
    host = urllib.parse.urlparse(url).hostname or ""
    result = {"url": url, "dns_ms": None, "total_ms": None, "error": None}
    try:
        t0 = time.perf_counter()
        socket.getaddrinfo(host, 443)
        result["dns_ms"] = (time.perf_counter() - t0) * 1000
        t1 = time.perf_counter()
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            resp.read(1)  # first byte is enough
        result["total_ms"] = (time.perf_counter() - t1) * 1000
    except Exception as exc:  # report, do not crash the whole run
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result

if __name__ == "__main__":
    rows = [probe(u) for u in sys.argv[1:]]
    rows.sort(key=lambda r: r["total_ms"] or float("inf"), reverse=True)
    for r in rows:
        if r["error"]:
            print(f"{r['url']:40} ERROR {r['error']}")
        else:
            print(f"{r['url']:40} dns={r['dns_ms']:7.1f}ms  request={r['total_ms']:7.1f}ms")

# usage: python3 probe.py https://example.com https://github.com`,
        },
        pitfalls: ["No timeout, so one dead host hangs the script", "Letting one exception abort every remaining URL"],
      },
    },
    capstone: {
      title: "DevAtlas step 1: write the request journey",
      brief: ["Create the DevAtlas repository with a `docs/architecture.md` file. Add a Mermaid sequence diagram of a user loading the DevAtlas home page: browser, DNS, CDN, frontend, API. This file will grow with every module."],
      criteria: ["Repository created with a README stating the project goal", "docs/architecture.md with a Mermaid sequenceDiagram that renders on GitHub", "Each arrow labelled with the protocol used"],
      hints: ["GitHub renders ```mermaid code blocks natively."],
      solution: {
        text: ["A minimal, correct diagram is enough. Keep it honest: only draw components you plan to build."],
        code: {
          lang: "markdown",
          file: "docs/architecture.md",
          code: "```mermaid\nsequenceDiagram\n  participant B as Browser\n  participant D as DNS resolver\n  participant C as CDN edge\n  participant F as React app (static)\n  participant A as DevAtlas API\n  B->>D: DNS query devatlas.dev\n  D-->>B: A/AAAA record (TTL 300)\n  B->>C: TCP + TLS 1.3 handshake\n  B->>C: GET / (HTTP/2)\n  C-->>B: index.html (cached)\n  B->>A: GET /api/progress (HTTPS, JWT)\n  A-->>B: 200 OK JSON\n```",
        },
      },
    },
  },
  deeper: [
    { label: "MDN: How the web works", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works" },
    { label: "MDN: An overview of HTTP", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview" },
    { label: "Cloudflare Learning Center: What is DNS?", url: "https://www.cloudflare.com/learning/dns/what-is-dns/" },
    { label: "curl manual (-w write-out variables)", url: "https://curl.se/docs/manpage.html" },
  ],
  nextPreview: "Next: the terminal. You will navigate a Linux machine, read logs, find the process eating your CPU and chain commands with pipes, the daily toolkit of every backend and DevOps engineer.",
};
