import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { createPostingComment, readPostingDetail } from "@app/lib/posting";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/discussions/$postNumber")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, posting] = await Promise.all([
      readProjectDetail({ data: ref }),
      readPostingDetail({
        data: {
          ownerName: params.owner,
          postingNumber: Number.parseInt(params.postNumber, 10),
          projectName: params.projectName,
        },
      }),
    ]);

    return {
      posting,
      project,
    };
  },
  component: ProjectDiscussionDetailRouteComponent,
});

function ProjectDiscussionDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const posting = data.posting;
  const [pending, setPending] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();

  return (
    <ProjectShell
      activeMenu="discussions"
      aside={
         <SidebarSection title={t("app.project.postInfo")}>
           <p className="sidebar-kv">#{posting.postingNumber}</p>
           <p className="sidebar-kv">{t("app.project.comments")}: {posting.comments.length}</p>
         </SidebarSection>
      }
      project={data.project}
    >
      <ContentCard title={`#${posting.postingNumber} ${posting.title}`}>
        <p className="note">{posting.body ?? t("app.project.noBody")}</p>
      </ContentCard>

      <ContentCard title={t("app.project.comments")}>
        {posting.comments.length === 0 ? (
          <p className="note">{t("app.project.noComments")}</p>
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
                      error instanceof Error ? error.message : t("app.project.discussionCommentCreateFailed"),
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("app.project.comment")}</span>
            <textarea onChange={(event) => setComment(event.target.value)} rows={4} value={comment} />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? t("app.settings.saving") : t("app.project.addComment")}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </ContentCard>
    </ProjectShell>
  );
}
