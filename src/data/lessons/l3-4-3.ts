import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.3",
  title: "Data fetching, routing and performance",
  minutes: 110,
  level: "Intermediate",
  prerequisites: ["3.4.2 Hooks and effects done right"],
  summary: "Separate server state from UI state, choose a fetching pattern, handle loading/error/empty, cancel races, structure routes, split bundles, memoise only what measurement justifies, virtualise long lists, and prove it with browser performance tools.",
  terms: [
    { term: "Server state", def: "Data owned by the backend (lessons, progress, news). Your UI holds a cached copy that can be stale and can change without you." },
    { term: "UI state", def: "State that only exists in the browser: an open menu, a hovered row, a selected tab, an input draft." },
    { term: "URL state", def: "State encoded in the address: path params (/lessons/3.4.3), search params (?q=docker&page=2) and the history entry. Shareable, reload-safe and Back-button aware." },
    { term: "Query cache", def: "A client-side store of responses keyed by a query key, with rules for freshness, deduplication, retries and garbage collection." },
    { term: "Fresh vs stale", def: "`staleTime` is how long cached data is trusted without a refetch. Fresh data renders instantly with no request; stale data renders instantly and refetches in the background." },
    { term: "Cache lifetime", def: "`gcTime` (v5; formerly cacheTime) is how long an unused cache entry stays in memory before it is collected. It is not the same clock as `staleTime`." },
    { term: "Mutation", def: "A request that changes server data (POST/PUT/PATCH/DELETE). It must invalidate or update the queries it affects, and may update optimistically." },
    { term: "Request waterfall", def: "A chain where each request starts only after the previous one finishes (parent data, then child data). Three 150 ms hops cost ~450 ms even though nothing is slow." },
    { term: "Client-side routing", def: "Changing the URL and rendering another view without a full document load, so app state and scroll position survive navigation." },
    { term: "History API", def: "`pushState`/`replaceState` add or replace history entries and `popstate` fires on Back/Forward. Hash routing uses `location.hash` plus `hashchange` instead." },
    { term: "Code splitting", def: "Emitting separate JavaScript chunks and loading them on demand with dynamic `import()`, usually per route or per heavy component." },
    { term: "Virtualisation", def: "Rendering only the rows near the viewport and positioning them in a tall scroll container, so 10,000 rows cost ~20 DOM nodes." },
  ],
  problem: [
    "As DevAtlas grows, every page fetches its own data in an effect. The same lessons are downloaded five times per session, navigating back shows a spinner instead of cached content, a 'mark complete' click waits for a round trip before the checkbox moves, and a fast typist sees results for an old query because the slowest response won. The first load also ships 1.4 MB of JavaScript, including the settings page and a chart library most users never open.",
    "None of those bugs is a React bug. They are ownership bugs (server data copied into component state), lifecycle bugs (requests that outlive the screen that started them), and cost bugs (work done up front that should be done on demand). Production apps fix them with an explicit data layer, URL-driven routing, route-level splitting and measurement, not with more `useEffect` and more `memo`.",
  ],
  concept: {
    analogy: [
      "Server state is **a library book you borrowed**: your copy can be outdated, other people can change the original, and you need rules for when to check for a newer edition. UI state is **your own notebook**: only you write in it. Copying the library book into your notebook and then editing the notebook is how teams end up with two versions of the truth.",
      "Fetching is **ordering at a restaurant**. Fetch-on-render is sitting down, reading the menu, then telling the kitchen (every course waits for the previous one). Fetch-then-render is ordering the whole meal at once and waiting before anyone sits. Render-as-you-fetch is ordering as you walk in, so the table and the food arrive together. Caching is the kitchen remembering that the table always starts with the same dish.",
    ],
    precise: [
      "**State has an owner, and the owner decides the lifetime.** Server state is authoritative on the backend, shared, and can change while you look at it; keep it in a query cache keyed by what identifies it (`[\"lesson\", id]`) and let the library handle fetching, deduplication, retries, refetch-on-focus and garbage collection. UI state is local and disposable: keep it in the nearest component with `useState`/`useReducer`. Navigation state (filters, tabs, pagination, selected id) belongs in the URL, so reload, Back/Forward and shared links reproduce the exact view. Derived values (filtered lists, counts) are computed during render, never stored.",
      "**TanStack Query** (React Query) is the reference implementation most teams copy: `useQuery({ queryKey, queryFn })` returns `data`, `isPending`, `isError`, `error`, `isFetching`; `staleTime` marks how long data is fresh; `gcTime` controls memory; `placeholderData: keepPreviousData` keeps the old page visible while the next loads; `useMutation` changes data and then invalidates or patches affected queries. Optimistic updates write the expected result in `onMutate` (after `cancelQueries`, so a late refetch cannot overwrite it), snapshot the previous cache, roll back in `onError`, and reconcile in `onSettled`. The same ideas exist in SWR, RTK Query, Apollo and framework loaders.",
      "**Fetching has a shape.** Fetch-on-render (start in `useEffect`, set state when it lands) is the simplest and the slowest: the request starts after paint and child components cannot start until the parent's data arrives, producing a waterfall. Fetch-then-render (a router loader or `Promise.all` before rendering) parallelises requests for a route but delays navigation. Render-as-you-fetch starts requests on intent (hover, link preload, navigation start) and renders immediately with Suspense or cached data, which is the best perceived performance but needs a real cache and error boundaries. Whatever you choose, model four outcomes explicitly: pending (including background refetch), error (retryable, with a message), empty (a valid response with zero rows) and success.",
      "**Performance is a budget, not a virtue.** A bundle contains your code plus every dependency you import, before minification and compression; a heavy chart or date library imported by one route should not sit on the critical path. Split at route boundaries and preload the likely next chunk. During render, the expensive parts are usually long lists and unnecessary subtree re-renders, so virtualise and move state down before reaching for `memo`. `React.memo` only skips work when props are referentially stable, so an inline array or function defeats it. Measure in a production build with the React DevTools Profiler and the browser Performance panel, and confirm with field Web Vitals (LCP, INP, CLS); optimising what you have not measured is how teams make code harder and slower at the same time.",
    ],
  },
  underTheHood: {
    text: [
      "**1. Two clocks, one cache.** A query cache entry has a data timestamp and an observer count. `staleTime` compares the timestamp to now: fresh means return immediately and do not refetch; stale means return immediately *and* refetch in the background. `gcTime` starts when the last component unsubscribes, so leaving a page does not instantly discard its data: coming back inside the window shows the cached copy while a refetch runs. Identical keys share one in-flight promise, which is why two components asking for the same lesson produce one request. The cache is keyed by serialisable values, so `[\"lessons\", q]` creates a separate entry per search term and makes Back/Forward instant.",
      "**2. Fetch-on-render and the waterfall.** With `useEffect`, the browser paints, the effect runs, `fetch` starts, the response arrives, `setState` schedules a render. A child that needs the parent's id cannot even begin until that cycle completes. Chain three levels and the user waits for three sequential round trips; on a 4G phone at 150 ms each, that is 450 ms plus render time for data that could have loaded in parallel. Fetch-then-render removes the *within-route* waterfall by starting all requests together in a loader (or `Promise.all`) before rendering. Render-as-you-fetch removes the wait entirely on repeat visits: the cache already has data, and a background refetch confirms it.",
      "**3. Three caches, not one.** The HTTP cache (`Cache-Control`, `ETag`/`If-None-Match`, `Vary`, `stale-while-revalidate`) lives in the browser and CDN and answers repeat requests without your JavaScript running. A service worker adds another layer you control. The query cache lives in memory and survives route changes but not a reload. They solve different problems: HTTP caching makes a *response* reusable; the query cache makes a *rendered view* instant and coordinates components. The real HN Algolia response in the hands-on sends no `Cache-Control`, so the browser has no explicit freshness guidance and the client cache is what makes navigation feel instant.",
      "**4. Four states, and only one of them is success.** `isPending` means no data yet (show a skeleton sized like the result, to avoid layout shift). `isError` means the request failed (show the reason and a retry, not a blank page). `data` with `length === 0` is empty, which is a valid answer and needs its own copy ('No lessons match **docker**') plus a way to clear filters. `isFetching` with existing data is a background refresh: keep the content, dim it or show 'Updating…', and do not unmount the list. Errors inside render are different from failed requests: a query error belongs next to the query, while a thrown render error needs an error boundary (or a route `errorElement`).",
      "**5. Cancellation and races.** A response is not applied in the order requests were sent; it is applied in the order it arrives. Type `react`, then delete to `re`: if the `react` request is slower, it lands last and overwrites the newer results. The fix is to cancel the superseded request with an `AbortController` and ignore `AbortError` (a cancelled request is not a failure). TanStack Query passes an `AbortSignal` to `queryFn`, cancels when the last observer unmounts, and never lets an older request for the same key overwrite a newer one; `cancelQueries` in `onMutate` prevents an in-flight refetch from undoing an optimistic change. For APIs you cannot abort, guard with a request id or a sequence counter and discard stale answers. Aborting is a client-side courtesy: the server usually still finishes the work, so make `GET` cheap and `PUT` idempotent.",
      "**6. Routing is a state machine over history.** `BrowserRouter` calls `history.pushState` on navigation, which changes the URL without a document request, and listens for `popstate` to render the entry the user returned to. Because the server never sees those paths, production must serve `index.html` for unknown routes (SPA fallback) or every refresh is a 404. `HashRouter` stores the route after `#`, so it works on static hosts with no rewrite rules, at the cost of uglier URLs, weaker analytics and anchors that compete with the route. Nested routes render a layout once and swap an `<Outlet />`, so a sidebar does not remount on every child navigation. Params (`useParams`) and search params (`useSearchParams`) are inputs, not state you copy; write them with `setParams` so each change is a history entry unless you choose `{ replace: true }`.",
      "**7. A bundle is a dependency graph with a delivery bill.** Vite walks imports from the entry, tree-shakes unused exports, minifies, and emits chunks; gzip or Brotli then compresses the bytes on the wire. Cost comes from big dependencies (charting, editors, date libraries, icon packs), barrel files that re-export an entire package, duplicate copies of the same library at different versions, polyfills, and code that is only needed after login. `lazy(() => import(...))` turns a static edge into a separate chunk fetched on demand, usually at a route boundary. Splitting does not reduce total bytes; it moves them off the initial critical path. A chunk is only useful if nothing else statically imports the same module, and an extra chunk is a wasted round trip if it is tiny and always needed.",
      "**8. Re-rendering is cheap until it is not.** React re-renders a component when its own state changes or its parent renders; it then reconciles the returned tree. `memo(Component)` skips the render when props are shallowly equal, which only helps if the parent passes stable primitives, or objects/functions whose identity is preserved by `useMemo`/`useCallback`. `useMemo` caches a computed value, not a render. The costs of premature memoisation are real: extra memory, comparison work on every render, dependency arrays that hide bugs, stale closures, and code that is harder to read, all while the actual bottleneck (a 10,000-row list or a 300 kB chart) remains. State colocation and `useDeferredValue` often beat memoisation for input responsiveness, and React Compiler automates much of this where enabled.",
      "**9. Virtualisation and measurement are the same skill.** A virtualiser keeps a tall spacer element and renders only the rows intersecting the viewport plus overscan, positioning them with transforms. That turns thousands of DOM nodes into dozens, cutting layout, paint and memory at once. But it changes semantics: browser find, Ctrl+A, screen-reader row counts and focus can break unless you add `aria-rowcount`/`aria-setsize`, keep focus stable and measure variable row heights. Measure with the right tool for the question: React DevTools Profiler for which components rendered and why; the Performance panel for long tasks over 50 ms, scripting versus layout versus paint; Network for transfer size and cache hits; Coverage for unused JavaScript; Lighthouse for a lab score with caveats; and `PerformanceObserver`/Web Vitals for what real users experienced. Always measure a production build with CPU throttling, because development React is several times slower.",
    ],
    diagram: {
      title: "One navigation: route, cache, request, paint",
      nodes: [
        { label: "Navigate", sub: "pushState /lessons/3.4.3" },
        { label: "Route match", sub: "+ lazy chunk" },
        { label: "Query cache", sub: "fresh? stale? missing?" },
        { label: "GET /api/lessons/3.4.3", sub: "signal attached" },
        { label: "Render", sub: "pending → data / empty / error" },
        { label: "Paint + measure", sub: "Profiler, Performance" },
      ],
      edges: ["match", "hit or miss", "miss / stale", "cache write", "subscribe"],
      caption: "A cache hit skips the request entirely; a miss costs one round trip and one render. Abort the request if the user navigates away before it lands.",
    },
  },
  handsOn: [
    {
      title: "Read a real response as four UI states",
      text: [
        "Start with the contract, not the component. This script calls the public Hacker News Algolia API three ways: a normal search, a valid search with no matches, and a bad path. Run it with `node fetch-states.mjs` (Node 18+ has global `fetch`).",
      ],
      code: {
        lang: "js",
        file: "fetch-states.mjs",
        code: `const BASE = "https://hn.algolia.com/api/v1/search";

async function get(url) {
  const t0 = performance.now();
  const res = await fetch(url);
  const ms = Math.round(performance.now() - t0);
  return { res, ms };
}

// 1. success: status, headers and a body excerpt
{
  const { res, ms } = await get(\`\${BASE}?tags=story&query=react&hitsPerPage=3\`);
  const body = await res.json();
  console.log(\`success  status=\${res.status}  \${ms}ms\`);
  console.log(\`         content-type=\${res.headers.get("content-type")}\`);
  console.log(\`         cache-control=\${res.headers.get("cache-control")}\`);
  console.log(\`         nbHits=\${body.nbHits}  returned=\${body.hits.length}\`);
  for (const hit of body.hits) console.log(\`         - \${hit.title}\`);
}

// 2. empty: a valid request with no matches is not an error
{
  const { res, ms } = await get(\`\${BASE}?tags=story&query=zzzqqqxxxyyy\`);
  const body = await res.json();
  console.log(\`empty    status=\${res.status}  \${ms}ms  nbHits=\${body.nbHits}  hits=\${body.hits.length}\`);
}

// 3. error: a bad path returns HTML, not JSON
{
  const { res, ms } = await get("https://hn.algolia.com/api/v1/nope");
  const text = await res.text();
  console.log(\`error    status=\${res.status}  \${ms}ms  ok=\${res.ok}\`);
  console.log(\`         body starts: \${text.replace(/\\s+/g, " ").slice(0, 64)}\`);
}`,
      },
      output: "success  status=200  771ms\n         content-type=application/json\n         cache-control=null\n         nbHits=305237  returned=3\n         - Relicensing React, Jest, Flow, and Immutable.js\n         - Build Your Own React\n         - Shopify is moving from React Native back to Swift and Kotlin\nempty    status=200  555ms  nbHits=0  hits=0\nerror    status=404  397ms  ok=false\n         body starts: <!doctype html> <html lang=en> <title>404 Not Found</title> <h1>",
      notes: [
        "Captured on this machine; timings and `nbHits` change over time, but the shapes do not. The empty case returns **200** with zero hits: in the UI that is an empty state, not an error. The 404 returns HTML, so calling `res.json()` on it would throw a parse error that hides the real status; check `res.ok` first.",
        "`cache-control` is absent, so the browser has no explicit freshness rule and may revalidate heuristically. That is exactly why a client cache with `staleTime` matters: it gives you a policy the server did not.",
        "In React the same contract becomes `useQuery`: `isPending` before data, `isError` + retry on failure, `data.length === 0` for empty, and `isFetching` for a background refresh with data already on screen.",
      ],
    },
    {
      title: "Reproduce a race, then cancel it",
      text: [
        "This script starts a slow search for `react`, then a fast one for `re` 20 ms later, the way a user typing and deleting would. The delays come from a local server so the race is deterministic; the HTTP, the abort and the timings are real. Run `node race.mjs`.",
      ],
      code: {
        lang: "js",
        file: "race.mjs",
        code: `import { createServer } from "node:http";

const server = createServer((req, res) => {
  const q = new URL(req.url, "http://local").searchParams.get("q") ?? "";
  const delay = q === "react" ? 400 : 40;          // the first search is slower
  setTimeout(() => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ q, delay }));
  }, delay);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = \`http://127.0.0.1:\${server.address().port}\`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(q, signal) {
  const res = await fetch(\`\${base}/search?q=\${q}\`, { signal });
  return (await res.json()).q;
}

// 1. No cancellation: whichever response arrives last wins.
{
  const applied = [];
  const run = (q) => search(q).then((value) => applied.push(value));
  const first = run("react");
  await sleep(20);                                  // the user types another key
  const second = run("re");
  await Promise.all([first, second]);
  console.log(\`no abort   applied=[\${applied.join(", ")}]  final="\${applied.at(-1)}"\`);
}

// 2. One controller per request; a new keystroke aborts the previous one.
{
  const applied = [];
  let controller = new AbortController();
  const run = async (q) => {
    try {
      applied.push(await search(q, controller.signal));
    } catch (err) {
      console.log(\`aborted    "\${q}" rejected with \${err.name}: \${err.message}\`);
    }
  };
  const first = run("react");
  await sleep(20);
  controller.abort();                               // supersede the old request
  controller = new AbortController();               // the next request gets a fresh signal
  const second = run("re");
  await Promise.all([first, second]);
  console.log(\`with abort applied=[\${applied.join(", ")}]  final="\${applied.at(-1)}"\`);
}

// 3. A deadline is the same mechanism with a timer.
{
  try {
    await search("react", AbortSignal.timeout(100));
  } catch (err) {
    console.log(\`timeout    \${err.name}: \${err.message}\`);
  }
}

server.close();`,
      },
      output: "no abort   applied=[re, react]  final=\"react\"\naborted    \"react\" rejected with AbortError: This operation was aborted\nwith abort applied=[re]  final=\"re\"\ntimeout    TimeoutError: The operation was aborted due to timeout",
      notes: [
        "The stale request did not fail; it was simply slower, and last-write-wins made it the truth. This is the classic search-as-you-type bug, and it also happens when navigating quickly between two detail pages that both write into the same state.",
        "Treat `AbortError` as expected control flow, not as an error to display. A `TimeoutError` is different: the request was abandoned because a deadline passed, so it may deserve a retry.",
        "In TanStack Query, use the `signal` it passes to `queryFn` (`queryFn: ({ signal }) => fetch(url, { signal })`) and call `cancelQueries({ queryKey })` before an optimistic write. For APIs without abort support, keep a request id and ignore any response whose id is no longer current.",
      ],
    },
    {
      title: "Put each kind of state in its place",
      text: [
        "Most 'React state bugs' are ownership mistakes. Use this table before writing code: if the value has an owner outside the component, the component should not own it.",
      ],
      code: {
        lang: "text",
        file: "state-and-fetching.txt",
        code: `STATE              OWNER              LIFETIME                    WHERE IT GOES
server data        backend            until invalidation / gc     query cache, keyed by identity
navigation view    URL + history      until Back or reload        path param / search param
local UI           component          until unmount               useState in the nearest owner
form draft         form               until submit or reset       useState / form library
global UI          app                session                     context or store (rarely changes)

FETCH PATTERN       REQUEST STARTS          WATERFALL RISK   TRADE-OFF
fetch-on-render     after paint (effect)    high             simplest; spinners; cancel by hand
fetch-then-render   before render (loader)  low in a route   blocks navigation until data
render-as-you-fetch on intent / navigation  none with cache  needs cache + Suspense boundaries

RULE OF THUMB  ->  cache first, URL second, component state last.
DERIVE         ->  filtered lists and counts are computed in render, never stored.`,
      },
      notes: [
        "TanStack Query's `useQuery` behaves like render-as-you-fetch on a cache hit and like fetch-on-render on a miss, but it deduplicates and caches, so it does not multiply requests.",
        "Putting `page`, `q`, `topic` and `tab` in the URL is not just for sharing: it makes Back/Forward correct for free and removes a whole class of 'state got out of sync' bugs.",
      ],
    },
    {
      title: "Draw the route → cache → render path",
      text: [
        "Before debugging a slow navigation, draw what should happen. This is the minimal correct path for `/lessons/3.4.3`; make your own diagram match your app, including the lazy chunk and the error branch.",
      ],
      code: {
        lang: "mermaid",
        file: "navigation.mmd",
        code: `flowchart TD
  A["Click a Link"] --> B["pushState /lessons/3.4.3"]
  B --> C{"Route matches?"}
  C -->|no| D["404 element"]
  C -->|yes| E{"Cache entry fresh?"}
  E -->|yes| F["Render cached data"]
  E -->|no| G["GET /api/lessons/3.4.3 (with signal)"]
  G --> H{"res.ok?"}
  H -->|yes| I["Write cache, render data"]
  H -->|no| J["Error element + retry"]
  F --> K["Background refetch if stale"]
  I --> L["Paint and measure"]
  K --> L`,
      },
      notes: [
        "If your diagram has a box labelled 'spinner' between every pair of boxes, you have a waterfall. If it has no cache box, every Back press is a network request.",
        "Open DevTools → Network, navigate, then press Back. A cache hit should produce **no** document request and no JSON request; only a background revalidation is acceptable.",
      ],
    },
    {
      title: "Measure what code splitting actually buys",
      text: [
        "Build a tiny app twice: once with a static import of a settings page that renders a chart, once with `lazy(() => import(...))`. Same source, same dependencies, one changed import. Vite's report prints the real chunk sizes.",
      ],
      code: {
        lang: "jsx",
        file: "src/App.jsx (before and after)",
        code: `// BEFORE: everything the app can ever render is in one chunk
import SettingsPage from "./pages/SettingsPage";

// AFTER: the settings route becomes its own chunk, fetched on demand
import { Suspense, lazy } from "react";
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export function App() {
  return (
    <Suspense fallback={<p>Loading page…</p>}>
      <Routes>
        <Route path="/" element={<LessonsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}

// src/pages/SettingsPage.jsx imports recharts; that is where the weight comes from
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";`,
      },
      output: "# static import: one chunk\n\ndist/index.html                  0.23 kB │ gzip:   0.19 kB\ndist/assets/index-C6jjua9E.js  595.79 kB │ gzip: 181.49 kB\n✓ built in 337ms\n\n# lazy import: entry chunk + route chunk\n\ndist/index.html                         0.23 kB │ gzip:  0.19 kB\ndist/assets/index-CMoNq1nq.js         293.68 kB │ gzip: 92.45 kB\ndist/assets/SettingsPage-D8Cl_lgA.js  303.42 kB │ gzip: 89.89 kB\n✓ built in 256ms",
      notes: [
        "Real `npx vite build` output, abridged (Vite 8.3.4, React 19.3.1, React Router 7.18.4, TanStack Query 5.104.5, recharts 3.10.1). Total bytes are almost unchanged: 595.79 → 293.68 + 303.42 kB. The win is that 303.42 kB no longer blocks first paint for users who never open Settings.",
        "The 92.45 kB gzip entry is almost exactly the 93.1 kB entry reported in the capstone, which is what React + Router + Query cost before any feature code. Use that as your baseline when reading a bundle report.",
        "Splitting is not free: each chunk is a request, and a route chunk fetched on every visit to that route still costs a round trip. Preload the likely next route on hover or intent, and put a size budget in CI so regressions fail the build.",
      ],
    },
  ],
  companies: [
    "**TanStack Query, SWR, RTK Query and Apollo (illustrative; public docs):** these libraries exist because server state is not component state. They standardise cache keys, deduplication, retries, focus refetching and mutation invalidation, so teams stop hand-rolling subtly different `useEffect` fetchers on every page.",
    "**Next.js, Remix and React Router loaders (illustrative):** framework data APIs move fetching out of components into route loaders, which can run in parallel and on the server. The trade-off is explicit: navigation waits for the loader unless the framework streams, so perceived speed depends on parallelising the loader and prefetching on intent.",
    "**Vite's build report (observed in this lesson):** `vite build` printed a 595.79 kB single chunk (181.49 kB gzip) and, after one lazy import, a 293.68 kB entry plus a 303.42 kB route chunk. Real numbers like these are the only honest basis for a bundle budget.",
    "**Google's Core Web Vitals programme (illustrative; public docs):** LCP, INP and CLS are measured from real users (CrUX/RUM), not from a lab run on a fast laptop. Teams prioritise performance work by field data because a Lighthouse score and a real mid-range phone can disagree by seconds.",
    "**Large dashboard and e-commerce teams (illustrative):** virtualised tables and route-level splitting are standard because they attack the two biggest costs at scale: thousands of DOM nodes and a JavaScript bundle that grows with every feature. Both are cheap to adopt once the list or route boundary is identified.",
  ],
  mistakes: [
    { mistake: "Copying server data into useState", why: "Wanting to edit or filter it locally", wrong: "Stale copies that never update, plus manual sync bugs", fix: "Keep server data in the query cache; derive views during render; local state only for drafts" },
    { mistake: "Putting everything in one global context", why: "Avoiding prop drilling", wrong: "Every consumer re-renders on every change and the app slows down globally", fix: "Context for rarely changing values; colocate state; split contexts by change frequency" },
    { mistake: "Premature memoisation everywhere", why: "Fear of re-renders", wrong: "More memory, more comparisons, stale closures and harder code, with no measured win", fix: "Profile first; memoise stable-prop hotspots and expensive children only" },
    { mistake: "Filters only in component state", why: "It is the simplest thing to write", wrong: "Refresh loses the view, links cannot be shared and Back surprises the user", fix: "Store filters, tabs and pagination in URL search params" },
    { mistake: "Rendering 10,000 rows", why: "It worked with 50 rows in development", wrong: "Slow first render and janky scrolling on real devices", fix: "Paginate or virtualise; only the visible rows need DOM nodes" },
    { mistake: "Ignoring request order", why: "Each response looks correct in isolation", wrong: "A slow earlier request lands last and shows results for a query the user already changed", fix: "Abort superseded requests, or guard with a request id; never assume order equals arrival" },
    { mistake: "Treating an empty list as an error", why: "Only success and failure were modelled", wrong: "Users see 'Something went wrong' when their search simply had no matches, or see a blank page", fix: "Model empty explicitly with copy and a clear-filters action" },
    { mistake: "Splitting a component but importing it statically elsewhere", why: "A shared barrel file or a helper import sneaks in", wrong: "The 'lazy' chunk is pulled back into the entry bundle and the split does nothing", fix: "Check the build report; import lazily at the route boundary and never re-export the lazy module statically" },
    { mistake: "Measuring performance in development", why: "That is the server you run all day", wrong: "Development React, unminified modules and source maps exaggerate cost and point at the wrong fix", fix: "Profile a production build with CPU throttling, then confirm with field Web Vitals" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Keep server state in a query library with sensible staleTime/gcTime and retries; invalidate every query a mutation affects." },
    { tag: "Performance", text: "Split at route boundaries, preload the likely next chunk and fail CI when the entry chunk exceeds a budget." },
    { tag: "Maintainability", text: "Make the URL the source of truth for navigation state, and centralise query keys so invalidation cannot drift." },
    { tag: "Reliability", text: "Model pending, error, empty and background-refresh separately; cancel superseded requests and ignore AbortError." },
    { tag: "Performance", text: "Virtualise long lists and measure with the Profiler and Performance panel before adding memoisation." },
  ],
  interview: [
    { q: "What is the difference between server state and client state, and how do you manage each?", a: "Server state is owned by the backend: it is shared, asynchronous, can be stale and can change without the client. It needs fetching, caching, deduplication, retries, invalidation and a freshness policy, which is why it belongs in a library such as TanStack Query rather than in useState. Client or UI state exists only in the browser (open menus, drafts, selection) and belongs in the nearest component. Navigation state belongs in the URL so reload and Back work. For mutations, update or invalidate the affected query keys; for optimistic updates, snapshot the cache in onMutate, write the expected value, roll back in onError and reconcile in onSettled. Copying server data into local state creates two sources of truth and is the most common source of stale UI." },
    { q: "A user types quickly and sees results for an old query. What happened, and how do you fix it?", a: "Responses are applied in arrival order, not request order. The earlier request was slower, landed last and overwrote the newer state. Fix it at both ends: cancel the superseded request with an AbortController, treating AbortError as expected rather than an error, and make the write conditional on the request still being current (a request id or sequence number) for APIs that cannot be aborted. TanStack Query helps because it passes a signal to queryFn, cancels when the last observer unmounts and never lets an older request for the same key overwrite a newer one; cancelQueries before an optimistic write prevents an in-flight refetch from undoing it. Also debounce or defer the value that triggers the request, but do not rely on debouncing alone: a slow response can still arrive out of order." },
    { q: "A React page is slow. How do you investigate before changing code?", a: "Reproduce on a production build with CPU throttling, then separate network, bundle and render cost. Network: DevTools Network and the Performance panel show waterfalls, slow requests and cache misses. Bundle: the build report and Coverage show chunk sizes and unused JavaScript; check whether a heavy route dependency is on the critical path. Render: React DevTools Profiler shows which components rendered, how long they took and why, and the Performance panel shows long tasks over 50 ms and layout or paint work. Then fix the largest measured cause: split or preload routes, move state down, virtualise long lists, defer non-urgent updates, and only then memoise stable-prop components. Finish by confirming with field Web Vitals, not just a lab score." },
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
      prompt: "A search box fires a request per keystroke. A user types `react`, then `re`; the screen ends up showing results for `react`. What is the most direct fix?",
      options: ["Add more useMemo around the list", "Abort the superseded request (or ignore stale responses)", "Increase staleTime to Infinity", "Render the list in a portal"],
      answer: 1,
      explanation: "The older, slower response arrived last. Cancel it with an AbortController (or guard with a request id) so only the current query can write.",
    },
    {
      kind: "bug",
      prompt: "memo(Chart) still re-renders on every parent render. Why?",
      code: { lang: "tsx", code: "const Chart = memo(ChartImpl);\nfunction Page({ attempts }) {\n  return <Chart points={attempts.map((a) => a.score)} />;\n}" },
      options: ["memo does not work with SVG", "points is a new array every render, so props are never equal", "Chart needs a key", "memo only works with classes"],
      answer: 1,
      explanation: "Memoise the derived array with useMemo (or pass stable data) so the shallow comparison succeeds.",
    },
  ],
  cheatSheet: [
    "Server state → query cache; UI state → nearest useState; navigation state → URL.",
    "staleTime = how long data is fresh. gcTime = how long unused data stays in memory.",
    "useQuery caches, dedupes, retries, refetches; useMutation + invalidateQueries re-syncs.",
    "Optimistic: cancelQueries → snapshot → setQueryData → rollback onError → invalidate onSettled.",
    "Model four states: pending, error, empty, background refresh. Empty is not an error.",
    "Abort superseded requests; AbortError is control flow, not a failure.",
    "BrowserRouter needs SPA fallback; HashRouter works without rewrites; nested routes use Outlet.",
    "lazy() per route moves bytes off the critical path; splitting does not shrink total bytes.",
    "memo needs stable props; premature memoisation adds cost. Virtualise long lists.",
    "Profile production builds; long tasks > 50 ms; confirm with LCP, INP and CLS.",
  ],
  homework: {
    basic: {
      title: "Give one request four honest screens",
      brief: ["Build a `SearchPage` against `https://hn.algolia.com/api/v1/search?tags=story&query=...` that renders pending, error, empty and success states. Use useQuery with the query string in the query key, add a retry button, and make the empty state name the query so the user can tell it apart from a failure."],
      criteria: ["All four states are reachable and visually distinct", "Empty state is not labelled as an error", "Retry refetches the same key without a full reload"],
      hints: ["isPending is true only before the first data; isFetching covers background refreshes.", "A 200 response with hits: [] is the empty case."],
      solution: {
        text: [
          "The query key includes the search term, so each term has its own cache entry. Errors are shown with a retry that calls refetch, and empty is a separate branch, not an error message.",
          "Sizing the skeleton like the result avoids a layout shift when data arrives (CLS). Disabling retry in a demo would hide the behaviour you are trying to learn, so keep the default and test it by blocking the network in DevTools.",
        ],
        code: {
          lang: "tsx",
          file: "src/pages/SearchPage.tsx",
          code: `import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface Story { objectID: string; title: string; url: string | null }

async function search(q: string, signal: AbortSignal): Promise<Story[]> {
  const res = await fetch(\`https://hn.algolia.com/api/v1/search?tags=story&query=\${encodeURIComponent(q)}\`, { signal });
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  const data = (await res.json()) as { hits: Story[] };
  return data.hits;
}

export function SearchPage() {
  const [input, setInput] = useState("react");
  const [q, setQ] = useState("react");                       // committed query, not the draft
  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["search", q],
    queryFn: ({ signal }) => search(q, signal),
  });

  return (
    <main>
      <form onSubmit={(e) => { e.preventDefault(); setQ(input); }}>
        <input aria-label="Search" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit">Search</button>
      </form>

      {isPending && <p>Loading results…</p>}
      {isError && (
        <p role="alert">
          Could not load results: {error.message}{" "}
          <button type="button" onClick={() => refetch()}>Retry</button>
        </p>
      )}
      {data && data.length === 0 && <p>No stories match “{q}”.</p>}
      {data && data.length > 0 && (
        <ol aria-busy={isFetching}>
          {data.map((s) => <li key={s.objectID}><a href={s.url ?? \`https://news.ycombinator.com/item?id=\${s.objectID}\`}>{s.title}</a></li>)}
        </ol>
      )}
      {isFetching && !isPending && <p role="status">Updating…</p>}
    </main>
  );
}`,
        },
        pitfalls: ["Using the draft input value directly in the query key (a request per keystroke)", "Rendering “No results” for isError as well, so failures look like empty searches"],
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

// The test (not repeated here) holds each fetch open, asserts that page 1 is still
// visible with role="status" while ?page=2 loads, then presses Back and expects page 2
// from cache plus one background refetch. Verified with Vitest 5.0.5 + jsdom + Testing
// Library on React 19.3.1, @tanstack/react-query 5.104, react-router-dom 7.18.`,
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
          "Measure, do not guess. Build for production and throttle the CPU 4x, then type 'quorum' one key every 120 ms and record each keydown's input-to-next-paint duration with the Event Timing API, which is what INP is built from. The React DevTools Profiler gives the same picture interactively; a script makes it repeatable.",
          "Results from three runs in a container (Chromium 141, React 19.3.1 production build, 4x throttling): before, the DOM held 10,000 <li> (4,000 after filtering) and keystrokes took 104-616 ms to paint, worst 456-616 ms per run. After, the DOM held 26 <li> throughout and every keystroke painted in 16-32 ms. Your absolute numbers will differ by machine; the ratio is what to report.",
        ],
        code: {
          lang: "tsx",
          file: "src/Glossary.tsx",
          code: `import { memo, useDeferredValue, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface Term { id: number; term: string; def: string }

export function makeTerms(n: number): Term[] {
  const words = ["cache", "queue", "index", "shard", "token", "lease", "quorum", "replica", "schema", "vector"];
  return Array.from({ length: n }, (_, i) => ({ id: i, term: \`\${words[i % 10]}-\${i}\`, def: \`Definition \${i} about \${words[(i * 3) % 10]}.\` }));
}

const filterTerms = (terms: Term[], q: string) => {
  const needle = q.trim().toLowerCase();
  return needle ? terms.filter((t) => t.term.includes(needle) || t.def.toLowerCase().includes(needle)) : terms;
};

// BEFORE: every keystroke filters and renders up to 10,000 <li> synchronously
export function SlowGlossary({ terms }: { terms: Term[] }) {
  const [query, setQuery] = useState("");
  const visible = filterTerms(terms, query);
  return <section><input aria-label="Search terms" value={query} onChange={(e) => setQuery(e.target.value)} /><ul>{visible.map((t) => <li key={t.id}><strong>{t.term}</strong> {t.def}</li>)}</ul></section>;
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
});`,
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
          "src/api/client.ts is the only place that knows URLs: each call validates the JSON with a type guard before returning a typed value, and the query keys live next to it so invalidation cannot miss a typo'd key. Pages never call fetch directly; reads go through useQuery and the completion toggle through useMutation.",
          "useSetCompleted is the optimistic update: onMutate cancels in-flight lesson queries (so a late refetch cannot overwrite the change), snapshots the cache, and writes the new value; onError restores the snapshot and the page shows a short alert; onSettled invalidates so the list re-syncs with the server either way. SettingsPage is a default export loaded with React.lazy behind Suspense, and the build emits it as its own chunk.",
          "check-bundle.mjs runs after vite build in CI: it finds the entry chunk from dist/index.html, prints the gzip size of every JS chunk and exits 1 when the entry is over BUNDLE_BUDGET_KB. On this app the build produced a separate 0.2 kB SettingsPage chunk and a 93.1 kB entry (React, React Router and TanStack Query); with BUNDLE_BUDGET_KB=50 the script failed with 'Bundle budget exceeded'. The hands-on measured a fresh app at 92.45 kB gzip before feature code, so treat that as the floor.",
          "Verified with tsc (TypeScript 7.0.2; import.meta.env needs /// <reference types=\"vite/client\" /> in src/vite-env.d.ts, as Vite's template provides), Vitest 5.0.5 + jsdom + Testing Library, vite build 8.3.4 and the bundle script, with @tanstack/react-query 5.104 and react-router-dom 7.18 on React 19.3.1. The tests hold the PUT open until they release it, which proves the button flips before the server answers and flips back when the server returns 500. The workflow steps were not run on GitHub here.",
        ],
        code: {
          lang: "tsx",
          file: "web/src/api/client.ts + pages + App.tsx + scripts/check-bundle.mjs",
          code: `// file: web/src/api/client.ts
export interface LessonSummary { id: string; title: string; completed: boolean }
const BASE = import.meta.env.VITE_API_URL ?? "/api";

const isLessonSummary = (d: unknown): d is LessonSummary => {
  const o = d as Record<string, unknown> | null;
  return !!o && typeof o.id === "string" && typeof o.title === "string" && typeof o.completed === "boolean";
};
const isLessonList = (d: unknown): d is LessonSummary[] => Array.isArray(d) && d.every(isLessonSummary);
async function request<T>(path: string, guard: (d: unknown) => d is T, init?: RequestInit): Promise<T> {
  const res = await fetch(\`\${BASE}\${path}\`, init);
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${path}\`);
  const data: unknown = await res.json();
  if (!guard(data)) throw new Error(\`Unexpected response shape for \${path}\`);
  return data;
}

export const api = {
  lessons: (signal?: AbortSignal) => request("/lessons", isLessonList, { signal }),
  lesson: (id: string, signal?: AbortSignal) => request(\`/lessons/\${encodeURIComponent(id)}\`, isLessonSummary, { signal }),
  setCompleted: (id: string, completed: boolean) =>
    request(\`/lessons/\${encodeURIComponent(id)}/completion\`, isLessonSummary, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }),
    }),
};
// Query keys in one place, so invalidation cannot miss a typo'd key
export const keys = { lessons: ["lessons"] as const, lesson: (id: string) => ["lessons", id] as const };
// file: web/src/pages/LessonsPage.tsx
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

// LessonsPage: useQuery(keys.lessons) + a button per row calling setCompleted.mutate({ id, completed: !l.completed });
// file: web/src/App.tsx
// Same lazy route as hands-on step 5: const SettingsPage = lazy(() => import("./pages/SettingsPage"))
// sits inside <Suspense> next to the Routes, so the build emits a separate Settings chunk.

// file: web/scripts/check-bundle.mjs
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 100);
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
}`,
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
    { label: "web.dev: Interaction to Next Paint (INP)", url: "https://web.dev/articles/inp" },
    { label: "MDN: Performance API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Performance_API" },
  ],
  nextPreview: "Next: frontend security and performance. XSS, CORS, CSP and Core Web Vitals.",
};
