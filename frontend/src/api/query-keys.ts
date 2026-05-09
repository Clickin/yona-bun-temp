export const apiQueryKeys = {
  all: ["api"] as const,
  v1: () => [...apiQueryKeys.all, "v1"] as const,
  project: {
    base: (ownerName: string, projectName: string) =>
      [...apiQueryKeys.v1(), "owners", ownerName, "projects", projectName] as const,
    issueReferences: (ownerName: string, projectName: string, input: { query: string }) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "issue-references",
        { query: input.query },
      ] as const,
    pullRequestChanges: (ownerName: string, projectName: string, pullRequestNumber: number) =>
      [
        ...apiQueryKeys.project.pullRequestDetail(ownerName, projectName, pullRequestNumber),
        "changes",
      ] as const,
    pullRequestDetail: (ownerName: string, projectName: string, pullRequestNumber: number) =>
      [
        ...apiQueryKeys.project.base(ownerName, projectName),
        "pull-requests",
        pullRequestNumber,
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
  },
  organization: {
    base: (organizationName: string) =>
      [...apiQueryKeys.v1(), "organizations", organizationName] as const,
    pullRequestList: (
      organizationName: string,
      input: { category: string; filter: string; pageNum: number },
    ) => [...apiQueryKeys.organization.base(organizationName), "pull-requests", input] as const,
  },
  notifications: {
    list: (input: { from: number; size: number }) =>
      [...apiQueryKeys.v1(), "notifications", { from: input.from, size: input.size }] as const,
  },
  session: () => [...apiQueryKeys.v1(), "session"] as const,
};
