import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.3.2",
  title: "Graphs: BFS, DFS, Dijkstra, union-find",
  minutes: 95,
  level: "Intermediate",
  prerequisites: ["2.3.1 Trees, BSTs and heaps"],
  summary: "Model problems as graphs, choose a representation with your eyes open, and apply BFS (fewest hops), DFS (reachability, cycles, order), Dijkstra (non-negative weights) and union-find (dynamic connectivity).",
  terms: [
    { term: "Graph", def: "Nodes (vertices) connected by edges. Edges can be directed (one-way) or undirected, weighted or unweighted." },
    { term: "Directed graph", def: "Every edge has a direction: A to B does not imply B to A. Prerequisites, follows, imports and one-way streets are directed." },
    { term: "Weighted graph", def: "Each edge carries a number: latency, distance, cost, capacity. Unweighted graphs are the special case where every edge costs the same." },
    { term: "Adjacency list", def: "For each node, the list of its neighbours (and weights). O(V + E) memory; the default for sparse graphs." },
    { term: "Adjacency matrix", def: "A V by V table where cell (u, v) says whether the edge u to v exists (or its weight). O(V^2) memory, O(1) edge lookup." },
    { term: "Sparsity", def: "E compared with V^2. Real graphs are usually sparse (E is a small multiple of V), which is why lists beat matrices in practice." },
    { term: "BFS", def: "Breadth-first search: expand the frontier ring by ring with a queue. In an unweighted graph, first arrival is the fewest-edge path." },
    { term: "DFS", def: "Depth-first search: follow one path to its end, then backtrack, using recursion or a stack. Good for reachability, components, cycles and order." },
    { term: "Topological order", def: "An ordering of a directed acyclic graph (DAG) where every edge goes from earlier to later, e.g. prerequisites before lessons." },
    { term: "Cycle", def: "A path that returns to its start. A course whose prerequisites form a cycle can never be completed." },
    { term: "Dijkstra", def: "Shortest paths from one source with non-negative weights: always settle the cheapest unfinalised node, using a min-heap." },
    { term: "Union-find (disjoint set)", def: "A structure that tracks which items share a group, supporting union and find in near-constant amortised time." },
  ],
  problem: [
    "DevAtlas lessons have prerequisites. The roadmap must show a valid study order, and the content team must be warned if someone accidentally creates a cycle ('A needs B, B needs C, C needs A'). The same data also has to answer 'which lessons can I reach from here?' and 'how far away is this one?'",
    "Other real questions: 'How many hops between two services in our call graph?' 'What is the cheapest route between two cities?' 'Which user accounts are linked by shared devices (fraud rings)?' 'Which two machines are still connected after this cable failed?' All are graph problems; the hard part is noticing it. Once you name the nodes, the edges, their direction and their weight, a handful of algorithms covers most needs - and the representation you pick decides whether the solution fits in memory.",
  ],
  concept: {
    analogy: [
      "A graph is a **city map**: intersections are nodes, roads are edges, one-way streets are directed edges, and travel time is the weight. BFS explores like ripples in a pond, ring by ring. DFS is exploring a maze by always taking the next unexplored corridor and backtracking at dead ends. Dijkstra is a GPS always extending the currently cheapest known route.",
      "Union-find is a set of merging clubs. Each club has one president; every member points to a president or to someone who knows one. To merge two clubs you make one president report to the other, and to check membership you follow the pointers to the top. Path compression is the trick of making everyone you visit point straight at the president, so future questions take one step.",
    ],
    precise: [
      "**Represent deliberately.** An adjacency list is a dict from node to a list of (neighbour, weight) pairs, cost O(V + E). An adjacency matrix is a V by V table, cost O(V^2) but O(1) to ask 'is there an edge?'. Choose the list for sparse graphs - almost all real graphs - and the matrix only for dense graphs or repeated edge queries. Grids are implicit graphs: neighbours are computed as up/down/left/right, and no edge list is stored.",
      "**BFS** uses a FIFO queue and marks a node when it is enqueued. Because the queue emits nodes in non-decreasing distance from the source, the first time it reaches a node is via the fewest edges. **DFS** uses a stack or recursion and dives as deep as possible before backtracking; its order is not by distance, so it can reach a target along a long path before a short one exists. DFS is for reachability, connected components, cycle detection and topological order - not for unweighted shortest paths.",
      "**Order and cycles** go together. Kahn's algorithm repeatedly removes nodes with in-degree 0; if fewer than V nodes come out, the leftovers are in a cycle. DFS with three colours (white unvisited, grey on the current path, black finished) finds a directed cycle when it meets a grey node, and can return the exact path. In an undirected graph, meeting an already-visited neighbour is only a cycle if that neighbour is not the parent you came from; union-find gives a cleaner test: if the two endpoints are already in the same set, the edge closes a cycle.",
      "**Dijkstra** pops the smallest tentative distance from a min-heap, settles that node, and relaxes its edges. With non-negative weights the smallest tentative distance can never be improved later, so settling is safe; a negative edge destroys that argument and Dijkstra can return a wrong answer with no error. **Union-find** maintains a parent pointer per item, with path compression in find and union by rank. It answers 'are these connected?' as edges arrive (dynamic connectivity) and powers Kruskal's minimum spanning tree; DFS answers the same question faster for one static snapshot, because it needs only one pass.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Model before you code.** Write down four decisions: what is a node, what is an edge, is the edge directed, and does it have a weight. DevAtlas lessons are nodes; 'must come before' is a directed edge; there is no weight. A call graph is directed and unweighted (hops), a network of cities is undirected and weighted (latency), and accounts sharing a device are undirected and unweighted (same group). Most wrong answers come from a modelling mistake, not a coding mistake: making a prerequisite edge undirected turns a valid curriculum into a false cycle, and making a road one-way when it is not silently hides routes.",
      "2. **Pick the representation from the shape of the data.** An adjacency list stores each edge once (twice for undirected) and costs O(V + E); iterating a node's neighbours costs its degree. An adjacency matrix stores V^2 cells and costs O(V^2) whether the graph has three edges or three million; it wins when the graph is dense or when you ask 'is there an edge?' constantly. For V = 1,000 and E = 2,000, a packed matrix is about 1,000,000 bytes while the list slots are about 32,000 bytes - a 30x difference that grows with V. Python's dict-of-lists adds per-object overhead, so a real system may use arrays, CSR layout or numpy for the dense case.",
      "3. **BFS is a distance machine.** Start at the source with distance 0, enqueue its unvisited neighbours with distance 1, then their unvisited neighbours with distance 2, and so on. The queue is the invariant: everything at distance d leaves before anything at distance d + 1, so the first assignment of a distance is final. Mark nodes **when enqueuing**, not when popping, or a node with several parents is enqueued several times and work explodes on dense graphs. Levels are useful output in their own right: BFS levels in a call graph are dependency rings, and in a word-ladder problem they are the number of transformations.",
      "4. **DFS is a shape machine.** Follow one edge as far as it goes, then backtrack. Iterative DFS with an explicit stack avoids Python's recursion limit (about 1,000 frames by default) on graphs with long chains; the recursive version is fine for small inputs and easier to read. Pre-order (record when first seen) is the order you would explore; post-order (record after all descendants) is the order for dependency resolution and for computing subtree aggregates. Neither order is a distance order: a DFS from the same source can reach a node in 9 hops before reaching one in 2.",
      "5. **Why BFS and not DFS for fewest hops.** Suppose the target is a direct neighbour but DFS tries a long corridor first. DFS reaches the target after 20 edges and returns 20; BFS reaches it in 1 because it exhausts every distance-1 node before any distance-2 node. The guarantee is not about speed - both are O(V + E) - it is about the order in which nodes are finalised. Use DFS for 'can I get there at all', 'how many separate groups', 'is there a cycle' and 'what order'; use BFS for 'how few edges'.",
      "6. **Directed and undirected cycles are different tests.** In a directed graph, `a -> b -> a` is a cycle and a self-loop `a -> a` is a cycle; a back edge to a **grey** node proves one. Kahn's leftovers prove one too, without giving the path, which is why the capstone combines Kahn with a colour DFS for a readable message. In an undirected graph the edge back to the parent is not a cycle - it is the same edge you just walked - so naive DFS reports every tree edge as a cycle. Either skip the parent (and handle parallel edges carefully) or use union-find: an edge whose endpoints already share a root closes a cycle.",
      "7. **Topological sort is a scheduling algorithm.** Kahn computes in-degrees, queues all zero-in-degree nodes, and decrements neighbours as it removes them. The result is a valid order, not a unique one: any tie-break is correct, so sort the queue if you want deterministic tests. If the queue empties before all nodes are emitted, the remaining nodes form one or more cycles. Real systems use this for build targets, CI stages, Terraform resources, package installs and spreadsheet formulas; Python ships it as `graphlib.TopologicalSorter`.",
      "8. **Dijkstra is BFS generalised to weights.** Replace the FIFO queue with a min-heap keyed by tentative distance, pop the cheapest node, and relax its outgoing edges. Complexity is O((V + E) log V) with a binary heap; a Fibonacci heap improves the theory but is rarely worth it. Push a new heap entry on every improvement and skip entries whose distance is stale instead of implementing decrease-key. The non-negative precondition is load-bearing: with `b -> a = -10`, a can be settled at 1 and never revisited, so a path that later reaches it at -5 is ignored and every distance through a stays wrong. Bellman-Ford relaxes all edges V - 1 times, tolerates negative edges, detects negative cycles, and costs O(V * E).",
      "9. **Union-find is for edges that arrive over time.** Each item starts as its own root. `find` follows parent pointers to the root and compresses the path; `union` attaches the shorter tree under the taller one using rank, so trees stay shallow. Together the amortised cost is O(alpha(V)), effectively constant, and the inverse Ackermann function grows so slowly that it is below 5 for any realistic input. This is the right tool when connectivity is built incrementally: Kruskal sorts edges by weight and unions endpoints when they are in different sets (an edge within a set would close a cycle), network monitoring merges partitions as links come up, and fraud analysis merges accounts that share a device. A single DFS can label components faster for one fixed graph, but it cannot answer queries interleaved with updates without recomputing.",
    ],
    diagram: {
      title: "From question to algorithm",
      nodes: [
        { label: "Model", sub: "nodes, edges, direction, weight" },
        { label: "Represent", sub: "list for sparse, matrix for dense" },
        { label: "Traverse", sub: "BFS levels / DFS order" },
        { label: "Order", sub: "Kahn topological sort" },
        { label: "Weigh", sub: "Dijkstra + min-heap" },
        { label: "Connect", sub: "union-find, Kruskal" },
      ],
      edges: ["what is a node?", "E << V^2", "acyclic?", "non-negative?", "edges arrive online"],
      caption: "Each stage answers a different question. Skipping the model step is how a correct algorithm produces a confidently wrong answer.",
    },
  },
  handsOn: [
    {
      title: "Know what each tool buys you",
      text: [
        "Keep this table next to the code. The algorithm is chosen by the question, and the representation is chosen by the graph's shape - not by which one you learned first.",
      ],
      code: {
        lang: "text",
        file: "cheatsheet.txt",
        code: `representation                  memory        edge lookup     best when
adjacency list (dict of lists)   O(V + E)      O(degree)       sparse: E is a small multiple of V
adjacency matrix (V x V)         O(V^2)        O(1)            dense, or repeated edge queries
grid (implicit)                  O(V)          O(1) per cell   movement problems; neighbours computed

question                        algorithm               time                    memory
fewest hops, unweighted         BFS + queue             O(V + E)                O(V)
reachability / components       DFS or BFS              O(V + E)                O(V)
valid order + cycle             Kahn topological sort   O(V + E)                O(V)
cheapest path, weights >= 0     Dijkstra + min-heap     O((V + E) log V)        O(V + E)
negative weights                Bellman-Ford            O(V * E)                O(V)
dynamic connectivity / MST      union-find              ~O(1) per operation     O(V)
all-pairs, small dense graph    Floyd-Warshall          O(V^3)                  O(V^2)`,
      },
      notes: [
        "`~O(1)` means amortised inverse-Ackermann time: effectively constant, but only after path compression and union by rank.",
        "A matrix does not make BFS faster; it makes one edge check O(1). BFS still visits every node and edge, so it remains O(V + E) on a list and O(V^2) on a matrix.",
      ],
    },
    {
      title: "Draw the graph before you run anything",
      text: [
        "The same five prerequisite edges are a directed acyclic graph. Remove the arrows and the same edges contain a cycle (`ci - git - terminal - docker - ci`), which is exactly why direction is part of the model and not a detail you add later.",
      ],
      code: {
        lang: "mermaid",
        file: "prereqs.mmd",
        code: `flowchart TD
  T["terminal"] --> G["git"]
  T --> D["docker"]
  D --> K["k8s"]
  G --> C["ci"]
  D --> C`,
      },
      notes: [
        "Mermaid renders this on GitHub and in most Markdown viewers; `-->` is directed, `---` would be undirected.",
        "In an undirected reading, `ci -> git -> terminal -> docker -> ci` closes a loop, so union-find would report a cycle while Kahn would report none. Direction changes the answer, so write it down.",
      ],
    },
    {
      title: "Represent, then traverse: BFS levels and DFS order",
      text: [
        "Build the same graph twice - once as a dict of lists, once as a packed byte matrix - then run BFS and DFS over the list. BFS reports hops from `web`; DFS reports the order it dives. The grid at the bottom is the existing shortest-path check: BFS returns 13 moves.",
      ],
      code: {
        lang: "python",
        file: "represent.py",
        code: `import sys, timeit
from collections import deque

nodes = ["api", "cache", "cdn", "db", "web"]
edges = [("api", "db"), ("api", "cache"), ("web", "api"), ("web", "cdn"), ("cdn", "api")]
index = {n: i for i, n in enumerate(nodes)}
V = len(nodes)
adj: dict[str, list[str]] = {n: [] for n in nodes}
matrix = [bytearray(V) for _ in range(V)]
for a, b in edges:
    adj[a].append(b); adj[b].append(a)
    matrix[index[a]][index[b]] = matrix[index[b]][index[a]] = 1

def bfs_levels(graph, src):
    level, order, q = {src: 0}, [], deque([src])
    while q:
        node = q.popleft(); order.append(node)
        for nb in sorted(graph[node]):
            if nb not in level:
                level[nb] = level[node] + 1; q.append(nb)
    return order, level

def dfs_order(graph, src):
    seen, order, stack = {src}, [], [src]
    while stack:
        node = stack.pop(); order.append(node)
        for nb in sorted(graph[node], reverse=True):
            if nb not in seen:
                seen.add(nb); stack.append(nb)
    return order

def maze_hops(grid):
    rows, cols = len(grid), len(grid[0])
    start = next((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == "S")
    q, seen = deque([(start, 0)]), {start}
    while q:
        (r, c), d = q.popleft()
        if grid[r][c] == "E":
            return d
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in seen:
                seen.add((nr, nc)); q.append(((nr, nc), d + 1))
    return -1

order, level = bfs_levels(adj, "web")
print("BFS order:      ", order)
print("BFS levels:     ", level)
print("DFS pre-order:  ", dfs_order(adj, "web"))
print("maze hops:      ", maze_hops(["S.#.....", ".##.###.", "....#..E"]))
list_bytes = sys.getsizeof(adj) + sum(sys.getsizeof(v) for v in adj.values())
matrix_bytes = sys.getsizeof(matrix) + sum(sys.getsizeof(r) for r in matrix)
print("stored entries: ", 2 * len(edges), "in lists vs", V * V, "in matrix")
print("container bytes:", list_bytes, "vs", matrix_bytes)

CHECK, CELL, n = "'db' in adj['api']", "matrix[index['api']][index['db']] == 1", 200_000
list_ns = timeit.timeit(CHECK, globals=globals(), number=n) / n * 1e9
matrix_ns = timeit.timeit(CELL, globals=globals(), number=n) / n * 1e9
print(f"edge check:      list {list_ns:.0f} ns, matrix {matrix_ns:.0f} ns (timings vary)")
big_v, big_e = 1000, 2000
print(f"V=1000, E=2000:  packed matrix {big_v * big_v:,} B vs list slots {2 * big_e * 8:,} B (estimate)")`,
      },
      output: "BFS order:       ['web', 'api', 'cdn', 'cache', 'db']\nBFS levels:      {'web': 0, 'api': 1, 'cdn': 1, 'cache': 2, 'db': 2}\nDFS pre-order:   ['web', 'api', 'cache', 'db', 'cdn']\nmaze hops:       13\nstored entries:  10 in lists vs 25 in matrix\ncontainer bytes: 624 vs 430\nedge check:      list 21 ns, matrix 45 ns (timings vary)\nV=1000, E=2000:  packed matrix 1,000,000 B vs list slots 32,000 B (estimate)",
      notes: [
        "BFS levels are the point: `api` and `cdn` are one hop from `web`, while `cache` and `db` are two. DFS pre-order gives `web, api, cache, db, cdn` - it dives to `cache`/`db` before returning for `cdn`, so its position says nothing about distance.",
        "The timings are real but vary by run (a second run gave 20 ns and 43 ns). Python's constant factors hide the asymptotics here: a 4-element list scan beats bytearray indexing. The matrix wins only when a node has many neighbours, or in a language where both are primitive array accesses.",
        "`container bytes: 624 vs 430` looks like the matrix is smaller, and for a 5-node graph the fixed overhead dominates. Scale changes the story: at V = 1,000 and E = 2,000 the packed matrix needs V^2 = 1,000,000 bytes while the list slots need 2E pointers = 32,000 bytes. The estimate ignores per-list and per-string overhead, so real list memory is higher - but still linear in E.",
        "The grid result `13` is unchanged from the original sample: BFS explores by distance, so the first time it steps on `E` is the minimum number of moves. Mark cells when enqueuing; marking on pop lets the queue grow with duplicates.",
      ],
    },
    {
      title: "Order and cycles: Kahn, colour DFS, and union-find",
      text: [
        "Kahn's algorithm produces the study order and names the nodes left over when a cycle exists. The same file then answers the undirected question with union-find: an edge whose endpoints already share a root closes a cycle, and the roots are the connected components.",
      ],
      code: {
        lang: "python",
        file: "order.py",
        code: `from collections import deque

def study_order(prereqs):
    nodes = set(prereqs) | {p for ps in prereqs.values() for p in ps}
    indegree = dict.fromkeys(nodes, 0)
    unlocks = {n: [] for n in nodes}
    for lesson, ps in prereqs.items():
        for p in ps:
            unlocks[p].append(lesson); indegree[lesson] += 1
    q = deque(sorted(n for n in nodes if indegree[n] == 0))
    order = []
    while q:
        n = q.popleft(); order.append(n)
        for nxt in sorted(unlocks[n]):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    if len(order) < len(nodes):
        raise ValueError(f"cycle involving: {sorted(n for n in nodes if indegree[n] > 0)}")
    return order

class DSU:
    def __init__(self):
        self.parent, self.rank = {}, {}

    def find(self, x):
        self.parent.setdefault(x, x); self.rank.setdefault(x, 0)
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1

def has_undirected_cycle(pairs):
    dsu = DSU()
    for a, b in pairs:
        if dsu.find(a) == dsu.find(b):
            return True
        dsu.union(a, b)
    return False

print(study_order({"git": ["terminal"], "docker": ["terminal"], "k8s": ["docker"], "ci": ["git", "docker"]}))
try:
    study_order({"a": ["c"], "b": ["a"], "c": ["b"]})
except ValueError as e:
    print(e)

print("triangle cycle:", has_undirected_cycle([("a", "b"), ("b", "c"), ("c", "a")]))
print("chain:", has_undirected_cycle([("a", "b"), ("b", "c"), ("c", "d")]))
logins = [("alice", "dev1"), ("bob", "dev1"), ("bob", "dev2"), ("carol", "dev3"), ("dave", "dev2")]
dsu = DSU()
for user, device in logins:
    dsu.union(user, "device:" + device)
groups = {}
for user in sorted({u for u, _ in logins}):
    groups.setdefault(dsu.find(user), []).append(user)
print(sorted(groups.values()))`,
      },
      output: "['terminal', 'docker', 'git', 'k8s', 'ci']\ncycle involving: ['a', 'b', 'c']\ntriangle cycle: True\nchain: False\n[['alice', 'bob', 'dave'], ['carol']]",
      notes: [
        "`docker` appears before `git` because both are ready after `terminal` and the queue is sorted; `k8s` waits for `docker`, and `ci` waits for both. Kahn's output is valid but not unique - a different tie-break is still a correct study order.",
        "The three-node directed cycle never reaches in-degree 0, so only `a, b, c` are left with positive in-degree. The error names them; the challenge homework returns the exact edge path instead.",
        "Union-find answers a different question from Kahn. `a-b-c-a` closes a triangle, so the third edge is rejected as a cycle; a chain has no cycle. The account groups come from the same roots: `alice`, `bob` and `dave` share devices, `carol` is alone. No graph traversal was needed after the unions.",
        "Path compression happens inside `find` (`parent[x] = self.find(parent[x])`), and union by rank keeps the trees shallow. Both are needed for the near-constant amortised bound; either alone is still fast in practice but weaker in theory.",
      ],
    },
    {
      title: "Dijkstra with a heap, and the negative edge that breaks it",
      text: [
        "Dijkstra on the region-latency graph gives the cheapest route from Mumbai. The second half is the counterexample that matters in interviews: a negative edge makes Dijkstra settle a node too early and under-report the distance, silently. Bellman-Ford gives the true values on the same edges.",
      ],
      code: {
        lang: "python",
        file: "dijkstra.py",
        code: `import heapq

def dijkstra(graph, src):
    dist, heap = {src: 0}, [(0, src)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float("inf")):
            continue
        for nxt, w in graph.get(node, []):
            nd = d + w
            if nd < dist.get(nxt, float("inf")):
                dist[nxt] = nd; heapq.heappush(heap, (nd, nxt))
    return dist

# latency in ms between regions
net = {"mumbai": [("singapore", 60), ("frankfurt", 120)],
       "singapore": [("tokyo", 70), ("frankfurt", 160)],
       "frankfurt": [("virginia", 90)], "tokyo": [("virginia", 150)]}
print(dijkstra(net, "mumbai"))

def dijkstra_finalized(graph, src):
    dist, heap, done = {src: 0}, [(0, src)], set()
    while heap:
        d, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        for nxt, w in graph.get(node, []):
            if nxt in done:                      # a "settled" node is never revisited
                continue
            nd = d + w
            if nd < dist.get(nxt, float("inf")):
                dist[nxt] = nd; heapq.heappush(heap, (nd, nxt))
    return dist

def bellman_ford(nodes, edges, src):
    dist = {n: float("inf") for n in nodes}
    dist[src] = 0
    for _ in range(len(nodes) - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist

bad = {"s": [("a", 1), ("b", 5)], "a": [("c", 100)], "b": [("a", -10)]}
bad_edges = [("s", "a", 1), ("s", "b", 5), ("b", "a", -10), ("a", "c", 100)]
print("dijkstra + negative edge:", dijkstra_finalized(bad, "s"))
print("true shortest:           ", bellman_ford(["s", "a", "b", "c"], bad_edges, "s"))`,
      },
      output: "{'mumbai': 0, 'singapore': 60, 'frankfurt': 120, 'tokyo': 130, 'virginia': 210}\ndijkstra + negative edge: {'s': 0, 'a': 1, 'b': 5, 'c': 101}\ntrue shortest:            {'s': 0, 'a': -5, 'b': 5, 'c': 95}",
      notes: [
        "The Mumbai result is unchanged from the original sample: Frankfurt at 120, then Virginia at 210 via Frankfurt (120 + 90). Tokyo is 130 via Singapore, and its Virginia edge (130 + 150 = 280) loses to the Frankfurt route.",
        "In the negative example the true distance to `a` is -5 (s to b 5, then -10) and to `c` is 95. Dijkstra settles `a` at 1 first because `s -> a` is cheap, then refuses to revisit it, so `c` keeps 101. No exception, no warning - the classic silent failure.",
        "Skipping stale heap entries is not the same as a settled set. The first implementation would eventually relax `a` again and find -5 here, but that is luck, not a guarantee; with a finalized set the invariant is explicit and the wrong answer is reproducible. The precondition is non-negative weights, full stop.",
        "Bellman-Ford relaxes every edge V - 1 times, so it finds -5 and 95 at O(V * E). If a further pass still improves a distance, the graph has a negative cycle and shortest paths are undefined.",
      ],
    },
  ],
  companies: [
    "**Python's `graphlib.TopologicalSorter` (verified in this lesson):** the standard library implements the same Kahn-style scheduling for dependency graphs. Running it on these prerequisites printed `['terminal', 'git', 'docker', 'k8s', 'ci']` - a valid order with a different tie-break from the sorted queue in the hands-on, which is the point: topological order is not unique. If you need deterministic output for tests, sort your own ready set.",
    "**DevAtlas itself (verified in this lesson):** the capstone validates the real curriculum with Kahn's algorithm and fails on unknown ids, duplicates or cycles, naming the exact path. The same gate runs in CI, so a content edit that introduces a cycle cannot ship a lesson that can never be unlocked.",
    "**Build systems and schedulers (illustrative):** Make, Bazel, npm, Terraform's resource graph and Airflow DAGs all run a topological sort over dependencies and fail loudly on cycles. Their error messages tend to name the cycle (`a depends on b depends on a`) because that is the only actionable form; the algorithm is the same one in the capstone.",
    "**Maps and network routing (illustrative):** routing engines at Google Maps, OSRM and similar projects run Dijkstra or A* (Dijkstra plus a distance heuristic) over road graphs with millions of nodes. Production systems precompute contraction hierarchies or transit-node tables because a plain heap Dijkstra on a continent-sized graph is correct but too slow for interactive queries.",
    "**Fraud and identity graphs (illustrative):** payment and social platforms union accounts that share a device, card, phone number or address, then inspect the resulting components for rings. Union-find fits because the evidence arrives incrementally; a daily DFS over a static snapshot answers the same question but has to be recomputed whenever a new link appears.",
  ],
  mistakes: [
    { mistake: "No visited set", why: "Tree habits", wrong: "Infinite loops on cycles and exponential work on graphs with many paths", fix: "Track visited/seen for every graph traversal, including DFS" },
    { mistake: "Marking visited when popping in BFS", why: "It seems equivalent to marking on enqueue", wrong: "Nodes are enqueued many times; memory and time blow up on dense graphs", fix: "Mark when enqueuing, so each node is in the queue at most once" },
    { mistake: "Using BFS for weighted shortest paths", why: "BFS 'finds shortest paths'", wrong: "Fewest edges is not lowest total weight; a 2-hop route can cost more than a 3-hop route", fix: "Dijkstra for non-negative weights; 0-1 BFS when weights are only 0 and 1" },
    { mistake: "Dijkstra with negative edges", why: "Not knowing the precondition", wrong: "Wrong distances with no error, because a node is settled before a cheaper path exists", fix: "Bellman-Ford for negative edges; detect negative cycles with one extra pass" },
    { mistake: "Recursive DFS on a huge graph", why: "Elegant code", wrong: "RecursionError at about 1,000 frames on a long chain", fix: "Iterative DFS with an explicit stack and a visited set" },
    { mistake: "Treating the parent edge as a cycle in an undirected graph", why: "Every visited neighbour looks like a repeat", wrong: "Every tree edge is reported as a cycle, so the detector is useless", fix: "Skip the parent you arrived from, or use union-find: same root means a real cycle" },
    { mistake: "Union-find without path compression or rank", why: "The basic version is shorter", wrong: "Parent chains can become long lists, so find degrades toward O(V) per call", fix: "Compress paths in find and attach the shorter tree under the taller root" },
    { mistake: "Building an adjacency matrix for a sparse graph", why: "The O(1) edge lookup sounds strictly better", wrong: "O(V^2) memory and O(V^2) traversal on a graph with millions of nodes but few edges", fix: "Adjacency list unless the graph is genuinely dense or edge queries dominate" },
    { mistake: "Forgetting that direction is part of the model", why: "Edges look symmetric in a sketch", wrong: "A valid DAG is reported as a cycle, or a reachable node looks unreachable", fix: "Write down directed or undirected before coding; draw the arrows" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Build the adjacency list in one place and keep traversal code independent of how the input arrives; tests then cover the graph, not the parser." },
    { tag: "Reliability", text: "Validate DAGs (configs, pipelines, prerequisites) when they are saved, and report the nodes and the edge path in the cycle, not just 'cycle detected'." },
    { tag: "Performance", text: "Use adjacency lists for sparse graphs and a packed structure (array, CSR, numpy) for dense ones; a dict-of-lists is convenient but has real per-object overhead." },
    { tag: "Reliability", text: "Sort neighbours and ready nodes so output is deterministic; topological orders and DFS orders are otherwise tie-break dependent and make flaky tests." },
    { tag: "Cost", text: "Match the algorithm to the question: O(V + E) BFS/DFS instead of O(V * E) Bellman-Ford, and one union-find pass instead of recomputing components after every edge." },
  ],
  interview: [
    { q: "How do you choose between BFS, DFS and Dijkstra?", a: "Start from the question and the edge weights. Fewest edges in an unweighted graph: BFS, because the queue finalises nodes in non-decreasing distance, so first arrival is shortest. Reachability, connected components, cycle detection or a dependency order: DFS (or BFS), because distance is irrelevant and the traversal order carries the information you need. Cheapest path with non-negative weights: Dijkstra, because the heap extends the cheapest known route and settling is safe. Negative weights: Bellman-Ford. All three traversals visit each node and edge once, so BFS and DFS are O(V + E); Dijkstra is O((V + E) log V) with a binary heap, dominated by heap operations and edge relaxations." },
    { q: "How do you detect a cycle in a directed graph, and how is it different in an undirected graph?", a: "Directed: Kahn's algorithm removes zero-in-degree nodes; if fewer than V are removed, the remainder is in a cycle, though it does not give the path. A colour DFS returns a path: keep white (unvisited), grey (on the current stack) and black (finished); an edge to a grey node is a back edge, and slicing the current path from that node produces the cycle. Undirected: an edge back to an already-visited neighbour is only a cycle if that neighbour is not your parent, because the parent edge is the one you just traversed. Union-find is cleaner: process edges and report a cycle when both endpoints already have the same root. The distinction matters because direction changes which subgraphs are cycles at all." },
    { q: "What is union-find good for, and when is DFS better?", a: "Union-find maintains connectivity as edges arrive: find with path compression and union by rank give near-constant amortised operations, which is ideal for dynamic connectivity, Kruskal's minimum spanning tree, percolation and grouping accounts that share devices. DFS is better for a static snapshot: one O(V + E) pass labels every component and can also return the actual paths or detect cycles, without the bookkeeping of unions. Use union-find when queries are interleaved with updates; use DFS when you have the whole graph once and need structure, not just a yes/no." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Fewest moves for a knight between two squares on a chessboard. Which algorithm?",
      options: ["DFS", "BFS", "Dijkstra with random weights", "Sorting"],
      answer: 1,
      explanation: "Each move costs the same; BFS gives the minimum number of moves because it exhausts every shorter path first.",
    },
    {
      kind: "mcq",
      prompt: "Kahn's algorithm processed 8 of 10 nodes and the queue is empty. What does that mean?",
      options: ["The graph is disconnected", "There is a cycle among the remaining nodes", "The graph is a tree", "Two nodes have no edges"],
      answer: 1,
      explanation: "Remaining nodes never reach in-degree 0 because they depend on each other.",
    },
    {
      kind: "bug",
      prompt: "This BFS takes forever on a large grid. Why?",
      code: { lang: "python", code: "while q:\n    cell = q.popleft()\n    if cell in seen: continue\n    seen.add(cell)\n    for n in neighbours(cell):\n        q.append(n)" },
      options: ["popleft is slow", "Cells are added to the queue many times before being marked seen", "neighbours returns too few cells", "BFS cannot run on grids"],
      answer: 1,
      explanation: "Mark cells as seen when enqueuing to keep each cell in the queue at most once.",
    },
  ],
  cheatSheet: [
    "Adjacency list: dict[node, list[neighbour]] or list[(neighbour, weight)]; O(V + E) memory, O(degree) edge check.",
    "Adjacency matrix: V x V, O(V^2) memory, O(1) edge check; only for dense graphs or constant edge queries.",
    "BFS (queue) = fewest edges; mark seen on enqueue; level[n] = level[parent] + 1.",
    "DFS (stack/recursion) = reachability, components, cycles, pre/post order; not a distance order.",
    "Directed cycle: colour DFS (grey back edge) or Kahn leftovers. Undirected cycle: skip the parent, or union-find.",
    "Topological sort (Kahn): in-degree 0 queue; leftovers = cycle; order is valid but not unique.",
    "Dijkstra: min-heap, skip stale entries, non-negative weights, O((V + E) log V).",
    "Negative weights: Bellman-Ford O(V * E); a negative cycle makes shortest paths undefined.",
    "Union-find: find with path compression + union by rank; ~O(1) amortised; Kruskal and dynamic connectivity.",
    "Every traversal is O(V + E); a matrix turns that into O(V^2) because it scans absent edges too.",
  ],
  homework: {
    basic: {
      title: "Number of islands",
      brief: [
        "Count connected groups of '1's in a grid (up/down/left/right). Solve with BFS or iterative DFS, and return 0 for an empty grid.",
        "Then explain in two sentences why this is a graph traversal even though no adjacency list appears: each cell is a node and each side-by-side pair of land cells is an edge.",
      ],
      criteria: ["Each cell visited once", "Iterative (no recursion limit issues)", "Tests with empty grid and all-water grid", "States the implicit-graph model"],
      hints: ["Scan every cell; when you find an unvisited '1', flood-fill it and count one island.", "A flood fill is just a traversal that never leaves its component."],
      solution: {
        text: [
          "Each flood fill marks a whole island, so the count of fills is the answer. O(rows x cols) time and O(rows x cols) worst-case space for the stack and seen set.",
          "The grid is an implicit adjacency-list graph: neighbours are computed from coordinates, so storing an edge list would be wasted memory. The flood fill never crosses water, which is exactly why it stays inside one component.",
        ],
        code: {
          lang: "python",
          code: `def islands(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen: set[tuple[int, int]] = set()
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                stack = [(r, c)]; seen.add((r, c))
                while stack:
                    cr, cc = stack.pop()
                    for nr, nc in ((cr+1, cc), (cr-1, cc), (cr, cc+1), (cr, cc-1)):
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and (nr, nc) not in seen:
                            seen.add((nr, nc)); stack.append((nr, nc))
    return count

assert islands(["11000", "11000", "00100", "00011"]) == 3
assert islands([]) == 0
print(islands(["11000", "11000", "00100", "00011"]))
print(islands([]))`,
        },
        output: "3\n0",
        pitfalls: ["Recursing on a large all-land grid and hitting the recursion limit", "Forgetting the empty-grid guard, so grid[0] raises IndexError"],
      },
    },
    intermediate: {
      title: "Reconstruct the route",
      brief: [
        "Extend Dijkstra to also return the path to a target (e.g. mumbai to virginia), by recording each node's predecessor whenever its distance improves.",
        "Explain why the predecessor recorded on the final improvement is the one on the shortest path, and what happens if the target is unreachable.",
      ],
      criteria: ["Predecessor map maintained on every improvement", "Path rebuilt from target back to source and reversed", "Handles unreachable targets", "States the unreachable result explicitly"],
      hints: ["prev[nxt] = node whenever dist[nxt] improves.", "If the target is never added to dist, there is no path; do not invent one."],
      solution: {
        text: [
          "Walk prev from the target back to the source and reverse. Each stored predecessor belongs to the currently best known path, so after the algorithm finishes the chain is the shortest path.",
          "If the target is not in dist it was never reached. Returning `(None, [])` forces the caller to handle that case instead of receiving a path through a node that does not exist.",
        ],
        code: {
          lang: "python",
          code: `import heapq

def route(graph, src, dst):
    dist, prev, heap = {src: 0}, {}, [(0, src)]
    while heap:
        d, node = heapq.heappop(heap)
        if node == dst:
            break
        if d > dist[node]:
            continue
        for nxt, w in graph.get(node, []):
            if d + w < dist.get(nxt, float("inf")):
                dist[nxt], prev[nxt] = d + w, node
                heapq.heappush(heap, (d + w, nxt))
    if dst not in dist:
        return None, []
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    return dist[dst], path[::-1]

net = {"mumbai": [("singapore", 60), ("frankfurt", 120)], "singapore": [("tokyo", 70)],
       "frankfurt": [("virginia", 90)], "tokyo": [("virginia", 150)]}
assert route(net, "mumbai", "virginia") == (210, ["mumbai", "frankfurt", "virginia"])
print(route(net, "mumbai", "virginia"))`,
        },
        output: "(210, ['mumbai', 'frankfurt', 'virginia'])",
        pitfalls: ["Breaking on the first pop of the target: safe for distance, but stop only after the heap is empty if you also need distances to every other node", "Reconstructing the path forward from the source, which has no successor pointer"],
      },
    },
    challenge: {
      title: "Detect cycles with DFS colours",
      brief: [
        "Implement cycle detection for a directed graph with iterative DFS and three colours, and return one actual cycle path (e.g. ['a', 'c', 'b', 'a']) for a helpful error message.",
        "Then adapt the reasoning to an undirected graph: explain why the colour test alone over-reports cycles there, and what extra rule or data structure fixes it.",
      ],
      criteria: ["Iterative DFS", "Returns a concrete cycle", "O(V + E)", "Explains the undirected difference"],
      hints: ["Keep the current DFS path; when you meet a GREY node, the cycle is the path from that node to the end.", "In an undirected graph, the parent edge points back at you. Skip it, or use union-find."],
      solution: {
        text: [
          "GREY means 'on the current path'. Meeting a GREY neighbour closes a loop; slice the current path from that node. BLACK nodes are finished and safe to skip, which is what keeps the work at O(V + E).",
          "In an undirected graph, every tree edge would look like a back edge because the parent is already visited. Skipping the parent fixes the simple case; parallel edges need edge ids, and union-find sidesteps the issue by reporting a cycle exactly when an edge joins two nodes that already share a root.",
        ],
        code: {
          lang: "python",
          code: `def find_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    WHITE, GREY, BLACK = 0, 1, 2
    color = {n: WHITE for n in set(graph) | {m for ns in graph.values() for m in ns}}
    for start in sorted(color):
        if color[start] != WHITE:
            continue
        path, stack = [], [(start, iter(sorted(graph.get(start, []))))]
        color[start] = GREY; path.append(start)
        while stack:
            node, it = stack[-1]
            nxt = next(it, None)
            if nxt is None:
                color[node] = BLACK; path.pop(); stack.pop()
            elif color[nxt] == GREY:
                return path[path.index(nxt):] + [nxt]
            elif color[nxt] == WHITE:
                color[nxt] = GREY; path.append(nxt)
                stack.append((nxt, iter(sorted(graph.get(nxt, [])))))
    return None

assert find_cycle({"a": ["b"], "b": ["c"], "c": ["a"]}) == ["a", "b", "c", "a"]
assert find_cycle({"a": ["b"], "b": ["c"]}) is None
print(find_cycle({"a": ["b"], "b": ["c"], "c": ["a"]}))
print(find_cycle({"a": ["b"], "b": ["c"]}))`,
        },
        output: "['a', 'b', 'c', 'a']\nNone",
        pitfalls: ["Reporting only that a cycle exists when the caller needs the path", "Using recursion on a long chain and hitting Python's recursion limit"],
      },
    },
    capstone: {
      title: "DevAtlas: prerequisite graph validation",
      brief: [
        "Add a `prerequisites` field to lessons in your DevAtlas data, generate the study order with topological sort, and fail the content test suite with the exact cycle if one exists.",
        "Keep the validation deterministic and O(V + E): validate ids first, then order, then report the concrete cycle path. Wire it into CI so a bad content edit cannot merge.",
        "Bonus: add the inverse query - given a lesson, list every lesson it unlocks - and explain why that is a BFS over the reversed edge set.",
      ],
      criteria: ["Order respects every prerequisite", "CI fails on cycles with a readable path", "Unit tests for both outcomes", "Unknown and duplicate ids rejected before ordering"],
      hints: ["Reuse study_order and find_cycle.", "A typo in a prerequisite id is not a cycle; validate ids before running Kahn so the error message is accurate."],
      solution: {
        text: [
          "`validate` checks the content in three steps: duplicate ids, prerequisites that point to lessons that do not exist, then Kahn's `study_order` from the lesson. Kahn's algorithm only tells you that a cycle exists, so on failure it calls the challenge's `find_cycle` to build a readable message such as `prerequisite cycle: a requires c requires b requires a`. Everything is O(V + E), plus sorting for deterministic output.",
          "`test_real_curriculum_is_a_dag` is the CI gate: it loads `content/lessons.json`, asserts that every prerequisite comes before its lesson in the order, and fails the build with the exact cycle. DevAtlas lesson files store prerequisites as strings like \"2.3.1 Trees, BSTs and heaps\", so the export takes the id before the first space. Other tests cover a 3-lesson cycle, a lesson that requires itself, unknown and duplicate ids, empty input and loading from a file.",
          "The inverse query is a BFS on the reversed graph: start at the lesson, follow edges backwards to everything that depends on it, and collect nodes by level. It is the same traversal as forward reachability, which is why one generic adjacency list plus a direction flag covers both directions.",
          "Run from services/ai: `python -m devatlas_ai.curriculum` prints the output below, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/curriculum.py", code: `"""Validate lesson prerequisites: unknown ids and cycles fail with a readable message."""
import json
from collections import Counter, deque
from pathlib import Path
from typing import Any

class CurriculumError(ValueError):
    pass

def study_order(prereqs: dict[str, list[str]]) -> list[str]:
    """Kahn's algorithm from the lesson: O(V + E) plus sorting for deterministic output."""
    nodes = set(prereqs) | {p for ps in prereqs.values() for p in ps}
    indegree = {n: 0 for n in nodes}
    unlocks: dict[str, list[str]] = {n: [] for n in nodes}
    for lesson, ps in prereqs.items():
        for p in ps:
            unlocks[p].append(lesson)
            indegree[lesson] += 1
    q = deque(sorted(n for n in nodes if indegree[n] == 0))
    order: list[str] = []
    while q:
        n = q.popleft()
        order.append(n)
        for nxt in sorted(unlocks[n]):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    if len(order) < len(nodes):
        cycle = find_cycle(prereqs) or []
        raise CurriculumError("prerequisite cycle: " + " requires ".join(cycle))
    return order

def find_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    """Iterative three-colour DFS from the challenge. Returns e.g. ['a', 'c', 'b', 'a']."""
    WHITE, GREY, BLACK = 0, 1, 2
    color = {n: WHITE for n in set(graph) | {m for ns in graph.values() for m in ns}}
    for start in sorted(color):
        if color[start] != WHITE:
            continue
        path, stack = [start], [(start, iter(sorted(graph.get(start, []))))]
        color[start] = GREY
        while stack:
            node, it = stack[-1]
            nxt = next(it, None)
            if nxt is None:
                color[node] = BLACK; path.pop(); stack.pop()
            elif color[nxt] == GREY:
                return path[path.index(nxt):] + [nxt]
            elif color[nxt] == WHITE:
                color[nxt] = GREY; path.append(nxt)
                stack.append((nxt, iter(sorted(graph.get(nxt, [])))))
    return None

def validate(lessons: list[dict[str, Any]]) -> list[str]:
    """lessons: [{"id": "2.3.2", "prerequisites": ["2.3.1"]}, ...]. Returns the study order."""
    ids = [lesson["id"] for lesson in lessons]
    dupes = sorted(i for i, n in Counter(ids).items() if n > 1)     # O(V), not ids.count in a loop
    if dupes:
        raise CurriculumError(f"duplicate lesson ids: {dupes}")
    known = set(ids)
    prereqs = {lesson["id"]: list(lesson.get("prerequisites", [])) for lesson in lessons}
    unknown = sorted(f"{lid} -> {p}" for lid, ps in prereqs.items() for p in ps if p not in known)
    if unknown:
        raise CurriculumError(f"unknown prerequisites: {unknown}")
    return study_order(prereqs)

def load_lessons(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))

if __name__ == "__main__":
    lessons: list[dict[str, Any]] = [{"id": "2.1.1", "prerequisites": ["1.1.1"]}, {"id": "1.1.1"},
               {"id": "2.3.2", "prerequisites": ["2.3.1", "2.1.1"]},
               {"id": "2.3.1", "prerequisites": ["2.1.1"]}]
    print(validate(lessons))
    lessons[1]["prerequisites"] = ["2.3.2"]           # introduce a cycle
    try:
        validate(lessons)
    except CurriculumError as e:
        print(e)

# ---- services/ai/tests/test_curriculum.py ----
import json
from pathlib import Path
from typing import Any

import pytest

from devatlas_ai.curriculum import CurriculumError, load_lessons, validate

CONTENT = Path(__file__).parent.parent / "content" / "lessons.json"

def test_real_curriculum_is_a_dag() -> None:
    """The CI gate: fails the build with the exact cycle if someone adds one."""
    lessons = load_lessons(CONTENT)
    order = validate(lessons)
    position = {lid: i for i, lid in enumerate(order)}
    for lesson in lessons:                             # every prerequisite comes first
        for p in lesson.get("prerequisites", []):
            assert position[p] < position[lesson["id"]]

def test_cycle_message_names_the_path() -> None:
    lessons: list[dict[str, Any]] = [{"id": "a", "prerequisites": ["c"]}, {"id": "b", "prerequisites": ["a"]},
               {"id": "c", "prerequisites": ["b"]}, {"id": "d"}]
    with pytest.raises(CurriculumError, match=r"^prerequisite cycle: a requires c requires b requires a$"):
        validate(lessons)

def test_self_prerequisite_is_a_cycle() -> None:
    with pytest.raises(CurriculumError, match="a requires a"):
        validate([{"id": "a", "prerequisites": ["a"]}])

def test_unknown_and_duplicate_ids() -> None:
    with pytest.raises(CurriculumError, match="unknown prerequisites: \\\\['b -> zz'\\\\]"):
        validate([{"id": "b", "prerequisites": ["zz"]}])
    with pytest.raises(CurriculumError, match="duplicate"):
        validate([{"id": "a"}, {"id": "a"}])

def test_empty_and_independent_lessons() -> None:
    assert validate([]) == []
    assert validate([{"id": "b"}, {"id": "a"}]) == ["a", "b"]      # deterministic

def test_load_from_file(tmp_path: Path) -> None:
    f = tmp_path / "lessons.json"
    f.write_text(json.dumps([{"id": "x"}, {"id": "y", "prerequisites": ["x"]}]))
    assert validate(load_lessons(f)) == ["x", "y"]

# ---- services/ai/content/lessons.json ----
[
  {"id": "1.1.1", "title": "Python essentials"},
  {"id": "2.1.1", "title": "Big-O and hash maps", "prerequisites": ["1.1.1"]},
  {"id": "2.1.2", "title": "Two pointers and sliding window", "prerequisites": ["2.1.1"]},
  {"id": "2.2.1", "title": "Stacks, queues and linked lists", "prerequisites": ["2.1.2"]},
  {"id": "2.2.2", "title": "Recursion, sorting and binary search", "prerequisites": ["2.2.1"]},
  {"id": "2.3.1", "title": "Trees, BSTs and heaps", "prerequisites": ["2.2.2"]},
  {"id": "2.3.2", "title": "Graphs: BFS, DFS, Dijkstra, union-find", "prerequisites": ["2.3.1"]},
  {"id": "2.3.3", "title": "Tries", "prerequisites": ["2.3.1"]}
]` },
        output: "['1.1.1', '2.1.1', '2.3.1', '2.3.2']\nprerequisite cycle: 1.1.1 requires 2.3.2 requires 2.1.1 requires 1.1.1",
        pitfalls: [
          "Reporting only 'cycle detected': content authors need the exact path to fix it.",
          "Silently ignoring unknown prerequisite ids: a typo like '2.3.l' leaves a lesson looking unlocked.",
          "Letting duplicate ids through: two lessons share a key, so one silently overwrites the other in a dict.",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: graphlib.TopologicalSorter", url: "https://docs.python.org/3/library/graphlib.html" },
    { label: "Visualgo: graph traversal", url: "https://visualgo.net/en/dfsbfs" },
    { label: "LeetCode: Graph problems", url: "https://leetcode.com/tag/graph/" },
    { label: "Wikipedia: Dijkstra's algorithm", url: "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm" },
    { label: "cp-algorithms: Disjoint Set Union", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" },
    { label: "Wikipedia: Topological sorting", url: "https://en.wikipedia.org/wiki/Topological_sorting" },
  ],
  nextPreview: "Next: tries, the tree behind autocomplete and prefix search.",
};
