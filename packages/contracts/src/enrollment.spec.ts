import { describe, expect, it } from "vitest";
import { enrollmentMutationResultSchema, enrollmentRequestRefSchema } from "./enrollment";

describe("enrollment contracts", () => {
  it("normalizes enrollment request identifiers", () => {
    expect(
      enrollmentRequestRefSchema.parse({
        ownerName: "  yobi  ",
        projectName: "  projectYobi  ",
      }),
    ).toEqual({
      ownerName: "yobi",
      projectName: "projectYobi",
    });
  });

  it("parses the typed mutation success payload", () => {
    expect(
      enrollmentMutationResultSchema.parse({
        ok: true,
      }),
    ).toEqual({
      ok: true,
    });
  });
});
