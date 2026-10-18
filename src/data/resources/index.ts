import type { ResourceCourse, ResourceSection, ResourceTopic } from "../../types";
import { sections } from "./sections";

// Curated links for the Resources page: one file per section, each split into end-to-end courses.
// Every link was opened and checked; a missing read/video/practice field means none is verified yet.

export { sections };

export const sectionById: Record<string, ResourceSection> = Object.fromEntries(sections.map((s) => [s.id, s]));

export const allTopics = (s: ResourceSection): ResourceTopic[] => s.courses.flatMap((c) => c.topics);

/** A topic counts as ready once it has revision lines or at least one verified link. */
export const isReady = (t: ResourceTopic): boolean => t.revision.length > 0 || Boolean(t.read ?? t.video ?? t.practice);

/** Resource topics that cover a lesson, with the course they belong to. */
export function resourcesForLesson(lessonId: string): { topic: ResourceTopic; course: ResourceCourse; section: ResourceSection }[] {
  return sections.flatMap((section) =>
    section.courses.flatMap((course) => course.topics.filter((t) => t.lessonId === lessonId && isReady(t)).map((topic) => ({ topic, course, section }))),
  );
}
