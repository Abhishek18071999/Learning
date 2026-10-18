import { useState } from "react";
import { diagnostic } from "../data/diagnostic";
import { lessons } from "../data/lessons";
import { QuestionCard } from "../components/Quiz";
import { buildRoadmap, totalWeeks } from "../lib/roadmap";
import { navigate } from "../lib/router";
import { actions, getState, type Goal, type Profile, type SkillLevel } from "../lib/store";
import type { Area } from "../types";
import { Badge } from "../components/ui";

const AREAS: { id: Area; label: string }[] = [
  { id: "programming", label: "Programming" },
  { id: "frontend", label: "Web frontend" },
  { id: "backend", label: "Backend" },
  { id: "databases", label: "Databases" },
  { id: "dsa", label: "DSA" },
  { id: "cloud", label: "Cloud" },
  { id: "devops", label: "DevOps" },
  { id: "ai", label: "AI" },
];
const LEVELS: SkillLevel[] = ["none", "beginner", "intermediate", "advanced"];
const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "job-switch", label: "Job switch", desc: "Become employable as a software engineer" },
  { id: "full-stack", label: "Full-stack", desc: "Frontend + backend + data" },
  { id: "backend", label: "Backend", desc: "APIs, databases, distributed systems" },
  { id: "ai-engineer", label: "AI engineer", desc: "LLMs, RAG, agents, AI automation" },
  { id: "devops-cloud", label: "DevOps / cloud", desc: "CI/CD, Kubernetes, AWS and Azure" },
  { id: "interview-prep", label: "Interview prep", desc: "DSA, system design, behavioral" },
  { id: "own-product", label: "Own product", desc: "Ship your own app end to end" },
];

export function Onboarding() {
  const existing = getState().profile;
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(
    existing ?? {
      name: "",
      levels: {},
      goal: "job-switch",
      hoursPerWeek: 10,
      targetMonths: 9,
      os: "windows",
      language: "English",
      style: "code",
      createdAt: new Date().toISOString(),
    },
  );
  const [diag, setDiag] = useState<Record<number, boolean>>({});

  const claimed = AREAS.filter((a) => p.levels[a.id] === "intermediate" || p.levels[a.id] === "advanced").map((a) => a.id);
  const diagQs = diagnostic.filter((q) => claimed.includes(q.area) || claimed.length >= 3).slice(0, 8);
  const needsDiag = claimed.length > 0;
  const steps = ["About you", "Goal & time", "Setup", ...(needsDiag ? ["Diagnostic"] : []), "Your plan"];
  const last = steps.length - 1;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const finish = () => {
    const answered = Object.values(diag);
    const profile = { ...p, diagnosticScore: answered.length ? answered.filter(Boolean).length / answered.length : undefined };
    actions.saveProfile(profile);
    navigate(`/lesson/${lessons[0].id}`);
  };

  const plan = buildRoadmap(p);
  const stepName = steps[step];

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/start · Onboarding</p>
        <h1>Let's build your personal roadmap</h1>
        <p className="lede">Six quick questions. Your answers stay in this browser.</p>
      </header>

      <ol className="stepper">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "current" : i < step ? "done" : ""}>
            <span>{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <div className="panel form">
        {stepName === "About you" && (
          <>
            <label className="field">
              <span>1. What should Mentor call you?</span>
              <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" autoFocus />
            </label>
            <div className="field">
              <span>Your current level in each area</span>
              <div className="level-grid">
                {AREAS.map((a) => (
                  <div className="level-row" key={a.id}>
                    <span className="level-area">{a.label}</span>
                    <div className="seg" role="radiogroup" aria-label={a.label}>
                      {LEVELS.map((l) => (
                        <button key={l} role="radio" aria-checked={(p.levels[a.id] ?? "none") === l} className={(p.levels[a.id] ?? "none") === l ? "on" : ""} onClick={() => set("levels", { ...p.levels, [a.id]: l })}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {stepName === "Goal & time" && (
          <>
            <div className="field">
              <span>2. What is your goal?</span>
              <div className="choice-grid">
                {GOALS.map((g) => (
                  <button key={g.id} className={`choice ${p.goal === g.id ? "on" : ""}`} onClick={() => set("goal", g.id)}>
                    <strong>{g.label}</strong>
                    <span>{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field-row">
              <label className="field">
                <span>3. Hours per week: {p.hoursPerWeek}</span>
                <input type="range" min={2} max={40} value={p.hoursPerWeek} onChange={(e) => set("hoursPerWeek", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Target timeline: {p.targetMonths} months</span>
                <input type="range" min={1} max={24} value={p.targetMonths} onChange={(e) => set("targetMonths", Number(e.target.value))} />
              </label>
            </div>
          </>
        )}

        {stepName === "Setup" && (
          <>
            <div className="field">
              <span>4. Your computer</span>
              <div className="seg wide">
                {(["windows", "macos", "linux"] as const).map((o) => (
                  <button key={o} className={p.os === o ? "on" : ""} onClick={() => set("os", o)}>
                    {o === "macos" ? "macOS" : o[0].toUpperCase() + o.slice(1)}
                  </button>
                ))}
              </div>
              <p className="muted small">{osTip(p.os)}</p>
            </div>
            <label className="field">
              <span>5. Preferred explanation language</span>
              <select value={p.language} onChange={(e) => set("language", e.target.value)}>
                {["English", "Hindi", "Hinglish", "Other"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <p className="muted small">Lessons are written in simple English today. Your choice is saved for the AI tutor in the capstone.</p>
            </label>
            <div className="field">
              <span>6. How do you learn best?</span>
              <div className="seg wide">
                {(["code", "diagrams", "analogies", "theory"] as const).map((s) => (
                  <button key={s} className={p.style === s ? "on" : ""} onClick={() => set("style", s)}>
                    More {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {stepName === "Diagnostic" && (
          <>
            <p>
              You reported experience in <strong>{claimed.join(", ")}</strong>. Answer these {diagQs.length} questions so we can verify and skip what you already know.
            </p>
            {diagQs.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} onAnswer={(ok) => setDiag((d) => ({ ...d, [i]: ok }))} />
            ))}
          </>
        )}

        {stepName === "Your plan" && (
          <>
            <h2 className="plan-title">
              {p.name || "Your"} roadmap: about {totalWeeks(plan)} weeks at {p.hoursPerWeek} h/week
            </h2>
            {totalWeeks(plan) / 4.3 > p.targetMonths && (
              <p className="callout warn">
                At this pace the plan is longer than your {p.targetMonths}-month target. Consider more hours per week, or focus on the <strong>core</strong> phases first.
              </p>
            )}
            {Object.keys(diag).length > 0 && (
              <p className="callout">
                Diagnostic: {Object.values(diag).filter(Boolean).length}/{Object.keys(diag).length} correct.{" "}
                {Object.values(diag).filter(Boolean).length / Object.keys(diag).length >= 0.75 ? "Your experience checks out: skim the marked phases." : "Some gaps showed up: we will not skip those phases."}
              </p>
            )}
            <ol className="plan-list">
              {plan.map((pp) => (
                <li key={pp.phase.id}>
                  <span className="plan-icon">{pp.phase.icon}</span>
                  <div>
                    <strong>
                      Phase {pp.phase.id}: {pp.phase.title}
                    </strong>{" "}
                    <Badge tone={pp.emphasis === "core" ? "accent" : pp.emphasis === "verify" ? "warn" : "neutral"}>{pp.emphasis}</Badge>
                    <div className="muted small">{pp.phase.tagline}</div>
                  </div>
                  <span className="plan-weeks">{pp.phase.id === 2 ? "in parallel" : `${pp.weeks} wk`}</span>
                </li>
              ))}
            </ol>
            <div className="callout">
              <strong>Capstone:</strong> you will build <strong>DevAtlas</strong>, a learning platform with a React frontend, ASP.NET Core API, FastAPI AI tutor with RAG, Rust news ingester, MySQL and MongoDB, deployed with Docker, GitHub Actions, Terraform and Kubernetes. Every lesson adds one piece.
            </div>
          </>
        )}

        <div className="form-nav">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
          {step < last ? (
            <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
              Continue →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish}>
              Ready for Lesson 1 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function osTip(os: Profile["os"]) {
  if (os === "windows") return "Install WSL 2 (Ubuntu) for a real Linux terminal, plus VS Code, Docker Desktop, Node LTS, the .NET SDK and Python.";
  if (os === "macos") return "Install Homebrew, then git, Node LTS, Python, the .NET SDK and Docker Desktop. Some GNU tools differ on macOS; lessons call this out.";
  return "You are set for the terminal lessons. Install Docker Engine, Node LTS, Python, the .NET SDK and VS Code.";
}
