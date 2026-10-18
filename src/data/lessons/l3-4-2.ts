import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.2",
  title: "Hooks and effects done right",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["3.4.1 Components, props and state"],
  summary: "Use React hooks correctly: the rules of hooks, useEffect for synchronising with external systems (and when not to use it), cleanup, stale closures, refs, and extracting custom hooks.",
  terms: [
    { term: "Hook", def: "A function starting with `use` that lets components use React features: useState, useEffect, useRef, useMemo, useContext, or your own custom hooks." },
    { term: "Effect", def: "Code that runs after React commits a render, to synchronise with something outside React (network, timers, subscriptions, DOM APIs)." },
    { term: "Dependency array", def: "The list of values an effect (or memo) reads; React re-runs it when any of them changes." },
    { term: "Cleanup", def: "A function returned from an effect that undoes it (unsubscribe, clear timer, abort request) before the next run or on unmount." },
    { term: "Stale closure", def: "A function that captured old state or props from an earlier render and keeps using them." },
    { term: "Ref", def: "useRef: a mutable box that persists across renders without causing re-renders, often holding a DOM node." },
    { term: "Custom hook", def: "Your own function using other hooks to package reusable stateful logic, e.g. useDebounce, useFetch." },
  ],
  problem: [
    "A DevAtlas page uses `useEffect` to copy props into state, another to compute a filtered list, and a third to fetch data without cleanup. The result: double renders, a flash of stale content, an infinite request loop when an object dependency changes on every render, and a 'set state on unmounted component' race when users navigate quickly.",
    "Most effect bugs come from using effects for things that are not effects. React's own guidance is 'You might not need an effect'. Knowing when to use one, and how to clean up, removes a whole category of bugs.",
  ],
  concept: {
    analogy: [
      "An effect is like a **subscription you must cancel**. When you move house (unmount) or change the delivery address (dependencies change), you cancel the old newspaper subscription before starting a new one. Forget to cancel and two papers arrive, one to the wrong address.",
    ],
    precise: [
      "**Rules of hooks**: call hooks only at the top level of components or custom hooks (not in conditions, loops or nested functions), so React can match each hook call to its state by order.",
      "**Use effects only to synchronise with external systems**: network requests, subscriptions (WebSocket, browser events), timers, imperative DOM APIs, analytics. Do **not** use effects to transform data for rendering (compute it during render) or to respond to user events (do it in the event handler).",
      "**Dependencies** must include every reactive value the effect reads (props, state, values derived from them). Lying about dependencies creates stale closures. If an effect re-runs too often, restructure (move the object inside the effect, use primitive dependencies, or use an updater function) rather than omitting dependencies.",
      "**Cleanup** runs before the next effect run and on unmount. In development, React StrictMode mounts, unmounts and re-mounts components once to expose missing cleanup: if your effect breaks under that, it would also break in production during fast navigation.",
    ],
  },
  underTheHood: {
    text: [
      "Each render has its own props and state values; event handlers and effects created during that render close over them. That is why a `setInterval` callback created once (empty dependency array) keeps seeing the initial count: it is a closure from the first render.",
      "Effects run after the browser paints (useLayoutEffect runs before paint, for measuring layout). Changing state inside an effect triggers another render; doing it unconditionally on every run creates loops.",
      "useMemo/useCallback cache values/functions between renders by dependencies. They are performance tools, not correctness tools, and only help when the computation is expensive or a stable reference is needed by a memoised child or another hook's dependencies.",
    ],
    diagram: {
      title: "Effect lifecycle",
      nodes: [
        { label: "Render", sub: "compute JSX" },
        { label: "Commit", sub: "update DOM" },
        { label: "Effect runs", sub: "subscribe / fetch" },
        { label: "Deps change", sub: "→ cleanup, re-run" },
        { label: "Unmount", sub: "→ cleanup" },
      ],
      edges: ["", "after paint", "", ""],
    },
  },
  handsOn: [
    {
      title: "You might not need an effect",
      code: {
        lang: "tsx",
        code: `// ✗ Effect to compute derived data: extra render, brief stale UI
const [visible, setVisible] = useState<Lesson[]>([]);
useEffect(() => {
  setVisible(lessons.filter((l) => l.title.includes(query)));
}, [lessons, query]);

// ✓ Compute during render
const visible = lessons.filter((l) => l.title.includes(query));

// ✗ Effect reacting to a user action
useEffect(() => {
  if (submitted) postAnalytics("quiz_submitted");
}, [submitted]);

// ✓ Do it in the event handler that caused it
function handleSubmit() {
  setSubmitted(true);
  postAnalytics("quiz_submitted");
}`,
      },
    },
    {
      title: "Fetching with cleanup (no race conditions)",
      code: {
        lang: "tsx",
        file: "src/LessonDetail.tsx",
        code: `import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; lesson: { id: string; title: string } };

export function LessonDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(\`/api/lessons/\${id}\`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then((lesson) => setState({ status: "ok", lesson }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;            // navigated away or id changed
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();                     // cleanup: cancel the old request
  }, [id]);                                              // re-run when id changes

  if (state.status === "loading") return <p>Loading…</p>;
  if (state.status === "error") return <p role="alert">Could not load lesson: {state.message}</p>;
  return <h1>{state.lesson.title}</h1>;
}`,
      },
      notes: ["Without the abort, a slow response for lesson 3.4.1 could arrive after you navigated to 3.4.2 and overwrite it. Next lesson replaces hand-written fetching with a data library (TanStack Query) that handles caching and retries."],
    },
    {
      title: "Subscriptions and the stale-closure trap",
      code: {
        lang: "tsx",
        code: `// ✗ Stale closure: interval created once, always sees seconds = 0
function TimerBroken() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(seconds + 1), 1000);
    return () => clearInterval(id);
  }, []);                                   // 'seconds' missing from dependencies
  return <p>{seconds}s</p>;                 // stuck at 1
}

// ✓ Updater function: no dependency on the current value needed
function Timer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);         // cleanup on unmount
  }, []);
  return <p>{seconds}s</p>;
}

// ✓ Browser event subscription with cleanup
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}`,
      },
    },
    {
      title: "Refs: DOM access and values that should not re-render",
      code: {
        lang: "tsx",
        code: `import { useRef } from "react";

function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searches = useRef(0);                       // mutable, does not trigger renders

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      searches.current += 1;
      onSearch(inputRef.current?.value ?? "");
    }}>
      <input ref={inputRef} aria-label="Search" />
      <button type="button" onClick={() => inputRef.current?.focus()}>Focus search</button>
    </form>
  );
}`,
      },
    },
    {
      title: "Custom hooks: useDebounce and useLocalStorage",
      code: {
        lang: "tsx",
        file: "src/hooks.ts",
        code: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);                 // reset the timer when value changes
  }, [value, ms]);
  return debounced;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {    // lazy initialiser: read storage once
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;                              // private mode or corrupt data
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or disabled */ }
  }, [key, value]);
  return [value, setValue] as const;
}

// Usage:
// const [query, setQuery] = useState("");
// const debouncedQuery = useDebounce(query, 250);     // fetch with debouncedQuery
// const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");`,
      },
    },
  ],
  companies: [
    "**Lint rules enforce hooks rules**: eslint-plugin-react-hooks (rules-of-hooks and exhaustive-deps) runs in CI in most React codebases; reviewers treat disabled exhaustive-deps warnings as a red flag.",
    "**Data libraries replace hand-written fetch effects**: TanStack Query, SWR, RTK Query, or framework loaders (Next.js, React Router) handle caching, deduplication, retries and race conditions, so teams rarely write raw fetch effects in production.",
    "**Shared custom hooks**: design systems and platform teams publish hooks like useMediaQuery, useFeatureFlag and useAnalytics, encapsulating subscriptions and cleanup once.",
  ],
  mistakes: [
    { mistake: "Effects for derived state", why: "Thinking every change needs an effect", wrong: "Extra renders, flicker, state that drifts from its source", fix: "Compute during render; useMemo only for expensive work" },
    { mistake: "Missing dependencies", why: "Silencing the lint warning", wrong: "Stale closures using old props/state", fix: "Include all reactive values; restructure if it re-runs too often" },
    { mistake: "Objects or functions created in render as dependencies", why: "const options = { id } inside the component", wrong: "New reference every render → effect runs every render (or infinite loop)", fix: "Move them inside the effect, depend on primitives, or memoise" },
    { mistake: "No cleanup", why: "Works in a quick test", wrong: "Duplicate subscriptions, memory leaks, race conditions", fix: "Return a cleanup that unsubscribes, clears or aborts" },
    { mistake: "Calling hooks conditionally", why: "if (user) useEffect(...)", wrong: "React's hook order breaks; errors or wrong state", fix: "Call hooks unconditionally; put the condition inside" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Enable eslint-plugin-react-hooks and keep exhaustive-deps on." },
    { tag: "Reliability", text: "Every effect that subscribes, schedules or fetches returns a cleanup." },
    { tag: "Maintainability", text: "Extract repeated effect logic into well-named custom hooks with tests." },
    { tag: "Performance", text: "Do not sprinkle useMemo/useCallback everywhere; measure with React DevTools Profiler first." },
  ],
  interview: [
    { q: "When should you use useEffect?", a: "To synchronise a component with an external system: network requests, subscriptions, timers, browser APIs, third-party widgets. Not for computing values from props/state (do that in render) and not for responding to user actions (use event handlers)." },
    { q: "What is a stale closure in React and how do you fix it?", a: "A callback or effect captured values from an earlier render and keeps using them, such as an interval reading the initial state. Fix by listing correct dependencies, using functional updates (setX(prev => …)), or reading the latest value from a ref when appropriate." },
    { q: "Why does React StrictMode run effects twice in development?", a: "It mounts, unmounts and remounts components to reveal effects without proper cleanup or with hidden assumptions about running once. Effects that are correctly synchronised and cleaned up behave the same." },
  ],
  quickCheck: [
    {
      kind: "bug",
      prompt: "This component fetches in an infinite loop. Why?",
      code: { lang: "tsx", code: "const filters = { level: props.level };\nuseEffect(() => {\n  fetchLessons(filters).then(setLessons);\n}, [filters]);" },
      options: ["fetchLessons is async", "filters is a new object every render, so the effect re-runs, sets state, re-renders, …", "setLessons is not stable", "useEffect cannot fetch"],
      answer: 1,
      explanation: "Depend on props.level (a primitive) and build the object inside the effect.",
    },
    {
      kind: "mcq",
      prompt: "You need fullName from firstName and lastName state. Best approach?",
      options: ["useEffect that sets fullName state", "const fullName = first + ' ' + last during render", "useRef", "A context provider"],
      answer: 1,
      explanation: "Derived values are computed during render; no state or effect needed.",
    },
    {
      kind: "mcq",
      prompt: "What does the function returned from useEffect do?",
      options: ["Runs before the first render", "Cleans up before the next effect run and on unmount", "Returns a value to the component", "Nothing"],
      answer: 1,
      explanation: "It undoes the effect: unsubscribe, clear timers, abort requests.",
    },
  ],
  cheatSheet: [
    "Hooks at the top level only; names start with use.",
    "Effects = sync with external systems. Not for derived data or event reactions.",
    "List every reactive dependency; fix re-runs by restructuring.",
    "Always clean up: removeEventListener, clearInterval, abort().",
    "setX(prev => …) avoids stale closures.",
    "useRef for DOM nodes and non-render values.",
    "Custom hooks package reusable effect logic.",
    "StrictMode double-run reveals missing cleanup.",
  ],
  homework: {
    basic: {
      title: "Remove unnecessary effects",
      brief: ["Refactor a component that has three effects: one copying props.lesson into state, one computing `isComplete` from progress, one logging analytics when a button is clicked. End with zero effects and identical behaviour."],
      criteria: ["No useEffect remains", "Same rendered output", "Analytics call in the event handler"],
      hints: ["Props can be used directly; derived values are computed."],
      solution: {
        text: [
          "Each of the three effects maps to a rule. (1) Copying props.lesson into state: read the prop directly; if the component must reset its own state when a different lesson arrives, render it with key={lesson.id} instead of syncing with an effect. (2) isComplete is derived from progress and the lesson, so compute it during render. (3) Analytics belongs to the click, so call it in the click handler.",
          "The 'started' flag is the one piece of real state (the user changes it), and keeping it preserves the old behaviour exactly: the original effect reported only the first Start click. The test renders both versions with the same props and asserts identical HTML and identical analytics calls, so the refactor is proven rather than assumed. The after-version renders once per change instead of twice, because no effect sets state after the first paint.",
          "Verified with tsc (TypeScript 7.0.2) and Vitest 5.0.5 + jsdom + Testing Library on React 19.3.1. A first run of the test caught a JSX comment placed after <h1> that added whitespace to the output, which is why the comment now sits above the code.",
        ],
        code: {
          lang: "tsx",
          file: "src/LessonHeader.tsx + src/LessonHeader.test.tsx",
          code: `// file: src/LessonHeader.tsx
import { useEffect, useState } from "react";

export interface Lesson { id: string; title: string; quizCount: number }
export interface Progress { answered: number }
interface Props { lesson: Lesson; progress: Progress; track: (event: string, data: Record<string, string>) => void }

// BEFORE: three effects
export function LessonHeaderBefore({ lesson, progress, track }: Props) {
  const [current, setCurrent] = useState(lesson);                 // (1) copy of a prop
  const [isComplete, setIsComplete] = useState(false);            // (2) derived value in state
  const [started, setStarted] = useState(false);

  useEffect(() => { setCurrent(lesson); }, [lesson]);
  useEffect(() => { setIsComplete(progress.answered >= current.quizCount); }, [progress, current]);
  useEffect(() => { if (started) track("lesson_started", { id: current.id }); }, [started, current.id, track]);  // (3)

  return (
    <header>
      <h1>{current.title}</h1>
      <p>{isComplete ? "Complete" : \`\${progress.answered}/\${current.quizCount} answered\`}</p>
      <button type="button" onClick={() => setStarted(true)}>Start</button>
    </header>
  );
}

// AFTER: zero effects
export function LessonHeader({ lesson, progress, track }: Props) {
  const [started, setStarted] = useState(false);                // real state: changed by the user
  // (1) read lesson straight from props: no copy to keep in sync
  const isComplete = progress.answered >= lesson.quizCount;     // (2) computed during render

  function start() {                                            // (3) react in the handler that caused it
    if (started) return;                                        // same as before: report the first start only
    setStarted(true);
    track("lesson_started", { id: lesson.id });
  }

  return (
    <header>
      <h1>{lesson.title}</h1>
      <p>{isComplete ? "Complete" : \`\${progress.answered}/\${lesson.quizCount} answered\`}</p>
      <button type="button" onClick={start}>Start</button>
    </header>
  );
}

// file: src/LessonHeader.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonHeader, LessonHeaderBefore } from "./LessonHeader";

const lesson = { id: "3.4.2", title: "Effects and hooks", quizCount: 3 };

test.each([
  ["before", LessonHeaderBefore],
  ["after", LessonHeader],
])("%s: same output for the same props", (_name, Component) => {
  const { container, rerender } = render(<Component lesson={lesson} progress={{ answered: 1 }} track={() => {}} />);
  expect(container.innerHTML).toBe(
    '<header><h1>Effects and hooks</h1><p>1/3 answered</p><button type="button">Start</button></header>');
  rerender(<Component lesson={lesson} progress={{ answered: 3 }} track={() => {}} />);
  expect(screen.getByText("Complete")).toBeTruthy();
});

test.each([
  ["before", LessonHeaderBefore],
  ["after", LessonHeader],
])("%s: analytics fires once, on the first Start click", async (_name, Component) => {
  const track = vi.fn();
  render(<Component lesson={lesson} progress={{ answered: 0 }} track={track} />);
  await userEvent.click(screen.getByRole("button", { name: "Start" }));
  await userEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(track.mock.calls).toEqual([["lesson_started", { id: "3.4.2" }]]);
});`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/LessonHeader.test.tsx > before: same output for the same props
 ✓ src/LessonHeader.test.tsx > after: same output for the same props
 ✓ src/LessonHeader.test.tsx > before: analytics fires once, on the first Start click
 ✓ src/LessonHeader.test.tsx > after: analytics fires once, on the first Start click

 Test Files  1 passed (1)
      Tests  4 passed (4)`,
        pitfalls: [
          "Changing behaviour while 'just refactoring': moving analytics to the handler without the started guard would report every click, not the first",
          "Keeping a copied prop in state: the copy goes stale when the parent passes a new lesson unless something syncs it",
        ],
      },
    },
    intermediate: {
      title: "useFetch with cancellation",
      brief: ["Write a generic `useFetch<T>(url, validate)` returning a discriminated union state (loading/error/ok), aborting on URL change and unmount, and validating the JSON with a type guard (lesson 1.2.3)."],
      criteria: ["Abort on cleanup", "Typed result via guard", "Test with a mocked fetch: changing URL quickly shows only the latest result"],
      hints: ["vi.stubGlobal('fetch', vi.fn()) in Vitest."],
      solution: {
        text: ["Same structure as LessonDetail, generalised. In real apps prefer a data library, but writing this once teaches what those libraries do."],
        code: {
          lang: "tsx",
          code: `import { useEffect, useState } from "react";

export type FetchState<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ok"; data: T };

export function useFetch<T>(url: string, validate: (d: unknown) => d is T): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const data: unknown = await res.json();
        if (!validate(data)) throw new Error("Unexpected response shape");
        setState({ status: "ok", data });
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => ctrl.abort();
  }, [url, validate]);       // pass a stable validate (module-level function)
  return state;
}`,
        },
      },
    },
    challenge: {
      title: "useMediaQuery with useSyncExternalStore",
      brief: ["Implement `useMediaQuery(query)` that returns whether a CSS media query matches, using `useSyncExternalStore` (the recommended hook for subscribing to external stores), and use it to switch the sidebar layout."],
      criteria: ["Subscribes and unsubscribes correctly", "No tearing (uses useSyncExternalStore)", "Works for prefers-color-scheme and width queries"],
      hints: ["subscribe(callback) adds a 'change' listener on matchMedia(query); getSnapshot returns .matches."],
      solution: {
        text: ["useSyncExternalStore is built for exactly this: React reads a snapshot and re-renders when the store notifies. This app's router and store use the same hook."],
        code: {
          lang: "tsx",
          code: `import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

// const isDesktop = useMediaQuery("(min-width: 900px)");`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: hooks layer",
      brief: ["Add `web/src/hooks/` with useDebounce, useLocalStorage, useOnline and useMediaQuery plus tests. Use useDebounce in the lesson search and useLocalStorage for the theme."],
      criteria: ["Each hook has a test (fake timers for debounce)", "No eslint-plugin-react-hooks warnings", "Offline banner when navigator goes offline"],
      hints: ["renderHook from @testing-library/react tests hooks directly."],
      solution: {
        text: [
          "useDebounce and useLocalStorage are the hands-on versions. useOnline and useMediaQuery read browser state that changes outside React, so both use useSyncExternalStore: React subscribes, reads a snapshot (navigator.onLine, matchMedia(query).matches) and re-renders when the store notifies. The subscribe functions are module-level or memoised with useCallback so React does not resubscribe on every render.",
          "App wires them in: the search input stays instant while the list filters on the debounced value, the theme lives in localStorage (an effect copies it to <html data-theme>, which is outside React), the layout class follows the 900px media query, and OfflineBanner renders a status message when the browser fires 'offline'.",
          "Each hook has a test with renderHook: fake timers prove the debounce publishes only the last value at exactly 250 ms; the storage test includes corrupt JSON; the online test stubs navigator.onLine and dispatches an 'offline' event; the media-query test stubs matchMedia and checks the listener is removed on unmount. jsdom has no matchMedia, which is why it is stubbed.",
          "Verified with tsc (TypeScript 7.0.2), Vitest 5.0.5 + jsdom + Testing Library on React 19.3.1, and ESLint 9.39 with eslint-plugin-react-hooks 7.1.1 (recommended config) at --max-warnings=0: no warnings. Removing value from useDebounce's dependency list makes the same command fail with react-hooks/exhaustive-deps, so the check is real. typescript-eslint 8.71 does not yet accept TypeScript 7 as a peer, so the lint step used TypeScript 5.9 for parsing only.",
        ],
        code: {
          lang: "tsx",
          file: "web/src/hooks, OfflineBanner, App + tests, eslint.config.js",
          code: `// file: web/src/hooks/index.ts
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);                       // restart the timer on every change
  }, [value, ms]);
  return debounced;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;                                    // storage disabled or corrupt JSON
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or disabled */ }
  }, [key, value]);
  return [value, setValue] as const;
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

// file: web/src/components/OfflineBanner.tsx
import { useOnline } from "../hooks";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return <p role="status" className="offline-banner">You are offline. Progress is saved on this device and syncs when you reconnect.</p>;
}

// file: web/src/App.tsx
import { useEffect, useState } from "react";
import { useDebounce, useLocalStorage, useMediaQuery } from "./hooks";
import { OfflineBanner } from "./components/OfflineBanner";

const LESSONS = ["Semantic HTML", "Flexbox and grid", "DOM, events and fetch", "Effects and hooks"];

export function App() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);         // input stays instant; filtering waits

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);   // sync with the DOM outside React

  const visible = LESSONS.filter((t) => t.toLowerCase().includes(debouncedQuery.toLowerCase()));
  return (
    <div className={isDesktop ? "layout sidebar" : "layout stacked"}>
      <OfflineBanner />
      <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Theme: {theme}
      </button>
      <label>Search lessons <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <ul>{visible.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

// file: web/src/hooks/hooks.test.tsx
import { act, render, renderHook, screen } from "@testing-library/react";
import { useDebounce, useLocalStorage, useMediaQuery } from ".";
import { OfflineBanner } from "../components/OfflineBanner";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

test("useDebounce only publishes the last value after the delay", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebounce(v, 250), { initialProps: { v: "r" } });
  rerender({ v: "re" });
  rerender({ v: "react" });
  act(() => vi.advanceTimersByTime(249));
  expect(result.current).toBe("r");
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe("react");
});

test("useLocalStorage reads, writes and survives corrupt data", () => {
  localStorage.setItem("theme", JSON.stringify("dark"));
  const { result } = renderHook(() => useLocalStorage<"light" | "dark">("theme", "light"));
  expect(result.current[0]).toBe("dark");
  act(() => result.current[1]("light"));
  expect(localStorage.getItem("theme")).toBe('"light"');

  localStorage.setItem("broken", "{not json");
  expect(renderHook(() => useLocalStorage("broken", 1)).result.current[0]).toBe(1);
});

test("OfflineBanner appears when the browser goes offline", () => {
  const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  render(<OfflineBanner />);
  expect(screen.queryByRole("status")).toBeNull();
  onLine.mockReturnValue(false);
  act(() => { window.dispatchEvent(new Event("offline")); });
  expect(screen.getByRole("status").textContent).toMatch(/You are offline/);
});

test("useMediaQuery follows change events and unsubscribes on unmount", () => {
  let matches = false;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() { return matches; },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  const { result, unmount } = renderHook(() => useMediaQuery("(min-width: 900px)"));
  expect(result.current).toBe(false);
  matches = true;
  act(() => listeners.forEach((l) => l()));
  expect(result.current).toBe(true);
  unmount();
  expect(listeners.size).toBe(0);
  vi.unstubAllGlobals();
});

// file: web/src/App.test.tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

test("search is debounced and the theme persists", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  render(<App />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search lessons" }), { target: { value: "hooks" } });
  expect(screen.getAllByRole("listitem")).toHaveLength(4);          // not filtered yet
  act(() => vi.advanceTimersByTime(250));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Theme: light" }));
  expect(localStorage.getItem("theme")).toBe('"dark"');
  expect(document.documentElement.dataset.theme).toBe("dark");
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// file: web/eslint.config.js  (run: npx eslint --max-warnings=0 src)
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { files: ["src/**/*.{ts,tsx}"], languageOptions: { parser: tseslint.parser } },
  reactHooks.configs.flat.recommended,
);`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/hooks/hooks.test.tsx > useDebounce only publishes the last value after the delay
 ✓ src/hooks/hooks.test.tsx > useLocalStorage reads, writes and survives corrupt data
 ✓ src/hooks/hooks.test.tsx > OfflineBanner appears when the browser goes offline
 ✓ src/hooks/hooks.test.tsx > useMediaQuery follows change events and unsubscribes on unmount
 ✓ src/App.test.tsx > search is debounced and the theme persists

 Test Files  2 passed (2)
      Tests  5 passed (5)`,
        pitfalls: [
          "Defining subscribe inline without useCallback: useSyncExternalStore unsubscribes and resubscribes on every render",
          "Testing debounce with real timers and sleeps, which makes tests slow and flaky; fake timers make 249 ms vs 250 ms exact",
        ],
      },
    },
  },
  deeper: [
    { label: "react.dev: You Might Not Need an Effect", url: "https://react.dev/learn/you-might-not-need-an-effect" },
    { label: "react.dev: Synchronizing with Effects", url: "https://react.dev/learn/synchronizing-with-effects" },
    { label: "react.dev: Reusing Logic with Custom Hooks", url: "https://react.dev/learn/reusing-logic-with-custom-hooks" },
    { label: "react.dev: useSyncExternalStore", url: "https://react.dev/reference/react/useSyncExternalStore" },
  ],
  nextPreview: "Next: data fetching, routing and performance. Server state vs UI state, TanStack Query, React Router, and measuring before optimising.",
};
