import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { queryOptions } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../backend/rpc";
import type { Issue } from "../../backend/issues";
import type { Viewer } from "./types";

export type { Viewer } from "./types";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers: () => {
        const csrf =
          typeof document === "undefined"
            ? undefined
            : /(?:^|;\s*)bunPortCsrf=([^;]+)/u.exec(document.cookie)?.[1];
        return csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {};
      },
    }),
  ],
});

export const issueListOptions = (viewer: Viewer) =>
  queryOptions({
    queryKey: ["issues", "list", viewer.userId, viewer.projectId] as const,
    queryFn: () => trpcClient.issue.list.query({ projectId: viewer.projectId, state: "open" }),
    staleTime: 30_000,
  });

export const issueOptions = (viewer: Viewer, id: string) =>
  queryOptions<Issue>({
    queryKey: ["issues", "detail", viewer.userId, viewer.projectId, id] as const,
    queryFn: () => trpcClient.issue.read.query({ projectId: viewer.projectId, id: BigInt(id) }),
    staleTime: 30_000,
  });
