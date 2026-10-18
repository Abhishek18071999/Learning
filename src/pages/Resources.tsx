import { useState } from "react";
import { allTopics, isReady, resourcesForLesson, sectionById, sections } from "../data/resources";
import { lessonById } from "../data/lessons";
import type { ResourceSection, ResourceTopic } from "../types";
import { Badge, Empty } from "../components/ui";
import { rich } from "../lib/rich";

// Curated links only: the best repo or article, a video (Hindi first) and a practice link per topic,
// plus a few revision lines. The learning itself happens on the linked pages and in the lessons.

export function Resources({ section, course, q }: { section: string | null; course: string | null; q: string | null }) {
  const s = section ? sectionById[section] : undefined;
  if (section && !s)
    return (
      <div className="page">
        <Empty title={`No resource section “${section}”`}>
          <a href="#/resources">See all sections →</a>
        </Empty>
      </div>
    );
  return s ? <SectionView key={s.id} section={s} courseId={course} q={q} /> : <Overview />;
}

function counts(topics: ResourceTopic[]) {
  return { ready: topics.filter(isReady).length, total: topics.length, hindi: topics.filter((t) => t.video?.lang === "Hindi").length };
}

function Overview() {
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">/resources</p>
        <h1>Resources</h1>
        <p className="lede">
          Every area split into end-to-end courses. Each topic has a few revision lines and hand-checked links: the best repo or article, a video (Hindi first, English when no good Hindi one exists) and a place to practise.
        </p>
      </header>
      <div className="res-grid">
        {sections.map((s) => {
          const c = counts(allTopics(s));
          return (
            <a key={s.id} className="panel res-card" href={`#/resources?s=${s.id}`}>
              <span className="res-card-icon" aria-hidden>
                {s.icon}
              </span>
              <span className="res-card-body">
                <strong>{s.title}</strong>
                <span className="muted small">{s.tagline}</span>
                <span className="res-card-courses">{s.courses.length > 1 ? s.courses.map((x) => x.title).join(" · ") : `${c.total} topics`}</span>
                <span className="res-card-meta">
                  {c.ready}/{c.total} topics with links · {c.hindi} Hindi video{c.hindi === 1 ? "" : "s"}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function SectionView({ section, courseId, q }: { section: ResourceSection; courseId: string | null; q: string | null }) {
  const [filter, setFilter] = useState(q ?? "");
  const [hindiOnly, setHindiOnly] = useState(false);
  const course = section.courses.find((c) => c.id === courseId) ?? section.courses[0];
  const n = filter.trim().toLowerCase();
  const list = course.topics.filter((x) => (!hindiOnly || x.video?.lang === "Hindi") && (!n || `${x.title} ${x.revision.join(" ")}`.toLowerCase().includes(n)));
  const c = counts(course.topics);
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">
          <a href="#/resources">/resources</a>
          {section.phaseId !== undefined && ` · phase ${section.phaseId}`}
        </p>
        <h1>
          <span aria-hidden>{section.icon}</span> {section.title}
        </h1>
        <p className="lede">{section.tagline}</p>
      </header>
      <nav className="filters res-sections" aria-label="Resource sections">
        {sections.map((s) => (
          <a key={s.id} aria-current={s.id === section.id ? "page" : undefined} className={`filter-pill ${s.id === section.id ? "on" : ""}`} href={`#/resources?s=${s.id}`}>
            {s.icon} {s.title}
          </a>
        ))}
      </nav>
      {section.courses.length > 1 && (
        <div className="tabs res-courses" role="tablist" aria-label="Courses">
          {section.courses.map((x) => (
            <a key={x.id} role="tab" aria-selected={x.id === course.id} className={x.id === course.id ? "on" : ""} href={`#/resources?s=${section.id}&c=${x.id}`}>
              {x.title} <span className="muted small">{x.topics.length}</span>
            </a>
          ))}
        </div>
      )}
      <div className="res-tools">
        <input className="big-input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Filter ${course.title} topics…`} aria-label="Filter topics" />
        <label className="res-toggle">
          <input type="checkbox" checked={hindiOnly} onChange={(e) => setHindiOnly(e.target.checked)} /> Hindi videos only
        </label>
        <span className="muted small">
          {c.ready}/{c.total} topics with links · {c.hindi} Hindi videos
        </span>
      </div>
      {list.length === 0 && <Empty title="No topic matches" />}
      <ol className="res-list">
        {list.map((x) => (
          <TopicCard key={x.id} topic={x} n={course.topics.indexOf(x) + 1} />
        ))}
      </ol>
    </div>
  );
}

export function TopicCard({ topic, n }: { topic: ResourceTopic; n?: number }) {
  const lesson = topic.lessonId ? lessonById[topic.lessonId] : undefined;
  const ready = isReady(topic);
  return (
    <li className={`panel res-topic ${ready ? "" : "pending"}`}>
      <div className="res-topic-head">
        <h3>
          {n !== undefined && <span className="res-num">{n}</span>}
          {topic.title}
        </h3>
        {topic.lessonId && (
          <a className="res-lesson" href={`#/lesson/${topic.lessonId}`}>
            Lesson {topic.lessonId}
            {lesson ? "" : " (preview)"} →
          </a>
        )}
      </div>
      {!ready ? (
        <p className="muted small">Links for this topic are still being checked.</p>
      ) : (
        <>
          {topic.revision.length > 0 && (
            <ul className="cheat">
              {topic.revision.map((r, i) => (
                <li key={i}>{rich(r)}</li>
              ))}
            </ul>
          )}
          <div className="res-links">
            {topic.read ? (
              <a className="res-link" href={topic.read.url} target="_blank" rel="noreferrer">
                <span className="res-link-kind">{topic.read.kind === "repo" ? "📦 GitHub repo" : topic.read.kind === "docs" ? "📘 Docs" : "📖 Article"}</span>
                <span className="res-link-label">{topic.read.label}</span>
              </a>
            ) : (
              <span className="res-link missing">📖 No verified article yet</span>
            )}
            {topic.video ? (
              <a className="res-link" href={topic.video.url} target="_blank" rel="noreferrer">
                <span className="res-link-kind">
                  ▶ Video <Badge tone={topic.video.lang === "Hindi" ? "good" : "neutral"}>{topic.video.lang}</Badge>
                </span>
                <span className="res-link-label">{topic.video.label}</span>
                <span className="muted small">{topic.video.channel}</span>
              </a>
            ) : (
              <span className="res-link missing">▶ No verified video yet</span>
            )}
            {topic.practice ? (
              <a className="res-link" href={topic.practice.url} target="_blank" rel="noreferrer">
                <span className="res-link-kind">✍️ Practice</span>
                <span className="res-link-label">{topic.practice.label}</span>
              </a>
            ) : (
              <span className="res-link missing">✍️ No verified practice link yet</span>
            )}
          </div>
        </>
      )}
    </li>
  );
}

/** The resource topics that cover a lesson, shown in its "Go deeper" section. */
export function LessonResources({ lessonId }: { lessonId: string }) {
  const list = resourcesForLesson(lessonId);
  if (list.length === 0) return null;
  return (
    <>
      <h3>
        Revision links <a className="small" href={`#/resources?s=${list[0].section.id}&c=${list[0].course.id}`}>all {list[0].course.title} resources →</a>
      </h3>
      <ol className="res-list">
        {list.map(({ topic }) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </ol>
    </>
  );
}
