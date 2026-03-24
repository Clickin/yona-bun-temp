import { createServerFn } from "@tanstack/react-start";
import { loadProtectedShellData } from "./protected-shell-data";

export const getPublicShellData = createServerFn({ method: "GET" }).handler(async () => {
  return {
    workstreams: ["projects", "groups", "search"] as const,
  };
});

export const getProtectedShellData = createServerFn({ method: "GET" }).handler(
  loadProtectedShellData,
);
