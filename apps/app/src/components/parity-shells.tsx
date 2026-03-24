import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslate } from "@app/lib/i18n-react";
import type {
  OrganizationDetail,
  PersonalSidebar,
  ProjectDetail,
  UserPublicProfile,
} from "@yona/contracts";

function formatProjectPath(entry: { ownerName: string; projectName: string }) {
  return `${entry.ownerName}/${entry.projectName}`;
}

function formatDate(value: Date | null, fallback: string) {
  return value ? value.toISOString().slice(0, 10) : fallback;
}

function toInitials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="sidebar-card">
      <h2 className="sidebar-heading">{title}</h2>
      <div className="sidebar-body">{children}</div>
    </section>
  );
}

export function ContentCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="content-card">
      <header className="section-header">
        <h2>{title}</h2>
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

export function SiteShell({
  actions,
  children,
  description,
  eyebrow,
  sidebar,
  title,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  sidebar?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="shell-layout">
      <aside className="shell-sidebar">{sidebar}</aside>
      <main className="shell-main">
        <header className="page-hero">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <div className="page-title-row">
            <div>
              <h1>{title}</h1>
              {description ? <p className="page-summary">{description}</p> : null}
            </div>
            {actions ? <div className="page-actions">{actions}</div> : null}
          </div>
        </header>
        <div className="page-stack">{children}</div>
      </main>
    </div>
  );
}

export function AuthShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  const t = useTranslate();

  return (
    <div className="auth-shell">
      <header className="auth-hero">
        <p className="page-eyebrow">{t("app.auth.eyebrow")}</p>
        <h1>{title}</h1>
        <p className="page-summary">{description}</p>
      </header>
      <div className="auth-panel">{children}</div>
    </div>
  );
}

export function WorkspaceShell({
  activeTab,
  children,
  description,
  sidebar,
  title,
}: {
  activeTab: "overview" | "settings";
  children: React.ReactNode;
  description: string;
  sidebar: PersonalSidebar;
  title: string;
}) {
  const t = useTranslate();

  return (
    <SiteShell
      description={description}
      eyebrow={t("app.workspace.eyebrow")}
      sidebar={<WorkspaceSidebar sidebar={sidebar} />}
      title={title}
    >
      <nav aria-label={t("app.workspace.eyebrow")} className="entity-menu">
        <div className="entity-menu-list">
          <Link
            activeProps={{ className: "entity-menu-link is-active" }}
            className={activeTab === "overview" ? "entity-menu-link is-active" : "entity-menu-link"}
            to="/me"
          >
            {t("app.workspace.overview")}
          </Link>
          <Link
            activeProps={{ className: "entity-menu-link is-active" }}
            className={activeTab === "settings" ? "entity-menu-link is-active" : "entity-menu-link"}
            to="/me/settings"
          >
            {t("app.workspace.settings")}
          </Link>
        </div>
      </nav>
      {children}
    </SiteShell>
  );
}

function WorkspaceSidebar({ sidebar }: { sidebar: PersonalSidebar }) {
  const t = useTranslate();

  return (
    <>
      <SidebarSection title={t("app.sidebar.navigation")}>
        <div className="sidebar-link-list">
          <Link className="sidebar-link" to="/me">
            {t("app.workspace.myWorkspace")}
          </Link>
          <Link className="sidebar-link" to="/me/settings">
            {t("app.workspace.accountSettings")}
          </Link>
          <Link className="sidebar-link" to="/projects/new">
            {t("title.newProject")}
          </Link>
          <Link className="sidebar-link" to="/organizations/new">
            {t("title.newOrganization")}
          </Link>
        </div>
      </SidebarSection>
      <SidebarSection title={t("app.sidebar.favorites")}>
        {sidebar.favorites.length === 0 ? (
          <p className="sidebar-empty">{t("app.sidebar.noFavoriteProjects")}</p>
        ) : (
          <div className="sidebar-link-list">
            {sidebar.favorites.map((entry) => (
              <Link
                className="sidebar-link"
                key={formatProjectPath(entry)}
                params={{ owner: entry.ownerName, projectName: entry.projectName }}
                to="/$owner/$projectName"
              >
                {formatProjectPath(entry)}
              </Link>
            ))}
          </div>
        )}
      </SidebarSection>
      <SidebarSection title={t("app.sidebar.recentProjects")}>
        {sidebar.recentProjects.length === 0 ? (
          <p className="sidebar-empty">{t("app.sidebar.noRecentProjects")}</p>
        ) : (
          <div className="sidebar-link-list">
            {sidebar.recentProjects.map((entry) => (
              <Link
                className="sidebar-link"
                key={formatProjectPath(entry)}
                params={{ owner: entry.ownerName, projectName: entry.projectName }}
                to="/$owner/$projectName"
              >
                {formatProjectPath(entry)}
              </Link>
            ))}
          </div>
        )}
      </SidebarSection>
    </>
  );
}

export function ProfileShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: UserPublicProfile;
}) {
  const t = useTranslate();

  return (
    <SiteShell
      description={t("app.profile.description", profile.loginId)}
      eyebrow={t("app.profile.eyebrow")}
      sidebar={<ProfileSidebar profile={profile} />}
      title={profile.userLabel}
    >
      {children}
    </SiteShell>
  );
}

function ProfileSidebar({ profile }: { profile: UserPublicProfile }) {
  const t = useTranslate();

  return (
    <>
      <SidebarSection title={t("app.sidebar.profile")}>
        <div className="profile-summary">
          <div className="profile-avatar">{toInitials(profile.userLabel)}</div>
          <p className="sidebar-kv">@{profile.loginId}</p>
          <p className="sidebar-kv">{t("app.profile.joined", formatDate(profile.joinedAt, "-"))}</p>
        </div>
      </SidebarSection>
      <SidebarSection title={t("app.sidebar.links")}>
        <div className="sidebar-link-list">
          <a className="sidebar-link" href="/search?pageSize=20&scope=global">
            {t("site.search")}
          </a>
          <Link className="sidebar-link" to="/login">
            {t("button.login")}
          </Link>
        </div>
      </SidebarSection>
    </>
  );
}

type ProjectMenuKey = "branches" | "code" | "discussions" | "home" | "issues" | "pulls" | "settings";

export function ProjectShell({
  activeMenu,
  aside,
  children,
  project,
}: {
  activeMenu: ProjectMenuKey;
  aside?: React.ReactNode;
  children: React.ReactNode;
  project: ProjectDetail;
}) {
  const t = useTranslate();
  const params = {
    owner: project.ownerName,
    projectName: project.projectName,
  };

  return (
    <section className="entity-shell project-shell">
      <header className="entity-header">
        <div className="entity-avatar">{project.projectName.slice(0, 1).toUpperCase()}</div>
        <div className="entity-copy">
          <p className="page-eyebrow">{t("app.project.eyebrow")}</p>
          <div className="entity-title-row">
            <h1>
              <span className="entity-owner">{project.ownerName}</span>
              <span className="entity-separator">/</span>
              <span>{project.projectName}</span>
            </h1>
            <div className="badge-row">
              <span className="badge">{project.projectScope}</span>
              {project.organizationName ? <span className="badge">{t("app.project.organizationOwned")}</span> : null}
            </div>
          </div>
          <p className="page-summary">{project.overview ?? t("app.project.noOverview")}</p>
        </div>
        {project.viewerCanUpdate ? (
          <div className="page-actions">
            <Link className="secondary-cta" params={params} to="/$owner/$projectName/settings">
              {t("app.project.settings")}
            </Link>
          </div>
        ) : null}
      </header>
      <nav aria-label={t("app.project.eyebrow")} className="entity-menu">
        <div className="entity-menu-list">
          <Link
            className={activeMenu === "home" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName"
          >
            {t("title.projectHome")}
          </Link>
          <Link
            className={activeMenu === "code" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName/code"
          >
            {t("menu.code")}
          </Link>
          <Link
            className={activeMenu === "issues" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName/issues"
          >
            {t("menu.issue")}
          </Link>
          <Link
            className={activeMenu === "pulls" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName/pulls"
          >
            {t("menu.pullRequest")}
          </Link>
          <Link
            className={activeMenu === "discussions" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName/discussions"
          >
            {t("menu.board")}
          </Link>
          <Link
            className={activeMenu === "branches" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/$owner/$projectName/branches"
          >
            {t("app.project.branches")}
          </Link>
        </div>
        {project.viewerCanUpdate ? (
          <div className="entity-menu-admin">
            <Link
              className={activeMenu === "settings" ? "entity-menu-link is-active" : "entity-menu-link"}
              params={params}
              to="/$owner/$projectName/settings"
            >
              {t("menu.admin")}
            </Link>
          </div>
        ) : null}
      </nav>
      <div className="entity-body">
        <div className="entity-main">{children}</div>
        {aside ? <aside className="entity-aside">{aside}</aside> : null}
      </div>
    </section>
  );
}

type OrganizationMenuKey = "home" | "settings";

export function OrganizationShell({
  activeMenu,
  aside,
  children,
  organization,
}: {
  activeMenu: OrganizationMenuKey;
  aside?: React.ReactNode;
  children: React.ReactNode;
  organization: OrganizationDetail;
}) {
  const t = useTranslate();
  const params = {
    organizationName: organization.organizationName,
  };

  return (
    <section className="entity-shell organization-shell">
      <header className="entity-header">
        <div className="entity-avatar">{organization.organizationName.slice(0, 1).toUpperCase()}</div>
        <div className="entity-copy">
          <p className="page-eyebrow">{t("app.group.eyebrow")}</p>
          <div className="entity-title-row">
            <h1>{organization.organizationName}</h1>
          </div>
          <p className="page-summary">{organization.description ?? t("app.group.noDescription")}</p>
        </div>
        {organization.viewerCanUpdate ? (
          <div className="page-actions">
            <Link className="secondary-cta" params={params} to="/organizations/$organizationName/settings">
              {t("app.group.settings")}
            </Link>
          </div>
        ) : null}
      </header>
      <nav aria-label={t("app.group.eyebrow")} className="entity-menu">
        <div className="entity-menu-list">
          <Link
            className={activeMenu === "home" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={params}
            to="/organizations/$organizationName"
          >
            {t("title.organizationHome")}
          </Link>
        </div>
        {organization.viewerCanUpdate ? (
          <div className="entity-menu-admin">
            <Link
              className={activeMenu === "settings" ? "entity-menu-link is-active" : "entity-menu-link"}
              params={params}
              to="/organizations/$organizationName/settings"
            >
              {t("menu.admin")}
            </Link>
          </div>
        ) : null}
      </nav>
      <div className="entity-body">
        <div className="entity-main">{children}</div>
        {aside ? <aside className="entity-aside">{aside}</aside> : null}
      </div>
    </section>
  );
}
