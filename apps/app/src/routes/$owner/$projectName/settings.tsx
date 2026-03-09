import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import { readProjectSettings, updateProject } from "@app/lib/project";

export const Route = createFileRoute("/$owner/$projectName/settings")({
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
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Project Settings</strong>
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
                    error instanceof Error ? error.message : "Project update failed.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Project name</span>
            <input
              onChange={(event) => updateField("projectName", event.target.value)}
              type="text"
              value={formState.projectName}
            />
          </label>
          <label className="field">
            <span>Overview</span>
            <textarea
              onChange={(event) => updateField("overview", event.target.value)}
              value={formState.overview}
            />
          </label>
          <label className="field">
            <span>Visibility</span>
            <select
              onChange={(event) => updateField("projectScope", event.target.value)}
              value={formState.projectScope}
            >
              <option value="public">Public</option>
              <option value="protected">Protected</option>
              <option value="private">Private</option>
            </select>
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Saving..." : "Save Project"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
