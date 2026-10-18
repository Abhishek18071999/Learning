import type { Lesson } from "../types";
import { lessons as meta } from "../data/lessons";

// Tests check the full content of every lesson, so they load all lesson files eagerly
// (the app itself loads them one at a time with loadLesson).
const modules = import.meta.glob<{ lesson: Lesson }>("../data/lessons/l*.ts", { eager: true });
const byId = new Map(Object.values(modules).map((m) => [m.lesson.id, m.lesson]));

/** Every full lesson, in curriculum order. */
export const lessons: Lesson[] = meta.map((m) => byId.get(m.id)!).filter(Boolean);
/** Number of lesson files found, to catch files missing from the generated metadata. */
export const lessonFileCount = byId.size;
