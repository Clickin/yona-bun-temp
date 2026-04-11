import { describe, expect, it } from "vitest";
import {
  defaultLandingPathSchema,
  defaultLandingPreferenceInputSchema,
  defaultLandingPreferenceSchema,
} from "./default-landing";

describe("default landing contracts", () => {
  it("normalizes path inputs", () => {
    expect(defaultLandingPathSchema.parse("  /me  ")).toBe("/me");
    expect(
      defaultLandingPreferenceInputSchema.parse({
        path: "  /search?pageSize=20&scope=global  ",
      }),
    ).toEqual({
      path: "/search?pageSize=20&scope=global",
    });
  });

  it("accepts nullable stored preferences", () => {
    expect(
      defaultLandingPreferenceSchema.parse({
        path: null,
      }),
    ).toEqual({
      path: null,
    });
  });

  it("rejects empty or overlong values", () => {
    expect(() => defaultLandingPathSchema.parse("   ")).toThrow();
    expect(() => defaultLandingPathSchema.parse(`/${"a".repeat(255)}`)).toThrow();
  });
});
