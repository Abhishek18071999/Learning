import { phases } from "./curriculum";
import { lessonById, loadLesson } from "./lessons";
import type { Lesson, Module, Phase, QuizQuestion } from "../types";

// Module-level learning design, derived from the module's lessons so it stays in sync
// with the content: objectives, prerequisites, takeaways, mistakes, exercises and an
// end-of-module assessment drawn from each lesson's quick check.

export interface ModuleOverview {
  phase: Phase;
  module: Module;
  objectives: string[];
  prerequisites: string[];
  lessons: { id: string; title: string; hasContent: boolean; minutes?: number; level?: string }[];
  takeaways: string[];
  mistakes: { lessonId: string; mistake: string; fix: string }[];
  exercises: { lessonId: string; title: string; criteria: string[] }[];
  assessment: QuizQuestion[];
  totalMinutes: number;
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

export function findModule(moduleId: string): { phase: Phase; module: Module } | null {
  for (const phase of phases) {
    const module = phase.modules.find((m) => m.id === moduleId);
    if (module) return { phase, module };
  }
  return null;
}

export async function loadModuleOverview(moduleId: string): Promise<ModuleOverview | null> {
  const found = findModule(moduleId);
  if (!found) return null;
  const { phase, module } = found;

  const full = (
    await Promise.all(
      module.lessons.map((l) => (lessonById[l.id] ? loadLesson(l.id).catch(() => null) : Promise.resolve(null))),
    )
  ).filter((l): l is Lesson => l !== null);

  const moduleIds = new Set(module.lessons.map((l) => l.id));
  const prerequisites = uniq(full.flatMap((l) => l.prerequisites)).filter(
    (p) => !moduleIds.has(p.split(" ")[0]),
  );

  const lessons = module.lessons.map((l) => {
    const meta = lessonById[l.id];
    return { id: l.id, title: l.title, hasContent: !!meta, minutes: meta?.minutes, level: meta?.level };
  });

  return {
    phase,
    module,
    objectives: uniq(module.lessons.flatMap((l) => l.objectives)),
    prerequisites,
    lessons,
    takeaways: uniq(full.flatMap((l) => l.cheatSheet)).slice(0, 10),
    mistakes: full
      .flatMap((l) => l.mistakes.map((m) => ({ lessonId: l.id, mistake: m.mistake, fix: m.fix })))
      .slice(0, 6),
    exercises: full.map((l) => ({ lessonId: l.id, title: l.homework.capstone.title, criteria: l.homework.capstone.criteria })),
    assessment: full.flatMap((l) => l.quickCheck).slice(0, 5),
    totalMinutes: lessons.reduce((n, l) => n + (l.minutes ?? 0), 0),
  };
}
