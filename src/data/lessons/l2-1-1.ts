import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.1.1",
  title: "Big-O and hash maps: from O(n²) to O(n)",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["1.1.1 Python essentials"],
  summary: "Estimate how code scales before you run it, and master the single most useful interview and production trick: trading memory for speed with a hash map.",
  terms: [
    { term: "Big-O", def: "How the work grows as input size n grows, ignoring constants. O(n) doubles when n doubles; O(n²) quadruples." },
    { term: "Time complexity", def: "How the number of operations grows with n." },
    { term: "Space complexity", def: "How the extra memory used grows with n." },
    { term: "Hash map", def: "A key→value structure (Python dict, JS Map, C# Dictionary) with average O(1) insert and lookup." },
    { term: "Hash function", def: "Turns a key into a number used to pick a bucket. Equal keys must produce equal hashes." },
    { term: "Amortised O(1)", def: "Usually O(1), occasionally expensive (e.g. resizing), but O(1) on average over many operations." },
  ],
  problem: [
    "The DevAtlas news ingester checks each new article against the articles already stored to avoid duplicates. With 1,000 articles it is instant. Six months later there are 200,000 articles, ingestion of a daily batch of 5,000 takes hours, and the job overlaps with the next run.",
    "The code compares each new article with every stored one: 5,000 × 200,000 = one billion comparisons. Replacing the inner loop with a set lookup makes it about 5,000 lookups. Same result, minutes become milliseconds. Recognising this pattern is what Big-O is for.",
  ],
  concept: {
    analogy: [
      "Finding a friend's number by reading a phone book page by page is **O(n)**. Comparing every guest at a party with every other guest to find people with the same birthday is **O(n²)**. Asking each guest their birthday and writing names on a wall calendar, checking the date box as you go, is **O(n)**: one pass, at the cost of a calendar (memory).",
    ],
    precise: [
      "Big-O describes the **growth rate** of cost as n → large, keeping the dominant term and dropping constants: 3n² + 10n + 7 is O(n²). It is about scaling, not speed on one input.",
      "Common classes from fast to slow: O(1) constant, O(log n) halving (binary search), O(n) one pass, O(n log n) good sorting, O(n²) nested loops over the same data, O(2ⁿ) all subsets.",
      "A **hash map** computes `hash(key)` to jump straight to a bucket, so lookup does not depend on how many items exist: **O(1) average**. Worst case is O(n) if many keys collide, which good hash functions and resizing make rare.",
      "**Pattern recognition:** if a brute-force solution has a nested loop asking \"have I seen X before?\" or \"does a partner for this item exist?\", a hash map/set usually removes the inner loop.",
    ],
  },
  underTheHood: {
    text: [
      "A dict stores entries in an array of slots. To insert key k it computes `hash(k)`, maps it to a slot index, and stores the entry there. If the slot is taken (a **collision**) it probes for another slot (CPython uses open addressing). When the table gets too full it allocates a bigger one and re-inserts everything: that occasional O(n) resize is why insertion is *amortised* O(1).",
      "Keys must be **hashable**: their hash must never change. That is why lists cannot be dict keys in Python but tuples of immutable values can.",
      "Real numbers at n = 1,000,000: O(n log n) ≈ 20 million steps (fine); O(n²) = 10¹² steps (hours). Rule of thumb for interviews: roughly 10⁷–10⁸ simple operations per second in Python's ballpark is far less than C++; know your constraints.",
    ],
    diagram: {
      title: "Hash map lookup",
      nodes: [
        { label: "key", sub: "\"rust\"" },
        { label: "hash()", sub: "→ 9182736455" },
        { label: "mod table size", sub: "→ slot 3" },
        { label: "slot 3", sub: "compare key, return value" },
      ],
      edges: ["", "", "jump"],
    },
  },
  handsOn: [
    {
      title: "Two Sum: brute force, O(n²)",
      text: ["Given nums and target, return indexes of two numbers that add up to target."],
      code: {
        lang: "python",
        file: "two_sum.py",
        code: `def two_sum_brute(nums: list[int], target: int) -> tuple[int, int] | None:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):     # inner loop: "does a partner exist?"
            if nums[i] + nums[j] == target:
                return i, j
    return None`,
      },
    },
    {
      title: "Two Sum with a hash map, O(n)",
      code: {
        lang: "python",
        code: `def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}                 # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:                      # O(1) average instead of a loop
            return seen[need], i
        seen[x] = i
    return None

assert two_sum([2, 7, 11, 15], 9) == (0, 1)
assert two_sum([3, 3], 6) == (0, 1)
assert two_sum([1, 2], 7) is None`,
      },
      notes: ["We check before inserting, so an element never pairs with itself. Time O(n), space O(n): we traded memory for speed."],
    },
    {
      title: "Measure it",
      code: {
        lang: "python",
        file: "bench.py",
        code: `import random, time
from two_sum import two_sum_brute, two_sum

nums = random.sample(range(10_000_000), 5_000)
target = -1  # impossible: forces the worst case (full scan)

for fn in (two_sum_brute, two_sum):
    t = time.perf_counter()
    fn(nums, target)
    print(f"{fn.__name__:15} {time.perf_counter() - t:.4f}s")`,
      },
      output: "two_sum_brute   ~1s (varies by machine)\ntwo_sum         ~0.001s",
      notes: ["Double the list size: brute force takes about 4× longer, the hash version about 2×. That is O(n²) vs O(n) in practice."],
    },
    {
      title: "The same pattern in production code",
      code: {
        lang: "python",
        code: `# Before: O(new × stored)
fresh = [a for a in new_articles if all(a.url != s.url for s in stored)]

# After: O(new + stored)
stored_urls = {s.url for s in stored}
fresh = [a for a in new_articles if a.url not in stored_urls]`,
      },
    },
    {
      title: "More hash-map patterns to recognise",
      code: {
        lang: "python",
        code: `from collections import Counter, defaultdict

# Frequency counting: "most common", "anagram", "majority element"
Counter("mississippi").most_common(2)   # [('i', 4), ('s', 4)]

# Grouping: "group anagrams", "bucket by key"
groups: defaultdict[str, list[str]] = defaultdict(list)
for w in ["eat", "tea", "tan", "ate", "nat"]:
    groups["".join(sorted(w))].append(w)
# {'aet': ['eat', 'tea', 'ate'], 'ant': ['tan', 'nat']}

# First unique / seen-before
def first_repeat(s: str) -> str | None:
    seen: set[str] = set()
    for ch in s:
        if ch in seen:
            return ch
        seen.add(ch)
    return None`,
      },
    },
  ],
  companies: [
    "**Caches are hash maps.** Redis and Memcached are networked key→value stores; in-process caches are dicts. Most \"make it fast\" work at companies is putting the right data in a hash map close to the code that needs it.",
    "**Databases use hash and tree indexes.** A database index turns a full table scan (O(n)) into a lookup (O(log n) for B-tree indexes, the default in MySQL and PostgreSQL). You will see this in the SQL indexes lesson.",
    "**Deduplication at scale.** Ingestion pipelines dedupe events by ID with sets or key-value stores; at very large scale they use probabilistic structures like Bloom filters (a compact, hash-based \"probably seen\" set).",
  ],
  mistakes: [
    { mistake: "Using `x in list` inside a loop", why: "It reads nicely and works on small data", wrong: "Hidden O(n²) that explodes in production", fix: "Convert to a set once before the loop" },
    { mistake: "Dropping the wrong terms in Big-O", why: "Confusing constants with variables", wrong: "Calling O(n·m) 'O(n)' when m is another input size", fix: "Name each input size separately: O(n + m), O(n·m)" },
    { mistake: "Ignoring space complexity", why: "Interview focus on speed", wrong: "An O(n) solution using a giant dict runs out of memory on a large batch", fix: "State both time and space; consider streaming or chunking" },
    { mistake: "Pairing an element with itself in Two Sum", why: "Inserting into the map before checking", wrong: "[3] with target 6 wrongly returns (0, 0)", fix: "Check for the complement first, then insert" },
    { mistake: "Using mutable objects as keys", why: "Wanting to key by a list of tags", wrong: "TypeError in Python; silent bugs in languages that allow it", fix: "Use tuples or frozensets of immutable values" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Before coding, estimate n and the complexity. If n can reach 10⁵+ and you have nested loops over it, redesign first." },
    { tag: "Performance", text: "Build lookup sets/dicts once, outside loops." },
    { tag: "Maintainability", text: "Name maps by meaning: `index_by_value`, `count_by_word`, not `d` or `m`." },
    { tag: "Reliability", text: "Test edge cases: empty input, one element, duplicates, no solution." },
  ],
  interview: [
    { q: "What is the time complexity of dict lookup, and when can it be worse?", a: "O(1) average. It degrades toward O(n) when many keys collide into the same buckets, e.g. with a poor hash function or adversarial keys. Resizing makes inserts amortised O(1)." },
    { q: "Walk me through Two Sum and its trade-offs.", a: "Brute force checks every pair, O(n²) time and O(1) space. With a hash map from value to index, for each x I look up target − x, O(n) time and O(n) space. If the array is sorted, two pointers give O(n) time and O(1) space." },
    { q: "How do you recognise that a problem needs a hash map?", a: "Phrases like 'seen before', 'count', 'frequency', 'pair that sums to', 'group by', 'duplicate', 'first unique'. Or a brute force with an inner loop that searches for something specific." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "What is the time complexity?",
      code: { lang: "python", code: "for a in users:          # n users\n    for b in courses:    # m courses\n        check(a, b)" },
      options: ["O(n)", "O(n²)", "O(n·m)", "O(n + m)"],
      answer: 2,
      explanation: "Two different inputs, nested: n·m. It is only O(n²) if both are the same collection.",
    },
    {
      kind: "bug",
      prompt: "This 'dedupe' is slow for 100k items. What is the fix?",
      code: { lang: "python", code: "out = []\nfor x in items:\n    if x not in out:\n        out.append(x)" },
      options: ["Use a while loop", "Track seen items in a set", "Sort descending", "Use recursion"],
      answer: 1,
      explanation: "`x not in out` is O(n) on a list, making the whole thing O(n²). A seen-set makes each check O(1): O(n) total.",
    },
    {
      kind: "output",
      prompt: "two_sum([3, 2, 4], 6) with the hash-map version returns:",
      options: ["(0, 0)", "(1, 2)", "(0, 2)", "None"],
      answer: 1,
      explanation: "i=0: need 3, not seen; store 3. i=1: need 4, not seen; store 2. i=2: need 2, seen at 1 → (1, 2).",
    },
  ],
  cheatSheet: [
    "O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).",
    "Keep the dominant term, drop constants; name each input separately.",
    "dict/set: O(1) average insert and lookup; list `in`: O(n).",
    "Inner loop searching for something? → hash map.",
    "Signals: seen, count, pair, group, duplicate, first unique.",
    "Two Sum: check complement first, then insert.",
    "Always state time AND space complexity.",
  ],
  homework: {
    basic: {
      title: "Valid anagram and contains-duplicate",
      brief: ["Implement `is_anagram(a, b)` and `has_duplicate(nums)` in O(n) time. State time and space complexity in docstrings."],
      criteria: ["O(n) solutions", "Edge cases: empty strings, different lengths, unicode", "Tests"],
      hints: ["Counter(a) == Counter(b)", "len(set(nums)) != len(nums), or an early-exit loop"],
      solution: {
        text: ["Both are counting/seen problems. The early-exit loop for duplicates can stop at the first repeat, which is faster in practice than building the full set."],
        code: { lang: "python", code: `from collections import Counter

def is_anagram(a: str, b: str) -> bool:
    """O(n) time, O(k) space for k distinct chars."""
    return len(a) == len(b) and Counter(a) == Counter(b)

def has_duplicate(nums: list[int]) -> bool:
    """O(n) time, O(n) space; exits early."""
    seen: set[int] = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False` },
      },
    },
    intermediate: {
      title: "Group anagrams and top-k frequent",
      brief: ["Solve 'group anagrams' and 'top k frequent elements'. For top-k, give an O(n log k) solution with a heap and an O(n) solution with bucket sort, and compare them."],
      criteria: ["Both problems solved with stated complexity", "Two approaches for top-k with trade-offs"],
      hints: ["heapq.nlargest(k, counts, key=counts.get)", "Bucket index = frequency (max n)."],
      solution: {
        text: ["Group anagrams: key by sorted word (O(n·L log L)) or by a 26-count tuple (O(n·L)). Top-k: heap is simple and memory-friendly for small k; bucket sort is O(n) but allocates n+1 buckets."],
        code: { lang: "python", code: `from collections import Counter
import heapq

def top_k_heap(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    return heapq.nlargest(k, counts, key=counts.get)

def top_k_bucket(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]
    for value, c in counts.items():
        buckets[c].append(value)
    out: list[int] = []
    for c in range(len(buckets) - 1, 0, -1):
        for v in buckets[c]:
            out.append(v)
            if len(out) == k:
                return out
    return out` },
      },
    },
    challenge: {
      title: "Longest consecutive sequence in O(n)",
      brief: ["Given an unsorted list, return the length of the longest run of consecutive integers (e.g. [100, 4, 200, 1, 3, 2] → 4). Sorting gives O(n log n); find the O(n) approach and prove why it is O(n)."],
      criteria: ["O(n) solution using a set", "Argument for why the inner while loop does not make it O(n²)"],
      hints: ["Only start counting from x if x − 1 is not in the set."],
      solution: {
        text: ["Each number is visited by the inner loop only as part of the run starting at that run's smallest element, so total inner-loop work across all starts is at most n. Overall O(n)."],
        code: { lang: "python", code: `def longest_consecutive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:          # x starts a run
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best` },
      },
    },
    capstone: {
      title: "DevAtlas step 6: fast article dedupe",
      brief: ["Add `dedupe_new(new_articles, stored_urls: set[str])` to the AI service, reusing your URL normaliser from lesson 1.1.1. Benchmark 5,000 new vs 200,000 stored URLs and record the time in the README."],
      criteria: ["O(new + stored) complexity", "Benchmark numbers recorded", "Unit tests"],
      hints: ["Generate fake URLs with f-strings in a loop."],
      solution: { text: ["Normalise stored URLs once into a set, then filter new articles with an O(1) membership check each. Expect milliseconds, compared to minutes for the nested version."] },
    },
  },
  deeper: [
    { label: "Python wiki: TimeComplexity of built-in types", url: "https://wiki.python.org/moin/TimeComplexity" },
    { label: "Python docs: collections (Counter, defaultdict)", url: "https://docs.python.org/3/library/collections.html" },
    { label: "Python docs: heapq", url: "https://docs.python.org/3/library/heapq.html" },
  ],
  nextPreview: "Next in DSA: two pointers and sliding window, the patterns behind 'longest substring', 'max sum subarray' and rate limiters.",
};
