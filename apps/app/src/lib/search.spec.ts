import { describe, expect, it } from "vitest";
import { buildBoundedSearchInput, boundedSearchRouteSearchSchema } from "./search";

describe("search route helpers", () => {
  it("normalizes query-driven search params into a bounded global request", () => {
    const parsed = boundedSearchRouteSearchSchema.parse({
      pageSize: "5",
      query: "  alpha  ",
      scope: "global",
      types: "issue",
    });

    expect(parsed).toEqual({
      cursor: undefined,
      organizationName: undefined,
      ownerName: undefined,
      pageSize: 5,
      projectName: undefined,
      query: "alpha",
      scope: "global",
      types: ["issue"],
    });

    expect(buildBoundedSearchInput(parsed)).toEqual({
      pageSize: 5,
      query: "alpha",
      scope: "global",
      types: ["issue"],
    });
  });

  it("drops invalid route search noise back to the bounded defaults", () => {
    expect(
      boundedSearchRouteSearchSchema.parse({
        pageSize: "999",
        query: " alpha ",
        scope: "ai",
        types: ["issue_comment"],
      }),
    ).toEqual({
      cursor: undefined,
      organizationName: undefined,
      ownerName: undefined,
      pageSize: 20,
      projectName: undefined,
      query: "alpha",
      scope: "global",
      types: undefined,
    });
  });

  it("refuses to build scoped requests until the required scope identifiers exist", () => {
    expect(
      buildBoundedSearchInput(
        boundedSearchRouteSearchSchema.parse({
          pageSize: 10,
          query: "alpha",
          scope: "organization",
        }),
      ),
    ).toBeNull();

    expect(
      buildBoundedSearchInput(
        boundedSearchRouteSearchSchema.parse({
          ownerName: "yona",
          pageSize: 10,
          query: "alpha",
          scope: "project",
        }),
      ),
    ).toBeNull();
  });
});
