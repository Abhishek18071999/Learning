import type { Lesson, LessonMeta } from "../../types";
import { allStubs } from "../curriculum";
import { lessonMeta } from "../lessonMeta.generated";

// Every file named l<phase>-<module>-<n>.ts in this folder is a lesson. Only the lightweight
// metadata (src/data/lessonMeta.generated.ts, written by scripts/gen-lesson-meta.mjs) is bundled
// up front; each full lesson is its own chunk, fetched by loadLesson when its page opens.
const modules = import.meta.glob<{ lesson: Lesson }>("./l*.ts");
const order = new Map(allStubs.map((s, i) => [s.id, i]));

export const lessons: LessonMeta[] = [...lessonMeta].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));

export const lessonById: Record<string, LessonMeta> = Object.fromEntries(lessons.map((l) => [l.id, l]));

const cache = new Map<string, Promise<Lesson>>();

/** Loads the full content of a lesson. Rejects if the id has no full lesson. */
export function loadLesson(id: string): Promise<Lesson> {
  let p = cache.get(id);
  if (!p) {
    const meta = lessonById[id];
    const load = meta && modules[`./${meta.file}`];
    p = load ? load().then((m) => m.lesson) : Promise.reject(new Error(`No lesson ${id}`));
    // forget failures (e.g. a dropped connection) so the next visit retries
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}
