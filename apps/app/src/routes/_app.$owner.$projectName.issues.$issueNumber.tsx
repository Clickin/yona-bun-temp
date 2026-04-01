import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import {
  assignIssue,
  createIssueComment,
  readIssueDetail,
  unassignIssue,
  unvoteIssue,
  updateIssueState,
  unwatchIssue,
  voteIssue,
  watchIssue,
} from "@app/lib/issue";
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
  const [assigneeLoginId, setAssigneeLoginId] = React.useState(issue.assignee?.loginId ?? "");
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();

  React.useEffect(() => {
    setAssigneeLoginId(issue.assignee?.loginId ?? "");
  }, [issue.assignee?.loginId]);

  const runMutation = (action: () => Promise<unknown>, fallbackKey: Parameters<typeof t>[0]) => {
    setPending(true);
    setErrorMessage(null);
    React.startTransition(() => {
      void (async () => {
        try {
          await action();
          await router.invalidate();
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : t(fallbackKey));
        } finally {
          setPending(false);
        }
      })();
    });
  };

  return (
    <ProjectShell
      activeMenu="issues"
      aside={
        <>
          <SidebarSection title={t("app.project.issueInfo")}>
            <p className="sidebar-kv">{t("app.search.scopeBadge", issue.state)}</p>
            <p className="sidebar-kv">{t("app.settings.loginId", issue.authorLoginId)}</p>
            <p className="sidebar-kv">
              {t(
                "app.project.assigneeBadge",
                issue.assignee?.loginId ?? t("app.project.noAssignee"),
              )}
            </p>
            <p className="sidebar-kv">{t("app.project.issueWatcherCount", issue.watcherCount)}</p>
            <p className="sidebar-kv">{t("app.project.issueVoterCount", issue.voterCount)}</p>
          </SidebarSection>
          <SidebarSection title={t("app.project.actions")}>
            <div className="action-row">
              <button
                className="cta"
                onClick={() =>
                  runMutation(
                    () =>
                      updateIssueState({
                        data: {
                          issueNumber: issue.issueNumber,
                          ownerName: params.owner,
                          projectName: params.projectName,
                          state: issue.state === "open" ? "closed" : "open",
                        },
                      }),
                    "app.project.issueUpdateFailed",
                  )
                }
                type="button"
              >
                {pending
                  ? t("app.project.updating")
                  : issue.state === "open"
                    ? t("app.project.closeIssue")
                    : t("app.project.reopenIssue")}
              </button>
            </div>
            <div className="action-row">
              <button
                className="cta"
                onClick={() =>
                  runMutation(
                    () =>
                      issue.isWatching
                        ? unwatchIssue({
                            data: {
                              issueNumber: issue.issueNumber,
                              ownerName: params.owner,
                              projectName: params.projectName,
                            },
                          })
                        : watchIssue({
                            data: {
                              issueNumber: issue.issueNumber,
                              ownerName: params.owner,
                              projectName: params.projectName,
                            },
                          }),
                    "app.project.issueParticipationFailed",
                  )
                }
                type="button"
              >
                {pending
                  ? t("app.project.updating")
                  : issue.isWatching
                    ? t("app.project.unwatchIssue")
                    : t("app.project.watchIssue")}
              </button>
            </div>
            <div className="action-row">
              <button
                className="cta"
                onClick={() =>
                  runMutation(
                    () =>
                      issue.hasVoted
                        ? unvoteIssue({
                            data: {
                              issueNumber: issue.issueNumber,
                              ownerName: params.owner,
                              projectName: params.projectName,
                            },
                          })
                        : voteIssue({
                            data: {
                              issueNumber: issue.issueNumber,
                              ownerName: params.owner,
                              projectName: params.projectName,
                            },
                          }),
                    "app.project.issueParticipationFailed",
                  )
                }
                type="button"
              >
                {pending
                  ? t("app.project.updating")
                  : issue.hasVoted
                    ? t("app.project.unvoteIssue")
                    : t("app.project.voteIssue")}
              </button>
            </div>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                const nextAssigneeLoginId = assigneeLoginId.trim();
                if (nextAssigneeLoginId.length === 0) {
                  setErrorMessage(t("app.project.issueParticipationFailed"));
                  return;
                }

                runMutation(
                  () =>
                    assignIssue({
                      data: {
                        assigneeLoginId: nextAssigneeLoginId,
                        issueNumber: issue.issueNumber,
                        ownerName: params.owner,
                        projectName: params.projectName,
                      },
                    }),
                  "app.project.issueParticipationFailed",
                );
              }}
            >
              <label className="field">
                <span>{t("app.project.issueAssigneeInput")}</span>
                <input
                  onChange={(event) => setAssigneeLoginId(event.target.value)}
                  placeholder={t("app.project.issueAssigneeInput")}
                  type="text"
                  value={assigneeLoginId}
                />
              </label>
              <div className="action-row">
                <button className="cta" type="submit">
                  {pending ? t("app.project.updating") : t("app.project.assignIssue")}
                </button>
              </div>
            </form>
            {issue.assignee ? (
              <div className="action-row">
                <button
                  className="cta"
                  onClick={() =>
                    runMutation(
                      () =>
                        unassignIssue({
                          data: {
                            issueNumber: issue.issueNumber,
                            ownerName: params.owner,
                            projectName: params.projectName,
                          },
                        }),
                      "app.project.issueParticipationFailed",
                    )
                  }
                  type="button"
                >
                  {pending ? t("app.project.updating") : t("app.project.unassignIssue")}
                </button>
              </div>
            ) : null}
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
          <span className="badge">
            {t("app.project.assigneeBadge", issue.assignee?.loginId ?? t("app.project.noAssignee"))}
          </span>
          <span className="badge">{t("app.project.issueWatcherCount", issue.watcherCount)}</span>
          <span className="badge">{t("app.project.issueVoterCount", issue.voterCount)}</span>
        </div>
      </ContentCard>
      <ContentCard title={t("app.project.timeline")}>
        {issue.timeline.length === 0 ? (
          <p className="note">{t("app.project.noTimeline")}</p>
        ) : (
          issue.timeline.map((entry) => (
            <p
              className="note"
              key={
                entry.kind === "comment" ? `comment-${entry.commentId}` : `event-${entry.eventId}`
              }
            >
              {entry.kind === "comment" ? (
                <>
                  <strong>{entry.authorLoginId}</strong>: {entry.contents}
                </>
              ) : (
                <>
                  <strong>{entry.eventType}</strong>
                  {entry.oldValue || entry.newValue
                    ? ` ${entry.oldValue ?? "-"} -> ${entry.newValue ?? "-"}`
                    : ""}
                  {entry.senderLoginId ? ` (${entry.senderLoginId})` : ""}
                </>
              )}
            </p>
          ))
        )}
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
            runMutation(async () => {
              await createIssueComment({
                data: {
                  contents: comment,
                  issueNumber: issue.issueNumber,
                  ownerName: params.owner,
                  projectName: params.projectName,
                },
              });
              setComment("");
            }, "app.project.commentCreateFailed");
          }}
        >
          <label className="field">
            <span>{t("app.project.comment")}</span>
            <textarea
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              value={comment}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? t("app.settings.saving") : t("app.project.addComment")}
            </button>
          </div>
        </form>
      </ContentCard>
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
    </ProjectShell>
  );
}
