import { describe, expect, it } from "vitest";
import { projectIssueReferencesQueryOptions } from "./api/issue-meta";
import {
  projectPullRequestListQueryOptions,
  pullRequestDetailQueryOptions,
} from "./api/pull-requests";
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

  it("includes all project pull-request list filters in the query key", () => {
    expect(
      apiQueryKeys.project.pullRequestList("owner", "projectYobi", {
        category: "sent",
        contributorId: 7,
        filter: "review",
        pageNum: 3,
      }),
    ).toEqual([
      "api",
      "v1",
      "owners",
      "owner",
      "projects",
      "projectYobi",
      "pull-requests",
      { category: "sent", contributorId: 7, filter: "review", pageNum: 3 },
    ]);
  });

  it("builds pull-request query options from the same project keys", () => {
    const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

    expect(
      projectPullRequestListQueryOptions(runtimeConfig, {
        category: "open",
        filter: "needle",
        ownerName: "owner",
        pageNum: 2,
        projectName: "projectYobi",
      }).queryKey,
    ).toEqual(
      apiQueryKeys.project.pullRequestList("owner", "projectYobi", {
        category: "open",
        contributorId: 0,
        filter: "needle",
        pageNum: 2,
      }),
    );
    expect(
      pullRequestDetailQueryOptions(runtimeConfig, {
        ownerName: "owner",
        projectName: "projectYobi",
        pullRequestNumber: 9,
      }).queryKey,
    ).toEqual(apiQueryKeys.project.pullRequestDetail("owner", "projectYobi", 9));
  });
});
