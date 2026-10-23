import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.4.2",
  title: "Dynamic programming",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["2.4.1 Greedy and backtracking"],
  summary: "Learn a repeatable method for dynamic programming: define the state, the transition and the base cases, then implement top-down with memoisation or bottom-up with a table, and know when each one wins.",
  terms: [
    { term: "Dynamic programming (DP)", def: "Solving a problem by combining solutions to overlapping subproblems, computing each subproblem once and storing it." },
    { term: "Overlapping subproblems", def: "The same smaller problem appears many times in a naive recursion. fib(30) makes 2,692,537 calls but only 31 distinct values exist." },
    { term: "Optimal substructure", def: "An optimal solution is built from optimal solutions to subproblems, so a sub-answer can be reused without knowing the rest of the solution." },
    { term: "State", def: "The minimal information that identifies a subproblem, e.g. (index, remaining capacity) or (prefix of a, prefix of b). The number of states drives the complexity." },
    { term: "Transition", def: "The recurrence that computes a state from smaller states, e.g. dp[i] = dp[i-1] + dp[i-2], or dp[i][w] = max(skip, take)." },
    { term: "Base case", def: "A state with no decision left, whose value is known directly: dp[0] = 0 for a sum, dp[0] = 1 for one way to make zero, dp[i][0] = i for edit distance." },
    { term: "Recurrence", def: "The equation plus base cases that defines every state. If you can write it, you can usually implement it either top-down or bottom-up." },
    { term: "Memoisation (top-down)", def: "Recursion plus a cache of results. It computes only the states the original problem actually reaches." },
    { term: "Tabulation (bottom-up)", def: "Filling a table iteratively from base cases upward, in an order where every dependency is already computed." },
    { term: "Rolling array", def: "Keeping only the rows or variables a transition still reads, e.g. two rows for edit distance or one row for knapsack, which cuts memory but discards history." },
    { term: "Reconstruction", def: "Recovering the actual choices, not just the optimal value, by walking back through the table or following parent pointers stored per state." },
    { term: "Pseudo-polynomial", def: "A runtime polynomial in the numeric value of the input, such as O(n·W) for knapsack, rather than in its bit length. A huge W makes it impractical." },
  ],
  problem: [
    "DevAtlas wants to suggest the most valuable set of lessons a learner can complete in the 10 hours they have this week, where each lesson has a time cost and a value for the learner's goal. Trying all subsets of 70 lessons is 2⁷⁰ combinations: impossible. A greedy ranking by value per minute is fast, but the best combination can include a lesson that looks mediocre per minute and unlocks a better total.",
    "Another feature compares a learner's code answer with the model solution and highlights the minimal edits, like a diff tool. Both are classic DP problems (0/1 knapsack and edit distance) that run in milliseconds with the right table. In interviews the same two shapes appear constantly: choose or skip each item under a budget, and align two sequences. Learning the method matters more than memorising either solution.",
  ],
  concept: {
    analogy: [
      "DP is **writing answers on sticky notes** while doing homework. When a later question needs a result you already computed, you read the note instead of recomputing it. The art is deciding what to write on each note (the state) and how notes combine (the transition). A note with too little information gives a wrong answer; a note with too much multiplies the work for nothing.",
      "A second way to see it: a spreadsheet of sub-answers. Top-down is asking only for the cells you need and writing each one the first time it is requested. Bottom-up is filling the sheet row by row so every cell is ready before it is read. A rolling array is tearing off rows you will never read again. The metaphor also shows the two classic failures: reading a cell before it is filled (wrong order) and tearing off a row you still need (bad space optimisation).",
    ],
    precise: [
      "Dynamic programming applies when a problem has two properties. **Overlapping subproblems**: a naive recursion solves the same smaller problem many times, so caching collapses the recursion tree into a graph. **Optimal substructure**: an optimal solution is assembled from optimal solutions to its subproblems. Both are required. Without overlap, plain divide and conquer is enough; without optimal substructure, a locally optimal sub-answer cannot be safely combined. Greedy needs a stronger condition, the **greedy-choice property** - that some local choice is always safe. Coin change with coins [1, 3, 4] and amount 6 breaks greedy (4 + 1 + 1 = 3 coins) while DP finds 3 + 3 = 2, but the problem still has optimal substructure.",
      "**The method**: (1) define what dp[state] means in words, including what is being optimised or counted; (2) derive the transition by considering the **last decision**, not the first; (3) set base cases for states with no decision left; (4) choose an order so every state you read is already computed; (5) read the answer from the final state, not from the last cell you happened to fill; (6) optimise memory only after the table version is correct. If reconstruction is needed, keep the table or store the choice at each state before rolling anything.",
      "**Top-down vs bottom-up**. Top-down memoisation is the recurrence plus a cache: natural to write, visits only reachable states, and is easy to modify. It pays call overhead and is bounded by the call stack: Python's default recursion limit is 1000, so a deep state chain raises RecursionError. Bottom-up tabulation fills every state in the range, reachable or not, but has no stack limit, smaller constants, and allows rolling arrays. Memoisation suits sparse state spaces and transitions that are awkward to order; tabulation suits dense ranges where every state is needed.",
      "**1D vs 2D** is just the state's shape. Fibonacci, climbing stairs, house robber and coin change use one dimension (an index or an amount). Edit distance, longest common subsequence and knapsack use two (two prefixes, or item × capacity). LIS is interesting: a 1D state (index) with an O(n) scan of earlier indices gives O(n²), while storing the smallest tail per length gives O(n log n) but loses easy reconstruction. In every case the cost is roughly **(number of states) × (work per transition)**: knapsack O(n·W), edit distance O(m·n), LIS O(n²).",
    ],
  },
  underTheHood: {
    text: [
      "**The recursion tree becomes a graph.** Naive `fib(5)` makes 15 calls for 6 distinct values, and the measured `fib(30)` in the hands-on makes 2,692,537 calls for 31 values. The exact count is 2·fib(n+1) − 1, which is exponential. Memoisation stores one result per distinct state, so the work becomes O(number of states) plus cache lookups. Spotting that collapse - the same subproblem being asked again - is the first half of recognising DP.",
      "**Optimal substructure and the last decision.** For knapsack the last decision is take item i or skip it; for edit distance it is match the last characters or apply insert, delete or substitute; for climbing stairs it is the last move of one or two steps. Each choice gives a smaller state, and taking the best (or summing the counts) gives the transition. The usual correctness argument is an exchange argument: if the sub-answer inside an optimal solution were not optimal, swapping in a better one would improve the whole, which contradicts optimality. If you cannot write that argument, the recurrence is probably missing state.",
      "**Designing the state.** The state is the smallest set of values that makes the subproblem self-contained. 'Best value for lessons 1..i within w minutes' is (i, w). Comparing prefixes of two strings is (i, j). Tracking 'the last chosen value' for LIS gives (index, last value); tracking only the index and scanning backwards gives O(n²) transitions instead. Extra state multiplies the table for nothing; missing state makes the transition wrong. Write the sentence `dp[...] = ...` in words and count the distinct states: that count times the work per transition is the complexity you will quote.",
      "**Base cases and sentinels.** Base cases are the states with no decision left. `dp[0] = 0` when the value of an empty selection is zero, `dp[0] = 1` when counting the one way to make an empty prefix, `dp[i][0] = i` for edit distance because deleting i characters costs i. Unreachable states need a sentinel: `float('inf')` for a minimum, `-1` or a large negative for a maximum. Keep the sentinel out of the final answer: coin change computes with `inf` internally and converts to -1 at the boundary, which is exactly why `min_coins(7, [2, 4])` returns -1.",
      "**Order and direction.** A table is filled in any topological order of the state graph. 1D goes left to right; 2D goes row by row when `dp[i][j]` reads `dp[i-1][*]` and `dp[i][j-1]`. The direction inside a row encodes the problem. Unbounded coin change reads `dp[a-c]` after it may already have been updated, so iterating amount upward allows a coin to be reused. 0/1 knapsack with a single row must iterate capacity **downward**, so `dp[w-cost]` still belongs to the previous item and each item is used at most once. Reversing that direction is the most common silent bug in DP.",
      "**Memoisation vs tabulation in practice.** Top-down is usually the shortest correct code: decorate the recursive function with `functools.cache` and the recurrence is the implementation. It visits only states reachable from the start and can be sparse-friendly. Its costs are call overhead and depth: the hands-on shows `fib_memo(5000)` raising RecursionError at Python's default limit of 1000, while the loop produces a 1045-digit answer. Bottom-up fills the whole range, which can be wasteful when many states are unreachable, but has no stack limit, better constants, and permits rolling memory. Choose based on the density of reachable states, not on taste.",
      "**Space optimisation.** Most transitions read only the previous row or the previous two values. Edit distance needs `prev` and `cur`, so memory is O(len(b)) instead of O(len(a)·len(b)); Fibonacci needs two variables; 0/1 knapsack needs one row iterated downward; unbounded coin change needs one row iterated upward. The transformation is mechanical once the dependency is explicit, but it destroys history: you can still compute the optimal value, not the chosen items. When both are required, keep the full table, store parent pointers, or use a divide-and-conquer reconstruction such as Hirschberg's algorithm for LCS.",
      "**Reconstructing the answer.** Two standard techniques. Keep the table and walk back: at (i, w), compare `dp[i][w]` with `dp[i-1][w]`; if they differ, item i was taken, then move to (i-1, w-cost). Or store the decision as you fill each cell - a parent pointer, or for LIS the index of the previous smaller element. Both cost O(states) extra. Tie-breaking matters: when skip and take give the same value, define whether the walk prefers skip or take, and test the result. With a rolled table there is nothing to walk back through, so reconstruction and O(1)-row memory are usually a trade-off.",
      "**Recognising DP in an interview.** Read the constraints as a hint. Signals in the statement: count the ways, minimum or maximum cost, is it possible, 'at most k', or a brute force that branches on a choice at each element. Then map the bounds: n ≤ 20 suggests bitmask or 2ⁿ; n ≤ 5000 suggests O(n²); n ≤ 10⁵ suggests O(n log n), often LIS with patience or a greedy; a capacity or amount up to about 10⁴ suggests O(n·W) pseudo-polynomial DP; very large values kill pseudo-polynomial approaches. Say the state sentence aloud, derive the transition from the last decision, list the base cases, state the order and the complexity, then test the smallest inputs and one impossible input. If no polynomial-size state exists, DP is the wrong tool.",
    ],
    diagram: {
      title: "The DP method, from state to reconstruction",
      nodes: [
        { label: "State", sub: "dp[i][w] means…" },
        { label: "Transition", sub: "last decision" },
        { label: "Base cases", sub: "dp[0] = …" },
        { label: "Order", sub: "dependencies first" },
        { label: "Answer", sub: "dp[n][W]" },
        { label: "Reconstruct", sub: "walk back / parents" },
      ],
      edges: ["what is stored", "smaller states", "no decision left", "dependencies first", "value → choices"],
      caption: "Steps 1 to 5 are mandatory. Step 6 is only possible if you kept the table or stored a choice per state; a rolling array gives you the value and nothing else.",
    },
  },
  handsOn: [
    {
      title: "Measure memoisation, tabulation and the recursion limit",
      text: [
        "The three versions compute the same number. The first recomputes subtrees; the second caches each state on first use; the third keeps only the two most recent values because the transition never looks further back. Run it and compare call counts, not just times: the count is deterministic, while milliseconds vary by machine and by what else is running.",
      ],
      code: {
        lang: "python",
        file: "fib_compare.py",
        code: `import sys
import time
from functools import cache

calls = {"naive": 0}


def fib_naive(n: int) -> int:
    calls["naive"] += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)


@cache
def fib_memo(n: int) -> int:
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)


def fib_table(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


for fn in (fib_naive, fib_memo, fib_table):
    t = time.perf_counter()
    result = fn(30)
    ms = (time.perf_counter() - t) * 1000
    print(f"{fn.__name__:10} fib(30)={result}  {ms:8.3f} ms")

print(f"naive calls: {calls['naive']}")
fib_memo.cache_clear()
fib_memo(30)
info = fib_memo.cache_info()
print(f"memo states: {info.currsize}  misses: {info.misses}  hits: {info.hits}")

try:
    fib_memo(5000)
except RecursionError:
    print("fib_memo(5000) -> RecursionError")
print(f"fib_table(5000) digits: {len(str(fib_table(5000)))}  limit: {sys.getrecursionlimit()}")`,
      },
      output: "fib_naive  fib(30)=832040   230.216 ms\nfib_memo   fib(30)=832040     0.055 ms\nfib_table  fib(30)=832040     0.008 ms\nnaive calls: 2692537\nmemo states: 31  misses: 31  hits: 28\nfib_memo(5000) -> RecursionError\nfib_table(5000) digits: 1045  limit: 1000",
      notes: [
        "These timings are from one CPython 3.11.15 run and will differ on your machine; the ratios and the call counts are the stable part. 2,692,537 calls collapse into 31 states: that is what 'overlapping subproblems' means numerically.",
        "The memo hit count is 28, not 29, because the two base cases are each reached once and cached. `cache_info()` is the cheapest way to prove a cache is doing its job.",
        "`fib_memo(5000)` fails because the recursion is 5000 frames deep, past the default limit of 1000. `sys.setrecursionlimit` can raise the limit, but a real stack overflow may crash the process; bottom-up has no such ceiling. Note that the cached call does not solve the depth problem - it only removes repeated work along the way.",
      ],
    },
    {
      title: "Compare the three strategies before you code",
      text: [
        "This is a decision table, not a benchmark. Read it when you are deciding how to attack a new problem; the rows are the questions an interviewer will ask you to justify.",
      ],
      code: {
        lang: "text",
        file: "dp-strategies.txt",
        code: `                        top-down memo              bottom-up table            greedy
direction               recursion + cache          loop over states           one local choice
states visited          only reachable ones        every state in the range   one pass
time                    states x transition        states x transition        usually O(n log n) or O(n)
space                   cache + call stack         table (rows can roll)      O(1) to O(n)
recursion limit         yes (~1000 frames)         no                         no
reconstruction          cache choices or re-solve  keep table / parent ptrs   choices are final
correct when            overlap + optimal subst.   overlap + optimal subst.   greedy-choice property
typical failure         deep chain, huge state     wasted unreachable states  coin [1,3,4] for 6 -> 3 vs 2
example                 fib memo, sparse DP        coin change, knapsack      interval scheduling`,
      },
      notes: [
        "A greedy algorithm is not a weaker DP; it is a different proof obligation. Use it only when you can argue that the local choice is safe for every input.",
        "If the reachable state space is tiny compared with the full range (for example, a target reachable by only a few combinations), top-down avoids filling cells that can never matter. If every state is needed, bottom-up wins on constants and memory.",
      ],
    },
    {
      title: "Unbounded, 0/1 and counting: three table shapes",
      text: [
        "One script, three shapes. Coin change is unbounded: a coin may be used any number of times, so the amount loop runs upward and `dp[a]` depends on `dp[a-c]` in the same row. Knapsack is 0/1: each lesson is used at most once, so the table needs the item dimension (or a downward capacity loop in 1D). Grid paths is counting rather than optimising: the transition adds the two ways of arriving instead of taking a maximum.",
        "The impossible amounts are the interesting part. With coins [2, 4], amount 7 stays at the sentinel forever; the function converts it to -1. With coins [3, 5], amount 7 is also impossible even though the coins look more flexible. Always test one unreachable target.",
      ],
      code: {
        lang: "python",
        file: "tables.py",
        code: `INF = float("inf")


def min_coins(amount: int, coins: list[int]) -> int:
    """dp[a] = fewest coins to make a, or INF when a is unreachable."""
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return -1 if dp[amount] == INF else dp[amount]


def best_plan(lessons, budget):
    """0/1 knapsack with reconstruction; dp[i][w] = best value using first i lessons."""
    n = len(lessons)
    dp = [[0] * (budget + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        name, cost, value = lessons[i - 1]
        for w in range(budget + 1):
            dp[i][w] = dp[i - 1][w]
            if cost <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - cost] + value)
    chosen, w = [], budget
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            name, cost, _ = lessons[i - 1]
            chosen.append(name)
            w -= cost
    return dp[n][budget], chosen[::-1]


def paths(grid: list[str]) -> int:
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


print("coins:", min_coins(6, [1, 3, 4]), min_coins(11, [2, 5]),
      min_coins(7, [2, 4]), min_coins(7, [3, 5]))
table = [0] + [INF] * 6
for a in range(1, 7):
    for c in [1, 3, 4]:
        if c <= a and table[a - c] + 1 < table[a]:
            table[a] = table[a - c] + 1
print("dp[0..6] =", [int(x) for x in table])

catalog = [("SQL indexes", 75, 9), ("Docker", 75, 8), ("RAG", 90, 10),
           ("Git PRs", 50, 4), ("Tries", 50, 3), ("HTTP", 60, 6)]
print("knapsack:", best_plan(catalog, 240))
print("knapsack cells:", 7 * 241)
print("grid paths:", paths(["...", ".#.", "..."]))`,
      },
      output: "coins: 2 4 -1 -1\ndp[0..6] = [0, 1, 2, 1, 1, 2, 2]\nknapsack: (27, ['SQL indexes', 'Docker', 'RAG'])\nknapsack cells: 1687\ngrid paths: 2",
      notes: [
        "The `dp[0..6]` trace shows the reuse: amount 3 takes one coin (3), and amount 6 takes two (3 + 3), while greedy would take 4 first and need three coins. Amount 2 is two coins, amount 4 is one coin.",
        "The knapsack table is 7 × 241 = 1687 cells for 6 lessons and a 240-minute budget. That is the pseudo-polynomial cost: double the budget and the table doubles, regardless of how many lessons there are.",
        "With a 1D knapsack row, iterate `w` from `budget` down to `cost`; iterating upward lets one lesson be chosen repeatedly and silently turns 0/1 into unbounded. The 2D table here avoids the issue and makes the walk-back possible.",
      ],
    },
    {
      title: "LIS and edit distance: 1D state versus 2D table",
      text: [
        "Longest increasing subsequence has a 1D state (ending at index i) and scans all earlier indices, so O(n²) time and O(n) memory for the lengths. The `prev` array stores one parent per index and reconstructs an actual subsequence. Patience sorting with `bisect_left` computes the length in O(n log n) but does not, by itself, give the sequence.",
        "Edit distance is the 2D shape: rows are prefixes of `a`, columns are prefixes of `b`, and every cell reads its left, upper and diagonal neighbours. The table size is (len(a)+1) × (len(b)+1); the two-row version keeps the answer but only O(len(b)) memory. The printed cell counts make the cost concrete.",
      ],
      code: {
        lang: "python",
        file: "sequences.py",
        code: `from bisect import bisect_left


def lis(nums: list[int]) -> tuple[int, list[int]]:
    n = len(nums)
    if n == 0:
        return 0, []
    dp = [1] * n
    prev = [-1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i] and dp[j] + 1 > dp[i]:
                dp[i] = dp[j] + 1
                prev[i] = j
    end = max(range(n), key=lambda i: dp[i])
    length = dp[end]
    out = []
    while end != -1:
        out.append(nums[end])
        end = prev[end]
    return length, out[::-1]


def lis_fast(nums: list[int]) -> int:
    tails: list[int] = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)


nums = [10, 9, 2, 5, 3, 7, 101, 18]
print("lis:", lis(nums))
print("lis_fast:", lis_fast(nums))
print("lis of []:", lis([]))
print("lis of [7, 7, 7]:", lis([7, 7, 7]))
print("cells O(n^2):", len(nums) ** 2)


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
        prev = cur
    return prev[-1]


for a, b in [("kitten", "sitting"), ("git comit -m", "git commit -m"), ("", "abc")]:
    d = edit_distance(a, b)
    rows, cols = len(a) + 1, len(b) + 1
    print(f"{a!r:16} -> {b!r:18} distance={d}  table={rows}x{cols}={rows * cols} cells")`,
      },
      output: "lis: (4, [2, 5, 7, 101])\nlis_fast: 4\nlis of []: (0, [])\nlis of [7, 7, 7]: (1, [7])\ncells O(n^2): 64\n'kitten'         -> 'sitting'          distance=3  table=7x8=56 cells\n'git comit -m'   -> 'git commit -m'    distance=1  table=13x14=182 cells\n''               -> 'abc'              distance=3  table=1x4=4 cells",
      notes: [
        "`[2, 5, 7, 101]` is one optimal LIS; `[2, 3, 7, 101]` and `[2, 3, 7, 18]` also have length 4. When several answers are optimal, fix a tie-breaking rule in tests, or assert the length rather than the exact sequence.",
        "Strictly increasing uses `nums[j] < nums[i]`; change it to `<=` for non-decreasing. `[7, 7, 7]` returns 1, which is the quickest way to catch that difference.",
        "'kitten' to 'sitting' fills 7 × 8 = 56 cells; the two-row version keeps 8 values at a time. The 1045-digit Fibonacci answer and the 56-cell table are the same idea at different scales: the state count is the cost.",
        "Edit distance with unit costs is Levenshtein distance. Real diff tools often use LCS or Myers' algorithm and add heuristics, because a full O(m·n) table is too slow for very large files.",
      ],
    },
    {
      title: "How to recognise a DP problem in an interview",
      text: [
        "Draw this before writing code. The first two questions decide whether DP is even the right family; the rest are the method you will explain while coding.",
      ],
      code: {
        lang: "mermaid",
        file: "dp-recognition.mmd",
        code: `flowchart TD
    A["Read the problem and the bounds"] --> B{"Count ways, min/max cost, or possible?"}
    B -->|"no"| Z["Greedy, binary search, graph or simulation"]
    B -->|"yes"| C{"Does a naive recursion repeat the same subproblem?"}
    C -->|"no"| Z
    C -->|"yes"| D{"Can an optimal answer be built from optimal sub-answers?"}
    D -->|"no"| E["Backtracking or brute force with pruning"]
    D -->|"yes"| F["Write the state sentence in words"]
    F --> G["Transition from the last decision"]
    G --> H["Base cases and a sentinel for unreachable states"]
    H --> I{"Need the actual choices?"}
    I -->|"yes"| J["Keep the table or parent pointers"]
    I -->|"no"| K["Roll to one or two rows"]`,
      },
      notes: [
        "The bounds are part of the recognition, not an afterthought. O(n·W) is fine for W = 10⁴ and fatal for W = 10⁹; n ≤ 20 usually means bitmask DP, not a polynomial table.",
        "Say the state aloud as a sentence before touching the keyboard: 'dp[i][w] is the best value using the first i lessons within w minutes'. If the sentence needs an 'and also', you may be missing a dimension.",
        "Finish every DP answer by testing n = 0, n = 1, a case with no solution, and a case where two choices tie. Those four tests catch most base-case and reconstruction bugs.",
      ],
    },
  ],
  companies: [
    "**Version control and diff tools (illustrative):** git diff and code review tools compute a longest-common-subsequence alignment (Myers' algorithm and its refinements) to show the smallest set of changes between two files. The 2D table is the textbook form; production tools add heuristics so they stay fast on large files.",
    "**Spell check, fuzzy search and record matching (illustrative):** edit distance ranks 'did you mean' suggestions in search boxes and editors, and matches customer or product records with typos. Bioinformatics aligns DNA and protein sequences with the same recurrence plus scoring matrices; BLAST uses heuristics to avoid filling the whole table.",
    "**Pricing, budgeting and resource allocation (illustrative):** ad budgets, inventory and the DevAtlas weekly plan are knapsack variants. At small scale a DP table is exact; at large scale teams switch to integer programming, column generation or approximations because O(n·W) becomes too big.",
    "**Speech recognition and hidden Markov models (illustrative):** the Viterbi algorithm is a DP over (time, state) that finds the most likely state sequence. Every cell keeps the best predecessor, which is exactly reconstruction with parent pointers.",
    "**Database query optimisers (illustrative):** System R's Selinger algorithm used DP over subsets of join relations to choose a join order, an early example of a state space exponential in the number of tables and pruned with heuristics.",
  ],
  mistakes: [
    { mistake: "Starting with code instead of the state definition", why: "Jumping into loops feels productive", wrong: "Confusing tables, wrong transitions and an answer read from the wrong cell", fix: "Write 'dp[i][w] = best value using first i items within w' in a comment first, then code it" },
    { mistake: "Wrong iteration order", why: "Not checking which states a transition reads", wrong: "Reading states that are not computed yet, so the answer depends on loop order", fix: "List the dependencies of dp[current] and ensure every one is filled first; draw the table" },
    { mistake: "Reusing items in 0/1 knapsack with a 1D array", why: "Iterating capacity upward, as in unbounded coin change", wrong: "An item gets taken several times and the value is too high", fix: "With a 1D array, iterate w downward for 0/1 knapsack; iterate upward only for unbounded problems" },
    { mistake: "Memoising on mutable arguments", why: "Passing lists or dicts to a cached function", wrong: "TypeError (unhashable) or a cache keyed by identity, giving wrong hits", fix: "Pass indexes or tuples as the state; keep the mutable data outside the cached function" },
    { mistake: "Recursion depth with top-down DP", why: "Assuming memoisation fixes deep chains", wrong: "RecursionError around 1000 frames, often only on the largest test case", fix: "Use bottom-up tabulation for deep state chains, or restructure the recursion; do not rely on raising the limit" },
    { mistake: "Rolling the table and then trying to reconstruct", why: "Saving memory first, adding reconstruction later", wrong: "The chosen items cannot be recovered because earlier rows are gone", fix: "Keep the full table or a parent pointer per state when the answer needs the choices" },
    { mistake: "Returning the sentinel as if it were an answer", why: "Forgetting to convert infinity or -1 at the boundary", wrong: "The caller receives inf or a huge number instead of 'impossible'", fix: "Convert at the boundary: `-1 if dp[amount] == INF else dp[amount]`" },
    { mistake: "Confusing subsequence with substring", why: "The words look alike", wrong: "LIS returns 4 for [10,9,2,5,3,7,101,18] but a longest increasing substring is much shorter", fix: "Subsequence may skip elements; substring may not. Re-read the problem statement" },
    { mistake: "Trusting a greedy rule without a counterexample", why: "The local rule looks obviously right", wrong: "Coin change [1,3,4] for 6 takes 4+1+1 (three coins) instead of 3+3 (two)", fix: "Before using greedy, try small counterexamples; if one exists, use DP or prove the greedy-choice property" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Document the state meaning, transition and base cases above the code, in words, before writing loops." },
    { tag: "Reliability", text: "Cross-check the DP against brute force on small random inputs, then test empty input, one element, an impossible target and a tie." },
    { tag: "Performance", text: "Reduce memory to one or two rows when the transition only reads the previous row, and state the memory saving in the complexity comment." },
    { tag: "Performance", text: "Choose tabulation for dense state ranges and memoisation for sparse reachable states; measure before assuming one is faster." },
    { tag: "Maintainability", text: "Keep the full table or parent pointers when the task needs the chosen items, not just the optimal value; rolling arrays cannot reconstruct." },
  ],
  interview: [
    { q: "How do you approach a DP problem you have not seen before?", a: "First decide whether DP applies at all. Look for counting, minimum or maximum cost, feasibility, or a brute force that branches on a choice at every element; then check that the recursion repeats subproblems and that optimal sub-answers combine. Read the constraints as a hint: n ≤ 20 suggests bitmask or 2ⁿ, n ≤ 5000 suggests O(n²), n up to 10⁵ suggests O(n log n), and a moderate capacity suggests O(n·W) pseudo-polynomial DP. Define the state as a sentence - 'dp[i][w] is the best value using the first i items within capacity w' - and derive the transition from the last decision, not the first. Set base cases, choose a topological order, and state the complexity as states × transition cost. Start with the recursive definition plus memoisation because it is easiest to verify, then convert to a table and roll memory if needed. Finish by testing n = 0, n = 1, an impossible case and a tie. If you cannot write a polynomial-size state, say that DP is the wrong tool and suggest the alternative." },
    { q: "Top-down memoisation versus bottom-up tabulation: what are the real trade-offs?", a: "Top-down is the recurrence plus a cache: the code mirrors the definition, it computes only states reachable from the start, and it is easy to change when the transition changes. The costs are call overhead and stack depth; Python's default limit is 1000 frames, and fib(5000) with memoisation raises RecursionError while a loop computes the same 1045-digit answer. Bottom-up fills every state in the range, including unreachable ones, but has no recursion limit, smaller constants and permits rolling arrays: two rows for edit distance, one row for knapsack, two variables for Fibonacci. Reconstruction changes the choice: a full table or parent pointers let you walk back, while rolling memory usually gives only the value. In practice I write top-down to get correctness quickly, then convert to bottom-up when the state space is dense, the input is large, or memory matters. I would mention memoisation's sparse advantage for problems where most states are unreachable." },
    { q: "Explain the knapsack DP, its complexity and its space optimisation.", a: "Define dp[i][w] as the best value using the first i items within capacity w. For item i there are two choices: skip it, giving dp[i-1][w], or take it if cost ≤ w, giving dp[i-1][w-cost] + value. Take the maximum. Base case dp[0][w] = 0 for all w. Fill rows in increasing i and w so every dependency is ready. The answer is dp[n][W], and walking back from (n, W) recovers the chosen items: if dp[i][w] differs from dp[i-1][w], item i was taken, then move to (i-1, w-cost). Complexity is O(n·W) time and O(n·W) space with the full table - pseudo-polynomial, because W is a numeric value, not the input's bit length. Because row i only reads row i-1, a single row of size W+1 suffices, iterated from W down to cost so each item is used at most once; that is O(W) space but it loses reconstruction. Variants: unbounded knapsack iterates w upward; counting subsets uses sum instead of max; and when W is huge, switch to meet-in-the-middle, branch and bound, or an approximation." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which signal most strongly suggests DP?",
      options: ["Find an item in a sorted array", "Count the ways to reach a target where subproblems repeat", "Find the shortest path in an unweighted graph", "Sort names alphabetically"],
      answer: 1,
      explanation: "Counting or optimising over choices with repeated subproblems is the DP signature. A sorted array suggests binary search; an unweighted shortest path suggests BFS.",
    },
    {
      kind: "output",
      prompt: "What does `min_coins(7, [2, 4])` return?",
      options: ["2", "3", "-1", "4"],
      answer: 2,
      explanation: "Only even amounts are reachable with coins 2 and 4, so dp[7] stays at the sentinel and the function converts it to -1.",
    },
    {
      kind: "mcq",
      prompt: "Time and space for edit distance on strings of length m and n, using two rows?",
      options: ["O(m + n) time, O(1) space", "O(m·n) time, O(n) space", "O(2^(m+n)) time, O(m·n) space", "O(m·n) time, O(m·n) space"],
      answer: 1,
      explanation: "One cell per pair of prefixes, O(1) work each, for O(m·n) time. Keeping only the previous and current rows reduces space from O(m·n) to O(n).",
    },
  ],
  cheatSheet: [
    "DP = overlapping subproblems + optimal substructure. Greedy needs the stronger greedy-choice property.",
    "Method: state → transition (last decision) → base cases → dependency order → answer → space.",
    "State in words: 'dp[i][w] = best value using the first i items within w'. Count the states to get the complexity.",
    "Top-down = recurrence + `@functools.cache`; bottom-up = loop + table. Top-down visits only reachable states; bottom-up allows rolling arrays.",
    "Recursion limit is about 1000 frames in Python: deep chains need bottom-up, not just a cache.",
    "0/1 knapsack with one row iterates capacity downward; unbounded coin change iterates amount upward.",
    "Coin change: dp[a] = min(dp[a-c] + 1), with a sentinel for unreachable amounts and -1 at the boundary.",
    "LIS: O(n²) DP with a `prev` array reconstructs; patience + `bisect_left` gives O(n log n) for the length only.",
    "Edit distance: matching characters take the diagonal; otherwise 1 + min(delete, insert, substitute). O(m·n) time, O(n) space with two rows.",
    "Reconstruction needs the full table or parent pointers. Rolling memory gives the value and throws the choices away.",
  ],
  homework: {
    basic: {
      title: "Climbing stairs and house robber",
      brief: ["(1) Count ways to climb n stairs taking 1 or 2 steps. (2) Maximum money robbing houses in a row without robbing two adjacent houses. Write state, transition and base cases in comments, then implement each with O(1) space."],
      criteria: ["O(n) time, O(1) space", "State and transition documented", "Tests with n = 0, 1, 2, plus an empty house list"],
      hints: ["Stairs: ways[i] = ways[i-1] + ways[i-2].", "Robber: dp[i] = max(dp[i-1], dp[i-2] + houses[i])."],
      solution: {
        text: ["Both only need the last two states, so two variables suffice. The stairs sequence starting at n = 0 is 1, 1, 2, 3, 5, 8; the robber's transition is the skip-or-take decision in its simplest form."],
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
      criteria: ["O(m·n) table", "Reconstructs an actual subsequence", "Tests with empty strings and with several optimal answers"],
      hints: ["Walk back from dp[m][n]: if characters match, take it and move diagonally; else move toward the larger neighbour."],
      solution: {
        text: ["The table stores lengths; walking back recovers characters. When both neighbours are equal, either direction is valid, so fix a rule and assert the length if several subsequences are optimal."],
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
      criteria: ["dp over prefix positions", "Reconstruction of one split", "Counting variant with different base case"],
      hints: ["ok[i] = True if some word ends at i and ok[i - len(word)] is True.", "For counting, replace 'any' with 'sum' and set ways[0] = 1."],
      solution: {
        text: ["States are prefix lengths 0..n; each checks up to n split points, so O(n²) substring checks with a set. The boolean version can stop at the first word that works; the counting version must add every split, which is why the base case is ways[0] = 1."],
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
      hints: ["Normalise whitespace before comparing code answers.", "Keep the full knapsack table if you need to return the lessons, not just the value."],
      solution: {
        text: [
          "`weekly_plan` is the lesson's 0/1 knapsack on typed `PlanLesson` values: dp[i][w] is the best value from the first i lessons within w minutes. It keeps the full table, O(n × minutes) time and memory (70 lessons × 600 minutes is 42,000 cells), so it can walk back and reconstruct the chosen lessons. A randomised test compares it with brute force over all subsets and checks the budget and that no lesson is used twice. Because every lesson is either taken or skipped, a 1D row would also work if you iterated capacity downward, but you would lose the reconstruction.",
          "`similarity` collapses all whitespace first, so spacing and indentation do not cost points, then returns 1 - edit_distance / max(len). Two empty answers are defined as 1.0, which also avoids dividing by zero. Edit distance uses two rows: O(len(a) × len(b)) time and O(len(b)) memory, and answers are capped at 2,000 characters so one comparison never exceeds 4 million cells. That cap matters: without it, an attacker or a paste accident can turn a scoring call into a multi-second allocation.",
          "`answer_hint` turns the score into friendly feedback (1.0 correct, 0.9 or more 'almost there', 0.6 or more 'on the right track') without an LLM call. Tune the thresholds on real answers: a short wrong answer can score surprisingly high against a short model solution. Run from services/ai: `python -m devatlas_ai.planning` prints the output below, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/planning.py", code: `"""Weekly plan (0/1 knapsack) and answer similarity (edit distance) for the AI service."""
from dataclasses import dataclass


@dataclass(frozen=True)
class PlanLesson:
    id: str
    minutes: int
    value: int


def weekly_plan(lessons: list[PlanLesson], minutes: int) -> tuple[int, list[PlanLesson]]:
    """Most valuable set of lessons that fits in \`minutes\`. Returns (total value, lessons in input order).

    dp[i][w] = best value using the first i lessons within w minutes.
    Transition: skip lesson i (dp[i-1][w]) or take it if it fits (dp[i-1][w-cost] + value).
    O(n * minutes) time and memory; the full table is kept to reconstruct the choice.
    """
    if minutes < 0 or any(x.minutes <= 0 or x.value < 0 for x in lessons):
        raise ValueError("budget must be >= 0, lesson minutes > 0 and values >= 0")
    n = len(lessons)
    dp = [[0] * (minutes + 1) for _ in range(n + 1)]
    for i, lesson in enumerate(lessons, start=1):
        for w in range(minutes + 1):
            dp[i][w] = dp[i - 1][w]
            if lesson.minutes <= w:
                dp[i][w] = max(dp[i][w], dp[i - 1][w - lesson.minutes] + lesson.value)
    chosen, w = [], minutes
    for i in range(n, 0, -1):                       # walk back: a changed value means "taken"
        if dp[i][w] != dp[i - 1][w]:
            chosen.append(lessons[i - 1])
            w -= lessons[i - 1].minutes
    return dp[n][minutes], chosen[::-1]


def edit_distance(a: str, b: str) -> int:
    """Levenshtein distance with two rows: O(len(a) * len(b)) time, O(len(b)) memory."""
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1]
            else:
                cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
        prev = cur
    return prev[-1]


MAX_ANSWER_CHARS = 2_000            # bounds the DP at 4 million cells per comparison


def normalise_code(text: str) -> str:
    """Collapse every run of whitespace to one space so formatting does not cost points."""
    return " ".join(text.split())


def similarity(a: str, b: str) -> float:
    """1 - edit_distance / max(len), in [0, 1]; 1.0 means identical after normalising."""
    a, b = normalise_code(a), normalise_code(b)
    if len(a) > MAX_ANSWER_CHARS or len(b) > MAX_ANSWER_CHARS:
        raise ValueError("answer too long for similarity scoring")
    longest = max(len(a), len(b))
    if longest == 0:
        return 1.0                                   # both empty: identical
    return 1 - edit_distance(a, b) / longest


def answer_hint(answer: str, model_solution: str) -> str:
    score = similarity(answer, model_solution)
    if score == 1.0:
        return "Correct"
    if score >= 0.9:
        return "Almost there: check small details like spelling or punctuation"
    if score >= 0.6:
        return "On the right track"
    return "Not quite: compare your approach with the lesson example"


if __name__ == "__main__":
    catalog = [PlanLesson("SQL indexes", 75, 9), PlanLesson("Docker", 75, 8), PlanLesson("RAG", 90, 10),
               PlanLesson("Git PRs", 50, 4), PlanLesson("Tries", 50, 3), PlanLesson("HTTP", 60, 6)]
    value, plan = weekly_plan(catalog, 240)
    print(value, [x.id for x in plan], sum(x.minutes for x in plan))
    model = "git commit -m 'fix'"
    for answer in ["git commit -m 'fix'", "git   comit -m 'fix'", "git add .", ""]:
        print(f"{answer!r:24} {similarity(answer, model):.2f}  {answer_hint(answer, model)}")

# ---- services/ai/tests/test_planning.py ----
import itertools
import random

import pytest

from devatlas_ai.planning import PlanLesson, answer_hint, edit_distance, similarity, weekly_plan


def brute_best(lessons: list[PlanLesson], budget: int) -> int:
    return max(sum(x.value for x in c) for r in range(len(lessons) + 1)
               for c in itertools.combinations(lessons, r) if sum(x.minutes for x in c) <= budget)


def test_plan_is_optimal_and_respects_budget() -> None:
    rng = random.Random(5)
    for _ in range(100):
        lessons = [PlanLesson(f"l{i}", rng.randint(10, 90), rng.randint(0, 10)) for i in range(8)]
        budget = rng.randint(0, 300)
        value, plan = weekly_plan(lessons, budget)
        assert sum(x.minutes for x in plan) <= budget
        assert value == sum(x.value for x in plan) == brute_best(lessons, budget)
        assert len(set(plan)) == len(plan)                    # each lesson at most once (0/1)


def test_plan_edge_cases() -> None:
    assert weekly_plan([], 600) == (0, [])
    assert weekly_plan([PlanLesson("long", 700, 10)], 600) == (0, [])
    one = PlanLesson("exact", 600, 3)
    assert weekly_plan([one], 600) == (3, [one])
    with pytest.raises(ValueError):
        weekly_plan([PlanLesson("bad", 0, 1)], 60)


def test_similarity_range_and_symmetry() -> None:
    rng = random.Random(9)
    for _ in range(200):
        a = "".join(rng.choice("ab c") for _ in range(rng.randint(0, 12)))
        b = "".join(rng.choice("ab c") for _ in range(rng.randint(0, 12)))
        s = similarity(a, b)
        assert 0.0 <= s <= 1.0 and s == similarity(b, a)


def test_similarity_values() -> None:
    assert similarity("", "") == 1.0
    assert similarity("abc", "") == 0.0
    assert similarity("abc", "xyz") == 0.0
    assert similarity("for x  in\\n xs:", "for x in xs:") == 1.0  # whitespace normalised
    assert similarity("kitten", "sitting") == pytest.approx(1 - 3 / 7)
    assert edit_distance("git comit", "git commit") == 1


def test_hints_and_length_limit() -> None:
    assert answer_hint("print(x)", "print(x)") == "Correct"
    assert answer_hint("git comit -m 'fix'", "git commit -m 'fix'").startswith("Almost there")
    with pytest.raises(ValueError):
        similarity("x" * 2_001, "x")` },
        output: "27 ['SQL indexes', 'Docker', 'RAG'] 240\n\"git commit -m 'fix'\"    1.00  Correct\n\"git   comit -m 'fix'\"   0.95  Almost there: check small details like spelling or punctuation\n'git add .'              0.26  Not quite: compare your approach with the lesson example\n''                       0.00  Not quite: compare your approach with the lesson example",
        pitfalls: [
          "Dividing by max(len) without handling two empty strings: ZeroDivisionError.",
          "Comparing raw code: a learner who indents with 4 spaces instead of 2 gets a low score for a correct answer.",
          "Iterating w upward over a 1D array for 0/1 knapsack: a lesson can be taken twice. The 2D table avoids that and allows reconstruction.",
        ],
      },
    },
  },
  deeper: [
    { label: "Python docs: functools.cache", url: "https://docs.python.org/3/library/functools.html#functools.cache" },
    { label: "Python docs: sys.setrecursionlimit", url: "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit" },
    { label: "Wikipedia: Dynamic programming", url: "https://en.wikipedia.org/wiki/Dynamic_programming" },
    { label: "Wikipedia: Levenshtein distance", url: "https://en.wikipedia.org/wiki/Levenshtein_distance" },
    { label: "Wikipedia: Longest increasing subsequence", url: "https://en.wikipedia.org/wiki/Longest_increasing_subsequence" },
    { label: "Wikipedia: Knapsack problem", url: "https://en.wikipedia.org/wiki/Knapsack_problem" },
  ],
  nextPreview: "Next phase: frontend. Semantic HTML and accessibility, the foundation every user interface stands on.",
};
