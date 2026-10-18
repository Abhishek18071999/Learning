import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.4.2",
  title: "Dynamic programming",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["2.4.1 Greedy and backtracking"],
  summary: "Learn a repeatable method for dynamic programming: define the state, the transition and the base cases, then implement top-down with memoisation or bottom-up with a table.",
  terms: [
    { term: "Dynamic programming (DP)", def: "Solving a problem by combining solutions to overlapping subproblems, computing each subproblem once and storing it." },
    { term: "Overlapping subproblems", def: "The same smaller problem appears many times in a naive recursion (e.g. fib(30) computes fib(10) tens of thousands of times)." },
    { term: "Optimal substructure", def: "An optimal solution is built from optimal solutions to subproblems." },
    { term: "State", def: "The minimal information that identifies a subproblem, e.g. (index, remaining capacity)." },
    { term: "Transition", def: "The formula that computes a state from smaller states, e.g. dp[i] = dp[i-1] + dp[i-2]." },
    { term: "Memoisation (top-down)", def: "Recursion plus a cache of results." },
    { term: "Tabulation (bottom-up)", def: "Filling a table iteratively from base cases upward." },
  ],
  problem: [
    "DevAtlas wants to suggest the most valuable set of lessons a learner can complete in the 10 hours they have this week, where each lesson has a time cost and a value for the learner's goal. Trying all subsets of 70 lessons is 2⁷⁰ combinations: impossible.",
    "Another feature compares a learner's code answer with the model solution and highlights the minimal edits, like a diff tool. Both are classic DP problems (0/1 knapsack and edit distance) that run in milliseconds with the right table.",
  ],
  concept: {
    analogy: [
      "DP is **writing answers on sticky notes** while doing homework. When a later question needs a result you already computed, you read the note instead of recomputing it. The art is deciding what to write on each note (the state) and how notes combine (the transition).",
    ],
    precise: [
      "**The method**: (1) define what dp[state] means in words; (2) write the transition by considering the last decision; (3) set base cases; (4) choose an order so dependencies are computed first; (5) read the answer; (6) optimise memory if only recent rows are needed.",
      "**Recognition signals**: 'count the number of ways', 'minimum/maximum cost', 'is it possible', choices at each step whose effects are captured by a small state, and a brute-force recursion that repeats subproblems.",
      "**Common shapes**: 1D (climbing stairs, house robber, coin change), 2D over two sequences (edit distance, longest common subsequence), knapsack (items × capacity), intervals, and DP over grids.",
      "Complexity is roughly (number of states) × (work per transition). Knapsack: n items × capacity W states, O(1) each → O(n·W).",
    ],
  },
  underTheHood: {
    text: [
      "Naive recursive Fibonacci makes about φⁿ calls (exponential). With memoisation each fib(k) is computed once: n calls. That is the whole idea: the recursion tree collapses into a graph of distinct states.",
      "Top-down is easier to write (just add @functools.cache to the recursive function) and only visits reachable states; bottom-up avoids recursion limits and allows memory optimisation (keep only the previous row).",
      "To reconstruct the actual solution (which lessons, which edits), keep the table (or store the choice made at each state) and walk back from the final state.",
    ],
    diagram: {
      title: "The DP method",
      nodes: [
        { label: "State", sub: "dp[i][w] means…" },
        { label: "Transition", sub: "last decision" },
        { label: "Base cases", sub: "dp[0][*] = 0" },
        { label: "Order", sub: "small → large" },
        { label: "Answer", sub: "dp[n][W]" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "From exponential to linear: memoisation",
      code: {
        lang: "python",
        file: "fib.py",
        code: `import time
from functools import cache

def fib_naive(n: int) -> int:
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

@cache
def fib_memo(n: int) -> int:
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

def fib_table(n: int) -> int:
    a, b = 0, 1                       # only the last two states are needed
    for _ in range(n):
        a, b = b, a + b
    return a

for fn in (fib_naive, fib_memo, fib_table):
    t = time.perf_counter()
    result = fn(30)
    print(f"{fn.__name__:10} {result}  {time.perf_counter() - t:.4f}s")`,
      },
      output: "fib_naive  832040  ~0.1s (varies by machine)\nfib_memo   832040  0.0000s\nfib_table  832040  0.0000s",
    },
    {
      title: "Coin change (where greedy failed)",
      code: {
        lang: "python",
        code: `def min_coins(amount: int, coins: list[int]) -> int:
    """dp[a] = fewest coins to make amount a (inf if impossible)."""
    INF = float("inf")
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1          # last coin used is c
    return -1 if dp[amount] == INF else dp[amount]

print(min_coins(6, [1, 3, 4]), min_coins(11, [2, 5]), min_coins(3, [2]))`,
      },
      output: "2 4 -1",
    },
    {
      title: "0/1 knapsack: best lessons for the time you have",
      code: {
        lang: "python",
        file: "knapsack.py",
        code: `def best_plan(lessons: list[tuple[str, int, int]], budget: int) -> tuple[int, list[str]]:
    """lessons: (name, minutes, value). dp[i][w] = best value using first i lessons within w minutes."""
    n = len(lessons)
    dp = [[0] * (budget + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        name, cost, value = lessons[i - 1]
        for w in range(budget + 1):
            dp[i][w] = dp[i - 1][w]                                  # skip lesson i
            if cost <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - cost] + value)  # take lesson i
    # reconstruct: walk back and see which choice produced each value
    chosen, w = [], budget
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            name, cost, _ = lessons[i - 1]
            chosen.append(name)
            w -= cost
    return dp[n][budget], chosen[::-1]

catalog = [("SQL indexes", 75, 9), ("Docker", 75, 8), ("RAG", 90, 10),
           ("Git PRs", 50, 4), ("Tries", 50, 3), ("HTTP", 60, 6)]
print(best_plan(catalog, 240))`,
      },
      output: "(27, ['SQL indexes', 'Docker', 'RAG'])",
      notes: ["Greedy by value per minute would pick HTTP (0.1/min) and SQL (0.12/min) first and can miss the best combination. DP considers every capacity for every lesson: O(n × budget)."],
    },
    {
      title: "Edit distance: how different is the learner's answer?",
      code: {
        lang: "python",
        file: "edit_distance.py",
        code: `def edit_distance(a: str, b: str) -> int:
    """Minimum inserts, deletes and substitutions to turn a into b (Levenshtein)."""
    prev = list(range(len(b) + 1))               # row for a[:0]
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]             # characters match: no cost
            else:
                cur[j] = 1 + min(prev[j],        # delete from a
                                 cur[j - 1],     # insert into a
                                 prev[j - 1])    # substitute
        prev = cur
    return prev[-1]

print(edit_distance("kitten", "sitting"))
print(edit_distance("git comit -m", "git commit -m"))`,
      },
      output: "3\n1",
      notes: ["Only the previous row is kept: O(len(a) × len(b)) time, O(len(b)) memory. Tools like diff use a related DP (longest common subsequence) plus clever optimisations."],
    },
    {
      title: "Counting ways on a grid",
      code: {
        lang: "python",
        code: `def paths(grid: list[str]) -> int:
    """Ways to go from top-left to bottom-right moving right/down; '#' blocks."""
    rows, cols = len(grid), len(grid[0])
    dp = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "#":
                continue
            if r == 0 and c == 0:
                dp[r][c] = 1
            else:
                dp[r][c] = (dp[r - 1][c] if r else 0) + (dp[r][c - 1] if c else 0)
    return dp[-1][-1]

print(paths(["...", ".#.", "..."]))`,
      },
      output: "2",
    },
  ],
  companies: [
    "**Diff and version control**: git diff and code review tools use longest-common-subsequence style DP (Myers' algorithm) to show minimal changes.",
    "**Spell check, fuzzy search and record matching**: edit distance ranks 'did you mean' suggestions and matches customer records with typos. Bioinformatics aligns DNA sequences with the same family of algorithms.",
    "**Pricing and planning**: resource allocation, ad budgeting and inventory problems are often knapsack variants; at scale they are solved with DP, integer programming solvers or approximations.",
  ],
  mistakes: [
    { mistake: "Starting with code instead of the state definition", why: "Jumping into loops", wrong: "Confusing tables and wrong transitions", fix: "Write 'dp[i][w] = best value using first i items within w' in a comment first" },
    { mistake: "Wrong iteration order", why: "Not checking dependencies", wrong: "Reading states that are not computed yet", fix: "Ensure every dp[x] you read is filled before dp[current]" },
    { mistake: "Reusing items in 0/1 knapsack with a 1D array", why: "Iterating capacity upward", wrong: "An item gets taken multiple times", fix: "With a 1D array, iterate w downward for 0/1 knapsack" },
    { mistake: "Memoising on mutable arguments", why: "Passing lists to a cached function", wrong: "TypeError (unhashable) or wrong cache hits", fix: "Use indexes or tuples as the state" },
    { mistake: "Recursion depth with top-down DP", why: "Deep chains like fib(10000)", wrong: "RecursionError", fix: "Bottom-up tabulation" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Document the state meaning, transition and base cases above the code." },
    { tag: "Reliability", text: "Verify against brute force on small random inputs." },
    { tag: "Performance", text: "Reduce memory to one or two rows when transitions only use the previous row." },
    { tag: "Maintainability", text: "Store choices (or keep the table) when you need to reconstruct the solution, not just its value." },
  ],
  interview: [
    { q: "How do you approach a DP problem?", a: "Identify that choices create overlapping subproblems. Define the state in words, derive the transition from the last decision, set base cases, choose computation order, then optimise space. I often start with recursion plus memoisation and convert to a table if needed." },
    { q: "Top-down vs bottom-up?", a: "Top-down: recursive with a cache, natural to write, computes only reachable states, but limited by recursion depth and call overhead. Bottom-up: iterative over a table in dependency order, no recursion limits, easier to optimise memory." },
    { q: "Explain the knapsack DP.", a: "dp[i][w] is the best value using the first i items with capacity w. For item i, either skip it (dp[i-1][w]) or take it if it fits (dp[i-1][w-cost] + value). Take the max. O(n·W) time; with one row iterated downward, O(W) space." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which signal most strongly suggests DP?",
      options: ["Find an item in a sorted array", "Count the ways to reach a target where subproblems repeat", "Find the shortest path in an unweighted graph", "Sort names alphabetically"],
      answer: 1,
      explanation: "Counting/optimising over choices with repeated subproblems is the DP signature.",
    },
    {
      kind: "output",
      prompt: "min_coins(7, [2, 4]) returns:",
      options: ["2", "3", "-1", "4"],
      answer: 2,
      explanation: "Only even amounts are reachable with 2 and 4.",
    },
    {
      kind: "mcq",
      prompt: "Time complexity of edit distance for strings of length m and n?",
      options: ["O(m + n)", "O(m·n)", "O(2^(m+n))", "O(log m)"],
      answer: 1,
      explanation: "One cell per pair of prefixes, O(1) work each.",
    },
  ],
  cheatSheet: [
    "DP = overlapping subproblems + optimal substructure.",
    "Method: state → transition → base cases → order → answer → space.",
    "@functools.cache for quick top-down memoisation.",
    "Coin change: dp[a] = min(dp[a-c] + 1).",
    "Knapsack: dp[i][w] = max(skip, take).",
    "Edit distance: match → diagonal; else 1 + min(del, ins, sub).",
    "Keep choices to reconstruct; keep one row to save memory.",
  ],
  homework: {
    basic: {
      title: "Climbing stairs and house robber",
      brief: ["(1) Count ways to climb n stairs taking 1 or 2 steps. (2) Maximum money robbing houses in a row without robbing two adjacent houses. Write state, transition and base cases in comments."],
      criteria: ["O(n) time, O(1) space", "State and transition documented", "Tests with n = 0, 1, 2"],
      hints: ["Robber: dp[i] = max(dp[i-1], dp[i-2] + houses[i])."],
      solution: {
        text: ["Both only need the last two states, so two variables suffice."],
        code: {
          lang: "python",
          code: `def stairs(n: int) -> int:
    # ways[i] = ways[i-1] + ways[i-2]; ways[0] = 1, ways[1] = 1
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a

def rob(houses: list[int]) -> int:
    # best[i] = max(best[i-1], best[i-2] + houses[i])
    prev2, prev1 = 0, 0
    for h in houses:
        prev2, prev1 = prev1, max(prev1, prev2 + h)
    return prev1

assert [stairs(n) for n in range(6)] == [1, 1, 2, 3, 5, 8]
assert rob([2, 7, 9, 3, 1]) == 12 and rob([]) == 0`,
        },
      },
    },
    intermediate: {
      title: "Longest common subsequence with reconstruction",
      brief: ["Return the LCS of two strings (not just its length), e.g. 'ABCBDAB' and 'BDCABA' → length 4, one LCS is 'BCBA'."],
      criteria: ["O(m·n) table", "Reconstructs an actual subsequence", "Tests with empty strings"],
      hints: ["Walk back from dp[m][n]: if characters match, take it and move diagonally; else move toward the larger neighbour."],
      solution: {
        text: ["The table stores lengths; walking back recovers characters."],
        code: {
          lang: "python",
          code: `def lcs(a: str, b: str) -> str:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m):
        for j in range(n):
            dp[i + 1][j + 1] = dp[i][j] + 1 if a[i] == b[j] else max(dp[i][j + 1], dp[i + 1][j])
    out, i, j = [], m, n
    while i and j:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))

assert len(lcs("ABCBDAB", "BDCABA")) == 4
assert lcs("", "abc") == ""`,
        },
      },
    },
    challenge: {
      title: "Word break",
      brief: ["Given a string and a dictionary, return one way to split it into dictionary words (e.g. 'learnrustfast' → 'learn rust fast'), or None. Then return the number of ways. Analyse complexity."],
      criteria: ["dp over prefix positions", "Reconstruction of one split", "Counting variant"],
      hints: ["ok[i] = True if some word ends at i and ok[i - len(word)] is True."],
      solution: {
        text: ["States are prefix lengths 0..n; each checks up to n split points: O(n²) substring checks (with a set). Counting replaces 'any' with 'sum'."],
        code: {
          lang: "python",
          code: `def word_break(s: str, words: set[str]) -> str | None:
    n = len(s)
    back: list[int | None] = [None] * (n + 1)
    ok = [True] + [False] * n
    for i in range(1, n + 1):
        for j in range(i):
            if ok[j] and s[j:i] in words:
                ok[i], back[i] = True, j
                break
    if not ok[n]:
        return None
    parts, i = [], n
    while i:
        parts.append(s[back[i]:i]); i = back[i]
    return " ".join(reversed(parts))

def count_breaks(s: str, words: set[str]) -> int:
    ways = [1] + [0] * len(s)
    for i in range(1, len(s) + 1):
        ways[i] = sum(ways[j] for j in range(i) if s[j:i] in words)
    return ways[-1]

assert word_break("learnrustfast", {"learn", "rust", "fast", "rus"}) == "learn rust fast"
assert count_breaks("catsanddog", {"cat", "cats", "and", "sand", "dog"}) == 2`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: weekly plan and answer similarity",
      brief: ["Add `weekly_plan(lessons, minutes)` (knapsack with reconstruction) and `similarity(a, b) = 1 - edit_distance/max(len)` to the AI service. Use similarity to give partial credit hints on short code answers."],
      criteria: ["Plan respects the time budget", "Similarity in [0, 1] with tests", "Documented complexity"],
      hints: ["Normalise whitespace before comparing code answers."],
      solution: {
        text: ["Normalise answers (strip, collapse whitespace), compute edit distance, and map to a score; thresholds like ≥ 0.9 'almost there' make friendly feedback without an LLM call."],
      },
    },
  },
  deeper: [
    { label: "Python docs: functools.cache", url: "https://docs.python.org/3/library/functools.html#functools.cache" },
    { label: "Wikipedia: Levenshtein distance", url: "https://en.wikipedia.org/wiki/Levenshtein_distance" },
    { label: "LeetCode: Dynamic Programming problems", url: "https://leetcode.com/tag/dynamic-programming/" },
  ],
  nextPreview: "Next phase: frontend. Semantic HTML and accessibility, the foundation every user interface stands on.",
};
