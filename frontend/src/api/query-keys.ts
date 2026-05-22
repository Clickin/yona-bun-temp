export const apiQueryKeys = {
  all: ["api"] as const,
  v1: () => [...apiQueryKeys.all, "v1"] as const,
  project: {
    base: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.v1(), "owners", ownerName, "projects", projectName] as const,
    container: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "container"] as const,
    codeBranches: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "branches"] as const,
    commitDetail: (
      ownerName: string,
      projectName: string,
      commitId: string,
      input: { branch: string; path: string },
    ) => [...apiQueryKeys.project.base(ownerName, projectName), "commit", commitId, input] as const,
    issueReferences: (ownerName: string, projectName: string, input: { query: string }) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "issue-references",
        { query: input.query },
      ] as const,
    pullRequestChanges: (
      ownerName: string,
      projectName: string,
      pullRequestNumber: number,
      input: { commitId?: string } = {},
    ) =>
      [
        ...apiQueryKeys.project.pullRequestDetail(ownerName, projectName, pullRequestNumber),
        "changes",
        { commitId: input.commitId ?? "" },
      ] as const,
    pullRequestDetail: (ownerName: string, projectName: string, pullRequestNumber: number) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "pull-requests",
        pullRequestNumber,
      ] as const,
    pullRequestCreateFormOptions: (
      ownerName: string,
      projectName: string,
      input: {
        fromBranch: string;
        fromProjectId: number;
        toBranch: string;
        toProjectId: number;
      },
    ) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "pull-requests",
        "form-options",
        input,
      ] as const,
    pullRequestEditFormOptions: (
      ownerName: string,
      projectName: string,
      pullRequestNumber: number,
    ) =>
      [
        ...apiQueryKeys.project.pullRequestDetail(ownerName, projectName, pullRequestNumber),
        "form-options",
      ] as const,
    pullRequestList: (
      ownerName: string,
      projectName: string,
      input: { category: string; contributorId: number; filter: string; pageNum: number },
    ) => [...apiQueryKeys.project.base(ownerName, projectName), "pull-requests", input] as const,
    reviewList: (
      ownerName: string,
      projectName: string,
      input: {
        authorId: number;
        filter: string;
        orderBy: string;
        orderDir: string;
        pageNum: number;
        participantId: number;
        state: string;
      },
    ) => [...apiQueryKeys.project.base(ownerName, projectName), "reviews", input] as const,
    labels: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "labels"] as const,
    members: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "members"] as const,
    changeVcs: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "change-vcs"] as const,
    forkOptions: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "fork-options"] as const,
    transfer: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "transfer"] as const,
    webhooks: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "webhooks"] as const,
    watchers: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "watchers"] as const,
    postFormOptions: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "posts", "form-options"] as const,
    post: (ownerName: string, projectName: string, postNumber: number | string) =>
      [...apiQueryKeys.project.base(ownerName, projectName), "posts", String(postNumber)] as const,
    posts: (
      ownerName: string,
      projectName: string,
      input: {
        filter: string;
        labelIds: number[];
        orderBy: string;
        orderDir: string;
        pageNum: number;
      },
    ) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "posts",
        {
          filter: input.filter,
          labelIds: input.labelIds,
          orderBy: input.orderBy,
          orderDir: input.orderDir,
          pageNum: input.pageNum,
        },
      ] as const,
  },
  organization: {
    base: (organizationName: string) =>
      [...apiQueryKeys.v1(), "organizations", organizationName] as const,
    pullRequestList: (
      organizationName: string,
      input: { category: string; filter: string; pageNum: number },
    ) => [...apiQueryKeys.organization.base(organizationName), "pull-requests", input] as const,
    boards: (
      organizationName: string,
      input: {
        filter: string;
        orderBy: string;
        orderDir: string;
        pageNum: number;
        projectNames: string[];
      },
    ) =>
      [
        ...apiQueryKeys.organization.base(organizationName),
        "boards",
        {
          filter: input.filter,
          orderBy: input.orderBy,
          orderDir: input.orderDir,
          pageNum: input.pageNum,
          projectNames: input.projectNames,
        },
      ] as const,
  },
  notifications: {
    list: (input: { from: number; size: number }) =>
      [...apiQueryKeys.v1(), "notifications", { from: input.from, size: input.size }] as const,
  },
  search: {
    all: () => [...apiQueryKeys.v1(), "search"] as const,
    global: (input: { keyword: string; pageNum: number; searchType: string }) =>
      [...apiQueryKeys.search.all(), "global", input] as const,
    organization: (
      organizationName: string,
      input: { keyword: string; pageNum: number; searchType: string },
    ) => [...apiQueryKeys.organization.base(organizationName), "search", input] as const,
    project: (
      ownerName: string,
      projectName: string,
      input: { keyword: string; pageNum: number; searchType: string },
    ) => [...apiQueryKeys.project.base(ownerName, projectName), "search", input] as const,
  },
  session: () => [...apiQueryKeys.v1(), "session"] as const,
  siteAdmin: {
    diagnostics: () => [...apiQueryKeys.v1(), "site", "diagnostics"] as const,
    issuesBase: () => [...apiQueryKeys.v1(), "site", "issues"] as const,
    issues: (input: { page: number; state: string }) =>
      [...apiQueryKeys.siteAdmin.issuesBase(), input] as const,
    mail: () => [...apiQueryKeys.v1(), "site", "mail"] as const,
    postsBase: () => [...apiQueryKeys.v1(), "site", "posts"] as const,
    posts: (input: { page: number }) => [...apiQueryKeys.siteAdmin.postsBase(), input] as const,
    projectsBase: () => [...apiQueryKeys.v1(), "site", "projects"] as const,
    projects: (input: { filter: string; page: number }) =>
      [...apiQueryKeys.siteAdmin.projectsBase(), input] as const,
    usersBase: () => [...apiQueryKeys.v1(), "site", "users"] as const,
    users: (input: { page: number; query: string; state: string }) =>
      [...apiQueryKeys.siteAdmin.usersBase(), input] as const,
  },
  user: {
    profile: (loginId: string, input: { daysAgo: number | null; selected: string | null }) =>
      [...apiQueryKeys.v1(), "users", loginId, "profile", input] as const,
    statistics: (loginId: string) =>
      [...apiQueryKeys.v1(), "users", loginId, "statistics"] as const,
  },
};
