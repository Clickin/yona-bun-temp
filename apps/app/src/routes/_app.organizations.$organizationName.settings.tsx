import * as React from "react";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ContentCard, OrganizationShell, SidebarSection } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { readOrganizationMembers, readOrganizationSettings, updateOrganization } from "@app/lib/organization";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/organizations/$organizationName/settings")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: async ({ params }) => {
    const ref = {
      organizationName: params.organizationName,
    };

    const [organization, members] = await Promise.all([
      readOrganizationSettings({ data: ref }),
      readOrganizationMembers({ data: ref }),
    ]);

    return {
      members,
      organization,
    };
  },
  component: OrganizationSettingsRouteComponent,
});

export const OrganizationSettingsRoute = Route;

function OrganizationSettingsRouteComponent() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const t = useTranslate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    description: data.organization.description ?? "",
    organizationName: data.organization.organizationName,
  });

  const admins = data.members.members.filter((member) => member.role === "org_admin");

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <OrganizationShell
      activeMenu="settings"
      aside={
        <>
          <SidebarSection title={t("app.group.admins")}>
            {admins.length === 0 ? (
              <p className="sidebar-empty">{t("app.group.noAdmins")}</p>
            ) : (
              <div className="sidebar-link-list">
                {admins.map((member) => (
                  <Link
                    className="sidebar-link"
                    key={member.loginId}
                    params={{ loginId: member.loginId }}
                    to="/users/$loginId"
                  >
                    {member.userLabel}
                  </Link>
                ))}
              </div>
            )}
          </SidebarSection>
          <SidebarSection title={t("app.group.pendingRequests")}>
            <p className="sidebar-kv">{t("app.group.enrollmentRequests", data.members.enrollmentRequests.length)}</p>
          </SidebarSection>
        </>
      }
      organization={data.organization}
    >
      <ContentCard title={t("app.group.organizationSettings")}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setErrorMessage(null);

            React.startTransition(() => {
              void (async () => {
                try {
                  const result = await updateOrganization({
                    data: {
                      currentOrganizationName: data.organization.organizationName,
                      description: formState.description,
                      organizationName: formState.organizationName,
                    },
                  });
                  await navigate({
                    to: "/organizations/$organizationName/settings",
                    params: {
                      organizationName: result.organizationName,
                    },
                  });
                } catch (error) {
                  setErrorMessage(
                      error instanceof Error ? error.message : t("app.group.organizationUpdateFailed"),
                  );
                } finally {
                  setPending(false);
                }
              })();
            });
          }}
        >
          <label className="field">
            <span>{t("app.group.name")}</span>
            <input
              onChange={(event) => updateField("organizationName", event.target.value)}
              type="text"
              value={formState.organizationName}
            />
          </label>
          <label className="field">
            <span>{t("app.group.description")}</span>
            <textarea onChange={(event) => updateField("description", event.target.value)} value={formState.description} />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pending ? t("app.settings.saving") : t("app.group.saveOrganization")}
            </button>
          </div>
        </form>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </ContentCard>
    </OrganizationShell>
  );
}
