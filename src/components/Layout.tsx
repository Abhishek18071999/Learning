import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { phases } from "../data/curriculum";
import { lessonById, lessons } from "../data/lessons";
import { nextLessonId } from "../lib/roadmap";
import { navigate, useRoute } from "../lib/router";
import { actions, getState, streak, today, useStore } from "../lib/store";
import { Icon } from "./Icon";

const NAV = [
  { path: "/", label: "Dashboard", icon: "dashboard" },
  { path: "/roadmap", label: "Roadmap", icon: "map" },
  { path: "/revise", label: "Revise", icon: "revise" },
  { path: "/quiz", label: "Quiz", icon: "quiz" },
  { path: "/interview", label: "Mock interview", icon: "mic" },
  { path: "/project", label: "Capstone", icon: "build" },
  { path: "/news", label: "Tech News", icon: "news" },
  { path: "/resources", label: "Resources", icon: "link" },
  { path: "/cheatsheet", label: "Cheat sheets", icon: "sheet" },
  { path: "/glossary", label: "Glossary", icon: "book" },
  { path: "/debug", label: "Debug helper", icon: "bug" },
];

export function Layout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const state = useStore((s) => s);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openPhase, setOpenPhase] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setNavOpen(false), [route]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  const currentLessonId = route.startsWith("/lesson/") ? route.split("/")[2] : null;
  const days = streak(state.activity);
  const dueCount = Object.values(state.cards).filter((c) => c.due <= today()).length;

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${navOpen ? "open" : ""}`} aria-label="Main navigation">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 64 64" width="28" height="28">
              <rect width="64" height="64" rx="16" fill="var(--accent)" />
              <path d="M18 44 32 16l14 28M23 35h18" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            DevAtlas
            <small>with Mentor</small>
          </span>
        </a>

        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={`nav-link ${route === n.path || (n.path !== "/" && route.startsWith(n.path)) ? "active" : ""}`}>
              <span className="nav-icon">
                <Icon name={n.icon} />
              </span>
              {n.label}
              {n.path === "/revise" && dueCount > 0 && <span className="nav-count">{dueCount}</span>}
            </a>
          ))}
        </nav>

        <div className="nav-heading">Curriculum</div>
        <nav className="nav nav-phases">
          {phases.map((p) => {
            const ids = p.modules.flatMap((m) => m.lessons.map((l) => l.id));
            const done = ids.filter((id) => state.lessons[id]?.status === "completed").length;
            const expanded = openPhase === p.id || (currentLessonId !== null && ids.includes(currentLessonId));
            return (
              <div key={p.id} className="phase-group">
                <button className={`phase-toggle ${expanded ? "expanded" : ""}`} onClick={() => setOpenPhase(expanded && openPhase === p.id ? null : p.id)} aria-expanded={expanded}>
                  <span aria-hidden>{p.icon}</span>
                  <span className="phase-name">
                    {p.id}. {p.title}
                  </span>
                  <span className="phase-count">
                    {done}/{ids.length}
                  </span>
                </button>
                {expanded && (
                  <div className="phase-lessons">
                    {p.modules.flatMap((m) => m.lessons).map((l) => {
                      const status = state.lessons[l.id]?.status;
                      return (
                        <a key={l.id} href={`#/lesson/${l.id}`} className={`lesson-link ${currentLessonId === l.id ? "active" : ""} ${lessonById[l.id] ? "" : "stub"}`}>
                          <span className={`dot ${status ?? ""}`} aria-hidden />
                          <span className="lesson-link-id">{l.id}</span>
                          <span className="lesson-link-title">{l.title}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <a href="#/settings" className="nav-link">
            <span className="nav-icon">
              <Icon name="settings" />
            </span>
            Settings & data
          </a>
          <a href="#/help" className="nav-link">
            <span className="nav-icon">
              <Icon name="command" />
            </span>
            Commands
          </a>
        </div>
      </aside>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Icon name="menu" size={20} />
          </button>
          <button className="search" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={17} />
            <span className="search-text">Search lessons or type a command…</span>
            <kbd>/</kbd>
          </button>
          <div className="topbar-right">
            <span className="chip" title="Days in a row with learning activity">
              <Icon name="flame" size={15} /> {days} day{days === 1 ? "" : "s"}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="main">
          {children}
        </main>
      </div>
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const order = ["system", "light", "dark"] as const;
  const icon = { system: "system", light: "sun", dark: "moon" }[theme];
  return (
    <button className="icon-btn" onClick={() => actions.setTheme(order[(order.indexOf(theme) + 1) % 3])} aria-label={`Theme: ${theme}. Click to change`} title={`Theme: ${theme}`}>
      <Icon name={icon} />
    </button>
  );
}

interface Item {
  id: string;
  label: string;
  hint: string;
  group: "Commands" | "Lessons" | "Terms";
  run: () => void;
}

export const COMMANDS: { cmd: string; desc: string; path: string | (() => string) }[] = [
  { cmd: "/start", desc: "Onboarding: profile, diagnostic and personalised roadmap", path: "/start" },
  { cmd: "/next", desc: "Open the next lesson", path: () => `/lesson/${nextLessonId(getState()) ?? lessons[0].id}` },
  { cmd: "/roadmap", desc: "Roadmap with your progress", path: "/roadmap" },
  { cmd: "/progress", desc: "Your Progress Card", path: "/progress" },
  { cmd: "/homework", desc: "Current lesson's homework", path: () => `/lesson/${currentOrNext()}?s=homework` },
  { cmd: "/submit", desc: "Submit homework for review", path: () => `/lesson/${currentOrNext()}?s=homework` },
  { cmd: "/solution", desc: "Model solutions for the current homework", path: () => `/lesson/${currentOrNext()}?s=homework` },
  { cmd: "/hint", desc: "One hint at a time, inside each homework task", path: () => `/lesson/${currentOrNext()}?s=homework` },
  { cmd: "/quiz", desc: "10-question quiz on a topic", path: "/quiz" },
  { cmd: "/interview", desc: "Mock interview, one question at a time", path: "/interview" },
  { cmd: "/deeper", desc: "Official docs and further reading for the current lesson", path: () => `/lesson/${currentOrNext()}?s=deeper` },
  { cmd: "/simpler", desc: "The analogy-first explanation of the current lesson", path: () => `/lesson/${currentOrNext()}?s=concept` },
  { cmd: "/example", desc: "How real companies use the current topic", path: () => `/lesson/${currentOrNext()}?s=companies` },
  { cmd: "/project", desc: "Capstone status and next step", path: "/project" },
  { cmd: "/debug", desc: "The debugging method, with a checklist", path: "/debug" },
  { cmd: "/news", desc: "Live tech news from the past 7 days", path: "/news" },
  { cmd: "/resources", desc: "Revision lines plus the best article, video (Hindi first) and practice link per topic", path: "/resources" },
  { cmd: "/cheatsheet", desc: "One-page summaries", path: "/cheatsheet" },
  { cmd: "/revise", desc: "Spaced-repetition revision of weak areas", path: "/revise" },
  { cmd: "/explain", desc: "Look up any term in the glossary", path: "/glossary" },
];

function currentOrNext(): string {
  const s = getState();
  const started = lessons.find((l) => s.lessons[l.id]?.status === "started");
  return started?.id ?? nextLessonId(s) ?? lessons[0].id;
}

function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      onClose();
    };
    const cmds: Item[] = COMMANDS.map((c) => ({
      id: c.cmd,
      label: c.cmd,
      hint: c.desc,
      group: "Commands",
      run: () => {
        navigate(typeof c.path === "string" ? c.path : c.path());
        onClose();
      },
    }));
    const ls: Item[] = phases.flatMap((p) =>
      p.modules.flatMap((m) =>
        m.lessons.map((l) => ({ id: l.id, label: `${l.id}  ${l.title}`, hint: lessonById[l.id] ? p.title : `${p.title} · preview`, group: "Lessons" as const, run: go(`/lesson/${l.id}`) })),
      ),
    );
    const terms: Item[] = lessons.flatMap((l) => l.terms.map((t) => ({ id: `${l.id}:${t.term}`, label: t.term, hint: t.def, group: "Terms" as const, run: go(`/glossary?q=${encodeURIComponent(t.term)}`) })));
    const needle = q.trim().toLowerCase();
    const [cmdWord, ...rest] = needle.split(" ");
    if (cmdWord === "/explain" && rest.length) {
      const term = rest.join(" ");
      return [{ id: "explain", label: `Explain “${term}”`, hint: "Search the glossary", group: "Commands", run: go(`/glossary?q=${encodeURIComponent(term)}`) }];
    }
    if (cmdWord === "/quiz" && rest.length) {
      const topic = rest.join(" ");
      return [{ id: "quiz", label: `Quiz on “${topic}”`, hint: "Start a quiz on this topic", group: "Commands", run: go(`/quiz?topic=${encodeURIComponent(topic)}`) }];
    }
    if (!needle) return [...cmds.slice(0, 6), ...ls.filter((l) => lessonById[l.id]).slice(0, 6)];
    const score = (it: Item) => {
      const hay = `${it.label} ${it.hint}`.toLowerCase();
      if (it.label.toLowerCase().startsWith(needle)) return 3;
      if (it.label.toLowerCase().includes(needle)) return 2;
      return needle.split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0;
    };
    return [...cmds, ...ls, ...terms]
      .map((it) => [it, score(it)] as const)
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([it]) => it);
  }, [q, onClose]);

  useEffect(() => setSel(0), [q]);

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a lesson, a term, or a command like /next"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, items.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            }
            if (e.key === "Enter") items[sel]?.run();
          }}
          aria-label="Search"
        />
        <ul className="palette-list" role="listbox">
          {items.length === 0 && <li className="palette-empty">No matches. Try “docker”, “/next” or “/explain TTL”.</li>}
          {items.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === sel} className={i === sel ? "sel" : ""} onMouseEnter={() => setSel(i)} onClick={it.run}>
              <span className="palette-group">{it.group === "Commands" ? "⌘" : it.group === "Lessons" ? "▤" : "Aa"}</span>
              <span className="palette-label">{it.label}</span>
              <span className="palette-hint">{it.hint}</span>
            </li>
          ))}
        </ul>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
