import type { MouseEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { leaveOrganizationRest, readOrganizationContainerRest } from "../../api/org-project";
import { apiQueryKeys } from "../../api/query-keys";
import type { OrganizationContainer, YonaRecord, YonaUserItem } from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationHomeRoute,
});

function OrganizationHomeRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { organizationName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const exactPath = `/organizations/${organizationName}`;

  if (pathname !== exactPath && pathname !== `${exactPath}/`) {
    return <Outlet />;
  }

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationHomeScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationHomeScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });

  if (!query.data) {
    return null;
  }

  return <OrganizationHomeBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationHomeBody({
  organization,
  runtimeConfig,
}: {
  organization: OrganizationContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const organizationName = stringField(organization.organizationName, "organization");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return leaveOrganizationRest(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response) {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      router.history.push(stringField(response.redirectPath, `/organizations/${organizationName}`));
    },
  });

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        active="home"
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="project-home-header row-fluid">
            <div className="span9 span-hard-wrap">
              <div className="project-overview">
                <h3>
                  <span id="project-description">{stringField(organization.description, "")}</span>
                </h3>
              </div>
              <div className="project-search-wrap row-fluid mt10">
                <div className="span7">
                  <div className="search-bar">
                    <input
                      name="mylist-filter"
                      id="mylist-filter"
                      className="textbox full"
                      type="text"
                      defaultValue=""
                      data-toggle="item-search"
                      data-items="project-item"
                      placeholder={t("title.type.name")}
                    />
                    <button type="button" className="search-btn">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
                {booleanField(organization.viewerCanCreateProject) ? (
                  <div className="pull-right">
                    <a
                      href={prefixBasePath(
                        runtimeConfig.basePath,
                        `/projectform?owner=${organizationName}`,
                      )}
                      className="ybtn ybtn-primary"
                    >
                      {t("button.newProject")}
                    </a>
                  </div>
                ) : null}
              </div>
              <ul className="all-projects">
                {organization.visibleProjects.map((project) => (
                  <OrganizationProject
                    basePath={runtimeConfig.basePath}
                    key={`${stringField(project.ownerName, "")}/${stringField(project.projectName, "")}`}
                    project={project}
                  />
                ))}
              </ul>
            </div>
            <div className="span3 span-hard-wrap">
              <MemberPanel
                basePath={runtimeConfig.basePath}
                members={organization.adminMembers}
                organizationName={organizationName}
                showLeave={booleanField(organization.viewerCanLeave)}
                title={t("user.role.org_admin")}
              />
              <MemberPanel
                basePath={runtimeConfig.basePath}
                className="bubble-wrap gray project-home mt10"
                members={organization.memberMembers}
                organizationName={organizationName}
                showLeave={false}
                title={t("user.role.org_member")}
              />
            </div>
          </div>
        </div>
      </div>
      <div id="alertLeave" className="modal hide">
        <div className="modal-header">
          <button type="button" className="close" data-dismiss="modal">
            ×
          </button>
          <h3>{t("organization.member.leave")}</h3>
        </div>
        <div className="modal-body">
          <p>{t("organization.member.leaveConfirm")}</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="ybtn ybtn-info ybtn-mini"
            id="leaveBtn"
            onClick={() => leaveMutation.mutate()}
          >
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn ybtn-mini" data-dismiss="modal">
            {t("button.no")}
          </button>
        </div>
      </div>
    </>
  );
}

function OrganizationProject({ basePath, project }: { basePath: string; project: YonaRecord }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "");
  const projectName = stringField(project.projectName, "");
  const projectHref = prefixBasePath(basePath, `/${ownerName}/${projectName}`);
  const createdLabel = stringField(project.createdLabel, "");
  const lastPushedLabel = stringField(project.lastPushedLabel, "");

  return (
    <li
      className="project"
      data-item="project-item"
      data-value={`${projectName} ${stringField(project.overview, "")}`}
    >
      <div className="info-wrap">
        <div className="owner-avatar-wrap hide-in-mobile">
          <a href={projectHref}>
            <img
              src={stringField(project.logoUrl, "/assets/images/project_default_logo.png")}
              alt={`${projectName}.name`}
            />
          </a>
        </div>
        <div style={{ float: "left" }}>
          <div className="header">
            <a href={projectHref} className="black">
              {projectName}
            </a>
          </div>
          <div className="desc">{stringField(project.overview, "")}</div>
          <p className="name-tag">
            by{" "}
            <a href={prefixBasePath(basePath, `/${ownerName}`)} className="owner-name-small">
              {ownerName}
            </a>{" "}
            at{" "}
            <strong title={stringField(project.createdTitle, createdLabel)}>{createdLabel}</strong>{" "}
            {lastPushedLabel ? (
              <span className="small-font">
                , {t("project.codeUpdate")}{" "}
                <strong title={stringField(project.lastPushedTitle, lastPushedLabel)}>
                  {lastPushedLabel}
                </strong>
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="stats-wrap pull-right">
        <div className="members">
          <ul className="unstyled"></ul>
          <p>
            <i className="yobicon-friends yobicon-middle"></i>
            <strong>{numberField(project.memberCount)}</strong>
            <i className="yobicon-eye"></i> <strong>{numberField(project.watchCount)}</strong>
            <i
              className={`yobicon-lightbulb ${booleanField(project.isWatching) ? "ramp-on" : "ramp-off"}`}
              data-toggle="tooltip"
              title={
                booleanField(project.isWatching)
                  ? t("project.default.group.watching")
                  : t("project.you.are.not.watching", { args: [""] })
              }
            ></i>
          </p>
        </div>
      </div>
    </li>
  );
}

function MemberPanel({
  basePath,
  className = "bubble-wrap gray project-home",
  members,
  organizationName,
  showLeave,
  title,
}: {
  basePath: string;
  className?: string;
  members: YonaUserItem[];
  organizationName: string;
  showLeave: boolean;
  title: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className={className}>
      <div className="inner member-info">
        <header>
          <h3>{title}</h3>
          {showLeave ? (
            <button
              type="button"
              className="ybtn ybtn-minimum ybtn-danger pull-right"
              id="groupLeaveBtn"
              data-href={prefixBasePath(basePath, `/organizations/${organizationName}/leave`)}
            >
              {t("organization.member.leave")}
            </button>
          ) : null}
        </header>
        <div className={className.includes("mt10") ? "member-wrap" : "member-wrap "}>
          <ul
            className={className.includes("mt10") ? "unstyled project-members" : "project-members"}
          >
            {members.map((member) => (
              <li className="member" key={stringField(member.loginId, "")}>
                <a
                  href={prefixBasePath(basePath, `/${stringField(member.loginId, "")}`)}
                  className="avatar-wrap"
                  data-toggle="tooltip"
                  data-placement="top"
                  title={stringField(member.loginId, "")}
                >
                  <img
                    src={stringField(member.avatarUrl, "/assets/images/default-avatar-45.png")}
                    height="45"
                    width="45"
                    alt=""
                  />
                </a>
                <a
                  href={prefixBasePath(basePath, `/${stringField(member.loginId, "")}`)}
                  data-toggle="tooltip"
                  data-placement="top"
                  title={stringField(member.loginId, "")}
                >
                  {stringField(member.userLabel, stringField(member.loginId, ""))}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function OrganizationHeader({
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
  logoUrl: string;
  organizationName: string;
}) {
  return (
    <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
      <div className="project-header-inner">
        <div className="project-header-wrap">
          <div className="project-header-avatar">
            <img src={logoUrl} alt="" />
          </div>
          <div className="project-breadcrumb-wrap">
            <div className="project-breadcrumb">
              <span className="project-author">
                <span className="group-title-head">group</span>
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrganizationMenu({
  active,
  basePath,
  organizationName,
  viewerCanUpdate,
}: {
  active?: "home";
  basePath: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const navigate = (to: string) => {
    router.navigate({ to });
  };

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className={active === "home" ? "active" : ""}>
            <OrganizationRouteLink
              basePath={basePath}
              onNavigate={navigate}
              to={`/organizations/${organizationName}`}
            >
              {t("title.organizationHome")}
            </OrganizationRouteLink>
          </li>
          <li className="">
            <OrganizationRouteLink
              basePath={basePath}
              onNavigate={navigate}
              to={`/organizations/${organizationName}/issues`}
            >
              {t("menu.issue")}
            </OrganizationRouteLink>
          </li>
          <li className="">
            <OrganizationRouteLink
              basePath={basePath}
              onNavigate={navigate}
              to={`/organizations/${organizationName}/boards`}
            >
              {t("menu.board")}
            </OrganizationRouteLink>
          </li>
          <li className="">
            <OrganizationRouteLink
              basePath={basePath}
              onNavigate={navigate}
              to={`/organizations/${organizationName}/pullrequests`}
            >
              {t("menu.pullRequest")}
            </OrganizationRouteLink>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <OrganizationRouteLink
                  basePath={basePath}
                  onNavigate={navigate}
                  to={`/organizations/${organizationName}/settingform`}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </OrganizationRouteLink>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrganizationRouteLink({
  basePath,
  children,
  onNavigate,
  to,
}: {
  basePath: string;
  children: ReactNode;
  onNavigate: (to: string) => void;
  to: string;
}) {
  const navigateWithinOrganization = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(to);
  };

  return (
    <a href={prefixBasePath(basePath, to)} onClick={navigateWithinOrganization}>
      {children}
    </a>
  );
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
}

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function numberField(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanField(value: unknown) {
  return value === true;
}
