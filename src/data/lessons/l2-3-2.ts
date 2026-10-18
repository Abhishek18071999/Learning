import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.3.2",
  title: "Graphs: BFS, DFS, Dijkstra, union-find",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["2.3.1 Trees, BSTs and heaps"],
  summary: "Model problems as graphs, choose the right representation, and apply BFS (shortest hops), DFS (reachability, cycles, topological order), Dijkstra (weighted shortest paths) and union-find (connectivity).",
  terms: [
    { term: "Graph", def: "Nodes (vertices) connected by edges. Edges can be directed (one-way) or undirected, weighted or unweighted." },
    { term: "Adjacency list", def: "For each node, the list of its neighbours. The usual representation: O(V + E) memory." },
    { term: "Topological order", def: "An ordering of a directed acyclic graph (DAG) where every edge goes from earlier to later, e.g. prerequisites before lessons." },
    { term: "Cycle", def: "A path that returns to its start. A course whose prerequisites form a cycle can never be completed." },
    { term: "Dijkstra", def: "Shortest paths from one source in a graph with non-negative weights, using a priority queue." },
    { term: "Union-find (disjoint set)", def: "A structure that tracks which items are in the same group, with near-O(1) union and find operations." },
  ],
  problem: [
    "DevAtlas lessons have prerequisites. The roadmap must show a valid study order, and the content team must be warned if someone accidentally creates a cycle ('A needs B, B needs C, C needs A').",
    "Other real questions: 'How many hops between two services in our call graph?' 'What is the cheapest route between two cities?' 'Which user accounts are linked by shared devices (fraud rings)?' All are graph problems; the hard part is noticing it. Once you see nodes and edges, a handful of algorithms covers most needs.",
  ],
  concept: {
    analogy: [
      "A graph is a **city map**: intersections are nodes, roads are edges, one-way streets are directed edges, and travel time is the weight. BFS explores like ripples in a pond, ring by ring. DFS is exploring a maze by always taking the next unexplored corridor and backtracking at dead ends. Dijkstra is a GPS always extending the currently cheapest known route.",
    ],
    precise: [
      "**Represent** with an adjacency list (dict of lists) for most problems. Grids are implicit graphs: each cell's neighbours are up/down/left/right.",
      "**BFS** (queue) finds shortest paths in **unweighted** graphs: the first time you reach a node is via the fewest edges. **DFS** (stack/recursion) answers reachability, finds connected components and cycles, and produces topological order.",
      "**Topological sort** (Kahn's algorithm): repeatedly take nodes with no remaining prerequisites (in-degree 0). If some nodes are never taken, there is a cycle.",
      "**Dijkstra**: pop the node with the smallest known distance from a min-heap, relax its edges, repeat. O((V + E) log V). Requires non-negative weights. **Union-find** with path compression and union by rank answers 'are these connected?' as edges arrive.",
      "**Always track visited nodes**: graphs, unlike trees, can loop back.",
    ],
  },
  underTheHood: {
    text: [
      "BFS and DFS each visit every node and edge once: O(V + E). An adjacency matrix (V×V) costs O(V²) memory and is only worth it for dense graphs or constant-time edge checks.",
      "Dijkstra is correct because, with non-negative weights, the smallest tentative distance in the heap can never be improved later. A negative edge breaks that guarantee (use Bellman-Ford instead). We push duplicates and skip stale heap entries rather than implementing decrease-key.",
      "Union-find stores a parent pointer per item. find follows parents to the root (and compresses the path); union attaches one root under the other. With both optimisations, operations are effectively constant time (inverse Ackermann).",
    ],
    diagram: {
      title: "Kahn's topological sort",
      nodes: [
        { label: "Count in-degrees", sub: "prereqs per lesson" },
        { label: "Queue in-degree 0", sub: "no prereqs" },
        { label: "Pop, append to order", sub: "" },
        { label: "Decrement neighbours", sub: "enqueue new zeros" },
        { label: "len(order) < V ?", sub: "→ cycle!" },
      ],
      edges: ["", "", "", "until empty"],
    },
  },
  handsOn: [
    {
      title: "Prerequisites: topological order and cycle detection",
      code: {
        lang: "python",
        file: "prereqs.py",
        code: `from collections import deque

def study_order(prereqs: dict[str, list[str]]) -> list[str]:
    """prereqs[lesson] = lessons that must come first. Raises on cycles."""
    nodes = set(prereqs) | {p for ps in prereqs.values() for p in ps}
    indegree = {n: 0 for n in nodes}
    unlocks: dict[str, list[str]] = {n: [] for n in nodes}
    for lesson, ps in prereqs.items():
        for p in ps:
            unlocks[p].append(lesson)
            indegree[lesson] += 1
    q = deque(sorted(n for n in nodes if indegree[n] == 0))
    order = []
    while q:
        n = q.popleft()
        order.append(n)
        for nxt in sorted(unlocks[n]):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                q.append(nxt)
    if len(order) < len(nodes):
        stuck = sorted(n for n in nodes if indegree[n] > 0)
        raise ValueError(f"cycle involving: {stuck}")
    return order

print(study_order({"git": ["terminal"], "docker": ["terminal"], "k8s": ["docker"], "ci": ["git", "docker"]}))
try:
    study_order({"a": ["c"], "b": ["a"], "c": ["b"]})
except ValueError as e:
    print(e)`,
      },
      output: "['terminal', 'docker', 'git', 'k8s', 'ci']\ncycle involving: ['a', 'b', 'c']",
    },
    {
      title: "BFS: fewest hops on a grid",
      code: {
        lang: "python",
        file: "grid.py",
        code: `from collections import deque

def shortest_path(grid: list[str]) -> int:
    """S to E moving up/down/left/right; '#' is a wall. -1 if unreachable."""
    rows, cols = len(grid), len(grid[0])
    start = next((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == "S")
    q = deque([(start, 0)])
    seen = {start}
    while q:
        (r, c), d = q.popleft()
        if grid[r][c] == "E":
            return d
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in seen:
                seen.add((nr, nc))              # mark when enqueuing, not when popping
                q.append(((nr, nc), d + 1))
    return -1

maze = ["S.#.....",
        ".##.###.",
        "....#..E"]
print(shortest_path(maze))`,
      },
      output: "13",
    },
    {
      title: "Dijkstra: cheapest route",
      code: {
        lang: "python",
        file: "dijkstra.py",
        code: `import heapq

def dijkstra(graph: dict[str, list[tuple[str, int]]], src: str) -> dict[str, int]:
    dist = {src: 0}
    heap = [(0, src)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float("inf")):
            continue                              # stale entry
        for nxt, w in graph.get(node, []):
            nd = d + w
            if nd < dist.get(nxt, float("inf")):
                dist[nxt] = nd
                heapq.heappush(heap, (nd, nxt))
    return dist

# latency in ms between regions
net = {
    "mumbai": [("singapore", 60), ("frankfurt", 120)],
    "singapore": [("tokyo", 70), ("frankfurt", 160)],
    "frankfurt": [("virginia", 90)],
    "tokyo": [("virginia", 150)],
}
print(dijkstra(net, "mumbai"))`,
      },
      output: "{'mumbai': 0, 'singapore': 60, 'frankfurt': 120, 'tokyo': 130, 'virginia': 210}",
    },
    {
      title: "Union-find: linked accounts",
      code: {
        lang: "python",
        file: "dsu.py",
        code: `class DSU:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}
        self.rank: dict[str, int] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x); self.rank.setdefault(x, 0)
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])     # path compression
        return self.parent[x]

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                                # union by rank
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1

# accounts that logged in from the same device are linked
logins = [("alice", "dev1"), ("bob", "dev1"), ("bob", "dev2"), ("carol", "dev3"), ("dave", "dev2")]
dsu = DSU()
for user, device in logins:
    dsu.union(user, "device:" + device)

groups: dict[str, list[str]] = {}
for user in sorted({u for u, _ in logins}):
    groups.setdefault(dsu.find(user), []).append(user)
print(sorted(groups.values()))`,
      },
      output: "[['alice', 'bob', 'dave'], ['carol']]",
    },
  ],
  companies: [
    "**Build systems and schedulers** (Make, Bazel, CI pipelines, Airflow DAGs, Terraform's resource graph, npm installs) all run a topological sort over dependencies and fail loudly on cycles.",
    "**Maps and networks**: routing (Dijkstra/A* variants with heuristics and precomputation), CDN and network path selection, and service dependency maps in observability tools.",
    "**Fraud and identity**: union-find and connected components over shared devices, cards and addresses reveal account rings; recommendation systems traverse 'people who bought X also bought Y' graphs.",
  ],
  mistakes: [
    { mistake: "No visited set", why: "Tree habits", wrong: "Infinite loops on cycles; exponential work", fix: "Track visited/seen for every graph traversal" },
    { mistake: "Marking visited when popping in BFS", why: "Seems equivalent", wrong: "Nodes are enqueued many times; memory and time blow up", fix: "Mark when enqueuing" },
    { mistake: "Using BFS for weighted shortest paths", why: "BFS 'finds shortest paths'", wrong: "Fewest edges ≠ lowest total weight", fix: "Dijkstra for non-negative weights; 0-1 BFS for weights 0/1" },
    { mistake: "Dijkstra with negative edges", why: "Not knowing the precondition", wrong: "Wrong distances with no error", fix: "Bellman-Ford, or rethink the model" },
    { mistake: "Recursive DFS on huge graphs", why: "Elegant code", wrong: "RecursionError", fix: "Iterative DFS with an explicit stack" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Build the adjacency list in one place; keep algorithms independent of how input arrives." },
    { tag: "Reliability", text: "Validate DAGs (configs, pipelines, prerequisites) on save and report the nodes in the cycle." },
    { tag: "Performance", text: "Adjacency lists for sparse graphs; precompute when the same queries repeat." },
    { tag: "Reliability", text: "Make output deterministic (sort neighbours) so results and tests are stable." },
  ],
  interview: [
    { q: "How do you detect a cycle in a directed graph?", a: "Kahn's algorithm: if the topological sort cannot include all nodes, there is a cycle. Or DFS with three colours (unvisited, in progress, done): reaching an in-progress node means a back edge, which is a cycle." },
    { q: "When BFS and when Dijkstra?", a: "BFS for unweighted graphs (or all weights equal): first arrival is shortest. Dijkstra for non-negative weights, using a min-heap of tentative distances. Negative weights need Bellman-Ford." },
    { q: "What is union-find good for?", a: "Dynamic connectivity: merging groups as edges arrive and checking whether two items are in the same group, in near-constant time. Uses include Kruskal's minimum spanning tree, connected components, and grouping linked accounts." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Fewest moves for a knight between two squares on a chessboard. Which algorithm?",
      options: ["DFS", "BFS", "Dijkstra with random weights", "Sorting"],
      answer: 1,
      explanation: "Each move costs the same; BFS gives the minimum number of moves.",
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
    "Adjacency list: dict[node, list[neighbour]].",
    "BFS (queue) = fewest edges; mark seen on enqueue.",
    "DFS (stack/recursion) = reachability, components, cycles.",
    "Topological sort (Kahn): in-degree 0 queue; leftovers = cycle.",
    "Dijkstra: min-heap, skip stale entries, non-negative weights.",
    "Union-find: find with path compression, union by rank.",
    "All traversals O(V + E).",
  ],
  homework: {
    basic: {
      title: "Number of islands",
      brief: ["Count connected groups of '1's in a grid (up/down/left/right). Solve with BFS or iterative DFS."],
      criteria: ["Each cell visited once", "Iterative (no recursion limit issues)", "Tests with empty grid and all-water grid"],
      hints: ["Scan every cell; when you find an unvisited '1', flood-fill it and count one island."],
      solution: {
        text: ["Each flood fill marks a whole island, so the count of fills is the answer. O(rows × cols)."],
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
assert islands([]) == 0`,
        },
      },
    },
    intermediate: {
      title: "Reconstruct the route",
      brief: ["Extend dijkstra to also return the path to a target (e.g. mumbai → virginia), by recording each node's predecessor."],
      criteria: ["Predecessor map maintained on every improvement", "Path rebuilt from target back to source", "Handles unreachable targets"],
      hints: ["prev[nxt] = node whenever dist[nxt] improves."],
      solution: {
        text: ["Walk prev from the target back to the source and reverse."],
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
assert route(net, "mumbai", "virginia") == (210, ["mumbai", "frankfurt", "virginia"])`,
        },
      },
    },
    challenge: {
      title: "Detect cycles with DFS colours",
      brief: ["Implement cycle detection for a directed graph with iterative DFS and three colours, and return one actual cycle path (e.g. ['a', 'c', 'b', 'a']) for a helpful error message."],
      criteria: ["Iterative DFS", "Returns a concrete cycle", "O(V + E)"],
      hints: ["Keep the current DFS path; when you meet a GREY node, the cycle is the path from that node to the end."],
      solution: {
        text: ["GREY means 'on the current path'. Meeting a GREY neighbour closes a loop; slice the current path from that node."],
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
assert find_cycle({"a": ["b"], "b": ["c"]}) is None`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: prerequisite graph validation",
      brief: ["Add a `prerequisites` field to lessons in your DevAtlas data, generate the study order with topological sort, and fail the content test suite with the exact cycle if one exists."],
      criteria: ["Order respects every prerequisite", "CI fails on cycles with a readable path", "Unit tests for both outcomes"],
      hints: ["Reuse study_order and find_cycle."],
      solution: {
        text: [
          "`validate` checks the content in three steps: duplicate ids, prerequisites that point to lessons that do not exist, then Kahn's `study_order` from the lesson. Kahn's algorithm only tells you that a cycle exists, so on failure it calls the challenge's `find_cycle` to build a readable message such as `prerequisite cycle: a requires c requires b requires a`. Everything is O(V + E), plus sorting for deterministic output.",
          "`test_real_curriculum_is_a_dag` is the CI gate: it loads `content/lessons.json`, asserts that every prerequisite comes before its lesson in the order, and fails the build with the exact cycle. DevAtlas lesson files store prerequisites as strings like \"2.3.1 Trees, BSTs and heaps\", so the export takes the id before the first space. Other tests cover a 3-lesson cycle, a lesson that requires itself, unknown and duplicate ids, empty input and loading from a file.",
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
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: graphlib.TopologicalSorter", url: "https://docs.python.org/3/library/graphlib.html" },
    { label: "Visualgo: graph traversal", url: "https://visualgo.net/en/dfsbfs" },
    { label: "LeetCode: Graph problems", url: "https://leetcode.com/tag/graph/" },
  ],
  nextPreview: "Next: tries, the tree behind autocomplete and prefix search.",
};
