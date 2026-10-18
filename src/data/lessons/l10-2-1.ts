import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "10.2.1",
  title: "DSA, system design and behavioral interviews",
  minutes: 90,
  level: "Intermediate",
  prerequisites: [
    "2.1.1 to 2.4.2 Data structures and algorithms",
    "6.4.1 System design cases",
    "10.1.1 Portfolio, resume and GitHub profile",
  ],
  summary: "A repeatable method for each interview type: coding (clarify, brute force, optimise, test, analyse), system design (requirements, estimates, API, data, architecture, deep dives, trade-offs) and behavioural (STAR stories with measurable results). With worked, tested solutions, an estimation script, a story-bank checker and a spaced-repetition practice tracker.",
  terms: [
    {
      term: "Think aloud",
      def: "Narrating your reasoning while solving, so the interviewer can follow, give hints and evaluate how you think.",
    },
    {
      term: "Pattern",
      def: "A reusable problem-solving shape: hash map lookup, two pointers, sliding window, BFS/DFS, heap, binary search, dynamic programming.",
    },
    {
      term: "Big-O",
      def: "How time and memory grow with input size. State it for every solution you propose.",
    },
    {
      term: "Back-of-the-envelope estimate",
      def: "Rough numbers (requests per second, storage per year) that drive design choices in system design interviews.",
    },
    {
      term: "Non-functional requirements",
      def: "Latency, availability, consistency, scale, cost and security targets, as opposed to features.",
    },
    {
      term: "STAR",
      def: "Situation, Task, Action, Result: a structure for behavioural answers. Emphasise your actions and a measurable result.",
    },
    {
      term: "Spaced repetition",
      def: "Reviewing material at increasing intervals, sooner when you struggle; far more effective than cramming.",
    },
  ],
  problem: [
    "You can build DevAtlas end to end, yet the first coding interview goes badly: you jump into code, go quiet, miss an edge case and run out of time. The system design interview turns into a list of technologies. The behavioural round gets a rambling answer about 'we' with no result.",
    "Interviews test a narrow set of skills under time pressure. They are learnable: each type has a method, a small set of recurring patterns, and a way to practise deliberately.",
  ],
  concept: {
    analogy: [
      "An interview is a **pilot's check ride**, not a quiz. The examiner knows you can fly; they watch whether you follow the checklist, communicate clearly, handle surprises and land safely. Methods (checklists) let you stay calm and show your best thinking under pressure.",
    ],
    precise: [
      "**Coding (45 minutes): 1) Clarify** inputs, outputs, constraints and edge cases, and confirm with an example. **2) Brute force** first, with its complexity. **3) Optimise:** find the repeated work and the pattern that removes it. **4) Code** cleanly while narrating. **5) Test** by walking through examples and your edge cases. **6) Analyse** time and space and mention trade-offs. Silence is the enemy; narrate.",
      "**Patterns cover most questions:** hash maps (lookups, counting), two pointers and sliding windows (subarrays and substrings), sort plus sweep (intervals), binary search (sorted data or 'smallest x such that'), BFS/DFS (graphs, grids, trees), heaps (top-k, scheduling), and dynamic programming (optimal choices with overlapping subproblems).",
      "**System design (45-60 minutes):** requirements (functional and non-functional, ask!), estimates (traffic, storage, bandwidth), API, data model, high-level architecture, deep dives on the hardest parts (scaling, consistency, caching, failure modes), and explicit trade-offs. Start simple and evolve the design as the numbers demand.",
      "**Behavioural:** prepare 6 to 8 STAR stories covering failure, conflict, ownership, ambiguity, deadlines, mentoring and a technical decision. Say 'I', give a measurable result and what you learned. Keep each answer to about two minutes and let the interviewer dig.",
      "**Practise like training:** timed problems by pattern, mock interviews with feedback, spaced repetition for problems you struggled with, and written reflections. Consistency over weeks beats cramming.",
    ],
  },
  underTheHood: {
    text: [
      "Interviewers usually score several dimensions separately: problem solving, coding, communication, testing, and (for senior roles) design trade-offs. A correct but silent solution can score lower than a slightly incomplete one with clear reasoning and tests.",
      "Hints are part of the format. Taking a hint well (acknowledging it, applying it, explaining why it helps) is a positive signal; ignoring it is a negative one.",
      "System design has no single right answer. Interviewers look for structured requirements, numbers that justify choices, awareness of bottlenecks and failure modes, and the ability to change the design when constraints change.",
      "Behavioural questions predict future behaviour from past behaviour, so vague or hypothetical answers ('I would...') score poorly. Concrete, honest stories, including failures and what you changed afterwards, score well.",
    ],
    diagram: {
      title: "The coding interview loop",
      nodes: [
        { label: "Clarify", sub: "examples, edge cases" },
        { label: "Brute force", sub: "+ complexity" },
        { label: "Optimise", sub: "which pattern?" },
        { label: "Code", sub: "narrate" },
        { label: "Test", sub: "walk through cases" },
        { label: "Analyse", sub: "time, space, trade-offs" },
      ],
      edges: ["", "remove repeated work", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "The method on a classic: Two Sum",
      code: {
        lang: "python",
        file: "two_sum.py",
        code: `"""Interview walk-through: return indices of two numbers that add up to target."""


def two_sum_brute(nums: list[int], target: int) -> tuple[int, int] | None:
    # Step 1: say the obvious solution and its cost out loud. O(n^2) time, O(1) space.
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return i, j
    return None


def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    # Step 2: what repeated work can we remove? "Have I seen target - x before?" is a lookup.
    # O(n) time, O(n) space.
    seen: dict[int, int] = {}                 # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return seen[target - x], i
        seen[x] = i                           # store AFTER checking, so x is not paired with itself
    return None


# Step 3: test the examples AND the edge cases you named before coding.
cases = [
    (([2, 7, 11, 15], 9), (0, 1)),
    (([3, 3], 6), (0, 1)),                    # duplicates
    (([3, 2, 4], 6), (1, 2)),                 # must not use 3 twice
    (([-4, 1, 9], 5), (0, 2)),                # negatives
    (([1, 2], 7), None),                      # no answer
    (([], 0), None),                          # empty input
]
for (nums, target), want in cases:
    assert two_sum(nums, target) == want == two_sum_brute(nums, target), (nums, target)
print("all", len(cases), "cases pass for both versions")`,
      },
      output: "all 6 cases pass for both versions",
      notes: [
        "Say aloud: 'Brute force checks every pair: O(n²). For each number I am asking whether its complement appeared before, which is a lookup, so a hash map makes it O(n) time and O(n) space.'",
        "Testing the optimised version against the brute force on the same cases is a cheap way to catch bugs, and interviewers like seeing it.",
      ],
    },
    {
      title: "Three patterns worth knowing cold",
      code: {
        lang: "python",
        file: "patterns.py",
        code: `"""Three patterns that cover a large share of coding interview questions."""
import heapq
from collections import Counter, deque


def longest_unique_substring(s: str) -> int:
    """Sliding window: grow the right edge, shrink the left when the window breaks a rule."""
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best


def shortest_path(grid: list[str], start: tuple, goal: tuple) -> int:
    """BFS: shortest path in an unweighted grid ('#' = wall). -1 if unreachable."""
    rows, cols = len(grid), len(grid[0])
    queue, dist = deque([start]), {start: 0}
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:
            return dist[(r, c)]
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                queue.append((nr, nc))
    return -1


def top_k_topics(tags: list[str], k: int) -> list[str]:
    """Heap: k most frequent items in O(n log k)."""
    counts = Counter(tags)
    return [t for t, _ in heapq.nlargest(k, counts.items(), key=lambda kv: (kv[1], kv[0]))]


assert longest_unique_substring("abcabcbb") == 3 and longest_unique_substring("") == 0
assert longest_unique_substring("abba") == 2
assert shortest_path(["..#", ".##", "..."], (0, 0), (2, 2)) == 4
assert shortest_path([".#", "#."], (0, 0), (1, 1)) == -1
assert top_k_topics(["ai", "cloud", "ai", "security", "ai", "cloud"], 2) == ["ai", "cloud"]
print(longest_unique_substring("devatlas"), shortest_path(["..#", ".##", "..."], (0, 0), (2, 2)),
      top_k_topics(["ai", "cloud", "ai", "security", "ai", "cloud"], 2))`,
      },
      output: "6 4 ['ai', 'cloud']",
      notes: [
        "`\"abba\"` is the classic sliding-window trap: when you see `a` again, the old `a` is already outside the window. The `last[ch] >= left` check handles it.",
      ],
    },
    {
      title: "System design: estimate before you draw boxes",
      code: {
        lang: "python",
        file: "estimate.py",
        code: `"""Back-of-the-envelope numbers for 'Design the DevAtlas quiz service' (say them out loud)."""
DAU = 200_000                    # daily active learners
QUIZZES_PER_USER = 3
ANSWERS_PER_QUIZ = 5
ANSWER_BYTES = 200               # user id, lesson, question, choice, timestamp
PEAK_FACTOR = 5                  # evening peak vs daily average
SECONDS_PER_DAY = 86_400

writes_per_day = DAU * QUIZZES_PER_USER * ANSWERS_PER_QUIZ
avg_wps = writes_per_day / SECONDS_PER_DAY
peak_wps = avg_wps * PEAK_FACTOR
reads_per_day = DAU * 20         # dashboard, progress and leaderboard views
storage_per_year_gb = writes_per_day * ANSWER_BYTES * 365 / 1e9

print(f"writes/day      {writes_per_day:>12,.0f}")
print(f"avg writes/s    {avg_wps:>12,.0f}")
print(f"peak writes/s   {peak_wps:>12,.0f}")
print(f"reads/s (avg)   {reads_per_day / SECONDS_PER_DAY:>12,.0f}")
print(f"storage/year    {storage_per_year_gb:>12,.1f} GB")
print("=> one PostgreSQL primary + a read replica and a cache is plenty; no sharding needed yet.")`,
      },
      output: "writes/day         3,000,000\navg writes/s              35\npeak writes/s            174\nreads/s (avg)             46\nstorage/year           219.0 GB\n=> one PostgreSQL primary + a read replica and a cache is plenty; no sharding needed yet.",
      notes: [
        "Numbers keep designs honest. 174 writes per second does not need Kafka or sharding; saying so, and naming the number at which you would add them, shows judgement.",
      ],
    },
    {
      title: "Behavioural: a STAR story bank with a checker",
      code: {
        lang: "python",
        file: "stories.py",
        code: `"""A STAR story bank with a completeness check. Prepare 6-8 stories that cover common themes."""
STORIES = [
    {
        "title": "Rolled back a bad release and fixed our alerting",
        "themes": ["incident", "ownership", "learning from failure"],
        "situation": "Release 1.6.0 broke quiz grading for 18% of students during an evening peak.",
        "task": "I was on call and had to restore grading, then stop it happening again.",
        "action": "I traced errors to a version mismatch, rolled back in 8 minutes, led a blameless "
                  "postmortem and added burn-rate alerts and contract tests.",
        "result": "Errors returned to baseline in 47 minutes total; the next two schema changes shipped "
                  "with zero failed requests.",
    },
    {
        "title": "Disagreed about adding a vector database",
        "themes": ["conflict", "influence", "technical decision"],
        "situation": "A teammate wanted a separate vector database for the AI tutor.",
        "task": "Decide quickly without damaging the relationship.",
        "action": "I proposed a one-day spike measuring pgvector against our recall and latency targets.",
        "result": "",
    },
]
THEMES = {"incident", "conflict", "ownership", "failure", "learning from failure", "influence",
          "ambiguity", "mentoring", "technical decision", "deadline"}


def check(story: dict) -> list[str]:
    problems = [f"missing {k}" for k in ("situation", "task", "action", "result") if not story.get(k)]
    if story.get("result") and not any(ch.isdigit() for ch in story["result"]):
        problems.append("result has no measurable outcome")
    if story.get("action") and " we " in f" {story['action'].lower()} " and " i " not in f" {story['action'].lower()} ":
        problems.append("action says 'we' but never 'I': what did YOU do?")
    return problems


covered = {t for s in STORIES for t in s["themes"]}
for s in STORIES:
    print(f"{s['title']}: {check(s) or 'ready'}")
print("themes still uncovered:", sorted(THEMES - covered))`,
      },
      output: "Rolled back a bad release and fixed our alerting: ready\nDisagreed about adding a vector database: ['missing result']\nthemes still uncovered: ['ambiguity', 'deadline', 'failure', 'mentoring']",
      notes: [
        "Write stories down before interviews; it is very hard to recall a good example under pressure. Your postmortems and ADRs from earlier lessons are excellent source material.",
      ],
    },
  ],
  companies: [
    "**Typical loops** combine a recruiter screen, one or two coding interviews, a system design interview (for mid-level and above), and a behavioural or 'values' interview; some companies use take-home projects or pair-programming on realistic code instead of puzzles.",
    "**Structured interviews:** many companies use rubrics and calibrated questions so different interviewers evaluate candidates consistently, which is why following a visible method helps.",
    "**AI-era interviews:** some companies now allow or even expect AI assistants in parts of the process, and assess how you specify, verify and review generated code. Ask what is allowed; when allowed, verify everything aloud.",
    "**Practice platforms and mocks:** engineers commonly prepare with problem sets grouped by pattern and mock interviews with peers, recording themselves to improve communication.",
  ],
  mistakes: [
    {
      mistake: "Coding immediately",
      why: "Pressure to look fast",
      wrong: "Solving the wrong problem or missing constraints",
      fix: "Spend the first minutes clarifying and confirming an example",
    },
    {
      mistake: "Going silent",
      why: "Concentration",
      wrong: "The interviewer cannot help or credit your reasoning",
      fix: "Narrate decisions, even uncertain ones",
    },
    {
      mistake: "Skipping tests",
      why: "Running out of time",
      wrong: "Bugs the interviewer then finds for you",
      fix: "Reserve 5 minutes to walk through examples and edge cases",
    },
    {
      mistake: "System design as a technology list",
      why: "Name-dropping feels impressive",
      wrong: "No reasoning, no numbers, no trade-offs",
      fix: "Requirements → estimates → simple design → scale where the numbers say so",
    },
    {
      mistake: "'We' stories without results",
      why: "Modesty or vagueness",
      wrong: "The interviewer cannot tell what you did or whether it worked",
      fix: "STAR with 'I' and a measurable result",
    },
    {
      mistake: "Grinding hundreds of random problems",
      why: "Volume feels productive",
      wrong: "Shallow familiarity, patterns not internalised",
      fix: "Practise by pattern, review mistakes with spaced repetition",
    },
  ],
  bestPractices: [
    {
      tag: "Maintainability",
      text: "In coding interviews write readable code: clear names, small helper functions, comments only where the idea is not obvious.",
    },
    {
      tag: "Reliability",
      text: "Always name and test edge cases: empty input, one element, duplicates, negatives, very large values, no answer.",
    },
    {
      tag: "Performance",
      text: "State time and space complexity for each approach and explain why the optimisation is worth its memory.",
    },
    {
      tag: "Security",
      text: "In design interviews mention authentication, authorization, rate limiting and data protection without being asked; it signals production experience.",
    },
    {
      tag: "Cost",
      text: "Include cost in design trade-offs: managed services vs self-hosting, caching vs bigger databases, and when the simple design is cheapest.",
    },
  ],
  interview: [
    {
      q: "Walk me through how you approach a coding problem you have never seen.",
      a: "I restate it and clarify inputs, outputs and constraints, then work one example by hand and list edge cases. I describe a brute-force solution and its complexity, look for repeated work and match it to a pattern (hash map, two pointers, BFS, heap, binary search, DP), explain the optimised approach before coding, code it while narrating, test it on the examples and edge cases, and finish with time and space complexity and possible improvements.",
    },
    {
      q: "Design a leaderboard for DevAtlas.",
      a: "Clarify: weekly XP, top 100 plus each user's own rank, about 200k daily users, updates on every quiz. Estimate: a few hundred updates per second at peak, which is easy. Design: a Redis sorted set per week (ZINCRBY on each XP event, ZREVRANGE for the top N, ZREVRANK for a user's rank, all logarithmic), with the durable source of truth in PostgreSQL and a rebuild job if Redis is lost. Discuss tie-breaking, cheating prevention, caching the top 100 for a few seconds, and sharding by region only if traffic grows by orders of magnitude.",
    },
    {
      q: "Tell me about a time you failed.",
      a: "Pick a real failure with an outcome, use STAR, own your part, and focus on what you changed. Example: a release I shipped broke grading for 18% of users; I rolled back within minutes, led a blameless postmortem, and added burn-rate alerts and contract tests, after which the next schema changes shipped without failed requests.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The interviewer asks for the longest substring without repeating characters. Which pattern fits best?",
      options: [
        "Binary search",
        "Sliding window with a hash map of last positions",
        "Dynamic programming over all substrings",
        "Sorting the string",
      ],
      answer: 1,
      explanation: "A window that grows to the right and jumps its left edge past the previous occurrence gives O(n) time.",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `def longest(s):
    last, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(longest("abba"), longest("devatlas"))`,
      },
      options: ["2 6", "3 6", "2 8", "4 5"],
      answer: 0,
      explanation: "'abba': the window 'ab' or 'ba' has length 2. 'devatlas': 'devatl' has 6 unique characters before 'a' repeats.",
    },
    {
      kind: "bug",
      prompt: "This Two Sum returns (0, 0) for nums = [3, 2, 4], target = 6. Why?",
      code: {
        lang: "python",
        code: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        seen[x] = i
        if target - x in seen:
            return seen[target - x], i`,
      },
      options: [
        "The dict should be a set",
        "It stores x before checking, so 3 pairs with itself",
        "enumerate starts at 1",
        "It needs sorting first",
      ],
      answer: 1,
      explanation: "Check for the complement first, then store the current value. Edge cases like this are why you test duplicates and 'same element twice'.",
    },
  ],
  cheatSheet: [
    "Coding: clarify → brute force → optimise (pattern) → code (narrate) → test → analyse.",
    "Patterns: hash map · two pointers / sliding window · sort + sweep · binary search · BFS/DFS · heap · DP.",
    "Edge cases: empty, one item, duplicates, negatives, huge, no answer.",
    "Design: requirements → estimates → API → data → architecture → deep dives → trade-offs.",
    "Let numbers justify complexity; name when you would scale further.",
    "Behavioural: 6-8 STAR stories, 'I', measurable result, ~2 minutes each.",
    "Take hints gracefully; ask clarifying questions.",
    "Practise by pattern with spaced repetition and mock interviews.",
  ],
  homework: {
    basic: {
      title: "Three classics with the full method",
      brief: [
        "Solve merge intervals, 'first index with score ≥ x' (binary search) and product of array except self. For each, write the brute force complexity, the pattern, the optimised complexity and tests including edge cases.",
      ],
      criteria: ["Pattern named for each", "Complexity stated", "Edge cases tested", "All tests pass"],
      hints: ["Product except self: think prefix products from the left and suffix products from the right."],
      solution: {
        text: [
          "Brute forces: intervals O(n²) pairwise merging; scores O(n) scan; products O(n²). Patterns bring them to O(n log n), O(log n) and O(n). Note the zero in the product test: a division-based solution breaks there.",
        ],
        code: {
          lang: "python",
          file: "classics.py",
          code: `"""Three classics, each with the pattern named, complexity stated and edge cases tested."""


def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    """Sort + sweep. O(n log n). Merge study sessions that overlap or touch."""
    merged: list[list[int]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def first_at_least(sorted_scores: list[int], x: int) -> int:
    """Binary search on the answer: index of the first score >= x (len if none). O(log n)."""
    lo, hi = 0, len(sorted_scores)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_scores[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo


def product_except_self(nums: list[int]) -> list[int]:
    """Prefix and suffix products, no division. O(n) time, O(1) extra space besides the output."""
    out = [1] * len(nums)
    prefix = 1
    for i, n in enumerate(nums):
        out[i] = prefix
        prefix *= n
    suffix = 1
    for i in range(len(nums) - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out


assert merge_intervals([[1, 3], [8, 10], [2, 6], [10, 12]]) == [[1, 6], [8, 12]]
assert merge_intervals([]) == [] and merge_intervals([[5, 5]]) == [[5, 5]]
assert first_at_least([10, 20, 20, 30], 20) == 1 and first_at_least([10, 20], 99) == 2
assert first_at_least([], 1) == 0
assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]
assert product_except_self([2, 0, 3]) == [0, 6, 0]
print("all tests pass")`,
        },
        output: "all tests pass",
      },
    },
    intermediate: {
      title: "Deep dive: the leaderboard",
      brief: [
        "Implement the core of the DevAtlas weekly leaderboard with Redis sorted sets: add XP, top N and a user's rank. Discuss tie-breaking, durability and what changes at 100× scale.",
      ],
      criteria: [
        "Logarithmic operations",
        "Weekly key with expiry",
        "Rank of unknown users handled",
        "Written trade-offs",
      ],
      hints: ["`ZINCRBY`, `ZREVRANGE ... WITHSCORES`, `ZREVRANK`."],
      solution: {
        text: [
          "Ties: Redis orders equal scores by member name, so 'dev' ranks above 'ben' at 90 XP. If ties should favour whoever got there first, encode time into the score (for example XP × 10¹⁰ − timestamp).",
          "Durability: XP events are stored in PostgreSQL; Redis is a fast view that can be rebuilt. At 100× scale: shard leaderboards by region or cohort, batch updates, and cache the top 100 briefly.",
        ],
        code: {
          lang: "python",
          file: "leaderboard.py",
          code: `"""System design deep dive: a weekly XP leaderboard with Redis sorted sets.
Run against fakeredis here; the same code works with redis.Redis()."""
import fakeredis

r = fakeredis.FakeRedis(decode_responses=True)
KEY = "leaderboard:2026-W42"                      # one key per week: reset is free


def add_xp(user: str, xp: int) -> None:
    pipe = r.pipeline()
    pipe.zincrby(KEY, xp, user)                   # O(log n)
    pipe.expire(KEY, 60 * 60 * 24 * 21)           # keep 3 weeks of history
    pipe.execute()


def top(n: int) -> list[tuple[str, int]]:
    return [(u, int(s)) for u, s in r.zrevrange(KEY, 0, n - 1, withscores=True)]   # O(log n + n)


def rank(user: str) -> int | None:
    pos = r.zrevrank(KEY, user)                   # 0-based position, O(log n)
    return None if pos is None else pos + 1


for user, xp in [("ana", 120), ("ben", 90), ("chen", 150), ("ana", 50), ("dev", 90)]:
    add_xp(user, xp)
print("top 3:", top(3))
print("ben is #", rank("ben"), "| unknown user:", rank("zoe"))`,
        },
        output: "top 3: [('ana', 170), ('chen', 150), ('dev', 90)]\nben is # 4 | unknown user: None",
      },
    },
    challenge: {
      title: "Complete your story bank",
      brief: [
        "Finish the vector-database story with a measurable result, then add stories until the checker reports no uncovered themes. Practise telling each one aloud in under two minutes, and record yourself once.",
      ],
      criteria: ["Every story passes the checker", "All themes covered", "Each answer under two minutes when spoken"],
      hints: [
        "Results can be technical (latency, cost), people-related (a teammate's growth) or process-related (fewer incidents).",
      ],
      solution: {
        text: [
          "Six stories cover all ten themes, and every one passes the lesson's checker unchanged: all four STAR parts, a number in each result, and 'I' in each action. The conflict story now ends with a measurable result and a good relationship: influence through data rather than authority.",
          "The extra loop at the end is not part of the checker: it estimates how long the written notes take to read aloud at about 150 words per minute. The notes take about 30 seconds; when you tell a story you add context and detail, so aim for 90 to 120 seconds and time yourself. Recording yourself reveals filler words and rambling quickly; most people cut their answers by a third after one listen.",
        ],
        code: {
          lang: "python",
          file: "stories.py",
          code: `"""My completed STAR story bank. The checker below is unchanged from the lesson."""
STORIES = [
    {
        "title": "Rolled back a bad release and fixed our alerting",
        "themes": ["incident", "ownership", "learning from failure"],
        "situation": "Release 1.6.0 broke quiz grading for 18% of students during an evening peak.",
        "task": "I was on call and had to restore grading, then stop it happening again.",
        "action": "I traced errors to a version mismatch, rolled back in 8 minutes, led a blameless "
                  "postmortem and added burn-rate alerts and contract tests.",
        "result": "Errors returned to baseline in 47 minutes total; the next two schema changes shipped "
                  "with zero failed requests.",
    },
    {
        "title": "Disagreed about adding a vector database",
        "themes": ["conflict", "influence", "technical decision"],
        "situation": "A teammate wanted a separate vector database for the AI tutor.",
        "task": "Decide quickly without damaging the relationship.",
        "action": "I proposed a one-day spike measuring pgvector against our recall and latency targets.",
        "result": "The spike showed pgvector met our targets (recall@3 0.90, p95 18 ms), we kept one "
                  "database, and my teammate and I wrote ADR-003 together; we revisit above 5M vectors.",
    },
    {
        "title": "Shipped the school launch on time by cutting scope",
        "themes": ["deadline", "ownership"],
        "situation": "A partner school was sending 50,000 students on the first day of term, 3 weeks away, "
                     "and the class dashboard was only half built.",
        "task": "I owned the launch checklist and had to get a working product out by the date.",
        "action": "I listed every feature with the school, agreed that CSV export and charts could wait, "
                  "load tested the remaining flows at 6x expected peak and pre-scaled the API the night before.",
        "result": "We launched on day 1 with p95 latency of 210 ms and zero downtime; the two deferred "
                  "features shipped 12 days later.",
    },
    {
        "title": "My migration locked the progress table",
        "themes": ["failure", "learning from failure"],
        "situation": "I added a NOT NULL column with a default to the 40M-row progress table during the day.",
        "task": "Recover quickly and make sure no migration could do that again.",
        "action": "I spotted the lock in the database dashboard, killed the migration, and posted an update "
                  "in the incident channel. Then I rewrote it as add-nullable, backfill in batches, then "
                  "constrain, and I added a CI check that flags table-locking DDL.",
        "result": "Progress saves failed for 12 minutes; since the CI check landed, 30 migrations have "
                  "shipped without a lock longer than 1 second.",
    },
    {
        "title": "Turned 'make the tutor better' into a measurable goal",
        "themes": ["ambiguity", "technical decision"],
        "situation": "Product asked us to 'make the AI tutor better' with no definition of better.",
        "task": "I had to decide what to work on and show progress within one quarter.",
        "action": "I read 200 rated conversations, grouped the complaints, and found most were wrong or "
                  "missing sources. I proposed recall@3 and groundedness as the goals and built a "
                  "120-question eval set to measure them.",
        "result": "Recall@3 rose from 0.80 to 0.90 and thumbs-down ratings fell from 14% to 6% in 8 weeks.",
    },
    {
        "title": "Coached a junior engineer through their first on-call week",
        "themes": ["mentoring", "influence"],
        "situation": "A new graduate on the team was anxious about joining the on-call rotation.",
        "task": "Help them become confident without taking incidents away from them.",
        "action": "I paired with them on 3 practice incidents using last year's postmortems, wrote a one-page "
                  "runbook with them, and I stayed as their backup instead of the primary.",
        "result": "They resolved 4 real alerts alone that week, and their runbook is now used by all 6 "
                  "engineers on the rotation.",
    },
]
THEMES = {"incident", "conflict", "ownership", "failure", "learning from failure", "influence",
          "ambiguity", "mentoring", "technical decision", "deadline"}


def check(story: dict) -> list[str]:
    problems = [f"missing {k}" for k in ("situation", "task", "action", "result") if not story.get(k)]
    if story.get("result") and not any(ch.isdigit() for ch in story["result"]):
        problems.append("result has no measurable outcome")
    if story.get("action") and " we " in f" {story['action'].lower()} " and " i " not in f" {story['action'].lower()} ":
        problems.append("action says 'we' but never 'I': what did YOU do?")
    return problems


covered = {t for s in STORIES for t in s["themes"]}
for s in STORIES:
    print(f"{s['title']}: {check(s) or 'ready'}")
print("themes still uncovered:", sorted(THEMES - covered))

# Extra (not part of the checker): spoken length at ~150 words per minute, aim for under 2 minutes.
for s in STORIES:
    words = sum(len(s[k].split()) for k in ("situation", "task", "action", "result"))
    print(f"{words:4} words ≈ {words / 150 * 60:3.0f} s  {s['title']}")`,
        },
        output: "Rolled back a bad release and fixed our alerting: ready\nDisagreed about adding a vector database: ready\nShipped the school launch on time by cutting scope: ready\nMy migration locked the progress table: ready\nTurned 'make the tutor better' into a measurable goal: ready\nCoached a junior engineer through their first on-call week: ready\nthemes still uncovered: []\n  68 words ≈  27 s  Rolled back a bad release and fixed our alerting\n  59 words ≈  24 s  Disagreed about adding a vector database\n  93 words ≈  37 s  Shipped the school launch on time by cutting scope\n  90 words ≈  36 s  My migration locked the progress table\n  78 words ≈  31 s  Turned 'make the tutor better' into a measurable goal\n  72 words ≈  29 s  Coached a junior engineer through their first on-call week",
      },
    },
    capstone: {
      title: "DevAtlas: interview practice tracker",
      brief: [
        "Build a small spaced-repetition tracker for interview problems: each review records how well you did, problems you struggled with return sooner, and a daily list shows what is due. Track at least 20 problems across all patterns for three weeks.",
      ],
      criteria: [
        "Interval grows with good reviews and resets on failure",
        "Due list sorted by date",
        "Problems tagged by pattern",
        "Deterministic, testable with fixed dates",
      ],
      hints: ["A simplified SM-2 algorithm is plenty: an ease factor plus an interval."],
      solution: {
        text: [
          "Practising what you got wrong, at the right time, is the fastest way to improve. Add this as a page in DevAtlas: it reuses the progress store you already built.",
        ],
        code: {
          lang: "python",
          file: "practice.py",
          code: `"""Interview practice tracker with spaced repetition: problems you struggle with come back sooner."""
from dataclasses import dataclass, field
from datetime import date, timedelta


@dataclass
class Card:
    problem: str
    pattern: str
    interval_days: int = 1
    ease: float = 2.5
    due: date = field(default_factory=date.today)

    def review(self, quality: int, today: date) -> None:
        """quality: 0 = could not solve, 1 = solved with hints, 2 = solved cleanly, 3 = solved fast."""
        if quality == 0:
            self.interval_days = 1                               # start over tomorrow
        else:
            self.ease = max(1.3, self.ease + (quality - 2) * 0.15)
            self.interval_days = max(1, round(self.interval_days * self.ease * quality / 2))
        self.due = today + timedelta(days=self.interval_days)


def due_today(cards: list[Card], today: date) -> list[Card]:
    return sorted((c for c in cards if c.due <= today), key=lambda c: c.due)


start = date(2026, 10, 19)
cards = [Card("Two Sum", "hash map", due=start), Card("Merge Intervals", "sort + sweep", due=start),
         Card("Shortest Path in Grid", "BFS", due=start)]
history = {"Two Sum": [3, 3], "Merge Intervals": [1, 2], "Shortest Path in Grid": [0, 1]}

for card in cards:
    day = start
    for q in history[card.problem]:
        card.review(q, day)
        day = card.due
    print(f"{card.problem:22} {card.pattern:13} next review {card.due} (every {card.interval_days} d)")
print("due on 2026-10-22:", [c.problem for c in due_today(cards, date(2026, 10, 22))])`,
        },
        output: "Two Sum                hash map      next review 2026-11-09 (every 17 d)\nMerge Intervals        sort + sweep  next review 2026-10-22 (every 2 d)\nShortest Path in Grid  BFS           next review 2026-10-21 (every 1 d)\ndue on 2026-10-22: ['Shortest Path in Grid', 'Merge Intervals']",
      },
    },
  },
  deeper: [
    { label: "Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/" },
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "NeetCode: problems grouped by pattern", url: "https://neetcode.io/" },
    { label: "Redis docs: Sorted sets", url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/" },
  ],
  nextPreview: "You have completed the DevAtlas curriculum. Keep the momentum: ship one improvement to your capstone every week, read the tech news page daily, and use /revise and /interview to keep skills sharp.",
};
