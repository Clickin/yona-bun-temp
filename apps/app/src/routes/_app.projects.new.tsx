import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SidebarSection, SiteShell } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { useTranslate } from "@app/lib/i18n-react";
import { createProject } from "@app/lib/project";

export const Route = createFileRoute("/_app/projects/new")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  component: ProjectNewRouteComponent,
});

export const ProjectNewRoute = Route;

function ProjectNewRouteComponent() {
  const navigate = useNavigate();
  const t = useTranslate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    ownerName: "",
    overview: "",
    projectName: "",
    projectScope: "public" as const,
  });

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <SiteShell
      eyebrow={t("app.project.eyebrow")}
      sidebar={
        <>
          <SidebarSection title={t("project.name")}>
            <p className="sidebar-kv">{t("project.name.placeholder")}</p>
          </SidebarSection>
          <SidebarSection title={t("project.shareOption")}>
            <p className="sidebar-kv">{t("project.public.notice")}</p>
            <p className="sidebar-kv">{t("project.protected.notice")}</p>
            <p className="sidebar-kv">{t("project.private.notice")}</p>
          </SidebarSection>
        </>
      }
      title={t("title.newProject")}
    >
      <section className="content-card">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await createProject({
                    data: formState,
                  });
                  await navigate({
                    to: "/$owner/$projectName",
                    params: {
                      owner: result.ownerName,
                      projectName: result.projectName,
                    },
                  });
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : t("project.create"));
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("project.owner")}</span>
            <input
              onChange={(event) => updateField("ownerName", event.target.value)}
              placeholder={t("project.owner")}
              type="text"
              value={formState.ownerName}
            />
          </label>
          <label className="field">
            <span>{t("project.name")}</span>
            <input
              onChange={(event) => updateField("projectName", event.target.value)}
              placeholder={t("project.name.placeholder")}
              type="text"
              value={formState.projectName}
            />
          </label>
          <label className="field">
            <span>{t("project.description")}</span>
            <textarea onChange={(event) => updateField("overview", event.target.value)} value={formState.overview} />
          </label>
          <label className="field">
            <span>{t("project.shareOption")}</span>
            <select
              onChange={(event) => updateField("projectScope", event.target.value as never)}
              value={formState.projectScope}
            >
              <option value="public">{t("project.public")}</option>
              <option value="protected">{t("project.protected")}</option>
              <option value="private">{t("project.private")}</option>
            </select>
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? `${t("project.create")}...` : t("project.create")}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </section>
    </SiteShell>
  );
}
