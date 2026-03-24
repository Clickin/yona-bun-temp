import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { createIssueComment, readIssueDetail, updateIssueState } from "@app/lib/issue";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/issues/$issueNumber")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, issue] = await Promise.all([
      readProjectDetail({ data: ref }),
      readIssueDetail({
        data: {
          issueNumber: Number.parseInt(params.issueNumber, 10),
          ...ref,
        },
      }),
    ]);

    return {
      issue,
      project,
    };
  },
  component: ProjectIssueDetailRouteComponent,
});

function ProjectIssueDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const issue = data.issue;
  const [pending, setPending] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();

  return (
    <ProjectShell
      activeMenu="issues"
      aside={
        <>
          <SidebarSection title={t("app.project.issueInfo")}>
            <p className="sidebar-kv">{t("app.search.scopeBadge", issue.state)}</p>
            <p className="sidebar-kv">{t("app.settings.loginId", issue.authorLoginId)}</p>
          </SidebarSection>
          <SidebarSection title={t("app.project.actions")}>
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
                          setErrorMessage(error instanceof Error ? error.message : t("app.project.issueUpdateFailed"));
                      } finally {
                        setPending(false);
                      }
                    })();
                  });
                }}
                type="button"
              >
                {pending ? t("app.project.updating") : issue.state === "open" ? t("app.project.closeIssue") : t("app.project.reopenIssue")}
              </button>
            </div>
          </SidebarSection>
        </>
      }
      project={data.project}
    >
      <ContentCard title={`#${issue.issueNumber} ${issue.title}`}>
        <p className="note">{issue.body ?? t("app.project.noDescription")}</p>
        <div className="badge-row">
          <span className="badge">{t("app.project.stateBadge", issue.state)}</span>
          <span className="badge">{t("app.project.authorBadge", issue.authorLoginId)}</span>
        </div>
      </ContentCard>
      <ContentCard title={t("app.project.comments")}>
        {issue.comments.length === 0 ? (
          <p className="note">{t("app.project.noComments")}</p>
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
                    error instanceof Error ? error.message : t("app.project.commentCreateFailed"),
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
