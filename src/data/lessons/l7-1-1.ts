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
      "Generation is a loop: pick the next token from that distribution, append it, run again. **Temperature** rescales the scores before sampling: near 0 almost always picks the top token; higher values flatten the distribution. **Top-p** limits sampling to the smallest set of tokens whose probabilities add up to p.",
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
model = os.environ.get("MODEL", "claude-sonnet-5-5")  # check the docs for current model names

msg = client.messages.create(
    model=model,
    max_tokens=300,          # hard cap on output length (and cost)
    temperature=0.2,         # low: factual, repeatable tasks
    system="You are a concise senior engineer. If unsure, say so.",
    messages=[{"role": "user", "content": "Explain DNS TTL in two sentences."}],
)
print(msg.content[0].text)
print("input tokens:", msg.usage.input_tokens, "output tokens:", msg.usage.output_tokens)`,
      },
      notes: [
        "The shape is the same across providers: a system instruction, a list of messages, a model name, max output tokens and sampling settings. Check your provider's docs for current model IDs and prices, which change frequently.",
        "Log `usage` on every call. Token counts are your cost and latency metrics.",
      ],
    },
    {
      title: "Estimate cost before you ship",
      code: {
        lang: "python",
        code: `def monthly_cost(requests_per_day: int, in_tokens: int, out_tokens: int,
                 usd_per_m_in: float, usd_per_m_out: float) -> float:
    per_req = in_tokens / 1e6 * usd_per_m_in + out_tokens / 1e6 * usd_per_m_out
    return per_req * requests_per_day * 30

# Example with ILLUSTRATIVE prices; use your provider's current price sheet.
print(round(monthly_cost(20_000, 3_000, 400, 3.0, 15.0), 2))  # → 9000.0 USD/month`,
      },
      notes: ["Here 3,000 input tokens (mostly a long system prompt plus retrieved docs) dominate. Shorter prompts, prompt caching, or a smaller model for simple requests can cut this a lot."],
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
    { mistake: "High temperature for factual or structured tasks", why: "Default settings or 'more creative is better'", wrong: "Inconsistent answers and broken JSON", fix: "Low temperature for extraction/classification; use structured output features" },
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
    { q: "Why do LLMs hallucinate, and how do you reduce it?", a: "They are trained to produce plausible continuations, not verified facts, so when the context lacks the answer they may produce something plausible but false. Reduce it with retrieval grounding, instructions to cite sources and refuse when unsupported, lower temperature, structured outputs, and evaluation." },
    { q: "What drives LLM cost and latency?", a: "Token counts: input tokens (system prompt, history, retrieved docs) and output tokens, plus model size. Output tokens are generated sequentially, so long outputs add latency. Levers: shorter context, caching, smaller models for easy tasks, max_tokens limits and streaming." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You need the same JSON extraction result every time. Which setting helps most?",
      options: ["Temperature 1.5", "Temperature near 0 plus structured output", "Larger max_tokens", "A longer system prompt"],
      answer: 1,
      explanation: "Low temperature reduces randomness; structured output/JSON modes enforce the format. Neither guarantees perfection, so still validate.",
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
    "Temperature low = deterministic; high = diverse (and riskier).",
    "Cost ∝ input tokens + output tokens (output usually pricier).",
    "Hallucination: plausible ≠ true. Ground with RAG, ask for citations, allow 'I don't know'.",
    "Keys on the server only. Validate model output.",
    "Measure: tokens, time to first token, cost per request, eval score.",
  ],
  homework: {
    basic: {
      title: "Token detective",
      brief: ["Count tokens for 10 texts: short English, long English, code, JSON, Hindi or another non-Latin script, and a URL. Record characters per token and explain the differences."],
      criteria: ["Table of text type, characters, tokens, chars/token", "Two insights about cost implications"],
      hints: ["Try the same sentence in two languages."],
      solution: {
        text: [
          "Typical findings: plain English is the most token-efficient; code and JSON spend tokens on punctuation and whitespace; many non-Latin scripts take several times more tokens for the same meaning; URLs and IDs tokenise poorly.",
          "Implications: compact formats (e.g. fewer JSON keys, no pretty-printing) in prompts save cost; multilingual products should budget more tokens for some languages.",
        ],
      },
    },
    intermediate: {
      title: "Temperature experiment",
      brief: ["Call a model 5 times each at temperature 0 and 1 with the same creative prompt and the same factual prompt. Measure how many distinct answers you get and note any factual errors."],
      criteria: ["20 calls logged with temperature and output", "Distinct-answer counts", "Conclusion on when to use each setting"],
      hints: ["Use a set of normalised outputs to count distinct answers.", "If you have no API key, use a free local model via Ollama, or reason with the temperature.py simulation."],
      solution: {
        text: ["Expect temperature 0 to give identical or near-identical outputs (not always perfectly identical, because of provider-side non-determinism), and temperature 1 to vary. Factual prompts should use low temperature; creative tasks can use higher values."],
      },
    },
    challenge: {
      title: "Cost-aware model router",
      brief: ["Design (and optionally code) a router that sends a request to a small or large model based on task type and input length, with a fallback to the large model when the small model's output fails validation. Estimate monthly savings for 50k requests/day using illustrative prices."],
      criteria: ["Routing rules explicit", "Validation-triggered fallback", "Cost estimate with stated assumptions"],
      hints: ["Classification and extraction are good small-model tasks.", "Count fallback rate in the cost model."],
      solution: {
        text: [
          "Rule example: classify/extract/short summaries → small model; multi-step reasoning, long documents, code generation → large model. Validate small-model output (JSON schema, allowed labels); on failure, retry on the large model.",
          "Cost = small_share × small_cost + (fallback_rate × small_share + large_share) × large_cost. Even with a 10% fallback rate, routing 70% of traffic to a model that is ~10× cheaper typically cuts spend by more than half. State that real numbers require your provider's current pricing and an eval of quality.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas step 8: LLM client wrapper",
      brief: ["In services/ai, create `llm.py` with one function `complete(system, user, *, max_tokens, temperature)` that reads the key and model name from environment variables, sets a timeout, logs token usage, and raises a clear error if the key is missing."],
      criteria: ["No secrets in code", "Usage logged per call", "Unit test with the client mocked"],
      hints: ["Inject the client so tests can pass a fake one."],
      solution: {
        text: ["Wrap the SDK behind your own function so the rest of DevAtlas never imports the provider directly. Swapping providers or adding caching later then touches one file."],
      },
    },
  },
  deeper: [
    { label: "Attention Is All You Need (2017 paper)", url: "https://arxiv.org/abs/1706.03762" },
    { label: "Anthropic docs: Build with Claude", url: "https://docs.anthropic.com/" },
    { label: "OpenAI tiktoken (GitHub)", url: "https://github.com/openai/tiktoken" },
    { label: "Hugging Face LLM course", url: "https://huggingface.co/learn/llm-course" },
  ],
  nextPreview: "Next: RAG end to end. You will build an 'Ask the course' tutor that answers from DevAtlas lesson notes with citations, and learn why most RAG failures are retrieval failures.",
};
