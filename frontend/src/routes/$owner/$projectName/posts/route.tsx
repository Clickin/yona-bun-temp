import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  listProjectPostsQueryOptions,
  readProjectPostFormOptionsQueryOptions,
} from "../../../../api/boards";
import { readProjectContainerQueryOptions } from "../../../../api/org-project";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectBoardListPage } from "../../../-board-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/posts")({
  component: ProjectBoardsRouteComponent,
});

function readSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function ProjectBoardsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const navigate = useNavigate();
  useRouterState({ select: (state) => state.location.href });
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const searchParams = readSearchParams();
  const filter = searchParams.get("filter") ?? "";
  const labelIds = searchParams.getAll("labelIds").concat(searchParams.getAll("labelIds[]"));
  const orderBy = searchParams.get("orderBy") ?? "";
  const orderDir = searchParams.get("orderDir") ?? "";
  const detailQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });
  const formOptionsQuery = useQuery({
    ...readProjectPostFormOptionsQueryOptions(runtimeConfig, {
      ownerName: owner,
      projectName,
    }),
    enabled: !bootstrapping,
  });

  const postsQuery = useQuery({
    ...listProjectPostsQueryOptions(runtimeConfig, {
      filter,
      labelIds,
      orderBy,
      orderDir,
      ownerName: owner,
      pageNum: Number(searchParams.get("pageNum") || "1"),
      projectName,
    }),
    enabled: !bootstrapping,
  });

  useDocumentTitle("menu.board");

  React.useEffect(() => {
    const error = detailQuery.error ?? formOptionsQuery.error;
    if (!error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [detailQuery.error, formOptionsQuery.error]);

  React.useEffect(() => {
    if (!postsQuery.error) {
      return;
    }
    const nextFailureKind = classifyConnectFailure(postsQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [postsQuery.error]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/posts`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/posts`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/${owner}/${projectName}/posts`} />;
  }

  return (
    <ProjectBoardListPage
      canCreate={formOptionsQuery.data?.defaultPermissions.canCreate ?? false}
      detail={detailQuery.data ? toProjectContainerView(detailQuery.data) : null}
      filter={filter}
      labelIds={labelIds}
      labels={formOptionsQuery.data?.labels ?? []}
      messages={messages}
      onNavigate={(href) => {
        void navigate({ href });
      }}
      orderBy={orderBy}
      orderDir={orderDir}
      posts={postsQuery.data}
      renderShell={false}
      runtimeConfig={runtimeConfig}
    />
  );
}
