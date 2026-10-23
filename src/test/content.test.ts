import { describe, expect, it } from "vitest";
import { allStubs, phases } from "../data/curriculum";
import { lessons } from "./allLessons";
import { milestones } from "../data/capstone";
import { classify } from "../data/newsTopics";

describe("lesson content follows the Mentor format", () => {
  it("every full lesson has a curriculum entry", () => {
    const ids = new Set(allStubs.map((s) => s.id));
    for (const l of lessons) expect(ids.has(l.id), l.id).toBe(true);
  });

  it("lesson ids are unique across the curriculum", () => {
    const ids = allStubs.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("full lessons are listed in curriculum order", () => {
    const order = allStubs.map((s) => s.id);
    const positions = lessons.map((l) => order.indexOf(l.id));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  for (const l of lessons) {
    describe(`lesson ${l.id}`, () => {
      it("has every required section", () => {
        expect(l.problem.length).toBeGreaterThan(0);
        expect(l.concept.analogy.length).toBeGreaterThan(0);
        expect(l.concept.precise.length).toBeGreaterThan(0);
        expect(l.underTheHood.text.length).toBeGreaterThan(0);
        expect(l.handsOn.length).toBeGreaterThan(0);
        expect(l.companies.length).toBeGreaterThan(0);
        expect(l.mistakes.length).toBeGreaterThanOrEqual(4);
        expect(l.bestPractices.length).toBeGreaterThan(0);
        expect(l.interview).toHaveLength(3);
        expect(l.quickCheck).toHaveLength(3);
        expect(l.cheatSheet.length).toBeGreaterThanOrEqual(5);
        expect(l.cheatSheet.length).toBeLessThanOrEqual(10);
        expect(l.deeper.length).toBeGreaterThan(0);
      });

      it("quick-check answers point at a real option", () => {
        for (const q of l.quickCheck) {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, `duplicate options in: ${q.prompt}`).toBe(q.options.length);
        }
      });

      it("every homework tier has criteria and a model solution", () => {
        for (const tier of ["basic", "intermediate", "challenge", "capstone"] as const) {
          const t = l.homework[tier];
          expect(t.criteria.length, tier).toBeGreaterThan(0);
          expect(t.solution.text.length, tier).toBeGreaterThan(0);
        }
      });

      it("links are https", () => {
        for (const d of l.deeper) expect(d.url).toMatch(/^https:\/\//);
      });

      it("capstone title follows the milestone naming convention", () => {
        expect(l.homework.capstone.title).toMatch(/^DevAtlas( step \d+)?:/i);
      });

      it("has no hardcoded secrets in code samples", () => {
        const code = l.handsOn.map((s) => s.code?.code ?? "").join("\n");
        expect(code).not.toMatch(/sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/);
      });
    });
  }
});

describe("curriculum and capstone", () => {
  it("has 11 phases numbered 0..10", () => {
    expect(phases.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("every milestone points at a full lesson", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const m of milestones) expect(ids.has(m.lessonId), m.id).toBe(true);
  });
});

describe("news classification", () => {
  it("tags stories by topic", () => {
    expect(classify("Show HN: A Kubernetes operator in Rust").map((t) => t.id)).toEqual(expect.arrayContaining(["devops", "langs"]));
    expect(classify("PostgreSQL 18 released").map((t) => t.id)).toContain("data");
    expect(classify("My grandmother's apple pie")).toEqual([]);
  });
});
