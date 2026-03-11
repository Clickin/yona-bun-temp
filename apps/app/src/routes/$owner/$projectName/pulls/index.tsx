import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { createPullRequest, listPullRequests } from "@app/lib/pull-request";

export const Route = createFileRoute("/$owner/$projectName/pulls/")({
  loader: ({ params }) =>
    listPullRequests({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectPullRequestListRouteComponent,
});

function ProjectPullRequestListRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const pullRequests = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const [formState, setFormState] = React.useState({
    body: "",
    fromBranch: "main",
    title: "",
    toBranch: "main",
  });

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          Pull Requests - {params.owner}/{params.projectName}
        </strong>
        <p className="note">Open a pull request and track its lifecycle.</p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createPullRequest({
                    data: {
                      body: formState.body.trim() ? formState.body : null,
                      fromBranch: formState.fromBranch,
                      ownerName: params.owner,
                      projectName: params.projectName,
                      title: formState.title,
                      toBranch: formState.toBranch,
                    },
                  });
                  await router.invalidate();
                  setFormState({ body: "", fromBranch: "main", title: "", toBranch: "main" });
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Failed to create pull request.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Title</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Pull request title"
              type="text"
              value={formState.title}
            />
          </label>
          <label className="field">
            <span>From branch</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, fromBranch: event.target.value }))
              }
              placeholder="feature/my-change"
              type="text"
              value={formState.fromBranch}
            />
          </label>
          <label className="field">
            <span>To branch</span>
            <input
              onChange={(event) =>
                setFormState((current) => ({ ...current, toBranch: event.target.value }))
              }
              placeholder="main"
              type="text"
              value={formState.toBranch}
            />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea
              onChange={(event) =>
                setFormState((current) => ({ ...current, body: event.target.value }))
              }
              placeholder="What changed and why"
              rows={5}
              value={formState.body}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating..." : "Create Pull Request"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>

      <article className="panel">
        <strong>Pull Request List</strong>
        {pullRequests.length === 0 ? (
          <p className="note">No pull requests yet.</p>
        ) : (
          pullRequests.map((pullRequest) => (
            <p className="note" key={pullRequest.pullRequestNumber}>
              <Link
                className="link-text"
                params={{
                  owner: params.owner,
                  projectName: params.projectName,
                  pullRequestNumber: String(pullRequest.pullRequestNumber),
                }}
                to="/$owner/$projectName/pulls/$pullRequestNumber"
              >
                #{pullRequest.pullRequestNumber} {pullRequest.title}
              </Link>{" "}
              ({pullRequest.state})
            </p>
          ))
        )}
      </article>
    </section>
  );
}
