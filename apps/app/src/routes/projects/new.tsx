import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import { createProject } from "@app/lib/project";

export const Route = createFileRoute("/projects/new")({
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
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Create Project</strong>
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
                  setErrorMessage(
                    error instanceof Error ? error.message : "Project creation failed.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Owner name</span>
            <input
              onChange={(event) => updateField("ownerName", event.target.value)}
              placeholder="yobi or labs"
              type="text"
              value={formState.ownerName}
            />
          </label>
          <label className="field">
            <span>Project name</span>
            <input
              onChange={(event) => updateField("projectName", event.target.value)}
              placeholder="projectYobi"
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
              onChange={(event) => updateField("projectScope", event.target.value as never)}
              value={formState.projectScope}
            >
              <option value="public">Public</option>
              <option value="protected">Protected</option>
              <option value="private">Private</option>
            </select>
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
