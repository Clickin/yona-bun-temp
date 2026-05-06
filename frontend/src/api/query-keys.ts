export const apiQueryKeys = {
  all: ["api"] as const,
  v1: () => [...apiQueryKeys.all, "v1"] as const,
  session: () => [...apiQueryKeys.v1(), "session"] as const,
};
