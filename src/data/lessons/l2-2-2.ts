import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.2.2",
  title: "Recursion, sorting and binary search",
  minutes: 75,
  level: "Beginner",
  prerequisites: ["2.2.1 Stacks, queues and linked lists"],
  summary: "Think recursively with base cases and trust, understand how merge sort and quicksort work and what sorting costs, and use binary search on sorted data and on answers.",
  terms: [
    { term: "Recursion", def: "A function that solves a problem by calling itself on smaller versions of the same problem." },
    { term: "Base case", def: "The smallest input the function answers directly, without recursing. Without it, recursion never ends." },
    { term: "Divide and conquer", def: "Split the problem into parts, solve each recursively, combine the results (merge sort, quicksort)." },
    { term: "Stable sort", def: "A sort that keeps equal elements in their original relative order. Python's sorted() is stable." },
    { term: "Binary search", def: "Find a target in sorted data by repeatedly halving the search range: O(log n)." },
    { term: "Binary search on the answer", def: "Binary search over possible answer values when you can test 'is X good enough?' and that test is monotonic." },
  ],
  problem: [
    "DevAtlas stores 5 million quiz attempts sorted by time. 'Show attempts since Monday' scans all 5 million: O(n). Binary search finds the first Monday attempt in about 23 comparisons.",
    "A capacity question: 'What is the smallest daily study time that finishes the 73-lesson course in 90 days?' Trying every value from 1 minute upward is slow; binary search on the answer finds it in a handful of checks. Recursion and sorting are the foundations both of these and of trees and graphs coming next.",
  ],
  concept: {
    analogy: [
      "Recursion is **Russian nesting dolls**: to count dolls, open one and count the dolls inside (the same problem, smaller); the smallest doll that does not open is the base case.",
      "Binary search is **guessing a number between 1 and 100** when told 'higher' or 'lower': always guess the middle, and you need at most 7 guesses.",
    ],
    precise: [
      "To write a recursive function: (1) define what it returns for an input, (2) write the base case(s), (3) assume the function already works for smaller inputs (the 'recursive leap of faith') and combine. Each call uses a stack frame, so depth matters.",
      "**Sorting**: comparison sorts cannot beat O(n log n) in general. Merge sort: split in half, sort each half, merge (O(n log n) always, stable, O(n) extra memory). Quicksort: pick a pivot, partition, recurse (O(n log n) average, O(n²) worst, in place). Python and Java use Timsort for objects (merge-based, stable, fast on partially sorted data). In practice, call the built-in sort and know its cost.",
      "**Binary search** keeps an invariant on [lo, hi]. Use `bisect` in Python for sorted lists. **On the answer**: if `feasible(x)` is False for small x and True from some point on, binary search finds the smallest feasible x in O(log range) feasibility checks.",
    ],
  },
  underTheHood: {
    text: [
      "Merge sort's recursion tree has log₂ n levels; each level merges n elements in total, so total work is n log n. That is also the 'divide and conquer' cost pattern you will see in many algorithms.",
      "Binary search halves the range each step: after k steps, n / 2ᵏ elements remain, so k = log₂ n. For 5 million items, log₂(5,000,000) ≈ 22.3, so about 23 comparisons.",
      "Overflow bug: in languages with fixed-size integers, `mid = (lo + hi) / 2` can overflow for huge arrays; `lo + (hi - lo) / 2` cannot. Python integers do not overflow, but C#, Java and Rust code must care.",
    ],
    diagram: {
      title: "Merge sort on [5, 2, 4, 1]",
      nodes: [
        { label: "[5,2,4,1]", sub: "split" },
        { label: "[5,2] [4,1]", sub: "split" },
        { label: "[5][2][4][1]", sub: "base case" },
        { label: "[2,5] [1,4]", sub: "merge" },
        { label: "[1,2,4,5]", sub: "merge" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Recursion basics with a nested structure",
      code: {
        lang: "python",
        file: "recursion.py",
        code: `def total_minutes(node: dict) -> int:
    """A course is a tree: phases contain modules contain lessons."""
    if "minutes" in node:                         # base case: a lesson
        return node["minutes"]
    return sum(total_minutes(child) for child in node["children"])   # trust the smaller calls

course = {"children": [
    {"children": [{"minutes": 50}, {"minutes": 60}]},          # module 1
    {"children": [{"minutes": 55}, {"children": [{"minutes": 20}]}]},
]}
print(total_minutes(course))`,
      },
      output: "185",
    },
    {
      title: "Merge sort from scratch",
      code: {
        lang: "python",
        file: "merge_sort.py",
        code: `def merge_sort(xs: list[int]) -> list[int]:
    if len(xs) <= 1:
        return xs
    mid = len(xs) // 2
    left, right = merge_sort(xs[:mid]), merge_sort(xs[mid:])
    merged, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:                  # <= keeps it stable
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    return merged + left[i:] + right[j:]

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))`,
      },
      output: "[3, 9, 10, 27, 38, 43, 82]",
    },
    {
      title: "Sorting in real code: keys and stability",
      code: {
        lang: "python",
        code: `attempts = [("ravi", 80), ("asha", 90), ("meera", 80), ("zoe", 90)]

# by score descending, then name ascending
print(sorted(attempts, key=lambda a: (-a[1], a[0])))

# stability: sort by name first, then by score; equal scores keep name order
by_name = sorted(attempts, key=lambda a: a[0])
print(sorted(by_name, key=lambda a: a[1], reverse=True))`,
      },
      output: "[('asha', 90), ('zoe', 90), ('meera', 80), ('ravi', 80)]\n[('asha', 90), ('zoe', 90), ('meera', 80), ('ravi', 80)]",
    },
    {
      title: "Binary search: write it once, then use bisect",
      code: {
        lang: "python",
        file: "search.py",
        code: `import bisect

def lower_bound(xs: list[int], target: int) -> int:
    """First index with xs[i] >= target (len(xs) if none)."""
    lo, hi = 0, len(xs)                 # invariant: answer is in [lo, hi]
    while lo < hi:
        mid = (lo + hi) // 2
        if xs[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

timestamps = [100, 105, 230, 230, 400, 512]
print(lower_bound(timestamps, 230), bisect.bisect_left(timestamps, 230))
print(lower_bound(timestamps, 300), bisect.bisect_left(timestamps, 300))
since = bisect.bisect_left(timestamps, 200)
print(timestamps[since:])            # all attempts at or after t=200`,
      },
      output: "2 2\n4 4\n[230, 230, 400, 512]",
    },
    {
      title: "Binary search on the answer",
      code: {
        lang: "python",
        file: "min_daily.py",
        code: `import math

def days_needed(lesson_minutes: list[int], daily: int) -> int:
    """Lessons are taken in order; a lesson can span days."""
    return math.ceil(sum(lesson_minutes) / daily)

def min_daily_minutes(lesson_minutes: list[int], deadline_days: int) -> int:
    lo, hi = 1, sum(lesson_minutes)       # answer is somewhere in here
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(lesson_minutes, mid) <= deadline_days:   # feasible: try smaller
            hi = mid
        else:
            lo = mid + 1
    return lo

lessons = [60] * 73                          # 73 lessons of about an hour
print(min_daily_minutes(lessons, 90))`,
      },
      output: "49",
      notes: ["4380 minutes over 90 days needs ceil(4380/90)=49 minutes a day. Here a formula exists; binary search on the answer shines when feasibility is easy to check but hard to invert, as in the challenge below."],
    },
  ],
  companies: [
    "**Databases** use B-trees (lesson 5.1.1), which are binary search generalised to disk pages. Sorting powers ORDER BY, merge joins and index builds; external merge sort handles data bigger than memory.",
    "**git bisect** is binary search over commit history to find the commit that introduced a bug: 1,000 commits need about 10 test runs.",
    "**Capacity planning and tuning** often use binary search on the answer: 'smallest instance count that keeps p99 latency under 200 ms' by load-testing a few candidate sizes.",
  ],
  mistakes: [
    { mistake: "Missing or wrong base case", why: "Focusing on the recursive step", wrong: "Infinite recursion and RecursionError", fix: "Write the base case first; check the recursion always moves toward it" },
    { mistake: "Off-by-one in binary search", why: "Mixing inclusive and exclusive bounds", wrong: "Infinite loops or missing the target", fix: "Pick one convention ([lo, hi) here), write the invariant, test on 0, 1, 2 elements" },
    { mistake: "Binary searching unsorted data", why: "Forgetting the precondition", wrong: "Silently wrong results", fix: "Sort once (O(n log n)) or keep data sorted on insert (bisect.insort)" },
    { mistake: "Writing your own sort in production", why: "Practising algorithms", wrong: "Slower and buggier than the built-in", fix: "Use sorted()/list.sort() with key; implement sorts only to learn" },
    { mistake: "Recomputing overlapping subproblems recursively", why: "Naive recursion for Fibonacci-like problems", wrong: "Exponential time", fix: "Memoise (functools.cache) or use dynamic programming (lesson 2.4.2)" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Sort once, then binary search many times; for streams keep data sorted with insort or use a heap." },
    { tag: "Maintainability", text: "Use bisect / built-in sort with key functions instead of hand-written loops." },
    { tag: "Reliability", text: "For deep or unbounded recursion, convert to an explicit stack or iteration." },
    { tag: "Performance", text: "Sort by tuple keys in one pass rather than multiple sorts when possible." },
  ],
  interview: [
    { q: "Merge sort vs quicksort?", a: "Merge sort: always O(n log n), stable, needs O(n) extra space, good for linked lists and external sorting. Quicksort: O(n log n) average, O(n²) worst case with bad pivots, in place, fast in practice due to cache friendliness. Production libraries use hybrids like Timsort or introsort." },
    { q: "What is binary search on the answer?", a: "When the answer lies in a numeric range and a feasibility check is monotonic (once true, stays true for larger values), binary search the range using the check. Examples: minimum capacity to ship packages in D days, minimum speed to finish on time." },
    { q: "How do you avoid stack overflow in recursion?", a: "Ensure recursion depth is bounded (e.g. log n for balanced divide and conquer), convert deep recursion to iteration with an explicit stack, or use tail-call friendly patterns in languages that optimise them (Python does not)." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "About how many comparisons does binary search need on 1,000,000 sorted items?",
      options: ["~20", "~1,000", "~500,000", "~1,000,000"],
      answer: 0,
      explanation: "log₂(1,000,000) ≈ 20.",
    },
    {
      kind: "output",
      prompt: "bisect.bisect_left([1, 3, 3, 5], 3) returns:",
      options: ["1", "2", "3", "0"],
      answer: 0,
      explanation: "bisect_left gives the first position where 3 could be inserted keeping order: index 1. bisect_right would give 3.",
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
    "Recursion: base case first, trust smaller calls, combine.",
    "Merge sort O(n log n) stable; quicksort average O(n log n), worst O(n²).",
    "Built-in sort: sorted(xs, key=..., reverse=...): stable, Timsort.",
    "Binary search O(log n) on sorted data; bisect_left/bisect_right.",
    "Invariant + one bound convention ([lo, hi)) prevents off-by-ones.",
    "Binary search on the answer: monotonic feasible(x).",
    "Overlapping subproblems → memoise.",
  ],
  homework: {
    basic: {
      title: "First and last position",
      brief: ["Given a sorted list and a target, return the first and last index of the target, or (-1, -1), in O(log n)."],
      criteria: ["Two binary searches (or bisect_left/bisect_right)", "Handles absent target and empty list"],
      hints: ["last = bisect_right(xs, t) - 1"],
      solution: {
        text: ["bisect_left finds the first position; bisect_right finds one past the last."],
        code: {
          lang: "python",
          code: `import bisect

def search_range(xs: list[int], t: int) -> tuple[int, int]:
    lo = bisect.bisect_left(xs, t)
    if lo == len(xs) or xs[lo] != t:
        return (-1, -1)
    return (lo, bisect.bisect_right(xs, t) - 1)

assert search_range([5, 7, 7, 8, 8, 10], 8) == (3, 4)
assert search_range([5, 7, 7, 8, 8, 10], 6) == (-1, -1)
assert search_range([], 1) == (-1, -1)`,
        },
      },
    },
    intermediate: {
      title: "Generate all subsets recursively",
      brief: ["Write `subsets(items)` returning every subset (the power set) using recursion. Explain why the output size is 2ⁿ and what that means for n = 30."],
      criteria: ["Recursive solution with a clear base case", "Correct count 2ⁿ", "Explanation of exponential growth"],
      hints: ["Subsets of [a, b, c] = subsets of [b, c] with and without a."],
      solution: {
        text: ["For n = 30 there are about 1.07 billion subsets: listing them is infeasible regardless of how fast each step is. Exponential algorithms are only for small n or need pruning (lesson 2.4.1)."],
        code: {
          lang: "python",
          code: `def subsets(items: list[str]) -> list[list[str]]:
    if not items:
        return [[]]
    rest = subsets(items[1:])
    return rest + [[items[0], *s] for s in rest]

result = subsets(["a", "b", "c"])
assert len(result) == 8
print(sorted(result, key=lambda s: (len(s), s)))`,
        },
      },
    },
    challenge: {
      title: "Ship lessons within D days",
      brief: ["Lessons must be taken in order; each day you can study at most C minutes and a lesson cannot be split across days. Find the minimum C that finishes all lessons within D days."],
      criteria: ["Feasibility check O(n)", "Binary search over [max(lesson), sum(lessons)]", "Overall O(n log sum)"],
      hints: ["C must be at least the longest lesson, since lessons cannot be split."],
      solution: {
        text: ["Greedy feasibility: fill each day until the next lesson would exceed C. Feasibility is monotonic in C, so binary search the smallest feasible C."],
        code: {
          lang: "python",
          code: `def days_for(capacity: int, lessons: list[int]) -> int:
    days, used = 1, 0
    for m in lessons:
        if used + m > capacity:
            days, used = days + 1, 0
        used += m
    return days

def min_capacity(lessons: list[int], d: int) -> int:
    lo, hi = max(lessons), sum(lessons)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_for(mid, lessons) <= d:
            hi = mid
        else:
            lo = mid + 1
    return lo

assert min_capacity([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5) == 15
assert min_capacity([3, 2, 2, 4, 1, 4], 3) == 6`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: fast 'since' queries in memory",
      brief: ["The AI service keeps recent news items in memory sorted by published time. Add `items_since(ts)` using bisect and `insert_item(item)` using bisect.insort with a key, plus tests."],
      criteria: ["O(log n) lookup", "Sorted order maintained on insert", "Tests with equal timestamps"],
      hints: ["Python 3.10+ bisect functions accept key=."],
      solution: {
        text: [
          "`RecentNews` keeps one invariant: the list is sorted by `published_at`. `insert_item` uses `bisect.insort_right(..., key=...)` (Python 3.10+), which places an item after existing items with the same timestamp, so ties stay in arrival order. Finding the slot is O(log n); shifting the list is O(n) in the worst case, but it is a fast memory move and fine for tens of thousands of items.",
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
    { label: "Git docs: git bisect", url: "https://git-scm.com/docs/git-bisect" },
  ],
  nextPreview: "Next: trees, BSTs and heaps: the structures behind file systems, database indexes and priority queues.",
};
