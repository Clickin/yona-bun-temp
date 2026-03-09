import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import { createOrganization } from "@app/lib/organization";

export const Route = createFileRoute("/organizations/new")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  component: OrganizationNewRouteComponent,
});

export const OrganizationNewRoute = Route;

function OrganizationNewRouteComponent() {
  const navigate = useNavigate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    description: "",
    organizationName: "",
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
        <strong>Create Organization</strong>
        <p className="note">
          This slice keeps the UI thin and pushes org create behavior through the typed app
          contract.
        </p>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await createOrganization({
                    data: formState,
                  });
                  await navigate({
                    to: "/organizations/$organizationName",
                    params: {
                      organizationName: result.organizationName,
                    },
                  });
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : "Organization creation failed.",
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>Organization name</span>
            <input
              onChange={(event) => updateField("organizationName", event.target.value)}
              placeholder="weblabs"
              type="text"
              value={formState.organizationName}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="weblab < labs"
              value={formState.description}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
