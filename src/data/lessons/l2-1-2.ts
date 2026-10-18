import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.1.2",
  title: "Two pointers and sliding window",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["2.1.1 Big-O and hash maps"],
  summary: "Master two patterns that turn many O(n²) array and string problems into O(n): two pointers moving through a sequence, and a window that grows and shrinks over it.",
  terms: [
    { term: "Two pointers", def: "Two indexes moving through data, from both ends toward the middle or both forward at different speeds, to avoid nested loops." },
    { term: "Sliding window", def: "A contiguous range [left, right] over an array or string that expands on the right and shrinks on the left while maintaining a running value." },
    { term: "Fixed window", def: "A window of constant size k, e.g. 'max sum of any 5 consecutive days'." },
    { term: "Variable window", def: "A window whose size changes to satisfy a condition, e.g. 'longest substring without repeats'." },
    { term: "Invariant", def: "A condition that stays true every time the loop moves, e.g. 'the window never contains a duplicate'. Designing the invariant is the core skill." },
    { term: "Subarray / substring", def: "A contiguous piece of an array/string. (A subsequence need not be contiguous; windows do not apply to it.)" },
  ],
  problem: [
    "DevAtlas wants a 'best 7-day streak' badge: the 7 consecutive days with the most study minutes. The first version recomputes the sum for every possible 7-day range: fine for one user, slow when computing badges for 200,000 users nightly.",
    "A rate limiter needs 'how many requests did this user make in the last 60 seconds?' on every request. Both are sliding-window problems: instead of recomputing a range from scratch, update it as the window moves. The same patterns solve a large share of array and string interview questions.",
  ],
  concept: {
    analogy: [
      "A sliding window is like **reading a long receipt through a magnifying glass** that shows 7 lines. To move down one line you do not re-add all 7; you add the new line entering at the bottom and subtract the one leaving at the top.",
      "Two pointers from both ends is like **two people searching a sorted bookshelf** from opposite ends for two books whose prices add up to your budget: if the pair is too expensive, the right person moves to a cheaper book; too cheap, the left person moves to a pricier one.",
    ],
    precise: [
      "**Two pointers, opposite ends** (needs sorted data or symmetric structure): pair sums, palindromes, container-with-most-water, reversing in place. Each step moves one pointer, so total work is O(n).",
      "**Two pointers, same direction (fast/slow)**: removing duplicates in place, partitioning, merging sorted arrays, cycle detection in linked lists.",
      "**Sliding window**: for contiguous subarrays/substrings. Expand `right` one step at a time; while the window breaks the rule, shrink from `left`. Each index enters and leaves at most once, so O(n) even though there is a nested `while`.",
      "**Recognition signals**: 'contiguous', 'substring', 'subarray', 'at most k', 'longest/shortest range with...', 'sorted array, find a pair'. If values can be negative and you need exact sums, windows often fail; use prefix sums + hash map instead.",
    ],
  },
  underTheHood: {
    text: [
      "Why the window is O(n): `right` moves n times; `left` also moves at most n times in total across the entire run, because it never moves backwards. The inner while loop's total work is bounded by n, not n per iteration (amortised analysis, as with dict resizing in 2.1.1).",
      "Why opposite-end two pointers are correct on sorted data: if `a[l] + a[r] > target`, then `a[r]` plus anything right of `l` is also too big, so `r` can never be part of a solution with the remaining elements and can safely be discarded. Every move eliminates a whole row of the n² pair table.",
    ],
    diagram: {
      title: "Variable window: longest substring without repeats in \"abcabcbb\"",
      nodes: [
        { label: "[a]", sub: "expand" },
        { label: "[abc]", sub: "len 3" },
        { label: "abc+a", sub: "repeat → shrink" },
        { label: "[bca]", sub: "valid again" },
        { label: "best = 3", sub: "\"abc\"" },
      ],
      edges: ["right++", "right++", "left++", "continue"],
    },
  },
  handsOn: [
    {
      title: "Fixed window: best 7-day study streak",
      code: {
        lang: "python",
        file: "windows.py",
        code: `def best_window_sum(minutes: list[int], k: int) -> int:
    """Max sum of any k consecutive values. O(n) time, O(1) space."""
    if k <= 0 or k > len(minutes):
        raise ValueError("k must be between 1 and len(minutes)")
    window = sum(minutes[:k])
    best = window
    for right in range(k, len(minutes)):
        window += minutes[right] - minutes[right - k]   # add entering, subtract leaving
        best = max(best, window)
    return best

daily = [30, 0, 45, 60, 20, 0, 90, 40, 10, 75]
print(best_window_sum(daily, 3))    # 90 + 40 + 10
print(best_window_sum(daily, 7))    # 60 + 20 + 0 + 90 + 40 + 10 + 75`,
      },
      output: "140\n295",
      notes: ["Check small cases by hand: the 3-day sums are 75, 105, 125, 80, 110, 130, 140, 125, so 140 is right. Hand-checking tiny inputs is part of the habit."],
    },
    {
      title: "Variable window: longest substring without repeating characters",
      code: {
        lang: "python",
        code: `def longest_unique(s: str) -> int:
    last_seen: dict[str, int] = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1          # jump left past the previous copy
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best

for s in ["abcabcbb", "bbbbb", "pwwkew", ""]:
    print(s or '""', longest_unique(s))`,
      },
      output: "abcabcbb 3\nbbbbb 1\npwwkew 3\n\"\" 0",
    },
    {
      title: "Variable window with a budget: longest run under a limit",
      code: {
        lang: "python",
        code: `def longest_under_budget(costs: list[int], budget: int) -> int:
    """Longest contiguous run with total cost <= budget. Costs must be non-negative."""
    left = total = best = 0
    for right, c in enumerate(costs):
        total += c
        while total > budget:                 # shrink until valid again
            total -= costs[left]
            left += 1
        best = max(best, right - left + 1)
    return best

print(longest_under_budget([3, 1, 2, 7, 1, 1, 1, 4], 5))`,
      },
      output: "3",
      notes: ["The longest valid run is [1, 1, 1] (total 3). Shrinking works only because costs are non-negative: adding an element never decreases the total, so once the window is too expensive, the only fix is to drop from the left."],
    },
    {
      title: "Two pointers from both ends",
      code: {
        lang: "python",
        code: `def pair_with_sum(sorted_nums: list[int], target: int) -> tuple[int, int] | None:
    l, r = 0, len(sorted_nums) - 1
    while l < r:
        s = sorted_nums[l] + sorted_nums[r]
        if s == target:
            return l, r
        if s < target:
            l += 1           # need bigger
        else:
            r -= 1           # need smaller
    return None

def is_palindrome(text: str) -> bool:
    chars = [c.lower() for c in text if c.isalnum()]
    l, r = 0, len(chars) - 1
    while l < r:
        if chars[l] != chars[r]:
            return False
        l, r = l + 1, r - 1
    return True

print(pair_with_sum([1, 3, 4, 6, 9, 11], 13))
print(is_palindrome("A man, a plan, a canal: Panama"))`,
      },
      output: "(2, 4)\nTrue",
      notes: ["4 + 9 = 13 at indexes 2 and 4. This is O(n) time and O(1) space, versus the hash-map Two Sum's O(n) space, but it needs sorted input."],
    },
    {
      title: "Fast and slow pointers: remove duplicates in place",
      code: {
        lang: "python",
        code: `def dedupe_sorted(nums: list[int]) -> int:
    """Removes duplicates from a sorted list in place; returns the new length."""
    if not nums:
        return 0
    write = 1                                  # slow pointer: next slot to fill
    for read in range(1, len(nums)):           # fast pointer: scans everything
        if nums[read] != nums[write - 1]:
            nums[write] = nums[read]
            write += 1
    return write

xs = [1, 1, 2, 3, 3, 3, 7]
n = dedupe_sorted(xs)
print(n, xs[:n])`,
      },
      output: "4 [1, 2, 3, 7]",
    },
    {
      title: "Production example: sliding-window rate limiter",
      code: {
        lang: "python",
        file: "ratelimit.py",
        code: `from collections import deque

class SlidingWindowLimiter:
    """Allow at most 'limit' events per 'window' seconds per key."""

    def __init__(self, limit: int, window: float) -> None:
        self.limit, self.window = limit, window
        self.events: dict[str, deque[float]] = {}

    def allow(self, key: str, now: float) -> bool:
        q = self.events.setdefault(key, deque())
        while q and q[0] <= now - self.window:   # shrink: drop timestamps outside the window
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)                            # expand
        return True

rl = SlidingWindowLimiter(limit=3, window=60)
print([rl.allow("asha", t) for t in [0, 10, 20, 30, 61, 75]])`,
      },
      output: "[True, True, True, False, True, True]",
      notes: ["At t=30 three requests exist in (−30, 30]. At t=61 the request from t=0 has left the window. Distributed versions keep the same idea in Redis sorted sets (lesson 4.4.2)."],
    },
  ],
  companies: [
    "**Rate limiting** at API gateways and services uses sliding windows (exact, with timestamps) or sliding-window counters (approximate, cheaper) per user, API key or IP address.",
    "**Monitoring and alerting** evaluate rules like 'error rate over the last 5 minutes above 2%': a sliding window over a stream of events.",
    "**Streaming analytics** engines (Kafka Streams, Flink, Spark Structured Streaming) offer tumbling, hopping and sliding windows as built-in operators for metrics like 'orders per minute'.",
  ],
  mistakes: [
    { mistake: "Recomputing the window sum each step", why: "Directly translating the definition", wrong: "O(n·k) instead of O(n)", fix: "Update incrementally: add the entering element, remove the leaving one" },
    { mistake: "Using a shrinking window with negative numbers", why: "The pattern worked on positive data", wrong: "Shrinking may skip valid answers because sums are not monotonic", fix: "Prefix sums + hash map for exact-sum problems with negatives" },
    { mistake: "Off-by-one in window length", why: "right - left vs right - left + 1", wrong: "Answers off by one, especially on tiny inputs", fix: "Inclusive window [left, right] has length right - left + 1; test with 1-element input" },
    { mistake: "Opposite-end pointers on unsorted data", why: "Forgetting the precondition", wrong: "Wrong answers with no error", fix: "Sort first (O(n log n)) or use a hash map" },
    { mistake: "Moving left backwards in the longest-unique problem", why: "Setting left = last_seen[ch] + 1 unconditionally", wrong: "The window re-includes earlier duplicates (try 'abba')", fix: "Only move left forward: check last_seen[ch] >= left, or use max()" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Write the invariant as a comment before coding: 'window [left, right] has total <= budget'." },
    { tag: "Reliability", text: "Test empty input, size-1 input, all-equal values, and the window covering the whole array." },
    { tag: "Performance", text: "Use a deque for timestamp windows (O(1) pops from the left); lists pop(0) are O(n)." },
    { tag: "Maintainability", text: "State preconditions (sorted? non-negative?) in the docstring." },
  ],
  interview: [
    { q: "How do you know a problem is a sliding-window problem?", a: "It asks about a contiguous subarray or substring (longest, shortest, max sum, count) under a condition that can be maintained incrementally as the range grows and shrinks, like 'at most k distinct' or 'sum <= budget' with non-negative values." },
    { q: "Why is the variable sliding window O(n) despite the nested while loop?", a: "Both pointers only move forward. right moves n times and left moves at most n times over the whole run, so total pointer moves are at most 2n." },
    { q: "Two Sum on a sorted array: hash map or two pointers?", a: "Two pointers: O(n) time and O(1) extra space, exploiting the order. The hash map is also O(n) time but uses O(n) space; it is the better choice when the array is unsorted and sorting would lose original indexes." },
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
      explanation: "At the final 'a', last_seen['a']=0 moves left from 2 back to 1. Only move left forward.",
    },
  ],
  cheatSheet: [
    "Contiguous + condition → sliding window. Sorted + pair → two pointers.",
    "Fixed window: add entering, subtract leaving.",
    "Variable window: expand right; while invalid, shrink left; record best.",
    "Window length = right - left + 1.",
    "Each pointer moves forward only → O(n).",
    "Negatives + exact sum → prefix sums + hash map, not windows.",
    "Fast/slow pointers for in-place dedupe and partitioning.",
    "deque for time-based windows.",
  ],
  homework: {
    basic: {
      title: "Max average subarray and valid palindrome",
      brief: ["Solve: (1) max average of any k consecutive elements; (2) is a string a palindrome if you may delete at most one character? Give complexity for each."],
      criteria: ["Fixed window for (1)", "Two pointers with one allowed skip for (2)", "O(n) time both"],
      hints: ["(2) On the first mismatch, try skipping the left char or the right char and check the rest."],
      solution: {
        text: ["(1) is best_window_sum / k. (2) Two pointers; on mismatch, check whether either remaining substring (skipping left or skipping right) is a palindrome."],
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
      criteria: ["Variable window with a count map", "O(n) time", "Handles k=0 and empty string"],
      hints: ["Keep counts in a dict; when len(counts) > k, shrink and delete keys whose count reaches 0."],
      solution: {
        text: ["The window invariant is 'at most k keys in counts'."],
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
      criteria: ["O(len(s) + len(t))", "Correct with repeated characters in t", "Returns '' when impossible"],
      hints: ["Track how many required characters are currently satisfied ('formed'). Expand until all are satisfied, then shrink while still satisfied."],
      solution: {
        text: ["Expand right until the window satisfies every required count; then shrink left as far as possible while still satisfied, recording the best window each time."],
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
      criteria: ["O(n) badge computation", "Limiter tests with explicit times (no real clock)", "Documented memory cost per key"],
      hints: ["Memory per key is O(limit) timestamps."],
      solution: {
        text: [
          "`best_streak_minutes` is the fixed window from the lesson: add the day entering, subtract the day leaving, O(n) time and O(1) space. Users with fewer than k days get None (no badge yet) instead of an exception, and a randomised test compares it with the brute-force O(n·k) sums.",
          "The limiter takes an injectable `clock` (default `time.monotonic`, which never jumps backwards) and an optional `now`, so tests pass explicit timestamps and never sleep. `retry_after` gives the value for a 429 response's Retry-After header, which is what HTTP middleware needs.",
          "Memory is O(limit) timestamps per active key, O(active keys × limit) in total: with limit 100 and 50,000 active keys that is 5 million timestamps, on the order of 150 MB in CPython. `prune_idle` removes keys with no events in the window (call it from a periodic task); beyond one process, move the same idea to Redis (lesson 4.4.2).",
          "Run from services/ai: `python -m devatlas_ai.ratelimit` prints the output below, `pytest` runs the tests.",
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
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: collections.deque", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
    { label: "LeetCode: Sliding Window problems", url: "https://leetcode.com/tag/sliding-window/" },
    { label: "LeetCode: Two Pointers problems", url: "https://leetcode.com/tag/two-pointers/" },
  ],
  nextPreview: "Next: stacks, queues and linked lists, including the monotonic stack and fast/slow pointers on lists.",
};
