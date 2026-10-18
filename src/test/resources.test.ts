import { describe, expect, it } from "vitest";
import { allStubs, phases } from "../data/curriculum";
import { allTopics, isReady, resourcesForLesson, sections } from "../data/resources";

describe("resource sections", () => {
  it("has AI, AI Automation and RAG sections", () => {
    for (const id of ["ai", "ai-automation", "rag"]) expect(sections.map((s) => s.id)).toContain(id);
  });

  it("covers every curriculum phase except AI engineering, which the AI sections cover", () => {
    const covered = new Set(sections.map((s) => s.phaseId));
    for (const p of phases) if (p.id !== 7) expect(covered.has(p.id), p.title).toBe(true);
  });

  it("section, course and topic ids are unique", () => {
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
    const courses = sections.flatMap((s) => s.courses.map((c) => c.id));
    expect(new Set(courses).size).toBe(courses.length);
    const topics = sections.flatMap(allTopics).map((t) => t.id);
    expect(new Set(topics).size).toBe(topics.length);
  });

  const stubIds = new Set(allStubs.map((s) => s.id));
  for (const s of sections)
    for (const c of s.courses)
      describe(`${s.id}/${c.id}`, () => {
        it("has topics", () => expect(c.topics.length).toBeGreaterThan(0));
        it("topics have short revision lines and well-formed links", () => {
          for (const t of c.topics) {
            expect(t.revision.length, t.id).toBeLessThanOrEqual(4);
            for (const r of t.revision) expect(r.length, t.id).toBeLessThanOrEqual(220);
            for (const l of [t.read, t.video, t.practice]) if (l) expect(l.url, t.id).toMatch(/^https:\/\//);
            if (t.video) {
              expect(t.video.url, t.id).toMatch(/^https:\/\/(www\.)?youtube\.com\/(watch\?v=|playlist\?list=)/);
              expect(["Hindi", "English"]).toContain(t.video.lang);
            }
            if (t.lessonId) expect(stubIds.has(t.lessonId), `${t.id} -> ${t.lessonId}`).toBe(true);
          }
        });
      });

  it("links lessons to their resource topics", () => {
    const r = resourcesForLesson("0.1.1");
    expect(r.length).toBeGreaterThan(0);
    for (const x of r) expect(isReady(x.topic)).toBe(true);
  });
});
