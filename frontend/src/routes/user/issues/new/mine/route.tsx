import { createFileRoute } from "@tanstack/react-router";
import { DirectIssueCreateFormRouteComponent } from "../route";

export const Route = createFileRoute("/user/issues/new/mine")({
  component: DirectMyIssueCreateRouteComponent,
});

function DirectMyIssueCreateRouteComponent() {
  return <DirectIssueCreateFormRouteComponent mine={true} routeHref="/user/issues/new/mine" />;
}
