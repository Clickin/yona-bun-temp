import { queryOptions } from "@tanstack/react-query";
import { readCurrentSession } from "./auth";
import { currentSessionQueryKey } from "./auth-shared";
import { getProtectedShellData, getPublicShellData } from "./shell-data";

export function publicShellQueryOptions() {
  return queryOptions({
    queryKey: ["app-shell", "public"],
    queryFn: () => getPublicShellData(),
  });
}

export function protectedShellQueryOptions() {
  return queryOptions({
    queryKey: ["app-shell", "protected"],
    queryFn: () => getProtectedShellData(),
  });
}

export function currentSessionQueryOptions() {
  return queryOptions({
    queryKey: currentSessionQueryKey,
    queryFn: () => readCurrentSession(),
  });
}
