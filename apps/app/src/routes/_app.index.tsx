import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { ContentCard, SidebarSection, SiteShell } from "@app/components/parity-shells";
import { resolveAuthenticatedHomePath } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { publicShellQueryOptions } from "@app/lib/queries";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context }) => {
    const session = await context.authCaller.readCurrentSession();
    if (!session.isAnonymous) {
      throw redirect({ href: resolveAuthenticatedHomePath(session) });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicShellQueryOptions()),
  component: HomeRouteComponent,
});

function HomeRouteComponent() {
  const shell = useSuspenseQuery(publicShellQueryOptions());
  const t = useTranslate();

  const workstreamLinks = {
    groups: {
      href: "/organizations/new",
      label: t("title.newOrganization"),
      title: t("app.home.workstream.groups"),
    },
    projects: {
      href: "/projects/new",
      label: t("title.newProject"),
      title: t("app.home.workstream.projects"),
    },
    search: {
      href: "/search?pageSize=20&scope=global",
      label: t("title.search"),
      title: t("app.home.workstream.search"),
    },
  } as const;

  return (
    <SiteShell
      actions={
        <>
          <Link className="secondary-cta" to="/login">
            {t("button.login")}
          </Link>
          <Link className="cta" to="/register">
            {t("button.signup", t("app.name"))}
          </Link>
        </>
      }
      description={t("app.description")}
      eyebrow={t("app.home.eyebrow")}
      sidebar={
        <>
          <SidebarSection title={t("app.sidebar.navigation")}>
            <div className="sidebar-link-list">
              <a className="sidebar-link" href="/search?pageSize=20&scope=global">
                {t("title.search")}
              </a>
              <Link className="sidebar-link" to="/projects/new">
                {t("title.newProject")}
              </Link>
              <Link className="sidebar-link" to="/organizations/new">
                {t("title.newOrganization")}
              </Link>
            </div>
          </SidebarSection>
          <SidebarSection title={t("app.home.currentSurface")}>
            <div className="sidebar-link-list">
              <span className="sidebar-link">{t("search.menu.issues")}</span>
              <span className="sidebar-link">{t("menu.board")}</span>
              <span className="sidebar-link">{t("menu.code")}</span>
            </div>
          </SidebarSection>
        </>
      }
      title={t("app.name")}
    >
      <ContentCard title={t("app.home.entryPoints")}>
        <div className="link-row">
          <Link className="link-text" to="/login">
            {t("title.login")}
          </Link>
          <Link className="link-text" to="/register">
            {t("user.signupBtn")}
          </Link>
          <Link className="link-text" to="/forgot-password">
            {t("title.forgotpassword")}
          </Link>
          <Link className="link-text" to="/reset-password">
            {t("title.resetPassword")}
          </Link>
          <a className="link-text" href="/search?pageSize=20&scope=global">
            {t("title.search")}
          </a>
        </div>
      </ContentCard>
      <div className="content-grid">
        {shell.data.workstreams.map((workstream) => {
          const card = workstreamLinks[workstream];

          return (
            <ContentCard key={workstream} title={card.title}>
              <div className="link-row">
                <a className="link-text" href={card.href}>
                  {card.label}
                </a>
              </div>
            </ContentCard>
          );
        })}
      </div>
    </SiteShell>
  );
}
