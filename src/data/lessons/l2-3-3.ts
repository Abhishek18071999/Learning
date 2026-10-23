import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.3.3",
  title: "Tries",
  minutes: 65,
  level: "Intermediate",
  prerequisites: ["2.3.1 Trees, BSTs and heaps"],
  summary: "Build a trie (prefix tree) for autocomplete, prefix search and wildcard matching, rank suggestions, and know when a trie beats a hash map, a sorted list or a database index.",
  terms: [
    { term: "Trie", def: "A prefix tree where each edge is a character and each path from the root spells a prefix. Pronounced 'try', from retrieval." },
    { term: "Prefix", def: "The start of a string: 'doc' is a prefix of 'docker' and 'docs', and every string is a prefix of itself." },
    { term: "is_end flag", def: "A boolean (or payload) on a node saying a complete key ends there. Without it, 'doc' looks present whenever 'docker' is stored." },
    { term: "Root", def: "The node representing the empty prefix. It stores no character; its children are the first characters of every key." },
    { term: "Radix tree", def: "A compressed trie that merges each chain of single-child nodes into one edge labelled with a string. Also called a Patricia trie in routing." },
    { term: "Autocomplete", def: "Suggesting completions for the characters typed so far, usually ranked by popularity rather than alphabetically." },
    { term: "Top-K", def: "The K best-scoring items under a prefix. A size-K heap keeps them while walking the subtree, using O(K) extra memory." },
    { term: "Lexicographic order", def: "Dictionary order: compare character by character, shorter string first when one is a prefix of the other. A depth-first walk with sorted children produces it." },
    { term: "Longest prefix match", def: "Find the longest stored key that is a prefix of the input, e.g. an IP route or a URL pattern. Walk while children exist and remember the last is_end node." },
    { term: "Hash set", def: "A hash table storing keys only. Exact membership is O(L) average, but finding all keys with a prefix requires scanning every key." },
    { term: "Wildcard search", def: "Pattern matching where '.' stands for one character and '*' for zero or more. A trie turns this into a guided depth-first search instead of a scan of every word." },
    { term: "Ternary search tree", def: "A memory-saving alternative: each node has left, equal and right children, so it behaves like a BST of characters. Slower in practice, smaller than a dictionary-per-node trie." },
  ],
  problem: [
    "The DevAtlas search box should suggest lessons and glossary terms as the learner types: 'ku' → 'kubernetes', 'kubectl'. With 5,000 terms a linear scan per keystroke feels instant. At 500,000 terms, dozens of learners typing at once, and a ranking rule on top, that scan becomes the slowest thing in the product. The obvious fix, a hash set of terms, answers 'is this exact word present?' in O(L) but cannot answer 'what starts with ku?' without visiting every term.",
    "A trie (prefix tree) stores words by their characters, so shared beginnings share nodes. Exact lookup, prefix existence and prefix listing cost time proportional to the key length plus the matches, independent of dictionary size, and a depth-first walk yields lexicographic order for free. This lesson builds one, measures it against a hash set and a sorted list, adds ranked autocomplete and wildcard matching, and shows where a trie is the wrong tool.",
  ],
  concept: {
    analogy: [
      "A trie is a **phone keypad menu**: press D, then O, then C, and at each step the set of possible endings shrinks. Words that share a beginning share the same path, so 'docker', 'docs' and 'dock' live on one 'doc' branch with three small endings.",
      "It is also a **road network for words**. Every word beginning with 'doc' drives the same road to the 'doc' junction; a signpost there says whether 'doc' itself is a destination (`is_end`), while the roads continuing to 'docker' and 'docs' are the children. Asking for 'everything past this junction' is a drive through the subtree, not a search of the whole country.",
    ],
    precise: [
      "A trie node holds a map from character to child, plus a flag or payload marking a complete key. The root represents the empty prefix. Insert walks the key one character at a time, creating nodes as needed, and marks the final node. Search walks the same path and requires the flag; `startsWith` walks the path and ignores the flag. Both are O(L) for a key of length L, independent of how many keys N are stored.",
      "Prefix listing walks L nodes to the prefix, then visits the subtree below it and returns every marked node: O(L + M) for M results. If children are visited in sorted order, the output is already lexicographic, so no separate sort is needed. A hash set cannot do this without an O(N·L) scan; a sorted array plus binary search does it in O(log N + M), which is why sorted arrays are excellent for static dictionaries.",
      "Memory is the price. A trie stores one node per distinct prefix, so the worst case is O(total characters) nodes, each with a child map and a flag. In CPython a dict-per-node trie can cost hundreds of bytes per word. A radix tree (compressed trie) merges chains of single-child nodes into one edge, and a ternary search tree trades speed for a smaller node. Measure before choosing: a sorted list of the same words is often an order of magnitude smaller.",
      "The trie earns its memory when queries are about structure: autocomplete, prefix counts, ordered traversal, longest-prefix matching and wildcard patterns. It also shines when the dictionary changes, because inserting a word touches only L nodes instead of shifting an array. For exact membership only, a hash set is simpler and usually faster; for a small static dictionary, sorted list plus `bisect` is hard to beat.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Node anatomy.** Every node is one prefix. The root is the empty prefix, so it stores no character of its own. Its `children` map keys are the next characters; a missing key means no stored word continues that way. The `is_end` flag (here a `score`, where `None` means 'not a word' and an integer means 'a word with this popularity') separates a path from a word: after inserting only 'docker', the node for 'doc' exists but is not a word end, so `search('doc')` must return false while `startsWith('doc')` returns true.",
      "2. **Walking is the whole algorithm.** Insert and search both start at the root and follow one child per character. Insert creates missing children with `setdefault`; search returns `None` as soon as a child is missing. There is no hashing, no comparison of whole strings and no dependence on N: a 10-character key takes 10 steps whether the trie holds 10 words or 10 million. A hash set also takes O(L) to hash a key, but it can only answer exact equality; a sorted array takes O(log N) comparisons, and each comparison can scan up to L characters.",
      "3. **Prefix listing and order.** To list everything under a prefix, walk to the prefix node and run a depth-first traversal. Push children in reverse sorted order onto a stack and each subtree is popped alphabetically, so the output is lexicographic without a sort. If you only need the first K alphabetical results, stop early. If you need the top K by score, you must see every marked node in the subtree (unless you cache an answer at each node), because a low-scoring word can hide anywhere below the prefix.",
      "4. **Memory and compression.** The node count is the number of distinct prefixes, not the number of words. For 100,000 eight-character words over an eight-letter alphabet this lesson's benchmark builds 241,470 nodes and uses roughly 44.5 MB of CPython objects, while a sorted list of references to the same strings uses under 1 MB. A radix tree collapses 'k-u-b-e-r-n-e-t-e-s' into one edge and cuts both node count and pointer chasing; routers use Patricia tries for exactly this reason. A ternary search tree or a finite-state transducer can shrink a static dictionary further, at the cost of more complex code and slower updates.",
      "5. **Counts and top-K.** Store a frequency or score at the terminal node, and optionally a `passes` counter on every node for 'how many keys go through this prefix'. A query walks the prefix, then runs a DFS with a min-heap of size K keyed by `(score, word)`: O(M log K) time and O(K) memory for M matches. For read-heavy systems, precompute and cache the top K at each node: a query becomes O(L), but every insert or score update must refresh the ancestors, so the build pipeline usually aggregates query logs offline and publishes a fresh trie periodically.",
      "6. **Wildcard and regex-lite.** Support '.' (exactly one character) and '*' (zero or more) by recursing over the trie: '.' tries every child; '*' either stops consuming or consumes one child and stays on the same pattern position; a literal follows one child. This visits only paths that can still match, which is why it beats scanning every word. The worst case is still exponential in the number of stars, so cap pattern length and the number of stars for untrusted input. Real regex engines compile to automata, but the trie recursion is enough for search-box globs.",
      "7. **Longest prefix match.** To find the longest stored key that prefixes an input, walk characters while children exist and remember the last node with `is_end`. Stop at the first missing child and return the remembered key. Network routers do this on binary strings of IP address bits, using compressed tries so a routing table with hundreds of thousands of CIDR entries fits in memory. The same walk matches URL path prefixes and domain suffixes.",
      "8. **When the trie loses.** Exact membership, tiny dictionaries, memory-constrained devices and read-only data often favour a hash set or a sorted array. On this machine, collecting 1,563 completions from 100,000 words was faster with a sorted list (about 0.57 ms) than with the dict-per-node trie (about 3.4 ms), because the list is contiguous and `str.startswith` runs in C while the trie pays Python overhead per node and allocates a new string at every step. The trie still won the existence check by 2 to 3 times and scales better when N grows or per-prefix aggregates are needed. Constants and workload decide; the asymptotics only tell you what happens next.",
    ],
    diagram: {
      title: "Trie for: do, dock, docker, docs",
      nodes: [
        { label: "root", sub: "empty prefix" },
        { label: "d", sub: "one node per character" },
        { label: "o ✓", sub: "'do' ends here" },
        { label: "c", sub: "shared by three words" },
        { label: "k ✓ / s ✓", sub: "dock, docs" },
        { label: "e → r ✓", sub: "docker" },
      ],
      edges: ["d", "o", "c", "k | s", "e-r"],
      caption: "✓ marks is_end. 'do' is a word and also a prefix; the node for 'doc' is not a word end. A DFS from any node lists its subtree in alphabetical order.",
    },
  },
  handsOn: [
    {
      title: "Insert, search, startsWith, list and rank",
      text: [
        "Every node holds a child map, a `score` (`None` means no word ends here) and `passes`, the number of distinct keys whose path crosses the node. `insert` creates one node per character and stores the score on the last one; re-inserting a key updates the score without double-counting. `search` requires the flag, `startsWith` only needs the path. `words_with_prefix` is an iterative DFS that pushes children in reverse sorted order, so the stack pops them alphabetically. `top_k` keeps a size-k min-heap of `(score, word)` while it walks.",
      ],
      code: {
        lang: "python",
        file: "trie.py",
        code: `import heapq
class TrieNode:
    __slots__ = ("children", "score", "passes")
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.score: int | None = None; self.passes = 0   # word end; keys crossing node
class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()
    def insert(self, word: str, score: int = 1) -> None:
        node, path = self.root, [self.root]
        for ch in word.lower():
            node = node.children.setdefault(ch, TrieNode())
            path.append(node)
        if node.score is None:              # first insert of this exact word
            for n in path:
                n.passes += 1
        node.score = score                  # later inserts only update popularity
    def search(self, word: str) -> bool:
        node = self._walk(word.lower())
        return node is not None and node.score is not None
    def starts_with(self, prefix: str) -> bool:
        return self._walk(prefix.lower()) is not None
    def words_with_prefix(self, prefix: str) -> list[str]:
        """All words under the prefix, in lexicographic order, via iterative DFS."""
        node = self._walk(prefix.lower())
        if node is None:
            return []
        out: list[str] = []
        stack = [(node, prefix.lower())]
        while stack:
            n, word = stack.pop()
            if n.score is not None:
                out.append(word)
            for ch in sorted(n.children, reverse=True):
                stack.append((n.children[ch], word + ch))
        return out
    def top_k(self, prefix: str, k: int = 5) -> list[str]:
        """Highest-scoring k words under prefix: a size-k min-heap during the DFS."""
        node = self._walk(prefix.lower())
        if node is None:
            return []
        best: list[tuple[int, str]] = []
        stack = [(node, prefix.lower())]
        while stack:
            n, word = stack.pop()
            if n.score is not None:
                if len(best) < k:
                    heapq.heappush(best, (n.score, word))
                elif (n.score, word) > best[0]:
                    heapq.heapreplace(best, (n.score, word))
            for ch, child in n.children.items():
                stack.append((child, word + ch))
        return [word for _, word in sorted(best, key=lambda x: (-x[0], x[1]))]
    def count_prefix(self, prefix: str) -> int:
        node = self._walk(prefix.lower()); return node.passes if node is not None else 0
    def _walk(self, text: str) -> TrieNode | None:
        node = self.root
        for ch in text:
            node = node.children.get(ch)
            if node is None:
                return None
        return node
t = Trie()
for term, popularity in [("docker", 90), ("docs", 40), ("dock", 10), ("do", 5),
                         ("kubernetes", 95), ("kubectl", 70), ("kafka", 60)]:
    t.insert(term, popularity)
print("search('dock'), search('doc') :", t.search("dock"), t.search("doc"))
print("starts_with('doc'), ('dox')   :", t.starts_with("doc"), t.starts_with("dox"))
print("words_with_prefix('doc')      :", t.words_with_prefix("doc"))
print("top_k('doc')                  :", t.top_k("doc"))
print("top_k('k', k=2)               :", t.top_k("k", k=2))
ct = Trie()
for query in ["docker run", "docker build", "docker compose", "dotnet build", "git push"]:
    ct.insert(query)
print("count_prefix docker/do/k      :", ct.count_prefix("docker"),
      ct.count_prefix("do"), ct.count_prefix("k"))`,
      },
      output: "search('dock'), search('doc') : True False\nstarts_with('doc'), ('dox')   : True False\nwords_with_prefix('doc')      : ['dock', 'docker', 'docs']\ntop_k('doc')                  : ['docker', 'docs', 'dock']\ntop_k('k', k=2)               : ['kubernetes', 'kubectl']\ncount_prefix docker/do/k      : 3 4 0",
      notes: [
        "`search` and `startsWith` differ by one check: the final node's flag. That is the bug in the quick-check question below.",
        "`passes` gives prefix counts for free: 'do' counts 4 because docker-run, docker-build, docker-compose and dotnet-build all cross that node.",
        "Top-K is O(M log K) for M matches. Sorting every match would be O(M log M); the heap only ever holds K items.",
      ],
    },
    {
      title: "Wildcard search: dot and star",
      text: [
        "A search box often accepts globs: `.` matches exactly one character, `*` matches zero or more. The pattern is anchored at both ends, so `ca.` matches three-letter words only. The recursion never leaves the trie: a literal follows one child, `.` tries every child, and `*` either consumes nothing (advance the pattern) or consumes one character (stay on the same `*` and descend).",
      ],
      code: {
        lang: "python",
        file: "wildcard.py",
        code: `class Node:
    __slots__ = ("children", "is_end")
    def __init__(self) -> None:
        self.children: dict[str, "Node"] = {}
        self.is_end = False
class WildTrie:
    def __init__(self) -> None:
        self.root = Node()
    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, Node())
        node.is_end = True
    def match(self, pattern: str) -> list[str]:
        results: set[str] = set()
        def walk(node: Node | None, i: int, built: str) -> None:
            if node is None:
                return
            if i == len(pattern):
                if node.is_end:
                    results.add(built)
                return
            token = pattern[i]
            if token == ".":
                for ch in node.children:
                    walk(node.children[ch], i + 1, built + ch)
            elif token == "*":
                walk(node, i + 1, built)              # '*' matches zero characters
                for ch in node.children:
                    walk(node.children[ch], i, built + ch)  # or one more, stay on '*'
            else:
                walk(node.children.get(token), i + 1, built + token)
        walk(self.root, 0, "")
        return sorted(results)
t = WildTrie()
for word in ["car", "card", "care", "cart", "cat", "dog", "do", "dock", "docker", "docs", "dot"]:
    t.insert(word)
for pattern in ["ca.", "ca*", "c.r.", "do*", "d.*", "z*"]:
    print(f"{pattern!r:6} -> {t.match(pattern)}")`,
      },
      output: "'ca.'  -> ['car', 'cat']\n'ca*'  -> ['car', 'card', 'care', 'cart', 'cat']\n'c.r.' -> ['card', 'care', 'cart']\n'do*'  -> ['do', 'dock', 'docker', 'docs', 'dog', 'dot']\n'd.*'  -> ['do', 'dock', 'docker', 'docs', 'dog', 'dot']\n'z*'   -> []",
      notes: [
        "`d.*` and `do*` match the same words: `*` may consume zero characters, so `d.*` means 'd, any one, then anything'.",
        "The `set` removes duplicates that a pattern such as `**` can produce. For untrusted patterns, cap the length and the number of stars: the worst case is exponential.",
        "A plain prefix query is the special case `prefix + '*'`; if that is all you need, `startsWith` is cheaper than running the full matcher.",
      ],
    },
    {
      title: "At scale: trie vs sorted list + bisect",
      text: [
        "The benchmark builds both structures from the same 100,000 generated words: three letters from an eight-letter alphabet plus four digits, eight characters in total. It then answers 4,000 random two-character prefixes and 4,000 three-character prefixes. Existence uses one `bisect` plus one `startswith`; collection scans every match. Each timing is the best of three runs. Timings vary by machine and by Python build, so treat the ratios, not the digits, as the result.",
      ],
      code: {
        lang: "python",
        file: "bench.py",
        code: `import bisect
import random
import time
ALPHABET, WORDS, QUERIES = "abcdefgh", 100_000, 4_000
class Node:
    __slots__ = ("children", "is_end")
    def __init__(self) -> None:
        self.children: dict[str, "Node"] = {}
        self.is_end = False
class Trie:
    def __init__(self) -> None:
        self.root, self.nodes = Node(), 1
    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = Node()
                self.nodes += 1
            node = node.children[ch]
        node.is_end = True
    def with_prefix(self, prefix: str) -> list[str]:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return []
        out: list[str] = []
        stack = [(node, prefix)]
        while stack:
            n, word = stack.pop()
            if n.is_end:
                out.append(word)
            stack.extend((n.children[ch], word + ch) for ch in n.children)
        return out
    def starts_with(self, prefix: str) -> bool:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return False
        return True
def has_prefix(words: list[str], prefix: str) -> bool:
    i = bisect.bisect_left(words, prefix); return i < len(words) and words[i].startswith(prefix)
def with_prefix(words: list[str], prefix: str) -> list[str]:
    i = bisect.bisect_left(words, prefix)
    out: list[str] = []
    while i < len(words) and words[i].startswith(prefix):
        out.append(words[i])
        i += 1
    return out
def build_words() -> list[str]:
    rng, words = random.Random(42), set()
    while len(words) < WORDS:
        words.add("".join(rng.choices(ALPHABET, k=3)) + f"{rng.randrange(10_000):04d}")
    return sorted(words)
small = sorted(["docker", "docs", "dock", "do", "kubernetes", "kubectl", "kafka"])
print("small check:", with_prefix(small, "doc"))
words = build_words()
rng = random.Random(7)
prefixes = ["".join(rng.choices(ALPHABET, k=n)) for n in (2, 3) for _ in range(QUERIES)]
start = time.perf_counter()
trie = Trie()
for word in words:
    trie.insert(word)
trie_ms = (time.perf_counter() - start) * 1000
start = time.perf_counter()
sorted_words = sorted(words)
list_ms = (time.perf_counter() - start) * 1000
def bench(length: int) -> None:
    sample = [p for p in prefixes if len(p) == length]
    n = len(sample)
    t_sum = s_sum = 0.0
    matches = 0
    for p in sample:
        t0 = time.perf_counter()
        matches += len(trie.with_prefix(p))
        t_sum += time.perf_counter() - t0
        t0 = time.perf_counter()
        with_prefix(sorted_words, p)
        s_sum += time.perf_counter() - t0
    t_check = s_check = 0.0
    for _ in range(3):
        t0 = time.perf_counter()
        [trie.starts_with(p) for p in sample]
        t_check += time.perf_counter() - t0
        t0 = time.perf_counter()
        [has_prefix(sorted_words, p) for p in sample]
        s_check += time.perf_counter() - t0
    print(f"prefix length {length}: {n:,} queries, {matches / n:.0f} matches/query avg")
    print(f"  trie collect      {t_sum / n * 1e6:7.2f} us/query")
    print(f"  sorted + bisect   {s_sum / n * 1e6:7.2f} us/query")
    print(f"  exists? trie      {t_check / (3 * n) * 1e6:7.2f} us/query")
    print(f"  exists? bisect    {s_check / (3 * n) * 1e6:7.2f} us/query")
print(f"dictionary: {len(words):,} words, 8 characters each, 8-letter alphabet")
print(f"build: trie {trie_ms:.0f} ms ({trie.nodes:,} nodes), sorted list {list_ms:.0f} ms")
bench(2)
bench(3)
print("timings vary by machine and by Python build")`,
      },
      output: "small check: ['dock', 'docker', 'docs']\ndictionary: 100,000 words, 8 characters each, 8-letter alphabet\nbuild: trie 260 ms (241,470 nodes), sorted list 5 ms\nprefix length 2: 4,000 queries, 1563 matches/query avg\n  trie collect      3396.94 us/query\n  sorted + bisect    572.48 us/query\n  exists? trie         0.35 us/query\n  exists? bisect       0.92 us/query\nprefix length 3: 4,000 queries, 195 matches/query avg\n  trie collect       423.93 us/query\n  sorted + bisect     73.12 us/query\n  exists? trie         0.48 us/query\n  exists? bisect       1.09 us/query\ntimings vary by machine and by Python build",
      notes: [
        "These are real numbers from CPython 3.11 on one Windows machine; run the file yourself and expect different digits. The order of magnitude is what matters.",
        "Collecting all matches is faster with the sorted list here: 1,563 matches costs about 0.57 ms versus 3.4 ms, because the list is contiguous and `startswith` runs in C, while the trie allocates strings and chases pointers in Python. In a compiled language with compact nodes the gap narrows or reverses.",
        "Existence is the trie's win: about 0.35 to 0.48 microseconds versus 0.9 to 1.1 for bisect, and the trie does not pay O(log N). Add per-node counts or top-K and the sorted list cannot compete without extra indexes.",
        "A separate `tracemalloc` run on the same words measured about 44.5 MB for the 241,470 trie nodes against under 1 MB for the sorted list's references (the strings are shared). That is the memory tax compression is designed to reduce.",
      ],
    },
    {
      title: "Pick a structure: comparison table",
      text: [
        "`L` is the key length, `N` the number of keys, `M` the number of matches under a prefix. Use this as a decision table, not a benchmark: constants depend on the language, the node representation and the workload.",
      ],
      code: {
        lang: "text",
        file: "structures.txt",
        code: `                          hash set                 sorted list + bisect          trie                        radix / compressed trie
exact lookup              O(L) average             O(log N + L) comparisons      O(L), no hashing            O(L), fewer nodes
starts-with check         O(N * L) scan            O(log N + L)                  O(L)                        O(L)
list all with prefix      O(N * L) scan            O(log N + M)                  O(L + M)                    O(L + M)
ordered traversal         sort first: O(N log N)   already sorted: O(N)          DFS: O(N)                   DFS: O(N)
insert / update           O(L) average             O(N) shift in an array        O(L)                        O(L), split or merge edges
per-prefix data           none                     prefix sums possible          natural (counts, top-K)     natural
memory per word           ~1 entry                 ~1 pointer                    O(total characters) nodes   between the two
measured at 100k words    not measured             ~0.57 ms for 1,563 matches    ~3.4 ms                     not measured
best at                   membership only          static dictionary, ranges     dynamic prefixes, ranking  huge dictionaries, routers`,
      },
      notes: [
        "A sorted list plus `bisect` is the best default for a static dictionary. You only pay O(N log N) once, and the array is cache-friendly.",
        "The trie's unique columns are ordered traversal (free), per-prefix data (counts, cached top-K) and incremental inserts. Choose it for those, not for raw lookup speed.",
      ],
    },
    {
      title: "Decide with a flowchart",
      text: [
        "The flowchart is the lesson in one picture. Start from the query, not from the data structure: exact membership takes a different route from prefix, ordered or longest-prefix queries. Only then weigh whether the data is static and small, and whether reads or writes dominate.",
      ],
      code: {
        lang: "mermaid",
        file: "decision.mmd",
        code: `flowchart TD
  A[Need to look up keys] --> B{Exact key only?}
  B -- yes --> C["Hash set or hash map<br/>O(1) average"]
  B -- no --> D{Prefix, ordered or longest-prefix query?}
  D -- no --> C
  D -- yes --> E{Static and small?}
  E -- yes --> F[Sorted array plus bisect<br/>simple and compact]
  E -- no --> G{Read-heavy with a huge dictionary?}
  G -- yes --> H[Trie or radix trie<br/>cache top-K per node]
  G -- no --> I[Trie with counts<br/>or a database prefix index]`,
      },
      notes: [
        "Most production systems combine the boxes: a radix trie for hot prefixes, a key-value cache for precomputed top-K, and an offline job that rebuilds both from query logs.",
      ],
    },
  ],
  companies: [
    "**Search boxes and IDEs (illustrative):** Lucene-family suggesters use finite-state transducers, a compressed automaton closely related to a trie, to map prefixes to ranked completions. IDEs index symbols and file names the same way, which is why completion stays fast with millions of identifiers.",
    "**Network routing (illustrative):** routers must find the longest matching prefix of an IP address in a table of hundreds of thousands of CIDR routes. They use binary tries or Patricia (radix) tries so each lookup is a walk over address bits, not a linear scan of the table.",
    "**Spell checking and text processing (illustrative):** a dictionary trie plus a bounded edit-distance DFS suggests corrections without testing every word. Aho-Corasick, used in intrusion detection and log scanning, is a trie with failure links that finds many patterns in one pass.",
    "**Web frameworks and HTTP routers (illustrative):** many Go and Rust routers store URL path patterns in radix trees, so `/api/lessons/:id` and `/api/lessons/:id/progress` share a branch and matching is O(path length), not O(number of routes).",
    "**Storage engines (illustrative, and a useful contrast):** not every prefix feature needs a trie. LSM-tree engines such as RocksDB serve prefix scans from sorted SSTables and use prefix bloom filters to skip files, which is closer to the sorted-list column than to a dict-per-node trie.",
  ],
  mistakes: [
    { mistake: "Forgetting the is_end flag", why: "Assuming every node on a path is a word", wrong: "'doc' is reported as a word because 'docker' exists", fix: "Mark word ends explicitly and make search check the final node's flag" },
    { mistake: "Confusing search with startsWith", why: "Both walk the same path, so they look identical", wrong: "An autocomplete endpoint says a partial prefix is a real word, or a validator rejects a valid prefix", fix: "search returns node.is_end; startsWith returns node is not None; keep them separate in the API" },
    { mistake: "Building a trie when a sorted list would do", why: "Tries are the classic interview answer", wrong: "Extra memory and code for a static 10,000-word list that bisect already handles in microseconds", fix: "Start with sorted list + bisect; move to a trie when you need dynamic inserts, per-prefix data or ordered traversal under updates" },
    { mistake: "Case and Unicode inconsistencies", why: "Inserting 'Docker' and searching 'docker', or storing accented and unaccented forms separately", wrong: "Missing matches and duplicate suggestions", fix: "Normalise in one function used by insert and query: casefold, NFKD, strip combining marks" },
    { mistake: "Returning every completion", why: "Collecting the whole subtree is easy", wrong: "A one-letter prefix returns thousands of results and stalls both server and UI", fix: "Cap K and the prefix length; rank with a heap or precomputed top-K; require a minimum prefix length" },
    { mistake: "Recursive collection on pathological input", why: "Recursion is the natural DFS", wrong: "A stack overflow on a long key or a deep subtree in a language without tail calls", fix: "Use an explicit stack for collection; keep recursion only in the bounded wildcard matcher" },
    { mistake: "Assuming a trie is always faster than a hash set", why: "O(L) sounds better than hashing", wrong: "You trade a fast contiguous hash lookup for pointer chasing and much more memory, and exact lookups get slower", fix: "Benchmark the real query mix; use a trie only for prefix, ordered or per-prefix operations" },
    { mistake: "Unbounded wildcard patterns", why: "'*' is just a loop", wrong: "A pattern with many stars explodes exponentially and can be used to exhaust the server", fix: "Bound pattern length and star count, reject pathological patterns, and consider a compiled automaton for untrusted input" },
    { mistake: "Caching top-K but forgetting invalidation", why: "Per-node caches make queries O(L)", wrong: "A newly popular term never appears in suggestions, or an insert corrupts ancestor caches", fix: "Refresh ancestors on every insert/update, or rebuild and swap an immutable trie on a schedule" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Debounce autocomplete requests on the client (lesson 1.2.2) and cache popular prefixes; a trie makes each query cheap, but a thousand queries per keystroke still costs more than one." },
    { tag: "Performance", text: "Use __slots__ or compact arrays for large tries, and consider radix compression when most nodes have one child. Measure node count and memory, not just speed." },
    { tag: "Cost", text: "For static, small dictionaries start with a sorted list plus bisect. It is less code, far less memory and usually fast enough; move to a trie only for the operations it uniquely enables." },
    { tag: "Maintainability", text: "Normalise text in one shared function used by insert and query, and make ranking deterministic with an explicit tie-breaker such as (score, word)." },
    { tag: "Security", text: "Bound prefix length, result count and wildcard pattern complexity; never let an untrusted pattern drive unbounded recursion." },
  ],
  interview: [
    { q: "What is a trie, and what are its time and space complexities?", a: "A tree keyed by characters: each root-to-node path is a prefix, and a flag or payload on a node marks a complete key. Insert and exact search are O(L) for key length L, independent of the number N of keys, because you follow one child per character. Prefix existence is O(L); listing M completions is O(L + M); top-K is O(L + M log K) unless you cache answers per node. Space is O(total distinct prefixes), one node per prefix, which is the trade-off: a dict-per-node trie can use hundreds of bytes per word, so radix compression or a ternary search tree is used when memory matters. Emphasise that the flag is what separates a word from a prefix." },
    { q: "Trie versus hash set versus sorted list: how do you choose?", a: "Start from the query. Exact membership: a hash set gives O(L) average with one entry per key and excellent constants, so it usually wins. Prefix queries: a hash set must scan all N keys, a sorted array finds the range with binary search in O(log N + M), and a trie walks O(L) then lists O(M). Ordered traversal: the sorted array is already ordered, a trie's DFS with sorted children is ordered for free, a hash set needs a full sort. Updates: a trie inserts in O(L), a sorted array shifts O(N), a hash set is O(L). Ranking, counts and longest-prefix matching are natural on a trie and awkward on the other two. In practice, static small data goes to a sorted array, exact-only data to a hash set, and dynamic prefix-heavy data to a trie or radix tree. Benchmarks matter because CPython's contiguous list scan can beat a Python trie at collecting matches even though the trie has the better asymptote." },
    { q: "Design autocomplete for millions of queries per day.", a: "Separate the read path from the write path. Offline, aggregate query logs into (query, count) pairs, build a trie or radix tree over them, and precompute the top K completions at every prefix node; publish an immutable snapshot. Online, serve from that snapshot in memory: a query is O(L) to reach the prefix node plus a small top-K read, with no DFS and no ranking at request time. Put a cache or CDN in front of popular prefixes, and debounce on the client (about 150 to 250 ms) so typing sends one or two requests, not one per key. Validate and cap the query length and K. Refresh on a schedule and swap snapshots atomically; if freshness matters, maintain a small recent-queries layer merged at query time. Add personalisation and filtering as later layers, and shard by prefix or hash if the snapshot no longer fits one machine. Measure p95 and p99, not the average, and track cache hit rate and index size." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "How long does it take to check whether a word of length L exists in a trie of N words?",
      options: ["O(N)", "O(L)", "O(N·L)", "O(log N)"],
      answer: 1,
      explanation: "You walk one node per character. The number of stored words does not enter the walk.",
    },
    {
      kind: "bug",
      prompt: "`search('doc')` returns True although only 'docker' was inserted. Why?",
      code: { lang: "python", code: "def search(self, word):\n    return self._walk(word) is not None" },
      options: ["_walk is wrong", "It checks only that the path exists, not that a word ends there", "Tries cannot store 'doc'", "Case sensitivity"],
      answer: 1,
      explanation: "The node for 'doc' exists as an intermediate prefix. Check the terminal flag on the final node.",
    },
    {
      kind: "mcq",
      prompt: "You have a fixed list of 10,000 product names and need prefix search. Simplest good solution?",
      options: ["A trie with cached top-K", "A sorted list + bisect", "A full table scan per keystroke", "A graph database"],
      answer: 1,
      explanation: "Static data: sort once, binary search the start, scan forward. Simple, compact and fast; move to a trie only if ranking or updates demand it.",
    },
  ],
  cheatSheet: [
    "Trie node: children map + is_end flag or payload. The root is the empty prefix.",
    "search checks the final flag; startsWith only checks that the path exists.",
    "Insert / exact search O(L); prefix listing O(L + M); top-K O(L + M log K) or O(L) with cached answers.",
    "Ordered traversal is free if children are visited in sorted order; no separate sort.",
    "Top-K with counts: frequency at terminal nodes, size-K min-heap during DFS, deterministic tie-break.",
    "Memory is the tax: one node per distinct prefix. Compress unary chains into radix edges; measure with tracemalloc.",
    "Wildcard: '.' one character, '*' zero or more; recurse only into viable children; bound pattern complexity.",
    "Longest prefix match: walk while children exist and remember the last is_end node; routers use compressed tries.",
    "Decide from the query: exact → hash; static small prefix → sorted list; dynamic prefix, ranking or longest-prefix → trie.",
  ],
  homework: {
    basic: {
      title: "Delete from a trie",
      brief: ["Add `delete(word)` that removes a word and prunes nodes that no longer lead to any word, without breaking other words sharing the prefix. Keep `passes` correct so prefix counts still work."],
      criteria: ["Other words still found", "Unused nodes removed", "Deleting a missing word is a no-op", "count_prefix still correct after deletion"],
      hints: ["Walk down recording the path, unset the terminal flag, then walk back up removing childless non-terminal nodes.", "Decrement passes for every node on the path, including the root."],
      solution: {
        text: ["Record every node on the path, clear the terminal score, decrement passes bottom-up, then prune nodes that have no children and are not word ends."],
        code: {
          lang: "python",
          code: `def delete(self, word: str) -> None:
    word = word.lower()
    path = [(None, self.root)]
    node = self.root
    for ch in word:
        node = node.children.get(ch)
        if node is None:
            return                          # not present
        path.append((ch, node))
    if node.score is None:
        return                              # path exists, word does not
    node.score = None
    for _, n in reversed(path):
        n.passes -= 1
    for i in range(len(path) - 1, 0, -1):    # prune upwards
        ch, n = path[i]
        if n.children or n.score is not None:
            break
        del path[i - 1][1].children[ch]
Trie.delete = delete
t2 = Trie()
t2.insert("dock")
t2.insert("docker")
t2.delete("docker")
assert t2.search("dock") and not t2.search("docker")
assert t2.count_prefix("dock") == 1
assert t2.count_prefix("do") == 1`,
        },
        pitfalls: ["Pruning a node that still ends another word", "Forgetting to decrement passes, leaving prefix counts too high", "Deleting a prefix such as 'do' while longer words still need its node"],
      },
    },
    intermediate: {
      title: "Longest common prefix",
      brief: ["Given a list of strings, return their longest common prefix, first with a trie and then without one. Compare the two approaches and state the complexity of each."],
      criteria: ["Both versions correct", "Handles an empty list and an empty string in the list", "Complexity stated for each"],
      hints: ["Without a trie: compare the lexicographically smallest and largest strings.", "With a trie: insert all words and follow the single-child chain from the root while it is not a word end."],
      solution: {
        text: [
          "The min/max trick works because the common prefix of the lexicographically smallest and largest strings is common to everything between them. It is O(N·L) worst case and needs no extra structure.",
          "A trie version inserts all words (O(total characters)) and then walks from the root while there is exactly one child and no word ends; the walk stops at the first branch. Both answers must agree, including for an empty list and for a list containing an empty string.",
        ],
        code: {
          lang: "python",
          code: `def lcp(words: list[str]) -> str:
    if not words:
        return ""
    lo, hi = min(words), max(words)
    i = 0
    while i < len(lo) and lo[i] == hi[i]:
        i += 1
    return lo[:i]
assert lcp(["docker", "dock", "docs"]) == "doc"
assert lcp(["a", ""]) == ""
assert lcp([]) == ""
assert lcp(["same"]) == "same"`,
        },
        pitfalls: ["Reading past the end of the shorter string", "Forgetting that the empty string in the list forces an empty answer"],
      },
    },
    challenge: {
      title: "Word search on a board",
      brief: ["Given a letter grid and a list of words, return all words that can be formed by adjacent letters (no reuse in one word). Use a trie to prune paths that cannot form any word."],
      criteria: ["Trie-based pruning", "Each cell used once per word", "Faster than searching each word separately for many words", "Handles an empty word list"],
      hints: ["DFS from every cell, following trie children; mark a cell visited during the current path and unmark on backtrack.", "Store the original word at the terminal node so you do not rebuild it."],
      solution: {
        text: ["The trie lets one DFS search for all words simultaneously and stop as soon as no word has the current prefix. Without it, each word would need its own board search."],
        code: {
          lang: "python",
          code: `def find_words(board: list[str], words: list[str]) -> list[str]:
    root: dict = {}
    for w in words:
        node = root
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    rows, cols, found = len(board), len(board[0]), set()
    def dfs(r: int, c: int, node: dict, used: set) -> None:
        ch = board[r][c]
        nxt = node.get(ch)
        if nxt is None:
            return
        if "$" in nxt:
            found.add(nxt["$"])
        used.add((r, c))
        for nr, nc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in used:
                dfs(nr, nc, nxt, used)
        used.remove((r, c))
    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root, set())
    return sorted(found)
assert find_words(["oaan", "etae", "ihkr", "iflv"], ["oath", "pea", "eat", "rain"]) == ["eat", "oath"]`,
        },
        pitfalls: ["Forgetting to unmark visited cells on backtrack", "Using a trie node's depth instead of the stored word at the terminal", "Letting the same word be added many times"],
      },
    },
    capstone: {
      title: "DevAtlas: autocomplete endpoint",
      brief: ["Build a trie over lesson titles and glossary terms (scored by popularity or lesson order) in the AI service and expose `GET /suggest?q=` returning the top 5. Debounce calls from the frontend search box."],
      criteria: ["Normalised, case-insensitive matching", "Top 5 ranked results", "p95 latency measured with a quick load test", "Query length and result count bounded"],
      hints: ["Build the trie once at startup; rebuild on content changes.", "Index every word start so a mid-title word matches the title."],
      solution: {
        text: [
          "`SuggestTrie` is the lesson's trie with two changes for real titles: it indexes every word start (so 'binary' finds 'Recursion, sorting and binary search'), and it stores the display item at the end node because the key itself is normalised. `normalise` is shared by insert and query: NFKD plus dropping combining marks removes accents, casefold handles case, and punctuation and repeated whitespace collapse to single spaces.",
          "A lookup walks the prefix in O(P), collects the items below it with an iterative DFS, removes items that matched at several word starts, and keeps the top 5 by score with heapq.nsmallest on (-score, text): O(M log 5) for M matches. The trie is built once in the FastAPI lifespan; content changes ship with a deploy, which rebuilds it.",
          "`Query(min_length=1, max_length=64)` returns 422 for missing, empty or huge queries, which bounds the work per request. On the frontend, wrap the fetch in the debounce from lesson 1.2.2 (about 150 to 250 ms) so typing a word sends one or two requests instead of one per key.",
          "`python -m devatlas_ai.api` runs a quick in-process load test with TestClient (2,000 requests). It measures the app and routing, not the network; for a realistic p95, run `uvicorn devatlas_ai.api:app` and point a load tool such as hey or k6 at it. `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/suggest.py", code: `"""Autocomplete over lesson titles and glossary terms, backed by the lesson's trie."""
import heapq, re, unicodedata
from dataclasses import dataclass
@dataclass(frozen=True)
class Suggestion:
    text: str            # display form, original casing
    kind: str            # "lesson" or "term"
    score: int           # popularity (higher is better)
def normalise(text: str) -> str:
    """One function for insert and query: strip accents, casefold, keep letters/digits/spaces."""
    decomposed = unicodedata.normalize("NFKD", text)
    no_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return " ".join(re.sub(r"[^\\w]+", " ", no_marks.casefold()).split())
class TrieNode:
    __slots__ = ("children", "items")
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.items: list[Suggestion] = []          # non-empty = some key ends here
class SuggestTrie:
    def __init__(self) -> None:
        self.root = TrieNode()
    def insert(self, item: Suggestion) -> None:
        """Index every word start, so 'binary' finds 'Recursion, sorting and binary search'.
        O(W * L) for W words of a title of length L; memory is one node per distinct prefix.
        """
        words = normalise(item.text).split()
        for i in range(len(words)):
            node = self.root
            for ch in " ".join(words[i:]):
                node = node.children.setdefault(ch, TrieNode())
            node.items.append(item)
    def suggest(self, query: str, k: int = 5) -> list[Suggestion]:
        """O(P) to walk the prefix + O(M log k) over the M completions below it."""
        node = self.root
        for ch in normalise(query):
            child = node.children.get(ch)
            if child is None:
                return []
            node = child
        if node is self.root:
            return []                                 # empty query after normalising
        best: dict[Suggestion, None] = {}             # an item can match at several word starts
        stack = [node]
        while stack:                                  # iterative DFS: no recursion limit
            n = stack.pop()
            best.update(dict.fromkeys(n.items))
            stack.extend(n.children.values())
        return heapq.nsmallest(k, best, key=lambda s: (-s.score, s.text.casefold()))
# ---- services/ai/devatlas_ai/api.py ----
from collections.abc import AsyncIterator, Iterable
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from pydantic import BaseModel
from devatlas_ai.suggest import Suggestion, SuggestTrie
class SuggestionOut(BaseModel):
    text: str
    kind: str
def create_app(content: Iterable[Suggestion]) -> FastAPI:
    trie = SuggestTrie()
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        for item in content:                          # built once at startup; rebuild on deploy
            trie.insert(item)
        yield
    app = FastAPI(lifespan=lifespan)
    @app.get("/suggest", response_model=list[SuggestionOut])
    def suggest(q: str = Query(min_length=1, max_length=64)) -> list[Suggestion]:
        return trie.suggest(q, k=5)                   # capped: bounded work per request
    return app
# In the service this comes from the content files; scores are lesson views / glossary lookups.
LESSONS = [("Big-O and hash maps", 950), ("Two pointers and sliding window", 720),
           ("Recursion, sorting and binary search", 640), ("Trees, BSTs and heaps", 610),
           ("Graphs: BFS, DFS, Dijkstra, union-find", 580), ("Tries", 300)]
TERMS = [("Binary search", 500), ("Hash map", 480), ("Heap", 450), ("Dijkstra's algorithm", 260),
         ("Hash function", 200), ("Hashable", 90), ("Hashing", 80), ("Déjà vu bug", 10)]
CONTENT = ([Suggestion(t, "lesson", s) for t, s in LESSONS]
           + [Suggestion(t, "term", s) for t, s in TERMS])
app = create_app(CONTENT)                             # uvicorn devatlas_ai.api:app
if __name__ == "__main__":
    import random, statistics, time
    from fastapi.testclient import TestClient
    with TestClient(app) as client:
        print([s["text"] for s in client.get("/suggest", params={"q": "has"}).json()])
        print([s["text"] for s in client.get("/suggest", params={"q": "  BINARY se"}).json()])
        rng, latencies = random.Random(0), []
        for _ in range(2000):                          # quick in-process load test
            q = rng.choice(["h", "ha", "bin", "tr", "dij", "gra", "zz", "deja"])
            t = time.perf_counter()
            assert client.get("/suggest", params={"q": q}).status_code == 200
            latencies.append((time.perf_counter() - t) * 1000)
        p95 = statistics.quantiles(latencies, n=100)[94]
        print(f"p95 over 2000 requests: {p95:.1f} ms")
# ---- services/ai/tests/test_suggest.py ----
import pytest
from fastapi.testclient import TestClient
from devatlas_ai.api import CONTENT, create_app
from devatlas_ai.suggest import Suggestion, SuggestTrie, normalise
@pytest.fixture
def client():
    with TestClient(create_app(CONTENT)) as c:
        yield c
def texts(client, q):
    resp = client.get("/suggest", params={"q": q})
    assert resp.status_code == 200
    return [s["text"] for s in resp.json()]
def test_ranking_and_normalisation(client):
    assert texts(client, "h") == ["Big-O and hash maps", "Trees, BSTs and heaps", "Hash map", "Heap", "Hash function"]
    assert texts(client, "DEJA") == ["Déjà vu bug"]
    assert texts(client, "  binary   SE") == ["Recursion, sorting and binary search", "Binary search"]
    assert texts(client, "s").count("Recursion, sorting and binary search") == 1
def test_validation_and_unit(client):
    assert texts(client, "zzz") == []
    assert texts(client, "!!!") == []      # empty after normalising
    assert client.get("/suggest", params={"q": ""}).status_code == 422
    assert client.get("/suggest", params={"q": "x" * 65}).status_code == 422
    assert client.get("/suggest").status_code == 422
    t = SuggestTrie()
    t.insert(Suggestion("Docker", "term", 90)); t.insert(Suggestion("docs", "term", 40))
    assert [s.text for s in t.suggest("DOC", k=1)] == ["Docker"]
    assert normalise("Crème  Brûlée!") == "creme brulee"` },
        output: "['Big-O and hash maps', 'Hash map', 'Hash function', 'Hashable', 'Hashing']\n['Recursion, sorting and binary search', 'Binary search']\np95 over 2000 requests: ~1-5 ms (varies by machine)",
        pitfalls: [
          "Normalising the inserted titles but not the query (or the reverse): 'Déjà' then never matches 'deja'.",
          "Returning every completion for a one-letter prefix: cap k and the query length.",
          "Building the trie inside the request handler: an O(P) lookup becomes O(all content) on every keystroke.",
          "Using only whole-title prefixes: 'binary' would never find 'Recursion, sorting and binary search'.",
        ],
      },
    },
  },
  deeper: [
    { label: "Wikipedia: Trie", url: "https://en.wikipedia.org/wiki/Trie" },
    { label: "Wikipedia: Radix tree", url: "https://en.wikipedia.org/wiki/Radix_tree" },
    { label: "Wikipedia: Ternary search tree", url: "https://en.wikipedia.org/wiki/Ternary_search_tree" },
    { label: "Wikipedia: Longest prefix match", url: "https://en.wikipedia.org/wiki/Longest_prefix_match" },
    { label: "USFCA: interactive trie visualization", url: "https://www.cs.usfca.edu/~galles/visualization/Trie.html" },
    { label: "LeetCode: Trie problems", url: "https://leetcode.com/tag/trie/" },
  ],
  nextPreview: "Next: greedy algorithms and backtracking: when the locally best choice is globally best, and how to search huge spaces with pruning.",
};
