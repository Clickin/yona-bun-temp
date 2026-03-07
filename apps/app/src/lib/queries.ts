import { queryOptions } from "@tanstack/react-query";
import { getProtectedShellData, getPublicShellData, readDemoSession } from "./shell-data";

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

export function demoSessionQueryOptions() {
  return queryOptions({
    queryKey: ["app-shell", "session"],
    queryFn: () => readDemoSession(),
  });
}
