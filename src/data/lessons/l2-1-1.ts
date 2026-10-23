import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.1.1",
  title: "Big-O and hash maps: from O(n²) to O(n)",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["1.1.1 Python essentials"],
  summary: "Estimate how code scales before you run it, and master the single most useful interview and production trick: trading memory for speed with a hash map.",
  terms: [
    { term: "Big-O", def: "A vocabulary for how work grows as input size n grows, keeping only the dominant term and dropping constants. O(n) doubles when n doubles; O(n²) quadruples." },
    { term: "Time complexity", def: "How the number of elementary operations grows with n - not how many seconds a particular machine takes." },
    { term: "Space complexity", def: "How the extra (auxiliary) memory used grows with n. A hash map buys speed with O(n) extra memory." },
    { term: "Hash map", def: "A key to value structure (Python dict, JS Map, C# Dictionary) that finds a bucket from hash(key), so lookup is O(1) expected." },
    { term: "Hash function", def: "Turns a key into an integer used to pick a bucket. Equal keys must produce equal hashes; unequal keys may collide." },
    { term: "Collision", def: "Two different keys landing in the same bucket. A few are normal; many turn expected O(1) into worst-case O(n)." },
    { term: "Load factor", def: "Entries divided by slots. CPython resizes a dict or set when it is about two-thirds full, which keeps collisions rare." },
    { term: "Expected O(1)", def: "O(1) on average over the hash function's distribution, not a guarantee for every single call. The worst case is O(n)." },
    { term: "Amortised O(1)", def: "A sequence guarantee: rare O(n) resizes spread over many O(1) inserts. Different from average case, which is about input distribution." },
    { term: "Best / average / worst case", def: "Three bounds for the same algorithm on different inputs: linear search is O(1) best, O(n) average and O(n) worst." },
    { term: "Set", def: "A hash-based collection of unique keys (Python set, JS Set). Same bucket machinery as a dict, with no values." },
    { term: "Space-time trade-off", def: "Spending O(n) memory on a set or dict to remove an O(n) inner loop, turning O(n²) into O(n)." },
  ],
  problem: [
    "The DevAtlas news ingester checks each new article against the articles already stored to avoid duplicates. With 1,000 articles it is instant. Six months later there are 200,000 articles, ingestion of a daily batch of 5,000 takes hours, and the job overlaps with the next run.",
    "The code compares each new article with every stored one: 5,000 × 200,000 = one billion comparisons. Replacing the inner loop with a set lookup makes it about 5,000 lookups. Same result, minutes become milliseconds. Big-O is the vocabulary that lets you see that difference *before* you run the job - and tells you when the hash-map version's extra memory is the wrong trade.",
  ],
  concept: {
    analogy: [
      "Finding a friend's number by reading a phone book page by page is **O(n)**. Comparing every guest at a party with every other guest to find people with the same birthday is **O(n²)**. Asking each guest their birthday and writing names on a wall calendar, checking the date box as you go, is **O(n)**: one pass, at the cost of a calendar (memory).",
      "Second picture: a coat check with numbered hooks. Your ticket number sends you straight to a hook - that is a hash function. Two coats can be assigned the same hook (a collision), so the attendant checks the neighbouring hooks. If the rack gets too crowded (high load factor), they move everything to a bigger rack once, which is slow, but rare - that is amortisation.",
    ],
    precise: [
      "**Big-O is vocabulary for growth, not a stopwatch.** If an algorithm does 3n² + 10n + 7 comparisons, we call it O(n²): as n doubles, the n² term quadruples and the rest becomes noise. That does not mean an O(n²) function is always slower than an O(n) one. Constants and lower-order terms decide small inputs; growth decides large ones. With constants 10 and 1, the O(n) algorithm is actually slower than the O(n²) one until n = 10; above that, growth wins. Big-O tells you what happens as n grows, so quote it with the input size you actually expect.",
      "**Best, average and worst describe inputs, not algorithms in the abstract.** Linear search finds the target at position 0 in O(1), at the end in O(n), and O(n) on average if positions are uniform. Quicksort is O(n log n) average but O(n²) on an already-sorted array with a bad pivot. Hash lookup is O(1) expected and O(n) worst. **Amortised** is a fourth idea: a dynamic array append is O(1) amortised because occasional O(n) resizes are paid for by the many cheap appends around them; one particular append can still be O(n). Say which case you mean - interviewers listen for it.",
      "A **hash map** stores entries in an array of buckets. Insert computes `hash(key)`, reduces it to an index (CPython masks with `size - 1` because the table size is a power of two), and puts the entry there. Lookup repeats the computation and compares the stored key, so the number of entries does not matter: **expected O(1)**. Two keys can map to the same bucket (**collision**); the table then probes nearby slots. CPython keeps the **load factor** near two-thirds and, when it is exceeded, resizes and rehashes every entry in O(n) - which is why inserts are amortised O(1) and why collisions stay rare. Under a bad hash or deliberately colliding keys every lookup degrades to a scan: **worst case O(n)**.",
      "**Space complexity counts the extra memory, and it is not free.** Two Sum with a dict is O(n) time and O(n) space; brute force is O(n²) time and O(1) space. A dict or set also has per-entry overhead well above a bare list, so on tens of millions of keys memory can be the limit before CPU is. A hash map is the wrong tool when the question is not 'exact key?': **ordered data**, **range queries**, **prefix queries** and **top-k** are better served by a sorted list with `bisect`, a B-tree index, a trie or a heap. A short list is often faster than a set for a handful of items because hashing has a constant cost too.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Entries and an index array.** Since Python 3.6 a dict is a compact table: a dense array of entries (hash, key, value) in insertion order, plus a sparse index array of slot numbers. Insertion order is a side effect of the dense array, not a sort. A set is the same structure without the value half. Both allocate the index array at a power-of-two size so that `hash & (size - 1)` replaces an expensive modulo.",
      "2. **Insert: hash, mask, probe.** `hash(key)` returns an integer (small ints hash to themselves; strings use SipHash with a per-process random seed). The low bits pick a slot. If that slot is empty, the entry goes in. If it is occupied by a different key, CPython probes with a perturbation sequence until it finds an empty slot or the key itself. A matching key returns its value; reaching an empty slot means 'not present'.",
      "3. **Resizing keeps the load factor down.** CPython grows the table when it is about two-thirds full, allocates a larger power-of-two index array and re-inserts every entry. That single operation is O(n), but it happens after O(n) cheap inserts, so the total for n inserts is O(n) and each insert is amortised O(1). It is the same trick as a dynamic array's append.",
      "4. **Keys must be hashable and stable.** A key's hash must not change while it is in the map, and `a == b` must imply `hash(a) == hash(b)`. That is why lists and dicts cannot be keys while tuples, strings, numbers and frozensets can. A custom class inherits identity hash and equality until you define `__hash__` and `__eq__`; defining `__eq__` without `__hash__` makes it unhashable, which is Python protecting you from silent duplicate keys.",
      "5. **Why `x in list` is O(n).** A list is a contiguous array of references; it has no index by value. Membership must compare `x` with element 0, then 1, then 2, until it matches or runs out. A hit early is fast, a miss scans everything, and the bound is O(n) either way. A set or dict is different: it computes where the value *would* be and looks only there.",
      "6. **Expected is not guaranteed.** The O(1) claim assumes hashes spread keys evenly. With a pathological hash (every key in one bucket) or attacker-chosen keys, the probe sequence becomes a linear scan: O(n) per lookup, so n lookups become O(n²). Python randomises string hashing per process specifically to make that attack hard, and many languages now use keyed hashes (SipHash) for the same reason. For untrusted keys, bound input sizes and rely on the keyed hash rather than assuming the average case.",
      "7. **Do the arithmetic before you optimise.** At n = 1,000,000: O(n) is a million steps; O(n log n) about twenty million; O(n²) a trillion, which is tens of hours in Python. O(n²) on 5,000 is 25 million comparisons, which the measured brute force did in about half a second; the same shape at 1,000,000 is 40,000 times more work. Python does roughly 10⁷ simple operations per second, compiled code 10⁸ to 10⁹. Measure at the n you will ship, not at n = 10.",
      "8. **Space is part of the answer.** A dict entry costs the key, the value, the cached hash and an index slot; a set costs the key plus the same table. That is usually several times the memory of the equivalent list. Before you add a map, ask whether the data can be streamed or sorted once. If the question is ordered or a range, a sorted list with `bisect` gives O(log n) lookup and O(n) insert; a B-tree index gives O(log n) for both and keeps order; a heap gives O(log n) push/pop for top-k; a trie gives prefix queries. The right structure is the one whose *operations* match your questions.",
    ],
    diagram: {
      title: "One insert, including a collision",
      nodes: [
        { label: "key", sub: "\"rust\"" },
        { label: "hash(key)", sub: "64-bit integer" },
        { label: "index = hash & mask", sub: "slot 3" },
        { label: "slot 3 taken", sub: "probe slot 4" },
        { label: "store entry", sub: "or return value" },
      ],
      edges: ["", "", "collision", "empty slot"],
      caption: "A lookup follows the same path and stops when it finds the key or an empty slot. Resizing at about two-thirds load re-inserts every entry: the rare O(n) step behind amortised O(1) inserts.",
    },
  },
  handsOn: [
    {
      title: "Two Sum: from O(n²) to O(n), measured",
      text: [
        "Given `nums` and `target`, return the indexes of two numbers that add up to `target`. The brute-force version tries every pair. The hash-map version asks, for each `x`, whether `target - x` has already been seen - the inner loop becomes one expected-O(1) lookup.",
        "The asserts pin the behaviour before any timing. Notice the order in the fast version: check the complement **before** inserting `x`, so an element can never pair with itself.",
      ],
      code: {
        lang: "python",
        file: "two_sum.py",
        code: `import random
import time


def two_sum_brute(nums: list[int], target: int) -> tuple[int, int] | None:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return i, j
    return None


def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return seen[need], i
        seen[x] = i
    return None


assert two_sum([2, 7, 11, 15], 9) == (0, 1)
assert two_sum([3, 3], 6) == (0, 1)
assert two_sum([1, 2], 7) is None

rng = random.Random(1)
target = -1  # impossible: both versions must scan the whole list


def best_of(fn, nums, repeats=3):
    best = float("inf")
    for _ in range(repeats):
        t0 = time.perf_counter()
        assert fn(nums, target) is None
        best = min(best, time.perf_counter() - t0)
    return best


print(f"{'n':>7} {'brute (s)':>11} {'hash (s)':>10} {'speedup':>9}")
brute_prev = hash_prev = None
for n in (5_000, 10_000):
    nums = rng.sample(range(10_000_000), n)
    brute = best_of(two_sum_brute, nums)
    hashed = best_of(two_sum, nums)
    print(f"{n:>7,} {brute:>11.4f} {hashed:>10.5f} {brute / hashed:>8.0f}x")
    if brute_prev is not None:
        print(f"{'growth':>7} {brute / brute_prev:>10.1f}x {hashed / hash_prev:>9.1f}x")
    brute_prev, hash_prev = brute, hashed

print("two_sum([3, 2, 4], 6) ->", two_sum([3, 2, 4], 6))`,
      },
      output: "      n   brute (s)   hash (s)   speedup\n  5,000      0.4631    0.00053      877x\n 10,000      1.7670    0.00097     1827x\n growth        3.8x       1.8x\ntwo_sum([3, 2, 4], 6) -> (1, 2)",
      notes: [
        "Real output from CPython 3.11.15 on one machine. Absolute times and ratios vary with hardware and load; the shape is the lesson. Brute force grew 3.8x when n doubled (close to the 4x of O(n²)); the hash version grew 1.8x here (close to the 2x of O(n)), though its row runs in microseconds, so a rerun can show a noisier ratio. The brute-force growth is the reliable signal.",
        "Space is the trade: brute force is O(1) extra memory, the hash version O(n) for `seen`. At n = 10,000 that is trivial; at n = 10⁸ it is gigabytes, which is why you state both.",
        "An impossible target forces both versions to scan the whole input; a target that matches early would let either return in O(1) best case and hide the growth.",
      ],
    },
    {
      title: "Why `x in list` is O(n) and `x in set` is expected O(1)",
      text: [
        "This is the single most common hidden O(n²) in Python: `if x in some_list` inside a loop. A list has no value index, so each check scans. A set hashes the value and jumps to a bucket. Build the set once, then query it many times.",
        "The probe list is identical for both containers; only the container changes. About half the probes miss, and a miss on a list always scans every element.",
      ],
      code: {
        lang: "python",
        file: "lookup_bench.py",
        code: `import random
import time


def timed_lookup(container, probes):
    t0 = time.perf_counter()
    hits = sum(1 for q in probes if q in container)
    return (time.perf_counter() - t0) * 1000, hits


rng = random.Random(42)

for n in (100_000, 1_000_000):
    data = list(range(n))
    as_set = set(data)
    probes = [rng.randrange(n * 2) for _ in range(200)]  # about half miss
    list_ms, hits = timed_lookup(data, probes)
    set_ms, _ = timed_lookup(as_set, probes)
    print(
        f"n={n:>9,}  probes=200  hits={hits:>3}  "
        f"list={list_ms:8.2f} ms  set={set_ms:6.2f} ms  "
        f"list/set={list_ms / set_ms:7.0f}x"
    )`,
      },
      output: "n=  100,000  probes=200  hits=103  list=   90.88 ms  set=  0.07 ms  list/set=   1259x\nn=1,000,000  probes=200  hits=106  list=  726.78 ms  set=  0.11 ms  list/set=   6342x",
      notes: [
        "`hits=103` and `hits=106` come from the fixed seed; the timings do not. The set time is noisy at this scale (tens of microseconds), so read it as flat, not as a precise 0.11 ms.",
        "The list time grew by roughly the same factor as n (8x here for a 10x input; a rerun may show 9x to 11x): a miss scans n and a hit scans on average n/2, so total work is proportional to n. The set stayed flat, which is the shape of O(1).",
        "Memory is the price: a set of one million integers uses several times the list's memory. If you only do five lookups, the list is often faster because you skip hashing and allocation.",
      ],
    },
    {
      title: "Count, group and spot repeats with hash tables",
      text: [
        "Frequency counting is the other half of the pattern: instead of asking 'is it present?', ask 'how many times?' or 'which group?'. A dict keyed by the value holds the count; `collections.Counter` is that loop with a nicer API, and `defaultdict(list)` is the same idea for grouping anagrams.",
        "The last block counts one million synthetic words. That is O(n) work with O(k) extra space for k distinct keys - time grows with the input, memory with the vocabulary.",
      ],
      code: {
        lang: "python",
        file: "freq_patterns.py",
        code: `import random
import time
from collections import Counter, defaultdict

sentence = "the quick brown fox jumps over the lazy dog the fox"
counts: dict[str, int] = {}
for word in sentence.split():
    counts[word] = counts.get(word, 0) + 1
print("counts:", dict(sorted(counts.items())))
print("most_common(2):", Counter(sentence.split()).most_common(2))

groups: defaultdict[str, list[str]] = defaultdict(list)
for w in ["eat", "tea", "tan", "ate", "nat"]:
    groups["".join(sorted(w))].append(w)
print("anagram groups:", dict(groups))


def first_repeat(s: str) -> str | None:
    seen: set[str] = set()
    for ch in s:
        if ch in seen:
            return ch
        seen.add(ch)
    return None


print("first_repeat('abca'):", first_repeat("abca"))

rng = random.Random(7)
corpus = [str(rng.randrange(10_000)) for _ in range(1_000_000)]

t0 = time.perf_counter()
freq = Counter(corpus)
elapsed = time.perf_counter() - t0

print(f"1,000,000 words -> {len(freq):,} distinct keys in {elapsed * 1000:.0f} ms")`,
      },
      output: "counts: {'brown': 1, 'dog': 1, 'fox': 2, 'jumps': 1, 'lazy': 1, 'over': 1, 'quick': 1, 'the': 3}\nmost_common(2): [('the', 3), ('fox', 2)]\nanagram groups: {'aet': ['eat', 'tea', 'ate'], 'ant': ['tan', 'nat']}\nfirst_repeat('abca'): a\n1,000,000 words -> 10,000 distinct keys in 96 ms",
      notes: [
        "`most_common(2)` returns a list of `(key, count)` pairs; ties keep insertion order, so do not rely on tie order for anything important.",
        "The production dedupe from the problem is the membership half of this pattern: build `{norm_url(u) for u in stored}` once, then one `in` check per new article. Same shape as `first_repeat`, different question.",
        "`Counter` and `defaultdict` are still dicts: expected O(1) per operation, O(k) space. If you need the counts sorted, sort the distinct keys afterwards - O(k log k), not O(n log n).",
      ],
    },
    {
      title: "Complexities at a glance",
      text: [
        "Use this as a vocabulary check, not a stopwatch. 'Expected' means average over a good hash; 'worst' is the adversarial or pathological case. `k` is the number of results a range query returns.",
      ],
      code: {
        lang: "text",
        file: "complexities.txt",
        code: `operation                     list / tuple        dict / set (hash)      sorted list + bisect
-------------------------------------------------------------------------------------------
index by position            O(1)                not applicable         O(1)
lookup by value or key       O(n)                O(1) expected          O(log n)
insert at end                O(1) amortised      O(1) amortised         O(n) (shift)
delete by value or key       O(n)                O(1) expected          O(n) (shift)
iterate in stored order      O(n)                O(n) insertion order   O(n) sorted
range query lo <= x <= hi    O(n)                O(n) (no locality)     O(log n + k)
worst case                   O(n)                O(n) (all collide)     O(log n) search
extra memory                 O(n)                O(n) + table overhead  O(n)

other structures
heap            peek min O(1); push/pop O(log n); search O(n)
trie            prefix lookup O(length of prefix); memory heavy
bloom filter    O(k) hashes, no false negatives, false positives possible`,
      },
      notes: [
        "Sorted list + `bisect` gives O(log n) search but O(n) insert because elements shift. A B-tree index (what a database uses by default) gives O(log n) for both and keeps order, at the cost of a tree and disk pages.",
        "A heap is not a sorted list: it gives O(1) peek at the minimum and O(log n) push/pop, but O(n) search for an arbitrary value. Use it for top-k or scheduling, not membership.",
      ],
    },
    {
      title: "Which structure should I reach for?",
      text: [
        "Draw the decision before you write the loop. The first branch is the question you are asking, not the data structure you know best.",
      ],
      code: {
        lang: "mermaid",
        file: "structure-choice.mmd",
        code: `flowchart TD
    A["Question about a collection"] --> B{"Exact key or seen-before?"}
    B -->|"yes"| C["dict / set<br/>expected O(1)"]
    B -->|"no"| D{"Order, nearest or range?"}
    D -->|"yes"| E["sorted list + bisect<br/>or B-tree index"]
    D -->|"no"| F{"Top-k or min/max?"}
    F -->|"yes"| G["heap<br/>O(log n) push/pop"]
    F -->|"no"| H["list, sort once<br/>O(n log n)"]
    C --> I{"Keys attacker-controlled?"}
    I -->|"yes"| J["keyed / randomised hash<br/>+ bound input size"]
    I -->|"no"| K["use it"]`,
      },
      notes: [
        "Two Sum is the 'exact key' branch: the complement is a key. A range query like 'users aged 18 to 30' is the ordered branch: a hash map has no locality, so it scans.",
        "If keys come from an untrusted request body, treat collision resistance as a security property, not a performance detail. Python's randomised string hash and a bound on key length and count are the baseline.",
      ],
    },
  ],
  companies: [
    "**CPython's dict and set (verified in this lesson):** the timings above ran on CPython 3.11.15 on one machine: 200 membership probes took 727 ms against a one-million-element list and 0.11 ms against the equivalent set, and one million Counter updates took 96 ms. Those numbers are machine-specific; the shapes - flat for the set, linear for the list - are the portable part.",
    "**Redis and Memcached (illustrative):** both are networked hash maps. Redis adds expiry, persistence and ordered structures (sorted sets) because a plain hash map cannot answer range and ranking questions; Memcached stays a pure cache. Choosing between them is the same 'which operations do I need?' question at service scale.",
    "**Database indexes (illustrative):** PostgreSQL and MySQL default to B-tree indexes precisely because they keep order and answer range queries in O(log n + k). A hash index answers equality only, which is why it is a specialist choice (MySQL MEMORY/NDB hash indexes, PostgreSQL hash indexes) rather than the default.",
    "**Hash-flooding defences (illustrative):** in 2011 a generation of web frameworks was vulnerable to hashDoS: an attacker sent keys that all collided, turning O(1) lookups into O(n²). Python 3.4 moved string hashing to SipHash with a per-process random seed; Ruby, Java and others made similar changes. The lesson: worst case is a security property when input is untrusted.",
    "**Bloom filters and dedupe pipelines (illustrative):** at very large scale, a Bloom filter - a bit array with several hash functions - answers 'definitely not seen' or 'probably seen' in O(k) with a fraction of a set's memory. It has false positives and no deletion, so pipelines pair it with a real set or store for confirmation.",
  ],
  mistakes: [
    { mistake: "Using `x in list` inside a loop", why: "It reads nicely and works on small data", wrong: "Hidden O(n²) that explodes in production", fix: "Convert to a set once before the loop" },
    { mistake: "Dropping the wrong terms in Big-O", why: "Confusing constants with variables", wrong: "Calling O(n·m) 'O(n)' when m is another input size", fix: "Name each input size separately: O(n + m), O(n·m)" },
    { mistake: "Ignoring space complexity", why: "Interview focus on speed", wrong: "An O(n) solution using a giant dict runs out of memory on a large batch", fix: "State both time and space; consider streaming or chunking" },
    { mistake: "Pairing an element with itself in Two Sum", why: "Inserting into the map before checking", wrong: "[3] with target 6 wrongly returns (0, 0)", fix: "Check for the complement first, then insert" },
    { mistake: "Using mutable objects as keys", why: "Wanting to key by a list of tags", wrong: "TypeError in Python; silent bugs in languages that allow it", fix: "Use tuples or frozensets of immutable values" },
    { mistake: "Treating Big-O as a stopwatch", why: "Comparing implementations by their complexity label alone", wrong: "Picking an O(n log n) sort for a 10-item list where insertion sort's smaller constant wins, or assuming a dict beats a list at n = 3", fix: "Estimate growth first, then measure at the n you will ship; constants decide small n" },
    { mistake: "Assuming dict lookup is always O(1)", why: "The average-case label is remembered as a guarantee", wrong: "A custom `__hash__` returning a constant, or attacker-chosen keys, turns every lookup into a scan and n lookups into O(n²)", fix: "Say 'expected O(1)', keep hashes well distributed, and treat untrusted keys as a worst-case risk" },
    { mistake: "Using a dict for ordered or range queries", why: "A dict is the default 'fast lookup' answer", wrong: "You sort on every request, or scan every key for a range because hashes destroy locality", fix: "Use a sorted list with bisect, a B-tree index, or a database query for order and ranges" },
    { mistake: "Changing a dict while looping over it", why: "Deleting obsolete keys inside `for k in d`", wrong: "RuntimeError: dictionary changed size during iteration", fix: "Iterate over `list(d)` or build a new dict comprehension" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Before coding, estimate n and the complexity. If n can reach 10⁵ and you have nested loops over it, redesign first." },
    { tag: "Performance", text: "Build lookup sets and dicts once, outside loops, and never rebuild them per item." },
    { tag: "Performance", text: "Measure at the n you will ship with `time.perf_counter` or `timeit`, and report growth ratios rather than one absolute time." },
    { tag: "Maintainability", text: "Name maps by meaning (`index_by_value`, `count_by_word`, not `d`), and write 'expected O(1)' when that is what you mean." },
    { tag: "Reliability", text: "State time and space; test empty input, one element, duplicates and no solution; treat untrusted keys as an adversarial input." },
  ],
  interview: [
    { q: "What is the time complexity of dict lookup, and when can it be worse?", a: "Expected O(1), not guaranteed O(1). A dict hashes the key, masks it to a bucket index, and compares the stored key there; the number of entries does not change the number of buckets examined. Collisions are handled by probing, and CPython resizes when the table is about two-thirds full, so inserts are amortised O(1) over the O(n) rehash. The worst case is O(n) per lookup when many keys collide, for example a custom __hash__ that returns a constant or attacker-chosen keys, which turns n lookups into O(n²). Hashing a long string also costs O(length) the first time, although CPython caches the hash on the string object. Python randomises string hashing per process to make adversarial collisions hard; say 'expected' and mention the worst case, and you have the complete answer." },
    { q: "Walk me through Two Sum and its trade-offs.", a: "Brute force checks every pair, O(n²) time and O(1) space. With a hash map from value to index, for each x I look up target − x; that is O(n) time and O(n) space. The order matters: check the complement before inserting x, otherwise a single element can pair with itself. There is also a two-pointer solution: sort first (O(n log n), O(n) or O(1) space depending on the sort) then move the pointers inward in O(n); if the input is already sorted, that is O(n) time and O(1) space. Best case for the hash version is O(1) when the first two elements match; quote the average and worst cases too. At tiny n the brute force can win on constants, which is why you measure at the real input size." },
    { q: "How do you recognise that a problem needs a hash map - and when is it the wrong tool?", a: "Look for 'seen before', 'count', 'frequency', 'pair that sums to', 'group by', 'duplicate', 'first unique', or a brute force whose inner loop searches for something specific. Replace that inner loop with a dict or set built once. But a hash map only answers exact-key questions well: hashes scatter keys, so ordered iteration, nearest-value, range queries and prefix search are better served by a sorted list with bisect, a B-tree index, or a trie. Top-k and streaming minimums want a heap; tiny collections may be faster as a plain list because hashing has overhead; and attacker-controlled keys make the worst-case collision behaviour a security concern. The right answer names the operations the problem needs, not just 'dict is O(1)'." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "What is the time complexity?",
      code: { lang: "python", code: "for a in users:          # n users\n    for b in courses:    # m courses\n        check(a, b)" },
      options: ["O(n)", "O(n²)", "O(n·m)", "O(n + m)"],
      answer: 2,
      explanation: "Two different inputs, nested: n·m. It is only O(n²) if both are the same collection. Name each input separately.",
    },
    {
      kind: "bug",
      prompt: "This 'dedupe' is slow for 100k items. What is the fix?",
      code: { lang: "python", code: "out = []\nfor x in items:\n    if x not in out:\n        out.append(x)" },
      options: ["Use a while loop", "Track seen items in a set", "Sort descending", "Use recursion"],
      answer: 1,
      explanation: "`x not in out` is O(n) on a list, making the whole thing O(n²). A seen-set makes each check expected O(1): O(n) total, at the cost of O(n) memory.",
    },
    {
      kind: "output",
      prompt: "two_sum([3, 2, 4], 6) with the hash-map version returns:",
      options: ["(0, 0)", "(1, 2)", "(0, 2)", "None"],
      answer: 1,
      explanation: "i=0: need 3, not seen; store 3. i=1: need 4, not seen; store 2. i=2: need 2, seen at 1 -> (1, 2). Checking before inserting is what prevents (0, 0).",
    },
  ],
  cheatSheet: [
    "O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).",
    "Big-O is growth, not seconds. Keep the dominant term, drop constants, and name each input separately.",
    "Constants decide small n, growth decides large n: with constants 10 and 1, O(n) is slower than O(n²) until n = 10.",
    "Best/average/worst describe inputs. Amortised O(1) is a sequence guarantee (rare resizes), not an average.",
    "dict/set: expected O(1) insert and lookup; list `in`: O(n) always.",
    "Hash map worst case is O(n) under collisions; CPython resizes at about two-thirds load and randomises string hashes.",
    "Space: Two Sum with a hash map is O(n), brute force O(1). Always state time AND space.",
    "Inner loop searching for something? Build a set/dict once, then look up.",
    "Wrong tool: order/range -> sorted list + bisect or B-tree; top-k -> heap; prefix -> trie; tiny n -> list.",
    "Two Sum: check complement first, then insert. Signals: seen, count, pair, group, duplicate, first unique.",
  ],
  homework: {
    basic: {
      title: "Valid anagram and contains-duplicate",
      brief: ["Implement `is_anagram(a, b)` and `has_duplicate(nums)` in O(n) time. State best, average, worst and space complexity in the docstrings."],
      criteria: ["O(n) average solutions with the worst case named", "Edge cases: empty strings, different lengths, unicode", "Tests"],
      hints: ["Counter(a) == Counter(b)", "len(set(nums)) != len(nums), or an early-exit loop"],
      solution: {
        text: ["Both are counting/seen problems. The early-exit loop for duplicates can stop at the first repeat, which is O(1) best case and O(n) worst case; building the full set is always O(n). Space is O(k) for k distinct characters or values."],
        code: { lang: "python", code: `from collections import Counter

def is_anagram(a: str, b: str) -> bool:
    """O(n) time, O(k) space for k distinct chars. Worst case O(n) when hashes collide."""
    return len(a) == len(b) and Counter(a) == Counter(b)

def has_duplicate(nums: list[int]) -> bool:
    """Best O(1) if the repeat is first, average/worst O(n); O(n) space."""
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
      brief: ["Solve 'group anagrams' and 'top k frequent elements'. For top-k, give an O(n log k) solution with a heap and an O(n) solution with bucket sort, and compare them. Explain why the heap, not a hash map, answers the top-k question."],
      criteria: ["Both problems solved with stated complexity", "Two approaches for top-k with trade-offs", "One sentence on why a hash map alone cannot rank"],
      hints: ["heapq.nlargest(k, counts, key=counts.get)", "Bucket index = frequency (max n)."],
      solution: {
        text: ["Group anagrams: key by sorted word (O(n·L log L)) or by a 26-count tuple (O(n·L)). Top-k: a hash map gives counts in O(n), but it has no order, so ranking needs a heap (O(n log k), small memory) or bucket sort (O(n), n+1 buckets)."],
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
      brief: ["Given an unsorted list, return the length of the longest run of consecutive integers (e.g. [100, 4, 200, 1, 3, 2] -> 4). Sorting gives O(n log n); find the O(n) approach and prove why it is O(n)."],
      criteria: ["O(n) expected solution using a set", "Argument for why the inner while loop does not make it O(n²)", "Worst case stated for adversarial hashing"],
      hints: ["Only start counting from x if x − 1 is not in the set."],
      solution: {
        text: ["Each number is visited by the inner loop only as part of the run starting at that run's smallest element, so total inner-loop work across all starts is at most n. Overall O(n) expected, O(n) space; with pathological hashing the set lookups degrade and so does the bound."],
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
      brief: ["Add `dedupe_new(new_articles, stored_urls: set[str])` to the AI service, reusing your URL normaliser from lesson 1.1.1. Benchmark 5,000 new vs 200,000 stored URLs and record the time in the README, together with the expected and worst-case complexity."],
      criteria: ["O(new + stored) average complexity, with the worst case named", "Benchmark numbers recorded", "Unit tests"],
      hints: ["Generate fake URLs with f-strings in a loop.", "The set is only fast because stored URLs are normalised once; do not re-normalise them per batch."],
      solution: {
        text: [
          "Normalise the stored URLs once into a set with `build_url_index` (O(stored), done at startup or kept as a normalised column), then `dedupe_new` normalises each new URL and checks the set: expected O(1) per article, O(new) per batch and O(new + stored) overall. A second small set catches duplicates inside the same batch without mutating the caller's index.",
          "Measured on a shared machine: building the 200,000-URL index took about 1 s, the 5,000-article dedupe about 20 ms, and the nested version (a list scan per new article) 10 to 25 s on the same input. Record your own numbers in the README; the ratio matters more than the absolute times. In the worst case - adversarial URLs that collide in the hash table - the set lookup degrades to a scan, so bound request sizes if the URLs are untrusted.",
          "Run from services/ai: `python -m devatlas_ai.dedupe` prints the benchmark, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/dedupe.py", code: `"""Article dedupe for the ingester: O(new + stored) with a set of normalised URLs."""
from collections.abc import Iterable
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


@dataclass(frozen=True)
class Article:
    title: str
    url: str
    published_at: str


def norm_url(url: str) -> str:
    """URL normaliser from lesson 1.1.1: lowercase host, drop utm_*, trailing '/' and #fragment."""
    p = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(p.query) if not k.startswith("utm_")])
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), query, ""))


def build_url_index(urls: Iterable[str]) -> set[str]:
    """Normalise stored URLs once (at startup, or keep a normalised column). O(stored)."""
    return {norm_url(u) for u in urls}


def dedupe_new(new_articles: Iterable[Article], stored_urls: set[str]) -> list[Article]:
    """Return new articles whose normalised URL is not in stored_urls or earlier in this batch.

    stored_urls must already be normalised (see build_url_index). Time O(new) expected:
    one expected-O(1) set lookup per article; with building the index, O(new + stored)
    overall. Worst case O(new * stored) only under pathological hash collisions.
    Extra space O(new) for the URLs added during this batch. Keeps the first duplicate.
    """
    in_batch: set[str] = set()         # separate set: the caller's index is never mutated
    fresh: list[Article] = []
    for article in new_articles:
        key = norm_url(article.url)
        if key not in stored_urls and key not in in_batch:
            in_batch.add(key)                              # also dedupes inside the batch
            fresh.append(article)
    return fresh


def dedupe_nested(new_articles: list[Article], stored_urls: list[str]) -> list[Article]:
    """The old O(new x stored) version, kept only for the benchmark."""
    return [a for a in new_articles if norm_url(a.url) not in stored_urls]   # list scan each


if __name__ == "__main__":
    import time

    raw = [f"https://news.example.com/story/{i}/?utm_source=rss" for i in range(200_000)]
    new = [Article(f"Story {i}", f"https://NEWS.example.com/story/{i}", "2026-10-18")
           for i in range(197_500, 202_500)]               # 2,500 already stored, 2,500 fresh

    t = time.perf_counter()
    index = build_url_index(raw)
    print(f"build index of 200,000 stored URLs (once): {time.perf_counter() - t:.2f}s")

    t = time.perf_counter()
    fresh = dedupe_new(new, index)
    print(f"dedupe_new, 5,000 new: {(time.perf_counter() - t) * 1000:.0f} ms, fresh: {len(fresh)}")

    stored_list = list(index)
    t = time.perf_counter()
    assert dedupe_nested(new, stored_list) == fresh
    print(f"nested version, same input: {time.perf_counter() - t:.1f}s")

# ---- services/ai/tests/test_dedupe.py ----
from devatlas_ai.dedupe import Article, build_url_index, dedupe_new, norm_url


def art(url: str, title: str = "t") -> Article:
    return Article(title, url, "2026-10-18")


def test_norm_url_ignores_tracking_case_and_trailing_slash() -> None:
    assert norm_url(" https://Example.com/a/?utm_source=x&id=7#top ") == "https://example.com/a?id=7"


def test_filters_stored_urls_after_normalising_both_sides() -> None:
    index = build_url_index(["https://example.com/a/?utm_medium=email"])
    fresh = dedupe_new([art("https://EXAMPLE.com/a"), art("https://example.com/b")], index)
    assert [a.url for a in fresh] == ["https://example.com/b"]
    assert index == {"https://example.com/a"}             # caller's index not mutated


def test_duplicates_inside_the_batch_keep_the_first() -> None:
    batch = [art("https://x.io/p", "first"), art("https://x.io/p/", "second")]
    assert [a.title for a in dedupe_new(batch, set())] == ["first"]


def test_edge_cases_empty_inputs_and_meaningful_query_params() -> None:
    assert dedupe_new([], {"https://x.io"}) == []
    assert dedupe_new([art("https://x.io/p")], set()) == [art("https://x.io/p")]
    assert len(dedupe_new([art("https://x.io/p?id=1")], {"https://x.io/p?id=2"})) == 1


def test_scales_linearly() -> None:
    import time
    stored = {f"https://x.io/{i}" for i in range(200_000)}
    new = [art(f"https://x.io/{i}") for i in range(195_000, 200_000)]
    t = time.perf_counter()
    assert dedupe_new(new, stored) == []
    assert time.perf_counter() - t < 1    # O(new + stored); the nested version takes seconds` },
        output: "build index of 200,000 stored URLs (once): ~1s (varies by machine)\ndedupe_new, 5,000 new: ~20 ms, fresh: 2500\nnested version, same input: ~10-25s",
        pitfalls: [
          "Normalising only one side: stored and new URLs must go through the same norm_url, or 'https://X.com/a/' and 'https://x.com/a' look different.",
          "Re-normalising all stored URLs on every batch: that is where most of the time goes, so build the index once.",
          "Forgetting duplicates inside the batch itself: two feeds often carry the same story in one run.",
        ],
      },
    },
  },
  deeper: [
    { label: "Big-O Cheat Sheet: time and space complexity of common structures", url: "https://www.bigocheatsheet.com/" },
    { label: "Python docs: collections (Counter, defaultdict)", url: "https://docs.python.org/3/library/collections.html" },
    { label: "Python docs: heapq", url: "https://docs.python.org/3/library/heapq.html" },
    { label: "Python docs: built-in types (dict and set operations)", url: "https://docs.python.org/3/library/stdtypes.html" },
    { label: "Python docs: timeit, for measuring small snippets", url: "https://docs.python.org/3/library/timeit.html" },
    { label: "Python wiki: TimeComplexity of built-in operations", url: "https://wiki.python.org/moin/TimeComplexity" },
  ],
  nextPreview: "Next in DSA: two pointers and sliding window, the patterns behind 'longest substring', 'max sum subarray' and rate limiters.",
};
