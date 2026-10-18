import { useMemo, useState } from "react";
import { phases } from "../data/curriculum";
import { lessonById, lessons } from "../data/lessons";
import { diagnostic } from "../data/diagnostic";
import { architectureMermaid, capstoneParts, milestones } from "../data/capstone";
import type { QuizQuestion } from "../types";
import { QuestionCard, QuizSet } from "../components/Quiz";
import { COMMANDS } from "../components/Layout";
import { Badge, CopyButton, Empty, Flow } from "../components/ui";
import { rich } from "../lib/rich";
import { buildRoadmap, progressCard } from "../lib/roadmap";
import { actions, getState, INTERVALS, resetState, today, useStore } from "../lib/store";

/* ---------------- Roadmap ---------------- */

export function Roadmap() {
  const state = useStore((s) => s);
  const plan = state.profile ? buildRoadmap(state.profile) : null;
  const ordered = plan ? plan.map((p) => p.phase) : phases;
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">/roadmap</p>
        <h1>Roadmap</h1>
        <p className="lede">
          {plan ? "Ordered for your goal. Weeks are estimates at your pace; DSA runs in parallel with every phase." : "The default order. Complete onboarding to get a personalised plan with week estimates."}
        </p>
        {!plan && (
          <a className="btn btn-primary" href="#/start">
            Personalise my roadmap →
          </a>
        )}
      </header>
      <div className="timeline">
        {ordered.map((phase) => {
          const pp = plan?.find((x) => x.phase.id === phase.id);
          const ids = phase.modules.flatMap((m) => m.lessons.map((l) => l.id));
          const done = ids.filter((id) => state.lessons[id]?.status === "completed").length;
          return (
            <section key={phase.id} className="tl-phase">
              <div className="tl-marker">{phase.icon}</div>
              <div className="tl-body">
                <div className="tl-head">
                  <h2>
                    Phase {phase.id}: {phase.title}
                  </h2>
                  {pp && <Badge tone={pp.emphasis === "core" ? "accent" : pp.emphasis === "verify" ? "warn" : "neutral"}>{pp.emphasis}</Badge>}
                  {pp && <span className="muted small">{phase.id === 2 ? "in parallel" : `weeks ${pp.startWeek}–${pp.startWeek + pp.weeks - 1}`}</span>}
                  <span className="tl-count">
                    {done}/{ids.length}
                  </span>
                </div>
                <p className="muted">{phase.tagline}</p>
                {pp?.note && <p className="small">{pp.note}</p>}
                <div className="modules">
                  {phase.modules.map((m) => (
                    <div key={m.id} className="module">
                      <div className="module-title">
                        {m.id} {m.title}
                      </div>
                      {m.lessons.map((l) => {
                        const st = state.lessons[l.id]?.status;
                        const full = !!lessonById[l.id];
                        return (
                          <a key={l.id} href={`#/lesson/${l.id}`} className={`module-lesson ${full ? "" : "stub"}`}>
                            <span className={`dot ${st ?? ""}`} />
                            <span className="lesson-link-id">{l.id}</span>
                            <span>{l.title}</span>
                            {!full && <span className="soon">soon</span>}
                          </a>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="small muted">Phase checkpoint: phase exam + capstone milestone review.</p>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Revise (spaced repetition) ---------------- */

function cardQuestion(cardId: string): { q: QuizQuestion; lessonId: string } | null {
  const [lessonId, qi] = cardId.split(":q");
  const l = lessonById[lessonId];
  const q = l?.quickCheck[Number(qi)];
  return q ? { q, lessonId } : null;
}

export function Revise() {
  const cards = useStore((s) => s.cards);
  const t = today();
  const due = Object.entries(cards)
    .filter(([, c]) => c.due <= t)
    .sort((a, b) => a[1].box - b[1].box)
    .map(([id]) => id);
  const [queue] = useState(due);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const boxes = [1, 2, 3, 4, 5].map((b) => Object.values(cards).filter((c) => c.box === b).length);

  const current = queue[pos];
  const item = current ? cardQuestion(current) : null;

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/revise</p>
        <h1>Revision</h1>
        <p className="lede">Questions from completed lessons return on a Leitner schedule: get one right and it comes back later ({INTERVALS.join(", ")} days); miss it and it returns tomorrow.</p>
      </header>
      <div className="boxes">
        {boxes.map((n, i) => (
          <div key={i} className="box">
            <div className="box-n">{n}</div>
            <div className="muted small">Box {i + 1}</div>
          </div>
        ))}
      </div>
      {Object.keys(cards).length === 0 ? (
        <Empty title="Nothing to revise yet">
          <p>Complete a lesson and its quick-check questions join your revision deck.</p>
        </Empty>
      ) : !item ? (
        <Empty title="All caught up ✓">
          <p>No reviews due today. Come back tomorrow, or take a topic quiz.</p>
          <a className="btn btn-primary" href="#/quiz">
            Take a quiz
          </a>
        </Empty>
      ) : (
        <div>
          <p className="muted small">
            Card {pos + 1} of {queue.length} · from lesson {item.lessonId}: {lessonById[item.lessonId].title}
          </p>
          <QuestionCard key={current} q={item.q} onAnswer={(ok) => setAnswered(ok)} />
          {answered !== null && (
            <button
              className="btn btn-primary"
              onClick={() => {
                actions.reviewCard(current, answered);
                setAnswered(null);
                setPos((p) => p + 1);
              }}
            >
              {answered ? "Got it → schedule later" : "Missed → see again tomorrow"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quiz ---------------- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Quiz({ topic }: { topic: string | null }) {
  const [round, setRound] = useState(0);
  const pool = useMemo(() => {
    const all = [
      ...lessons.flatMap((l) => l.quickCheck.map((q) => ({ q, tags: `${l.id} ${l.title} ${l.terms.map((t) => t.term).join(" ")} phase${l.id.split(".")[0]}` }))),
      ...diagnostic.map((q) => ({ q, tags: `${q.area} diagnostic` })),
    ];
    const needle = topic?.toLowerCase().trim();
    const filtered = needle ? all.filter((x) => x.tags.toLowerCase().includes(needle) || x.q.prompt.toLowerCase().includes(needle)) : all;
    return shuffle(filtered).slice(0, 10).map((x) => x.q);
  }, [topic, round]); // round is a dependency only to force a reshuffle

  const topics = [
    ["", "Everything"],
    ...phases.filter((p) => lessons.some((l) => l.id.startsWith(`${p.id}.`))).map((p) => [`phase${p.id}`, p.title]),
    ...lessons.map((l) => [l.id, `${l.id} ${l.title}`]),
  ];

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/quiz {topic ?? ""}</p>
        <h1>Quiz</h1>
        <p className="lede">Up to 10 mixed questions: multiple choice, predict the output and spot the bug.</p>
      </header>
      <label className="field inline">
        <span>Topic</span>
        <select value={topic ?? ""} onChange={(e) => (window.location.hash = e.target.value ? `/quiz?topic=${encodeURIComponent(e.target.value)}` : "/quiz")}>
          {topics.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
          {topic && !topics.some(([v]) => v === topic) && <option value={topic}>“{topic}”</option>}
        </select>
      </label>
      {pool.length === 0 ? (
        <Empty title={`No questions match “${topic}”`}>
          <p>Try a lesson number like 5.1.1 or a word like docker, git or rag.</p>
        </Empty>
      ) : (
        <>
          <QuizSet key={`${topic}-${round}`} questions={pool} onDone={(score, total) => actions.recordQuiz({ topic: topic || "mixed", score, total, at: new Date().toISOString() })} />
          <button className="btn btn-ghost" onClick={() => setRound((r) => r + 1)}>
            ↻ New set
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Mock interview ---------------- */

export function Interview({ lessonId }: { lessonId: string | null }) {
  const qs = useMemo(() => {
    const src = lessonId && lessonById[lessonId] ? [lessonById[lessonId]] : lessons;
    return shuffle(src.flatMap((l) => l.interview.map((q) => ({ ...q, lesson: l }))));
  }, [lessonId]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<number[]>([]);
  const q = qs[i];

  const rate = (n: number) => {
    setRatings((r) => [...r, n]);
    setI((x) => x + 1);
    setAnswer("");
    setRevealed(false);
  };

  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/interview</p>
        <h1>Mock interview</h1>
        <p className="lede">One question at a time. Answer out loud or in writing as if an interviewer is listening, then compare with the model answer and rate yourself honestly.</p>
      </header>
      <label className="field inline">
        <span>Topic</span>
        <select value={lessonId ?? ""} onChange={(e) => (window.location.hash = e.target.value ? `/interview?lesson=${e.target.value}` : "/interview")}>
          <option value="">All lessons</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id} {l.title}
            </option>
          ))}
        </select>
      </label>
      {q ? (
        <div className="panel interview">
          <p className="muted small">
            Question {i + 1} of {qs.length} · {q.lesson.title}
          </p>
          <h2>{q.q}</h2>
          <textarea rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Structure: definition → how it works → trade-off → real example." />
          {!revealed ? (
            <button className="btn btn-primary" onClick={() => setRevealed(true)}>
              Show model answer
            </button>
          ) : (
            <>
              <div className="solution">
                <div className="criteria-title">Model answer</div>
                <p>{rich(q.a)}</p>
              </div>
              <div className="row">
                <span className="small">How did you do?</span>
                <button className="btn btn-ghost btn-sm" onClick={() => rate(0)}>
                  Missed key points
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => rate(1)}>
                  Partly
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => rate(2)}>
                  Nailed it
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <Empty title="Interview complete">
          <p>
            Score: {ratings.reduce((a, b) => a + b, 0)}/{ratings.length * 2}. Questions you missed are a great list for /revise and for re-reading the lesson's concept and under-the-hood sections.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              actions.recordQuiz({ topic: `interview ${lessonId ?? "all"}`, score: ratings.reduce((a, b) => a + b, 0), total: ratings.length * 2, at: new Date().toISOString() });
              setI(0);
              setRatings([]);
            }}
          >
            Save score and restart
          </button>
        </Empty>
      )}
    </div>
  );
}

/* ---------------- Capstone ---------------- */

export function Project() {
  const done = useStore((s) => s.milestones);
  const completedLessons = useStore((s) => s.lessons);
  const next = milestones.find((m) => !done[m.id]);
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">/project</p>
        <h1>Capstone: DevAtlas</h1>
        <p className="lede">You build a real learning platform, piece by piece, using everything in the course. By the end it runs on Kubernetes in the cloud with CI/CD and monitoring.</p>
      </header>

      <Flow
        diagram={{
          title: "Target architecture (request path)",
          nodes: [
            { label: "Browser", sub: "React + TS" },
            { label: "CDN", sub: "static app" },
            { label: "ASP.NET Core", sub: "auth, progress" },
            { label: "FastAPI AI", sub: "RAG tutor" },
            { label: "Data", sub: "MySQL · MongoDB · pgvector" },
          ],
          edges: ["HTTPS", "REST + JWT", "/ask", "SQL / queries"],
          caption: "A Rust ingester and a daily scheduler feed news into MongoDB; GitHub Actions builds images and deploys to Kubernetes on AWS and Azure.",
        }}
      />

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>Milestones</h3>
            <span className="muted small">
              {Object.values(done).filter(Boolean).length}/{milestones.length}
            </span>
          </div>
          {next && (
            <p className="callout">
              <strong>Next step:</strong> {next.title} (from <a href={`#/lesson/${next.lessonId}?s=homework`}>lesson {next.lessonId}</a>)
            </p>
          )}
          <ul className="milestones">
            {milestones.map((m) => (
              <li key={m.id} className={done[m.id] ? "done" : ""}>
                <label className="check">
                  <input type="checkbox" checked={!!done[m.id]} onChange={() => actions.toggleMilestone(m.id)} />
                  <span>
                    <strong>{m.title}</strong> <Badge>{m.part}</Badge>
                    {completedLessons[m.lessonId]?.status !== "completed" && <span className="muted small"> · after lesson {m.lessonId}</span>}
                    <span className="milestone-criteria">{m.criteria.join(" · ")}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h3>What you will build</h3>
          <div className="table-wrap">
            <table className="simple">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Technology</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                {capstoneParts.map((p) => (
                  <tr key={p.part}>
                    <td>
                      <strong>{p.part}</strong>
                    </td>
                    <td>{p.tech}</td>
                    <td>{p.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-head">
            <h3>Architecture diagram (Mermaid)</h3>
            <CopyButton text={architectureMermaid} />
          </div>
          <p className="muted small">Paste into docs/architecture.md inside a ```mermaid block; GitHub renders it. Update it as the project grows.</p>
          <pre className="progress-card">{architectureMermaid}</pre>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Cheat sheets ---------------- */

export function Cheatsheets({ topic }: { topic: string | null }) {
  const list = topic ? lessons.filter((l) => `${l.id} ${l.title}`.toLowerCase().includes(topic.toLowerCase())) : lessons;
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">/cheatsheet</p>
        <h1>Cheat sheets</h1>
        <p className="lede">One-page revision for every lesson. Print with Ctrl/Cmd + P.</p>
      </header>
      <div className="cheat-grid">
        {list.map((l) => (
          <section key={l.id} className="panel cheat-card">
            <a href={`#/lesson/${l.id}`} className="cheat-head">
              <span className="lesson-link-id">{l.id}</span> {l.title}
            </a>
            <ul className="cheat">
              {l.cheatSheet.map((c, i) => (
                <li key={i}>{rich(c)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Glossary (/explain) ---------------- */

export function Glossary({ q }: { q: string | null }) {
  const [term, setTerm] = useState(q ?? "");
  const all = lessons.flatMap((l) => l.terms.map((t) => ({ ...t, lesson: l }))).sort((a, b) => a.term.localeCompare(b.term));
  const n = term.toLowerCase().trim();
  const list = n ? all.filter((t) => t.term.toLowerCase().includes(n) || t.def.toLowerCase().includes(n)) : all;
  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/explain</p>
        <h1>Glossary</h1>
        <p className="lede">Every term the course introduces, defined in plain language, with the lesson that teaches it.</p>
      </header>
      <input className="big-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search a term, e.g. TTL, embedding, B-tree…" autoFocus />
      {list.length === 0 && (
        <Empty title={`No term matches “${term}”`}>
          <p>The glossary grows with every lesson. Try the search palette (press /) to look in lesson titles too.</p>
        </Empty>
      )}
      <dl className="glossary">
        {list.map((t) => (
          <div key={`${t.lesson.id}-${t.term}`}>
            <dt>{t.term}</dt>
            <dd>
              {rich(t.def)} <a href={`#/lesson/${t.lesson.id}`}>Lesson {t.lesson.id} →</a>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------------- Commands help ---------------- */

export function Help() {
  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>Commands</h1>
        <p className="lede">
          Press <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> anywhere and type a command.
        </p>
      </header>
      <div className="table-wrap">
        <table className="simple">
          <thead>
            <tr>
              <th>Command</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            {COMMANDS.map((c) => (
              <tr key={c.cmd}>
                <td>
                  <code>{c.cmd}</code>
                </td>
                <td>{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Progress ---------------- */

export function Progress() {
  const state = useStore((s) => s);
  const text = progressCard(state);
  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/progress</p>
        <h1>Progress Card</h1>
      </header>
      <div className="panel">
        <div className="panel-head">
          <h3>Your card</h3>
          <CopyButton text={text} />
        </div>
        <pre className="progress-card">{text}</pre>
      </div>
      <p className="muted">Paste this card into a new Mentor chat and it will continue exactly where you left off. To move all your data to another browser, use Settings → Export.</p>
    </div>
  );
}

/* ---------------- Debug method ---------------- */

export function Debug() {
  const [err, setErr] = useState("");
  const steps = [
    ["Read the whole error", "The first line says what; the stack trace says where. Find the first frame in YOUR code."],
    ["Reproduce it reliably", "Smallest input that triggers it. If you can't reproduce it, add logging until you can."],
    ["Form one hypothesis", "Write it down: 'I think X is null because Y'. One at a time."],
    ["Test the hypothesis cheaply", "Print/log the value, use a debugger breakpoint, or write a failing test."],
    ["Change one thing", "Fix the cause, not the symptom. Re-run the reproduction."],
    ["Prevent the class of bug", "Add a test, a type, validation or an alert so it cannot silently return."],
  ];
  const hints: [RegExp, string][] = [
    [/ECONNREFUSED|connection refused/i, "Nothing is listening at that host:port. Is the service running? In Docker, use the service name, not localhost (lesson 9.1.1)."],
    [/permission denied|EACCES/i, "The process user lacks rights on a file or port. Check ls -l and which user runs the process (lesson 0.2.1). Avoid chmod 777."],
    [/CONFLICT|merge conflict/i, "Both branches changed the same lines. Edit to the final content, remove markers, git add, commit (lesson 0.3.1)."],
    [/ModuleNotFoundError|No module named/i, "The package isn't installed in the active environment. Is your venv activated? pip install inside it (lesson 1.1.1)."],
    [/Cannot read propert(y|ies) of (undefined|null)|TypeError/i, "A value you expected is missing. Log it right before the failing line; check async timing and API response shape (lesson 1.2.1)."],
    [/ENOTFOUND|getaddrinfo|Name or service not known|NXDOMAIN/i, "DNS lookup failed: typo in the host, no network, or the record doesn't exist (lesson 0.1.1)."],
    [/certificate|SSL|TLS/i, "TLS problem: expired or self-signed certificate, wrong hostname, or a proxy intercepting traffic (lesson 0.1.1)."],
    [/Unhandled.*rejection/i, "A promise rejected with no catch. Await it inside try/catch or add .catch (lesson 1.2.1)."],
    [/no space left on device/i, "Disk full: df -h, then du to find the biggest folders (lesson 0.2.1 challenge)."],
    [/Using filesort|type: ALL|Seq Scan/i, "Full scan or extra sort: an index is missing or not usable (lesson 5.1.1)."],
  ];
  const matched = hints.filter(([re]) => re.test(err));
  return (
    <div className="page narrow">
      <header className="page-head">
        <p className="eyebrow">/debug</p>
        <h1>Debug like a senior</h1>
        <p className="lede">Paste an error. You get pattern-based pointers, but the real goal is the method below, which works on errors nobody has seen before.</p>
      </header>
      <textarea className="big-input" rows={6} value={err} onChange={(e) => setErr(e.target.value)} placeholder="Paste an error message or stack trace…" spellCheck={false} />
      {err.trim() &&
        (matched.length ? (
          <div className="callout">
            {matched.map(([, h], i) => (
              <p key={i}>💡 {h}</p>
            ))}
          </div>
        ) : (
          <div className="callout warn">No known pattern matched. Good: this is exactly when the method matters. Work through the steps below.</div>
        ))}
      <ol className="debug-steps">
        {steps.map(([t, d]) => (
          <li key={t}>
            <strong>{t}</strong>
            <span>{d}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function Settings() {
  const state = useStore((s) => s);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>Settings & data</h1>
        <p className="lede">Everything is stored locally in this browser. Nothing is sent to a server.</p>
      </header>
      <section className="panel">
        <h3>Theme</h3>
        <div className="seg wide">
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} className={state.theme === t ? "on" : ""} onClick={() => actions.setTheme(t)}>
              {t}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Profile</h3>
        <p className="muted">{state.profile ? `${state.profile.name || "Learner"} · ${state.profile.goal} · ${state.profile.hoursPerWeek} h/week` : "No profile yet."}</p>
        <a className="btn btn-ghost" href="#/start">
          {state.profile ? "Redo onboarding" : "Start onboarding"}
        </a>
      </section>
      <section className="panel">
        <h3>Export / import</h3>
        <div className="row">
          <button
            className="btn btn-ghost"
            onClick={() => {
              const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `devatlas-progress-${today()}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Export progress (.json)
          </button>
          <label className="btn btn-ghost">
            Import…
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setMsg(actions.importState(await f.text()) ? "Imported ✓" : "That file isn't a DevAtlas export.");
              }}
            />
          </label>
        </div>
        {msg && <p className="small">{msg}</p>}
      </section>
      <section className="panel danger">
        <h3>Reset</h3>
        <p className="muted">Deletes your profile, progress, submissions and revision deck from this browser.</p>
        {confirmReset ? (
          <div className="row">
            <button
              className="btn btn-danger"
              onClick={() => {
                resetState();
                setConfirmReset(false);
                setMsg("All data reset.");
              }}
            >
              Yes, delete everything
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
            Reset all data…
          </button>
        )}
      </section>
    </div>
  );
}
