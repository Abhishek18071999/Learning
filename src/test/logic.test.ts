import { describe, expect, it } from "vitest";
import { tokenize } from "../lib/highlight";
import { buildRoadmap, nextLessonId, progressCard, totalWeeks } from "../lib/roadmap";
import { initialState, nextCard, streak, type Profile } from "../lib/store";
import { lessons } from "../data/lessons";
import { lessons as fullLessons } from "./allLessons";

const profile: Profile = {
  name: "Asha",
  levels: {},
  goal: "ai-engineer",
  hoursPerWeek: 10,
  targetMonths: 9,
  os: "linux",
  language: "English",
  style: "code",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("spaced repetition", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  it("promotes a remembered card and schedules it later", () => {
    expect(nextCard({ box: 1, due: "2026-10-18" }, true, now)).toEqual({ box: 2, due: "2026-10-20" });
  });
  it("caps at box 5", () => {
    expect(nextCard({ box: 5, due: "2026-10-18" }, true, now).box).toBe(5);
  });
  it("sends a missed card back to box 1, due tomorrow", () => {
    expect(nextCard({ box: 4, due: "2026-10-18" }, false, now)).toEqual({ box: 1, due: "2026-10-19" });
  });
});

describe("streak", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  it("counts consecutive days ending today", () => {
    expect(streak(["2026-10-16", "2026-10-17", "2026-10-18"], now)).toBe(3);
  });
  it("still counts when today has no activity yet", () => {
    expect(streak(["2026-10-16", "2026-10-17"], now)).toBe(2);
  });
  it("breaks on a gap", () => {
    expect(streak(["2026-10-14", "2026-10-17", "2026-10-18"], now)).toBe(2);
  });
});

describe("roadmap", () => {
  it("puts the goal's core phases first", () => {
    const plan = buildRoadmap(profile);
    expect(plan[0].phase.id).toBe(0);
    expect(plan.findIndex((p) => p.phase.id === 7)).toBeLessThan(plan.findIndex((p) => p.phase.id === 3));
    expect(plan).toHaveLength(11);
  });
  it("gets shorter with more hours per week", () => {
    expect(totalWeeks(buildRoadmap({ ...profile, hoursPerWeek: 20 }))).toBeLessThan(totalWeeks(buildRoadmap(profile)));
  });
  it("marks claimed experience for verification", () => {
    const plan = buildRoadmap({ ...profile, levels: { ai: "advanced" } });
    expect(plan.find((p) => p.phase.id === 7)?.emphasis).toBe("verify");
  });
  it("next lesson skips completed ones", () => {
    const state = { ...initialState, lessons: { [lessons[0].id]: { status: "completed" as const, updatedAt: "" } } };
    expect(nextLessonId(state)).toBe(lessons[1].id);
  });
  it("progress card has every field", () => {
    const card = progressCard({ ...initialState, profile });
    for (const f of ["PROGRESS CARD", "Learner:", "Current:", "Completed:", "Homework pending:", "Quiz scores:", "Weak areas:", "Capstone status:", "Next:"]) expect(card).toContain(f);
  });
});

describe("highlighter", () => {
  it("never loses characters", () => {
    for (const l of fullLessons)
      for (const s of l.handsOn)
        if (s.code) expect(tokenize(s.code.code, s.code.lang).map((t) => t.text).join("")).toBe(s.code.code);
  });
  it("recognises comments, strings and keywords", () => {
    const t = tokenize('def f():\n    return "x"  # done', "python");
    expect(t.find((x) => x.type === "keyword")?.text).toBe("def");
    expect(t.find((x) => x.type === "string")?.text).toBe('"x"');
    expect(t.find((x) => x.type === "comment")?.text).toBe("# done");
  });
});
