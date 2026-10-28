import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.4.3",
  title: "Evaluating LLM systems: golden datasets and LLM-as-judge",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["7.2.2 Hybrid search, reranking and RAG evaluation"],
  summary: "Replace 'it looks better now' with evidence: build a golden dataset of inputs and expected outputs, score every change against it with rule assertions plus an LLM judge, and gate shipping on the measured result.",
  terms: [
    { term: "Golden dataset", def: "A fixed set of inputs with expected outputs or human labels, drawn from real traffic or synthesized to cover your failure modes." },
    { term: "LLM-as-judge", def: "Using a strong model to score or critique another system's output, aligned against human labels." },
    { term: "Rule assertion", def: "A fast, deterministic check (contains a required term, no forbidden term, valid JSON) run on every change — the 'unit test' layer." },
    { term: "Precision / recall", def: "Precision = of the outputs you flagged bad, how many really were; recall = of the truly bad outputs, how many you flagged." },
    { term: "Regression gate", def: "A check that blocks a change when the eval score drops below a threshold versus the current version." },
    { term: "Level 1 / 2 / 3 evals", def: "Rule assertions on every change (1), model/human eval on a cadence (2), and A/B tests for mature products (3)." },
  ],
  problem: [
    "The DevAtlas team tweaks the tutor's system prompt and it looks better on the three examples someone pasted into a chat. Another tweak makes one of those three worse. No one can say whether either change is actually better, so every 'improvement' is a coin flip.",
    "The same problem appears every time a model or chunking strategy changes. The team needs a way to measure quality that is repeatable, fast, and tied to real user questions — not a vibe check on hand-picked examples.",
  ],
  concept: {
    analogy: [
      "A golden dataset is your **test fixtures**: a fixed set of cases you run after every change. Rule assertions are the **fast unit tests** that catch obvious regressions in milliseconds. An LLM judge is a **second reviewer** who reads the output and gives a verdict when the check cannot be a simple rule. The regression gate is **CI**: it refuses to ship a change that drops the score.",
    ],
    precise: [
      "**Layer evals like software tests.** Level 1: fast rule assertions (contains a citation, no forbidden term, valid JSON) run on every change. Level 2: model or human evaluation on a cadence — log traces, label them, and re-score. Level 3: A/B tests once the product is mature. Start at Level 1 and earn your way up.",
      "**A golden dataset is the contract.** It is a fixed set of inputs with expected outputs or labels, gathered from real user traffic plus synthetic cases that cover known failure modes. Hand-picked examples overfit; a fixed, scored set gives a repeatable before/after signal. Re-run it on every prompt, model or pipeline change.",
      "**LLM-as-judge scales human judgement.** A strong model scores or critiques outputs. Because it can be wrong, align it against human labels and measure precision and recall separately — raw agreement misleads when classes are imbalanced. The judge itself is a meta-problem: maintain a small eval of the judge.",
      "**Gate, don't vibe.** The decision to ship is a comparison of two numbers from the same scored dataset, not a feeling. A regression gate blocks a change whose score drops more than a tolerance you set in advance.",
    ],
  },
  underTheHood: {
    text: [
      "Scoring runs a fixed dataset through the system under test and applies checks. Rule assertions are deterministic and free; they catch format and grounding failures. For open-ended quality (is this answer helpful and correct?), an LLM judge returns a verdict, which you validate against human labels.",
      "Judge quality is measured like any classifier: precision (of the outputs it flags bad, how many were actually bad) and recall (of the actually-bad outputs, how many it flagged). A judge that calls everything good has perfect-looking 'accuracy' on a mostly-good dataset but zero recall on the bad cases — the failure that matters.",
      "The flywheel: traces you already log become the dataset, the dataset becomes evals, and the evals become the gate. The same corpus later feeds fine-tuning and debugging (lesson 7.4.4). Eval infrastructure pays for itself across all three.",
    ],
    diagram: {
      title: "An eval pipeline",
      nodes: [
        { label: "Golden dataset", sub: "inputs + expected" },
        { label: "System under test", sub: "prompt + model + RAG" },
        { label: "Outputs" },
        { label: "Rules + judge", sub: "assertions, LLM-as-judge" },
        { label: "Score", sub: "before vs after" },
        { label: "Gate", sub: "ship or block" },
      ],
      edges: ["runs", "produces", "score", "compare", "decide"],
    },
  },
  handsOn: [
    {
      title: "A golden dataset with rule assertions",
      text: [
        "Level 1: fast, deterministic assertions over a fixed set of cases. Each case lists what the output must contain and what it must not.",
      ],
      code: {
        lang: "python",
        file: "golden_dataset.py",
        code: `"""A golden dataset with rule-based assertions: the fast Level-1 eval layer."""
GOLDEN = [
    {"input": "How do I start Docker?", "expected_contains": ["docker"], "forbidden": ["apt-get"]},
    {"input": "Explain RAG", "expected_contains": ["retriev"], "forbidden": []},
    {"input": "Who won the 2024 World Cup?", "expected_contains": [], "forbidden": ["argentina", "france"]},
]


def answer(question: str) -> str:
    # In production this is the system under test (RAG + model). Stub here.
    return {
        "How do I start Docker?": "Run docker compose up -d to start the stack.",
        "Explain RAG": "RAG retrieves relevant text then generates a grounded answer.",
        "Who won the 2024 World Cup?": "There was no FIFA World Cup in 2024.",
    }[question]


def assertions(case: dict, out: str) -> list[str]:
    fail = []
    for word in case["expected_contains"]:
        if word not in out.lower():
            fail.append(f"missing '{word}'")
    for word in case["forbidden"]:
        if word in out.lower():
            fail.append(f"forbidden '{word}' present")
    return fail


passed = 0
for case in GOLDEN:
    out = answer(case["input"])
    fails = assertions(case, out)
    passed += not fails
    print(f"{'PASS' if not fails else 'FAIL'}  {case['input']!r}" + ("" if not fails else "  -> " + "; ".join(fails)))
print(f"{passed}/{len(GOLDEN)} passed")`,
      },
      output: "PASS  'How do I start Docker?'\nPASS  'Explain RAG'\nPASS  'Who won the 2024 World Cup?'\n3/3 passed",
      notes: [
        "The forbidden list catches hallucinations (asserting a 2024 World Cup winner) without needing a model. Rule assertions are where you should spend most of your time, because they are free and run on every change.",
      ],
    },
    {
      title: "Align an LLM-as-judge",
      text: [
        "For open-ended quality, a judge scores outputs. Here the judge is a stub that says 'good' only when the output mentions retrieval; measure its precision and recall against human labels.",
      ],
      code: {
        lang: "python",
        file: "llm_judge.py",
        code: `"""LLM-as-judge: a judge scores outputs; measure precision/recall against human labels."""
def judge(output: str) -> str:
    # In production: a strong model returns a verdict + rationale. Stub here.
    return "good" if "retriev" in output.lower() else "bad"


EXAMPLES = [
    ("RAG retrieves relevant text before generating.", "good"),
    ("RAG finds the right chunks and cites them.", "good"),
    ("I think it is fine, probably.", "good"),
    ("Sorry, I cannot help with that.", "bad"),
    ("The answer is 42.", "bad"),
    ("That is outside the course.", "bad"),
]

predicted = [judge(out) for out, _ in EXAMPLES]
labels = [lab for _, lab in EXAMPLES]

tp = sum(1 for p, t in zip(predicted, labels) if p == "good" and t == "good")
fp = sum(1 for p, t in zip(predicted, labels) if p == "good" and t == "bad")
fn = sum(1 for p, t in zip(predicted, labels) if p == "bad" and t == "good")

precision = tp / (tp + fp)
recall = tp / (tp + fn)
f1 = 2 * precision * recall / (precision + recall)

print(f"{'output':<46}{'judge':>7}{'human':>7}")
for out, lab in EXAMPLES:
    print(f"{out:<46}{judge(out):>7}{lab:>7}")
print(f"\\nprecision={precision:.2f} recall={recall:.2f} f1={f1:.2f}")`,
      },
      output: "output                                          judge  human\nRAG retrieves relevant text before generating.   good   good\nRAG finds the right chunks and cites them.        bad   good\nI think it is fine, probably.                     bad   good\nSorry, I cannot help with that.                   bad    bad\nThe answer is 42.                                 bad    bad\nThat is outside the course.                       bad    bad\n\nprecision=1.00 recall=0.33 f1=0.50",
      notes: [
        "The judge is perfectly precise (everything it flags bad is bad) but low recall (it misses two of the three good answers). That is why you measure precision and recall separately, not raw agreement.",
      ],
    },
    {
      title: "Gate a change",
      text: [
        "The ship decision becomes a comparison of two scores from the same suite, with a tolerance set in advance.",
      ],
      code: {
        lang: "python",
        file: "regression_gate.py",
        code: `"""A regression gate: run evals before/after a change and block a quality drop."""
def run_suite(prompt_version: str) -> float:
    # In production: score the golden dataset + LLM-as-judge. Stub here.
    return {"v1": 0.92, "v2": 0.87}[prompt_version]


before, after = run_suite("v1"), run_suite("v2")
print(f"before {before:.2f}   after {after:.2f}")
if after < before - 0.03:
    print("BLOCK: quality regressed more than 3 points")
else:
    print("ship: within tolerance")`,
      },
      output: "before 0.92   after 0.87\nBLOCK: quality regressed more than 3 points",
      notes: [
        "The tolerance is a product decision you make once, not an argument you re-litigate per change. In CI this same comparison becomes a failing build.",
      ],
    },
  ],
  companies: [
    "**Rechat's assistant 'Lucy'** (Hamel Husain's case study) uses hundreds of rule assertions in CI, plus model/human eval on a cadence, and reuses the same corpus for fine-tuning and debugging.",
    "**RAG evaluation tools** (Ragas, LangSmith, Braintrust) separate retrieval metrics (precision, recall, MRR, NDCG) from generation metrics (faithfulness, relevance) so you know which stage regressed.",
    "**Model providers and benchmarks** (MT-Bench, Chatbot Arena) popularised LLM-as-judge, with human agreement tracked to validate the judge itself.",
    "**Production teams** gate every prompt or model change through an eval suite, treating the eval set like unit tests — versioned, run in CI, and expanded from real failures.",
  ],
  mistakes: [
    {
      mistake: "Deciding to ship from a few hand-picked examples",
      why: "Fast and emotionally satisfying",
      wrong: "Overfit judgement that flips with the next example",
      fix: "Run a fixed golden dataset before and after and compare the scores",
    },
    {
      mistake: "Measuring judge quality with raw agreement",
      why: "One number is easy to read",
      wrong: "On imbalanced data a judge that always says 'good' looks great while missing every failure",
      fix: "Measure precision and recall separately, per class",
    },
    {
      mistake: "Only evaluating the whole system, never the parts",
      why: "End-to-end feels sufficient",
      wrong: "A RAG regression is blamed on the model, or vice versa",
      fix: "Evaluate retrieval and generation separately (lesson 7.2.2)",
    },
    {
      mistake: "A golden dataset that never grows",
      why: "Set once and forgotten",
      wrong: "New failure modes are unguarded and repeat in production",
      fix: "Add a case for every real failure you fix, and synthesise cases for known gaps",
    },
    {
      mistake: "Using the same model that produced the answer as its own judge",
      why: "Convenient",
      wrong: "A weak model cannot reliably critique a stronger system, and self-grading hides systematic errors",
      fix: "Use the strongest affordable judge and validate it against humans",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Gate every prompt or model change on a fixed, scored dataset; block drops beyond a pre-set tolerance.",
    },
    {
      tag: "Maintainability",
      text: "Version the dataset and the evals like code, and add a case for every production failure you fix.",
    },
    {
      tag: "Cost",
      text: "Spend most effort on free rule assertions; reserve the LLM judge and humans for what rules cannot check.",
    },
    {
      tag: "Security",
      text: "Include adversarial and prompt-injection cases in the dataset so safety regressions are caught in CI, not by users.",
    },
    {
      tag: "Performance",
      text: "Run Level-1 assertions on every change and Level-2 model/human evals on a cadence; A/B only for mature products.",
    },
  ],
  interview: [
    {
      q: "What is a golden dataset and why is it better than hand-picked examples?",
      a: "A golden dataset is a fixed set of inputs with expected outputs or human labels, drawn from real traffic and synthetic cases covering failure modes. It gives a repeatable, comparable score across changes, whereas hand-picked examples overfit and let you convince yourself of anything.",
    },
    {
      q: "How do you know your LLM judge is trustworthy?",
      a: "Validate it like a classifier against human labels: measure precision and recall per class, not raw agreement. Use the strongest judge you can afford, and keep a small labelled set to re-check judge-human alignment as the judge prompt or model changes.",
    },
    {
      q: "How do you structure evals for a RAG app?",
      a: "Evaluate retrieval and generation separately. Retrieval uses classic IR metrics (precision, recall, MRR, NDCG) on the retrieved chunks; generation uses faithfulness and answer relevance (rules or a judge). End-to-end scores are useful as a summary but hide which stage regressed.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You tweak the system prompt and it looks better on three examples you picked yourself. What should decide whether to ship?",
      options: [
        "Ship it — three examples is enough",
        "Run a fixed, scored golden dataset before and after and compare",
        "Ask the model whether it is better",
        "Raise the temperature",
      ],
      answer: 1,
      explanation: "Hand-picked examples overfit; a fixed scored dataset gives a repeatable before/after number.",
    },
    {
      kind: "output",
      prompt: "A judge flags 4 outputs bad, of which 3 were truly bad. There were 6 truly bad outputs total. What are precision and recall?",
      options: [
        "precision 0.75, recall 0.50",
        "precision 0.50, recall 0.75",
        "precision 1.00, recall 0.50",
        "precision 0.75, recall 0.75",
      ],
      answer: 0,
      explanation: "Precision = 3/4 = 0.75 of the flagged-bad that were bad. Recall = 3/6 = 0.50 of the truly-bad that were caught.",
    },
    {
      kind: "bug",
      prompt: "A judge returns 'good' for every output. On a dataset that is 90% good, why does 90% 'agreement' hide a real problem?",
      options: [
        "It has zero recall on the bad cases, which are the ones that matter",
        "Agreement and precision are the same thing",
        "Bad outputs do not exist",
        "There is no problem",
      ],
      answer: 0,
      explanation: "Raw agreement is inflated by the majority class. The judge never catches a bad output, so recall on failures is zero — the exact failures evals exist to find.",
    },
  ],
  cheatSheet: [
    "Layer evals: rules every change (L1), model/human on a cadence (L2), A/B when mature (L3).",
    "Golden dataset = fixed inputs + expected outputs/labels, grown from real failures.",
    "Rules first: contains/forbidden/valid-JSON assertions are free and run on every change.",
    "LLM-as-judge = a strong model scores outputs; align it against human labels.",
    "Measure precision and recall per class, not raw agreement.",
    "Evaluate retrieval and generation separately.",
    "Gate shipping on before/after scores with a pre-set tolerance.",
    "Reuse the eval corpus for fine-tuning and debugging.",
    "Add a case for every failure you fix.",
  ],
  homework: {
    basic: {
      title: "A golden dataset for the tutor",
      brief: [
        "Write a golden dataset of at least five question/answer cases for the DevAtlas tutor, each with `expected_contains` and `forbidden` lists. Include at least one hallucination trap (a question whose correct answer is 'no such thing') and one format case.",
      ],
      criteria: [
        "At least five cases",
        "At least one hallucination trap",
        "Each case has expected and forbidden terms",
        "Cases come from realistic learner questions",
      ],
      hints: ["Mine real questions from your traces or the course's quick-check questions."],
      solution: {
        text: [
          "Good cases: 'What is a vector database?' (must mention embeddings; must not mention SQL tables), 'How do I install Docker?' (must mention an image/engine; no apt-get on Windows), 'Who teaches lesson 9.9.9?' (trap — must say no such lesson, must not invent a teacher). The hallucination trap is the highest-value case because it catches fabricated answers cheaply.",
        ],
        code: {
          lang: "python",
          file: "golden_dataset_tutor.py",
          code: `"""A golden dataset for the DevAtlas tutor, including a hallucination trap."""
CASES = [
    ("What is a vector database?", ["embedding"], ["sql table"]),
    ("How do I install Docker?", ["image", "docker"], ["apt-get"]),
    ("Who wrote lesson 9.9.9?", [], ["authored", "wrote"]),   # trap: no such lesson
    ("Define RAG", ["retriev"], []),
    ("How do I start the app?", ["docker compose", "dev"], ["kubectl"]),
]


def check(answer: str, must_have: list[str], must_not: list[str]) -> bool:
    a = answer.lower()
    return all(w in a for w in must_have) and not any(w in a for w in must_not)


print(f"{len(CASES)} cases; the trap expects a 'no such lesson' answer, not a name")
for q, have, nots in CASES:
    print(f"  {q[:34]:34} must_have={have} must_not={nots}")`,
        },
        output: "5 cases; the trap expects a 'no such lesson' answer, not a name\n  What is a vector database?         must_have=['embedding'] must_not=['sql table']\n  How do I install Docker?           must_have=['image', 'docker'] must_not=['apt-get']\n  Who wrote lesson 9.9.9?            must_have=[] must_not=['authored', 'wrote']\n  Define RAG                         must_have=['retriev'] must_not=[]\n  How do I start the app?            must_have=['docker compose', 'dev'] must_not=['kubectl']",
      },
    },
    intermediate: {
      title: "An LLM-as-judge rubric",
      brief: [
        "Design a rubric for the tutor's answers with three scored dimensions (e.g. grounded, concise, helpful), and describe how you would align the judge: the labelled set you collect, the metric you track, and what you change when the judge disagrees with a human.",
      ],
      criteria: [
        "Three named dimensions with definitions",
        "A concrete alignment procedure",
        "Names the metric (precision/recall, not agreement)",
        "A plan for resolving judge/human disagreement",
      ],
      hints: ["Ask the judge to output a score per dimension plus a one-line rationale."],
      solution: {
        text: [
          "Dimensions: grounded (every claim has a citation), concise (under a length budget), helpful (answers the actual question). Alignment: label 50–100 outputs yourself, run the judge, compute precision and recall per dimension, then fix the judge's prompt on the disagreements. Iterate on prompt engineering before considering fine-tuning the judge.",
        ],
        code: {
          lang: "python",
          file: "rubric.py",
          code: `"""An LLM-as-judge rubric with three scored dimensions."""
def score(answer: str) -> dict:
    a = answer.lower()
    return {
        "grounded": "retriev" in a or "cite" in a,
        "concise": len(answer.split()) <= 30,
        "helpful": "?" not in answer and len(answer) > 5,
    }


for a in ("RAG retrieves the top-k chunks and cites them.", "I do not know?", "short"):
    print(f"{a:46} -> {score(a)}")`,
        },
        output: "RAG retrieves the top-k chunks and cites them. -> {'grounded': True, 'concise': True, 'helpful': True}\nI do not know?                                 -> {'grounded': False, 'concise': True, 'helpful': False}\nshort                                          -> {'grounded': False, 'concise': True, 'helpful': False}",
      },
    },
    challenge: {
      title: "A CI regression gate",
      brief: [
        "Describe how you would wire the eval suite into GitHub Actions: what runs on every PR, what runs nightly, how the threshold is stored, and how a regression is reported. Include what a developer does when the gate blocks their change.",
      ],
      criteria: [
        "Fast evals on every PR, slow evals on a schedule",
        "Threshold stored in version control",
        "Blocking vs warning behaviour is defined",
        "A clear remediation path",
      ],
      hints: ["Run rules on PR; run the LLM judge suite on a schedule or when a threshold is close."],
      solution: {
        text: [
          "On every PR run the Level-1 rule assertions (seconds) and fail if the pass rate drops below the committed threshold in `evals/thresholds.json`. Run the LLM-judge suite nightly and on release candidates, comparing before/after and posting a comment. When blocked, the developer reads the failing cases, fixes the prompt/pipeline, and adds a regression case — they never lower the threshold in the same PR.",
        ],
        code: {
          lang: "python",
          file: "ci_gate.py",
          code: `"""A CI regression gate: fail the build when the score drops below a committed threshold."""
THRESHOLDS = {"pass_rate": 0.90}   # stored in version control, not edited ad hoc


def ci(current: float, baseline: float) -> int:
    print(f"baseline {baseline:.2f}  current {current:.2f}  threshold {THRESHOLDS['pass_rate']:.2f}")
    if current < THRESHOLDS["pass_rate"] or current < baseline - 0.03:
        print("FAIL: fix or add a regression case; lower the threshold only in a separate PR")
        return 1
    print("PASS")
    return 0


raise SystemExit(ci(current=0.86, baseline=0.92))`,
        },
        output: "baseline 0.92  current 0.86  threshold 0.90\nFAIL: fix or add a regression case; lower the threshold only in a separate PR",
      },
    },
    capstone: {
      title: "DevAtlas: a minimal eval suite",
      brief: [
        "Build a runnable eval suite with a rubric of rule assertions, a scored set of cases, and a regression gate that prints the before/after scores and blocks a drop beyond a tolerance.",
      ],
      criteria: [
        "Rubric of at least three rule assertions",
        "Scored cases produce a normalised 0–1 score",
        "Gate blocks a drop beyond tolerance",
        "Runs offline",
      ],
      hints: ["Normalise by dividing total points by (cases × rubric size)."],
      solution: {
        text: [
          "This is the seed of the real eval system: a rubric of cheap rules, a scored dataset, and a gate. Swap the stub system for the real tutor and add the LLM judge from lesson 7.4.3 for the dimensions rules cannot reach.",
        ],
        code: {
          lang: "python",
          file: "eval_suite.py",
          code: `"""A minimal eval suite: rule assertions + a rubric score + a regression gate."""
RUBRIC = [
    {"id": "grounded", "rule": lambda out: "retriev" in out.lower() or "cite" in out.lower()},
    {"id": "concise", "rule": lambda out: len(out.split()) <= 30},
    {"id": "no_forbidden", "rule": lambda out: "secret" not in out.lower()},
]

CASES = [
    ("Explain RAG", "RAG retrieves relevant text then generates a grounded answer."),
    ("How do I start Docker?", "Run docker compose up -d to start the stack."),
]


def score(out: str) -> int:
    return sum(1 for r in RUBRIC if r["rule"](out))


def run_suite(system) -> float:
    total = sum(score(system(q)) for q, _ in CASES)
    return total / (len(CASES) * len(RUBRIC))


def gate(before, after):
    print(f"before {before:.2f}  after {after:.2f}")
    if after < before - 0.05:
        print("BLOCK: regressed")
    else:
        print("ship")


sys_v1 = lambda q: {"Explain RAG": "RAG retrieves relevant text then generates a grounded answer.",
                     "How do I start Docker?": "Run docker compose up -d to start the stack."}[q]
sys_v2 = lambda q: {"Explain RAG": "RAG finds text and generates an answer.",
                     "How do I start Docker?": "Run docker compose up -d to start the stack."}[q]

gate(run_suite(sys_v1), run_suite(sys_v2))`,
        },
        output: "before 0.83  after 0.67\nBLOCK: regressed",
      },
    },
  },
  deeper: [
    { label: "Your AI Product Needs Evals (Hamel Husain)", url: "https://hamel.dev/blog/posts/evals/" },
    { label: "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (paper)", url: "https://arxiv.org/abs/2306.05685" },
    { label: "Ragas: evaluation for RAG pipelines (docs)", url: "https://docs.ragas.io/en/latest/" },
    { label: "Braintrust: evals for LLM applications", url: "https://www.braintrust.dev/" },
  ],
  nextPreview: "Next: model selection, routing and fine-tuning vs RAG — choosing the right model and technique for cost, latency and quality, now that you can measure quality.",
};
