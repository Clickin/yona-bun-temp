import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  cancelEnrollOrganizationRest,
  enrollOrganizationRest,
  leaveOrganizationRest,
  readOrganizationContainerRest,
} from "../../api/org-project";
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
  const [projectFilter, setProjectFilter] = useState("");
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const organizationName = stringField(organization.organizationName, "organization");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const viewerCanLeave = booleanField(organization.viewerCanLeave);
  const viewerCanLeaveAfterValidation = optionalBooleanField(
    organization.viewerCanLeaveAfterValidation,
    viewerCanLeave,
  );
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return leaveOrganizationRest(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response) {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      const redirectPath = stringField(response.redirectPath, `/organizations/${organizationName}`);
      router.history.push(
        redirectPath.startsWith(`${runtimeConfig.basePath}/`) ||
          redirectPath === runtimeConfig.basePath
          ? redirectPath
          : prefixBasePath(runtimeConfig.basePath, redirectPath),
      );
    },
  });

  return (
    <>
      <OrganizationHeader
        enrollmentRequested={booleanField(organization.enrollmentRequested)}
        logoUrl={logoUrl}
        organizationName={organizationName}
        viewerCanEnroll={booleanField(organization.viewerCanEnroll)}
      />
      <OrganizationMenu
        active="home"
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
                      onChange={(event) => setProjectFilter(event.currentTarget.value)}
                    />
                    <button type="button" className="search-btn">
                      <i className="yobicon-search"></i>
                    </button>
                  </div>
                </div>
                {booleanField(organization.viewerCanCreateProject) ? (
                  <div className="pull-right">
                    <Link
                      activeOptions={{
                        exact: true,
                        explicitUndefined: true,
                        includeHash: true,
                        includeSearch: true,
                      }}
                      activeProps={{
                        "aria-current": undefined,
                        className: undefined,
                        "data-status": undefined,
                      }}
                      className="ybtn ybtn-primary"
                      search={{ owner: organizationName }}
                      to="/projectform"
                    >
                      {t("button.newProject")}
                    </Link>
                  </div>
                ) : null}
              </div>
              <ul className="all-projects">
                {organization.visibleProjects.map((project) => (
                  <OrganizationProject
                    filter={projectFilter}
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
                onLeaveClick={() => setLeaveModalOpen(true)}
                organizationName={organizationName}
                showLeave={viewerCanLeave && viewerCanLeaveAfterValidation}
                title={t("user.role.org_admin")}
              />
              <MemberPanel
                basePath={runtimeConfig.basePath}
                className="bubble-wrap gray project-home mt10"
                members={organization.memberMembers}
                onLeaveClick={() => setLeaveModalOpen(true)}
                organizationName={organizationName}
                showLeave={false}
                title={t("user.role.org_member")}
              />
            </div>
          </div>
        </div>
      </div>
      <div
        id="alertLeave"
        className={leaveModalOpen ? "modal" : "modal hide"}
        style={leaveModalOpen ? { display: "block" } : undefined}
      >
        <div className="modal-header">
          <button
            type="button"
            className="close"
            data-dismiss="modal"
            onClick={() => setLeaveModalOpen(false)}
          >
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
          <button
            type="button"
            className="ybtn ybtn-mini"
            data-dismiss="modal"
            onClick={() => setLeaveModalOpen(false)}
          >
            {t("button.no")}
          </button>
        </div>
      </div>
    </>
  );
}

function OrganizationProject({ filter, project }: { filter: string; project: YonaRecord }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "");
  const projectName = stringField(project.projectName, "");
  const createdLabel = stringField(project.createdLabel, "");
  const lastPushedLabel = stringField(project.lastPushedLabel, "");
  const dataValue = `${projectName} ${stringField(project.overview, "")}`;
  const normalizedFilter = filter.trim().toLowerCase();
  const hidden = normalizedFilter ? !dataValue.toLowerCase().includes(normalizedFilter) : false;

  return (
    <li
      className="project"
      data-item="project-item"
      data-value={dataValue}
      style={hidden ? { display: "none" } : undefined}
    >
      <div className="info-wrap">
        <div className="owner-avatar-wrap hide-in-mobile">
          <Link
            activeOptions={{
              exact: true,
              explicitUndefined: true,
              includeHash: true,
              includeSearch: true,
            }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
            params={{ ownerName, projectName }}
            search={{}}
            to="/$ownerName/$projectName"
          >
            <img
              src={stringField(project.logoUrl, "/assets/images/project_default_logo.png")}
              alt={`${projectName}.name`}
            />
          </Link>
        </div>
        <div style={{ float: "left" }}>
          <div className="header">
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              className="black"
              params={{ ownerName, projectName }}
              search={{}}
              to="/$ownerName/$projectName"
            >
              {projectName}
            </Link>
          </div>
          <div className="desc">{stringField(project.overview, "")}</div>
          <p className="name-tag">
            by{" "}
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              className="owner-name-small"
              params={{ user: ownerName }}
              search={{}}
              to="/$user"
            >
              {ownerName}
            </Link>{" "}
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
  onLeaveClick,
  organizationName,
  showLeave,
  title,
}: {
  basePath: string;
  className?: string;
  members: YonaUserItem[];
  onLeaveClick: () => void;
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
              onClick={onLeaveClick}
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
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  className="avatar-wrap"
                  data-toggle="tooltip"
                  data-placement="top"
                  params={{ user: stringField(member.loginId, "") }}
                  search={{}}
                  title={stringField(member.loginId, "")}
                  to="/$user"
                >
                  <img
                    src={stringField(member.avatarUrl, "/assets/images/default-avatar-45.png")}
                    height="45"
                    width="45"
                    alt=""
                  />
                </Link>
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  data-toggle="tooltip"
                  data-placement="top"
                  params={{ user: stringField(member.loginId, "") }}
                  search={{}}
                  title={stringField(member.loginId, "")}
                  to="/$user"
                >
                  {stringField(member.userLabel, stringField(member.loginId, ""))}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function OrganizationHeader({
  enrollmentRequested: initialEnrollmentRequested = false,
  logoUrl,
  organizationName,
  viewerCanEnroll = false,
}: {
  enrollmentRequested?: boolean;
  logoUrl: string;
  organizationName: string;
  viewerCanEnroll?: boolean;
}) {
  const { runtimeConfig } = Route.useRouteContext();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const [enrollmentRequested, setEnrollmentRequested] = useState(initialEnrollmentRequested);
  const [enrollmentDropdownOpen, setEnrollmentDropdownOpen] = useState(false);
  const enrollmentMutation = useMutation({
    mutationFn: async (nextRequested: boolean) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return nextRequested
        ? enrollOrganizationRest(runtimeConfig, csrfToken, organizationName)
        : cancelEnrollOrganizationRest(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response, nextRequested) {
      setEnrollmentRequested(
        typeof response.enrollmentRequested === "boolean"
          ? response.enrollmentRequested
          : nextRequested,
      );
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
    },
  });

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
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  params={{ organizationName }}
                  hash="organization-home-active-sentinel"
                  mask={{
                    to: "/organizations/$organizationName",
                    params: { organizationName },
                  }}
                  to="/organizations/$organizationName"
                >
                  {organizationName}
                </Link>
              </span>
            </div>
          </div>
          {viewerCanEnroll ? (
            <div className="project-util-wrap">
              <ul className="project-util">
                <li className={enrollmentDropdownOpen ? "open" : undefined}>
                  <button
                    className={`ybtn ybtn-small ${enrollmentRequested ? "ybtn-info " : ""}dropdown-toggle`}
                    type="button"
                    data-toggle="dropdown"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEnrollmentDropdownOpen((current) => !current);
                    }}
                  >
                    <i className="yobicon-addfriend"></i>{" "}
                    {t("organization.member.enrollment.title")}
                  </button>
                  <div className="dropdown-menu flat right title">
                    <div className="pop-title">
                      {enrollmentRequested
                        ? t("organization.you.want.to.be.a.member", { args: [organizationName] })
                        : t("organization.you.may.want.to.be.a.member", {
                            args: [organizationName],
                          })}
                    </div>
                    <div className="pop-content">
                      {enrollmentRequested
                        ? t("organization.member.enrollment.help.after")
                        : t("organization.member.enrollment.help.before")}
                    </div>
                    <div className="pop-content btn-wrap">
                      <button
                        type="button"
                        className={`ybtn ${enrollmentRequested ? "" : "ybtn-info "}enrollBtn`}
                        id="enrollBtn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEnrollmentDropdownOpen(false);
                          enrollmentMutation.mutate(!enrollmentRequested);
                        }}
                      >
                        <i
                          className={
                            enrollmentRequested ? "yobicon-removefriend" : "yobicon-addfriend"
                          }
                        ></i>{" "}
                        {enrollmentRequested
                          ? t("button.cancel.enrollment")
                          : t("button.new.enrollment")}
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function OrganizationMenu({
  active,
  organizationName,
  viewerCanUpdate,
}: {
  active?: "home";
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className={active === "home" ? "active" : ""}>
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              hash="organization-home-active-sentinel"
              mask={{
                to: "/organizations/$organizationName",
                params: { organizationName },
              }}
              to="/organizations/$organizationName"
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={{}}
              to="/organizations/$organizationName/issues"
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={{}}
              to="/organizations/$organizationName/boards"
            >
              {t("menu.board")}
            </Link>
          </li>
          <li className="">
            <Link
              activeOptions={{
                exact: true,
                explicitUndefined: true,
                includeHash: true,
                includeSearch: true,
              }}
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              params={{ organizationName }}
              search={{}}
              to="/organizations/$organizationName/pullrequests"
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <Link
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  params={{ organizationName }}
                  search={{}}
                  to="/organizations/$organizationName/settingform"
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
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

function optionalBooleanField(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}
