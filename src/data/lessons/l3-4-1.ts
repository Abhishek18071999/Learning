import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.4.1",
  title: "Components, props and state",
  minutes: 75,
  level: "Beginner",
  prerequisites: ["3.3.1 DOM, events and fetch", "1.2.3 TypeScript"],
  summary: "Think in React: split UI into components, pass data down with typed props, keep state minimal and in the right place, handle events and forms, and render lists with stable keys.",
  terms: [
    { term: "Component", def: "A function that returns UI (JSX) for given inputs. Components compose like LEGO bricks." },
    { term: "JSX", def: "HTML-like syntax in JavaScript/TypeScript that compiles to function calls creating React elements." },
    { term: "Props", def: "Inputs passed from a parent to a child component. Read-only inside the child." },
    { term: "State", def: "Data a component remembers between renders (useState). Changing it re-renders the component." },
    { term: "Render", def: "React calling your component function to compute what the UI should look like now." },
    { term: "Key", def: "A stable identifier on list items so React can match items between renders." },
    { term: "Lifting state up", def: "Moving shared state to the closest common parent and passing it down as props." },
  ],
  problem: [
    "The vanilla JavaScript lesson list from 3.3.1 works, but every feature added (filters, progress badges, a 'completed' toggle) means more manual DOM updates. A bug appears when the badge count and the list disagree because one update path was forgotten.",
    "React's idea: describe what the UI should look like for the current data, and let React update the DOM. You change data (state); the UI follows. Fewer update paths means fewer inconsistencies, and components make UI reusable and testable.",
  ],
  concept: {
    analogy: [
      "A React component is a **recipe** and state is the **ingredients in the fridge**. You never repaint the dish by hand; when the ingredients change, you cook the recipe again and React swaps in only what changed on the plate.",
    ],
    precise: [
      "UI = f(state). A component is a function from props and state to JSX. When state changes via its setter, React re-runs the component, compares the new element tree with the previous one (reconciliation) and applies the minimal DOM changes.",
      "**Thinking in React**: (1) break the UI into a component hierarchy; (2) build a static version with props; (3) find the minimal state (do not store what you can compute); (4) decide where state lives (closest common parent of the components that need it); (5) pass callbacks down so children can request changes.",
      "Data flows **one way**: down through props. Children communicate up by calling functions passed as props. Props are immutable for the child; state is owned by one component.",
      "**Lists** need `key` props that are stable and unique among siblings (database ids), never array indexes when items can be reordered, inserted or deleted.",
    ],
  },
  underTheHood: {
    text: [
      "JSX `<Badge count={3} />` compiles to roughly `jsx(Badge, { count: 3 })`, producing a plain object describing what to render. Rendering is calling component functions to build this tree; committing is applying the DOM changes.",
      "State updates are queued: `setCount(count + 1)` does not change `count` in the current render. React batches multiple updates and re-renders once. Use the updater form `setCount(c => c + 1)` when the next value depends on the previous one.",
      "Keys let React tell 'item moved' from 'item replaced'. With index keys, deleting the first row makes React reuse the first DOM node for what was the second item, so any internal state (an input's text, a checkbox) ends up on the wrong row.",
    ],
    diagram: {
      title: "One-way data flow",
      nodes: [
        { label: "LessonsPage", sub: "state: lessons, query" },
        { label: "SearchBox", sub: "props: query, onChange" },
        { label: "LessonList", sub: "props: lessons" },
        { label: "LessonCard", sub: "props: lesson, onToggle" },
      ],
      edges: ["props ↓ / callbacks ↑", "filtered lessons", "per item"],
    },
  },
  handsOn: [
    {
      title: "Create a React + TypeScript project",
      code: {
        lang: "bash",
        code: `npm create vite@latest devatlas-web -- --template react-ts
cd devatlas-web
npm install
npm run dev          # http://localhost:5173`,
      },
      notes: ["Vite's template prompts may change slightly between versions; choose React + TypeScript."],
    },
    {
      title: "Typed components and props",
      code: {
        lang: "tsx",
        file: "src/components/LessonCard.tsx",
        code: `export interface Lesson {
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
}`,
      },
    },
    {
      title: "State in the closest common parent; derived values computed",
      code: {
        lang: "tsx",
        file: "src/LessonsPage.tsx",
        code: `import { useState } from "react";
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
      notes: ["State is never mutated: `map` returns a new array and `{ ...l }` a new object, so React sees the change. Text in JSX is escaped automatically, so `{query}` cannot inject HTML."],
    },
    {
      title: "Controlled form with validation",
      code: {
        lang: "tsx",
        file: "src/components/GoalForm.tsx",
        code: `import { useState, type FormEvent } from "react";

type Goal = "full-stack" | "backend" | "ai-engineer";

export function GoalForm({ onSave }: { onSave: (name: string, goal: Goal) => void }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<Goal>("full-stack");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }
    setError(null);
    onSave(name.trim(), goal);
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="name">Your name</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)}
             aria-invalid={error ? true : undefined} aria-describedby={error ? "name-error" : undefined} />
      {error && <p id="name-error" role="alert">{error}</p>}

      <label htmlFor="goal">Goal</label>
      <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
        <option value="full-stack">Full-stack</option>
        <option value="backend">Backend</option>
        <option value="ai-engineer">AI engineer</option>
      </select>

      <button type="submit">Save</button>
    </form>
  );
}`,
      },
    },
    {
      title: "Test a component like a user",
      code: {
        lang: "tsx",
        file: "src/LessonsPage.test.tsx",
        code: `// npm i -D vitest jsdom @testing-library/react @testing-library/user-event
// vite.config.ts: test: { environment: "jsdom", globals: true }  (globals enables automatic cleanup between tests)
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { LessonsPage } from "./LessonsPage";

test("marking a lesson complete updates the counter", async () => {
  render(<LessonsPage />);
  expect(screen.getByText("1 of 3 completed")).toBeTruthy();
  const buttons = screen.getAllByRole("button", { name: "Mark complete" });
  await userEvent.click(buttons[0]);
  expect(screen.getByText("2 of 3 completed")).toBeTruthy();
});

test("search filters the list", async () => {
  render(<LessonsPage />);
  await userEvent.type(screen.getByRole("textbox"), "grid");
  expect(screen.getAllByRole("article")).toHaveLength(1);
});`,
      },
      notes: ["Testing Library queries by role and visible text, the way users and assistive technology find elements, so tests also nudge you toward accessible markup."],
    },
  ],
  companies: [
    "**React is one of the most widely used UI libraries** for web apps (and, via React Native, mobile apps). Large products split their UIs into hundreds of components, often in a shared design system with Storybook documentation.",
    "**Component-driven development**: teams build and review components in isolation (Storybook), test them with Testing Library, and assemble pages from them.",
    "**Frameworks on top of React** (Next.js, Remix/React Router, Expo) add routing, server rendering and data loading; the component, props and state model stays the same.",
  ],
  mistakes: [
    { mistake: "Mutating state directly", why: "lessons[0].completed = true feels natural", wrong: "React does not detect the change; UI does not update or updates inconsistently", fix: "Create new arrays/objects: map, filter, spread" },
    { mistake: "Storing derived data in state", why: "Caching 'filteredLessons' or 'doneCount'", wrong: "Two sources of truth that drift apart", fix: "Compute derived values during render (useMemo only if measurably slow)" },
    { mistake: "Index as key for dynamic lists", why: "Quick fix for the key warning", wrong: "Inputs and state appear on the wrong rows after inserts/deletes", fix: "Use stable ids from the data" },
    { mistake: "State in the wrong component", why: "Putting it where it was first needed", wrong: "Sibling components cannot share it; prop drilling hacks", fix: "Lift it to the closest common parent; use context only for truly global data" },
    { mistake: "Reading state right after setting it", why: "Expecting synchronous updates", wrong: "Stale values; double increments lost", fix: "Use the updater function setX(prev => …); read the new value on the next render" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Small components with typed props; one component per file for anything reused." },
    { tag: "Reliability", text: "Minimal state, derived values computed; immutable updates." },
    { tag: "Maintainability", text: "Test behaviour with Testing Library by role and text, not implementation details." },
    { tag: "Security", text: "Rely on JSX escaping; avoid dangerouslySetInnerHTML unless the HTML is sanitised." },
  ],
  interview: [
    { q: "Props vs state?", a: "Props are inputs from the parent, read-only in the child. State is data owned by a component that changes over time; updating it re-renders the component. Shared state lives in the closest common ancestor and flows down as props." },
    { q: "Why do lists need keys?", a: "Keys let React match items between renders so it can move, insert or remove DOM nodes correctly and keep component state attached to the right item. Keys must be stable and unique among siblings; indexes break when items are reordered or removed." },
    { q: "Why must state updates be immutable?", a: "React decides whether to re-render and what changed by comparing references. Mutating an object keeps the same reference, so React may skip updates and memoised components show stale data. New objects make changes explicit and enable cheap comparisons." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "count starts at 0. After one click, what is displayed?",
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
      explanation: "React sees the same array and may skip rendering. Return a new array with a new object for the changed item.",
    },
    {
      kind: "mcq",
      prompt: "Where should the search query live if both the SearchBox and the LessonList need it?",
      options: ["In SearchBox", "In LessonList", "In their closest common parent", "In a global variable"],
      answer: 2,
      explanation: "Lift state up and pass it down as props.",
    },
  ],
  cheatSheet: [
    "UI = f(state). Change state, not the DOM.",
    "Props down, callbacks up. Props are read-only.",
    "Minimal state; compute derived values in render.",
    "Immutable updates: map / filter / spread.",
    "setX(prev => …) when the new value depends on the old.",
    "Stable keys from data ids, not indexes.",
    "Controlled inputs: value + onChange.",
    "Test with Testing Library by role and text.",
  ],
  homework: {
    basic: {
      title: "Quiz question component",
      brief: ["Build a `QuestionCard` component with props `{ prompt, options, answer, onAnswered(correct) }`: select an option, click 'Check', show correct/incorrect and disable further changes."],
      criteria: ["Typed props", "State: selected index and checked flag", "Accessible: options are buttons or radio inputs with labels"],
      hints: ["Two pieces of state are enough: selected and checked."],
      solution: {
        text: ["Selected and checked are the only state; correctness is derived."],
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
      hints: ["Filter type: 'all' | 'done' | 'todo'."],
      solution: {
        text: ["The React version usually has no explicit DOM update code at all: every view (list, counter, empty state) is computed from three pieces of state, so they cannot disagree."],
      },
    },
    challenge: {
      title: "Reusable accessible Tabs component",
      brief: ["Build `<Tabs items={[{ id, label, content }]} />` with roving tabindex and arrow-key navigation (as in lesson 3.1.1), controlled or uncontrolled (optional `value`/`onChange` props)."],
      criteria: ["Correct ARIA roles and keyboard behaviour", "Works controlled and uncontrolled", "Testing Library test with keyboard events"],
      hints: ["const isControlled = value !== undefined; const current = isControlled ? value : internal;"],
      solution: {
        text: ["Supporting both modes is a common pattern in design-system components: internal state by default, parent control when needed."],
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
      hints: ["Put shared types in web/src/api/types.ts from lesson 1.2.3."],
      solution: {
        text: ["This becomes the real DevAtlas frontend; the next lessons add effects, data fetching, routing and performance work on top."],
      },
    },
  },
  deeper: [
    { label: "react.dev: Thinking in React", url: "https://react.dev/learn/thinking-in-react" },
    { label: "react.dev: Managing State", url: "https://react.dev/learn/managing-state" },
    { label: "react.dev: Rendering Lists (keys)", url: "https://react.dev/learn/rendering-lists" },
    { label: "Testing Library: React", url: "https://testing-library.com/docs/react-testing-library/intro/" },
  ],
  nextPreview: "Next: hooks and effects done right. When you need useEffect, when you absolutely do not, and how to write custom hooks.",
};
