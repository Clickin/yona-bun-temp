import * as React from "react";
import { LEGACY_DEFAULT_LANGUAGE, lookupLegacyMessage, type TranslateOptions } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { WorkspaceOverviewViewModel } from "./-view-models";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function issueHref(ownerName: string, projectName: string, issueNumber: number): string {
  return `/${ownerName}/${projectName}/issue/${issueNumber}`;
}

function projectHref(ownerName: string, projectName: string): string {
  return `/${ownerName}/${projectName}`;
}

function pullRequestHref(
  ownerName: string,
  projectName: string,
  pullRequestNumber: number,
): string {
  return `/${ownerName}/${projectName}/pullRequest/${pullRequestNumber}`;
}

type LegacyMessageLookup = (key: string, options?: TranslateOptions) => string;

function legacyMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  fallback = key,
): string {
  return messages
    ? messages(key, { fallback })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { fallback });
}

export function workspaceAvatarDataUrl(label: string): string {
  const initialsParts: string[] = [];
  for (const part of label.split(/\s+/u)) {
    const initial = part.trim()[0];
    if (initial) {
      initialsParts.push(initial);
    }
    if (initialsParts.length === 2) {
      break;
    }
  }
  const initials = initialsParts.join("").toUpperCase() || "Y";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#d9dde4"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="42" fill="#3b4552">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveWorkspaceAvatarUrl(
  avatarUrl: null | string | undefined,
  fallbackLabel: string,
): string {
  const trimmedAvatarUrl = avatarUrl?.trim() ?? "";
  if (trimmedAvatarUrl !== "") {
    return trimmedAvatarUrl;
  }
  return workspaceAvatarDataUrl(fallbackLabel);
}

function WorkspaceProviderBadge({
  provider,
  runtimeConfig,
}: {
  provider: string;
  runtimeConfig: RuntimeConfig;
}) {
  const normalized = provider.trim().toLowerCase();
  switch (normalized) {
    case "github":
      return (
        <span className="github">
          <svg aria-hidden="true" height="24" viewBox="0 0 16 16" width="19">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59 0.4 0.07 0.55-0.17 0.55-0.38 0-0.19-0.01-0.82-0.01-1.49-2.01 0.37-2.53-0.49-2.69-0.94-0.09-0.23-0.48-0.94-0.82-1.13-0.28-0.15-0.68-0.52-0.01-0.53 0.63-0.01 1.08 0.58 1.23 0.82 0.72 1.21 1.87 0.87 2.33 0.66 0.07-0.52 0.28-0.87 0.51-1.07-1.78-0.2-3.64-0.89-3.64-3.95 0-0.87 0.31-1.59 0.82-2.15-0.08-0.2-0.36-1.02 0.08-2.12 0 0 0.67-0.21 2.2 0.82 0.64-0.18 1.32-0.27 2-0.27 0.68 0 1.36 0.09 2 0.27 1.53-1.04 2.2-0.82 2.2-0.82 0.44 1.1 0.16 1.92 0.08 2.12 0.51 0.56 0.82 1.27 0.82 2.15 0 3.07-1.87 3.75-3.65 3.95 0.29 0.25 0.54 0.73 0.54 1.48 0 1.07-0.01 1.93-0.01 2.2 0 0.21 0.15 0.46 0.55 0.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z" />
          </svg>
        </span>
      );
    case "google":
      return (
        <span className="google">
          <img
            alt="Google"
            src={appHref(
              runtimeConfig,
              "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
            )}
          />
        </span>
      );
    default:
      return <span className={normalized}>{normalized}</span>;
  }
}

function publicProfileSelectedTab(routeHref: string): "issues" | "projects" | "pullRequests" {
  try {
    const selected = new URL(routeHref, "http://yona.local").searchParams.get("selected");
    if (selected === "projects" || selected === "pullRequests") {
      return selected;
    }
  } catch {
    return "issues";
  }
  return "issues";
}

export function PublicUserProfilePage(props: {
  messages?: LegacyMessageLookup;
  profileOverview: WorkspaceOverviewViewModel | null;
  routeHref: string;
  runtimeConfig: RuntimeConfig;
  viewerCanEditProfile?: boolean;
}) {
  const overview = props.profileOverview;
  const daysAgo = overview?.daysAgo ?? 14;
  const issueItems = overview?.issueItems ?? [];
  const memberProjects = overview?.memberProjects ?? [];
  const pullRequestItems = overview?.pullRequestItems ?? [];
  const profile = overview?.profile ?? {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: "",
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    primaryEmailAddress: "",
    sinceLabel: "",
  };
  const headlineName =
    profile.englishName.trim() ||
    profile.displayName.trim() ||
    profile.loginId.trim() ||
    "User.anonymous.name";
  const [activeIssueTab, setActiveIssueTab] = React.useState<"closed" | "open">("open");
  const [activeTab, setActiveTab] = React.useState<"issues" | "projects" | "pullRequests">(() =>
    publicProfileSelectedTab(props.routeHref),
  );
  const issueTabLabel = legacyMessage(props.messages, "menu.issue");
  const pullRequestTabLabel = legacyMessage(props.messages, "menu.pullRequest");
  const projectsTabLabel = legacyMessage(props.messages, "project.projects");
  const daysAgoPrefixLabel = legacyMessage(props.messages, "userinfo.daysAgo.prefix");
  const daysAgoSuffixLabel = legacyMessage(props.messages, "userinfo.daysAgo.suffix");
  const noIssueLabel = `${daysAgoPrefixLabel} ${legacyMessage(props.messages, "issue.is.empty")}`;
  const noPullRequestLabel = `${daysAgoPrefixLabel} ${legacyMessage(
    props.messages,
    "pullRequest.is.empty",
  )}`;
  const noAuthorLabel = legacyMessage(props.messages, "issue.noAuthor");
  const projectCodeUpdateLabel = legacyMessage(props.messages, "project.codeUpdate");
  const openIssueStateLabel = legacyMessage(props.messages, "issue.state.open");
  const closedIssueStateLabel = legacyMessage(props.messages, "issue.state.closed");
  const twoColumnModeLabel = legacyMessage(props.messages, "common.two.column.mode");
  const twoColumnModeDescription = legacyMessage(props.messages, "common.two.column.mode.desc");
  const twoColumnViewLabel = legacyMessage(props.messages, "common.two.column.view");
  const showSubtasksLabel = legacyMessage(props.messages, "common.show.subtasks");
  const showSubtasksDescription = legacyMessage(props.messages, "common.show.subtasks.desc");
  const openIssues = issueItems.filter((item) => item.state === "open");
  const closedIssues = issueItems.filter((item) => item.state !== "open");
  const resolvedAvatarUrl = resolveWorkspaceAvatarUrl(profile.avatarUrl, headlineName);
  const showUserEmail = props.runtimeConfig.showUserEmail !== false;

  return (
    <main className="app-shell user-profile-page">
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{profile.displayName || headlineName}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <section className="user-box">
            <div className="user-info-box">
              <div
                className="whoami-wrap"
                style={{ backgroundImage: `url('${resolvedAvatarUrl}')` }}
              >
                {profile.isGuest ? (
                  <div className="guest-user">
                    <span className="left-mark">OUR GUEST</span>
                  </div>
                ) : null}
              </div>
              <div className="whoami usf-group">
                <span className="name">{headlineName}</span>
                <span className="loginid">{profile.loginId ? `@${profile.loginId}` : ""}</span>
                {showUserEmail && profile.primaryEmailAddress ? (
                  <span className="email">{profile.primaryEmailAddress}</span>
                ) : null}
                {props.viewerCanEditProfile ? (
                  <div className="edit">
                    <a
                      className="ybtn ybtn-default ybtn-mini"
                      href={appHref(props.runtimeConfig, "/user/editform")}
                    >
                      <i className="yobicon-edit"></i>{" "}
                      {legacyMessage(props.messages, "userinfo.editProfile")}
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="user-status">
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
                {profile.isBlocked ? <span className="badge label-important">BLOCKED</span> : null}
              </div>
              {profile.sinceLabel ? (
                <div className="user-since">
                  <strong>{legacyMessage(props.messages, "userinfo.since")}</strong>
                  <span className="since">{profile.sinceLabel}</span>
                </div>
              ) : null}
              <div className="user-since">
                <div>
                  <strong>{legacyMessage(props.messages, "user.connected.social.login")}</strong>
                </div>
                <div className="auth-provider-logo">
                  {profile.connectedSocialProviders.map((provider) => (
                    <WorkspaceProviderBadge
                      key={provider}
                      provider={provider}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="user-stream-box">
              <div className="pull-right">
                <span>{daysAgoPrefixLabel}</span>
                <input
                  className="input-mini-min"
                  id="daysAgoBtn"
                  max={99}
                  min={1}
                  name="daysAgo"
                  readOnly
                  type="number"
                  value={daysAgo}
                />
                <span>{daysAgoSuffixLabel}</span>
              </div>
              <ul className="nav nav-tabs">
                <li className={activeTab === "issues" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#issues"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("issues");
                    }}
                  >
                    {`${issueTabLabel} `}
                    <span className="num-badge">{issueItems.length}</span>
                  </a>
                </li>
                <li className={activeTab === "pullRequests" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#pullRequests"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("pullRequests");
                    }}
                  >
                    {`${pullRequestTabLabel} `}
                    <span className="num-badge">{pullRequestItems.length}</span>
                  </a>
                </li>
                <li className={activeTab === "projects" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#projects"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("projects");
                    }}
                  >
                    {`${projectsTabLabel} `}
                    <span className="num-badge">{memberProjects.length}</span>
                  </a>
                </li>
                <li>
                  <div
                    className="two-column-icon mr10 hide-in-mobile"
                    data-content={twoColumnModeDescription}
                    id="two-column-mode-checkbox"
                    title={twoColumnModeLabel}
                  >
                    <label className="checkbox" aria-label={twoColumnViewLabel}>
                      <div className="two-column-icon-border">
                        <input id="two-column-mode" type="checkbox" />
                        <span className="two-column-mode-text">{twoColumnViewLabel}</span>
                      </div>
                    </label>
                  </div>
                </li>
              </ul>

              <div className="tab-content">
                <div
                  className={`tab-pane ${activeTab === "issues" ? "active" : ""}`}
                  hidden={activeTab !== "issues"}
                  id="issues"
                >
                  <ul className="nav nav-tabs nm">
                    <li className={activeIssueTab === "open" ? "active" : undefined}>
                      <a
                        data-toggle="tab"
                        href="#openIssues"
                        onClick={(event) => {
                          event.preventDefault();
                          setActiveIssueTab("open");
                        }}
                      >
                        {`${openIssueStateLabel} `}
                        <span className="num-badge">{openIssues.length}</span>
                      </a>
                    </li>
                    <li className={activeIssueTab === "closed" ? "active" : undefined}>
                      <a
                        data-toggle="tab"
                        href="#closedIssues"
                        onClick={(event) => {
                          event.preventDefault();
                          setActiveIssueTab("closed");
                        }}
                      >
                        {`${closedIssueStateLabel} `}
                        <span className="num-badge">{closedIssues.length}</span>
                      </a>
                    </li>
                    <li className="show-subtasks-li">
                      <div
                        className="show-subtasks mr10"
                        data-content={showSubtasksDescription}
                        data-placement="top"
                        data-toggle="popover"
                        data-trigger="hover"
                        id="two-column-mode-checkbox"
                        title={showSubtasksLabel}
                      >
                        <label className="checkbox" aria-label={showSubtasksLabel}>
                          <div className="show-subtasks-button-border">
                            <input id="toggle-show-subtasks" type="checkbox" />
                            <span className="show-subtasks-text">{showSubtasksLabel}</span>
                          </div>
                        </label>
                      </div>
                    </li>
                  </ul>
                  <div className="tab-content">
                    <div
                      className={`tab-pane ${activeIssueTab === "open" ? "active" : ""}`}
                      hidden={activeIssueTab !== "open"}
                      id="openIssues"
                    >
                      {issueItems.length === 0 ? (
                        <div className="error-wrap">
                          <p>{noIssueLabel}</p>
                        </div>
                      ) : (
                        <PublicProfileIssueItems
                          items={openIssues}
                          messages={props.messages}
                          runtimeConfig={props.runtimeConfig}
                        />
                      )}
                    </div>
                    <div
                      className={`tab-pane ${activeIssueTab === "closed" ? "active" : ""}`}
                      hidden={activeIssueTab !== "closed"}
                      id="closedIssues"
                    >
                      {issueItems.length === 0 ? (
                        <div className="error-wrap">
                          <p>{noIssueLabel}</p>
                        </div>
                      ) : (
                        <PublicProfileIssueItems
                          items={closedIssues}
                          messages={props.messages}
                          runtimeConfig={props.runtimeConfig}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  hidden={activeTab !== "pullRequests"}
                  id="pullRequests"
                >
                  {pullRequestItems.length === 0 ? (
                    <div className="error-wrap">
                      <p>{noPullRequestLabel}</p>
                    </div>
                  ) : (
                    <ul className="post-list-wrap row-fluid">
                      {pullRequestItems.map((pullRequest) => (
                        <li
                          className="post-item"
                          key={`${pullRequest.ownerName}/${pullRequest.projectName}/${pullRequest.pullRequestNumber}`}
                        >
                          <div className="span10">
                            <a
                              className="avatar-wrap mlarge"
                              href={appHref(
                                props.runtimeConfig,
                                projectHref(pullRequest.ownerName, pullRequest.projectName),
                              )}
                            >
                              <img
                                alt={`${pullRequest.ownerName} / ${pullRequest.projectName}`}
                                src={resolveWorkspaceAvatarUrl("", pullRequest.projectName)}
                              />
                            </a>
                            <div className="title-wrap">
                              <a
                                className="title project"
                                href={appHref(
                                  props.runtimeConfig,
                                  projectHref(pullRequest.ownerName, pullRequest.projectName),
                                )}
                              >
                                {pullRequest.projectName}
                              </a>
                              <span className="post-id">{pullRequest.pullRequestNumber}</span>
                              <a
                                className="title"
                                href={appHref(
                                  props.runtimeConfig,
                                  pullRequestHref(
                                    pullRequest.ownerName,
                                    pullRequest.projectName,
                                    pullRequest.pullRequestNumber,
                                  ),
                                )}
                              >
                                {pullRequest.title}
                              </a>
                            </div>
                            <div className="infos">
                              {pullRequest.contributorLabel ? (
                                <span
                                  className="infos-item infos-link-item"
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  title={pullRequest.contributorLabel}
                                >
                                  {pullRequest.contributorLabel}
                                </span>
                              ) : (
                                <span className="infos-item">{noAuthorLabel}</span>
                              )}
                              <span className="infos-item" title={pullRequest.updatedLabel}>
                                {pullRequest.updatedLabel}
                              </span>
                              {pullRequest.commentCount > 0 ? (
                                <a
                                  className="infos-item infos-icon-link"
                                  href={appHref(
                                    props.runtimeConfig,
                                    `${pullRequestHref(
                                      pullRequest.ownerName,
                                      pullRequest.projectName,
                                      pullRequest.pullRequestNumber,
                                    )}#comments`,
                                  )}
                                >
                                  <i className="yobicon-comments"></i>
                                  <span className="size">{pullRequest.commentCount}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <div className="span2">
                            <div className="mt5 pull-right">
                              {pullRequest.receiverLabel ? (
                                <a
                                  className="avatar-wrap assinee"
                                  data-placement="top"
                                  data-original-title={pullRequest.receiverLabel}
                                  data-toggle="tooltip"
                                  href={prefixBasePath(props.runtimeConfig.basePath, "/")}
                                  title=""
                                >
                                  <img
                                    alt={pullRequest.receiverLabel}
                                    height={32}
                                    src={resolveWorkspaceAvatarUrl("", pullRequest.receiverLabel)}
                                    width={32}
                                  />
                                </a>
                              ) : (
                                <div className="empty-avatar-wrap">&nbsp;</div>
                              )}
                            </div>
                            <div className={`state ${pullRequest.state} pull-right`}>
                              {legacyMessage(
                                props.messages,
                                `pullRequest.state.${pullRequest.state}`,
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className={`tab-pane ${activeTab === "projects" ? "active" : ""}`}
                  hidden={activeTab !== "projects"}
                  id="projects"
                >
                  {memberProjects.length === 0 ? (
                    <div className="error-wrap">
                      <p>{legacyMessage(props.messages, "project.is.empty")}</p>
                    </div>
                  ) : (
                    <ul className="user-streams all-projects">
                      {memberProjects.map((project) => (
                        <li className="project" key={`${project.ownerName}/${project.projectName}`}>
                          <div className="info-wrap">
                            <div className="pull-left">
                              <a
                                className="avatar-wrap small"
                                href={appHref(
                                  props.runtimeConfig,
                                  projectHref(project.ownerName, project.projectName),
                                )}
                              >
                                {project.projectName.slice(0, 1).toUpperCase()}
                              </a>
                            </div>
                            <div className="pull-left">
                              <div className="header">
                                <a
                                  className="project-name"
                                  href={appHref(
                                    props.runtimeConfig,
                                    projectHref(project.ownerName, project.projectName),
                                  )}
                                >
                                  {project.projectName}
                                </a>
                                {project.projectScope === "private" ? (
                                  <i className="yobicon-lock yobicon-small" />
                                ) : null}
                              </div>
                              <div className="desc">{project.overview}</div>
                              <div className="name-tag">
                                <i className="yobicon-friends yobicon-middle" />
                                <strong>{project.memberCount}</strong>{" "}
                                <a
                                  className="owner-name-small"
                                  href={appHref(props.runtimeConfig, `/${project.ownerName}`)}
                                >
                                  {project.ownerName}
                                </a>{" "}
                                <span title={project.createdLabel}>{project.createdLabel}</span>{" "}
                                {project.lastPushedLabel ? (
                                  <>
                                    <span>, {projectCodeUpdateLabel} </span>
                                    <span title={project.lastPushedLabel}>
                                      {project.lastPushedLabel}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="stats-wrap pull-right">
                            <div className="stats">
                              <span className="num-badge">{project.watchCount}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PublicProfileIssueItems(props: {
  items: NonNullable<WorkspaceOverviewViewModel["issueItems"]>;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <ul className="post-list-wrap my-issues row-fluid">
      {props.items.map((issue) => {
        const issueUrl = appHref(
          props.runtimeConfig,
          issueHref(issue.ownerName, issue.projectName, issue.issueNumber),
        );
        return (
          <li
            className="post-item title"
            data-href={issueUrl}
            id={`issue-item-${issue.ownerName}-${issue.projectName}-${issue.issueNumber}`}
            key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
          >
            <div className="span12 span-hard-wrap">
              <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
                <span className="infos-item project-name">
                  <a
                    className="title project"
                    data-placement="bottom"
                    data-toggle="tooltip"
                    href={appHref(
                      props.runtimeConfig,
                      projectHref(issue.ownerName, issue.projectName),
                    )}
                    title={legacyMessage(props.messages, "project.name")}
                  >
                    {issue.projectName}
                  </a>
                </span>
                <span className="infos-item post-id">#{issue.issueNumber}</span>
              </div>
              <div className="title-wrap span5">
                <span className="title-cell">
                  <a className="title" href={issueUrl}>
                    {issue.title}
                  </a>
                  {issue.commentCount > 0 ? (
                    <span className="item-count-groups">
                      <a className="num-comments" href={`${issueUrl}#comments`}>
                        {issue.commentCount}
                      </a>
                    </span>
                  ) : null}
                  <span className="for-subtask-progressbar"></span>
                  <div className="child-issue-list hide"></div>
                </span>
              </div>
              <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
                <PublicProfileIssuePersonCell
                  emptyLabel="issue.noAuthor"
                  label={issue.authorLabel}
                  messages={props.messages}
                />
              </div>
              <div className="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list">
                <PublicProfileIssuePersonCell label={issue.assigneeLabel} />
              </div>
              <div className="infos span3 meta">
                <span className="meta-cell">
                  <span className="hide show-in-mobile">
                    <span className="infos-item">{issue.assigneeLabel || ""}</span>
                  </span>
                  <span
                    className="infos-item"
                    data-placement="bottom"
                    data-toggle="tooltip"
                    title={issue.updatedLabel || ""}
                  >
                    {issue.updatedLabel || "unknown"}
                  </span>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PublicProfileIssuePersonCell({
  emptyLabel = "",
  label,
  messages,
}: {
  emptyLabel?: string;
  label: string;
  messages?: LegacyMessageLookup;
}) {
  if (!label) {
    return (
      <span className="infos-item">{emptyLabel ? legacyMessage(messages, emptyLabel) : ""}</span>
    );
  }
  return (
    <span
      className="infos-item infos-link-item author-cell"
      data-placement="bottom"
      data-toggle="tooltip"
      title={label}
    >
      {label}
    </span>
  );
}

export function WorkspacePage(props: {
  messages?: LegacyMessageLookup;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  workspaceOverview: WorkspaceOverviewViewModel | null;
}) {
  const session = props.workspaceOverview?.session ?? {
    defaultLandingPath: "/me",
    emailAddress: "anonymous@yona.invalid",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "User.anonymous.name",
  };
  const daysAgo = props.workspaceOverview?.daysAgo ?? 14;
  const issueItems = props.workspaceOverview?.issueItems ?? [];
  const memberProjects = props.workspaceOverview?.memberProjects ?? [];
  const profile = props.workspaceOverview?.profile ?? {
    connectedSocialProviders: [],
    displayName: session.userLabel,
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: session.isSiteAdmin,
    loginId: session.loginId,
    primaryEmailAddress: session.emailAddress,
    sinceLabel: "",
    avatarUrl: "",
  };
  const pullRequestItems = props.workspaceOverview?.pullRequestItems ?? [];
  const openIssues = issueItems.filter((item) => item.state === "open");
  const closedIssues = issueItems.filter((item) => item.state !== "open");
  const profileDisplayName = profile.displayName.trim();
  const profileEnglishName = profile.englishName.trim();
  const headlineName =
    profileEnglishName || profileDisplayName || session.userLabel || session.loginId;
  const showDisplayName = profileDisplayName !== "" && profileDisplayName !== headlineName;
  const [activeIssueTab, setActiveIssueTab] = React.useState<"closed" | "open">("open");
  const [activeTab, setActiveTab] = React.useState<"issues" | "projects" | "pullRequests">(
    "issues",
  );
  const issueTabLabel = legacyMessage(props.messages, "menu.issue");
  const pullRequestTabLabel = legacyMessage(props.messages, "menu.pullRequest");
  const projectsTabLabel = legacyMessage(props.messages, "project.projects");
  const daysAgoPrefixLabel = legacyMessage(props.messages, "userinfo.daysAgo.prefix");
  const daysAgoSuffixLabel = legacyMessage(props.messages, "userinfo.daysAgo.suffix");
  const noIssueLabel = `${daysAgoPrefixLabel} ${legacyMessage(props.messages, "issue.is.empty")}`;
  const noPullRequestLabel = `${daysAgoPrefixLabel} ${legacyMessage(
    props.messages,
    "pullRequest.is.empty",
  )}`;
  const noAuthorLabel = legacyMessage(props.messages, "issue.noAuthor");
  const projectCodeUpdateLabel = legacyMessage(props.messages, "project.codeUpdate");
  const openIssueStateLabel = legacyMessage(props.messages, "issue.state.open");
  const closedIssueStateLabel = legacyMessage(props.messages, "issue.state.closed");
  const resolvedAvatarUrl = resolveWorkspaceAvatarUrl(profile.avatarUrl, headlineName);
  const profileEmailAddress = profile.primaryEmailAddress || session.emailAddress;
  const showUserEmail = props.runtimeConfig.showUserEmail !== false;

  return (
    <main>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{profile.displayName || session.userLabel || session.loginId}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <section className="user-box">
            <div className="user-info-box runtime-grid">
              <div
                className="whoami-wrap"
                style={{ backgroundImage: `url('${resolvedAvatarUrl}')` }}
              >
                {profile.isGuest ? (
                  <div className="guest-user">
                    <span className="left-mark">OUR GUEST</span>
                  </div>
                ) : null}
              </div>
              <div className="whoami">
                <span className="name">{headlineName}</span>
                {showDisplayName ? <span className="lede">{profile.displayName}</span> : null}
                <span className="loginid">{`@${profile.loginId || session.loginId}`}</span>
                {showUserEmail && profileEmailAddress ? (
                  <span className="email">{profileEmailAddress}</span>
                ) : null}
              </div>
              <div className="edit">
                <a
                  className="ybtn ybtn-default ybtn-mini"
                  href={appHref(props.runtimeConfig, "/user/editform")}
                >
                  <i className="yobicon-edit"></i>{" "}
                  {legacyMessage(props.messages, "userinfo.editProfile")}
                </a>
              </div>
              <div className="user-status">
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
                {profile.isBlocked ? <span className="badge label-important">BLOCKED</span> : null}
              </div>
              {profile.sinceLabel ? (
                <div className="user-since">
                  <strong>{legacyMessage(props.messages, "userinfo.since")}</strong>
                  <span className="since">{profile.sinceLabel}</span>
                </div>
              ) : null}
              <div className="user-since">
                <div>
                  <strong>{legacyMessage(props.messages, "user.connected.social.login")}</strong>
                </div>
                <div className="auth-provider-logo">
                  {profile.connectedSocialProviders.map((provider) => (
                    <WorkspaceProviderBadge
                      key={provider}
                      provider={provider}
                      runtimeConfig={props.runtimeConfig}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="user-stream-box">
              <div className="pull-right">
                <span>{daysAgoPrefixLabel}</span>
                <input
                  className="input-mini-min"
                  id="daysAgoBtn"
                  max={99}
                  min={1}
                  name="daysAgo"
                  readOnly
                  type="number"
                  value={daysAgo}
                />
                <span>{daysAgoSuffixLabel}</span>
              </div>
              <ul className="nav nav-tabs">
                <li className={activeTab === "issues" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#issues"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("issues");
                    }}
                  >
                    {`${issueTabLabel} `}
                    <span className="num-badge">{issueItems.length}</span>
                  </a>
                </li>
                <li className={activeTab === "pullRequests" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#pullRequests"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("pullRequests");
                    }}
                  >
                    {`${pullRequestTabLabel} `}
                    <span className="num-badge">{pullRequestItems.length}</span>
                  </a>
                </li>
                <li className={activeTab === "projects" ? "active" : undefined}>
                  <a
                    data-toggle="tab"
                    href="#projects"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveTab("projects");
                    }}
                  >
                    {`${projectsTabLabel} `}
                    <span className="num-badge">{memberProjects.length}</span>
                  </a>
                </li>
              </ul>
              <div className="tab-content">
                <div
                  className={`tab-pane ${activeTab === "issues" ? "active" : ""}`}
                  hidden={activeTab !== "issues"}
                  id="issues"
                >
                  <ul className="nav nav-tabs nm">
                    <li className={activeIssueTab === "open" ? "active" : undefined}>
                      <a
                        data-toggle="tab"
                        href="#openIssues"
                        onClick={(event) => {
                          event.preventDefault();
                          setActiveIssueTab("open");
                        }}
                      >
                        {`${openIssueStateLabel} `}
                        <span className="num-badge">{openIssues.length}</span>
                      </a>
                    </li>
                    <li className={activeIssueTab === "closed" ? "active" : undefined}>
                      <a
                        data-toggle="tab"
                        href="#closedIssues"
                        onClick={(event) => {
                          event.preventDefault();
                          setActiveIssueTab("closed");
                        }}
                      >
                        {`${closedIssueStateLabel} `}
                        <span className="num-badge">{closedIssues.length}</span>
                      </a>
                    </li>
                    <li>
                      <span className="show-subtasks">
                        <input id="show-subtasks" type="checkbox" />
                      </span>
                    </li>
                  </ul>
                  <div className="tab-content">
                    <div
                      className={`tab-pane ${activeIssueTab === "open" ? "active" : ""}`}
                      hidden={activeIssueTab !== "open"}
                      id="openIssues"
                    >
                      {issueItems.length === 0 ? (
                        <div className="error-wrap">
                          <p>{noIssueLabel}</p>
                        </div>
                      ) : (
                        <PublicProfileIssueItems
                          items={openIssues}
                          messages={props.messages}
                          runtimeConfig={props.runtimeConfig}
                        />
                      )}
                    </div>
                    <div
                      className={`tab-pane ${activeIssueTab === "closed" ? "active" : ""}`}
                      hidden={activeIssueTab !== "closed"}
                      id="closedIssues"
                    >
                      {issueItems.length === 0 ? (
                        <div className="error-wrap">
                          <p>{noIssueLabel}</p>
                        </div>
                      ) : (
                        <PublicProfileIssueItems
                          items={closedIssues}
                          messages={props.messages}
                          runtimeConfig={props.runtimeConfig}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  hidden={activeTab !== "pullRequests"}
                  id="pullRequests"
                >
                  {pullRequestItems.length === 0 ? (
                    <div className="error-wrap">
                      <p>{noPullRequestLabel}</p>
                    </div>
                  ) : (
                    <ul className="post-list-wrap row-fluid">
                      {pullRequestItems.map((pullRequest) => (
                        <li
                          className="post-item"
                          key={`${pullRequest.ownerName}/${pullRequest.projectName}/${pullRequest.pullRequestNumber}`}
                        >
                          <div className="span10">
                            <a
                              className="avatar-wrap mlarge"
                              href={appHref(
                                props.runtimeConfig,
                                projectHref(pullRequest.ownerName, pullRequest.projectName),
                              )}
                            >
                              <img
                                alt={`${pullRequest.ownerName} / ${pullRequest.projectName}`}
                                src={resolveWorkspaceAvatarUrl("", pullRequest.projectName)}
                              />
                            </a>
                            <div className="title-wrap">
                              <a
                                className="title project"
                                href={appHref(
                                  props.runtimeConfig,
                                  projectHref(pullRequest.ownerName, pullRequest.projectName),
                                )}
                              >
                                {pullRequest.projectName}
                              </a>
                              <span className="post-id">{pullRequest.pullRequestNumber}</span>
                              <a
                                className="title"
                                href={appHref(
                                  props.runtimeConfig,
                                  pullRequestHref(
                                    pullRequest.ownerName,
                                    pullRequest.projectName,
                                    pullRequest.pullRequestNumber,
                                  ),
                                )}
                              >
                                {pullRequest.title}
                              </a>
                            </div>
                            <div className="infos">
                              {pullRequest.contributorLabel ? (
                                <span
                                  className="infos-item infos-link-item"
                                  data-placement="top"
                                  data-toggle="tooltip"
                                  title={pullRequest.contributorLabel}
                                >
                                  {pullRequest.contributorLabel}
                                </span>
                              ) : (
                                <span className="infos-item">{noAuthorLabel}</span>
                              )}
                              <span className="infos-item" title={pullRequest.updatedLabel}>
                                {pullRequest.updatedLabel}
                              </span>
                              {pullRequest.commentCount > 0 ? (
                                <a
                                  className="infos-item infos-icon-link"
                                  href={appHref(
                                    props.runtimeConfig,
                                    `${pullRequestHref(
                                      pullRequest.ownerName,
                                      pullRequest.projectName,
                                      pullRequest.pullRequestNumber,
                                    )}#comments`,
                                  )}
                                >
                                  <i className="yobicon-comments"></i>
                                  <span className="size">{pullRequest.commentCount}</span>
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <div className="span2">
                            <div className="mt5 pull-right">
                              {pullRequest.receiverLabel ? (
                                <a
                                  className="avatar-wrap assinee"
                                  data-placement="top"
                                  data-original-title={pullRequest.receiverLabel}
                                  data-toggle="tooltip"
                                  href={prefixBasePath(props.runtimeConfig.basePath, "/")}
                                  title=""
                                >
                                  <img
                                    alt={pullRequest.receiverLabel}
                                    height={32}
                                    src={resolveWorkspaceAvatarUrl("", pullRequest.receiverLabel)}
                                    width={32}
                                  />
                                </a>
                              ) : (
                                <div className="empty-avatar-wrap">&nbsp;</div>
                              )}
                            </div>
                            <div className={`state ${pullRequest.state} pull-right`}>
                              {legacyMessage(
                                props.messages,
                                `pullRequest.state.${pullRequest.state}`,
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className={`tab-pane ${activeTab === "projects" ? "active" : ""}`}
                  hidden={activeTab !== "projects"}
                  id="projects"
                >
                  {memberProjects.length === 0 ? (
                    <div className="error-wrap">
                      <p>{legacyMessage(props.messages, "project.is.empty")}</p>
                    </div>
                  ) : (
                    <ul className="user-streams all-projects">
                      {memberProjects.map((project) => (
                        <li className="project" key={`${project.ownerName}/${project.projectName}`}>
                          <div className="info-wrap">
                            <div className="header">
                              <a
                                className="project-name"
                                href={appHref(
                                  props.runtimeConfig,
                                  projectHref(project.ownerName, project.projectName),
                                )}
                              >
                                {project.projectName}
                              </a>
                            </div>
                            <div className="desc">{project.overview}</div>
                            <div className="name-tag">
                              <i className="yobicon-friends yobicon-middle" />
                              <strong>{project.memberCount}</strong>{" "}
                              <a
                                className="owner-name-small"
                                href={appHref(props.runtimeConfig, `/${project.ownerName}`)}
                              >
                                {project.ownerName}
                              </a>{" "}
                              <span title={project.createdLabel}>{project.createdLabel}</span>{" "}
                              {project.lastPushedLabel ? (
                                <>
                                  <span>, {projectCodeUpdateLabel} </span>
                                  <span title={project.lastPushedLabel}>
                                    {project.lastPushedLabel}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <div className="stats-wrap pull-right">
                              <div className="stats">
                                <span className="num-badge">{project.watchCount}</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
