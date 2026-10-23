import { describe, expect, it } from "vitest";
import { findModule, loadModuleOverview } from "../data/moduleOverview";

describe("module overview", () => {
  it("finds a module by id", () => {
    expect(findModule("6.4")?.module.title).toBeTruthy();
    expect(findModule("99.9")).toBeNull();
  });

  it("aggregates objectives, lessons, takeaways, mistakes, exercises and an assessment", async () => {
    const o = await loadModuleOverview("6.4");
    expect(o).not.toBeNull();
    expect(o!.objectives.length).toBeGreaterThan(0);
    expect(o!.lessons.length).toBeGreaterThan(0);
    expect(o!.lessons.every((l) => l.hasContent)).toBe(true);
    expect(o!.takeaways.length).toBeGreaterThan(0);
    expect(o!.mistakes.length).toBeGreaterThan(0);
    expect(o!.exercises.length).toBe(o!.lessons.length);
    expect(o!.assessment.length).toBeGreaterThan(0);
    expect(o!.totalMinutes).toBeGreaterThan(0);
  });

  it("does not list a module's own lessons as prerequisites", async () => {
    const o = await loadModuleOverview("6.4");
    const own = new Set(o!.lessons.map((l) => l.id));
    expect(o!.prerequisites.some((p) => own.has(p.split(" ")[0]))).toBe(false);
  });

  it("returns null for an unknown module", async () => {
    expect(await loadModuleOverview("99.9")).toBeNull();
  });
});
