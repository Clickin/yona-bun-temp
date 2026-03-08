import { queryOptions } from "@tanstack/react-query";
import type { AppAuthCaller } from "./auth-client";
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

export function currentSessionQueryOptions(authCaller: Pick<AppAuthCaller, "readCurrentSession">) {
  return queryOptions({
    queryKey: currentSessionQueryKey,
    queryFn: () => authCaller.readCurrentSession(),
  });
}
