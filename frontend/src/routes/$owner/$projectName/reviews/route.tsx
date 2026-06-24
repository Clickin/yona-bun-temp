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
  BadRequestPage,
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
  const { bootstrapping, currentSession, messages, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/reviews`;
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

  useDocumentTitle(`${projectName} - ${messages("menu.review", { fallback: "menu.review" })}`);

  if (bootstrapping || containerQuery.isLoading || reviewsQuery.isLoading) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (error) {
    return <BadRequestPage href={routeHref} />;
  }

  return (
    <ProjectReviewsPage
      detail={containerQuery.data ? toProjectContainerView(containerQuery.data) : null}
      messages={messages}
      query={query}
      reviews={reviewsQuery.data}
      runtimeConfig={runtimeConfig}
      viewerId={Number(currentSession?.actorId ?? 0)}
    />
  );
}
