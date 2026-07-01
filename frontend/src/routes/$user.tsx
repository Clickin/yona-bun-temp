import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import type { LiHTMLAttributes } from "react";
import { RestApiError } from "../api/rest-client";
import { readPublicUserProfileQueryOptions, type PublicUserProfileResponse } from "../api/users";
import type {
  WorkspaceIssueItem,
  WorkspaceMemberProjectItem,
  WorkspaceProfile,
  WorkspacePullRequestItem,
  YonaLabel,
  YonaRecord,
} from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type PublicProfileSearch = {
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
};

export const Route = createFileRoute("/$user")({
  component: PublicProfileRoute,
  validateSearch(search: Record<string, unknown>): PublicProfileSearch {
    const daysAgo = Number(search.daysAgo);
    const selected = stringSearch(search.selected, "issues");
    return {
      daysAgo: Number.isFinite(daysAgo) && daysAgo > 0 ? daysAgo : 14,
      selected: isProfileTab(selected) ? selected : "issues",
    };
  },
});

function PublicProfileRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <PublicProfileScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function PublicProfileScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { user } = Route.useParams();
  const search = Route.useSearch();
  const profileQuery = useQuery(
    readPublicUserProfileQueryOptions(runtimeConfig, {
      daysAgo: search.daysAgo,
      loginId: user,
      selected: search.selected,
    }),
  );
  const redirectPath = profileQuery.data?.redirectPath;

  if (profileQuery.error instanceof RestApiError && profileQuery.error.status === 404) {
    return <PublicProfileNotFoundPage runtimeConfig={runtimeConfig} />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} />;
  }

  if (!profileQuery.data) {
    return <SiteLayoutShell runtimeConfig={runtimeConfig}>{null}</SiteLayoutShell>;
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <PublicProfileBody
        daysAgo={search.daysAgo}
        profileResponse={profileQuery.data}
        runtimeConfig={runtimeConfig}
        selected={search.selected}
      />
    </SiteLayoutShell>
  );
}

function PublicProfileNotFoundPage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const basePath = runtimeConfig.basePath;
  const homeHref = basePath === "/" ? "/" : `${basePath}/`;
  const siteName = runtimeConfig.siteName ?? "Yona";

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <a href={homeHref} className="logo">
            <h1 className="blind">{siteName}</h1>
          </a>
          <ul className="gnb-nav">
            <li>
              <a href={prefixBasePath(basePath, "/projects")}>{t("title.projectList")}</a>
            </li>
            <li>
              <a href={prefixBasePath(basePath, "/_help")}>{t("title.help")}</a>
            </li>
            <li>
              <a href="https://github.com/nforge/yobi/issues?state=open" target="_blank">
                {t("title.yobi.feedback")}
              </a>
            </li>
          </ul>
          <ul className="gnb-usermenu">
            <li className="gnb-usermenu-item" id="required-logged-in">
              <a
                href={prefixBasePath(basePath, "/users/loginform")}
                className="user-item-btn"
                data-login="required"
              >
                {t("button.login")}
              </a>
            </li>
            <li className="divider"></li>
            <li>
              <a href={prefixBasePath(basePath, "/users/signupform")} className="ybtn ybtn-success">
                {t("title.signup")}
              </a>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico ico-err2"></i>
            <p>{t("user.notExists.name")}</p>
            <a href={homeHref} className="ybtn ybtn-info">
              {t("menu.home")}
            </a>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            {"Copyright © "}
            <a href="http://navercorp.com/" target="_blank">
              NAVER Corp.
            </a>{" "}
            Supported by{" "}
            <a href="https://developers.naver.com/d2/" target="_blank" className="d2-program">
              <span className="d2">D2</span>
              <span className="program"> Program</span>
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}

function PublicProfileBody({
  daysAgo,
  profileResponse,
  runtimeConfig,
  selected,
}: {
  daysAgo: number;
  profileResponse: PublicUserProfileResponse;
  runtimeConfig: RuntimeConfig;
  selected: PublicProfileSearch["selected"];
}) {
  const { t } = useLegacyMessages();
  const [activeTab, setActiveTab] = useState(selected);
  const profile = profileResponse.profile;
  if (!profile) {
    return null;
  }
  const issues = profileResponse.issueItems;
  const openIssues = issues.filter((issue) => stringField(issue, "state") === "open");
  const closedIssues = issues.filter((issue) => stringField(issue, "state") === "closed");

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{profile.displayName}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <section className="user-box">
            <div className="user-info-box">
              <div
                className="whoami-wrap"
                style={{ backgroundImage: `url('${profile.avatarUrl}')` }}
              >
                {profile.isGuest ? (
                  <div className="guest-user">
                    <span className="left-mark">OUR GUEST</span>
                  </div>
                ) : null}
              </div>
              <div className="whoami usf-group">
                <span className="name">{profile.englishName}</span>
                <span className="loginid">@{profile.loginId}</span>
                {runtimeConfig.showUserEmail && profile.primaryEmailAddress ? (
                  <span className="email">{profile.primaryEmailAddress}</span>
                ) : null}
                {profileResponse.viewerCanEditProfile ? (
                  <div className="edit">
                    <a
                      href={prefixBasePath(runtimeConfig.basePath, "/user/editform")}
                      className="ybtn ybtn-default ybtn-mini"
                    >
                      <i className="yobicon-edit"></i> {t("userinfo.editProfile")}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="user-status">
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
              </div>
              <div className="user-status">
                {profile.isBlocked ? <span className="badge label-important">BLOCKED</span> : null}
              </div>
              <div className="user-since">
                <strong>{t("userinfo.since")}</strong>
                <span className="since">{profile.sinceLabel}</span>
              </div>
              <div className="user-since">
                <div>
                  <strong>{t("user.connected.social.login")}</strong>
                </div>
                <div className="auth-provider-logo"></div>
              </div>
            </div>

            {!profile.isGuest ? (
              <div className="user-stream-box">
                <div className="pull-right">
                  {t("userinfo.daysAgo.prefix")}
                  <input
                    id="daysAgoBtn"
                    name="daysAgo"
                    type="number"
                    min="1"
                    max="99"
                    className="input-mini-min"
                    defaultValue={daysAgo}
                    style={{ margin: "0px 5px", verticalAlign: "bottom" }}
                  />
                  {t("userinfo.daysAgo.suffix")}
                </div>

                <ul className="nav nav-tabs">
                  <ProfileTab
                    active={activeTab === "issues"}
                    badge={issues.length}
                    href="#issues"
                    label={t("menu.issue")}
                    onSelect={() => setActiveTab("issues")}
                  />
                  <ProfileTab
                    active={activeTab === "pullRequests"}
                    badge={profileResponse.pullRequestItems.length}
                    href="#pullRequests"
                    label={t("menu.pullRequest")}
                    onSelect={() => setActiveTab("pullRequests")}
                  />
                  <ProfileTab
                    active={activeTab === "projects"}
                    badge={profileResponse.memberProjects.length}
                    href="#projects"
                    label={t("project.projects")}
                    onSelect={() => setActiveTab("projects")}
                  />
                  <li>
                    <TwoColumnModeCheckbox />
                  </li>
                </ul>

                <div className="tab-content">
                  <div id="issues" className={`tab-pane ${activeTab === "issues" ? "active" : ""}`}>
                    <ul className="nav nav-tabs nm">
                      <li className="active">
                        <a href="#openIssues" data-toggle="tab">
                          {t("issue.state.open")}
                          <span className="num-badge">{openIssues.length}</span>
                        </a>
                      </li>
                      <li>
                        <a href="#closedIssues" data-toggle="tab">
                          {t("issue.state.closed")}
                          <span className="num-badge">{closedIssues.length}</span>
                        </a>
                      </li>
                      <li>
                        <ShowSubtasksCheckbox />
                      </li>
                    </ul>
                    <div className="tab-content">
                      <div id="openIssues" className="tab-pane active">
                        {issues.length === 0 ? (
                          <div className="error-wrap">
                            <p>{`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}</p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
                          {openIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                            />
                          ))}
                        </ul>
                      </div>
                      <div id="closedIssues" className="tab-pane">
                        {issues.length === 0 ? (
                          <div className="error-wrap">
                            <p>{`${t("userinfo.daysAgo.prefix")} ${t("issue.is.empty")}`}</p>
                          </div>
                        ) : null}
                        <ul className="post-list-wrap my-issues row-fluid">
                          {closedIssues.map((issue) => (
                            <ProfileIssueRow
                              basePath={runtimeConfig.basePath}
                              issue={issue}
                              key={issueKey(issue)}
                            />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div
                    id="pullRequests"
                    className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  >
                    {profileResponse.pullRequestItems.length === 0 ? (
                      <div className="error-wrap">
                        <p>{`${t("userinfo.daysAgo.prefix")} ${t("pullRequest.is.empty")}`}</p>
                      </div>
                    ) : null}
                    <ul className="post-list-wrap  row-fluid">
                      {profileResponse.pullRequestItems.map((pullRequest) => (
                        <ProfilePullRequestRow
                          basePath={runtimeConfig.basePath}
                          key={pullRequestKey(pullRequest)}
                          pullRequest={pullRequest}
                        />
                      ))}
                    </ul>
                  </div>
                  <div
                    id="projects"
                    className={`tab-pane ${activeTab === "projects" ? "active" : ""}`}
                  >
                    {profileResponse.memberProjects.length === 0 ? (
                      <div className="error-wrap">
                        <p>{t("project.is.empty")}</p>
                      </div>
                    ) : null}
                    <ul className="user-streams all-projects">
                      {profileResponse.memberProjects.map((project) => (
                        <ProfileProjectRow
                          basePath={runtimeConfig.basePath}
                          key={`${project.ownerName}/${project.projectName}`}
                          project={project}
                          subject={profile}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

function ProfileTab({
  active,
  badge,
  href,
  label,
  onSelect,
}: {
  active: boolean;
  badge: number;
  href: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <li className={active ? "active" : ""}>
      <a
        href={href}
        data-toggle="tab"
        onClick={(event) => {
          event.preventDefault();
          onSelect();
        }}
      >
        {label} {badge > 0 ? <span className="num-badge">{badge}</span> : null}
      </a>
    </li>
  );
}

function ProfileIssueRow({ basePath, issue }: { basePath: string; issue: WorkspaceIssueItem }) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(issue, "ownerName");
  const projectName = stringField(issue, "projectName");
  const issueNumber = numberField(issue, "issueNumber");
  const issueId = numberField(issue, "id", issueNumber);
  const projectHref = prefixBasePath(basePath, `/${ownerName}/${projectName}`);
  const issueHref = `${projectHref}/issue/${issueNumber}`;
  const labels = sortedWorkspaceIssueLabels(issue.labels ?? []);
  const milestoneId = numberField(issue, "milestoneId");
  const milestoneTitle = stringField(issue, "milestoneTitle");
  const dueDateLabel = stringField(issue, "dueDateLabel");
  const dueDateOverdue = Boolean(issue.dueDateOverdue);
  const legacyHref = { href: issueHref } as unknown as LiHTMLAttributes<HTMLLIElement>;

  return (
    <li className="post-item title" id={`issue-item-${issueId}`} {...legacyHref}>
      <div className="span12 span-hard-wrap">
        <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
          <span className="infos-item project-name">
            <a
              href={projectHref}
              className="title project"
              data-toggle="tooltip"
              data-placement="bottom"
              title={t("project.name")}
            >
              {projectName}
            </a>
          </span>
          <span className="infos-item post-id">#{issueNumber}</span>
        </div>
        <div className="title-wrap span5">
          <span className="title-cell">
            <a href={issueHref} className="title">
              {stringField(issue, "title")}
            </a>
            <ProfileIssueCommentCount issue={issue} issueHref={issueHref} />
            <span className="for-subtask-progressbar"></span>
            {labels.map((label) => (
              <a
                href={`${projectHref}/issues?state=open&labelIds=${String(label.id)}`}
                className="label issue-label list-label"
                data-label-id={String(label.id)}
                key={String(label.id)}
                style={{ background: label.color }}
              >
                {label.name}
              </a>
            ))}
            <div className="child-issue-list hide"></div>
          </span>
        </div>
        <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
          <ProfilePersonLink
            basePath={basePath}
            label={stringField(issue, "authorLabel")}
            loginId={stringField(issue, "authorLoginId")}
          />
        </div>
        <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
          <ProfilePersonLink
            basePath={basePath}
            label={stringField(issue, "assigneeLabel")}
            loginId={stringField(issue, "assigneeLoginId")}
          />
        </div>
        <div className="infos span3 meta">
          <span className="meta-cell">
            <span className="hide show-in-mobile">
              <ProfilePersonLink
                basePath={basePath}
                label={stringField(issue, "assigneeLabel")}
                loginId={stringField(issue, "assigneeLoginId")}
              />
            </span>
            <span
              className="infos-item"
              data-toggle="tooltip"
              data-placement="bottom"
              title={stringField(issue, "updatedLabel")}
            >
              {stringField(issue, "updatedLabel")}
            </span>
            {milestoneId > 0 && milestoneTitle ? (
              <span className="mileston-tag">
                <a
                  href={`${projectHref}/milestone/${milestoneId}`}
                  data-toggle="tooltip"
                  data-placement="bottom"
                  title={t("milestone")}
                >
                  {milestoneTitle}
                </a>
              </span>
            ) : null}
            {dueDateLabel ? (
              <span
                className={`pull-right ${dueDateOverdue ? "overdue" : ""}`}
                data-toggle="tooltip"
                data-placement="top"
                title={`${t("issue.dueDate")}: ${dueDateLabel}`}
              >
                <i className="yobicon-clock2"></i>
                {stringField(issue, "state") === "open" && dueDateOverdue
                  ? t("issue.dueDate.overdue")
                  : dueDateLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </li>
  );
}

function sortedWorkspaceIssueLabels(labels: YonaLabel[]) {
  return labels.slice().sort(compareIssueLabels);
}

function compareIssueLabels(left: YonaLabel, right: YonaLabel) {
  const categoryOrder = stringField(left.categoryName, "").localeCompare(
    stringField(right.categoryName, ""),
  );
  return categoryOrder || left.name.localeCompare(right.name);
}

function ProfileIssueCommentCount({
  issue,
  issueHref,
}: {
  issue: WorkspaceIssueItem;
  issueHref: string;
}) {
  const commentCount = numberField(issue, "commentCount");
  if (commentCount <= 0) {
    return null;
  }

  return (
    <span className="item-count-groups">
      <a href={`${issueHref}#comments`}>
        <span className="count-groups item-icon ">
          <i className="yobicon-comments"></i>
        </span>
        <span className="count-groups item-count ">{commentCount}</span>
      </a>
    </span>
  );
}

function ProfilePullRequestRow({
  basePath,
  pullRequest,
}: {
  basePath: string;
  pullRequest: WorkspacePullRequestItem;
}) {
  const { t } = useLegacyMessages();
  const ownerName = stringField(pullRequest, "ownerName");
  const projectName = stringField(pullRequest, "projectName");
  const number = numberField(pullRequest, "pullRequestNumber");
  const projectHref = prefixBasePath(basePath, `/${ownerName}/${projectName}`);
  const pullRequestHref = `${projectHref}/pullRequest/${number}`;
  const state = stringField(pullRequest, "state", "open").toLowerCase();
  const receiverLoginId = stringField(pullRequest, "receiverLoginId");
  const receiverLabel = stringField(pullRequest, "receiverLabel");
  const receiverAvatarUrl = stringField(
    pullRequest as unknown as YonaRecord,
    "receiverAvatarUrl",
    "/assets/images/default-avatar-32.png",
  );

  return (
    <li className="post-item">
      <div className="span10">
        <a href={projectHref} className="avatar-wrap mlarge">
          <img
            src={stringField(
              pullRequest as unknown as YonaRecord,
              "projectLogoUrl",
              "/assets/images/project_default_logo.png",
            )}
            alt={`${ownerName} / ${projectName}`}
          />
        </a>
        <div className="title-wrap">
          <a href={projectHref} className="title project">
            {projectName}
          </a>
          <span className="post-id">{number}</span>
          <a href={pullRequestHref} className="title ">
            {stringField(pullRequest, "title")}
          </a>
        </div>
        <div className="infos">
          <ProfileTextLink
            basePath={basePath}
            className="infos-item infos-link-item"
            label={stringField(pullRequest, "contributorLabel")}
            loginId={stringField(pullRequest, "contributorLoginId")}
            placement="top"
          />
          <span className="infos-item" title={stringField(pullRequest, "updatedLabel")}>
            {stringField(pullRequest, "updatedLabel")}
          </span>
          {numberField(pullRequest, "commentCount") > 0 ? (
            <a href={`${pullRequestHref}#comments`} className="infos-item infos-icon-link">
              <i className="yobicon-comments"></i>
              <span className="size">{numberField(pullRequest, "commentCount")}</span>
            </a>
          ) : null}
        </div>
      </div>
      <div className="span2">
        <div className="mt5 pull-right">
          {receiverLoginId ? (
            <a
              href={prefixBasePath(basePath, `/${receiverLoginId}`)}
              className="avatar-wrap assinee"
              data-toggle="tooltip"
              data-placement="top"
              title={receiverLabel}
            >
              <img src={receiverAvatarUrl} width="32" height="32" alt={receiverLabel} />
            </a>
          ) : (
            <div className="empty-avatar-wrap">&nbsp;</div>
          )}
        </div>
        <div className={`state ${state} pull-right`}>{t(`pullRequest.state.${state}`)}</div>
      </div>
    </li>
  );
}

function ProfileProjectRow({
  basePath,
  project,
  subject,
}: {
  basePath: string;
  project: WorkspaceMemberProjectItem;
  subject: WorkspaceProfile;
}) {
  const { t } = useLegacyMessages();
  const projectHref = prefixBasePath(basePath, `/${project.ownerName}/${project.projectName}`);
  const ownerHref = prefixBasePath(basePath, `/${project.ownerName}`);

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="pull-left">
          <a href={projectHref} className="avatar-wrap small">
            <img src={project.logoUrl || "/assets/images/project_default_logo.png"} alt="" />
          </a>
        </div>
        <div className="pull-left" style={{ marginLeft: "10px" }}>
          <div className="header">
            <a href={projectHref} className="project-name">
              {project.projectName}
            </a>
            {project.projectScope === "private" ? (
              <i className="yobicon-lock yobicon-small"></i>
            ) : null}
            {project.originOwnerName && project.originProjectName ? (
              <>
                <i className="yobicon-split yobicon-white vmiddle"></i>
                <span>
                  {" "}
                  <a
                    href={prefixBasePath(
                      basePath,
                      `/${project.originOwnerName}/${project.originProjectName}`,
                    )}
                  >
                    {project.originOwnerName}/{project.originProjectName}
                  </a>
                </span>
              </>
            ) : null}
          </div>
          <div className="desc">{project.overview}</div>
          <div className="name-tag">
            <i className="yobicon-friends yobicon-middle"></i>
            <strong>{project.memberCount}</strong>{" "}
            <a href={ownerHref} className="owner-name-small">
              {project.ownerName}
            </a>{" "}
            <span title={project.createdLabel}>{project.createdLabel}</span>
            {project.lastPushedLabel ? (
              <>
                , {t("project.codeUpdate")}{" "}
                <span title={project.lastPushedLabel}>{project.lastPushedLabel}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
      <div className="stats-wrap pull-right">
        <div className="stats">
          {project.viewerCanWatch ? (
            <a
              href={`${projectHref}/${project.isWatching ? "unwatch" : "watch"}`}
              className="ybtn watchBtn"
            >
              <i
                className={`yobicon-eye-${project.isWatching ? "open" : "close"} yobicon-middle yobicon-white`}
              ></i>
              {t(project.isWatching ? "notification.unwatch" : "notification.watch")}
              <span className="num-badge">{project.watchCount}</span>
            </a>
          ) : null}
          {project.viewerCanLeave ? (
            <a
              href={prefixBasePath(
                basePath,
                `/info/leave/${project.ownerName}/${project.projectName}`,
              )}
              data-projectname={project.projectName}
              className="nbtn black medium last leaveProject"
            >
              <i className="yobicon-trash"></i> {t("userinfo.leaveProject")}
            </a>
          ) : null}
          {subject.loginId === project.ownerName ? null : null}
        </div>
      </div>
    </li>
  );
}

function TwoColumnModeCheckbox() {
  const { t } = useLegacyMessages();

  return (
    <div
      className="two-column-icon mr10 hide-in-mobile"
      id="two-column-mode-checkbox"
      title={t("common.two.column.mode")}
      data-content={t("common.two.column.mode.desc")}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className="checkbox">
        <div className="two-column-icon-border">
          <input id="two-column-mode" type="checkbox" />
          <span className="two-column-mode-text">{t("common.two.column.view")}</span>
        </div>
      </label>
    </div>
  );
}

function ShowSubtasksCheckbox() {
  const { t } = useLegacyMessages();

  return (
    <div
      className="show-subtask-icon mr10 hide-in-mobile"
      id="show-subtasks-checkbox"
      title={t("common.show.subtasks")}
      data-content={t("common.show.subtasks.desc")}
    >
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- legacy template keeps this checkbox wrapper. */}
      <label className="checkbox">
        <input id="show-subtasks" type="checkbox" />
      </label>
    </div>
  );
}

function ProfilePersonLink({
  basePath,
  label,
  loginId,
}: {
  basePath: string;
  label: string;
  loginId: string;
}) {
  if (!loginId) {
    return <span className="infos-item"></span>;
  }
  return (
    <ProfileTextLink
      basePath={basePath}
      className="infos-item infos-link-item author-cell"
      label={label}
      loginId={loginId}
      placement="bottom"
    />
  );
}

function ProfileTextLink({
  basePath,
  className,
  label,
  loginId,
  placement,
}: {
  basePath: string;
  className: string;
  label: string;
  loginId: string;
  placement: "bottom" | "top";
}) {
  if (!loginId) {
    return <span className="infos-item"></span>;
  }
  return (
    <a
      href={prefixBasePath(basePath, `/${loginId}`)}
      className={className}
      data-toggle="tooltip"
      data-placement={placement}
      title={loginId}
    >
      {label || loginId}
    </a>
  );
}

function issueKey(issue: WorkspaceIssueItem) {
  return `${stringField(issue, "ownerName")}/${stringField(issue, "projectName")}/${numberField(
    issue,
    "issueNumber",
  )}`;
}

function pullRequestKey(pullRequest: WorkspacePullRequestItem) {
  return `${stringField(pullRequest, "ownerName")}/${stringField(
    pullRequest,
    "projectName",
  )}/${numberField(pullRequest, "pullRequestNumber")}`;
}

function isProfileTab(value: string): value is PublicProfileSearch["selected"] {
  return ["issues", "projects", "pullRequests"].includes(value);
}

function stringSearch(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function stringField(record: YonaRecord, key: string, fallback = "") {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function numberField(record: YonaRecord, key: string, fallback = 0) {
  const value = record[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
