import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.3",
  title: "TypeScript: types that catch real bugs",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["1.2.2 Closures, scope and modules"],
  summary: "Use TypeScript to describe your data so the compiler catches typos, missing cases and null bugs before users do: structural typing, unions, narrowing, generics, utility types and validating untrusted data at runtime.",
  terms: [
    { term: "Structural typing", def: "A value fits a type when it has the required shape, not because it was declared with that name. `{ id: \"1\", title: \"x\" }` is assignable to `{ id: string; title: string }` even if the object was never annotated." },
    { term: "Type annotation", def: "Declaring a type explicitly: `let score: number`. TypeScript can often infer it instead." },
    { term: "Inference", def: "The compiler working out a type without an annotation: `const xs = [1, 2]` is `number[]`. Annotate parameters and public APIs; let inference handle locals." },
    { term: "Literal type", def: "A type with one exact value, such as `\"Beginner\"`. A union of literals models a fixed set, and `as const` stops a value from widening to `string` or `number`." },
    { term: "Union type", def: "A value that can be one of several types: `string | number`, or `\"ok\" | \"error\"`. Optional (`tags?: string[]`) adds `undefined`; `tags: string[] | null` allows an explicit `null` instead." },
    { term: "Discriminated union", def: "A union whose variants share a literal tag, such as `kind` or `status`. Checking the tag tells the compiler exactly which other fields exist." },
    { term: "Narrowing", def: "TypeScript refining a union to a specific member after a check like `typeof x === \"string\"`, `x.kind === \"mcq\"` or `if (result.ok)`." },
    { term: "Type guard", def: "A function whose return type is `data is T`, such as `isRepo(d): d is Repo`. When it returns true, the compiler narrows `d` for the caller." },
    { term: "Assertion function", def: "A function declared `asserts value is T` or `asserts condition` that throws when the check fails, so the compiler can narrow after the call." },
    { term: "Generic", def: "A type with a parameter, like `Array<T>` or `function first<T>(xs: T[]): T | undefined`. A constraint (`T extends { id: string }`) states what every `T` must support." },
    { term: "unknown vs any vs never", def: "`unknown` accepts anything but must be narrowed before use. `any` switches checking off. `never` has no values at all: it marks impossible states and forgotten branches." },
    { term: "Utility type", def: "A type-level function shipped with TypeScript: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `Readonly<T>`, `Required<T>` and more." },
  ],
  problem: [
    "The DevAtlas frontend reads `lesson.minuts` (typo) and shows \"undefined min\" for weeks. Another page crashes with `Cannot read properties of null` when a user has no profile. A third renders nothing for a new quiz type someone added on the backend.",
    "None of these needs a test to find: a type checker flags all three as you type. But TypeScript is more than spelling correction. A structural type says which shapes are acceptable, a union says which states are possible, narrowing proves which variant you hold, and `never` turns a forgotten case into a compile error. The compiler checks those proofs, then erases the types, so the browser still runs plain JavaScript. This lesson builds that model and shows the real compiler output behind each fix.",
  ],
  concept: {
    analogy: [
      "Types are **labels on storage boxes** in a warehouse. A box labelled 'glass, this side up' tells every worker how to handle it. If someone tries to stack a crate of bricks on it, the supervisor (the compiler) stops them before anything breaks, instead of you discovering broken glass at the customer's door (runtime).",
      "A **union** is a stack of sealed envelopes, each stamped with a different `kind`. A `switch` on that stamp is you reading the label before opening one; `never` is the empty tray at the end, proof that you handled every envelope. A type guard is the clerk who checks the stamp for you and signs that the contents match.",
    ],
    precise: [
      "TypeScript is **structural**: assignability depends on shape, not on the name you gave a type. An object with the required properties fits, even if it was never annotated. A consequence is that fresh object literals get an **excess property check** (`{ minuts: 70 }` is rejected because `minuts` is not part of the target), while a variable with extra properties can still be assigned. Literal types make the shape stricter: `level: \"Beginner\" | \"Intermediate\" | \"Advanced\"` rejects `\"Expert\"` at compile time. Optionality is a choice, not a synonym for null: `tags?: string[]` means the property may be absent, `tags: string[] | null` means it is present and may explicitly be null.",
      "**Unions + narrowing** model real data precisely. Control-flow analysis tracks the possible types through `if`, `switch`, `return` and `throw`. A *discriminated union* (each variant has a literal `kind` or `status` field) lets the compiler know exactly which fields exist after you check that field. A `switch` with an `assertNever(x: never)` default makes forgetting a variant a compile error. **Type guards** (`d is Repo`) and **assertion functions** (`asserts d is Repo`) move a runtime check into the type system, so callers get narrowing instead of a boolean they must remember to use.",
      "**Generics** let one definition work for many types without losing information: `first<T>(xs: T[]): T | undefined` returns the element type, not `any`. A constraint such as `<T extends { id: string }>` states what the body is allowed to assume. The three special types are easy to mix up: `unknown` is the top type (everything is assignable to it, but you must narrow before use), `never` is the bottom type (assignable to everything, nothing is assignable to it), and `any` is the escape hatch that switches checking off in both directions. **Utility types** are just type-level functions built from mapped and conditional types: `Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `Required`.",
      "**Strictness is a compiler setting, not a language feature.** `strict` enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` and friends; `noUncheckedIndexedAccess` additionally says `arr[i]` and `record[key]` may be `undefined`. All of it disappears at runtime: `tsc` (or a bundler using esbuild/SWC) checks types and emits JavaScript with the annotations stripped. That is why JSON from an API, `localStorage`, environment variables and user input are `unknown` until a type guard or schema validates them. Types protect code you wrote; validation protects code from data you did not write.",
    ],
  },
  underTheHood: {
    text: [
      "**1. Parse, bind, check, emit.** `tsc` reads the program, resolves imports, builds a symbol table and a type graph, then reports errors. With `--noEmit` it stops before writing files, which is why CI runs `tsc --noEmit` even when a bundler does the actual build: esbuild and SWC strip types without checking them, so a project can build and still be type-broken.",
      "**2. Inference does most of the work.** `const xs = [1, 2]` infers `number[]`; a function's return type is inferred from its return statements; a `const` object keeps literal property types only when you ask with `as const`, otherwise they widen (`{ kind: \"mcq\" }` becomes `{ kind: string }`). Annotate function parameters and exported APIs; let inference handle locals. This keeps types close to the code and avoids repeating yourself.",
      "**3. Control-flow analysis is what makes narrowing real.** At every point the checker keeps a set of possible types for each variable. `typeof x === \"string\"` removes non-strings, `x === null` removes null, `in` checks property presence, `instanceof` checks a class, and a discriminant check (`q.kind === \"mcq\"`) selects one union member. After a `return` or `throw`, the code below sees only the remaining possibilities. Narrowing also understands truthiness: `if (user)` removes `null` and `undefined`, but it also removes `\"\"` and `0`, which is sometimes a bug rather than a feature.",
      "**4. Structural assignability and freshness.** Because types are structural, `{ id, title, minutes }` is a valid `Lesson` even without the interface name. The exception is **freshness**: the compiler runs an excess-property check on object literals assigned directly to a typed target, which is how typos are caught. Once the object is stored in a variable, extra properties are allowed (a variable may be a subtype with more fields). `satisfies SomeType` checks the value against a type without widening it, which is ideal for config objects where you want both validation and precise literal types.",
      "**5. Discriminated unions and `never`.** A union of object types that share a literal field is the most useful modelling tool in TypeScript. `switch (q.kind)` narrows `q` in each branch, so the compiler knows which fields exist and rejects a field that belongs to another variant. Marking the default as `const x: never = q` (or calling `assertNever(q)`) fails to compile if a new variant was added and not handled. `never` also appears as the return type of a function that always throws, and as the result of impossible intersections such as `string & number`.",
      "**6. Generics and constraints.** A type parameter is a placeholder the caller fills in. TypeScript infers it from arguments, so `first([\"a\", \"b\"])` returns `string | undefined` without an explicit `<string>`. A constraint (`T extends { length: number }`) lets the body read `.length` while still preserving the caller's exact type. Defaults (`<T = string>`) and multiple parameters (`<K extends keyof T, V>`) make reusable APIs practical. The standard library's `Array<T>`, `Promise<T>`, `Map<K, V>` and `Record<K, V>` are all generics; so are React's `useState<T>` and your own `getJson<T>`.",
      "**7. Utility types are mapped types in disguise.** `Partial<T>` maps every property to `T[K] | undefined`, `Readonly<T>` adds `readonly`, `Pick<T, K>` keeps a subset of keys, `Omit<T, K>` is `Pick<T, Exclude<keyof T, K>>`, and `Record<K, V>` builds an object type from a key union. `keyof T` gives the key union, `T[K]` is an indexed access type, and `(typeof levels)[number]` extracts the union of a `readonly` tuple's elements. Reading the definitions once demystifies most 'advanced' TypeScript.",
      "**8. Strictness flags change what is legal.** `strictNullChecks` removes `null` and `undefined` from every type unless you include them, so `user.profile.name` is an error when `profile` may be missing. `noImplicitAny` stops a forgotten annotation from silently becoming `any`. `strictFunctionTypes` checks parameter types contravariantly. `exactOptionalPropertyTypes` separates 'missing' from 'present but undefined'. `noUncheckedIndexedAccess` makes every dynamic index access include `undefined`, which catches the classic `rows[0].id` crash on an empty array. Turn them on early; retrofitting them into a large codebase is a project of its own.",
      "**9. The boundary is still yours.** Declarations (`.d.ts`) describe JavaScript that already exists, and generated types from OpenAPI or GraphQL keep client and server in sync, but neither validates a byte at runtime. `await res.json() as User` is a promise to the compiler, not a check. The safe pattern is: receive `unknown`, validate with a hand-written guard or a schema library, then return `T`. Inside the program, types prevent whole classes of bugs; at the edge, only runtime checks do.",
    ],
    diagram: {
      title: "Where the type system acts, and where it stops",
      nodes: [
        { label: "API JSON", sub: "unknown" },
        { label: "Validate", sub: "guard or schema" },
        { label: "Typed T", sub: "compile-time only" },
        { label: "tsc check", sub: "narrowing, never" },
        { label: "Runtime JS", sub: "types erased" },
      ],
      edges: ["guard narrows", "checked by tsc", "emits", "runs"],
      caption: "The only runtime step is validation at the boundary. Everything after it is a compile-time promise, erased before the code runs.",
    },
  },
  handsOn: [
    {
      title: "Set up a strict project",
      text: ["Start from a project that checks everything. `tsc --init` writes a `tsconfig.json`; the flags below are the ones that catch the bugs in this lesson."],
      code: {
        lang: "bash",
        code: `mkdir ts-lab && cd ts-lab
npm init -y
npm install -D typescript tsx
npx tsc --init --strict --target es2022 --module nodenext
# add noUncheckedIndexedAccess to compilerOptions, then:
npx tsc --noEmit          # type-check only; no files written
npx tsx main.ts           # run a TypeScript file directly in Node`,
      },
      notes: ["`tsx` is for development convenience; the type check that matters in CI is still `tsc --noEmit`. The generated tsconfig may contain more options depending on your TypeScript version."],
    },
    {
      title: "Let the compiler find three real bugs",
      text: [
        "Create `mistakes.ts` with three mistakes you have probably made: a misspelled property, an optional value used as if it were always there, and a union variant the handler forgot. Run the compiler with the strict flags from step 1 and read the error codes, not just the prose.",
      ],
      code: {
        lang: "typescript",
        file: "mistakes.ts",
        code: `interface Lesson {
  id: string;
  title: string;
  minutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  tags?: string[];
}

// 1. A typo in a property name.
const typo: Lesson = {
  id: "1.2.3",
  title: "TypeScript",
  minuts: 70,
  level: "Beginner",
};

// 2. An optional value used as if it were always present.
console.log(typo.tags.length);

// 3. A new variant the handler forgot to handle.
type QuizQuestion =
  | { kind: "mcq"; prompt: string; options: string[]; answer: number }
  | { kind: "freeText"; prompt: string; keywords: string[] }
  | { kind: "code"; prompt: string; starter: string };

function maxScore(q: QuizQuestion): number {
  switch (q.kind) {
    case "mcq":
      return 1;
    case "freeText":
      return q.keywords.length;
  }
}`,
      },
      output: "mistakes.ts(13,3): error TS2561: Object literal may only specify known properties, but 'minuts' does not exist in type 'Lesson'. Did you mean to write 'minutes'?\nmistakes.ts(18,13): error TS18048: 'typo.tags' is possibly 'undefined'.\nmistakes.ts(26,37): error TS2366: Function lacks ending return statement and return type does not include 'undefined'.",
      notes: [
        "Command: `npx tsc --noEmit --strict --noUncheckedIndexedAccess --target es2022 --module nodenext mistakes.ts`. Captured with TypeScript 7.0.2; exit code 1.",
        "TS2561 is the excess-property check on a fresh object literal: the typo is caught, and the compiler suggests the intended key. TS18048 exists because `strictNullChecks` is on and `tags` is optional. TS2366 is the missing-return check: with `code` unhandled, the function can fall off the end. All three are compile-time failures, not runtime surprises.",
      ],
    },
    {
      title: "Fix all three, then prove it runs",
      text: [
        "The fixes are small but each one teaches a different mechanism. Correct the key, use optional chaining with a nullish fallback, and make the switch exhaustive with `assertNever`. The same file also keeps the `Result` union and a `freeText` case so you can see narrowing in both directions.",
      ],
      code: {
        lang: "typescript",
        file: "fixed.ts",
        code: `interface Lesson {
  id: string;
  title: string;
  minutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  tags?: string[];
}

type QuizQuestion =
  | { kind: "mcq"; prompt: string; options: string[]; answer: number }
  | { kind: "freeText"; prompt: string; keywords: string[] }
  | { kind: "code"; prompt: string; starter: string };

function assertNever(x: never): never {
  throw new Error("Unhandled case: " + JSON.stringify(x));
}

function maxScore(q: QuizQuestion): number {
  switch (q.kind) {
    case "mcq":
      return 1;
    case "freeText":
      return q.keywords.length;
    case "code":
      return 2;
    default:
      return assertNever(q);
  }
}

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parsePercent(input: string): Result<number> {
  const n = Number(input);
  if (Number.isNaN(n)) return { ok: false, error: \`"\${input}" is not a number\` };
  if (n < 0 || n > 100) return { ok: false, error: "must be between 0 and 100" };
  return { ok: true, value: n / 100 };
}

const lesson: Lesson = {
  id: "1.2.3",
  title: "TypeScript",
  minutes: 70,
  level: "Beginner",
};

console.log(lesson.tags?.length ?? 0);

for (const s of ["80", "abc", "150"]) {
  const r = parsePercent(s);
  console.log(r.ok ? \`ok \${r.value}\` : \`error: \${r.error}\`);
}

console.log(maxScore({ kind: "freeText", prompt: "Name 3 HTTP methods", keywords: ["GET", "POST", "PUT"] }));`,
      },
      output: "TSC_EXIT=0\n0\nok 0.8\nerror: \"abc\" is not a number\nerror: must be between 0 and 100\n3",
      notes: [
        "`lesson.tags?.length ?? 0` handles the optional property: `?.` stops at `undefined`, and `??` supplies a fallback only for `null`/`undefined` (unlike `||`, which would also replace `0` and `\"\"`).",
        "The `default` branch is reachable only when `q.kind` is still `never`, so the assignment inside `assertNever` fails to compile the moment someone adds a variant and forgets a case. That is the exhaustiveness check doing real work.",
        "`r.ok` is a discriminant: the true branch has `value`, the false branch has `error`, and TypeScript rejects `r.value` in the error branch. The `Result` pattern keeps expected failures in the type instead of throwing.",
      ],
    },
    {
      title: "Keep the comparison table beside you",
      text: ["These are the decisions you will make every day. Read the table top to bottom once, then use it as a reference when a type feels wrong."],
      code: {
        lang: "text",
        file: "types-cheatsheet.txt",
        code: `any vs unknown vs never
any      turns checking off; assignable both ways; use only as a last resort
unknown  accepts anything, but you must narrow before use; the type of external data
never    no value at all; the bottom type; use for impossible cases and exhaustiveness

Optional vs nullable
tags?: string[]          the property may be absent (implicitly undefined)
tags: string[] | null    the property must exist; its value may be the explicit value null
tags?: string[] | null   both are possible; handle both with ?. and ?? or an if

Utility types (all built from mapped/conditional types)
Partial<T>     every property optional
Required<T>    every property required
Pick<T, K>     only the keys in K
Omit<T, K>     every key except those in K
Record<K, V>   keys from K, values of type V
Readonly<T>    properties cannot be reassigned

Literal types
level: "Beginner" | "Intermediate" | "Advanced"   one value from a fixed set
const levels = ["Beginner", "Intermediate", "Advanced"] as const   keeps literals, readonly
type Level = (typeof levels)[number]              derives the union from the value

Strictness flags worth turning on
strict                     enables the family below
strictNullChecks           null and undefined are not assignable to everything
noImplicitAny              an untyped parameter is an error, not any
noUncheckedIndexedAccess   arr[i] and record[key] include undefined
exactOptionalPropertyTypes "present but undefined" is not the same as "missing"`,
      },
      notes: ["`as const` on the array is what makes `(typeof levels)[number]` a union of three literals instead of `string`. Without it, the element type widens to `string`."],
    },
    {
      title: "Draw the decision map",
      text: ["When you are unsure which tool to reach for, follow this flowchart. The first branch is the most important: data from outside the program is `unknown` until it has been validated."],
      code: {
        lang: "mermaid",
        file: "type-decisions.mmd",
        code: `flowchart TD
  A["Value arrives"] --> B{"From outside the program?"}
  B -->|"Yes: JSON, env, storage"| C["Type it unknown"]
  C --> D["Validate with a type guard or Zod"]
  D --> E["Known T"]
  B -->|No| F{"Fixed set of states?"}
  F -->|Yes| G["Discriminated union + assertNever"]
  F -->|No| H{"Same code for many types?"}
  H -->|Yes| I["Generic with a constraint"]
  H -->|No| J["interface / type alias"]
  E --> K["Use it"]
  G --> K
  I --> K
  J --> K`,
      },
      notes: [
        "Most production bugs at a type boundary come from skipping boxes C and D. `as` jumps straight to E without validating anything.",
        "A generic is not a goal in itself: if the function only ever works with one shape, a plain interface is easier to read.",
      ],
    },
  ],
  companies: [
    "**TypeScript at scale (illustrative):** large front-end and Node codebases adopt TypeScript mainly for refactoring safety. Rename a field and the compiler lists every call site; change a union and every non-exhaustive switch becomes an error. The value grows with team size and code age, not with the size of any single file.",
    "**Shared contracts (illustrative):** teams generate TypeScript types from OpenAPI documents, GraphQL schemas or protobuf definitions so the frontend and backend cannot silently drift. The generation step is only as good as the schema; a hand-edited generated file is a contract bug waiting to happen.",
    "**Runtime validation at boundaries (illustrative):** production apps validate API responses, form input, `localStorage` and environment variables with schema libraries such as Zod, Valibot or io-ts. The schema is the single source of truth: the runtime check and the static type come from the same definition.",
    "**Compiler-enforced design systems and SDKs (illustrative):** component libraries and public SDKs use literal unions, discriminated unions and generics so misuse is caught in the editor. A prop typed `\"sm\" | \"md\" | \"lg\"` is discoverable and impossible to misspell; a prop typed `string` is neither.",
    "**Strictness as an operational choice (illustrative):** teams run `tsc --noEmit` as a required CI check and treat a new `any` or `as` in review as a design smell. Migrations usually start with `strict: false`, then ratchet file by file because turning everything on at once produces thousands of errors that hide the real ones.",
  ],
  mistakes: [
    { mistake: "Using `any` to silence errors", why: "Fastest way to make red squiggles go away", wrong: "Type checking is switched off and bugs spread from there", fix: "Use `unknown` and narrow, or fix the type; ban `any` with a lint rule" },
    { mistake: "Trusting `as` casts on API data", why: "`await res.json() as User` compiles", wrong: "Wrong shapes crash later, far from the cause", fix: "Validate with a type guard or schema at the boundary" },
    { mistake: "Leaving strict mode off", why: "Fewer errors when migrating", wrong: "Null/undefined bugs and implicit `any` go unchecked", fix: "Enable `strict` from day one; migrate files gradually if you must" },
    { mistake: "Booleans instead of unions for state", why: "`isLoading`, `isError`, `data` as separate fields", wrong: "Impossible states (loading AND error) become possible", fix: "A discriminated union: `{status:'loading'} | {status:'error', error} | {status:'ok', data}`" },
    { mistake: "Treating `?` and `| null` as interchangeable", why: "Both look like 'might be missing'", wrong: "Code that handles `undefined` but not `null` (or the reverse) still crashes, and `exactOptionalPropertyTypes` exposes the difference", fix: "Decide whether absent or explicitly null is the real state; handle both at the edge and normalise early" },
    { mistake: "Ignoring `noUncheckedIndexedAccess`", why: "`rows[0].id` compiles by default", wrong: "An empty array or unknown key gives `undefined` and a runtime crash", fix: "Enable the flag, check `length` or the key, and use `rows[0]?.id` with a fallback" },
    { mistake: "Adding a union variant without an exhaustive switch", why: "The new case compiles and only that one handler is wrong", wrong: "The function returns `undefined` at runtime and the bug appears far away", fix: "Use a `default: return assertNever(q)` branch so the compiler lists every handler to update" },
    { mistake: "Writing a generic with no constraint", why: "`<T>(x: T) => x.length` looks reusable", wrong: "The body cannot use `length`, so the author reaches for `any` or a cast", fix: "Constrain it: `<T extends { length: number }>(x: T): number`" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `tsc --noEmit` as a required CI check." },
    { tag: "Reliability", text: "External data is `unknown` until validated; derive types from schemas where possible, and never let a component call `fetch` directly." },
    { tag: "Maintainability", text: "Model states with discriminated unions and `assertNever` for exhaustiveness; make impossible states unrepresentable." },
    { tag: "Maintainability", text: "Annotate function parameters and exported APIs; let inference type local variables. Prefer simple types over type puzzles." },
    { tag: "Security", text: "Validate and normalise JSON, `localStorage`, URL parameters and environment variables at the boundary; a cast is not a check, and unsafe links or numbers can reach the DOM." },
  ],
  interview: [
    { q: "What is the difference between `any`, `unknown` and `never`?", a: "`any` disables checking: you can read any property, call it, assign it anywhere, and no error is reported. `unknown` is the safe top type: every value is assignable to it, but you must narrow it with `typeof`, `instanceof`, `in`, a type guard or a schema before using it, so it is the right type for external data. `never` is the bottom type: it has no values, is assignable to every type, and nothing except `never` is assignable to it. It marks functions that never return and impossible branches; assigning a union to `never` in a `default` case is how exhaustive checks are enforced." },
    { q: "What is a discriminated union, and why is it better than optional fields?", a: "It is a union of object types that share a literal field such as `kind` or `status`. Checking that field narrows to one variant, so the compiler knows which properties exist and rejects properties from the other variants. Optional fields let invalid combinations exist (`loading: true` with `data` and `error`), while a union makes those states unrepresentable. Combined with an exhaustive `switch` and a `never` default, adding a new variant turns every unhandled handler into a compile error instead of a runtime `undefined`." },
    { q: "Does TypeScript make your app type-safe at runtime?", a: "No. Types are erased at compile time; the browser or Node runs plain JavaScript. TypeScript prevents mistakes inside code you control, but data from the network, storage, environment variables or users must be validated at runtime. A type guard or schema library is the bridge: it performs a real check and, on success, narrows `unknown` to `T`. Assertion functions work the same way but must actually throw when the check fails; `as` is only a promise to the compiler and validates nothing." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "`function f(x: string | number)`. Inside `if (typeof x === \"string\") { ... }`, what is x's type?",
      options: ["string | number", "string", "any", "never"],
      answer: 1,
      explanation: "The typeof check narrows the union to string inside that block.",
    },
    {
      kind: "bug",
      prompt: "This compiles but crashes at runtime with 'Cannot read properties of undefined'. Why?",
      code: { lang: "typescript", code: "interface User { profile: { name: string } }\nconst user = (await res.json()) as User;\nconsole.log(user.profile.name);" },
      options: ["interface syntax is wrong", "The `as` cast trusts the API; the real response had no profile", "await is not allowed here", "console.log cannot print strings"],
      answer: 1,
      explanation: "Casts tell the compiler to trust you. Validate unknown data before treating it as User.",
    },
    {
      kind: "mcq",
      prompt: "Which type makes an impossible state impossible?",
      options: [
        "{ loading: boolean; error?: string; data?: Lesson[] }",
        "{ status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: Lesson[] }",
        "any",
        "{ state: string }",
      ],
      answer: 1,
      explanation: "With the union you cannot have both an error and data, or loading with data, by construction.",
    },
  ],
  cheatSheet: [
    "Turn on strict, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Run `tsc --noEmit` in CI.",
    "Structural typing: shape over name. Fresh object literals get excess-property checks.",
    "Literal unions over plain string: `'Beginner' | 'Advanced'`. `as const` preserves literals.",
    "Discriminated union + switch + `assertNever` = exhaustive handling.",
    "`unknown` for external data; validate, then use. `any` switches checking off; `never` has no values.",
    "Generics keep type info: `getJson<T>(...): Promise<T>`; constrain with `T extends { id: string }`.",
    "Utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`; derive unions with `(typeof xs)[number]`.",
    "Optional `?` means absent; `| null` means an explicit null. Use `?.` and `??`, not `||`, for missing values.",
    "Type guards return `x is T`; assertion functions declare `asserts x is T` and must throw when the check fails.",
  ],
  homework: {
    basic: {
      title: "Type the Mentor progress card",
      brief: ["Write TypeScript types for a learner profile (name, goal from a fixed list, hoursPerWeek, levels per area) and a function `formatCard(profile)` returning the Progress Card string. Make invalid goals a compile error."],
      criteria: ["Goal is a literal union", "Levels typed with Record over an Area union", "No any", "The file compiles with strict and noUncheckedIndexedAccess"],
      hints: ["type Area = 'programming' | 'frontend' | ...; Record<Area, Level>", "Try assigning an invalid goal and paste the compiler error."],
      solution: {
        text: ["Literal unions turn typos into compile errors; Record over a union forces every area to be present."],
        code: {
          lang: "typescript",
          code: `type Goal = "job-switch" | "full-stack" | "backend" | "ai-engineer" | "devops-cloud";
type Area = "programming" | "frontend" | "backend" | "databases" | "dsa" | "cloud" | "devops" | "ai";
type Level = "none" | "beginner" | "intermediate" | "advanced";

interface Profile {
  name: string;
  goal: Goal;
  hoursPerWeek: number;
  levels: Record<Area, Level>;
}

function formatCard(p: Profile): string {
  const strong = (Object.entries(p.levels) as [Area, Level][])
    .filter(([, l]) => l === "intermediate" || l === "advanced")
    .map(([a]) => a);
  return [\`Learner: \${p.name}\`, \`Goal: \${p.goal}\`, \`Pace: \${p.hoursPerWeek} h/week\`, \`Strengths: \${strong.join(", ") || "none yet"}\`].join("\\n");
}`,
        },
      },
    },
    intermediate: {
      title: "Typed async state",
      brief: ["Write a generic `type AsyncState<T>` discriminated union (idle, loading, error, success) and a function `render<T>(state, show: (data: T) => string)` that handles every case with an exhaustive switch."],
      criteria: ["Generic over T", "Exhaustive with never", "No optional fields used to fake states", "Adding a fifth state makes the compiler fail"],
      hints: ["The success variant carries data: T; the error variant carries error: string.", "Put the never assignment in the default branch, not in a comment."],
      solution: {
        text: ["This is exactly the shape you will use for data fetching in React (Phase 3)."],
        code: {
          lang: "typescript",
          code: `type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

function render<T>(s: AsyncState<T>, show: (data: T) => string): string {
  switch (s.status) {
    case "idle": return "Nothing yet";
    case "loading": return "Loading…";
    case "error": return \`Error: \${s.error}\`;
    case "success": return show(s.data);
    default: { const never: never = s; return never; }
  }
}

console.log(render({ status: "success", data: [1, 2, 3] }, (xs) => \`\${xs.length} items\`));`,
        },
      },
    },
    challenge: {
      title: "Validate environment variables",
      brief: ["Write `loadEnv(env: Record<string, string | undefined>)` that returns a typed config `{ apiUrl: URL; port: number; logLevel: 'debug'|'info'|'warn'|'error' }` or throws one error listing every problem. Do it without libraries, then rewrite it with Zod and compare."],
      criteria: ["All errors reported at once", "Correct types inferred for the result", "Short comparison of hand-written vs schema", "No non-null assertions (`!`) in the final version"],
      hints: ["new URL(x) throws on invalid URLs.", "Zod: z.object({...}).safeParse(env)", "Narrow `apiUrl` with an `if (apiUrl === undefined)` guard instead of `!`."],
      solution: {
        text: ["Hand-written validation is fine for a few fields; a schema library wins once there are many, because the type is derived from the schema (one source of truth) and error messages are consistent."],
        code: {
          lang: "typescript",
          code: `const LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LEVELS)[number];
interface Config { apiUrl: URL; port: number; logLevel: LogLevel }

export function loadEnv(env: Record<string, string | undefined>): Config {
  const errors: string[] = [];
  let apiUrl: URL | undefined;
  try { apiUrl = new URL(env.API_URL ?? ""); } catch { errors.push("API_URL must be a valid URL"); }
  const port = Number(env.PORT ?? "8080");
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT must be 1-65535");
  const logLevel = (env.LOG_LEVEL ?? "info") as string;
  if (!(LEVELS as readonly string[]).includes(logLevel)) errors.push(\`LOG_LEVEL must be one of \${LEVELS.join(", ")}\`);
  if (errors.length) throw new Error("Invalid environment:\\n- " + errors.join("\\n- "));
  if (apiUrl === undefined) throw new Error("API_URL must be a valid URL");
  return { apiUrl, port, logLevel: logLevel as LogLevel };
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: shared API types",
      brief: ["Create `web/src/api/types.ts` with types for Lesson, Progress, QuizResult and NewsItem, plus runtime guards (or Zod schemas) for each API response. Use the typed getJson helper for every call."],
      criteria: ["No any in the API layer", "Every response validated before use", "tsc --noEmit passes in CI", "A malformed response fails at the boundary, not in a component"],
      hints: ["Later you can generate these types from the ASP.NET Core OpenAPI document.", "Build guards from small reusable checks and a generic `arrayOf`."],
      solution: {
        text: [
          "Keep all API calls in one module that returns validated, typed data; components then never deal with unknown shapes.",
          "types.ts declares the four shapes and one guard per shape, built from tiny reusable checks (`isRecord`, `isString`, `isNumber`, `isIsoDate`) and a generic `arrayOf` that turns a guard for T into a guard for T[]. Guards check rules the type alone cannot express: minutes > 0, score between 0 and 1, http(s) news links only.",
          "client.ts reuses the lesson's `getJson` and exposes one function per endpoint through `createApi(base, fetchFn)`. Injecting fetch lets the Vitest file test success, wrong shape and HTTP errors without a server. Verified with `tsc --noEmit` (strict, noUncheckedIndexedAccess) and `vitest run`: 4 tests pass.",
        ],
        code: {
          lang: "typescript", file: "web/src/api/types.ts",
          code: `// Shapes returned by the DevAtlas API, plus runtime guards. Types vanish at runtime,
// so every response is checked by a guard before the rest of the app sees it.

export type Level = "Beginner" | "Intermediate" | "Advanced";
const LEVELS: readonly string[] = ["Beginner", "Intermediate", "Advanced"];

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  level: Level;
  tags?: string[];
}

export interface Progress {
  lessonId: string;
  completed: boolean;
  updatedAt: string; // ISO 8601
}

export interface QuizResult {
  userId: number;
  lessonId: string;
  score: number; // 0..1
  takenAt: string; // ISO 8601
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO 8601
}

export type Guard<T> = (data: unknown) => data is T;

const isRecord = (d: unknown): d is Record<string, unknown> =>
  typeof d === "object" && d !== null && !Array.isArray(d);
const isString = (d: unknown): d is string => typeof d === "string";
const isNumber = (d: unknown): d is number => typeof d === "number" && Number.isFinite(d);
const isIsoDate = (d: unknown): d is string => isString(d) && !Number.isNaN(Date.parse(d));

export const arrayOf =
  <T>(guard: Guard<T>): Guard<T[]> =>
  (d): d is T[] =>
    Array.isArray(d) && d.every(guard);

export const isLesson: Guard<Lesson> = (d): d is Lesson =>
  isRecord(d) &&
  isString(d.id) &&
  isString(d.title) &&
  isNumber(d.minutes) && d.minutes > 0 &&
  isString(d.level) && LEVELS.includes(d.level) &&
  (d.tags === undefined || arrayOf(isString)(d.tags));

export const isProgress: Guard<Progress> = (d): d is Progress =>
  isRecord(d) && isString(d.lessonId) && typeof d.completed === "boolean" && isIsoDate(d.updatedAt);

export const isQuizResult: Guard<QuizResult> = (d): d is QuizResult =>
  isRecord(d) &&
  Number.isInteger(d.userId) &&
  isString(d.lessonId) &&
  isNumber(d.score) && d.score >= 0 && d.score <= 1 &&
  isIsoDate(d.takenAt);

export const isNewsItem: Guard<NewsItem> = (d): d is NewsItem =>
  isRecord(d) &&
  isString(d.title) &&
  isString(d.url) && /^https?:\\/\\//.test(d.url) && // blocks javascript: links in rendered anchors
  isString(d.source) &&
  isIsoDate(d.publishedAt);

// ---- web/src/api/client.ts ----
// The only module that talks to the API. Components import these functions and get typed,
// validated data; they never see \`unknown\` or call fetch themselves.
import {
  arrayOf, isLesson, isNewsItem, isProgress, isQuizResult,
  type Guard, type Lesson, type NewsItem, type Progress, type QuizResult,
} from "./types";

export async function getJson<T>(url: string, validate: Guard<T>, fetchFn: typeof fetch = fetch): Promise<T> {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`);
  const data: unknown = await res.json();
  if (!validate(data)) throw new Error(\`Unexpected response shape from \${url}\`);
  return data;
}

export function createApi(base: string, fetchFn: typeof fetch = fetch) {
  const get = <T>(path: string, guard: Guard<T>) => getJson(\`\${base}\${path}\`, guard, fetchFn);
  return {
    lessons: (): Promise<Lesson[]> => get("/lessons", arrayOf(isLesson)),
    lesson: (id: string): Promise<Lesson> => get(\`/lessons/\${encodeURIComponent(id)}\`, isLesson),
    progress: (): Promise<Progress[]> => get("/me/progress", arrayOf(isProgress)),
    quizResults: (lessonId: string): Promise<QuizResult[]> =>
      get(\`/me/quiz-results?lesson=\${encodeURIComponent(lessonId)}\`, arrayOf(isQuizResult)),
    news: (): Promise<NewsItem[]> => get("/news", arrayOf(isNewsItem)),
  };
}

export type Api = ReturnType<typeof createApi>;

// ---- web/src/api/client.test.ts ----
import { describe, expect, it } from "vitest";
import { createApi } from "./client";

// A fake fetch: the network is the boundary we replace in tests.
function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return async (input) => {
    const url = String(input);
    return url in routes ? Response.json(routes[url]) : new Response("not found", { status: 404 });
  };
}

const lesson = { id: "1.2.3", title: "TypeScript", minutes: 70, level: "Beginner", tags: ["ts"] };

describe("api client", () => {
  it("returns typed, validated lessons", async () => {
    const api = createApi("/api", fakeFetch({ "/api/lessons": [lesson] }));
    const lessons = await api.lessons();
    expect(lessons[0]?.minutes).toBe(70);
  });

  it("rejects a response with the wrong shape", async () => {
    const api = createApi("/api", fakeFetch({ "/api/lessons/1.2.3": { ...lesson, minutes: "70" } }));
    await expect(api.lesson("1.2.3")).rejects.toThrow("Unexpected response shape from /api/lessons/1.2.3");
  });

  it("rejects out-of-range scores and unsafe news links", async () => {
    const api = createApi("/api", fakeFetch({
      "/api/me/quiz-results?lesson=1.2.3": [{ userId: 7, lessonId: "1.2.3", score: 80, takenAt: "2026-10-18T09:00:00Z" }],
      "/api/news": [{ title: "x", url: "javascript:alert(1)", source: "y", publishedAt: "2026-10-18" }],
    }));
    await expect(api.quizResults("1.2.3")).rejects.toThrow("Unexpected response shape");
    await expect(api.news()).rejects.toThrow("Unexpected response shape");
  });

  it("surfaces HTTP errors", async () => {
    const api = createApi("/api", fakeFetch({}));
    await expect(api.progress()).rejects.toThrow("HTTP 404 for /api/me/progress");
  });
});`,
        },
        pitfalls: ["Writing `const data = await res.json() as Lesson[]`: a cast is a promise to the compiler, not a check, and bad data flows straight into components", "Checking only the outer array and not every element", "Letting components call fetch directly, so validation is skipped on the one call nobody remembered"],
      },
    },
  },
  deeper: [
    { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    { label: "TypeScript: Narrowing", url: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html" },
    { label: "TypeScript: Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html" },
    { label: "TypeScript: Utility Types", url: "https://www.typescriptlang.org/docs/handbook/utility-types.html" },
    { label: "TypeScript: strict compiler option", url: "https://www.typescriptlang.org/tsconfig/strict.html" },
    { label: "Zod documentation", url: "https://zod.dev/" },
  ],
  nextPreview: "Next: C# and .NET. Value vs reference types, records, nullable reference types, and how the .NET runtime runs your code.",
};
