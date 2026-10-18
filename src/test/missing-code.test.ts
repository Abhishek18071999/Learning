import { describe, expect, it } from "vitest";
import { lessons } from "./allLessons";

const tiers = ["basic", "intermediate", "challenge", "capstone"] as const;

// Lists every homework tier whose model solution is still text-only.
// Prints the list; it does not fail, because some tiers may stay text-only by design.
describe("homework solutions with code", () => {
  it("lists tiers without solution.code", () => {
    const missing = lessons.flatMap((l) =>
      tiers.filter((t) => !l.homework[t].solution.code).map((t) => `${l.id} ${t}`),
    );
    console.log(missing.length ? `text-only solutions (${missing.length}):\n${missing.join("\n")}` : "every tier has code");
    expect(Array.isArray(missing)).toBe(true);
  });
});
