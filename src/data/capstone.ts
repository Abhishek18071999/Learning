// DevAtlas capstone: the real application the learner builds across the course.

export interface Milestone {
  id: string;
  title: string;
  lessonId: string;
  part: string;
  criteria: string[];
}

export const capstoneParts = [
  { part: "Frontend", tech: "React + TypeScript, HTML, CSS", does: "Topic sections, lessons, quizzes, progress dashboard, Tech News page" },
  { part: "Main API", tech: "ASP.NET Core (C#)", does: "Users, auth, courses, progress" },
  { part: "Relational data", tech: "MySQL", does: "Users, enrollments, progress, quiz scores" },
  { part: "Content and news store", tech: "MongoDB", does: "Lesson content, news articles" },
  { part: "AI service", tech: "Python FastAPI + vector DB", does: "RAG 'Ask the course' tutor, quiz generator, news summariser" },
  { part: "Fast service", tech: "Rust", does: "News feed ingester and RSS parser" },
  { part: "AI automation", tech: "Scheduled pipeline", does: "Fetch news daily, summarise, tag by topic, weekly digest" },
  { part: "DevOps", tech: "Docker, GitHub Actions, Terraform, Kubernetes", does: "CI/CD, deploy to AWS and Azure, monitoring and alerts" },
];

export const milestones: Milestone[] = [
  { id: "c1", lessonId: "0.1.1", part: "Docs", title: "Repository and request-journey diagram", criteria: ["README states the goal", "docs/architecture.md with a Mermaid sequence diagram"] },
  { id: "c2", lessonId: "0.2.1", part: "Tooling", title: "scripts/setup.sh tool checker", criteria: ["Detects git, node, docker, dotnet, python3", "Non-zero exit when something is missing"] },
  { id: "c3", lessonId: "0.3.1", part: "Tooling", title: "GitHub hygiene and first PR", criteria: [".gitignore for all stacks", "main protected", "First merged PR"] },
  { id: "c4", lessonId: "1.1.1", part: "AI service", title: "Python AI service skeleton", criteria: ["services/ai with tests", "pytest and mypy pass"] },
  { id: "c5", lessonId: "1.2.1", part: "Frontend", title: "Resilient dashboard data loader", criteria: ["Promise.allSettled", "Per-request timeouts", "Partial data rendering"] },
  { id: "c6", lessonId: "2.1.1", part: "AI service", title: "O(n) article dedupe", criteria: ["Set-based lookup", "Benchmark in README"] },
  { id: "c7", lessonId: "5.1.1", part: "Relational data", title: "Progress schema with indexes", criteria: ["PKs and FKs", "3 hot queries with matching indexes", "EXPLAIN verified"] },
  { id: "c8", lessonId: "7.1.1", part: "AI service", title: "LLM client wrapper", criteria: ["Keys from env", "Usage logging", "Mocked unit test"] },
  { id: "c9", lessonId: "7.2.1", part: "AI service", title: "'Ask the course' RAG endpoint", criteria: ["Citations link to lessons", "Not-found path", "Retrieval eval in CI"] },
  { id: "c10", lessonId: "9.1.1", part: "DevOps", title: "One-command local stack", criteria: ["Compose with healthchecks", ".env.example, no secrets", "Run-locally README"] },
];

/** Mermaid source for the target architecture, kept here so learners can paste it into their repo. */
export const architectureMermaid = `flowchart LR
  U[Learner browser] -->|HTTPS| CDN[CDN + React app]
  CDN -->|REST + JWT| API[ASP.NET Core API]
  API --> MY[(MySQL: users, progress)]
  API --> MO[(MongoDB: lessons, news)]
  API -->|/ask, /quiz| AI[FastAPI AI service]
  AI --> VEC[(pgvector)]
  AI --> LLM[LLM provider]
  ING[Rust RSS ingester] --> MO
  CRON[Daily scheduler] --> ING
  CRON -->|summarise + tag| AI
  subgraph Ops
    GHA[GitHub Actions] --> REG[Container registry] --> K8S[Kubernetes on AWS / Azure]
    K8S --> OBS[Prometheus + Grafana + OTel]
  end`;
