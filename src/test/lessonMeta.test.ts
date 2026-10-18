/// <reference types="node" />
// @vitest-environment node
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lessonMeta } from "../data/lessonMeta.generated";
import { lessonFileCount, lessons } from "./allLessons";

describe("generated lesson metadata", () => {
  it("is up to date with src/data/lessons", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    // exits non-zero (and execFileSync throws) when the generated file differs from a fresh run
    const run = () =>
      execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "scripts/gen-lesson-meta.mjs", "--check"], { cwd: root, encoding: "utf8", stdio: "pipe" });
    expect(run).not.toThrow();
  });

  it("has one entry per lesson file", () => {
    expect(lessonMeta).toHaveLength(lessonFileCount);
    expect(lessons).toHaveLength(lessonFileCount);
  });
});
