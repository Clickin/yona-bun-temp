import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/issue/$issueNumber")({
  component: IssueDetailRouteComponent,
});

function IssueDetailRouteComponent() {
  const { owner, projectName, issueNumber } = Route.useParams();
  return <PlaceholderPage href={`/${owner}/${projectName}/issue/${issueNumber}`} title="Issue" />;
}
