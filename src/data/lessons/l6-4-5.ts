import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.5",
  title: "Design a social graph and a search query cache",
  minutes: 90,
  level: "Advanced",
  prerequisites: [
    "6.3.2 The design method: requirements, estimates and numbers to know",
    "6.3.7 Load balancers, reverse proxies and service discovery",
    "6.3.8 Scaling relational databases: replication, federation and sharding",
    "6.3.10 Caching strategies: cache-aside, write-through, write-behind, refresh-ahead",
    "2.3.2 Graphs: BFS, DFS, Dijkstra, union-find",
  ],
  summary: "Design DevAtlas's people search: show the shortest chain of people between a learner and any mentor, when the graph is far too big for one machine and a cache must sit in front of the search. BFS across sharded Person Servers with a lookup service, batched friend lookups, bidirectional search, and an LRU cache with eviction and staleness rules.",
  terms: [
    { term: "BFS shortest path", def: "Breadth-first search visits nodes layer by layer, so the first time it reaches the target it has found the shortest path in an unweighted graph. A visited set and a hop limit keep the frontier from exploding." },
    { term: "Shard", def: "Splitting rows (here, users) across several independent servers by a shard key such as person_id, because the whole graph does not fit on one machine." },
    { term: "Lookup service", def: "A small service that maps person_id to the Person Server holding that user. A distributed BFS consults it on every hop." },
    { term: "Bidirectional search", def: "Running BFS from the source and from the target at once, expanding the smaller frontier, and merging where the two searches meet. Visits far fewer nodes than one-directional BFS." },
    { term: "LRU cache", def: "Least-recently-used eviction: when the cache is full, the entry touched longest ago is dropped. Keeps hot entries and bounds memory." },
    { term: "Cache hit ratio", def: "The share of requests answered from the cache. The number to measure before sizing a cache: how skewed popularity is decides how much a small cache absorbs." },
    { term: "Degrees of separation", def: "The number of hops between two people in a social graph. BFS computes the exact number for any pair." },
  ],
  problem: [
    "DevAtlas has a search box, and the most-clicked result type is people: a learner types a name hoping to reach a mentor or a senior who can review their code. But finding a name is not the hard part; the valuable question is how to get an introduction. 'Find a mentor who knows someone you know' means showing a chain — you, your classmate, her mentor — so a recommendation can travel along real relationships instead of cold emails. The search box already sits behind Redis for autocomplete and lesson pages; now the people search needs the same treatment at a different scale: it answers with a graph, not a list.",
    "This lesson solves two problems, and one feeds the other. First, compute the shortest path through the mentor-learner graph when the graph cannot fit on one machine, the edges are unweighted, and the constraint forbids a graph database: run BFS across shards with a lookup service routing every hop. Second, keep the search fast and cheap with an LRU cache in front of it, accepting that cached paths go stale the moment a friendship changes. Both halves come straight from the System Design Primer's social graph solution, which this lesson follows step by step.",
  ],
  concept: {
    analogy: [
      "You are at a huge wedding trying to reach a mentor you have never met, and nobody carries the full guest list in their pocket. You walk to the concierge (the lookup service) to learn which table each person sits at (which Person Server holds them), then walk to a table once and ask about everyone at it (batching) instead of running back and forth per name. Two of you can search toward each other and meet in the middle of the hall (bidirectional BFS).",
      "The cache is the concierge's whiteboard: the names people ask about most stay written where everyone can see them, and when the board is full he rubs out the name nobody has asked about for the longest (LRU eviction). The board can lie the moment guests change tables, so it is wiped or corrected quickly — staleness is the price of speed.",
    ],
    precise: [
      "**Unweighted shortest path means BFS, not Dijkstra.** Friendships have no distances, so a path's cost is its hop count. BFS visits in layers, and the first time it meets the target it has the shortest chain; a priority queue would add complexity for weights that do not exist. The catch is fan-out: at 50 friends per user, six hops without a visited set and a hop limit is 50^6, about 15.6 billion nodes, so the search must be bounded.",
      "**The graph does not fit on one machine, so shard users and route every hop.** 100 million users x 50 friends per user = 5 billion edges. Users are sharded by person_id across Person Servers, and a Lookup Service maps person_id to the server holding that user. A distributed BFS reads the source's friend_ids from its server, then for each friend asks the lookup service again — every hop is a remote call, which is exactly why the next rule matters.",
      "**Batch friend lookups per server.** The naive loop issues one remote call per friend id; the batched loop groups a layer's friend ids by their Person Server and issues one call per server per layer. Sharding Person Servers by location helps further because friends cluster geographically. The hands-on shows a 50 to 29 drop in machine jumps on a tiny graph; the saving grows with the fan-out.",
      "**An LRU cache in front of the search.** Searches follow Zipf popularity — a few well-connected people are looked up constantly — so a small cache of person records and saved BFS traversals absorbs most of the 400 reads per second (higher at peak). LRU eviction bounds memory, and the hit ratio you measure decides the size. Cached paths go stale when friendships change, so TTLs and invalidation are part of the cache design, not an afterthought.",
    ],
  },
  underTheHood: {
    text: [
      "**This is a graph search, not a keyword search.** Users are vertices and friendships are unweighted edges. The product asks: given a source and a destination person, show the shortest chain between them — their degrees of separation. The public API is a REST call, `GET /api/v1/friend_search?person_id=1234`, returning a list of `{person_id, name, link}` from the source down to the target. Everything else is explicitly out of scope; the service only needs to answer this one question, highly available.",
      "**Why one machine fails.** 100 million users at 50 friends each means 5 billion friend relationships. Storing the adjacency list is one thing; BFS is another: each hop fans out by the average degree, so an unbounded search visits enormous portions of the graph. The design shards users across Person Servers (each holding `Person {id, name, friend_ids}` records) and adds a Lookup Service that maps person_id to the right server. The User Graph Service runs the BFS by asking the lookup service where the source lives, fetching its friend_ids, and then asking again for every friend — a machine jump per hop.",
      "**The BFS loop over shards.** From the source server the service gets the source's friend_ids and queues them, keeping a visited set and parent pointers. For each queued friend it asks the Lookup Service which Person Server stores them, and fetches them — the optimisation is to batch: collect a whole layer's friend ids, group them by server, and fetch once per server per layer, cutting machine jumps by the fan-out factor. A hop or time limit stops searches that would run away, and the parent pointers rebuild the path backwards from the target to the source.",
      "**Making the 400 searches per second cheap.** Person data and well-connected people are served from a memory cache (Redis or Memcached) to cut response times and downstream load. Complete or partial BFS traversals are cached too, either in the memory cache or batch-computed offline into a NoSQL store. Two further search tricks: run bidirectional BFS from both ends and merge, and start from the endpoint with more friends, since a high-degree node collapses degrees of separation faster.",
      "**The cache's price is staleness.** A path computed before a new friendship was created can be wrong the next minute. Person records are fairly stable and cache long; complete paths are volatile and need short TTLs plus invalidation on friendship events. Availability comes from the usual machinery: a load balancer in front of web servers, cache-aside reads, replicas of the Person Servers. Only if the no-graph-database constraint were lifted would a dedicated graph store enter the conversation.",
    ],
    diagram: {
      title: "One friend search, end to end",
      nodes: [
        { label: "Client", sub: "search box" },
        { label: "Web server", sub: "reverse proxy" },
        { label: "Search API", sub: "REST friend_search" },
        { label: "User Graph Service", sub: "BFS + batching" },
        { label: "Lookup Service", sub: "person_id -> server" },
        { label: "Person Servers", sub: "sharded by person_id" },
      ],
      edges: ["query", "HTTP", "BFS request", "route each hop", "friend_ids (batched)"],
      caption: "The linear flow hides the real work: every arrow into the Lookup Service is a remote call, and batching friend ids per Person Server is what keeps one search from becoming a storm of machine jumps.",
    },
  },
  handsOn: [
    {
      title: "The numbers that drive the design",
      text: ["Back-of-envelope for the social graph case, following the primer's constraints. Every number after the first two lines is a labeled assumption you would replace with measurements."],
      code: { lang: "text", code: `Assume 100M users x 50 friends per user average; unweighted edges.
  friend relationships = 100M x 50 = 5 billion edges
  searches             = 1 billion friend searches per month
  seconds per month    = 2.5 million (2.5e6)
  rate                 = 1e9 / 2.5e6 = 400 searches/s average (higher at peak)

Does the graph fit on one machine?
  5B edges x ~16 bytes per edge (two ids) = ~80 GB raw, more with indexes  (assumption)
  -> no: shard users across Person Servers

Search cost without limits:
  50 friends/hop fan-out: 50^2 = 2,500, 50^3 = 125,000, 50^6 = ~15.6 billion
  -> a visited set, a hop limit and bidirectional BFS are not optional

Cache sizing:
  400 rps x a Zipf-skewed hot set: popular people and saved paths fit in a
  few GB of Redis (assumption); LRU eviction bounds memory, TTLs bound staleness` },
      notes: ["The 400 rps number is average; peak is higher, which is why the design leans on caches instead of computing a fresh BFS for every request."],
    },
    {
      title: "High-level design: search across shards",
      text: ["The primer's architecture: the client's request travels down to the User Graph Service, which walks the graph through the Lookup Service, with a Redis cache sitting in front of the expensive parts."],
      code: { lang: "mermaid", code: `\`\`\`mermaid
flowchart LR
  C([Learner: search box]) --> LB[Load balancer]
  LB --> W[Web server / reverse proxy]
  W --> A[Search API server]
  A --> R["Redis: LRU cache<br/>hot people + saved paths"]
  A --> U[User Graph Service: BFS]
  U --> L["Lookup Service<br/>person_id -> server"]
  L --> P1[(Person Server 1)]
  L --> P2[(Person Server 2)]
  L --> PN[(Person Server N)]
\`\`\`` },
      notes: ["The cache answers before any BFS runs; on a miss the User Graph Service walks the graph, batching friend lookups per Person Server. Internal load balancers and replicas are omitted to keep the picture readable, exactly as the primer does."],
    },
    {
      title: "BFS shortest path over an adjacency list",
      text: ["The algorithm under everything: unweighted edges, so BFS finds the shortest path by hop count, with parent pointers to rebuild it and a hop limit plus visited set to bound the search."],
      code: { lang: "python", file: "bfs_path.py", code: `"""Plain BFS shortest path over an adjacency list: the core of a people search.
Unweighted edges mean BFS (not Dijkstra) finds the shortest path by hop count,
and a visited set keeps the search from looping or exploding."""
from collections import deque

GRAPH = {
    "asha": ["ravi", "zoe", "marco"],
    "ravi": ["asha", "meera", "kabir"],
    "meera": ["ravi", "kabir", "dev"],
    "zoe": ["asha", "lena"],
    "lena": ["zoe", "dev"],
    "dev": ["meera", "lena", "nina"],
    "nina": ["dev"],
    "kabir": ["ravi", "meera"],
    "marco": ["asha"],
    "ivan": [],                   # disconnected island: no path to anyone
}


def bfs(graph: dict, source: str, dest: str, max_hops: int = 6):
    if source == dest:
        return [source], 1
    queue = deque([source])
    prev = {source: None}          # parent pointers: rebuild the path backwards
    hops = {source: 0}
    visited = 0                    # nodes marked, i.e. work actually done
    while queue:
        node = queue.popleft()
        if node == dest:
            path = []
            while node is not None:
                path.append(node)
                node = prev[node]
            return path[::-1], visited
        if hops[node] >= max_hops:  # hop limit: stop expanding beyond N degrees
            continue
        for friend in graph[node]:
            if friend not in prev:
                prev[friend] = node
                hops[friend] = hops[node] + 1
                queue.append(friend)
        visited += 1
    return None, visited            # target unreachable within max_hops


for source, dest in [("asha", "nina"), ("marco", "dev"), ("asha", "lena"), ("asha", "ivan")]:
    path, visited = bfs(GRAPH, source, dest)
    if path is None:
        print(f"{source} -> {dest}: no path within hop limit")
    else:
        print(f"{source} -> {dest}: {' -> '.join(path)}  ({len(path) - 1} hops, visited {visited} nodes)")` },
      output: "asha -> nina: asha -> ravi -> meera -> dev -> nina  (4 hops, visited 8 nodes)\nmarco -> dev: marco -> asha -> ravi -> meera -> dev  (4 hops, visited 7 nodes)\nasha -> lena: asha -> zoe -> lena  (2 hops, visited 6 nodes)\nasha -> ivan: no path within hop limit",
      notes: ["The visited count shows the real cost: a search does work proportional to everything within the target's depth, not the path length. That is why caching and hop limits matter, and why bidirectional search pays off."],
    },
    {
      title: "BFS across shards: batch friend lookups per server",
      text: ["Now the graph does not fit on one machine: users live on Person Servers and every read is a remote call. The same BFS runs unchanged, but naive friend fetches (one call per friend) are compared with batching (one call per server per layer)."],
      code: { lang: "python", file: "sharded_bfs.py", code: `"""BFS across sharded Person Servers, routed by a Lookup Service (lesson 6.4.5).

The graph does not fit on one machine: users live on several Person Servers and
every hop is a remote call. Naive BFS issues one remote get() per friend id;
batched BFS groups a layer's friend ids by server and calls get() once per
server, cutting machine jumps. Graph: asha -> 6 mid users (eu/us shards) ->
18 leaves (india shard); only the last leaf knows nina, so the search fans
out three layers before finding the 3-hop path."""
from collections import defaultdict, deque

class PersonServer:
    def __init__(self, name):
        self.name = name
        self.people = {}
        self.gets = 0                       # remote data calls (machine jumps)
    def get(self, ids):
        self.gets += 1
        return [self.people[i] for i in ids if i in self.people]

class Lookup:
    def __init__(self, routing):
        self.routing = routing
        self.lookups = 0                    # routing requests (cached in production)
    def server_for(self, pid):
        self.lookups += 1
        return self.routing[pid]

def bfs(source, dest, lookup, servers, batch, max_hops=6):
    visited, queue, prev, hops = {source}, deque([source]), {source: None}, 0
    while queue and hops < max_hops:
        hops += 1
        layer, pairs = list(queue), []
        queue.clear()
        for pid in layer:                   # gather (parent, friend) for the layer
            person = lookup.server_for(pid).get([pid])[0]
            pairs += [(pid, f) for f in person["friend_ids"] if f not in visited]
        if batch:                           # ONE data call per server per layer
            grouped = defaultdict(list)
            for _, fid in pairs:
                grouped[lookup.server_for(fid)].append(fid)
            for server, ids in grouped.items():
                server.get(ids)
        else:                               # naive: ONE data call per friend id
            for _, fid in pairs:
                lookup.server_for(fid).get([fid])
        for pid, fid in pairs:
            if fid not in visited:
                visited.add(fid)
                prev[fid] = pid
                queue.append(fid)
                if fid == dest:             # shortest path found: rebuild it
                    path, node = [fid], pid
                    while node is not None:
                        path.append(node)
                        node = prev[node]
                    return path[::-1], hops, lookup.lookups, sum(s.gets for s in servers)
    return None, hops, lookup.lookups, sum(s.gets for s in servers)

def build(seed_people):
    s1, s2, s3 = PersonServer("india"), PersonServer("eu"), PersonServer("us")
    for pid, friends in seed_people.items():
        server = s1 if pid.startswith(("a", "n", "l")) else \\
                 s2 if pid.startswith("m") and int(pid[1]) % 2 == 0 else s3
        server.people[pid] = {"id": pid, "friend_ids": friends}
    servers = [s1, s2, s3]
    return Lookup({pid: s for s in servers for pid in s.people}), servers

seed = {"asha": [f"m{i}" for i in range(6)], "nina": []}
seed.update({f"m{i}": [f"l{i*3}", f"l{i*3+1}", f"l{i*3+2}"] for i in range(6)})
seed.update({f"l{i}": [] for i in range(18)})
seed["l17"].append("nina")

for batch in (False, True):
    lookup, servers = build(seed)
    path, hops, lookups, jumps = bfs("asha", "nina", lookup, servers, batch)
    print(f"{'batched' if batch else 'naive  '}: {' -> '.join(path)}"
          f"  ({hops} hops, {lookups} routing lookups, {jumps} machine jumps)")` },
      output: "naive  : asha -> m5 -> l17 -> nina  (3 hops, 50 routing lookups, 50 machine jumps)\nbatched: asha -> m5 -> l17 -> nina  (3 hops, 50 routing lookups, 29 machine jumps)",
      notes: [
        "Both modes find the same shortest path; batching cuts 50 machine jumps to 29 on a 25-person demo. With 50 friends per user the naive version would issue 50 calls where the batched one issues one per server.",
        "In production the routing table itself is cached in memory on every User Graph Service instance, so routing lookups are not remote calls.",
      ],
    },
    {
      title: "LRU cache in front of the search: hit ratio and eviction",
      text: ["People searches are Zipf-skewed: a few names dominate, a long tail is searched once. An OrderedDict implements LRU in a few lines; the run shows how much of the stream two cache sizes absorb, then watches the eviction order."],
      code: { lang: "python", file: "lru_cache.py", code: `"""LRU cache in front of a pretend people-search service (lesson 6.4.5).

The query stream is Zipf-distributed (query k is requested in proportion to
1/k**s), which matches how people searches actually look: a few popular names,
a long tail of rare ones. We measure the hit ratio for two cache sizes, then
watch the eviction order on a tiny cache."""
from collections import OrderedDict
import random

class LRU:
    def __init__(self, capacity):
        self.capacity = capacity
        self.items = OrderedDict()
    def get(self, key):
        if key in self.items:
            self.items.move_to_end(key)     # recency = last position
            return self.items[key]
        return None
    def put(self, key, value):
        evicted = None
        if key not in self.items and len(self.items) >= self.capacity:
            evicted, _ = self.items.popitem(last=False)   # evict least recently used
        self.items[key] = value
        self.items.move_to_end(key)
        return evicted

def search(person_id):                      # in production: the sharded BFS
    return f"path to {person_id}"

def zipf_stream(n_items, n_queries, s, seed=42):
    rng = random.Random(seed)               # fixed seed: deterministic stream
    cumulative, acc, total = [], 0.0, sum(1 / (i + 1) ** s for i in range(n_items))
    for i in range(n_items):
        acc += (1 / (i + 1) ** s) / total
        cumulative.append(acc)
    for _ in range(n_queries):
        r, lo, hi = rng.random(), 0, n_items - 1
        while lo < hi:                      # binary search over cumulative weights
            mid = (lo + hi) // 2
            if r < cumulative[mid]:
                hi = mid
            else:
                lo = mid + 1
        yield lo

def run(capacity, n_items=200, n_queries=10_000, s=1.0):
    cache = LRU(capacity)
    hits = 0
    for k in zipf_stream(n_items, n_queries, s):
        key = f"p{k:05d}"
        if cache.get(key) is not None:
            hits += 1
        else:
            cache.put(key, search(key))
    return hits / n_queries

for cap in (10, 50):
    ratio = run(cap)
    print(f"capacity {cap:3d}: hit ratio {ratio:5.1%}  ({ratio * 10_000:5.0f} of 10,000 searches served from memory)")

tiny = LRU(3)
for k in ("a", "b", "c", "a", "d"):
    evicted = tiny.put(k, search(k)) if tiny.get(k) is None else None
    print(f"touch {k}: cache [{ ' -> '.join(tiny.items) }]" + (f"  (evicted {evicted})" if evicted else ""))
print("final cache:", " -> ".join(tiny.items), " (b was evicted: least recently used)")` },
      output: "capacity  10: hit ratio 32.1%  ( 3215 of 10,000 searches served from memory)\ncapacity  50: hit ratio 66.9%  ( 6693 of 10,000 searches served from memory)\ntouch a: cache [a]\ntouch b: cache [a -> b]\ntouch c: cache [a -> b -> c]\ntouch a: cache [b -> c -> a]\ntouch d: cache [c -> a -> d]  (evicted b)\nfinal cache: c -> a -> d  (b was evicted: least recently used)",
      notes: [
        "A 50-entry cache absorbs two thirds of the stream because popularity is skewed; with mild skew (s below 1) the same cache would absorb far less. Measure your own hit ratio instead of trusting the 80/20 slogan.",
        "Redis implements the same idea with the allkeys-lru policy and maxmemory: you set a byte budget, Redis evicts, and the memory graph stays flat.",
      ],
    },
  ],
  companies: [
    "**Twitter FlockDB (2010, archived 2021):** a distributed, fault-tolerant graph database that stores adjacency lists rather than walking graphs. As of April 2010 the cluster held 13+ billion edges and sustained peak traffic of 20k writes/s and 100k reads/s, and its stated non-goals included multi-hop graph-walking queries — exactly the part this lesson's BFS service provides on top of plain stores, source [FlockDB on GitHub](https://github.com/twitter-archive/flockdb).",
    "**Twitter GraphJet (2016):** a real-time graph processing library in Java that keeps a full graph index over a sliding time window in memory on a single server, ingesting up to one million edges per second and computing about 500 recommendations per second. It powers Twitter's real-time recommendation services rather than search itself, source [twitter/GraphJet on GitHub](https://github.com/twitter/GraphJet).",
    "**Facebook Unicorn (2013):** the online, in-memory, social-graph-aware indexing system behind Facebook's Graph Search, designed to search trillions of edges between tens of billions of users and entities on thousands of commodity servers, answering billions of queries per day at latencies in the hundreds of milliseconds, and supporting queries that are more than one edge away from source nodes, source [Unicorn: A System for Searching the Social Graph (VLDB 2013, PDF)](https://www.vldb.org/pvldb/vol6/p1150-curtiss.pdf).",
  ],
  mistakes: [
    { mistake: "BFS with no visited set or no hop limit", why: "It works on a small graph", wrong: "Each hop fans out by 50 friends, so an unbounded search walks billions of nodes and the endpoint times out", fix: "Visited set, parent pointers and a hop or time limit; return 'no path within N degrees' instead of hanging" },
    { mistake: "One remote lookup per friend", why: "Every hop needs its server anyway", wrong: "A layer of 2,500 friends becomes 2,500 machine jumps, and latency multiplies by the fan-out", fix: "Group a layer's friend ids by their Person Server and fetch once per server per layer; shard by location so friends cluster" },
    { mistake: "Reaching for a graph database (Neo4j) or GraphQL", why: "They are built for graph walks", wrong: "The constraint forbids them, and 400 searches/s does not justify the operational cost; you would carry a second store for one query", fix: "BFS over the existing sharded stores with a lookup service; revisit only if the constraint is lifted and multi-hop volume demands it" },
    { mistake: "Cache with no eviction policy", why: "Keeping every answer feels free", wrong: "The cache grows without bound, evicting the OS page cache or running the Redis host out of memory", fix: "LRU with a fixed capacity (allkeys-lru + maxmemory in Redis) and a hit-ratio metric to size it" },
    { mistake: "Caching paths without handling staleness", why: "Paths rarely change, right?", wrong: "A new friendship makes cached chains wrong; users see introductions through people who no longer know each other", fix: "Short TTLs on complete paths, invalidation on friendship events, and longer TTLs only for stable person records" },
    { mistake: "Ignoring hot users", why: "Every query looks like one request", wrong: "Well-connected people are looked up constantly, so a few users hammer the same shards and the same BFS work repeats", fix: "Cache popular people and their traversals, and start BFS from the higher-degree endpoint, which collapses degrees of separation faster" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Batch friend lookups per Person Server per layer and run bidirectional BFS; a search's cost is the fan-out it walks, not the path it prints." },
    { tag: "Reliability", text: "Bound every search with a hop and time limit and degrade explicitly ('no path within 6 degrees') instead of letting one runaway search stall a server." },
    { tag: "Maintainability", text: "Keep the lookup service a dumb person_id to server map, and the graph service the only place that knows BFS; each is cacheable and replaceable on its own." },
    { tag: "Cost", text: "One Redis LRU sized by measured hit ratio absorbs most of the 400 rps; don't stand up a second store for graph walks until the numbers ask for it." },
  ],
  interview: [
    { q: "Design a feature that shows the degrees of separation between two users.", a: "Clarify scope first: just shortest-path display, no mutual friends, no full search. Numbers: 100M users, 50 friends average, so 5 billion edges; 1 billion searches a month = 400 searches/s average, higher at peak. Unweighted edges means BFS finds the shortest path. The graph won't fit on one machine, so shard Person records by person_id across Person Servers and add a Lookup Service mapping person_id to server. The User Graph Service runs BFS: fetch the source's friend_ids, then for each hop ask the lookup service where friends live, batching friend fetches per server per layer, with a visited set and a hop limit. Cache person data and saved traversals in Redis, cache-aside; paths get short TTLs because friendships change. For latency, add bidirectional BFS and start from the higher-degree endpoint." },
    { q: "The graph is too big for one machine. How do you run BFS across shards, and what breaks if you batch naively?", a: "Each Person Server holds Person records (id, name, friend_ids) sharded by person_id, and a Lookup Service routes person_id to server. BFS reads the source, then for each discovered friend consults the lookup service and fetches the record: every hop is a remote call, so naive code does one call per friend. Batching groups each layer's friend ids by server and does one call per server per layer — a 50x reduction in machine jumps at 50 friends per user. What breaks when batching naively: you lose which parent discovered which friend, so keep (parent, friend) pairs through the batch; and without a visited set the same friend is fetched twice from two parents." },
    { q: "How do you cache search results when friendships change all the time?", a: "Split by volatility. Person records (id, name, friend_ids) are stable: cache for an hour, invalidate on profile edits. Complete BFS paths are volatile: cache with a short TTL, a few minutes, and invalidate on friendship created/removed events for paths containing both parties. Eviction is LRU with a hard memory cap, so the long tail of one-off searches never displaces hot people; monitor the hit ratio and alert when it drops. The trade-off is explicit: a path can be up to one TTL stale, which is fine for recommendations and unacceptable for anything transactional, so the UI labels paths 'as of a few minutes ago'." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The friend graph has unweighted edges. Why BFS and not Dijkstra for shortest paths?",
      options: ["Dijkstra only works on trees", "BFS finds the shortest path in an unweighted graph in O(V+E), while Dijkstra's priority queue handles weights that do not exist here", "BFS needs a graph database", "Dijkstra is faster on unweighted graphs"],
      answer: 1,
      explanation: "All edges cost 1 hop, so expanding layer by layer reaches the target on the shortest path first. Dijkstra adds a priority queue for weighted edges; no weights, no need.",
    },
    {
      kind: "output",
      prompt: "100 million users with 50 friends per user on average. How many friend relationships must the system store?",
      options: ["500 million", "5 billion", "50 billion", "2.5 million"],
      answer: 1,
      explanation: "100 million x 50 = 5 billion edges, which is why the graph is sharded across Person Servers rather than kept on one machine.",
    },
    {
      kind: "bug",
      prompt: "The friend search endpoint hangs for pairs that are far apart: each layer multiplies the frontier by 50 and the server runs out of memory and times out. What is the root cause?",
      options: ["The edges are unweighted", "No visited set and no hop limit, so the frontier grows exponentially until the search dies", "The cache hit ratio is too high", "The lookup service returns the wrong shard"],
      answer: 1,
      explanation: "An unbounded BFS fans out 50^n: six hops is about 15.6 billion nodes. A visited set prevents rework, and a hop or time limit turns an infinite search into a bounded 'no path found' answer.",
    },
  ],
  cheatSheet: [
    "Unweighted edges means BFS finds the shortest path; Dijkstra adds nothing.",
    "100M users x 50 friends = 5 billion edges; 1e9 searches / 2.5e6 seconds = 400 searches/s.",
    "Graph too big for one machine: shard users across Person Servers, Lookup Service maps person_id to server.",
    "Batch friend lookups per Person Server per layer to cut machine jumps.",
    "Visited set + hop/time limit, or the frontier explodes (50^6 is about 15.6 billion).",
    "Bidirectional BFS: expand the smaller frontier, merge where the searches meet.",
    "Cache hot people and saved traversals; LRU eviction bounds memory, the hit ratio sizes it.",
    "Cached paths go stale on friendship changes: short TTLs plus invalidation events.",
  ],
  homework: {
    basic: {
      title: "Shortest path with BFS",
      brief: [
        "BFS over an adjacency list, print path + visited count",
      ],
      criteria: ["Correct shortest path", "Visited count reported", "Handles unreachable target", "Deterministic output"],
      hints: ["Keep parent pointers so the path can be rebuilt backwards; count nodes as they are dequeued."],
      solution: {
        text: [
          "The function mirrors the primer's BFS: a queue, parent pointers, a visited set and a hop limit. The visited count matters more than the path: it is the work the search actually did, and the number that drives caching and bidirectional search later.",
          "Verified on Python 3.11 — the output above is from a real run, including the unreachable 'ghost' user who lives on a disconnected island.",
        ],
        code: { lang: "python", file: "shortest_path.py", code: `"""Shortest path between two people with BFS (lesson 6.4.5, basic homework).

Unweighted friendships, so BFS from the source finds shortest paths by hop
count. Reports the path, its length and how many people were visited, and
handles a target that cannot be reached within the hop limit."""
from collections import deque

FRIENDS = {
    "asha":  ["ravi", "zoe", "marco"],
    "ravi":  ["asha", "meera", "kabir"],
    "meera": ["ravi", "kabir", "dev"],
    "zoe":   ["asha", "lena"],
    "lena":  ["zoe", "dev"],
    "dev":   ["meera", "lena", "nina"],
    "nina":  ["dev"],
    "kabir": ["ravi", "meera"],
    "marco": ["asha"],
    "ghost": [],                      # no friends: unreachable from everyone
}


def shortest_path(source: str, target: str, max_hops: int = 6):
    """Return (path, visited) or (None, visited) if unreachable within max_hops."""
    queue = deque([source])
    parent = {source: None}           # parent pointers rebuild the path backwards
    depth = {source: 0}
    visited = 0                       # people dequeued, i.e. work actually done
    while queue:
        person = queue.popleft()
        visited += 1
        if person == target:
            path = [target]
            while parent[path[-1]] is not None:
                path.append(parent[path[-1]])
            return path[::-1], visited
        if depth[person] == max_hops:
            continue                  # hop limit: do not expand beyond N degrees
        for friend in FRIENDS[person]:
            if friend not in parent:
                parent[friend] = person
                depth[friend] = depth[person] + 1
                queue.append(friend)
    return None, visited              # the queue emptied: no path within max_hops


if __name__ == "__main__":
    for source, target in [("asha", "nina"), ("marco", "dev"), ("asha", "ghost")]:
        path, visited = shortest_path(source, target)
        if path is None:
            print(f"{source} -> {target}: unreachable (visited {visited} people)")
        else:
            print(f"{source} -> {target}: {len(path) - 1} hops via {' -> '.join(path)} (visited {visited} people)")
    assert shortest_path("asha", "nina")[0] == ["asha", "ravi", "meera", "dev", "nina"]
    assert shortest_path("asha", "ghost")[0] is None
    print("assertions passed")` },
        output: "asha -> nina: 4 hops via asha -> ravi -> meera -> dev -> nina (visited 9 people)\nmarco -> dev: 4 hops via marco -> asha -> ravi -> meera -> dev (visited 8 people)\nasha -> ghost: unreachable (visited 9 people)\nassertions passed",
        pitfalls: ["Counting 'visited' when a friend is marked rather than when it is dequeued: pick one definition and keep it, because the count is what later lessons compare."],
      },
    },
    intermediate: {
      title: "Sharded BFS with a lookup service",
      brief: [
        "Shard users across person servers, BFS via a lookup service, batch friend lookups per server, report hops and cross-shard fetches",
      ],
      criteria: ["Correct path across shards", "Batched lookups reduce fetches", "Lookup service used for every hop", "Real output"],
      hints: ["Group a layer's ids by server before calling get; keep (parent, friend) pairs so the path still rebuilds after batching."],
      solution: {
        text: [
          "The lookup service routes every read, the expansion of a layer is one call per server, and the discovered friends are grouped by server for one more batched call per server. The printed comparison (8 batched fetches vs 12 one-per-friend) is the same saving the primer describes, shown small enough to audit by hand.",
          "Verified on Python 3.11: the run prints the correct 3-hop path anaya -> rita -> leo -> mira, with per-server call counts, and the naive count is computed alongside so the batching win is visible rather than asserted.",
        ],
        code: { lang: "python", file: "sharded_bfs.py", code: `"""Sharded BFS with a lookup service (lesson 6.4.5, intermediate homework).

Users live on Person Servers sharded by region. A Lookup Service maps
person_id -> server, and every hop is a remote call. Friend ids of a layer
are grouped by server so each server gets one batched call per layer."""
from collections import defaultdict, deque


class PersonServer:
    def __init__(self, name: str) -> None:
        self.name = name
        self.people: dict[str, dict] = {}
        self.batch_fetches = 0        # remote batched calls (machine jumps)

    def get_many(self, ids: list[str]) -> list[dict]:
        self.batch_fetches += 1
        return [self.people[i] for i in ids if i in self.people]


class LookupService:
    def __init__(self, routing: dict[str, PersonServer]) -> None:
        self.routing = routing

    def server_for(self, person_id: str) -> PersonServer:
        return self.routing[person_id]


def sharded_bfs(source: str, target: str, lookup: LookupService,
                servers: list[PersonServer], max_hops: int = 6):
    """BFS where every read of a person or a friend list is a remote call."""
    queue = deque([source])
    parent = {source: None}
    hops = 0
    naive_calls = 0                   # what one-call-per-friend would have cost
    while queue and hops < max_hops:
        hops += 1
        layer = list(queue)
        queue.clear()
        discovered: list[tuple[str, str]] = []
        by_server: dict[PersonServer, list[str]] = defaultdict(list)
        for pid in layer:             # 1. group the layer by server ...
            by_server[lookup.server_for(pid)].append(pid)
        for server, ids in by_server.items():   # ... and read friend lists in one call per server
            for person in server.get_many(ids):
                for fid in person["friend_ids"]:
                    if fid not in parent:
                        parent[fid] = person["id"]
                        discovered.append((person["id"], fid))
        naive_calls += len(layer) + len(discovered)
        grouped: dict[PersonServer, list[str]] = defaultdict(list)
        for _, fid in discovered:     # 2. group new friend ids by their server
            grouped[lookup.server_for(fid)].append(fid)
        for server, ids in grouped.items():   # 3. ONE batched call per server
            server.get_many(ids)
        for pid, fid in discovered:
            queue.append(fid)
            if fid == target:
                path = [fid]
                node: str | None = pid
                while node is not None:
                    path.append(node)
                    node = parent[node]
                fetches = sum(s.batch_fetches for s in servers)
                return path[::-1], hops, fetches, naive_calls
    return None, hops, sum(s.batch_fetches for s in servers), naive_calls


mumbai, delhi, remote = PersonServer("mumbai"), PersonServer("delhi"), PersonServer("us")
mumbai.people.update({
    "anaya": {"id": "anaya", "friend_ids": ["rita", "sam", "priya"]},   # learner
    "rita":  {"id": "rita",  "friend_ids": ["anaya", "leo"]},
    "sam":   {"id": "sam",   "friend_ids": ["anaya", "jay"]},
    "priya": {"id": "priya", "friend_ids": ["anaya", "jay"]},
    "jay":   {"id": "jay",   "friend_ids": ["sam", "priya", "leo"]},
})
delhi.people.update({
    "leo":  {"id": "leo",  "friend_ids": ["rita", "jay", "mira"]},
    "mira": {"id": "mira", "friend_ids": ["leo"]},                        # mentor (target)
})
servers = [mumbai, delhi, remote]
routing: dict[str, PersonServer] = {}
for server in servers:
    routing.update({pid: server for pid in server.people})

path, hops, fetches, naive = sharded_bfs("anaya", "mira", LookupService(routing), servers)
print(f"path: {' -> '.join(path)}  ({hops} hops)")
print(f"cross-shard fetches: {fetches} batched vs {naive} one-per-friend")
print(f"server call counts: " + ", ".join(f"{s.name}={s.batch_fetches}" for s in servers))` },
        output: "path: anaya -> rita -> leo -> mira  (3 hops)\ncross-shard fetches: 8 batched vs 12 one-per-friend\nserver call counts: mumbai=5, delhi=3, us=0",
        pitfalls: ["Batching the fetch but losing the parent pointers: keep (parent, friend) pairs through the batch or the path cannot be rebuilt."],
      },
    },
    challenge: {
      title: "Bidirectional BFS",
      brief: [
        "Run BFS from both ends and merge; compare visited nodes against one-directional BFS on a larger seeded graph",
      ],
      criteria: ["Path found and correct", "Visited-count comparison printed", "Bounded by hop limit", "Real output"],
      hints: ["Expand whichever frontier is smaller and check for a meeting node when dequeuing; seed the random graph so the run is reproducible."],
      solution: {
        text: [
          "Bidirectional BFS alternates on the smaller frontier and merges the first time a node appears in both visited sets; the reconstructed path is identical to the one-directional result because both are shortest paths on the same seeded graph. The comparison is the whole point: 38 nodes marked versus 300 for the same 3-hop path.",
          "Verified on Python 3.11 with a fixed seed (400 nodes, 1,974 edges): the run prints both paths, both visited counts, and a hop-limit run that returns None instead of searching forever.",
        ],
        code: { lang: "python", file: "bidirectional.py", code: `"""Bidirectional BFS (lesson 6.4.5, challenge homework).

Run BFS from both ends, always expanding the smaller frontier, and merge when
a node shows up in both visited sets. Compare visited counts against a
one-directional BFS on a seeded graph; a hop limit bounds both searches."""
import random
from collections import deque

N = 400
SEED = 7


def make_graph(n: int, seed: int, ring: int = 3, extra: int = 2) -> dict[int, list[int]]:
    rng = random.Random(seed)                # fixed seed: identical graph every run
    graph: dict[int, set[int]] = {i: set() for i in range(n)}
    for i in range(n):                       # ring edges keep the graph connected
        for k in range(1, ring + 1):
            j = (i + k) % n
            graph[i].add(j)
            graph[j].add(i)
    for _ in range(extra * n):               # random long-range "shortcut" edges
        a, b = rng.randrange(n), rng.randrange(n)
        if a != b:
            graph[a].add(b)
            graph[b].add(a)
    return {i: sorted(adj) for i, adj in graph.items()}


def one_directional(graph, source, target, max_hops=20):
    queue = deque([source])
    parent = {source: None}
    depth = {source: 0}
    while queue:
        node = queue.popleft()
        if node == target:
            path = [node]
            while parent[path[-1]] is not None:
                path.append(parent[path[-1]])
            return path[::-1], len(parent)
        if depth[node] == max_hops:
            continue
        for nxt in graph[node]:
            if nxt not in parent:
                parent[nxt] = node
                depth[nxt] = depth[node] + 1
                queue.append(nxt)
    return None, len(parent)


def bidirectional(graph, source, target, max_hops=20):
    qf, qb = deque([source]), deque([target])
    pf, pb = {source: None}, {target: None}
    steps = 0
    while qf and qb and steps < 2 * max_hops:
        steps += 1
        if len(qf) <= len(qb):               # expand the smaller frontier
            node = qf.popleft()
            if node in pb:
                meeting = node
                break
            for nxt in graph[node]:
                if nxt not in pf:
                    pf[nxt] = node
                    qf.append(nxt)
        else:
            node = qb.popleft()
            if node in pf:
                meeting = node
                break
            for nxt in graph[node]:
                if nxt not in pb:
                    pb[nxt] = node
                    qb.append(nxt)
    else:
        return None, len(pf), len(pb)
    left, node = [], meeting
    while node is not None:
        left.append(node)
        node = pf[node]
    right, node = [], pb[meeting]
    while node is not None:
        right.append(node)
        node = pb[node]
    return left[::-1] + right, len(pf), len(pb)


graph = make_graph(N, SEED)
source, target = 3, 297

one_path, one_visited = one_directional(graph, source, target)
bi_path, f_visited, b_visited = bidirectional(graph, source, target)

print(f"graph: {N} nodes, {sum(len(v) for v in graph.values()) // 2} edges (ring + random shortcuts, seed {SEED})")
print(f"one-directional: {len(one_path) - 1} hops, visited {one_visited} nodes")
print(f"bidirectional:   {len(bi_path) - 1} hops, visited {f_visited} + {b_visited} = {f_visited + b_visited} nodes")
print(f"same shortest path: {one_path == bi_path}")
print(f"saved: {100 * (1 - (f_visited + b_visited) / one_visited):.0f}% fewer visited nodes")

tiny, tf, tb = bidirectional(graph, source, target, max_hops=1)
print(f"hop limit 1: path={tiny} (frontiers {tf}, {tb}) -> search is bounded, not infinite")` },
        output: "graph: 400 nodes, 1974 edges (ring + random shortcuts, seed 7)\none-directional: 3 hops, visited 300 nodes\nbidirectional:   3 hops, visited 20 + 18 = 38 nodes\nsame shortest path: True\nsaved: 87% fewer visited nodes\nhop limit 1: path=None (frontiers 10, 9) -> search is bounded, not infinite",
        pitfalls: ["Checking for the meeting node only when marking new nodes instead of when dequeuing: with alternation on frontier size, dequeuing is where the shortest-path guarantee comes from."],
      },
    },
    capstone: {
      title: "DevAtlas: mentor graph design doc",
      brief: [
        "Write docs/design/mentor-graph.md: degrees-of-separation paths between learners and mentors (mentor recommendations), sharding plan, and an LRU cache in front of the people-search endpoint",
      ],
      criteria: ["Requirements and out-of-scope list", "Estimates with numbers", "Mermaid diagram", "Cache eviction + staleness section"],
      hints: ["Label every assumption; keep the LRU section concrete (policy, TTLs, invalidation triggers, hit-ratio target)."],
      solution: {
        text: [
          "The doc follows the design method from 6.3.2 with DevAtlas numbers: 1M learners and 5k mentors at 40 connections each is about 40M edges, which fits in one store today, so the sharding plan is a growth path, not launch complexity. The cache section separates stable person records (hour TTL) from volatile paths (minute TTL plus event-driven invalidation), and states the accepted staleness window out loud — that is the part reviewers actually push on.",
          "The Mermaid diagram was rendered with mermaid-cli to confirm it parses, and the LRU numbers reuse lru_cache.py from the hands-on: a 50-entry cache absorbed two thirds of a Zipf-skewed stream, which is why a few hundred MB of Redis, not a graph database, sits in front of the endpoint.",
        ],
        code: { lang: "markdown", file: "docs/design/mentor-graph.md", code: `# Design: DevAtlas mentor graph — degrees of separation

Status: proposal · Author: DevAtlas learner · Reviewers: platform team

## 1. Requirements

**Functional**
- Given two people, show the shortest chain connecting them: "You -> Ravi -> Meera (mentor)".
- Mentor recommendations ranked by shared connections: mentors two hops away first.
- \`GET /api/v1/people_search?person_id=8123\` returns the path as a list of \`{person_id, name, link}\`.

**Non-functional**
- p95 < 200 ms server-side for a search within 6 hops; 99.9% availability, and the path feature degrades before chat or lessons ever do.
- 1M learners and 5k mentors; about 40 connections per person on average (assumption).
- No graph database and no GraphQL: plain sharded stores plus BFS in the service layer (the lesson 6.4.5 constraint).

**Out of scope:** full-text search, feed, messaging, the lesson graph, and anything beyond displaying the chain and shared connections.

## 2. Estimates

| | Value |
|---|---|
| People | ~1M learners + 5k mentors |
| Edges | 1M x 40 = 40M relationships (~640 MB raw at 16 bytes per edge — assumption) |
| Searches | 2M/month = about 1/s average, ~10/s peak (assumption) |
| BFS cost | fan-out 40, bounded by hop limit 6 + visited set |
| Cache | 100k LRU entries for hot people and paths: tens of MB in Redis |

40M edges fit in one database today, but sharding by \`person_id\` is the growth path (lesson 6.4.2's write-scaling logic) and stops one hot server from ever owning the whole graph.

## 3. Data model and API

- \`Person { id: int64, name: string, role: learner | mentor, friend_ids: [int64] }\`, sharded \`person_id % 4\` across four Person Servers, one replica each.
- \`GET /api/v1/people_search?person_id=8123\` -> \`[{person_id, name, link}, ...]\`, the path from the searcher to 8123, or 404 with \`{"error": "no path within 6 degrees"}\`.

## 4. High-level design

\`\`\`mermaid
flowchart LR
  L([Learner: search box]) --> LB[Load balancer]
  LB --> API[People API]
  API --> R["Redis: LRU cache<br/>people 1h TTL, paths 5m TTL"]
  API --> UGS[User Graph Service: BFS]
  UGS --> LS["Lookup Service<br/>person_id -> server"]
  LS --> S1[(Person Server 1)]
  LS --> S2[(Person Server 2)]
  LS --> S3[(Person Server 3)]
  LS --> S4[(Person Server 4)]
\`\`\`

- **People API** validates and rate limits, then reads the cache (cache-aside). On a miss the User Graph Service runs the search.
- **User Graph Service** runs BFS: lookup service on every hop, friend lookups batched per Person Server per layer, visited set, hop limit 6, bidirectional when the target is known.
- **Lookup Service** is a dumb \`person_id -> server\` table, cached in memory on every service instance.
- **Person Servers** are sharded by \`person_id\`; sharding by location comes later, since friends cluster geographically and that improves the batching (primer's optimisation).

## 5. Cache: LRU eviction and staleness

- **Policy:** Redis \`allkeys-lru\` with \`maxmemory 256mb\`. The long tail of one-off searches evicts itself; hot mentors and their saved traversals stay resident.
- **What is cached:** person records (TTL 1 hour, stable data) and complete BFS paths (TTL 5 minutes, volatile data). Paths are keyed by \`(source_id, target_id)\`.
- **Invalidation:** friendship created/removed events delete every cached path containing both parties (a per-person list of affected keys kept alongside the person record). Profile edits delete the person record.
- **Staleness accepted:** a path may be up to 5 minutes old and miss a brand-new friendship; the UI labels results "as of a few minutes ago". Recommendations tolerate this; nothing transactional depends on the path.
- **Targets:** hit ratio 60%+ (assumption, measured); alert below 40%. 100k entries is tens of MB, far inside the 256 MB budget.

## 6. Failure modes and scaling

| Failure | Behaviour |
|---|---|
| Person Server down | its replica serves reads; the search returns partial results and 503 for the missing shard |
| Lookup Service down | UGS serves from its in-memory copy of the routing table; alert |
| Redis down | cache-aside falls through: BFS runs uncached, latency up, availability unchanged |
| BFS exceeds hop limit | return "no path within 6 degrees" instead of hanging (bounded search) |

At 10x searches, add offline precomputation of complete traversals for the most-searched people (stored in a NoSQL store), the primer's scaling step.

## 7. Trade-offs

- Per-request BFS with caching beats precomputed all-pairs paths, which would be O(N^2) storage; revisit only if the hot set dominates.
- A graph database is rejected by the requirement; even without it, FlockDB's README notes multi-hop graph walks were its non-goal, so a plain-store BFS service remains a defensible default at this volume.`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer: design the data structures for a social network (this lesson's case study)", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/social_graph/README.md" },
    { label: "System Design Primer (full repository, CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "FlockDB on GitHub: Twitter's distributed adjacency-list graph database", url: "https://github.com/twitter-archive/flockdb" },
    { label: "GraphJet on GitHub: Twitter's real-time graph processing library", url: "https://github.com/twitter/GraphJet" },
    { label: "Unicorn: A System for Searching the Social Graph (Facebook, VLDB 2013, PDF)", url: "https://www.vldb.org/pvldb/vol6/p1150-curtiss.pdf" },
    { label: "Wikipedia: Six degrees of separation", url: "https://en.wikipedia.org/wiki/Six_degrees_of_separation" },
  ],
  nextPreview: "Next: 6.4.6, design sales rank by category: batch aggregation with MapReduce and precomputed rankings.",
};
