import { describe, expect, it } from "vitest";
import {
  organizationCreateInputSchema,
  organizationDetailSchema,
  organizationNameSchema,
  organizationSummarySchema,
  organizationUpdateInputSchema,
} from "./org";

describe("organization contracts", () => {
  it("keeps the legacy organization-name validation pattern", () => {
    for (const value of ["foo", "foo.bar", "foo_bar", "-foo", "foo-"]) {
      expect(organizationNameSchema.parse(value)).toBe(value);
    }

    for (const value of [".foo", "foo.", "_foo", "foo_", "foo bar"]) {
      expect(organizationNameSchema.safeParse(value).success).toBe(false);
    }
  });

  it("normalizes create and update inputs", () => {
    expect(
      organizationCreateInputSchema.parse({
        description: "  weblab < labs  ",
        organizationName: "  weblabs  ",
      }),
    ).toEqual({
      description: "weblab < labs",
      organizationName: "weblabs",
    });

    expect(
      organizationUpdateInputSchema.parse({
        currentOrganizationName: "  labs  ",
        description: "   ",
        organizationName: "  weblabs  ",
      }),
    ).toEqual({
      currentOrganizationName: "labs",
      description: null,
      organizationName: "weblabs",
    });
  });

  it("parses summary and detail DTOs with public identifiers only", () => {
    expect(
      organizationSummarySchema.parse({
        description: "group description",
        organizationName: "weblabs",
      }),
    ).toEqual({
      description: "group description",
      organizationName: "weblabs",
    });

    expect(
      organizationDetailSchema.parse({
        description: "group description",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      }),
    ).toEqual({
      description: "group description",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
  });
});
