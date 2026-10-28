import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.4.1",
  title: "Agentic patterns: ReAct, plan-and-execute and multi-agent orchestration",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["7.3.1 Agents, tools and MCP"],
  summary: "Move from a single 'agent = loop' to the concrete patterns production teams actually use: ReAct (reason, act, observe), plan-and-execute (plan once, replan on failure), reflection and evaluator-optimizer (generate, critique, revise), and multi-agent orchestration where sub-agents work in clean contexts and return condensed results.",
  terms: [
    { term: "ReAct", def: "An agent loop that interleaves reasoning and acting: the model states a thought, chooses a tool call, and observes the result before the next thought." },
    { term: "Plan-and-execute", def: "The model first writes a plan of steps, then each step runs (usually in code); on failure the plan is revised rather than re-asked from scratch." },
    { term: "Reflection", def: "A generate → critique → revise loop where the model reviews its own output and improves it before returning." },
    { term: "Evaluator-optimizer", def: "A loop that scores each generation against a bar and keeps revising until it passes or a budget runs out." },
    { term: "Sub-agent", def: "A separate model invocation with its own small, clean context, used for one focused task and returning a condensed result." },
    { term: "Orchestrator", def: "The top-level agent (or code) that plans, dispatches to sub-agents and synthesises their condensed results." },
    { term: "Step budget", def: "A hard cap on the number of model or tool calls an agent may make, to bound cost and runaway loops." },
  ],
  problem: [
    "The DevAtlas team's study assistant must now do three things: mark lessons done after a short conversation, migrate a lesson's code samples when the API changes, and write a weekly 'what changed in AI' brief that pulls several sources together.",
    "One naive agent for all three is tempting, but each task wants a different shape: the first is a short decision loop, the second is 'plan, then run, then fix', and the third benefits from several focused workers feeding one summary. The question is not 'agent or not', but which loop, and how to keep each one bounded and testable.",
  ],
  concept: {
    analogy: [
      "**ReAct** is a technician thinking out loud at a workbench: 'I need a 10 mm socket', picks it up, sees it doesn't fit, says 'try 11 mm'. **Plan-and-execute** is a project manager who writes the task list before anyone touches a tool, and re-plans only when a step fails. **Multi-agent** is a chief engineer briefing three specialists in separate rooms, then writing the report from their one-paragraph memos instead of reading all their raw notes.",
    ],
    precise: [
      "**ReAct** is the minimal agent loop: reason → act → observe, repeated until the model ends its turn or a budget is hit. The 'thought' is optional output but valuable for debugging and audit. Its weakness is that every turn is a fresh model call, so it is the most expensive and least deterministic pattern.",
      "**Plan-and-execute** splits planning from execution. The model emits a plan once (a list of steps); code runs each step, and only on a step failure does the model re-plan a smaller, corrected plan. This is cheaper (one planning call, not one per step) and more predictable, at the cost of less flexibility mid-task.",
      "**Reflection and evaluator-optimizer** add a quality loop: generate, then critique (reflection) or score (evaluator-optimizer), then revise. They convert 'the model did something' into 'the model did something that passed a bar', which is the seed of the evaluation discipline in lesson 7.4.3.",
      "**Multi-agent orchestration** trades one long context for several clean ones. Each sub-agent gets a narrow task and its own context window, does deep work (possibly tens of thousands of tokens), and returns a condensed summary (often a few hundred tokens). The orchestrator synthesises those summaries. This is the pattern behind Anthropic's multi-agent research system and Claude Code's sub-agents.",
      "**Choose by predictability and cost.** Steps known in advance → workflow (lesson 7.3.1). Steps depend on discoveries but a plan helps → plan-and-execute. Steps are few and interactive → ReAct. Output quality is the bottleneck → reflection / evaluator-optimizer. Several independent deep dives → multi-agent. Every agent needs a step budget and a trace.",
    ],
  },
  underTheHood: {
    text: [
      "All of these patterns are the same primitive arranged differently: a model call that returns structured output, plus code that decides what to call next. In ReAct the loop is the agent; in plan-and-execute the loop is over a plan; in evaluator-optimizer the loop is over a score.",
      "The trace is the universal diagnostic. Every step logs its thought, tool, arguments and result. When an agent misbehaves, you read the trace, not the final answer — the same way you read a stack trace, not the exit code.",
      "Failure modes compound: an error in step two becomes bad input to step three. Bounded loops (max turns, max tokens, wall-clock timeout) stop a bad run from becoming an expensive one, and returning a partial result with a note beats crashing after spending the whole budget.",
    ],
    diagram: {
      title: "Four loops, one primitive",
      nodes: [
        { label: "ReAct", sub: "reason → act → observe" },
        { label: "Plan-execute", sub: "plan → run → replan" },
        { label: "Reflection", sub: "generate → critique → revise" },
        { label: "Multi-agent", sub: "dispatch → condense → synthesise" },
        { label: "Budget + trace", sub: "wrap every loop" },
      ],
      edges: ["or", "or", "or", "always"],
    },
  },
  handsOn: [
    {
      title: "A ReAct loop",
      text: [
        "The classic agent loop: reason, act, observe. The `reason` function is a stub here (in production it is one LLM call returning a thought plus an optional tool call, as in lesson 7.1.3); the loop mechanics around it are the real part.",
      ],
      code: {
        lang: "python",
        file: "react.py",
        code: `"""ReAct loop: reason -> act -> observe, repeated until the agent finishes."""
from dataclasses import dataclass


@dataclass
class Action:
    tool: str
    args: dict


TOOLS = {}


def tool(name):
    def register(fn):
        TOOLS[name] = fn
        return fn
    return register


@tool("search_lessons")
def search_lessons(query: str) -> str:
    hits = [l for l in ("7.4.2 Context engineering", "7.2.1 RAG end to end")
            if query.lower() in l.lower()]
    return str(hits)


@tool("mark_done")
def mark_done(lesson_id: str) -> str:
    return f"{lesson_id} marked done"


# In production this is ONE LLM call returning (thought, Action | None).
# The stub keeps the loop runnable offline; the loop mechanics are real.
def reason(turn: int) -> tuple[str, Action | None]:
    if turn == 0:
        return "Find the context-engineering lesson id first.", Action("search_lessons", {"query": "context"})
    if turn == 1:
        return "Found it; mark it done.", Action("mark_done", {"lesson_id": "7.4.2"})
    return "Nothing left to do.", None


def run_react(question: str, max_turns: int = 5) -> list[str]:
    trace = [f"user: {question}"]
    for turn in range(max_turns):
        thought, action = reason(turn)
        trace.append(f"thought: {thought}")
        if action is None:
            break
        result = TOOLS[action.tool](**action.args)
        trace.append(f"act: {action.tool}({action.args}) -> {result}")
    return trace


print("\\n".join(run_react("Mark the context-engineering lesson done.")))`,
      },
      output: "user: Mark the context-engineering lesson done.\nthought: Find the context-engineering lesson id first.\nact: search_lessons({'query': 'context'}) -> ['7.4.2 Context engineering']\nthought: Found it; mark it done.\nact: mark_done({'lesson_id': '7.4.2'}) -> 7.4.2 marked done\nthought: Nothing left to do.",
      notes: [
        "`max_turns` is the step budget. Without it, a model that keeps calling tools loops forever at your expense.",
      ],
    },
    {
      title: "Plan-and-execute",
      text: [
        "Plan once, run the steps, and re-plan a smaller plan only when a step fails. The executor is plain code, so most of the run is deterministic and cheap.",
      ],
      code: {
        lang: "python",
        file: "plan_execute.py",
        code: `"""Plan-and-execute: plan once, run the steps, replan only when a step fails."""
def plan(goal: str) -> list[str]:
    # In production: one LLM call returns the step list. Stub here.
    return ["scan repo for old API uses", "apply rename", "run tests"]


def execute(step: str) -> str:
    if step == "apply rename":
        return "ERROR: 2 files failed to parse"
    return f"ok: {step}"


def run(goal: str, max_replans: int = 2) -> list[str]:
    steps = plan(goal)
    trace = [f"plan: {steps}"]
    for _ in range(max_replans + 1):
        for s in steps:
            out = execute(s)
            trace.append(f"  {s} -> {out}")
            if out.startswith("ERROR"):
                steps = ["apply rename with the safe parser", "run tests"]
                trace.append(f"replan: {steps}")
                break
        else:
            return trace          # every step succeeded
    return trace


print("\\n".join(run("migrate the codebase to the new API")))`,
      },
      output: "plan: ['scan repo for old API uses', 'apply rename', 'run tests']\n  scan repo for old API uses -> ok: scan repo for old API uses\n  apply rename -> ERROR: 2 files failed to parse\nreplan: ['apply rename with the safe parser', 'run tests']\n  apply rename with the safe parser -> ok: apply rename with the safe parser\n  run tests -> ok: run tests",
      notes: [
        "Only the failing step triggers a new model call; the other steps never re-run. That is the cost win over ReAct, which re-decides after every single action.",
      ],
    },
    {
      title: "Multi-agent orchestration",
      text: [
        "Sub-agents each get a narrow task and return a condensed summary; the orchestrator synthesises. The sub-agent calls are independent and can run in parallel.",
      ],
      code: {
        lang: "python",
        file: "multi_agent.py",
        code: `"""Multi-agent: sub-agents work in clean contexts and return condensed summaries."""
DOCS = {
    "docker": [
        "Docker layers are cached by instruction order, so put rarely-changing steps first.",
        "Multi-stage builds drop the build tools from the final image.",
    ],
    "rag": [
        "RAG retrieves the top-k chunks and cites the source for each claim.",
        "Hybrid search merges BM25 keyword results with vector results.",
    ],
    "rust": [
        "Ownership prevents use-after-free at compile time.",
        "The borrow checker rejects aliasing plus mutation.",
    ],
}


def sub_agent(topic: str, docs: list[str]) -> str:
    # In production: a model call with its own small, clean context. Stub here.
    condensed = "; ".join(d[:50] + "..." for d in docs)
    return f"[{topic}] {condensed}"


def orchestrator(question: str) -> str:
    topics = [t for t in DOCS if t in question.lower()] or list(DOCS)
    findings = {t: sub_agent(t, DOCS[t]) for t in topics}   # parallelisable
    # In production: one final model call synthesises the condensed summaries.
    return "synthesis:\\n" + "\\n".join(f"  {v}" for v in findings.values())


print(orchestrator("compare docker and rust approaches"))`,
      },
      output: "synthesis:\n  [docker] Docker layers are cached by instruction order, so ...; Multi-stage builds drop the build tools from the f...\n  [rust] Ownership prevents use-after-free at compile time....; The borrow checker rejects aliasing plus mutation....",
      notes: [
        "Each sub-agent returns a digest, not its whole context, so the orchestrator's window stays small and focused. That separation of concerns is the entire point of the pattern.",
      ],
    },
  ],
  companies: [
    "**Coding agents** such as Claude Code use sub-agents for deep, parallel exploration: a sub-agent searches a large codebase or runs a long investigation and returns a condensed summary to the main agent, keeping the main context clean.",
    "**Anthropic's multi-agent research system** orchestrates a lead agent that plans and parallel sub-agents that gather evidence; it reports a substantial improvement over a single agent on complex research tasks.",
    "**Support and back-office agents** are usually plan-and-execute or plain workflows, because the steps (classify, look up, draft, escalate) are known and auditors need a deterministic record.",
    "**Evaluator-optimizer loops** appear wherever quality is the bottleneck: code review, writing, and test generation iterate generate → critique → revise against a passing bar before the result reaches a human.",
  ],
  mistakes: [
    {
      mistake: "Using ReAct for a plan that is known in advance",
      why: "One loop looks simpler than designing the steps",
      wrong: "A model call (and its cost and latency) for every step, plus non-determinism where none was needed",
      fix: "Write a plan-and-execute or a plain workflow; keep the model only where judgement is needed",
    },
    {
      mistake: "No step or token budget",
      why: "Trusting the model to stop on its own",
      wrong: "A loop that burns money and wall-clock time without converging",
      fix: "Cap turns, tokens and time; return a partial result with a note when the cap is hit",
    },
    {
      mistake: "One giant context for the whole task",
      why: "Simpler than coordinating sub-agents",
      wrong: "Context rot and lost focus as the window fills with raw tool output",
      fix: "Split deep work into sub-agents that return condensed summaries to an orchestrator",
    },
    {
      mistake: "Re-planning from scratch on every failure",
      why: "Treating each error as a brand-new problem",
      wrong: "Repeating steps that already succeeded, and losing the original goal",
      fix: "Re-plan only the failed remainder, and keep a note of what already worked",
    },
    {
      mistake: "Skipping the trace",
      why: "Only the final answer is shown to users",
      wrong: "No way to explain or fix a wrong action after the fact",
      fix: "Log thought, tool, arguments, result and duration for every step",
    },
  ],
  bestPractices: [
    {
      tag: "Cost",
      text: "Choose the cheapest loop that works: workflow < plan-and-execute < ReAct. Put a step and token budget on every agent.",
    },
    {
      tag: "Reliability",
      text: "Return partial results gracefully on budget exhaustion instead of crashing, and always record a step-by-step trace.",
    },
    {
      tag: "Maintainability",
      text: "Keep the model's decision output structured (thought + tool + args) so the loop and the tests are ordinary code.",
    },
    {
      tag: "Performance",
      text: "Run independent sub-agent calls in parallel, and let ReAct agents request several tools in a single turn.",
    },
    {
      tag: "Security",
      text: "Sub-agents inherit the same least-privilege and human-approval rules as any agent tool (lesson 7.3.1); isolate untrusted input per sub-agent.",
    },
  ],
  interview: [
    {
      q: "What is the difference between ReAct and plan-and-execute, and when would you choose each?",
      a: "ReAct interleaves reasoning and acting, re-deciding after every tool result; it fits short, interactive tasks where each step depends on what the last revealed. Plan-and-execute makes one plan, runs steps in code, and re-plans only on failure, so it is cheaper and more deterministic and fits tasks with a clear sequence such as a code migration.",
    },
    {
      q: "Why would you split one agent into multiple sub-agents?",
      a: "To keep contexts clean. A single long context accumulates raw tool output and suffers context rot; sub-agents each do one focused deep task in their own window and return a condensed summary, so the orchestrator reasons over a small, high-signal set of results. It also parallelises naturally.",
    },
    {
      q: "How do you stop an agent from looping forever?",
      a: "Budgets: a maximum number of steps (tool calls), a token budget, and a wall-clock timeout. When a cap is hit, return a partial result with a note rather than crashing. A trace of every step lets you see whether the loop is converging or repeating.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A one-off migration needs to rename an API across 40 files, run tests, and fix any breakage. Which pattern fits best?",
      options: ["ReAct", "Plan-and-execute", "A single prompt with no tools", "Multi-agent only"],
      answer: 1,
      explanation: "The sequence is known; plan once, run in code, and re-plan only the failures. ReAct would re-decide after every file.",
    },
    {
      kind: "output",
      prompt: "What does this loop print?",
      code: {
        lang: "python",
        code: `calls = 0

def step():
    global calls
    calls += 1
    return "done" if calls < 3 else "stop"

out = []
for _ in range(10):
    r = step()
    out.append(r)
    if r == "stop":
        break
print(out)`,
      },
      options: [
        "['done', 'done', 'stop']",
        "['done', 'done']",
        "['stop']",
        "['done', 'done', 'stop', 'stop']",
      ],
      answer: 0,
      explanation: "calls becomes 1, 2, then 3; the third step returns 'stop' and the loop breaks, printing three entries.",
    },
    {
      kind: "bug",
      prompt: "A plan-and-execute agent re-runs the entire plan every time one step fails. What is the flaw?",
      options: [
        "Steps already completed are repeated, wasting work and possibly double-applying side effects",
        "Plans should never change",
        "Executors must be written in Rust",
        "There is no flaw",
      ],
      answer: 0,
      explanation: "Re-running completed steps wastes resources and can double-apply effects (e.g. charging twice). Re-plan only the failed remainder and record what succeeded.",
    },
  ],
  cheatSheet: [
    "Workflow when steps are known; agent only when steps must be discovered (7.3.1).",
    "ReAct = reason → act → observe, re-deciding each turn; most expensive, most flexible.",
    "Plan-and-execute = plan once, run in code, re-plan only on failure.",
    "Reflection = generate → critique → revise; evaluator-optimizer adds a score bar.",
    "Multi-agent = sub-agents with clean contexts returning condensed summaries to an orchestrator.",
    "Always wrap every loop in a step budget, a token budget and a wall-clock timeout.",
    "Trace every step (thought, tool, args, result, duration) for audit and debugging.",
    "Return partial results gracefully when a budget is hit.",
    "Choose the cheapest loop that meets the quality bar.",
  ],
  homework: {
    basic: {
      title: "A reflection loop",
      brief: [
        "Implement the reflection pattern: generate an answer, critique it, and revise, for two passes. Make the critique and revise functions deterministic stubs so it runs offline, and print the full trace.",
      ],
      criteria: [
        "Loop prints generate, critique and revise for each pass",
        "Each revise is visibly different from the previous draft",
        "Runs offline with no API key",
      ],
      hints: ["Keep a counter or list of known gaps so each critique differs."],
      solution: {
        text: [
          "Reflection is the cheapest quality loop: the model reads its own draft and improves it. A deterministic stub makes the mechanics testable without a model, which is exactly how you should build the loop before wiring a real LLM in.",
        ],
        code: {
          lang: "python",
          file: "reflection.py",
          code: `"""Reflection pattern: generate -> critique -> revise, iterating to a stronger answer."""
state = {"pass": 0}


def generate(task: str) -> str:
    return "Draft answer: a vector DB stores embeddings and finds nearest neighbours."


def critique(draft: str) -> str:
    # In production: a model call listing flaws. Stub advances through known gaps.
    gaps = [
        "Missing: what an embedding is.",
        "Missing: when to choose a vector DB over a plain array.",
        "No gaps.",
    ]
    state["pass"] += 1
    return gaps[min(state["pass"], len(gaps)) - 1]


def revise(draft: str, feedback: str) -> str:
    if "embedding is" in feedback:
        return "An embedding is a dense vector of meaning; a vector DB stores them and returns nearest neighbours."
    if "when to choose" in feedback:
        return ("An embedding is a dense vector of meaning. A vector DB stores them and returns "
                "nearest neighbours; choose one when you have many vectors and need filtering.")
    return draft


def run(task: str, passes: int = 2) -> list[str]:
    trace = [f"task: {task}"]
    draft = generate(task)
    trace.append(f"generate: {draft}")
    for _ in range(passes):
        fb = critique(draft)
        trace.append(f"critique: {fb}")
        draft = revise(draft, fb)
        trace.append(f"revise:   {draft}")
    return trace


print("\\n".join(run("explain vector databases")))`,
        },
        output: "task: explain vector databases\ngenerate: Draft answer: a vector DB stores embeddings and finds nearest neighbours.\ncritique: Missing: what an embedding is.\nrevise:   An embedding is a dense vector of meaning; a vector DB stores them and returns nearest neighbours.\ncritique: Missing: when to choose a vector DB over a plain array.\nrevise:   An embedding is a dense vector of meaning. A vector DB stores them and returns nearest neighbours; choose one when you have many vectors and need filtering.",
      },
    },
    intermediate: {
      title: "An evaluator-optimizer loop",
      brief: [
        "Add a score bar to the reflection loop: each generation is scored, and the loop keeps revising until the score clears the bar or a maximum number of tries is reached. Print the score per attempt and the accept/reject decision.",
      ],
      criteria: [
        "Loop exits early when the bar is met",
        "Loop rejects when the bar is never met within the budget",
        "Score function is a deterministic stub",
      ],
      hints: ["`score` returns an int; compare against a constant bar."],
      solution: {
        text: [
          "Evaluator-optimizer turns 'generate something' into 'generate something good enough'. The bar is the bridge to lesson 7.4.3, where the score comes from a real eval instead of a stub.",
        ],
        code: {
          lang: "python",
          file: "evaluator_optimizer.py",
          code: `"""Evaluator-optimizer: loop generate/score until the output clears a bar."""
SCORE_BAR = 8


def generate(task: str, attempt: int) -> str:
    # In production: a model call. Stub improves on each attempt.
    return "the answer" if attempt == 0 else "the answer with a cited source"


def score(draft: str) -> int:
    # In production: an LLM-as-judge call. Stub here (see lesson 7.4.3).
    return 6 if "source" not in draft else 9


def run(task: str, max_tries: int = 3) -> list[str]:
    trace = [f"task: {task} (bar {SCORE_BAR})"]
    for attempt in range(max_tries):
        draft = generate(task, attempt)
        s = score(draft)
        trace.append(f"try {attempt}: score {s}  {draft}")
        if s >= SCORE_BAR:
            trace.append("accepted")
            return trace
    trace.append("rejected: best score below bar")
    return trace


print("\\n".join(run("answer with evidence")))`,
        },
        output: "task: answer with evidence (bar 8)\ntry 0: score 6  the answer\ntry 1: score 9  the answer with a cited source\naccepted",
      },
    },
    challenge: {
      title: "A plan-and-execute with step budgets and partial results",
      brief: [
        "Extend the plan-and-execute run so it (a) has a maximum number of steps, (b) records which steps already succeeded, and (c) returns a partial result with the completed steps when the budget is exhausted instead of failing. Test it with a plan that keeps failing.",
      ],
      criteria: [
        "Completed steps are not re-run after a replan",
        "Budget exhaustion returns a partial result, not an exception",
        "A trace shows each step and its outcome",
      ],
      hints: ["Keep a `done` list separate from the `steps` list; replan only the remainder."],
      solution: {
        text: [
          "The important engineering decision is idempotency of the trace: record what succeeded, and only ever schedule the remainder. That turns a multi-step agent from 'all or nothing' into something you can resume, inspect and safely retry.",
        ],
        code: {
          lang: "python",
          file: "plan_execute_budget.py",
          code: `"""Plan-and-execute with a step budget and partial results."""
def plan() -> list[str]:
    return ["scan", "rename", "test"]


def execute(step: str) -> str:
    return "ERROR" if step == "rename" else "ok"


def run(max_steps: int = 4) -> tuple[list[str], list[str]]:
    steps, done, trace = plan(), [], []
    for s in steps:
        if len(done) >= max_steps:
            trace.append("budget exhausted; returning partial result")
            break
        out = execute(s)
        trace.append(f"{s} -> {out}")
        if out.startswith("ERROR"):
            trace.append("replan: re-run only the failed step")
            continue
        done.append(s)
    return trace, done


trace, done = run(max_steps=3)
print("\\n".join(trace))
print("completed (not re-run):", done)`,
        },
        output: "scan -> ok\nrename -> ERROR\nreplan: re-run only the failed step\ntest -> ok\ncompleted (not re-run): ['scan', 'test']",
      },
    },
    capstone: {
      title: "DevAtlas: a bounded study-assistant orchestrator",
      brief: [
        "Build the study assistant's front door as a bounded orchestrator: it plans a small set of steps (search lessons, mark done), enforces a tool-call budget, and emits an audit trace of every step with its outcome. Wire it to the MCP server from lesson 7.3.1 in the real implementation.",
      ],
      criteria: [
        "Step and tool-call budgets are enforced",
        "Budget exhaustion raises a clear error with a message",
        "Trace records tool, arguments and result for every call",
        "Runs offline with stub tools",
      ],
      hints: ["Model the trace as a list of `(tool, args, result)` tuples."],
      solution: {
        text: [
          "The orchestrator is thin: it owns the budget and the trace; the model only supplies the next step. Keeping policy in code and judgement in the model is the recurring theme of the whole phase.",
        ],
        code: {
          lang: "python",
          file: "agent_orchestrator.py",
          code: `"""Capstone skeleton: a DevAtlas agent orchestrator with budgets and an audit trace."""
class BudgetExceeded(Exception):
    pass


LESSONS = {"7.2.1": "RAG end to end", "7.4.2": "Context engineering"}


def run_agent(question: str, max_calls: int = 3) -> list[str]:
    calls = 0
    trace = [f"user: {question}"]
    # Stub: replace with a real ReAct loop (lesson 7.4.1) calling an MCP server (7.3.1).
    steps = [("search_lessons", {"query": "context"}), ("mark_done", {"lesson_id": "7.4.2"})]
    for tool, args in steps:
        calls += 1
        if calls > max_calls:
            raise BudgetExceeded(f"budget of {max_calls} tool calls reached")
        if tool == "search_lessons":
            result = LESSONS["7.4.2"]
        else:
            result = "7.4.2 marked done"
        trace.append(f"  {tool}{args} -> {result}")
    trace.append(f"(total tool calls: {calls})")
    return trace


for line in run_agent("mark the context-engineering lesson done"):
    print(line)`,
        },
        output: "user: mark the context-engineering lesson done\n  search_lessons{'query': 'context'} -> Context engineering\n  mark_done{'lesson_id': '7.4.2'} -> 7.4.2 marked done\n(total tool calls: 2)",
      },
    },
  },
  deeper: [
    { label: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents" },
    { label: "Anthropic: How we built our multi-agent research system", url: "https://www.anthropic.com/engineering/built-multi-agent-research-system" },
    { label: "ReAct: Synergizing Reasoning and Acting in Language Models (paper)", url: "https://arxiv.org/abs/2210.03629" },
    { label: "LangGraph: workflows and agents", url: "https://docs.langchain.com/oss/python/langgraph/workflows-agents" },
  ],
  nextPreview: "Next: context engineering — curating what goes into the limited context window, cutting cost with prompt caching, and keeping long-horizon agents coherent.",
};
