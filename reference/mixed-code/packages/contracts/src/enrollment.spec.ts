import { describe, expect, it } from "vitest";
import {
  enrollmentMutationResultSchema,
  enrollmentRequestRefSchema,
  organizationEnrollmentRequestRefSchema,
} from "./enrollment";

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

  it("normalizes organization enrollment identifiers", () => {
    expect(
      organizationEnrollmentRequestRefSchema.parse({
        organizationName: "  weblabs  ",
      }),
    ).toEqual({
      organizationName: "weblabs",
    });
  });

  it("rejects invalid organization enrollment identifiers", () => {
    expect(() =>
      organizationEnrollmentRequestRefSchema.parse({
        organizationName: "..",
      }),
    ).toThrow();
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
