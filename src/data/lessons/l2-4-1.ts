import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.4.1",
  title: "Greedy and backtracking",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["2.2.2 Recursion, sorting and binary search"],
  summary: "Recognise when making the locally best choice is provably optimal (greedy), and when you must explore choices systematically with backtracking and pruning.",
  terms: [
    { term: "Greedy algorithm", def: "Builds a solution step by step, always taking the choice that looks best right now, never reconsidering." },
    { term: "Exchange argument", def: "A proof technique for greedy: show any optimal solution can be transformed into the greedy one without getting worse." },
    { term: "Backtracking", def: "Exploring choices recursively: choose, explore, un-choose. Abandons a path as soon as it cannot lead to a valid solution." },
    { term: "Pruning", def: "Cutting off branches of the search early because they are invalid or cannot beat the best known answer." },
    { term: "Search space", def: "All candidate solutions, e.g. all 2ⁿ subsets or n! orderings." },
    { term: "Interval scheduling", def: "Choosing the most non-overlapping intervals (meetings, jobs). Classic greedy: always pick the one that ends earliest." },
  ],
  problem: [
    "DevAtlas offers live mentoring sessions with overlapping time slots. A learner wants to attend as many as possible. Picking the shortest sessions first or the earliest-starting first both fail on some inputs; picking the one that **ends** earliest is provably optimal.",
    "The quiz generator must choose questions so the total time is exactly 30 minutes and every phase is covered. There is no greedy rule for that; you must search combinations, but cleverly, so it finishes in milliseconds instead of hours.",
  ],
  concept: {
    analogy: [
      "Greedy is **packing a day of errands by always doing the one that finishes soonest**: it works for some goals and fails for others, and the skill is knowing which. Backtracking is **solving a Sudoku in pencil**: write a candidate, continue, and erase as soon as a contradiction appears.",
    ],
    precise: [
      "Greedy works when the problem has the **greedy-choice property** (a locally optimal choice is part of some optimal solution) and **optimal substructure**. Always test a greedy idea against small counterexamples; if you cannot argue why it is correct, it probably is not.",
      "Classic correct greedies: interval scheduling by earliest end; making change with 'canonical' coin systems like 1, 2, 5, 10 (but not arbitrary coins); Huffman coding; Dijkstra; minimum spanning trees (Kruskal, Prim).",
      "**Backtracking template**: if the partial solution is complete, record it; otherwise for each candidate choice that keeps the partial solution valid: apply it, recurse, undo it. Prune with constraints (invalid) and bounds (cannot beat the best). Worst case remains exponential, but pruning often makes real inputs fast.",
      "If greedy fails and the search space has overlapping subproblems, the answer is usually **dynamic programming** (next lesson).",
    ],
  },
  underTheHood: {
    text: [
      "Why earliest-end-first works: take any optimal schedule and look at its first meeting. Swapping it for the meeting that ends earliest cannot cause an overlap with the rest (it ends no later), so the greedy choice is always safe. Repeat the argument for the remaining meetings: that is the exchange argument.",
      "Backtracking explores a tree of decisions. Subsets: each element in/out → 2ⁿ leaves. Permutations: n! leaves. Pruning removes whole subtrees: checking 'remaining budget < 0' at depth 3 removes everything below it.",
    ],
    diagram: {
      title: "Backtracking template",
      nodes: [
        { label: "complete?", sub: "record answer" },
        { label: "for each choice", sub: "" },
        { label: "valid?", sub: "else prune" },
        { label: "choose → recurse", sub: "" },
        { label: "un-choose", sub: "backtrack" },
      ],
      edges: ["no", "", "yes", ""],
    },
  },
  handsOn: [
    {
      title: "Greedy: attend the most sessions",
      code: {
        lang: "python",
        file: "sessions.py",
        code: `def max_sessions(sessions: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """(start, end) in minutes; touching end==start is allowed."""
    chosen, last_end = [], float("-inf")
    for start, end in sorted(sessions, key=lambda s: s[1]):    # earliest END first
        if start >= last_end:
            chosen.append((start, end))
            last_end = end
    return chosen

slots = [(540, 600), (550, 560), (560, 570), (600, 660), (565, 700), (660, 720)]
print(max_sessions(slots))`,
      },
      output: "[(550, 560), (560, 570), (600, 660), (660, 720)]",
      notes: ["Shortest-first or earliest-start-first both fail on other inputs; try (0, 100), (10, 20), (30, 40) with earliest-start-first."],
    },
    {
      title: "When greedy fails: coin change",
      code: {
        lang: "python",
        code: `def greedy_coins(amount: int, coins: list[int]) -> list[int]:
    used = []
    for c in sorted(coins, reverse=True):
        while amount >= c:
            amount -= c
            used.append(c)
    return used if amount == 0 else []

print(greedy_coins(30, [1, 2, 5, 10, 20]))   # canonical system: optimal
print(greedy_coins(6, [1, 3, 4]))            # 4+1+1 = 3 coins, but 3+3 is only 2`,
      },
      output: "[20, 10]\n[4, 1, 1]",
      notes: ["For arbitrary coin sets, use dynamic programming (lesson 2.4.2)."],
    },
    {
      title: "Backtracking: pick quiz questions that fill exactly 30 minutes",
      code: {
        lang: "python",
        file: "quiz_pick.py",
        code: `def exact_time(questions: list[tuple[str, int]], target: int) -> list[list[str]]:
    questions = sorted(questions, key=lambda q: q[1])          # sorting enables pruning
    results: list[list[str]] = []
    chosen: list[str] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            results.append(chosen.copy())
            return
        for i in range(start, len(questions)):
            name, minutes = questions[i]
            if minutes > remaining:
                break                                         # prune: later ones are even longer
            chosen.append(name)                               # choose
            backtrack(i + 1, remaining - minutes)             # explore
            chosen.pop()                                      # un-choose

    backtrack(0, target)
    return results

qs = [("sql", 10), ("git", 5), ("docker", 15), ("rag", 20), ("http", 5), ("dsa", 10)]
for combo in exact_time(qs, 30):
    print(combo)`,
      },
      output: "['git', 'http', 'sql', 'dsa']\n['git', 'http', 'rag']\n['git', 'sql', 'docker']\n['git', 'dsa', 'docker']\n['http', 'sql', 'docker']\n['http', 'dsa', 'docker']\n['sql', 'rag']\n['dsa', 'rag']",
    },
    {
      title: "Backtracking: permutations and N-Queens",
      code: {
        lang: "python",
        code: `def permutations(items: list[str]) -> list[list[str]]:
    out, path, used = [], [], [False] * len(items)
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

def n_queens(n: int) -> int:
    cols, diag1, diag2 = set(), set(), set()
    def place(row: int) -> int:
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
    return place(0)

print(len(permutations(["a", "b", "c", "d"])), n_queens(8))`,
      },
      output: "24 92",
    },
  ],
  companies: [
    "**Scheduling and allocation**: calendar and meeting-room systems, ad slot allocation and job schedulers use greedy heuristics because they are fast and often provably good (or good enough with known bounds).",
    "**Constraint solving**: timetabling, configuration validation, and puzzle-like business rules use backtracking with strong pruning, or dedicated solvers (SAT/CP/MIP solvers such as Google OR-Tools) built on the same ideas.",
    "**Compilers and networks**: register allocation, Huffman coding in compression formats, and minimum spanning trees in network design are greedy algorithms used in production.",
  ],
  mistakes: [
    { mistake: "Assuming greedy is correct without proof", why: "It works on the examples you tried", wrong: "Wrong answers on edge cases in production", fix: "Search for counterexamples; use an exchange argument or switch to DP" },
    { mistake: "Sorting by the wrong key", why: "Several keys seem plausible (start, length, end)", wrong: "Suboptimal schedules", fix: "Test each candidate key on small adversarial inputs" },
    { mistake: "Forgetting to undo choices", why: "Mutating shared state in recursion", wrong: "Corrupted results from previous branches", fix: "Always pair choose with un-choose (or pass copies for small state)" },
    { mistake: "Appending the shared list to results", why: "results.append(path)", wrong: "All results end up empty or identical (same list object)", fix: "Append path.copy()" },
    { mistake: "No pruning", why: "Correct but naive search", wrong: "Exponential time that times out on modest inputs", fix: "Sort inputs and prune on constraints and bounds" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Write a brute-force solution for small inputs and compare it against your greedy in a randomised test." },
    { tag: "Performance", text: "Order choices so promising or constraining ones come first; prune as early as possible." },
    { tag: "Maintainability", text: "Keep the choose / explore / un-choose structure explicit; it makes backtracking code readable." },
    { tag: "Performance", text: "For real optimisation problems at scale, consider a solver library instead of hand-written search." },
  ],
  interview: [
    { q: "How do you know a greedy algorithm is correct?", a: "Argue the greedy-choice property: some optimal solution includes the greedy choice (often via an exchange argument), and the remaining problem has the same structure. Then test against brute force on small random inputs. If you find a counterexample, consider DP." },
    { q: "Explain backtracking with an example.", a: "It explores a decision tree depth-first: make a choice, recurse, undo the choice, and skip branches that violate constraints. Example: generating subsets that sum to a target; sorting values lets you stop the loop as soon as a value exceeds the remaining sum." },
    { q: "Greedy vs dynamic programming?", a: "Greedy commits to one choice per step and never revisits; it is fast but only correct for special structures. DP considers all choices for each subproblem, storing results to avoid recomputation; it is correct whenever optimal substructure holds, at higher cost." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "To attend the maximum number of non-overlapping meetings, sort by:",
      options: ["Start time", "Duration", "End time", "Number of attendees"],
      answer: 2,
      explanation: "Earliest end leaves the most room for the remaining meetings.",
    },
    {
      kind: "bug",
      prompt: "Every result printed is []. Why?",
      code: { lang: "python", code: "def bt(i):\n    if i == len(items):\n        results.append(path)\n        return\n    path.append(items[i]); bt(i + 1); path.pop()\n    bt(i + 1)" },
      options: ["The base case is wrong", "results stores the same list object, which ends empty", "pop removes the wrong element", "Recursion depth"],
      answer: 1,
      explanation: "Append path.copy() (or list(path)).",
    },
    {
      kind: "output",
      prompt: "greedy_coins(6, [1, 3, 4]) returns [4, 1, 1]. What is the optimal answer?",
      options: ["[4, 1, 1]", "[3, 3]", "[1]*6", "[4, 2]"],
      answer: 1,
      explanation: "Two coins of 3. Greedy is not optimal for this coin system.",
    },
  ],
  cheatSheet: [
    "Greedy: one best local choice per step; prove it or test it.",
    "Intervals → sort by end time.",
    "Counterexample found → think DP.",
    "Backtracking: complete? record : for choice → valid? choose, recurse, un-choose.",
    "Prune with constraints and bounds; sort to enable early breaks.",
    "results.append(path.copy()).",
    "Subsets 2ⁿ, permutations n!: keep n small or prune hard.",
  ],
  homework: {
    basic: {
      title: "Minimum rooms needed",
      brief: ["Given mentoring sessions (start, end), return the minimum number of rooms so no two overlapping sessions share a room."],
      criteria: ["O(n log n)", "Handles touching intervals (end == start) as non-overlapping", "Tests"],
      hints: ["Sort by start; keep a min-heap of end times of rooms in use."],
      solution: {
        text: ["For each session, if the earliest-ending room is free by its start, reuse it (pop); push this session's end. The heap size at the end is the answer."],
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

assert rooms_needed([(0, 30), (5, 10), (15, 20)]) == 2
assert rooms_needed([(1, 5), (5, 10)]) == 1`,
        },
      },
    },
    intermediate: {
      title: "Generate valid parentheses",
      brief: ["Generate all strings of n pairs of balanced parentheses (n=3 → 5 strings) using backtracking with pruning, never generating invalid prefixes."],
      criteria: ["Never builds an invalid prefix", "Correct count (Catalan numbers: 1, 2, 5, 14, 42…)"],
      hints: ["Add '(' if opens < n; add ')' if closes < opens."],
      solution: {
        text: ["The two conditions are the pruning: they make every partial string a valid prefix."],
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

assert parens(3) == ["((()))", "(()())", "(())()", "()(())", "()()()"]
assert [len(parens(k)) for k in range(1, 6)] == [1, 2, 5, 14, 42]`,
        },
      },
    },
    challenge: {
      title: "Sudoku solver",
      brief: ["Write a Sudoku solver with backtracking. Then add the 'most constrained cell first' heuristic (pick the empty cell with the fewest candidates) and measure the speedup on a hard puzzle."],
      criteria: ["Correct solution", "Heuristic implemented", "Timing comparison recorded"],
      hints: ["Track used digits per row, column and box in sets for O(1) checks."],
      solution: {
        text: ["Choosing the most constrained cell first often reduces the search tree dramatically, because wrong guesses are detected sooner. This is the same principle SAT/CP solvers use."],
        code: {
          lang: "python",
          code: `def solve(board: list[list[int]]) -> bool:
    rows = [set() for _ in range(9)]; cols = [set() for _ in range(9)]; boxes = [set() for _ in range(9)]
    empty = []
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v: rows[r].add(v); cols[c].add(v); boxes[r // 3 * 3 + c // 3].add(v)
            else: empty.append((r, c))

    def candidates(r: int, c: int) -> set[int]:
        return set(range(1, 10)) - rows[r] - cols[c] - boxes[r // 3 * 3 + c // 3]

    def bt() -> bool:
        if not empty:
            return True
        i = min(range(len(empty)), key=lambda k: len(candidates(*empty[k])))   # most constrained
        r, c = empty.pop(i)
        b = r // 3 * 3 + c // 3
        for v in candidates(r, c):
            board[r][c] = v; rows[r].add(v); cols[c].add(v); boxes[b].add(v)
            if bt():
                return True
            board[r][c] = 0; rows[r].remove(v); cols[c].remove(v); boxes[b].remove(v)
        empty.insert(i, (r, c))
        return False

    return bt()`,
        },
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
    { label: "Google OR-Tools", url: "https://developers.google.com/optimization" },
    { label: "LeetCode: Backtracking problems", url: "https://leetcode.com/tag/backtracking/" },
    { label: "LeetCode: Greedy problems", url: "https://leetcode.com/tag/greedy/" },
  ],
  nextPreview: "Next: dynamic programming. State, transition, base case: the method that turns exponential searches into polynomial time.",
};
