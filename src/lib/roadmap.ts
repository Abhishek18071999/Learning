import { phases } from "../data/curriculum";
import { lessons } from "../data/lessons";
import type { Area, Phase } from "../types";
import type { Goal, Profile, State } from "./store";

// Turns an onboarding profile into a week-by-week plan.

const FOCUS: Record<Goal, number[]> = {
  "job-switch": [0, 1, 2, 3, 4, 5, 6, 9, 10],
  "full-stack": [0, 1, 2, 3, 4, 5, 6, 9, 10],
  backend: [0, 1, 2, 4, 5, 6, 8, 9, 10],
  "ai-engineer": [0, 1, 2, 4, 5, 7, 6, 10],
  "devops-cloud": [0, 1, 8, 9, 5, 6, 10],
  "interview-prep": [2, 6, 5, 1, 10],
  "own-product": [0, 1, 3, 4, 5, 7, 9],
};

export interface PlannedPhase {
  phase: Phase;
  weeks: number;
  startWeek: number;
  emphasis: "core" | "supporting" | "verify";
  note?: string;
}

const AREA_LEVEL_FACTOR = { none: 1, beginner: 0.9, intermediate: 0.55, advanced: 0.3 } as const;

export function buildRoadmap(profile: Profile): PlannedPhase[] {
  const hoursFactor = 10 / Math.max(2, profile.hoursPerWeek); // curriculum baseline is ~10 h/week
  const focus = FOCUS[profile.goal];
  const ordered = [...phases].sort((a, b) => rank(a.id) - rank(b.id));
  function rank(id: number) {
    const i = focus.indexOf(id);
    return i === -1 ? 100 + id : i;
  }

  let week = 1;
  return ordered.map((phase) => {
    const isCore = focus.includes(phase.id);
    const level = levelFor(profile, phase.areas);
    let factor = AREA_LEVEL_FACTOR[level] * (isCore ? 1 : 0.5);
    let emphasis: PlannedPhase["emphasis"] = isCore ? "core" : "supporting";
    let note: string | undefined;
    if (level === "advanced" || level === "intermediate") {
      emphasis = "verify";
      note = "You reported prior experience: take the diagnostic and quizzes to confirm, then skim.";
    }
    // DSA runs in parallel with everything else, so it does not push the timeline.
    if (phase.id === 2) factor *= 0.35;
    const weeks = Math.max(1, Math.round(phase.weeks * factor * hoursFactor));
    const planned = { phase, weeks, startWeek: week, emphasis, note };
    if (phase.id !== 2) week += weeks;
    return planned;
  });
}

function levelFor(profile: Profile, areas: Area[]) {
  const order = ["none", "beginner", "intermediate", "advanced"] as const;
  let best: (typeof order)[number] = "none";
  for (const a of areas) {
    const l = profile.levels[a] ?? "none";
    if (order.indexOf(l) > order.indexOf(best)) best = l;
  }
  return best;
}

export function totalWeeks(plan: PlannedPhase[]): number {
  return plan.filter((p) => p.phase.id !== 2).reduce((n, p) => n + p.weeks, 0);
}

/** The next lesson with full content that is not completed, in curriculum order. */
export function nextLessonId(state: State): string | null {
  const next = lessons.find((l) => state.lessons[l.id]?.status !== "completed");
  return next?.id ?? null;
}

export function weakAreas(state: State): string[] {
  return lessons
    .filter((l) => (state.lessons[l.id]?.quizScore ?? 1) < 0.67)
    .map((l) => l.title);
}

export function progressCard(state: State): string {
  const p = state.profile;
  const done = lessons.filter((l) => state.lessons[l.id]?.status === "completed");
  const current = lessons.find((l) => state.lessons[l.id]?.status === "started") ?? null;
  const nextId = nextLessonId(state);
  const next = lessons.find((l) => l.id === nextId);
  const pendingHw = done
    .filter((l) => !(["basic", "intermediate", "challenge", "capstone"] as const).some((t) => state.homework[`${l.id}:${t}`]))
    .map((l) => `${l.id} homework`);
  const scores = [
    ...lessons.filter((l) => state.lessons[l.id]?.quizScore !== undefined).map((l) => `${l.id}: ${Math.round((state.lessons[l.id].quizScore ?? 0) * 100)}%`),
    ...state.quizzes.slice(-3).map((q) => `${q.topic}: ${q.score}/${q.total}`),
  ].slice(-5);
  const capstoneDone = Object.values(state.milestones).filter(Boolean).length;
  const pad = (s: string) => s.padEnd(20);
  return [
    "PROGRESS CARD",
    `${pad("Learner:")}${p?.name || "—"}   Goal: ${p?.goal ?? "—"}   Pace: ${p ? `${p.hoursPerWeek} h/week` : "—"}`,
    `${pad("Current:")}${current ? `Lesson ${current.id}: ${current.title}` : "—"}`,
    `${pad("Completed:")}${done.map((l) => l.id).join(", ") || "none yet"}`,
    `${pad("Homework pending:")}${pendingHw.join(", ") || "none"}`,
    `${pad("Quiz scores:")}${scores.join(", ") || "none yet"}`,
    `${pad("Weak areas:")}${weakAreas(state).join(", ") || "none detected"}`,
    `${pad("Capstone status:")}${capstoneDone} of 10 milestones`,
    `${pad("Next:")}${next ? `Lesson ${next.id}: ${next.title}` : "All available lessons complete"}`,
  ].join("\n");
}
