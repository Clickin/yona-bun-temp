import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../../../-shared";

export const Route = createFileRoute("/$owner/$projectName/newPullRequestForm")({
  component: NewPullRequestFormRouteComponent,
});

function NewPullRequestFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  return (
    <PlaceholderPage href={`/${owner}/${projectName}/newPullRequestForm`} title="Pull Request" />
  );
}
