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
        text: [
          "topic and page are read from useSearchParams, never copied into useState, so the URL is the single source of truth: a shared link opens the same view, and because setParams pushes a history entry, Back restores the previous topic and page. The page number is clamped so ?page=abc falls back to 1.",
          "The query key is ['news', topic, page], so every combination is cached separately. placeholderData: keepPreviousData keeps the last page rendered while the next one loads; isPlaceholderData dims the list, sets aria-busy and disables Next so users cannot skip ahead of the data, and isFetching shows an 'Updating…' status. TanStack Query passes an AbortSignal to queryFn, which the fetch uses so abandoned pages are cancelled. The response is validated with a type guard before it is trusted.",
          "The test replaces fetch with one that waits until the test answers, so it can assert the in-between screen: after clicking Next the URL is already ?topic=react&page=2 while page 1 is still visible with 'Updating…'. After switching topic and pressing Back, page 2 of react is shown immediately from the cache while a background refetch runs. Verified with tsc (TypeScript 7.0.2) and Vitest 5.0.5 + jsdom + Testing Library, using @tanstack/react-query 5.104 and react-router-dom 7.18 on React 19.3.1.",
        ],
        code: {
          lang: "tsx",
          file: "src/pages/NewsPage.tsx + src/pages/NewsPage.test.tsx",
          code: `// file: src/pages/NewsPage.tsx
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

export interface Story { objectID: string; title: string; url: string | null }
interface NewsPage { hits: Story[]; nbPages: number }
const TOPICS = ["react", "typescript", "dotnet"] as const;

function isNewsPage(d: unknown): d is NewsPage {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return Array.isArray(o.hits) && typeof o.nbPages === "number";
}

async function fetchNews(topic: string, page: number, signal: AbortSignal): Promise<NewsPage> {
  const qs = new URLSearchParams({ tags: "story", query: topic, page: String(page - 1) });  // API pages start at 0
  const res = await fetch(\`https://hn.algolia.com/api/v1/search?\${qs}\`, { signal });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const data: unknown = await res.json();
  if (!isNewsPage(data)) throw new Error("Unexpected response shape");
  return data;
}

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const topic = params.get("topic") ?? "react";                       // the URL is the state
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { data, isPending, isError, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["news", topic, page],
    queryFn: ({ signal }) => fetchNews(topic, page, signal),
    placeholderData: keepPreviousData,                                 // keep the old page on screen
  });

  const go = (next: { topic?: string; page?: number }) =>
    setParams({ topic: next.topic ?? topic, page: String(next.page ?? page) });   // push: Back works

  return (
    <main>
      <h1>News</h1>
      <label>Topic{" "}
        <select value={topic} onChange={(e) => go({ topic: e.target.value, page: 1 })}>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      {isPending && <p>Loading…</p>}
      {isError && <p role="alert">Could not load news: {error.message}</p>}
      {data && (
        <>
          <ol aria-busy={isPlaceholderData} style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
            {data.hits.map((s) => (
              <li key={s.objectID}><a href={s.url ?? \`https://news.ycombinator.com/item?id=\${s.objectID}\`}>{s.title}</a></li>
            ))}
          </ol>
          <nav aria-label="Pagination">
            <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>Previous</button>
            <span> Page {page} of {data.nbPages} </span>
            <button type="button" disabled={isPlaceholderData || page >= data.nbPages} onClick={() => go({ page: page + 1 })}>Next</button>
            {isFetching && <span role="status"> Updating…</span>}
          </nav>
        </>
      )}
    </main>
  );
}

// file: src/pages/NewsPage.test.tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { NewsPage } from "./NewsPage";

// Each fetch waits until the test resolves it, so we can look at the screen in between
const pending: { url: URL; resolve: () => void }[] = [];
vi.stubGlobal("fetch", (input: string) => new Promise<Response>((resolve) => {
  const url = new URL(input);
  const q = url.searchParams;
  const body = { nbPages: 3, hits: [{ objectID: q.get("page")!, title: \`\${q.get("query")} story p\${Number(q.get("page")) + 1}\`, url: null }] };
  pending.push({ url, resolve: () => resolve(new Response(JSON.stringify(body))) });
}));
async function respond() {                       // wait for the request, then answer it
  await vi.waitFor(() => expect(pending.length).toBeGreaterThan(0));
  await act(async () => pending.splice(0).forEach((p) => p.resolve()));
}

test("page and topic live in the URL, old page stays visible, Back restores", async () => {
  const user = userEvent.setup();
  const router = createMemoryRouter([{ path: "/news", element: <NewsPage /> }], { initialEntries: ["/news?topic=react&page=1"] });
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);

  expect(screen.getByText("Loading…")).toBeTruthy();
  await respond();
  expect(await screen.findByText("react story p1")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(router.state.location.search).toBe("?topic=react&page=2");
  expect(screen.getByRole("link").textContent).toBe("react story p1");     // no empty flash
  expect(screen.getByRole("status").textContent).toBe(" Updating…");
  await respond();
  expect(await screen.findByText("react story p2")).toBeTruthy();

  await user.selectOptions(screen.getByRole("combobox", { name: "Topic" }), "dotnet");
  expect(router.state.location.search).toBe("?topic=dotnet&page=1");
  await respond();
  expect(await screen.findByText("dotnet story p1")).toBeTruthy();

  await act(() => router.navigate(-1));                                     // browser Back
  expect(router.state.location.search).toBe("?topic=react&page=2");
  expect(screen.getByRole("link").textContent).toBe("react story p2");      // served from cache
  expect(pending.at(-1)?.url.searchParams.get("page")).toBe("1");           // background refetch of the same page
});`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/pages/NewsPage.test.tsx > page and topic live in the URL, old page stays visible, Back restores

 Test Files  1 passed (1)
      Tests  1 passed (1)`,
        pitfalls: [
          "Mirroring page into useState as well as the URL: the two drift and Back stops working",
          "Using setParams(..., { replace: true }) for pagination, which leaves no history entries for Back to restore",
        ],
      },
    },
    challenge: {
      title: "Measure and fix a slow list",
      brief: ["Render 10,000 glossary terms with a search box. Record a profile while typing. Fix it with (1) moving input state down / deferring with useDeferredValue, and (2) virtualisation. Report before/after timings."],
      criteria: ["Profiler screenshots or numbers before and after", "useDeferredValue or debounce for filtering", "Virtualised list"],
      hints: ["const deferred = useDeferredValue(query); filter with deferred."],
      solution: {
        text: [
          "SlowGlossary is the 'before': every keystroke filters 10,000 terms and React renders thousands of <li> synchronously, so the key press cannot paint until that work is done. FastGlossary applies both fixes. (1) useDeferredValue: the input renders from query immediately, while the memoised ResultList receives deferredQuery, which React updates in a lower-priority, interruptible render; the list is dimmed while it is stale. (2) Virtualisation with @tanstack/react-virtual: only the rows in the 480 px viewport plus 8 rows of overscan exist in the DOM.",
          "Measure, do not guess. measure.mjs builds on the production bundle (vite preview), throttles the CPU 4x through the Chrome DevTools Protocol, types 'quorum' one key every 120 ms and records each keydown's input-to-next-paint duration with the Event Timing API, the same data INP is built from. The React DevTools Profiler gives the same picture interactively; this script makes it repeatable.",
          "Results from three runs in this container (Chromium 141, React 19.3.1 production build, 4x throttling): before, the DOM held 10,000 <li> (4,000 after filtering) and keystrokes took 104-616 ms to paint, worst 456-616 ms per run. After, the DOM held 26 <li> throughout and every keystroke painted in 16-32 ms. Your absolute numbers will differ by machine; the ratio is what to report.",
        ],
        code: {
          lang: "tsx",
          file: "src/Glossary.tsx + src/main.tsx + measure.mjs",
          code: `// file: src/Glossary.tsx
import { memo, useDeferredValue, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface Term { id: number; term: string; def: string }

export function makeTerms(n: number): Term[] {
  const words = ["cache", "queue", "index", "shard", "token", "lease", "quorum", "replica", "schema", "vector"];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    term: \`\${words[i % 10]}-\${words[(i * 7) % 10]}-\${i}\`,
    def: \`Definition \${i}: how \${words[(i * 3) % 10]} relates to \${words[(i * 9) % 10]}.\`,
  }));
}

const filterTerms = (terms: Term[], q: string) => {
  const needle = q.trim().toLowerCase();
  return needle ? terms.filter((t) => t.term.includes(needle) || t.def.toLowerCase().includes(needle)) : terms;
};

// BEFORE: every keystroke filters and renders up to 10,000 <li> synchronously
export function SlowGlossary({ terms }: { terms: Term[] }) {
  const [query, setQuery] = useState("");
  const visible = filterTerms(terms, query);
  return (
    <section>
      <input aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{visible.length} terms</p>
      <ul>{visible.map((t) => <li key={t.id}><strong>{t.term}</strong> {t.def}</li>)}</ul>
    </section>
  );
}

// AFTER (1): the input updates urgently; the list renders from a deferred copy of the query
export function FastGlossary({ terms }: { terms: Term[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  return (
    <section>
      <input aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ResultList terms={terms} query={deferredQuery} stale={query !== deferredQuery} />
    </section>
  );
}

// memo: while typing, ResultList re-renders only when the deferred query catches up
const ResultList = memo(function ResultList({ terms, query, stale }: { terms: Term[]; query: string; stale: boolean }) {
  const visible = filterTerms(terms, query);
  const scrollRef = useRef<HTMLDivElement>(null);
  // AFTER (2): virtualisation, only the rows in view (plus overscan) exist in the DOM
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 28,
    overscan: 8,
  });
  return (
    <>
      <p>{visible.length} terms</p>
      <div ref={scrollRef} style={{ height: 480, overflow: "auto", opacity: stale ? 0.7 : 1 }}>
        <ul role="list" style={{ height: virtualizer.getTotalSize(), position: "relative", margin: 0 }}>
          {virtualizer.getVirtualItems().map((row) => {
            const t = visible[row.index];
            return (
              <li key={t.id} style={{ position: "absolute", top: 0, height: 28, transform: \`translateY(\${row.start}px)\` }}>
                <strong>{t.term}</strong> {t.def}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
});

// file: src/main.tsx
import { createRoot } from "react-dom/client";
import { FastGlossary, SlowGlossary, makeTerms } from "./Glossary";

const terms = makeTerms(10_000);
const fast = new URLSearchParams(location.search).get("mode") === "fast";
createRoot(document.getElementById("root")!).render(fast ? <FastGlossary terms={terms} /> : <SlowGlossary terms={terms} />);

// file: measure.mjs
// npm run build, then: CHROME_PATH=/path/to/chrome node measure.mjs   (npm i -D playwright-core)
import { chromium } from "playwright-core";
import { preview } from "vite";

const server = await preview({ preview: { port: 4343, strictPort: true } });   // serves dist/ (production React)
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

for (const mode of ["slow", "fast"]) {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });      // roughly a mid-range phone
  await page.goto(\`http://localhost:4343/?mode=\${mode}\`);
  await page.waitForSelector("li");
  const rowsBefore = await page.locator("li").count();

  // Event Timing API: input-to-next-paint duration of each keystroke (what INP is built from)
  await page.evaluate(() => {
    window.__durations = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.name === "keydown") window.__durations.push(e.duration);
    }).observe({ type: "event", durationThreshold: 16 });
  });
  await page.click("input");
  await page.keyboard.type("quorum", { delay: 120 });
  await page.waitForTimeout(1500);

  const d = await page.evaluate(() => window.__durations);
  const rowsAfter = await page.locator("li").count();
  console.log(\`\${mode}: <li> in DOM \${rowsBefore} -> \${rowsAfter}; keydown-to-paint ms: \${d.map(Math.round).join(", ")} (worst \${Math.max(...d)})\`);
  await page.close();
}
await browser.close();
server.httpServer.close();`,
        },
        pitfalls: [
          "Measuring in the dev build: development React is several times slower and exaggerates the problem",
          "Using useDeferredValue without memo on the expensive child, so the list still re-renders on every urgent keystroke",
          "Virtualised rows need a known or measured height; variable-height rows need the virtualizer's measureElement",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: routing and data layer",
      brief: ["Add React Router (/, /lessons/:id, /news, /settings lazy) and TanStack Query to the DevAtlas frontend with a typed api module. Implement optimistic 'mark complete'. Add a bundle-size check in CI."],
      criteria: ["All data via useQuery/useMutation", "Settings page code-split", "CI reports bundle size"],
      hints: ["`vite build` prints chunk sizes; a small script can fail if the main chunk exceeds a limit."],
      solution: {
        text: [
          "src/api/client.ts is the only place that knows URLs: each call validates the JSON with a type guard before returning a typed value, and the query keys live next to it so invalidation cannot miss a typo'd key. Pages never call fetch directly; reads go through useQuery and the completion toggle through useMutation. LessonPage is the basic-tier component switched to api.lesson and keys.lesson, and NewsPage is the intermediate-tier page.",
          "useSetCompleted is the optimistic update: onMutate cancels in-flight lesson queries (so a late refetch cannot overwrite the change), snapshots the cache, and writes the new value; onError restores the snapshot and the page shows a short alert; onSettled invalidates so the list re-syncs with the server either way. SettingsPage is a default export loaded with React.lazy behind Suspense, and the build emits it as its own chunk.",
          "check-bundle.mjs runs after vite build in CI: it finds the entry chunk from dist/index.html, prints the gzip size of every JS chunk and exits 1 when the entry is over BUNDLE_BUDGET_KB. On this app the build produced a separate 0.2 kB SettingsPage chunk and a 93.1 kB entry (React, React Router and TanStack Query); with BUNDLE_BUDGET_KB=50 the script failed with 'Bundle budget exceeded'.",
          "Verified with tsc (TypeScript 7.0.2; import.meta.env needs /// <reference types=\"vite/client\" /> in src/vite-env.d.ts, as Vite's template provides), Vitest 5.0.5 + jsdom + Testing Library, vite build 8.3.4 and the bundle script, with @tanstack/react-query 5.104 and react-router-dom 7.18 on React 19.3.1. The tests hold the PUT open until they release it, which proves the button flips before the server answers and flips back when the server returns 500. The workflow steps were not run on GitHub here.",
        ],
        code: {
          lang: "tsx",
          file: "web/src (api, pages, App, test) + scripts/check-bundle.mjs",
          code: `// file: web/src/api/client.ts
// Typed API module: every response is validated before the app trusts it
export interface LessonSummary { id: string; title: string; completed: boolean }
export interface LessonDetail extends LessonSummary { minutes: number; body: string }

const BASE = import.meta.env.VITE_API_URL ?? "/api";

function isLessonSummary(d: unknown): d is LessonSummary {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.title === "string" && typeof o.completed === "boolean";
}
function isLessonDetail(d: unknown): d is LessonDetail {
  return isLessonSummary(d) && typeof (d as unknown as Record<string, unknown>).minutes === "number";
}

async function request<T>(path: string, guard: (d: unknown) => d is T, init?: RequestInit): Promise<T> {
  const res = await fetch(\`\${BASE}\${path}\`, init);
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${path}\`);
  const data: unknown = await res.json();
  if (!guard(data)) throw new Error(\`Unexpected response shape for \${path}\`);
  return data;
}

const isLessonList = (d: unknown): d is LessonSummary[] => Array.isArray(d) && d.every(isLessonSummary);

export const api = {
  lessons: (signal?: AbortSignal) => request("/lessons", isLessonList, { signal }),
  lesson: (id: string, signal?: AbortSignal) => request(\`/lessons/\${encodeURIComponent(id)}\`, isLessonDetail, { signal }),
  setCompleted: (id: string, completed: boolean) =>
    request(\`/lessons/\${encodeURIComponent(id)}/completion\`, isLessonSummary, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }),
};

// Query keys in one place, so invalidation cannot miss a typo'd key
export const keys = {
  lessons: ["lessons"] as const,
  lesson: (id: string) => ["lessons", id] as const,
};

// file: web/src/pages/LessonsPage.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, keys, type LessonSummary } from "../api/client";

export function useSetCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.setCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: keys.lessons });            // a late refetch must not overwrite us
      const previous = qc.getQueryData<LessonSummary[]>(keys.lessons);
      qc.setQueryData<LessonSummary[]>(keys.lessons, (old) => old?.map((l) => (l.id === id ? { ...l, completed } : l)));
      return { previous };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(keys.lessons, ctx?.previous),   // roll back
    onSettled: () => qc.invalidateQueries({ queryKey: keys.lessons }),           // re-sync with the server
  });
}

export function LessonsPage() {
  const { data, isPending, isError, error } = useQuery({ queryKey: keys.lessons, queryFn: ({ signal }) => api.lessons(signal) });
  const setCompleted = useSetCompleted();

  if (isPending) return <p>Loading lessons…</p>;
  if (isError) return <p role="alert">Could not load lessons: {error.message}</p>;
  return (
    <main>
      <h1>Lessons</h1>
      {setCompleted.isError && <p role="alert">Could not save. Your change was undone.</p>}
      <ul>
        {data.map((l) => (
          <li key={l.id}>
            <Link to={\`/lessons/\${l.id}\`}>{l.title}</Link>{" "}
            <button type="button" aria-pressed={l.completed}
                    onClick={() => setCompleted.mutate({ id: l.id, completed: !l.completed })}>
              {l.completed ? "Completed" : "Mark complete"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

// file: web/src/pages/SettingsPage.tsx
export default function SettingsPage() {          // default export: required by React.lazy
  return <main><h1>Settings</h1><p>Theme, notifications and account options live here.</p></main>;
}

// file: web/src/App.tsx
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router-dom";
import { LessonsPage } from "./pages/LessonsPage";
import { LessonPage } from "./pages/LessonPage";
import { NewsPage } from "./pages/NewsPage";

const SettingsPage = lazy(() => import("./pages/SettingsPage"));     // its own chunk

export const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 2 } } });

export function App({ client }: { client: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <nav aria-label="Main"><Link to="/">Lessons</Link> <Link to="/news">News</Link> <Link to="/settings">Settings</Link></nav>
      <Suspense fallback={<p>Loading page…</p>}>
        <Routes>
          <Route path="/" element={<LessonsPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<p>Page not found</p>} />
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
}

// file: web/src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App, makeQueryClient } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App client={makeQueryClient()} /></BrowserRouter></StrictMode>,
);

// file: web/src/App.test.tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { App } from "./App";

let lessons = [{ id: "3.4.3", title: "Data fetching and routing", completed: false }];
let failNextPut = false;
let releasePut: () => void = () => {};

vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
  if (init?.method === "PUT") {
    await new Promise<void>((r) => { releasePut = r; });              // the test decides when the server answers
    if (failNextPut) return new Response("nope", { status: 500 });
    const { completed } = JSON.parse(String(init.body)) as { completed: boolean };
    lessons = lessons.map((l) => ({ ...l, completed }));
    return Response.json(lessons[0]);
  }
  return Response.json(url === "/api/lessons" ? lessons : { ...lessons[0], minutes: 80, body: "…" });
});

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={[path]}><App client={client} /></MemoryRouter>);
}

test("mark complete is instant, then confirmed by the server", async () => {
  renderAt("/");
  await userEvent.click(await screen.findByRole("button", { name: "Mark complete" }));
  expect(await screen.findByRole("button", { name: "Completed" })).toBeTruthy();   // before the server answered
  await act(async () => releasePut());
  expect(await screen.findByRole("button", { name: "Completed" })).toBeTruthy();
  expect(lessons[0].completed).toBe(true);
});

test("a failed save rolls back and explains", async () => {
  failNextPut = true;
  lessons = [{ ...lessons[0], completed: false }];
  renderAt("/");
  await userEvent.click(await screen.findByRole("button", { name: "Mark complete" }));
  expect(await screen.findByRole("button", { name: "Completed" })).toBeTruthy();
  await act(async () => releasePut());
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Mark complete" })).toBeTruthy();  // rolled back
});

test("settings is lazy-loaded behind Suspense", async () => {
  renderAt("/settings");
  expect(screen.getByText("Loading page…")).toBeTruthy();
  expect(await screen.findByRole("heading", { name: "Settings" })).toBeTruthy();
});

// file: web/scripts/check-bundle.mjs
// Run after \`vite build\`: prints gzip size of every JS chunk and fails if the entry chunk is over budget.
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 100);          // gzip budget for the entry chunk
const html = readFileSync("dist/index.html", "utf8");
const entry = html.match(/<script[^>]+src="[^"]*\\/assets\\/([^"]+\\.js)"/)?.[1];
if (!entry) throw new Error("entry chunk not found in dist/index.html");

let entryKb = 0;
for (const file of readdirSync("dist/assets").filter((f) => f.endsWith(".js")).sort()) {
  const kb = gzipSync(readFileSync(\`dist/assets/\${file}\`)).length / 1000;
  if (file === entry) entryKb = kb;
  console.log(\`\${file === entry ? "entry" : "chunk"}  \${kb.toFixed(1).padStart(7)} kB gzip  \${file}\`);
}
console.log(\`entry \${entryKb.toFixed(1)} kB / budget \${BUDGET_KB} kB\`);
if (entryKb > BUDGET_KB) {
  console.error(\`Bundle budget exceeded by \${(entryKb - BUDGET_KB).toFixed(1)} kB\`);
  process.exit(1);
}

# file: CI steps
      # .github/workflows/web.yml (steps, after npm ci)
      - run: npm test
      - run: npm run build
      - run: node scripts/check-bundle.mjs
        env: { BUNDLE_BUDGET_KB: "100" }`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/App.test.tsx > mark complete is instant, then confirmed by the server
 ✓ src/App.test.tsx > a failed save rolls back and explains
 ✓ src/App.test.tsx > settings is lazy-loaded behind Suspense

 Test Files  1 passed (1)
      Tests  3 passed (3)`,
        pitfalls: [
          "Skipping cancelQueries in onMutate: a refetch that started before the click can land afterwards and undo the optimistic value",
          "Invalidating only on success: after a rollback the cache may still be out of date with the server",
          "Importing SettingsPage statically anywhere else, which silently pulls it back into the entry chunk",
        ],
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
