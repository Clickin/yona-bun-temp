import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  projectReviewsQueryOptions,
  type ReviewThreadListQuery,
} from "../../../../api/pull-requests";
import { readProjectContainer } from "../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../app-view-models";
import { ProjectReviewsPage } from "../../../-pull-request-views";
import {
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/reviews")({
  component: ProjectReviewsRouteComponent,
});

function ProjectReviewsRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, currentSession, runtimeConfig, setErrorMessage } = useAppRuntime();
  const searchParams = new URLSearchParams(window.location.search);
  const query: ReviewThreadListQuery = {
    authorId: Number(searchParams.get("authorId") || "0"),
    filter: searchParams.get("filter") ?? "",
    orderBy: searchParams.get("orderBy") ?? "createdDate",
    orderDir: searchParams.get("orderDir") ?? "desc",
    pageNum: Number(searchParams.get("pageNum") || "1"),
    participantId: Number(searchParams.get("participantId") || "0"),
    state: searchParams.get("state") ?? "open",
  };
  const containerQuery = useQuery({
    queryFn: () => readProjectContainer(runtimeConfig, owner, projectName),
    queryKey: ["api", "v1", "owners", owner, "projects", projectName, "container"],
  });
  const reviewsQuery = useQuery(
    projectReviewsQueryOptions(runtimeConfig, {
      ...query,
      ownerName: owner,
      projectName,
    }),
  );
  const error = containerQuery.error ?? reviewsQuery.error;
  const failureKind = classifyConnectFailure(error);

  useDocumentTitle("Reviews");
  React.useEffect(() => {
    if (error && !classifyConnectFailure(error)) {
      setErrorMessage(error instanceof Error ? error.message : "Read reviews failed.");
    }
  }, [error, setErrorMessage]);

  if (bootstrapping || containerQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>Loading&hellip;</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={`/${owner}/${projectName}/reviews`} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={`/${owner}/${projectName}/reviews`} />;
  }

  return (
    <ProjectReviewsPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      query={query}
      reviews={reviewsQuery.data}
      runtimeConfig={runtimeConfig}
      viewerId={Number(currentSession?.actorId ?? 0)}
    />
  );
}
