import { useSyncExternalStore } from "react";
import type { Area } from "../types";

// All learner state lives in one versioned object in localStorage, behind a tiny
// external store so every component re-renders when it changes.

export type SkillLevel = "none" | "beginner" | "intermediate" | "advanced";
export type Goal = "job-switch" | "full-stack" | "backend" | "ai-engineer" | "devops-cloud" | "interview-prep" | "own-product";

export interface Profile {
  name: string;
  levels: Partial<Record<Area, SkillLevel>>;
  goal: Goal;
  hoursPerWeek: number;
  targetMonths: number;
  os: "windows" | "macos" | "linux";
  language: string;
  style: "code" | "diagrams" | "analogies" | "theory";
  diagnosticScore?: number;
  createdAt: string;
}

export interface LessonProgress {
  status: "started" | "completed";
  quizScore?: number; // 0..1, quick-check result
  updatedAt: string;
}

export interface Submission {
  text: string;
  selfScore?: { correctness: number; quality: number; edgeCases: number; understanding: number };
  submittedAt: string;
}

export interface Card {
  box: number; // Leitner box 1..5
  due: string; // ISO date
}

export interface QuizResult {
  topic: string;
  score: number;
  total: number;
  at: string;
}

export interface State {
  version: 1;
  profile: Profile | null;
  lessons: Record<string, LessonProgress>;
  homework: Record<string, Submission>; // key: `${lessonId}:${tier}`
  hintsUsed: Record<string, number>;
  milestones: Record<string, boolean>;
  cards: Record<string, Card>; // key: `${lessonId}:q${i}`
  quizzes: QuizResult[];
  activity: string[]; // ISO dates (yyyy-mm-dd) with any learning activity
  theme: "system" | "light" | "dark";
}

const KEY = "devatlas:v1";

export const initialState: State = {
  version: 1,
  profile: null,
  lessons: {},
  homework: {},
  hintsUsed: {},
  milestones: {},
  cards: {},
  quizzes: [],
  activity: [],
  theme: "system",
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as State;
    return parsed.version === 1 ? { ...initialState, ...parsed } : initialState;
  } catch {
    return initialState;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function setState(update: (s: State) => State): void {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, quota): keep working in memory
  }
  listeners.forEach((l) => l());
}

export function resetState(): void {
  setState(() => initialState);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
  );
}

export const today = (d = new Date()) => d.toISOString().slice(0, 10);

function withActivity(s: State): State {
  const t = today();
  return s.activity.includes(t) ? s : { ...s, activity: [...s.activity, t].slice(-400) };
}

export const actions = {
  saveProfile(profile: Profile) {
    setState((s) => ({ ...s, profile }));
  },
  startLesson(id: string) {
    setState((s) =>
      s.lessons[id] ? s : withActivity({ ...s, lessons: { ...s.lessons, [id]: { status: "started", updatedAt: new Date().toISOString() } } }),
    );
  },
  completeLesson(id: string, cardIds: string[]) {
    setState((s) => {
      const cards = { ...s.cards };
      for (const c of cardIds) if (!cards[c]) cards[c] = { box: 1, due: today() };
      const prev = s.lessons[id];
      return withActivity({
        ...s,
        cards,
        lessons: { ...s.lessons, [id]: { ...prev, status: "completed", updatedAt: new Date().toISOString() } },
      });
    });
  },
  uncompleteLesson(id: string) {
    setState((s) => ({ ...s, lessons: { ...s.lessons, [id]: { ...s.lessons[id], status: "started", updatedAt: new Date().toISOString() } } }));
  },
  recordQuickCheck(id: string, score: number) {
    setState((s) =>
      withActivity({
        ...s,
        lessons: { ...s.lessons, [id]: { ...s.lessons[id], status: s.lessons[id]?.status ?? "started", quizScore: score, updatedAt: new Date().toISOString() } },
      }),
    );
  },
  recordQuiz(result: QuizResult) {
    setState((s) => withActivity({ ...s, quizzes: [...s.quizzes, result].slice(-50) }));
  },
  submitHomework(key: string, sub: Submission) {
    setState((s) => withActivity({ ...s, homework: { ...s.homework, [key]: sub } }));
  },
  useHint(key: string) {
    setState((s) => ({ ...s, hintsUsed: { ...s.hintsUsed, [key]: (s.hintsUsed[key] ?? 0) + 1 } }));
  },
  toggleMilestone(id: string) {
    setState((s) => ({ ...s, milestones: { ...s.milestones, [id]: !s.milestones[id] } }));
  },
  reviewCard(id: string, remembered: boolean) {
    setState((s) => withActivity({ ...s, cards: { ...s.cards, [id]: nextCard(s.cards[id], remembered) } }));
  },
  setTheme(theme: State["theme"]) {
    setState((s) => ({ ...s, theme }));
  },
  importState(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as State;
      if (parsed.version !== 1) return false;
      setState(() => ({ ...initialState, ...parsed }));
      return true;
    } catch {
      return false;
    }
  },
};

/** Leitner spaced repetition: intervals in days per box. */
export const INTERVALS = [1, 2, 4, 8, 16];

export function nextCard(card: Card | undefined, remembered: boolean, now = new Date()): Card {
  const box = remembered ? Math.min((card?.box ?? 1) + 1, 5) : 1;
  const due = new Date(now);
  due.setDate(due.getDate() + INTERVALS[box - 1]);
  return { box, due: today(due) };
}

/** Consecutive days with activity, ending today or yesterday. */
export function streak(activity: string[], now = new Date()): number {
  const days = new Set(activity);
  const d = new Date(now);
  if (!days.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
