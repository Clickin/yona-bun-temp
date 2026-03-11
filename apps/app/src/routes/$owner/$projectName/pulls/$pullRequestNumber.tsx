import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { readPullRequestDetail, updatePullRequestState } from "@app/lib/pull-request";

export const Route = createFileRoute("/$owner/$projectName/pulls/$pullRequestNumber")({
  loader: ({ params }) =>
    readPullRequestDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
        pullRequestNumber: Number.parseInt(params.pullRequestNumber, 10),
      },
    }),
  component: ProjectPullRequestDetailRouteComponent,
});

function nextState(currentState: "closed" | "merged" | "open"): "closed" | "open" {
  return currentState === "open" ? "closed" : "open";
}

function ProjectPullRequestDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const pullRequest = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          #{pullRequest.pullRequestNumber} {pullRequest.title}
        </strong>
        <p className="note">{pullRequest.body ?? "No description."}</p>
        <div className="badge-row">
          <span className="badge">state: {pullRequest.state}</span>
          <span className="badge">author: {pullRequest.contributorLoginId}</span>
          <span className="badge">
            {pullRequest.fromBranch} -&gt; {pullRequest.toBranch}
          </span>
        </div>
        <div className="action-row">
          <button
            className="cta"
            onClick={() => {
              setPending(true);
              setErrorMessage(null);
              React.startTransition(() => {
                void (async () => {
                  try {
                    await updatePullRequestState({
                      data: {
                        ownerName: params.owner,
                        projectName: params.projectName,
                        pullRequestNumber: pullRequest.pullRequestNumber,
                        state: nextState(pullRequest.state),
                      },
                    });
                    await router.invalidate();
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Failed to update pull request state.",
                    );
                  } finally {
                    setPending(false);
                  }
                })();
              });
            }}
            type="button"
          >
            {pending
              ? "Updating..."
              : pullRequest.state === "open"
                ? "Close Pull Request"
                : "Reopen Pull Request"}
          </button>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
