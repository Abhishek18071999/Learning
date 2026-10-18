import { phases } from "../data/curriculum";
import { lessonById, lessons } from "../data/lessons";
import { milestones } from "../data/capstone";
import { buildRoadmap, nextLessonId, progressCard, totalWeeks, weakAreas } from "../lib/roadmap";
import { streak, today, useStore } from "../lib/store";
import { Badge, CopyButton, Ring } from "../components/ui";

export function Home() {
  const state = useStore((s) => s);
  if (!state.profile) return <Landing />;

  const p = state.profile;
  const nextId = nextLessonId(state);
  const next = nextId ? lessonById[nextId] : null;
  const completed = lessons.filter((l) => state.lessons[l.id]?.status === "completed").length;
  const due = Object.values(state.cards).filter((c) => c.due <= today()).length;
  const capstone = milestones.filter((m) => state.milestones[m.id]).length;
  const plan = buildRoadmap(p);
  const weak = weakAreas(state);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{greet}</p>
        <h1>{p.name ? `${p.name}, let's keep going.` : "Let's keep going."}</h1>
        <p className="lede">
          Your plan: about <strong>{totalWeeks(plan)} weeks</strong> at {p.hoursPerWeek} h/week, focused on <strong>{goalLabel(p.goal)}</strong>.
        </p>
      </header>

      {next ? (
        <a className="continue-card" href={`#/lesson/${next.id}`}>
          <div>
            <p className="eyebrow">{state.lessons[next.id] ? "Continue" : "Up next"} · Lesson {next.id}</p>
            <h2>{next.title}</h2>
            <p>{next.summary}</p>
            <div className="meta-row">
              <Badge>⏱ {next.minutes} min</Badge>
              <Badge>📶 {next.level}</Badge>
            </div>
          </div>
          <span className="btn btn-primary">Open lesson →</span>
        </a>
      ) : (
        <div className="continue-card done">
          <div>
            <h2>Curriculum complete 🎉</h2>
            <p>You have finished every DevAtlas lesson. Keep skills sharp with Revise and mock interviews, and ship one capstone improvement a week.</p>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <Ring value={completed / lessons.length} label={`${completed}`} />
          <div>
            <div className="stat-label">Lessons completed</div>
            <div className="stat-sub">of {lessons.length} available</div>
          </div>
        </div>
        <div className="stat">
          <div className="stat-big">🔥 {streak(state.activity)}</div>
          <div>
            <div className="stat-label">Day streak</div>
            <div className="stat-sub">Learn a little every day</div>
          </div>
        </div>
        <a className="stat" href="#/revise">
          <div className="stat-big">{due}</div>
          <div>
            <div className="stat-label">Reviews due</div>
            <div className="stat-sub">Spaced repetition</div>
          </div>
        </a>
        <a className="stat" href="#/project">
          <Ring value={capstone / milestones.length} label={`${capstone}`} />
          <div>
            <div className="stat-label">Capstone milestones</div>
            <div className="stat-sub">of {milestones.length}</div>
          </div>
        </a>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>Your roadmap</h3>
            <a href="#/roadmap">Full roadmap →</a>
          </div>
          <ol className="mini-roadmap">
            {plan.slice(0, 7).map((pp) => {
              const ids = pp.phase.modules.flatMap((m) => m.lessons.map((l) => l.id));
              const done = ids.filter((id) => state.lessons[id]?.status === "completed").length;
              return (
                <li key={pp.phase.id}>
                  <span className="mini-icon">{pp.phase.icon}</span>
                  <div className="mini-body">
                    <div className="mini-title">
                      {pp.phase.title}
                      {pp.emphasis === "verify" && <Badge tone="warn">verify</Badge>}
                    </div>
                    <div className="bar">
                      <i style={{ width: `${(done / ids.length) * 100}%` }} />
                    </div>
                  </div>
                  <span className="mini-weeks">{pp.phase.id === 2 ? "parallel" : `wk ${pp.startWeek}–${pp.startWeek + pp.weeks - 1}`}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Progress Card</h3>
            <CopyButton text={progressCard(state)} />
          </div>
          <pre className="progress-card">{progressCard(state)}</pre>
          <p className="muted small">If you start over on another device, import your data in Settings, or paste this card to any Mentor chat to continue where you left off.</p>
          {weak.length > 0 && (
            <p className="small">
              <strong>Revise:</strong> {weak.join(", ")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export function goalLabel(g: string) {
  return (
    {
      "job-switch": "a job switch",
      "full-stack": "full-stack engineering",
      backend: "backend engineering",
      "ai-engineer": "AI engineering",
      "devops-cloud": "DevOps and cloud",
      "interview-prep": "interview preparation",
      "own-product": "building your own product",
    } as Record<string, string>
  )[g] ?? g;
}

function Landing() {
  const totalLessons = phases.reduce((n, p) => n + p.modules.reduce((m, mod) => m + mod.lessons.length, 0), 0);
  const codeSamples = lessons.reduce((n, l) => n + l.codeSamples, 0);
  return (
    <div className="page landing">
      <section className="hero">
        <p className="eyebrow">Full-stack · AI · DevOps</p>
        <h1>
          Learn to build and run <span className="grad">real production software</span>.
        </h1>
        <p className="lede">
          DevAtlas is a mentor-led course written the way a principal engineer teaches a junior on a real team: the problem first, the mental model, what happens under the hood, runnable code, the mistakes that cost companies money, and homework with model solutions.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary btn-lg" href="#/start">
            Start onboarding <span aria-hidden>→</span>
          </a>
          <a className="btn btn-ghost btn-lg" href={`#/lesson/${lessons[0].id}`}>
            Preview lesson 1
          </a>
        </div>
        <div className="hero-stats">
          <div>
            <strong>11</strong> phases
          </div>
          <div>
            <strong>{lessons.length === totalLessons ? totalLessons : `${lessons.length}/${totalLessons}`}</strong> full lessons
          </div>
          <div>
            <strong>{codeSamples}</strong> runnable examples
          </div>
          <div>
            <strong>1</strong> real capstone app
          </div>
        </div>
      </section>

      <section className="features">
        {[
          ["🎯", "Problem first", "Every lesson opens with a production scenario: the Friday 8 p.m. slowdown, the 3 a.m. outage, the surprise AI bill."],
          ["⚙️", "Under the hood", "Analogy first, then the precise mechanism, with diagrams. No magic, no hand-waving."],
          ["⚠️", "Mistakes that cost money", "Each lesson includes a table of what goes wrong, why people do it and how to avoid it."],
          ["🧩", "Check, homework, solutions", "Quick checks with hidden answers, three-tier homework, hints one at a time and full model solutions."],
          ["↻", "Spaced repetition", "Questions from finished lessons come back on a Leitner schedule so you remember what you learn."],
          ["🏗", "One real capstone", "Build DevAtlas itself: React, ASP.NET Core, FastAPI with RAG, Rust, MySQL, MongoDB, Docker, Kubernetes."],
        ].map(([icon, title, text]) => (
          <div className="feature" key={title}>
            <div className="feature-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>The curriculum</h3>
          <a href="#/roadmap">See everything →</a>
        </div>
        <div className="phase-chips">
          {phases.map((p) => (
            <a key={p.id} className="phase-chip" href="#/roadmap">
              <span>{p.icon}</span> {p.id}. {p.title}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
