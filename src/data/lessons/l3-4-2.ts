import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.2",
  title: "Hooks and effects done right",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["3.4.1 Components, props and state"],
  summary: "Use React hooks correctly: why hooks replaced classes, the call-order rule, batching and functional updates, useEffect as synchronisation (and when not to use it), honest dependencies, cleanup, stale closures, refs, custom hooks, and StrictMode.",
  terms: [
    { term: "Hook", def: "A function starting with `use` that lets a function component use React features: useState, useEffect, useRef, useMemo, useContext, useSyncExternalStore, or your own custom hook." },
    { term: "Rules of Hooks", def: "Call hooks only at the top level of a component or custom hook, never inside conditions, loops, nested functions or after an early return. React matches each hook to its stored state by call order." },
    { term: "Render", def: "React calling your component function to compute the next JSX. Render must be pure: no subscriptions, DOM writes, ref writes or state updates during render." },
    { term: "Batching", def: "React grouping several state updates from the same event, promise or timeout into one re-render instead of one render per setter." },
    { term: "Functional update", def: "Passing `setX(prev => next)` instead of `setX(next)`, so the update is computed from the latest queued state rather than a value captured by an earlier render." },
    { term: "Effect", def: "Code in useEffect that synchronises a component with something outside React: a network request, subscription, timer, browser API or third-party widget." },
    { term: "Dependency array", def: "The values an effect reads, listed after the effect. React compares them with `Object.is` after each render and re-runs setup when one changes." },
    { term: "Cleanup", def: "The function returned from an effect that undoes its setup: abort a request, clear a timer, remove a listener or unsubscribe. It runs before the next setup and on unmount." },
    { term: "Stale closure", def: "A callback or effect that captured props or state from an earlier render and keeps using those old values, such as an interval that always sees the initial count." },
    { term: "Ref", def: "`useRef` returns a mutable `{ current }` box that survives renders without causing one. It holds a DOM node or a non-render value, not data the UI displays." },
    { term: "Custom hook", def: "A function starting with `use` that calls other hooks to package reusable stateful logic. Each call gets its own isolated state; it is composition, not a shared singleton." },
    { term: "StrictMode", def: "A development-only wrapper that mounts, unmounts and re-mounts components once to expose effects with missing cleanup or unsafe assumptions. Production behaviour is unchanged." },
  ],
  problem: [
    "A DevAtlas lesson page uses `useEffect` to copy the `lesson` prop into state, a second effect to compute a filtered list from the query, and a third to post analytics when a quiz is submitted. The page flickers through a stale title, the list is one keystroke behind, and the analytics event fires twice in development. When someone adds an object literal to a dependency array, the fetch effect loops forever; when a user navigates quickly, an old response overwrites the new lesson.",
    "None of those are React bugs. They come from treating hooks as a lifecycle checklist ('run this on mount, that on update') and from storing values that should be computed. Hooks are a smaller, sharper model: state is a snapshot, render is pure, and an effect is a subscription to an external system. Learn that model and most effect bugs disappear before they are written.",
  ],
  concept: {
    analogy: [
      "Think of hooks as **numbered seats in a theatre**. React does not know your variable names; it remembers that the first `useState` is seat 1, the next hook is seat 2, and so on. Put a hook inside an `if` and on the next render everyone after it sits one seat over, reading someone else's state. That is why the rules of hooks exist.",
      "An effect is a **subscription you must cancel**. When you move house (unmount) or change the delivery address (dependencies change), you cancel the old newspaper before starting a new one. Forget to cancel and two papers arrive, one at the wrong address.",
    ],
    precise: [
      "**Hooks exist to give function components state and side-effect synchronisation without classes.** Class components split one feature across `componentDidMount`, `componentDidUpdate` and `componentWillUnmount`, require `this` binding, and share logic through wrapper components, render props or inheritance. A hook keeps setup and cleanup next to each other, and a custom hook shares stateful logic without adding a component to the tree. The price is one hard rule: hooks are matched by call order, so they must run in the same order on every render.",
      "**State is a snapshot, not a live variable.** `setCount(count + 1)` computes from the `count` captured by the current render; three such calls in one handler all queue the same value. React 18 and 19 batch updates from events, promises, timeouts and native handlers into one render. When the next value depends on the previous one, use `setCount(c => c + 1)`. Keep state minimal: values that can be computed from props or other state belong in the render body, not in another `useState`.",
      "**`useEffect` synchronises with an external system, and its dependencies describe that system.** List every reactive value the effect reads: props, state and values derived from them. React compares the list with `Object.is`; a new object or function created during render is a new dependency every time. Cleanup runs before the next setup and on unmount, which is what prevents duplicate subscriptions and out-of-order responses. A stale closure is the symptom of an effect or callback reading a render it no longer belongs to; fix it with honest dependencies, a functional update, or a ref when re-subscribing would be costly.",
      "**Most logic does not need an effect.** Compute derived data during render, run event-specific work in the event handler, and reset a component with `key` rather than syncing props into state. `useMemo` caches a value and `useCallback` caches a function identity; both trade memory and dependency comparison for skipped work, and only pay off when the work is expensive or identity matters to a memoised child or another hook. `useRef` is for mutable values and DOM nodes that should not trigger renders. Wrap repeated synchronisation in a custom hook, and keep StrictMode on: its double mount is a test of your cleanup, not a bug to suppress.",
    ],
  },
  underTheHood: {
    text: [
      "**Hooks are a linked list, indexed by call order.** React stores hook records on the component's fiber. On each render it walks that list: the first `useState` reads record 1, the second hook reads record 2, and so on. There is no lookup by variable name. A conditional hook shifts every later index, so the next render reads a different record: wrong state, impossible updates, or the 'rendered fewer hooks than expected' error. `eslint-plugin-react-hooks` is enforcing this data structure, not a style preference.",
      "**Why classes were replaced.** A class component spreads one concern across three lifecycle methods, so a subscription's setup and teardown live in different places. Logic reuse needs higher-order components or render props, which add wrapper nodes and prop collisions, and `this` binding plus `this.state` snapshots cause their own stale-read bugs. A function component with hooks keeps state between calls, colocates setup with cleanup, and a custom hook composes both without changing the tree.",
      "**Render is pure; effects run after commit.** React may call your component more than once for one update (StrictMode, concurrent rendering), so render must not subscribe, write to the DOM or mutate a ref that affects output. After React commits the DOM, `useEffect` runs; it normally runs after the browser paints, while `useLayoutEffect` runs before paint for measurement. Server rendering with `renderToStaticMarkup` never runs effects at all, which is why a server render shows only initial state. State changes from an effect schedule another render after the commit.",
      "**Batching explains the counter that moves only once.** React 18+ automatically batches updates inside events, promises, timeouts and native handlers. Three `setCount(count + 1)` calls close over the same `count` snapshot, so all three queue the same replacement value. Three `setCount(c => c + 1)` calls queue three reducers that run in order against the latest state. Batching does not make state synchronous: the variable in the current render never changes; the new value appears in the next render. React may also bail out if an update produces the same value.",
      "**Dependency comparison is shallow and exact.** React compares each dependency with `Object.is`. Omit the array and the effect runs after every render. Pass `[]` and it runs once on mount (twice in StrictMode development, because of the simulated remount). Pass reactive values and React re-runs setup after any change. An object literal, array literal or inline function is a fresh reference every render, so it never compares equal; move it inside the effect, depend on its primitive fields, or stabilise it deliberately with `useMemo`/`useCallback`.",
      "**Cleanup is the other half of setup.** The returned function runs before the next setup and on unmount. A fetch effect aborts its request, a timer effect clears its interval, a listener effect removes both listeners, a subscription effect unsubscribes. Without cleanup, a fast navigation leaves two requests in flight and the slower, older one can overwrite the newer result. In development StrictMode mounts, unmounts and remounts once; a jsdom probe on React 19.3.1 logged `effect -> cleanup -> effect` on mount and `cleanup` on unmount. If that sequence breaks your component, fast navigation in production will too.",
      "**Stale closures come from render scope.** Every render has its own props and state, and every callback created in that render closes over them. An interval created in an effect with `[]` keeps the first render's `seconds` forever. Fix it by listing the values it reads (the interval is recreated each time), by using a functional update (`setSeconds(s => s + 1)`), or, when re-subscribing is expensive, by keeping the latest callback in a ref. React 19 also exports `useEffectEvent` for reading the latest props and state from inside an effect without making them dependencies; it is for non-reactive logic, not a way to hide a value that should re-run the effect.",
      "**Memoisation, refs and custom hooks solve different problems.** `useMemo(() => expensive(input), [input])` caches a value; `useCallback(fn, deps)` caches the function itself so its identity is stable. Neither is a correctness tool: if the calculation is cheap, the comparison and retained memory can cost more than recomputing. `useRef` stores a DOM node or a mutable value that should survive renders without causing one; do not read or write it during render as a hidden state channel. A custom hook is just a function that calls hooks: each call gets its own state, the same rules apply, and its name must start with `use` so lint can check it.",
    ],
    diagram: {
      title: "An effect is setup and teardown, not a lifecycle",
      nodes: [
        { label: "Render", sub: "pure, computes JSX" },
        { label: "Commit", sub: "React updates the DOM" },
        { label: "Effect setup", sub: "subscribe / fetch / timer" },
        { label: "Cleanup", sub: "abort / clear / remove" },
        { label: "Setup again", sub: "or final cleanup on unmount" },
      ],
      edges: ["no side effects", "after paint", "deps changed or unmount", "before the next setup"],
      caption: "Dependencies decide when cleanup and setup run. The effect body should describe the external system, not a sequence of lifecycle moments.",
    },
  },
  handsOn: [
    {
      title: "Map where the logic belongs before writing a hook",
      text: [
        "Most hook bugs are decided before the first line of code. Walk this flow for each piece of logic. It is also the order to use in a code review: 'why is this in an effect?' is usually answered by one of the first three branches.",
      ],
      code: {
        lang: "mermaid",
        file: "where-does-it-belong.mmd",
        code: `flowchart TD
  A[Can it be computed from props or state?] -->|yes| B[Compute it during render]
  A -->|no| C[Is it caused by a user action?]
  C -->|yes| D[Do it in the event handler]
  C -->|no| E[Must it stay in sync with something outside React?]
  E -->|yes| F[useEffect with cleanup and honest dependencies]
  E -->|no| G[useRef for a mutable value, or no hook at all]`,
      },
      notes: [
        "GitHub renders ```mermaid blocks natively. Keep the decision order: derived data first, event reactions second, external synchronisation third.",
        "An effect is the last resort, not the default. If the answer is 'the UI should show something different', it is almost always branch B.",
      ],
    },
    {
      title: "Watch a duplicated prop go stale",
      text: [
        "The first component copies a prop into state and repairs it with an effect; the second computes during render. Both end at the same DOM, but the duplicated version renders a stale frame first and needs an extra render. This is the real trace from a Node 24.18.0 script on React 19.3.1, using `react-dom/client` mounted in jsdom and `act` to flush updates; the harness used `React.createElement` for the same components shown in TSX. No browser paint was observed, so paint timing is illustrative; render frames and final DOM are measured.",
      ],
      code: {
        lang: "tsx",
        file: "src/Progress.tsx",
        code: `import { useEffect, useState } from "react";
export function Duplicated({ answered, total }: { answered: number; total: number }) {
  const [snapshot, setSnapshot] = useState(answered);
  useEffect(() => {
    setSnapshot(answered);            // repair after the commit, not during render
  }, [answered]);
  return <p>copy={snapshot} derived={answered}</p>;
}
export function Derived({ answered, total }: { answered: number; total: number }) {
  const percent = Math.round((answered / total) * 100);
  return <p>derived={answered}/{total} ({percent}%)</p>;
}`,
      },
      output: `$ node verify-hooks.mjs        # Node 24.18.0; React 19.3.1 + react-dom/client + jsdom
react 19.3.1 / react-dom 19.3.1

A. derived during render vs copied into state (client render, React 19.3.1)
  duplicated mount      : copy=1 derived=1
  duplicated prop 1 -> 3: copy=1 derived=3 | copy=3 derived=3
  duplicated final DOM  : <p>copy=3 derived=3</p>
  derived mount         : derived=1/3 (33%)
  derived prop 1 -> 3   : derived=3/3 (100%)
  derived final DOM     : <p>derived=3/3 (100%)</p>
  renders for the update: duplicated=2 derived=1`,
      notes: [
        "The `copy=1 derived=3` frame is the bug users see as a flicker: the prop is new, the copied state is old. The effect then sets state and React renders again. The derived version never has a second source of truth.",
        "If the real requirement is 'reset this component when the lesson changes', use `<LessonDetail key={lesson.id} />` instead of an effect that copies the prop. A new key is a new component instance with fresh state.",
        "This harness is a development build; production render counts can differ because React may skip work that development checks. The ordering rule does not change: an effect runs after the render that scheduled it.",
      ],
    },
    {
      title: "Three updates, one render: batching and functional updates",
      text: [
        "This is the same measured harness. The handler queues three snapshot updates and three updater updates. The `renders` ref is a diagnostic that counts component calls; it is not a pattern for production logic.",
      ],
      code: {
        lang: "tsx",
        file: "src/Batching.tsx",
        code: `import { useRef, useState } from "react";
export function Batching() {
  const [naive, setNaive] = useState(0);
  const [fixed, setFixed] = useState(0);
  const renders = useRef(0);
  renders.current += 1;                       // diagnostic only
  function run() {
    setNaive(naive + 1);
    setNaive(naive + 1);
    setNaive(naive + 1);
    setFixed((f) => f + 1);
    setFixed((f) => f + 1);
    setFixed((f) => f + 1);
  }
  return (
    <div>
      <button onClick={run}>run three updates each</button>
      <pre>{JSON.stringify({ naive, fixed, renders: renders.current })}</pre>
    </div>
  );
}`,
      },
      output: `B. three setState calls in one click (client render, React 19.3.1)
  mount : {"naive":0,"fixed":0,"renders":1}
  click : {"naive":1,"fixed":3,"renders":2}
  click : {"naive":2,"fixed":6,"renders":3}`,
      notes: [
        "All six calls happened inside one click, yet React rendered once per click. That is automatic batching. `naive` moved by 1 because all three calls computed from the same `naive` snapshot; `fixed` moved by 3 because each updater ran against the latest queued value.",
        "Use the updater form whenever the next value depends on the previous one: counters, toggles, list appends, and updates inside intervals or promises. It also removes unnecessary dependencies from effects.",
        "`useRef` is the right home for `renders` here: mutating `.current` does not schedule a render, and the value survives between renders. For a DOM node, the same hook is written `useRef<HTMLInputElement>(null)` and passed as `<input ref={inputRef} />`; call `.focus()` from an event handler or an effect, not during render.",
      ],
    },
    {
      title: "Choose the tool: render, handler, effect, memo or ref",
      text: [
        "Read this table before adding a hook. The expensive operations are the ones worth memoising; everything else is cheaper to recompute. The same table answers 'effect or event handler?' and 'useMemo or useCallback?'.",
      ],
      code: {
        lang: "text",
        file: "when-to-use.txt",
        code: `Need                                  Tool                 Why                                  Cost
computed from props/state             render               one source of truth, no extra state   recomputed each render
reaction to click/submit              event handler        has the event and the user's intent   none
sync with API/timer/subscription/DOM  useEffect + cleanup  the external system outlives render   cleanup code + deps
expensive pure calculation            useMemo              reuses the value while deps match     memory + comparison
stable function identity              useCallback          lets memo children/effects skip work  memory + comparison
mutable value or DOM node             useRef               survives renders, schedules none      invisible to React
Do not use an effect for:
  * a value you can compute during render
  * analytics or navigation caused by a click
  * syncing a prop into state (use the prop, or remount with key)
  * resetting a form after submit when the handler can reset it directly`,
      },
      notes: [
        "`useMemo` caches a result: `const sorted = useMemo(() => sort(rows), [rows])`. `useCallback` caches the function itself: `const onSelect = useCallback((id) => select(id), [select])`. Choosing the wrong one is a type error or a pointless wrapper.",
        "Both are performance tools, not correctness tools. Measure with React DevTools Profiler first; a cheap computation or an unmemoised child makes the wrapper pure overhead.",
      ],
    },
    {
      title: "A custom hook is a shape, not a component",
      text: [
        "`usePagination` packages page state and derives the visible range during render. A component calls it and receives an object. The first line is real output from `renderToStaticMarkup` on React 19.3.1; the following lines are from the client harness after clicking `next` four times. Server rendering runs no effects, so only the initial page is rendered there.",
      ],
      code: {
        lang: "tsx",
        file: "src/usePagination.tsx",
        code: `import { useState } from "react";
export function usePagination({ total, pageSize }: { total: number; pageSize: number }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items: number[] = [];
  for (let n = start + 1; n <= Math.min(start + pageSize, total); n += 1) items.push(n);
  return {
    page,
    pageCount,
    start,
    end: items.length > 0 ? items[items.length - 1] : start,
    items,
    canPrev: page > 1,
    canNext: page < pageCount,
    next: () => setPage((p) => Math.min(p + 1, pageCount)),
    prev: () => setPage((p) => Math.max(p - 1, 1)),
  };
}
export function PaginationProbe() {
  const p = usePagination({ total: 42, pageSize: 10 });
  return (
    <div>
      <button onClick={p.next}>next</button>
      <pre>{JSON.stringify({ page: p.page, pageCount: p.pageCount, start: p.start, end: p.end, items: p.items, canPrev: p.canPrev, canNext: p.canNext })}</pre>
      <p>keys: {Object.keys(p).join(", ")}</p>
    </div>
  );
}`,
      },
      output: `C. custom hook returned shape (renderToStaticMarkup, then client updates)
  SSR page 1: <div><button>next</button><pre>{&quot;page&quot;:1,&quot;pageCount&quot;:5,&quot;start&quot;:0,&quot;end&quot;:10,&quot;items&quot;:[1,2,3,4,5,6,7,8,9,10],&quot;canPrev&quot;:false,&quot;canNext&quot;:true}</pre><p>keys: page, pageCount, start, end, items, canPrev, canNext, next, prev</p></div>

  client page 1: {"page":1,"pageCount":5,"start":0,"end":10,"items":[1,2,3,4,5,6,7,8,9,10],"canPrev":false,"canNext":true}
  next #1     : {"page":2,"pageCount":5,"start":10,"end":20,"items":[11,12,13,14,15,16,17,18,19,20],"canPrev":true,"canNext":true}
  next #2     : {"page":3,"pageCount":5,"start":20,"end":30,"items":[21,22,23,24,25,26,27,28,29,30],"canPrev":true,"canNext":true}
  next #3     : {"page":4,"pageCount":5,"start":30,"end":40,"items":[31,32,33,34,35,36,37,38,39,40],"canPrev":true,"canNext":true}
  next #4     : {"page":5,"pageCount":5,"start":40,"end":42,"items":[41,42],"canPrev":true,"canNext":false}`,
      notes: [
        "The hook returns nine keys: state (`page`), derived values (`pageCount`, `start`, `end`, `items`, `canPrev`, `canNext`) and two functions (`next`, `prev`). JSON drops the functions, which is why the last line prints `Object.keys` separately.",
        "Each call to `usePagination` gets its own `page` state. Two components using the hook do not share a page; that is the difference between a custom hook and a module-level singleton.",
        "The functions are recreated on every render. That is fine unless they are passed to a memoised child or used as an effect dependency; then wrap them in `useCallback` or move the state into a reducer.",
      ],
    },
  ],
  companies: [
    "**Meta (React team) — illustrative:** hooks were introduced in React 16.8 to give function components state and effects, and to replace wrapper-heavy logic reuse. The team's documentation now teaches 'You might not need an effect' as a first-class rule, and StrictMode as a development check for cleanup. Most of this lesson's guidance comes from that model.",
    "**Vercel (Next.js) — illustrative:** the App Router moves data fetching into server components and framework loaders, so fewer components need a fetch-in-effect. Interactive state and browser APIs stay in client components, where the hooks rules and cleanup still apply.",
    "**TanStack (Query) — illustrative:** TanStack Query treats server data as a cache rather than component state: deduplication, retries, cancellation, stale-while-revalidate and request races are handled once. Teams that adopt it usually delete most hand-written fetch effects.",
    "**Design-system and platform teams — illustrative:** shared hooks such as `useMediaQuery`, `useFeatureFlag`, `useLocalStorage` and `useAnalytics` package a subscription and its cleanup so product teams cannot get the teardown wrong. Each hook is tested with `renderHook` and fake timers or stubbed browser APIs.",
    "**React codebases in CI — illustrative:** `eslint-plugin-react-hooks` (rules-of-hooks and exhaustive-deps) is a standard CI gate. Reviewers treat a disabled exhaustive-deps warning as a design smell: it usually means the effect is reading a value the author did not want to think about.",
  ],
  mistakes: [
    { mistake: "Using an effect to compute derived state", why: "It feels natural to 'react' to a prop or state change", wrong: "An extra render, a stale first paint, and two sources of truth that can drift", fix: "Compute during render: `const visible = lessons.filter(...)`. Store only what the user can change." },
    { mistake: "Using an effect to react to a click or submit", why: "The effect watches a boolean flag set by the handler", wrong: "The action runs after a render, can run twice in StrictMode, and loses the event details", fix: "Do the work in the event handler that caused it; keep the flag only if the UI needs it." },
    { mistake: "Copying props into state", why: "It looks like a safe way to edit a value locally", wrong: "The copy goes stale when the parent sends a new prop, and an effect is added to patch it", fix: "Read the prop directly. If the component must reset, render it with `key={item.id}`." },
    { mistake: "Lying about dependencies to stop re-runs", why: "The lint warning is annoying and the effect 'works'", wrong: "Stale closures read old props/state; the bug appears later under fast updates or navigation", fix: "List every reactive value. If it re-runs too often, restructure the effect or memoise a genuinely stable input." },
    { mistake: "Putting an object or inline function in the dependency array", why: "`const options = { id }` looks harmless", wrong: "A new reference every render makes the effect run every render, often setting state and looping", fix: "Move the object inside the effect, depend on primitives, or stabilise it with `useMemo`/`useCallback`." },
    { mistake: "Forgetting cleanup", why: "The happy path looks fine in a quick test", wrong: "Duplicate subscriptions, timers that outlive the component, and slow responses overwriting newer ones", fix: "Return cleanup for every subscribe, schedule and fetch: remove listener, clear timer, `controller.abort()`." },
    { mistake: "Calling hooks conditionally", why: "`if (user) useEffect(...)` seems efficient", wrong: "Hook order changes between renders, so React reads the wrong state slot or throws", fix: "Call hooks unconditionally at the top level; put the condition inside the hook body or effect." },
    { mistake: "Sprinkling useMemo and useCallback everywhere", why: "Memoisation sounds like free performance", wrong: "Extra memory, dependency comparison and code noise; sometimes slower than recomputing", fix: "Derive cheap values directly. Profile first, then memoise the expensive calculation or the identity a memo child needs." },
    { mistake: "Treating StrictMode's double effect as a bug", why: "Development logs show setup, cleanup, setup", wrong: "The fix is often to remove StrictMode, hiding the missing-cleanup bug it was designed to expose", fix: "Keep StrictMode; make setup idempotent and cleanup complete. Production will exercise the same path during fast navigation." },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Enable `eslint-plugin-react-hooks` with `rules-of-hooks` and `exhaustive-deps` as errors; never silence a dependency warning without restructuring the effect." },
    { tag: "Reliability", text: "Every effect that subscribes, schedules or fetches returns cleanup. Use `AbortController` for requests and ignore results after abort." },
    { tag: "Maintainability", text: "Extract repeated synchronisation into a named custom hook (`useOnline`, `useDebounce`, `usePagination`) with its own test, instead of copying effect code between components." },
    { tag: "Performance", text: "Derive values during render and keep state minimal. Reach for `useMemo`/`useCallback` only after the Profiler shows expensive work or a memoised child re-rendering." },
    { tag: "Reliability", text: "Keep render pure and StrictMode on: no subscriptions, DOM writes or ref mutation during render; effects own the outside world." },
  ],
  interview: [
    { q: "Why were hooks introduced, and why can't you call them conditionally?", a: "Hooks give function components state and a way to synchronise with external systems without classes. Classes split one feature across mount, update and unmount methods, need `this` binding, and reuse logic through higher-order components or render props that add wrappers and prop collisions. Hooks colocate setup with cleanup and let a custom hook share stateful logic without changing the tree. The cost is that React identifies each hook by call order: it stores a linked list of hook records on the fiber and walks it on every render. A hook inside an `if`, loop or early return shifts the later indices, so React reads the wrong record and state breaks. That is why the rules of hooks require top-level calls in components and custom hooks, and why the lint rule exists." },
    { q: "Explain useEffect as synchronisation. What belongs in the dependency array, and what is a stale closure?", a: "An effect describes an external system the component must stay in sync with: a subscription, request, timer, DOM API or third-party widget. Setup runs after commit, and the returned cleanup runs before the next setup and on unmount, so the effect is always paired with its teardown. The dependency array lists every reactive value the effect reads. React compares entries with `Object.is` after each render; omitted array means every render, `[]` means mount only. A stale closure is a callback or effect that captured an earlier render's props or state and keeps using them, such as an interval created once that always sees the initial count. Fix it by listing the values it reads, using a functional update like `setSeconds(s => s + 1)`, or keeping the latest callback in a ref when re-subscribing is expensive. StrictMode's double mount is useful here: it exposes effects whose cleanup is incomplete." },
    { q: "When should you not use an effect, and how do you choose between useMemo, useCallback, useRef and a custom hook?", a: "Do not use an effect for derived data (compute during render), for a reaction to a user action (do it in the event handler), or to copy a prop into state (use the prop, or remount with a `key`). That removes the extra render, the stale frame and most infinite loops. `useMemo` caches a computed value and `useCallback` caches a function identity; both are performance tools that trade memory and dependency comparison for skipped work, so use them when the Profiler shows an expensive calculation or a memoised child/effect needs a stable reference. `useRef` holds a DOM node or a mutable value that must survive renders without causing one; it is not a replacement for state the UI reads. A custom hook packages repeated state and effect logic behind a `use`-prefixed function, with isolated state per call and the same rules of hooks; it is the right abstraction when two components need the same subscription or derived state machine." },
  ],
  quickCheck: [
    {
      kind: "bug",
      prompt: "This component fetches in an infinite loop. Why?",
      code: { lang: "tsx", code: "const filters = { level: props.level };\nuseEffect(() => {\n  fetchLessons(filters).then(setLessons);\n}, [filters]);" },
      options: ["fetchLessons is async", "filters is a new object every render, so the effect re-runs, sets state, re-renders, and repeats", "setLessons is not stable", "useEffect cannot fetch data"],
      answer: 1,
      explanation: "Depend on the primitive `props.level` and build the object inside the effect. An object literal never compares equal to the previous render's object.",
    },
    {
      kind: "output",
      prompt: "Inside one click handler, `setCount(count + 1)` runs three times. The measured result was `naive=1` after one click. Why not 3?",
      code: { lang: "tsx", code: "function run() {\n  setCount(count + 1);\n  setCount(count + 1);\n  setCount(count + 1);\n}" },
      options: ["React only allows one update per event", "All three calls read the same count snapshot and queue the same value; batching renders once", "setCount is asynchronous and drops duplicates", "The third call throws"],
      answer: 1,
      explanation: "State is a snapshot. Use `setCount(c => c + 1)` three times to queue three updaters against the latest value, which produces 3.",
    },
    {
      kind: "mcq",
      prompt: "You need `fullName` from `firstName` and `lastName` state. What is the best approach?",
      options: ["An effect that sets fullName state", "Compute `firstName + ' ' + lastName` during render", "Store it in useRef", "Put it in a context provider"],
      answer: 1,
      explanation: "It is derived data: one source of truth, no extra state, no extra render, and it cannot drift.",
    },
  ],
  cheatSheet: [
    "Hooks run top level only; React matches them by call order, so conditions and loops shift every later slot.",
    "Why hooks: state and effects in function components, setup next to cleanup, reusable logic without wrapper components.",
    "State is a snapshot. React batches updates; use `setX(prev => …)` when the next value depends on the previous one.",
    "`useEffect` synchronises with an external system. It is not a lifecycle and not a place for derived data or event reactions.",
    "Derive during render; react in event handlers; reset with `key`; effects are the last resort.",
    "Dependencies: every reactive value, compared with `Object.is`. Objects/functions from render are new every time.",
    "Cleanup before the next setup and on unmount: abort, clear, remove, unsubscribe. StrictMode double-mount tests it.",
    "Stale closure: honest dependencies, functional updates, or a ref/useEffectEvent for the latest non-reactive value.",
    "`useMemo` caches a value; `useCallback` caches a function identity; both are performance tools, not correctness tools.",
    "`useRef` holds a DOM node or mutable non-render value; custom hooks package reusable state/effect logic with isolated state.",
  ],
  homework: {
    basic: {
      title: "Remove unnecessary effects",
      brief: ["Refactor a component that has three effects: one copying props.lesson into state, one computing `isComplete` from progress, one logging analytics when a button is clicked. End with zero effects and identical behaviour."],
      criteria: ["No useEffect remains", "Same rendered output", "Analytics call in the event handler"],
      hints: ["Props can be used directly; derived values are computed.", "If the component must reset when the lesson changes, use a key."],
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
      title: "useFetch with cancellation and a latest-wins test",
      brief: ["Write a generic `useFetch<T>(url, validate)` returning a discriminated union state (loading/error/ok), aborting on URL change and unmount, and validating the JSON with a type guard (lesson 1.2.3). Add a test that resolves the old request after the new one and proves only the latest result is shown."],
      criteria: ["Abort on cleanup", "Typed result via guard", "Changing URL quickly shows only the latest result", "No state update after unmount"],
      hints: ["`vi.stubGlobal('fetch', vi.fn())` in Vitest.", "Keep `validate` module-level so its identity is stable in the dependency array."],
      solution: {
        text: [
          "Same structure as LessonDetail, generalised. The effect owns the request, the cleanup aborts it, and the catch ignores an aborted signal. The guard turns `unknown` JSON into a typed value instead of asserting a shape.",
          "The test controls response order: it starts /api/a, changes the URL to /api/b, resolves B, then resolves A. Without the abort and the aborted check, A would overwrite B. With them, the older request is cancelled and its late resolution cannot set state. In a real app prefer a data library, but writing this once teaches what those libraries do.",
        ],
        code: {
          lang: "tsx",
          file: "src/useFetch.ts + src/useFetch.test.tsx",
          code: `// file: src/useFetch.ts
import { useEffect, useState } from "react";
export type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ok"; data: T };
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
    return () => ctrl.abort();                       // URL changed or component unmounted
  }, [url, validate]);                               // pass a stable validate (module-level function)
  return state;
}

// file: src/useFetch.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
interface Lesson { id: string; title: string }
const isLesson = (d: unknown): d is Lesson =>
  typeof d === "object" && d !== null && "id" in d && "title" in d;

test("the latest URL wins when responses arrive out of order", async () => {
  const pending: Array<(value: Response) => void> = [];
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))));

  const { result, rerender } = renderHook(({ url }) => useFetch(url, isLesson), {
    initialProps: { url: "/api/a" },
  });
  rerender({ url: "/api/b" });
  pending[1](new Response(JSON.stringify({ id: "b", title: "B" })));
  await waitFor(() => expect(result.current).toMatchObject({ status: "ok", data: { id: "b" } }));

  pending[0](new Response(JSON.stringify({ id: "a", title: "A" })));
  await new Promise((r) => setTimeout(r, 0));
  expect(result.current).toMatchObject({ status: "ok", data: { id: "b" } });  // A was aborted
  vi.unstubAllGlobals();
});`,
        },
        pitfalls: [
          "Catching the abort error and showing it as a failure: check `signal.aborted` first",
          "Passing an inline `validate` function, which changes identity every render and re-fetches forever",
        ],
      },
    },
    challenge: {
      title: "useMediaQuery with useSyncExternalStore",
      brief: ["Implement `useMediaQuery(query)` that returns whether a CSS media query matches, using `useSyncExternalStore` (the recommended hook for subscribing to external stores), and use it to switch the sidebar layout. Prove the listener is removed on unmount."],
      criteria: ["Subscribes and unsubscribes correctly", "No tearing (uses useSyncExternalStore)", "Works for prefers-color-scheme and width queries", "Server snapshot returns a safe default"],
      hints: ["subscribe(callback) adds a 'change' listener on matchMedia(query); getSnapshot returns .matches.", "The subscribe function must be stable or React resubscribes on every render; wrap it in useCallback."],
      solution: {
        text: ["useSyncExternalStore is built for exactly this: React reads a snapshot and re-renders when the store notifies. The server snapshot (`() => false`) keeps server rendering deterministic; the browser replaces it after hydration. This app's router and store use the same hook."],
        code: {
          lang: "tsx",
          code: `import { useCallback, useSyncExternalStore } from "react";
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,                                     // server snapshot: deterministic
  );
}

// const isDesktop = useMediaQuery("(min-width: 900px)");
// const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: hooks layer",
      brief: ["Add `web/src/hooks/` with useDebounce, useLocalStorage, useOnline and useMediaQuery plus tests. Use useDebounce in the lesson search and useLocalStorage for the theme."],
      criteria: ["Each hook has a test (fake timers for debounce)", "No eslint-plugin-react-hooks warnings", "Offline banner when navigator goes offline"],
      hints: ["renderHook from @testing-library/react tests hooks directly.", "Keep subscribe functions module-level or memoised so the store is not resubscribed every render."],
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
    { label: "react.dev: Lifecycle of Reactive Effects", url: "https://react.dev/learn/lifecycle-of-reactive-effects" },
    { label: "react.dev: Reusing Logic with Custom Hooks", url: "https://react.dev/learn/reusing-logic-with-custom-hooks" },
    { label: "react.dev: StrictMode", url: "https://react.dev/reference/react/StrictMode" },
    { label: "react.dev: exhaustive-deps lint rule", url: "https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps" },
  ],
  nextPreview: "Next: data fetching, routing and performance. Server state vs UI state, TanStack Query, React Router, and measuring before optimising.",
};
