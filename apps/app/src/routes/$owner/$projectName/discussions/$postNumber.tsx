import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createPostingComment, readPostingDetail } from "@app/lib/posting";

export const Route = createFileRoute("/$owner/$projectName/discussions/$postNumber")({
  loader: ({ params }) =>
    readPostingDetail({
      data: {
        ownerName: params.owner,
        postingNumber: Number.parseInt(params.postNumber, 10),
        projectName: params.projectName,
      },
    }),
  component: ProjectDiscussionDetailRouteComponent,
});

function ProjectDiscussionDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const posting = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          #{posting.postingNumber} {posting.title}
        </strong>
        <p className="note">{posting.body ?? "No body."}</p>
      </article>

      <article className="panel">
        <strong>Comments</strong>
        {posting.comments.length === 0 ? (
          <p className="note">No comments yet.</p>
        ) : (
          posting.comments.map((entry) => (
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
                  await createPostingComment({
                    data: {
                      contents: comment,
                      ownerName: params.owner,
                      postingNumber: posting.postingNumber,
                      projectName: params.projectName,
                    },
                  });
                  setComment("");
                  await router.invalidate();
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Failed to add discussion comment.",
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
