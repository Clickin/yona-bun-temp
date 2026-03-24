import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { readProjectSettings, updateProject } from "@app/lib/project";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/$owner/$projectName/settings")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: ({ params }) =>
    readProjectSettings({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectSettingsRouteComponent,
});

export const ProjectSettingsRoute = Route;

function ProjectSettingsRouteComponent() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const t = useTranslate();
  const [formState, setFormState] = React.useState({
    overview: data.overview ?? "",
    projectName: data.projectName,
    projectScope: data.projectScope,
  });

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <ProjectShell
      activeMenu="settings"
      aside={
        <>
          <SidebarSection title={t("app.project.visibility")}>
            <p className="sidebar-kv">{t("app.project.currentScope", data.projectScope)}</p>
          </SidebarSection>
          <SidebarSection title={t("app.project.ownership")}>
            <p className="sidebar-kv">{t("app.project.owner", data.ownerName)}</p>
            <p className="sidebar-kv">{t("app.project.ownerType", data.organizationName ? t("app.project.organizationManaged") : t("app.project.userManaged"))}</p>
          </SidebarSection>
        </>
      }
      project={data}
    >
      <ContentCard title={t("app.project.settings")}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await updateProject({
                    data: {
                      currentOwnerName: data.ownerName,
                      currentProjectName: data.projectName,
                      overview: formState.overview,
                      projectName: formState.projectName,
                      projectScope: formState.projectScope,
                    },
                  });
                  await navigate({
                    to: "/$owner/$projectName/settings",
                    params: {
                      owner: result.ownerName,
                      projectName: result.projectName,
                    },
                  });
                } catch (error) {
                  setErrorMessage(
                      error instanceof Error ? error.message : t("app.project.projectUpdateFailed"),
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("project.name")}</span>
            <input onChange={(event) => updateField("projectName", event.target.value)} type="text" value={formState.projectName} />
          </label>
          <label className="field">
            <span>{t("app.project.overview")}</span>
            <textarea onChange={(event) => updateField("overview", event.target.value)} value={formState.overview} />
          </label>
          <label className="field">
            <span>{t("app.project.visibility")}</span>
            <select onChange={(event) => updateField("projectScope", event.target.value)} value={formState.projectScope}>
              <option value="public">{t("project.public")}</option>
              <option value="protected">{t("project.protected")}</option>
              <option value="private">{t("project.private")}</option>
            </select>
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? t("app.settings.saving") : t("app.project.saveProject")}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </ContentCard>
    </ProjectShell>
  );
}
