import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.2.2",
  title: "Recursion, sorting and binary search",
  minutes: 90,
  level: "Beginner",
  prerequisites: ["2.2.1 Stacks, queues and linked lists"],
  summary: "Think recursively with base cases and trust, see recursion as a call stack and a recursion tree, understand what sorting costs (merge sort, quicksort, Timsort, the n log n floor), and use binary search on sorted data and on the answer space.",
  terms: [
    { term: "Recursion", def: "A function that solves a problem by calling itself on a smaller input of the same shape. The solution for n is built from the solution for smaller n." },
    { term: "Base case", def: "The smallest input the function answers directly, without recursing. Without it, recursion never ends." },
    { term: "Call stack", def: "The LIFO structure the runtime uses to track active calls. Each call pushes a frame; each return pops one. The frame holds arguments, locals and the return address." },
    { term: "Stack depth", def: "How many frames are live at once. Depth is the longest chain of calls, not the total number of calls. Python's default limit is about 1000 frames." },
    { term: "Recursion tree", def: "The tree of calls a recursive function makes. Its shape explains the cost: branching and depth multiply, which is why naive Fibonacci is exponential." },
    { term: "Memoisation", def: "Caching a function's result per argument, so a repeated subproblem returns from the cache instead of being recomputed. Trades memory for time." },
    { term: "Divide and conquer", def: "Split the problem into independent parts, solve each recursively, then combine. Merge sort and quicksort are the canonical examples." },
    { term: "Stable sort", def: "A sort that keeps equal elements in their original relative order. Python's `sorted()` and `list.sort()` are stable." },
    { term: "Pivot", def: "The element quicksort partitions around. Everything smaller goes to one side, everything larger to the other; the pivot then sits at its final index." },
    { term: "Timsort", def: "The hybrid merge/insertion sort behind Python's `sorted()`. Stable, O(n log n) worst case, O(n) on already-sorted or reverse-sorted runs." },
    { term: "Binary search", def: "Find a target in sorted data by repeatedly halving the search range: O(log n) comparisons and O(1) extra space." },
    { term: "Binary search on the answer", def: "Binary search over possible answer values when you can test 'is X good enough?' and that test is monotonic: false for small X, true from some point on." },
  ],
  problem: [
    "DevAtlas stores 5 million quiz attempts sorted by time. 'Show attempts since Monday' scans all 5 million: O(n). Binary search finds the first Monday attempt in about 23 comparisons. A capacity question looks different but has the same shape: 'What is the smallest daily study time that finishes the 73-lesson course in 90 days?' Trying every value from 1 minute upward is slow; binary search on the answer finds it in a handful of checks.",
    "Both answers rest on two foundations. Recursion is how you describe a problem in terms of a smaller copy of itself, and the call stack is what makes that description run. Sorting is what turns 'search everything' into 'look at a few places'. This lesson builds the mental model for both, including why naive recursion explodes, why comparison sorting cannot beat n log n, and how to move binary search from a sorted array to an entire answer space.",
  ],
  concept: {
    analogy: [
      "Recursion is **Russian nesting dolls**: to count dolls, open one and count the dolls inside (the same problem, smaller); the smallest doll that does not open is the base case. Every doll you have opened is still on the table, waiting for its count - that pile is the call stack.",
      "Binary search is **guessing a number between 1 and 100** when told 'higher' or 'lower': always guess the middle, and you need at most 7 guesses. Binary search on the answer is the same game when nobody wrote the number down: you can only ask 'would X finish in time?', and the answers switch from no to yes exactly once.",
    ],
    precise: [
      "To write a recursive function, state its contract (what it returns for an input), write the base case(s), and make progress toward them. Then assume the recursive call already works for smaller inputs - the 'recursive leap of faith' - and combine its result. Every call pushes a stack frame holding its arguments, locals and return address; every return pops that frame. Depth is the longest chain of live calls, and Python's default limit is about 1000 frames. A missing base case, or a step that does not shrink the input, turns recursion into an infinite descent that ends in `RecursionError`.",
      "The **recursion tree** makes cost visible. Naive `fib(n)` calls `fib(n-1)` and `fib(n-2)`, so its tree branches at every node and has about 2^n nodes; `fib(30)` makes 2,692,537 calls to return one number. The same subproblems are solved again and again, which is the definition of **overlapping subproblems**. `functools.cache` keys each result by argument, so `fib(30)` then makes 31 calls: O(n) time and O(n) space. Memoisation only helps when subproblems actually repeat; it adds overhead to divide-and-conquer algorithms such as merge sort, whose subproblems are disjoint.",
      "**Sorting** is the cost you pay once to make many searches cheap. Merge sort splits the list in half, sorts each half recursively, then merges the two sorted halves; it is O(n log n) in every case, stable when the merge takes from the left on ties, and needs O(n) extra memory. Quicksort partitions around a pivot in place, then recurses on both sides: O(n log n) average, O(n^2) worst case when the pivot is repeatedly extreme (for example the last element of already-sorted input). Python and Java sort objects with **Timsort**, a stable hybrid that finds natural runs and merges them. No comparison sort can beat Omega(n log n) in the worst case; counting and radix sort sidestep that bound only by exploiting integer keys.",
      "**Binary search** keeps one invariant: the answer lies in a half-open range `[lo, hi)`. Each step looks at the middle and discards the half that cannot contain the target, so the range halves and the loop ends after about log2(n) steps. `bisect_left` returns the first index whose value is >= the target; `bisect_right` returns the first index whose value is > it. **Binary search on the answer** replaces the sorted array with the range of possible answers and the comparison with a monotonic predicate: if `feasible(x)` is false for small x and true from some threshold on, binary search finds the smallest feasible x in O(log range) checks. The check itself is often O(n), giving O(n log range) overall.",
    ],
  },
  underTheHood: {
    text: [
      "1. **The call stack is the machine behind recursion.** A call pushes a frame containing the arguments, local variables and the address to return to; a return pops it and hands the value back. The stack is LIFO, so the most recent call finishes first. Depth is the number of frames alive at once, which is the height of the recursion tree, not its size. Python does not optimise tail calls, so a tail-recursive loop still grows the stack; the fix is an explicit `while` loop or an explicit `list` used as a stack.",
      "2. **The recursion tree explains exponential time.** For naive Fibonacci, T(n) = T(n-1) + T(n-2) + 1. The tree has about 2^n nodes, even though only n distinct subproblems exist. The growth rate is the golden ratio, about 1.618^n, so each extra n multiplies the work by roughly 1.6. `fib(30)` is 2.7 million calls; `fib(40)` is about 330 million. Exponential algorithms are only usable for small n or with pruning.",
      "3. **Memoisation collapses the tree.** Cache the result for each argument; the second time a subproblem appears, return the cached value. Naive `fib(30)` goes from 2,692,537 calls to 31 - one per distinct n from 0 to 30. The cost becomes O(n) time and O(n) space. The bottom-up version (tabulation) fills an array `0..n` in a loop and uses O(1) space if you only keep the last two values. Memoisation is the general trick; dynamic programming is the discipline of ordering the subproblems yourself.",
      "4. **Merge sort divides, then combines.** Splitting in half gives log2(n) levels. At each level every element is touched once during merging, so the total is n log2(n). Merging two sorted lists is linear and stable if ties take from the left; keeping `left[i] <= right[j]` is the whole stability guarantee. The price is O(n) extra memory. Merge sort is the natural choice for linked lists (merging needs no random access) and for external sorting, where runs are merged from disk.",
      "5. **Quicksort partitions in place.** Pick a pivot, move smaller elements to its left and larger ones to its right, then recurse. The partition is linear and the pivot lands at its final index, so no merge step is needed. The average is O(n log n) with decent pivots, but the worst case is O(n^2): with the last element as pivot, already-sorted input produces one empty side at every level, so the recursion depth is n. Random pivots or median-of-three make that pathological input vanishingly unlikely; introsort adds a hard guarantee by switching to heapsort after 2 log n levels. Quicksort is not stable.",
      "6. **Timsort is what Python actually runs.** It scans for natural runs (ascending or strictly descending sequences), reverses descending runs, extends short runs with insertion sort, then merges runs using galloping when one side is much longer. Already-sorted data is one run: O(n). Random data is O(n log n). The sort is stable, and because it is implemented in C with excellent cache behaviour, it usually beats a pure-Python merge sort by a large constant factor - the asymptotics are the same, the constants are not.",
      "7. **Why n log n is the floor for comparison sorts.** A comparison sort learns only the order of two elements, so its execution is a decision tree whose leaves are the n! possible permutations. A binary tree with n! leaves must have height at least log2(n!), and Stirling's approximation gives log2(n!) = n log2(n) - 1.44n + O(log n). No comparison-based algorithm can do better in the worst case. Counting sort is O(n + k) for integer keys in a small range and radix sort is O(d(n + k)) for d-digit keys; both avoid comparisons and are not bound by this argument.",
      "8. **Binary search is a shrinking invariant.** With `[lo, hi)` the answer is never outside the range, `mid = lo + (hi - lo) // 2` cannot overflow in fixed-width languages, and each branch removes at least one element, so the range strictly shrinks. For 5 million items, log2(5,000,000) is about 22.3, so at most 23 comparisons. `bisect_left(a, x)` finds the first index with `a[i] >= x`; `bisect_right(a, x)` finds the first with `a[i] > x`. The difference between them is the count of elements equal to x.",
      "9. **Binary search on the answer swaps the array for a predicate.** Define `feasible(x)` as 'can we finish with capacity x?'. If small capacities fail and larger ones succeed, the predicate is monotonic, and the smallest feasible x is a boundary you can find by halving the numeric range. Set the low bound to a value that is definitely too small (often `max(item)` when items cannot be split) and the high bound to one that is definitely enough (often `sum(items)`). Each check is O(n), so the total is O(n log(sum)). The same pattern answers minimum ship capacity, minimum eating speed, and minimum server count that meets a latency target.",
    ],
    diagram: {
      title: "countdown(3): a recursive call is a stack of frames",
      nodes: [
        { label: "countdown(3)", sub: "push frame" },
        { label: "countdown(2)", sub: "push frame" },
        { label: "countdown(1)", sub: "push frame" },
        { label: "countdown(0)", sub: "base case: return" },
        { label: "unwind", sub: "pop four frames" },
      ],
      edges: ["n-1", "n-1", "n-1", "return"],
      caption: "Each call adds a frame and the base case stops the growth; returns then pop frames in reverse order. Depth here is 4, so an input of 2000 would exceed Python's default limit of 1000 frames.",
    },
  },
  handsOn: [
    {
      title: "Watch the call stack, then make fib cheap",
      text: [
        "Run this with Python 3.11. The first part counts a real course tree recursively, so the base case is a lesson and the recursive step sums the children. The second part measures stack depth and the limit; the third times naive and memoised Fibonacci. The output below is real; microseconds and milliseconds change with the machine and the run, so treat the ratio as the point.",
      ],
      code: {
        lang: "python",
        file: "recursion_stack.py",
        code: `import functools
import sys
import time


def total_minutes(node: dict) -> int:
    if "minutes" in node:                     # base case: a lesson
        return node["minutes"]
    return sum(total_minutes(child) for child in node["children"])  # trust smaller calls


course = {"children": [
    {"children": [{"minutes": 50}, {"minutes": 60}]},
    {"children": [{"minutes": 55}, {"children": [{"minutes": 20}]}]},
]}
print("course minutes:", total_minutes(course))


def depth(n: int) -> int:
    if n == 0:                                # base case: one frame
        return 1
    return 1 + depth(n - 1)                   # progress: n always shrinks


def depth_iter(n: int) -> int:
    frames = 1
    while n > 0:                              # same count, constant stack
        frames += 1
        n -= 1
    return frames


print("limit:", sys.getrecursionlimit(), "depth(900):", depth(900))
try:
    depth(2000)
except RecursionError as exc:
    print("depth(2000):", type(exc).__name__, "-", exc)
print("depth_iter(100_000):", depth_iter(100_000))


def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)


@functools.cache                            # one cache entry per distinct n
def fib_memo(n: int) -> int:
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)


for name, fn in (("naive", fib), ("memo", fib_memo)):
    t0 = time.perf_counter()
    value = fn(30)
    ms = (time.perf_counter() - t0) * 1000
    print(f"{name:5} fib(30) = {value}  {ms:8.3f} ms")`,
      },
      output: "course minutes: 185\nlimit: 1000 depth(900): 901\ndepth(2000): RecursionError - maximum recursion depth exceeded\ndepth_iter(100_000): 100001\nnaive fib(30) = 832040   106.889 ms\nmemo  fib(30) = 832040     0.029 ms",
      notes: [
        "`depth(900)` returns 901 because `depth` itself is a frame. `depth(2000)` goes past the default 1000-frame limit; `depth_iter` does the same counting with one frame.",
        "The same answer, 832040, comes back in about 107 ms naively and 0.03 ms memoised on this machine. Timings vary between runs; the call count does not: naive `fib(30)` makes 2,692,537 calls, while the memoised version makes 31.",
      ],
    },
    {
      title: "Merge sort, stability, Timsort timing and quicksort's partition",
      text: [
        "The first print is merge sort on seven items. The next two show stability and tuple keys. The timing compares the same pure-Python merge sort with `sorted()` on 100,000 random integers; then `partition` shows where quicksort puts the pivot. Timings vary, and the gap is mostly constant factor, not asymptotics.",
      ],
      code: {
        lang: "python",
        file: "sorting.py",
        code: `import random
import time


def merge_sort(xs: list[int]) -> list[int]:
    if len(xs) <= 1:                          # base case
        return xs
    mid = len(xs) // 2
    left = merge_sort(xs[:mid])
    right = merge_sort(xs[mid:])
    merged: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:               # <= keeps it stable
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    return merged + left[i:] + right[j:]


print("merge_sort:", merge_sort([38, 27, 43, 3, 9, 82, 10]))

attempts = [("ravi", 80), ("asha", 90), ("meera", 80), ("zoe", 90)]
print(sorted(attempts, key=lambda a: (-a[1], a[0])))      # score desc, then name
by_name = sorted(attempts, key=lambda a: a[0])
print(sorted(by_name, key=lambda a: a[1], reverse=True))  # stability keeps name order on ties

rng = random.Random(42)
data = [rng.randrange(100_000) for _ in range(100_000)]
for name, fn in (("merge_sort", merge_sort), ("sorted()", sorted)):
    t0 = time.perf_counter()
    out = fn(data)
    ms = (time.perf_counter() - t0) * 1000
    print(f"{name:10} {len(out):>7} items {ms:8.1f} ms")


def partition(xs: list[int], lo: int, hi: int) -> int:
    pivot = xs[hi]                            # last element as pivot
    i = lo
    for j in range(lo, hi):
        if xs[j] < pivot:
            xs[i], xs[j] = xs[j], xs[i]
            i += 1
    xs[i], xs[hi] = xs[hi], xs[i]
    return i                                  # pivot's final index


a = [7, 2, 9, 4, 3]
print("partition:", partition(a, 0, len(a) - 1), a)`,
      },
      output: "merge_sort: [3, 9, 10, 27, 38, 43, 82]\n[('asha', 90), ('zoe', 90), ('meera', 80), ('ravi', 80)]\n[('asha', 90), ('zoe', 90), ('meera', 80), ('ravi', 80)]\nmerge_sort  100000 items    199.2 ms\nsorted()    100000 items     11.5 ms\npartition: 1 [2, 3, 9, 4, 7]",
      notes: [
        "`sorted()` is Timsort in C, stable and run-aware; the hand-written merge sort is Python and allocates a new list at every merge. Same O(n log n), very different constants. Timings vary with hardware and load.",
        "`partition` put `3` at index 1: everything left is smaller, everything right is larger or equal. The right side `[9, 4, 7]` is not sorted yet - quicksort recurses on both sides. On already-sorted input with the last element as pivot, one side is empty every time, which is the O(n^2) worst case.",
      ],
    },
    {
      title: "Trace binary search, then search the answer space",
      text: [
        "`lower_bound` is the manual version of `bisect_left`; the trace prints the range before each halving. Then the minimum daily minutes example uses a formula for feasibility, and the ship-packages example uses a greedy O(n) feasibility check, which is the realistic shape of binary search on the answer.",
      ],
      code: {
        lang: "python",
        file: "search.py",
        code: `import bisect
import math


def lower_bound(xs: list[int], target: int, trace: bool = False) -> int:
    """First index with xs[i] >= target (len(xs) if none)."""
    lo, hi = 0, len(xs)                       # invariant: answer in [lo, hi]
    while lo < hi:
        mid = (lo + hi) // 2
        if trace:
            print(f"lo={lo} hi={hi} mid={mid} xs[{mid}]={xs[mid]}")
        if xs[mid] < target:
            lo = mid + 1                      # discard the left half, including mid
        else:
            hi = mid                          # keep mid, discard the right half
    return lo


timestamps = [100, 105, 230, 230, 400, 512]
print(lower_bound(timestamps, 230), bisect.bisect_left(timestamps, 230))
print(lower_bound(timestamps, 300), bisect.bisect_left(timestamps, 300))
since = bisect.bisect_left(timestamps, 200)
print(timestamps[since:])                     # all attempts at or after t=200
print("trace for 7 in [1,3,5,7,7,9,11,13]:",
      lower_bound([1, 3, 5, 7, 7, 9, 11, 13], 7, trace=True))


def days_needed(lesson_minutes: list[int], daily: int) -> int:
    return math.ceil(sum(lesson_minutes) / daily)


def min_daily_minutes(lesson_minutes: list[int], deadline_days: int) -> int:
    lo, hi = 1, sum(lesson_minutes)           # answer is somewhere in here
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(lesson_minutes, mid) <= deadline_days:
            hi = mid                          # feasible: try smaller
        else:
            lo = mid + 1
    return lo


print("min daily minutes:", min_daily_minutes([60] * 73, 90))


def days_for(capacity: int, weights: list[int]) -> int:
    days, load = 1, 0
    for w in weights:
        if load + w > capacity:               # start a new day
            days, load = days + 1, 0
        load += w
    return days


def ship_within(weights: list[int], deadline: int) -> tuple[int, int]:
    lo, hi = max(weights), sum(weights)       # must fit the largest; sum always works
    checks = 0
    while lo < hi:
        mid = (lo + hi) // 2
        checks += 1
        if days_for(mid, weights) <= deadline:
            hi = mid
        else:
            lo = mid + 1
    return lo, checks


print("min capacity:", ship_within([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5))`,
      },
      output: "2 2\n4 4\n[230, 230, 400, 512]\nlo=0 hi=8 mid=4 xs[4]=7\nlo=0 hi=4 mid=2 xs[2]=5\nlo=3 hi=4 mid=3 xs[3]=7\ntrace for 7 in [1,3,5,7,7,9,11,13]: 3\nmin daily minutes: 49\nmin capacity: (15, 5)",
      notes: [
        "The trace shows the invariant at work: `lo=0 hi=8`, then `[0, 4)`, then `[3, 4)`. When `xs[mid] >= target` we keep `mid` by setting `hi = mid`; when it is smaller we discard it with `lo = mid + 1`. Eight elements need at most 3 comparisons, which is log2(8).",
        "For ship packages, capacity 15 finishes in 5 days and capacity 14 needs 6, so 15 is the boundary. The search tried 5 capacities instead of scanning all 55 between 10 and 55. In general the cost is O(n log(sum)).",
      ],
    },
    {
      title: "Sorting algorithms at a glance",
      text: [
        "Keep this table next to you when you choose a sort. The important columns are worst case, extra space and stability; the notes say when the algorithm is the right tool.",
      ],
      code: {
        lang: "text",
        file: "sorting_algorithms.txt",
        code: `algorithm    average      worst        extra space  stable  in place  notes
merge sort   O(n log n)   O(n log n)   O(n)         yes     no        predictable; lists and external sort
quicksort    O(n log n)   O(n^2)       O(log n)     no      yes       fastest constants; bad pivots hurt
Timsort      O(n log n)   O(n log n)   O(n)         yes     no        Python sorted(); O(n) on sorted runs
heapsort     O(n log n)   O(n log n)   O(1)         no      yes       introsort fallback; weak cache locality
insertion    O(n^2)       O(n^2)       O(1)         yes     yes       O(n) nearly sorted; used for short runs
counting     O(n + k)     O(n + k)     O(k)         yes     no        integer keys in a small range; no comparisons
radix        O(d(n + k))  O(d(n + k))  O(n + k)     yes     no        fixed-width integers or strings; no comparisons`,
      },
      notes: [
        "Quicksort's extra space is the recursion stack, O(log n) on average and O(n) in the worst case. Timsort's O(n) space is the temporary merge buffer.",
        "The first five rows are comparison sorts and cannot beat Omega(n log n). The last two avoid comparisons and only win when keys have structure you can exploit.",
      ],
    },
    {
      title: "Draw binary search on the answer",
      text: [
        "The control flow is always the same: a range of candidate answers, a feasibility test, and the choice of keeping the smaller half. Paste this into any Mermaid renderer (GitHub renders it in Markdown) and change only the predicate.",
      ],
      code: {
        lang: "mermaid",
        file: "binary_search_on_answer.mmd",
        code: `flowchart TD
  A["lo = max(weights), hi = sum(weights)"] --> B{"lo < hi?"}
  B -- no --> Z["answer = lo"]
  B -- yes --> C["mid = (lo + hi) // 2"]
  C --> D{"days_for(mid) <= deadline?"}
  D -- yes --> E["hi = mid"]
  D -- no --> F["lo = mid + 1"]
  E --> B
  F --> B`,
      },
      notes: [
        "The `yes` branch keeps `mid`, because `mid` might be the smallest feasible answer. The `no` branch discards `mid`, so it moves to `mid + 1`. Mixing those two rules up is the classic off-by-one.",
      ],
    },
  ],
  companies: [
    "**Databases:** B-trees are binary search generalised from one element to a disk page; `ORDER BY`, merge joins and index builds all depend on sorting. External merge sort handles data larger than memory by sorting runs and merging them from disk. This is why a missing index turns a lookup into a scan.",
    "**git bisect:** binary search over commit history. Given a known-good and a known-bad commit, it halves the range and asks you to test the midpoint; 1,000 commits need about 10 tests. The predicate 'this commit is bad' is monotonic because a bug, once introduced, stays until it is fixed.",
    "**Capacity planning and autoscaling:** teams repeatedly ask for the smallest instance count, timeout or cache size that keeps p99 latency under a target. Load-testing a handful of candidate sizes is binary search on the answer, with each load test playing the role of the O(n) feasibility check.",
    "**Language runtimes:** CPython's `sorted()` and `list.sort()` use Timsort, and the OpenJDK uses a Timsort variant for object arrays. The choice is deliberate: stability and good behaviour on partially sorted real data matter more than a theoretically simpler algorithm.",
    "**Logistics and scheduling (illustrative):** the ship-packages pattern - minimum daily capacity to move a fixed sequence of weights within D days - appears in delivery planning, batch-job scheduling and rate limiting. The greedy feasibility check is simple; the insight is that the answer space is monotonic, so it can be searched.",
  ],
  mistakes: [
    { mistake: "Missing or wrong base case", why: "Focusing on the recursive step", wrong: "Infinite recursion and RecursionError", fix: "Write the base case first and test it directly; every path must reach it" },
    { mistake: "Recursing without making progress", why: "The recursive call looks right", wrong: "`countdown(n)` calling `countdown(n)` or `countdown(n + 1)` never reaches the base case", fix: "Prove the argument strictly moves toward the base case on every call" },
    { mistake: "Using recursion for deep or unbounded input", why: "It reads elegantly", wrong: "A linked list of 10,000 nodes or a user-supplied depth raises RecursionError", fix: "Convert to an explicit stack or a loop; validate depth for untrusted input" },
    { mistake: "Recomputing overlapping subproblems", why: "Naive recursion is the first thing that works", wrong: "Fibonacci-like code takes exponential time and appears to hang", fix: "Memoise with `functools.cache`, or fill a table bottom-up" },
    { mistake: "Off-by-one in binary search", why: "Mixing inclusive and exclusive bounds", wrong: "Infinite loops, skipped targets, or an index one past the end", fix: "Pick one convention (`[lo, hi)`), write the invariant, and test 0, 1 and 2 elements" },
    { mistake: "Binary searching unsorted data", why: "Forgetting the precondition", wrong: "Silently wrong results that look plausible", fix: "Sort once (O(n log n)), keep data sorted on insert with `bisect.insort`, or use a different structure" },
    { mistake: "Wrong bounds in binary search on the answer", why: "Copying the array version unchanged", wrong: "The search starts above the true answer, so the minimum is missed", fix: "Set `lo` to a definitely-infeasible value and `hi` to a definitely-feasible one; check the boundary by hand" },
    { mistake: "Using a non-monotonic feasibility test", why: "The predicate seems reasonable", wrong: "The boundary does not exist, and the binary search returns an arbitrary value", fix: "Prove that once `feasible(x)` is true, it stays true for every larger x" },
    { mistake: "Writing your own sort in production", why: "Practising algorithms", wrong: "Slower, buggier and less stable than the built-in", fix: "Use `sorted()` / `list.sort()` with a key; implement sorts only to learn" },
    { mistake: "Sorting when you do not need order", why: "Sorting feels like the safe default", wrong: "You pay O(n log n) and O(n) memory to answer a question a heap, quickselect or one pass could answer", fix: "Ask what the consumer needs: the top k (heap), the k-th item (quickselect), a count or a min/max (one pass), or a range on already-sorted data (bisect)" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Use `bisect` and the built-in sort with key functions instead of hand-written loops; keep the invariant in a comment next to the bounds." },
    { tag: "Performance", text: "Sort once and binary search many times; for a stream that must stay ordered, use `bisect.insort` or a heap rather than re-sorting on every insert." },
    { tag: "Performance", text: "Memoise only overlapping subproblems. For divide-and-conquer with disjoint subproblems, a cache adds memory and lookups for nothing." },
    { tag: "Reliability", text: "Give every recursive function a base case, a guaranteed step toward it, and a test at the boundary (0, 1, 2 elements; empty and full ranges)." },
    { tag: "Cost", text: "Do not sort unless order is the deliverable or a precondition for repeated searches; a single pass, a heap or quickselect is often cheaper in time and memory." },
  ],
  interview: [
    { q: "Walk me through how you write a recursive function and what can go wrong.", a: "State the contract first: what does the function return for an input? Then write the base case - the smallest input you can answer directly - and make progress toward it on every call. Assume the recursive call already works for the smaller input (the leap of faith) and combine. In the runtime each call pushes a frame, so depth is the height of the call tree and Python's default limit is about 1000 frames; a missing base case or a non-shrinking step gives RecursionError. If subproblems repeat, memoise with `functools.cache` and show the change: naive fib(30) makes 2,692,537 calls, memoised makes 31. If the depth is unbounded, replace recursion with an explicit stack or a loop." },
    { q: "Compare merge sort, quicksort and Timsort. Why can't a comparison sort beat O(n log n)?", a: "Merge sort splits, sorts each half and merges: O(n log n) always, stable if ties take from the left, O(n) extra memory; good for linked lists and external sorting. Quicksort partitions in place around a pivot: O(n log n) average, O(n^2) worst when pivots are repeatedly extreme, O(log n) average stack, not stable; random or median-of-three pivots and an introsort fallback control the worst case. Timsort is a stable hybrid that finds natural runs, extends short runs with insertion sort and merges with galloping; it is what Python's sorted() uses, O(n) on already-sorted data and O(n log n) worst. The lower bound comes from the decision tree: a comparison sort must distinguish n! permutations, so its height is at least log2(n!), which is Theta(n log n). Counting and radix sort beat it only by not comparing keys." },
    { q: "What is binary search on the answer, and how do you avoid off-by-one bugs?", a: "It applies when the answer is a number in a range and a feasibility check is monotonic: false for small values, true from some threshold on. Binary search the range with that check instead of a sorted array; each check is often O(n), so the cost is O(n log range). Set `lo` to a value that is definitely infeasible and `hi` to one that is definitely feasible, then keep `mid` when the check passes (`hi = mid`) and discard it when it fails (`lo = mid + 1`). To avoid off-by-one bugs, write the invariant as a comment - the answer is always in `[lo, hi)` - use `mid = lo + (hi - lo) // 2`, and test the smallest cases (empty range, one element, answer at both ends). The same rules make ordinary binary search safe: `bisect_left` returns the first index `>= target`, `bisect_right` the first `> target`." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "About how many comparisons does binary search need on 1,000,000 sorted items?",
      options: ["~20", "~1,000", "~500,000", "~1,000,000"],
      answer: 0,
      explanation: "log2(1,000,000) is about 20. Each comparison halves the remaining range.",
    },
    {
      kind: "output",
      prompt: "`bisect.bisect_left([1, 3, 3, 5], 3)` returns:",
      options: ["1", "2", "3", "0"],
      answer: 0,
      explanation: "bisect_left gives the first position where 3 could be inserted keeping order: index 1. bisect_right would give 3, so the count of 3s is 3 - 1 = 2.",
    },
    {
      kind: "bug",
      prompt: "Why does this never finish for n = -1?",
      code: { lang: "python", code: "def countdown(n):\n    if n == 0:\n        return\n    countdown(n - 1)" },
      options: ["Python cannot recurse", "The base case n == 0 is never reached from negative n", "return needs a value", "n - 1 is invalid"],
      answer: 1,
      explanation: "From -1 the recursion moves away from 0. Use `if n <= 0` (and validate input). Python stops it with RecursionError.",
    },
  ],
  cheatSheet: [
    "Recursion: base case first, make progress, trust the smaller call, combine.",
    "Depth is live frames (the tallest chain), not total calls. Python's limit is about 1000; deep input needs an explicit stack or a loop.",
    "Naive fib is about 1.6^n; memoised fib is O(n) time and O(n) space. Memoise only overlapping subproblems.",
    "Merge sort: O(n log n) always, stable, O(n) extra. Quicksort: average O(n log n), worst O(n^2), in place, not stable.",
    "Timsort is Python's sorted(): stable, O(n log n) worst, O(n) on already-sorted or reverse-sorted runs.",
    "Comparison sorts are Omega(n log n); counting and radix beat that only for structured integer keys.",
    "Binary search invariant: the answer stays in [lo, hi); mid = lo + (hi - lo) // 2; each step halves the range.",
    "bisect_left = first index >= x; bisect_right = first index > x; equal values live in [left, right).",
    "Binary search on the answer: monotonic feasible(x), definitely-infeasible lo, definitely-feasible hi, keep mid on success.",
    "Do not sort if a heap, quickselect or one pass answers the question; sorting costs O(n log n) and often O(n) memory.",
  ],
  homework: {
    basic: {
      title: "First and last position",
      brief: ["Given a sorted list and a target, return the first and last index of the target, or (-1, -1), in O(log n)."],
      criteria: ["Two binary searches (or bisect_left/bisect_right)", "Handles absent target and empty list", "No linear scan of the list"],
      hints: ["last = bisect_right(xs, t) - 1, but only if bisect_left found the value."],
      solution: {
        text: ["bisect_left finds the first position; bisect_right finds one past the last. If the left position is off the end or points at a different value, the target is absent."],
        code: {
          lang: "python",
          file: "search_range.py",
          code: `import bisect

def search_range(xs: list[int], t: int) -> tuple[int, int]:
    lo = bisect.bisect_left(xs, t)
    if lo == len(xs) or xs[lo] != t:
        return (-1, -1)
    return (lo, bisect.bisect_right(xs, t) - 1)

print(search_range([5, 7, 7, 8, 8, 10], 8))
print(search_range([5, 7, 7, 8, 8, 10], 6))
print(search_range([], 1))`,
        },
        output: "(3, 4)\n(-1, -1)\n(-1, -1)",
        pitfalls: ["Subtracting one from bisect_right without checking that the value exists", "Using bisect_right for the left edge, which skips duplicates"],
      },
    },
    intermediate: {
      title: "Generate all subsets recursively",
      brief: ["Write `subsets(items)` returning every subset (the power set) using recursion. Explain why the output size is 2^n and what that means for n = 30."],
      criteria: ["Recursive solution with a clear base case", "Correct count 2^n", "Explanation of exponential growth"],
      hints: ["Subsets of [a, b, c] = subsets of [b, c] with and without a."],
      solution: {
        text: ["Each element doubles the number of subsets: take the subsets of the rest, then add a copy of each with the first element included. For n = 30 there are about 1.07 billion subsets: listing them is infeasible regardless of how fast each step is. Exponential algorithms are only for small n or need pruning (lesson 2.4.1)."],
        code: {
          lang: "python",
          file: "subsets.py",
          code: `def subsets(items: list[str]) -> list[list[str]]:
    if not items:                             # base case: one empty subset
        return [[]]
    rest = subsets(items[1:])                 # all subsets of the tail
    return rest + [[items[0], *s] for s in rest]   # without and with the head

result = subsets(["a", "b", "c"])
print(len(result))
print(sorted(result, key=lambda s: (len(s), s)))`,
        },
        output: "8\n[[], ['a'], ['b'], ['c'], ['a', 'b'], ['a', 'c'], ['b', 'c'], ['a', 'b', 'c']]",
        pitfalls: ["Mutating one shared list while backtracking", "Forgetting that the empty set is a subset"],
      },
    },
    challenge: {
      title: "Ship lessons within D days",
      brief: ["Lessons must be taken in order; each day you can study at most C minutes and a lesson cannot be split across days. Find the minimum C that finishes all lessons within D days."],
      criteria: ["Feasibility check O(n)", "Binary search over [max(lesson), sum(lessons)]", "Overall O(n log sum)"],
      hints: ["C must be at least the longest lesson, since lessons cannot be split.", "Feasibility is monotonic: if C works, every larger C works."],
      solution: {
        text: ["Greedy feasibility: fill each day until the next lesson would exceed C, then start a new day. The lower bound is the longest lesson and the upper bound is the sum, which always fits in one day. Binary search the smallest feasible C."],
        code: {
          lang: "python",
          file: "ship_lessons.py",
          code: `def days_for(capacity: int, lessons: list[int]) -> int:
    days, used = 1, 0
    for m in lessons:
        if used + m > capacity:               # start a new day
            days, used = days + 1, 0
        used += m
    return days

def min_capacity(lessons: list[int], d: int) -> int:
    lo, hi = max(lessons), sum(lessons)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_for(mid, lessons) <= d:
            hi = mid                          # feasible: try smaller
        else:
            lo = mid + 1
    return lo

print(min_capacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5))
print(min_capacity([3, 2, 2, 4, 1, 4], 3))`,
        },
        output: "15\n6",
        pitfalls: ["Starting lo at 0, which can never work because a lesson cannot be split", "Using days_for(capacity) < d instead of <= d"],
      },
    },
    capstone: {
      title: "DevAtlas: fast 'since' queries in memory",
      brief: ["The AI service keeps recent news items in memory sorted by published time. Add `items_since(ts)` using bisect and `insert_item(item)` using bisect.insort with a key, plus tests."],
      criteria: ["O(log n) lookup", "Sorted order maintained on insert", "Tests with equal timestamps"],
      hints: ["Python 3.10+ bisect functions accept key=."],
      solution: {
        text: [
          "`RecentNews` keeps one invariant: the list is sorted by `published_at`. `insert_item` uses `bisect.insort_right(..., key=...)`, which places an item after existing items with the same timestamp, so ties stay in arrival order. Finding the slot is O(log n); shifting the list is O(n) in the worst case, but it is a fast memory move and fine for tens of thousands of items.",
          "`items_since(ts)` uses `bisect_left` with the same key, so items exactly at ts are included, then slices: O(log n + k) for k results. One test swaps in a counting key function to show the lookup reads at most 17 keys for 100,000 items; others cover equal timestamps, an empty list, cutoffs before and after everything, and a randomised comparison with a linear scan.",
          "Naive datetimes are rejected because comparing naive and aware datetimes raises TypeError, and mixing time zones would misorder news from different sources. `max_items` bounds memory by dropping the oldest items.",
          "Run from services/ai: `python -m devatlas_ai.recent_news` prints the output below, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/recent_news.py", code: `"""In-memory recent news, kept sorted by published time for O(log n) 'since' queries."""
import bisect
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class NewsItem:
    id: str
    title: str
    published_at: datetime          # timezone-aware, so comparisons are unambiguous


def _published(item: NewsItem) -> datetime:
    return item.published_at


class RecentNews:
    """Invariant: self._items is sorted by published_at; equal times keep arrival order."""

    def __init__(self, max_items: int = 10_000) -> None:
        self._items: list[NewsItem] = []
        self.max_items = max_items

    def insert_item(self, item: NewsItem) -> None:
        """O(log n) to find the slot + O(n) worst case to shift the list (memmove, fast in practice).

        insort_right puts an item after existing items with the same timestamp (stable).
        """
        if item.published_at.tzinfo is None:
            raise ValueError("published_at must be timezone-aware")
        bisect.insort_right(self._items, item, key=_published)
        if len(self._items) > self.max_items:          # bound memory: drop the oldest
            del self._items[: len(self._items) - self.max_items]

    def items_since(self, ts: datetime) -> list[NewsItem]:
        """All items with published_at >= ts, oldest first. O(log n + k) for k results."""
        start = bisect.bisect_left(self._items, ts, key=_published)   # first item at or after ts
        return self._items[start:]

    def __len__(self) -> int:
        return len(self._items)


if __name__ == "__main__":
    def at(hour: int) -> datetime:
        return datetime(2026, 10, 18, hour, tzinfo=timezone.utc)

    news = RecentNews()
    for i, h in enumerate([9, 7, 12, 9, 15]):           # arrives out of order, two at 09:00
        news.insert_item(NewsItem(f"n{i}", f"story {i}", at(h)))
    print([(n.id, n.published_at.hour) for n in news.items_since(at(9))])
    print(len(news.items_since(at(16))), len(news.items_since(at(0))))

# ---- services/ai/tests/test_recent_news.py ----
import random
from datetime import datetime, timedelta, timezone

import pytest

from devatlas_ai.recent_news import NewsItem, RecentNews

T0 = datetime(2026, 10, 18, tzinfo=timezone.utc)


def item(i: str, minutes: int) -> NewsItem:
    return NewsItem(i, f"title {i}", T0 + timedelta(minutes=minutes))


def test_since_includes_items_exactly_at_ts_and_keeps_arrival_order_for_ties() -> None:
    news = RecentNews()
    for i, m in [("a", 10), ("b", 5), ("c", 10), ("d", 20), ("e", 10)]:
        news.insert_item(item(i, m))
    assert [n.id for n in news.items_since(T0 + timedelta(minutes=10))] == ["a", "c", "e", "d"]


def test_edges_empty_before_all_after_all() -> None:
    news = RecentNews()
    assert news.items_since(T0) == []
    news.insert_item(item("a", 1))
    assert [n.id for n in news.items_since(T0 - timedelta(days=1))] == ["a"]
    assert news.items_since(T0 + timedelta(minutes=2)) == []


def test_sorted_order_maintained_and_matches_linear_scan() -> None:
    rng = random.Random(42)
    news = RecentNews()
    inserted = [item(str(i), rng.randint(0, 100)) for i in range(500)]
    for it in inserted:
        news.insert_item(it)
    times = [n.published_at for n in news.items_since(T0)]
    assert times == sorted(times)
    cutoff = T0 + timedelta(minutes=50)
    expected = sorted((n for n in inserted if n.published_at >= cutoff), key=lambda n: n.published_at)
    assert news.items_since(cutoff) == expected      # stable sort == insort_right order


def test_max_items_drops_oldest() -> None:
    news = RecentNews(max_items=2)
    for i, m in [("a", 1), ("b", 3), ("c", 2)]:
        news.insert_item(item(i, m))
    assert [n.id for n in news.items_since(T0)] == ["c", "b"]


def test_naive_datetime_rejected() -> None:
    with pytest.raises(ValueError):
        RecentNews().insert_item(NewsItem("x", "t", datetime(2026, 1, 1)))


def test_lookup_is_logarithmic(monkeypatch: pytest.MonkeyPatch) -> None:
    import devatlas_ai.recent_news as mod
    news = RecentNews(max_items=200_000)
    for i in range(100_000):
        news.insert_item(item(str(i), i))
    calls = 0

    def counting_key(n: NewsItem) -> datetime:
        nonlocal calls
        calls += 1
        return n.published_at

    monkeypatch.setattr(mod, "_published", counting_key)
    assert len(news.items_since(T0 + timedelta(minutes=70_000))) == 30_000
    assert calls <= 17                          # ceil(log2(100_000)) = 17 key reads, not 100,000` },
        output: "[('n0', 9), ('n3', 9), ('n2', 12), ('n4', 15)]\n0 5",
        pitfalls: [
          "Passing an item as the search value to bisect_left with key=: the value must already be the key (the timestamp). insort is different: it applies key to the item.",
          "Calling insort O(log n): only the search is. Inserting into a Python list shifts elements, so for heavy write loads use a heap or a sorted-container library.",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: bisect", url: "https://docs.python.org/3/library/bisect.html" },
    { label: "Python docs: Sorting HOW TO", url: "https://docs.python.org/3/howto/sorting.html" },
    { label: "Python docs: functools.cache", url: "https://docs.python.org/3/library/functools.html#functools.cache" },
    { label: "Git docs: git bisect", url: "https://git-scm.com/docs/git-bisect" },
    { label: "CPython: listsort.txt (Timsort explained)", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" },
  ],
  nextPreview: "Next: trees, BSTs and heaps: the structures behind file systems, database indexes and priority queues.",
};
