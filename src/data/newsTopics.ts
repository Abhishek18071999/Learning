// Topic rules for the live Tech News page. Stories come from the public Hacker News
// Algolia API; this file only classifies them and links them to the course.
// "industry" notes are evergreen, hand-written context, not claims about a specific story.

export interface NewsTopic {
  id: string;
  label: string;
  icon: string;
  keywords: RegExp;
  lessonId: string;
  courseTopic: string;
  industry: string[];
}

export const newsTopics: NewsTopic[] = [
  {
    id: "ai",
    label: "AI and LLMs",
    icon: "🤖",
    keywords: /\b(ai|llm|llms|gpt|claude|gemini|llama|mistral|openai|anthropic|deepmind|deepseek|qwen|grok|transformer|rag|agent|agents|agentic|embedding|diffusion|model|models|inference|mcp|copilot|context|context\.window|context\.engineering|long\.context|prompt\.caching|caching|reasoning|reasoning\.model|llm\.as\.judge|evals|eval|evaluation|fine\.tun|fine\.tuning|distill|distillation|multi\.agent|orchestration|guardrail|guardrails|frontier|benchmark)\b/i,
    lessonId: "7.1.1",
    courseTopic: "Phase 7: AI engineering",
    industry: [
      "Support and internal-knowledge assistants built on RAG over company documents, with citations and human escalation.",
      "Model routing: small, cheap models for classification and extraction; large models only for hard requests.",
      "Context engineering is now a cost lever: stable prompts are cached, long contexts are budgeted, and retrieval keeps prompts focused.",
      "Coding assistants and agents in developer workflows, gated by code review and CI.",
      "Evaluation suites (golden datasets and LLM-as-judge) run on every prompt or model change, like unit tests.",
    ],
  },
  {
    id: "cloud",
    label: "AWS and Azure",
    icon: "☁️",
    keywords: /\b(aws|amazon web services|azure|microsoft cloud|gcp|google cloud|lambda|s3|ec2|cloudflare|bedrock|vertex|azure openai|ai foundry|serverless|outage)\b/i,
    lessonId: "9.1.1",
    courseTopic: "Phase 8: Cloud",
    industry: [
      "Managed services first (databases, queues, identity) so small teams avoid running infrastructure.",
      "Multi-region or multi-zone deployments for critical paths, with tested failover runbooks.",
      "FinOps: budgets, alerts, tagging and rightsizing as a standing engineering practice.",
    ],
  },
  {
    id: "web",
    label: "Frontend and web",
    icon: "🎨",
    keywords: /\b(javascript|typescript|react|next\.?js|react server components|rsc|vue|svelte|angular|astro|remix|htmx|css|html|browser|chrome|firefox|safari|webassembly|wasm|vite|node\.?js|deno|bun|frontend|web|edge runtime)\b/i,
    lessonId: "1.2.1",
    courseTopic: "Phase 3: Frontend",
    industry: [
      "Core Web Vitals (LCP, INP, CLS) tracked as product metrics because they affect conversion and search.",
      "Design systems and component libraries shared across teams.",
      "Server rendering and edge caching for fast first loads.",
    ],
  },
  {
    id: "langs",
    label: ".NET, Python, Rust",
    icon: "⌨️",
    keywords: /\b(rust|cargo|python|pypi|pip|django|fastapi|\.net|dotnet|c#|csharp|asp\.net|golang|java|kotlin|swift|zig|mojo|julia|compiler)\b/i,
    lessonId: "1.1.1",
    courseTopic: "Phase 1: Programming languages",
    industry: [
      "Rust adopted for performance- and safety-critical components (proxies, parsers, systems code).",
      "Python as the default for AI, data and automation; typed with mypy/pyright in serious codebases.",
      ".NET and Java dominate many enterprise back ends; upgrades follow LTS release cycles.",
    ],
  },
  {
    id: "data",
    label: "Databases",
    icon: "🗄️",
    keywords: /\b(sql|mysql|postgres|postgresql|sqlite|mongodb|redis|valkey|database|databases|duckdb|clickhouse|kafka|vector database|pgvector|neon|supabase|cockroach)\b/i,
    lessonId: "5.1.1",
    courseTopic: "Phase 5: Databases",
    industry: [
      "PostgreSQL increasingly chosen as a default, including pgvector for AI features.",
      "Slow-query reviews and index changes managed as code through migrations.",
      "Analytical workloads separated from transactional ones (warehouses, columnar stores).",
    ],
  },
  {
    id: "devops",
    label: "DevOps and SRE",
    icon: "🚀",
    keywords: /\b(docker|podman|kubernetes|k8s|terraform|opentofu|helm|ci\/cd|github actions|gitlab|devops|sre|observability|prometheus|grafana|opentelemetry|incident|postmortem|linux|git|nix|dagger|finops)\b/i,
    lessonId: "9.1.1",
    courseTopic: "Phase 9: DevOps",
    industry: [
      "Everything as code: infrastructure (Terraform), pipelines (YAML), policies and dashboards.",
      "Progressive delivery: canary releases and feature flags with automatic rollback on SLO breach.",
      "Blameless postmortems feeding reliability work back into the roadmap.",
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: "🛡️",
    keywords: /\b(cve|vulnerability|vulnerabilities|exploit|breach|ransomware|malware|zero-day|0day|security|supply chain|phishing|leak|leaked|patch|prompt injection|jailbreak|data poisoning|ai security|sbom|slsa)\b/i,
    lessonId: "0.3.1",
    courseTopic: "DevSecOps (Phase 9)",
    industry: [
      "Dependency and image scanning in CI, with SLAs for patching critical CVEs.",
      "Secret scanning and push protection on every repository.",
      "Least-privilege identities for services; short-lived credentials instead of long-lived keys.",
    ],
  },
];

export function classify(title: string): NewsTopic[] {
  return newsTopics.filter((t) => t.keywords.test(title));
}
