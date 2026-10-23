import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.2.1",
  title: "Stacks, queues and linked lists",
  minutes: 85,
  level: "Beginner",
  prerequisites: ["2.1.2 Two pointers and sliding window"],
  summary: "Know when last-in-first-out, first-in-first-out and linked structures are the right tool, why Python's list is a bad queue, and how monotonic stacks and fast/slow pointers turn O(n²) scans into O(n).",
  terms: [
    { term: "Stack", def: "Last-in, first-out (LIFO): push onto the top, pop from the top. Python list append/pop, C# Stack<T>. All operations at the top are O(1) amortised." },
    { term: "Queue", def: "First-in, first-out (FIFO): enqueue at the back, dequeue from the front. Python collections.deque, C# Queue<T>. Both ends must be O(1)." },
    { term: "LIFO", def: "Last in, first out. The rule a stack obeys: the most recent item is the first one handled (undo, back button, call frames)." },
    { term: "FIFO", def: "First in, first out. The rule a queue obeys: arrival order is service order (jobs, BFS, message buffers)." },
    { term: "Deque", def: "Double-ended queue: O(1) adds and removes at both ends. CPython implements it as a doubly linked list of fixed-size blocks, so indexing the middle is O(n)." },
    { term: "Linked list", def: "Nodes that each hold a value and a pointer to the next node. O(1) insert/remove when you already hold the node; O(n) to find by position." },
    { term: "Node", def: "One element of a linked structure: a value plus one pointer (singly linked) or two (doubly linked). The head is the first node; a sentinel is a dummy node that removes edge cases." },
    { term: "Monotonic stack", def: "A stack whose values stay increasing or decreasing, holding indexes rather than values. Each index is pushed and popped once, so next greater/smaller element takes O(n)." },
    { term: "Min stack", def: "A stack that also answers get_min in O(1), usually by storing (value, minimum so far) pairs or keeping a second stack of minima." },
    { term: "Fast/slow pointers", def: "Two pointers where slow moves one node and fast moves two. Detects a cycle and finds the middle in O(n) time and O(1) extra space." },
    { term: "Amortised O(1)", def: "A cost averaged over a sequence of operations. list.append occasionally reallocates and copies, but the total cost of n appends is O(n), so each append is O(1) amortised." },
    { term: "Cache locality", def: "Contiguous data loads whole cache lines and lets the CPU prefetch; following pointers jumps around memory and causes cache misses. It often decides real speed more than Big-O does." },
  ],
  problem: [
    "The DevAtlas editor needs undo: the last change undone first. The news ingester needs to process feeds in the order they arrived. The code-review bot must check that every `(`, `[` and `{` in a snippet is closed in the right order. A chart of daily study minutes needs 'how many days until a better day?' for every day. A review history must detect that a linked chain of edits loops back on itself.",
    "Each is a stack, a queue or a linked-structure problem. Choosing the right container turns convoluted index juggling into a few clear lines - and choosing wrong is invisible until the input grows: a list used as a queue is correct and fast on 100 jobs, then takes half a second on 100,000. These patterns are interview favourites because they test whether you can see the structure behind the problem and reason about the cost of each operation.",
  ],
  concept: {
    analogy: [
      "A **stack** is a pile of plates: you add and take from the top, so the last plate placed is the first one lifted. A **queue** is a line at a ticket counter: the first person in line is served first, and new arrivals join the back.",
      "A **linked list** is a treasure hunt: each clue tells you where the next clue is. You cannot jump to clue 50 without following the previous 49, but inserting a new clue between two others only means rewriting one clue's pointer. A **contiguous array** is a row of numbered lockers: you can walk straight to locker 50, and nearby lockers sit in the same corridor (the same cache line).",
    ],
    precise: [
      "Use a **stack** when the most recent item must be handled first: undo/redo, matching brackets, depth-first search, expression evaluation, backtracking. Use a **queue** when arrival order matters: job processing, breadth-first search, buffering, rate limiting. The contract is not the Python type; it is which end must be O(1). A stack needs O(1) at one end; a queue needs O(1) at both ends.",
      "In Python, a list is an excellent stack: `append` and `pop()` at the end are O(1) amortised. It is a bad queue: `pop(0)` shifts every remaining element one slot left, so it is O(n), and n dequeues are O(n²). Use `collections.deque` for queues. `deque.popleft()` and `deque.appendleft()` are O(1), but `deque[i]` in the middle is O(n) and the block-and-pointer layout uses more memory per item than a list.",
      "A **linked list** gives O(1) insertion and removal when you already hold the node (or its predecessor), but O(n) access by index. Singly linked nodes store one pointer, so removal needs the predecessor; doubly linked nodes store `prev` and `next`, so a held node can be unlinked in O(1). In practice, dynamic arrays win most workloads because contiguous memory is cache-friendly and allocation-free per element; linked lists matter inside other structures such as an LRU cache, a hash-table chain or a free list, and in interviews.",
      "**Monotonic stack**: scan left to right keeping indexes whose values are still waiting for a bigger (or smaller) value. When a value arrives that breaks the order, it is the answer for everything it beats: pop those indexes and record the answer. Each index is pushed once and popped at most once, so the whole scan is O(n). A **min stack** applies the same 'remember what you need' idea: each entry stores the minimum seen when it was pushed, so `get_min` is O(1) and popping restores the previous minimum automatically.",
    ],
  },
  underTheHood: {
    text: [
      "**A Python list is a dynamic array of pointers.** It stores references in one contiguous block. `append` writes into spare capacity; when the block is full, CPython allocates a larger block (roughly 1.125x plus a constant), copies the pointers and frees the old block. A single append can therefore be O(n), but n appends cost O(n) in total, which is what 'amortised O(1)' means. `pop()` at the end just decrements the length and returns the last pointer: no shifting.",
      "**`pop(0)` is O(n).** Removing the first element leaves a hole at the front, so CPython moves every remaining pointer one slot left - up to n-1 pointer moves per dequeue. Doing that n times is O(n²). Measured on one machine at n = 100,000: `list.pop(0)` took 449.2 ms, `deque.popleft()` took 2.9 ms, a 153x gap. Timings vary by machine and run (a second run gave 408.1 ms and 3.0 ms), but the ratio grows roughly linearly with n, because one side is quadratic and the other linear.",
      "**`deque` is a doubly linked list of blocks.** CPython allocates fixed-size blocks of pointers and links the blocks, so `append`, `appendleft`, `pop` and `popleft` all touch a constant number of pointers: O(1) worst case, not amortised. The price is that `d[i]` must walk blocks from whichever end is closer, so indexing the middle is O(n); the block plus two block pointers also costs more memory per item than a list. A `deque(maxlen=k)` additionally drops from the opposite end when full, which makes it a bounded buffer.",
      "**Linked-list nodes are separate allocations.** Each node holds a value and at least one pointer, so following `next` is a dependent load: the CPU cannot prefetch node 50 until it has read node 49, and each node may sit in a different cache line. Insertion is O(1) only when you already hold the node (or its predecessor); finding that position is O(n), which erases the advantage in the common 'insert in the middle' case. Singly linked lists save one pointer per node but cannot walk backwards; doubly linked lists pay that pointer back by allowing O(1) removal of a held node, which is why an LRU cache uses them.",
      "**The O(1) contract is what you design against.** A stack needs push/pop at the top; a queue needs enqueue at the back and dequeue at the front. A ring buffer over a preallocated array satisfies both with two indexes and a count, and is the usual choice in kernels and audio/network code because it allocates nothing after startup. A queue can also be built from two stacks: push onto `in`; to dequeue, if `out` is empty, pop everything from `in` onto `out` (reversing order), then pop `out`. Each element moves at most twice, so dequeue is amortised O(1).",
      "**Why the monotonic stack is O(n).** The stack holds indexes whose next greater value has not arrived, and their values are decreasing from bottom to top. When `x` arrives, every stack top with a smaller value has just found its answer, so it is popped and never touched again. Each index enters once and leaves at most once; the inner `while` therefore does at most n pops across the whole run, not n per index. The same proof covers next smaller element (flip the comparison) and daily temperatures (store `i - j` instead of the value).",
      "**Min stack: store the answer with the item.** Each pushed entry is `(value, min_so_far)`, where `min_so_far = min(value, previous_min)`. `get_min` reads the top pair in O(1), and popping discards the pair, so the previous minimum is restored with no rescan. The alternative is a second stack of minima, pushing only when the new value is `<=` the current minimum (the `<=` keeps duplicates so each pop of the main stack has a matching pop of the min stack). Recomputing `min(self._items)` on every call is O(n) and defeats the purpose.",
      "**The call stack is the same structure.** Every call pushes a frame (arguments, locals, return address); returning pops it. Python limits recursion depth (about 1000 by default, `sys.getrecursionlimit()`), so a recursive DFS on a deep graph raises `RecursionError`. Rewriting it with an explicit Python list used as a stack removes the limit and makes the traversal state visible; the algorithm is identical, only the frames move from the interpreter to your code.",
    ],
    diagram: {
      title: "One list, two contracts: stack at the end, queue at the front",
      nodes: [
        { label: "list [a, b, c, d]", sub: "one contiguous block" },
        { label: "append / pop", sub: "end: O(1) amortised" },
        { label: "pop(0)", sub: "shifts n-1 items: O(n)" },
        { label: "deque", sub: "blocks linked both ways" },
        { label: "appendleft / popleft", sub: "both ends: O(1)" },
      ],
      edges: ["stack contract", "queue attempt", "swap the tool", "queue contract"],
      caption: "A stack only needs one fast end. A queue needs two, which is exactly what a list cannot give you without moving every element.",
    },
  },
  handsOn: [
    {
      title: "A stack, a queue, and the price of pop(0)",
      text: [
        "This one file builds both containers from their contracts, checks brackets with the stack, then measures what happens when you use a list as a queue. The bracket and queue lines are deterministic; the last three lines depend on the machine and the run.",
      ],
      code: {
        lang: "python",
        file: "containers.py",
        code: `from collections import deque
from time import perf_counter

PAIRS = {")": "(", "]": "[", "}": "{"}


class Stack:
    def __init__(self) -> None:
        self._items: list[str] = []

    def push(self, x: str) -> None:
        self._items.append(x)

    def pop(self) -> str:
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def __bool__(self) -> bool:
        return bool(self._items)


class Queue:
    def __init__(self) -> None:
        self._items: deque[str] = deque()

    def enqueue(self, x: str) -> None:
        self._items.append(x)

    def dequeue(self) -> str:
        if not self._items:
            raise IndexError("dequeue from empty queue")
        return self._items.popleft()


def balanced(code: str) -> bool:
    stack = Stack()
    for ch in code:
        if ch in "([{":
            stack.push(ch)
        elif ch in PAIRS:
            if not stack or stack.pop() != PAIRS[ch]:
                return False
    return not stack


for s in ["{[()]}", "([)]", "(((", "print(f(x[0]))"]:
    print(f"{s!r:20} {balanced(s)}")

q = Queue()
for job in ["build", "test", "deploy"]:
    q.enqueue(job)
print("queue order:", [q.dequeue() for _ in range(3)])

N = 100_000
data = list(range(N))

t0 = perf_counter()
wrong = data.copy()
while wrong:
    wrong.pop(0)
list_ms = (perf_counter() - t0) * 1000

t0 = perf_counter()
right = deque(data)
while right:
    right.popleft()
deque_ms = (perf_counter() - t0) * 1000

print(f"list.pop(0)     {list_ms:8.1f} ms")
print(f"deque.popleft() {deque_ms:8.1f} ms")
print(f"ratio           {list_ms / deque_ms:8.0f}x")`,
      },
      output: "'{[()]}'             True\n'([)]'               False\n'((('                False\n'print(f(x[0]))'     True\nqueue order: ['build', 'test', 'deploy']\nlist.pop(0)        449.2 ms\ndeque.popleft()      2.9 ms\nratio                153x",
      notes: [
        "Timings are machine- and run-specific: a second run of the same file printed 408.1 ms and 3.0 ms (138x). The absolute numbers do not matter; the ratio and its growth with n do.",
        "`balanced` returns the moment a closing bracket mismatches, so `([)]` fails on `)`, not at the end. The final `return not stack` catches unclosed openers such as `(((`.",
        "`Queue.dequeue` raises instead of returning a sentinel. A silent `None` would turn a logic bug into wrong data much later.",
        "The measured 153x is a lower bound on what you will see at larger n: list work grows quadratically while deque work grows linearly. At n = 1,000,000 the gap is roughly ten times wider.",
      ],
    },
    {
      title: "Monotonic stack: next greater element, step by step",
      text: [
        "The stack holds indexes, not values, so the answer can be written back at the right position and distances can be computed. Print the state after each index to see the invariant: values on the stack are strictly decreasing from bottom to top.",
      ],
      code: {
        lang: "python",
        file: "nge.py",
        code: `def next_greater(nums: list[int]) -> list[int]:
    answer = [-1] * len(nums)
    stack: list[int] = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            j = stack.pop()
            answer[j] = x
            print(f"  {x} is next greater for {nums[j]} at index {j}")
        stack.append(i)
        print(f"i={i} x={x} stack={stack} answer={answer}")
    return answer


print("next greater element:")
print(next_greater([2, 1, 2, 4, 3]))


def daily_temperatures(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack: list[int] = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer


print("\\ndaily temperatures:")
print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))`,
      },
      output: "next greater element:\ni=0 x=2 stack=[0] answer=[-1, -1, -1, -1, -1]\ni=1 x=1 stack=[0, 1] answer=[-1, -1, -1, -1, -1]\n  2 is next greater for 1 at index 1\ni=2 x=2 stack=[0, 2] answer=[-1, 2, -1, -1, -1]\n  4 is next greater for 2 at index 2\n  4 is next greater for 2 at index 0\ni=3 x=4 stack=[3] answer=[4, 2, 4, -1, -1]\ni=4 x=3 stack=[3, 4] answer=[4, 2, 4, -1, -1]\n[4, 2, 4, -1, -1]\n\ndaily temperatures:\n[1, 1, 4, 2, 1, 1, 0, 0]",
      notes: [
        "At `i=2` the new 2 answers index 1 but not index 0: `2 < 2` is false, so the first 2 stays on the stack. The comparison is strict. Use `<=` if you want next greater-or-equal.",
        "When the 4 arrives it pops index 2 first, then index 0, because the stack is last-in-first-out. Both were waiting for the same value; the trace writes each answer as it is found.",
        "Daily temperatures runs the identical loop and stores `i - j`, the number of days waited. Each index is pushed once and popped at most once, so both functions are O(n) time and O(n) space.",
        "Values that never find a greater element keep the initial `-1` (or `0` for temperatures), so no second pass is needed at the end.",
      ],
    },
    {
      title: "Floyd: cycle detection and the middle in one pass",
      text: [
        "Slow moves one node per step; fast moves two. If there is a cycle, fast enters it first and then gains one node per step on slow, so they must meet. If there is no cycle, fast falls off the end.",
      ],
      code: {
        lang: "python",
        file: "floyd.py",
        code: `class Node:
    __slots__ = ("val", "next")

    def __init__(self, val: int, nxt: "Node | None" = None) -> None:
        self.val = val
        self.next = nxt


def build(values: list[int], tail_to: int | None = None) -> Node | None:
    nodes = [Node(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if tail_to is not None:
        nodes[-1].next = nodes[tail_to]
    return nodes[0] if nodes else None


def has_cycle(head: Node | None) -> bool:
    slow = fast = head
    step = 0
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        step += 1
        fast_val = fast.val if fast else None
        print(f"  step {step}: slow={slow.val} fast={fast_val}")
        if slow is fast:
            return True
    return False


print("with a cycle (tail -> index 1):")
print("cycle?", has_cycle(build([3, 2, 0, -4], tail_to=1)))

print("without a cycle:")
print("cycle?", has_cycle(build([1, 2, 3, 4])))


def middle(head: Node | None) -> Node | None:
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow


print("middle of 1..5:", middle(build([1, 2, 3, 4, 5])).val)
print("middle of 1..6:", middle(build([1, 2, 3, 4, 5, 6])).val)`,
      },
      output: "with a cycle (tail -> index 1):\n  step 1: slow=2 fast=0\n  step 2: slow=0 fast=2\n  step 3: slow=-4 fast=-4\ncycle? True\nwithout a cycle:\n  step 1: slow=2 fast=3\n  step 2: slow=3 fast=None\ncycle? False\nmiddle of 1..5: 3\nmiddle of 1..6: 4",
      notes: [
        "With a cycle, fast gains one node per step, so the meeting is guaranteed once both are inside the loop. No visited set is needed, which is why the extra space is O(1) rather than O(n).",
        "To find where the cycle starts, keep the meeting node, move one pointer back to the head, then advance both one step at a time; they meet at the entry node. That is LeetCode 142, and it follows from the distance arithmetic of the first phase.",
        "For an even-length list this `middle` returns the second middle (4 for `1..6`). If you need the first, stop when `fast.next` or `fast.next.next` would be None instead.",
        "The `while fast and fast.next` guard is load-bearing: checking only `fast` would dereference `fast.next.next` on the last node and crash.",
      ],
    },
    {
      title: "What each structure costs",
      text: [
        "Keep this table next to you when choosing a container. The Big-O rows are the contract; the measured rows are what the contract looks like on one machine at n = 100,000.",
      ],
      code: {
        lang: "text",
        file: "container-costs.txt",
        code: `OPERATION               list                deque                 array (contiguous)   linked list
access by index         O(1)                O(n) in the middle    O(1)                 O(n)
push / append back      O(1) amortised      O(1)                  O(1) amortised*      O(1) with tail
pop back                O(1)                O(1)                  O(1)                 O(n) singly
pop front               O(n)                O(1)                  O(n)                 O(1)
insert / remove         O(n)                O(n)                  O(n)                 O(1) given node
search by value         O(n)                O(n)                  O(n)                 O(n)
memory per item         one pointer         block + 2 pointers    value                value + pointer(s)
cache behaviour         excellent           good                  excellent            poor

* dynamic arrays over-allocate so append is amortised O(1); a full fixed array must grow and copy.

MEASURED, n = 100,000 dequeues on one machine, one run
list.pop(0)             449.2 ms
deque.popleft()           2.9 ms
ratio                    153x`,
      },
      notes: [
        "The table is the decision rule: list for stacks and indexable arrays, deque for queues, linked nodes only when you already hold the node you must splice - as inside an LRU cache.",
        "`deque` indexing is O(n), so it is not a drop-in replacement for a list when you need random access. It also stores blocks and pointers, so it uses more memory per item.",
        "The measurements are illustrative and machine-specific. Rerun the timing script on your own machine; the ratio will differ, but the quadratic-versus-linear shape will not.",
      ],
    },
    {
      title: "Draw the memory layout: array vs linked list",
      text: [
        "The diagram makes the cache argument visible: an array puts neighbours in one block, while a linked list scatters nodes and connects them with pointers. Reading index 3 is one address calculation in the array and three dependent loads in the list.",
      ],
      code: {
        lang: "mermaid",
        file: "memory-layout.mmd",
        code: `flowchart LR
  subgraph ARR["array: one contiguous block"]
    A0["10"] --- A1["20"] --- A2["30"] --- A3["40"]
  end
  subgraph LL["linked list: nodes scattered in memory"]
    L0["10 | next"] --> L1["20 | next"] --> L2["30 | next"] --> L3["40 | next"]
  end
  A0 -. "a[3] = base + 3 x pointer size" .-> A3
  L0 -. "a[3] = follow 3 pointers" .-> L3`,
      },
      notes: [
        "A cache line is typically 64 bytes. A contiguous array loads several neighbouring values per miss, and the hardware prefetcher can walk it ahead of time; each `next` dereference in a linked list may miss.",
        "That is why the theoretical O(1) splice often loses to an O(n) array copy in real code: the array copy is a single fast `memmove` over contiguous memory, while the 'fast' list operation chases pointers that are not in cache.",
        "Singly linked nodes save one pointer per node; doubly linked nodes pay it back by allowing O(1) removal of a held node without scanning for its predecessor, which is exactly what an LRU cache needs.",
      ],
    },
  ],
  companies: [
    "**Amazon SQS, RabbitMQ and Kafka (illustrative):** queues decouple producers from consumers so a spike is buffered instead of overloading a service. Delivery guarantees change the design: SQS standard queues offer at-least-once delivery and best-effort ordering, SQS FIFO queues preserve order within a message group, and Kafka is a partitioned log that consumers read by offset rather than a classic delete-on-read queue. In every case the consumer must be idempotent because a retry can deliver the same message twice.",
    "**Editors, IDEs and browsers (illustrative):** undo/redo is two stacks; the browser back/forward history is the same two-stack pattern; IDEs and linters use a stack to match brackets and to parse nested syntax. When you press Ctrl+Z, the most recent edit is popped first, which is exactly LIFO.",
    "**In-process and distributed caches (illustrative):** an LRU cache combines a hash map with a doubly linked list so lookup, 'mark as most recent' and 'evict the oldest' are all O(1). Python's `functools.lru_cache` uses a dict plus a circular doubly linked list; Redis implements approximate LRU/LFU by sampling keys under a memory limit rather than maintaining an exact list.",
    "**Compilers, parsers and runtimes (illustrative):** the call stack holds active frames; expression parsers use a stack (shunting-yard) or recursion to respect precedence; JSON and HTML parsers keep an explicit stack of open elements so a malformed document can be reported with a position. Deeply nested input is why production parsers often avoid unbounded recursion.",
    "**Operating systems and allocators (illustrative):** scheduler run queues, memory free lists and network/audio ring buffers are queue-like structures. A ring buffer over a preallocated array gives O(1) enqueue and dequeue with no per-item allocation, which is why it is preferred in latency-sensitive code.",
  ],
  mistakes: [
    { mistake: "Using `list.pop(0)` as a queue", why: "A list is the default container and `pop(0)` reads naturally", wrong: "Every dequeue shifts the remaining elements, so n jobs cost O(n²); 100,000 jobs take hundreds of milliseconds instead of a few", fix: "Use `collections.deque` and `popleft()`; keep a list for stack operations at the end" },
    { mistake: "Popping from an empty stack", why: "The happy path works and the empty case is forgotten", wrong: "`IndexError` crashes the request; in a parser it hides the real syntax error", fix: "Check `if not stack` first, or catch the error and report a meaningful message" },
    { mistake: "Re-pointing `head.next` before saving `next`", why: "The reversal loop looks like a clever one-liner", wrong: "The rest of the list is lost, or the pointers form a loop and traversal never ends", fix: "Save `nxt = head.next` before changing `head.next`, or use tuple assignment in the right order" },
    { mistake: "Deep recursion on unbounded input", why: "Recursive DFS and tree walks are short and elegant", wrong: "Python raises `RecursionError` around the default limit of 1000 frames; other languages overflow the native stack", fix: "Use an explicit list as a stack for deep or adversarial input, and keep recursion for shallow, bounded structures" },
    { mistake: "Choosing a linked list for 'fast inserts' in general", why: "The textbook says insertion is O(1)", wrong: "Finding the insertion point is O(n), and pointer chasing is slower than a contiguous copy; the code is also longer and buggier", fix: "Measure. Use a dynamic array unless you already hold the node, as in an LRU cache or an intrusive free list" },
    { mistake: "Assuming `deque` supports O(1) indexing", why: "It behaves like a list in small tests", wrong: "`d[n // 2]` inside a loop makes an apparently linear algorithm O(n²)", fix: "Index a list when random access matters; use deque only for end operations" },
    { mistake: "Storing values instead of indexes in a monotonic stack", why: "The value is what the problem asks about", wrong: "You cannot compute a distance or write the answer back to the right position, and duplicate values become ambiguous", fix: "Push indexes and read `nums[stack[-1]]` for comparisons" },
    { mistake: "Recomputing the minimum on every `get_min`", why: "It is the obvious implementation of a min stack", wrong: "`get_min` becomes O(n), and calling it per operation turns an O(n) algorithm into O(n²)", fix: "Store `(value, min_so_far)` pairs or keep a second stack of minima so every operation stays O(1)" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Use a list for a stack (`append` / `pop`) and `collections.deque` for a queue (`append` / `popleft`). Never use `pop(0)` on a large list." },
    { tag: "Performance", text: "When the final size is known, preallocate with `[0] * n` and fill by index; it avoids repeated reallocation and keeps the data contiguous for the cache." },
    { tag: "Reliability", text: "Bound queues with `deque(maxlen=...)` or explicit backpressure, and decide whether a full queue drops the oldest item or rejects the producer." },
    { tag: "Maintainability", text: "Name stacks by meaning (`open_brackets`, `undo_history`, `waiting`) and wrap the operations in a small class when an invariant must hold." },
    { tag: "Cost", text: "Contiguous arrays use less memory and fewer allocations than one node per item; reserve linked nodes for structures where splicing a held node dominates, such as LRU caches." },
  ],
  interview: [
    { q: "Compare LIFO and FIFO. Implement a queue using two stacks, and explain the amortised cost.", a: "A stack exposes one end: push and pop both touch the most recent item, which is what undo, bracket matching, DFS and the call stack need. A queue exposes two ends: enqueue at the back and dequeue at the front, which is what BFS, job processing and buffering need. The implementation rule follows from the contract: a stack needs one O(1) end, a queue needs two. In Python a list gives the stack for free, but `pop(0)` is O(n) because every remaining pointer shifts, so a queue uses `deque`. To build a queue from two stacks, keep an `in` stack and an `out` stack. Push onto `in`. To dequeue, if `out` is empty, pop every element from `in` and push it onto `out`, which reverses the order, then pop `out`. Each element is pushed onto `in` once, moved to `out` at most once, and popped once, so the total work for n operations is O(n) and each dequeue is amortised O(1) - a single dequeue can be O(n), but only after many cheap ones. The worst-case per-operation cost is O(n), which is the distinction interviewers listen for. A ring buffer over a preallocated array achieves O(1) worst case for both ends with two indexes and a count." },
    { q: "Design a stack with push, pop, top and get_min in O(1). Then use a monotonic stack to find the next greater element for every index in O(n).", a: "For the min stack, store a pair per entry: the value and the minimum of the whole stack at the moment it was pushed. `push(x)` appends `(x, min(x, top_min))`; `pop` removes the pair and automatically restores the previous minimum; `top` and `get_min` read the top pair. All four are O(1) because no entry is ever rescanned. The alternative is a second stack of minima: push onto it when the new value is less than or equal to the current minimum, and pop it whenever the main stack pops a value equal to the current minimum; the `<=` matters when duplicates exist. Recomputing `min(items)` is O(n) and is the usual wrong answer. For next greater element, scan left to right with a stack of indexes whose values are still waiting. For each `i`, while the stack is non-empty and `nums[stack[-1]] < nums[i]`, pop `j` and set `answer[j] = nums[i]`; then push `i`. The stack values are decreasing from bottom to top, so the first value that breaks the order resolves every smaller value above it. Each index is pushed once and popped at most once, so the loop is O(n) even though it contains a nested while. Use `<` for strictly greater and `<=` for greater-or-equal. To report the distance instead of the value, as in daily temperatures, store `i - j`. For a circular array, iterate `2n` indexes and use `i % n`, stopping once every index has an answer. Next smaller element flips the comparison; the same structure also solves largest rectangle in a histogram and stock span." },
    { q: "Detect a cycle and find the middle of a linked list in O(1) extra space. Then explain why arrays usually beat linked lists in practice.", a: "Use two pointers starting at the head: slow moves one node, fast moves two. If fast reaches None or fast.next is None, the list is acyclic, because fast traversed the whole list. If there is a cycle, fast enters it and then gains one node per step on slow, so they must eventually point at the same node; return true at that meeting. This is Floyd's algorithm, O(n) time and O(1) space, versus a visited set that costs O(n) memory. To find the cycle entry, after the meeting move one pointer back to the head and advance both one step at a time; they meet at the entry, because the distance from the head to the entry equals the distance from the meeting point around the cycle to the entry. For the middle, run the same slow/fast walk until fast cannot advance two steps; slow is then at the middle. For an even-length list this returns the second middle; adjust the loop condition if the first is required. In practice, arrays beat linked lists for most workloads even though list insertion is textbook O(1): array access is O(1) with one address calculation, elements share cache lines, and the hardware prefetcher hides memory latency. Linked nodes are separate allocations, so traversal is a chain of dependent loads that can miss cache on every node, and insertion is O(1) only if you already hold the node - finding it is O(n). A dynamic array's O(n) insert is often a single fast `memmove` over contiguous memory, which can beat pointer manipulation. Linked lists win when references are stable (nodes do not move), when splicing a held node dominates (LRU caches, intrusive lists, free lists), or when the structure is part of a lock-free algorithm. The interview answer is to state the Big-O, then state the constant factors and cache behaviour that decide real performance." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What does `next_greater([2, 1, 2, 4, 3])` return?",
      options: ["[4, 2, 4, -1, -1]", "[4, 4, 4, -1, -1]", "[-1, 2, 4, -1, -1]", "[4, 2, -1, 4, -1]"],
      answer: 0,
      explanation: "The 2 at index 2 answers index 1; the 4 then answers index 2 and index 0 in stack order. Neither 4 nor 3 has a greater value to its right, so both stay -1.",
    },
    {
      kind: "mcq",
      prompt: "Which operation is O(n) on a Python list but O(1) on a `collections.deque`?",
      options: ["Appending at the end", "Popping from the end", "Removing from the front", "Reading the length"],
      answer: 2,
      explanation: "`list.pop(0)` shifts every remaining element; `deque.popleft()` unlinks the front block entry. Length is O(1) for both.",
    },
    {
      kind: "bug",
      prompt: "This 'queue' becomes very slow with 1 million jobs. Why?",
      code: { lang: "python", code: "jobs = list(range(1_000_000))\nwhile jobs:\n    job = jobs.pop(0)\n    handle(job)" },
      options: ["handle is slow", "pop(0) shifts all remaining elements each time: O(n²) overall", "range is lazy", "while loops are slow"],
      answer: 1,
      explanation: "Each `pop(0)` moves the remaining n-1 pointers, so the total is quadratic. Use `deque` and `popleft()` for O(1) dequeues.",
    },
  ],
  cheatSheet: [
    "Stack = LIFO: undo, brackets, DFS, backtracking, call frames.",
    "Queue = FIFO: jobs, BFS, buffering, rate limiting.",
    "`list.append` / `list.pop()` are O(1) amortised; `list.pop(0)` is O(n).",
    "`deque.append` / `appendleft` / `pop` / `popleft` are O(1); `deque[i]` in the middle is O(n).",
    "Queue from two stacks: push to `in`; when `out` is empty, reverse `in` onto `out`; amortised O(1).",
    "Monotonic stack: push indexes, pop while the new value wins, record the answer; O(n) total.",
    "Next greater uses `<`; next greater-or-equal uses `<=`; temperatures store `i - j`; circular arrays iterate `2n` with `i % n`.",
    "Min stack: store `(value, min_so_far)` or a second stack of minima; every operation is O(1).",
    "Linked list: O(1) splice with a held node, O(n) lookup; singly vs doubly trades one pointer for backward moves and O(1) unlink.",
    "Floyd: slow +1, fast +2; meeting means a cycle, fast reaching None means none; reset one pointer to the head to find the entry.",
  ],
  homework: {
    basic: {
      title: "Min stack",
      brief: ["Design a stack supporting `push`, `pop`, `top` and `get_min`, all in O(1). Test it with duplicate minimums and after the minimum has been popped."],
      criteria: ["O(1) for all four operations", "Correct minimum after arbitrary pushes and pops", "A test that pushes the same minimum twice and then pops it once"],
      hints: ["Store pairs (value, current_min) on the stack.", "Popping the pair automatically restores the previous minimum."],
      solution: {
        text: ["Each entry remembers the minimum at the time it was pushed, so popping restores the previous minimum without a rescan.", "The test uses `5, 3, 3, 7`: the minimum stays 3 after one pop because the second 3 still carries 3, and becomes 5 only after both 3s are gone."],
        code: {
          lang: "python",
          code: `class MinStack:
    def __init__(self) -> None:
        self._items: list[tuple[int, int]] = []

    def push(self, x: int) -> None:
        current = min(x, self._items[-1][1]) if self._items else x
        self._items.append((x, current))

    def pop(self) -> int:
        return self._items.pop()[0]

    def top(self) -> int:
        return self._items[-1][0]

    def get_min(self) -> int:
        return self._items[-1][1]


s = MinStack()
for x in [5, 3, 3, 7]:
    s.push(x)
print("min after 5,3,3,7:", s.get_min())
s.pop()
s.pop()
print("min after two pops:", s.get_min())
s.pop()
print("min after three pops:", s.get_min())`,
        },
        output: "min after 5,3,3,7: 3\nmin after two pops: 3\nmin after three pops: 5",
        pitfalls: ["Calling `min` over the whole stack on every get_min", "Popping the minimum from a second stack when duplicates exist, which loses the min too early"],
      },
    },
    intermediate: {
      title: "Two stack drills: RPN and daily temperatures",
      brief: ["Evaluate Reverse Polish Notation, then solve daily temperatures. The first pops operands; the second keeps a monotonic stack of indexes. Both are single left-to-right scans."],
      criteria: ["RPN handles + - * / with the correct operand order and truncation toward zero", "Daily temperatures returns the wait in days, with 0 when no warmer day exists", "Both solutions are O(n)"],
      hints: ["For RPN, pop b first, then a, and compute a op b.", "For temperatures, pop while the current day is warmer than the day on top; store i - j."],
      solution: {
        text: ["RPN is a stack of values: a number is pushed, an operator pops two values and pushes the result. The first popped value is the right-hand operand, which matters for subtraction and division.", "Daily temperatures is a monotonic stack of indexes whose temperatures are still waiting for a warmer day. When a warmer day arrives, pop each waiting index and record the distance. Unanswered indexes keep 0."],
        code: {
          lang: "python",
          code: `def eval_rpn(tokens: list[str]) -> int:
    stack: list[int] = []
    ops = {
        "+": lambda a, b: a + b,
        "-": lambda a, b: a - b,
        "*": lambda a, b: a * b,
        "/": lambda a, b: int(a / b),
    }
    for t in tokens:
        if t in ops:
            b, a = stack.pop(), stack.pop()
            stack.append(ops[t](a, b))
        else:
            stack.append(int(t))
    return stack[0]


def daily_temperatures(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    stack: list[int] = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer


print("rpn:", [eval_rpn(t) for t in (["2", "1", "+", "3", "*"], ["4", "13", "5", "/", "+"], ["7", "-3", "/"])])
print("daily:", daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))`,
        },
        output: "rpn: [9, 6, -2]\ndaily: [1, 1, 4, 2, 1, 1, 0, 0]",
        pitfalls: ["Popping a then b and computing a - b, which reverses the operands", "Using `//` for RPN division, which floors -2.33 to -3 instead of truncating to -2"],
      },
    },
    challenge: {
      title: "LRU cache with a doubly linked list",
      brief: ["Implement `LRUCache(capacity)` with `get(key)` and `put(key, value)` in O(1), evicting the least recently used key when full. Do it once with `OrderedDict`, then with your own doubly linked list plus a dict."],
      criteria: ["O(1) get and put in both versions", "Correct eviction order under the same test sequence", "The hand-written version uses sentinel head and tail nodes and no scanning"],
      hints: ["`OrderedDict.move_to_end(key)` and `popitem(last=False)`.", "In the linked version, the dict maps key to node; `head.next` is the newest and `tail.prev` is the oldest."],
      solution: {
        text: ["The dict gives O(1) lookup; the ordering structure gives O(1) 'mark as recent' and 'evict oldest'. With `OrderedDict`, `move_to_end` is that structure. With your own nodes, a doubly linked list lets you unlink a held node in O(1) because it knows both neighbours; a singly linked list would need to scan for the predecessor.", "Two sentinel nodes remove the empty-list, head and tail special cases: every real node always has a predecessor and a successor."],
        code: {
          lang: "python",
          code: `from collections import OrderedDict


class Node:
    __slots__ = ("key", "val", "prev", "next")

    def __init__(self, key: int = 0, val: int = 0) -> None:
        self.key, self.val = key, val
        self.prev: "Node | None" = None
        self.next: "Node | None" = None


class LinkedLRU:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.data: dict[int, Node] = {}
        self.head = Node()                 # newest side
        self.tail = Node()                 # oldest side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node: Node) -> None:
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev, self.head.next = node, node

    def get(self, key: int) -> int:
        node = self.data.get(key)
        if node is None:
            return -1
        self._unlink(node)
        self._push_front(node)
        return node.val

    def put(self, key: int, value: int) -> None:
        node = self.data.get(key)
        if node is not None:
            node.val = value
            self._unlink(node)
            self._push_front(node)
            return
        if len(self.data) == self.capacity:
            oldest = self.tail.prev
            self._unlink(oldest)
            del self.data[oldest.key]
        node = Node(key, value)
        self.data[key] = node
        self._push_front(node)


class DictLRU:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.data: OrderedDict[int, int] = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)


for cls in (DictLRU, LinkedLRU):
    c = cls(2)
    c.put(1, 1); c.put(2, 2)
    c.get(1); c.put(3, 3)              # evicts key 2
    print(cls.__name__, [c.get(k) for k in (2, 1, 3)])`,
        },
        output: "DictLRU [-1, 1, 3]\nLinkedLRU [-1, 1, 3]",
        pitfalls: ["Forgetting to delete the evicted key from the dict, which keeps a dead node alive", "Updating a value for an existing key without moving it to the front"],
      },
    },
    capstone: {
      title: "DevAtlas: bracket checker for code answers",
      brief: ["Add `check_brackets(code) -> list[str]` to the AI service that returns human-readable problems with positions (for example 'unclosed ( at 14', 'unexpected ] at 20'), to give learners instant feedback on submitted code."],
      criteria: ["Reports the position and bracket for each problem", "Handles a mismatched closer that leaves an opener unclosed", "Tests for each error type, and a valid snippet returns an empty list"],
      hints: ["Push `(char, index)` pairs instead of just chars.", "Report a mismatch immediately; at the end, everything left on the stack is unclosed."],
      solution: {
        text: ["Store `(bracket, index)` on the stack so the error message can point at the exact character. A mismatched closer is reported at the current index and does not pop the opener; the leftover opener is then reported as unclosed at the end. That is why `f(x[1)` produces both an unexpected `)` and the two unclosed openers.", "Ignoring brackets inside string literals is the bonus: scan with a small state machine for quotes and skip the contents, including escaped quotes."],
        code: {
          lang: "python",
          code: `def check_brackets(code: str) -> list[str]:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[tuple[str, int]] = []
    problems: list[str] = []
    for i, ch in enumerate(code):
        if ch in "([{":
            stack.append((ch, i))
        elif ch in pairs:
            if stack and stack[-1][0] == pairs[ch]:
                stack.pop()
            else:
                problems.append(f"unexpected {ch} at {i}")
    problems += [f"unclosed {ch} at {i}" for ch, i in stack]
    return problems


print(check_brackets("f(x[1)"))
print(check_brackets("total = (a[0] + b})"))`,
        },
        output: "['unexpected ) at 5', 'unclosed ( at 1', 'unclosed [ at 3']\n['unexpected } at 17']",
        pitfalls: ["Returning only the first problem, so the learner fixes one bracket per attempt", "Reporting the unclosed opener's index instead of the closer's index, which sends the learner to the wrong line"],
      },
    },
  },
  deeper: [
    { label: "Python docs: Using lists as stacks and queues", url: "https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks" },
    { label: "Python docs: collections.deque", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
    { label: "Python docs: timeit - measure small code fragments", url: "https://docs.python.org/3/library/timeit.html" },
    { label: "Wikipedia: Cycle detection (Floyd's tortoise and hare)", url: "https://en.wikipedia.org/wiki/Cycle_detection" },
    { label: "Wikipedia: Linked list", url: "https://en.wikipedia.org/wiki/Linked_list" },
  ],
  nextPreview: "Next: recursion, sorting and binary search. Recursion is the call stack in action, and binary search is the other pattern that turns a linear scan into a logarithmic one.",
};
