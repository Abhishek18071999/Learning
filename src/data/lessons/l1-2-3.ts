import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.2.3",
  title: "TypeScript: types that catch real bugs",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["1.2.2 Closures, scope and modules"],
  summary: "Use TypeScript to describe your data so the compiler catches typos, missing cases and null bugs before users do: interfaces, unions, narrowing, generics and validating untrusted data at runtime.",
  terms: [
    { term: "Type annotation", def: "Declaring a type explicitly: `let score: number`. TypeScript can often infer it instead." },
    { term: "Interface / type alias", def: "Names for object shapes: `interface User { id: number; name: string }` or `type User = {...}`." },
    { term: "Union type", def: "A value that can be one of several types: `string | number`, or `\"ok\" | \"error\"`." },
    { term: "Narrowing", def: "TypeScript refining a union to a specific member after a check like `typeof x === \"string\"` or `if (result.ok)`." },
    { term: "Generic", def: "A type with a parameter, like `Array<T>` or `function first<T>(xs: T[]): T | undefined`, so one definition works for many types safely." },
    { term: "strict mode", def: "The `strict` compiler option that enables null checks and other important checks. Always on for new projects." },
    { term: "unknown vs any", def: "`any` turns type checking off. `unknown` means 'could be anything, check before use', which is the safe choice for external data." },
  ],
  problem: [
    "The DevAtlas frontend reads `lesson.minuts` (typo) and shows \"undefined min\" for weeks. Another page crashes with `Cannot read properties of null` when a user has no profile. A third renders nothing for a new quiz type someone added on the backend.",
    "None of these need a test to find: a type checker finds all three as you type. TypeScript adds types to JavaScript, checks them at build time, then removes them, so the browser still runs plain JavaScript.",
  ],
  concept: {
    analogy: [
      "Types are **labels on storage boxes** in a warehouse. A box labelled 'glass, this side up' tells every worker how to handle it. If someone tries to stack a crate of bricks on it, the supervisor (the compiler) stops them before anything breaks, instead of you discovering broken glass at the customer's door (runtime).",
    ],
    precise: [
      "TypeScript is **structural**: a value fits a type if it has the right shape, regardless of what it was declared as. Types exist only at compile time; at runtime they are erased.",
      "**Unions + narrowing** model real data precisely. A *discriminated union* (each variant has a literal `kind` or `status` field) lets the compiler know exactly which fields exist after you check that field, and an `assertNever` default makes it an error to forget a case.",
      "**Strict null checks** force you to handle `null`/`undefined` where they can occur. **Generics** let you write reusable functions and types (a typed API client, a cache) without losing type information.",
      "**Types do not validate external data.** JSON from an API, localStorage or user input is `unknown` until checked at runtime, with a manual check or a schema library such as Zod.",
    ],
  },
  underTheHood: {
    text: [
      "`tsc` (or a bundler using esbuild/SWC) parses your code, builds a type graph and reports errors; output JavaScript has the types stripped. Some bundlers only strip types without checking, so projects run `tsc --noEmit` separately in CI.",
      "Inference does most of the work: `const xs = [1, 2]` is `number[]`; a function's return type is inferred from its return statements. Annotate function parameters and public APIs; let inference handle locals.",
      "Control-flow analysis tracks each variable's possible types through `if`, `switch`, `return` and `throw`, which is what makes narrowing work.",
    ],
    diagram: {
      title: "Where types help and where they stop",
      nodes: [
        { label: "Your code", sub: "checked by tsc" },
        { label: "Build", sub: "types erased" },
        { label: "Runtime JS", sub: "no types" },
        { label: "API / JSON / user input", sub: "unknown: validate!" },
      ],
      edges: ["", "", "data enters"],
    },
  },
  handsOn: [
    {
      title: "Set up a strict project",
      code: {
        lang: "bash",
        code: `mkdir ts-lab && cd ts-lab
npm init -y
npm install -D typescript tsx
npx tsc --init --strict --target es2022 --module nodenext
# run a file directly:  npx tsx main.ts     type-check only:  npx tsc --noEmit`,
      },
      notes: ["tsx runs TypeScript files directly in Node for development. The generated tsconfig.json may contain more options depending on your TypeScript version."],
    },
    {
      title: "Interfaces catch typos and missing fields",
      code: {
        lang: "typescript",
        file: "lesson.ts",
        code: `interface Lesson {
  id: string;
  title: string;
  minutes: number;
  level: "Beginner" | "Intermediate" | "Advanced";   // literal union, not any string
  tags?: string[];                                     // optional
}

const l: Lesson = { id: "1.2.3", title: "TypeScript", minutes: 70, level: "Beginner" };

console.log(l.minuts);
//            ~~~~~~ error: Property 'minuts' does not exist. Did you mean 'minutes'?
const bad: Lesson = { id: "x", title: "y", minutes: "70", level: "Expert" };
//                                          ~~~~~~~ number expected   ~~~~~~~ not a valid level
console.log(l.tags.length);
//          ~~~~~~ error: 'l.tags' is possibly 'undefined'.
console.log(l.tags?.length ?? 0);   // safe`,
      },
    },
    {
      title: "Discriminated unions + exhaustive checks",
      code: {
        lang: "typescript",
        file: "result.ts",
        code: `type QuizQuestion =
  | { kind: "mcq"; prompt: string; options: string[]; answer: number }
  | { kind: "output"; prompt: string; code: string; options: string[]; answer: number }
  | { kind: "freeText"; prompt: string; keywords: string[] };

function assertNever(x: never): never {
  throw new Error("Unhandled case: " + JSON.stringify(x));
}

function maxScore(q: QuizQuestion): number {
  switch (q.kind) {
    case "mcq":
    case "output":
      return 1;                       // here TypeScript knows q has options and answer
    case "freeText":
      return q.keywords.length;       // and here it knows q has keywords
    default:
      return assertNever(q);          // add a new kind and forget it -> compile error here
  }
}

console.log(maxScore({ kind: "freeText", prompt: "Name 3 HTTP methods", keywords: ["GET", "POST", "PUT"] }));`,
      },
      output: "3",
    },
    {
      title: "A Result type instead of throwing everywhere",
      code: {
        lang: "typescript",
        file: "safe.ts",
        code: `type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parsePercent(input: string): Result<number> {
  const n = Number(input);
  if (Number.isNaN(n)) return { ok: false, error: \`"\${input}" is not a number\` };
  if (n < 0 || n > 100) return { ok: false, error: "must be between 0 and 100" };
  return { ok: true, value: n / 100 };
}

for (const s of ["80", "abc", "150"]) {
  const r = parsePercent(s);
  console.log(r.ok ? \`ok \${r.value}\` : \`error: \${r.error}\`);   // narrowing on r.ok
}`,
      },
      output: "ok 0.8\nerror: \"abc\" is not a number\nerror: must be between 0 and 100",
    },
    {
      title: "Generics: a typed fetch helper",
      code: {
        lang: "typescript",
        file: "api.ts",
        code: `async function getJson<T>(url: string, validate: (data: unknown) => data is T): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`);
  const data: unknown = await res.json();
  if (!validate(data)) throw new Error(\`Unexpected response shape from \${url}\`);
  return data;
}

interface Repo { full_name: string; stargazers_count: number }

function isRepo(d: unknown): d is Repo {                // a type guard
  return typeof d === "object" && d !== null
    && typeof (d as Repo).full_name === "string"
    && typeof (d as Repo).stargazers_count === "number";
}

const repo = await getJson("https://api.github.com/repos/microsoft/TypeScript", isRepo);
console.log(repo.full_name, repo.stargazers_count > 0);   // repo is typed as Repo`,
      },
      notes: ["Hand-written guards get long; schema libraries like Zod generate both the runtime check and the TypeScript type from one definition."],
    },
    {
      title: "Utility types you will use daily",
      code: {
        lang: "typescript",
        code: `type LessonPreview = Pick<Lesson, "id" | "title">;
type LessonDraft = Partial<Lesson>;               // every field optional
type LessonUpdate = Partial<Omit<Lesson, "id">>;  // can't change id
type ById = Record<string, Lesson>;
type Level = Lesson["level"];                     // "Beginner" | "Intermediate" | "Advanced"
const levels = ["Beginner", "Intermediate", "Advanced"] as const;
type Level2 = (typeof levels)[number];            // same union, derived from a value`,
      },
    },
  ],
  companies: [
    "**TypeScript is the default for serious JavaScript work** in many companies, front end and Node back end alike, because large codebases become much safer to refactor: rename a field and the compiler lists every place to update.",
    "**Shared contracts**: teams generate TypeScript types from OpenAPI or GraphQL schemas so frontend and backend cannot silently drift apart.",
    "**Runtime validation at boundaries**: production apps validate API responses, form input and environment variables with schema libraries (Zod, Valibot, io-ts) because TypeScript types vanish at runtime.",
  ],
  mistakes: [
    { mistake: "Using any to silence errors", why: "Fastest way to make red squiggles go away", wrong: "Type checking is switched off and bugs spread from there", fix: "Use unknown and narrow, or fix the type; ban any with a lint rule" },
    { mistake: "Trusting `as` casts on API data", why: "`await res.json() as User` compiles", wrong: "Wrong shapes crash later, far from the cause", fix: "Validate with a type guard or schema at the boundary" },
    { mistake: "strict mode off", why: "Fewer errors when migrating", wrong: "Null/undefined bugs go unchecked", fix: "Enable strict from day one; migrate files gradually" },
    { mistake: "Booleans instead of unions for state", why: "isLoading, isError, data as separate fields", wrong: "Impossible states (loading AND error) become possible", fix: "A discriminated union: {status:'loading'} | {status:'error', error} | {status:'ok', data}" },
    { mistake: "Over-engineered types", why: "Type puzzles are fun", wrong: "Nobody can read or change the code", fix: "Prefer simple, explicit types; complexity only in shared library code" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "strict: true, noUncheckedIndexedAccess for safer array/record access, and tsc --noEmit in CI." },
    { tag: "Reliability", text: "External data is unknown until validated; derive types from schemas where possible." },
    { tag: "Maintainability", text: "Model states with discriminated unions and assertNever for exhaustiveness." },
    { tag: "Maintainability", text: "Annotate function parameters and exported APIs; let inference type local variables." },
  ],
  interview: [
    { q: "any vs unknown?", a: "any disables type checking: you can do anything with it and errors are not caught. unknown accepts any value but forces you to narrow (typeof, instanceof, a type guard) before using it. Use unknown for external data." },
    { q: "What is a discriminated union and why is it useful?", a: "A union of object types that share a literal field such as kind or status. Checking that field narrows to one variant, so the compiler knows which properties exist. Combined with an exhaustive switch and never, adding a new variant forces every handler to be updated." },
    { q: "Does TypeScript make your app type-safe at runtime?", a: "No. Types are erased at compile time. It prevents mistakes within your code, but data from the network, storage or users must still be validated at runtime." },
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
    "Turn on strict. Run tsc --noEmit in CI.",
    "Literal unions over plain string: 'Beginner' | 'Advanced'.",
    "Discriminated union + switch + assertNever = exhaustive handling.",
    "unknown for external data; validate, then use.",
    "Avoid any and `as` on untrusted data.",
    "Generics keep type info: getJson<T>(...): Promise<T>.",
    "Pick, Omit, Partial, Record, typeof, as const.",
    "Optional chaining ?. and nullish ?? for possibly-missing values.",
  ],
  homework: {
    basic: {
      title: "Type the Mentor progress card",
      brief: ["Write TypeScript types for a learner profile (name, goal from a fixed list, hoursPerWeek, levels per area) and a function `formatCard(profile)` returning the Progress Card string. Make invalid goals a compile error."],
      criteria: ["Goal is a literal union", "Levels typed with Record over an Area union", "No any"],
      hints: ["type Area = 'programming' | 'frontend' | ...; Record<Area, Level>"],
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
      criteria: ["Generic over T", "Exhaustive with never", "No optional fields used to fake states"],
      hints: ["The success variant carries data: T; the error variant carries error: string."],
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
      criteria: ["All errors reported at once", "Correct types inferred for the result", "Short comparison of hand-written vs schema"],
      hints: ["new URL(x) throws on invalid URLs.", "Zod: z.object({...}).safeParse(env)"],
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
  return { apiUrl: apiUrl!, port, logLevel: logLevel as LogLevel };
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: shared API types",
      brief: ["Create `web/src/api/types.ts` with types for Lesson, Progress, QuizResult and NewsItem, plus runtime guards (or Zod schemas) for each API response. Use the typed getJson helper for every call."],
      criteria: ["No any in the API layer", "Every response validated before use", "tsc --noEmit passes in CI"],
      hints: ["Later you can generate these types from the ASP.NET Core OpenAPI document."],
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
    { label: "Zod documentation", url: "https://zod.dev/" },
  ],
  nextPreview: "Next: C# and .NET. Value vs reference types, records, nullable reference types, and how the .NET runtime runs your code.",
};
