import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { createPullRequest, listPullRequests } from "@app/lib/pull-request";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/pulls/")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, pullRequests] = await Promise.all([
      readProjectDetail({ data: ref }),
      listPullRequests({ data: ref }),
    ]);

    return {
      project,
      pullRequests,
    };
  },
  component: ProjectPullRequestListRouteComponent,
});

function ProjectPullRequestListRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();
  const [formState, setFormState] = React.useState({
    body: "",
    fromBranch: "main",
    title: "",
    toBranch: "main",
  });

  return (
    <ProjectShell
      activeMenu="pulls"
      aside={
         <SidebarSection title={t("app.project.pullRequestForm")}>
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
                      error instanceof Error ? error.message : t("app.project.pullRequestCreateFailed"),
                    );
                  } finally {
                    setPending(false);
                  }
                })();
              });
            }}
          >
            <label className="field">
                <span>{t("app.project.pullRequestTitle")}</span>
              <input
                onChange={(event) =>
                  setFormState((current) => ({ ...current, title: event.target.value }))
                }
                  placeholder={t("app.project.pullRequestTitle")}
                type="text"
                value={formState.title}
              />
            </label>
            <label className="field">
                <span>{t("app.project.fromBranch")}</span>
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
                <span>{t("app.project.toBranch")}</span>
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
                <span>{t("project.description")}</span>
              <textarea
                onChange={(event) =>
                  setFormState((current) => ({ ...current, body: event.target.value }))
                }
                  placeholder={t("app.project.pullRequestBody")}
                rows={5}
                value={formState.body}
              />
            </label>
            <div className="action-row">
              <button className="cta" type="submit">
                  {pending ? t("app.project.creating") : t("app.project.createPullRequest")}
              </button>
            </div>
          </form>
          {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
        </SidebarSection>
      }
      project={data.project}
    >
      <ContentCard title={t("app.project.pullRequestList")}>
        {data.pullRequests.length === 0 ? (
          <p className="note">{t("title.no.results")}</p>
        ) : (
          data.pullRequests.map((pullRequest) => (
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
      </ContentCard>
    </ProjectShell>
  );
}
