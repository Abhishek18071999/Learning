import { phases } from "./curriculum";
import { lessons } from "./lessons";

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
  { part: "AI service", tech: "Python FastAPI + vector DB", does: "RAG 'Ask the course' tutor, quiz generator, news summariser, agentic tool use and model routing" },
  { part: "AI evaluation", tech: "Golden dataset + LLM-as-judge", does: "A scored eval suite that gates every prompt or model change" },
  { part: "Fast service", tech: "Rust", does: "News feed ingester and RSS parser" },
  { part: "AI automation", tech: "Scheduled pipeline", does: "Fetch news daily, summarise, tag by topic, weekly digest; agentic pipeline guarded by evals and cost budgets" },
  { part: "DevOps", tech: "Docker, GitHub Actions, Terraform, Kubernetes", does: "CI/CD, deploy to AWS and Azure, monitoring and alerts, AI-assisted observability and incident response" },
];

// One milestone per lesson, taken from that lesson's capstone homework step.
export const milestones: Milestone[] = lessons.map((l) => ({
  id: `c-${l.id}`,
  lessonId: l.id,
  part: phases.find((p) => l.id.startsWith(`${p.id}.`))?.title ?? "",
  title: l.capstone.title.replace(/^DevAtlas( step \d+)?:\s*/i, ""),
  criteria: l.capstone.criteria,
}));

/** Mermaid source for the target architecture, kept here so learners can paste it into their repo. */
export const architectureMermaid = `flowchart LR
  U[Learner browser] -->|HTTPS| CDN[CDN + React app]
  CDN -->|REST + JWT| API[ASP.NET Core API]
  API --> MY[(MySQL: users, progress)]
  API --> MO[(MongoDB: lessons, news)]
  API -->|/ask, /quiz| AI[FastAPI AI service]
  AI --> VEC[(pgvector)]
  AI --> CACHE[(prompt cache)]
  AI --> LLM[LLM provider]
  AI --> EVAL[(eval dataset + LLM-as-judge)]
  ING[Rust RSS ingester] --> MO
  CRON[Daily scheduler] --> ING
  CRON -->|summarise + tag| AI
  subgraph Ops
    GHA[GitHub Actions] --> REG[Container registry] --> K8S[Kubernetes on AWS / Azure]
    K8S --> OBS[Prometheus + Grafana + OTel]
  end`;
