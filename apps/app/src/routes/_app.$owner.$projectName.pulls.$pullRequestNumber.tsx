import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { readPullRequestDetail, updatePullRequestState } from "@app/lib/pull-request";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/pulls/$pullRequestNumber")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, pullRequest] = await Promise.all([
      readProjectDetail({ data: ref }),
      readPullRequestDetail({
        data: {
          ownerName: params.owner,
          projectName: params.projectName,
          pullRequestNumber: Number.parseInt(params.pullRequestNumber, 10),
        },
      }),
    ]);

    return {
      project,
      pullRequest,
    };
  },
  component: ProjectPullRequestDetailRouteComponent,
});

function nextState(currentState: "closed" | "merged" | "open"): "closed" | "open" {
  return currentState === "open" ? "closed" : "open";
}

function ProjectPullRequestDetailRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const pullRequest = data.pullRequest;
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();

  return (
    <ProjectShell
      activeMenu="pulls"
      aside={
        <>
          <SidebarSection title={t("app.project.pullRequestInfo")}>
            <p className="sidebar-kv">{t("app.search.scopeBadge", pullRequest.state)}</p>
            <p className="sidebar-kv">{t("app.settings.loginId", pullRequest.contributorLoginId)}</p>
            <p className="sidebar-kv">
              {pullRequest.fromBranch} -&gt; {pullRequest.toBranch}
            </p>
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
                            : t("app.project.pullRequestStateFailed"),
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
                  ? t("app.project.updating")
                  : pullRequest.state === "open"
                    ? t("app.project.closePullRequest")
                    : t("app.project.reopenPullRequest")}
              </button>
            </div>
          </SidebarSection>
        </>
      }
      project={data.project}
    >
      <ContentCard title={`#${pullRequest.pullRequestNumber} ${pullRequest.title}`}>
        <p className="note">{pullRequest.body ?? t("app.project.noDescription")}</p>
        <div className="badge-row">
          <span className="badge">{t("app.project.stateBadge", pullRequest.state)}</span>
          <span className="badge">{t("app.project.authorBadge", pullRequest.contributorLoginId)}</span>
          <span className="badge">
            {pullRequest.fromBranch} -&gt; {pullRequest.toBranch}
          </span>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </ContentCard>
    </ProjectShell>
  );
}
