import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.1.1",
  title: "How LLMs work: tokens, embeddings, attention, temperature",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.1.1 Python essentials", "Curiosity. No ML background needed"],
  summary: "A precise, engineer's mental model of large language models: what they compute, why they hallucinate, and the knobs (tokens, context, temperature) that control cost, latency and quality.",
  terms: [
    { term: "LLM", def: "Large Language Model. A neural network trained to predict the next token of text, at very large scale." },
    { term: "Token", def: "A chunk of text the model reads and writes: often a word piece. In English, a token averages roughly 4 characters, but it varies by model and language." },
    { term: "Embedding", def: "A list of numbers (a vector) representing a token or text, where similar meanings end up close together." },
    { term: "Attention", def: "The mechanism that lets each token weigh information from other tokens in the context." },
    { term: "Transformer", def: "The neural network architecture (2017) built from stacked attention and feed-forward layers that modern LLMs use." },
    { term: "Context window", def: "The maximum number of tokens (prompt + output) the model can consider in one call." },
    { term: "Temperature", def: "A sampling setting: low = more deterministic, high = more varied output." },
    { term: "Hallucination", def: "Fluent output that is not true or not supported by the given sources." },
  ],
  problem: [
    "Your company adds an AI assistant to the support site. In the demo it is brilliant. In week one it invents a refund policy that does not exist, costs three times the budget, and gives different answers to the same question.",
    "Each of these failures has a mechanical explanation: the model predicts plausible text rather than looking up facts; cost is driven by tokens in and out; variation comes from sampling. Engineers who understand the mechanism design around it. Those who do not, keep 'tweaking the prompt'.",
  ],
  concept: {
    analogy: [
      "An LLM is like an extremely well-read autocomplete. It has absorbed patterns from enormous amounts of text and, given everything written so far, it predicts what comes next, one piece at a time. It does not 'look things up'. Whether the prediction is true depends on whether the pattern it learned, or the text you put in front of it, supports it.",
    ],
    precise: [
      "Text is split into **tokens** and each token is mapped to an **embedding** vector. A **transformer** processes all context tokens through many layers. In each layer, **self-attention** lets every token compute how relevant each earlier token is and blend in their information. The final layer produces a score (logit) for every token in the vocabulary; a softmax turns scores into probabilities.",
      "Generation is a loop: pick the next token from that distribution, append it, run again. **Temperature** rescales the scores before sampling: near 0 almost always picks the top token; higher values flatten the distribution. **Top-p** limits sampling to the smallest set of tokens whose probabilities add up to p. Many APIs expose these settings; current Claude models manage sampling themselves and expose an **effort** setting (how much the model thinks before answering) instead.",
      "Models are trained in stages: **pre-training** on large text corpora (learn language and knowledge patterns), then **post-training** (instruction tuning, reinforcement learning from human or AI feedback) to follow instructions and be helpful and safe.",
      "Consequences engineers must design for: knowledge has a **training cutoff**; facts not in the context may be **hallucinated**; cost and latency scale with **tokens**; output is **probabilistic**.",
    ],
  },
  underTheHood: {
    text: [
      "Attention in one sentence: each token produces a query vector, every token produces a key and a value vector; similarity of query and keys gives weights, and the output is the weighted sum of values. Many 'heads' do this in parallel, each learning different relationships (syntax, references, topic).",
      "Because attention compares tokens with other tokens, naive cost grows roughly with the square of context length. Providers use many optimisations, but long prompts still cost more and take longer, especially **time to first token**.",
      "Output tokens are generated one at a time, sequentially, so long answers take longer. Input tokens are processed in parallel. That is why output tokens are usually priced higher than input tokens, and why streaming makes UIs feel faster.",
      "**Prompt caching** (offered by several providers) reuses computation for a repeated prompt prefix, such as a long system prompt, reducing cost and latency.",
    ],
    diagram: {
      title: "From text to next token",
      nodes: [
        { label: "Text", sub: "\"The capital of France is\"" },
        { label: "Tokens", sub: "IDs" },
        { label: "Embeddings", sub: "vectors" },
        { label: "Transformer", sub: "N × attention + MLP" },
        { label: "Probabilities", sub: "\" Paris\" 0.92 …" },
        { label: "Sample", sub: "temperature / top-p" },
      ],
      edges: ["tokenise", "lookup", "layers", "softmax", "append & repeat"],
    },
  },
  handsOn: [
    {
      title: "Count tokens locally",
      text: ["tiktoken is OpenAI's open-source tokenizer. Different model families use different tokenizers, so counts are approximate across providers, but the behaviour is the same."],
      code: {
        lang: "python",
        file: "tokens.py",
        code: `# pip install tiktoken
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")
for text in ["Hello world", "Kubernetes", "नमस्ते दुनिया", "def add(a, b): return a + b"]:
    ids = enc.encode(text)
    print(f"{len(ids):3} tokens  {text!r:35} {[enc.decode([i]) for i in ids][:8]}")`,
      },
      output: "  2 tokens  'Hello world'  ['Hello', ' world']\n  ...      'नमस्ते दुनिया' uses many more tokens than its English equivalent",
      notes: ["Exact counts depend on the encoding. Notice that non-English scripts often use more tokens per word: this directly affects cost and context usage."],
    },
    {
      title: "Temperature, by hand",
      text: ["This is the actual math applied to the model's output scores. No API key needed."],
      code: {
        lang: "python",
        file: "temperature.py",
        code: `import math, random

logits = {"Paris": 5.0, "Lyon": 2.0, "London": 1.0, "pizza": -1.0}

def softmax(scores: dict[str, float], temperature: float) -> dict[str, float]:
    t = max(temperature, 1e-6)
    exps = {k: math.exp(v / t) for k, v in scores.items()}
    total = sum(exps.values())
    return {k: round(v / total, 3) for k, v in exps.items()}

for t in (0.2, 1.0, 2.0):
    print(t, softmax(logits, t))

probs = softmax(logits, 1.0)
print(random.choices(list(probs), weights=list(probs.values()), k=10))`,
      },
      output: "0.2 {'Paris': 1.0, 'Lyon': 0.0, 'London': 0.0, 'pizza': 0.0}\n1.0 {'Paris': 0.934, 'Lyon': 0.047, 'London': 0.017, 'pizza': 0.002}\n2.0 {'Paris': 0.71, 'Lyon': 0.158, 'London': 0.096, 'pizza': 0.035}",
      notes: ["Low temperature makes the top choice dominate. High temperature gives unlikely tokens a real chance: more creative, and more likely to go wrong."],
    },
    {
      title: "Call a model (Anthropic Python SDK)",
      code: {
        lang: "python",
        file: "ask.py",
        code: `# pip install anthropic   |   export ANTHROPIC_API_KEY=...  (never hardcode keys)
import os
from anthropic import Anthropic

client = Anthropic()  # reads ANTHROPIC_API_KEY from the environment
model = os.environ.get("MODEL", "claude-opus-5-5")  # model IDs change: check the models page

msg = client.messages.create(
    model=model,
    max_tokens=2000,                   # cap on output, INCLUDING the model's thinking
    output_config={"effort": "low"},   # low | medium | high | xhigh | max
    system="You are a concise senior engineer. If unsure, say so.",
    messages=[{"role": "user", "content": "Explain DNS TTL in two sentences."}],
)
answer = "".join(b.text for b in msg.content if b.type == "text")  # skip thinking blocks
print(answer)
print("stop:", msg.stop_reason, "| in:", msg.usage.input_tokens, "| out:", msg.usage.output_tokens)`,
      },
      output: "TTL is how long a resolver may cache a DNS record. Lower it a day before a migration so the change propagates quickly.\nstop: end_turn | in: 32 | out: 41",
      notes: [
        "The shape is the same across providers: a system instruction, a list of messages, a model name and a max output length. Model IDs and prices change often, so read them from config, not code.",
        "**No `temperature` here, on purpose.** Current Claude models (Opus 5.5, Sonnet 5.5, Haiku 5.5) think adaptively and reject non-default `temperature`/`top_p`/`top_k` with a 400; the 1.x Python SDK no longer even accepts the argument. You steer depth, latency and cost with `effort` instead. Temperature is still a real setting on many other providers and on open models you run yourself (Ollama, vLLM), so the concept above still matters.",
        "Read `content` by block type, not `content[0]`: a response can start with a `thinking` block before the text. Thinking tokens count toward `max_tokens` and are billed as output, so leave headroom.",
        "Log `usage` on every call. Token counts are your cost and latency metrics.",
      ],
    },
    {
      title: "Estimate cost before you ship",
      code: {
        lang: "python",
        file: "cost.py",
        code: `def monthly_cost(requests_per_day: int, in_tokens: int, out_tokens: int,
                 usd_per_m_in: float, usd_per_m_out: float) -> float:
    per_req = in_tokens / 1e6 * usd_per_m_in + out_tokens / 1e6 * usd_per_m_out
    return per_req * requests_per_day * 30

# Anthropic list prices per million tokens (Oct 2026). Always re-check the pricing page.
print(round(monthly_cost(20_000, 3_000, 400, 4.00, 20.00)))  # Opus 5.5
print(round(monthly_cost(20_000, 3_000, 400, 0.10, 0.50)))   # Haiku 5.5`,
      },
      output: "12000\n300",
      notes: ["Same traffic, 40× price difference. That is why model routing (homework challenge) is one of the biggest levers in production AI. Here 3,000 input tokens (mostly a long system prompt plus retrieved docs) dominate. Shorter prompts, prompt caching, or a smaller model for simple requests can cut this a lot."],
    },
  ],
  companies: [
    "**Model routing:** many production systems send simple requests (classification, extraction) to small, cheap, fast models and only hard ones to the largest model. This often cuts cost dramatically with little quality loss.",
    "**Grounding with retrieval (RAG):** support bots, internal knowledge assistants and coding tools put relevant documents into the context so answers are based on company data, not the model's memory. That is the next lesson.",
    "**Evaluation pipelines:** serious teams maintain test sets of real questions with expected answers and run them on every prompt or model change, because a change that fixes one case often breaks another.",
    "**Token budgets as SLOs:** teams track tokens per request, time to first token and cost per user as first-class metrics, alongside error rate and latency.",
  ],
  mistakes: [
    { mistake: "Treating the LLM as a database of facts", why: "It answers confidently", wrong: "Invented policies, prices, APIs and citations", fix: "Provide the facts in context (RAG) and instruct it to answer only from them and say 'I don't know'" },
    { mistake: "Relying on sampling settings for reliable structured output", why: "Old tutorials say 'set temperature to 0 for JSON'", wrong: "Occasional broken JSON in production; on current Claude models the temperature argument is rejected outright", fix: "Use structured outputs (a JSON schema) and validate; where a provider exposes temperature, keep it low for extraction" },
    { mistake: "Ignoring token costs", why: "The prototype had 10 users", wrong: "Bills grow with traffic × prompt size; long histories explode cost", fix: "Measure usage per call, trim context, cache prefixes, route to smaller models" },
    { mistake: "Hardcoding API keys", why: "Quick to test", wrong: "Keys leak via Git or client-side code and get abused within hours", fix: "Environment variables locally, a secret manager in the cloud, and call LLMs only from your backend" },
    { mistake: "No max_tokens or timeout", why: "Defaults seem fine", wrong: "Runaway responses, slow requests, unpredictable cost", fix: "Set max_tokens, timeouts and retries with backoff" },
  ],
  bestPractices: [
    { tag: "Security", text: "Call model APIs from your server, never the browser. Treat model output as untrusted input: validate before executing or rendering it." },
    { tag: "Cost", text: "Log input/output tokens per request; set per-user and per-day budgets and alerts." },
    { tag: "Performance", text: "Stream responses for chat UIs; keep prompts short; reuse stable prefixes to benefit from prompt caching." },
    { tag: "Reliability", text: "Build an eval set before tuning prompts, and pin model versions where your provider allows it, so behaviour does not change underneath you." },
  ],
  interview: [
    { q: "How does an LLM generate text?", a: "It tokenises input, embeds tokens, runs them through stacked transformer layers using self-attention, and outputs a probability distribution over the next token. It samples one token (controlled by temperature/top-p), appends it, and repeats until a stop condition or the max token limit." },
    { q: "Why do LLMs hallucinate, and how do you reduce it?", a: "They are trained to produce plausible continuations, not verified facts, so when the context lacks the answer they may produce something plausible but false. Reduce it with retrieval grounding, instructions to cite sources and refuse when unsupported, structured outputs, low temperature where the provider supports it, and evaluation." },
    { q: "What drives LLM cost and latency?", a: "Token counts: input tokens (system prompt, history, retrieved docs) and output tokens, plus model size. Output tokens are generated sequentially, so long outputs add latency. Levers: shorter context, caching, smaller models for easy tasks, max_tokens limits and streaming." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You need the same JSON extraction result every time. Which setting helps most?",
      options: ["Temperature 1.5", "Structured outputs with a JSON schema, then validation", "Larger max_tokens", "A longer system prompt"],
      answer: 1,
      explanation: "Structured outputs constrain the response to your schema. On providers that expose temperature, a low value also reduces variation (current Claude models do not accept it at all). Still validate the content.",
    },
    {
      kind: "mcq",
      prompt: "Why do long answers take longer than long prompts of the same size?",
      options: ["Output tokens are generated one by one", "Prompts are cached forever", "Output is compressed", "They do not"],
      answer: 0,
      explanation: "Input is processed in parallel; output is a sequential loop, one forward pass per token.",
    },
    {
      kind: "bug",
      prompt: "A React app calls the LLM API directly with the key in an environment variable bundled at build time. What is wrong?",
      options: ["Nothing, env vars are secret", "The key ships to every browser and can be extracted", "React cannot call APIs", "It will be too slow"],
      answer: 1,
      explanation: "Anything bundled into frontend code is public. Proxy calls through your backend, which holds the key.",
    },
  ],
  cheatSheet: [
    "LLM = next-token predictor: tokens → embeddings → transformer → probabilities → sample.",
    "Attention lets each token use information from other tokens in context.",
    "Context window = prompt + output tokens.",
    "Temperature low = deterministic; high = diverse. Current Claude models take `effort` instead.",
    "Cost ∝ input tokens + output tokens (output usually pricier).",
    "Hallucination: plausible ≠ true. Ground with RAG, ask for citations, allow 'I don't know'.",
    "Keys on the server only. Validate model output.",
    "Measure: tokens, time to first token, cost per request, eval score.",
  ],
  homework: {
    basic: {
      title: "Token detective",
      brief: ["Count tokens for 8 to 10 texts: short English, long English, code, pretty and compact JSON, Hindi or another non-Latin script, a URL and a UUID. Record characters per token and explain the differences."],
      criteria: ["Table of text type, characters, tokens, chars/token", "Two insights about cost implications"],
      hints: ["Try the same sentence in two languages.", "For exact Claude counts, call `client.messages.count_tokens(model=..., messages=[...])` and read `.input_tokens`; it is free and not billed as a message."],
      solution: {
        text: [
          "Typical findings: plain English is the most token-efficient (about 4 to 5 chars/token); code and pretty JSON spend tokens on punctuation and whitespace; many non-Latin scripts take several times more tokens for the same meaning; URLs and UUIDs tokenise poorly (close to 1 to 2 chars/token).",
          "Implications: compact formats (fewer JSON keys, no pretty-printing) in prompts save cost; multilingual products should budget more tokens for some languages; never paste raw IDs or logs into prompts when a summary will do.",
        ],
        code: { lang: "python", file: "token_detective.py", code: `import tiktoken

enc = tiktoken.get_encoding("cl100k_base")
samples = {
    "short English": "Ship small changes often.",
    "long English": "Continuous delivery means every change that passes the pipeline can be released to users safely and quickly.",
    "Python code": "def area(r: float) -> float:\\n    return 3.14159 * r * r",
    "JSON (pretty)": '{\\n  "user_id": 42,\\n  "roles": ["admin", "editor"]\\n}',
    "JSON (compact)": '{"user_id":42,"roles":["admin","editor"]}',
    "Hindi": "निरंतर डिलीवरी का मतलब है छोटे बदलाव बार-बार भेजना।",
    "URL": "https://devatlas.example.com/lessons/7.1.1?ref=newsletter&utm_source=x",
    "UUID": "3f2b8c1e-9a4d-4e7f-b1c2-5d6e7f8a9b0c",
}
print(f"{'type':16} {'chars':>5} {'tokens':>6} {'chars/token':>11}")
for name, text in samples.items():
    n = len(enc.encode(text))
    print(f"{name:16} {len(text):5} {n:6} {len(text) / n:11.2f}")` },
        pitfalls: ["tiktoken is OpenAI's tokenizer. Claude uses a different one, so use `count_tokens` for Claude budgets; the *relative* differences between text types hold across tokenizers."],
      },
    },
    intermediate: {
      title: "Sampling experiment",
      brief: ["Measure how temperature changes variety and correctness. Sample 5 times at temperature 0 and 1 for a factual prompt and a creative prompt, count distinct answers, then estimate the factual error rate at temperature 1 over 10,000 samples. Optional: repeat with a local open model via Ollama (`options: {\"temperature\": 0}`)."],
      criteria: ["Distinct-answer counts for all four combinations", "Error rate measured, not guessed", "Conclusion on when to use each setting"],
      hints: ["Temperature 0 means greedy decoding: always pick the top token.", "Seed your random generator so the experiment is repeatable."],
      solution: {
        text: ["At temperature 0 both prompts give one answer every time. At 1.0 the creative prompt varies (good) and the factual prompt is wrong about 7% of the time (bad): that is exactly the softmax probability of the non-top tokens. Real models can still vary slightly at temperature 0 because of provider-side batching and floating-point non-determinism."],
        code: { lang: "python", file: "sampling_experiment.py", code: `import math, random

# Toy next-token scores (logits). Real models produce these for ~100k tokens.
FACTUAL = {"Paris": 5.0, "Lyon": 2.0, "London": 1.0, "Marseille": 0.5}   # "The capital of France is"
CREATIVE = {"moonlit": 2.0, "silver": 1.8, "quiet": 1.7, "electric": 1.5, "ancient": 1.4}  # "A ___ city"

def sample(scores: dict[str, float], temperature: float, rng: random.Random) -> str:
    if temperature == 0:
        return max(scores, key=scores.get)          # greedy: always the top token
    exps = {k: math.exp(v / temperature) for k, v in scores.items()}
    r = rng.random() * sum(exps.values())
    for token, weight in exps.items():
        r -= weight
        if r <= 0:
            return token
    return token

rng = random.Random(7)
for name, scores in [("factual", FACTUAL), ("creative", CREATIVE)]:
    for t in (0, 1.0):
        runs = [sample(scores, t, rng) for _ in range(5)]
        print(f"{name:8} t={t}: {len(set(runs))} distinct  {runs}")

wrong = sum(sample(FACTUAL, 1.0, rng) != "Paris" for _ in range(10_000))
print(f"factual error rate at t=1.0: {wrong / 100:.1f}%")` },
        output: "factual  t=0: 1 distinct  ['Paris', 'Paris', 'Paris', 'Paris', 'Paris']\nfactual  t=1.0: 1 distinct  ['Paris', 'Paris', 'Paris', 'Paris', 'Paris']\ncreative t=0: 1 distinct  ['moonlit', 'moonlit', 'moonlit', 'moonlit', 'moonlit']\ncreative t=1.0: 3 distinct  ['silver', 'moonlit', 'quiet', 'moonlit', 'silver']\nfactual error rate at t=1.0: 7.4%",
        pitfalls: ["Five samples hide a 7% error rate completely: the factual run at t=1.0 looks perfect. Small manual tests miss rare failures; that is why teams run evals on hundreds of cases."],
      },
    },
    challenge: {
      title: "Cost-aware model router",
      brief: ["Code a router that sends a request to a small or large model based on task type and input length, with a fallback to the large model when the small model's output fails validation. Estimate monthly cost for 50k requests/day with and without routing."],
      criteria: ["Routing rules explicit", "Validation-triggered fallback, tested with a fake model", "Cost estimate with stated assumptions"],
      hints: ["Classification and extraction are good small-model tasks.", "Count the fallback rate in the cost model: those requests pay twice."],
      solution: {
        text: [
          "Route classify/extract/short summaries to the small model, everything else (multi-step reasoning, long documents, code generation) to the large one. Validate small-model output (allowed labels, JSON schema); on failure, retry on the large model.",
          "The result is instructive: the small model is 40× cheaper, yet total savings are only 35%, because the 30% of large-model requests are longer and dominate the bill. Always model the traffic mix before promising savings, and confirm quality with an eval.",
        ],
        code: { lang: "python", file: "router.py", code: `import json

# USD per million tokens (input, output). Anthropic list prices, Oct 2026; re-check before budgeting.
PRICES = {"claude-haiku-5-5": (0.10, 0.50), "claude-opus-5-5": (4.00, 20.00)}
SMALL, LARGE = "claude-haiku-5-5", "claude-opus-5-5"
SMALL_TASKS = {"classify", "extract", "short_summary"}

def route(task: str, input_tokens: int) -> str:
    return SMALL if task in SMALL_TASKS and input_tokens <= 20_000 else LARGE

def handle(task: str, text: str, call, validate) -> tuple[str, str]:
    """call(model, text) -> str. Falls back to the large model when validation fails."""
    model = route(task, len(text) // 4)            # ~4 chars per token is enough for routing
    out = call(model, text)
    if model == SMALL and not validate(out):
        model, out = LARGE, call(LARGE, text)
    return model, out

def cost(model: str, tokens_in: int, tokens_out: int) -> float:
    p_in, p_out = PRICES[model]
    return tokens_in / 1e6 * p_in + tokens_out / 1e6 * p_out

# Demo with a fake model: the small one returns an invalid label once.
answers = iter(["urgent!!", "billing"])
def fake_call(model, text): return next(answers) if model == SMALL else "billing"
labels = {"billing", "bug", "feature", "other"}
print(handle("classify", "I was charged twice", fake_call, lambda s: s in labels))

# Monthly estimate: 50k requests/day, 70% small-model tasks, 10% of those fall back.
day, small_share, fallback = 50_000, 0.70, 0.10
small_req, large_req = (1_500, 150), (4_000, 800)    # (input, output) tokens per request
all_large = day * 30 * (small_share * cost(LARGE, *small_req) + (1 - small_share) * cost(LARGE, *large_req))
routed = day * 30 * (small_share * cost(SMALL, *small_req)
                     + small_share * fallback * cost(LARGE, *small_req)
                     + (1 - small_share) * cost(LARGE, *large_req))
print(f"all large: \${all_large:,.0f}/month | routed: \${routed:,.0f}/month | saved {1 - routed / all_large:.0%}")` },
        output: "('claude-opus-5-5', 'billing')\nall large: $23,850/month | routed: $15,581/month | saved 35%",
      },
    },
    capstone: {
      title: "DevAtlas step 8: LLM client wrapper",
      brief: ["In services/ai, create `llm.py` with one function `complete(system, user, *, max_tokens, effort)` that reads the key and model name from environment variables, sets a timeout and retries, logs token usage, warns on truncation, and raises a clear error if the key is missing."],
      criteria: ["No secrets in code", "Usage logged per call", "Unit tests with the client faked (no network)"],
      hints: ["Inject the client so tests can pass a fake one.", "Return only text blocks; skip thinking blocks."],
      solution: {
        text: ["Wrap the SDK behind your own function so the rest of DevAtlas never imports the provider directly. Swapping providers, adding caching or adding cost limits later then touches one file. The tests use a tiny fake object with the same shape as the SDK response, so they run offline in milliseconds."],
        code: { lang: "python", file: "services/ai/llm.py", code: `"""services/ai/llm.py: the only module in DevAtlas that talks to the model provider."""
import logging
import os

from anthropic import Anthropic

log = logging.getLogger("devatlas.llm")
_client: Anthropic | None = None


class LLMConfigError(RuntimeError):
    pass


def _default_client() -> Anthropic:
    global _client
    if _client is None:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise LLMConfigError("ANTHROPIC_API_KEY is not set (use .env locally, a secret manager in prod)")
        _client = Anthropic(timeout=30.0, max_retries=3)   # SDK retries 429/5xx with backoff
    return _client


def complete(system: str, user: str, *, max_tokens: int = 2000, effort: str = "low", client=None) -> str:
    client = client or _default_client()
    model = os.environ.get("DEVATLAS_MODEL", "claude-opus-5-5")
    msg = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        output_config={"effort": effort},
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    log.info("llm model=%s in=%d out=%d stop=%s",
             model, msg.usage.input_tokens, msg.usage.output_tokens, msg.stop_reason)
    if msg.stop_reason == "max_tokens":
        log.warning("llm output truncated at max_tokens=%d", max_tokens)
    return "".join(b.text for b in msg.content if b.type == "text")

# ---- services/ai/test_llm.py ----
import logging
from types import SimpleNamespace as NS

import pytest

import llm


class FakeMessages:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return NS(
            content=[NS(type="thinking", thinking=""), NS(type="text", text="Hello")],
            usage=NS(input_tokens=12, output_tokens=3),
            stop_reason="end_turn",
        )


def test_complete_returns_text_and_logs_usage(caplog):
    fake = NS(messages=FakeMessages())
    with caplog.at_level(logging.INFO, logger="devatlas.llm"):
        assert llm.complete("sys", "hi", client=fake) == "Hello"
    call = fake.messages.calls[0]
    assert call["output_config"] == {"effort": "low"} and "temperature" not in call
    assert "in=12 out=3" in caplog.text


def test_missing_key_is_a_clear_error(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(llm, "_client", None)
    with pytest.raises(llm.LLMConfigError, match="ANTHROPIC_API_KEY"):
        llm.complete("sys", "hi")` },
        output: "2 passed",
      },
    },
  },
  deeper: [
    { label: "Attention Is All You Need (2017 paper)", url: "https://arxiv.org/abs/1706.03762" },
    { label: "Anthropic docs: Build with Claude", url: "https://docs.anthropic.com/" },
    { label: "OpenAI tiktoken (GitHub)", url: "https://github.com/openai/tiktoken" },
    { label: "Hugging Face LLM course", url: "https://huggingface.co/learn/llm-course" },
  ],
  nextPreview: "Next: prompt engineering that works in production. You will turn a vague prompt into a structured, testable one and measure the difference.",
};
