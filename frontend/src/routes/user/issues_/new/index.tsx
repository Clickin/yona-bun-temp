import { createFileRoute } from "@tanstack/react-router";
import { DirectIssueFormRouteScreen } from "../../issues/-direct-issue-form-screen";

export const Route = createFileRoute("/user/issues_/new/")({
  component: UserDirectIssueFormRoute,
});

function UserDirectIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { commentId } = Route.useSearch();

  return <DirectIssueFormRouteScreen commentId={commentId} runtimeConfig={runtimeConfig} />;
}
