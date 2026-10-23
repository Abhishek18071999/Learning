import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.1",
  title: "Components, props and state",
  minutes: 90,
  level: "Beginner",
  prerequisites: ["3.3.1 DOM, events and fetch", "1.2.3 TypeScript"],
  summary: "Think in React: components are pure functions from props and state to elements. Pass data down, lift shared state to one owner, control inputs, render lists with stable keys, and keep side effects out of render.",
  terms: [
    { term: "Component", def: "A function from props (and hook state) to React elements. It describes UI; it does not touch the DOM directly." },
    { term: "JSX / React element", def: "JSX is syntax that compiles to `jsx(type, props)` calls. The result is a plain object describing UI, not a DOM node." },
    { term: "Props", def: "Read-only inputs passed from a parent to a child. Data and callbacks travel this way." },
    { term: "State", def: "Data a component instance remembers between renders (`useState`). Calling its setter schedules a re-render." },
    { term: "Render and commit", def: "Render is React calling your component to compute the element tree. Commit is the separate phase where React applies the minimal DOM changes." },
    { term: "Reconciliation", def: "React comparing the new element tree with the previous one to decide which component instances and DOM nodes to reuse, update or replace." },
    { term: "Key", def: "A stable identity for an item among its siblings, used by reconciliation. Use data ids, not array indexes, when order can change." },
    { term: "Lifting state up", def: "Moving shared state to the closest common parent and passing it down as props, so one component owns the fact." },
    { term: "Controlled input", def: "A form field whose value comes from React state and whose changes go back through `onChange`. React is the source of truth." },
    { term: "Pure render", def: "A render with no observable side effects: the same props and state produce the same output, and nothing outside the component changes." },
    { term: "Side effect", def: "Work outside rendering: network calls, timers, subscriptions, DOM measurement. It belongs in event handlers or effects after commit, not in render." },
    { term: "Composition", def: "Building components from other components by passing elements as `children` or props, instead of inheriting behaviour from a base class." },
  ],
  problem: [
    "The vanilla JavaScript lesson list from 3.3.1 works, but every feature added (filters, progress badges, a 'completed' toggle) means more manual DOM updates. A bug appears when the badge count and the list disagree because one update path was forgotten. The same bug class shows up in React when one fact is stored twice: two inputs that should agree drift apart, or a row's text jumps to the wrong item after a delete.",
    "React's idea: describe what the UI should look like for the current data, and let React update the DOM. You change data (state); the UI follows. Fewer update paths means fewer inconsistencies, and components make UI reusable and testable. But React only gives you that guarantee if you respect its rules: render stays pure, props flow one way, one component owns each piece of state, and list items have stable identities. This lesson builds those rules from the ground up, with output you can reproduce.",
  ],
  concept: {
    analogy: [
      "A React component is a **recipe** and state is the **ingredients in the fridge**. You never repaint the dish by hand; when the ingredients change, you cook the recipe again and React swaps in only what changed on the plate.",
      "A spreadsheet is the closer analogy for derived data. A cell is a formula over other cells; change an input and the dependent cells recompute. You never type the result into a second cell and hope it stays in sync. A React render is that recalculation, and `doneCount` should be a formula, not a stored copy.",
    ],
    precise: [
      "A component is a function from props to elements, with state as extra memory attached to one instance. `function Badge({ count }: { count: number }) { return <span>{count}</span>; }` is the whole contract: inputs in, description out. JSX is not HTML; it compiles to element objects such as `{ type: Badge, props: { count: 3 } }`. React turns the tree of those objects into DOM, so you never call `createElement` or `textContent` yourself.",
      "The model is **UI = f(props, state)**. A render computes what the UI should look like now; a commit applies the difference to the DOM. State changes do not patch the screen directly, they schedule a new render. This is why the same component can be rendered on the server, tested in jsdom, or drawn by React Native: the function returns a description, and a renderer decides what to do with it.",
      "Data flows **one way**: down through props, up through callbacks. A child never writes to a parent's state; it calls a function the parent passed, and the owner decides. When two components need the same fact, move it to their closest common parent (lifting state up). Keep state **minimal** - if a value can be computed from props or other state, compute it during render. Copying a prop into state creates a second owner, and the copy stops following its source.",
      "Identity and purity complete the model. `key` tells reconciliation which list item is which, so component state and DOM nodes follow the right item across inserts, deletes and reorders. Render must be pure: no mutation, no network, no DOM reads and writes, because React may call it more than once and may throw a result away. Side effects belong in event handlers or in effects after commit. Components compose through `children` and props; inheritance is not the React way.",
    ],
  },
  underTheHood: {
    text: [
      "**JSX is a function call.** `<LessonCard lesson={l} onToggle={toggle} />` compiles to roughly `jsx(LessonCard, { lesson: l, onToggle: toggle })`, which produces a plain object containing a type, a key and props. That object is an *element*, not a DOM node and not the component's output. React collects elements into a tree; reconciliation later turns that description into DOM operations. Because elements are data, you can pass them as `children`, store them in a variable, or compare them cheaply.",
      "**Render is a function call, not a DOM write.** React calls your component with props and its hook state and expects a pure result: the same inputs produce the same element tree, with no mutation of values created outside the call, no network requests, and no `document` writes. StrictMode calls components twice in development precisely to expose impurity: a second call that changes what you see is a bug. Derived values (`visible`, `doneCount`) are computed here, not stored. If a value can be computed from props or state, computing it during render removes a whole class of stale-data bugs.",
      "**Commit applies the difference.** React compares the new element tree with the previous one, reuses DOM nodes where the type and key match, updates only changed attributes and text, and removes nodes that disappeared. Re-rendering a component does not mean rewriting the DOM: a parent re-render can leave a child's DOM untouched if its output is identical. Effects run after the commit, which is why they are the only safe place for DOM measurement, subscriptions and timers that must follow what is on screen.",
      "**State updates are queued, batched and snapshotted.** `setCount(count + 1)` schedules an update using the value from *this* render; it does not change the `count` variable. React batches updates from the same event and re-renders once. Two calls that both read the same snapshot both set 1 - verified in this lesson on React 19.3.1. Use the updater form `setCount(c => c + 1)` when the next value depends on the previous one. Setting a value that is `Object.is`-equal to the current one can bail out of rendering. Each component instance has its own hook slots, which is why two `<Counter />` elements do not share state unless you lift it.",
      "**Reconciliation matches by type and key.** Same position plus same type means React keeps the component instance and its DOM node and updates props. A different type unmounts the old instance and mounts a new one, losing its state. In a list, `key` is the identity React uses across renders; without a stable key React falls back to position. In this lesson's jsdom run, deleting the first row with index keys made Beta inherit Alpha's draft `A!`; with `key={item.id}` Beta kept its own empty draft. Keys only need to be unique among siblings, not globally, and they are not passed to the component as a prop.",
      "**One-way flow and controlled inputs.** Data goes down as props; a child requests a change by calling a function prop. The owner runs the setter, re-renders, and passes the new value down. A controlled input closes the loop: `value={query}` makes React the source of truth and `onChange` sends every keystroke up. Pass `value` without `onChange` and the field becomes read-only, with a React warning. Copy a prop into state and the copy stops following the prop - that is exactly the duplicated-state bug demonstrated below. Use uncontrolled inputs (`defaultValue`) only when React genuinely does not need the value.",
      "**Lifting state up and prop drilling.** When two siblings need the same fact, move it to their closest common parent: one owner, two readers. The parent passes the value and callbacks down. Passing through many intermediate components is prop drilling; it is fine at two or three levels, and compositing `children` or using context is the escape hatch when it is not. Context is for data many distant components need (theme, auth), not a default replacement for props, because it hides where a value comes from and makes reuse harder.",
      "**Composition, not inheritance, and when to split.** React has no useful component inheritance. You compose by passing elements as `children` or props (`<Card><Badge /></Card>`), and by extracting functions. Split a component when it owns more than one unrelated piece of state, when a part is reused elsewhere, when a part has a clear name and contract, or when a change keeps forcing you to edit unrelated branches. Do not split purely by line count: a 20-line component with one job is better than three components that must be read together. Keep side effects at the edges - event handlers and effects - so the middle stays pure and testable.",
    ],
    diagram: {
      title: "One update, from event to pixels",
      nodes: [
        { label: "Event", sub: "click / keystroke" },
        { label: "setState", sub: "queue an update" },
        { label: "Render", sub: "pure f(props, state)" },
        { label: "Reconcile", sub: "match type + key" },
        { label: "Commit", sub: "minimal DOM writes" },
      ],
      edges: ["schedule", "new element tree", "diff", "patch"],
      caption: "A re-render is not a DOM rewrite: React can re-run your function and commit nothing if the output is unchanged.",
    },
  },
  handsOn: [
    {
      title: "Scaffold, then describe the screen as functions of props",
      text: [
        "Create the project with `npm create vite@latest devatlas-web -- --template react-ts`, then `cd devatlas-web`, `npm install` and `npm run dev` (Vite serves `http://localhost:5173`). Replace the generated `App` with the two files below. `LessonCard` is a pure function of its props: it reads `lesson` and calls `onToggle`, and never changes either. `LessonsPage` owns the lesson data and the search query, which makes it the single owner of both facts.",
        "The search box is a controlled input: `value={query}` plus `onChange` makes React the source of truth, so the filtered list and the input can never disagree. `visible` and `done` are computed during render, not stored. The parent passes `toggle` down; the child calls it with an id and never sets the parent's state itself.",
      ],
      code: {
        lang: "tsx",
        file: "src/components/LessonCard.tsx + src/LessonsPage.tsx",
        code: `// file: src/components/LessonCard.tsx
export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  completed: boolean;
}
interface LessonCardProps {
  lesson: Lesson;
  onToggle: (id: string) => void;          // child asks the parent to change state
}
export function LessonCard({ lesson, onToggle }: LessonCardProps) {
  return (
    <article className={lesson.completed ? "card done" : "card"}>
      <h3>
        <span className="id">{lesson.id}</span> {lesson.title}
      </h3>
      <p>{lesson.minutes} min</p>
      <button type="button" onClick={() => onToggle(lesson.id)} aria-pressed={lesson.completed}>
        {lesson.completed ? "Completed ✓" : "Mark complete"}
      </button>
    </article>
  );
}

// file: src/LessonsPage.tsx
import { useState } from "react";
import { LessonCard, type Lesson } from "./components/LessonCard";
const initial: Lesson[] = [
  { id: "3.1.1", title: "Semantic HTML", minutes: 60, completed: true },
  { id: "3.2.1", title: "Flexbox and grid", minutes: 70, completed: false },
  { id: "3.4.1", title: "Components, props and state", minutes: 75, completed: false },
];
export function LessonsPage() {
  const [lessons, setLessons] = useState(initial);
  const [query, setQuery] = useState("");
  // Derived data: computed during render, NOT stored in state
  const visible = lessons.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()));
  const done = lessons.filter((l) => l.completed).length;
  function toggle(id: string) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, completed: !l.completed } : l)));   // new array, new object
  }
  return (
    <main>
      <h1>Frontend lessons</h1>
      <p>{done} of {lessons.length} completed</p>
      <label>
        Search <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {visible.length === 0 ? (
        <p>No lessons match “{query}”.</p>
      ) : (
        <div className="cards">
          {visible.map((l) => (
            <LessonCard key={l.id} lesson={l} onToggle={toggle} />    // stable key
          ))}
        </div>
      )}
    </main>
  );
}`,
      },
      notes: [
        "State is never mutated: `map` returns a new array and `{ ...l }` a new object, so React sees the change. Text in JSX is escaped automatically, so `{query}` cannot inject HTML.",
        "Props are read-only in practice: assigning `lesson.completed = true` inside the child would mutate the parent's object. React would not see the change, because the array and object references are unchanged.",
      ],
    },
    {
      title: "REAL: two sources of truth vs one lifted source",
      text: [
        "This script renders the same temperature UI twice under jsdom with React 19.3.1, types `25` into the Celsius field, and prints the committed DOM. The first version gives each field its own `useState`; the second keeps one `celsius` state in the parent component and computes Fahrenheit from it. Run it with `node state-demo.mjs` after `npm i react react-dom jsdom`.",
      ],
      code: {
        lang: "jsx",
        file: "state-demo.mjs",
        code: `import { JSDOM } from "jsdom";
import React, { useState, act } from "react";
const dom = new JSDOM("<!doctype html><body></body>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const h = React.createElement;
function type(input, value) {
  const set = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  set.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
async function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  return { container, root };
}
function Duplicated() {
  const [celsius, setCelsius] = useState(0);
  const [fahrenheit, setFahrenheit] = useState(32);       // a second owner of the same fact
  return h("div", null,
    h("label", null, "Celsius ", h("input", { value: celsius, onChange: (e) => setCelsius(e.target.value) })),
    h("label", null, "Fahrenheit ", h("input", { value: fahrenheit, onChange: (e) => setFahrenheit(e.target.value) }))
  );
}
function Lifted() {
  const [celsius, setCelsius] = useState(0);
  const fahrenheit = Math.round((Number(celsius) * 9 / 5 + 32) * 10) / 10;   // derived, not stored
  return h("div", null,
    h("label", null, "Celsius ", h("input", { value: celsius, onChange: (e) => setCelsius(e.target.value) })),
    h("label", null, "Fahrenheit ", h("input", { value: fahrenheit, readOnly: true }))
  );
}
const a = await render(h(Duplicated));
await act(async () => type(a.container.querySelector("input"), "25"));
console.log("A duplicated-state:", a.container.innerHTML);
const b = await render(h(Lifted));
await act(async () => type(b.container.querySelector("input"), "25"));
console.log("B lifted-state:    ", b.container.innerHTML);`,
      },
      output: `A duplicated-state: <div><label>Celsius <input value="25"></label><label>Fahrenheit <input value="32"></label></div>
B lifted-state:     <div><label>Celsius <input value="25"></label><label>Fahrenheit <input readonly="" value="77"></label></div>`,
      notes: [
        "Both components start at 0 °C / 32 °F. After typing 25 in Celsius, the duplicated version still shows 32 °F: the Celsius setter re-rendered only the Celsius state, and the Fahrenheit state was never told. 25 °C is 77 °F, which the lifted version derives correctly because there is one owner of the fact.",
        "The lifted version does not need a second `useState`, an effect, or an event to keep the fields in sync. `fahrenheit` is a formula over `celsius`, so it is recomputed by the same render. This is the mechanical difference between 'lift state up' and 'copy state around'.",
        "The output is the committed DOM from a real jsdom mount, not hand-written HTML. React 19.3.1, react-dom 19.3.1, jsdom 29.1.1 on Node 24.",
      ],
    },
    {
      title: "REAL: keys are identity, not position",
      text: [
        "Reuse the jsdom setup from the previous step. Each row owns a draft string in `useState`. The script types `A!` into Alpha's input, then deletes Alpha from the array. With index keys React matches the row at position 0, so the surviving row inherits Alpha's component instance and its draft. With `key={item.id}` React removes Alpha's instance and keeps Beta's, so Beta's draft is still empty.",
      ],
      code: {
        lang: "jsx",
        file: "keys-demo.mjs",
        code: `const items = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];
function Row({ item }) {
  const [draft, setDraft] = useState("");                  // state belongs to this row instance
  return h("li", null,
    h("span", { className: "name" }, item.name), " draft: ",
    h("span", { className: "draft" }, draft === "" ? "(empty)" : draft),
    h("input", { value: draft, "aria-label": item.name + " draft", onChange: (e) => setDraft(e.target.value) })
  );
}
function List({ items, byId }) {
  return h("ul", null, items.map((item, i) => h(Row, { key: byId ? item.id : i, item })));
}
async function run(byId) {
  const m = await render(h(List, { items, byId }));
  await act(async () => type(m.container.querySelector("input"), "A!"));   // type into Alpha
  await act(async () => m.root.render(h(List, { items: [items[1]], byId }))); // delete Alpha
  console.log(byId ? "keys=id:   " : "keys=index:", m.container.innerHTML);
}
await run(false);
await run(true);`,
      },
      output: `keys=index: <ul><li><span class="name">Beta</span> draft: <span class="draft">A!</span><input aria-label="Beta draft" value="A!"></li></ul>
keys=id:    <ul><li><span class="name">Beta</span> draft: <span class="draft">(empty)</span><input aria-label="Beta draft" value=""></li></ul>`,
      notes: [
        "With index keys the first instance survived the delete and was relabelled Beta, so its draft (`A!`) came with it. That is not a rendering glitch; it is reconciliation doing exactly what position-based matching implies. The same mechanism puts a checkbox or an open dropdown on the wrong row in real apps.",
        "Index keys are acceptable only when the list is static: never reordered, inserted into or deleted from. For dynamic lists use a database id. If the data has no id, create one when the item is created, not during render (a fresh `crypto.randomUUID()` on every render is a new identity and remounts the row).",
        "Keys are matched among siblings and are not passed to the component. Duplicate keys in one list also produce a React warning and undefined matching behaviour.",
      ],
    },
    {
      title: "Props, state and derived values side by side",
      text: [
        "Most 'React is confusing' moments are a confusion about ownership. This table is the decision aid: ask who owns the value and whether it can be computed from something else. If it is derived, it is not state.",
      ],
      code: {
        lang: "text",
        file: "props-vs-state-vs-derived.txt",
        code: `                    PROPS                       STATE                     DERIVED
owner               the parent                  this component            nobody
child can change    no (read-only)              yes, via its setter       no, recomputed
lifetime            while the parent renders    until unmount             not stored
changes when        the parent re-renders       setX schedules render     its inputs change
typical use         data + callbacks            user input, UI toggles    counts, filters, totals
smell               props copied into state     derived values in state   setState during render

CONTROLLED vs UNCONTROLLED
controlled          value + onChange            React owns the text       validation, live filtering
uncontrolled        defaultValue + ref          the DOM owns the text     simple forms, file inputs`,
      },
      notes: [
        "The cheapest fix for a drift bug is usually to delete a `useState` and compute the value instead. A count of completed lessons, a filtered array and a validation message are all derived.",
        "If a value truly changes on a schedule, a user action or an external event, it is state. If it is a function of existing props or state, it is not.",
      ],
    },
    {
      title: "Render, reconcile, commit - and where state belongs",
      text: [
        "Keep this flow in mind when debugging. An event queues an update; render produces a new element tree; reconciliation matches it against the old tree by type and key; commit patches the DOM; only then do effects run. A `console.log` in the component body proves render happened, not that the DOM changed.",
        "The state-placement rule sits on top: put a fact in the closest common parent of every component that reads it, and nowhere lower. If only one component reads it, keep it local. If a parent passes it down many levels untouched, consider `children` composition or context rather than widening the prop surface.",
      ],
      code: {
        lang: "mermaid",
        file: "update-flow.mmd",
        code: `flowchart TD
  E["Event: click or keystroke"] --> U["setState queues an update"]
  U --> R["Render: call components with new props/state"]
  R --> D{"Same type and key?"}
  D -->|yes| K["Reuse component instance and DOM node"]
  D -->|no| N["Unmount old, mount new (state reset)"]
  K --> C["Commit: minimal DOM changes"]
  N --> C
  C --> P["Browser paints; effects run after commit"]`,
      },
      notes: [
        "Keys choose the branch in the reconciliation diamond. That is why a changed key is a deliberate way to reset a component's state, and why an accidental key change silently wipes a form.",
        "React DevTools' 'Highlight updates' shows which components rendered, not which DOM nodes were written. The Profiler separates render time from commit time.",
      ],
    },
  ],
  companies: [
    "**React 19.3.1 (verified in this lesson):** this repository runs React 19.3.1 and react-dom 19.3.1. The duplicated-state drift, the index-key state leak, the double-`setCount` result and every DOM string above were produced by mounting the components under jsdom 29.1.1 and reading the committed output, not copied from documentation.",
    "**Meta (illustrative):** React was created at Facebook (now Meta) and open-sourced in 2013. Meta still maintains it with a large community, and react.dev is the reference used in the links below. React's component model also underpins React Native, so the same props and state rules apply to mobile screens.",
    "**Component-driven teams and Storybook (illustrative):** design-system teams develop and review components in isolation, publish them as a versioned package, and assemble product pages from them. A button, a date picker and a checkout summary use the same contract: typed props in, callbacks out, state owned locally where possible.",
    "**Framework layers (illustrative):** Next.js, React Router (Remix) and Expo add routing, server rendering and data loading around React. They change where components run and how data arrives, but not the rules in this lesson: props flow down, state has one owner, and render stays pure.",
    "**Design systems at scale (illustrative):** Shopify Polaris, GitHub Primer and Material UI expose component APIs built on these primitives. Their documentation is a useful study in prop design: small surfaces, composition through `children`, and controlled/uncontrolled variants for form controls.",
  ],
  mistakes: [
    { mistake: "Mutating state directly", why: "`lessons[0].completed = true` feels natural", wrong: "React compares references, sees the same array and object, and may skip the update; the UI and the data disagree", fix: "Create new arrays and objects: `map`, `filter`, spread, or a `Set` copy" },
    { mistake: "Storing derived data in state", why: "Caching `filteredLessons` or `doneCount` seems faster", wrong: "Two sources of truth drift apart as soon as one update path forgets the copy", fix: "Compute derived values during render; reach for `useMemo` only after measuring" },
    { mistake: "Index as key for dynamic lists", why: "It silences the key warning with one character", wrong: "After a delete or reorder, component state and DOM state attach to the wrong item (observed above: Beta inherited Alpha's draft)", fix: "Use a stable id from the data; never generate a new id during render" },
    { mistake: "State in the wrong component", why: "Putting it where it was first needed", wrong: "Siblings cannot read it, so it gets copied into each sibling and the copies drift", fix: "Lift it to the closest common parent; keep it local if only one component reads it" },
    { mistake: "Copying a prop into state", why: "`useState(props.value)` looks like a safe starting point", wrong: "The state copy is initialised once and stops following the prop, so the UI shows stale data", fix: "Use the prop directly, derive from it, or reset with a `key` when the identity changes" },
    { mistake: "Reading state right after setting it", why: "Expecting setters to behave like assignments", wrong: "`setCount(count + 1); console.log(count)` logs the old value, and two calls from one snapshot collapse into one increment", fix: "Use the updater form `setX(prev => ...)`; read the new value on the next render" },
    { mistake: "Side effects during render", why: "Fetching, writing `localStorage` or mutating a module variable in the component body", wrong: "StrictMode's double render makes the side effect run twice; discarded renders still perform it", fix: "Move side effects to event handlers or effects after commit; keep render a pure calculation" },
    { mistake: "Reaching for inheritance or one giant component", why: "A base class or a 600-line page seems easier to reason about", wrong: "Props become a grab bag, unrelated state re-renders everything, and no part can be tested alone", fix: "Compose with `children` and focused props; split at state, reuse and responsibility boundaries, not by line count" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Small components with typed props and one job; pass elements as `children` instead of adding configuration props for every variation." },
    { tag: "Reliability", text: "Give every fact exactly one owner. Lift shared state to the closest common parent, and keep everything else derived during render." },
    { tag: "Reliability", text: "Update immutably and use the updater form when the next value depends on the previous one; never mutate props or state." },
    { tag: "Maintainability", text: "Use stable data ids as keys and controlled inputs with `value` + `onChange`; split at state boundaries so a keystroke does not re-render an unrelated subtree." },
    { tag: "Security", text: "Rely on JSX escaping; avoid `dangerouslySetInnerHTML` unless the HTML is sanitised by a trusted library." },
  ],
  interview: [
    { q: "Props vs state? Where should a piece of state live?", a: "Props are inputs from a parent, read-only in the child; they are how data and callbacks flow down. State is data a component instance owns and remembers across renders; its setter schedules a re-render. The decision is about ownership: if only one component reads the value, keep it local; if several siblings need it, lift it to their closest common parent and pass it down, with callbacks for changes. If it can be computed from props or other state, it should not be state at all. Copying a prop into state is the classic mistake, because the copy stops following the source. In an interview, walk through a concrete example such as a search box plus a list: query and data live in the page, the input is controlled, the filtered list is derived, and the count is derived too." },
    { q: "Why do lists need keys, and what goes wrong with array indexes?", a: "Keys give React a stable identity for each item among its siblings, so reconciliation can match the new tree to the old one and move, insert or remove instances rather than guessing from position. With index keys, deleting the first item makes the old first instance the new first item, so its component state (an input draft, a checkbox, an open menu) travels to the wrong row. I can show the failure: typing into Alpha and deleting it leaves Beta displaying Alpha's draft with index keys, while `key={item.id}` leaves Beta's own state intact. Keys must be unique among siblings and stable across renders; they are not passed to the component. Use database ids, and if the data has no id, create one when the item is created, not during render." },
    { q: "What makes a render pure, and where do side effects belong?", a: "A pure render computes its output only from props and state and changes nothing outside the component: no mutation of shared values, no network, no `localStorage`, no DOM reads or writes. React may call it more than once, throw a result away, or run it twice in StrictMode, so an impure render produces duplicated effects and bugs that appear only in development. Derived values belong in the render; side effects belong in event handlers (for user actions) or in `useEffect` after commit (for subscriptions, timers and synchronisation with external systems). Data fetching is an effect concern, and often a framework or a query library handles it better. Keep the pure middle big and push effects to the edges - that is also what makes components easy to test and to compose instead of inheriting." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "count starts at 0. After one click, what is displayed? (Verified in this lesson on React 19.3.1.)",
      code: { lang: "tsx", code: "function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => { setCount(count + 1); setCount(count + 1); }}>{count}</button>;\n}" },
      options: ["0", "1", "2", "Error"],
      answer: 1,
      explanation: "Both calls use the same snapshot count = 0, so both set 1. Use setCount(c => c + 1) twice to get 2.",
    },
    {
      kind: "bug",
      prompt: "Clicking 'Mark complete' does not update the UI. Why?",
      code: { lang: "tsx", code: "function toggle(id: string) {\n  const l = lessons.find((x) => x.id === id)!;\n  l.completed = !l.completed;\n  setLessons(lessons);\n}" },
      options: ["find returns a copy", "The same array reference is set, after mutating an item", "toggle needs to be async", "Missing key"],
      answer: 1,
      explanation: "React sees the same array reference and may skip rendering. Return a new array with a new object for the changed item.",
    },
    {
      kind: "mcq",
      prompt: "Where should the search query live if both the SearchBox and the LessonList need it?",
      options: ["In SearchBox", "In LessonList", "In their closest common parent", "In a global variable"],
      answer: 2,
      explanation: "Lift state up and pass it down as props, with an onChange callback going back up.",
    },
  ],
  cheatSheet: [
    "UI = f(props, state). Change state, not the DOM.",
    "Render is pure and may run more than once; side effects belong in handlers or effects after commit.",
    "Props down, callbacks up. Props are read-only in the child.",
    "One owner per fact: lift shared state to the closest common parent.",
    "Minimal state; compute derived values during render.",
    "Immutable updates: map / filter / spread; new references make changes visible.",
    "setX(prev => …) when the new value depends on the old.",
    "Controlled inputs: value + onChange; value without onChange is read-only.",
    "Keys are identity: stable data ids, not array indexes, for dynamic lists.",
    "Compose with children and focused props; split at state, reuse and responsibility boundaries.",
  ],
  homework: {
    basic: {
      title: "Quiz question component",
      brief: ["Build a `QuestionCard` component with props `{ prompt, options, answer, onAnswered(correct) }`: select an option, click 'Check', show correct/incorrect and disable further changes."],
      criteria: ["Typed props", "State: selected index and checked flag", "Accessible: options are buttons or radio inputs with labels"],
      hints: ["Two pieces of state are enough: selected and checked.", "Correctness is derived from selected and answer; do not store a third boolean."],
      solution: {
        text: ["Selected and checked are the only state; correctness is derived. The component never mutates its props or writes to the DOM: every visible difference is a function of those two values."],
        code: {
          lang: "tsx",
          code: `import { useState } from "react";
interface Props { prompt: string; options: string[]; answer: number; onAnswered?: (correct: boolean) => void }
export function QuestionCard({ prompt, options, answer, onAnswered }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = selected === answer;
  return (
    <fieldset>
      <legend>{prompt}</legend>
      {options.map((opt, i) => (
        <label key={opt}>
          <input type="radio" name={prompt} disabled={checked} checked={selected === i} onChange={() => setSelected(i)} />
          {opt}
        </label>
      ))}
      {!checked ? (
        <button type="button" disabled={selected === null} onClick={() => { setChecked(true); onAnswered?.(correct); }}>Check</button>
      ) : (
        <p role="status">{correct ? "Correct!" : \`Not quite: the answer is \${options[answer]}\`}</p>
      )}
    </fieldset>
  );
}`,
        },
      },
    },
    intermediate: {
      title: "Port the vanilla lesson list to React",
      brief: ["Rebuild your 3.3.1 lesson list in React: search, completed filter (all / done / todo), counter, and toggle. Compare lines of code and bug surface with the vanilla version."],
      criteria: ["State only for lessons, query and filter", "All counts derived", "Short written comparison"],
      hints: ["Filter type: 'all' | 'done' | 'todo'.", "Ask of every value: can it be computed from the three pieces of state?"],
      solution: {
        text: [
          "Three pieces of state: lessons, query and filter. The visible list, the 'N of M completed' counter and the empty message are all computed from them during render, so there is no code that updates the DOM and nothing that can fall out of sync. toggle() returns a new array with a new object for the changed lesson.",
          "Comparison with the 3.3.1 vanilla prototype: app.js was 77 lines plus 24 lines of HTML, and about half of it was DOM bookkeeping (cloning the template, setting textContent, replaceChildren, and updating the button label in two places: in show() and again in the click handler). The React component is 64 lines including markup and the new done/todo filter and counter, with no DOM calls. The vanilla bug surface is 'forgot to update one place'; in React a view cannot be stale, the bugs that remain are wrong state transitions, which a test like the one below catches. The prototype still owns fetching; in React that moves to an effect (3.4.2) and then TanStack Query (3.4.3).",
          "The test goes through the same sequence a user would: filter to To do, complete a lesson (it leaves the view and the counter goes to 2 of 3), search, then switch the filter. Verified with tsc (TypeScript 7.0.2) and Vitest 5.0.5 + jsdom + Testing Library on React 19.3.1.",
        ],
        code: {
          lang: "tsx",
          file: "src/LessonList.tsx + src/LessonList.test.tsx",
          code: `// file: src/LessonList.tsx
import { useState } from "react";
export interface Lesson { id: string; title: string; minutes: number; completed: boolean }
type Filter = "all" | "done" | "todo";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "done", label: "Done" },
  { value: "todo", label: "To do" },
];
export function LessonList({ initial }: { initial: Lesson[] }) {
  // The only state: the data and the two user inputs
  const [lessons, setLessons] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Everything else is derived during render, so it can never disagree
  const q = query.trim().toLowerCase();
  const visible = lessons
    .filter((l) => filter === "all" || (filter === "done") === l.completed)
    .filter((l) => l.title.toLowerCase().includes(q) || l.id.includes(q));
  const doneCount = lessons.filter((l) => l.completed).length;
  function toggle(id: string) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, completed: !l.completed } : l)));
  }
  return (
    <main>
      <h1>Lessons</h1>
      <p>{doneCount} of {lessons.length} completed</p>
      <label htmlFor="lesson-search">Search</label>
      <input id="lesson-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <fieldset>
        <legend>Show</legend>
        {FILTERS.map((f) => (
          <label key={f.value}>
            <input type="radio" name="filter" value={f.value}
                   checked={filter === f.value} onChange={() => setFilter(f.value)} />
            {f.label}
          </label>
        ))}
      </fieldset>
      {visible.length === 0 ? (
        <p role="status">No lessons match.</p>
      ) : (
        <ul>
          {visible.map((l) => (
            <li key={l.id}>
              <span>{l.id} {l.title} ({l.minutes} min)</span>
              <button type="button" aria-pressed={l.completed} onClick={() => toggle(l.id)}>
                {l.completed ? "Completed" : "Mark complete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// file: src/LessonList.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonList, type Lesson } from "./LessonList";
const lessons: Lesson[] = [
  { id: "3.1.1", title: "Semantic HTML", minutes: 60, completed: true },
  { id: "3.2.1", title: "Flexbox and grid", minutes: 70, completed: false },
  { id: "3.3.1", title: "DOM, events and fetch", minutes: 70, completed: false },
];
test("filter, search and toggle all drive the same derived view", async () => {
  const user = userEvent.setup();
  render(<LessonList initial={lessons} />);
  expect(screen.getByText("1 of 3 completed")).toBeTruthy();
  await user.click(screen.getByRole("radio", { name: "To do" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  await user.click(screen.getAllByRole("button", { name: "Mark complete" })[0]);
  expect(screen.getByText("2 of 3 completed")).toBeTruthy();
  expect(screen.getAllByRole("listitem")).toHaveLength(1);     // it left the "To do" view
  await user.type(screen.getByRole("searchbox", { name: "Search" }), "grid");
  expect(screen.getByRole("status").textContent).toBe("No lessons match.");
  await user.click(screen.getByRole("radio", { name: "Done" }));
  expect(screen.getByRole("listitem").textContent).toContain("Flexbox and grid");
});`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/LessonList.test.tsx > filter, search and toggle all drive the same derived view

 Test Files  1 passed (1)
       Tests  1 passed (1)`,
      },
    },
    challenge: {
      title: "Reusable accessible Tabs component",
      brief: ["Build `<Tabs items={[{ id, label, content }]} />` with roving tabindex and arrow-key navigation (as in lesson 3.1.1), controlled or uncontrolled (optional `value`/`onChange` props)."],
      criteria: ["Correct ARIA roles and keyboard behaviour", "Works controlled and uncontrolled", "Testing Library test with keyboard events"],
      hints: ["const isControlled = value !== undefined; const current = isControlled ? value : internal;", "State is only needed for the uncontrolled mode; in controlled mode the parent owns the selection."],
      solution: {
        text: ["Supporting both modes is a common pattern in design-system components: internal state by default, parent control when needed. The `??` picks the owner, so there is never more than one source of truth for the selected tab."],
        code: {
          lang: "tsx",
          code: `import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
interface Tab { id: string; label: string; content: ReactNode }
interface Props { items: Tab[]; value?: string; onChange?: (id: string) => void }
export function Tabs({ items, value, onChange }: Props) {
  const [internal, setInternal] = useState(items[0]?.id);
  const current = value ?? internal;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function select(id: string) {
    if (value === undefined) setInternal(id);
    onChange?.(id);
    refs.current[id]?.focus();
  }
  function onKey(e: KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (delta) select(items[(index + delta + items.length) % items.length].id);
  }
  return (
    <div>
      <div role="tablist">
        {items.map((t, i) => (
          <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} role="tab" id={\`tab-\${t.id}\`}
            aria-selected={t.id === current} aria-controls={\`panel-\${t.id}\`} tabIndex={t.id === current ? 0 : -1}
            onClick={() => select(t.id)} onKeyDown={(e) => onKey(e, i)}>
            {t.label}
          </button>
        ))}
      </div>
      {items.map((t) => (
        <div key={t.id} role="tabpanel" id={\`panel-\${t.id}\`} aria-labelledby={\`tab-\${t.id}\`} hidden={t.id !== current} tabIndex={0}>
          {t.content}
        </div>
      ))}
    </div>
  );
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: React app with lesson list and quiz",
      brief: ["Create `web/` in DevAtlas with Vite React TS. Implement LessonsPage, LessonCard and QuestionCard with typed props and Testing Library tests, using static JSON data for now."],
      criteria: ["npm test and npm run build pass in CI", "No state duplication", "Keyboard accessible"],
      hints: ["Put shared types in web/src/api/types.ts from lesson 1.2.3.", "The only state is what the user changes; lessons and quizzes are static data."],
      solution: {
        text: [
          "Lessons are static data imported from JSON and assigned to a typed constant (`const lessons: Lesson[] = data`), so a typo in the JSON fails the type check instead of rendering undefined. They are not state: the only state is what the user changes, the set of completed ids and the quiz answers. Counters and the quiz list are derived during render, so there is nothing to keep in sync.",
          "LessonCard receives `completed` and `onToggle` from the page (state lives in the closest common parent). QuestionCard is the component from the basic tier, unchanged. Every control is a native button or radio, so the keyboard test can Tab to the first card's button and press Enter.",
          "Verified in a Vite 8 + React 19.3.1 + TypeScript 7.0.2 project: `npm test` (Vitest 5.0.5, jsdom, Testing Library) passes the three tests below and `npm run build` (tsc -b && vite build) succeeds. The workflow file runs the same three commands in GitHub Actions; it was not run on GitHub here.",
        ],
        code: {
          lang: "tsx",
          file: "web/src (types, LessonCard, LessonsPage, test) + CI workflow",
          code: `// file: web/src/api/types.ts
export interface Question { prompt: string; options: string[]; answer: number }
export interface Lesson { id: string; title: string; minutes: number; quiz: Question[] }

// file: web/src/data/lessons.json  (tsconfig: "resolveJsonModule": true)
[
  { "id": "3.1.1", "title": "Semantic HTML and accessibility", "minutes": 60,
    "quiz": [{ "prompt": "A control navigates to /pricing. Which element?", "options": ["<button>", "<a href>", "<div onclick>"], "answer": 1 }] },
  { "id": "3.2.1", "title": "CSS layout: flexbox and grid", "minutes": 70,
    "quiz": [{ "prompt": "Which property centres a single grid child?", "options": ["place-items", "float", "vertical-align"], "answer": 0 }] },
  { "id": "3.4.1", "title": "React components, props and state", "minutes": 75,
    "quiz": [{ "prompt": "Where should derived values live?", "options": ["In state", "Computed during render", "In a ref"], "answer": 1 }] }
]

// file: web/src/components/LessonCard.tsx
import type { Lesson } from "../api/types";
interface LessonCardProps {
  lesson: Lesson;
  completed: boolean;
  onToggle: (id: string) => void;
}
export function LessonCard({ lesson, completed, onToggle }: LessonCardProps) {
  return (
    <article className={completed ? "card done" : "card"} aria-labelledby={\`lesson-\${lesson.id}\`}>
      <h3 id={\`lesson-\${lesson.id}\`}>
        <span className="id">{lesson.id}</span> {lesson.title}
      </h3>
      <p>{lesson.minutes} min</p>
      <button type="button" onClick={() => onToggle(lesson.id)} aria-pressed={completed}>
        {completed ? "Completed" : "Mark complete"}
      </button>
    </article>
  );
}

// file: web/src/LessonsPage.tsx  (QuestionCard is the basic-tier component)
import { useState } from "react";
import type { Lesson } from "./api/types";
import data from "./data/lessons.json";
import { LessonCard } from "./components/LessonCard";
import { QuestionCard } from "./components/QuestionCard";
const lessons: Lesson[] = data;        // static JSON, checked against the type at compile time
export function LessonsPage() {
  // State holds only what the user changes; lessons themselves are static data, not state
  const [completed, setCompleted] = useState<ReadonlySet<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  // Derived values
  const doneCount = lessons.filter((l) => completed.has(l.id)).length;
  const correctCount = Object.values(answers).filter(Boolean).length;
  const quiz = lessons.flatMap((l) => l.quiz.map((q, i) => ({ ...q, key: \`\${l.id}-\${i}\` })));
  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return (
    <main>
      <h1>Frontend lessons</h1>
      <p>{doneCount} of {lessons.length} completed</p>
      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        {lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} completed={completed.has(l.id)} onToggle={toggle} />
        ))}
      </section>
      <section aria-labelledby="quiz-heading">
        <h2 id="quiz-heading">Quick check</h2>
        <p>{correctCount} of {quiz.length} correct</p>
        {quiz.map((q) => (
          <QuestionCard key={q.key} prompt={q.prompt} options={q.options} answer={q.answer}
            onAnswered={(correct) => setAnswers((prev) => ({ ...prev, [q.key]: correct }))} />
        ))}
      </section>
    </main>
  );
}

// file: web/src/LessonsPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonsPage } from "./LessonsPage";
test("lessons can be completed with the keyboard only", async () => {
  const user = userEvent.setup();
  render(<LessonsPage />);
  expect(screen.getByText("0 of 3 completed")).toBeTruthy();
  await user.tab();                                   // first focusable element: lesson 3.1.1's button
  expect(document.activeElement).toBe(screen.getAllByRole("button", { name: "Mark complete" })[0]);
  await user.keyboard("{Enter}");
  expect(screen.getByText("1 of 3 completed")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Completed" }).getAttribute("aria-pressed")).toBe("true");
});
test("answering a question updates the derived score", async () => {
  const user = userEvent.setup();
  render(<LessonsPage />);
  const group = screen.getByRole("group", { name: "Where should derived values live?" });
  await user.click(screen.getByRole("radio", { name: "Computed during render" }));
  await user.click(screen.getAllByRole("button", { name: "Check" })[2]);
  expect(group.textContent).toContain("Correct!");
  expect(screen.getByText("1 of 3 correct")).toBeTruthy();
});
test("a wrong answer shows the right one and locks the options", async () => {
  const user = userEvent.setup();
  render(<LessonsPage />);
  await user.click(screen.getByRole("radio", { name: "<button>" }));
  await user.click(screen.getAllByRole("button", { name: "Check" })[0]);
  expect(screen.getByRole("status").textContent).toBe("Not quite: the answer is <a href>");
  expect((screen.getByRole("radio", { name: "<button>" }) as HTMLInputElement).disabled).toBe(true);
});

# file: .github/workflows/web.yml
name: web
on: [push, pull_request]
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci
      - run: npm test
      - run: npm run build`,
        },
        output: `$ npx vitest run --reporter=verbose
 ✓ src/LessonsPage.test.tsx > lessons can be completed with the keyboard only
 ✓ src/LessonsPage.test.tsx > answering a question updates the derived score
 ✓ src/LessonsPage.test.tsx > a wrong answer shows the right one and locks the options

 Test Files  1 passed (1)
      Tests  3 passed (3)`,
        pitfalls: [
          "Copying the JSON lessons into useState: they never change, and a copy invites drift between two sources of truth",
          "Storing doneCount or the score in state alongside the data it is computed from",
        ],
      },
    },
  },
  deeper: [
    { label: "react.dev: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
    { label: "react.dev: Managing State", url: "https://react.dev/learn/managing-state" },
    { label: "react.dev: Rendering Lists (keys)", url: "https://react.dev/learn/rendering-lists" },
    { label: "react.dev: Keeping Components Pure", url: "https://react.dev/learn/keeping-components-pure" },
    { label: "react.dev: Sharing State Between Components", url: "https://react.dev/learn/sharing-state-between-components" },
    { label: "Testing Library: React", url: "https://testing-library.com/docs/react-testing-library/intro/" },
  ],
  nextPreview: "Next: hooks and effects done right. When you need useEffect, when you absolutely do not, and how to write custom hooks.",
};
