import * as React from "react";
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

function Section({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function workspaceAvatarDataUrl(label: string): string {
  const initials =
    label
      .split(/\s+/u)
      .map((part) => part.trim()[0] ?? "")
      .filter((value) => value !== "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "Y";
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

function renderWorkspaceProviderBadge(provider: string): React.ReactNode {
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
          <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
            <path
              d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.6 3.1-4.1 3.1-7.2Z"
              fill="#4285F4"
            />
            <path
              d="M12 22c2.7 0 5-.9 6.7-2.5l-3.1-2.5c-.9.6-2 .9-3.6.9-2.7 0-5-1.8-5.8-4.3H3v2.6A10 10 0 0 0 12 22Z"
              fill="#34A853"
            />
            <path
              d="M6.2 13.6A6 6 0 0 1 5.9 12c0-.6.1-1.1.3-1.6V7.8H3A10 10 0 0 0 2 12c0 1.6.4 3.2 1 4.2l3.2-2.6Z"
              fill="#FBBC05"
            />
            <path
              d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 3.3 14.7 2.4 12 2.4A10 10 0 0 0 3 7.8l3.2 2.6C7 7.9 9.3 6.1 12 6.1Z"
              fill="#EA4335"
            />
          </svg>
        </span>
      );
    default:
      return <span className={normalized}>{normalized}</span>;
  }
}

export function WorkspacePage(props: {
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  workspaceOverview: WorkspaceOverviewViewModel | null;
  onSetDefaultLandingPath?: (path: string) => void;
  onSignOut?: () => void;
}) {
  const session = props.workspaceOverview?.session ?? {
    defaultLandingPath: "/me",
    emailAddress: "anonymous@yona.invalid",
    isAnonymous: true,
    isConfirmed: false,
    isSiteAdmin: false,
    loginId: "anonymous",
    userLabel: "Anonymous",
  };
  const daysAgo = props.workspaceOverview?.daysAgo ?? 14;
  const emails = props.workspaceOverview?.emails ?? [];
  const defaultLandingPath = props.workspaceOverview?.defaultLandingPath ?? "/me";
  const favoriteProjects = props.workspaceOverview?.favoriteProjects ?? [];
  const issueItems = props.workspaceOverview?.issueItems ?? [];
  const memberProjects = props.workspaceOverview?.memberProjects ?? [];
  const profile = props.workspaceOverview?.profile ?? {
    connectedSocialProviders: [],
    displayName: session.userLabel,
    englishName: "",
    isBlocked: false,
    isSiteAdmin: session.isSiteAdmin,
    loginId: session.loginId,
      primaryEmailAddress: session.emailAddress,
      sinceLabel: "",
      avatarUrl: "",
    };
  const pullRequestItems = props.workspaceOverview?.pullRequestItems ?? [];
  const recentProjects = props.workspaceOverview?.recentProjects ?? [];
  const watchedProjects = props.workspaceOverview?.watchedProjects ?? [];
  const openIssues = issueItems.filter((item) => item.state === "open");
  const closedIssues = issueItems.filter((item) => item.state !== "open");
  const profileDisplayName = profile.displayName.trim();
  const profileEnglishName = profile.englishName.trim();
  const headlineName =
    profileEnglishName || profileDisplayName || session.userLabel || session.loginId;
  const showDisplayName =
    profileDisplayName !== "" && profileDisplayName !== headlineName;
  const [activeIssueTab, setActiveIssueTab] = React.useState<"closed" | "open">("open");
  const [activeTab, setActiveTab] = React.useState<
    "issues" | "projects" | "pullRequests"
  >("issues");
  const [nextDefaultLandingPath, setNextDefaultLandingPath] =
    React.useState(defaultLandingPath);
  const resolvedAvatarUrl = resolveWorkspaceAvatarUrl(profile.avatarUrl, headlineName);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Workspace</p>
      <h1>{profile.displayName || session.userLabel || session.loginId}</h1>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <section className="user-box">
            <div className="user-info-box runtime-grid">
              <div
                className="whoami-wrap"
                style={{ backgroundImage: `url('${resolvedAvatarUrl}')` }}
              />
              <div className="whoami">
                <span className="name">{headlineName}</span>
                {showDisplayName ? <span className="lede">{profile.displayName}</span> : null}
                <span className="loginid">{`@${profile.loginId || session.loginId}`}</span>
                <span className="email">
                  {profile.primaryEmailAddress || session.emailAddress}
                </span>
              </div>
              <div className="edit">
                <a
                  className="ybtn ybtn-default ybtn-mini"
                  href={appHref(props.runtimeConfig, "/user/editform")}
                >
                  Edit Profile
                </a>
              </div>
              <div className="user-status">
                {profile.isSiteAdmin ? (
                  <span className="badge label-success">SITE ADMIN</span>
                ) : null}
                {profile.isBlocked ? (
                  <span className="badge label-important">BLOCKED</span>
                ) : null}
              </div>
              {profile.sinceLabel ? (
                <div className="user-since">
                  <strong>Since</strong>
                  <span className="since">{profile.sinceLabel}</span>
                </div>
              ) : null}
              <div className="user-since">
                <div>
                  <strong>Connected social login</strong>
                </div>
                {profile.connectedSocialProviders.length === 0 ? (
                  <p>No connected providers.</p>
                ) : (
                  <ul className="auth-provider-logo">
                    {profile.connectedSocialProviders.map((provider) => (
                      <li key={provider}>{renderWorkspaceProviderBadge(provider)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="user-stream-box">
              <div className="pull-right">
                <strong>Last {daysAgo} days</strong>
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
                    Issues <span className="num-badge">{issueItems.length}</span>
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
                    Pull Requests <span className="num-badge">{pullRequestItems.length}</span>
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
                    Projects <span className="num-badge">{memberProjects.length}</span>
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
                        Open Issues <span className="num-badge">{openIssues.length}</span>
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
                        Closed Issues <span className="num-badge">{closedIssues.length}</span>
                      </a>
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
                          <p>{`No issues found in the last ${daysAgo} days.`}</p>
                        </div>
                      ) : (
                        <ul className="post-list-wrap my-issues row-fluid">
                          {openIssues.map((issue) => (
                            <li
                              className="post-item title"
                              key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                            >
                              <div className="span12 span-hard-wrap">
                                <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
                                  <span className="infos-item project-name">
                                    <a
                                      className="title project"
                                      href={appHref(
                                        props.runtimeConfig,
                                        projectHref(issue.ownerName, issue.projectName),
                                      )}
                                    >
                                      {issue.projectName}
                                    </a>
                                  </span>
                                  <span className="infos-item post-id">
                                    #{issue.issueNumber}
                                  </span>
                                </div>
                                <div className="title-wrap span5">
                                  <span className="title-cell">
                                    <a
                                      className="title"
                                      href={appHref(
                                        props.runtimeConfig,
                                        issueHref(
                                          issue.ownerName,
                                          issue.projectName,
                                          issue.issueNumber,
                                        ),
                                      )}
                                    >
                                      {issue.title}
                                    </a>
                                  </span>
                                  <div className="infos">
                                    <span className="infos-item">{`Author: ${issue.authorLabel || "Unknown"}`}</span>
                                    <span className="infos-item">{`Assignee: ${issue.assigneeLabel || "none"}`}</span>
                                    <span className="infos-item">{`Comments: ${issue.commentCount}`}</span>
                                    <span className="infos-item">{`Updated ${issue.updatedLabel || "unknown"}`}</span>
                                    <span className="infos-item">{`State: ${issue.state}`}</span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div
                      className={`tab-pane ${activeIssueTab === "closed" ? "active" : ""}`}
                      hidden={activeIssueTab !== "closed"}
                      id="closedIssues"
                    >
                      {issueItems.length === 0 ? (
                        <div className="error-wrap">
                          <p>{`No issues found in the last ${daysAgo} days.`}</p>
                        </div>
                      ) : (
                        <ul className="post-list-wrap my-issues row-fluid">
                          {closedIssues.map((issue) => (
                            <li
                              className="post-item title"
                              key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                            >
                              <div className="span12 span-hard-wrap">
                                <div className="span2 project-name-in-my-issues fixed-height-my-issues-list">
                                  <span className="infos-item project-name">
                                    <a
                                      className="title project"
                                      href={appHref(
                                        props.runtimeConfig,
                                        projectHref(issue.ownerName, issue.projectName),
                                      )}
                                    >
                                      {issue.projectName}
                                    </a>
                                  </span>
                                  <span className="infos-item post-id">
                                    #{issue.issueNumber}
                                  </span>
                                </div>
                                <div className="title-wrap span5">
                                  <span className="title-cell">
                                    <a
                                      className="title"
                                      href={appHref(
                                        props.runtimeConfig,
                                        issueHref(
                                          issue.ownerName,
                                          issue.projectName,
                                          issue.issueNumber,
                                        ),
                                      )}
                                    >
                                      {issue.title}
                                    </a>
                                  </span>
                                  <div className="infos">
                                    <span className="infos-item">{`Author: ${issue.authorLabel || "Unknown"}`}</span>
                                    <span className="infos-item">{`Assignee: ${issue.assigneeLabel || "none"}`}</span>
                                    <span className="infos-item">{`Comments: ${issue.commentCount}`}</span>
                                    <span className="infos-item">{`Updated ${issue.updatedLabel || "unknown"}`}</span>
                                    <span className="infos-item">{`State: ${issue.state}`}</span>
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

                <div
                  className={`tab-pane ${activeTab === "pullRequests" ? "active" : ""}`}
                  hidden={activeTab !== "pullRequests"}
                  id="pullRequests"
                >
                  {pullRequestItems.length === 0 ? (
                    <div className="error-wrap">
                      <p>{`No pull requests found in the last ${daysAgo} days.`}</p>
                    </div>
                  ) : (
                    <ul className="post-list-wrap row-fluid">
                      {pullRequestItems.map((pullRequest) => (
                        <li
                          className="post-item"
                          key={`${pullRequest.ownerName}/${pullRequest.projectName}/${pullRequest.pullRequestNumber}`}
                        >
                          <div className="span10">
                            <div className="title-wrap">
                              <a
                                className="title project"
                                href={appHref(
                                  props.runtimeConfig,
                                  projectHref(
                                    pullRequest.ownerName,
                                    pullRequest.projectName,
                                  ),
                                )}
                              >
                                {pullRequest.projectName}
                              </a>
                              <span className="post-id">
                                #{pullRequest.pullRequestNumber}
                              </span>
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
                              <span className="infos-item">{`Contributor: ${pullRequest.contributorLabel || "Unknown"}`}</span>
                              <span className="infos-item">{`Reviewer: ${pullRequest.receiverLabel || "none"}`}</span>
                              <span className="infos-item">{`Comments: ${pullRequest.commentCount}`}</span>
                              <span className="infos-item">{`Updated ${pullRequest.updatedLabel || "unknown"}`}</span>
                              <span className="infos-item">{`State: ${pullRequest.state}`}</span>
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
                      <p>No projects found.</p>
                    </div>
                  ) : (
                    <ul className="user-streams all-projects">
                      {memberProjects.map((project) => (
                        <li
                          className="project"
                          key={`${project.ownerName}/${project.projectName}`}
                        >
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
                              <span>{`Owner: ${project.ownerName}`}</span>{" "}
                              <span>{`Created ${project.createdLabel || "unknown"}`}</span>{" "}
                              <span>{`Updated ${project.lastPushedLabel || "unknown"}`}</span>
                            </div>
                            <div className="stats-wrap">
                              <span className="infos-item">{`State: ${project.projectScope}`}</span>
                              <span className="infos-item">{`Members: ${project.memberCount}`}</span>
                              <span className="infos-item">{`Watchers: ${project.watchCount}`}</span>
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

          <dl className="runtime-grid">
            <div>
              <dt>default landing</dt>
              <dd>{defaultLandingPath}</dd>
            </div>
            <div>
              <dt>basePath</dt>
              <dd>{props.runtimeConfig.basePath}</dd>
            </div>
            <div>
              <dt>linked emails</dt>
              <dd>{emails.length}</dd>
            </div>
            <div>
              <dt>watched projects</dt>
              <dd>{watchedProjects.length}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Section title="Default landing">
        <form
          className="runtime-grid"
          onSubmit={(event) => {
            event.preventDefault();
            props.onSetDefaultLandingPath?.(nextDefaultLandingPath);
          }}
        >
          <label>
            <span>Path</span>
            <input
              name="defaultLandingPath"
              onChange={(event) => setNextDefaultLandingPath(event.target.value)}
              type="text"
              value={nextDefaultLandingPath}
            />
          </label>
          <button type="submit">
            {props.pending ? "Saving..." : "Save default landing"}
          </button>
        </form>
      </Section>
      <Section title="Favorite projects">
        {favoriteProjects.length === 0 ? (
          <p>No favorite projects yet.</p>
        ) : (
          <ul>
            {favoriteProjects.map((project) => (
              <li key={`${project.ownerName}/${project.projectName}`}>
                {`${project.ownerName}/${project.projectName}`}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Recent projects">
        {recentProjects.length === 0 ? (
          <p>No recent projects yet.</p>
        ) : (
          <ul>
            {recentProjects.map((project) => (
              <li key={`${project.ownerName}/${project.projectName}`}>
                {`${project.ownerName}/${project.projectName}`}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <button onClick={() => props.onSignOut?.()} type="button">
        Sign out
      </button>
    </main>
  );
}
