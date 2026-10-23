import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.3",
  title: "Design a web crawler",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["6.3.2 The design method: requirements, estimates and numbers to know", "6.3.8 Scaling relational databases: replication, federation and sharding", "6.3.10 Caching strategies: cache-aside, write-through, write-behind, refresh-ahead", "6.3.11 Asynchronism: message queues, task queues and back pressure", "5.3.1 Redis caching patterns and pgvector"],
  summary: "Design the crawler behind a search engine end to end: a ranked URL frontier, per-host politeness and robots.txt, exact and near-duplicate detection at a billion links, a freshness schedule, and the reverse-index path that turns crawled pages into 40,000 searches per second.",
  terms: [
    { term: "URL frontier", def: "The set of discovered but not-yet-crawled links, kept ranked so the crawler always takes the most valuable link next (Redis sorted sets in this design)." },
    { term: "Politeness", def: "A minimum delay between two requests to the same host so the crawler never overloads a site; polite crawlers are rarely banned." },
    { term: "Canonical URL", def: "The single, normalised URL chosen for a page when several spellings exist (trailing slashes, tracking params, http vs https), so duplicates collapse to one entry." },
    { term: "Fingerprint (page signature)", def: "A short hash of normalised page content, compared to detect exact and near-duplicate pages cheaply." },
    { term: "robots.txt", def: "A file at a site's root stating which paths a crawler may fetch, standardised as RFC 9309; respected by polite crawlers." },
    { term: "Duplicate detection", def: "Removing URLs or pages seen before - exact by fingerprint, near by Jaccard/cosine similarity - so the crawler neither loops forever nor stores the same content twice." },
    { term: "Reverse index", def: "A word -> list of pages mapping built from crawled content; the structure that answers search queries." },
  ],
  problem: [
    "DevAtlas's Rust news ingester turns RSS feeds into articles - but only the feeds someone remembered to add. Lessons cross-link to external blogs and docs, those pages link onwards, and the best writing about queues and caching is exactly the news the ingester should surface. A crawler that starts from the lesson library's outbound links and follows them one or two hops outward would turn 'feeds we configured' into 'pages learners actually read'.",
    "A naive crawler fails spectacularly: fetch every link with no delay and the hosts ban you; follow every link and cycles loop forever; re-fetch everything nightly and the bill explodes. This lesson designs the crawler that avoids all three - a ranked URL frontier, per-host politeness, exact and near-duplicate detection, a freshness schedule - plus the search path that turns crawled pages into results.",
  ],
  concept: {
    analogy: [
      "A crawler is the newsroom's clipping intern. The stack of promising article stubs is the frontier, ordered by how interesting each looks. A good intern never phones one newspaper twice a minute (politeness), checks 'have I already cut this exact article?' against the archive before filing it (dedupe), and re-checks the front page daily while the weather column gets a weekly glance (freshness).",
      "The frontier is also 'inbox zero' for the web: you only ever finish because every processed page is filed as crawled. Forget the filing and the inbox hands you the same email again - forever.",
    ],
    precise: [
      "**The crawl loop.** Keep two collections: links_to_crawl, ranked by site popularity in Redis sorted sets (seeded with hubs like Yahoo/DMOZ), and crawled_links, a key-value NoSQL table of processed links and signatures. Repeat: take the top link, check crawled_links for a similar signature - if found, reduce the link's priority and continue (this breaks cycles); otherwise fetch it, add child links to the frontier, enqueue jobs for the reverse index and the document (title/snippet) services, generate the signature, and move the link into crawled_links.",
      "**Politeness: a rate limit per host.** Never send a second request to the same host faster than the politeness delay; check robots.txt first; back off on 429s and 5xx. DNS lookups become the hidden bottleneck, so the crawler keeps its own DNS cache refreshed periodically, pools connections, and needs serious bandwidth.",
      "**Dedupe twice, at different scales.** Exact URL duplicates: sort | uniq for small lists; a MapReduce job (mapper yields (line, 1), reducer keeps frequency == 1) at 1 billion links. Near-duplicate CONTENT: compare page signatures with Jaccard index or cosine similarity. Canonicalise URLs (scheme, host, trailing slash, tracking params) so one page has one URL before the frontier sees it.",
      "**Freshness: crawl on a schedule, not on a feeling.** Every crawl result carries a timestamp. Default re-crawl after about a week; popular sites shorter; data-mine the mean time between updates per page to pick the interval. This turns 're-crawl everything' into a budgeted background workload.",
    ],
  },
  underTheHood: {
    text: [
      "**The loop.** The design keeps exactly two collections: links_to_crawl, ranked by overall site popularity in Redis sorted sets (seeded with hub sites like Yahoo or DMOZ), and crawled_links, a key-value NoSQL table of processed links plus their page signatures. The Crawler Service processes each link in a loop: take the top-ranked link; check crawled_links for an entry with a similar page signature - if one exists, reduce the link's priority and continue (this is what prevents cycles); otherwise crawl it, add its child links to the frontier, enqueue a job on the Reverse Index Service queue and a job on the Document Service queue (static title and snippet), generate the page signature, remove the link from links_to_crawl and insert it into crawled_links.",
      "**Politeness is a rate limit per host.** Hosts throttle or ban clients that hit them too fast, so a crawler spaces out requests per host, respects robots.txt (RFC 9309: follow the parseable rules of the matching user-agent group, cache the file at most 24 hours, treat an unreachable robots.txt as a full disallow), and slows down on 429 and 5xx responses. At scale the limiter is not CPU but resolution and sockets: keep the crawler's own DNS cache refreshed periodically, pool connections, and budget bandwidth - crawling is bandwidth-intensive by definition.",
      "**Dedupe twice, at different scales.** Remove duplicate URLs: for smaller lists, sort | uniq; with 1 billion links to crawl, a MapReduce job - the mapper yields (line, 1), the reducer keeps entries whose frequency is 1. Duplicate CONTENT is harder: generate a signature from the page contents and compare signatures for similarity with the Jaccard index or cosine similarity. Canonicalisation (one URL per page: scheme, host, trailing slash, tracking parameters) removes a whole class of duplicates before they reach the frontier.",
      "**Freshness by timestamp.** Pages change, so crawl results carry the timestamp of the last crawl. After a default period - say one week - every page is refreshed; frequently updated or popular sites get shorter intervals. Better still, data-mine the mean time before a page updates and use that statistic per page, so the crawl budget is spent where content actually changes.",
      "**The search path.** Client -> Web Server (a reverse proxy) -> Query API: parse the query, strip markup, break text into terms, fix typos, normalise case, convert to boolean operations. The Reverse Index Service finds and ranks matching documents; the Document Service returns the static titles and snippets. REST API: GET /api/v1/search?query=hello+world returning {title, snippet, link}[]. Traffic is unevenly distributed, so a memory cache (Redis or Memcached) absorbs hot queries: reading 1 MB sequentially from memory takes about 250 microseconds, SSD 4x longer, disk 80x. The Reverse Index and Document Services shard and federate; load balancer, web servers, master-slave replicas and a CDN are the standard blocks.",
    ],
    diagram: {
      title: "One crawl, then a search path",
      nodes: [
        { label: "URL frontier", sub: "Redis sorted sets, ranked by popularity" },
        { label: "Crawler service", sub: "politeness + robots.txt per host" },
        { label: "Signature check", sub: "Jaccard/cosine vs crawled_links" },
        { label: "Index + document queues", sub: "reverse index, title/snippet jobs" },
        { label: "Search path", sub: "Query API -> services -> results" },
      ],
      edges: ["top link", "fetch + parse", "dedupe, then enqueue", "query + rank"],
    },
  },
  handsOn: [
    {
      title: "Numbers that drive the design",
      text: ["Every crawling decision follows from these back-of-envelope numbers. Say each multiplication out loud in an interview."],
      code: {
        lang: "text",
        code: `Scope: crawl up to 1 billion links; refresh about once a week (popular sites
       more often) -> 4 billion pages crawled per month
Average page: 500 KB (counting changed pages as new ones)
Pages stored per month:   4e9 pages x 500 KB = 2e12 KB = 2 PB / month
Pages stored in 3 years:  2 PB x 36 months = 72 PB
Crawl write rate:         4e9 pages / 2.5M seconds per month = 1,600 writes/s
Search rate:              100e9 searches/month / 2.5M seconds = 40,000 searches/s
Handy conversions: 2.5M seconds per month; 400 req/s = 1 billion requests/month.
Traffic is skewed (some queries very popular); users are anonymous; no loops allowed.`,
      },
    },
    {
      title: "High-level design as a flowchart",
      code: {
        lang: "mermaid",
        code: `flowchart LR
  seed[Seed URLs<br/>hubs like Yahoo / DMOZ] --> frontier[(links_to_crawl<br/>Redis sorted sets<br/>ranked by popularity)]
  frontier --> crawler[Crawler service<br/>robots.txt + politeness per host]
  crawler --> seen{Similar signature<br/>in crawled_links?}
  seen -->|yes: reduce priority| frontier
  seen -->|no| crawled[(crawled_links<br/>link + signature<br/>NoSQL key-value)]
  crawler --> q1[[reverse index queue]] --> ri[Reverse Index Service<br/>sharded]
  crawler --> q2[[document queue]] --> ds[Document Service<br/>title + snippet<br/>sharded]
  client([Client]) --> api[Web server + Query API<br/>reverse proxy, parse, tokenise, fix typos]
  api --> ri
  api --> ds
  api --> cache[(Memory cache<br/>hot queries)]`,
      },
    },
    {
      title: "URL frontier with per-host politeness",
      text: ["The frontier is a priority queue; politeness is a per-host deadline. In production this pair is a Redis sorted set (ZPOPMIN) plus a per-host lock shared by hundreds of fetchers; here one heap and one dict play the same role."],
      code: { lang: "python", file: "frontier.py", code: `# A URL frontier: priority queue + per-host politeness (a Redis sorted set
# with ZPOPMIN plus per-host locks in production; one heap and one dict here).
import heapq
from collections import defaultdict

POLITENESS = 0.5
FETCH_COST = 0.05

FRONTIER = [
    (1.0, "https://a.example/important"),
    (2.0, "https://a.example/second-page"),
    (1.5, "https://b.example/medium"),
    (3.0, "https://c.example/last"),
]
def crawl(frontier):
    heap = list(frontier)
    heapq.heapify(heap)
    not_before = defaultdict(float)               # host -> politeness deadline
    last = {}
    log = []
    t = 0.0
    while heap:
        priority, url = heapq.heappop(heap)        # highest priority next
        host = url.split("/")[2]
        t = max(t, not_before[host])               # wait out the host's window
        if host in last:
            assert t - last[host] >= POLITENESS - 1e-9, f"{host} fetched too soon"
        log.append((t, priority, host, url))
        last[host] = t
        not_before[host] = t + POLITENESS
        t += FETCH_COST
    return log


log = crawl(FRONTIER)
for t, priority, host, url in log:
    print(f"t={t:4.2f}  prio={priority:.1f}  {host:12} {url}")
by_host = defaultdict(list)
for t, _, host, _ in log:
    by_host[host].append(t)
for host, times in by_host.items():
    for t1, t2 in zip(times, times[1:]):
        print(f"politeness check: {host} gap {t2 - t1:.2f} s >= {POLITENESS} s  ok")` },
      output: "t=0.00  prio=1.0  a.example    https://a.example/important\nt=0.05  prio=1.5  b.example    https://b.example/medium\nt=0.50  prio=2.0  a.example    https://a.example/second-page\nt=0.55  prio=3.0  c.example    https://c.example/last\npoliteness check: a.example gap 0.50 s >= 0.5 s  ok",
      notes: [
        "The heap hands out links in priority order and the per-host deadline inserts the waits: a.example's second page waits until t=0.50 even though the queue is free at t=0.05. b.example sneaks in at t=0.05 because a different host is unaffected.",
        "In production the 'not before' times live in the frontier store, not in worker memory - otherwise a restart hammers every host it just visited.",
      ],
    },
    {
      title: "Exact duplicates, fingerprints and near-duplicates",
      text: ["Dedupe has two layers: a content hash kills exact duplicates with one dictionary lookup; shingles plus Jaccard similarity catch pages that are almost the same (a changed word, an added paragraph) without storing whole pages."],
      code: { lang: "python", file: "dedupe.py", code: `# Exact duplicates via fingerprints; near-duplicates via Jaccard over shingles.
import hashlib
import re

THRESHOLD = 0.6


def normalise(text: str) -> str:
    lowered = " ".join(text.lower().split())       # collapse whitespace, lowercase
    return re.sub(r"[^a-z0-9 ]", "", lowered)      # strip punctuation


def fingerprint(text: str) -> str:
    return hashlib.sha256(normalise(text).encode()).hexdigest()[:16]


def shingles(text: str, k: int = 5) -> set[str]:
    words = normalise(text).split()
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b)
pages = {
    "p1": "The quick brown fox jumps over the lazy dog",
    "p2": "The quick brown fox jumps over the lazy dog",
    "p3": "THE QUICK   brown fox jumps over the lazy dog!",     # same after normalising
    "p4": "The quick brown fox jumps over the lazy cat",        # one word changed
    "p5": "A crawler must be polite to every host it visits",
}

print("fingerprints and exact-duplicate decisions")
seen: dict[str, str] = {}
for name, text in pages.items():
    fp = fingerprint(text)
    if fp in seen:
        print(f"  {name}: {fp}  duplicate of {seen[fp]} -> skip")
    else:
        seen[fp] = name
        print(f"  {name}: {fp}  keep (first seen)")

print(f"\\nnear-duplicate check against p1 (threshold {THRESHOLD})")
s1 = shingles(pages["p1"])
for name in ("p2", "p3", "p4", "p5"):
    sim = jaccard(s1, shingles(pages[name]))
    verdict = "near-duplicate" if sim >= THRESHOLD else "distinct"
    print(f"  p1 vs {name}: Jaccard {sim:.2f}  {verdict}")` },
      output: "fingerprints and exact-duplicate decisions\n  p1: 05c6e08f1d9fdafa  keep (first seen)\n  p2: 05c6e08f1d9fdafa  duplicate of p1 -> skip\n  p3: 05c6e08f1d9fdafa  duplicate of p1 -> skip\n  p4: ad485ee86312f920  keep (first seen)\n  p5: 98581d8c5c258c24  keep (first seen)\n\nnear-duplicate check against p1 (threshold 0.6)\n  p1 vs p2: Jaccard 1.00  near-duplicate\n  p1 vs p3: Jaccard 1.00  near-duplicate\n  p1 vs p4: Jaccard 0.67  near-duplicate\n  p1 vs p5: Jaccard 0.00  distinct",
      notes: [
        "p3 becomes an exact duplicate only because normalise() strips punctuation - the fingerprints match, so it never reaches a shingle comparison. One changed word (p4) stays above the threshold; a completely different page (p5) does not.",
        "At web scale this becomes MapReduce for exact URL dedupe and simhash-style signatures; the loop-breaking rule is the same: a similar signature reduces the link's priority instead of crawling it.",
      ],
    },
    {
      title: "robots.txt and the re-crawl schedule",
      text: ["Politeness has a contractual side (robots.txt) and an economic side (crawl only what changed). RFC 9309 says follow the parseable rules of the matching user-agent group and cache robots.txt at most 24 hours; freshness comes from last-crawl timestamps."],
      code: { lang: "python", file: "robots.py", code: `# robots.txt-style allow/deny plus a freshness-aware re-crawl schedule.
# RFC 9309: follow the parseable rules of the matching user-agent group and
# cache robots.txt for at most 24 hours.
from datetime import datetime, timedelta

ROBOTS = {
    "news.example": "user-agent: *\\ndisallow: /admin\\ndisallow: /search\\n",
    "docs.example": "user-agent: devatlas-bot\\ndisallow: /drafts\\n",
}
WEEK = timedelta(days=7)
POPULAR = timedelta(days=1)
NOW = datetime(2026, 10, 21, 9, 0, 0)

PAGES = [
    ("https://news.example/rust-1.90-released", True, NOW - timedelta(days=2)),
    ("https://docs.example/lessons/queues", True, NOW - timedelta(days=6)),
    ("https://docs.example/lessons/sharding", False, NOW - timedelta(days=9)),
    ("https://news.example/admin/dashboard", False, NOW - timedelta(days=10)),
]


def disallowed(host: str, path: str) -> bool:
    return any(line.startswith("disallow:") and path.startswith(line[10:])
               for line in ROBOTS[host].splitlines())


def days(n: int) -> str:
    return f"{n} day" + ("s" if n != 1 else "")


print(f"crawl decision at {NOW:%Y-%m-%d %H:%M}  (popular: 1 day, default: 7 days)\\n")
for url, popular, crawled in PAGES:
    host, path = url.split("/", 3)[2], "/" + url.split("/", 3)[3]
    if disallowed(host, path):
        print(f"skip      {url:42} robots.txt disallows {path}")
        continue
    interval = POPULAR if popular else WEEK
    due = crawled + interval
    if NOW >= due:
        print(f"re-crawl  {url:42} overdue by {days((NOW - due).days)} (interval {days(interval.days)})")
    else:
        print(f"wait      {url:42} due in {days((due - NOW).days)} (interval {days(interval.days)})")` },
      output: "crawl decision at 2026-10-21 09:00  (popular: 1 day, default: 7 days)\n\nre-crawl  https://news.example/rust-1.90-released    overdue by 1 day (interval 1 day)\nre-crawl  https://docs.example/lessons/queues        overdue by 5 days (interval 1 day)\nre-crawl  https://docs.example/lessons/sharding      overdue by 2 days (interval 7 days)\nskip      https://news.example/admin/dashboard       robots.txt disallows /admin/dashboard",
      notes: [
        "The popular page crawled 6 days ago is more overdue than the regular page crawled 9 days ago: intervals are per page, not per site. A real crawler adds data-mined mean-time-between-updates per page, and treats an unreachable robots.txt as a full disallow (RFC 9309), not as permission.",
      ],
    },
  ],
  companies: [
    "**Common Crawl (2007 to today):** the 501(c)(3) non-profit runs one of the few publicly auditable crawls of the open web: a free corpus of over 300 billion pages spanning 15 years, with 3-5 billion new pages added each month. Source: [commoncrawl.org](https://commoncrawl.org/)",
    "**Google (Search, present):** its crawlers 'automatically visit publicly accessible webpages and follow links on those pages', learn how often content changes and 'revisit as needed', and Google states it 'never accepts payment to crawl a site more frequently'; site owners steer crawls with sitemaps and robots.txt. Source: [How Google Search organises information](https://www.google.com/intl/en_in/search/howsearchworks/how-search-works/organizing-information)",
    "**Cloudflare (learning centre, present):** documents the playbook this lesson follows - start from 'a seed, or a list of known URLs', prioritise pages by inbound links and traffic, revisit pages periodically, check robots.txt before crawling - and warns that too much crawling 'could overtax the server, drive up bandwidth costs'. Source: [What is a web crawler?](https://www.cloudflare.com/learning/bots/what-is-a-web-crawler/)",
  ],
  mistakes: [
    { mistake: "Crawling with no politeness delay", why: "'Throughput first'", wrong: "50 requests per second to one host earns 429s, then a ban, and the whole domain becomes un-crawlable", fix: "Minimum delay per host plus jitter, robots.txt first, back off on 429 and 5xx" },
    { mistake: "Ignoring robots.txt", why: "'It is a convention, not a law'", wrong: "Crawling /admin, search result pages and login flows wastes bandwidth and gets the crawler banned - or into legal trouble", fix: "Parse robots.txt per RFC 9309 (matching user-agent group, cache at most 24 h, unreachable = full disallow)" },
    { mistake: "No duplicate detection", why: "'Just crawl the links'", wrong: "Cycles make the crawler loop forever; the same content gets stored ten times; the index bloats", fix: "crawled_links with signatures: a similar signature reduces the link's priority instead of crawling it; canonicalise URLs" },
    { mistake: "Re-crawling everything at one interval", why: "'A nightly cron is simple'", wrong: "4 billion fetches a month burn on static pages while fast-changing popular pages sit stale", fix: "Timestamp every crawl result; default ~1 week, popular sites shorter, data-mined mean time between updates" },
    { mistake: "Storing everything in one database", why: "'Start simple'", wrong: "72 PB in 3 years, 1,600 writes/s plus 40,000 searches/s against one store dies; every query fans out across the whole corpus", fix: "Key-value NoSQL for links and signatures, sharded/federated reverse index and document services, memory cache for hot queries" },
    { mistake: "Treating near-duplicates as distinct pages", why: "'Only exact matches are safe to drop'", wrong: "Ten near-identical pages answer one query, waste storage, and produce useless snippets", fix: "Compare page signatures with Jaccard index or cosine similarity above a threshold, plus canonical URL rules" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "A per-host minimum delay, exponential backoff on 429s and 5xx, and per-host error counters with alerts: a rising ban rate is a crawling bug, not a traffic problem." },
    { tag: "Security", text: "Treat every fetched page as untrusted input: sanitise HTML before building snippets, never execute scripts, and never let crawl jobs write raw HTML into user-facing pages (stored XSS via search snippets)." },
    { tag: "Performance", text: "Dedupe before enqueueing: a signature lookup is microseconds, an index job on a duplicate page is wasted work on the busiest services." },
    { tag: "Cost", text: "Crawl on a freshness budget: timestamps plus per-page intervals mean you fetch only what changed, which is where most of the 2 PB/month would have gone." },
  ],
  interview: [
    { q: "Design a web crawler.", a: "Clarify scope: crawl a list of URLs, build a reverse index of words to pages and static titles/snippets; users search and see results; out of scope: search analytics, personalised results, page rank; anonymous users only; the crawler must not loop. Estimate: 1 billion links, refreshed about weekly -> 4 billion pages/month x 500 KB = 2 PB/month, 72 PB in 3 years; 1,600 writes/s; 100 billion searches/month = 40,000 searches/s. Design: links_to_crawl ranked in Redis sorted sets (seeded with hubs like Yahoo/DMOZ); the crawler service takes the top link, checks crawled_links (key-value NoSQL) for a similar signature - if similar, reduce priority and continue, which breaks cycles - else fetch, enqueue reverse-index and document jobs, store the signature. Search path: client -> web server reverse proxy -> Query API (parse, strip markup, tokenise, fix typos, normalise, booleans) -> Reverse Index Service ranks, Document Service returns titles/snippets; GET /api/v1/search?query=hello+world. Scale: shard/federate the index and document services, memory cache for hot queries (memory 1 MB read ~250 us, SSD 4x, disk 80x), own DNS cache, connection pooling, bandwidth." },
    { q: "How do you stop the crawler from looping forever, and how do you dedupe a billion links?", a: "Two layers. Exact URL duplicates: sort | uniq for small lists; with 1 billion links a MapReduce job - mapper yields (line, 1), reducer keeps entries whose frequency is 1. Cycles: before crawling a link, check crawled_links for a similar page signature; if one exists, reduce the link's priority instead of crawling it, so the loop degrades instead of spinning. Near-duplicate content: generate signatures from page contents and compare them with the Jaccard index or cosine similarity; canonicalise URLs (scheme, host, trailing slash, tracking params) so one page has one URL in the first place." },
    { q: "Pages change. How do you decide when to re-crawl?", a: "Give every crawl result a timestamp. Default refresh after about a week; frequently updated or popular sites get shorter intervals. Better: data-mine the mean time before a page updates and use that statistic per page, so crawl budget is spent where content actually changes. Honour robots.txt guidance on crawl frequency, and schedule re-crawls as background jobs so the frontier's priority queue still serves fresh fetches first." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A crawler follows links but keeps crawling the same pages forever and never finishes. Which missing piece causes the loop?",
      options: ["A load balancer", "A signature check against crawled_links", "A bigger DNS cache", "Connection pooling"],
      answer: 1,
      explanation: "Cycles happen because the crawler has no memory of what it saw: before crawling a link, compare its signature with crawled_links and reduce its priority or skip it, which breaks the loop.",
    },
    {
      kind: "output",
      prompt: "Back-of-envelope: 4 billion pages crawled per month at an average of 500 KB per page. How much stored page content is that per month?",
      options: ["2 TB", "200 TB", "2 PB", "20 PB"],
      answer: 2,
      explanation: "4e9 x 500 KB = 2e12 KB = 2 PB per month, or 72 PB in three years. At 2.5M seconds per month that is about 1,600 writes per second.",
    },
    {
      kind: "bug",
      prompt: "A crawler hits one news site at 50 requests per second with no delay between requests and gets HTTP 429s, then a permanent block. What is the root cause?",
      options: ["Missing canonical URL handling", "No robots.txt parser", "No per-host politeness delay", "Page fingerprints are too short"],
      answer: 2,
      explanation: "The host rate-limited the crawler: always leave a minimum delay between requests to the same host, read robots.txt first, and back off on 429s.",
    },
  ],
  cheatSheet: [
    "Numbers: 1B links; 4e9 pages/mo; 500 KB/page; 2 PB/mo; 72 PB/3y; 1,600 writes/s; 40,000 searches/s.",
    "Loop: top link -> signature check -> crawl -> enqueue index/doc jobs -> store signature.",
    "Frontier: Redis sorted sets ranked by popularity; seed with hub sites (Yahoo, DMOZ).",
    "Politeness: minimum delay per host + robots.txt (RFC 9309) before any fetch; back off on 429/5xx.",
    "Dedupe: sort | uniq for small lists; MapReduce freq == 1 for 1B links; Jaccard/cosine on signatures for content.",
    "Freshness: crawl timestamp; default ~1 week, popular sooner; mine mean time between updates.",
    "Search path: Query API -> reverse index (rank) + document service (title/snippet); cache hot queries; shard to scale.",
  ],
  homework: {
    basic: {
      title: "Simulate the URL frontier",
      brief: [
        "Implement a priority-queue frontier plus a per-host politeness delay. Always take the highest-priority URL next, but never fetch the same host faster than the delay; print the crawl order and verify every per-host gap.",
      ],
      criteria: ["Hosts are never fetched faster than the politeness delay", "Higher priority URLs go first", "Deterministic, runnable output"],
      hints: ["The heap does the ranking for you: (priority, url) tuples sort by priority first.", "Keep a dict host -> earliest next fetch time and clamp the clock to it before each fetch."],
      solution: {
        text: [
          "The heap is the whole trick: (priority, url) tuples sort by priority first, so the pop order is always the best available link, and the per-host 'not before' dictionary is the politeness gate - fetch time is max(now, deadline), and the deadline moves by POLITENESS after every fetch. Verified with Python 3.11: devatlas.dev is fetched three times with a minimum gap of exactly 0.40 s (the configured delay), blog.rust-lang.org's gap is 0.43 s, and priority order holds end to end. In production the same shape is a Redis sorted set with ZPOPMIN plus a per-host lock with a TTL; the deadlines live in the store, not in worker memory, or a restart hammers every host it just visited.",
        ],
        code: { lang: "python", file: "frontier_hw.py", code: `# Homework (basic): priority-queue frontier + per-host politeness delay.
import heapq
from collections import defaultdict

POLITENESS = 0.4
FETCH_COST = 0.03

FRONTIER = [
    (1.0, "https://devatlas.dev/lessons/6.4.3"),
    (1.2, "https://blog.rust-lang.org/2026/10/20/rust-1.90/"),
    (2.0, "https://devatlas.dev/lessons/6.4.2"),
    (2.5, "https://news.example/docker/"),
    (3.0, "https://blog.rust-lang.org/2026/10/12/cargo-changes/"),
    (4.0, "https://devatlas.dev/lessons/6.4.1"),
]
def crawl(frontier):
    heap = list(frontier)
    heapq.heapify(heap)
    not_before = defaultdict(float)               # host -> politeness deadline
    last = {}
    log = []
    t = 0.0
    while heap:
        priority, url = heapq.heappop(heap)       # highest priority next
        host = url.split("/")[2]
        t = max(t, not_before[host])              # wait out the host's window
        if host in last:
            assert t - last[host] >= POLITENESS - 1e-9, f"{host} fetched too soon"
        log.append((t, priority, host, url))
        last[host] = t
        not_before[host] = t + POLITENESS
        t += FETCH_COST
    return log


log = crawl(FRONTIER)
for t, priority, host, url in log:
    print(f"t={t:4.2f}  prio={priority:.1f}  {host:22} {url}")
print()
for host in sorted({h for _, _, h, _ in log}):
    times = [t for t, _, h, _ in log if h == host]
    gaps = [b - a for a, b in zip(times, times[1:])]
    if gaps:
        print(f"{host:22} {len(times)} fetches, min gap {min(gaps):.2f} s (politeness {POLITENESS} s)")
priorities = [p for _, p, _, _ in log]
print("higher priority always fetched first:", all(a < b for a, b in zip(priorities, priorities[1:])))` },
        output: "t=0.00  prio=1.0  devatlas.dev           https://devatlas.dev/lessons/6.4.3\nt=0.03  prio=1.2  blog.rust-lang.org     https://blog.rust-lang.org/2026/10/20/rust-1.90/\nt=0.40  prio=2.0  devatlas.dev           https://devatlas.dev/lessons/6.4.2\nt=0.43  prio=2.5  news.example           https://news.example/docker/\nt=0.46  prio=3.0  blog.rust-lang.org     https://blog.rust-lang.org/2026/10/12/cargo-changes/\nt=0.80  prio=4.0  devatlas.dev           https://devatlas.dev/lessons/6.4.1\n\nblog.rust-lang.org     2 fetches, min gap 0.43 s (politeness 0.4 s)\ndevatlas.dev           3 fetches, min gap 0.40 s (politeness 0.4 s)\nhigher priority always fetched first: True",
        pitfalls: ["Keeping the politeness deadline only in worker memory: with several fetcher processes, or after a restart, the same host gets hit back-to-back."],
      },
    },
    intermediate: {
      title: "Duplicate detection with fingerprints",
      brief: [
        "Normalise pages (case, whitespace, punctuation), fingerprint exact duplicates with a content hash, and flag near-duplicates with Jaccard similarity over word shingles above a configurable threshold. Run with two thresholds so the knob is visible.",
      ],
      criteria: ["Exact duplicates detected", "Near-duplicates above the threshold flagged", "Threshold is configurable", "Runnable demo with real output"],
      hints: ["Normalise before hashing: lowercase, collapse whitespace, strip punctuation - or 'Dog!' and 'dog' look like different words.", "Shingles of 5 words are a cheap near-duplicate proxy; tune k and the threshold on your own corpus."],
      solution: {
        text: [
          "Normalisation happens once, before anything else, so an exact duplicate is a dictionary lookup on the SHA-256 fingerprint. Near-duplicates compare the 5-word shingle sets of a page against every kept page with Jaccard similarity - O(kept pages) per page here, which is why production switches to simhash signatures at scale. Verified with Python 3.11: the punctuation-heavy copy collapses to the same fingerprint as the original and is skipped, and the 'same article plus a sentence' page scores Jaccard 0.70 - flagged at threshold 0.6, kept at 0.9, which is the whole point of the knob: the threshold is a product decision, not a constant - too low and distinct pages merge, too high and the index fills with near-identical copies.",
        ],
        code: { lang: "python", file: "dedupe_hw.py", code: `# Homework (intermediate): fingerprints for exact duplicates, Jaccard over
# 5-word shingles for near-duplicates above a configurable threshold.
import hashlib
import re


def normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", " ".join(text.lower().split()))


def fingerprint(text: str) -> str:
    return hashlib.sha256(normalise(text).encode()).hexdigest()[:12]


def shingles(text: str, k: int = 5) -> set[str]:
    words = normalise(text).split()
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b)


def dedupe(pages: dict[str, str], threshold: float) -> list[str]:
    kept: dict[str, tuple[str, set[str]]] = {}
    out = []
    for name, text in pages.items():
        fp = fingerprint(text)
        exact = [n for n, (kfp, _) in kept.items() if kfp == fp]
        if exact:
            out.append(f"  {name}: exact duplicate of {exact[0]} -> skip")
            continue
        sh = shingles(text)
        near = [(n, jaccard(sh, ksh)) for n, (_, ksh) in kept.items()
                if jaccard(sh, ksh) >= threshold]
        if near:
            who, sim = near[0]
            out.append(f"  {name}: near-duplicate of {who} (Jaccard {sim:.2f} >= {threshold}) -> skip")
            continue
        kept[name] = (fp, sh)
        out.append(f"  {name}: keep")
    return out

pages = {
    "lesson-6.4.3": "Design a web crawler with a polite URL frontier and duplicate detection",
    "lesson-6.4.3-mirror": "Design a web crawler with a polite URL frontier and duplicate detection",
    "lesson-6.4.3-v2": "DESIGN A WEB CRAWLER with a polite url frontier and duplicate detection!!",
    "news-rust-1.90": "Rust 1.90 released with new borrow checker diagnostics and cargo improvements",
    "news-rust-1.90-plus": "Rust 1.90 released with new borrow checker diagnostics and cargo improvements plus faster builds",
    "news-docker": "Docker Compose 3.0 announced at the container summit with watch mode",
}

for threshold in (0.6, 0.9):
    print(f"threshold {threshold}:")
    for line in dedupe(pages, threshold):
        print(line)
    print()` },
        output: "threshold 0.6:\n  lesson-6.4.3: keep\n  lesson-6.4.3-mirror: exact duplicate of lesson-6.4.3 -> skip\n  lesson-6.4.3-v2: exact duplicate of lesson-6.4.3 -> skip\n  news-rust-1.90: keep\n  news-rust-1.90-plus: near-duplicate of news-rust-1.90 (Jaccard 0.70 >= 0.6) -> skip\n  news-docker: keep\n\nthreshold 0.9:\n  lesson-6.4.3: keep\n  lesson-6.4.3-mirror: exact duplicate of lesson-6.4.3 -> skip\n  lesson-6.4.3-v2: exact duplicate of lesson-6.4.3 -> skip\n  news-rust-1.90: keep\n  news-rust-1.90-plus: keep\n  news-docker: keep",
        pitfalls: ["Comparing shingles without normalising first, so 'Dog!' and 'dog' look like different words and exact duplicates leak through."],
      },
    },
    challenge: {
      title: "Distributed frontier with Redis",
      brief: [
        "Two worker processes share a Redis sorted-set frontier (ZADD / atomic ZPOPMIN) with per-host locks (SET NX PX), so no URL is fetched twice and politeness holds across processes. Redis is not installed here, so the model solution runs against a FakeRedis implementing exactly those calls; the worker code swaps to redis-py unchanged.",
      ],
      criteria: ["Priority respected across processes", "Same URL never fetched by two workers", "Per-host politeness across processes"],
      hints: ["The two Redis primitives you need: ZPOPMIN (atomic take-highest-priority) and SET NX PX for per-host locks.", "Make one host slow and give it several URLs; that is when the lock and the re-queue path appear."],
      solution: {
        text: [
          "The store exposes exactly the three Redis calls the real design needs - ZADD, an atomic ZPOPMIN, and SET NX PX locks - so the worker code reads like production code and swaps to redis-py unchanged. Verified with Python 3.11: five URLs, two workers, every URL fetched exactly once, the per-host lock demonstrably engaged (worker-1 had to re-queue a.example/p2 because worker-2 held the lock), and consecutive a.example fetches were 1.00 s and 1.20 s apart against a 0.15 s politeness floor. The surprise worth understanding: fetch order is not priority order, because politeness deliberately delays a busy host - but pop order is, since each pop hands out the best URL currently available and an in-flight URL held by a waiting worker is not available yet.",
        ],
        code: { lang: "python", file: "frontier_distributed.py", code: `# Homework (challenge): two workers share one frontier. FakeRedis emulates
# the exact Redis calls the real design uses - ZADD, atomic ZPOPMIN, SET NX PX
# locks - so the worker code swaps to redis-py unchanged.
import asyncio
import heapq
from collections import defaultdict
POLITENESS = 0.15        # seconds between two fetches of the same host
FETCH_COST = 0.50        # one fetch takes 500 ms
LOCK_TTL = 0.60          # per-host lock held while fetching

URLS = [
    (1.0, "https://a.example/p1"),
    (1.5, "https://b.example/p1"),
    (2.0, "https://a.example/p2"),
    (2.5, "https://a.example/p3"),
    (3.0, "https://c.example/p1"),
]


class Clock:
    def __init__(self) -> None:
        self.t = 0.0
    async def advance(self, dt: float) -> None:
        await asyncio.sleep(0)               # yield to the other worker
        self.t += dt


class FakeRedis:
    def __init__(self) -> None:
        self.zset: list[tuple[float, str]] = []
        self.locks: dict[str, float] = {}                  # key -> expiry time
        self.not_before: dict[str, float] = defaultdict(float)
    def zadd(self, priority: float, url: str) -> None:
        heapq.heappush(self.zset, (priority, url))
    def zpop_min(self) -> tuple[float, str] | None:
        if not self.zset:
            return None
        heapq.heapify(self.zset)
        return heapq.heappop(self.zset)                    # atomic in Redis via a Lua script
    def set_nx_px(self, key: str, ttl: float, now: float) -> bool:
        if key in self.locks and self.locks[key] > now:
            return False                                   # NX: only if not already held
        self.locks[key] = now + ttl
        return True
    def is_locked(self, key: str, now: float) -> bool:
        return key in self.locks and self.locks[key] > now
    def unlock(self, key: str) -> None:
        self.locks.pop(key, None)


store = FakeRedis()
for priority, url in URLS:
    store.zadd(priority, url)

clock = Clock()
events: list[tuple[float, str]] = []
fetch_log: list[tuple[float, str, str, str]] = []   # (time, host, url, worker)
fetched: dict[str, str] = {}                        # url -> worker


async def worker(name: str) -> None:
    while True:
        item = store.zpop_min()                     # atomic: no double-fetch
        if item is None:
            return
        priority, url = item
        host = url.split("/")[2]
        while clock.t < store.not_before[host]:     # politeness across processes
            await clock.advance(0.05)
        if not store.set_nx_px(f"lock:{host}", LOCK_TTL, clock.t):
            events.append((clock.t, f"{clock.t:5.2f} {name}: lock {host} held by the other worker, re-queue {url}"))
            store.zadd(priority, url)
            while store.is_locked(f"lock:{host}", clock.t):
                await clock.advance(0.05)
            continue
        fetch_log.append((clock.t, host, url, name))
        events.append((clock.t, f"{clock.t:5.2f} {name}: fetch {url} (priority {priority:.1f})"))
        await clock.advance(FETCH_COST)
        store.unlock(f"lock:{host}")
        store.not_before[host] = clock.t + POLITENESS
        fetched[url] = name


async def main() -> None:
    await asyncio.gather(worker("worker-1"), worker("worker-2"))
    for _, event in sorted(events):
        print(event)
    print()
    print("every URL fetched exactly once:", sorted(fetched) == sorted(u for _, u in URLS))
    gaps = defaultdict(list)
    for t, host, _, _ in fetch_log:
        gaps[host].append(t)
    for host in sorted(gaps):
        times = gaps[host]
        if len(times) > 1:
            for a, b in zip(times, times[1:]):
                print(f"politeness check: {host} gap {b - a:.2f} s >= {POLITENESS} s  ok")


asyncio.run(main())` },
        output: " 0.00 worker-1: fetch https://a.example/p1 (priority 1.0)\n 0.00 worker-2: fetch https://b.example/p1 (priority 1.5)\n 1.00 worker-2: fetch https://a.example/p3 (priority 2.5)\n 1.05 worker-1: lock a.example held by the other worker, re-queue https://a.example/p2\n 1.60 worker-1: fetch https://c.example/p1 (priority 3.0)\n 2.20 worker-2: fetch https://a.example/p2 (priority 2.0)\n\nevery URL fetched exactly once: True\npoliteness check: a.example gap 1.00 s >= 0.15 s  ok\npoliteness check: a.example gap 1.20 s >= 0.15 s  ok",
        pitfalls: ["Waiting on a lock without a TTL: a crashed worker leaves the lock forever, so every real lock is SET NX PX with an expiry, and the waiter re-checks instead of blocking forever."],
      },
    },
    capstone: {
      title: "DevAtlas: crawler design doc",
      brief: [
        "Write docs/design/crawler.md for DevAtlas (crawl lesson links + external news sources to feed the news ingester): requirements, estimates, Mermaid diagram, politeness and dedupe plan, and a rollout or failure-mode section. Keep it under three pages.",
      ],
      criteria: ["Requirements and out-of-scope list", "Estimates with numbers", "Mermaid diagram and politeness plan", "Rollout or failure-mode section"],
      hints: ["Start from the news ingester's current inputs and measure the outbound links of the lesson library.", "A Mermaid flowchart and a table of failure modes do most of the work; the numbers justify why one fetcher is enough."],
      solution: {
        text: [
          "Requirements drive every estimate down: DevAtlas crawls about 5 million pages initially and 50,000 a month - five orders of magnitude under the primer's 1-billion-link case - so the design deliberately keeps one fetcher, one Redis sorted set and one MongoDB collection until a metric says otherwise. The politeness and dedupe rules are concrete (2 s per host with backoff, robots.txt cached per RFC 9309, SHA-256 fingerprints for exact copies, Jaccard over 5-word shingles above 0.6 for near-copies, canonical URLs), and they are exactly what the hands-on scripts exercise. The rollout is staged with kill criteria - shadow crawl, then a 'crawled' badge, then search - and the estimates use the same arithmetic as the hands-on (500 KB pages, 2.5M seconds per month).",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/crawler.md",
          code: `# Design: DevAtlas web crawler

Owner: platform team · Status: proposal · Builds on: news ingester (ADR-0004), lessons 6.3.10, 6.3.11

## 1. Requirements

**Functional**
- Crawl the outbound links of the lesson library (~2,000 lessons, ~25,000 unique outbound domains) up to 2 hops out, plus the ~400 RSS/news sources the ingester already watches, to discover pages no feed carries.
- Normalise, dedupe and hand discovered pages to the news ingester as article candidates (title, snippet, URL, crawled-at).
- Index the crawl corpus so learners can search lesson-related material (reuse the Query API pattern: GET /api/v1/search?query=...).
- Re-crawl on a schedule: lessons and linked docs weekly, popular sources daily.

**Non-functional**
- Never fetch the same host faster than the politeness delay; respect robots.txt (RFC 9309).
- Never loop: cycles and duplicate content are stopped by signatures, not luck.
- Crawling is background work: a slow or banned host must never stall the ingester.

**Out of scope:** page rank, personalised results, search analytics, rendering JavaScript pages (first version), images and video.

## 2. Estimates

| | Value |
|---|---|
| Initial corpus | 25,000 domains x depth 2 ≈ 5M pages |
| New/changed pages | ~50,000 per month |
| Average page | 500 KB -> 25 GB/month, ~900 GB in 3 years |
| Crawl rate | 50,000/month ≈ 1 page/minute: one fetcher is plenty |
| Search | ~2,000 QPS peak; corpus index ~120 GB, sharded 2 ways |
The primer's web-scale case is 4 billion pages/month = 2 PB/month, 1,600 writes/s and 40,000 searches/s. DevAtlas is five orders of magnitude smaller - which is exactly why we run one fetcher and shard only when the index outgrows one disk.

## 3. High-level design

\`\`\`mermaid
flowchart LR
  seed[Lesson outbound links + RSS sources] --> frontier[(Redis sorted set<br/>links_to_crawl, score = priority)]
  frontier --> fetcher[Fetcher worker<br/>robots.txt + politeness]
  fetcher --> sig{Signature in crawled_links?}
  sig -->|similar: reduce priority| frontier
  sig -->|no| crawled[(MongoDB crawled_links<br/>url + signature + timestamp)]
  fetcher --> q[[article queue]] --> ingester[News ingester<br/>title + snippet + tag]
  q --> indexer[Search indexer<br/>reverse index shards]
  learner([Learner]) --> api[Query API] --> indexer
  api --> docservice[Document service<br/>titles + snippets]
\`\`\`

## 4. Politeness and dedupe plan

- **Politeness:** 2 s minimum between requests to the same host (configurable per host), exponential backoff on 429/5xx, robots.txt parsed and cached (max 24 h, RFC 9309). A per-host lock (Redis SET NX PX) so two workers never fetch one host at once.
- **Exact duplicates:** SHA-256 fingerprint of normalised text; an identical fingerprint is dropped before enqueueing. **Canonical URLs:** one URL per page (scheme, host, trailing slash, tracking params) before the frontier sees it.
- **Near-duplicates:** Jaccard similarity over 5-word shingles, threshold 0.6, flagged for review rather than silently dropped.

## 5. Rollout and failure modes

1. Shadow crawl for a week: no articles published, just dashboards (pages/day, duplicate rate, politeness violations, host errors).
2. Feed the ingester with a "crawled" badge; watch spam and duplicates for two weeks.
3. Enable search over the corpus; then retire the RSS-only fallback list.

| Failure | Behaviour |
|---|---|
| Host bans us | per-host error counter; pause the host, alert, review robots.txt and delay |
| Cycle in links | signature check reduces priority instead of crawling: no loop, ever |
| Indexer queue backs up | bounded queue; crawling pauses (back pressure), alert at queue age |
| Redis frontier lost | rebuild from seed URLs and crawled_links timestamps (crawls are repeatable) |
| A page changes mid-crawl | signature mismatch on re-crawl -> store as a new version, keep the old until replaced |

## 6. Alternatives considered

| Option | Trade-off |
|---|---|
| Managed search (SaaS) | faster to ship, but the corpus is a DevAtlas feature, not a cost to outsource at this size |`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "System Design Primer: Design a web crawler (the case this lesson builds on)", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/web_crawler/README.md" },
    { label: "RFC 9309: Robots Exclusion Protocol (the robots.txt standard)", url: "https://www.rfc-editor.org/rfc/rfc9309.html" },
    { label: "Google: How Search organises information (crawling, freshness, sitemaps, robots.txt)", url: "https://www.google.com/intl/en_in/search/howsearchworks/how-search-works/organizing-information" },
    { label: "Common Crawl: open repository of web crawl data", url: "https://commoncrawl.org/" },
  ],
  nextPreview: "Next: 6.4.4, design Mint.com: scheduled ingestion, safe categorisation and aggregation for a personal finance app.",
};
