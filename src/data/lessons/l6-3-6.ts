import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.6",
  title: "DNS and CDNs: getting closer to the user",
  minutes: 75,
  level: "Advanced",
  prerequisites: ["0.1.1 What happens when you type a URL", "0.1.2 HTTP in depth: methods, status codes, headers, caching", "6.3.5 Consistency patterns: strong, eventual and weak"],
  summary: "How DNS resolution and TTLs really work (and why they bite during migrations), how DNS can route traffic by weight, latency or location, and how push and pull CDNs cut latency and origin load. Includes cache headers, hit-ratio maths and safe cache busting.",
  terms: [
    { term: "DNS resolver", def: "The server (often your ISP's, or 1.1.1.1 / 8.8.8.8) that looks up a name on your behalf and caches the answer." },
    { term: "Authoritative name server", def: "The server that holds the official records for a domain (configured with NS records at the registrar)." },
    { term: "TTL (time to live)", def: "How many seconds a resolver may cache a DNS answer (or a CDN may cache a response) before asking again." },
    { term: "A / AAAA / CNAME / NS / MX", def: "Record types: IPv4 address, IPv6 address, alias to another name, the domain's name servers, mail servers." },
    { term: "CDN", def: "Content delivery network: servers in many cities (points of presence) that cache and serve content close to users." },
    { term: "Pull CDN", def: "The CDN fetches a file from your server (the origin) the first time a user asks for it, then caches it until the TTL expires." },
    { term: "Push CDN", def: "You upload files to the CDN yourself whenever they change; the CDN never asks your server." },
    { term: "Cache hit ratio", def: "The share of requests the CDN serves from its cache without contacting the origin." },
  ],
  problem: [
    "DevAtlas is hosted in Frankfurt. Learners in Mumbai and São Paulo wait 3 seconds for the first page because every image, script and font crosses an ocean, sometimes several times. At the same time, the team plans to move the API to a new load balancer on Saturday, and last time they changed an IP address some users could not reach the site for half a day.",
    "Both problems live at the edge of your system, before a request ever reaches your code: DNS decides where users go, and CDNs decide whether they need to go to you at all. Getting these right is the cheapest performance and reliability win available.",
  ],
  concept: {
    analogy: [
      "**DNS** is the phone book, but with a twist: everyone keeps a **photocopy of the page** they last looked at, and the page says 'valid for 1 day'. If you change your number, people with an old photocopy keep calling the old number until their copy expires. That is the TTL.",
      "A **CDN** is like a bookshop chain. Instead of every reader travelling to the publisher's warehouse (your origin server), each city has a shop with copies of popular books. A **pull** shop orders a book the first time someone asks for it. A **push** shop receives every new book from the publisher in advance.",
    ],
    precise: [
      "**DNS resolution.** The browser asks the OS, the OS asks a recursive resolver. If the resolver has no cached answer, it asks a root server (who handles .dev?), then the TLD server (who handles devatlas.dev?), then the domain's authoritative server, which returns the record. Every layer caches the answer for its TTL, so most lookups are answered from a nearby cache in milliseconds.",
      "**DNS-based traffic management.** Managed DNS services (Route 53, Azure DNS / Traffic Manager, Cloudflare, NS1) can answer differently per request: **weighted** (send 10% to the new stack), **latency-based** (the region with the lowest latency for this resolver), **geolocation** (EU users to the EU region), and **failover** (if the health check fails, answer with the standby). Clients still cache by TTL, so DNS changes are never instant.",
      "**Pull CDN.** Point a hostname (cdn.devatlas.dev or the whole site) at the CDN. On a miss, the edge fetches from your origin and caches according to `Cache-Control`. Easy to set up, good for high-traffic sites. Downsides: the first request per edge is slow, and changes appear only after the TTL expires or you purge.",
      "**Push CDN.** You upload content to the CDN (or to object storage the CDN serves from) on every deploy. Good for sites with little traffic or rarely changing content, because nothing expires unexpectedly. Downside: you must manage uploads and deletions.",
      "**Cache busting.** Put a content hash in the filename (`app.3f9c2a.js`), cache it for a year with `immutable`, and keep the HTML itself short-lived (`no-cache`). A deploy then changes the HTML, which points to new filenames; nothing stale is ever served and nothing needs purging.",
    ],
  },
  underTheHood: {
    text: [
      "**Why DNS changes take hours.** If a record's TTL is 86,400 s, a resolver that cached it one second before your change keeps serving the old IP for a day. Some resolvers and clients also ignore low TTLs or cache longer. The fix is to **lower the TTL well before** the change (at least one old-TTL period ahead), make the change, keep the old server running until traffic drains, then raise the TTL again.",
      "**What a CDN does on each request.** The user's DNS lookup for the CDN hostname returns the IP of a nearby point of presence (via DNS or anycast routing). The edge looks up its cache by URL (plus any headers listed in `Vary`). Hit: served locally in a few milliseconds. Miss: the edge (often via a regional tier, called origin shield) fetches from the origin, stores the response if `Cache-Control` allows, and returns it. `stale-while-revalidate` lets the edge serve a slightly old copy while refreshing it in the background.",
      "**DNS and CDNs are eventually consistent copies** (lesson 6.3.5). Every TTL is a promise that you accept that much staleness. Personalised or private responses must be marked `private` or `no-store` so no shared cache keeps them.",
    ],
    diagram: {
      title: "From name to cached content",
      nodes: [
        { label: "Browser", sub: "cache by TTL" },
        { label: "Recursive resolver", sub: "1.1.1.1, ISP" },
        { label: "Root → TLD → authoritative", sub: "only on a miss" },
        { label: "CDN edge (nearest)", sub: "hit: ~10 ms" },
        { label: "Origin", sub: "only on a CDN miss" },
      ],
      edges: ["lookup", "miss", "IP of edge", "miss"],
    },
  },
  handsOn: [
    {
      title: "Inspect DNS like an operator",
      code: {
        lang: "bash",
        file: "dns.sh",
        code: `dig devatlas.dev A +noall +answer          # the answer and its remaining TTL (2nd column)
dig devatlas.dev NS +short                  # which servers are authoritative
dig www.devatlas.dev CNAME +short           # is it an alias, e.g. to a CDN hostname?
dig +trace devatlas.dev                     # walk root -> TLD -> authoritative yourself
dig @1.1.1.1 devatlas.dev A +short          # ask a specific resolver
dig @8.8.8.8 devatlas.dev A +short          # compare: are resolvers seeing the same answer?`,
      },
      notes: [
        "Run the first command twice a few seconds apart: the TTL counts down because the answer comes from the resolver's cache. That number is how long that resolver will keep serving the old IP if you change it now.",
        "On Windows, `Resolve-DnsName devatlas.dev -Type A` in PowerShell shows similar information.",
      ],
    },
    {
      title: "Plan a DNS migration with TTL arithmetic",
      code: {
        lang: "python",
        file: "ttl_plan.py",
        code: `def worst_case_hours(ttl_s: int, extra_cache_factor: float = 1.0) -> float:
    """Longest time a client may keep the old answer after you change a record."""
    return ttl_s * extra_cache_factor / 3600

old_ttl = 86_400     # 1 day, the value today
low_ttl = 60         # what we lower to before the migration

print(f"change now, TTL 1 day:            up to {worst_case_hours(old_ttl):5.1f} h on the old IP")
print(f"lower TTL first, then change:     up to {worst_case_hours(low_ttl) * 60:5.1f} min on the old IP")
print(f"lower the TTL at least {worst_case_hours(old_ttl):.0f} h before the change, so every cached copy has the new TTL")
print(f"budget for misbehaving resolvers (x2): keep old server for {worst_case_hours(low_ttl, 2) * 60:.0f} min, ideally longer")`,
      },
      output: "change now, TTL 1 day:            up to  24.0 h on the old IP\nlower TTL first, then change:     up to   1.0 min on the old IP\nlower the TTL at least 24 h before the change, so every cached copy has the new TTL\nbudget for misbehaving resolvers (x2): keep old server for 2 min, ideally longer",
      notes: ["In practice keep the old server answering for hours after the switch and watch its access log until traffic reaches zero; some clients cache longer than the TTL says."],
    },
    {
      title: "What the hit ratio buys you",
      code: {
        lang: "python",
        file: "cdn_maths.py",
        code: `requests_per_s = 5_000
avg_kb = 120
origin_ms, edge_ms = 180, 15            # Mumbai -> Frankfurt origin vs Mumbai edge

print("hit ratio  origin rps  origin egress MB/s  avg latency ms")
for hit in (0.0, 0.5, 0.8, 0.9, 0.95, 0.99):
    origin_rps = requests_per_s * (1 - hit)
    egress = origin_rps * avg_kb / 1000
    latency = hit * edge_ms + (1 - hit) * (edge_ms + origin_ms)
    print(f"{hit:8.0%}  {origin_rps:10.0f}  {egress:18.1f}  {latency:14.1f}")`,
      },
      output: "hit ratio  origin rps  origin egress MB/s  avg latency ms\n      0%        5000               600.0           195.0\n     50%        2500               300.0           105.0\n     80%        1000               120.0            51.0\n     90%         500                60.0            33.0\n     95%         250                30.0            24.0\n     99%          50                 6.0            16.8",
      notes: ["Going from 90% to 99% hit ratio cuts origin load by 10×. Hit ratio is improved by long TTLs on immutable assets, ignoring irrelevant query strings, a minimal `Vary`, and an origin shield."],
    },
    {
      title: "Cache headers for a pull CDN (NGINX origin)",
      code: {
        lang: "text",
        file: "nginx-origin.conf",
        code: `# Hashed build assets: cache everywhere for a year, never revalidate
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML: always revalidate, so a deploy is visible immediately
location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-cache";
}

# Public API data that changes rarely: short shared cache, serve stale while refreshing
location /v1/lessons {
    proxy_pass http://api;
    add_header Cache-Control "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
}

# Anything personal must never be stored by a shared cache
location /v1/me/ {
    proxy_pass http://api;
    add_header Cache-Control "private, no-store";
}`,
      },
      notes: ["`max-age` applies to browsers, `s-maxage` to shared caches such as CDNs. Vite, webpack and most bundlers already emit hashed filenames into `/assets/`, so the year-long cache is safe."],
    },
  ],
  companies: [
    "**Anycast CDNs and DNS.** Cloudflare, Fastly, Akamai, Amazon CloudFront and Azure Front Door run hundreds of points of presence; static assets and even cacheable API responses are served from the nearest one. Large sites commonly serve the vast majority of static bytes from the CDN.",
    "**DNS for traffic shifting.** Teams use weighted records to send 1%, then 10%, then 100% of traffic to a new region or stack, and failover records with health checks to move users away from a failing region.",
    "**Migration checklists** at most companies include 'lower TTLs 48 hours before' as a standard step, and incidents caused by forgetting it are a classic post-mortem item.",
  ],
  mistakes: [
    { mistake: "Changing an IP with a 1-day TTL", why: "Forgetting resolvers cache the old answer", wrong: "Part of your users hit the old server for up to a day", fix: "Lower the TTL at least one old-TTL period ahead; keep the old server up until its traffic drains" },
    { mistake: "Caching personalised pages at the CDN", why: "A broad caching rule", wrong: "User A's dashboard is served to user B: a privacy incident", fix: "Cache-Control: private, no-store on anything user-specific; test with two accounts" },
    { mistake: "Long TTL on files without hashed names", why: "Wanting a high hit ratio", wrong: "After a deploy, users get the old app.js with the new HTML and the page breaks", fix: "Hash filenames and make them immutable; keep HTML no-cache" },
    { mistake: "Purging the whole CDN on every deploy", why: "No cache-busting strategy", wrong: "Hit ratio drops to zero and the origin is hammered at the worst moment", fix: "Content-hashed URLs, so deploys need no purge" },
    { mistake: "Treating DNS failover as instant", why: "The health check flips in seconds", wrong: "Clients keep the cached answer for the TTL and keep failing", fix: "Short TTLs on failover records, plus client retries; prefer load-balancer failover inside a region" },
    { mistake: "Vary: * or Vary on cookies", why: "Framework defaults", wrong: "Every user gets a separate cache entry; hit ratio near zero", fix: "Vary only on what changes the response (e.g. Accept-Encoding)" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Serve all static assets from a CDN with hashed filenames and year-long immutable caching." },
    { tag: "Reliability", text: "Lower DNS TTLs before planned changes and use health-checked failover records for regional failover." },
    { tag: "Security", text: "Mark every personalised response private/no-store; use a CDN with DDoS protection in front of the origin." },
    { tag: "Cost", text: "Track hit ratio and origin egress; every point of hit ratio near the top saves a lot of origin traffic." },
  ],
  interview: [
    { q: "Walk through what happens when a browser resolves a domain name.", a: "The browser checks its cache, then the OS cache, then asks a recursive resolver. On a resolver miss, it queries a root server for the TLD's name servers, the TLD server for the domain's authoritative servers, and the authoritative server for the record. Each step is cached for its TTL, so most lookups are answered by a nearby cache." },
    { q: "Push CDN or pull CDN?", a: "Pull: the CDN fetches from the origin on the first request and caches by TTL; easy, ideal for high-traffic sites, but the first request per edge is slow and changes wait for expiry or purge. Push: you upload content on each change; good for low-traffic or rarely changing content and full control over what is cached, but you manage uploads. Most web apps use pull with hashed filenames." },
    { q: "How do you deploy a new frontend without users getting stale files from the CDN?", a: "Bundle with content hashes in filenames and serve them with Cache-Control: public, max-age=31536000, immutable; serve the HTML with no-cache so it is revalidated on each load. A deploy changes the HTML, which references new URLs, so no purge is needed and old pages keep working with their old files." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You must move devatlas.dev to a new IP next Saturday. The current TTL is 86,400 seconds. What should you do first?",
      options: ["Change the IP on Saturday and wait", "Lower the TTL to e.g. 60 s at least a day before Saturday", "Set the TTL to 0 on Saturday", "Purge the CDN"],
      answer: 1,
      explanation: "Resolvers must first pick up the low TTL; that takes up to one old TTL period.",
    },
    {
      kind: "output",
      prompt: "A CDN receives 10,000 requests per second with a 95% hit ratio. How many reach the origin?",
      options: ["50", "500", "950", "9,500"],
      answer: 1,
      explanation: "5% of 10,000 = 500.",
    },
    {
      kind: "bug",
      prompt: "After enabling a CDN, some users see another user's name in the header of the dashboard. What went wrong?",
      options: ["DNS is misconfigured", "A personalised response was cached by the shared CDN because it lacked Cache-Control: private/no-store", "The TTL is too short", "The CDN uses pull mode"],
      answer: 1,
      explanation: "Shared caches must never store user-specific responses.",
    },
  ],
  cheatSheet: [
    "Resolution: browser → OS → resolver → root → TLD → authoritative; cached per TTL.",
    "Lower TTL ≥ one old TTL before a change; keep the old server until traffic drains.",
    "DNS routing: weighted, latency-based, geolocation, failover (never instant).",
    "Pull CDN: fetch on miss, cache by TTL. Push CDN: you upload on change.",
    "Hashed assets: public, max-age=31536000, immutable. HTML: no-cache.",
    "s-maxage for CDNs; stale-while-revalidate hides refreshes.",
    "Personal data: private, no-store. Keep Vary minimal.",
  ],
  homework: {
    basic: {
      title: "Write a DNS migration runbook",
      brief: [
        "DevAtlas's API moves from 203.0.113.10 to a new load balancer at 198.51.100.20 on Saturday 10:00 UTC. The current A record TTL is 86,400 s. Write a step-by-step runbook with times, commands to verify each step, and a rollback plan.",
      ],
      criteria: ["TTL lowered early enough", "Verification commands for each step", "Old server kept until traffic drains", "Rollback described"],
      hints: ["Use dig against several public resolvers to verify."],
      solution: {
        text: ["The runbook works backwards from the switch time: the TTL must be lowered at least one old TTL (24 h) before the switch; the old server must stay up long after it."],
        code: {
          lang: "markdown",
          file: "docs/runbook-dns-migration.md",
          code: `# Runbook: move api.devatlas.dev to the new load balancer

| When (UTC) | Step | Verify |
|---|---|---|
| Thu 10:00 | Lower TTL of api.devatlas.dev A record from 86400 to 60 | \`dig @1.1.1.1 api.devatlas.dev A +noall +answer\` shows TTL <= 60 within 24 h |
| Fri 10:00 | New stack smoke-tested via its own hostname (lb-new.devatlas.dev) | k6 smoke run passes; TLS certificate valid for api.devatlas.dev |
| Sat 10:00 | Change A record to 198.51.100.20 | \`dig @1.1.1.1\`, \`@8.8.8.8\`, \`@9.9.9.9\` all return the new IP within ~2 min |
| Sat 10:00–14:00 | Watch both stacks | New LB request rate rises; old server access log falls toward zero; error rate < 0.1% |
| Sat 14:00 | Old server still answering (do not stop it yet) | Count requests per minute on the old server |
| Mon 10:00 | Stop old server once its traffic is ~0 for 24 h | No requests in log |
| Mon 10:00 | Raise TTL back to 3600 | dig shows new TTL |

## Rollback
Point the A record back to 203.0.113.10 (old server is still running until Monday).
With TTL 60, most users return within minutes.

## Notes
- Mobile apps or partners that pinned the IP address will break; search configs and contact partners beforehand.
- If the API is behind a CDN, change the CDN's origin instead; users' DNS does not change at all.`,
        },
      },
    },
    intermediate: {
      title: "Measure hit ratio and origin offload from a log",
      brief: [
        "Given CDN log lines of the form 'path status cache_status bytes' (cache_status is HIT, MISS or EXPIRED), compute the overall hit ratio, the hit ratio by bytes, the top paths by misses, and the bytes the origin had to serve. Then suggest one fix based on the result.",
      ],
      criteria: ["Request and byte hit ratios", "Top missed paths", "A concrete fix"],
      hints: ["Hit ratio by bytes often tells a different story than by requests."],
      solution: {
        text: ["By requests the hit ratio looks fine, but by bytes it is poor, because large lesson videos miss. The top missed path has a cache-busting query string (?t=...) added by the player, so every request is a new cache key. Fix: configure the CDN to ignore that query parameter (or remove it in the player)."],
        code: {
          lang: "python",
          file: "cdn_log.py",
          code: `from collections import Counter

LOG = """\\
/assets/app.3f9c2a.js 200 HIT 180000
/assets/app.3f9c2a.js 200 HIT 180000
/assets/app.3f9c2a.js 200 HIT 180000
/assets/logo.svg 200 HIT 4000
/assets/logo.svg 200 HIT 4000
/v1/lessons 200 HIT 22000
/v1/lessons 200 EXPIRED 22000
/v1/lessons 200 HIT 22000
/videos/6-3-6.mp4?t=1729250001 206 MISS 5000000
/videos/6-3-6.mp4?t=1729250007 206 MISS 5000000
/videos/6-3-6.mp4?t=1729250013 206 MISS 5000000
/assets/app.3f9c2a.js 200 HIT 180000
/index.html 200 MISS 3000
/index.html 200 MISS 3000"""

rows = [line.split() for line in LOG.splitlines()]
hits = [r for r in rows if r[2] == "HIT"]
total_bytes = sum(int(r[3]) for r in rows)
hit_bytes = sum(int(r[3]) for r in hits)
misses = Counter(r[0].split("?")[0] for r in rows if r[2] != "HIT")

print(f"requests: {len(rows)}, hit ratio {len(hits) / len(rows):.0%}")
print(f"bytes: {total_bytes / 1e6:.1f} MB, byte hit ratio {hit_bytes / total_bytes:.0%}")
print(f"origin served {(total_bytes - hit_bytes) / 1e6:.1f} MB")
print("top missed paths:", misses.most_common(3))`,
        },
        output: "requests: 14, hit ratio 57%\nbytes: 15.8 MB, byte hit ratio 5%\norigin served 15.0 MB\ntop missed paths: [('/videos/6-3-6.mp4', 3), ('/index.html', 2), ('/v1/lessons', 1)]",
        pitfalls: ["Fixing index.html misses: those are intentional (no-cache HTML), and tiny."],
      },
    },
    challenge: {
      title: "Build a tiny pull-CDN edge with stale-while-revalidate",
      brief: [
        "Implement an EdgeCache class with a fake clock: get(path) returns from cache while fresh (max_age), returns the stale copy and triggers a background refresh while within stale_while_revalidate, and fetches synchronously from the origin otherwise. Count origin fetches and show which requests were fast (hit or stale) and which were slow (miss).",
      ],
      criteria: ["Three behaviours: fresh hit, stale + refresh, miss", "Origin fetch counter", "Printed timeline"],
      hints: ["Simulate the background refresh by updating the cache entry after the stale response is returned."],
      solution: {
        text: ["With stale-while-revalidate, only the very first request pays the origin latency. Later requests during the revalidation window get the slightly old copy instantly while the edge refreshes it. Freshness is bounded by max_age + stale_while_revalidate."],
        code: {
          lang: "python",
          file: "edge_cache.py",
          code: `class Origin:
    def __init__(self):
        self.version, self.fetches = 1, 0
    def fetch(self, path, now):
        self.fetches += 1
        return f"{path}@v{self.version}"

class EdgeCache:
    def __init__(self, origin, max_age, swr):
        self.origin, self.max_age, self.swr = origin, max_age, swr
        self.cache = {}                                   # path -> (body, stored_at)

    def get(self, path, now):
        entry = self.cache.get(path)
        if entry:
            body, stored = entry
            age = now - stored
            if age <= self.max_age:
                return body, "HIT"
            if age <= self.max_age + self.swr:
                self.cache[path] = (self.origin.fetch(path, now), now)   # background refresh
                return body, "STALE (refreshing)"
        body = self.origin.fetch(path, now)
        self.cache[path] = (body, now)
        return body, "MISS (slow)"

origin = Origin()
edge = EdgeCache(origin, max_age=60, swr=300)
for t in (0, 30, 59, 61, 62, 200, 700):
    if t == 61:
        origin.version = 2                                # content changed at the origin
    body, status = edge.get("/v1/lessons", t)
    print(f"t={t:3d}s  {status:20} {body}")
print("origin fetches:", origin.fetches)`,
        },
        output: "t=  0s  MISS (slow)          /v1/lessons@v1\nt= 30s  HIT                  /v1/lessons@v1\nt= 59s  HIT                  /v1/lessons@v1\nt= 61s  STALE (refreshing)   /v1/lessons@v1\nt= 62s  HIT                  /v1/lessons@v2\nt=200s  STALE (refreshing)   /v1/lessons@v2\nt=700s  MISS (slow)          /v1/lessons@v2\norigin fetches: 4",
        pitfalls: ["Unbounded staleness: always cap stale-while-revalidate; add stale-if-error separately for outages."],
      },
    },
    capstone: {
      title: "DevAtlas: put the frontend and public API behind a CDN",
      brief: [
        "Serve your capstone frontend through a CDN (CloudFront, Azure Front Door or Cloudflare). Hashed assets cached for a year, HTML no-cache, the public lesson list cached for 5 minutes at the edge with stale-while-revalidate, and everything under /v1/me private. Prove it with curl showing the CDN's cache status header, and record before/after load time from a distant region.",
      ],
      criteria: ["Correct headers per route", "Cache status visible in curl output", "No personalised response cached (tested with two users)", "Before/after timing"],
      hints: ["CloudFront returns x-cache: Hit from cloudfront; Cloudflare returns cf-cache-status: HIT.", "WebPageTest or a VM in another region gives realistic timings."],
      solution: {
        text: ["The verification matters as much as the config: show the cache header, show that personal routes are never cached, and show the latency gain."],
        code: {
          lang: "bash",
          file: "scripts/verify-cdn.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
SITE="\${1:-https://devatlas.dev}"

echo "== hashed asset: expect immutable and a cache HIT on the second request"
ASSET=$(curl -s "$SITE/" | grep -o '/assets/[^"]*\\.js' | head -n1)
curl -s -o /dev/null -D - "$SITE$ASSET" | grep -iE 'cache-control|x-cache|cf-cache-status|age'
curl -s -o /dev/null -D - "$SITE$ASSET" | grep -iE 'x-cache|cf-cache-status'

echo "== HTML: expect no-cache"
curl -s -o /dev/null -D - "$SITE/" | grep -i 'cache-control'

echo "== public API: expect s-maxage and a HIT after warm-up"
curl -s -o /dev/null -D - "$SITE/v1/lessons" > /dev/null
curl -s -o /dev/null -D - "$SITE/v1/lessons" | grep -iE 'cache-control|x-cache|cf-cache-status'

echo "== personal API: expect private, no-store and never a HIT"
for token in "$TOKEN_A" "$TOKEN_B"; do
  curl -s -D - -o /dev/null -H "Authorization: Bearer $token" "$SITE/v1/me/progress" \\
    | grep -iE 'cache-control|x-cache|cf-cache-status'
done

echo "== timing from this machine (run from a far region too)"
curl -s -o /dev/null -w 'dns %{time_namelookup}s  connect %{time_connect}s  ttfb %{time_starttransfer}s  total %{time_total}s\\n' "$SITE$ASSET"`,
        },
        pitfalls: ["Testing from the same region as the origin hides the benefit; test from far away.", "Forgetting that the CDN must forward the Authorization header but never cache by it."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: DNS and CDN (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#domain-name-system" },
    { label: "MDN: HTTP caching", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
    { label: "Cloudflare Learning Center: What is DNS?", url: "https://www.cloudflare.com/learning/dns/what-is-dns/" },
    { label: "Amazon Route 53 routing policies", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html" },
  ],
  nextPreview: "Next: load balancers and reverse proxies. Layer 4 vs layer 7, health checks, why sessions break when you add a server, and how services find each other.",
};
