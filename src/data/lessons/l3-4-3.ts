import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.3",
  title: "Data fetching, routing and performance",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["3.4.2 Hooks and effects done right"],
  summary: "Separate server state from UI state, fetch and cache data with TanStack Query, structure an app with React Router, share state with context sparingly, and fix real performance problems with measurement, memoisation, code splitting and virtualisation.",
  terms: [
    { term: "Server state", def: "Data that lives on the server (lessons, progress). Your UI holds a cached copy that can go stale." },
    { term: "UI state", def: "State that only exists in the browser: open menus, form drafts, selected tab." },
    { term: "Query cache", def: "A client-side cache of server responses keyed by a query key, with rules for freshness and refetching." },
    { term: "Mutation", def: "A request that changes server data (POST/PUT/DELETE), usually followed by updating or invalidating cached queries." },
    { term: "Client-side routing", def: "Changing the URL and rendering a different view without a full page reload." },
    { term: "Code splitting", def: "Loading parts of the JavaScript bundle on demand (React.lazy + dynamic import) instead of all up front." },
    { term: "Virtualisation", def: "Rendering only the visible rows of a long list." },
  ],
  problem: [
    "As DevAtlas grows, every page fetches its own data in effects. The same lessons are downloaded five times per session, navigating back shows a spinner instead of cached content, a 'mark complete' click takes a full round trip before the checkbox changes, and the first load downloads 1.4 MB of JavaScript for pages the user may never open.",
    "Production React apps solve these with a data-fetching layer, a router, code splitting and targeted performance work, guided by measurements rather than guesses.",
  ],
  concept: {
    analogy: [
      "Server state is like **a library book you borrowed**: your copy can be outdated, others can change the original, and you need rules for when to check for a newer edition. UI state is **your own notebook**: only you write in it. Mixing them up (copying the library book into your notebook and forgetting the original) causes most data bugs.",
    ],
    precise: [
      "**TanStack Query** (React Query) manages server state: `useQuery({ queryKey, queryFn })` caches by key, deduplicates identical requests, refetches stale data on window focus or reconnect, retries failures, and exposes loading/error/success. `useMutation` changes data and then invalidates or updates related queries; **optimistic updates** change the UI immediately and roll back on error.",
      "**Routing**: React Router maps URLs to components, with nested layouts, URL params (`/lessons/:id`) and search params (`?q=docker`) as state. Putting filters in the URL makes views shareable and back-button friendly.",
      "**Context** passes values deeply without prop drilling (theme, current user, locale). Every consumer re-renders when the value changes, so keep context for rarely changing data, not for fast-changing state.",
      "**Performance**: measure first (React DevTools Profiler, Lighthouse, Web Vitals). Typical wins: code-split routes, virtualise long lists, avoid unnecessary re-renders of expensive subtrees with `memo` + stable props, move state down closer to where it is used, and avoid huge dependencies.",
    ],
  },
  underTheHood: {
    text: [
      "TanStack Query stores each query's data, status and timestamps in a cache outside React. Components subscribe to it; a fetch updates the cache once and every subscribed component re-renders. `staleTime` says how long data is considered fresh (no refetch); `gcTime` how long unused data stays in memory.",
      "React re-renders a component when its state changes or its parent re-renders. `memo(Component)` skips re-rendering when props are shallowly equal; it only helps if props are stable (primitive values, or objects/functions memoised with useMemo/useCallback). React Compiler, where enabled, automates much of this memoisation.",
      "`lazy(() => import('./Settings'))` makes the bundler emit a separate chunk; React suspends rendering (showing a `<Suspense fallback>`) until the chunk loads.",
    ],
    diagram: {
      title: "Query cache flow",
      nodes: [
        { label: "useQuery(['lesson', id])", sub: "component A" },
        { label: "Cache", sub: "fresh? return. stale? refetch" },
        { label: "API", sub: "GET /lessons/:id" },
        { label: "Cache updated", sub: "" },
        { label: "A and B re-render", sub: "same data" },
      ],
      edges: ["", "miss/stale", "", "notify"],
    },
  },
  handsOn: [
    {
      title: "Set up TanStack Query and React Router",
      code: {
        lang: "bash",
        code: "npm install @tanstack/react-query react-router-dom",
      },
      notes: ["Check each library's docs for the current major version's API; the patterns below follow TanStack Query v5 and React Router's component-based routing."],
    },
    {
      title: "App shell: providers, routes, lazy pages",
      code: {
        lang: "tsx",
        file: "src/main.tsx",
        code: `import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LessonsPage } from "./pages/LessonsPage";
import { LessonPage } from "./pages/LessonPage";

const SettingsPage = lazy(() => import("./pages/SettingsPage"));   // separate chunk

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 2 } },     // fresh for 1 minute
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <nav><Link to="/">Lessons</Link> <Link to="/settings">Settings</Link></nav>
        <Suspense fallback={<p>Loading page…</p>}>
          <Routes>
            <Route path="/" element={<LessonsPage />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<p>Page not found</p>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);`,
      },
      notes: ["SettingsPage must be a default export for React.lazy. With BrowserRouter the server must serve index.html for unknown paths (or use HashRouter on static hosts without rewrite rules)."],
    },
    {
      title: "Queries with URL search params as state",
      code: {
        lang: "tsx",
        file: "src/pages/LessonsPage.tsx",
        code: `import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

interface LessonSummary { id: string; title: string; completed: boolean }

async function fetchLessons(q: string): Promise<LessonSummary[]> {
  const res = await fetch(\`/api/lessons?q=\${encodeURIComponent(q)}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

export function LessonsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";                           // the URL is the state

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["lessons", q],                               // cache per search term
    queryFn: () => fetchLessons(q),
  });

  return (
    <main>
      <input aria-label="Search lessons" value={q}
             onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} />
      {isPending && <p>Loading…</p>}
      {isError && <p role="alert">Failed: {error.message}</p>}
      {data && (data.length === 0 ? <p>No lessons found.</p> : (
        <ul>{data.map((l) => <li key={l.id}><Link to={\`/lessons/\${l.id}\`}>{l.title}</Link></li>)}</ul>
      ))}
    </main>
  );
}`,
      },
      notes: ["For typing-heavy search, debounce the value used in the query key (useDebounce from 3.4.2) while keeping the input itself instant."],
    },
    {
      title: "Optimistic mutation: instant 'mark complete'",
      code: {
        lang: "tsx",
        code: `import { useMutation, useQueryClient } from "@tanstack/react-query";

function useToggleComplete(q: string) {
  const qc = useQueryClient();
  const key = ["lessons", q];
  return useMutation({
    mutationFn: (id: string) => fetch(\`/api/lessons/\${id}/complete\`, { method: "POST" }).then((r) => {
      if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
    }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LessonSummary[]>(key);
      qc.setQueryData<LessonSummary[]>(key, (old) =>
        old?.map((l) => (l.id === id ? { ...l, completed: !l.completed } : l)));
      return { previous };                                   // context for rollback
    },
    onError: (_err, _id, ctx) => qc.setQueryData(key, ctx?.previous),   // roll back
    onSettled: () => qc.invalidateQueries({ queryKey: ["lessons"] }),  // re-sync with server
  });
}`,
      },
    },
    {
      title: "Performance: measure, then fix the real problem",
      code: {
        lang: "tsx",
        code: `import { memo, useMemo, useState } from "react";

// 1. Move fast-changing state down so it does not re-render the whole page
function SearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState("");                    // typing re-renders only this
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => onSearch(draft)} />;
}

// 2. Memoise an expensive child whose props are stable
const Chart = memo(function Chart({ points }: { points: number[] }) {
  /* expensive SVG rendering */
  return <svg aria-label={\`\${points.length} points\`} />;
});

function Dashboard({ attempts }: { attempts: { score: number }[] }) {
  const points = useMemo(() => attempts.map((a) => a.score), [attempts]);   // stable reference
  return <Chart points={points} />;
}

// 3. Virtualise long lists (e.g. 10,000 glossary terms) with a library such as
//    @tanstack/react-virtual: only ~20 visible rows exist in the DOM at a time.`,
      },
      notes: ["Use React DevTools → Profiler → 'Highlight updates when components render' to see what re-renders. Optimise the components that the profiler shows are slow, not everything."],
    },
  ],
  companies: [
    "**Server-state libraries are standard** in modern React stacks (TanStack Query, SWR, RTK Query, Apollo for GraphQL) or are built into frameworks (Next.js data fetching, React Router loaders).",
    "**Route-based code splitting** keeps initial bundles small; companies set bundle-size budgets in CI (e.g. failing a PR that grows the main chunk past a threshold).",
    "**Core Web Vitals** (LCP, INP, CLS) are tracked from real users (RUM) because they correlate with conversion and are used by Google as search ranking signals; performance work is prioritised from that data.",
  ],
  mistakes: [
    { mistake: "Copying server data into useState", why: "Wanting to edit or filter it locally", wrong: "Stale copies that never update; manual sync bugs", fix: "Keep server data in the query cache; derive views from it; local state only for drafts" },
    { mistake: "Putting everything in one global context", why: "Avoiding prop drilling", wrong: "Every consumer re-renders on every change; slow apps", fix: "Context for rarely changing values; colocate state; split contexts" },
    { mistake: "Premature memoisation everywhere", why: "Fear of re-renders", wrong: "Harder code with little or negative benefit", fix: "Profile first; memoise measured hotspots" },
    { mistake: "Filters only in component state", why: "Simplest", wrong: "Refresh loses the view; links cannot be shared; back button surprises", fix: "Store filters and pagination in URL search params" },
    { mistake: "Rendering 10,000 rows", why: "It worked with 50 rows in dev", wrong: "Slow first render and janky scrolling", fix: "Paginate or virtualise" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Server state in a query library with sensible staleTime and retry; mutations invalidate affected queries." },
    { tag: "Performance", text: "Code-split routes and heavy components; virtualise long lists; set bundle budgets." },
    { tag: "Maintainability", text: "URL as the source of truth for navigation-related state (filters, tabs, pagination)." },
    { tag: "Performance", text: "Measure with the Profiler and Web Vitals before optimising; fix the largest cost first." },
  ],
  interview: [
    { q: "Server state vs client state?", a: "Server state is owned by the backend and cached in the client; it can be stale, shared and changed by others, so it needs fetching, caching, invalidation and retry logic. Client (UI) state lives only in the browser. Treating them separately avoids stale copies; libraries like TanStack Query manage server state." },
    { q: "How do optimistic updates work?", a: "Before the server responds, update the cached data to the expected result so the UI reacts instantly; keep the previous value; on error, restore it and show a message; finally refetch or invalidate to reconcile with the server." },
    { q: "A React page is slow. How do you investigate?", a: "Reproduce with production builds, record with React DevTools Profiler to find components that render often or slowly, and with browser Performance tools for long tasks and layout. Then fix the biggest cause: move state down, memoise expensive pure components with stable props, virtualise lists, split code, or reduce work in render." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Two components call useQuery({ queryKey: ['lesson', '3.4.3'], ... }) at the same time. How many network requests happen?",
      options: ["Two", "One (deduplicated, shared cache)", "Zero", "It depends on React version"],
      answer: 1,
      explanation: "Identical keys share one in-flight request and one cache entry.",
    },
    {
      kind: "bug",
      prompt: "memo(Chart) still re-renders on every parent render. Why?",
      code: { lang: "tsx", code: "const Chart = memo(ChartImpl);\nfunction Page({ attempts }) {\n  return <Chart points={attempts.map((a) => a.score)} />;\n}" },
      options: ["memo does not work with SVG", "points is a new array every render, so props are never equal", "Chart needs a key", "memo only works with classes"],
      answer: 1,
      explanation: "Memoise the derived array with useMemo (or pass stable data) so the shallow comparison succeeds.",
    },
    {
      kind: "mcq",
      prompt: "Where should the 'level' filter for the lessons list live so users can share the filtered view?",
      options: ["useState in the list", "A global context", "The URL search params", "localStorage"],
      answer: 2,
      explanation: "URL state survives reloads, works with back/forward and can be shared.",
    },
  ],
  cheatSheet: [
    "Server state → query library; UI state → useState near its use.",
    "useQuery({ queryKey, queryFn }) caches, dedupes, retries, refetches.",
    "useMutation + invalidateQueries; optimistic onMutate/onError rollback.",
    "Routes with React Router; params and search params as state.",
    "lazy() + Suspense for route-level code splitting.",
    "Context for slow-changing global values only.",
    "Profile first; memo needs stable props; virtualise long lists.",
  ],
  homework: {
    basic: {
      title: "Convert a fetch effect to useQuery",
      brief: ["Replace the LessonDetail fetch effect from 3.4.2 with useQuery keyed by lesson id, with loading/error/success states. Navigate between lessons and back: observe instant cached display."],
      criteria: ["No useEffect for fetching", "queryKey includes the id", "Back navigation shows cached data"],
      hints: ["const { id } = useParams();"],
      solution: {
        text: ["The component becomes shorter and gains caching, deduplication and retries."],
        code: {
          lang: "tsx",
          code: `import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

export function LessonPage() {
  const { id = "" } = useParams();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const res = await fetch(\`/api/lessons/\${id}\`);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return (await res.json()) as { id: string; title: string };
    },
    enabled: id !== "",
  });
  if (isPending) return <p>Loading…</p>;
  if (isError) return <p role="alert">{error.message}</p>;
  return <h1>{data.title}</h1>;
}`,
        },
      },
    },
    intermediate: {
      title: "Paginated news with URL state",
      brief: ["Build /news with ?page= and ?topic= in the URL, fetching with useQuery and keeping the previous page visible while the next loads (placeholderData: keepPreviousData in v5)."],
      criteria: ["URL reflects page and topic", "Back button restores the previous view", "No flash of empty content between pages"],
      hints: ["import { keepPreviousData } from '@tanstack/react-query'."],
      solution: {
        text: ["Query key ['news', topic, page]; placeholderData: keepPreviousData shows the old page with an 'updating' indicator until the new one arrives; setSearchParams drives navigation."],
      },
    },
    challenge: {
      title: "Measure and fix a slow list",
      brief: ["Render 10,000 glossary terms with a search box. Record a profile while typing. Fix it with (1) moving input state down / deferring with useDeferredValue, and (2) virtualisation. Report before/after timings."],
      criteria: ["Profiler screenshots or numbers before and after", "useDeferredValue or debounce for filtering", "Virtualised list"],
      hints: ["const deferred = useDeferredValue(query); filter with deferred."],
      solution: {
        text: ["useDeferredValue keeps typing responsive by letting React render the expensive filtered list at lower priority; virtualisation cuts the DOM from 10,000 rows to the visible ~20. Together they typically turn sluggish typing into instant feedback."],
      },
    },
    capstone: {
      title: "DevAtlas: routing and data layer",
      brief: ["Add React Router (/, /lessons/:id, /news, /settings lazy) and TanStack Query to the DevAtlas frontend with a typed api module. Implement optimistic 'mark complete'. Add a bundle-size check in CI."],
      criteria: ["All data via useQuery/useMutation", "Settings page code-split", "CI reports bundle size"],
      hints: ["`vite build` prints chunk sizes; a small script can fail if the main chunk exceeds a limit."],
      solution: {
        text: ["With routes, queries and code splitting in place, the frontend architecture matches what most production React apps use; the remaining lessons focus on security and the backend it talks to."],
      },
    },
  },
  deeper: [
    { label: "TanStack Query docs", url: "https://tanstack.com/query/latest/docs/framework/react/overview" },
    { label: "React Router docs", url: "https://reactrouter.com/" },
    { label: "react.dev: lazy", url: "https://react.dev/reference/react/lazy" },
    { label: "react.dev: memo", url: "https://react.dev/reference/react/memo" },
  ],
  nextPreview: "Next: frontend security and performance. XSS, CORS, CSP and Core Web Vitals.",
};
