import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.10.1",
  title: "LLM-assisted DevOps: code review, pipeline debugging, infra and K8s",
  minutes: 80,
  level: "Advanced",
  prerequisites: ["9.2.1 GitHub Actions and Azure Pipelines", "7.1.2 Prompt engineering that survives production"],
  summary: "Use AI as a force multiplier across the DevOps loop — a pair reviewer, a pipeline doctor, an infra reviewer and a monitoring triager — while knowing exactly where it fails: hallucinations, stale configs, insecure drafts, and the human review gate that never disappears.",
  terms: [
    { term: "LLM-assisted engineering", def: "Using a language model to accelerate a step — code, review, diagnosis, config — while a human and CI remain responsible for correctness." },
    { term: "Pipeline doctor", def: "An AI that reads a CI failure log and proposes a likely root cause and fix." },
    { term: "AIOps", def: "Applying ML to operations data — anomaly detection, alert noise reduction, incident summarisation." },
    { term: "On-call copilot", def: "An assistant that summarises an incident, suggests runbooks and correlates signals during an outage." },
    { term: "Hallucination", def: "Plausible but wrong output — an invented flag, API or diagnosis that the model states with confidence." },
    { term: "Review gate", def: "The rule that AI produces a draft, a human reviews it, and tests/CI verify it — AI never skips verification." },
    { term: "Copilot atrophy", def: "Skill loss from over-reliance on AI, where the engineer stops reasoning and just trusts the suggestion." },
  ],
  problem: [
    "A pipeline fails at 11 pm and the on-call engineer pastes the error into a chat and gets an answer in seconds — but the answer names a flag that does not exist. Another teammate generates a Terraform module that looks perfect and grants far more than least privilege. AI is a huge accelerator, but used without a gate it manufactures convincing mistakes.",
    "The question is not 'should we use AI' but 'where does it help, and where must a human and CI still verify'. That line is the whole discipline of AI-assisted DevOps.",
  ],
  concept: {
    analogy: [
      "An LLM is a **very fast, very confident junior engineer with total recall of every blog post ever written**. It drafts a review, a diagnosis or a config in seconds, but it has never run your code, does not know your secrets policy, and will not notice when the latest API it 'remembers' was deprecated. You would not let a junior push to production unreviewed; do not let an LLM either.",
    ],
    precise: [
      "**Where AI fits:** as a **pair reviewer** (draft a code review, catch a missed edge case), a **pipeline doctor** (CI error log → likely root cause), an **infra reviewer** (explain a Terraform diff, check for over-permission), a **K8s assistant** (K8sGPT reads a broken cluster), and a **monitoring triager** (summarise an alert storm).",
      "**The dark side is real:** hallucinations (invented flags and APIs), stale training data (a Terraform provider or AWS service that moved on), silently insecure configs, and copilot atrophy. Pasting production logs with PII or secrets into a public LLM is a privacy and IP breach.",
      "**The review gate is non-negotiable.** AI generates the draft; a human reviews it; tests and CI verify it; only then does it deploy. AI accelerates steps one and two of the loop, never the verification.",
      "**Prompts are config.** A good DevOps prompt includes the system, the specific error/context, the constraint (least privilege, no secrets), and asks for the reasoning, not just the answer. The same prompt engineering from lesson 7.1.2 applies to infrastructure and pipelines.",
    ],
  },
  underTheHood: {
    text: [
      "Under the hood these tools are all the same pattern: context (code, a diff, a log, an alert) plus a model that predicts the most likely useful continuation. There is no hidden 'understanding' of your cluster — the model is pattern-matching against everything it was trained on, which is why its answers are confident even when wrong.",
      "That means the useful version is always 'AI draft → human review → automated verify'. The pipeline-doctor diagnosis is a starting hypothesis to confirm in logs, not a conclusion. The Terraform draft is a starting point to run `terraform plan` on, not `terraform apply`.",
      "Deterministic rules still win for anything with one right answer. A z-score anomaly flag is five lines of arithmetic; a CI failure can often be matched by keyword rules. Use AI where the input is messy and the answer is a judgement, not a lookup.",
    ],
    diagram: {
      title: "The AI-assisted DevOps loop",
      nodes: [
        { label: "Context", sub: "diff · log · diff · alert" },
        { label: "AI draft", sub: "review / diagnosis / config" },
        { label: "Human review", sub: "least privilege, sanity" },
        { label: "CI / tests", sub: "plan, scan, test" },
        { label: "Deploy", sub: "only now" },
      ],
      edges: ["generates", "approves", "verifies", "then"],
    },
  },
  handsOn: [
    {
      title: "What a pipeline doctor does",
      text: [
        "A pipeline doctor maps a CI failure to a likely root cause. The deterministic version is rules; the LLM version adds judgement on top. Rules are where you should always start.",
      ],
      code: {
        lang: "python",
        file: "pipeline_triage.py",
        code: `"""What an AI pipeline doctor does: map a CI failure to a likely root cause (rules)."""
def diagnose(log: str) -> str:
    log = log.lower()
    if "no space left on device" in log:
        return "disk full on the runner: clean caches or raise the disk size"
    if "permission denied" in log or "403" in log:
        return "missing secret or wrong credentials: check the repo/org secret"
    if "connection timed out" in log or "could not resolve" in log:
        return "network/DNS: the runner cannot reach the registry or a dependency"
    if "killed" in log:
        return "out of memory: the step exceeded the runner memory; reduce parallelism"
    if "no such file or directory" in log:
        return "missing artifact or wrong working directory / path"
    return "unknown: read the first error line and trace backwards"


LOGS = [
    "npm ERR! ENOSPC: no space left on device, write",
    "docker push ghcr.io/acme/api:latest ... 403 Forbidden",
    "go test ... Killed (OOM)",
    "curl: (7) Failed to connect to registry port 443: Connection timed out",
]
for log in LOGS:
    print(f"{log[:52]:52} -> {diagnose(log)}")`,
      },
      output: "npm ERR! ENOSPC: no space left on device, write      -> disk full on the runner: clean caches or raise the disk size\ndocker push ghcr.io/acme/api:latest ... 403 Forbidde -> missing secret or wrong credentials: check the repo/org secret\ngo test ... Killed (OOM)                             -> out of memory: the step exceeded the runner memory; reduce parallelism\ncurl: (7) Failed to connect to registry port 443: Co -> network/DNS: the runner cannot reach the registry or a dependency",
      notes: [
        "The rules cover the top failure modes; a real pipeline doctor (GitHub Copilot, GitLab Duo, or an LLM CLI) adds judgement on the 'unknown' tail. Either way, the diagnosis is a hypothesis to confirm, not a conclusion.",
      ],
    },
    {
      title: "A real local model as pipeline doctor",
      text: [
        "The same job done by a model running locally through Ollama — no API key, no data leaving your machine. Output varies run to run, which is exactly the point: it is a draft to verify.",
      ],
      code: {
        lang: "python",
        file: "ollama_devops.py",
        code: `"""A real local model as a pipeline doctor: feed the CI error, get a root-cause guess."""
import httpx

ERROR = "docker push ghcr.io/acme/api:latest failed: denied: permission_denied"

r = httpx.post(
    "http://localhost:11434/api/chat",
    json={
        "model": "qwen3.5:0.8b",
        "messages": [
            {"role": "system", "content": "You are an on-call CI/CD engineer. State the most likely root cause in one sentence, then the fix in one sentence."},
            {"role": "user", "content": ERROR},
        ],
        "stream": False,
    },
    timeout=240,
)
print("CI error:", ERROR)
print("AI diagnosis:", r.json()["message"]["content"])`,
      },
      output: "CI error: docker push ghcr.io/acme/api:latest failed: denied: permission_denied\nAI diagnosis: The root cause is likely missing authentication credentials (such as username/password) configured on the Docker daemon or host network before attempting the push to ghcr.io. Fix: Ensure environment variables or `.env` files are properly set to configure `docker login` with valid credentials and apply appropriate permission rules for registry access prior to running the push command.",
      notes: [
        "Prerequisites: `ollama pull qwen3.5:0.8b` and `ollama serve`. Verified with that model; the answer is reasonable here but can be wrong — a small local model is no substitute for a frontier model, and neither replaces verifying the fix in the pipeline.",
      ],
    },
    {
      title: "Anomaly detection that AI would automate",
      text: [
        "AIOps tools flag unusual metric values. The simplest detector — a z-score — is arithmetic you can write yourself, and it is the baseline any ML model has to beat.",
      ],
      code: {
        lang: "python",
        file: "anomaly.py",
        code: `"""Simple anomaly detection: flag points that spike past a z-score threshold."""
stats = [120, 118, 121, 119, 122, 120, 480, 121, 119]
mean = sum(stats) / len(stats)
std = (sum((x - mean) ** 2 for x in stats) / len(stats)) ** 0.5

for i, x in enumerate(stats):
    z = (x - mean) / std if std else 0
    flag = "  <-- anomaly" if abs(z) > 2 else ""
    print(f"t={i:02d} value={x:4d} z={z:5.2f}{flag}")`,
      },
      output: "t=00 value= 120 z=-0.35\nt=01 value= 118 z=-0.37\nt=02 value= 121 z=-0.34\nt=03 value= 119 z=-0.36\nt=04 value= 122 z=-0.34\nt=05 value= 120 z=-0.35\nt=06 value= 480 z= 2.83  <-- anomaly\nt=07 value= 121 z=-0.34\nt=08 value= 119 z=-0.36",
      notes: [
        "z-score is fragile against a single huge spike (it inflates the standard deviation), which is a useful lesson about AIOps in general: the model's job is reducing alert noise, not replacing the engineer who investigates the spike.",
      ],
    },
  ],
  companies: [
    "**GitHub Copilot and GitLab Duo** sit in the IDE and the MR, drafting code and reviews and summarising pipeline failures, always with a human approving the result.",
    "**CodeRabbit and CodeGuru/Q Developer** review PRs automatically, flagging security and style issues for the human to accept or reject.",
    "**K8sGPT** diagnoses a Kubernetes cluster by reading its status and events, triaging failures into a short explanation and suggested fix.",
    "**Datadog Watchdog, Dynatrace Davis and PagerDuty AI** do AIOps at scale: anomaly detection, alert correlation and incident summaries, so on-call starts from a summary instead of a storm of alerts.",
  ],
  mistakes: [
    {
      mistake: "Applying AI-generated config without review",
      why: "It looks correct and saves time",
      wrong: "An over-permissive IAM policy or a wrong Terraform resource goes live",
      fix: "Always `plan`/diff and a human review before apply; AI drafts, never deploys",
    },
    {
      mistake: "Trusting the pipeline diagnosis as fact",
      why: "The model sounds certain",
      wrong: "Chasing a plausible-but-wrong root cause for hours",
      fix: "Treat the diagnosis as a hypothesis and confirm it in logs and metrics",
    },
    {
      mistake: "Pasting production logs into a public LLM",
      why: "It is the fastest way to ask",
      wrong: "PII, secrets and proprietary data leak to a third party",
      fix: "Redact first, or use a local model / self-hosted endpoint for sensitive data",
    },
    {
      mistake: "Relying on AI for the flags and APIs it 'remembers'",
      why: "It answers confidently from stale training data",
      wrong: "A deprecated Terraform argument or a removed CLI flag breaks the run",
      fix: "Cross-check against current docs, and let CI actually run the generated config",
    },
    {
      mistake: "Letting AI do the thinking (copilot atrophy)",
      why: "The suggestion is always right there",
      wrong: "The engineer stops reasoning and cannot catch the subtle wrong answer",
      fix: "Use AI to accelerate, but keep the human the source of truth for correctness",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "AI generates the draft, a human reviews, and CI/tests verify — AI never replaces the verification step.",
    },
    {
      tag: "Security",
      text: "Never paste secrets, PII or proprietary data into a public LLM; use local models or redact first, and review any AI-generated IAM/network config for least privilege.",
    },
    {
      tag: "Maintainability",
      text: "Keep deterministic rules for anything with one right answer, and use AI only for messy judgement calls.",
    },
    {
      tag: "Cost",
      text: "A small local model (Ollama) handles classification and triage drafts for free; reserve frontier models for genuinely hard reasoning.",
    },
    {
      tag: "Performance",
      text: "Let AI reduce alert noise and summarise, but keep the human in the loop for anything that triggers an action.",
    },
  ],
  interview: [
    {
      q: "Where does AI actually help in DevOps, and where must it not be trusted?",
      a: "It helps as a pair reviewer, pipeline doctor, infra reviewer, K8s assistant and monitoring triager — drafting reviews, diagnoses and configs fast. It must not be trusted to verify, to know current APIs (it hallucinates and goes stale), or to act on production. The rule is AI draft → human review → CI verify → deploy.",
    },
    {
      q: "How would you use an LLM to debug a failing CI pipeline?",
      a: "Paste the redacted failure log with the workflow and job name, and ask for the likely root cause, the fix, and how to prevent it — then treat the answer as a hypothesis and confirm it by fixing and re-running the pipeline. I would also start with deterministic rules for the common failures before involving a model.",
    },
    {
      q: "What is the risk of pasting production logs into a public LLM, and what do you do instead?",
      a: "Logs can contain PII, secrets and proprietary data, which then leak to a third party — a privacy and IP breach. I redact or use a local model (Ollama) or a self-hosted endpoint, and never send raw production data to a public service.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "AI generates a Terraform module. What is the correct next step before it affects production?",
      options: [
        "Run `terraform apply` immediately",
        "`terraform plan`, then human review, then apply",
        "Commit it and let CI apply it",
        "Ask the AI if it is correct",
      ],
      answer: 1,
      explanation: "The AI output is a draft. Plan it, review it for least privilege, then apply — verification is never skipped.",
    },
    {
      kind: "output",
      prompt: "What does this anomaly detector flag?",
      code: {
        lang: "python",
        code: `values = [10, 11, 10, 12, 100, 11]
mean = sum(values) / len(values)
for i, x in enumerate(values):
    if x > mean * 3:
        print("flag", i)`,
      },
      options: ["flag 4", "flag 3", "flag 0", "nothing"],
      answer: 0,
      explanation: "mean ≈ 25.7; only 100 (index 4) exceeds 3× the mean.",
    },
    {
      kind: "bug",
      prompt: "The on-call engineer trusts an AI's diagnosis, spends two hours, and it was wrong. What is the actual flaw?",
      options: [
        "The AI is fine — the engineer treated a hypothesis as fact and did not confirm it in logs",
        "AI should never be used",
        "The pipeline was not long enough",
        "There is no flaw",
      ],
      answer: 0,
      explanation: "The model produces a plausible hypothesis, not a verified answer. The flaw is skipping confirmation against actual logs and metrics.",
    },
  ],
  cheatSheet: [
    "AI fits: pair reviewer, pipeline doctor, infra reviewer, K8s assistant, monitoring triager.",
    "The loop: AI draft → human review → CI/tests verify → deploy.",
    "Hallucination and stale data are the default failure modes — cross-check against docs.",
    "Never paste secrets/PII into a public LLM; use local models or redact.",
    "AI-generated IAM/network config always gets a least-privilege review.",
    "Deterministic rules first; AI only for messy judgement calls.",
    "The diagnosis is a hypothesis — confirm it in logs, metrics and traces.",
    "A small local model (Ollama) does triage drafts for free and keeps data on your machine.",
  ],
  homework: {
    basic: {
      title: "A reusable pipeline-debugging prompt",
      brief: [
        "Write a function that builds a copy-pasteable prompt from a workflow name, job name and error log, asking for root cause, fix and prevention.",
      ],
      criteria: [
        "Prompt includes the workflow, job and error log",
        "Asks for root cause, fix and prevention in order",
        "Output is a ready-to-paste string",
      ],
      hints: ["Structure the prompt with a clear role, the inputs, and the requested output."],
      solution: {
        text: [
          "A good prompt is reusable config: state the role, feed the exact inputs, and ask for the reasoning, not just the answer. The same template works for code review, Terraform diffs and K8s diagnostics.",
        ],
        code: {
          lang: "python",
          file: "prompt_pipeline.py",
          code: `"""Build a reusable prompt for CI failure diagnosis."""
def build_prompt(workflow: str, job: str, error_log: str) -> str:
    return (
        "You are an on-call CI/CD engineer. Given the failed workflow, job and error log, "
        "state the most likely root cause, then the fix, then how to prevent it.\\n\\n"
        f"Workflow: {workflow}\\nJob: {job}\\nError log:\\n{error_log}"
    )


print(build_prompt("build-and-push", "docker", "denied: permission_denied")[:200], "...")`,
        },
        output: "You are an on-call CI/CD engineer. Given the failed workflow, job and error log, state the most likely root cause, then the fix, then how to prevent it.\n\nWorkflow: build-and-push\nJob: docker\nError log ...",
      },
    },
    intermediate: {
      title: "A configurable anomaly detector",
      brief: [
        "Write a z-score anomaly detector that takes a threshold and a list of values, and prints which points cross the threshold.",
      ],
      criteria: [
        "Computes mean and standard deviation correctly",
        "Threshold is a parameter",
        "Flags the outlier point",
      ],
      hints: ["z = (value - mean) / std; flag when |z| exceeds the threshold."],
      solution: {
        text: [
          "z-score is the baseline every AIOps tool competes with. It is also a cautionary tale: one huge spike inflates the standard deviation, so a single outlier can hide smaller anomalies — a real limitation of naive statistical methods.",
        ],
        code: {
          lang: "python",
          file: "anomaly2.py",
          code: `"""A z-score anomaly detector with a configurable threshold."""
def zscores(values):
    m = sum(values) / len(values)
    s = (sum((x - m) ** 2 for x in values) / len(values)) ** 0.5
    return [(x - m) / s if s else 0 for x in values]


values = [100, 102, 99, 101, 100, 103, 400, 101, 100]
for i, z in enumerate(zscores(values)):
    flag = " -> alert" if abs(z) > 2 else ""
    print(f"t={i} value={values[i]} z={z:.2f}{flag}")`,
        },
        output: "t=0 value=100 z=-0.36\nt=1 value=102 z=-0.34\nt=2 value=99 z=-0.37\nt=3 value=101 z=-0.35\nt=4 value=100 z=-0.36\nt=5 value=103 z=-0.33\nt=6 value=400 z=2.83 -> alert\nt=7 value=101 z=-0.35\nt=8 value=100 z=-0.36",
      },
    },
    challenge: {
      title: "Where AI fits and where it must not",
      brief: [
        "Write a decision function that, given a task, returns 'AI good here (draft)', 'AI draft → review → tests', or 'human required', based on the risk.",
      ],
      criteria: [
        "Security-critical tasks (IAM, secrets, apply) require human approval",
        "Explanation/summarisation tasks are safe for AI",
        "Everything else gets the review gate",
      ],
      hints: ["Use a keyword list for the 'never alone' category."],
      solution: {
        text: [
          "The one rule worth memorising: the more irreversible and security-sensitive the change, the more the human and CI must own the final call.",
        ],
        code: {
          lang: "python",
          file: "ai_limits.py",
          code: `"""Where AI helps and where it must not be trusted, for this topic."""
def ai_fit(task: str) -> str:
    never = ("iam", "secrets", "terraform apply", "production")
    if any(k in task.lower() for k in never):
        return "HUMAN REQUIRED: review + approval before any change"
    if "explain" in task.lower() or "summarise" in task.lower():
        return "AI is good here (draft only)"
    return "AI draft -> human review -> tests"


for t in ("explain this pipeline failure", "generate an IAM policy", "summarise the outage timeline", "run terraform apply"):
    print(f"{t:38} -> {ai_fit(t)}")`,
        },
        output: "explain this pipeline failure          -> AI is good here (draft only)\ngenerate an IAM policy                 -> HUMAN REQUIRED: review + approval before any change\nsummarise the outage timeline          -> AI is good here (draft only)\nrun terraform apply                    -> HUMAN REQUIRED: review + approval before any change",
      },
    },
    capstone: {
      title: "DevAtlas: on-call copilot skeleton",
      brief: [
        "Build a copilot that answers an alert with a deterministic rule when one matches (disk, CPU) and otherwise escalates to a model with the alert text.",
      ],
      criteria: [
        "Deterministic rules handle the known symptoms",
        "Unknown alerts are routed to a model",
        "Runs offline",
      ],
      hints: ["Rules first, model second — the cheapest, most predictable path wins."],
      solution: {
        text: [
          "This is the architecture of a real on-call copilot: deterministic runbook lookups for the common cases, and a model only for the long tail that has no rule.",
        ],
        code: {
          lang: "python",
          file: "oncopilot.py",
          code: `"""An on-call copilot skeleton: rules first, then a local model for the rest."""
def copilot(alert: str) -> str:
    a = alert.lower()
    if "disk" in a:
        return "RULE: disk full -> free space / rotate logs"
    if "cpu" in a:
        return "RULE: cpu -> profile / scale out"
    return "ESCALATE to model: " + a


for alert in ("disk usage > 95%", "cpu > 90% for 10m", "checkout error rate spike"):
    print(copilot(alert))`,
        },
        output: "RULE: disk full -> free space / rotate logs\nRULE: cpu -> profile / scale out\nESCALATE to model: checkout error rate spike",
      },
    },
  },
  deeper: [
    { label: "K8sGPT: AI for Kubernetes troubleshooting", url: "https://k8sgpt.ai/" },
    { label: "GitHub Copilot for CI/CD and code review", url: "https://github.com/features/copilot" },
    { label: "Datadog Watchdog: AI-powered anomaly detection", url: "https://www.datadoghq.com/product/platform/watchdog/" },
    { label: "Ollama: run models locally", url: "https://ollama.com/" },
  ],
  nextPreview: "Next: AIOps — anomaly detection, incident copilots and the failure modes of AI in production, in depth.",
};
