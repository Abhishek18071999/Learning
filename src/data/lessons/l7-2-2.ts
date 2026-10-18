import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.2.2",
  title: "Hybrid search, reranking and RAG evaluation",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["7.2.1 RAG end to end", "5.3.1 Redis caching patterns and pgvector"],
  summary: "Make retrieval good and prove it. Implement BM25 keyword search, fuse it with vector search using Reciprocal Rank Fusion, rerank candidates with a model, and measure everything with recall@k, MRR, nDCG and a calibrated LLM judge. Then run the whole hybrid query inside PostgreSQL.",
  terms: [
    {
      term: "BM25",
      def: "The standard keyword-ranking formula: rewards rare query terms that appear often in a document, with diminishing returns and a correction for document length.",
    },
    {
      term: "Dense (vector) retrieval",
      def: "Ranking by similarity of embedding vectors, which captures meaning and paraphrases but can miss exact terms like error codes.",
    },
    {
      term: "Hybrid search",
      def: "Combining keyword and vector retrieval so each covers the other's blind spots.",
    },
    {
      term: "RRF",
      def: "Reciprocal Rank Fusion: merge rankings by summing 1 / (k + rank) for each document. Needs no score normalisation.",
    },
    {
      term: "Reranker",
      def: "A slower, more accurate model that re-scores a short list of candidates against the query.",
    },
    { term: "Recall@k", def: "Share of queries whose relevant document appears in the top k results." },
    {
      term: "MRR",
      def: "Mean Reciprocal Rank: average of 1/rank of the first relevant result. Rewards putting the answer first.",
    },
    {
      term: "nDCG",
      def: "Normalised Discounted Cumulative Gain: a ranking score that handles graded relevance (very relevant vs somewhat relevant).",
    },
    {
      term: "LLM-as-judge",
      def: "Using a model with a rubric to grade outputs (for example groundedness). Useful at scale, but must be checked against human labels.",
    },
  ],
  problem: [
    "The 'Ask the course' tutor from 7.2.1 answers well in demos. Then real students arrive: one pastes `CrashLoopBackOff`, another asks 'my container restarts again and again', a third writes 'make the production container smaller'. Some get the right lesson, some get nonsense, and the team argues about whether to switch embedding models, chunk sizes or prompts.",
    "Without measurement, every change is a guess. This lesson gives you a golden set and metrics so you can see exactly which queries fail and why, and the two techniques that fix most retrieval failures: hybrid search and reranking.",
  ],
  concept: {
    analogy: [
      "Searching a library: the **keyword** catalogue finds every book containing 'CrashLoopBackOff' but nothing for 'my app keeps rebooting'. A **librarian who understands topics** (vector search) finds books about the idea but may hand you a general Kubernetes book instead of the one with the exact error. **Hybrid** asks both and merges their lists. A **reranker** is a specialist who reads the top ten candidates carefully and puts the best one on top. **Evaluation** is checking, with a fixed list of questions, how often the right book ends up in your hands.",
    ],
    precise: [
      "**Keyword retrieval (BM25)** excels at exact identifiers: error codes, function names, product names, version numbers. It fails on paraphrases and synonyms with no shared words.",
      "**Vector retrieval** embeds query and documents and ranks by cosine similarity. It handles paraphrases but can blur precise terms and rank 'nearby topics' above the exact answer.",
      "**Hybrid** runs both and fuses the ranked lists. **RRF** scores each document as Σ 1/(k + rank) over the lists (k ≈ 60). It uses ranks only, so you never compare a BM25 score with a cosine similarity. Weighted score fusion is the alternative but needs normalisation and tuning.",
      "**Retrieve wide, rerank narrow.** Cheap retrievers fetch 20 to 100 candidates for high recall; a reranker (a cross-encoder model, a rerank API, or an LLM) reads each query-document pair and reorders the top few for precision.",
      "**Evaluate two layers separately.** Retrieval: recall@k (is the answer in the context at all?), MRR and nDCG (is it near the top?). Generation: groundedness (claims supported by the sources?) and answer relevance. A wrong answer with the right context is a prompt or model problem; a wrong answer without it is a retrieval problem.",
    ],
  },
  underTheHood: {
    text: [
      "BM25 for one term: idf × f·(k1+1) / (f + k1·(1 − b + b·len/avglen)). **idf** makes rare words count more, **k1** (≈1.2 to 2) saturates repeated terms so the tenth mention adds little, and **b** (≈0.75) stops long documents winning just by being long.",
      "Why RRF works: a document ranked 1st by one retriever and 3rd by the other scores 1/61 + 1/63 ≈ 0.0323, beating a document that is 1st in one list and absent from the other (1/61 ≈ 0.0164). Agreement between different signals is strong evidence of relevance.",
      "Bi-encoders vs cross-encoders: embedding models encode query and document *separately* (fast, precomputable, used for retrieval). Rerankers read query and document *together*, so every word can attend to every other word: much more accurate, but too slow to run over the whole corpus.",
      "Metric choice: recall@k tells you whether the generator *could* answer (the fact is in the context). MRR and nDCG tell you whether it is easy to find, which matters because models use the top of long contexts more reliably and because you pay for every chunk you include.",
      "Judges drift and agree with themselves. An LLM judge's verdicts must be compared with human labels on a sample (agreement and Cohen's kappa), especially on the failure class you care about.",
    ],
    diagram: {
      title: "Retrieve wide, rerank narrow, then measure",
      nodes: [
        { label: "Query", sub: "text" },
        { label: "BM25", sub: "top 50" },
        { label: "Vectors", sub: "top 50" },
        { label: "RRF fuse", sub: "Σ 1/(60+rank)" },
        { label: "Rerank", sub: "top 20 → 5" },
        { label: "Eval", sub: "recall, MRR, judge" },
      ],
      edges: ["keywords", "meaning", "merge", "precision", "measure"],
    },
  },
  handsOn: [
    {
      title: "A corpus and a golden set",
      text: [
        "Evaluation starts with data: real-looking questions, each paired with the document that answers it. Mix exact-term queries with paraphrases, because that is what users send.",
      ],
      code: {
        lang: "python",
        file: "corpus.py",
        code: `DOCS = {
    "k8s-crashloop": "CrashLoopBackOff means a container keeps starting and exiting. Run kubectl logs --previous to see why the last attempt died.",
    "k8s-probes": "Liveness probes restart a stuck container; readiness probes stop sending traffic until the app is ready to serve requests.",
    "docker-cache": "Order Dockerfile instructions from least to most frequently changed so the layer cache is reused and rebuilds stay fast.",
    "docker-multistage": "Multi-stage builds compile in a large image and copy only the final binary into a small runtime image.",
    "git-revert": "git revert creates a new commit that undoes an earlier one, which is safe for history that others already pulled.",
    "git-conflict": "A merge conflict happens when two branches edit the same lines. Resolve the markers, then add and commit.",
    "py-venv": "A virtual environment isolates a project's Python packages so different projects can pin different versions.",
    "http-429": "HTTP 429 Too Many Requests means you hit a rate limit. Back off exponentially and respect the Retry-After header.",
    "sql-index": "An index lets the database find rows without scanning the whole table, at the cost of slower writes and extra storage.",
    "react-effect": "useEffect synchronises a component with an external system. Derived values belong in render, not in an effect.",
    "cors": "CORS errors appear when a browser blocks a response from another origin that did not send Access-Control-Allow-Origin.",
    "jwt": "A JWT is a signed token carrying claims. Verify the signature and expiry on every request; never trust the payload alone.",
}

# Golden set: (query, the doc id that answers it). Mix of exact terms and paraphrases.
GOLDEN = [
    ("pod stuck in CrashLoopBackOff", "k8s-crashloop"),
    ("my container restarts again and again, how do I see what happened", "k8s-crashloop"),
    ("stop routing users to a pod that is still booting", "k8s-probes"),
    ("why does my image rebuild everything after a small code change", "docker-cache"),
    ("make the production container smaller", "docker-multistage"),
    ("undo a commit that teammates already have", "git-revert"),
    ("Retry-After header", "http-429"),
    ("the API says too many requests", "http-429"),
    ("queries on a big table are slow", "sql-index"),
    ("browser blocked my fetch to another domain", "cors"),
]`,
      },
      notes: ["Grow the golden set from production logs: every bad answer a user reports becomes a test case."],
    },
    {
      title: "BM25, a vector stand-in and Reciprocal Rank Fusion",
      text: [
        "BM25 is about 20 lines, so write it once to understand it. The 'vector' retriever here uses character n-grams so the lesson runs offline; in production you call an embedding model instead, and the fusion code does not change.",
      ],
      code: {
        lang: "python",
        file: "retrievers.py",
        code: `import math
import re
from collections import Counter

from sklearn.feature_extraction.text import TfidfVectorizer

from corpus import DOCS

IDS = list(DOCS)
STOP = {"a", "an", "the", "to", "of", "and", "is", "in", "my", "how", "do", "i", "that", "what", "why", "on", "for", "it", "so", "are", "be"}


def tokens(text: str) -> list[str]:
    return [w for w in re.findall(r"[a-z0-9-]+", text.lower()) if w not in STOP]


class BM25:
    """Okapi BM25: term frequency with saturation (k1) and length normalisation (b)."""
    def __init__(self, docs: list[str], k1: float = 1.5, b: float = 0.75):
        self.docs = [tokens(d) for d in docs]
        self.k1, self.b = k1, b
        self.avgdl = sum(map(len, self.docs)) / len(self.docs)
        df = Counter(t for d in self.docs for t in set(d))
        n = len(self.docs)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def scores(self, query: str) -> list[float]:
        out = []
        for d in self.docs:
            tf, s = Counter(d), 0.0
            for t in tokens(query):
                if t in tf:
                    f = tf[t]
                    s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * len(d) / self.avgdl))
            out.append(s)
        return out


bm25 = BM25(list(DOCS.values()))
# Stand-in for an embedding model: character n-grams match word variants
# ("restarts" ~ "starting", "routing" ~ "route"). Swap in real embeddings in production.
char_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
char_matrix = char_vec.fit_transform(DOCS.values())


def rank(scores: list[float]) -> list[str]:
    return [IDS[i] for i in sorted(range(len(IDS)), key=lambda i: -scores[i])]


def keyword_search(q: str) -> list[str]:
    return rank(bm25.scores(q))


def vector_search(q: str) -> list[str]:
    return rank((char_matrix @ char_vec.transform([q]).T).toarray().ravel().tolist())


def rrf(*rankings: list[str], k: int = 60) -> list[str]:
    """Reciprocal Rank Fusion: score = sum of 1 / (k + rank). Uses ranks only, so no score scaling."""
    fused = Counter()
    for ranking in rankings:
        for r, doc_id in enumerate(ranking, start=1):
            fused[doc_id] += 1 / (k + r)
    return [d for d, _ in fused.most_common()]


def hybrid_search(q: str) -> list[str]:
    return rrf(keyword_search(q), vector_search(q))


if __name__ == "__main__":
    for q in ["pod stuck in CrashLoopBackOff", "stop routing users to a pod that is still booting"]:
        print(q)
        print("  keyword:", keyword_search(q)[:3])
        print("  vector: ", vector_search(q)[:3])
        print("  hybrid: ", hybrid_search(q)[:3])`,
      },
      output: "pod stuck in CrashLoopBackOff\n  keyword: ['k8s-crashloop', 'k8s-probes', 'docker-cache']\n  vector:  ['k8s-crashloop', 'k8s-probes', 'http-429']\n  hybrid:  ['k8s-crashloop', 'k8s-probes', 'docker-multistage']\nstop routing users to a pod that is still booting\n  keyword: ['k8s-probes', 'k8s-crashloop', 'docker-cache']\n  vector:  ['k8s-probes', 'git-revert', 'k8s-crashloop']\n  hybrid:  ['k8s-probes', 'k8s-crashloop', 'git-revert']",
      notes: [
        "`rank_bm25` and OpenSearch/Elasticsearch implement the same formula. PostgreSQL's built-in `ts_rank` is a different (simpler) ranking, which is fine for many apps.",
      ],
    },
    {
      title: "Measure: recall@k and MRR per retriever",
      code: {
        lang: "python",
        file: "evaluate.py",
        code: `from corpus import GOLDEN
from retrievers import hybrid_search, keyword_search, vector_search


def recall_at_k(search, k: int) -> float:
    return sum(want in search(q)[:k] for q, want in GOLDEN) / len(GOLDEN)


def mrr(search) -> float:
    """Mean Reciprocal Rank: 1 if the answer is first, 1/2 if second, ... averaged."""
    return sum(1 / (search(q).index(want) + 1) for q, want in GOLDEN) / len(GOLDEN)


print(f"{'retriever':8} {'R@1':>5} {'R@3':>5} {'MRR':>5}")
for name, fn in [("keyword", keyword_search), ("vector", vector_search), ("hybrid", hybrid_search)]:
    print(f"{name:8} {recall_at_k(fn, 1):5.2f} {recall_at_k(fn, 3):5.2f} {mrr(fn):5.2f}")

print("\\nmisses at rank 1:")
for q, want in GOLDEN:
    for name, fn in [("keyword", keyword_search), ("vector", vector_search), ("hybrid", hybrid_search)]:
        got = fn(q)[0]
        if got != want:
            print(f"  {name:8} {q!r} -> {got} (want {want})")`,
      },
      output: "retriever   R@1   R@3   MRR\nkeyword   0.80  0.80  0.85\nvector    0.70  1.00  0.83\nhybrid    0.80  0.90  0.88\n\nmisses at rank 1:\n  vector   'my container restarts again and again, how do I see what happened' -> k8s-probes (want k8s-crashloop)\n  keyword  'why does my image rebuild everything after a small code change' -> docker-multistage (want docker-cache)\n  vector   'why does my image rebuild everything after a small code change' -> docker-multistage (want docker-cache)\n  hybrid   'why does my image rebuild everything after a small code change' -> docker-multistage (want docker-cache)\n  keyword  'make the production container smaller' -> k8s-crashloop (want docker-multistage)\n  vector   'make the production container smaller' -> k8s-probes (want docker-multistage)\n  hybrid   'make the production container smaller' -> k8s-crashloop (want docker-multistage)",
      notes: [
        "Read the numbers honestly: no retriever wins every column. Keyword search fails when the query shares no words with the answer; the vector stand-in finds everything in its top 3 but often not first. Hybrid has the best MRR, the most robust overall.",
        "The miss list matters more than the averages. 'Make the production container smaller' shares no words with 'multi-stage builds ... small runtime image': exactly what reranking (or better embeddings) fixes.",
        "With 10 queries, one query moves a metric by 0.10. Use hundreds before trusting small differences.",
      ],
    },
    {
      title: "Rerank the candidates",
      text: [
        "Hybrid search has the right document within its top 5 for every golden query (recall@5 = 1.0), but not always first. A reranker reads each candidate against the query and reorders them.",
      ],
      code: {
        lang: "python",
        file: "rerank.py",
        code: `from anthropic import Anthropic
from pydantic import BaseModel, Field

from corpus import DOCS
from retrievers import hybrid_search

client = Anthropic()


class Judgement(BaseModel):
    doc_index: int
    relevance: int = Field(ge=0, le=3, description="0 unrelated, 1 related topic, 2 partly answers, 3 fully answers")


class Ranking(BaseModel):
    judgements: list[Judgement]


def rerank(query: str, candidates: list[str], top_n: int = 3) -> list[str]:
    docs = "\\n".join(f'<doc index="{i}">{DOCS[c]}</doc>' for i, c in enumerate(candidates))
    response = client.messages.parse(
        model="claude-haiku-5-5",                        # small model: reranking is a judging task
        max_tokens=2000,
        system="Grade how well each document answers the query. Judge every document.",
        messages=[{"role": "user", "content": f"<docs>\\n{docs}\\n</docs>\\n<query>{query}</query>"}],
        output_format=Ranking,
    )
    score = {j.doc_index: j.relevance for j in response.parsed_output.judgements}
    order = sorted(range(len(candidates)), key=lambda i: (-score.get(i, 0), i))  # ties keep retrieval order
    return [candidates[i] for i in order[:top_n]]


if __name__ == "__main__":
    q = "make the production container smaller"
    candidates = hybrid_search(q)[:5]                    # retrieve wide, cheaply
    print("hybrid:  ", candidates)
    print("reranked:", rerank(q, candidates))           # then judge narrow, carefully`,
      },
      output: "hybrid:   ['k8s-crashloop', 'k8s-probes', 'docker-cache', 'docker-multistage', 'git-conflict']\nreranked: ['docker-multistage', 'k8s-probes', 'docker-cache']",
      notes: [
        "The hybrid line is computed; the reranked line comes from a recorded model response. Run `evaluate.py` with a 'hybrid+rerank' row to measure the real gain on your data.",
        "Dedicated rerankers (open cross-encoder models, or hosted rerank APIs) are faster and cheaper than an LLM for this job. An LLM reranker is a good start when you already have the API and modest traffic.",
        "Reranking only reorders what retrieval found. If recall@k is low, fix retrieval first.",
      ],
    },
    {
      title: "Judge the answers: groundedness with a rubric",
      code: {
        lang: "python",
        file: "judge.py",
        code: `from anthropic import Anthropic
from pydantic import BaseModel

client = Anthropic()

RUBRIC = """You grade answers from a RAG system. Use ONLY the sources to decide.
grounded: every factual claim in the answer is supported by the sources.
unsupported_claims: list each claim that the sources do not support (empty if none).
answers_question: the answer addresses what was asked (a correct refusal counts as true
when the sources lack the answer)."""


class Verdict(BaseModel):
    unsupported_claims: list[str]       # first: makes the model look before it decides
    grounded: bool
    answers_question: bool


def judge(question: str, sources: list[str], answer: str) -> Verdict:
    src = "\\n".join(f"<source>{s}</source>" for s in sources)
    response = client.messages.parse(
        model="claude-opus-5-5",              # judges need a strong model
        max_tokens=4000,
        system=RUBRIC,
        messages=[{"role": "user", "content":
                   f"<sources>\\n{src}\\n</sources>\\n<question>{question}</question>\\n<answer>{answer}</answer>"}],
        output_format=Verdict,
    )
    return response.parsed_output


if __name__ == "__main__":
    v = judge(
        "How do I handle HTTP 429?",
        ["HTTP 429 Too Many Requests means you hit a rate limit. Back off exponentially and respect the Retry-After header."],
        "Back off exponentially, respect Retry-After, and upgrade to the paid tier to remove limits.",
    )
    print(v)`,
      },
      output: "unsupported_claims=['Upgrading to the paid tier removes limits'] grounded=False answers_question=True",
      notes: [
        "Output shown is a recorded response. The judge caught a claim that sounds plausible but is not in the sources: the classic hallucination RAG is supposed to prevent.",
        "Field order matters: listing unsupported claims *before* the boolean makes the model look for evidence before it commits to a verdict.",
        "Never trust a judge you have not calibrated against humans (homework challenge).",
      ],
    },
  ],
  companies: [
    "**Hybrid is the production default.** Search engines (Elasticsearch, OpenSearch), vector databases and PostgreSQL setups commonly combine keyword and vector retrieval, because enterprise queries are full of product names, ticket ids and error codes that pure embeddings handle poorly.",
    "**Contextual chunking:** teams improve retrieval by adding context to each chunk before indexing (document title, section path, or a short model-written summary of where the chunk fits), so a chunk that says 'it' still matches queries about the topic.",
    "**Two-stage ranking** (fast candidate generation, then an accurate reranker) is the same architecture used by web search, e-commerce search and recommendation feeds.",
    "**Offline evals plus online signals:** teams track retrieval metrics on a golden set in CI, and in production watch thumbs-down rates, 'I couldn't find that' rates and citation clicks to discover new failure cases.",
  ],
  mistakes: [
    {
      mistake: "Tuning the prompt to fix a retrieval problem",
      why: "The answer looks wrong, so the prompt gets blamed",
      wrong: "Hours of prompt edits while the right chunk never reached the model",
      fix: "Check recall@k first: if the answer is not in the context, fix retrieval",
    },
    {
      mistake: "Adding raw BM25 and cosine scores",
      why: "'Both are relevance scores'",
      wrong: "One scale dominates (BM25 can be 12, cosine is at most 1), so fusion silently becomes keyword-only",
      fix: "Use RRF, or normalise both before a weighted sum",
    },
    {
      mistake: "Vector-only search for technical content",
      why: "Embeddings feel like magic",
      wrong: "Exact error codes, flags and version numbers rank below vaguely related text",
      fix: "Hybrid retrieval with a keyword component",
    },
    {
      mistake: "Reranking a tiny candidate list",
      why: "Reranking is slow, so k is kept small",
      wrong: "The relevant document was at rank 12 and never got a chance",
      fix: "Retrieve 20 to 100 candidates, rerank to the top 3 to 5",
    },
    {
      mistake: "Trusting an uncalibrated LLM judge",
      why: "The scores look reasonable",
      wrong: "High overall agreement that hides missed hallucinations",
      fix: "Label a sample by hand; measure agreement and kappa on the class you care about",
    },
    {
      mistake: "Tuning on the same queries you report",
      why: "Small datasets",
      wrong: "Inflated scores that do not hold for real users",
      fix: "Keep separate dev and test splits; grow the set from production failures",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Version the golden set and run retrieval metrics in CI. Block changes to chunking, embeddings or ranking that lower recall@k or MRR.",
    },
    {
      tag: "Performance",
      text: "Keep retrieval cheap and parallel (keyword and vector queries can run concurrently), and spend latency only on reranking a short list.",
    },
    {
      tag: "Cost",
      text: "Include fewer, better chunks. Reranking to the top 3 to 5 reduces input tokens on every generation call.",
    },
    {
      tag: "Security",
      text: "Apply document permissions in the retrieval query (a WHERE clause on tenant or ACL), never after generation; a judge or reranker must not see documents the user cannot.",
    },
    {
      tag: "Maintainability",
      text: "Log query, retrieved ids, ranks and scores for every request so you can replay and debug failures.",
    },
  ],
  interview: [
    {
      q: "Why use hybrid search instead of only vector search?",
      a: "Vector search captures meaning but is weak on exact tokens like error codes, identifiers, names and numbers; keyword search (BM25) is the opposite. Running both and fusing the rankings, typically with Reciprocal Rank Fusion, covers both kinds of query and is more robust. RRF uses ranks, so it avoids normalising incompatible scores.",
    },
    {
      q: "How would you evaluate a RAG system?",
      a: "Separate retrieval and generation. Build a golden set of real questions with known relevant documents; measure recall@k, MRR or nDCG for retrieval. For generation, measure groundedness (claims supported by retrieved sources), answer relevance and refusal correctness, using human labels for a sample and an LLM judge calibrated against them for scale. Run it in CI on every change and add production failures to the set.",
    },
    {
      q: "What is a reranker and when do you need one?",
      a: "A model that scores each query-document pair jointly (a cross-encoder, a rerank API or an LLM), which is more accurate than comparing separately computed embeddings but too slow for the whole corpus. Use it when recall@k for a larger k is good but the right document is often not at the top: retrieve 20 to 100 candidates cheaply, rerank to the top few.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Recall@20 is 0.95 but recall@3 is 0.60. What is the most effective next step?",
      options: [
        "Switch to a bigger generation model",
        "Add a reranker over the top 20 candidates",
        "Reduce chunk size by half",
        "Increase max_tokens",
      ],
      answer: 1,
      explanation: "The right documents are being found but not ranked near the top. Reranking reorders an existing candidate list, which is exactly this problem.",
    },
    {
      kind: "output",
      prompt: "What does this RRF fusion print (k = 60)?",
      code: {
        lang: "python",
        code: `from collections import Counter

def rrf(*rankings, k=60):
    fused = Counter()
    for ranking in rankings:
        for r, d in enumerate(ranking, start=1):
            fused[d] += 1 / (k + r)
    return [d for d, _ in fused.most_common()]

print(rrf(["a", "b", "c"], ["c", "b", "d"]))`,
      },
      options: ["['a', 'c', 'b', 'd']", "['b', 'c', 'a', 'd']", "['c', 'b', 'a', 'd']", "['a', 'b', 'c', 'd']"],
      answer: 2,
      explanation: "c: 1/63 + 1/61 ≈ 0.0323; b: 1/62 + 1/62 ≈ 0.0323 but slightly lower (0.03226 vs 0.03227); a: 1/61 ≈ 0.0164; d: 1/63 ≈ 0.0159. Documents found by both retrievers rise to the top.",
    },
    {
      kind: "bug",
      prompt: "The team's hybrid search behaves exactly like keyword search. Why?",
      code: {
        lang: "python",
        code: `def hybrid(q):
    kw = bm25.scores(q)          # e.g. 0 to 14
    vec = cosine_scores(q)       # -1 to 1
    combined = [a + b for a, b in zip(kw, vec)]
    return rank(combined)`,
      },
      options: [
        "Cosine similarity should be squared",
        "Scores are on different scales, so BM25 dominates the sum",
        "zip drops the last document",
        "Hybrid search needs three retrievers",
      ],
      answer: 1,
      explanation: "Raw scores are not comparable. Use Reciprocal Rank Fusion, or min-max normalise both lists before a weighted sum.",
    },
  ],
  cheatSheet: [
    "BM25 = exact terms (codes, names); vectors = meaning (paraphrases). Use both.",
    "RRF: score(d) = Σ 1/(60 + rank). Ranks only, no normalisation.",
    "Retrieve wide (20 to 100), rerank narrow (3 to 5).",
    "Recall@k: is it there? MRR/nDCG: is it near the top?",
    "Debug retrieval before prompts: no context, no correct answer.",
    "Groundedness judge: list unsupported claims, then verdict.",
    "Calibrate judges against human labels (agreement + kappa).",
    "Dev/test split; grow the golden set from production failures.",
    "Permissions in the retrieval query, never after.",
  ],
  homework: {
    basic: {
      title: "Implement the metrics",
      brief: [
        "Write precision@k, recall@k (supporting several relevant documents per query) and nDCG@k with graded relevance. Verify them on a hand-made example where you know the answers.",
      ],
      criteria: [
        "Three functions with clear signatures",
        "Graded relevance in nDCG",
        "A worked example whose result you checked by hand",
      ],
      hints: ["DCG divides each gain by log2(rank + 1), with ranks starting at 1."],
      solution: {
        text: [
          "The example puts a partly relevant document first and the best one third: recall is perfect (both are in the top 3) but nDCG drops to 0.69 because the best answer is not on top. That is why ranking metrics matter for RAG.",
        ],
        code: {
          lang: "python",
          file: "metrics.py",
          code: `import math


def precision_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    return sum(d in relevant for d in ranked[:k]) / k


def recall_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    return sum(d in relevant for d in ranked[:k]) / len(relevant)


def ndcg_at_k(ranked: list[str], gains: dict[str, int], k: int) -> float:
    """Graded relevance: a highly relevant doc at rank 1 is worth more than at rank 3."""
    dcg = sum(gains.get(d, 0) / math.log2(i + 2) for i, d in enumerate(ranked[:k]))
    ideal = sorted(gains.values(), reverse=True)[:k]
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(ideal))
    return dcg / idcg if idcg else 0.0


ranked = ["docker-cache", "k8s-probes", "docker-multistage", "git-revert"]
gains = {"docker-multistage": 3, "docker-cache": 1}      # 3 = answers it, 1 = related
relevant = set(gains)
print(f"P@3={precision_at_k(ranked, relevant, 3):.2f} "
      f"R@3={recall_at_k(ranked, relevant, 3):.2f} "
      f"nDCG@3={ndcg_at_k(ranked, gains, 3):.2f}")
best = ["docker-multistage", "docker-cache", "k8s-probes"]
print(f"ideal order nDCG@3={ndcg_at_k(best, gains, 3):.2f}")`,
        },
        output: "P@3=0.67 R@3=1.00 nDCG@3=0.69\nideal order nDCG@3=1.00",
      },
    },
    intermediate: {
      title: "Weighted fusion and the danger of tiny eval sets",
      brief: [
        "Implement weighted score fusion (min-max normalise both retrievers, then alpha × keyword + (1 − alpha) × vector). Tune alpha on a dev split and report MRR on a separate test split. Explain what you observe.",
      ],
      criteria: ["Normalisation before mixing", "Separate dev and test splits", "Honest interpretation of the result"],
      hints: ["`GOLDEN[::2]` and `GOLDEN[1::2]` give a quick split."],
      solution: {
        text: [
          "The dev curve is flat: with 5 dev queries, every alpha except pure keyword gets the same MRR, so 'the best alpha' is just the first in the list, and the test score (0.80) differs from dev (0.87). The data cannot tell the settings apart.",
          "Conclusion: collect more labelled queries before tuning, prefer RRF (no parameter to overfit) until you have them, and always report on data you did not tune on.",
        ],
        code: {
          lang: "python",
          file: "tune_fusion.py",
          code: `from corpus import GOLDEN
from retrievers import IDS, bm25, char_matrix, char_vec


def minmax(xs: list[float]) -> list[float]:
    lo, hi = min(xs), max(xs)
    return [(x - lo) / (hi - lo) if hi > lo else 0.0 for x in xs]


def weighted(q: str, alpha: float) -> list[str]:
    """alpha=1: keyword only, alpha=0: vector only. Scores must be normalised before mixing."""
    kw = minmax(bm25.scores(q))
    vec = minmax((char_matrix @ char_vec.transform([q]).T).toarray().ravel().tolist())
    s = [alpha * a + (1 - alpha) * b for a, b in zip(kw, vec)]
    return [IDS[i] for i in sorted(range(len(IDS)), key=lambda i: -s[i])]


def mrr(search, cases) -> float:
    return sum(1 / (search(q).index(want) + 1) for q, want in cases) / len(cases)


dev, test = GOLDEN[::2], GOLDEN[1::2]               # tune on dev, report on test
results = {a / 10: mrr(lambda q: weighted(q, a / 10), dev) for a in range(11)}
best = max(results, key=results.get)
print("dev MRR by alpha:", {a: round(m, 2) for a, m in results.items()})
print(f"best alpha={best} dev MRR={results[best]:.2f} test MRR={mrr(lambda q: weighted(q, best), test):.2f}")`,
        },
        output: "dev MRR by alpha: {0.0: 0.87, 0.1: 0.87, 0.2: 0.87, 0.3: 0.87, 0.4: 0.87, 0.5: 0.87, 0.6: 0.87, 0.7: 0.87, 0.8: 0.87, 0.9: 0.87, 1.0: 0.85}\nbest alpha=0.0 dev MRR=0.87 test MRR=0.80",
      },
    },
    challenge: {
      title: "Calibrate the judge",
      brief: [
        "Label 12 or more RAG answers as grounded or not by hand, run the LLM judge on the same answers, and compute agreement, Cohen's kappa and how many ungrounded answers the judge missed. Decide whether the judge is good enough for CI.",
      ],
      criteria: [
        "Human labels collected before looking at judge output",
        "Kappa computed correctly",
        "Missed-hallucination count reported",
        "A decision with reasoning",
      ],
      hints: [
        "Kappa = (observed − expected) / (1 − expected), where expected is chance agreement from each rater's label frequencies.",
      ],
      solution: {
        text: [
          "83% agreement sounds good, but kappa is only 0.57 and the judge missed 2 of the 4 ungrounded answers: it is lenient exactly where it matters. Not good enough to gate releases yet.",
          "Fixes to try: a stronger judge model, a stricter rubric with examples of subtle unsupported claims, asking for quotes as evidence per claim, and re-measuring on fresh labels.",
        ],
        code: {
          lang: "python",
          file: "calibrate.py",
          code: `from collections import Counter

# grounded? labels for the same 12 answers: one from a careful human, one from the LLM judge
human = [1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1]
judge = [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1]


def cohen_kappa(a: list[int], b: list[int]) -> float:
    """Agreement corrected for chance: 1 = perfect, 0 = no better than chance."""
    n = len(a)
    observed = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    expected = sum(ca[k] * cb[k] for k in set(a) | set(b)) / n**2
    return (observed - expected) / (1 - expected)


agree = sum(x == y for x, y in zip(human, judge)) / len(human)
missed = sum(h == 0 and j == 1 for h, j in zip(human, judge))     # judge said grounded, human said no
print(f"agreement={agree:.0%} kappa={cohen_kappa(human, judge):.2f} "
      f"ungrounded answers the judge missed: {missed} of {human.count(0)}")`,
        },
        output: "agreement=83% kappa=0.57 ungrounded answers the judge missed: 2 of 4",
      },
    },
    capstone: {
      title: "DevAtlas: hybrid retrieval inside PostgreSQL",
      brief: [
        "Move the tutor's retrieval into PostgreSQL: a generated `tsvector` column with a GIN index for keywords, a pgvector column with an HNSW index, and one SQL query that fuses both with RRF. Measure recall@3 on the golden set.",
      ],
      criteria: [
        "Schema with both indexes",
        "One parameterised hybrid query (no string formatting of user input)",
        "Recall@3 printed from the database results",
      ],
      hints: [
        "`websearch_to_tsquery` accepts user-style queries safely.",
        "A FULL OUTER JOIN keeps documents found by only one retriever.",
      ],
      solution: {
        text: [
          "One database holds app data, text search and vectors, so permissions are a WHERE clause and there is no second system to keep in sync. Verified on PostgreSQL 16 with pgvector: recall@3 = 0.90, matching the Python hybrid.",
          "`ts_rank_cd` is not BM25, but inside RRF only the order matters. For a real embedding model, change `DIM` and `embed()`; the SQL stays the same.",
        ],
        code: {
          lang: "python",
          file: "services/ai/hybrid_pg.py",
          code: `"""Hybrid search inside PostgreSQL: full-text (tsvector) + pgvector, fused with RRF in SQL."""
import os

import psycopg
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

from corpus import DOCS, GOLDEN

DIM = 8  # toy size for the demo; real embedding models use 384 to 3072 dimensions

# Stand-in embedder (char n-grams compressed with SVD). Replace with a real embedding model.
_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
_svd = TruncatedSVD(n_components=DIM, random_state=0).fit(_vec.fit_transform(DOCS.values()))

def embed(text: str) -> str:
    v = _svd.transform(_vec.transform([text]))[0]
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"     # pgvector text format

SCHEMA = f"""
CREATE EXTENSION IF NOT EXISTS vector;
DROP TABLE IF EXISTS chunks;
CREATE TABLE chunks (
  id        text PRIMARY KEY,
  body      text NOT NULL,
  tsv       tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED,
  embedding vector({DIM}) NOT NULL
);
CREATE INDEX chunks_tsv ON chunks USING gin (tsv);
CREATE INDEX chunks_vec ON chunks USING hnsw (embedding vector_cosine_ops);
"""

HYBRID = """
WITH kw AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(tsv, q) DESC) AS r
  FROM chunks, websearch_to_tsquery('english', %(q)s) AS q
  WHERE tsv @@ q
  ORDER BY r
  LIMIT 20
), vec AS (
  SELECT id, row_number() OVER (ORDER BY embedding <=> %(e)s::vector) AS r
  FROM chunks
  ORDER BY embedding <=> %(e)s::vector
  LIMIT 20
)
SELECT id,
       round((coalesce(1.0 / (60 + kw.r), 0) + coalesce(1.0 / (60 + vec.r), 0))::numeric, 4) AS rrf,
       kw.r AS kw_rank, vec.r AS vec_rank
FROM kw FULL OUTER JOIN vec USING (id)
ORDER BY rrf DESC
LIMIT %(k)s
"""

with psycopg.connect(os.environ.get("DATABASE_URL", "postgresql://postgres:devpass@localhost/devatlas")) as conn:
    conn.execute(SCHEMA)
    with conn.cursor() as cur:
        cur.executemany("INSERT INTO chunks (id, body, embedding) VALUES (%s, %s, %s)",
                        [(i, body, embed(body)) for i, body in DOCS.items()])
    q = "Retry-After header"
    for row in conn.execute(HYBRID, {"q": q, "e": embed(q), "k": 3}):
        print(row)
    hits = sum(any(r[0] == want for r in conn.execute(HYBRID, {"q": q, "e": embed(q), "k": 3}))
               for q, want in GOLDEN)
    print(f"hybrid (postgres) recall@3 = {hits / len(GOLDEN):.2f}")`,
        },
        output: "('http-429', Decimal('0.0328'), 1, 1)\n('react-effect', Decimal('0.0161'), None, 2)\n('jwt', Decimal('0.0159'), None, 3)\nhybrid (postgres) recall@3 = 0.90",
        pitfalls: [
          "HNSW is approximate: on large tables tune `hnsw.ef_search` and check recall against an exact scan.",
          "The keyword CTE needs `ORDER BY r` before `LIMIT`, otherwise PostgreSQL may keep arbitrary rows.",
        ],
      },
    },
  },
  deeper: [
    { label: "Anthropic: Contextual Retrieval", url: "https://www.anthropic.com/news/contextual-retrieval" },
    {
      label: "Reciprocal Rank Fusion paper (Cormack et al., 2009)",
      url: "https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf",
    },
    { label: "pgvector: hybrid search and indexing", url: "https://github.com/pgvector/pgvector" },
    {
      label: "PostgreSQL docs: Full text search",
      url: "https://www.postgresql.org/docs/current/textsearch.html",
    },
  ],
  nextPreview: "Next: agents, tools and MCP. You will build an agent loop with guardrails, expose DevAtlas tools over the Model Context Protocol, and learn when a simple workflow beats an agent.",
};
