import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.3.3",
  title: "Tries",
  minutes: 50,
  level: "Intermediate",
  prerequisites: ["2.3.1 Trees, BSTs and heaps"],
  summary: "Build a trie (prefix tree) for autocomplete and prefix search, rank suggestions, and know when a trie beats a hash map, a sorted list or a database index.",
  terms: [
    { term: "Trie", def: "A tree where each edge is a character and each path from the root spells a prefix. Pronounced 'try', from retrieval." },
    { term: "Prefix", def: "The start of a word: 'doc' is a prefix of 'docker' and 'docs'." },
    { term: "Terminal flag", def: "A marker on a node meaning a complete word ends there ('do' may be a word and also a prefix of 'docker')." },
    { term: "Autocomplete", def: "Suggesting completions for what a user has typed so far." },
    { term: "Radix tree", def: "A compressed trie where chains of single-child nodes are merged into one edge, saving memory." },
  ],
  problem: [
    "The DevAtlas search box should suggest lessons and glossary terms as the learner types: 'ku' → 'kubernetes', 'kubectl'. Scanning 5,000 terms on every keystroke works today but becomes sluggish with tens of thousands of terms and many users.",
    "A trie answers 'all words starting with this prefix' in time proportional to the prefix length plus the number of results, independent of the dictionary size. Routers use the same idea to match URL paths and IP prefixes.",
  ],
  concept: {
    analogy: [
      "A trie is a **phone keypad menu**: press D, then O, then C, and at each step the set of possible endings shrinks. Words that share a beginning share the same path, so 'docker', 'docs' and 'dock' are stored as one 'doc' branch with three small endings.",
    ],
    precise: [
      "Each node holds a map from character to child, plus a flag (or payload) marking the end of a word. Insert and exact lookup are O(L) for a word of length L. Prefix search walks L steps to the prefix node, then collects words below it.",
      "For ranked autocomplete, store a score (popularity, recency) on terminal nodes and return the top K under the prefix, or cache the top K at each node for O(L) queries at the cost of more memory and slower updates.",
      "Alternatives: a **sorted list + binary search** (bisect for the first word ≥ prefix, then scan) is simple and memory-efficient for static data; **database indexes** handle `LIKE 'doc%'` prefix queries with a B-tree; search engines (Elasticsearch/OpenSearch) offer completion suggesters. A trie is the right tool for in-memory, frequently queried prefix data.",
    ],
  },
  underTheHood: {
    text: [
      "Memory is the trie's cost: one node per distinct prefix, each with a small dictionary. Radix trees compress single-child chains ('k-u-b-e-r-n-e-t-e-s' becomes one edge) and are what HTTP routers and IP routing tables actually use.",
      "Prefix collection is a DFS from the prefix node. With a top-K heap during the DFS, ranking costs O(M log K) for M words under the prefix.",
    ],
    diagram: {
      title: "Trie for: do, dock, docker, docs",
      nodes: [
        { label: "root", sub: "" },
        { label: "d", sub: "" },
        { label: "o ✓", sub: "'do' ends here" },
        { label: "c", sub: "" },
        { label: "k ✓ / s ✓", sub: "dock, docs" },
        { label: "e → r ✓", sub: "docker" },
      ],
      edges: ["", "", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "A trie with ranked autocomplete",
      code: {
        lang: "python",
        file: "trie.py",
        code: `import heapq

class TrieNode:
    __slots__ = ("children", "score")
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.score: int | None = None          # not None = a complete word ends here

class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str, score: int = 0) -> None:
        node = self.root
        for ch in word.lower():
            node = node.children.setdefault(ch, TrieNode())
        node.score = score

    def contains(self, word: str) -> bool:
        node = self._find(word.lower())
        return node is not None and node.score is not None

    def suggest(self, prefix: str, k: int = 5) -> list[str]:
        start = self._find(prefix.lower())
        if start is None:
            return []
        best: list[tuple[int, str]] = []          # min-heap of (score, word), size <= k
        stack = [(start, prefix.lower())]
        while stack:
            node, word = stack.pop()
            if node.score is not None:
                if len(best) < k:
                    heapq.heappush(best, (node.score, word))
                elif node.score > best[0][0]:
                    heapq.heapreplace(best, (node.score, word))
            for ch, child in node.children.items():
                stack.append((child, word + ch))
        return [w for _, w in sorted(best, key=lambda x: (-x[0], x[1]))]

    def _find(self, prefix: str) -> TrieNode | None:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

t = Trie()
for term, popularity in [("docker", 90), ("docs", 40), ("dock", 10), ("do", 5),
                         ("kubernetes", 95), ("kubectl", 70), ("kafka", 60)]:
    t.insert(term, popularity)

print(t.suggest("doc"))
print(t.suggest("k", k=2))
print(t.contains("dock"), t.contains("doc"))`,
      },
      output: "['docker', 'docs', 'dock']\n['kubernetes', 'kubectl']\nTrue False",
    },
    {
      title: "Same results with a sorted list + bisect",
      code: {
        lang: "python",
        code: `import bisect

words = sorted(["docker", "docs", "dock", "do", "kubernetes", "kubectl", "kafka"])

def with_prefix(prefix: str) -> list[str]:
    i = bisect.bisect_left(words, prefix)
    out = []
    while i < len(words) and words[i].startswith(prefix):
        out.append(words[i]); i += 1
    return out

print(with_prefix("doc"))`,
      },
      output: "['dock', 'docker', 'docs']",
      notes: ["For a static list this is simpler and uses less memory. Tries win when you insert often, need per-prefix data (counts, cached top K), or match many prefixes at once."],
    },
    {
      title: "Count words by prefix (store counts on nodes)",
      code: {
        lang: "python",
        code: `class CountingTrie:
    def __init__(self) -> None:
        self.root: dict = {"#": 0}            # '#' = number of words passing through

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {"#": 0})
            node["#"] += 1

    def count_prefix(self, prefix: str) -> int:
        node = self.root
        for ch in prefix:
            if ch not in node:
                return 0
            node = node[ch]
        return node["#"]

ct = CountingTrie()
for q in ["docker run", "docker build", "docker compose", "dotnet build", "git push"]:
    ct.insert(q)
print(ct.count_prefix("docker"), ct.count_prefix("do"), ct.count_prefix("k"))`,
      },
      output: "3 4 0",
    },
  ],
  companies: [
    "**Search boxes and IDEs** use prefix structures (tries, radix trees, finite-state transducers in Lucene-based search engines) for instant suggestions over large vocabularies.",
    "**Routing**: HTTP routers (many Go and Rust web frameworks) match URL paths with radix trees; network routers match IP addresses to the longest prefix in routing tables.",
    "**Spell checking and word games** use tries with DFS and pruning to find valid words quickly.",
  ],
  mistakes: [
    { mistake: "Forgetting the terminal flag", why: "Assuming every node is a word", wrong: "'doc' reported as a word because 'docker' exists", fix: "Mark word ends explicitly" },
    { mistake: "Building a trie when a sorted list would do", why: "Tries are a classic answer", wrong: "Extra memory and code for no benefit on static data", fix: "Start with sorted list + bisect; switch when requirements need it" },
    { mistake: "Case and Unicode inconsistencies", why: "Inserting 'Docker' and searching 'docker'", wrong: "Missing matches", fix: "Normalise on insert and query (lower(), NFC normalisation)" },
    { mistake: "Returning every completion", why: "Easy to collect all", wrong: "A one-letter prefix returns thousands of results; slow UI", fix: "Limit to top K with a heap; require a minimum prefix length" },
    { mistake: "Recursive collection on very long words", why: "Natural DFS", wrong: "Deep recursion on pathological input", fix: "Iterative DFS with a stack" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Debounce autocomplete requests on the client (lesson 1.2.2) and cache popular prefixes." },
    { tag: "Performance", text: "Use __slots__ or compact representations for large tries; consider radix compression." },
    { tag: "Maintainability", text: "Normalise text in one function used by both insert and search." },
    { tag: "Reliability", text: "Cap result counts and prefix lengths to bound work per request." },
  ],
  interview: [
    { q: "What is a trie and what are its complexities?", a: "A tree keyed by characters where each root-to-node path is a prefix. Insert and search are O(L) for word length L, independent of how many words are stored. Prefix enumeration is O(L + number of results). The trade-off is memory: one node per distinct prefix." },
    { q: "Trie vs hash set for word lookup?", a: "A hash set gives O(L) average exact lookup (hashing the word) with less memory, but cannot answer prefix queries efficiently. A trie supports prefix search, autocomplete and longest-prefix matching." },
    { q: "How would you design autocomplete for millions of queries per day?", a: "Precompute top-K suggestions per prefix from query logs (offline job), store them in a key-value store or in-memory trie with cached top-K per node, serve via a low-latency service with client-side debouncing and caching, and refresh periodically. Add personalisation and filtering as separate layers." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Time to check whether a word of length L exists in a trie of N words?",
      options: ["O(N)", "O(L)", "O(N·L)", "O(log N)"],
      answer: 1,
      explanation: "You walk one node per character.",
    },
    {
      kind: "bug",
      prompt: "contains('doc') returns True although only 'docker' was inserted. Why?",
      code: { lang: "python", code: "def contains(self, word):\n    return self._find(word) is not None" },
      options: ["_find is wrong", "It checks only that the path exists, not that a word ends there", "Tries cannot store 'doc'", "Case sensitivity"],
      answer: 1,
      explanation: "Check the terminal flag on the final node.",
    },
    {
      kind: "mcq",
      prompt: "You have a fixed list of 10,000 product names and need prefix search. Simplest good solution?",
      options: ["A trie with cached top-K", "A sorted list + bisect", "A full table scan per keystroke", "A graph database"],
      answer: 1,
      explanation: "Static data: sort once, binary search the start, scan forward. Simple and fast.",
    },
  ],
  cheatSheet: [
    "Trie node: children map + end-of-word flag/score.",
    "Insert / lookup O(L); prefix results O(L + results).",
    "Autocomplete: DFS below prefix + top-K heap.",
    "Static data: sorted list + bisect is often enough.",
    "Normalise case/Unicode on insert and query.",
    "Radix tree = compressed trie (routers).",
  ],
  homework: {
    basic: {
      title: "Delete from a trie",
      brief: ["Add `delete(word)` that removes a word and prunes nodes that no longer lead to any word, without breaking other words sharing the prefix."],
      criteria: ["Other words still found", "Unused nodes removed", "Deleting a missing word is a no-op"],
      hints: ["Walk down recording the path, unset the terminal flag, then walk back up removing childless non-terminal nodes."],
      solution: {
        text: ["Prune bottom-up: a node can be removed only if it has no children and is not itself a word end."],
        code: {
          lang: "python",
          code: `def delete(self, word: str) -> None:
    path = [(None, self.root)]
    node = self.root
    for ch in word.lower():
        node = node.children.get(ch)
        if node is None:
            return                          # not present
        path.append((ch, node))
    if node.score is None:
        return
    node.score = None
    for i in range(len(path) - 1, 0, -1):    # prune upwards
        ch, n = path[i]
        if n.children or n.score is not None:
            break
        del path[i - 1][1].children[ch]

Trie.delete = delete
t2 = Trie(); t2.insert("dock"); t2.insert("docker")
t2.delete("docker")
assert t2.contains("dock") and not t2.contains("docker")`,
        },
      },
    },
    intermediate: {
      title: "Longest common prefix",
      brief: ["Given a list of strings, return their longest common prefix, first with a trie and then without one. Compare the two."],
      criteria: ["Both versions correct", "Handles empty list and an empty string in the list"],
      hints: ["Without a trie: compare the min and max strings in sorted order."],
      solution: {
        text: ["The min/max trick works because the common prefix of the lexicographically smallest and largest strings is common to everything between them."],
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
assert lcp([]) == ""`,
        },
      },
    },
    challenge: {
      title: "Word search on a board",
      brief: ["Given a letter grid and a list of words, return all words that can be formed by adjacent letters (no reuse in one word). Use a trie to prune paths that cannot form any word."],
      criteria: ["Trie-based pruning", "Each cell used once per word", "Faster than searching each word separately for many words"],
      hints: ["DFS from every cell, following trie children; mark a cell visited during the current path and unmark on backtrack."],
      solution: {
        text: ["The trie lets one DFS search for all words simultaneously and stop as soon as no word has the current prefix."],
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
      },
    },
    capstone: {
      title: "DevAtlas: autocomplete endpoint",
      brief: ["Build a trie over lesson titles and glossary terms (scored by popularity or lesson order) in the AI service and expose `GET /suggest?q=` returning the top 5. Debounce calls from the frontend search box."],
      criteria: ["Normalised, case-insensitive matching", "Top 5 ranked results", "p95 latency measured with a quick load test"],
      hints: ["Build the trie once at startup; rebuild on content changes."],
      solution: {
        text: ["Load content at startup, insert normalised titles and terms with scores, and keep the trie in memory; with debouncing on the client, request volume stays small."],
      },
    },
  },
  deeper: [
    { label: "Wikipedia: Trie", url: "https://en.wikipedia.org/wiki/Trie" },
    { label: "Wikipedia: Radix tree", url: "https://en.wikipedia.org/wiki/Radix_tree" },
    { label: "LeetCode: Trie problems", url: "https://leetcode.com/tag/trie/" },
  ],
  nextPreview: "Next: greedy algorithms and backtracking: when the locally best choice is globally best, and how to search huge spaces with pruning.",
};
