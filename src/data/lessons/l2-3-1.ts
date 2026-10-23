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
    { term: "Binary tree", def: "Each node has at most two children: left and right. The shape - not the number of nodes - decides most of the cost." },
    { term: "Leaf", def: "A node with no children. Every root-to-leaf path ends at a leaf; height and minimum-depth questions are really questions about leaves." },
    { term: "Height", def: "The number of edges on the longest path from root to a leaf. A single node has height 0, an empty tree -1, and operations on a BST cost O(height)." },
    { term: "BST", def: "Binary search tree: everything in a node's left subtree is smaller, everything in the right subtree is larger. Search, insert and delete all walk one root-to-leaf path." },
    { term: "Balanced vs degenerate", def: "A balanced tree keeps height O(log n) as nodes are added; a degenerate one has one child per node, height n-1, and behaves like a linked list. Sorted inserts into a plain BST produce the degenerate shape." },
    { term: "DFS", def: "Depth-first search goes deep along a branch before backtracking, using recursion or an explicit stack. Preorder, inorder and postorder differ only in when the node itself is visited." },
    { term: "BFS / level order", def: "Breadth-first search visits every node at depth d before any node at depth d+1, using a queue. Memory is O(width), and the first leaf found is a nearest leaf." },
    { term: "Heap", def: "A complete binary tree where each parent is ≤ its children (min-heap) or ≥ them (max-heap). The extreme value is always at the root, so peek is O(1). Python: heapq." },
    { term: "Complete tree", def: "Every level is full except possibly the last, which is filled left to right. Completeness is why a heap fits a plain array with no gaps and no child pointers." },
    { term: "Priority queue", def: "A queue that always returns the highest-priority item next, usually implemented with a heap. Push and pop are O(log n), peek O(1)." },
    { term: "Sorted map", def: "An ordered dictionary backed by a balanced search tree, skip list or B-tree. Keys iterate in order and search/insert/delete are O(log n): Java TreeMap, C++ std::map, .NET SortedDictionary." },
  ],
  problem: [
    "The DevAtlas curriculum is a tree: phases contain modules contain lessons. The UI needs total minutes per phase (a DFS), a breadcrumb trail (path from root), and 'show me everything at level 2' (a BFS). Pick the wrong traversal and the code still runs, but it answers a different question or holds far more memory than it needs.",
    "The news service ingests 50,000 stories a day and needs the top 10 by score at any time. Sorting everything every time is O(n log n) and needs the whole stream in memory; a heap of size 10 does it in O(n log 10) and can run on a generator. The job scheduler needs 'run the job with the earliest deadline next': a priority queue. The same few shapes - a node with children, a search path, a heap - answer most of these questions, and choosing the wrong one turns a one-second job into a one-hour job.",
  ],
  concept: {
    analogy: [
      "A **BST** is a 'higher or lower' game built into a structure: at each node you go left for smaller, right for larger. A **heap** is a tournament bracket where the winner (the smallest or largest) is always at the top, but the rest of the bracket is only partly ordered, which is why it is cheap to maintain.",
      "A **sorted map** is a library shelf kept in call-number order: finding a book means halving the shelf each time, but keeping it ordered after every donation takes work, so libraries use a scheme that stays ordered cheaply (a balanced tree). A **heap** is the opposite trade: an inbox where you only guarantee the top envelope is the most urgent; you never know the order of the rest, but adding and removing is cheap.",
    ],
    precise: [
      "**Traversals**: preorder (node, then children), inorder (left, node, right; on a BST this visits values in sorted order), postorder (children, then node; used to compute sizes and totals), level order (BFS with a queue). DFS uses O(height) memory; BFS uses O(width). The order is not cosmetic: it decides which question the walk can answer.",
      "**BST**: every key in a node's left subtree is smaller and every key in its right subtree is larger. Search compares once per level and moves left or right; insert follows the same path and attaches a leaf; delete has three cases (no child, one child, two children, where the node is replaced by its inorder successor). All three cost O(h). A balanced tree has h ≈ log n; inserting sorted data into a plain BST makes it a linked list with h = n.",
      "Production code uses self-balancing trees (red-black, AVL) or B-trees (databases), which keep h = O(log n) through rotations and rebalancing. AVL trees are more tightly balanced; red-black trees do fewer rotations on writes and are what many standard libraries ship as sorted maps. In Python, use `bisect` on a sorted list for read-heavy data, or the `sortedcontainers` package when you need a real ordered map.",
      "**Heaps** are complete trees with the heap property, stored in an array. Push and pop of the minimum (or maximum) are O(log n), peek is O(1), and heapify builds a heap from a list in O(n). 'Top K largest' keeps a min-heap of size K: if a new item beats the smallest of the K, replace it. Total O(n log K), memory O(K), and the input can be a stream.",
    ],
  },
  underTheHood: {
    text: [
      "**Nodes and height.** A binary tree node holds a value and at most two child pointers. Height is the number of edges on the longest path down: a leaf has height 0 and an empty tree -1. A perfect tree of height h has 2^(h+1)-1 nodes, so h = log2(n+1)-1. Balance is about shape, not node count: a balanced tree keeps every root-to-leaf path within a constant factor of the shortest. A degenerate tree has one child per node and height n-1, so a 'tree' can be a linked list with extra pointers.",
      "**DFS and its three orders.** DFS follows one branch to a leaf, then backtracks. Visit the node before its children → preorder (copy, serialize, prefix expressions); between left and right → inorder (BST gives sorted order); after both children → postorder (subtree totals, sizes, deleting or freeing a tree). Recursion uses the call stack; an explicit stack makes the walk iterative and avoids Python's recursion limit. Memory is O(h), which is tiny for a balanced tree and O(n) for a degenerate one.",
      "**BFS and level order.** BFS uses a FIFO queue. Process a node, enqueue its children; to keep levels separate, record the queue length at the start of each level and pop exactly that many nodes. BFS visits nodes in nondecreasing depth, so the first leaf it meets is a minimum-depth leaf, and the first time it reaches a node is a shortest path in an unweighted graph. Memory is O(w), the maximum width, which can be about n/2 at the last level of a balanced tree - BFS trades memory for the guarantee of nearest-first.",
      "**The BST invariant.** For every node, all keys in the left subtree are smaller and all keys in the right subtree larger (decide and document what equal keys do). Search compares once per level and goes left or right, so it costs O(h). Insert follows the same path and attaches a new leaf. Delete has three cases: no child → remove it; one child → splice the child in; two children → replace the key with its inorder successor (the smallest key in the right subtree) and delete that successor, which has at most a right child. The shape can change, but inorder stays sorted.",
      "**Why balance matters.** Insert 1..n and every key goes right: h=n-1, search becomes a linear scan with pointer chasing, and recursion overflows. AVL trees store a balance factor and rotate after an insert or delete that makes sibling heights differ by more than one. Red-black trees colour nodes and rotate to keep the longest path at most twice the shortest, giving h ≤ 2 log2(n+1); they do fewer rotations than AVL on writes, which is why many standard libraries choose them. Both guarantee O(log n) search, insert and delete. Languages ship them: Java TreeMap/TreeSet (red-black), C++ std::map/std::set (red-black), .NET SortedDictionary (red-black). Python has no built-in sorted map, so use bisect on a sorted list for read-heavy data or the sortedcontainers package. Databases go further with B-trees/B+ trees, which pack many keys per page to cut disk reads.",
      "**The heap shape.** A binary heap is a complete tree - every level full except the last, filled left to right - plus the heap property: every parent is ≤ its children (min-heap) or ≥ (max-heap). Completeness is what lets it live in a plain array with no gaps: node i has children 2i+1 and 2i+2, and parent (i-1)//2. The root is the extreme value, so peek is O(1). A heap is not sorted: it only promises that every parent beats its children.",
      "**Push, pop and heapify.** Push appends at the end and sifts up, swapping with the parent while the order is violated; pop saves the root, moves the last element to the root, and sifts down by swapping with the smaller (min-heap) child. Both walk one path, O(log n). Building a heap bottom-up from n items is O(n), not O(n log n), because most nodes are near the leaves and sift down only a little. Iterating the array does not give sorted order; pop n times for that, O(n log n).",
      "**heapq and top-K.** Python's heapq is a min-heap of a list. For a max-heap, store negated priorities (or tuples (-score, id)); tuples compare lexicographically, so add a counter as a tie-breaker when the item itself is not comparable. For the K largest in a stream, keep a min-heap of at most K items: the root is the weakest survivor, so compare each new item with heap[0] and replace it only if it is larger. That is O(n log K) time and O(K) memory. Sorting is O(n log n) and needs all n items; if you already have the data and need the full order, sort. If K is small and n is large, the stream is unbounded, or you need repeated min/max with inserts, the heap wins.",
    ],
    diagram: {
      title: "Min-heap as an array: [1, 3, 2, 7, 4]",
      nodes: [
        { label: "i=0: 1", sub: "root (minimum)" },
        { label: "i=1: 3", sub: "left child of 0" },
        { label: "i=2: 2", sub: "right child of 0" },
        { label: "i=3: 7", sub: "left child of 1" },
        { label: "i=4: 4", sub: "right child of 1" },
      ],
      edges: ["2i+1", "2i+2", "2i+1", "2i+2"],
      caption: "The array has no holes because the tree is complete. Index arithmetic replaces pointers: the children of i are 2i+1 and 2i+2, and the parent is (i-1)//2.",
    },
  },
  handsOn: [
    {
      title: "Build the trees and traverse them",
      text: [
        "The curriculum is an n-ary tree (any number of children); the second tree is binary. Run the file to see both: subtree totals and a root-to-node path are DFS jobs, while the level lists are BFS. The four traversal lines are all the same nine-node tree, read four ways.",
      ],
      code: {
        lang: "python",
        file: "trees_demo.py",
        code: `from collections import deque
from dataclasses import dataclass, field


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


print(total(course), total(course.children[1]))
print(" > ".join(path_to(course, "2.1.2")))
for depth, names in enumerate(levels(course)):
    print(depth, names)

@dataclass
class BNode:
    value: int
    left: "BNode | None" = None
    right: "BNode | None" = None


tree = BNode(8,
    BNode(3, BNode(1), BNode(6, BNode(4), BNode(7))),
    BNode(10, None, BNode(14, BNode(13))))


def preorder(n: BNode | None) -> list[int]:
    return [] if n is None else [n.value, *preorder(n.left), *preorder(n.right)]


def inorder(n: BNode | None) -> list[int]:
    return [] if n is None else [*inorder(n.left), n.value, *inorder(n.right)]


def postorder(n: BNode | None) -> list[int]:
    return [] if n is None else [*postorder(n.left), *postorder(n.right), n.value]


def level_order(root: BNode) -> list[int]:
    out, q = [], deque([root])
    while q:
        n = q.popleft()
        out.append(n.value)
        q.extend(c for c in (n.left, n.right) if c)
    return out


print("preorder   ", preorder(tree))
print("inorder    ", inorder(tree))
print("postorder  ", postorder(tree))
print("levelorder ", level_order(tree))`,
      },
      output: "330 220\nDevAtlas > Phase 2 > 2.1 > 2.1.2\n0 ['DevAtlas']\n1 ['Phase 0', 'Phase 2']\n2 ['0.1.1', '0.1.2', '2.1', '2.3.1']\n3 ['2.1.1', '2.1.2']\npreorder    [8, 3, 1, 6, 4, 7, 10, 14, 13]\ninorder     [1, 3, 4, 6, 7, 8, 10, 13, 14]\npostorder   [1, 4, 7, 6, 3, 13, 14, 10, 8]\nlevelorder  [8, 3, 10, 1, 6, 14, 4, 7, 13]",
      notes: [
        "`total` is postorder in disguise: both children must finish before the parent's sum is complete. `path_to` stops at the first match, which is why it returns a single path instead of every path. The level lists come from BFS, one queue-length-sized batch per level.",
        "The binary tree's height is 3 (8 → 3 → 6 → 4 or 7). With nine nodes, a degenerate version would have height 8, so the same traversals would recurse three times deeper. That is the whole argument for balancing in one sentence.",
      ],
    },
    {
      title: "Which traversal answers which question?",
      text: [
        "The visit order is not a style choice; the question picks the traversal. Read the table from the question backwards: if the answer needs an aggregate of a subtree, the parent cannot be computed until both children are done, so it is postorder. If it needs the nearest leaf, BFS reaches it first.",
      ],
      code: {
        lang: "text",
        file: "traversals.txt",
        code: `TRAVERSAL    ORDER ON THIS TREE        MEMORY   FIRST ANSWER IT GIVES
preorder     8 3 1 6 4 7 10 14 13     O(h)     copy/serialize; root before children
inorder      1 3 4 6 7 8 10 13 14     O(h)     BST values sorted; k-th smallest
postorder    1 4 7 6 3 13 14 10 8     O(h)     subtree totals/sizes; free children first
level order  8 3 10 1 6 14 4 7 13     O(w)     nearest leaf; level/width; shortest unweighted path

QUESTION                                  USE
total minutes in a subtree                postorder (children first)
breadcrumb from root to a lesson          DFS with backtracking
everything at depth 2                     BFS, stop after level 2
validate order of a BST                   inorder
clone or serialize a tree                 preorder
minimum depth / nearest leaf              BFS (first leaf wins)`,
      },
      notes: [
        "DFS memory is O(height); BFS memory is O(width). For a balanced tree the last level can hold about half the nodes, so BFS can use far more memory than DFS even though both visit every node once.",
        "Inorder is sorted only for a BST. On an arbitrary binary tree it is just left-node-right and says nothing about value order.",
        "A subtree total is postorder whether you write it recursively or with an explicit stack: the child must finish before the parent. Mixing the traversal to the question is most of the design work.",
      ],
    },
    {
      title: "A binary search tree, and why balance matters",
      text: [
        "The same 500 keys are inserted in random order and in sorted order. Search cost is the number of nodes visited, which is O(height) and does not depend on how the keys are distributed once the shape is fixed. Delete is exercised too, so the three deletion cases are not just theory.",
      ],
      code: {
        lang: "python",
        file: "bst.py",
        code: `import random


class BST:
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

    def search(self, key: int) -> tuple[bool, int]:
        n, comparisons = self.root, 0
        while n is not None:
            comparisons += 1
            if key == n[0]:
                return True, comparisons
            n = n[1] if key < n[0] else n[2]
        return False, comparisons

    def delete(self, key: int) -> None:
        def _delete(n, key):
            if n is None:
                return None
            if key < n[0]:
                n[1] = _delete(n[1], key)
            elif key > n[0]:
                n[2] = _delete(n[2], key)
            else:
                if n[1] is None:
                    return n[2]
                if n[2] is None:
                    return n[1]
                successor = n[2]              # smallest key in the right subtree
                while successor[1] is not None:
                    successor = successor[1]
                n[0] = successor[0]
                n[2] = _delete(n[2], successor[0])
            return n
        self.root = _delete(self.root, key)

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


random.seed(7)
balanced_ish, sorted_input = BST(), BST()
keys = list(range(500))
for k in random.sample(keys, len(keys)): balanced_ish.insert(k)
for k in keys: sorted_input.insert(k)
print(balanced_ish.inorder()[:5], balanced_ish.height() < 40)
print("sorted input height:", sorted_input.height())
print("balanced search 499:", balanced_ish.search(499))
print("degenerate search 499:", sorted_input.search(499))
balanced_ish.delete(250)
print("after delete 250:", 250 in balanced_ish.inorder(), "height:", balanced_ish.height())
print("still sorted:", balanced_ish.inorder() == sorted(balanced_ish.inorder()))`,
      },
      output: "[0, 1, 2, 3, 4] True\nsorted input height: 499\nbalanced search 499: (True, 7)\ndegenerate search 499: (True, 500)\nafter delete 250: False height: 16\nstill sorted: True",
      notes: [
        "Random insertion gave height 16, not the theoretical minimum 8 (log2 500 ≈ 9). Random BSTs are usually 2-3× taller than a perfect tree, still O(log n) in expectation but with a worse constant.",
        "Searching 499 in the balanced tree took 7 comparisons because 499 happened to sit near the root in this random shape; searching it in the sorted tree took 500. Height, not luck, is the guarantee you can rely on.",
        "Deleting 250 promoted its inorder successor, kept inorder sorted, and left height 16. A delete can shorten or reshape the tree; a balancing tree would repair the shape on the way back up the recursion.",
        "Seed 7 makes this output reproducible. Remove the seed and the comparison count and height vary, though the 499-height degenerate result does not.",
      ],
    },
    {
      title: "Heaps: top K, max-heaps, and when a heap beats sorting",
      text: [
        "The first output lines are the bounded-heap top-K and the deadline scheduler. The timing compares heapq.nlargest with a full sort on one million random integers. Timings vary with the machine and the run; the ratio is the point, not the exact milliseconds.",
      ],
      code: {
        lang: "python",
        file: "heaps.py",
        code: `import heapq
import random
import time
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

jobs = [(30, "send digest"), (5, "refresh feeds"), (15, "rebuild index")]
heapq.heapify(jobs)                                   # O(n)
while jobs:
    deadline, name = heapq.heappop(jobs)
    print(deadline, name)

nums = [5, 1, 9, 3, 7]
negated = [-x for x in nums]
heapq.heapify(negated)
print("max-heap pops:", [-heapq.heappop(negated) for _ in range(len(negated))])

rng = random.Random(1)
data = [rng.randrange(10_000_000) for _ in range(1_000_000)]
k = 10
t0 = time.perf_counter()
fast = heapq.nlargest(k, data)
t1 = time.perf_counter()
slow = sorted(data, reverse=True)[:k]
t2 = time.perf_counter()
print("same result:", fast == slow)
print(f"nlargest: {t1 - t0:.3f}s   sorted: {t2 - t1:.3f}s   speedup: {(t2 - t1) / (t1 - t0):.1f}x")
print("top three:", fast[:3])


def top_k_stream(stream, k: int) -> list[tuple[int, str]]:
    heap: list[tuple[int, str]] = []
    for score, story in stream:
        if len(heap) < k:
            heapq.heappush(heap, (score, story))
        elif score > heap[0][0]:
            heapq.heapreplace(heap, (score, story))
    return sorted(heap, reverse=True)


def feed():
    for story, score in [("a", 12), ("b", 99), ("c", 45), ("d", 7),
                         ("e", 61), ("f", 88), ("g", 23), ("h", 74)]:
        yield score, story


print("stream top 3:", top_k_stream(feed(), 3))
print("stream top 5:", top_k_stream(feed(), 5))`,
      },
      output: "[('pg-18', 410), ('rust-2024', 320), ('llm-evals', 280)]\n[('pg-18', 410), ('rust-2024', 320), ('llm-evals', 280)]\n5 refresh feeds\n15 rebuild index\n30 send digest\nmax-heap pops: [9, 7, 5, 3, 1]\nsame result: True\nnlargest: 0.012s   sorted: 0.264s   speedup: 22.5x\ntop three: [9999994, 9999988, 9999982]\nstream top 3: [(99, 'b'), (88, 'f'), (74, 'h')]\nstream top 5: [(99, 'b'), (88, 'f'), (74, 'h'), (61, 'e'), (45, 'c')]",
      notes: [
        "`heapq.nlargest(10, ...)` keeps a heap of size 10, so it reads each of the million items once and does O(log 10) work only when an item beats the current minimum: O(n log k). `sorted` must order all one million: O(n log n). Here the heap was about 20× faster.",
        "The advantage shrinks as k approaches n, and it disappears when you need the full sorted order. Sorting is also usually faster for small lists because it is implemented in C and avoids heap bookkeeping; measure at your expected size instead of assuming.",
        "The streaming example never holds more than k tuples and accepts a generator of unknown length. That is the property that matters for logs and news feeds: you do not need to store one million items to know the top ten.",
        "A max-heap is just negation: push -x and negate on pop. For tuples use (-score, id), and add a counter tie-breaker if the payload itself is not comparable.",
        "`heapq.heapify` on the job list is O(n); each pop is O(log n), so the scheduler prints in deadline order. Building the same heap with repeated heappush would be O(n log n) for no benefit.",
      ],
    },
    {
      title: "Choose the structure before you write the loop",
      text: [
        "This flow turns the lesson into a decision. Ask what the question needs before choosing a traversal or a data structure; most wrong answers in interviews are the right algorithm on the wrong shape.",
      ],
      code: {
        lang: "mermaid",
        file: "choose-structure.mmd",
        code: `flowchart TD
  Q[What does the question need?] --> A{Values in sorted order?}
  A -- yes --> B[Inorder walk of a BST<br/>or a sorted map]
  A -- no --> C{Best K of a large or streaming input?}
  C -- yes --> D[Bounded heap of size K]
  C -- no --> E{Nearest node or level-by-level?}
  E -- yes --> F[BFS with a queue]
  E -- no --> G{Path, depth, or subtree aggregate?}
  G -- yes --> H[DFS: preorder, inorder or postorder]
  G -- no --> I[Re-read the problem:<br/>maybe a graph or hash map]`,
      },
      notes: [
        "If the answer needs order, a heap is not enough: pop the heap or use a sorted map. If the answer needs only the best few, sorting is wasted work.",
        "If the tree may be degenerate, either balance it (a sorted map) or make DFS iterative; recursion depth equals height, and Python's default limit is 1000.",
      ],
    },
  ],
  companies: [
    "**B-trees in every database index (illustrative, see lesson 5.1.1):** a B-tree keeps many keys per node, so a few page reads reach millions of rows. That is a tree shaped for disk, while a red-black tree is shaped for memory. The same invariant - order on the left, order on the right - underlies both.",
    "**Priority queues in schedulers (illustrative):** OS process scheduling, Kubernetes pod priority, job queues with delays and Dijkstra's shortest path all need 'the smallest deadline/cost next'. A heap gives O(log n) insert and extract-min, which is why it appears wherever the next task matters more than the full order.",
    "**Streaming top-K in analytics (illustrative):** analytics pipelines compute 'top 100 products this hour' with bounded heaps per partition and merge the partial results, never sorting the full stream. The memory bound is the feature: the heap stays small while the stream is unbounded.",
    "**Language standard libraries ship balanced trees (illustrative):** Java's TreeMap and TreeSet are red-black trees, C++ `std::map` and `std::set` are typically red-black, and .NET's SortedDictionary is a red-black tree. Python's standard library has no sorted map, which is why heapq (a heap, not a search tree) and bisect on a sorted list are the usual substitutes.",
    "**Linux and Kubernetes (illustrative):** the Linux CFS scheduler keeps runnable tasks in a red-black tree keyed by virtual runtime, and Kubernetes' workqueue uses a heap for delayed items. Both repeatedly need the minimum, which is exactly what a heap or an ordered tree provides.",
  ],
  mistakes: [
    { mistake: "Assuming a BST is always O(log n)", why: "Textbooks show balanced pictures", wrong: "Sorted inserts create O(n) height and slow lookups", fix: "Use balanced trees or library sorted containers; shuffle when building test trees" },
    { mistake: "Sorting everything for top K", why: "sorted(...)[:k] is one line", wrong: "O(n log n) time and O(n) memory for large or streaming data", fix: "heapq.nlargest or a bounded min-heap: O(n log k)" },
    { mistake: "Recursion on deep trees", why: "Recursive DFS is the natural form", wrong: "RecursionError on degenerate or untrusted input", fix: "Iterative DFS with an explicit stack" },
    { mistake: "Pushing incomparable objects into heapq", why: "Equal priorities fall back to comparing the next tuple element", wrong: "TypeError when two dicts are compared", fix: "Use (priority, counter, item) with an increasing counter as a tie-breaker" },
    { mistake: "Confusing heap order with sorted order", why: "heap[0] is the minimum, so the list looks sorted", wrong: "Iterating the heap list gives a non-sorted order", fix: "Pop repeatedly (or sort) to get sorted output" },
    { mistake: "Using BFS to return one root-to-node path", why: "BFS sounds like the safe default", wrong: "You store the whole width and still need parent pointers to rebuild the path, or you lose the easy backtracking that DFS gives you", fix: "DFS with backtracking for a single path; BFS for nearest or level-based questions" },
    { mistake: "Deleting a BST node with two children by removing it", why: "The leaf case works, so the general case looks similar", wrong: "Children are orphaned or the ordering invariant breaks, and inorder is no longer sorted", fix: "Replace the key with its inorder successor (or predecessor), then delete that node, which has at most one child" },
    { mistake: "Building a heap with repeated heappush", why: "It is the obvious loop", wrong: "O(n log n) startup when heapq.heapify does it in O(n)", fix: "Collect the list and call heapq.heapify once; use heappush only for later arrivals" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Top K over large or streaming data: bounded heap of size K. Small in-memory data or a need for full order: just sort." },
    { tag: "Reliability", text: "Iterative traversals for input you do not control; add a depth limit for recursive parsing (JSON, XML bombs)." },
    { tag: "Maintainability", text: "Write traversals once as generators (yield nodes) and reuse them; keep the visit order in the function name (`preorder`, `inorder`, `postorder`, `level_order`)." },
    { tag: "Reliability", text: "Add tie-breakers to heap entries for deterministic ordering: `(priority, counter, item)`." },
    { tag: "Performance", text: "Static, read-only data often does better in a sorted array with `bisect` than in a tree: same O(log n) search, far better cache locality. Choose a balanced tree when inserts and deletes are frequent." },
  ],
  interview: [
    { q: "DFS vs BFS on a tree? Which traversal would you use for which question?", a: "DFS goes deep first using recursion or a stack; memory is O(height); good for path questions and computing subtree values. Preorder visits the node before its children, which is what you want to copy or serialize a tree; inorder visits left, node, right, which gives sorted order on a BST and the k-th smallest element; postorder visits both children first, which is what subtree totals, sizes and deletion need. BFS goes level by level with a queue; memory is O(width); good for 'nearest' or level-based questions, like minimum depth, the widest level, or the first node at a given depth. The rule of thumb: if the answer depends on a node's children, use postorder; if it depends on ancestors or a path, use preorder with backtracking; if it depends on depth, use BFS. Mention the memory trade: width can be n/2 in a balanced tree, while height is log n." },
    { q: "How do you find the K largest elements in a stream?", a: "Maintain a min-heap of size K. For each element, if the heap has fewer than K items push it; otherwise if it is larger than the heap's minimum, replace the minimum with heapreplace. The root is always the weakest survivor, so anything smaller than it cannot be in the top K. O(n log K) time and O(K) memory, and the input can be a generator, which is why it works on an unbounded stream. If you need the result sorted, pop the heap K times, O(K log K). Sorting the whole stream is O(n log n) and needs all n items, so it is the wrong tool when K is small; but if you already have the data and need the full order anyway, sort. Watch ties and incomparable payloads: use (score, counter, id) so heapq never compares the payload itself." },
    { q: "Why do databases use B-trees rather than binary search trees?", a: "Disk and memory pages are large. A binary tree does one key comparison per node and one pointer chase per level, so a million rows cost about 20 page reads in the best case. A B-tree stores many keys per node, so the tree is very shallow (often 3-4 levels for millions of rows), minimising page reads, and it stays balanced on inserts and deletes by splitting and merging nodes. Binary search trees are still the right in-memory sorted map: red-black and AVL trees give O(log n) search, insert and delete with a small constant, and that is what Java's TreeMap, C++'s std::map and .NET's SortedDictionary implement. A plain unbalanced BST is the one you should not ship for untrusted input, because sorted keys degenerate it to a linked list with O(n) operations." },
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
    "DFS: recursion/stack, O(h) memory. BFS: queue, level by level, O(w) memory.",
    "Preorder = copy/serialize; inorder = sorted on a BST; postorder = subtree totals; level order = nearest/width.",
    "BST ops O(h); balanced h = log n, degenerate h = n.",
    "BST delete: no child → remove; one child → splice; two children → replace with inorder successor.",
    "Balanced trees: AVL (stricter) and red-black (fewer rotations); both keep O(log n). Sorted maps ship with them.",
    "heapq: min-heap; heappush/heappop O(log n), peek O(1), heapify O(n).",
    "Max-heap: push -priority. Tie-breaker: (prio, counter, item).",
    "Top K: min-heap of size K → O(n log K), O(K) memory, stream-friendly.",
    "Sort when you need full order or n is small; heap when K ≪ n, data streams, or you need repeated min/max.",
    "Iterating a heap array is not sorted; pop n times or sort.",
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
    { label: "Wikipedia: Binary search tree", url: "https://en.wikipedia.org/wiki/Binary_search_tree" },
    { label: "Wikipedia: Binary heap", url: "https://en.wikipedia.org/wiki/Binary_heap" },
    { label: "Wikipedia: Tree traversal", url: "https://en.wikipedia.org/wiki/Tree_traversal" },
  ],
  nextPreview: "Next: graphs. Model real problems as nodes and edges, then solve them with BFS, DFS, Dijkstra and union-find.",
};
