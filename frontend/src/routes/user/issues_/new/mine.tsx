import { createFileRoute } from "@tanstack/react-router";
import { DirectIssueFormRouteScreen } from "../../issues/-direct-issue-form-screen";

export const Route = createFileRoute("/user/issues_/new/mine")({
  component: UserDirectMineIssueFormRoute,
});

function UserDirectMineIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <DirectIssueFormRouteScreen mine={true} runtimeConfig={runtimeConfig} />;
}
