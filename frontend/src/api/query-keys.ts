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
  },
  notifications: {
    list: (input: { from: number; size: number }) =>
      [...apiQueryKeys.v1(), "notifications", { from: input.from, size: input.size }] as const,
  },
  session: () => [...apiQueryKeys.v1(), "session"] as const,
};
