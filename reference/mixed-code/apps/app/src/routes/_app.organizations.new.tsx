import * as React from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SidebarSection, SiteShell } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { useTranslate } from "@app/lib/i18n-react";
import { createOrganization } from "@app/lib/organization";

export const Route = createFileRoute("/_app/organizations/new")({
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
  const t = useTranslate();
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
    <SiteShell
      eyebrow={t("app.group.eyebrow")}
      sidebar={
        <>
          <SidebarSection title={t("organization.name.placeholder")}>
            <p className="sidebar-kv">{t("organization.name.alert")}</p>
          </SidebarSection>
          <SidebarSection title={t("project.description")}>
            <p className="sidebar-kv">{t("organization.description.placeholder")}</p>
          </SidebarSection>
        </>
      }
      title={t("title.newOrganization")}
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
                  setErrorMessage(error instanceof Error ? error.message : t("organization.create"));
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("organization.name.placeholder")}</span>
            <input
              onChange={(event) => updateField("organizationName", event.target.value)}
              placeholder={t("organization.name.placeholder")}
              type="text"
              value={formState.organizationName}
            />
          </label>
          <label className="field">
            <span>{t("project.description")}</span>
            <textarea
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={t("organization.description.placeholder")}
              value={formState.description}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? `${t("organization.create")}...` : t("organization.create")}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </section>
    </SiteShell>
  );
}
