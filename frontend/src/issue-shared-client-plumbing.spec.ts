import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("issue shared client plumbing", () => {
  it("keeps project issue routes wired through issue client helpers", () => {
    const issueListRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issues/route.tsx"),
      "utf8",
    );
    const issueDetailRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/issue/$issueNumber/route.tsx"),
      "utf8",
    );
    const viewModelSource = fs.readFileSync(path.resolve(__dirname, "app-view-models.ts"), "utf8");

    expect(issueListRouteSource).toContain("listProjectIssues");
    expect(issueListRouteSource).toContain("toProjectIssueListView");
    expect(issueDetailRouteSource).toContain("readIssueDetail");
    expect(issueDetailRouteSource).toContain("toProjectIssueDetailView");
    expect(viewModelSource).toContain("toProjectIssueListView");
    expect(viewModelSource).toContain("toProjectIssueDetailView");
  });
});
