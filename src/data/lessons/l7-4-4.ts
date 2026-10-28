import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.4.4",
  title: "Model selection, routing and fine-tuning vs RAG",
  minutes: 70,
  level: "Advanced",
  prerequisites: ["7.1.2 Prompt engineering that survives production"],
  summary: "Stop paying one big model for every request: route simple work to small, cheap models and escalate only hard or failed requests, and choose deliberately among prompt engineering, RAG and fine-tuning for each job.",
  terms: [
    { term: "Model routing", def: "Sending each request to a different model based on its complexity, so cheap work never pays expensive-model prices." },
    { term: "Cascade / escalation", def: "Trying a small, fast model first and retrying a stronger one only when it fails or is uncertain." },
    { term: "Fine-tuning", def: "Continuing training a base model on task-specific examples to change its behaviour, style or format (not to add facts)." },
    { term: "RAG", def: "Adding external knowledge at query time so the model answers from retrieved, citable text without retraining." },
    { term: "Distillation", def: "Training a smaller model to imitate a larger one, keeping most of the quality at a fraction of the cost." },
    { term: "Cost-latency-quality triangle", def: "The three numbers you must measure together — routing and technique choices move all three, never one in isolation." },
  ],
  problem: [
    "The DevAtlas tutor sends every request — from 'what is Docker?' to a multi-step system-design explanation — to the same frontier model. The bill is dominated by trivial questions, and the team cannot tell whether any of it needs the big model at all.",
    "At the same time, a proposal to 'fine-tune a model on our lessons' is floating around. Fine-tuning is the wrong tool for knowledge that changes weekly, but the team has no framework for choosing between prompt engineering, RAG and fine-tuning, so each discussion starts from scratch.",
  ],
  concept: {
    analogy: [
      "**Model routing** is triage at a hospital: the nurse (a cheap classifier) sends a splinter to a paramedic and a heart attack to a specialist. **Fine-tuning** is training a specialist for one procedure; **RAG** is giving a generalist an open reference book during the exam. **Distillation** is a senior doctor's condensed playbook handed to a junior.",
    ],
    precise: [
      "**Route by complexity.** Simple, high-volume work (classification, extraction, short factual answers, formatting) belongs on a small model, which can be an order of magnitude cheaper and much faster. Reserve the large model for reasoning, long context and hard generation. The router itself is usually a tiny classifier or a set of rules.",
      "**Escalate on failure.** A cascade tries the small model first and only calls the big model when the small one fails or is uncertain. You still pay the small-model cost for the easy majority, and the big model only for the tail that needs it.",
      "**Prompt vs RAG vs fine-tuning** is a decision about where the capability lives. Prompt engineering: instructions and examples in the prompt — cheapest, no data needed, but limited. RAG: knowledge is fetched at query time — right for fresh, private or changing facts, and it cites sources. Fine-tuning: you retrain to change behaviour, style, format or syntax — right when you have hundreds of labelled examples and the behaviour is stable; wrong for facts that change.",
      "**Fine-tuning does not memorise facts** (and you should not try). It changes how the model behaves, not what it knows now. For weekly-changing knowledge, RAG is the correct tool; fine-tuning might still help for a fixed output style or a consistent JSON schema.",
      "**Measure the triangle.** Cost, latency and quality move together, and you can only judge a routing or fine-tuning decision with the eval suite from lesson 7.4.3. Route to a cheaper model only after the evals show quality holds.",
    ],
  },
  underTheHood: {
    text: [
      "Routing is classification plus dispatch: a router predicts a tier (small/medium/large) from the request, and code sends it there. The router can be rules and length, a tiny model, or a learned router trained on cost/quality pairs (as in the RouteLLM line of work).",
      "Cost is tokens × price, so a small model's ~20× cheaper input/output price dominates the savings even before latency. A cascade adds a fallback path: try the cheap model, and on failure or low confidence retry the expensive one — you pay for two calls only on the tail.",
      "Fine-tuning changes weights: you gather a dataset of input→desired-output pairs, run supervised fine-tuning, and evaluate. The work is mostly data, not compute — the eval corpus from lesson 7.4.3 is already half of it. Distillation trains a small model on a large model's outputs to shrink cost while keeping most quality.",
    ],
    diagram: {
      title: "Route, then choose the technique",
      nodes: [
        { label: "Request" },
        { label: "Router", sub: "rules or tiny model" },
        { label: "Small model", sub: "cheap, fast" },
        { label: "Large model", sub: "fallback / hard cases" },
        { label: "Technique", sub: "prompt · RAG · fine-tune" },
      ],
      edges: ["classifies", "dispatch", "escalate", "choose"],
    },
  },
  handsOn: [
    {
      title: "Route by complexity",
      text: [
        "A heuristic router sends short, simple requests to a small model and hard ones to a large one. The `complexity` function is a stand-in for a tiny classifier.",
      ],
      code: {
        lang: "python",
        file: "router.py",
        code: `"""Model routing: send easy requests to a small, cheap model and hard ones to a big one."""
MODELS = {
    "haiku":  {"input": 0.25, "output": 1.25, "latency": 0.3},   # $/MTok and seconds (illustrative)
    "sonnet": {"input": 3.00, "output": 15.0, "latency": 1.0},
    "opus":   {"input": 15.0, "output": 75.0, "latency": 4.0},
}


def complexity(question: str) -> str:
    # In production: a tiny classifier (or rules + length). Stub here.
    q = question.lower()
    if any(w in q for w in ("debug", "design", "compare", "architect")):
        return "opus"
    if len(question) < 40:
        return "haiku"
    return "sonnet"


def route(question: str) -> str:
    m = MODELS[complexity(question)]
    cost = (1000 * m["input"] + 500 * m["output"]) / 1e6   # assume 1k in, 500 out tokens
    return f"{complexity(question):7}  \${cost:.4f}  ~{m['latency']}s  {question!r}"


for q in ("what is docker?", "summarise this page", "compare monolith vs microservices for a payments system"):
    print(route(q))`,
      },
      output: "haiku    $0.0009  ~0.3s  'what is docker?'\nhaiku    $0.0009  ~0.3s  'summarise this page'\nopus     $0.0525  ~4.0s  'compare monolith vs microservices for a payments system'",
      notes: [
        "The easy questions cost a small fraction of a cent each; the hard one costs 50× more. Routing concentrates the expensive model where it is actually needed.",
      ],
    },
    {
      title: "Prompt, RAG or fine-tune?",
      text: [
        "A decision guide that turns 'what should we use?' into a few yes/no questions. The thresholds are illustrative; the shape of the decision is the point.",
      ],
      code: {
        lang: "python",
        file: "decide_technique.py",
        code: `"""Prompt engineering vs RAG vs fine-tuning: a decision guide."""
def decide(needs_fresh: bool, needs_behavior: bool, has_examples: int) -> str:
    if needs_behavior:
        return "fine-tune" if has_examples >= 100 else "few-shot prompting (collect examples first)"
    if needs_fresh:
        return "RAG"
    return "prompt engineering"


cases = [
    ("answer questions over this week's news", True, False, 0),
    ("always reply in a terse, legal style", False, True, 500),
    ("classify support tickets into 5 fixed labels", False, True, 30),
    ("write a poem in iambic pentameter", False, False, 0),
]
for name, fresh, behavior, n in cases:
    print(f"{name:45} -> {decide(fresh, behavior, n)}")`,
      },
      output: "answer questions over this week's news        -> RAG\nalways reply in a terse, legal style          -> fine-tune\nclassify support tickets into 5 fixed labels  -> few-shot prompting (collect examples first)\nwrite a poem in iambic pentameter             -> prompt engineering",
      notes: [
        "Two distinct questions: does the knowledge change (→ RAG), and is the behaviour a fixed, teachable pattern (→ fine-tune once you have examples)? Most tasks need neither.",
      ],
    },
    {
      title: "Measure the triangle",
      text: [
        "Compare 'always use the big model' against routing across a small traffic mix, on cost and latency together.",
      ],
      code: {
        lang: "python",
        file: "cost_model.py",
        code: `"""Routing vs always-big: measure cost and latency together across a traffic mix."""
MODELS = {
    "haiku":  {"input": 0.25, "output": 1.25, "latency": 0.3},
    "opus":   {"input": 15.0, "output": 75.0, "latency": 4.0},
}

TRAFFIC = ["hi", "what is docker?", "design a rate limiter for 10M users", "thanks", "compare postgres and mongo"]


def always_big(q: str):
    return MODELS["opus"]


def smart(q: str):
    # heuristic router: short, simple requests go to the small model
    return MODELS["haiku"] if len(q) < 40 else MODELS["opus"]


def totals(route_fn, traffic):
    cost = latency = 0.0
    for q in traffic:
        m = route_fn(q)
        cost += (1000 * m["input"] + 500 * m["output"]) / 1e6
        latency += m["latency"]
    return cost, latency


for name, fn in (("always-big", always_big), ("routed", smart)):
    c, l = totals(fn, TRAFFIC)
    print(f"{name:11}  \${c:.4f}  {l:.1f}s total")`,
      },
      output: "always-big   $0.2625  20.0s total\nrouted       $0.0044  1.5s total",
      notes: [
        "On this mix, routing is ~60× cheaper and ~13× faster. Quality must hold too — that is what the eval suite (lesson 7.4.3) confirms before you switch.",
      ],
    },
    {
      title: "Route with a real local model",
      text: [
        "The classifier does not have to be a hand rule or a cloud API. Here it is a real model running locally through Ollama — no API key, no network beyond localhost — that labels each question easy or hard. The dispatch after it is ordinary code.",
      ],
      code: {
        lang: "python",
        file: "route_local_model.py",
        code: `"""A real local-model router: Ollama runs the classifier on your machine, no API key."""
import httpx

OLLAMA = "http://localhost:11434/api/chat"


def classify(question: str) -> str:
    r = httpx.post(
        OLLAMA,
        json={
            "model": "qwen3.5:0.8b",
            "messages": [
                {"role": "system", "content": "Classify this question into exactly one tier: easy or hard. Reply with one word only."},
                {"role": "user", "content": question},
            ],
            "stream": False,
        },
        timeout=240,
    )
    return r.json()["message"]["content"].strip().lower()


print("what is docker? ->", classify("what is docker?"))
print("design a rate limiter for 10 million users ->", classify("design a rate limiter for 10 million users"))`,
      },
      output: "what is docker? -> easy\ndesign a rate limiter for 10 million users -> hard",
      notes: [
        "Prerequisites: `ollama pull qwen3.5:0.8b` and a running `ollama serve`. Verified with that model; output can vary run to run. The lesson is the shape — a cheap classifier deciding the tier, code deciding the destination.",
      ],
    },
  ],
  companies: [
    "**Large AI products route aggressively**: classification, extraction, moderation and short answers run on small models, while reasoning and long context use large ones, often via a learned router rather than hand rules.",
    "**Fine-tuning is common for a fixed schema or voice** (a consistent JSON format, a brand's tone) where teams have plenty of labelled examples; RAG is the default for ever-changing company knowledge.",
    "**Distillation shrinks cost**: small models trained on a large model's outputs power on-device assistants and high-volume endpoints at a fraction of the price.",
    "**Cost dashboards are product metrics**: teams track spend per model tier and per feature, and treat 'route more traffic to the small model' as a standing, measurable engineering goal.",
  ],
  mistakes: [
    {
      mistake: "One big model for every request",
      why: "Simplicity and 'just use the best'",
      wrong: "Trivial requests pay frontier prices and add latency",
      fix: "Route simple, high-volume work to a small model; escalate on failure",
    },
    {
      mistake: "Fine-tuning to memorise changing facts",
      why: "'Teach it our knowledge' sounds right",
      wrong: "The model learns a snapshot that is stale the moment content changes",
      fix: "Use RAG for fresh or private facts; fine-tune only for stable behaviour",
    },
    {
      mistake: "Fine-tuning before you have examples",
      why: "Assuming the model is the bottleneck",
      wrong: "A tiny dataset overfits or does nothing; the prompt was probably the real fix",
      fix: "Start with few-shot prompting, collect failures, and fine-tune only past ~100+ examples",
    },
    {
      mistake: "Routing without measuring quality",
      why: "Cost savings are easy to see",
      wrong: "The cheap model silently gets dumber on the easy-looking-but-hard requests",
      fix: "Gate the switch on the eval suite; keep the big model as a fallback",
    },
    {
      mistake: "Choosing a technique by hype instead of the decision",
      why: "Fine-tuning and agents are fashionable",
      wrong: "Complexity and cost added where a prompt or RAG already worked",
      fix: "Ask: does the knowledge change? is the behaviour stable? do you have examples?",
    },
  ],
  bestPractices: [
    {
      tag: "Cost",
      text: "Route simple work to small models and keep a fallback to the large model, so you pay big prices only for the tail.",
    },
    {
      tag: "Reliability",
      text: "Escalate on failure or low confidence, and verify quality with the eval suite before and after a routing change.",
    },
    {
      tag: "Maintainability",
      text: "Keep the routing policy in code with a clear classifier, so it is reviewable and testable like any other logic.",
    },
    {
      tag: "Performance",
      text: "Track latency per model tier; a cascade that retries too often can be slower than always-big.",
    },
    {
      tag: "Security",
      text: "Fine-tuning data is sensitive: deduplicate, redact, and never train on raw user data without consent.",
    },
  ],
  interview: [
    {
      q: "How do you decide between prompt engineering, RAG and fine-tuning?",
      a: "Ask three questions. Does the knowledge change over time? If yes, use RAG — fine-tuning memorises a stale snapshot. Is the target a stable behaviour (style, format, syntax) rather than facts? If yes, fine-tuning may help once you have hundreds of labelled examples. Otherwise, prompt engineering with a few good examples is the cheapest thing that works.",
    },
    {
      q: "What is model routing and when is it worth the complexity?",
      a: "Routing sends each request to a tier of model by complexity: a tiny classifier or rules pick small/medium/large. It is worth it when traffic is heterogeneous — mostly simple requests with a hard tail — because the small model is often ~20× cheaper and much faster. Keep the large model as a fallback and validate quality with evals.",
    },
    {
      q: "What is distillation and why is it useful?",
      a: "Distillation trains a smaller 'student' model on the outputs of a larger 'teacher', transferring much of its quality at a fraction of the cost and latency. It is useful for on-device or very high-volume endpoints where the frontier model's price or latency is not viable.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A feature must answer questions about this week's changing news, with sources. Which technique fits?",
      options: ["Fine-tuning on last week's news", "RAG", "Only a system prompt", "Distillation"],
      answer: 1,
      explanation: "The knowledge changes weekly, so fetch it at query time with RAG. Fine-tuning would memorise a stale snapshot.",
    },
    {
      kind: "mcq",
      prompt: "A high-volume feature classifies support tickets into five fixed labels. You have 30 labelled examples. What is the pragmatic first step?",
      options: ["Fine-tune immediately", "Few-shot prompt a small, cheap model; collect examples, fine-tune later if needed", "Use the largest model for everything", "Skip the model, hand-write rules for every ticket"],
      answer: 1,
      explanation: "Start cheap with a few-shot small model; fine-tune only once you have enough labelled examples (roughly 100+).",
    },
    {
      kind: "bug",
      prompt: "A cascade routes most traffic to the small model but retries the big model whenever it is 'not sure'. Total latency rose above always-big. What went wrong?",
      options: [
        "The small model is too expensive",
        "Too many fallbacks: every uncertain request pays for two calls, so the cascade is slower than a single big call",
        "Fine-tuning would fix latency",
        "Nothing is wrong",
      ],
      answer: 1,
      explanation: "A cascade is only faster when the cheap tier answers most requests. If the fallback fires constantly, you pay for both calls — measure latency per tier, not just cost.",
    },
  ],
  cheatSheet: [
    "Route by complexity: small models for the easy majority, big for the hard tail.",
    "Cascade: try small first, escalate on failure or low confidence.",
    "Prompt = instructions (cheap); RAG = fresh/private facts; fine-tune = stable behaviour.",
    "Fine-tuning does not memorise changing facts — use RAG for those.",
    "Fine-tune only past ~100+ labelled examples; start with few-shot prompting.",
    "Distillation shrinks a big model's quality into a small, cheap one.",
    "Measure cost, latency and quality together; gate routing on the eval suite.",
    "Keep the routing policy in code, reviewable and testable.",
  ],
  homework: {
    basic: {
      title: "Decide the technique for five tasks",
      brief: [
        "For each task, name the technique (prompt, RAG or fine-tune) and a one-line reason: (1) summarise the day's commits, (2) always output a specific JSON schema, (3) answer over the course lessons, (4) detect prompt-injection attempts, (5) write release notes in the team's voice.",
      ],
      criteria: [
        "One technique per task",
        "A reason tied to fresh-facts vs stable-behaviour vs no-data",
        "Identifies at least one task where fine-tuning is wrong",
      ],
      hints: ["Separate 'does the knowledge change' from 'is the behaviour stable'."],
      solution: {
        text: [
          "(1) RAG or a workflow over fresh data; (2) fine-tune if you have many examples, else structured output via prompting; (3) RAG over the lessons; (4) rules + a small classifier, fine-tune only with a labelled corpus; (5) fine-tune for voice if you have examples, else few-shot. The key is that facts-changing tasks (1, 3) point to retrieval, not fine-tuning.",
        ],
        code: {
          lang: "python",
          file: "decide_tasks.py",
          code: `"""Decide the technique for five concrete tasks."""
def decide(fresh: bool, behavior: bool, examples: int) -> str:
    if behavior:
        return "fine-tune" if examples >= 100 else "few-shot (collect examples first)"
    return "RAG" if fresh else "prompt engineering"


tasks = {
    "summarise the day's commits": decide(fresh=True, behavior=False, examples=0),
    "always output one JSON schema": decide(fresh=False, behavior=True, examples=400),
    "answer over the course lessons": decide(fresh=True, behavior=False, examples=0),
    "detect prompt-injection": decide(fresh=False, behavior=True, examples=20),
    "release notes in the team voice": decide(fresh=False, behavior=True, examples=300),
}
for k, v in tasks.items():
    print(f"{k:34} -> {v}")`,
        },
        output: "summarise the day's commits        -> RAG\nalways output one JSON schema      -> fine-tune\nanswer over the course lessons     -> RAG\ndetect prompt-injection            -> few-shot (collect examples first)\nrelease notes in the team voice    -> fine-tune",
      },
    },
    intermediate: {
      title: "A routing policy with escalation",
      brief: [
        "Design the DevAtlas tutor's routing policy: which request types go to the small model, which go straight to the large model, what triggers an escalation, and the cost and latency budget you would enforce per request.",
      ],
      criteria: [
        "Explicit small-model and large-model criteria",
        "A defined escalation trigger",
        "Per-request cost and latency budgets",
        "A validation step before the policy goes live",
      ],
      hints: ["Classify first; escalate on failure, refusal or a low-confidence signal."],
      solution: {
        text: [
          "Small model: greetings, single-lesson lookups, short definitions, formatting. Large model: multi-step explanations, system-design questions, long context. Escalate when the small model refuses, errors, or returns a low-confidence score. Enforce per-request budgets (e.g. max tokens and a latency target). Before switching, run the eval suite (7.4.3) on both policies and confirm quality holds.",
        ],
        code: {
          lang: "python",
          file: "routing_policy.py",
          code: `"""A routing policy: tier selection plus the escalation trigger."""
def route(q: str) -> tuple[str, str]:
    ql = q.lower()
    if any(w in ql for w in ("explain", "design", "compare")):
        return "large", "straight to the large model"
    return "small", "small model; escalate on refusal or low confidence"


for q in ("what is docker?", "design a rate limiter", "hi"):
    tier, note = route(q)
    print(f"{q:24} -> {tier:6} ({note})")`,
        },
        output: "what is docker?          -> small  (small model; escalate on refusal or low confidence)\ndesign a rate limiter    -> large  (straight to the large model)\nhi                       -> small  (small model; escalate on refusal or low confidence)",
      },
    },
    challenge: {
      title: "A fine-tuning data plan (and when to abandon it)",
      brief: [
        "Write the plan for fine-tuning a small model to answer DevAtlas quick-check questions in a fixed format: where the data comes from, how you clean it, how many examples you target, and the exact conditions under which you would stop and use RAG instead.",
      ],
      criteria: [
        "A concrete data source",
        "Cleaning and dedup steps",
        "A target example count",
        "Explicit abandon criteria",
      ],
      hints: ["The course's quick-check questions and model solutions are the natural source."],
      solution: {
        text: [
          "Source: the 3-question quick checks plus model solutions across all lessons. Clean: deduplicate, strip the answer from the prompt, standardise the output format. Target a few hundred examples. Abandon if the format is the only problem (structured output handles it without fine-tuning), or if the questions change as lessons are edited — because then RAG over the lessons is correct and fine-tuning just falls behind.",
        ],
        code: {
          lang: "python",
          file: "fine_tune_data.py",
          code: `"""A fine-tuning data plan: source, clean (dedupe), target count, abandon criteria."""
import json

raw = [
    {"q": "What is a vector database?", "a": "A vector DB stores embeddings."},
    {"q": "What is a vector database?", "a": "A vector DB stores embeddings."},
    {"q": "Explain RAG", "a": "RAG retrieves text then generates."},
]


def clean(items):
    seen, out = set(), []
    for it in items:
        key = json.dumps(it, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


cleaned = clean(raw)
print(f"raw {len(raw)} -> cleaned {len(cleaned)} (dedupe)")
print("target ~300 examples; abandon if only the format differs (use structured output)")`,
        },
        output: "raw 3 -> cleaned 2 (dedupe)\ntarget ~300 examples; abandon if only the format differs (use structured output)",
      },
    },
    capstone: {
      title: "DevAtlas: model router with fallback",
      brief: [
        "Build a runnable router that classifies each request, sends it to a tier, escalates to the large model on failure, and accumulates cost and latency so you can compare policies.",
      ],
      criteria: [
        "Classifier picks a tier per request",
        "Failure triggers an escalation to the large model",
        "Running cost and latency are accumulated",
        "Runs offline",
      ],
      hints: ["Keep the budget as a mutable dict passed into the router."],
      solution: {
        text: [
          "The router owns the policy and the tally; the model calls are stubbed here. In production, wire the classifier and the model calls to real providers and read the final totals to decide whether routing beats always-big.",
        ],
        code: {
          lang: "python",
          file: "route_fallback.py",
          code: `"""Model routing with a fallback: try the small model, escalate failures to the big one."""
MODELS = {
    "haiku":  {"input": 0.25, "output": 1.25, "latency": 0.3},   # illustrative $/MTok and seconds
    "sonnet": {"input": 3.00, "output": 15.0, "latency": 1.0},
    "opus":   {"input": 15.0, "output": 75.0, "latency": 4.0},
}


def classify(q: str) -> str:
    ql = q.lower()
    if any(w in ql for w in ("debug", "compare")):
        return "opus"
    return "haiku" if len(q) < 40 else "sonnet"


def answer(q: str, model: str) -> tuple[str, bool]:
    # In production this calls the model. Stub: the small model fails on 'design'.
    if model == "haiku" and "design" in q.lower():
        return "I could not answer that.", False
    return f"answered by {model}", True


def route(q: str, budget: dict) -> list[str]:
    trace = [f"{q!r}"]
    m = classify(q)
    out, ok = answer(q, m)
    budget["cost"] += (1000 * MODELS[m]["input"] + 500 * MODELS[m]["output"]) / 1e6
    budget["latency"] += MODELS[m]["latency"]
    trace.append(f"  {m}: {out}")
    if not ok:                       # escalate on failure
        out, _ = answer(q, "opus")
        budget["cost"] += (1000 * MODELS["opus"]["input"] + 500 * MODELS["opus"]["output"]) / 1e6
        budget["latency"] += MODELS["opus"]["latency"]
        trace.append(f"  opus (fallback): {out}")
    return trace


budget = {"cost": 0.0, "latency": 0.0}
for q in ("what is docker?", "design a rate limiter for 10M users"):
    print("\\n".join(route(q, budget)))
print(f"total \${budget['cost']:.4f}, {budget['latency']:.1f}s")`,
        },
        output: "'what is docker?'\n  haiku: answered by haiku\n'design a rate limiter for 10M users'\n  haiku: I could not answer that.\n  opus (fallback): answered by opus\ntotal $0.0542, 4.6s",
      },
    },
  },
  deeper: [
    { label: "RouteLLM: Learning to Route LLMs with Preference Data (paper)", url: "https://arxiv.org/abs/2406.18665" },
    { label: "OpenAI: Fine-tuning guide", url: "https://platform.openai.com/docs/guides/fine-tuning" },
    { label: "Hugging Face: Parameter-efficient fine-tuning (PEFT/LoRA)", url: "https://huggingface.co/docs/peft/index" },
    { label: "Anthropic: Building effective agents (workflows vs agents)", url: "https://www.anthropic.com/engineering/building-effective-agents" },
  ],
  nextPreview: "Next: Phase 8, Cloud — the same ideas on AWS and Azure: compute, storage and databases, networking, identity and the AI services, side by side.",
};
