import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { createPosting, listPostings } from "@app/lib/posting";

export const Route = createFileRoute("/$owner/$projectName/discussions/")({
  loader: ({ params }) =>
    listPostings({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectDiscussionListRouteComponent,
});

function ProjectDiscussionListRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const postings = Route.useLoaderData();
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
          Discussions - {params.owner}/{params.projectName}
        </strong>
        <p className="note">Create and track board discussions for this project.</p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);
            React.startTransition(() => {
              void (async () => {
                try {
                  await createPosting({
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
                    error instanceof Error ? error.message : "Failed to create discussion.",
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
              placeholder="Discussion title"
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
              placeholder="Write your discussion"
              rows={5}
              value={formState.body}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating..." : "Create Discussion"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>

      <article className="panel">
        <strong>Discussion List</strong>
        {postings.length === 0 ? (
          <p className="note">No discussions yet.</p>
        ) : (
          postings.map((posting) => (
            <p className="note" key={posting.postingNumber}>
              <Link
                className="link-text"
                params={{
                  owner: params.owner,
                  postNumber: String(posting.postingNumber),
                  projectName: params.projectName,
                }}
                to="/$owner/$projectName/discussions/$postNumber"
              >
                #{posting.postingNumber} {posting.title}
              </Link>
            </p>
          ))
        )}
      </article>
    </section>
  );
}
