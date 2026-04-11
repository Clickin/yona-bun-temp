import { describe, expect, it } from "vitest";
import { ProjectReviewsIndexRoute } from "@app/routes/_app.$owner.$projectName.reviews.index";

describe("project reviews route parity", () => {
  it("registers the dedicated /reviews surface with loader and auth guard", () => {
    expect(ProjectReviewsIndexRoute.options.beforeLoad).toBeTypeOf("function");
    expect(ProjectReviewsIndexRoute.options.loader).toBeTypeOf("function");
  });
});
