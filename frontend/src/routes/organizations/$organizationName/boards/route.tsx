import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listOrganizationBoardsQueryOptions } from "../../../../api/boards";
import { useAppRuntime } from "../../../../app-runtime-context";
import { OrganizationBoardListPage } from "../../../-board-views";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/organizations/$organizationName/boards")({
  component: OrganizationBoardsRouteComponent,
});

function readSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }
  return new URLSearchParams(window.location.search);
}

function OrganizationBoardsRouteComponent() {
  const { organizationName } = Route.useParams();
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);
  const searchParams = readSearchParams();
  const filter = searchParams.get("filter") ?? "";
  const orderBy = searchParams.get("orderBy") ?? "";
  const orderDir = searchParams.get("orderDir") ?? "";
  const projectNames = searchParams
    .getAll("projectNames")
    .concat(searchParams.getAll("projectNames[]"))
    .filter(Boolean);
  const boardsQuery = useQuery({
    ...listOrganizationBoardsQueryOptions(runtimeConfig, {
      filter,
      orderBy,
      orderDir,
      organizationName,
      pageNum: Number(searchParams.get("pageNum") || "1"),
      projectNames,
    }),
    enabled: !bootstrapping,
  });

  useDocumentTitle("menu.board");

  React.useEffect(() => {
    if (!boardsQuery.error) {
      setFailureKind(null);
      return;
    }
    const nextFailureKind = classifyConnectFailure(boardsQuery.error);
    if (nextFailureKind) {
      setFailureKind(nextFailureKind);
      return;
    }
    setFailureKind("bad-request");
  }, [boardsQuery.error]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>common.loading</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/organizations/${organizationName}/boards`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/organizations/${organizationName}/boards`} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={`/organizations/${organizationName}/boards`} />;
  }

  return (
    <OrganizationBoardListPage
      boards={boardsQuery.data}
      filter={filter}
      messages={messages}
      organizationName={organizationName}
      orderBy={orderBy}
      orderDir={orderDir}
      projectNames={projectNames}
      runtimeConfig={runtimeConfig}
    />
  );
}
