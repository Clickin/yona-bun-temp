import { describe, expect, it } from "vitest";
import { withRepositoryWriteLock } from "./locks";

describe("repository write lock", () => {
  it("serializes actions for the same repository path", async () => {
    const trace: string[] = [];

    const first = withRepositoryWriteLock("/tmp/repo-a", async () => {
      trace.push("first-start");
      await new Promise((resolve) => setTimeout(resolve, 30));
      trace.push("first-end");
    });

    const second = withRepositoryWriteLock("/tmp/repo-a", async () => {
      trace.push("second-start");
      trace.push("second-end");
    });

    await Promise.all([first, second]);

    expect(trace).toEqual(["first-start", "first-end", "second-start", "second-end"]);
  });

  it("allows parallel actions across different repositories", async () => {
    const timestamps: Record<string, number> = {};

    await Promise.all([
      withRepositoryWriteLock("/tmp/repo-a", async () => {
        timestamps.a = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }),
      withRepositoryWriteLock("/tmp/repo-b", async () => {
        timestamps.b = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 20));
      }),
    ]);

    expect(Math.abs((timestamps.a ?? 0) - (timestamps.b ?? 0))).toBeLessThan(20);
  });
});
