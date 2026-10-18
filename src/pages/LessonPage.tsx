import { useEffect, useState } from "react";
import { allStubs } from "../data/curriculum";
import { lessonById, lessons, loadLesson } from "../data/lessons";
import { milestones } from "../data/capstone";
import type { HomeworkTask, Lesson, LessonMeta } from "../types";
import { QuestionCard, QuizSet } from "../components/Quiz";
import { Badge, Code, CopyButton, Flow, Section } from "../components/ui";
import { rich } from "../lib/rich";
import { progressCard } from "../lib/roadmap";
import { actions, useStore } from "../lib/store";

const TIERS = ["basic", "intermediate", "challenge", "capstone"] as const;
type Tier = (typeof TIERS)[number];

const TOC = [
  ["review", "Homework review"],
  ["problem", "The real-world problem"],
  ["concept", "Concept, simply"],
  ["under-the-hood", "Under the hood"],
  ["hands-on", "Hands-on"],
  ["companies", "In real companies"],
  ["mistakes", "Common mistakes"],
  ["best-practices", "Best practices"],
  ["interview", "Interview angle"],
  ["quick-check", "Quick check"],
  ["cheat-sheet", "Cheat sheet"],
  ["homework", "Homework"],
  ["deeper", "Go deeper"],
  ["next", "Next lesson"],
] as const;

export function LessonPage({ id, section }: { id: string; section?: string | null }) {
  const meta = lessonById[id];
  if (!meta) return <StubLesson id={id} />;
  return <LoadedLesson key={id} meta={meta} section={section} />;
}

// Full lesson bodies are separate chunks; show the title and a placeholder while one downloads.
function LoadedLesson({ meta, section }: { meta: LessonMeta; section?: string | null }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(false);
    loadLesson(meta.id).then(
      (l) => live && setLesson(l),
      () => live && setError(true),
    );
    return () => {
      live = false;
    };
  }, [meta.id, attempt]);

  if (lesson) return <FullLesson lesson={lesson} section={section} />;
  return (
    <div className="page narrow" aria-busy={!error}>
      <h1>
        <span className="lesson-num">Lesson {meta.id}</span>
        {meta.title}
      </h1>
      {error ? (
        <div className="callout warn" role="alert">
          This lesson could not be loaded. Check your connection and{" "}
          <button className="btn btn-ghost" onClick={() => setAttempt((n) => n + 1)}>
            try again
          </button>
        </div>
      ) : (
        <>
          <p className="muted" role="status">
            Loading lesson…
          </p>
          <div className="skeleton" />
        </>
      )}
    </div>
  );
}

function FullLesson({ lesson, section }: { lesson: Lesson; section?: string | null }) {
  const state = useStore((s) => s);
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const status = state.lessons[lesson.id]?.status;
  const stub = allStubs.find((s) => s.id === lesson.id);
  const [active, setActive] = useState("problem");
  const [readPct, setReadPct] = useState(0);

  useEffect(() => actions.startLesson(lesson.id), [lesson.id]);

  useEffect(() => {
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [section]);

  useEffect(() => {
    const els = TOC.map(([sid]) => document.getElementById(sid)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    const onScroll = () => {
      const h = document.documentElement;
      setReadPct(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [lesson.id]);

  const cardIds = lesson.quickCheck.map((_, i) => `${lesson.id}:q${i}`);
  const milestone = milestones.find((m) => m.lessonId === lesson.id);

  return (
    <div className="lesson-wrap">
      <div className="read-progress" style={{ transform: `scaleX(${readPct})` }} aria-hidden />
      <article className="lesson">
        <header className="lesson-head">
          <p className="eyebrow">
            {stub?.phase.icon} Phase {stub?.phase.id} · {stub?.module.title}
          </p>
          <h1>
            <span className="lesson-num">Lesson {lesson.id}</span>
            {lesson.title}
          </h1>
          <p className="lede">{lesson.summary}</p>
          <div className="meta-row">
            <Badge>⏱ {lesson.minutes} min</Badge>
            <Badge>📶 {lesson.level}</Badge>
            {status === "completed" && <Badge tone="good">✓ Completed</Badge>}
          </div>
          <div className="prereq">
            <span>🔗 Prerequisites:</span> {lesson.prerequisites.join(" · ")}
          </div>
        </header>

        <details className="terms" open>
          <summary>New terms in this lesson ({lesson.terms.length})</summary>
          <dl>
            {lesson.terms.map((t) => (
              <div key={t.term}>
                <dt>{t.term}</dt>
                <dd>{rich(t.def)}</dd>
              </div>
            ))}
          </dl>
        </details>

        <Section id="review" icon="0️⃣" title="Previous homework review">
          <Review lesson={lesson} prev={prev} idx={idx} />
        </Section>

        <Section id="problem" icon="🎯" title="The real-world problem">
          <div className="scenario">
            {lesson.problem.map((t, i) => (
              <p key={i}>{rich(t)}</p>
            ))}
          </div>
        </Section>

        <Section id="concept" icon="🧠" title="Concept, simply">
          <div className="analogy">
            <div className="analogy-label">Analogy</div>
            {lesson.concept.analogy.map((t, i) => (
              <p key={i}>{rich(t)}</p>
            ))}
          </div>
          <h3 className="sub">The precise picture</h3>
          {lesson.concept.precise.map((t, i) => (
            <p key={i}>{rich(t)}</p>
          ))}
        </Section>

        <Section id="under-the-hood" icon="⚙️" title="Under the hood">
          {lesson.underTheHood.diagram && <Flow diagram={lesson.underTheHood.diagram} />}
          {lesson.underTheHood.text.map((t, i) => (
            <p key={i}>{rich(t)}</p>
          ))}
        </Section>

        <Section id="hands-on" icon="💻" title="Hands-on">
          <ol className="steps">
            {lesson.handsOn.map((s, i) => (
              <li key={i} className="step">
                <h3>
                  <span className="step-num">{i + 1}</span>
                  {s.title}
                </h3>
                {s.text?.map((t, j) => (
                  <p key={j}>{rich(t)}</p>
                ))}
                {s.code && <Code sample={s.code} output={s.output} />}
                {!s.code && s.output && <pre className="plain-output">{s.output}</pre>}
                {s.notes?.map((t, j) => (
                  <p key={j} className="note">
                    {rich(t)}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="companies" icon="🏢" title="How real companies use it">
          <div className="company-list">
            {lesson.companies.map((t, i) => (
              <p key={i}>{rich(t)}</p>
            ))}
          </div>
        </Section>

        <Section id="mistakes" icon="⚠️" title="Common mistakes">
          <div className="table-wrap">
            <table className="mistakes">
              <thead>
                <tr>
                  <th>Mistake</th>
                  <th>Why people make it</th>
                  <th>What goes wrong</th>
                  <th>How to avoid or fix it</th>
                </tr>
              </thead>
              <tbody>
                {lesson.mistakes.map((m, i) => (
                  <tr key={i}>
                    <td data-label="Mistake">
                      <strong>{rich(m.mistake)}</strong>
                    </td>
                    <td data-label="Why">{rich(m.why)}</td>
                    <td data-label="What goes wrong">{rich(m.wrong)}</td>
                    <td data-label="Fix" className="fix">
                      {rich(m.fix)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="best-practices" icon="✅" title="Best practices">
          <ul className="practices">
            {lesson.bestPractices.map((b, i) => (
              <li key={i}>
                <span className={`tag tag-${b.tag.toLowerCase()}`}>{b.tag}</span>
                <span>{rich(b.text)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="interview" icon="🎤" title="Interview angle">
          {lesson.interview.map((q, i) => (
            <details key={i} className="qa">
              <summary>
                <span className="qa-q">Q{i + 1}.</span> {q.q}
              </summary>
              <p>{rich(q.a)}</p>
            </details>
          ))}
          <a className="link-btn" href={`#/interview?lesson=${lesson.id}`}>
            Practise these as a mock interview →
          </a>
        </Section>

        <Section id="quick-check" icon="🧩" title="Quick check" kicker="Answers stay hidden until you choose">
          <QuizSet questions={lesson.quickCheck} onDone={(score, total) => actions.recordQuickCheck(lesson.id, score / total)} />
        </Section>

        <Section id="cheat-sheet" icon="📝" title="Cheat sheet">
          <ul className="cheat">
            {lesson.cheatSheet.map((c, i) => (
              <li key={i}>{rich(c)}</li>
            ))}
          </ul>
        </Section>

        <Section id="homework" icon="🏋️" title="Homework">
          <Homework lesson={lesson} />
          {milestone && (
            <p className="muted small">
              Capstone milestone: <a href="#/project">{milestone.title}</a>
            </p>
          )}
        </Section>

        <Section id="deeper" icon="📚" title="Go deeper">
          <p className="muted">Official documentation first. Learning to read docs is a core engineering skill.</p>
          <ul className="links">
            {lesson.deeper.map((d) => (
              <li key={d.url}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.label} <span aria-hidden>↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="next" icon="➡️" title="Next lesson preview">
          <p>{rich(lesson.nextPreview)}</p>
          <div className="complete-bar">
            {status === "completed" ? (
              <button className="btn btn-ghost" onClick={() => actions.uncompleteLesson(lesson.id)}>
                ✓ Completed · undo
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => actions.completeLesson(lesson.id, cardIds)}>
                Mark lesson complete
              </button>
            )}
            <div className="pager">
              {prev && (
                <a className="btn btn-ghost" href={`#/lesson/${prev.id}`}>
                  ← {prev.id}
                </a>
              )}
              {next && (
                <a className="btn btn-primary" href={`#/lesson/${next.id}`}>
                  {next.id}: {next.title} →
                </a>
              )}
            </div>
          </div>
        </Section>

        <section className="lesson-section" id="progress">
          <div className="panel-head">
            <h2>Progress Card</h2>
            <CopyButton text={progressCard(state)} />
          </div>
          <pre className="progress-card">{progressCard(state)}</pre>
        </section>
      </article>

      <aside className="toc" aria-label="On this page">
        <div className="toc-title">On this page</div>
        {TOC.map(([sid, label]) => (
          <a key={sid} href={`#/lesson/${lesson.id}?s=${sid}`} className={active === sid ? "active" : ""} onClick={(e) => {
            e.preventDefault();
            document.getElementById(sid)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}>
            {label}
          </a>
        ))}
      </aside>
    </div>
  );
}

function Review({ lesson, prev, idx }: { lesson: Lesson; prev: LessonMeta | null; idx: number }) {
  const state = useStore((s) => s);
  if (!prev) {
    return <p className="muted">This is your first lesson, so there is no homework to review yet. From the next lesson on, this section reviews your previous homework and brings back three questions from earlier lessons (spaced repetition).</p>;
  }
  const submitted = TIERS.filter((t) => state.homework[`${prev.id}:${t}`]);
  // spaced repetition: questions from roughly 1, 3 and 7 lessons ago
  const picks = [1, 3, 7]
    .map((back) => lessons[idx - back])
    .filter((l): l is LessonMeta => !!l)
    .map((l, i) => ({ from: l, q: l.quickCheck[(new Date().getDate() + i) % l.quickCheck.length] }));
  return (
    <div>
      <div className={`callout ${submitted.length ? "" : "warn"}`}>
        {submitted.length ? (
          <>
            You submitted {submitted.length} of 4 tasks for <strong>Lesson {prev.id}</strong>. Compare your work with the model solutions and the common pitfalls before moving on.{" "}
          </>
        ) : (
          <>
            You have not submitted homework for <strong>Lesson {prev.id}</strong> yet. Try at least the basic task first: struggling with it is where the learning happens. Want more time, or the solution?{" "}
          </>
        )}
        <a href={`#/lesson/${prev.id}?s=homework`}>Open Lesson {prev.id} homework & solutions →</a>
      </div>
      {lesson.id !== prev.id && picks.length > 0 && (
        <>
          <h3 className="sub">Spaced repetition: {picks.length} question{picks.length > 1 ? "s" : ""} from earlier lessons</h3>
          {picks.map(({ from, q }, i) => (
            <div key={from.id}>
              <p className="muted small">From lesson {from.id}: {from.title}</p>
              <QuestionCard q={q} index={i} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Homework({ lesson }: { lesson: Lesson }) {
  const [tier, setTier] = useState<Tier>("basic");
  return (
    <div className="homework">
      <div className="tabs" role="tablist">
        {TIERS.map((t) => (
          <button key={t} role="tab" aria-selected={tier === t} className={tier === t ? "on" : ""} onClick={() => setTier(t)}>
            {t === "capstone" ? "🏗 Capstone step" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Task key={tier} task={lesson.homework[tier]} hwKey={`${lesson.id}:${tier}`} />
    </div>
  );
}

function Task({ task, hwKey }: { task: HomeworkTask; hwKey: string }) {
  const sub = useStore((s) => s.homework[hwKey]);
  const hints = useStore((s) => s.hintsUsed[hwKey] ?? 0);
  const [text, setText] = useState(sub?.text ?? "");
  const [checks, setChecks] = useState<boolean[]>(task.criteria.map(() => false));
  const [rubric, setRubric] = useState(sub?.selfScore ?? { correctness: 5, quality: 5, edgeCases: 5, understanding: 5 });
  const [showSolution, setShowSolution] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const avg = (rubric.correctness + rubric.quality + rubric.edgeCases + rubric.understanding) / 4;

  return (
    <div className="task">
      <h3>{task.title}</h3>
      {task.brief.map((b, i) => (
        <p key={i}>{rich(b)}</p>
      ))}
      <div className="criteria">
        <div className="criteria-title">Acceptance criteria</div>
        {task.criteria.map((c, i) => (
          <label key={i} className="check">
            <input type="checkbox" checked={checks[i]} onChange={() => setChecks((x) => x.map((v, j) => (j === i ? !v : v)))} />
            <span>{rich(c)}</span>
          </label>
        ))}
      </div>

      <div className="hints">
        {task.hints.slice(0, hints).map((h, i) => (
          <div key={i} className="hint">
            💡 Hint {i + 1}: {rich(h)}
          </div>
        ))}
        {hints < task.hints.length && (
          <button className="btn btn-ghost btn-sm" onClick={() => actions.useHint(hwKey)}>
            /hint · show hint {hints + 1} of {task.hints.length}
          </button>
        )}
      </div>

      <div className="submit-box">
        <label className="field">
          <span>/submit · paste your solution, notes or a link to your repo</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Paste code or explain your approach…" spellCheck={false} />
        </label>
        <div className="rubric">
          <div className="criteria-title">Self-review like a senior engineer (0 to 10)</div>
          {(
            [
              ["correctness", "Correctness"],
              ["quality", "Code quality"],
              ["edgeCases", "Edge cases"],
              ["understanding", "Understanding"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="rubric-row">
              <span>{label}</span>
              <input type="range" min={0} max={10} value={rubric[k]} onChange={(e) => setRubric({ ...rubric, [k]: Number(e.target.value) })} />
              <b>{rubric[k]}</b>
            </label>
          ))}
          <div className="rubric-total">Score: {avg.toFixed(1)}/10</div>
        </div>
        <div className="row">
          <button
            className="btn btn-primary btn-sm"
            disabled={!text.trim()}
            onClick={() => actions.submitHomework(hwKey, { text, selfScore: rubric, submittedAt: new Date().toISOString() })}
          >
            {sub ? "Update submission" : "Submit"}
          </button>
          {sub && <span className="muted small">Saved {new Date(sub.submittedAt).toLocaleString()}</span>}
        </div>
        <p className="muted small">Submissions are stored only in your browser. Check each acceptance criterion honestly, then compare with the model solution below.</p>
      </div>

      {!showSolution ? (
        <div className="reveal">
          {!sub && confirmReveal ? (
            <>
              <span>You haven't submitted yet. Attempting first is what makes the solution stick. Reveal anyway?</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSolution(true)}>
                Yes, show it
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => (sub ? setShowSolution(true) : setConfirmReveal(true))}>
              /solution · show model solution
            </button>
          )}
        </div>
      ) : (
        <div className="solution">
          <div className="criteria-title">Model solution</div>
          {task.solution.text.map((t, i) => (
            <p key={i}>{rich(t)}</p>
          ))}
          {task.solution.code && <Code sample={task.solution.code} output={task.solution.output} />}
          {task.solution.pitfalls && (
            <>
              <div className="criteria-title">Mistakes most people make here</div>
              <ul>
                {task.solution.pitfalls.map((p, i) => (
                  <li key={i}>{rich(p)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StubLesson({ id }: { id: string }) {
  const stub = allStubs.find((s) => s.id === id);
  if (!stub)
    return (
      <div className="page narrow">
        <h1>Lesson not found</h1>
        <p>
          <a href="#/roadmap">Back to the roadmap</a>
        </p>
      </div>
    );
  const nearest = lessons.find((l) => l.id.startsWith(`${stub.phase.id}.`)) ?? lessons[0];
  return (
    <div className="page narrow">
      <p className="eyebrow">
        {stub.phase.icon} Phase {stub.phase.id} · {stub.module.title}
      </p>
      <h1>
        <span className="lesson-num">Lesson {stub.id}</span>
        {stub.title}
      </h1>
      <div className="callout">
        <strong>This lesson is being written.</strong> Every DevAtlas lesson follows the full Mentor format (problem, concept, under the hood, hands-on code, company practice, mistakes, interview questions, quick check, homework with solutions), and quality comes before speed. Here is what it will cover:
      </div>
      <h3 className="sub">Learning objectives</h3>
      <ul className="cheat">
        {stub.objectives.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
      <h3 className="sub">Other lessons in this module</h3>
      <ul className="links">
        {stub.module.lessons.map((l) => (
          <li key={l.id}>
            <a href={`#/lesson/${l.id}`}>
              {l.id} {l.title} {lessonById[l.id] ? "" : "(preview)"}
            </a>
          </li>
        ))}
      </ul>
      <p>
        <a className="btn btn-primary btn-wrap" href={`#/lesson/${nearest.id}`}>
          Go to an available lesson: {nearest.id} {nearest.title} →
        </a>
      </p>
    </div>
  );
}
