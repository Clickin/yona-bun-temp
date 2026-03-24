import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { createIssue, listIssues } from "@app/lib/issue";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/issues/")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, issues] = await Promise.all([
      readProjectDetail({ data: ref }),
      listIssues({ data: ref }),
    ]);

    return {
      issues,
      project,
    };
  },
  component: ProjectIssueListRouteComponent,
});

function ProjectIssueListRouteComponent() {
  const router = useRouter();
  const params = Route.useParams();
  const data = Route.useLoaderData();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<null | string>(null);
  const t = useTranslate();
  const [formState, setFormState] = React.useState({
    body: "",
    title: "",
  });

  return (
    <ProjectShell
      activeMenu="issues"
      aside={
        <>
          <SidebarSection title={t("app.project.newIssue")}>
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
                        error instanceof Error ? error.message : t("app.project.issueCreateFailed"),
                      );
                    } finally {
                      setPending(false);
                    }
                  })();
                });
              }}
            >
              <label className="field">
                <span>{t("app.project.issueTitle")}</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder={t("app.project.issueTitle")}
                  type="text"
                  value={formState.title}
                />
              </label>
              <label className="field">
                <span>{t("project.description")}</span>
                <textarea
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, body: event.target.value }))
                  }
                  placeholder={t("app.project.issueBody")}
                  rows={5}
                  value={formState.body}
                />
              </label>
              <div className="action-row">
                <button className="cta" type="submit">
                  {pending ? t("app.project.creating") : t("app.project.createIssue")}
                </button>
              </div>
            </form>
            {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
          </SidebarSection>
        </>
      }
      project={data.project}
    >
      <ContentCard title={t("app.project.issueList")}>
        {data.issues.length === 0 ? (
          <p className="note">{t("title.no.results")}</p>
        ) : (
          data.issues.map((issue) => (
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
      </ContentCard>
    </ProjectShell>
  );
}
