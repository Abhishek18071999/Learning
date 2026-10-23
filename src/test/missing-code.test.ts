import { describe, expect, it } from "vitest";
import { lessons } from "./allLessons";

const tiers = ["basic", "intermediate", "challenge", "capstone"] as const;

// Every homework tier's model solution must include code (or a filled-in document),
// so a learner always has a runnable reference, not just prose.
describe("homework solutions with code", () => {
  it("every tier has a solution.code", () => {
    const missing = lessons.flatMap((l) =>
      tiers.filter((t) => !l.homework[t].solution.code).map((t) => `${l.id} ${t}`),
    );
    expect(missing, `text-only solutions: ${missing.join(", ")}`).toEqual([]);
  });
});
