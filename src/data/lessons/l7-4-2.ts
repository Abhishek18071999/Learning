import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.4.2",
  title: "Context engineering: long context, prompt caching and attention budgets",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["7.1.3 Calling LLM APIs: structured output, tools, streaming"],
  summary: "Treat the context window as a finite resource: measure what you put into it, budget the tokens that matter, cut cost and latency with prompt caching, and keep long-horizon agents coherent with compaction and note-taking.",
  terms: [
    { term: "Context window", def: "The maximum number of tokens a model can consider at once, covering input, tools, history and output." },
    { term: "Context engineering", def: "Curating the smallest set of high-signal tokens that maximises the chance of the desired output, each turn." },
    { term: "Attention budget / context rot", def: "The observation that a model's recall of details degrades as context grows, so every extra token has a cost in focus, not just money." },
    { term: "Prompt caching", def: "Storing a stable prompt prefix on the provider side so later requests reuse it instead of reprocessing it." },
    { term: "Cache breakpoint", def: "The marker that says where the reusable prefix ends; everything before it can be cached, everything after is fresh." },
    { term: "Compaction", def: "Summarising a near-full context window and continuing in a fresh window from the summary." },
    { term: "Note-taking (agentic memory)", def: "An agent writing durable notes outside the context window and reading them back later, so state survives context resets." },
  ],
  problem: [
    "The DevAtlas tutor works over long, multi-turn study sessions, pulls several retrieved chunks into every answer, and carries tool definitions and conversation history. Some sessions now cost far more than the content they serve, and the tutor occasionally forgets an instruction the learner gave ten messages ago.",
    "The instinct is to 'just get a bigger context window', but a larger window does not remove the real constraint: the model's attention is finite, and every token you add — including noise — competes for it. The task is to decide what goes into the window, keep the stable part cached, and carry only what still matters forward.",
  ],
  concept: {
    analogy: [
      "The context window is a **workbench**: you have a fixed amount of surface, and only what is on it is available while you work. The attention budget is your **working memory**: even if the bench is huge, you can only keep a few things in mind at once, and the more you pile on, the easier it is to lose the one screw that matters. **Prompt caching** is leaving the reference manual open to the right page between jobs. **Compaction** is copying your key notes to a fresh page when the old one is full.",
    ],
    precise: [
      "**Context is finite and costly.** A model sees tokens, not documents. Every token adds cost and latency, and — more importantly — competes for an 'attention budget' that decays as context grows. Anthropic calls the recall degradation **context rot**; the 'Lost in the Middle' paper showed models use the beginning and end of a long context better than the middle.",
      "**Context engineering is curation, not prompting.** Prompt engineering is about wording; context engineering is about *which tokens* are present: a minimal, high-signal system prompt, a small set of non-overlapping tools, few-but-diverse examples, and just-in-time retrieval instead of dumping everything up front.",
      "**Prompt caching cuts cost and latency on the stable prefix.** Providers let you mark a cache breakpoint: the prefix (tools → system → messages, in order) before it is cached and reused across requests. A 5-minute cache write costs about 1.25× the input price and a read about 0.1×; a 1-hour write costs about 2×. Put the breakpoint at the end of the part that does not change, not on the per-request suffix.",
      "**Long-horizon coherence needs compaction, notes or sub-agents.** When a task outgrows the window: *compaction* summarises the conversation and continues in a fresh window; *note-taking* writes durable notes outside the window and reads them back; *sub-agents* (lesson 7.4.1) keep deep work in separate windows and return summaries.",
      "**Measure, don't guess.** Count tokens with a tokenizer, reserve budget for the system prompt, tools and the answer, and gate prompts before they reach the model. A budget guard is cheaper than a surprise bill or a truncated answer.",
    ],
  },
  underTheHood: {
    text: [
      "The tokenizer is your measuring tape. A system prompt, tool definitions, retrieved chunks and conversation history are all just tokens; counting them with a tokenizer (here `cl100k_base`, the GPT-4 class encoding) tells you exactly how much of the window you are spending.",
      "Prompt caching works on the prefix. The provider caches everything up to your breakpoint (in the order tools, system, then messages) and reuses it on later requests whose prefix matches. Change anything at or before the breakpoint and the whole prefix is re-written; put the breakpoint on content that changes every request (a timestamp, the user's message) and you never get a hit.",
      "Attention degrades with length because the transformer attends to every pair of tokens — n² relationships for n tokens — and is trained mostly on shorter sequences. So a bigger window is not a free pass: it is more surface for the model to lose a detail in. The fix is to keep only high-signal tokens in the window and retrieve the rest just in time.",
    ],
    diagram: {
      title: "What fills a context window",
      nodes: [
        { label: "System", sub: "instructions, role" },
        { label: "Tools", sub: "definitions + schemas" },
        { label: "Examples", sub: "few-shot" },
        { label: "Retrieved", sub: "RAG chunks" },
        { label: "History", sub: "turns so far" },
        { label: "Output", sub: "reserved" },
      ],
      edges: ["+", "+", "+", "+", "+", "≤ window"],
    },
  },
  handsOn: [
    {
      title: "Count the tokens",
      text: [
        "The first move is measurement. Tokenize each part of a prompt to see exactly what a window is spending its budget on.",
      ],
      code: {
        lang: "python",
        file: "token_budget.py",
        code: `"""Count tokens and fit a prompt into a context budget (cl100k_base, the GPT-4 class encoding)."""
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")

SYSTEM = "You are the DevAtlas tutor. Answer only from the retrieved lessons and cite lesson ids."
TOOLS = "tools: [search_lessons, get_progress, mark_done]"
CHUNKS = [
    "A vector database stores embeddings and returns nearest neighbours.",
    "Hybrid search fuses BM25 keyword results with vector results.",
    "Reranking re-scores retrieved chunks against the query before generation.",
]
HISTORY = [("user", "what is hybrid search?"), ("assistant", "It merges keyword and vector search.")]

parts = {
    "system": SYSTEM,
    "tools": TOOLS,
    "docs": "\\n".join(CHUNKS),
    "history": "\\n".join(f"{r}: {t}" for r, t in HISTORY),
}
total = 0
for name, text in parts.items():
    n = len(enc.encode(text))
    total += n
    print(f"{name:8} {n:5} tokens")
print(f"{'TOTAL':8} {total:5} tokens")

BUDGET = 2048
print(f"budget {BUDGET}: used {total} ({total/BUDGET:.0%}), left {BUDGET - total}")`,
      },
      output: "system      18 tokens\ntools       13 tokens\ndocs        37 tokens\nhistory     16 tokens\nTOTAL       84 tokens\nbudget 2048: used 84 (4%), left 1964",
      notes: [
        "`pip install tiktoken`. Different models use different tokenizers, so always count with the one your model uses — a token count from the wrong encoding is a guess.",
      ],
    },
    {
      title: "Price prompt caching",
      text: [
        "Cache hits are dramatically cheaper than fresh input. This simulates the arithmetic for a 100 000-token stable prefix plus a small per-request suffix across 20 calls.",
      ],
      code: {
        lang: "python",
        file: "prompt_caching.py",
        code: `"""Prompt-caching arithmetic: how a cached stable prefix cuts cost across calls."""
BASE_INPUT = 10.0   # dollars per million input tokens (illustrative, not a real price)
WRITE_5M = 1.25     # 5-minute cache write multiplier over base input
WRITE_1H = 2.0      # 1-hour cache write multiplier over base input
READ = 0.1          # cache read multiplier over base input


def cost(prefix: int, suffix: int, mode: str, calls: int) -> float:
    if mode == "no-cache":
        return calls * (prefix + suffix) / 1e6 * BASE_INPUT
    write_mult = WRITE_5M if mode == "cache-5m" else WRITE_1H
    write = prefix / 1e6 * BASE_INPUT * write_mult        # first call writes the prefix
    reads = (calls - 1) * prefix / 1e6 * BASE_INPUT * READ  # later calls read it
    suffix_cost = calls * suffix / 1e6 * BASE_INPUT       # suffix is never cached
    return write + reads + suffix_cost


prefix, suffix, calls = 100_000, 2_000, 20
for mode in ("no-cache", "cache-5m", "cache-1h"):
    print(f"{mode:9} \${cost(prefix, suffix, mode, calls):8.2f}")`,
      },
      output: "no-cache  $   20.40\ncache-5m  $    3.55\ncache-1h  $    4.30",
      notes: [
        "The multipliers (write ~1.25×/2× for 5 min/1 hour, read ~0.1×) are real ratios, but the base price is illustrative — always read the current pricing for your provider. The lesson is structural: put the long, stable part first and mark it.",
      ],
    },
    {
      title: "Compaction and note-taking",
      text: [
        "When the window fills up, compact the conversation into a summary and carry durable notes forward. Here both are deterministic stubs so the mechanics are visible.",
      ],
      code: {
        lang: "python",
        file: "compaction.py",
        code: `"""Compaction + note-taking: keep long-horizon agents coherent past the context window."""
def compact(history: list[str]) -> str:
    # In production: a model call summarises what still matters. Stub here.
    keep = [h for h in history if "lesson" in h.lower() or "done" in h.lower()]
    return "SUMMARY: " + "; ".join(keep[-3:])


def note(memory: dict, key: str, value: str) -> None:
    memory[key] = value


history = [
    "user: what is a vector database?",
    "tool: search -> ['7.2.1 RAG end to end', '5.3.1 Redis and vectors']",
    "assistant: a vector DB stores embeddings and returns nearest neighbours.",
    "user: ok, and how do I pick a chunk size?",
    "tool: search -> ['7.2.1 RAG end to end']",
    "assistant: start around 512 tokens with about 10 percent overlap.",
    "user: please mark 7.2.1 as done for me.",
    "tool: mark_done(7.2.1) -> 7.2.1 marked done",
    "assistant: done.",
]

memory: dict = {}
note(memory, "goal", "mark 7.2.1 done")
note(memory, "progress", "explained vector DBs and chunk size")

print("context window is full; compacting...")
summary = compact(history)
print(summary)
print("notes carried forward:", memory)
print(f"history ~{sum(len(h.split()) for h in history)} words  ->  summary ~{len(summary.split())} words")`,
      },
      output: "context window is full; compacting...\nSUMMARY: user: please mark 7.2.1 as done for me.; tool: mark_done(7.2.1) -> 7.2.1 marked done; assistant: done.\nnotes carried forward: {'goal': 'mark 7.2.1 done', 'progress': 'explained vector DBs and chunk size'}\nhistory ~72 words  ->  summary ~17 words",
      notes: [
        "Compaction trades a little fidelity for coherence: a good summary keeps decisions and unresolved issues and drops redundant tool output. Tune the compaction prompt for recall first, then precision.",
      ],
    },
  ],
  companies: [
    "**Claude Code** uses just-in-time context: lightweight references (file paths, search queries) let it load only what it needs with `grep`/`glob` instead of dumping a whole repo into the window.",
    "**Prompt caching is the standard cost lever** for agents and RAG apps with a long, stable system prompt plus examples; providers expose it as a cache marker, and teams structure prompts so the static part sits at the front.",
    "**Long-running agents** (coding migrations, research) use compaction, structured notes and sub-agents to stay coherent past the window — Claude Code, for instance, keeps a to-do list and summarises before continuing.",
    "**RAG apps decide between 'stuff everything' and retrieve** by measuring: long context is expensive and can still lose the key fact, so retrieval stays the default for large corpora even with million-token windows.",
  ],
  mistakes: [
    {
      mistake: "Dumping every document into the prompt because the window is large",
      why: "'The model can handle it'",
      wrong: "Higher cost and latency, and the key fact can be lost in the middle of a long context",
      fix: "Retrieve just in time and keep the prompt tight; use a token budget",
    },
    {
      mistake: "Putting the cache breakpoint on content that changes every request",
      why: "Marking the last block by habit",
      wrong: "No cache hit is ever found, so you pay a write on every call",
      fix: "Place the breakpoint at the end of the truly stable prefix (tools, system, examples)",
    },
    {
      mistake: "Counting tokens with the wrong tokenizer",
      why: "Using one tokenizer for every model",
      wrong: "A wrong count busts the budget and can truncate the answer",
      fix: "Use the tokenizer matching the model you call, and verify with the API's usage field",
    },
    {
      mistake: "Growing message history without bound",
      why: "More context seems safer",
      wrong: "Context rot and runaway cost as every turn re-sends the whole history",
      fix: "Summarise old turns (compaction) or persist notes, and trim redundant tool output",
    },
    {
      mistake: "Bloated tool sets and vague examples",
      why: "Adding every tool and edge case 'just in case'",
      wrong: "The model wastes attention and picks the wrong tool",
      fix: "Keep a minimal, non-overlapping tool set and a few diverse canonical examples",
    },
  ],
  bestPractices: [
    {
      tag: "Cost",
      text: "Cache the stable prefix; budget and measure every prompt with the correct tokenizer before it reaches the model.",
    },
    {
      tag: "Maintainability",
      text: "Keep the system prompt minimal and high-signal; treat context like a code review — every token must earn its place.",
    },
    {
      tag: "Reliability",
      text: "For long tasks use compaction, notes or sub-agents instead of an unbounded window; verify the summary keeps decisions and open issues.",
    },
    {
      tag: "Performance",
      text: "Retrieve just in time rather than up front; a hybrid of pre-fetch plus on-demand exploration balances speed and focus.",
    },
    {
      tag: "Security",
      text: "Remember retrieved text and tool output are untrusted input (lesson 7.3.2) — the smaller the window, the easier the blast radius is to reason about.",
    },
  ],
  interview: [
    {
      q: "What is context engineering and how does it differ from prompt engineering?",
      a: "Prompt engineering is about how instructions are worded. Context engineering is about which tokens are present in the window at all — system prompt, tools, examples, retrieved text and history — and curating the smallest high-signal set each turn. As agents loop over many turns, deciding what to include and prune becomes more important than phrasing.",
    },
    {
      q: "How does prompt caching work and why does breakpoint placement matter?",
      a: "The provider caches the prompt prefix up to a breakpoint (in the order tools, system, messages) and reuses it on later matching requests, charging much less for reads than writes. The breakpoint must sit at the end of the stable prefix; if it lands on content that changes every request, the hash never matches and you get no hits.",
    },
    {
      q: "Why is a larger context window not a substitute for good retrieval?",
      a: "Attention degrades as context grows (context rot; models use the middle of a long context poorly), and long context costs more and adds latency. Retrieval keeps the window focused on high-signal text, which beats 'stuff everything' for most large corpora.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Where should you place the cache breakpoint in a request with a long stable system prompt, tool definitions, and a per-request user message?",
      options: [
        "On the user message",
        "At the end of the tool definitions / system prompt",
        "On the assistant's previous reply",
        "Nowhere — caching is automatic",
      ],
      answer: 1,
      explanation: "Everything before the breakpoint is cached, so it must end at the last stable block. Marking the changing user message means the prefix hash never matches.",
    },
    {
      kind: "output",
      prompt: "What does this token-budget check print?",
      code: {
        lang: "python",
        code: `def guard(tokens, limit):
    if tokens > limit:
        return f"rejected: {tokens} > {limit}"
    return f"ok: {tokens} <= {limit}"

for t in (400, 512, 513):
    print(guard(t, 512))`,
      },
      options: [
        "ok, ok, ok",
        "ok, ok, rejected: 513 > 512",
        "rejected three times",
        "ok, rejected, ok",
      ],
      answer: 1,
      explanation: "400 and 512 pass; 513 exceeds the limit and is rejected.",
    },
    {
      kind: "bug",
      prompt: "An agent keeps re-sending the entire conversation plus every tool result on each turn. What is the underlying problem?",
      options: [
        "No cache breakpoint is set",
        "Context grows without pruning, causing context rot and runaway cost",
        "The tokenizer is wrong",
        "There is no problem",
      ],
      answer: 1,
      explanation: "Unbounded history and raw tool output fill the window and hurt recall; compact old turns, trim tool results, and persist only what matters.",
    },
  ],
  cheatSheet: [
    "The window is a budget: system + tools + examples + retrieved + history + output.",
    "Context rot: recall degrades as context grows, so curate, don't dump.",
    "Count tokens with the tokenizer matching your model.",
    "Prompt caching: cache the stable prefix; breakpoint at its end.",
    "Cache ratios: 5-minute write ~1.25×, 1-hour write ~2×, read ~0.1× of input.",
    "Put tools → system → messages in that order; keep tools minimal and non-overlapping.",
    "Long tasks: compact, take notes, or spawn sub-agents — don't grow the window forever.",
    "Retrieve just in time instead of stuffing everything up front.",
    "Gate prompts before the model: reject over-budget requests in code.",
  ],
  homework: {
    basic: {
      title: "Fit chunks into a budget",
      brief: [
        "Write a function that takes a list of retrieved chunks, tokenizes them with `tiktoken`, and greedily fits as many as possible into a token budget while reserving room for the system prompt, tools and the answer. Print each chunk's token count and the total used.",
      ],
      criteria: [
        "Uses the correct tokenizer (`cl100k_base`)",
        "Reserves a fixed amount for non-document parts",
        "Stops adding chunks that would exceed the limit",
      ],
      hints: ["Greedy in order is fine; keep a running total and break when the next chunk does not fit."],
      solution: {
        text: [
          "Budgeting the retrieved chunks separately from the fixed parts is the standard RAG discipline: it lets you raise `k` for retrieval while guaranteeing the assembled prompt stays inside the window.",
        ],
        code: {
          lang: "python",
          file: "fit_chunks.py",
          code: `"""Fit retrieved chunks into a context budget, reserving room for the rest of the prompt."""
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")
BUDGET = 512

chunks = [
    "A vector database stores embeddings and returns nearest neighbours.",
    "Hybrid search fuses BM25 keyword results with vector results.",
    "Reranking re-scores retrieved chunks against the query before generation.",
    "Postgres with pgvector adds vector search to a normal relational database.",
]


def fit(chunks, budget, reserve=64):
    # reserve room for the system prompt, tool definitions and the answer
    limit = budget - reserve
    picked, used = [], 0
    for c in chunks:
        n = len(enc.encode(c))
        if used + n > limit:
            break
        picked.append((c, n))
        used += n
    return picked, used


picked, used = fit(chunks, BUDGET)
for c, n in picked:
    print(f"{n:3}  {c}")
print(f"used {used} tokens of {BUDGET - 64} available (reserved 64)")`,
        },
        output: " 10  A vector database stores embeddings and returns nearest neighbours.\n 13  Hybrid search fuses BM25 keyword results with vector results.\n 14  Reranking re-scores retrieved chunks against the query before generation.\n 14  Postgres with pgvector adds vector search to a normal relational database.\nused 51 tokens of 448 available (reserved 64)",
      },
    },
    intermediate: {
      title: "Design a prompt-caching strategy",
      brief: [
        "For the DevAtlas tutor, decide exactly what goes before the cache breakpoint (system prompt, tool schemas, few-shot examples) and what stays after (retrieved chunks, conversation history, the user's turn). Explain what would invalidate the cache and how you would confirm hits with the API's usage fields.",
      ],
      criteria: [
        "Breakpoint ends on stable content",
        "Lists the cache hierarchy (tools → system → messages)",
        "Names at least two things that invalidate the cache",
        "Describes how to verify hits from usage fields",
      ],
      hints: ["Think of the API response's `cache_creation_input_tokens` and `cache_read_input_tokens`."],
      solution: {
        text: [
          "Cache the stable prefix: tool schemas, the system prompt, and any few-shot examples, in that order, with the breakpoint at the end of the examples. Keep retrieved chunks and the conversation after it, because they change per request. Editing a tool definition or the system prompt invalidates the whole prefix; changing only the trailing message does not. Confirm hits by reading the usage fields — a non-zero `cache_read_input_tokens` means a hit, `cache_creation_input_tokens` means a write.",
        ],
        code: {
          lang: "python",
          file: "cache_strategy.py",
          code: `"""Prompt-caching strategy: stable prefix first, then read usage fields for hits."""
def verdict(cache_read: int, cache_creation: int) -> str:
    if cache_read > 0:
        return "HIT"
    if cache_creation > 0:
        return "WRITE"
    return "MISS"


print("cache order: tools -> system -> messages (prefix), then the user turn (suffix)")
cases = {
    "same stable prefix again": (100000, 0),
    "first call (writes prefix)": (0, 100000),
    "timestamp slipped into prefix": (0, 100000),
}
for name, (read, write) in cases.items():
    print(f"{name:32} -> {verdict(read, write)}")
print("note: a timestamp in the prefix changes its hash, so the next call misses")`,
        },
        output: "cache order: tools -> system -> messages (prefix), then the user turn (suffix)\nsame stable prefix again         -> HIT\nfirst call (writes prefix)       -> WRITE\ntimestamp slipped into prefix    -> WRITE\nnote: a timestamp in the prefix changes its hash, so the next call misses",
      },
    },
    challenge: {
      title: "A compaction prompt for a study session",
      brief: [
        "Write the exact instructions you would give the model to compact a long DevAtlas study conversation into a short summary that a fresh window can continue from. Define what must be kept (goal, completed lessons, open questions, learner preferences) and what can be dropped (verbatim tool output, pleasantries), and set the target length.",
      ],
      criteria: [
        "Explicit keep-list and drop-list",
        "A target length",
        "Handles 'the goal changed' correctly",
        "No invented facts — summarise only what is in the history",
      ],
      hints: ["Prefer recall over precision first; dropping a detail is worse than keeping one too many."],
      solution: {
        text: [
          "A good compaction prompt is explicit: 'Summarise this study session for a fresh context window. KEEP: the learner's current goal, lessons already marked done, unanswered questions, and any stated preferences. DROP: verbatim tool output, greetings, and digressions. Do not invent anything not present in the history. Target under 80 words.' Then verify the summary preserves the goal and open questions before continuing.",
        ],
        code: {
          lang: "python",
          file: "compaction_prompt.py",
          code: `"""A compaction prompt for a study session, plus a keep/drop demonstration."""
COMPACTION_PROMPT = (
    "Summarise this study session for a fresh context window. "
    "KEEP: the learner's current goal, lessons marked done, unanswered questions, "
    "and any stated preferences. DROP: verbatim tool output, greetings, digressions. "
    "Do not invent anything not present in the history. Target under 80 words."
)

history = [
    "user: what is a vector database?",
    "tool: search -> ['7.2.1 RAG end to end']",
    "assistant: a vector DB stores embeddings.",
    "user: mark 7.2.1 done please",
    "tool: mark_done(7.2.1) -> done",
]

keep = [h for h in history if "done" in h or "mark" in h]
drop = [h for h in history if h not in keep]

print(COMPACTION_PROMPT)
print(f"\\nKEEP ({len(keep)}): {keep}")
print(f"DROP ({len(drop)}): {drop}")`,
        },
        output: "Summarise this study session for a fresh context window. KEEP: the learner's current goal, lessons marked done, unanswered questions, and any stated preferences. DROP: verbatim tool output, greetings, digressions. Do not invent anything not present in the history. Target under 80 words.\n\nKEEP (2): ['user: mark 7.2.1 done please', 'tool: mark_done(7.2.1) -> done']\nDROP (3): ['user: what is a vector database?', \"tool: search -> ['7.2.1 RAG end to end']\", 'assistant: a vector DB stores embeddings.']",
      },
    },
    capstone: {
      title: "DevAtlas: context budget guard",
      brief: [
        "Add a guard that tokenizes the assembled prompt and rejects it before the model call when it exceeds a limit, with a clear error message that says how many tokens it used. Wire it in front of the tutor's build-prompt step.",
      ],
      criteria: [
        "Tokenizes with the correct encoding",
        "Rejects over-limit prompts with the token count in the error",
        "Accepts under-limit prompts",
      ],
      hints: ["Raise an exception in the guard; catch it in the caller and return a friendly message."],
      solution: {
        text: [
          "Failing fast in the guard is cheaper and clearer than a truncated answer or a provider-side error. The message includes the token count so the caller can retry with fewer chunks or a shorter history.",
        ],
        code: {
          lang: "python",
          file: "budget_guard.py",
          code: `"""A context-budget guard: reject a prompt that exceeds the window before calling the model."""
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")
LIMIT = 64


def build_prompt(system: str, docs: list[str], history: list[str]) -> str:
    return "\\n\\n".join([system] + docs + history)


def guard(prompt: str, limit: int) -> str:
    n = len(enc.encode(prompt))
    if n > limit:
        raise ValueError(f"prompt is {n} tokens, over the {limit} limit")
    return f"ok: {n} tokens"


small = build_prompt("Be concise.", ["Retrieval fetches the top-k chunks."], ["user: hi"])
big = build_prompt(
    "Be concise.",
    [
        "Retrieval fetches the top-k chunks and cites sources.",
        "Hybrid search fuses BM25 keyword results with vector results.",
        "Reranking re-scores retrieved chunks against the query before generation.",
        "Postgres with pgvector adds vector search to a normal relational database.",
        "Semantic caching stores an answer keyed by an embedding of the query.",
    ],
    ["user: explain retrieval in detail please"],
)

for p in (small, big):
    try:
        print(guard(p, LIMIT))
    except ValueError as e:
        print("rejected:", e)`,
        },
        output: "ok: 16 tokens\nrejected: prompt is 77 tokens, over the 64 limit",
      },
    },
  },
  deeper: [
    { label: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" },
    { label: "Prompt caching (Claude docs)", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
    { label: "Lost in the Middle: How Language Models Use Long Contexts (paper)", url: "https://arxiv.org/abs/2307.03172" },
    { label: "tiktoken on PyPI", url: "https://pypi.org/project/tiktoken/" },
  ],
  nextPreview: "Next: evaluating LLM systems — golden datasets and LLM-as-judge, so every prompt or model change ships on evidence instead of a vibe check.",
};
