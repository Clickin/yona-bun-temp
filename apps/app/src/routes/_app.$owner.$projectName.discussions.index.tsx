import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { createPosting, listPostings } from "@app/lib/posting";
import { readProjectDetail } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/discussions/")({
  loader: async ({ params }) => {
    const ref = {
      ownerName: params.owner,
      projectName: params.projectName,
    };

    const [project, postings] = await Promise.all([
      readProjectDetail({ data: ref }),
      listPostings({ data: ref }),
    ]);

    return {
      postings,
      project,
    };
  },
  component: ProjectDiscussionListRouteComponent,
});

function ProjectDiscussionListRouteComponent() {
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
      activeMenu="discussions"
      aside={
          <SidebarSection title={t("app.project.newDiscussion")}>
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
                      error instanceof Error ? error.message : t("app.project.discussionCreateFailed"),
                    );
                  } finally {
                    setPending(false);
                  }
                })();
              });
            }}
          >
            <label className="field">
                <span>{t("app.project.discussionTitle")}</span>
              <input
                onChange={(event) =>
                  setFormState((current) => ({ ...current, title: event.target.value }))
                }
                  placeholder={t("app.project.discussionTitle")}
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
                  placeholder={t("app.project.discussionBody")}
                rows={5}
                value={formState.body}
              />
            </label>
            <div className="action-row">
              <button className="cta" type="submit">
                  {pending ? t("app.project.creating") : t("app.project.createDiscussion")}
              </button>
            </div>
          </form>
          {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
        </SidebarSection>
      }
      project={data.project}
    >
      <ContentCard title={t("app.project.discussionList")}>
        {data.postings.length === 0 ? (
          <p className="note">{t("title.no.results")}</p>
        ) : (
          data.postings.map((posting) => (
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
      </ContentCard>
    </ProjectShell>
  );
}
