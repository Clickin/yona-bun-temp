import { describe, expect, it } from "vitest";
import { projectIssueReferencesQueryOptions } from "./api/issue-meta";
import { apiQueryKeys } from "./api/query-keys";

describe("api query keys", () => {
  it("includes owner, project, and query in project issue-reference keys", () => {
    const key = apiQueryKeys.project.issueReferences("owner", "projectYobi", {
      query: "12",
    });

    expect(key).toEqual([
      "api",
      "v1",
      "owners",
      "owner",
      "projects",
      "projectYobi",
      "issue-references",
      { query: "12" },
    ]);
  });

  it("builds project issue-reference query options from the same key", () => {
    const options = projectIssueReferencesQueryOptions(
      { apiBaseUrl: "/yona/api", basePath: "/yona" },
      {
        ownerName: "owner",
        projectName: "projectYobi",
        query: "needle",
      },
    );

    expect(options.queryKey).toEqual(
      apiQueryKeys.project.issueReferences("owner", "projectYobi", {
        query: "needle",
      }),
    );
    expect(options.queryFn).toEqual(expect.any(Function));
  });
});
