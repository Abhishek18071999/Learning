import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.2",
  title: "Closures, scope and modules",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["1.2.1 The event loop, promises and async/await", "Basic JavaScript syntax"],
  summary: "Understand how JavaScript decides which variable a name refers to, why var and let behave differently, how closures capture bindings rather than values, and how ES modules and CommonJS shape the code your bundler can remove.",
  terms: [
    { term: "Scope (lexical scope)", def: "The region of code where a binding is visible. JavaScript scope is **lexical**: it is decided by where code is written, not by where it is called." },
    { term: "Scope chain", def: "The ordered list of environment records a name lookup walks through: current function, enclosing functions, module scope, then the global scope." },
    { term: "Hoisting", def: "Before a scope runs, declarations are registered. `var` is created and set to `undefined`; function declarations are created with their body; `let`, `const` and `class` are created but not initialised." },
    { term: "Temporal dead zone (TDZ)", def: "The time between entering a scope and the declaration's initialisation. Reading a `let`, `const` or `class` binding during that window throws a `ReferenceError`, even with `typeof`." },
    { term: "Closure", def: "A function together with the environment record where it was created. The function can read and write those bindings even after the outer call has returned." },
    { term: "IIFE", def: "Immediately Invoked Function Expression: a function that runs as soon as it is defined, used to create a private scope or capture a value in a new parameter." },
    { term: "Currying", def: "Turning a function of several arguments into a chain of functions that take one argument at a time: `f(a, b, c)` becomes `f(a)(b)(c)`." },
    { term: "Partial application", def: "Fixing some arguments now and returning a function for the rest. Unlike currying it does not require one argument per call." },
    { term: "Memoisation", def: "Caching a pure function's result by its arguments, usually in a `Map` held by a closure, so repeated calls return the cached value." },
    { term: "Module pattern", def: "Using an IIFE or a module's own scope to keep state private, then returning or exporting only the public functions that need it." },
    { term: "CommonJS (CJS)", def: "Node's original module system: `require()` loads a file at runtime and returns `module.exports`. Exports are cached per resolved path; destructuring a primitive export copies its current value, while object exports share a reference." },
    { term: "Live binding", def: "An ES module import stays connected to the exporter's binding. If the exporter changes an exported `let`, importers see the new value; a CommonJS require usually sees a copy." },
  ],
  problem: [
    "A dashboard attaches one click handler per lesson in a loop. Every button logs \"Lesson 5\" instead of its own number. In another file, a utility accidentally overwrites a global variable named `config`, breaking an unrelated feature. The code looks correct, the tests pass in isolation, and the bugs only appear when the pieces run together.",
    "Both bugs come from scope. JavaScript decides what a name means by where the code is written, and a function keeps its birthplace's variables alive after the call returns. Closures, hoisting, IIFEs, currying and modules are all consequences of that one design. They are also the material React hooks, middleware, bundlers, and almost every JavaScript library are built from, so this lesson pays off through the rest of the course.",
  ],
  concept: {
    analogy: [
      "A closure is a **backpack**. When a function is created, it packs the variables it can see into a backpack and carries it wherever it goes. Even when it is called much later, somewhere else entirely, it can still open the backpack. Each call to the outer function packs a new backpack, so two counters made by the same factory do not share a count.",
      "A module is a **sealed workshop**. The workshop has private tools on the bench and a serving hatch with a list of things it will hand out. Other files can ask for the listed items, but they cannot reach over the counter and rearrange the bench. ES modules make that hatch static and inspectable before anything runs; CommonJS opens it at runtime with `require`.",
    ],
    precise: [
      "When code uses a name, JavaScript looks in the current environment record, then the enclosing one, outward to module scope and finally the global scope. That lookup path is the **scope chain**, and it is fixed by the source text, not by the call site. This is why two functions with the same body can resolve the same name to different variables. Hoisting is the creation phase that registers declarations before execution: `var` starts as `undefined`, function declarations start fully formed, and `let`, `const` and `class` start uninitialised in the **temporal dead zone**.",
      "A function keeps a hidden reference to the environment where it was created. If a living function still references that environment, its bindings stay alive: that is a closure. Closures capture **bindings, not copies of values**. A `var` declared in a loop has one binding shared by every callback, so all callbacks read the final value. A `let` declaration in a `for` loop gets a fresh binding per iteration, so each callback reads its own value. An IIFE fixes the old pattern by copying the current value into a new parameter, which is itself a new binding.",
      "Closures are the implementation behind most functional helpers. **Currying** turns `f(a, b, c)` into `f(a)(b)(c)`, each step closing over the arguments so far. **Partial application** fixes some arguments and returns a function for the rest. **Memoisation** keeps a `Map` in a closure and returns cached results for repeated inputs. The **module pattern** uses an IIFE (or an ES module) to keep state private and expose only an API. All four are ordinary functions plus remembered environments.",
      "ES modules are static: the parser builds the import/export graph before evaluation, each module is evaluated once and cached, and imports are **live read-only views** of the exporter's bindings. Named exports are the normal choice; a default export is a single value or declaration. CommonJS is dynamic: `require()` runs at call time, returns `module.exports`, and caches that object per resolved path. Destructuring a primitive export copies its value, object references are shared, and circular requires can return a partially filled object. Because bundlers can analyse ESM statically, they can **tree-shake** unused named exports; CommonJS and dynamic property access usually defeat that analysis.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Environment records and the chain.** Every call creates an environment record: a table of local bindings plus a pointer to the outer environment. A function object stores a reference to the environment where it was created. Name lookup walks that pointer chain, which is why the lookup is lexical and why a function can still read `count` after `makeCounter()` has returned. The garbage collector keeps the environment alive while any function still points at it. Two calls to the same factory create two separate environment records, so their counters are independent.",
      "2. **Hoisting is a creation phase, not text moving.** The engine registers `var` bindings and initialises them to `undefined`; function declarations are initialised with their function object; `let`, `const` and `class` are registered but left uninitialised. That uninitialised state is the TDZ. Reading one throws `ReferenceError`, and `typeof` is not a safe test either: `typeof x` before `let x` also throws. A function expression or arrow function assigned to a `var` is still `undefined` until the assignment line runs, because only the variable is hoisted, not the function value.",
      "3. **The loop bug is about bindings, not values.** `var i` is one binding in the function scope. Every arrow function created in the loop closes over that same binding, so after the loop they all read `4`. `let j` in a `for` statement gets a fresh per-iteration binding (the spec calls this CreatePerIterationEnvironment), so each callback closes over a different binding and reads its own number. The IIFE fix calls a function with the current `k`, creating a new parameter binding for each call: `((n) => () => n)(k)`. `forEach` and `for...of` with `const` give you a fresh binding per item for the same reason.",
      "4. **Currying, partial application and memoisation are the same trick.** Currying returns a closure until enough arguments have arrived; `fn.length` counts parameters before the first default or rest parameter. Partial application fixes some arguments immediately and closes over the rest. Memoisation stores a `Map` keyed by the arguments and closes over both the cache and the original function. It is only safe for pure functions: if the result depends on time, random values or mutable external state, the cache returns a stale answer. The cache also grows forever unless you add an eviction policy.",
      "5. **The module pattern is a closure with a public hatch.** Before ES modules, a file could use an IIFE to create private state and return only selected functions: `const counter = (() => { let n = 0; return { inc: () => ++n, value: () => n }; })();`. The returned methods close over `n`; nothing else can touch it. The same idea appears in the revealing module pattern and in modern private class fields. ES modules give every file that private scope for free, so the IIFE is now mostly a historical and browser-script technique.",
      "6. **ES modules are linked before they run.** The parser reads every `import` and `export` first, builds a graph, links bindings, then evaluates the graph. Imports are hoisted, modules are always strict, and each resolved module is evaluated once and cached. A named import is a live read-only view: if the exporter increments an exported `let`, importers see the new value. `import * as ns` creates a namespace object whose properties reflect the same live bindings. A default export is a single export; `export default expression` evaluates the expression once, so do not rely on it for live updates unless you export a binding with `export { value as default }`.",
      "7. **CommonJS is a runtime function call.** `require(path)` resolves and loads a file, wraps it in a function, and returns `module.exports`. `exports` initially aliases `module.exports`, but reassigning `module.exports` breaks that alias. The result is cached by resolved filename, so a second require gets the same object. Destructuring a primitive export copies its current value; object exports share a reference. Top-level `this` in CommonJS is `module.exports`, and CommonJS is not automatically strict. When ESM imports CommonJS, the default is `module.exports` and Node may detect named exports statically; the interop is convenient but easy to get subtly wrong.",
      "8. **Circular imports are legal but fragile.** In ESM, module A can import B while B imports A. Linking happens first, but evaluation is depth-first: if B runs before A has initialised a `let`, B sees that binding in the TDZ and throws, or sees `undefined` for a `var`. Function declarations may already be available because they are initialised during instantiation. CommonJS cycles return whatever `module.exports` holds at that moment, often a partial object. The robust fix is structural: move shared code into a third leaf module, pass dependencies in as arguments, or use a dynamic `import()` at the point of use. Do not paper over a cycle with try/catch.",
      "9. **Tree shaking is a graph and side-effect problem.** A bundler can remove an unused named export only if it can prove the export is unused and evaluating the module has no required side effects. Static ESM syntax makes that proof possible. Top-level code that logs, registers globals, mutates prototypes or reads the filesystem counts as a side effect and can keep a module alive. The `sideEffects` field in package.json tells bundlers which files are safe to drop. Named exports are easier to analyse than default exports, namespace imports and dynamic property access; CommonJS `require` is usually opaque. Dynamic `import()` creates a separate chunk instead of disappearing, which is often what you want for a heavy feature.",
    ],
    diagram: {
      title: "Scope chain lookup for `count`",
      nodes: [
        { label: "inner()", sub: "no count here" },
        { label: "outer()", sub: "let count = 0" },
        { label: "module scope", sub: "imports, top level" },
        { label: "globalThis", sub: "last resort" },
      ],
      edges: ["look outward", "not found", "not found"],
      caption: "Name lookup stops at the first environment record that owns the binding. The chain is fixed by where the function was written, not by who calls it.",
    },
  },
  handsOn: [
    {
      title: "var, let and the TDZ in one run",
      text: [
        "Save this as `loop.mjs` and run `node loop.mjs`. The first two lines are the classic loop bug and its `let` fix; the third line is the older IIFE fix. The last two lines show why `typeof` is not a safe way to probe a `let` before its declaration.",
      ],
      code: {
        lang: "javascript",
        file: "loop.mjs",
        code: `const withVar = [];
for (var i = 1; i <= 3; i++) withVar.push(() => i);
console.log("var:  ", withVar.map((f) => f()));

const withLet = [];
for (let j = 1; j <= 3; j++) withLet.push(() => j);
console.log("let:  ", withLet.map((f) => f()));

const withIife = [];
for (var k = 1; k <= 3; k++) {
  withIife.push(((n) => () => n)(k));
}
console.log("IIFE: ", withIife.map((f) => f()));

console.log("typeof before var:", typeof hoistedVar);
var hoistedVar = 1;

try {
  console.log(typeof tdzLet);
} catch (err) {
  console.log("TDZ:", err.name);
}
let tdzLet = 1;`,
      },
      output: "var:   [ 4, 4, 4 ]\nlet:   [ 1, 2, 3 ]\nIIFE:  [ 1, 2, 3 ]\ntypeof before var: undefined\nTDZ: ReferenceError",
      notes: [
        "`var` has one binding for the whole function, so every callback reads the value after the loop (`4`). `let` creates a new binding per iteration, so the callbacks read `1`, `2`, `3`. The IIFE copies each `k` into a new parameter binding, which is why it also works.",
        "`typeof hoistedVar` prints `undefined` because the `var` binding exists but has not been assigned. `typeof tdzLet` throws because `let` is still in the temporal dead zone. Function declarations are hoisted with their bodies, but function expressions and arrow functions are not.",
      ],
    },
    {
      title: "Closures that carry state: counters, memoisation, curry and once",
      text: [
        "A closure captures bindings, so the counter factory can keep `count` private and memoisation can keep a cache alive between calls. The same mechanism gives you currying, partial application and a `once` wrapper. Save this as `closures.mjs` and run it with Node.",
      ],
      code: {
        lang: "javascript",
        file: "closures.mjs",
        code: `function makeCounter(start = 0) {
  let count = start;
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
console.log("counter a:", a.value, "counter b:", b.value);
console.log("a.count from outside:", a.count);

function memoize(fn) {
  const cache = new Map();
  let hits = 0;
  let misses = 0;
  const wrapped = (arg) => {
    if (cache.has(arg)) {
      hits++;
      console.log("hit ", arg, "->", cache.get(arg));
      return cache.get(arg);
    }
    misses++;
    const value = fn(arg);
    cache.set(arg, value);
    console.log("miss", arg, "->", value);
    return value;
  };
  wrapped.stats = () => ({ hits, misses, size: cache.size });
  return wrapped;
}

const slowSquare = (n) => {
  console.log("computing", n);
  return n * n;
};
const fastSquare = memoize(slowSquare);
console.log(fastSquare(9), fastSquare(9));
console.log(fastSquare(10), fastSquare(9));
console.log(fastSquare.stats());

function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn(...args);
    return (...rest) => curried(...args, ...rest);
  };
}

const add3 = curry((x, y, z) => x + y + z);
console.log("curried:", add3(1)(2)(3), add3(1, 2)(3), add3(1)(2, 3));

const partial = (fn, ...preset) => (...rest) => fn(...preset, ...rest);
const add10 = partial((x, y) => x + y, 10);
console.log("partial:", add10(5));

function once(fn) {
  let done = false;
  let result;
  return (...args) => {
    if (!done) {
      done = true;
      result = fn(...args);
    }
    return result;
  };
}

const init = once(() => {
  console.log("connecting...");
  return "conn";
});
init();
init();`,
      },
      output: "counter a: 2 counter b: 11\na.count from outside: undefined\ncomputing 9\nmiss 9 -> 81\nhit  9 -> 81\n81 81\ncomputing 10\nmiss 10 -> 100\nhit  9 -> 81\n100 81\n{ hits: 2, misses: 2, size: 2 }\ncurried: 6 6 6\npartial: 15\nconnecting...",
      notes: [
        "`a` and `b` each have their own `count` because each `makeCounter()` call creates a new environment record. `a.count` is `undefined`: the variable is reachable only through the returned methods, not as a property.",
        "The memoised square reports two misses (9 and 10) and two hits. `computing` appears only on the misses; the hits return from the `Map` in the closure, so the cache survives between calls. `once` uses a boolean in the closure and runs `connecting...` only on the first call.",
        "Currying and partial application both return closures. `add3` waits for three arguments across any grouping; `add10` fixes `10` immediately and waits for one more. Neither copies the original function's state incorrectly: each returned function closes over the arguments it has already received.",
      ],
    },
    {
      title: "ESM default vs named imports, and a live binding",
      text: [
        "Create two files in the same folder, `math.mjs` and `main.mjs`, then run `node main.mjs`. The default export is a function; the named exports are `PI`, `area` and a mutable `calls` counter. Watch `calls` change after the import.",
      ],
      code: {
        lang: "javascript",
        file: "math.mjs + main.mjs",
        code: `// math.mjs
export const PI = 3.14159;
export let calls = 0;

export function area(r) {
  calls++;
  return PI * r * r;
}

export default function describe(r) {
  return \`circle r=\${r}, area=\${area(r).toFixed(2)}\`;
}

// main.mjs
import describe, { PI, area, calls } from "./math.mjs";
import * as math from "./math.mjs";

console.log("named PI:", PI);
console.log("default:", describe(2));
console.log("namespace area(3):", math.area(3).toFixed(2));

area(1);
console.log("live calls binding:", calls, math.calls);`,
      },
      output: "named PI: 3.14159\ndefault: circle r=2, area=12.57\nnamespace area(3): 28.27\nlive calls binding: 3 3",
      notes: [
        "`describe(2)` and `math.area(3)` both increment `calls`, and `area(1)` adds one more. Both `calls` and `math.calls` print `3` because named imports are live read-only views of the same binding, not copies taken at import time.",
        "The default export is imported as `describe`; the named exports are imported individually or through the namespace object. You cannot assign to `calls` in `main.mjs`: imported bindings are read-only. In CommonJS, destructuring a primitive export copies it, which is the difference the next step tabulates.",
      ],
    },
    {
      title: "Compare declaration and module systems",
      text: [
        "Keep this table next to the editor when you review a file. The first block is about declarations; the second is about module systems. It is a decision aid, not a substitute for running the code.",
      ],
      code: {
        lang: "text",
        file: "scope-modules.txt",
        code: `DECLARATION   SCOPE       HOISTED AS        REDECLARE   TDZ
var           function    undefined         yes         no
let           block       uninitialised     no          yes
const         block       uninitialised     no          yes (needs an initialiser)

MODULE SYSTEM  LOADING         EXPORTS             IMPORTS          TREE SHAKING
ES modules     static graph    named + default     live bindings    yes, with static analysis
CommonJS       runtime require module.exports    copied values    limited

PATTERN        WHAT IT FIXES                 COST / WATCH OUT
closure        private state, factories      keeps captured objects alive
IIFE           private scope, per-iteration  old style; let usually replaces it
curry          one-argument pipelines        more calls; arity must be known
partial        preset arguments              fewer arguments, same closure risk
memoise        repeated pure calls           stale results, unbounded cache
module pattern private state + public API     boilerplate; ESM scope is simpler`,
      },
      notes: [
        "The table is deliberately small: `const` prevents reassignment of the binding, not mutation of the object. A `const` array can still be pushed to. `let` and `const` are block-scoped, so a declaration inside `{ }` disappears at the closing brace.",
        "For new application code, prefer named ESM exports and `const`. Reach for CommonJS only when a tool or an older package requires it. The tree-shaking column is about what a bundler can prove, not a promise that every unused byte disappears.",
      ],
    },
    {
      title: "Draw the module graph before you import",
      text: [
        "Mermaid renders in GitHub and in the DevAtlas lesson view. Arrows point from the importer to the imported module. An acyclic graph like this one is easy for a bundler to analyse; a cycle is an arrow that lets you return to a file you already visited.",
      ],
      code: {
        lang: "mermaid",
        file: "module-graph.mmd",
        code: `flowchart LR
  main["main.mjs"] --> math["math.mjs"]
  main --> format["format.mjs"]
  format --> math`,
      },
      notes: [
        "`main.mjs` depends on both `math.mjs` and `format.mjs`; `format.mjs` depends on `math.mjs`. Nothing imports `main.mjs` back, so evaluation order is unambiguous. If `format.mjs` imported `main.mjs`, the graph would contain a cycle and one module would see a partially initialised binding.",
        "Run `npx madge --circular src` in a real project to find cycles, and keep shared helpers in leaf modules that import nothing from the feature modules above them.",
      ],
    },
  ],
  companies: [
    "**React (Meta): closures plus rendering.** Every render creates new functions that close over that render's props and state. The famous stale-closure bug, where an effect or interval keeps reading an old state value, is not a React quirk: it is a closure over a binding that has not changed. The fix is to include the value in the dependency list, use a ref, or use the functional state update so the callback reads the current value.",
    "**Node.js and npm: two module systems in one runtime.** The ecosystem still ships a large amount of CommonJS while new packages increasingly publish ESM. Dual packages, `exports` maps, the `type` field set to `module`, and interop rules exist because `require` and `import` have different evaluation and binding semantics. Understanding live bindings vs copied values prevents the classic 'I changed the config object but the importer still sees the old value' bug.",
    "**Vite, Rollup and esbuild: tree shaking is a product feature.** These tools parse the ESM graph, mark unused exports, and drop modules that have no required side effects. Their documentation is full of warnings about CommonJS, top-level side effects and namespace imports because each one makes the graph harder to prove safe. Bundle size is often a direct consequence of module shape.",
    "**Express and Koa: middleware factories are closures.** `rateLimit({ max: 100 })`, `cors({ origin })` and logger factories return a handler that closes over its configuration. Because the handler is created once and called many times, the configuration stays private and does not need a global. Koa's `async (ctx, next)` middleware composes the same way, with each layer closing over what it needs.",
    "**Lodash and RxJS: curry, memoize and operators.** Lodash's `curry` and `memoize` are closure utilities in library form. RxJS operators such as `debounceTime(300)` return functions that close over their configuration and the stream state. The pattern is everywhere because it lets a caller configure behaviour once and then pass a plain function to the runtime.",
  ],
  mistakes: [
    { mistake: "Using var in a loop that creates callbacks", why: "Old tutorials use var, and the loop looks harmless", wrong: "Every callback reads the final value, so all buttons log the same lesson", fix: "Use let or const in the loop, or capture the value with an IIFE or a helper function" },
    { mistake: "Passing obj.method as a callback", why: "It looks like passing the method itself", wrong: "The function is detached from obj, so this is undefined in strict mode and reading this.x throws", fix: "Pass () => obj.method() or bind the method once: const fn = obj.method.bind(obj)" },
    { mistake: "Assigning to an undeclared name", why: "In a non-strict script this silently creates a global", wrong: "Names collide across files and libraries, and the bug is hard to trace", fix: "Use modules (always strict) and declare every variable with const or let" },
    { mistake: "Letting a closure keep a large object alive", why: "A handler captures a big array, DOM node or response body", wrong: "The object cannot be collected while the listener or interval lives, so memory grows", fix: "Capture only the fields you need, remove listeners and clear timers when the owner is done" },
    { mistake: "Creating a circular import for convenience", why: "Two modules naturally refer to each other", wrong: "One side sees an uninitialised binding, undefined, or a partial exports object at startup", fix: "Move shared code to a third leaf module, inject the dependency, or use a dynamic import at the point of use" },
    { mistake: "Thinking const makes an object immutable", why: "const sounds like a constant value", wrong: "The binding cannot be reassigned, but the object can still be mutated", fix: "Use Object.freeze or immutable update patterns when the contents must not change" },
    { mistake: "Assuming a default export will be tree-shaken", why: "It is unused, so it should disappear", wrong: "Default exports, namespace imports and dynamic property access are harder for a bundler to analyse", fix: "Prefer named exports, keep modules free of side effects, and check the bundle with a visualiser" },
    { mistake: "Treating an imported value as a local copy", why: "It looks like a normal variable", wrong: "Assigning to an imported binding is an error, and a live binding can change under you", fix: "Copy it into a local const if you need a snapshot; read the binding when you need the current value" },
    { mistake: "Using typeof to test a let before its declaration", why: "typeof is usually safe for undeclared names", wrong: "A binding in the temporal dead zone throws ReferenceError even for typeof", fix: "Declare the variable before use, or check with a try/catch only when you genuinely need to probe" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Use `const` by default and `let` only when reassigning. Avoid `var` in new code: block scope and the TDZ catch mistakes earlier." },
    { tag: "Maintainability", text: "Prefer named exports for application code. They are easier to search, rename and tree-shake, and they keep the import site explicit." },
    { tag: "Reliability", text: "Keep the module graph acyclic. Put shared types and helpers in leaf modules, and pass dependencies in rather than importing upward." },
    { tag: "Performance", text: "Write side-effect-free modules with named exports, and declare `sideEffects` in package.json so bundlers can remove unused code safely." },
    { tag: "Security", text: "Keep secrets and mutable state in module or closure scope, never on `globalThis`. Clean up listeners, intervals and abort controllers when the owner is destroyed." },
  ],
  interview: [
    { q: "Explain lexical scope, the scope chain, hoisting and the temporal dead zone. What actually differs between var, let and const?", a: "Scope is lexical: a name resolves against the environment where the code was written, then each enclosing environment outward to module and global scope. At the start of a scope the engine creates bindings: `var` is initialised to `undefined`, function declarations are initialised with their function object, and `let`, `const` and `class` are created but uninitialised. That uninitialised window is the temporal dead zone; touching the binding there throws a ReferenceError, and even `typeof` throws. `var` is function-scoped and can be redeclared; `let` and `const` are block-scoped and cannot be redeclared in the same scope. `const` prevents reassignment of the binding but does not freeze the object. A function expression assigned to `var` is `undefined` before the assignment because only the variable is hoisted, not the value." },
    { q: "What is a closure, and why does the classic loop bug happen? Give at least two fixes.", a: "A closure is a function plus the environment record where it was created. The function keeps reading and writing those bindings after the outer call returns, which is how private counters, factories, memoisation and middleware configuration work. The loop bug happens because closures capture bindings, not snapshots of values. With `var i`, every callback closes over the same function-scoped binding, so after the loop all of them read the final value. With `let j`, the for statement creates a fresh per-iteration binding, so each callback reads its own value. The older fix is an IIFE that copies the current value into a new parameter: `((n) => () => n)(i)`. Other fixes are `forEach`, whose callback parameter is a new binding per item, `bind`, or a small factory function. If you need the current value later, read it through a function rather than copying it too early." },
    { q: "Compare ES modules and CommonJS: syntax, evaluation, live bindings, circular imports and tree shaking.", a: "ESM uses static `import`/`export`, is parsed and linked before evaluation, is always strict, and is evaluated once per resolved module. Named imports are live read-only views of the exporter's bindings; a namespace import exposes the same live properties. CommonJS uses `require()` at runtime and returns `module.exports`; the result is cached per resolved path, destructuring a primitive export copies its current value, and object references are shared. ESM cycles are linked first but evaluated depth-first, so one module can see an uninitialised binding in the TDZ or `undefined`; CommonJS cycles return whatever exports exist at that moment, often a partial object. The structural fix is to move shared code into a third module or inject dependencies, not to catch the error. Tree shaking depends on static ESM syntax and proven side-effect freedom: named exports, no top-level side effects, and a correct `sideEffects` field help; CommonJS `require`, namespace imports and dynamic property access usually prevent it. Default exports can be removed if unused, but named exports are easier to analyse and refactor." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "javascript", code: "function outer() {\n  let x = 1;\n  return () => ++x;\n}\nconst f = outer();\nconst g = outer();\nf(); f();\nconsole.log(f(), g());" },
      options: ["4 2", "2 2", "4 4", "3 1"],
      answer: 0,
      explanation: "f and g each close over their own x. f is called three times (2, 3, 4); g is called once (2). The numbers are bindings, not copies shared between the two calls.",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "javascript", code: "console.log(typeof a);\nvar a = 5;\nconsole.log(typeof b);\nlet b = 5;" },
      options: ["undefined, then a ReferenceError", "number number", "undefined undefined", "ReferenceError immediately"],
      answer: 0,
      explanation: "var a is hoisted and initialised to undefined. b is in the temporal dead zone, so typeof b throws a ReferenceError before the let line runs.",
    },
    {
      kind: "bug",
      prompt: "Why does clicking log `undefined`?",
      code: { lang: "javascript", code: "class Menu {\n  label = \"Lessons\";\n  onClick() { console.log(this.label); }\n}\nconst m = new Menu();\nbutton.addEventListener(\"click\", m.onClick);" },
      options: ["Classes cannot have fields", "onClick is detached, so this is the button, not the Menu", "addEventListener needs a string", "label is private"],
      answer: 1,
      explanation: "DOM listeners call the function with this = the element. Use () => m.onClick() or an arrow-function class field so the callback keeps the Menu's this.",
    },
  ],
  cheatSheet: [
    "Lookup is lexical: current scope, enclosing scopes, module scope, global. The call site does not choose the scope.",
    "var is hoisted as undefined; let/const/class are hoisted but stay in the TDZ. typeof does not rescue a TDZ binding.",
    "let in a for loop creates a fresh binding per iteration; var shares one binding. IIFE or a factory copies the current value.",
    "A closure captures bindings, not values. Each outer call creates a new environment, so counters and caches stay independent.",
    "Curry = one argument at a time; partial application = fix some arguments now. Both return closures.",
    "Memoise only pure functions, key the cache correctly, and plan for eviction; the cache lives in a closure.",
    "The module pattern is an IIFE or module scope plus a public API. ES modules give every file that scope for free.",
    "ESM is static, strict, evaluated once, and imports are live read-only views. Default is one export, named is many.",
    "CommonJS uses runtime require, caches module.exports, and destructuring copies primitives. Circular requires can return partial objects.",
    "Tree shaking needs static ESM, named exports and no required side effects; `sideEffects` tells bundlers what is safe to drop.",
  ],
  homework: {
    basic: {
      title: "Rate-limited function",
      brief: ["Write `throttle(fn, ms)` that calls fn at most once per ms milliseconds (extra calls inside the window are ignored). Demonstrate it with a loop of calls over time, and explain which state lives in the closure."],
      criteria: ["State kept in a closure", "First call runs immediately", "Calls inside the window are ignored", "A comment names the captured state"],
      hints: ["Store the timestamp of the last run in the closure; Date.now() gives milliseconds.", "The returned function is the only thing the caller can touch; `last` is private."],
      solution: {
        text: ["A closure stores `last`. Each call compares the current time to it. The first call runs because `last` starts at negative infinity; later calls inside the window return `undefined` and do not call `fn`."],
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
const id = setInterval(() => {
  log(++n);
  if (n === 10) clearInterval(id);
}, 30);
// prints roughly every 4th call: run 1, run 5, run 9 (exact numbers depend on timer precision)`,
        },
        pitfalls: ["Reading `last` from outside the returned function", "Forgetting that a throttled call returns undefined when it is skipped"],
      },
    },
    intermediate: {
      title: "Debounced search input",
      brief: ["Write `debounce(fn, ms)` that waits until calls stop for ms before calling fn with the last arguments, and add a `cancel()` method. Explain when to choose debounce vs throttle."],
      criteria: ["Only the last call within a burst runs", "cancel() prevents a pending call", "Clear explanation of the difference", "No global timer variable"],
      hints: ["Keep the timeout id in the closure and clear it on each call.", "Debounce waits for silence; throttle runs at a steady maximum rate."],
      solution: {
        text: ["Debounce: run after the user stops (search-as-you-type, resize end). Throttle: run at a steady maximum rate during continuous activity (scroll position, rate-limited API calls). The timeout id and the latest arguments both live in the closure, so two debounced functions do not cancel each other."],
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
        pitfalls: ["Calling fn on every keystroke instead of only after the quiet period", "Forgetting cancel(), so a pending call fires after the component is gone"],
      },
    },
    challenge: {
      title: "Module-based event bus",
      brief: ["Create `events.mjs` exporting `on(name, handler)` that returns an unsubscribe function, and `emit(name, payload)`. Handlers are stored privately in the module. Write a small demo with two modules communicating through it, and show unsubscribing works."],
      criteria: ["No globals", "on returns an unsubscribe closure", "Handler errors do not stop other handlers", "A demo shows a handler being removed"],
      hints: ["A Map from event name to a Set of handlers.", "The unsubscribe closure closes over the specific handler and name; it does not need a public remove() method."],
      solution: {
        text: ["The Map is module-private; the unsubscribe function closes over the specific handler and name. `emit` catches each handler's error so one bad listener cannot stop the others. The demo subscribes three handlers, emits once, unsubscribes the logger, then emits again: the logger is gone, the throwing handler is isolated, and the audit handler still runs."],
        code: {
          lang: "javascript",
          file: "events.mjs + demo.mjs",
          code: `// events.mjs
const handlers = new Map();          // private to this module

export function on(name, handler) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(handler);
  return () => handlers.get(name)?.delete(handler);
}

export function emit(name, payload) {
  for (const h of handlers.get(name) ?? []) {
    try {
      h(payload);
    } catch (err) {
      console.log("handler for " + name + " failed: " + err.message);
    }
  }
}

// demo.mjs
import { on, emit } from "./events.mjs";

const off = on("lesson:opened", (id) => console.log("logger:", id));
on("lesson:opened", (id) => {
  throw new Error("bad handler " + id);
});
on("lesson:opened", (id) => console.log("audit:", id));

emit("lesson:opened", 42);
off();
emit("lesson:opened", 43);`,
        },
        output: "logger: 42\nhandler for lesson:opened failed: bad handler 42\naudit: 42\nhandler for lesson:opened failed: bad handler 43\naudit: 43",
        pitfalls: ["Exporting the handlers Map, which makes the state public again", "Letting one throwing listener abort the emit loop", "Removing a handler while iterating the Set without accounting for mutation"],
      },
    },
    capstone: {
      title: "DevAtlas: frontend utilities module",
      brief: ["Add `web/src/lib/` to DevAtlas with `debounce`, `throttle`, `memoize` and `once` as named ESM exports with tests (Vitest or node:test). Keep the module graph acyclic and use the search box in Phase 3."],
      criteria: ["Named exports only", "Tests use fake timers for debounce/throttle", "No var", "A test proves memoize returns the cached value and once runs a single time", "No circular imports"],
      hints: ["Vitest: vi.useFakeTimers() and vi.advanceTimersByTime(ms).", "Import the helpers from a leaf module; do not import React or a feature module from the utilities file."],
      solution: {
        text: ["Fake timers make time-based tests instant and deterministic. The utility module is a leaf: it imports nothing from the app, which keeps the graph acyclic and the bundle easy to tree-shake. Add a memoize test with two calls and a once test with two calls to prove the closure state."],
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
        pitfalls: ["A default export that the bundler cannot connect to a named import", "Importing the feature module back into lib, creating a cycle", "Testing timers with real time, which makes the suite slow and flaky"],
      },
    },
  },
  deeper: [
    { label: "MDN: Closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures" },
    { label: "MDN: JavaScript modules", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" },
    { label: "MDN: let and the temporal dead zone", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let" },
    { label: "Node.js docs: ECMAScript modules", url: "https://nodejs.org/api/esm.html" },
    { label: "Node.js docs: CommonJS modules", url: "https://nodejs.org/api/modules.html" },
    { label: "webpack: Tree shaking", url: "https://webpack.js.org/guides/tree-shaking/" },
  ],
  nextPreview: "Next: TypeScript. Types that catch real bugs before your code runs: unions, narrowing and generics.",
};
