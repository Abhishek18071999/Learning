import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.4.1",
  title: "Greedy and backtracking",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["2.2.2 Recursion, sorting and binary search"],
  summary: "Make one locally best choice and prove it with an exchange argument, or explore a decision tree with choose / explore / un-choose and prune it. Includes interval scheduling and merging, coin-change counterexamples, jump game, N-Queens and Sudoku.",
  terms: [
    { term: "Greedy algorithm", def: "Builds a solution step by step, always taking the choice that looks best right now, and never reconsiders an earlier choice." },
    { term: "Greedy-choice property", def: "There is an optimal solution that contains the first greedy choice. If this fails, no amount of clever implementation will make the greedy algorithm correct." },
    { term: "Exchange argument", def: "A correctness proof: take any optimal solution, swap its first differing choice for the greedy one, and show the result stays feasible and no worse. Repeat down the solution." },
    { term: "Optimal substructure", def: "After a choice is fixed, what remains is the same kind of problem on a smaller input, so an optimal solution is built from optimal sub-solutions." },
    { term: "Canonical coin system", def: "A coin set for which greedy change-making is optimal for every amount, such as 1, 2, 5, 10, 20, 50. Having a 1-unit coin guarantees solvability, not canonicity." },
    { term: "Interval scheduling", def: "Select the maximum number of mutually non-overlapping intervals. Correct greedy: sort by end time and take every interval that starts at or after the last chosen end." },
    { term: "Interval merging", def: "Replace a set of intervals by their union. Sort by start time and extend the current merged interval while the next start is at or before its end." },
    { term: "Reachability frontier", def: "In the jump game, the farthest index reachable so far. Reachable indices form a contiguous prefix, which is what makes the one-pass greedy scan correct." },
    { term: "Backtracking", def: "Depth-first search over partial solutions: choose, explore recursively, then un-choose. It abandons a branch as soon as the branch cannot lead to a valid solution." },
    { term: "Decision tree", def: "Nodes are partial states and edges are choices; leaves are complete candidates. Backtracking visits this tree depth-first and uses O(depth) memory plus the output." },
    { term: "Pruning", def: "Cutting off a subtree because it is provably invalid or cannot beat the best answer found. Pruning must never discard a branch that could still contain a valid or better solution." },
    { term: "Constraint propagation", def: "Using constraints to remove choices before recursing, for example choosing the Sudoku cell with the fewest candidates (MRV) or removing a digit from its peers." },
  ],
  problem: [
    "DevAtlas offers live mentoring sessions with overlapping time slots. A learner wants to attend as many as possible, and the quiz generator must pick questions whose times sum to exactly 30 minutes while covering every required phase. The first problem has a greedy solution; the second does not.",
    "Picking the shortest session first, or the earliest-starting first, both fail on small inputs. Picking the session that **ends** earliest is provably optimal. For the quiz, there is no single local rule: you must explore combinations, but with sorting and bounds so the search finishes in milliseconds instead of hours. The skill is knowing which family you are in, and being able to prove it.",
  ],
  concept: {
    analogy: [
      "Greedy is **taking the next exit that looks closest to your destination**: fast, and correct if the road network has the right structure. The exchange argument is the proof that swapping any optimal route's next exit for yours never makes the trip longer. Without that proof, a closer exit can lead to a dead end.",
      "Backtracking is **solving a maze with a pencil**: mark the path, try a corridor, and erase the mark when it dead-ends. Pruning is reading a sign at the entrance that says the corridor is closed, so you never walk it at all.",
    ],
    precise: [
      "A greedy algorithm needs a candidate set, a feasibility rule and an ordering. At each step it takes the best feasible candidate and commits. Correctness has two obligations: the **greedy-choice property** (some optimal solution contains that choice) and **optimal substructure** (the rest is the same problem). Prove the first by exchange and the second by induction. If you cannot state the exchange, assume the algorithm is wrong until a brute-force test says otherwise.",
      "For unweighted interval scheduling, sorting by end time is optimal: replacing the first interval of any optimal schedule with the earliest-ending one cannot create an overlap, because it ends no later. For merging intervals, sort by start and sweep, extending the current right endpoint. The two problems use different sort keys and different touching rules: in scheduling, `end == start` is compatible; in merging, touching intervals usually collapse into one.",
      "Greedy fails when a local choice blocks a better global combination. With coins `[1, 3, 4]` and amount 6, greedy takes 4 and then 1 + 1 (three coins), while 3 + 3 uses two. No optimal solution contains the 4, so the greedy-choice property is false. If greedy fails but subproblems overlap, use dynamic programming; if one state **dominates** all others at the same step, greedy is a collapsed DP. Jump game is the clean example: farther reach is never worse, so one frontier replaces a table.",
      "Backtracking is the general fallback: enumerate a decision tree with choose / explore / un-choose, and prune branches that violate a constraint or cannot beat the incumbent. Subsets have 2ⁿ leaves, permutations n!, combinations C(n, k), and N-Queens at most n! column assignments after the one-queen-per-row rule. The worst case stays exponential or factorial; pruning changes the constant and often the practical exponent, not the theoretical bound.",
    ],
  },
  underTheHood: {
    text: [
      "1. **The exchange argument, step by step.** Suppose an optimal solution `O` differs from the greedy solution `G` at the first choice. Let `g` be greedy's choice and `o` be `O`'s choice at that point. Construct `O'` by replacing `o` with `g` and keeping the rest. Show three things: `g` is feasible with the already-made prefix, `g` does not conflict with the remaining choices of `O`, and the objective of `O'` is at least as good as `O`. Then `O'` is optimal and agrees with `G` one step longer. Induct. For interval scheduling, `g` ends no later than `o`, so every interval that started after `o` also starts after `g`; replacing cannot hurt.",
      "2. **Interval scheduling in detail.** Sort by end ascending. Keep `last_end`; accept an interval when `start >= last_end`. Earliest end is the only safe key. Earliest start fails on `(0, 100), (1, 2), (3, 4)`: it takes the 100-minute block and returns one interval, while the other two are compatible. Shortest-first fails on `(0, 6), (5, 7), (6, 12)`: it takes the 2-minute middle interval, which blocks both six-minute intervals. Ties on end time are harmless; any tie-break yields the same maximum count. Cost is O(n log n) for the sort and O(n) for the scan.",
      "3. **Merging intervals is a sweep, not a selection.** Sort by start ascending and keep the output's last interval. If the next start is `<=` the last end, replace the last end with the maximum of the two ends; otherwise append. After sorting, overlapping intervals form contiguous runs, so one pass captures the whole union. `(1, 3), (2, 6)` becomes `(1, 6)`; `(15, 18), (17, 20)` becomes `(15, 20)`. Touching intervals such as `(1, 3), (3, 5)` merge under `<=`; whether that is desired depends on whether the endpoint is inclusive. Cost O(n log n). Adding weights to interval scheduling breaks the greedy proof: a single heavy long interval may beat many short ones, and the correct solution is DP over sorted intervals with a binary-search predecessor.",
      "4. **Coin change: the counterexample and the DP.** Greedy sorts coins descending and repeatedly takes the largest that fits. On `[1, 3, 4]` and amount 6 it returns `[4, 1, 1]`; the optimum is `[3, 3]`. The failure is structural: choosing 4 leaves a remainder of 2 that only 1s can fill, and no optimal solution uses 4 at all. A coin system is canonical when greedy is optimal for every amount; many real currencies are, arbitrary sets are not. The DP is `dp[a] = 1 + min(dp[a - c])` over coins `c <= a`, with `dp[0] = 0`, O(amount × number of coins) time and O(amount) space. That is pseudo-polynomial: it depends on the numeric amount, not just the number of coins.",
      "5. **Jump game: greedy as a collapsed DP.** For `can_jump`, track the farthest reachable index. If the current index is beyond it, there is a gap and the answer is false; otherwise extend the frontier with `i + nums[i]`. This works because reachable indices form a prefix: if index `r` is reachable, every index below `r` is reachable by landing earlier on the same jump. For `min_jumps`, process the array in BFS layers: the current layer is every index reachable in `k` jumps, and the next frontier is the farthest reach from the whole layer. Keeping only the farthest is safe because a position reached with the same or fewer jumps and a farther reach dominates a nearer one. A naive rule that always lands on the farthest reachable index is not safe: on `[3, 10, 0, 0, 0]`, jumping to index 3 lands on a zero and gets stuck, while landing on index 1 reaches the end in two jumps. The layer greedy is O(n) time and O(1) space; the O(n²) DP is the table it collapses.",
      "6. **Backtracking mechanics.** A backtracking function receives a partial state, checks whether it is complete, and otherwise iterates over candidates. For each candidate it tests feasibility, applies the choice, recurses, then undoes exactly what it changed. The recursion stack is the path; memory is O(depth) plus whatever results you store. Two rules prevent most bugs: record `path.copy()` rather than the mutable path, and make undo the exact inverse of apply. Pruning is a separate correctness claim: a branch may be cut only when it is invalid or when a bound proves it cannot beat the incumbent. `break` is valid only when the candidate list is sorted so that every later candidate is also infeasible.",
      "7. **Counting the search space.** Every subset is an include/exclude decision at each of n positions: 2ⁿ leaves. Every permutation chooses one of the remaining items at each depth: n! leaves, and a `used` array or swap-based partition enforces that. Combinations choose a start index so order is fixed: C(n, k) leaves, and the prune `len(items) - i < k - len(path)` stops when too few items remain. Duplicates need extra care: sort the input and skip a repeated value when its predecessor was not used, or count multiplicities. The cost of enumeration is output-sensitive: even if each leaf costs O(1), printing all n! permutations is already Ω(n · n!) characters.",
      "8. **N-Queens and Sudoku are constraint problems.** N-Queens places one queen per row, tracks occupied columns and the two diagonals (`row - col` and `row + col`), and prunes attacked squares before recursing. The unpruned row-by-row tree has 8⁸ = 16,777,216 assignments for n = 8; column distinctness alone reduces it to 8! = 40,320, and diagonal pruning reduced our measured run to 2,057 recursive calls for 92 solutions. Sudoku adds all-different constraints for rows, columns and 3×3 boxes. Choosing the empty cell with the fewest candidates (MRV) and updating peer domains (forward checking) detects contradictions earlier. Generalized Sudoku is NP-complete; the standard 9×9 board is small, but a solver is still a search. When constraints grow, hand-written backtracking gives way to CP-SAT, SAT or MIP solvers that use the same choose / propagate / backtrack loop with much stronger pruning.",
    ],
    diagram: {
      title: "The backtracking loop",
      nodes: [
        { label: "State", sub: "path + constraints" },
        { label: "Complete?", sub: "leaf reached" },
        { label: "Candidates", sub: "ordered, filtered" },
        { label: "Feasible?", sub: "constraint + bound" },
        { label: "Choose / recurse / undo", sub: "restore exactly" },
      ],
      edges: ["if yes → record", "else → next candidate", "reject → prune", "accept → deeper"],
      caption: "Depth-first: every accepted edge is later undone. Pruning removes whole subtrees, but the worst case is still the size of the decision tree.",
    },
  },
  handsOn: [
    {
      title: "Greedy on intervals: schedule, then merge",
      text: [
        "The first function is activity selection: sort by **end** and take everything compatible. The second is interval merging: sort by **start** and extend the current union. They look similar and use opposite keys, which is exactly the kind of detail an interviewer probes.",
      ],
      code: {
        lang: "python",
        file: "intervals.py",
        code: `def max_sessions(sessions: list[tuple[int, int]]) -> list[tuple[int, int]]:
    chosen, last_end = [], float("-inf")
    for start, end in sorted(sessions, key=lambda s: s[1]):    # earliest END first
        if start >= last_end:
            chosen.append((start, end))
            last_end = end
    return chosen

def merge(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for start, end in sorted(intervals):                      # earliest START first
        if out and start <= out[-1][1]:
            out[-1] = (out[-1][0], max(out[-1][1], end))
        else:
            out.append((start, end))
    return out

slots = [(540, 600), (550, 560), (560, 570), (600, 660), (565, 700), (660, 720)]
print(max_sessions(slots))
print(merge([(1, 3), (2, 6), (8, 10), (15, 18), (17, 20)]))`,
      },
      output: "[(550, 560), (560, 570), (600, 660), (660, 720)]\n[(1, 6), (8, 10), (15, 20)]",
      notes: [
        "The schedule output is unchanged from the earlier version. Touching sessions `(560, 570)` and `(600, 660)` are compatible because `start >= last_end`; the merged intervals use `start <= end` and therefore collapse touching ranges such as `(1, 3), (3, 5)`.",
        "Why earliest end wins: take any optimal schedule and replace its first interval with the earliest-ending one. The replacement ends no later, so it cannot conflict with the rest; induct on the remaining intervals. That is the exchange argument in one paragraph.",
        "Why earliest start loses on `(0, 100), (1, 2), (3, 4)`: it picks the long block first and returns one interval instead of two. Why shortest-first loses on `(0, 6), (5, 7), (6, 12)`: it picks the 2-minute middle interval, which blocks both six-minute intervals.",
      ],
    },
    {
      title: "When greedy fails: coins, and when it is DP in disguise: jump game",
      text: [
        "Both snippets run. The coin example is the smallest useful greedy counterexample: the local choice is not part of any optimal solution. The jump-game functions show the other side: a correct greedy can be a DP in which one state dominates the others.",
      ],
      code: {
        lang: "python",
        file: "coins_jump.py",
        code: `def greedy_coins(amount: int, coins: list[int]) -> list[int]:
    used: list[int] = []
    for c in sorted(coins, reverse=True):
        while amount >= c:
            amount -= c
            used.append(c)
    return used if amount == 0 else []

def dp_coins(amount: int, coins: list[int]) -> int:
    best = [0] + [float("inf")] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                best[a] = min(best[a], best[a - c] + 1)
    return -1 if best[amount] == float("inf") else int(best[amount])

print(greedy_coins(30, [1, 2, 5, 10, 20]))
print(greedy_coins(6, [1, 3, 4]))
print("optimal for 6:", dp_coins(6, [1, 3, 4]), "coins")

def can_jump(nums: list[int]) -> bool:
    reach = 0
    for i, step in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + step)
    return True

def min_jumps(nums: list[int]) -> int:
    jumps = end = farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == end:
            jumps += 1
            end = farthest
    return jumps

print("can_jump:", can_jump([2, 3, 1, 1, 4]), can_jump([3, 2, 1, 0, 4]))
print("min_jumps:", min_jumps([2, 3, 1, 1, 4]), min_jumps([2, 3, 0, 1, 4]))`,
      },
      output: "[20, 10]\n[4, 1, 1]\noptimal for 6: 2 coins\ncan_jump: True False\nmin_jumps: 2 2",
      notes: [
        "The first two lines are the original verified output. The third line adds the DP answer: 3 + 3 uses two coins, so greedy's three coins are not optimal. For `[1, 2, 5, 10, 20]` greedy is optimal because that system is canonical.",
        "Why greedy fails here: after taking 4, the remaining 2 can only be made from 1s, so the choice forces a bad remainder. The greedy-choice property says some optimal solution contains 4; for amount 6 that is false.",
        "`can_jump` is O(n) and O(1): reachable indices form a prefix, so a gap at `i > reach` is fatal. `min_jumps` is a BFS in layers; keeping only the farthest reach of the current layer is safe because it dominates every nearer position. The naive rule 'always land on the farthest index you can reach' is wrong: on `[3, 10, 0, 0, 0]` it lands on the zero at index 3, while landing on index 1 reaches the end in two jumps.",
        "Timings vary by machine; these are counts and values, not timing claims.",
      ],
    },
    {
      title: "Backtracking: enumerate, prune, and count",
      text: [
        "This is the same choose / explore / un-choose skeleton three times: exact-time quiz combinations with an early `break`, permutations with a `used` array, and N-Queens with column and diagonal sets. The last two lines count the search space and the pruning effect.",
      ],
      code: {
        lang: "python",
        file: "backtracking.py",
        code: `def exact_time(questions: list[tuple[str, int]], target: int) -> list[list[str]]:
    questions = sorted(questions, key=lambda q: q[1])          # sorting enables pruning
    results: list[list[str]] = []
    chosen: list[str] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            results.append(chosen.copy())                      # copy, never the shared list
            return
        for i in range(start, len(questions)):
            name, minutes = questions[i]
            if minutes > remaining:
                break                                         # prune: later ones are longer
            chosen.append(name)                               # choose
            backtrack(i + 1, remaining - minutes)             # explore
            chosen.pop()                                      # un-choose

    backtrack(0, target)
    return results

qs = [("sql", 10), ("git", 5), ("docker", 15), ("rag", 20), ("http", 5), ("dsa", 10)]
for combo in exact_time(qs, 30):
    print(combo)

def permutations(items: list[str]):
    out, path = [], []
    used = [False] * len(items)
    def bt() -> None:
        if len(path) == len(items):
            out.append(path.copy()); return
        for i, x in enumerate(items):
            if not used[i]:
                used[i] = True; path.append(x)
                bt()
                path.pop(); used[i] = False
    bt()
    return out

def n_queens(n: int) -> tuple[int, int]:
    cols, diag1, diag2 = set(), set(), set()
    calls = 0
    def place(row: int) -> int:
        nonlocal calls
        calls += 1
        if row == n:
            return 1
        count = 0
        for c in range(n):
            if c in cols or row - c in diag1 or row + c in diag2:
                continue                                      # prune attacked squares
            cols.add(c); diag1.add(row - c); diag2.add(row + c)
            count += place(row + 1)
            cols.remove(c); diag1.remove(row - c); diag2.remove(row + c)
        return count
    return place(0), calls

solutions_8, calls_8 = n_queens(8)
print(len(permutations(["a", "b", "c", "d"])), solutions_8)

def subsets(items: list[str]) -> list[list[str]]:
    out, path = [], []
    def bt(i: int) -> None:
        if i == len(items):
            out.append(path.copy()); return
        bt(i + 1)                                             # exclude
        path.append(items[i]); bt(i + 1); path.pop()          # include
    bt(0)
    return out

def combinations(items: list[str], k: int) -> list[list[str]]:
    out, path = [], []
    def bt(start: int) -> None:
        if len(path) == k:
            out.append(path.copy()); return
        for i in range(start, len(items)):
            if len(items) - i < k - len(path):
                break                                         # not enough left
            path.append(items[i]); bt(i + 1); path.pop()
    bt(0)
    return out

print("subsets(4):", len(subsets(list("abcd"))))
print("permutations(7):", len(permutations(list("abcdefg"))))
print("C(10,3):", len(combinations(list("abcdefghij"), 3)))
print("n-queens solutions:", [n_queens(n)[0] for n in range(1, 9)])
print("n=8 search nodes:", calls_8)`,
      },
      output: "['git', 'http', 'sql', 'dsa']\n['git', 'http', 'rag']\n['git', 'sql', 'docker']\n['git', 'dsa', 'docker']\n['http', 'sql', 'docker']\n['http', 'dsa', 'docker']\n['sql', 'rag']\n['dsa', 'rag']\n24 92\nsubsets(4): 16\npermutations(7): 5040\nC(10,3): 120\nn-queens solutions: [1, 0, 0, 2, 10, 4, 40, 92]\nn=8 search nodes: 2057",
      notes: [
        "The quiz combinations and the `24 92` line are unchanged from the earlier version. The extra lines make the search-space sizes concrete: 2⁴ = 16 subsets, 7! = 5,040 permutations, C(10, 3) = 120, and the classic N-Queens solution counts 1, 0, 0, 2, 10, 4, 40, 92 for n = 1 to 8.",
        "The `break` in `exact_time` is only valid because the list is sorted by minutes. The prune in `combinations` is only valid because `start` fixes order and later items cannot add missing slots. A prune that is not proven is a bug, not an optimisation.",
        "Each `choose` has an exact `un-choose`: `append`/`pop` for the path, `True`/`False` for `used`, `add`/`remove` for the three queen sets. Missing one leaves state from a previous branch and produces wrong answers that look random.",
        "N-Queens node counts depend on row order, column order and the pruning rules, so 2,057 is the count for this implementation, not a universal constant. Timing varies by machine; these counts are deterministic.",
      ],
    },
    {
      title: "Compare the three families",
      text: [
        "Use this table when a problem statement gives you a choice. The first question is not 'which is fastest' but 'what structure does the problem have'.",
      ],
      code: {
        lang: "text",
        file: "comparison.txt",
        code: `                     greedy                       backtracking                    dynamic programming
question             one local choice?            which sequence of choices?      overlapping subproblems?
explores             one path                     decision tree, depth-first       all states, table or memo
proof                exchange argument            completeness + sound pruning    recurrence + base case
typical time         O(n log n)                   O(b^d), output-sensitive         O(states x transitions)
memory               O(1) to O(n)                 O(depth) + stored output         O(states)
pruning              none: it commits             constraints and bounds           none: it fills the table
fails when           no greedy-choice property    tree too large                   state space too large
canonical example    interval scheduling          N-Queens, Sudoku                 coin change, weighted intervals
decision rule        can you prove the swap?      must you enumerate?              do states repeat?`,
      },
      notes: [
        "The families are not exclusive. Greedy is a DP where one state dominates all others; backtracking becomes DP when the same state is reached by different paths and can be cached (memoisation).",
        "A useful test order: try greedy with a proof and a brute-force check; if it fails, write the recurrence and see whether states overlap; if the answer must list solutions or the constraints are irregular, backtrack with pruning.",
      ],
    },
    {
      title: "Draw the backtracking loop",
      text: [
        "The diagram is the contract every backtracking function should satisfy. The loop edge from un-choose back to candidates is the part beginners forget.",
      ],
      code: {
        lang: "mermaid",
        file: "backtracking.mmd",
        code: `flowchart TD
  S["State: path + constraints"] --> C{"Complete?"}
  C -- yes --> R["Record path.copy()"]
  C -- no --> L["For each candidate in order"]
  L --> V{"Feasible and within bound?"}
  V -- no --> P["Prune this subtree"]
  V -- yes --> A["Choose: apply candidate"]
  A --> E["Explore: recurse"]
  E --> U["Un-choose: undo exactly"]
  U --> L
  R --> X["Return to caller"]
  P --> L`,
      },
      notes: [
        "Every cycle through choose → recurse → undo must restore the state that existed before the choice. If you record at a leaf, copy the path; otherwise every recorded answer points at the same mutable list.",
        "The 'within bound' test is for optimisation problems: if the partial cost already exceeds the best known, no completion can win. For pure feasibility, the constraint test alone is enough.",
      ],
    },
  ],
  companies: [
    "**Scheduling and calendaring (illustrative):** calendar products, meeting-room booking and ad-slot allocation all solve interval-selection or interval-partitioning problems. The unweighted versions use earliest-end greedy; the weighted versions switch to DP because one long, valuable interval can beat several short ones.",
    "**Compression and network design (illustrative):** Huffman coding, used in DEFLATE, JPEG and MP3, builds an optimal prefix code by repeatedly merging the two least frequent symbols, an exchange-argument greedy. Kruskal and Prim build minimum spanning trees for network planning; both are greedy with a proof, not heuristics.",
    "**Navigation and routing (illustrative):** Dijkstra's algorithm and A* settle the closest unsettled node first. They are label-setting greedy algorithms whose correctness depends on non-negative edge weights (and, for A*, an admissible heuristic). Negative edges break the greedy assumption and require Bellman-Ford.",
    "**Constraint solving and operations research (illustrative):** timetabling, rostering, packing and configuration validation are solved with backtracking search plus propagation. Google OR-Tools CP-SAT, SAT solvers and MIP solvers use the same choose / propagate / backtrack core, with clause learning and strong bounds that hand-written code rarely matches.",
    "**Regex engines and parsers (illustrative):** backtracking regex engines such as Python's `re` can take exponential time on patterns like `(a+)+$`. Engines built on finite automata (RE2, Rust's regex) guarantee linear time by giving up backreferences. Choosing the engine is choosing the search strategy, and the wrong choice is a denial-of-service risk.",
  ],
  mistakes: [
    { mistake: "Assuming a greedy algorithm is correct because it passes the examples", why: "Small examples rarely expose the blocking choice", wrong: "Production answers are wrong on inputs nobody tested", fix: "Write a brute-force oracle for small n and run randomised comparisons; if you cannot state an exchange argument, treat the greedy as unproven" },
    { mistake: "Sorting activity selection by start time or duration", why: "Both keys look plausible and pass many examples", wrong: "Earliest start takes (0, 100) instead of (1, 2) and (3, 4); shortest-first takes (5, 7) instead of (0, 6) and (6, 12)", fix: "Sort by end time and accept when start >= last_end" },
    { mistake: "Using greedy coin change for an arbitrary coin set", why: "It works for common currencies", wrong: "Amount 6 with coins [1, 3, 4] returns three coins [4, 1, 1] instead of two [3, 3]", fix: "Use DP unless the coin system is known to be canonical, or prove the greedy-choice property" },
    { mistake: "In jump game, always landing on the farthest index you can reach", why: "It feels like the obvious greedy", wrong: "On [3, 10, 0, 0, 0] it lands on the zero at index 3 and reports failure, while landing on index 1 reaches the end", fix: "Track the farthest reach of the whole current BFS layer, not a single landing index" },
    { mistake: "Forgetting to undo a choice", why: "The happy path returns early or the bug appears only after a failed branch", wrong: "State leaks between branches; results are missing or duplicated in ways that look random", fix: "Pair every mutation with its exact inverse, or pass immutable copies for small state" },
    { mistake: "Appending the shared path list to results", why: "results.append(path) looks natural", wrong: "Every recorded answer is the same list object, and after unwinding it is empty", fix: "Append path.copy() or list(path) at the moment the answer is complete" },
    { mistake: "Pruning with an unproven rule", why: "It makes the search faster on the test input", wrong: "Valid solutions disappear, or a `break` skips candidates that were still feasible because the list was not sorted the way the prune assumed", fix: "Prove the prune preserves completeness; sort explicitly and only then break" },
    { mistake: "Enumerating permutations or combinations with duplicates", why: "The input contains repeated values", wrong: "The output repeats answers and the search does extra factorial work", fix: "Sort, then skip a value when its predecessor is equal and unused; or count multiplicities and recurse on distinct values" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Keep a brute-force solver for small inputs and compare it with your greedy or pruned search on many random cases. The oracle is cheap and catches the counterexample you did not imagine." },
    { tag: "Performance", text: "Sort the candidates so that the most constrained or most promising choices come first, and prune on both constraints (invalid) and bounds (cannot beat the incumbent)." },
    { tag: "Maintainability", text: "Make choose and un-choose visibly symmetric, and state the invariant each one preserves. A reviewer should be able to check that every mutation is undone." },
    { tag: "Performance", text: "Enumerate with indices and one shared path instead of copying state at every node. Copy only when recording an answer, and measure the node count rather than guessing." },
    { tag: "Cost", text: "Treat exponential worst cases as a budget decision: cap the input, add a node or time limit, or hand the model to a CP/SAT/MIP solver when the business problem is large." },
  ],
  interview: [
    { q: "How do you prove a greedy algorithm correct, and how do you show one is wrong?", a: "State the greedy-choice property and prove it by exchange. Take an optimal solution O that differs from greedy G at the first choice. Let g be greedy's choice and o be O's. Build O' by replacing o with g. Show g is feasible with the prefix, does not conflict with the rest (for interval scheduling this follows because g ends no later than o), and does not worsen the objective. Then O' is optimal and agrees with G one step longer; induct. Optimal substructure handles the remainder. To show greedy is wrong, give a concrete counterexample and explain which optimal solution it excludes: coins [1, 3, 4] and amount 6, where greedy takes 4 + 1 + 1 but 3 + 3 is optimal, so no optimal solution contains the 4. Also name a nearby problem where the greedy genuinely fails even though it looks similar: weighted interval scheduling needs DP, because one heavy interval can beat many light ones." },
    { q: "Explain backtracking for permutations and N-Queens. How do you prune, and what is the complexity?", a: "Use the same choose / explore / un-choose loop. For permutations, keep a path and a used array; at each depth try every unused item, mark it, recurse, then unmark and pop. For N-Queens, place one queen per row, and keep sets for occupied columns, row - col diagonals and row + col diagonals; a square is feasible exactly when none of the three contains it. Add the queen to all three, recurse to the next row, then remove it. Pruning happens before the recursive call, so an attacked square never becomes a node. Record path.copy() at a leaf. The worst case is n! permutations and at most n! column-distinct queen placements (nⁿ if you ignore column distinctness); memory is O(n) recursion plus the output. For n = 8 there are 92 solutions, and our pruned run made 2,057 recursive calls. N-Queens is a constraint problem: stronger propagation, such as choosing the most constrained row or maintaining domains, cuts the tree further." },
    { q: "Greedy, dynamic programming or backtracking: how do you choose?", a: "First ask whether a local choice can be proved safe. If yes and one state dominates the alternatives, greedy is the cheapest: interval scheduling by earliest end, Huffman, Dijkstra, jump-game reach. If the greedy-choice property fails but subproblems overlap, use DP: coin change, weighted interval scheduling, subset sum. If states do not overlap, or the task is to enumerate every solution, or the constraints are irregular, use backtracking with pruning; N-Queens and Sudoku are the standard examples. The boundaries move: greedy is a DP with one surviving state per step, and backtracking plus memoisation becomes DP. Complexity is the tie-breaker: greedy is usually O(n log n), DP is polynomial in the state space (pseudo-polynomial for coin change), and backtracking is exponential or factorial in the worst case even when pruning makes typical inputs fast." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "To attend the maximum number of non-overlapping meetings, sort by:",
      options: ["Start time", "Duration", "End time", "Number of attendees"],
      answer: 2,
      explanation: "Earliest end leaves the most room for the remaining meetings. Earliest start and shortest duration both have counterexamples.",
    },
    {
      kind: "output",
      prompt: "`greedy_coins(6, [1, 3, 4])` returns `[4, 1, 1]`. What is the minimum number of coins?",
      options: ["1", "2", "3", "4"],
      answer: 1,
      explanation: "3 + 3 uses two coins. Greedy is not optimal for this coin system, so the DP answer is 2.",
    },
    {
      kind: "bug",
      prompt: "Every recorded result is empty. What is the bug?",
      code: { lang: "python", code: "def bt(i):\n    if i == len(items):\n        results.append(path)\n        return\n    path.append(items[i]); bt(i + 1); path.pop()\n    bt(i + 1)" },
      options: ["The base case is wrong", "results stores the same list object, which ends empty", "pop removes the wrong element", "Recursion depth is exceeded"],
      answer: 1,
      explanation: "Append path.copy() (or list(path)) at the base case. The shared list is mutated after it is appended.",
    },
  ],
  cheatSheet: [
    "Greedy: one best local choice, then prove it with an exchange argument or find a counterexample.",
    "Activity selection sorts by END; interval merging sorts by START. Touching is compatible in scheduling and merges in merging.",
    "Coin greedy is safe only for canonical systems; [1, 3, 4] with 6 gives [4, 1, 1] instead of [3, 3].",
    "Jump game: reachable indices form a prefix; min jumps is BFS by layers, keeping the farthest reach per layer.",
    "Greedy is a collapsed DP: when one state dominates the others, keep only that state; otherwise keep the table.",
    "Backtracking: if complete record a copy; else for each candidate: valid? choose, explore, un-choose.",
    "Subsets 2ⁿ, permutations n!, combinations C(n, k); N-Queens at most n! after one-per-row.",
    "Prune only with constraints or proven bounds; `break` needs a sorted candidate list.",
    "Undo exactly what you changed; pair every add with remove and every append with pop.",
    "Worst case stays exponential: count nodes, set a budget, and use OR-Tools or a SAT solver for real CSPs.",
  ],
  homework: {
    basic: {
      title: "Minimum rooms needed",
      brief: ["Given mentoring sessions (start, end), return the minimum number of rooms so no two overlapping sessions share a room. Treat touching intervals (end == start) as non-overlapping."],
      criteria: ["O(n log n)", "Handles touching intervals correctly", "Tests, including an empty input"],
      hints: ["Sort by start; keep a min-heap of end times of rooms in use.", "If the earliest-ending room is free by this start, reuse it."],
      solution: {
        text: [
          "Sort sessions by start. Keep a min-heap of the end times of rooms currently in use. If the earliest end is `<= start`, that room is free: replace its end with the new end. Otherwise open a new room. The heap size is the answer.",
          "Touching intervals are compatible because the test is `ends[0] <= start`. The alternative is a sweep line: create `(start, +1)` and `(end, -1)` events, sort with ends before starts at equal times, and track the running maximum. Both approaches are O(n log n).",
        ],
        code: {
          lang: "python",
          code: `import heapq

def rooms_needed(sessions: list[tuple[int, int]]) -> int:
    ends: list[int] = []
    for start, end in sorted(sessions):
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)
        else:
            heapq.heappush(ends, end)
    return len(ends)

print(rooms_needed([(0, 30), (5, 10), (15, 20)]))
print(rooms_needed([(1, 5), (5, 10)]))
print(rooms_needed([(9, 10), (9, 11), (10, 12), (11, 13)]))
print(rooms_needed([]))`,
        },
        output: "2\n1\n2\n0",
      },
    },
    intermediate: {
      title: "Generate valid parentheses",
      brief: ["Generate all strings of n pairs of balanced parentheses (n = 3 gives 5 strings) using backtracking with pruning, never generating an invalid prefix. Verify the Catalan counts 1, 2, 5, 14, 42."],
      criteria: ["Never builds an invalid prefix", "Correct count for n = 1 to 5", "Explains why the two conditions are sufficient"],
      hints: ["Add '(' if opens < n; add ')' if closes < opens.", "Both conditions keep every prefix valid, so no separate validation is needed."],
      solution: {
        text: [
          "The two conditions are the pruning: you may open while `opens < n`, and close only while `closes < opens`. Every partial string is therefore a valid prefix, and every leaf has length 2n and is balanced. The number of leaves is the nth Catalan number.",
          "The same skeleton generates combinations (start index) and permutations (used array); the difference is only what counts as a candidate and what keeps the prefix valid.",
        ],
        code: {
          lang: "python",
          code: `def parens(n: int) -> list[str]:
    out: list[str] = []
    def bt(s: str, opens: int, closes: int) -> None:
        if len(s) == 2 * n:
            out.append(s); return
        if opens < n:
            bt(s + "(", opens + 1, closes)
        if closes < opens:
            bt(s + ")", opens, closes + 1)
    bt("", 0, 0)
    return out

print(parens(3))
print([len(parens(k)) for k in range(1, 6)])`,
        },
        output: "['((()))', '(()())', '(())()', '()(())', '()()()']\n[1, 2, 5, 14, 42]",
        pitfalls: ["Allowing a close before an open, then filtering invalid strings afterwards", "Building strings by mutation without undoing, which corrupts sibling branches"],
      },
    },
    challenge: {
      title: "Sudoku solver with MRV",
      brief: ["Write a Sudoku solver with backtracking. Then add the 'most constrained cell first' heuristic (pick the empty cell with the fewest candidates) and record the node count on a hard puzzle. Compare it with a fixed row-major order if you have time."],
      criteria: ["Correct solution for a known puzzle", "MRV implemented", "Node count recorded, with timing noted as machine-dependent", "State is fully restored when a guess fails"],
      hints: ["Track used digits per row, column and box in sets for O(1) checks.", "Pop the chosen empty cell, recurse, and insert it back on failure."],
      solution: {
        text: [
          "The sets `rows`, `cols` and `boxes` make candidate computation and conflict checks O(1) per cell. `empty` holds the unresolved coordinates. At each call, MRV picks the cell with the smallest candidate set, which detects contradictions much sooner than scanning row by row. On failure the guess is removed and the cell is put back into `empty`.",
          "The 52-node result is for this puzzle and this implementation; node counts change with the puzzle, candidate order and propagation strength. Timing varies by machine, so compare counts on the same machine rather than absolute milliseconds.",
          "Generalized Sudoku is NP-complete. For production scheduling or timetabling, the same loop with stronger propagation is what CP-SAT does; use a solver when the constraints stop fitting in your head.",
        ],
        code: {
          lang: "python",
          code: `def solve(board: list[list[int]]) -> bool:
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empty = []
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v:
                rows[r].add(v); cols[c].add(v); boxes[r // 3 * 3 + c // 3].add(v)
            else:
                empty.append((r, c))

    def candidates(r: int, c: int) -> set[int]:
        return set(range(1, 10)) - rows[r] - cols[c] - boxes[r // 3 * 3 + c // 3]

    nodes = 0
    def bt() -> bool:
        nonlocal nodes
        nodes += 1
        if not empty:
            return True
        i = min(range(len(empty)), key=lambda k: len(candidates(*empty[k])))  # MRV
        r, c = empty.pop(i)
        b = r // 3 * 3 + c // 3
        for v in candidates(r, c):
            board[r][c] = v; rows[r].add(v); cols[c].add(v); boxes[b].add(v)
            if bt():
                return True
            board[r][c] = 0; rows[r].remove(v); cols[c].remove(v); boxes[b].remove(v)
        empty.insert(i, (r, c))
        return False

    ok = bt()
    print("solved:", ok, "nodes:", nodes)
    return ok

puzzle = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
]
solve(puzzle)
print(" ".join("".join(map(str, row)) for row in puzzle[:3]))`,
        },
        output: "solved: True nodes: 52\n534678912 672195348 198342567",
        pitfalls: ["Forgetting to reinsert the popped cell into `empty` on failure", "Removing a digit from a set that never contained it, which hides the real bug", "Comparing timings across machines instead of node counts"],
      },
    },
    capstone: {
      title: "DevAtlas: balanced quiz builder",
      brief: ["Add `build_quiz(questions, minutes, min_per_phase)` to the AI service: pick questions whose total time equals `minutes` and that cover each required phase at least once. Use backtracking with pruning and return the first valid quiz (or None)."],
      criteria: ["Pruning on time and remaining coverage", "Deterministic output (sorted input)", "Completes within 100 ms on 200 questions in tests"],
      hints: ["Prune when remaining time cannot cover the phases still missing."],
      solution: {
        text: [
          "`build_quiz` sorts questions by (minutes, id), so the search order, and therefore the first quiz found, is the same whatever order the bank arrives in. It is the choose / explore / un-choose template from the lesson with four prunes: time (stop the loop when a question no longer fits, valid because the list is sorted); coverage (enough questions of each missing phase must remain, and the time left must fit the cheapest questions still needed per phase); reachability (bit t of `reach[i]` is set when some subset of the remaining questions sums to t, built with one big-integer shift per question); and a cache of dead states (index, time left, still-needed counts) that already failed.",
          "The worst case is still exponential, since this is a subset-sum variant with extra constraints, but the 200-question tests finish well under the 100 ms limit, including impossible cases such as an odd target when every question has an even length, which the reachability check rejects at once. A brute-force test over every subset of 40 small banks checks that the search finds a quiz exactly when one exists.",
          "`min_per_phase` maps a phase to its minimum number of questions, so {\"ai\": 1, \"dsa\": 1} means at least one of each. For bigger banks or more rules (difficulty mix, no repeats across weeks), switch to a solver such as OR-Tools CP-SAT. Run from services/ai: `python -m devatlas_ai.quiz_builder` prints the output below, `pytest` runs the tests.",
        ],
        code: { lang: "python", file: "services/ai/devatlas_ai/quiz_builder.py", code: `"""Balanced quiz builder: exact total time + phase coverage, by backtracking with pruning."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: str
    phase: str
    minutes: int


def build_quiz(questions: list[Question], minutes: int,
               min_per_phase: dict[str, int]) -> list[Question] | None:
    """First quiz (in sorted order) whose minutes sum to \`minutes\` and that has at least
    min_per_phase[p] questions from each phase p. None if impossible.

    Worst case exponential (it is a subset-sum variant), but pruning keeps real inputs fast:
      1. time: questions are sorted by minutes, so stop the loop once one does not fit;
      2. coverage: the time left must fit the cheapest questions still needed per phase,
         and enough questions of each missing phase must remain after index i;
      3. reachability: reach[i] is a bitmask of every total some subset of qs[i:] can make,
         so a branch stops at once if \`left\` is not reachable at all (e.g. odd target, even times);
      4. dead states: (index, time left, still-needed counts) that already failed are skipped.
    """
    if minutes <= 0 or any(m < 0 for m in min_per_phase.values()):
        raise ValueError("minutes must be > 0 and phase minimums >= 0")
    qs = sorted(questions, key=lambda q: (q.minutes, q.id))      # deterministic order
    phases = sorted(p for p, m in min_per_phase.items() if m > 0)
    n = len(qs)
    # remaining[i][j] = how many questions of phases[j] exist in qs[i:]
    remaining = [[0] * len(phases) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        remaining[i] = remaining[i + 1].copy()
        if qs[i].phase in phases:
            remaining[i][phases.index(qs[i].phase)] += 1
    # cheapest[j][c] = minutes of the c cheapest questions of phases[j] (lower bound for coverage)
    cheapest: list[list[int]] = []
    for p in phases:
        prefix = [0]
        for q in qs:
            if q.phase == p:
                prefix.append(prefix[-1] + q.minutes)
        cheapest.append(prefix)

    full = (1 << (minutes + 1)) - 1
    reach = [1] * (n + 1)                                          # bit t set = total t possible
    for i in range(n - 1, -1, -1):
        reach[i] = (reach[i + 1] | (reach[i + 1] << qs[i].minutes)) & full

    chosen: list[Question] = []
    dead: set[tuple[int, int, tuple[int, ...]]] = set()

    def backtrack(start: int, left: int, need: tuple[int, ...]) -> bool:
        if left == 0:
            return not any(need)
        state = (start, left, need)
        if state in dead or not (reach[start] >> left) & 1:
            return False
        for j, c in enumerate(need):                               # coverage pruning
            if c > remaining[start][j]:
                dead.add(state)
                return False
        if sum(cheapest[j][c] for j, c in enumerate(need)) > left:
            dead.add(state)
            return False
        for i in range(start, n):
            q = qs[i]
            if q.minutes > left:
                break                                              # time pruning: sorted
            if q.minutes == 0:
                continue
            j = phases.index(q.phase) if q.phase in phases else -1
            next_need = need if j < 0 or need[j] == 0 else need[:j] + (need[j] - 1,) + need[j + 1:]
            chosen.append(q)                                       # choose
            if backtrack(i + 1, left - q.minutes, next_need):      # explore
                return True
            chosen.pop()                                           # un-choose
        dead.add(state)
        return False

    start_need = tuple(min_per_phase[p] for p in phases)
    return chosen.copy() if backtrack(0, minutes, start_need) else None


if __name__ == "__main__":
    bank = [Question("sql-1", "data", 10), Question("git-1", "tools", 5), Question("docker-1", "tools", 15),
            Question("rag-1", "ai", 20), Question("http-1", "web", 5), Question("dsa-1", "dsa", 10)]
    quiz = build_quiz(bank, 30, {"ai": 1, "dsa": 1})
    print([q.id for q in quiz] if quiz else None)
    print(build_quiz(bank, 30, {"ai": 1, "data": 1, "dsa": 1}))

# ---- services/ai/tests/test_quiz_builder.py ----
import itertools
import random
import time

import pytest

from devatlas_ai.quiz_builder import Question, build_quiz

PHASES = ["dsa", "web", "data", "ai", "ops"]


def valid(quiz: list[Question], minutes: int, need: dict[str, int]) -> bool:
    return (sum(q.minutes for q in quiz) == minutes and len({q.id for q in quiz}) == len(quiz)
            and all(sum(q.phase == p for q in quiz) >= c for p, c in need.items()))


def bank(n: int, seed: int) -> list[Question]:
    rng = random.Random(seed)
    return [Question(f"q{i:03}", rng.choice(PHASES), rng.randint(2, 15)) for i in range(n)]


def test_small_example_and_impossible_coverage() -> None:
    qs = [Question("a", "ai", 20), Question("b", "dsa", 10), Question("c", "web", 5)]
    quiz = build_quiz(qs, 30, {"ai": 1, "dsa": 1})
    assert quiz is not None and [q.id for q in quiz] == ["b", "a"]
    assert build_quiz(qs, 30, {"web": 1, "ai": 1}) is None      # 25 or 35, never 30
    assert build_quiz([], 10, {}) is None


def test_matches_brute_force_on_small_banks() -> None:
    for seed in range(40):
        qs = bank(10, seed)
        need = {"dsa": 1, "web": 1}
        target = random.Random(seed).randint(10, 40)
        exists = any(valid(list(c), target, need)
                     for r in range(1, 11) for c in itertools.combinations(qs, r))
        quiz = build_quiz(qs, target, need)
        assert (quiz is not None) == exists
        if quiz is not None:
            assert valid(quiz, target, need)


def test_deterministic_regardless_of_input_order() -> None:
    qs = bank(60, 3)
    first = build_quiz(qs, 45, {p: 1 for p in PHASES})
    assert first is not None and first == build_quiz(list(reversed(qs)), 45, {p: 1 for p in PHASES})


@pytest.mark.parametrize("target,need", [(45, {p: 1 for p in PHASES}),
                                         (60, {"dsa": 2, "ai": 2, "ops": 1}),
                                         (9, {p: 1 for p in PHASES})])  # impossible: 5 phases x 2+ min
def test_200_questions_under_100_ms(target: int, need: dict[str, int]) -> None:
    qs = bank(200, 11)
    t = time.perf_counter()
    quiz = build_quiz(qs, target, need)
    assert time.perf_counter() - t < 0.1
    if target == 9:
        assert quiz is None
    else:
        assert quiz is not None and valid(quiz, target, need)


def test_impossible_parity_finishes_fast() -> None:
    qs = [Question(f"q{i:03}", PHASES[i % 5], 2 * (1 + i % 7)) for i in range(200)]   # all even
    t = time.perf_counter()
    assert build_quiz(qs, 61, {"dsa": 1}) is None                                    # odd target
    assert time.perf_counter() - t < 0.1


def test_invalid_arguments() -> None:
    with pytest.raises(ValueError):
        build_quiz([], 0, {})` },
        output: "['dsa-1', 'rag-1']\nNone",
        pitfalls: [
          "Unsorted input: the `break` on time is only valid when later questions are at least as long, and the 'first' quiz would change with input order.",
          "Checking coverage only when the time reaches zero: the search explores huge numbers of branches that can never cover the missing phases.",
        ],
      },
    },
  },
  deeper: [
    { label: "Wikipedia: Interval scheduling", url: "https://en.wikipedia.org/wiki/Interval_scheduling" },
    { label: "Wikipedia: Greedy algorithm", url: "https://en.wikipedia.org/wiki/Greedy_algorithm" },
    { label: "Wikipedia: Backtracking", url: "https://en.wikipedia.org/wiki/Backtracking" },
    { label: "Wikipedia: Eight queens puzzle", url: "https://en.wikipedia.org/wiki/Eight_queens_puzzle" },
    { label: "Google OR-Tools: CP-SAT solver", url: "https://developers.google.com/optimization/cp/cp_solver" },
    { label: "Python docs: itertools (permutations, combinations)", url: "https://docs.python.org/3/library/itertools.html" },
  ],
  nextPreview: "Next: dynamic programming. State, transition, base case: the method that turns exponential searches into polynomial time.",
};
