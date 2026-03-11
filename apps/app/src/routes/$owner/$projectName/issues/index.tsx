import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { createIssue, listIssues } from "@app/lib/issue";

export const Route = createFileRoute("/$owner/$projectName/issues/")({
  loader: ({ params }) =>
    listIssues({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectIssueListRouteComponent,
});

function ProjectIssueListRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const issues = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const [formState, setFormState] = React.useState({
    body: "",
    title: "",
  });

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          Issues - {params.owner}/{params.projectName}
        </strong>
        <p className="note">Create and track issues for this project.</p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createIssue({
                    data: {
                      body: formState.body.trim() ? formState.body : null,
                      ownerName: params.owner,
                      projectName: params.projectName,
                      title: formState.title,
                    },
                  });
                  await router.invalidate();
                  setFormState({ body: "", title: "" });
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Failed to create issue.",
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
              placeholder="Issue title"
              type="text"
              value={formState.title}
            />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea
              onChange={(event) =>
                setFormState((current) => ({ ...current, body: event.target.value }))
              }
              placeholder="Describe the issue"
              rows={5}
              value={formState.body}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating..." : "Create Issue"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>

      <article className="panel">
        <strong>Issue List</strong>
        {issues.length === 0 ? (
          <p className="note">No issues yet.</p>
        ) : (
          issues.map((issue) => (
            <p className="note" key={issue.issueNumber}>
              <Link
                className="link-text"
                params={{
                  issueNumber: String(issue.issueNumber),
                  owner: params.owner,
                  projectName: params.projectName,
                }}
                to="/$owner/$projectName/issues/$issueNumber"
              >
                #{issue.issueNumber} {issue.title}
              </Link>{" "}
              ({issue.state})
            </p>
          ))
        )}
      </article>
    </section>
  );
}
