import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createIssueComment, readIssueDetail, updateIssueState } from "@app/lib/issue";

export const Route = createFileRoute("/$owner/$projectName/issues/$issueNumber")({
  loader: ({ params }) =>
    readIssueDetail({
      data: {
        issueNumber: Number.parseInt(params.issueNumber, 10),
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectIssueDetailRouteComponent,
});

function ProjectIssueDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const issue = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          #{issue.issueNumber} {issue.title}
        </strong>
        <p className="note">{issue.body ?? "No description."}</p>
        <div className="badge-row">
          <span className="badge">state: {issue.state}</span>
          <span className="badge">author: {issue.authorLoginId}</span>
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
                    await updateIssueState({
                      data: {
                        issueNumber: issue.issueNumber,
                        ownerName: params.owner,
                        projectName: params.projectName,
                        state: issue.state === "open" ? "closed" : "open",
                      },
                    });
                    await router.invalidate();
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error ? error.message : "Failed to update issue.",
                    );
                  } finally {
                    setPending(false);
                  }
                })();
              });
            }}
            type="button"
          >
            {pending ? "Updating..." : issue.state === "open" ? "Close Issue" : "Reopen Issue"}
          </button>
        </div>
      </article>
      <article className="panel">
        <strong>Comments</strong>
        {issue.comments.length === 0 ? (
          <p className="note">No comments yet.</p>
        ) : (
          issue.comments.map((entry) => (
            <p className="note" key={entry.commentId}>
              <strong>{entry.authorLoginId}</strong>: {entry.contents}
            </p>
          ))
        )}
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createIssueComment({
                    data: {
                      contents: comment,
                      issueNumber: issue.issueNumber,
                      ownerName: params.owner,
                      projectName: params.projectName,
                    },
                  });
                  setComment("");
                  await router.invalidate();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Failed to add comment.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Comment</span>
            <textarea
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              value={comment}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Saving..." : "Add Comment"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
