import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, OrganizationShell, SidebarSection } from "@app/components/parity-shells";
import { readOrganizationDetail, readOrganizationMembers } from "@app/lib/organization";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/_app/organizations/$organizationName/")({
  loader: async ({ params }) => {
    const ref = {
      organizationName: params.organizationName,
    };

    const [organization, members] = await Promise.all([
      readOrganizationDetail({ data: ref }),
      readOrganizationMembers({ data: ref }),
    ]);

    return {
      members,
      organization,
    };
  },
  component: OrganizationDetailRouteComponent,
});

function OrganizationDetailRouteComponent() {
  const data = Route.useLoaderData();
  const t = useTranslate();
  const admins = data.members.members.filter((member) => member.role === "org_admin");
  const members = data.members.members.filter((member) => member.role === "org_member");

  return (
    <OrganizationShell
      activeMenu="home"
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
          <SidebarSection title={t("app.group.members")}>
            {members.length === 0 ? (
              <p className="sidebar-empty">{t("app.group.noMembers")}</p>
            ) : (
              <div className="sidebar-link-list">
                {members.map((member) => (
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
        </>
      }
      organization={data.organization}
    >
      <ContentCard title={t("app.group.organizationOverview")}>
        <p className="note">{data.organization.description ?? t("app.group.noDescription")}</p>
        {data.organization.viewerCanUpdate ? (
          <div className="link-row">
            <Link
              className="link-text"
              params={{ organizationName: data.organization.organizationName }}
              to="/organizations/$organizationName/settings"
            >
              {t("app.project.editSettings")}
            </Link>
            <Link className="link-text" to="/projects/new">
              {t("title.newProject")}
            </Link>
          </div>
        ) : null}
      </ContentCard>
      <ContentCard title={t("app.group.membershipSurface")}>
        <div className="badge-row">
          <span className="badge">{t("app.group.admins")}: {admins.length}</span>
          <span className="badge">{t("app.group.members")}: {members.length}</span>
          <span className="badge">{t("app.group.enrollmentRequests", data.members.enrollmentRequests.length)}</span>
        </div>
      </ContentCard>
    </OrganizationShell>
  );
}
