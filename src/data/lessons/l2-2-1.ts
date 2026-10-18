import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "2.2.1",
  title: "Stacks, queues and linked lists",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["2.1.2 Two pointers and sliding window"],
  summary: "Know when last-in-first-out, first-in-first-out and linked structures are the right tool, including the monotonic stack trick and fast/slow pointers on linked lists.",
  terms: [
    { term: "Stack", def: "Last-in, first-out (LIFO): push on top, pop from the top. Python list append/pop, C# Stack<T>." },
    { term: "Queue", def: "First-in, first-out (FIFO): enqueue at the back, dequeue from the front. Python collections.deque, C# Queue<T>." },
    { term: "Deque", def: "Double-ended queue: O(1) adds and removes at both ends." },
    { term: "Linked list", def: "Nodes that each hold a value and a pointer to the next node. O(1) insert/remove at a known node; O(n) to find by position." },
    { term: "Monotonic stack", def: "A stack kept in increasing or decreasing order, used to find the next greater/smaller element for every item in O(n)." },
    { term: "Call stack", def: "The stack of active function calls. Recursion uses it; too deep recursion causes a stack overflow." },
  ],
  problem: [
    "The DevAtlas editor needs undo: the last change undone first. The news ingester needs to process feeds in the order they arrived. The code-review bot must check that every `(`, `[` and `{` in a snippet is closed in the right order. A stock-like chart of daily study minutes needs 'how many days until a better day?' for every day.",
    "Each is a stack or queue problem. Choosing the right structure turns convoluted index juggling into a few clear lines, and these patterns are interview favourites because they test whether you can see structure in a problem.",
  ],
  concept: {
    analogy: [
      "A **stack** is a pile of plates: you add and take from the top. A **queue** is a line at a ticket counter: first in line, first served. A **linked list** is a treasure hunt: each clue tells you where the next clue is; you cannot jump to clue 50 without following 49 clues, but inserting a new clue between two others only means changing one pointer.",
    ],
    precise: [
      "Use a **stack** when the most recent item must be handled first: undo, matching brackets, depth-first search, expression evaluation, backtracking. Use a **queue** when order of arrival matters: job processing, breadth-first search, buffering, rate limiting.",
      "In Python, a list is a good stack (append/pop at the end are O(1) amortised) but a bad queue (`pop(0)` shifts every element: O(n)). Use `collections.deque` for queues.",
      "Linked lists give O(1) insertion/removal when you already hold the node, but O(n) access by index and poor CPU cache locality. In practice, dynamic arrays win for most workloads; linked lists matter inside other structures (LRU caches, hash-table chains, free lists) and in interviews.",
      "**Monotonic stack**: scan left to right keeping indexes whose values are decreasing. When a bigger value arrives, it is the 'next greater element' for everything smaller on the stack: pop them and record the answer. Each index is pushed and popped once: O(n).",
    ],
  },
  underTheHood: {
    text: [
      "Python's list is a dynamic array of pointers; append occasionally reallocates to a larger block (amortised O(1)). `deque` is a doubly linked list of fixed-size blocks, so both ends are O(1) but indexing the middle is O(n).",
      "Every function call pushes a frame (locals, return address) onto the call stack. Python limits recursion depth (default about 1000, see sys.getrecursionlimit) to avoid crashing the interpreter. Any recursive algorithm can be rewritten with an explicit stack.",
      "Fast/slow pointers on a linked list: slow moves 1 step, fast moves 2. If there is a cycle, fast eventually laps slow and they meet (Floyd's algorithm). If there is no cycle, fast reaches the end. When fast reaches the end, slow is at the middle.",
    ],
    diagram: {
      title: "Bracket matching with a stack: \"{[()]}\"",
      nodes: [
        { label: "{", sub: "push → [{]" },
        { label: "[", sub: "push → [{ []" },
        { label: "(", sub: "push → [{ [ (]" },
        { label: ")", sub: "pop ( ✓" },
        { label: "] }", sub: "pop [ ✓ pop { ✓" },
        { label: "empty", sub: "balanced" },
      ],
      edges: ["", "", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Balanced brackets with a stack",
      code: {
        lang: "python",
        file: "brackets.py",
        code: `PAIRS = {")": "(", "]": "[", "}": "{"}

def balanced(code: str) -> bool:
    stack: list[str] = []
    for ch in code:
        if ch in "([{":
            stack.append(ch)
        elif ch in PAIRS:
            if not stack or stack.pop() != PAIRS[ch]:
                return False
    return not stack                    # leftovers mean unclosed brackets

for s in ["{[()]}", "([)]", "(((", "print(f(x[0]))"]:
    print(f"{s!r:20} {balanced(s)}")`,
      },
      output: "'{[()]}'             True\n'([)]'               False\n'((('                False\n'print(f(x[0]))'     True",
    },
    {
      title: "Undo/redo with two stacks",
      code: {
        lang: "python",
        file: "editor.py",
        code: `class Editor:
    def __init__(self) -> None:
        self.text = ""
        self._undo: list[str] = []
        self._redo: list[str] = []

    def type(self, s: str) -> None:
        self._undo.append(self.text)
        self._redo.clear()                  # new edits invalidate redo history
        self.text += s

    def undo(self) -> None:
        if self._undo:
            self._redo.append(self.text)
            self.text = self._undo.pop()

    def redo(self) -> None:
        if self._redo:
            self._undo.append(self.text)
            self.text = self._redo.pop()

e = Editor()
e.type("Hello"); e.type(" world"); e.undo(); print(repr(e.text))
e.redo(); print(repr(e.text))`,
      },
      output: "'Hello'\n'Hello world'",
    },
    {
      title: "A queue of jobs with deque",
      code: {
        lang: "python",
        code: `from collections import deque

jobs: deque[str] = deque()
for feed in ["python.org", "github.blog", "rust-lang.org"]:
    jobs.append(feed)                    # enqueue at the back

while jobs:
    feed = jobs.popleft()                # dequeue from the front: O(1)
    print("processing", feed)`,
      },
      output: "processing python.org\nprocessing github.blog\nprocessing rust-lang.org",
    },
    {
      title: "Monotonic stack: days until a better day",
      code: {
        lang: "python",
        file: "better_day.py",
        code: `def days_until_better(minutes: list[int]) -> list[int]:
    """For each day, how many days until strictly more minutes (0 if never)."""
    answer = [0] * len(minutes)
    stack: list[int] = []                    # indexes with decreasing minutes
    for i, m in enumerate(minutes):
        while stack and minutes[stack[-1]] < m:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer

print(days_until_better([30, 20, 25, 60, 10, 40, 40, 90]))`,
      },
      output: "[3, 1, 1, 4, 1, 2, 1, 0]",
    },
    {
      title: "Linked list: reverse and find the middle",
      code: {
        lang: "python",
        file: "linked.py",
        code: `from dataclasses import dataclass

@dataclass
class Node:
    val: int
    next: "Node | None" = None

def build(values: list[int]) -> Node | None:
    head = None
    for v in reversed(values):
        head = Node(v, head)
    return head

def to_list(head: Node | None) -> list[int]:
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head: Node | None) -> Node | None:
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next   # re-point one arrow at a time
    return prev

def middle(head: Node | None) -> Node | None:
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow

lst = build([1, 2, 3, 4, 5])
print(middle(lst).val)
print(to_list(reverse(lst)))`,
      },
      output: "3\n[5, 4, 3, 2, 1]",
    },
  ],
  companies: [
    "**Queues run the backend world**: message queues (RabbitMQ, Amazon SQS, Azure Service Bus) and logs (Kafka) decouple producers from consumers so spikes are buffered instead of overloading services. Same FIFO idea at company scale.",
    "**Stacks in tooling**: undo/redo in editors, the browser back button, parsers and compilers (matching brackets, evaluating expressions), and every language runtime's call stack.",
    "**Linked structures inside caches**: an LRU cache (used in databases, CDNs and in-process caches) combines a hash map with a doubly linked list so both lookup and 'move to most recent' are O(1). Python's functools.lru_cache and OrderedDict use this idea.",
  ],
  mistakes: [
    { mistake: "list.pop(0) as a queue", why: "Lists are the default container", wrong: "O(n) per dequeue; quadratic overall on big queues", fix: "collections.deque.popleft()" },
    { mistake: "Popping from an empty stack", why: "Forgetting the 'closing bracket with nothing open' case", wrong: "IndexError crashes", fix: "Check `if not stack` before pop" },
    { mistake: "Losing the rest of a linked list while re-pointing", why: "Changing head.next before saving it", wrong: "Nodes are lost; infinite loops", fix: "Save next first (or use tuple assignment carefully)" },
    { mistake: "Deep recursion on large inputs", why: "Recursive DFS is elegant", wrong: "RecursionError (Python) or stack overflow", fix: "Use an explicit stack for deep structures" },
    { mistake: "Choosing linked lists for 'fast inserts' in general", why: "Textbook O(1) insertion", wrong: "Finding the position is O(n) and cache misses make it slow", fix: "Measure; dynamic arrays usually win" },
  ],
  bestPractices: [
    { tag: "Performance", text: "list for stacks, deque for queues; never pop(0) on a large list." },
    { tag: "Maintainability", text: "Name stacks by meaning (open_brackets, undo_history), not just `stack`." },
    { tag: "Reliability", text: "Bound queues in production (maxlen or backpressure) so producers cannot exhaust memory." },
    { tag: "Reliability", text: "Prefer iterative versions of recursive algorithms for unbounded input sizes." },
  ],
  interview: [
    { q: "How would you check that brackets are balanced?", a: "Scan characters; push opening brackets onto a stack; on a closing bracket, the stack must be non-empty and its top must be the matching opener, which you pop. At the end the stack must be empty. O(n) time, O(n) space." },
    { q: "Implement a queue using two stacks.", a: "Push to an 'in' stack. To dequeue, if the 'out' stack is empty, pop everything from 'in' and push onto 'out' (reversing order), then pop from 'out'. Each element moves at most twice, so operations are amortised O(1)." },
    { q: "How do you detect a cycle in a linked list?", a: "Floyd's fast/slow pointers: slow moves one step, fast two. If they ever meet, there is a cycle; if fast reaches None, there is not. O(n) time, O(1) space." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "balanced('(]') returns:",
      options: ["True", "False", "IndexError", "None"],
      answer: 1,
      explanation: "On ']' the top of the stack is '(' which does not match '['.",
    },
    {
      kind: "mcq",
      prompt: "Which structure fits breadth-first processing (handle items in arrival order)?",
      options: ["Stack", "Queue", "Linked list sorted by value", "Heap"],
      answer: 1,
      explanation: "BFS processes nodes level by level in arrival order: a FIFO queue.",
    },
    {
      kind: "bug",
      prompt: "This 'queue' becomes very slow with 1 million jobs. Why?",
      code: { lang: "python", code: "jobs = list(range(1_000_000))\nwhile jobs:\n    job = jobs.pop(0)\n    handle(job)" },
      options: ["handle is slow", "pop(0) shifts all remaining elements each time: O(n²) overall", "range is lazy", "while loops are slow"],
      answer: 1,
      explanation: "Use deque and popleft for O(1) dequeues.",
    },
  ],
  cheatSheet: [
    "Stack = LIFO: undo, brackets, DFS, backtracking.",
    "Queue = FIFO: jobs, BFS, buffering. Python: deque.",
    "list.append/pop O(1); list.pop(0) O(n).",
    "Monotonic stack → next greater/smaller element in O(n).",
    "Linked list: O(1) splice at a node, O(n) index access.",
    "Reverse a list: prev/curr/next pointer dance.",
    "Fast/slow pointers: middle of list, cycle detection.",
  ],
  homework: {
    basic: {
      title: "Min stack",
      brief: ["Design a stack supporting push, pop, top and get_min, all in O(1)."],
      criteria: ["O(1) for all four", "Correct after pops", "Tests with duplicates of the minimum"],
      hints: ["Store pairs (value, current_min) on the stack."],
      solution: {
        text: ["Each entry remembers the minimum at the time it was pushed, so popping restores the previous minimum automatically."],
        code: {
          lang: "python",
          code: `class MinStack:
    def __init__(self) -> None:
        self._items: list[tuple[int, int]] = []
    def push(self, x: int) -> None:
        current = min(x, self._items[-1][1]) if self._items else x
        self._items.append((x, current))
    def pop(self) -> int:
        return self._items.pop()[0]
    def top(self) -> int:
        return self._items[-1][0]
    def get_min(self) -> int:
        return self._items[-1][1]

s = MinStack()
for x in [5, 3, 3, 7]: s.push(x)
assert s.get_min() == 3; s.pop(); s.pop()
assert s.get_min() == 3; s.pop()
assert s.get_min() == 5`,
        },
      },
    },
    intermediate: {
      title: "Evaluate Reverse Polish Notation",
      brief: ["Evaluate expressions like ['2', '1', '+', '3', '*'] → 9. Support + - * / with integer division truncating toward zero."],
      criteria: ["Stack-based O(n)", "Correct operand order for - and /", "Truncation toward zero for negatives"],
      hints: ["Pop b first, then a, and compute a op b.", "int(a / b) truncates toward zero; a // b floors."],
      solution: {
        text: ["Operand order matters: the first popped value is the right-hand operand."],
        code: {
          lang: "python",
          code: `def eval_rpn(tokens: list[str]) -> int:
    stack: list[int] = []
    ops = {
        "+": lambda a, b: a + b,
        "-": lambda a, b: a - b,
        "*": lambda a, b: a * b,
        "/": lambda a, b: int(a / b),
    }
    for t in tokens:
        if t in ops:
            b, a = stack.pop(), stack.pop()
            stack.append(ops[t](a, b))
        else:
            stack.append(int(t))
    return stack[0]

assert eval_rpn(["2", "1", "+", "3", "*"]) == 9
assert eval_rpn(["4", "13", "5", "/", "+"]) == 6
assert eval_rpn(["7", "-3", "/"]) == -2`,
        },
      },
    },
    challenge: {
      title: "LRU cache",
      brief: ["Implement LRUCache(capacity) with get(key) and put(key, value) in O(1), evicting the least recently used key when full. First with OrderedDict, then with your own doubly linked list + dict."],
      criteria: ["O(1) get and put", "Correct eviction order", "Both implementations pass the same tests"],
      hints: ["OrderedDict.move_to_end(key) and popitem(last=False)."],
      solution: {
        text: ["The dict gives O(1) lookup; the ordering structure gives O(1) 'mark as recent' and 'evict oldest'."],
        code: {
          lang: "python",
          code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.data: OrderedDict[int, int] = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)          # now most recent
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict least recent

c = LRUCache(2)
c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3)   # evicts 2
assert c.get(2) == -1 and c.get(1) == 1 and c.get(3) == 3`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: bracket checker for code answers",
      brief: ["Add `check_brackets(code) -> list[str]` to the AI service that returns human-readable problems with positions (e.g. 'unclosed ( at 14', 'unexpected ] at 20'), to give learners instant feedback on submitted code."],
      criteria: ["Reports position and bracket for each problem", "Ignores brackets inside string literals (bonus)", "Tests for each error type"],
      hints: ["Push (char, index) pairs instead of just chars."],
      solution: {
        text: ["Store (bracket, index) on the stack; report mismatches immediately and any leftovers at the end as unclosed."],
        code: {
          lang: "python",
          code: `def check_brackets(code: str) -> list[str]:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[tuple[str, int]] = []
    problems: list[str] = []
    for i, ch in enumerate(code):
        if ch in "([{":
            stack.append((ch, i))
        elif ch in pairs:
            if stack and stack[-1][0] == pairs[ch]:
                stack.pop()
            else:
                problems.append(f"unexpected {ch} at {i}")
    problems += [f"unclosed {ch} at {i}" for ch, i in stack]
    return problems

assert check_brackets("f(x[1)") == ["unexpected ) at 5", "unclosed ( at 1", "unclosed [ at 3"]`,
        },
      },
    },
  },
  deeper: [
    { label: "Python docs: Using lists as stacks and queues", url: "https://docs.python.org/3/tutorial/datastructures.html#using-lists-as-stacks" },
    { label: "Python docs: collections.OrderedDict", url: "https://docs.python.org/3/library/collections.html#collections.OrderedDict" },
    { label: "LeetCode: Monotonic Stack problems", url: "https://leetcode.com/tag/monotonic-stack/" },
  ],
  nextPreview: "Next: recursion, sorting and binary search, including 'binary search on the answer', a pattern that surprises most candidates.",
};
