import { type MouseEvent, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  cancelEnrollOrganizationRest,
  enrollOrganizationRest,
  leaveOrganizationRest,
  readOrganizationContainerRest,
} from "../../api/org-project";
import { apiQueryKeys } from "../../api/query-keys";
import { RestApiError, restFetch } from "../../api/rest-client";
import type {
  OrganizationContainer,
  OrganizationRedirectResult,
  YoramRecord,
  YoramUserItem,
} from "../../api/types";
import { readSessionBootstrap } from "../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { LastOutletTransition } from "../-last-outlet-transition";
import { styles } from "./-organization-home.stylex";

const organizationMenuMigrationStyles = stylex.create({
  item: {
    float: "left",
    fontSize: "14px",
    fontWeight: "bold",
    position: "relative",
  },
  link: {
    display: "inline-block",
    lineHeight: "30px",
    padding: { default: "5px 20px 4px", "@media (max-width: 767px)": "5px 12px 4px" },
    ":hover": {
      textDecoration: "none",
      color: "#fc491e",
      backgroundColor: "#dadada",
    },
  },
});

const organizationProjectCardMigrationStyles = stylex.create({
  // yona-original/app/assets/stylesheets/less/_page.less .all-projects .project.
  card: {
    borderBottomColor: "#DCDCDC",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    overflow: "hidden",
    padding: "15px 0 10px 0",
  },
});

export const Route = createFileRoute("/organizations/$organizationName")({
  component: OrganizationHomeRoute,
});

function OrganizationHomeRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <OrganizationNestedLayout runtimeConfig={runtimeConfig} />;
}

function OrganizationNestedLayout({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPullRequests = pathname === `/organizations/${organizationName}/pullrequests`;
  const isClosedPullRequests = pathname === `/organizations/${organizationName}/closedPullrequests`;
  const isSettings = pathname === `/organizations/${organizationName}/settingform`;
  const isDeleteForm = pathname === `/organizations/${organizationName}/deleteForm`;
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });

  if (!organizationQuery.data) {
    return null;
  }

  const organization = organizationQuery.data;
  const logoUrl =
    stringField(organization.logoUrl, "") ||
    prefixBasePath(runtimeConfig.basePath, "/legacy-assets/images/group_default.png");

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell
          projectSearchScope={isSettings || isDeleteForm ? undefined : { organizationName }}
          runtimeConfig={runtimeConfig}
          showLegacyProjectHeaderLinks
        >
          <OrganizationHeader
            enrollmentRequested={booleanField(organization.enrollmentRequested)}
            logoUrl={logoUrl}
            organizationName={organizationName}
            viewerCanEnroll={booleanField(organization.viewerCanEnroll)}
          />
          <OrganizationMenu
            active={
              isSettings || isDeleteForm
                ? "none"
                : isPullRequests || isClosedPullRequests
                  ? "pullrequests"
                  : pathname.endsWith("/issues")
                    ? "issues"
                    : pathname.endsWith("/boards")
                      ? "boards"
                      : "home"
            }
            organizationName={organizationName}
            viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
          />
          <title>{organizationName}</title>
          <LastOutletTransition routeId={Route.id} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

export function OrganizationHomeIndexScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const organizationQuery = useQuery({
    queryFn: () => readOrganizationContainerRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "container"],
  });

  if (!organizationQuery.data) {
    return null;
  }

  return (
    <OrganizationHomeScreen organization={organizationQuery.data} runtimeConfig={runtimeConfig} />
  );
}

function OrganizationHomeScreen({
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
  const [leaveModalTouched, setLeaveModalTouched] = useState(false);
  const organizationName = stringField(organization.organizationName, "organization");
  const viewerCanLeave = booleanField(organization.viewerCanLeave);
  const viewerCanLeaveAfterValidation = optionalBooleanField(
    organization.viewerCanLeaveAfterValidation,
    viewerCanLeave,
  );
  const viewerCanUpdate = booleanField(organization.viewerCanUpdate);
  const showLeaveButton = viewerCanLeave && viewerCanLeaveAfterValidation;
  const shouldShowMemberPanels = viewerCanUpdate || viewerCanLeave;

  function insulateLeaveModalClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function openLeaveModal(event: MouseEvent<HTMLButtonElement>) {
    insulateLeaveModalClick(event);
    setLeaveModalTouched(true);
    setLeaveModalOpen(true);
  }

  function dismissLeaveModal(event: MouseEvent<HTMLElement>) {
    insulateLeaveModalClick(event);
    setLeaveModalOpen(false);
  }

  function submitLeave(event: MouseEvent<HTMLButtonElement>) {
    insulateLeaveModalClick(event);
    leaveMutation.mutate();
  }

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      try {
        return await restFetch<OrganizationRedirectResult>(
          runtimeConfig,
          `/organizations/${encodeURIComponent(organizationName)}/leave`,
          {
            csrfToken,
            method: "DELETE",
          },
        );
      } catch (error) {
        if (error instanceof RestApiError && (error.status === 404 || error.status === 405)) {
          return leaveOrganizationRest(runtimeConfig, csrfToken, organizationName);
        }
        throw error;
      }
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
  const leaveModalStyleProps = leaveModalOpen ? stylex.props(styles.leaveModalVisible) : undefined;

  return (
    <>
      <title>{organizationName}</title>
      <div
        className={`${stylex.props(styles.home).className} page-wrap-outer`}
        data-stylex-owner="organization-home-page"
      >
        <div className="project-page-wrap">
          <div
            className={`${stylex.props(styles.projectHomeHeader).className} project-home-header row-fluid`}
            data-stylex-owner="organization-home-header"
          >
            <div className="span9 span-hard-wrap">
              <div
                className={`${stylex.props(styles.overview).className} project-overview`}
                data-stylex-owner="organization-home-overview"
              >
                <h3 className={stylex.props(styles.overviewTitle).className}>
                  <span id="project-description">{stringField(organization.description, "")}</span>
                </h3>
              </div>
              <div
                className="project-search-wrap row-fluid mt10"
                data-stylex-owner="organization-home-search"
              >
                <div className="span7">
                  <div className="search-bar">
                    <input
                      name="mylist-filter"
                      id="mylist-filter"
                      className="textbox full"
                      type="text"
                      defaultValue=""
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
              <ul
                className={`${stylex.props(styles.projects).className} all-projects`}
                data-stylex-owner="organization-home-projects"
              >
                {organization.visibleProjects.map((project) => (
                  <OrganizationProject
                    filter={projectFilter}
                    key={`${stringField(project.ownerName, "")}/${stringField(project.projectName, "")}`}
                    project={project}
                  />
                ))}
              </ul>
            </div>
            <div className="span3 span-hard-wrap" data-stylex-owner="organization-home-members">
              {shouldShowMemberPanels ? (
                <>
                  <MemberPanel
                    members={organization.adminMembers}
                    onLeaveClick={openLeaveModal}
                    showLeave={showLeaveButton && viewerCanUpdate}
                    title={t("user.role.org_admin")}
                  />
                  <MemberPanel
                    className="bubble-wrap gray project-home mt10"
                    members={organization.memberMembers}
                    onLeaveClick={openLeaveModal}
                    showLeave={showLeaveButton && !viewerCanUpdate}
                    title={t("user.role.org_member")}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div
        id="alertLeave"
        {...leaveModalStyleProps}
        className={`${leaveModalOpen ? "modal hide in" : "modal hide"} ${leaveModalStyleProps?.className ?? ""}`.trim()}
        data-stylex-owner="organization-home-leave-modal"
        aria-hidden={leaveModalOpen ? false : leaveModalTouched ? true : undefined}
      >
        <div className="modal-header">
          <button type="button" className="close" onClick={dismissLeaveModal}>
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
            onClick={submitLeave}
          >
            {t("button.yes")}
          </button>
          <button type="button" className="ybtn ybtn-mini" onClick={dismissLeaveModal}>
            {t("button.no")}
          </button>
        </div>
      </div>
      {leaveModalOpen ? (
        <button
          type="button"
          aria-label={t("button.close")}
          className="modal-backdrop in"
          onClick={dismissLeaveModal}
        ></button>
      ) : null}
    </>
  );
}

function OrganizationProject({ filter, project }: { filter: string; project: YoramRecord }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(project.ownerName, "");
  const projectName = stringField(project.projectName, "");
  const originOwnerName = stringField(project.originOwnerName, "");
  const originProjectName = stringField(project.originProjectName, "");
  const projectScope = stringField(project.projectScope, "").toLowerCase();
  const isPrivate = booleanField(project.isPrivate) || projectScope === "private";
  const isProtected = booleanField(project.isProtected) || projectScope === "protected";
  const createdLabel = stringField(project.createdLabel, "");
  const lastPushedLabel = stringField(project.lastPushedLabel, "");
  const projectLogoUrl = stringField(project.logoUrl, "").trim();
  const dataValue = `${projectName} ${stringField(project.overview, "")}`;
  const normalizedFilter = filter.trim().toLowerCase();
  const hidden = normalizedFilter ? !dataValue.toLowerCase().includes(normalizedFilter) : false;

  return (
    <li
      className="project"
      data-item="project-item"
      data-value={dataValue}
      {...stylex.props(
        styles.project,
        organizationProjectCardMigrationStyles.card,
        hidden && styles.projectHidden,
      )}
      data-stylex-owner="organization-home-project-filter-item"
    >
      <div className="info-wrap">
        <div
          className={`${stylex.props(styles.projectCardOwnerAvatar).className} owner-avatar-wrap hide-in-mobile`}
          data-stylex-owner="organization-home-project-card-owner-avatar"
        >
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
            {projectLogoUrl ? <img src={projectLogoUrl} alt={`${projectName}.name`} /> : null}
          </Link>
        </div>
        <div
          className={stylex.props(styles.projectInfo).className}
          data-stylex-owner="organization-home-project-info"
        >
          <div
            className={`${stylex.props(styles.projectCardHeader).className} header`}
            data-stylex-owner="organization-home-project-card-header"
          >
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
            {originOwnerName && originProjectName ? (
              <span
                className={stylex.props(styles.smallFont, styles.projectOrigin).className}
                data-stylex-owner="organization-home-project-origin"
              >
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
                  className="origin-title"
                  params={{ ownerName: originOwnerName, projectName: originProjectName }}
                  search={{}}
                  to="/$ownerName/$projectName"
                >
                  <i className="yobicon-split"></i>
                  {`${originOwnerName} / ${originProjectName}`}
                </Link>
              </span>
            ) : null}
            {isPrivate ? <i className="yobicon-lock yobicon-small"></i> : null}
            {isProtected ? (
              <span
                className={`${stylex.props(styles.projectVisibilityBadge).className} project-protected`}
                data-stylex-owner="organization-project-protected-badge"
                title="Group Project"
              >
                G
              </span>
            ) : null}
          </div>
          <div
            className={`${stylex.props(styles.projectCardDescription).className} desc`}
            data-stylex-owner="organization-home-project-card-description"
          >
            {stringField(project.overview, "")}
          </div>
          <p
            className={`${stylex.props(styles.projectCardNameTag).className} name-tag`}
            data-stylex-owner="organization-home-project-card-name-tag"
          >
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
              <span
                {...stylex.props(styles.smallFont)}
                data-stylex-owner="organization-home-project-code-update"
              >
                , {t("project.codeUpdate")}{" "}
                <strong title={stringField(project.lastPushedTitle, lastPushedLabel)}>
                  {lastPushedLabel}
                </strong>
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div
        className={`${stylex.props(styles.projectCardStats).className} stats-wrap pull-right`}
        data-stylex-owner="organization-home-project-card-stats"
      >
        <div className="members">
          <ul className="unstyled"></ul>
          <p>
            <i className="yobicon-friends yobicon-middle"></i>
            <strong>{numberField(project.memberCount)}</strong>
            <i className="yobicon-eye"></i> <strong>{numberField(project.watchCount)}</strong>
            <i
              className={`yobicon-lightbulb ${booleanField(project.isWatching) ? "ramp-on" : "ramp-off"}`}
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
  className = "bubble-wrap gray project-home",
  members,
  onLeaveClick,
  showLeave,
  title,
}: {
  className?: string;
  members: YoramUserItem[];
  onLeaveClick: (event: MouseEvent<HTMLButtonElement>) => void;
  showLeave: boolean;
  title: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div
      {...stylex.props(styles.memberPanel)}
      className={`${className} ${stylex.props(styles.memberPanel).className ?? ""}`.trim()}
      data-stylex-owner="organization-home-members-panel"
    >
      <div
        {...stylex.props(styles.memberPanelInner)}
        className={`inner member-info ${stylex.props(styles.memberPanelInner).className ?? ""}`.trim()}
        data-stylex-owner="organization-home-members-panel-inner"
      >
        <header
          className={stylex.props(styles.memberPanelHeader).className}
          data-stylex-owner="organization-home-members-panel-header"
        >
          <h3
            className={stylex.props(styles.memberPanelTitle).className}
            data-stylex-owner="organization-home-members-panel-title"
          >
            {title}
          </h3>
          {showLeave ? (
            <button
              type="button"
              className="ybtn ybtn-minimum ybtn-danger pull-right"
              id="groupLeaveBtn"
              onClick={onLeaveClick}
            >
              {t("organization.member.leave")}
            </button>
          ) : null}
        </header>
        <div className={className.includes("mt10") ? "member-wrap" : "member-wrap "}>
          <ul
            {...stylex.props(styles.memberList)}
            className={`${className.includes("mt10") ? "unstyled project-members" : "project-members"} ${stylex.props(styles.memberList).className ?? ""}`.trim()}
            data-stylex-owner="organization-home-members-list"
          >
            {members.map((member, index) => (
              <li
                {...stylex.props(
                  styles.member,
                  index === 0 ? styles.memberFirst : undefined,
                  index === members.length - 1 ? styles.memberLast : undefined,
                )}
                className={`member ${
                  stylex.props(
                    styles.member,
                    index === 0 ? styles.memberFirst : undefined,
                    index === members.length - 1 ? styles.memberLast : undefined,
                  ).className ?? ""
                }`.trim()}
                data-stylex-owner="organization-home-member"
                key={stringField(member.loginId, "")}
              >
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
  const headerStyleProps = stylex.props(
    styles.headerShell,
    styles.headerBackground(`url('${logoUrl}')`),
  );
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
    <div
      {...headerStyleProps}
      className={`project-header-outer ${headerStyleProps.className ?? ""}`.trim()}
      data-stylex-owner="organization-profile-header-background"
    >
      <div
        className={`${stylex.props(styles.headerInner).className} project-header-inner`}
        data-stylex-owner="organization-header-inner"
      >
        <div
          className={`${stylex.props(styles.headerWrap).className} project-header-wrap`}
          data-stylex-owner="organization-header-wrap"
        >
          <div
            className={`${stylex.props(styles.headerAvatar).className} project-header-avatar`}
            data-stylex-owner="organization-header-avatar"
          >
            <img src={logoUrl} alt="" />
          </div>
          <div
            className={`${stylex.props(styles.headerBreadcrumb).className} project-breadcrumb-wrap`}
            data-stylex-owner="organization-header-breadcrumb"
          >
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
            <div
              className={`${stylex.props(styles.projectUtilWrap).className} project-util-wrap`}
              data-stylex-owner="organization-header-util-wrap"
            >
              <ul
                className={`${stylex.props(styles.projectUtil).className} project-util`}
                data-stylex-owner="organization-header-util"
              >
                <li
                  className={`${stylex.props(styles.projectUtilItem).className}${enrollmentDropdownOpen ? " open" : ""}`}
                  data-stylex-owner="organization-header-util-item"
                >
                  <button
                    className={`ybtn ybtn-small ${enrollmentRequested ? "ybtn-info " : ""}dropdown-toggle`}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
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
  active?: "home" | "issues" | "boards" | "pullrequests" | "none";
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div
      className={`${stylex.props(styles.menuShell).className} project-menu-outer`}
      data-stylex-owner="organization-menu-shell"
    >
      <div className="project-menu-inner">
        <ul
          className={`${stylex.props(styles.projectMenuGroup).className} project-menu-nav project-menu-gruop`}
          data-stylex-owner="organization-menu-group"
        >
          <li
            className={`${stylex.props(organizationMenuMigrationStyles.item).className} ${active === "home" ? "active" : ""}`.trim()}
          >
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
              {...stylex.props(organizationMenuMigrationStyles.link)}
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
          <li
            className={`${stylex.props(organizationMenuMigrationStyles.item).className} ${active === "issues" ? "active" : ""}`.trim()}
          >
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
              {...stylex.props(organizationMenuMigrationStyles.link)}
              params={{ organizationName }}
              search={{
                assigneeId: "",
                authorId: "",
                filter: "",
                mentionId: "",
                orderBy: "updatedDate",
                orderDir: "desc",
                pageNum: 1,
                projectNames: [],
                state: "open",
              }}
              to="/organizations/$organizationName/issues"
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li
            className={`${stylex.props(organizationMenuMigrationStyles.item).className} ${active === "boards" ? "active" : ""}`.trim()}
          >
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
              {...stylex.props(organizationMenuMigrationStyles.link)}
              params={{ organizationName }}
              search={{
                filter: "",
                orderBy: "updatedDate",
                orderDir: "desc",
                pageNum: 1,
                projectNames: [],
              }}
              to="/organizations/$organizationName/boards"
            >
              {t("menu.board")}
            </Link>
          </li>
          <li
            className={`${stylex.props(organizationMenuMigrationStyles.item).className} ${active === "pullrequests" ? "active" : ""}`.trim()}
          >
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
              {...stylex.props(organizationMenuMigrationStyles.link)}
              params={{ organizationName }}
              search={{ filter: "", pageNum: 1 }}
              to="/organizations/$organizationName/pullrequests"
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div
          className={`${stylex.props(styles.projectSetting).className} project-setting`}
          data-stylex-owner="organization-menu-setting"
        >
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

function isOrganizationSearchLayoutState(search: string) {
  const params = new URLSearchParams(search);
  const keyword = params.get("keyword");
  const searchType = params.get("searchType");
  return (
    keyword !== null &&
    keyword.length > 0 &&
    [
      "auto",
      "issue",
      "user",
      "project",
      "post",
      "milestone",
      "issue_comment",
      "post_comment",
      "review",
    ].includes(searchType ?? "")
  );
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
