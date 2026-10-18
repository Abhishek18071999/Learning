import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.3.1",
  title: "Trees, BSTs and heaps",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["2.2.2 Recursion, sorting and binary search"],
  summary: "Traverse trees with DFS and BFS, use binary search trees and understand why balance matters, and solve 'top K' and scheduling problems with heaps.",
  terms: [
    { term: "Tree", def: "Nodes connected parent → children with one root and no cycles. File systems, HTML DOM, org charts and JSON are trees." },
    { term: "Binary tree", def: "Each node has at most two children: left and right." },
    { term: "BST", def: "Binary search tree: everything in a node's left subtree is smaller, everything in the right subtree is larger." },
    { term: "Height", def: "The number of edges on the longest path from root to a leaf. Operations on a BST cost O(height)." },
    { term: "DFS / BFS", def: "Depth-first search goes deep along a branch first (recursion or a stack); breadth-first search visits level by level (a queue)." },
    { term: "Heap", def: "A tree stored in an array where each parent is ≤ its children (min-heap). The smallest item is always at index 0. Python: heapq." },
    { term: "Priority queue", def: "A queue that always returns the highest-priority item next, usually implemented with a heap." },
  ],
  problem: [
    "The DevAtlas curriculum is a tree: phases contain modules contain lessons. The UI needs total minutes per phase (a DFS), a breadcrumb trail (path from root), and 'show me everything at level 2' (a BFS).",
    "The news service ingests 50,000 stories a day and needs the top 10 by score at any time. Sorting everything every time is O(n log n); a heap of size 10 does it in O(n log 10). The job scheduler needs 'run the job with the earliest deadline next': a priority queue.",
  ],
  concept: {
    analogy: [
      "A **BST** is a 'higher or lower' game built into a structure: at each node you go left for smaller, right for larger. A **heap** is a tournament bracket where the winner (the smallest or largest) is always at the top, but the rest of the bracket is only partly ordered, which is why it is cheap to maintain.",
    ],
    precise: [
      "**Traversals**: preorder (node, then children), inorder (left, node, right; on a BST this visits values in sorted order), postorder (children, then node; used to compute sizes and totals), level order (BFS with a queue).",
      "**BST** lookup/insert/delete are O(h). A balanced tree has h ≈ log n; inserting sorted data into a plain BST makes it a linked list with h = n. Production code uses self-balancing trees (red-black, AVL) or B-trees (databases), which keep h = O(log n).",
      "**Heaps** support push and pop of the minimum in O(log n) and peek in O(1). heapify builds a heap from a list in O(n). 'Top K largest' keeps a min-heap of size K: if a new item beats the smallest of the K, replace it. Total O(n log K).",
    ],
  },
  underTheHood: {
    text: [
      "A heap is stored as an array: for index i, children are at 2i+1 and 2i+2 and the parent at (i-1)//2. push appends and 'sifts up' swapping with the parent; pop moves the last item to the root and 'sifts down'. Each sift walks one root-to-leaf path: O(log n).",
      "heapq is a min-heap. For a max-heap, push negated priorities, or push tuples like (-score, id). Tuples compare element by element, so include a tie-breaker to avoid comparing objects that are not comparable.",
      "Recursion depth for DFS equals tree height. A balanced tree with a million nodes has height about 20; a degenerate one has height a million, which overflows Python's recursion limit, so iterative traversal with an explicit stack is safer for untrusted input.",
    ],
    diagram: {
      title: "Min-heap as an array: [1, 3, 2, 7, 4]",
      nodes: [
        { label: "i=0: 1", sub: "root (minimum)" },
        { label: "i=1: 3 · i=2: 2", sub: "children of 0" },
        { label: "i=3: 7 · i=4: 4", sub: "children of 1" },
        { label: "children of i", sub: "2i+1, 2i+2" },
      ],
      edges: ["", "", ""],
    },
  },
  handsOn: [
    {
      title: "The curriculum as a tree: DFS totals and paths",
      code: {
        lang: "python",
        file: "tree.py",
        code: `from dataclasses import dataclass, field

@dataclass
class Node:
    name: str
    minutes: int = 0
    children: list["Node"] = field(default_factory=list)

course = Node("DevAtlas", children=[
    Node("Phase 0", children=[Node("0.1.1", 50), Node("0.1.2", 60)]),
    Node("Phase 2", children=[
        Node("2.1", children=[Node("2.1.1", 70), Node("2.1.2", 70)]),
        Node("2.3.1", 80),
    ]),
])

def total(n: Node) -> int:                          # postorder: children first
    return n.minutes + sum(total(c) for c in n.children)

def path_to(n: Node, target: str) -> list[str] | None:   # DFS with backtracking
    if n.name == target:
        return [n.name]
    for c in n.children:
        p = path_to(c, target)
        if p:
            return [n.name, *p]
    return None

print(total(course), total(course.children[1]))
print(" > ".join(path_to(course, "2.1.2")))`,
      },
      output: "330 220\nDevAtlas > Phase 2 > 2.1 > 2.1.2",
    },
    {
      title: "BFS: level by level",
      code: {
        lang: "python",
        code: `from collections import deque

def levels(root: Node) -> list[list[str]]:
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):              # exactly the nodes of this level
            n = q.popleft()
            level.append(n.name)
            q.extend(n.children)
        out.append(level)
    return out

for depth, names in enumerate(levels(course)):
    print(depth, names)`,
      },
      output: "0 ['DevAtlas']\n1 ['Phase 0', 'Phase 2']\n2 ['0.1.1', '0.1.2', '2.1', '2.3.1']\n3 ['2.1.1', '2.1.2']",
    },
    {
      title: "A binary search tree, and why balance matters",
      code: {
        lang: "python",
        file: "bst.py",
        code: `class BST:
    def __init__(self) -> None:
        self.root = None                      # node = [key, left, right]

    def insert(self, key: int) -> None:
        if self.root is None:
            self.root = [key, None, None]; return
        n = self.root
        while True:
            side = 1 if key < n[0] else 2
            if n[side] is None:
                n[side] = [key, None, None]; return
            n = n[side]

    def inorder(self) -> list[int]:
        out, stack, n = [], [], self.root
        while stack or n:                     # iterative: no recursion limit issues
            while n:
                stack.append(n); n = n[1]
            n = stack.pop(); out.append(n[0]); n = n[2]
        return out

    def height(self) -> int:
        def h(n): return -1 if n is None else 1 + max(h(n[1]), h(n[2]))
        return h(self.root)

import random
balanced_ish, sorted_input = BST(), BST()
keys = list(range(500))
for k in random.sample(keys, len(keys)): balanced_ish.insert(k)
for k in keys: sorted_input.insert(k)
print(balanced_ish.inorder()[:5], balanced_ish.height() < 40)
print("sorted input height:", sorted_input.height())`,
      },
      output: "[0, 1, 2, 3, 4] True\nsorted input height: 499",
      notes: ["Random insertion order usually gives a height around 2–3× log₂ n (log₂ 500 ≈ 9). Sorted input gives a 'tree' that is really a linked list: every lookup becomes O(n). That is why databases and standard libraries use balanced trees."],
    },
    {
      title: "Heaps: top K and a scheduler",
      code: {
        lang: "python",
        file: "heaps.py",
        code: `import heapq

scores = [("rust-2024", 320), ("k8s-tips", 95), ("pg-18", 410), ("css-grid", 60), ("llm-evals", 280)]

def top_k(items: list[tuple[str, int]], k: int) -> list[tuple[str, int]]:
    heap: list[tuple[int, str]] = []                 # min-heap of (score, id), size <= k
    for story, score in items:
        if len(heap) < k:
            heapq.heappush(heap, (score, story))
        elif score > heap[0][0]:                     # beats the weakest of the top k
            heapq.heapreplace(heap, (score, story))
    return [(s, sc) for sc, s in sorted(heap, reverse=True)]

print(top_k(scores, 3))
print(heapq.nlargest(3, scores, key=lambda x: x[1]))   # built-in equivalent

# Priority queue: earliest deadline first
jobs = [(30, "send digest"), (5, "refresh feeds"), (15, "rebuild index")]
heapq.heapify(jobs)                                   # O(n)
while jobs:
    deadline, name = heapq.heappop(jobs)
    print(deadline, name)`,
      },
      output: "[('pg-18', 410), ('rust-2024', 320), ('llm-evals', 280)]\n[('pg-18', 410), ('rust-2024', 320), ('llm-evals', 280)]\n5 refresh feeds\n15 rebuild index\n30 send digest",
    },
  ],
  companies: [
    "**B-trees in every database index** (lesson 5.1.1) and **tries/radix trees** in routers and autocomplete. File systems and the browser DOM are trees you traverse daily.",
    "**Priority queues** run schedulers (OS process scheduling, Kubernetes pod priority, job queues with delays), Dijkstra's shortest path in maps (next lesson), and 'top N' features like trending lists.",
    "**Streaming top-K**: analytics pipelines compute 'top 100 products this hour' with bounded heaps per partition and merge the partial results, never sorting the full stream.",
  ],
  mistakes: [
    { mistake: "Assuming a BST is always O(log n)", why: "Textbooks show balanced pictures", wrong: "Sorted inserts create O(n) height and slow lookups", fix: "Use balanced trees or library sorted containers; shuffle when building test trees" },
    { mistake: "Sorting everything for top K", why: "sorted(...)[:k] is one line", wrong: "O(n log n) time and O(n) memory for large or streaming data", fix: "heapq.nlargest or a bounded min-heap: O(n log k)" },
    { mistake: "Recursion on deep trees", why: "Recursive DFS is the natural form", wrong: "RecursionError on degenerate or untrusted input", fix: "Iterative DFS with an explicit stack" },
    { mistake: "Pushing incomparable objects into heapq", why: "Equal priorities fall back to comparing the next tuple element", wrong: "TypeError when two dicts are compared", fix: "Use (priority, counter, item) with an increasing counter as a tie-breaker" },
    { mistake: "Confusing heap order with sorted order", why: "heap[0] is the minimum, so the list looks sorted", wrong: "Iterating the heap list gives a non-sorted order", fix: "Pop repeatedly (or sort) to get sorted output" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Top K over large data: bounded heap; small data: just sort." },
    { tag: "Reliability", text: "Iterative traversals for input you do not control; add a depth limit for recursive parsing (JSON, XML bombs)." },
    { tag: "Maintainability", text: "Write traversals once as generators (yield nodes) and reuse them." },
    { tag: "Reliability", text: "Add tie-breakers to heap entries for deterministic ordering." },
  ],
  interview: [
    { q: "DFS vs BFS on a tree?", a: "DFS goes deep first using recursion or a stack; memory is O(height); good for path questions and computing subtree values. BFS goes level by level with a queue; memory is O(width); good for 'nearest' or level-based questions, like minimum depth." },
    { q: "How do you find the K largest elements in a stream?", a: "Maintain a min-heap of size K. For each element, if the heap has fewer than K items push it; otherwise if it is larger than the heap's minimum, replace the minimum. O(n log K) time, O(K) memory." },
    { q: "Why do databases use B-trees rather than binary search trees?", a: "Disk and memory pages are large. B-trees store many keys per node, so the tree is very shallow (often 3–4 levels for millions of rows), minimising page reads, and they stay balanced on inserts and deletes." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which traversal of a BST returns values in sorted order?",
      options: ["Preorder", "Inorder", "Postorder", "Level order"],
      answer: 1,
      explanation: "Left subtree (smaller), node, right subtree (larger).",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: { lang: "python", code: "import heapq\nh = [5, 1, 8, 3]\nheapq.heapify(h)\nprint(heapq.heappop(h), heapq.heappop(h))" },
      options: ["5 1", "1 3", "1 5", "8 5"],
      answer: 1,
      explanation: "heapq is a min-heap: pops return 1, then 3.",
    },
    {
      kind: "mcq",
      prompt: "Inserting 1, 2, 3, …, n into an unbalanced BST gives what height?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 2,
      explanation: "Every new key goes to the right: the tree degenerates into a list.",
    },
  ],
  cheatSheet: [
    "DFS: recursion/stack, O(h) memory. BFS: queue, level by level.",
    "Pre/in/post order; inorder of BST = sorted.",
    "BST ops O(h); balanced h = log n, degenerate h = n.",
    "heapq: min-heap; heappush/heappop O(log n), heapify O(n).",
    "Max-heap: push -priority. Tie-breaker: (prio, counter, item).",
    "Top K: min-heap of size K → O(n log K).",
    "Deep trees: iterative traversal.",
  ],
  homework: {
    basic: {
      title: "Max depth and minimum depth",
      brief: ["For the curriculum tree (or any n-ary tree), compute max depth with DFS and minimum depth (distance to the nearest leaf) with BFS. Explain why BFS is better for minimum depth."],
      criteria: ["Both functions correct", "BFS stops at the first leaf", "Explanation"],
      hints: ["A leaf has no children."],
      solution: {
        text: ["BFS reaches the shallowest leaf first and can stop immediately; DFS might explore a very deep branch before finding a shallow leaf."],
        code: {
          lang: "python",
          code: `from collections import deque

def max_depth(n) -> int:
    return 0 if not n.children else 1 + max(max_depth(c) for c in n.children)

def min_depth(root) -> int:
    q = deque([(root, 0)])
    while q:
        n, d = q.popleft()
        if not n.children:
            return d
        q.extend((c, d + 1) for c in n.children)
    return 0`,
        },
      },
    },
    intermediate: {
      title: "Validate a BST",
      brief: ["Given a binary tree of [key, left, right] nodes, return whether it is a valid BST. A common wrong answer only compares each node with its direct children; show a tree where that fails."],
      criteria: ["Passes min/max bounds down the recursion (or uses inorder)", "Counterexample for the naive approach"],
      hints: ["Every node in the left subtree must be less than ALL its ancestors it is left of."],
      solution: {
        text: ["Counterexample: root 10, left child 5, and 5's right child 15. Each parent-child pair looks fine but 15 is in 10's left subtree."],
        code: {
          lang: "python",
          code: `def is_bst(n, lo=float("-inf"), hi=float("inf")) -> bool:
    if n is None:
        return True
    key, left, right = n
    return lo < key < hi and is_bst(left, lo, key) and is_bst(right, key, hi)

bad = [10, [5, None, [15, None, None]], [20, None, None]]
good = [10, [5, None, [7, None, None]], [20, None, None]]
assert not is_bst(bad) and is_bst(good)`,
        },
      },
    },
    challenge: {
      title: "Merge K sorted lists",
      brief: ["Merge K sorted lists (e.g. per-source news lists sorted by time) into one sorted list in O(N log K), where N is the total number of items."],
      criteria: ["Heap holds at most K entries", "Correct with empty lists", "Complexity explained"],
      hints: ["Push the first element of each list as (value, list_index, element_index)."],
      solution: {
        text: ["The heap always holds the current smallest candidate from each list; each of the N pops/pushes costs O(log K). heapq.merge does this lazily as a built-in."],
        code: {
          lang: "python",
          code: `import heapq

def merge_k(lists: list[list[int]]) -> list[int]:
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out

assert merge_k([[1, 4, 7], [2, 5], [], [0, 9]]) == [0, 1, 2, 4, 5, 7, 9]
assert list(heapq.merge([1, 4, 7], [2, 5], [0, 9])) == [0, 1, 2, 4, 5, 7, 9]`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: trending news with a bounded heap",
      brief: ["Add `TrendingTracker(k)` to the AI service: `add(story_id, score)` and `top()` returning the k best, using a bounded min-heap. Handle score updates for an existing story (hint: lazy deletion or rebuild)."],
      criteria: ["O(log k) add", "Duplicate story ids handled", "Tests"],
      hints: ["Keep a dict of current scores; when popping, skip heap entries whose score no longer matches (lazy deletion)."],
      solution: {
        text: [
          "The heap holds the top k as (score, -seq, story_id) entries, so `heap[0]` is the weakest story in the top k. A new story either fills a free slot or replaces the weakest if it beats it: O(log k). A higher score for a story already in the top k pushes a fresh entry and leaves the old one stale; `_live` records which entry is current, so stale entries are skipped when they surface (lazy deletion) and compacted once the heap exceeds 2k entries, which keeps it O(k) in size.",
          "A lower score for a story inside the top k is the one case lazy deletion cannot handle: a story evicted earlier may now deserve the slot. That path rebuilds the top k from the full score dict with heapq.nlargest, O(n log k), which is why the tracker keeps every story's latest score (O(n) memory). If trending scores only grow within a time bucket, the rebuild never runs.",
          "Ties go to the story that reached its score first (the sequence number), so `top()` is deterministic. The main test replays 15,000 random adds and updates and compares every `top()` with a brute-force sort. Run from services/ai: `python -m devatlas_ai.trending` prints the output below, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/trending.py", code: `"""Trending stories: a bounded min-heap of the top k, with lazy deletion for score updates."""
import heapq
import itertools


class TrendingTracker:
    """Keeps the k highest-scoring stories. Ties: the story that reached its score first ranks higher.

    - _scores: latest (score, seq) per story. O(n) memory, needed so a story that falls out of the
      top k can be replaced by the right one.
    - _heap: min-heap of (score, -seq, story_id). The weakest top-k entry is at _heap[0].
    - _live: story_id -> seq of its current heap entry. Any other entry is stale (lazy deletion).
    Invariant: the live entries are exactly the top min(k, n) stories.
    """

    def __init__(self, k: int) -> None:
        if k < 1:
            raise ValueError("k must be >= 1")
        self.k = k
        self._scores: dict[str, tuple[int, int]] = {}
        self._heap: list[tuple[int, int, str]] = []
        self._live: dict[str, int] = {}
        self._seq = itertools.count()

    def _is_live(self, entry: tuple[int, int, str]) -> bool:
        return self._live.get(entry[2]) == -entry[1]

    def _drop_stale_top(self) -> None:
        while self._heap and not self._is_live(self._heap[0]):
            heapq.heappop(self._heap)

    def _push(self, story_id: str) -> None:
        score, seq = self._scores[story_id]
        heapq.heappush(self._heap, (score, -seq, story_id))   # O(log heap)
        self._live[story_id] = seq

    def _rebuild(self) -> None:
        """O(n log k): recompute the top k from all scores. Only needed when a top story drops."""
        best = heapq.nlargest(self.k, self._scores.items(), key=lambda kv: (kv[1][0], -kv[1][1]))
        self._heap = [(score, -seq, sid) for sid, (score, seq) in best]
        heapq.heapify(self._heap)
        self._live = {sid: seq for sid, (_, seq) in best}

    def add(self, story_id: str, score: int) -> None:
        """New story or score update. O(log k) amortised; O(n log k) if a top-k score decreases."""
        old = self._scores.get(story_id)
        if old is not None and old[0] == score:
            return                                  # unchanged: keep its place in tie order
        self._scores[story_id] = (score, next(self._seq))
        if story_id in self._live:
            if old is not None and score < old[0]:
                self._rebuild()                     # it may now lose to a story outside the heap
            else:
                self._push(story_id)                # old entry becomes stale
        elif len(self._live) < self.k:
            self._push(story_id)
        else:
            self._drop_stale_top()
            weakest_score, weakest_neg_seq, weakest_id = self._heap[0]
            if (score, -self._scores[story_id][1]) > (weakest_score, weakest_neg_seq):
                heapq.heappop(self._heap)
                del self._live[weakest_id]
                self._push(story_id)
        if len(self._heap) > 2 * self.k:            # too many stale entries: compact to O(k)
            self._heap = [e for e in self._heap if self._is_live(e)]
            heapq.heapify(self._heap)

    def top(self) -> list[tuple[str, int]]:
        """Best first. O(k log k)."""
        live = sorted((e for e in self._heap if self._is_live(e)), reverse=True)
        return [(sid, score) for score, _, sid in live]


if __name__ == "__main__":
    t = TrendingTracker(k=3)
    for story, score in [("rust-2024", 320), ("k8s-tips", 95), ("pg-18", 410),
                         ("css-grid", 60), ("llm-evals", 280)]:
        t.add(story, score)
    print(t.top())
    t.add("k8s-tips", 500)          # update an existing story upward
    t.add("pg-18", 10)              # a top story drops out: llm-evals comes back
    print(t.top())

# ---- services/ai/tests/test_trending.py ----
import random

import pytest

from devatlas_ai.trending import TrendingTracker


def reference_top(scores: dict[str, tuple[int, int]], k: int) -> list[tuple[str, int]]:
    order = sorted(scores.items(), key=lambda kv: (-kv[1][0], kv[1][1]))
    return [(sid, s) for sid, (s, _) in order[:k]]


def test_basic_top_k_and_fewer_than_k() -> None:
    t = TrendingTracker(k=3)
    assert t.top() == []
    t.add("a", 5)
    assert t.top() == [("a", 5)]
    for sid, s in [("b", 9), ("c", 1), ("d", 7)]:
        t.add(sid, s)
    assert t.top() == [("b", 9), ("d", 7), ("a", 5)]


def test_duplicate_ids_update_instead_of_appearing_twice() -> None:
    t = TrendingTracker(k=2)
    t.add("a", 5); t.add("b", 4); t.add("a", 6)
    assert t.top() == [("a", 6), ("b", 4)]
    t.add("c", 3); t.add("a", 1)                     # a falls out, c returns
    assert t.top() == [("b", 4), ("c", 3)]


def test_ties_keep_the_earlier_story() -> None:
    t = TrendingTracker(k=1)
    t.add("first", 10); t.add("second", 10); t.add("first", 10)   # re-adding same score is a no-op
    assert t.top() == [("first", 10)]


def test_heap_stays_bounded() -> None:
    t = TrendingTracker(k=5)
    for i in range(10_000):
        t.add(f"s{i % 50}", i)                        # constant upward updates
    assert len(t._heap) <= 2 * t.k + 1


def test_matches_brute_force_on_random_operations() -> None:
    rng = random.Random(1)
    for _ in range(50):
        k = rng.randint(1, 5)
        t, seq = TrendingTracker(k), 0
        scores: dict[str, tuple[int, int]] = {}
        for _ in range(300):
            sid, score = f"s{rng.randint(0, 15)}", rng.randint(0, 30)
            t.add(sid, score)
            if scores.get(sid, (None,))[0] != score:
                scores[sid] = (score, seq); seq += 1
            assert t.top() == reference_top(scores, k)


def test_invalid_k() -> None:
    with pytest.raises(ValueError):
        TrendingTracker(0)` },
        output: "[('pg-18', 410), ('rust-2024', 320), ('llm-evals', 280)]\n[('k8s-tips', 500), ('rust-2024', 320), ('llm-evals', 280)]",
        pitfalls: [
          "Pushing a new entry for an updated story without tracking which entry is current: the same story appears twice in the top k.",
          "Ignoring score decreases: with a plain bounded heap, a story that drops keeps its slot, and the true next-best story never comes back.",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: heapq", url: "https://docs.python.org/3/library/heapq.html" },
    { label: "Visualgo: BST, AVL and heaps (visualisations)", url: "https://visualgo.net/en/bst" },
    { label: "LeetCode: Tree problems", url: "https://leetcode.com/tag/tree/" },
  ],
  nextPreview: "Next: graphs. Model real problems as nodes and edges, then solve them with BFS, DFS, Dijkstra and union-find.",
};
