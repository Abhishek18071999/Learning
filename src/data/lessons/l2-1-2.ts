import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.1.2",
  title: "Two pointers and sliding window",
  minutes: 85,
  level: "Beginner",
  prerequisites: ["2.1.1 Big-O and hash maps"],
  summary: "Master two patterns that turn many O(n²) array and string problems into O(n): two pointers moving through a sequence, and a window that grows and shrinks over it. Learn to recognise the shape, state the invariant, and prove the pointer moves are safe.",
  terms: [
    { term: "Two pointers", def: "Two indexes moving through data, from both ends toward the middle or both forward at different speeds, to avoid nested loops." },
    { term: "Sliding window", def: "A contiguous range [left, right] over an array or string that expands on the right and shrinks on the left while maintaining a running value." },
    { term: "Fixed window", def: "A window of constant size k, e.g. 'max sum of any 5 consecutive days'." },
    { term: "Variable window", def: "A window whose size changes to satisfy a condition, e.g. 'longest substring without repeats'." },
    { term: "Invariant", def: "A condition that stays true every time the loop moves, e.g. 'the window never contains a duplicate'. Designing the invariant is the core skill." },
    { term: "Subarray / substring", def: "A contiguous piece of an array/string. (A subsequence need not be contiguous; windows do not apply to it.)" },
    { term: "Amortised cost", def: "The average cost per step over a whole run. A shrink loop inside every iteration looks expensive, but left only moves n times in total, so the run is O(n)." },
    { term: "Monotone predicate", def: "A window rule whose truth is one-directional as the range grows: adding an element cannot repair an upper-bound violation ('too many duplicates', 'sum too high'), and adding cannot break a covering rule ('missing a required character'). Sliding windows are only correct when the rule has a consistent direction." },
    { term: "Opposite-end pointers", def: "l starts at 0 and r at n-1; each step moves exactly one of them inward. Works on sorted or symmetric data, and needs a proof that the discarded pointer cannot be in an answer." },
    { term: "Fast/slow pointers", def: "Both pointers move forward, usually at different speeds or for different jobs: read scans, write compacts, fast hunts for a cycle while slow advances one node." },
    { term: "Window state", def: "The running data a window keeps instead of re-scanning: a sum, a count map, a deque of timestamps, or a 'formed / required' pair. Updating it must be O(1) per move." },
  ],
  problem: [
    "DevAtlas wants a 'best 7-day streak' badge: the 7 consecutive days with the most study minutes. The first version recomputes the sum for every possible 7-day range: fine for one user, slow when computing badges for 200,000 users nightly. A rate limiter has the same shape: it must answer 'how many requests did this user make in the last 60 seconds?' on every request, without storing every request forever.",
    "Both are contiguous-range problems, and both get fast by updating a range instead of recomputing it. But candidates lose points by applying the pattern mechanically: opposite-end pointers on unsorted data, a shrinking window over negative numbers, or a shortest-window problem solved with the longest-window recipe. This lesson gives you the recognition signals, the invariant each pattern depends on, and the proof that moving a pointer never skips a valid answer.",
  ],
  concept: {
    analogy: [
      "A sliding window is like **reading a long receipt through a magnifying glass** that shows 7 lines. To move down one line you do not re-add all 7; you add the new line entering at the bottom and subtract the one leaving at the top. If the glass must never show a repeated item, you slide its lower edge down until the repeat is gone - that is the shrink loop.",
      "Two pointers from both ends is like **two people searching a sorted bookshelf** from opposite ends for two books whose prices add up to your budget: if the pair is too expensive, the right person moves to a cheaper book; too cheap, the left person moves to a pricier one. Each move throws away a whole row of possible pairs, which is why the search is linear rather than quadratic.",
    ],
    precise: [
      "**Two pointers, opposite ends** needs sorted data or a symmetric structure: pair sums, palindromes, container-with-most-water, reversing in place. `l` starts at 0, `r` at n-1, and each iteration moves exactly one of them inward, so there are at most n iterations. Sorting first costs O(n log n) and loses original indexes; if you need indexes with an unsorted array, use a hash map instead.",
      "**Two pointers, same direction (fast/slow)**: removing duplicates in place, partitioning, merging sorted arrays, finding the middle of a linked list, and Floyd's cycle detection. The fast pointer reads every element once; the slow pointer marks how much of the prefix is finished. Total work is O(n) and extra space is O(1).",
      "**Sliding window** applies to contiguous subarrays/substrings. Fixed size: build the first k elements, then add the entering element and subtract the leaving one, recording after each slide. Variable size: expand `right` one step at a time; while the window breaks its rule, shrink from `left`; record the best valid window. Each index enters once and leaves at most once, so the run is O(n) even though the code contains a nested `while`.",
      "**Recognition signals**: 'contiguous', 'substring', 'subarray', 'any k consecutive', 'at most k distinct', 'longest/shortest range with...', 'sorted array, find a pair'. Longest-valid windows need a rule that cannot be repaired by adding more elements (non-negative sums, duplicate counts). If values can be negative and you need exact sums, windows often fail; use prefix sums + a hash map. For 'shortest range covering everything', the logic flips: shrink while the window is still valid.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Decide whether the range is contiguous before choosing a tool.** A subarray or substring includes every element between two indexes, so it can be represented by one pair `(left, right)`. A subsequence may skip elements, so a window cannot represent it; that is dynamic programming or greedy territory. Two pointers also need a reason why discarding an index is safe, and sliding windows need a rule that behaves monotonically as the range grows or shrinks. If none of those hold, the honest answer is often a hash map or prefix sums.",
      "2. **Opposite-end invariant: the answer stays inside `[l, r]`.** Suppose the array is sorted and you are looking for a pair summing to `target`. If `a[l] + a[r] > target`, then for every `l' > l`, `a[l'] >= a[l]`, so `a[l'] + a[r] >= a[l] + a[r] > target`. No remaining element can pair with `a[r]`, so decrementing `r` discards only impossible pairs. Symmetrically, if the sum is too small, `a[l]` cannot pair with any remaining `r' <= r`, so incrementing `l` is safe. Each move deletes a whole row or column of the n² pair table, which is why n moves replace n² checks. Palindromes use the same invariant with equality: if the outer characters match, the answer is exactly the inner substring.",
      "3. **Opposite-end moves are not always symmetric: move the pointer that cannot improve.** In container-with-most-water, the area is `(r - l) * min(h[l], h[r])`. Moving the taller pointer inward can never increase the area: the width shrinks, and the height is still capped by the shorter bar, which did not move. So the only move that can possibly improve the answer is moving the shorter pointer. That is a proof obligation, not a coding preference: state which pointer is safe to discard and why. The same reasoning appears in binary search (discard the half that cannot contain the target).",
      "4. **Same-direction invariant: the prefix behind the slow pointer is finished.** In sorted deduplication, keep `nums[0..write)` deduplicated and containing every distinct value seen so far. The fast pointer reads each value; if it differs from `nums[write - 1]`, it is the first copy of a new value, so write it at `write` and advance. Because the input is sorted, all copies of a value are adjacent, so skipping the later copies cannot skip a distinct value. In Floyd's cycle detection, `slow` moves one node and `fast` two. With no cycle, `fast` reaches `None` after at most n/2 steps. With a cycle, once both pointers are inside it, `fast` closes the gap by one node per step, so they meet within one cycle length. Time O(n), extra space O(1).",
      "5. **Fixed window invariant: the state describes exactly k elements.** After the initial `sum(a[0:k])`, the invariant is '`window` is the sum of the last k elements ending at the current right index'. One update is `window += a[right] - a[right - k]`: the entering index is added, the leaving index subtracted. By induction the invariant holds after every slide, so each of the n-k+1 candidate windows is examined in O(1) and the total is Θ(n). No re-summation, and the state is O(1).",
      "6. **Variable window invariant: shrink only while the rule is broken.** For a longest-valid window, the rule is an upper bound ('no duplicate', 'sum <= budget', 'at most k distinct'). Expand with `right`. If the new window violates the rule, then every window that ends at this `right` and starts before the current `left` also violates it, because it contains the offending window and adding elements cannot repair an upper-bound violation. So advancing `left` is safe: it discards starts that provably cannot produce a valid answer. Stop as soon as the rule holds again; at that moment `[left, right]` is the longest valid window ending at `right`, and you record it. `left` never moves backwards, so each index enters once and leaves at most once: at most 2n pointer moves, hence O(n).",
      "7. **Shortest-window problems flip the shrink logic.** 'Smallest range containing all of t' is a lower-bound rule: adding characters can only help, and removing characters can break it. So expand until the window is valid (`formed == required`), then shrink while it is still valid, recording the window before each removal. The final valid window before `formed` drops is the shortest one ending at that `right`. `formed` counts how many distinct required keys have reached their required multiplicity, not the raw number of matching characters, which is what makes repeated characters in `t` work. Expansion and contraction are each O(1) amortised, so the whole scan is O(|s| + |t|).",
      "8. **The O(n) versus O(n²) proof, and what the stopwatch says.** Brute-force fixed windows do (n - k + 1) sums of k elements: Θ(nk), which is Θ(n²) when k grows with n. The sliding version does n - k + 1 constant-time updates: Θ(n). The variable window's nested `while` is also Θ(n) because `left` advances at most n times in total; formally, the potential `right - left` starts at 0, rises by one per expansion and falls by one per shrink, so total shrinks are bounded by total expansions. Measured on Python 3.11.15 for n = 100,000: sliding stayed at about 12 ms for k = 100, 500 and 2000, while brute force went from about 65 ms to 249 ms to 896 ms (speed-ups 5.2x, 19.7x, 75.0x). Python's C-level `sum()` makes the brute version faster than a hand-written inner loop, so constants are not the argument; the slope is. Timings vary by machine and run. Negative values break the monotone argument: adding a negative number can lower a sum that was too high, so a window you shrank may have been repairable - use prefix sums plus a hash map for exact-sum problems with negatives.",
    ],
    diagram: {
      title: "Restoring a broken window: longest substring without repeats",
      nodes: [
        { label: "Expand right", sub: "add s[right]" },
        { label: "Rule broken?", sub: "duplicate inside window" },
        { label: "Shrink left", sub: "left = last_seen + 1" },
        { label: "Invariant holds", sub: "no duplicates in [left, right]" },
        { label: "Record best", sub: "length = right - left + 1" },
      ],
      edges: ["one character", "yes", "restored", "every right"],
      caption: "Shrinking is only safe because adding a duplicate can never repair a duplicate: every start before the new left also contains it. That is the monotone rule in action.",
    },
  },
  handsOn: [
    {
      title: "Know which shape you need",
      text: [
        "Read the problem statement first, not the examples. The wording usually names the pattern. The table also records the precondition and the state each pattern must maintain; if you cannot name the state, you cannot keep the invariant.",
      ],
      code: {
        lang: "text",
        file: "pattern-picker.txt",
        code: `SIGNAL IN THE PROBLEM                  PATTERN              PRECONDITION                STATE
"contiguous", subarray, substring     sliding window       sequence                    [left, right] + running value
"any k consecutive"                  fixed window         k given                     sum/count of exactly k
"longest ... with at most/<= ..."    variable window      adding cannot repair        counts, sum, formed
"shortest ... covering/all of ..."   variable window      removing cannot repair      need/have counts, formed
"sorted, find a pair"                opposite ends        sorted                      a[l] + a[r]
"palindrome", "reverse"              opposite ends        symmetric access            two indexes
"in place", "remove duplicates"      fast/slow            duplicates are adjacent     write index
"cycle", "middle of a list"          fast/slow            linked structure            two node references

FIXED WINDOW                          VARIABLE WINDOW
size is given (k)                     size is discovered
add entering, subtract leaving        expand right; shrink left while invalid
one pass, O(1) state                  one pass, O(n) state (counts, deque)
record after every slide              record after every valid expansion
cannot answer "longest <= budget"     handles "longest/shortest with ..."`,
      },
      notes: [
        "If the problem says 'subsequence', stop - it is not contiguous, so a window cannot represent it.",
        "If values can be negative, an upper-bound sum rule is no longer monotone; prefer prefix sums + hash map.",
      ],
    },
    {
      title: "Fixed window: best 7-day study streak, measured against brute force",
      text: [
        "The first function is the production shape: O(n) time, O(1) extra space. The second is the definition written literally, recomputing every window. Both must return the same answer; the table shows why the definition stops scaling when k grows.",
      ],
      code: {
        lang: "python",
        file: "windows.py",
        code: `"""O(n) vs O(n*k): the same answer, measured two ways."""
import random
import time


def best_window_sum(minutes: list[int], k: int) -> int:
    if k <= 0 or k > len(minutes):
        raise ValueError("k must be between 1 and len(minutes)")
    window = sum(minutes[:k])
    best = window
    for right in range(k, len(minutes)):
        window += minutes[right] - minutes[right - k]
        best = max(best, window)
    return best


def brute_force_sum(minutes: list[int], k: int) -> int:
    best = float("-inf")
    for start in range(len(minutes) - k + 1):
        best = max(best, sum(minutes[start:start + k]))
    return best


rng = random.Random(7)
daily = [rng.randint(0, 120) for _ in range(100_000)]
print(f"n = {len(daily):,} days")
print(f"{'k':>5} {'sliding':>11} {'brute force':>13} {'speed-up':>9}")
for k in (100, 500, 2000):
    t0 = time.perf_counter()
    fast = best_window_sum(daily, k)
    t1 = time.perf_counter()
    slow = brute_force_sum(daily, k)
    t2 = time.perf_counter()
    assert fast == slow
    print(f"{k:>5} {(t1 - t0) * 1000:8.1f} ms {(t2 - t1) * 1000:10.1f} ms {(t2 - t1) / (t1 - t0):8.1f}x")

print()
print(best_window_sum([30, 0, 45, 60, 20, 0, 90, 40, 10, 75], 3))
print(best_window_sum([30, 0, 45, 60, 20, 0, 90, 40, 10, 75], 7))`,
      },
      output: "n = 100,000 days\n    k     sliding   brute force  speed-up\n  100     12.7 ms       65.2 ms      5.2x\n  500     12.7 ms      249.0 ms     19.7x\n 2000     11.9 ms      895.7 ms     75.0x\n\n140\n295",
      notes: [
        "Measured once with Python 3.11.15 on a Windows laptop. Absolute times vary by machine and run; what reproduces is the shape - sliding stays flat as k grows, brute force grows with k, and the gap widens. That is O(n) versus O(n·k) made visible.",
        "The last two lines are the lesson's original checks: the best 3-day sum is 90 + 40 + 10 = 140, and the best 7-day sum is 60 + 20 + 0 + 90 + 40 + 10 + 75 = 295. For 200,000 users with a year of history, brute force repeats work per user while the sliding version touches each day twice.",
        "Python's C-level `sum()` narrows the constant factor, so at k = 100 the brute version is only ~5x slower. Do not conclude 'brute force is fine'; the ratio is already growing with k, and a hand-written inner loop in another language shows the asymptotic gap much sooner.",
      ],
    },
    {
      title: "Variable window: a real window trace, plus a covered-window and a time window",
      text: [
        "Three variable windows, one idea. The first prints every step so you can see `left` jump forward and never back. The second is the opposite rule: not 'keep the window valid while expanding' but 'shrink while it is still valid', which is how minimum-window problems work. The third applies the same shrink loop to timestamps instead of characters.",
      ],
      code: {
        lang: "python",
        file: "variable_windows.py",
        code: `from collections import Counter, deque


def longest_unique(s: str) -> int:
    last_seen: dict[str, int] = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best


def trace_longest_unique(s: str) -> int:
    last_seen: dict[str, int] = {}
    left = best = 0
    print(f"s = {s!r}")
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            old = left
            left = last_seen[ch] + 1
            note = f"repeat of {ch!r}: left {old}->{left}"
        else:
            note = "new character"
        last_seen[ch] = right
        length = right - left + 1
        best = max(best, length)
        print(f"  right={right} {ch!r} {note:<26} window=[{left}..{right}] {s[left:right + 1]!r:<7} len={length} best={best}")
    return best


print(f"best={trace_longest_unique('abcabcbb')}")
print()
for s in ["abcabcbb", "bbbbb", "pwwkew", ""]:
    print(s or '""', longest_unique(s))


def longest_under_budget(costs: list[int], budget: int) -> int:
    """Longest contiguous run with total cost <= budget. Costs must be non-negative."""
    left = total = best = 0
    for right, c in enumerate(costs):
        total += c
        while total > budget:
            total -= costs[left]
            left += 1
        best = max(best, right - left + 1)
    return best


print(longest_under_budget([3, 1, 2, 7, 1, 1, 1, 4], 5))


def min_window(s: str, t: str) -> str:
    if not t or not s:
        return ""
    need = Counter(t)
    have: Counter[str] = Counter()
    formed, required = 0, len(need)
    left = 0
    best = (float("inf"), 0, 0)
    print()
    print(f"s = {s!r}  t = {t!r}")
    for right, ch in enumerate(s):
        have[ch] += 1
        if ch in need and have[ch] == need[ch]:
            formed += 1
        while formed == required:
            length = right - left + 1
            new = length < best[0]
            if new:
                best = (length, left, right)
            print(f"  valid [{left}..{right}] {s[left:right + 1]!r:<9} len={length} best={best[0]}" + ("  <- new best" if new else ""))
            out = s[left]
            have[out] -= 1
            if out in need and have[out] < need[out]:
                formed -= 1
            left += 1
    print(f"  answer = {s[best[1]:best[2] + 1]!r}")
    return "" if best[0] == float("inf") else s[best[1]:best[2] + 1]


min_window("ADOBECODEBANC", "ABC")


class SlidingWindowLimiter:
    """Allow at most 'limit' events per 'window' seconds per key."""

    def __init__(self, limit: int, window: float) -> None:
        self.limit, self.window = limit, window
        self.events: dict[str, deque[float]] = {}

    def allow(self, key: str, now: float) -> bool:
        q = self.events.setdefault(key, deque())
        while q and q[0] <= now - self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True


rl = SlidingWindowLimiter(limit=3, window=60)
print([rl.allow("asha", t) for t in [0, 10, 20, 30, 61, 75]])`,
      },
      output: "s = 'abcabcbb'\n  right=0 'a' new character              window=[0..0] 'a'     len=1 best=1\n  right=1 'b' new character              window=[0..1] 'ab'    len=2 best=2\n  right=2 'c' new character              window=[0..2] 'abc'   len=3 best=3\n  right=3 'a' repeat of 'a': left 0->1   window=[1..3] 'bca'   len=3 best=3\n  right=4 'b' repeat of 'b': left 1->2   window=[2..4] 'cab'   len=3 best=3\n  right=5 'c' repeat of 'c': left 2->3   window=[3..5] 'abc'   len=3 best=3\n  right=6 'b' repeat of 'b': left 3->5   window=[5..6] 'cb'    len=2 best=3\n  right=7 'b' repeat of 'b': left 5->7   window=[7..7] 'b'     len=1 best=3\nbest=3\n\nabcabcbb 3\nbbbbb 1\npwwkew 3\n\"\" 0\n3\n\ns = 'ADOBECODEBANC'  t = 'ABC'\n  valid [0..5] 'ADOBEC'  len=6 best=6  <- new best\n  valid [1..10] 'DOBECODEBA' len=10 best=6\n  valid [2..10] 'OBECODEBA' len=9 best=6\n  valid [3..10] 'BECODEBA' len=8 best=6\n  valid [4..10] 'ECODEBA' len=7 best=6\n  valid [5..10] 'CODEBA'  len=6 best=6\n  valid [6..12] 'ODEBANC' len=7 best=6\n  valid [7..12] 'DEBANC'  len=6 best=6\n  valid [8..12] 'EBANC'   len=5 best=5  <- new best\n  valid [9..12] 'BANC'    len=4 best=4  <- new best\n  answer = 'BANC'\n[True, True, True, False, True, True]",
      notes: [
        "Trace the longest-unique run: at right=3 the second 'a' arrives while the window is [0..2]; `left` jumps 0 -> 1, not one step at a time. At right=6 the repeat is 'b' at index 4, outside the old left of 3 only in the sense that `last_seen` is stale; the guard `last_seen[ch] >= left` is what prevents left from jumping backwards (the 'abba' bug).",
        "`longest_under_budget` returns 3: the longest run under budget 5 is [1, 1, 1] at indexes 4..6. The shrink loop is correct only because costs are non-negative - adding an element can never lower the total, so once the window is too expensive the only repair is to drop from the left. A negative cost would break that argument.",
        "In the minimum-window trace, notice the two phases: expand until [0..5] first covers A, B and C, then shrink while still valid. The shortest answer 'BANC' is found at [9..12]. Recording inside the shrink loop is mandatory; recording after the loop would miss every shorter candidate.",
        "The rate limiter is a variable window over time: at t=30 the queue holds 0, 10, 20, so a fourth request is rejected; at t=61 the timestamp 0 has left the (1, 61] window, so it is allowed again. Rejected requests are not appended, which is why a retrying client can recover.",
      ],
    },
    {
      title: "One decision tree, before writing any loop",
      text: [
        "Use the questions in order. Most wrong answers come from skipping the first two: choosing a window for a non-contiguous problem, or choosing opposite-end pointers without sorted input.",
      ],
      code: {
        lang: "mermaid",
        file: "choose-pattern.mmd",
        code: `flowchart TD
  A[Read the problem] --> B{Contiguous range?}
  B -- no --> C[Not a window: sort, hash map, DP or heap]
  B -- yes --> D{Sorted or symmetric ends?}
  D -- yes --> E[Opposite-end pointers]
  D -- no --> F{Size fixed to k?}
  F -- yes --> G[Fixed window: add entering, subtract leaving]
  F -- no --> H{Predicate monotone?}
  H -- no --> I[Prefix sums + hash map]
  H -- yes --> J{Need longest or shortest?}
  J -- longest --> K[Expand right; while invalid shrink left; record valid]
  J -- shortest --> L[Expand until valid; while valid shrink and record]
  E --> M[Prove the discarded pointer cannot be in an answer]
  K --> M
  L --> M
  G --> M`,
      },
      notes: [
        "The last box is the part interviewers probe: name what a pointer move eliminates. 'Sorted, so r can never pair with anything to its left' is a proof; 'it is the standard pattern' is not.",
      ],
    },
    {
      title: "Two pointers in both directions, with a full sorted-pair walk",
      text: [
        "The walk prints every comparison, so you can see the search space shrinking. The remaining functions are the same invariant in different clothes: palindrome (symmetric ends), container-with-most-water (move the shorter side), dedupe (slow write pointer), and Floyd's cycle detection (fast/slow on nodes).",
      ],
      code: {
        lang: "python",
        file: "pointers.py",
        code: `def pair_with_sum_walk(nums: list[int], target: int) -> tuple[int, int] | None:
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        verdict = "==" if s == target else ("<" if s < target else ">")
        print(f"l={l} r={r}  {nums[l]:>2} + {nums[r]:>2} = {s:>2} {verdict} {target}")
        if s == target:
            return l, r
        if s < target:
            l += 1
        else:
            r -= 1
    return None


print(pair_with_sum_walk([1, 3, 4, 6, 9, 11], 13))


def pair_with_sum(sorted_nums: list[int], target: int) -> tuple[int, int] | None:
    l, r = 0, len(sorted_nums) - 1
    while l < r:
        s = sorted_nums[l] + sorted_nums[r]
        if s == target:
            return l, r
        if s < target:
            l += 1
        else:
            r -= 1
    return None


def is_palindrome(text: str) -> bool:
    chars = [c.lower() for c in text if c.isalnum()]
    l, r = 0, len(chars) - 1
    while l < r:
        if chars[l] != chars[r]:
            return False
        l, r = l + 1, r - 1
    return True


def max_area(heights: list[int]) -> int:
    l, r = 0, len(heights) - 1
    best = 0
    while l < r:
        best = max(best, (r - l) * min(heights[l], heights[r]))
        if heights[l] < heights[r]:
            l += 1
        else:
            r -= 1
    return best


def dedupe_sorted(nums: list[int]) -> int:
    if not nums:
        return 0
    write = 1
    for read in range(1, len(nums)):
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write


class Node:
    def __init__(self, value: int, nxt: "Node | None" = None) -> None:
        self.value, self.next = value, nxt


def has_cycle(head: Node | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:
            return True
    return False


print(pair_with_sum([1, 3, 4, 6, 9, 11], 13))
print(is_palindrome("A man, a plan, a canal: Panama"))
print(max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))

xs = [1, 1, 2, 3, 3, 3, 7]
n = dedupe_sorted(xs)
print(n, xs[:n])

third = Node(3)
second = Node(2, third)
first = Node(1, second)
third.next = second
print(has_cycle(first), has_cycle(Node(1, Node(2, Node(3)))))`,
      },
      output: "l=0 r=5   1 + 11 = 12 < 13\nl=1 r=5   3 + 11 = 14 > 13\nl=1 r=4   3 +  9 = 12 < 13\nl=2 r=4   4 +  9 = 13 == 13\n(2, 4)\n(2, 4)\nTrue\n49\n4 [1, 2, 3, 7]\nTrue False",
      notes: [
        "The walk discards 11 candidates in four comparisons. When 1 + 11 was too small, every pair (1, r') with r' < 5 is also too small, so l advances. When 3 + 11 was too large, every pair (l', 11) with l' > 1 is also too large, so r retreats. That is the proof in action, not a heuristic.",
        "Container with most water returns 49: width 7 (indexes 1 and 8) times the shorter height 7. Moving the taller bar inward would only reduce width, so the algorithm always moves the shorter one. Palindrome strips punctuation and case first; dedupe leaves the logical prefix [1, 2, 3, 7] in the original list; Floyd returns True for the cycle and False for the acyclic list.",
        "All five functions are O(n) time. The two-pointer pair search is O(1) extra space, which is its advantage over the hash-map Two Sum when the array is already sorted and indexes may be returned after sorting.",
      ],
    },
  ],
  companies: [
    "**API gateways and rate limiting (illustrative; the limiter in this lesson is a simplified version):** gateways enforce 'at most N requests per user per minute' with an exact sliding window of timestamps (Redis sorted sets) or a cheaper sliding-window counter that approximates the boundary. The invariant is the same as `SlidingWindowLimiter`: drop timestamps older than the window, then count.",
    "**Monitoring and alerting (illustrative):** rules such as 'error rate over the last 5 minutes above 2%' are sliding windows over a stream. Prometheus-style systems evaluate them every few seconds, so the window state is kept incrementally rather than by scanning five minutes of events each time.",
    "**Streaming analytics (illustrative):** Kafka Streams, Flink and Spark Structured Streaming expose tumbling, hopping and sliding windows as operators. A hopping window is a fixed-size window that advances by a smaller step, which is exactly the 'add entering buckets, subtract leaving buckets' update at scale.",
    "**Query engines and storage (illustrative):** merge joins walk two sorted inputs with one pointer each, and LSM-tree compaction merges sorted runs the same way. SQL window functions (`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`) are fixed sliding windows evaluated per row.",
    "**Log and event processing (illustrative):** deduplicating sorted log shards uses the fast/slow write pointer, and 'top errors in the last hour' uses a bounded time window. Both avoid sorting or scanning the full history on every query.",
  ],
  mistakes: [
    { mistake: "Recomputing the window sum each step", why: "Directly translating the definition", wrong: "O(n·k) instead of O(n); the measured gap grows with k", fix: "Update incrementally: add the entering element, remove the leaving one" },
    { mistake: "Using a shrinking window with negative numbers", why: "The pattern worked on positive data", wrong: "Shrinking may skip valid answers because adding a negative can lower a sum that was too high", fix: "Prefix sums + hash map for exact-sum problems with negatives" },
    { mistake: "Off-by-one in window length", why: "right - left vs right - left + 1", wrong: "Answers off by one, especially on tiny inputs", fix: "Inclusive window [left, right] has length right - left + 1; test with 1-element input" },
    { mistake: "Opposite-end pointers on unsorted data", why: "Forgetting the precondition", wrong: "Wrong answers with no error", fix: "Sort first (O(n log n)) or use a hash map" },
    { mistake: "Moving left backwards in the longest-unique problem", why: "Setting left = last_seen[ch] + 1 unconditionally", wrong: "The window re-includes earlier duplicates (try 'abba')", fix: "Only move left forward: check last_seen[ch] >= left, or use max()" },
    { mistake: "Using the longest-window recipe for a shortest-window problem", why: "'Sliding window' sounds like one algorithm", wrong: "You shrink only while invalid, so you never see the small valid windows and return the wrong answer", fix: "For 'cover everything', expand until valid, then shrink while still valid and record each window" },
    { mistake: "Recording the minimum-window answer after the shrink loop", why: "Copying the longest-window placement", wrong: "The loop ends with an invalid window, so the candidate is lost", fix: "Record inside the while loop, before each removal" },
    { mistake: "Using a list as the queue in a time window", why: "append/pop looks symmetrical", wrong: "pop(0) is O(n), turning the limiter into O(n) per request", fix: "Use collections.deque and popleft()" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Maintain a running state (sum, counts, deque) and update it per move; never re-scan the window." },
    { tag: "Maintainability", text: "Write the invariant as a comment before coding: 'window [left, right] has total <= budget and left is minimal'." },
    { tag: "Reliability", text: "Test empty input, size-1 input, all-equal values, the window covering the whole array, and a case where the answer is at the end." },
    { tag: "Performance", text: "Use a deque for timestamp windows (O(1) pops from the left); lists pop(0) are O(n)." },
    { tag: "Maintainability", text: "State preconditions (sorted? non-negative? contiguous?) in the docstring, and compare against a brute-force implementation on small random inputs in tests." },
  ],
  interview: [
    { q: "How do you know a problem is a sliding-window problem?", a: "Ask three questions. First, is the answer a contiguous subarray or substring? If it is a subsequence, a window cannot represent it. Second, can the condition be maintained incrementally as the range grows and shrinks ('at most k distinct', 'sum <= budget', 'contains all of t')? Third, is the predicate monotone in the direction you need: for longest-valid, adding elements must not repair a violation (so non-negative values or duplicate counts); for shortest-covering, removing elements must not repair a violation. If all three hold, expand right and shrink left; each index enters and leaves once, so it is O(n). If values can be negative and the sum must be exact, say so and use prefix sums plus a hash map instead." },
    { q: "Why is the variable sliding window O(n) despite the nested while loop?", a: "Count pointer moves, not loop iterations. right moves from 0 to n-1, exactly n times. left starts at 0 and only ever increases, so across the entire run it moves at most n times. Every iteration of the inner while performs one left increment, so the inner loop's total work over the whole algorithm is at most n - not n per outer iteration. Total pointer moves are at most 2n, hence O(n). The same potential argument proves it: right - left rises by one per expansion and falls by one per shrink. Compare with brute force, which sums k elements for each of n positions: Θ(nk), or Θ(n²) when k is proportional to n." },
    { q: "Two Sum on a sorted array: hash map or two pointers?", a: "Two pointers. Start l at 0 and r at n-1. If a[l] + a[r] equals the target, return the pair. If it is too large, a[r] cannot pair with any l' >= l because a[l'] is at least a[l], so decrement r. If it is too small, a[l] cannot pair with any r' <= r, so increment l. Each step discards a row of the pair table, giving O(n) time and O(1) extra space. The hash map is also O(n) time but O(n) space; it is the better choice when the array is unsorted and you must preserve original indexes, or when you need all pairs or a count. If duplicates or multiple answers are allowed, say how the pointer version should handle equal values." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which problem is NOT a good fit for a sliding window?",
      options: ["Longest substring with at most 2 distinct characters", "Max sum of 30 consecutive daily sales", "Longest increasing subsequence (not contiguous)", "Shortest subarray with sum ≥ target (all positive)"],
      answer: 2,
      explanation: "Subsequences are not contiguous; windows only work on contiguous ranges. LIS is a dynamic programming problem.",
    },
    {
      kind: "output",
      prompt: "best_window_sum([5, 1, 1, 5], 2) returns:",
      options: ["6", "10", "2", "7"],
      answer: 0,
      explanation: "Windows: 5+1=6, 1+1=2, 1+5=6. Max is 6.",
    },
    {
      kind: "bug",
      prompt: "longest_unique('abba') should be 2 but this returns 3. Why?",
      code: { lang: "python", code: "for right, ch in enumerate(s):\n    if ch in last_seen:\n        left = last_seen[ch] + 1\n    last_seen[ch] = right\n    best = max(best, right - left + 1)" },
      options: ["enumerate starts at 1", "left can move backwards when an old duplicate is outside the window", "best should start at 1", "dicts are unordered"],
      answer: 1,
      explanation: "At the final 'a', last_seen['a']=0 moves left from 2 back to 1. Only move left forward: require last_seen[ch] >= left.",
    },
  ],
  cheatSheet: [
    "Contiguous + monotone condition → sliding window. Sorted/symmetric + pair → opposite-end pointers.",
    "Fixed window: add entering, subtract leaving; state is O(1).",
    "Longest variable window: expand right; while invalid shrink left; record after valid.",
    "Shortest variable window: expand until valid; while valid shrink and record each candidate.",
    "Window length = right - left + 1.",
    "Each pointer moves forward only → at most 2n moves → O(n), even with a nested while.",
    "Opposite ends: discard the pointer that cannot be in an answer (too big → r--, too small → l++).",
    "Negatives + exact sum → prefix sums + hash map, not windows.",
    "Fast/slow pointers for in-place dedupe, partitioning, middle node and Floyd cycle detection.",
    "deque for time-based windows; never list.pop(0).",
  ],
  homework: {
    basic: {
      title: "Max average subarray and valid palindrome",
      brief: ["Solve: (1) max average of any k consecutive elements; (2) is a string a palindrome if you may delete at most one character? Give complexity for each."],
      criteria: ["Fixed window for (1)", "Two pointers with one allowed skip for (2)", "O(n) time both, and a stated invariant for each"],
      hints: ["(2) On the first mismatch, try skipping the left char or the right char and check the rest.", "For (1), the max average is the max sum divided by k - do not recompute sums."],
      solution: {
        text: [
          "(1) is best_window_sum divided by k: the window state is the sum of exactly k elements, updated by adding the entering value and subtracting the leaving one. O(n) time, O(1) space.",
          "(2) Two pointers from the ends. On the first mismatch, at most one deletion is left, so check whether either remaining substring - skipping the left character or skipping the right one - is a palindrome. That inner check is another two-pointer pass, so the worst case is O(n) time and O(1) space. The invariant is 'the outer characters matched so far need no deletion'.",
        ],
        code: {
          lang: "python",
          code: `def max_average(nums: list[int], k: int) -> float:
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best / k

def almost_palindrome(s: str) -> bool:
    def is_pal(l: int, r: int) -> bool:
        while l < r:
            if s[l] != s[r]:
                return False
            l, r = l + 1, r - 1
        return True
    l, r = 0, len(s) - 1
    while l < r:
        if s[l] != s[r]:
            return is_pal(l + 1, r) or is_pal(l, r - 1)
        l, r = l + 1, r - 1
    return True

assert max_average([1, 12, -5, -6, 50, 3], 4) == 12.75
assert almost_palindrome("abca") and not almost_palindrome("abc")`,
        },
      },
    },
    intermediate: {
      title: "Longest substring with at most k distinct characters",
      brief: ["Return the length of the longest substring containing at most k distinct characters. Example: 'eceba', k=2 → 3 ('ece')."],
      criteria: ["Variable window with a count map", "O(n) time", "Handles k=0 and empty string", "A comment naming the invariant and why shrinking is safe"],
      hints: ["Keep counts in a dict; when len(counts) > k, shrink and delete keys whose count reaches 0.", "The rule 'at most k keys' is an upper bound, so adding a new key can break it and removing keys can only repair it."],
      solution: {
        text: [
          "The window invariant is 'at most k keys in counts'. Adding a character can create the (k+1)-th key, which no further expansion can repair, so shrink until the key count returns to k. left only moves forward, and every key deletion happens at most once per key occurrence, so the total work is O(n).",
        ],
        code: {
          lang: "python",
          code: `from collections import defaultdict

def longest_k_distinct(s: str, k: int) -> int:
    counts: defaultdict[str, int] = defaultdict(int)
    left = best = 0
    for right, ch in enumerate(s):
        counts[ch] += 1
        while len(counts) > k:
            counts[s[left]] -= 1
            if counts[s[left]] == 0:
                del counts[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best

assert longest_k_distinct("eceba", 2) == 3
assert longest_k_distinct("aa", 1) == 2
assert longest_k_distinct("abc", 0) == 0`,
        },
      },
    },
    challenge: {
      title: "Minimum window substring",
      brief: ["Given s and t, find the smallest substring of s containing all characters of t (with multiplicity). 'ADOBECODEBANC', 'ABC' → 'BANC'. Explain your invariant and complexity."],
      criteria: ["O(len(s) + len(t))", "Correct with repeated characters in t", "Returns '' when impossible", "A written explanation of why the shrink loop records inside the loop"],
      hints: ["Track how many required characters are currently satisfied ('formed'). Expand until all are satisfied, then shrink while still satisfied.", "The rule is a lower bound: removing characters can break it, so shrinking must stop as soon as formed < required."],
      solution: {
        text: [
          "Expand right until the window satisfies every required count; then shrink left as far as possible while still satisfied, recording the best window each time. The last valid window before `formed` drops below `required` is the shortest one ending at that right, so the answer is the minimum over all right endpoints.",
          "`formed` counts distinct required keys whose counts have reached the target, not raw matching characters; that is what handles repeated characters in t. The trace in the lesson shows the flip from 'ADOBEC' (length 6) to 'BANC' (length 4).",
        ],
        code: {
          lang: "python",
          code: `from collections import Counter

def min_window(s: str, t: str) -> str:
    if not t or not s:
        return ""
    need = Counter(t)
    have: Counter[str] = Counter()
    formed, required = 0, len(need)
    best = (float("inf"), 0, 0)
    left = 0
    for right, ch in enumerate(s):
        have[ch] += 1
        if ch in need and have[ch] == need[ch]:
            formed += 1
        while formed == required:
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right)
            out = s[left]
            have[out] -= 1
            if out in need and have[out] < need[out]:
                formed -= 1
            left += 1
    return "" if best[0] == float("inf") else s[best[1]:best[2] + 1]

assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "aa") == ""`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: best-week badge and API rate limiter",
      brief: ["Add `best_streak_minutes(daily_minutes, k)` to the AI service for badges, and the SlidingWindowLimiter as middleware-ready code with tests using fixed timestamps."],
      criteria: ["O(n) badge computation", "Limiter tests with explicit times (no real clock)", "Documented memory cost per key", "At least one test comparing the window against brute force"],
      hints: ["Memory per key is O(limit) timestamps.", "Use a randomised test to compare best_streak_minutes with the O(n·k) definition."],
      solution: {
        text: [
          "`best_streak_minutes` is the fixed window from the lesson: add the day entering, subtract the day leaving, O(n) time and O(1) space. Users with fewer than k days get None (no badge yet) instead of an exception, and a randomised test compares it with the brute-force O(n·k) sums.",
          "The limiter takes an injectable `clock` (default `time.monotonic`, which never jumps backwards) and an optional `now`, so tests pass explicit timestamps and never sleep. `retry_after` gives the value for a 429 response's Retry-After header, which is what HTTP middleware needs.",
          "Memory is O(limit) timestamps per active key, O(active keys × limit) in total: with limit 100 and 50,000 active keys that is 5 million timestamps, on the order of 150 MB in CPython. `prune_idle` removes keys with no events in the window (call it from a periodic task); beyond one process, move the same idea to Redis (lesson 4.4.2).",
          "Run from services/ai: `python -m devatlas_ai.ratelimit` prints the output below, `pytest` runs the tests. The limiter's invariant is 'the deque holds exactly the accepted timestamps in (now - window, now]'; the expiry loop is the shrink step, and it is amortised O(1) because each timestamp is popped once.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/streaks.py", code: `"""Best-week badge: fixed sliding window over daily study minutes."""


def best_streak_minutes(daily_minutes: list[int], k: int = 7) -> int | None:
    """Max total minutes over any k consecutive days, or None if there are fewer than k days.

    O(n) time, O(1) extra space: each step adds the day entering and subtracts the day leaving.
    """
    if k <= 0:
        raise ValueError("k must be >= 1")
    if len(daily_minutes) < k:
        return None                          # not enough history for the badge yet
    window = best = sum(daily_minutes[:k])
    for right in range(k, len(daily_minutes)):
        window += daily_minutes[right] - daily_minutes[right - k]
        best = max(best, window)
    return best

# ---- services/ai/devatlas_ai/ratelimit.py ----
"""Sliding-window rate limiter with an injectable clock, ready to wrap in HTTP middleware."""
import time
from collections import deque
from collections.abc import Callable


class SlidingWindowLimiter:
    """At most \`limit\` events per \`window\` seconds per key.

    Memory: O(limit) timestamps per active key (one float each, plus deque overhead),
    so O(active_keys * limit) in total. Call prune_idle() periodically to drop idle keys.
    allow() is amortised O(1): each timestamp is appended once and popped at most once.
    """

    def __init__(self, limit: int, window: float,
                 clock: Callable[[], float] = time.monotonic) -> None:
        if limit < 1 or window <= 0:
            raise ValueError("limit must be >= 1 and window > 0")
        self.limit, self.window, self._clock = limit, window, clock
        self._events: dict[str, deque[float]] = {}

    def _expire(self, q: deque[float], now: float) -> None:
        while q and q[0] <= now - self.window:     # shrink: drop timestamps outside (now-window, now]
            q.popleft()

    def allow(self, key: str, now: float | None = None) -> bool:
        now = self._clock() if now is None else now
        q = self._events.setdefault(key, deque())
        self._expire(q, now)
        if len(q) >= self.limit:
            return False                            # rejected requests are not recorded
        q.append(now)
        return True

    def retry_after(self, key: str, now: float | None = None) -> float:
        """Seconds until the next request for key would be allowed (for a Retry-After header)."""
        now = self._clock() if now is None else now
        q = self._events.get(key)
        if not q:
            return 0.0
        self._expire(q, now)
        return 0.0 if len(q) < self.limit else q[0] + self.window - now

    def prune_idle(self, now: float | None = None) -> int:
        """Remove keys with no events inside the window. O(keys). Returns how many were removed."""
        now = self._clock() if now is None else now
        idle = [k for k, q in self._events.items() if not q or q[-1] <= now - self.window]
        for k in idle:
            del self._events[k]
        return len(idle)

    def active_keys(self) -> int:
        return len(self._events)


if __name__ == "__main__":
    from devatlas_ai.streaks import best_streak_minutes
    print(best_streak_minutes([30, 0, 45, 60, 20, 0, 90, 40, 10, 75]))
    rl = SlidingWindowLimiter(limit=3, window=60)
    print([rl.allow("asha", t) for t in [0, 10, 20, 30, 61, 75]], rl.retry_after("asha", 75))

# ---- services/ai/tests/test_streaks.py ----
import pytest

from devatlas_ai.streaks import best_streak_minutes


def brute(xs: list[int], k: int) -> int:
    return max(sum(xs[i:i + k]) for i in range(len(xs) - k + 1))


def test_best_week() -> None:
    daily = [30, 0, 45, 60, 20, 0, 90, 40, 10, 75]
    assert best_streak_minutes(daily) == 295 == brute(daily, 7)


def test_edge_cases() -> None:
    assert best_streak_minutes([10] * 6) is None            # fewer than 7 days: no badge
    assert best_streak_minutes([5] * 7) == 35                # window is the whole list
    assert best_streak_minutes([0, 9, 0], k=1) == 9
    with pytest.raises(ValueError):
        best_streak_minutes([1, 2], k=0)


def test_matches_brute_force_on_random_input() -> None:
    import random
    rng = random.Random(7)
    for _ in range(200):
        xs = [rng.randint(0, 120) for _ in range(rng.randint(1, 40))]
        k = rng.randint(1, len(xs))
        assert best_streak_minutes(xs, k) == brute(xs, k)

# ---- services/ai/tests/test_ratelimit.py ----
import pytest

from devatlas_ai.ratelimit import SlidingWindowLimiter


def test_limit_and_window_with_fixed_times() -> None:
    rl = SlidingWindowLimiter(limit=3, window=60)
    assert [rl.allow("asha", t) for t in [0, 10, 20, 30]] == [True, True, True, False]
    assert rl.retry_after("asha", 30) == 30                  # t=0 leaves the window at t=60
    assert rl.allow("asha", 59.9) is False
    assert rl.allow("asha", 60) is True                      # boundary: (0, 60] excludes t=0


def test_keys_are_independent() -> None:
    rl = SlidingWindowLimiter(limit=1, window=10)
    assert rl.allow("a", 0) and rl.allow("b", 0)
    assert not rl.allow("a", 5)


def test_injected_clock_and_rejections_not_counted() -> None:
    now = [0.0]
    rl = SlidingWindowLimiter(limit=2, window=10, clock=lambda: now[0])
    assert rl.allow("k") and rl.allow("k") and not rl.allow("k")
    now[0] = 10.0
    assert rl.allow("k")                                     # both earlier events expired


def test_memory_is_bounded_per_key_and_idle_keys_pruned() -> None:
    rl = SlidingWindowLimiter(limit=5, window=60)
    for t in range(1000):
        rl.allow("bot", t * 0.01)
    assert len(rl._events["bot"]) == 5                       # O(limit) per key
    rl.allow("human", 0)
    assert rl.prune_idle(now=1000) == 2 and rl.active_keys() == 0


def test_invalid_config() -> None:
    with pytest.raises(ValueError):
        SlidingWindowLimiter(limit=0, window=60)` },
        output: "295\n[True, True, True, False, True, True] 5",
        pitfalls: [
          "Calling time.time() inside allow(): tests then need sleeps, and wall-clock adjustments can break the window. Inject the clock and use time.monotonic.",
          "Recording rejected requests: a client that keeps retrying would never get back under the limit.",
          "Never deleting idle keys: memory grows with every user or IP ever seen.",
          "Recomputing the badge sum for every window: O(n·k) per user, which is the problem this lesson exists to remove.",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: collections.deque", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
    { label: "USACO Guide: Two Pointers", url: "https://usaco.guide/silver/two-pointers" },
    { label: "USACO Guide: Sliding Window", url: "https://usaco.guide/gold/sliding-window" },
    { label: "CP-Algorithms: Floyd's tortoise and hare", url: "https://cp-algorithms.com/others/tortoise_and_hare.html" },
    { label: "GeeksforGeeks: Window sliding technique", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
  ],
  nextPreview: "Next: stacks, queues and linked lists, including the monotonic stack and fast/slow pointers on lists. The two-pointer proof you just learned reappears in the monotonic stack's 'discard what can never be the answer' argument.",
};
