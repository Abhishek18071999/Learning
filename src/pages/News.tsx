import { useEffect, useState } from "react";
import { classify, newsTopics, type NewsTopic } from "../data/newsTopics";
import { lessonById } from "../data/lessons";
import { Badge, Empty } from "../components/ui";

// Live stories from the public Hacker News Algolia API (no key, CORS-enabled).
// We never invent or summarise news: we show the real headline, source, date and
// discussion link, and add course context and evergreen "how companies use this" notes.

interface Story {
  id: string;
  title: string;
  url: string | null;
  domain: string;
  points: number;
  comments: number;
  createdAt: Date;
  topics: NewsTopic[];
}

interface HnHit {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
}

async function fetchStories(signal: AbortSignal): Promise<Story[]> {
  const since = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
  const url = `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=200&numericFilters=created_at_i>${since},points>40`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { hits: HnHit[] };
  return data.hits
    .filter((h) => h.title)
    .map((h) => {
      const title = h.title ?? "";
      let domain = "news.ycombinator.com";
      try {
        if (h.url) domain = new URL(h.url).hostname.replace(/^www\./, "");
      } catch {
        // keep the HN domain for malformed URLs
      }
      return {
        id: h.objectID,
        title,
        url: h.url,
        domain,
        points: h.points ?? 0,
        comments: h.num_comments ?? 0,
        createdAt: new Date(h.created_at_i * 1000),
        topics: classify(title),
      };
    })
    .filter((s) => s.topics.length > 0)
    .sort((a, b) => b.points - a.points);
}

export function News() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("all");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let cancelled = false; // set on unmount, so an aborted fetch is not reported as an error
    setStories(null);
    setError(null);
    fetchStories(ctrl.signal)
      .then((s) => !cancelled && setStories(s))
      .catch((e: unknown) => {
        if (!cancelled) setError(ctrl.signal.aborted ? "request timed out" : e instanceof Error ? e.message : String(e));
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [reload]);

  const active = newsTopics.find((t) => t.id === topic);
  const list = (stories ?? []).filter((s) => topic === "all" || s.topics.some((t) => t.id === topic)).slice(0, 30);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">/news · past 7 days</p>
        <h1>Tech News</h1>
        <p className="lede">
          Real, live stories that developers are discussing this week, from the public Hacker News API. Each one links to its original source and is tagged with the course topic it relates to. Headlines are shown as published; DevAtlas does not generate or rewrite news.
        </p>
      </header>

      <div className="filters" role="tablist">
        <button className={topic === "all" ? "on" : ""} onClick={() => setTopic("all")}>
          All
        </button>
        {newsTopics.map((t) => (
          <button key={t.id} className={topic === t.id ? "on" : ""} onClick={() => setTopic(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="news-layout">
        <div>
          {error && (
            <div className="callout warn">
              <strong>I can't access live news right now</strong> ({error}). This needs an internet connection to hn.algolia.com; some networks and browser extensions block it. The industry notes on the right are still valid.{" "}
              <button className="btn btn-ghost btn-sm" onClick={() => setReload((r) => r + 1)}>
                Retry
              </button>
            </div>
          )}
          {!error && stories === null && (
            <div className="news-list">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="news-item skeleton" />
              ))}
            </div>
          )}
          {stories && list.length === 0 && <Empty title="No stories in this topic this week">Try another topic or All.</Empty>}
          <div className="news-list">
            {list.map((s) => {
              const lesson = lessonById[s.topics[0].lessonId];
              return (
                <article key={s.id} className="news-item">
                  <h3>
                    <a href={s.url ?? `https://news.ycombinator.com/item?id=${s.id}`} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  </h3>
                  <div className="news-meta">
                    <span>{s.domain}</span>
                    <span>·</span>
                    <time dateTime={s.createdAt.toISOString()}>{s.createdAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time>
                    <span>·</span>
                    <span>▲ {s.points}</span>
                    <a href={`https://news.ycombinator.com/item?id=${s.id}`} target="_blank" rel="noreferrer">
                      {s.comments} comments
                    </a>
                  </div>
                  <div className="news-tags">
                    {s.topics.map((t) => (
                      <Badge key={t.id}>
                        {t.icon} {t.label}
                      </Badge>
                    ))}
                    <span className="news-related">
                      Related: {s.topics[0].courseTopic}
                      {lesson && (
                        <>
                          {" "}
                          · <a href={`#/lesson/${lesson.id}`}>lesson {lesson.id}</a>
                        </>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="news-side">
          <section className="panel">
            <h3>{active ? `${active.icon} How companies use ${active.label}` : "How companies use these technologies"}</h3>
            <p className="muted small">Evergreen industry patterns written for DevAtlas, not claims about any specific story.</p>
            {(active ? [active] : newsTopics.slice(0, 4)).map((t) => (
              <div key={t.id} className="industry">
                {!active && (
                  <div className="industry-title">
                    {t.icon} {t.label}
                  </div>
                )}
                <ul>
                  {t.industry.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section className="panel">
            <h3>Read news like an engineer</h3>
            <ul className="tight">
              <li>
                <strong>Try it</strong> if it touches your stack and has docs or a release you can run in an hour.
              </li>
              <li>
                <strong>Watch it</strong> if it's an announcement or preview without stable docs yet.
              </li>
              <li>
                <strong>Ignore it</strong> if it's benchmarks without methodology, or hype without code.
              </li>
              <li>Prefer the primary source (release notes, changelog, CVE entry) over commentary.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
