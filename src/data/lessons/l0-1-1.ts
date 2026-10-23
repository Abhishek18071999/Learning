import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.1.1",
  title: "What happens when you type a URL",
  minutes: 70,
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
    { term: "Round-trip time (RTT)", def: "The time for a message to reach a host and come back. DNS, TCP and TLS each cost whole RTTs, so distance multiplies every connection setup." },
    { term: "Anycast", def: "Many servers announcing the same IP address; the network routes each user to the nearest one. It is how public DNS resolvers and CDNs answer quickly worldwide." },
    { term: "CDN", def: "Content Delivery Network: a fleet of edge servers that terminate TCP/TLS near the user and cache content, so a request does not have to cross an ocean to reach your origin." },
    { term: "Keep-alive", def: "Reusing one TCP/TLS connection for many HTTP requests instead of paying for a new handshake on every call." },
    { term: "HSTS", def: "HTTP Strict Transport Security: a response header that tells the browser to use HTTPS for this site for a set time, never plain HTTP." },
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
      "The layers are **nested**, not alternatives: your HTTP request is carried inside TLS records, which are carried inside TCP segments, which are carried inside IP packets. Each layer only trusts the one below it, and each has its own failure mode. A DNS failure looks like `NXDOMAIN`; a TCP failure looks like a connection timeout or refused connection; a TLS failure looks like a certificate warning; an HTTP failure looks like a 4xx or 5xx. Being able to say *which layer* is broken is most of debugging a web request.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Parse and normalise the URL.** The browser splits `https://devatlas.dev/lessons?id=1#top` into scheme `https`, authority `devatlas.dev`, path `/lessons`, query `id=1` and fragment `#top` (the fragment never goes to the server). It lowercases the host, percent-encodes unsafe characters, converts an internationalised name to Punycode (`münchen.de` to `xn--mnchen-3ya.de`) and drops the default port 443. If you have visited the site before, it may send the request over a previously cached connection before doing any of the steps below.",
      "2. **DNS lookup.** The browser checks its own cache, then the operating system cache, then asks a recursive resolver (your ISP, or a public one such as 1.1.1.1 or 8.8.8.8). On a cache miss the resolver walks the hierarchy: the root servers, then the `.dev` TLD servers, then the domain's authoritative nameserver, which returns an `A` (IPv4) or `AAAA` (IPv6) record with a TTL. Other record types do other jobs: `CNAME` aliases one name to another, `MX` routes mail, `TXT` carries verification and policy (SPF, DKIM), `CAA` says which certificate authorities may issue certificates, and `NS`/`SOA` describe the zone itself. Big sites use **anycast**: the same IP is announced from many locations, and the network routes you to the nearest one, so the 'distance' to a name is often small even when the company is far away.",
      "3. **TCP handshake.** The browser opens a connection to the resolved IP on port 443. TCP proves both sides can send and receive with a three-way handshake: client `SYN`, server `SYN-ACK`, client `ACK` - one full round trip before a single byte of HTTP is sent. TCP then numbers every byte so the receiver can reorder and retransmit, and it backs off when the network drops packets. That reliability is why HTTP can pretend it has a simple, ordered stream.",
      "4. **TLS handshake.** With TLS 1.3 the client sends a `ClientHello` carrying the hostname (`SNI`), the protocols it supports (`ALPN`: `h2`, `http/1.1`), and a key share. The server replies with its certificate, its chosen protocol and its key share, and both sides derive the same session keys without ever sending them. The browser validates the certificate's domain name, validity dates and signature chain up to a root in its trust store. TLS 1.3 costs one round trip (1.2 costs two); session resumption can cost zero, at the price of replay risk for early data. **HSTS** tells the browser to refuse plain HTTP for this site from now on.",
      "5. **HTTP request and response.** The browser writes a request line (`GET /lessons?id=1 HTTP/2`), headers (`Host`, `User-Agent`, `Accept`, `Cookie`, and conditional headers such as `If-None-Match`) and an optional body. The server - often behind a load balancer or CDN - runs your code and returns a status line, headers (content type, length or `Transfer-Encoding: chunked`, `Cache-Control`, `ETag`, `Set-Cookie`) and a body. `Connection: keep-alive` means the connection stays open for the next request.",
      "6. **HTTP versions change the cost.** HTTP/1.0 opened a connection per request. HTTP/1.1 added keep-alive but still processes one response at a time per connection, so a slow response blocks the ones behind it (head-of-line blocking). HTTP/2 multiplexes many requests over one TCP connection, but a lost packet still stalls all of them. HTTP/3 runs over QUIC on UDP, removes the TCP head-of-line stall and combines the transport and TLS handshake. That is why the version your connection negotiated matters.",
      "7. **Render.** The browser parses HTML into a DOM and CSS into a CSSOM, then lays out and paints. JavaScript can block parsing unless marked `async` or `defer`. Sub-resources (CSS, JS, images, fonts) are discovered as parsing proceeds and fetched in parallel, reusing the same connection where possible. `preconnect` starts a handshake early; `preload` fetches a critical file early; `dns-prefetch` resolves a name early.",
      "8. **Add up the round trips.** On a 200 ms RTT, DNS (1) + TCP (1) + TLS 1.3 (1) + request/response (1) is about 800 ms before the server's 40 ms of work - the server is 5% of the wait. On a 20 ms RTT the same stack is about 80 ms. This is the whole reason a CDN, keep-alive, HTTP/2/3 and TLS 1.3 matter: they attack the round trips, not your code. Measure the phases, do not guess: `curl -w` and the browser's Network timing show them separately, and real-user monitoring (the Navigation Timing API) shows what actual users experience.",
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
      title: "Resolve a name yourself",
      text: [
        "`dig` ships with macOS and most Linux distributions (Debian/Ubuntu: `sudo apt install dnsutils`). On Windows use `nslookup`, or run these in WSL. Notice the two IPv6 and two IPv4 answers: one name can return several addresses, and the client tries them in order.",
      ],
      code: { lang: "bash", code: "dig +short example.com\ndig example.com A +noall +answer   # shows the TTL too\nnslookup example.com              # Windows alternative" },
      output: "Server:  ip-10-0-0-2.ap-south-1.compute.internal\nAddress:  10.0.0.2\n\nName:    example.com\nAddresses:  2606:4700:10::6814:179a\n             2606:4700:10::ac42:93f3\n             104.20.23.154\n             172.66.147.243",
      notes: [
        "The `A`/`AAAA` answers are chosen by the domain owner and cached for the record's TTL, so yours may differ.",
        "Those IPv6 addresses belong to Cloudflare's anycast network: the nearest of many locations answers you. Verify ownership with `whois` or an IP-info service; never guess from an address.",
      ],
    },
    {
      title: "Measure every phase with curl",
      text: ["`curl -w` prints the time at which each phase finished, measured from the start. Run it twice: the second run usually shows near-zero DNS because the answer was cached."],
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
      output: "  dns lookup:     0.116s\n  tcp connect:    0.387s\n  tls handshake:  1.059s\n  first byte:     1.147s\n  total:          1.147s\n  http version:   1.1\n  status:         200",
      notes: [
        "These values are real, captured on a machine behind a corporate proxy. Subtract consecutive rows to get each phase: TCP 0.271 s, TLS 0.672 s, wait for first byte 0.088 s. The proxy, not the site, dominates here - which is the lesson: measure before you optimise.",
        "`time_appconnect - time_connect` is the TLS cost. `time_starttransfer - time_appconnect` is roughly one round trip plus server work. If that last gap is large while the handshakes are small, the slowness is in your server; if the handshakes dominate, it is the network.",
      ],
    },
    {
      title: "Read the wire with curl -v",
      text: ["HTTP/1.1 is plain text. `-v` shows the request and response after TLS decrypts them. These response headers are from the same real request and reveal three things at once: a CDN (`Server: cloudflare`), a cache hit (`Age`), and connection reuse (`Connection: keep-alive`)."],
      code: { lang: "bash", code: "curl -sv https://example.com 2>&1 | grep -E '^[<>]'" },
      output: "> GET / HTTP/1.1\n> Host: example.com\n> User-Agent: curl/8.21.0\n> Accept: */*\n< HTTP/1.1 200 OK\n< Content-Type: text/html; charset=utf-8\n< Transfer-Encoding: chunked\n< Connection: keep-alive\n< Server: cloudflare\n< Age: 14192",
      notes: [
        "Lines starting with `>` are sent by you, `<` are received. `Age: 14192` means this copy sat in the edge cache for about four hours; `Transfer-Encoding: chunked` means the length was not known in advance; `keep-alive` means the socket stays open for the next request.",
        "A proxy can cap the protocol version: curl negotiated HTTP/1.1 even though the site supports HTTP/2. That is another reason to measure on the path your users actually take.",
      ],
    },
    {
      title: "Compare the versions you will meet",
      text: ["The protocols behind the trace are versioned, and the version explains much of a page's speed. Keep this table nearby when you debug."],
      code: {
        lang: "text",
        file: "protocols.txt",
        code: `HTTP
1.0   one connection per request; keep-alive off by default
1.1   keep-alive on; one response at a time per connection (head-of-line blocking)
2     many requests multiplexed over one TCP connection; header compression; TLS in practice
3     QUIC over UDP; no TCP head-of-line stall; TLS 1.3 built in; 0-RTT resumption

TLS
1.2   2-RTT handshake; large cipher-suite list; RSA or ECDHE key exchange
1.3   1-RTT handshake (0-RTT resumption); fewer, safer suites; forward secrecy by default

DNS records
A      IPv4 address              AAAA   IPv6 address
CNAME  alias to another name     MX     mail server
TXT    verification and policy    CAA    which CAs may issue certificates
NS     zone delegation           SOA    zone metadata`,
      },
      notes: ["Prefer TLS 1.3 and HTTP/2 or 3 where you control the server. Behind a proxy, check what it negotiates - you may be stuck on 1.1 without knowing."],
    },
    {
      title: "Do the same in the browser",
      text: [
        "Open DevTools (F12), go to the **Network** tab, reload the page and click the first (document) request. The **Timing** tab shows the same phases: DNS lookup, initial connection, SSL, waiting for server response (TTFB) and content download. Compare its numbers with curl's; if they disagree, something between you and the site (a proxy, a VPN, a service worker) is interfering.",
      ],
    },
  ],
  companies: [
    "**Cloudflare, Akamai, Amazon CloudFront, Azure Front Door (illustrative; Cloudflare observed in this lesson):** CDNs exist almost entirely because of round trips. They terminate TCP and TLS at an edge location near the user, so the Mumbai user's handshakes travel 20 ms instead of 200 ms, and cached content never reaches your origin at all. The `Server: cloudflare` and `Age: 14192` headers in the hands-on are a real edge cache answering for the origin.",
    "**DNS is a common single point of failure (illustrative):** several large outages have been traced to DNS misconfigurations or a DNS provider failing, not to application code. Teams at scale keep TTLs deliberate: short (60 to 300 s) on records they may need to fail over quickly, longer on stable records to reduce lookups. They also treat a DNS change like a code change, with review and a rollback plan.",
    "**Connection reuse at scale (illustrative, a well-known framework pitfall):** services call each other millions of times per minute. Reusing connections (HTTP keep-alive, HTTP/2 multiplexing, connection pools) avoids paying the TCP and TLS handshake on every call. Creating a new `HttpClient` (or a new `requests.Session`, or a raw `fetch` with a fresh agent) per request is a classic way to exhaust sockets under load.",
    "**Public anycast resolvers (illustrative; see each operator's docs):** Cloudflare's 1.1.1.1 and Google's 8.8.8.8 announce the same address from many locations, so the network routes you to the nearest. That is the same anycast trick CDNs use, applied to DNS itself - which is why a resolver can answer in a few milliseconds even though the root and TLD servers are elsewhere.",
    "**Certificate automation (illustrative):** Let's Encrypt and the managed certificates on major clouds exist because expired certificates take sites down on a weekend. Automate renewal and alert well before expiry; a certificate is an operational dependency, not a one-time setup step.",
  ],
  mistakes: [
    { mistake: "Blaming the server for every slow page", why: "The server is the part you control and can see", wrong: "You optimise code for weeks while 70% of the time is network handshakes", fix: "Measure phases first with curl -w or DevTools Timing, then optimise the biggest one" },
    { mistake: "Setting a long DNS TTL before a migration", why: "Defaults like 86400 s are copied without thought", wrong: "You switch servers but users keep hitting the old IP for up to a day", fix: "Lower the TTL (e.g. 300 s) at least one old-TTL period before the change, then raise it again" },
    { mistake: "Ignoring certificate expiry", why: "Certificates are set up once and forgotten", wrong: "The site goes down with a browser security error on a weekend", fix: "Automate renewal (e.g. Let's Encrypt via certbot, or managed certs on your cloud) and alert on expiry" },
    { mistake: "Opening a new connection for every API call", why: "It is the simplest code to write", wrong: "Extra handshakes add latency, and socket exhaustion appears under load", fix: "Reuse clients and connection pools (one shared HttpClient / requests.Session / fetch keep-alive)" },
    { mistake: "Thinking HTTPS only hides passwords", why: "Encryption is the visible part", wrong: "Skipping HTTPS on 'non-sensitive' pages lets attackers inject scripts or ads", fix: "Use HTTPS everywhere and enable HSTS" },
    { mistake: "Measuring latency from one location and generalising", why: "It is the only network you have", wrong: "You tune the server for a 20 ms RTT while far users wait on 200 ms handshakes", fix: "Measure from the regions your users are in (synthetic checks or RUM), and look at the phases separately" },
    { mistake: "Assuming HTTPS is inherently slow", why: "TLS sounds expensive", wrong: "You avoid TLS or terminate it badly, trading a 1-RTT setup cost for real security and SEO problems", fix: "TLS 1.3 costs one round trip, and keep-alive amortises it across many requests; measure handshake time, not 'HTTPS vs HTTP'" },
    { mistake: "Serving both the apex and www", why: "Both names 'work'", wrong: "Two hostnames mean two DNS lookups, two certificates and split caches, and users get logged out when they cross between them", fix: "Pick one canonical hostname and 301-redirect the other" },
    { mistake: "Forgetting IPv6", why: "IPv4 still works for you", wrong: "Users on IPv6-only or dual-stack networks fall back slowly, or cannot reach a CDN that lacks AAAA records", fix: "Publish AAAA records and confirm your CDN/load balancer supports IPv6 end to end" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Put static assets behind a CDN and enable HTTP/2 or HTTP/3 so many files share one connection." },
    { tag: "Performance", text: "Use `<link rel=\"preconnect\">` for third-party origins the page will definitely need, so handshakes start early." },
    { tag: "Security", text: "HTTPS everywhere, HSTS enabled, TLS 1.2 minimum (prefer 1.3), certificates renewed automatically." },
    { tag: "Reliability", text: "Treat DNS changes like code changes: review them, lower TTLs before migrations, and know how to roll back." },
    { tag: "Cost", text: "CDN caching cuts origin traffic, which reduces compute and data-transfer bills, often the largest line items for web apps." },
  ],
  interview: [
    { q: "What happens when you type a URL into the browser and press Enter?", a: "Walk the layers in order and name the cost of each. The browser parses and normalises the URL (scheme, host, path, query; Punycode for international names). DNS resolves the host: browser cache, OS cache, recursive resolver, root, TLD, authoritative server. A record with a TTL comes back. Then TCP's three-way handshake to port 443 (one round trip), then TLS 1.3 (one round trip) carrying SNI (the hostname), ALPN (the protocol list) and a key share, with the server's certificate validated against a trusted root. Only then does HTTP send the request line, headers and body, and the server replies with a status, headers and body. Finally the browser parses HTML into a DOM and CSS into a CSSOM and fetches sub-resources. Close by saying every handshake is a round trip, so on a 200 ms link you can spend 600 to 800 ms before the server runs a line of your code - which is why CDNs, keep-alive, TLS 1.3 and HTTP/2 or 3 exist." },
    { q: "Users in one region report slowness but your servers look healthy. How do you investigate?", a: "Split network time from server time before changing anything. Reproduce with curl -w or a synthetic check from that region, and read the phases: if DNS, connect and TLS dominate, the fix is distance (a CDN edge or a regional deployment), not code; if time_starttransfer minus time_appconnect is large while the handshakes are small, the server or a dependency is slow. Confirm with real-user monitoring (Navigation Timing / TTFB by region) and check whether the connection is being reused. Then rank fixes by effort: terminate TLS near users and keep warm connections to the origin (CDN), enable HTTP/2 or 3 and TLS 1.3, and only then consider a second region, which brings a data-consistency cost." },
    { q: "Why does DNS TTL matter during a migration, and what else can bite you?", a: "Resolvers cache an answer for its TTL, so with a one-day TTL some users keep hitting the old IP for a day after you switch. Lower the TTL (for example to 300 s) at least one old-TTL period before the change, migrate, verify, then raise it again. The same thinking applies to certificates (automate renewal and alert on expiry), to the apex-versus-www choice (pick one canonical host and redirect the other), and to IPv6 (publish AAAA records and confirm the CDN or load balancer supports IPv6 end to end)." },
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
    "TCP handshake = 1 RTT. TLS 1.3 = 1 RTT. TLS 1.2 = 2 RTT. Reused connection = 0.",
    "`curl -w` timings are cumulative. Subtract consecutive values to get each phase.",
    "TTFB = handshakes + one round trip + server processing.",
    "CDNs and anycast cut latency by terminating connections near the user.",
    "HTTP/2 multiplexes over one TCP connection; HTTP/3 removes TCP head-of-line blocking over QUIC.",
    "Lower DNS TTL before migrations; automate certificate renewal; enable HSTS.",
    "Reuse connections: keep-alive, connection pools, HTTP/2. Never one client per request.",
    "Each layer fails differently: NXDOMAIN (DNS), timeout/refused (TCP), certificate error (TLS), 4xx/5xx (HTTP).",
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
          "latency_budget.py turns the round-trip count into numbers. With a 20 ms RTT the model gives 140 ms (the local users' 150 ms); with a 250 ms RTT and a cold TLS 1.2 connection it gives 1165 ms (the reported 1.2 s). The 40 ms of server work is 3% of the far user's wait. The last two rows are the fixes.",
          "How to prove each claim: run phases.sh from the basic task in that region, so DNS, TCP, TLS and wait appear separately; pass two URLs on the same host to one curl command and the second request skips DNS, TCP and TLS because curl reuses the connection; the server log (or a Server-Timing header) confirms the 40 ms.",
        ],
        code: { lang: "python", file: "latency_budget.py", code: `"""Latency budget for one HTTPS API call: where does a 1.2 s TTFB come from?

Each phase costs whole round trips (RTTs). The server's own work (40 ms in the
logs) is the only part that does not grow with distance.
"""
from dataclasses import dataclass

SERVER_MS = 40  # what the server logs say each request takes


@dataclass
class Scenario:
    name: str
    rtt_ms: float          # round trip between the user and whatever terminates TLS
    dns_rtts: float        # resolver round trips on a cache miss (0 when cached)
    tcp_rtts: int          # TCP handshake (0 when the connection is reused)
    tls_rtts: int          # TLS 1.2 = 2, TLS 1.3 = 1, reused = 0
    origin_ms: float = 0   # extra edge-to-origin time when a CDN/edge proxies the call

    def phases(self) -> dict[str, float]:
        return {
            "dns": self.dns_rtts * self.rtt_ms,
            "tcp": self.tcp_rtts * self.rtt_ms,
            "tls": self.tls_rtts * self.rtt_ms,
            "request": 1 * self.rtt_ms + self.origin_ms,  # request out, first byte back
            "server": SERVER_MS,
        }


SCENARIOS = [
    Scenario("local user, cold, TLS 1.2", rtt_ms=20, dns_rtts=1, tcp_rtts=1, tls_rtts=2),
    Scenario("far user, cold, TLS 1.2", rtt_ms=250, dns_rtts=0.5, tcp_rtts=1, tls_rtts=2),
    Scenario("far user, cold, TLS 1.3", rtt_ms=250, dns_rtts=0.5, tcp_rtts=1, tls_rtts=1),
    Scenario("far user, reused conn", rtt_ms=250, dns_rtts=0, tcp_rtts=0, tls_rtts=0),
    # Fix 1: CDN edge 30 ms from the user, warm keep-alive pool from edge to origin.
    Scenario("far user via CDN edge", rtt_ms=30, dns_rtts=0.5, tcp_rtts=1, tls_rtts=1, origin_ms=250),
    # Fix 2: a second regional deployment 30 ms from the user (no long hop at all).
    Scenario("far user, regional API", rtt_ms=30, dns_rtts=0.5, tcp_rtts=1, tls_rtts=1),
]

if __name__ == "__main__":
    print(f"{'scenario':28} {'dns':>5} {'tcp':>5} {'tls':>5} {'req':>5} {'srv':>5} {'TTFB':>6}")
    for s in SCENARIOS:
        p = s.phases()
        total = sum(p.values())
        cells = " ".join(f"{v:5.0f}" for v in p.values())
        print(f"{s.name:28} {cells} {total:6.0f}")
    print(f"\\nserver share of the far cold call: {SERVER_MS / sum(SCENARIOS[1].phases().values()):.0%}")` },
        output: "scenario                       dns   tcp   tls   req   srv   TTFB\nlocal user, cold, TLS 1.2       20    20    40    20    40    140\nfar user, cold, TLS 1.2        125   250   500   250    40   1165\nfar user, cold, TLS 1.3        125   250   250   250    40    915\nfar user, reused conn            0     0     0   250    40    290\nfar user via CDN edge           15    30    30   280    40    395\nfar user, regional API          15    30    30    30    40    145\n\nserver share of the far cold call: 3%",
        pitfalls: ["Optimising server code when the server is 3% of the wait", "Forgetting that a CDN only helps if it keeps warm connections to the origin; a cold edge-to-origin hop still pays the long RTT"],
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
  nextPreview: "Next: HTTP in depth. Methods, status codes, headers and caching: the vocabulary of every API you will build and debug.",
};
