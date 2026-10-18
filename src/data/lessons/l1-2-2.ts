import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.2",
  title: "Closures, scope and modules",
  minutes: 55,
  level: "Beginner",
  prerequisites: ["1.2.1 The event loop, promises and async/await", "Basic JavaScript syntax"],
  summary: "Understand how JavaScript decides which variable a name refers to, how functions remember their surroundings (closures), how `this` works, and how ES modules organise code.",
  terms: [
    { term: "Scope", def: "The region of code where a variable is visible. JavaScript has global, module, function and block scope." },
    { term: "Lexical scope", def: "Scope is decided by where code is written, not where it is called." },
    { term: "Closure", def: "A function together with the variables from the scope where it was created, which it keeps access to even after that scope has finished." },
    { term: "Hoisting", def: "Declarations are processed before code runs. `var` is initialised to undefined; `let`/`const` exist but cannot be used before their line (temporal dead zone)." },
    { term: "this", def: "A value set by how a function is called (method call, plain call, new, call/apply/bind). Arrow functions do not have their own `this`; they use the surrounding one." },
    { term: "ES module", def: "A file with `import`/`export`. Each module has its own scope and is evaluated once." },
  ],
  problem: [
    "A dashboard attaches click handlers in a loop. Every button shows \"Lesson 5\" instead of its own number. In another file, a utility accidentally overwrites a global variable named `config`, breaking an unrelated feature.",
    "Both bugs come from scope. Closures and modules are also the tools React hooks, event handlers, middleware and almost every JavaScript library are built from, so understanding them makes the rest of the frontend phase much easier.",
  ],
  concept: {
    analogy: [
      "A closure is a **backpack**. When a function is created, it packs the variables it can see into a backpack and carries it wherever it goes. Even when it is called much later, somewhere else entirely, it can still open the backpack. Each time the outer function runs, a new backpack is packed.",
    ],
    precise: [
      "When code uses a name, JavaScript looks in the current scope, then the enclosing one, outward to module/global scope: the **scope chain**, fixed by where the code is written (lexical scoping).",
      "A function keeps a reference to the scope it was created in. If that scope's variables are still referenced by a living function, they stay alive. That is a closure. It is how you get private state, factories, memoisation, and callbacks that 'remember' values.",
      "`let` and `const` are **block-scoped**: a `for (let i...)` loop creates a new `i` per iteration. `var` is function-scoped: one `i` shared by every iteration, which causes the classic loop bug.",
      "ES modules give each file its own scope; only exported names are visible to importers. This replaced global variables and script-tag ordering as the way to structure JavaScript.",
    ],
  },
  underTheHood: {
    text: [
      "Each function call creates an **environment record** holding its local variables and a pointer to its outer environment. Closures are functions that hold a pointer to such a record; the garbage collector keeps the record alive while any closure references it.",
      "`this` is not part of the scope chain. It is decided at call time: `obj.method()` → obj; plain `fn()` → undefined in strict mode (modules are always strict); `new Fn()` → the new object; `fn.call(x)` → x. Arrow functions skip this rule and use the `this` of where they were written, which is why they are convenient inside methods and callbacks.",
      "Modules are evaluated once and cached. Imports are **live bindings**: if the exporting module changes an exported `let`, importers see the new value. Circular imports are allowed but values may be uninitialised during evaluation, a common source of confusing undefined errors.",
    ],
    diagram: {
      title: "Scope chain lookup for `count`",
      nodes: [
        { label: "inner()", sub: "no count here" },
        { label: "makeCounter()", sub: "let count = 0 ✓" },
        { label: "module scope", sub: "" },
        { label: "global", sub: "" },
      ],
      edges: ["look outward", "", ""],
    },
  },
  handsOn: [
    {
      title: "A closure with private state",
      code: {
        lang: "javascript",
        file: "counter.mjs",
        code: `function makeCounter(start = 0) {
  let count = start;                 // private: only the returned functions can see it
  return {
    increment: () => ++count,
    reset: () => { count = start; },
    get value() { return count; },
  };
}

const a = makeCounter();
const b = makeCounter(10);
a.increment(); a.increment();
b.increment();
console.log(a.value, b.value);       // each call to makeCounter packed a new backpack
console.log(a.count);                // not reachable from outside`,
      },
      output: "2 11\nundefined",
    },
    {
      title: "The loop bug and its fix",
      code: {
        lang: "javascript",
        file: "loop.mjs",
        code: `const withVar = [];
for (var i = 1; i <= 3; i++) withVar.push(() => i);
console.log(withVar.map((f) => f()));   // one shared i, already 4

const withLet = [];
for (let j = 1; j <= 3; j++) withLet.push(() => j);
console.log(withLet.map((f) => f()));   // a fresh j per iteration`,
      },
      output: "[ 4, 4, 4 ]\n[ 1, 2, 3 ]",
    },
    {
      title: "Practical closures: memoise and once",
      code: {
        lang: "javascript",
        file: "utils.mjs",
        code: `export function memoize(fn) {
  const cache = new Map();                       // lives in the closure
  return (arg) => {
    if (!cache.has(arg)) cache.set(arg, fn(arg));
    return cache.get(arg);
  };
}

export function once(fn) {
  let done = false, result;
  return (...args) => {
    if (!done) { done = true; result = fn(...args); }
    return result;
  };
}

const slowSquare = (n) => { console.log("computing", n); return n * n; };
const fastSquare = memoize(slowSquare);
console.log(fastSquare(9), fastSquare(9));       // computes once

const init = once(() => { console.log("connecting..."); return "conn"; });
init(); init();`,
      },
      output: "computing 9\n81 81\nconnecting...",
    },
    {
      title: "`this`: method calls vs detached functions",
      code: {
        lang: "javascript",
        file: "this.mjs",
        code: `const timer = {
  seconds: 0,
  tickRegular() { return this.seconds + 1; },
  startArrow() { return [1, 2].map(() => this.seconds + 1); },   // arrow uses timer's this
};
console.log(timer.tickRegular());        // called as a method: this = timer
const detached = timer.tickRegular;
try { detached(); } catch (e) { console.log("error:", e.constructor.name); }
console.log(timer.startArrow());
console.log(detached.bind(timer)());     // bind fixes this`,
      },
      output: "1\nerror: TypeError\n[ 1, 1 ]\n1",
      notes: ["In ES modules (strict mode), a detached call has `this === undefined`, so reading `this.seconds` throws. This is exactly what happens when you pass `obj.method` as a callback."],
    },
    {
      title: "ES modules: named and default exports",
      code: {
        lang: "javascript",
        file: "math.mjs",
        code: `// math.mjs
export const PI = 3.14159;
export function area(r) { return PI * r * r; }
export default function describe(r) { return \`circle r=\${r}, area=\${area(r).toFixed(2)}\`; }

// main.mjs
// import describe, { area, PI } from "./math.mjs";
// import * as math from "./math.mjs";
// console.log(describe(2), math.PI);`,
      },
      notes: ["Prefer named exports in application code: they are easier to search and rename. In Node, use .mjs or \"type\": \"module\" in package.json to enable ESM."],
    },
  ],
  companies: [
    "**React hooks are closures.** Every render creates new functions that close over that render's props and state. The famous 'stale closure' bug (an effect or interval reading an old state value) is a closure bug, covered in Phase 3.",
    "**Middleware and handlers**: Express/Koa middleware factories like `rateLimit({ max: 100 })` return closures holding their configuration. The same pattern appears in C# delegates and Python decorators.",
    "**Bundlers rely on ES modules**: tools like Vite, webpack and esbuild analyse import/export statically to remove unused code (tree shaking), which keeps the JavaScript users download small.",
  ],
  mistakes: [
    { mistake: "Using var in loops with callbacks", why: "Old tutorials use var", wrong: "All callbacks see the final value", fix: "Use let/const; avoid var entirely" },
    { mistake: "Passing obj.method as a callback", why: "It looks like passing the method", wrong: "this is undefined inside, causing TypeErrors", fix: "Use an arrow wrapper () => obj.method() or bind" },
    { mistake: "Accidental globals", why: "Assigning to an undeclared name in non-strict scripts", wrong: "Names collide across files and libraries", fix: "Use modules (always strict) and const/let" },
    { mistake: "Closures that keep large objects alive", why: "A handler captures a big array or DOM node", wrong: "Memory leaks in long-running pages or servers", fix: "Capture only what you need; remove listeners and clear intervals when done" },
    { mistake: "Circular imports", why: "Two modules import each other for convenience", wrong: "Values are undefined at startup in confusing ways", fix: "Move shared code to a third module" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "const by default, let when reassigning, never var." },
    { tag: "Maintainability", text: "Use closures for private state and factories; use classes when you need many instances with methods and clear identity." },
    { tag: "Performance", text: "Named ES module exports help bundlers tree-shake unused code." },
    { tag: "Reliability", text: "Clean up: removeEventListener, clearInterval, AbortController.abort when a component or request is done." },
  ],
  interview: [
    { q: "What is a closure? Give a practical use.", a: "A function bundled with references to the variables of the scope where it was defined, which stay alive as long as the function does. Uses: private state (counters, caches), function factories (configurable middleware), memoisation, once(), and callbacks that remember their context." },
    { q: "How is `this` determined?", a: "By the call site: method call gives the object; plain call gives undefined in strict mode; new gives the new instance; call/apply/bind set it explicitly. Arrow functions do not bind this and use the enclosing scope's this." },
    { q: "var vs let vs const?", a: "var is function-scoped and hoisted with undefined; let and const are block-scoped and in a temporal dead zone before declaration. const prevents reassignment of the binding (the object can still be mutated). Use const by default, let when needed." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "javascript", code: "function outer() {\n  let x = 1;\n  return () => ++x;\n}\nconst f = outer();\nconst g = outer();\nf(); f();\nconsole.log(f(), g());" },
      options: ["4 2", "2 2", "4 4", "3 1"],
      answer: 0,
      explanation: "f and g each have their own x. f is called three times (2, 3, 4); g once (2).",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "javascript", code: "console.log(typeof a);\nvar a = 5;\nconsole.log(typeof b);\nlet b = 5;" },
      options: ["undefined, then a ReferenceError", "number number", "undefined undefined", "ReferenceError immediately"],
      answer: 0,
      explanation: "var a is hoisted as undefined. b is in the temporal dead zone, so typeof b throws a ReferenceError.",
    },
    {
      kind: "bug",
      prompt: "Why does clicking log `undefined`?",
      code: { lang: "javascript", code: "class Menu {\n  label = \"Lessons\";\n  onClick() { console.log(this.label); }\n}\nconst m = new Menu();\nbutton.addEventListener(\"click\", m.onClick);" },
      options: ["Classes cannot have fields", "onClick is detached, so this is the button, not the Menu", "addEventListener needs a string", "label is private"],
      answer: 1,
      explanation: "DOM listeners call the function with this = the element. Use () => m.onClick() or an arrow-function class field.",
    },
  ],
  cheatSheet: [
    "Lookup goes outward from where code is written (lexical scope).",
    "Closure = function + remembered variables; each call makes a new set.",
    "let/const block-scoped; var function-scoped (avoid).",
    "this depends on the call; arrows inherit this.",
    "Detached methods lose this: wrap in an arrow or bind.",
    "ES modules: own scope, strict mode, evaluated once, live bindings.",
    "Clean up listeners and timers to avoid leaks.",
  ],
  homework: {
    basic: {
      title: "Rate-limited function",
      brief: ["Write `throttle(fn, ms)` that calls fn at most once per ms milliseconds (extra calls in between are ignored). Demonstrate it with a loop of calls over time."],
      criteria: ["State kept in a closure", "First call runs immediately", "Calls within the window ignored"],
      hints: ["Store the timestamp of the last run in the closure; Date.now() gives milliseconds."],
      solution: {
        text: ["A closure stores `last`. Each call compares the current time to it."],
        code: {
          lang: "javascript",
          code: `export function throttle(fn, ms) {
  let last = -Infinity;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn(...args);
    }
  };
}

const log = throttle((n) => console.log("run", n), 100);
let n = 0;
const id = setInterval(() => { log(++n); if (n === 10) clearInterval(id); }, 30);
// prints roughly every 4th call: run 1, run 5, run 9 (exact numbers depend on timer precision)`,
        },
      },
    },
    intermediate: {
      title: "Debounced search input",
      brief: ["Write `debounce(fn, ms)` that waits until calls stop for ms before calling fn with the last arguments, and add a `cancel()` method. Explain when to choose debounce vs throttle."],
      criteria: ["Only the last call within a burst runs", "cancel() prevents a pending call", "Clear explanation of the difference"],
      hints: ["Keep the timeout id in the closure and clear it on each call."],
      solution: {
        text: ["Debounce: run after the user stops (search-as-you-type, resize end). Throttle: run at a steady maximum rate during continuous activity (scroll position, rate-limited API calls)."],
        code: {
          lang: "javascript",
          code: `export function debounce(fn, ms) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

const search = debounce((q) => console.log("search:", q), 200);
search("d"); search("do"); search("doc"); search("dock");
// ~200 ms later: search: dock`,
        },
      },
    },
    challenge: {
      title: "Module-based event bus",
      brief: ["Create `events.mjs` exporting `on(name, handler)` that returns an unsubscribe function, and `emit(name, payload)`. Handlers are stored privately in the module. Write a small demo with two modules communicating through it, and show unsubscribing works."],
      criteria: ["No globals", "on returns an unsubscribe closure", "Handler errors do not stop other handlers"],
      hints: ["A Map from event name to a Set of handlers."],
      solution: {
        text: ["The Map is module-private; the unsubscribe function closes over the specific handler and name."],
        code: {
          lang: "javascript",
          file: "events.mjs",
          code: `const handlers = new Map();          // private to this module

export function on(name, handler) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(handler);
  return () => handlers.get(name)?.delete(handler);
}

export function emit(name, payload) {
  for (const h of handlers.get(name) ?? []) {
    try { h(payload); } catch (err) { console.error(\`handler for \${name} failed:\`, err); }
  }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: frontend utilities module",
      brief: ["Add `web/src/lib/` to DevAtlas with `debounce`, `throttle`, `memoize` and `once` as named ESM exports with tests (Vitest or node:test). You will use debounce for the search box in Phase 3."],
      criteria: ["Named exports only", "Tests use fake timers for debounce/throttle", "No var"],
      hints: ["Vitest: vi.useFakeTimers() and vi.advanceTimersByTime(ms)."],
      solution: {
        text: ["Fake timers make time-based tests instant and deterministic."],
        code: {
          lang: "typescript",
          file: "web/src/lib/debounce.test.ts",
          code: `import { describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

describe("debounce", () => {
  it("calls once with the last arguments", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d("a"); d("ab"); d("abc");
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("abc");
  });
});`,
        },
      },
    },
  },
  deeper: [
    { label: "MDN: Closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures" },
    { label: "MDN: this", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this" },
    { label: "MDN: JavaScript modules", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" },
    { label: "Node.js docs: ECMAScript modules", url: "https://nodejs.org/api/esm.html" },
  ],
  nextPreview: "Next: TypeScript. Types that catch real bugs before your code runs: unions, narrowing and generics.",
};
