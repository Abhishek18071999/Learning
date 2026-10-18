// Content model for DevAtlas. Every lesson follows the Mentor lesson format,
// so the lesson page can render any lesson without special cases.

/** A paragraph of text. Supports `inline code`, **bold** and [links](https://…). */
export type Rich = string;

export type Level = "Beginner" | "Intermediate" | "Advanced";

export interface CodeSample {
  lang: string;
  file?: string;
  code: string;
}

export interface HandsOnStep {
  title: string;
  text?: Rich[];
  code?: CodeSample;
  output?: string;
  notes?: Rich[];
}

/** A left-to-right flow of boxes, used for "under the hood" diagrams. */
export interface FlowNode {
  label: string;
  sub?: string;
}
export interface Diagram {
  title: string;
  nodes: FlowNode[];
  /** Optional label for the arrow after node i. */
  edges?: string[];
  caption?: Rich;
}

export interface Mistake {
  mistake: string;
  why: string;
  wrong: string;
  fix: string;
}

export type PracticeTag = "Security" | "Performance" | "Cost" | "Maintainability" | "Reliability";

export interface QuizQuestion {
  kind: "mcq" | "output" | "bug";
  prompt: Rich;
  code?: CodeSample;
  options: string[];
  answer: number;
  explanation: Rich;
}

export interface HomeworkTask {
  title: string;
  brief: Rich[];
  criteria: string[];
  hints: string[];
  solution: { text: Rich[]; code?: CodeSample; output?: string; pitfalls?: string[] };
}

export interface Lesson {
  id: string; // e.g. "0.1.1" = phase.module.number
  title: string;
  minutes: number;
  level: Level;
  prerequisites: string[];
  summary: string;
  terms: { term: string; def: string }[];
  problem: Rich[];
  concept: { analogy: Rich[]; precise: Rich[] };
  underTheHood: { text: Rich[]; diagram?: Diagram };
  handsOn: HandsOnStep[];
  companies: Rich[];
  mistakes: Mistake[];
  bestPractices: { tag: PracticeTag; text: Rich }[];
  interview: { q: string; a: Rich }[];
  quickCheck: QuizQuestion[];
  cheatSheet: Rich[];
  homework: {
    basic: HomeworkTask;
    intermediate: HomeworkTask;
    challenge: HomeworkTask;
    capstone: HomeworkTask;
  };
  deeper: { label: string; url: string }[];
  nextPreview: Rich;
}

/**
 * The small, always-loaded part of a lesson, generated into src/data/lessonMeta.generated.ts by
 * scripts/gen-lesson-meta.mjs. Lists, search, glossary and revision only need this; the full
 * Lesson is loaded on demand with loadLesson(id).
 */
export interface LessonMeta extends Pick<Lesson, "id" | "title" | "minutes" | "level" | "summary" | "terms" | "interview" | "quickCheck" | "cheatSheet"> {
  capstone: Pick<HomeworkTask, "title" | "criteria">;
  /** Hands-on steps with code plus homework tiers whose solution has code. */
  codeSamples: number;
  /** Source file name in src/data/lessons, e.g. "l0-1-1.ts". */
  file: string;
}

export interface LessonStub {
  id: string;
  title: string;
  /** Learning objectives shown while full content is being written. */
  objectives: string[];
}

export interface Module {
  id: string; // "0.1"
  title: string;
  lessons: LessonStub[];
}

export interface Phase {
  id: number;
  title: string;
  tagline: string;
  icon: string;
  weeks: number; // baseline at ~10 h/week
  areas: Area[];
  modules: Module[];
}

export type Area =
  | "programming"
  | "frontend"
  | "backend"
  | "databases"
  | "dsa"
  | "cloud"
  | "devops"
  | "ai"
  | "foundations"
  | "architecture"
  | "career";
