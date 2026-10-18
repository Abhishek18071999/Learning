import type { Lesson } from "../../types";
import { allStubs } from "../curriculum";

// Every file named l<phase>-<module>-<n>.ts in this folder is a lesson; they are
// picked up automatically and ordered by their position in the curriculum.
const modules = import.meta.glob<{ lesson: Lesson }>("./l*.ts", { eager: true });
const order = new Map(allStubs.map((s, i) => [s.id, i]));

export const lessons: Lesson[] = Object.values(modules)
  .map((m) => m.lesson)
  .sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));

export const lessonById: Record<string, Lesson> = Object.fromEntries(lessons.map((l) => [l.id, l]));
