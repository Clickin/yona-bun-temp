import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { BoardPostDetail } from "../api/boards";
import type { ProjectMembersResponse, ProjectWatchersResponse } from "../api/org-project";
import type { ProjectDetailViewModel } from "./-view-models";

export function buildProjectHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return prefixBasePath(runtimeConfig.basePath, `/${ownerName}/${projectName}${normalizedSuffix}`);
}

export function ProjectMenu(props: {
  detail: ProjectDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;
  const menuItems = [
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName),
      label: "Home",
      show: true,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "code"),
      label: "Code",
      show: detail.showCode,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "issues"),
      label: `Issues ${detail.openIssueCount ?? 0}`,
      show: detail.showIssue,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "pullRequests"),
      label: `Pull requests ${detail.openPullRequestCount ?? 0}`,
      show: detail.showPullRequest,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "reviews"),
      label: `Reviews ${detail.reviewCount ?? 0}`,
      show: detail.showReview,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "milestones"),
      label: "Milestones",
      show: detail.showMilestone,
    },
    {
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "posts"),
      label: `Boards ${detail.boardCount ?? 0}`,
      show: detail.showBoard,
    },
  ];

  return (
    <nav aria-label="Project menu">
      {menuItems.flatMap((item) =>
        item.show
          ? [
              <a href={item.href} key={item.label}>
                {item.label}
              </a>,
            ]
          : [],
      )}
      {detail.showAdmin || detail.viewerCanUpdate ? (
        <a
          href={buildProjectHref(
            runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "settingform",
          )}
        >
          Settings
        </a>
      ) : null}
    </nav>
  );
}

export function ProjectNewPage(props: {
  onCreateProject?: (input: {
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
  }) => void;
  pending?: boolean;
}) {
  const [formState, setFormState] = React.useState({
    ownerName: "",
    overview: "",
    projectName: "",
    projectScope: "public",
  });

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Create project</h1>
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onCreateProject?.(formState);
        }}
      >
        <label>
          <span>Owner</span>
          <input
            name="ownerName"
            type="text"
            value={formState.ownerName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                ownerName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Project name</span>
          <input
            name="projectName"
            type="text"
            value={formState.projectName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                projectName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Overview</span>
          <textarea
            name="overview"
            value={formState.overview}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                overview: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Visibility</span>
          <select
            name="projectScope"
            value={formState.projectScope}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                projectScope: event.target.value,
              }))
            }
          >
            <option value="public">public</option>
            <option value="protected">protected</option>
            <option value="private">private</option>
          </select>
        </label>
        <button type="submit">{props.pending ? "Creating…" : "Create project"}</button>
      </form>
    </main>
  );
}

export function ProjectDetailPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  readmePost?: BoardPostDetail | null;
  runtimeConfig: RuntimeConfig;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
  onToggleProjectWatch?: (ownerName: string, projectName: string, watching: boolean) => void;
  onUpdateProjectOverview?: (ownerName: string, projectName: string, overview: string) => void;
}) {
  const detail = props.detail ?? {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: "",
    projectName: "",
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
  const [editingOverview, setEditingOverview] = React.useState(false);
  const [overviewDraft, setOverviewDraft] = React.useState(detail.overview);

  React.useEffect(() => {
    setOverviewDraft(detail.overview);
  }, [detail.overview]);

  const activeTab =
    detail.defaultTab === "history" || detail.defaultTab === "dashboard"
      ? detail.defaultTab
      : "readme";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{`${detail.ownerName} / ${detail.projectName}`}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      {detail.originOwnerName && detail.originProjectName ? (
        <p>{`Original project: ${detail.originOwnerName} / ${detail.originProjectName}`}</p>
      ) : null}
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <p>Scope: {detail.projectScope}</p>
      <section>
        <h2>Project actions</h2>
        <div className="runtime-grid">
          <button
            type="button"
            onClick={() => props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName)}
          >
            {detail.isFavorited ? "Unfavorite project" : "Favorite project"}
          </button>
          {detail.viewerCanWatch ? (
            <button
              type="button"
              onClick={() =>
                props.onToggleProjectWatch?.(
                  detail.ownerName,
                  detail.projectName,
                  !detail.isWatching,
                )
              }
            >
              {detail.isWatching ? "Unwatch project" : "Watch project"}
            </button>
          ) : null}
          {detail.viewerCanEnroll ? (
            detail.enrollmentRequested ? (
              <button
                type="button"
                onClick={() => props.onCancelEnrollProject?.(detail.ownerName, detail.projectName)}
              >
                Cancel enrollment request
              </button>
            ) : (
              <button
                type="button"
                onClick={() => props.onEnrollProject?.(detail.ownerName, detail.projectName)}
              >
                Request enrollment
              </button>
            )
          ) : null}
        </div>
      </section>
      <section>
        <h2>Watchers</h2>
        <a
          className="btn watcher-count no-border"
          href={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "watchers",
          )}
        >
          {detail.watchCount ?? 0}
        </a>
      </section>
      <section>
        <h2>Clone URL</h2>
        <input readOnly type="text" value={detail.cloneUrl ?? ""} />
      </section>
      <section>
        <h2>Overview</h2>
        {editingOverview ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              props.onUpdateProjectOverview?.(detail.ownerName, detail.projectName, overviewDraft);
              setEditingOverview(false);
            }}
          >
            <textarea
              name="overview"
              value={overviewDraft}
              onChange={(event) => setOverviewDraft(event.target.value)}
            />
            <button type="submit">Save overview</button>
            <button type="button" onClick={() => setEditingOverview(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p>{detail.overview || "No overview yet."}</p>
            {detail.overviewEditable ? (
              <button type="button" onClick={() => setEditingOverview(true)}>
                Edit overview
              </button>
            ) : null}
          </>
        )}
      </section>
      <section>
        <h2>Tabs</h2>
        <nav aria-label="Project home tabs">
          <a href={buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}>
            README
          </a>
          <a
            href={`${buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}?tabId=history`}
          >
            Recent history
          </a>
          <a
            href={`${buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName)}?tabId=dashboard`}
          >
            Dashboard
          </a>
        </nav>
        <div>
          {activeTab === "readme" ? (
            props.readmePost ? (
              <article className="board-view project-readme-post">
                <h3>{props.readmePost.title || "README"}</h3>
                <div dangerouslySetInnerHTML={{ __html: props.readmePost.bodyHtml }} />
              </article>
            ) : (
              <>
                <h3>README</h3>
                <p>No README post yet.</p>
              </>
            )
          ) : null}
          {activeTab === "history" ? (
            <>
              <h3>Recent history</h3>
              <p>Legacy placeholder panel while real history content stays outside Wave 2A.</p>
            </>
          ) : null}
          {activeTab === "dashboard" ? (
            <>
              <h3>Dashboard</h3>
              <p>Legacy placeholder panel while real dashboard content stays outside Wave 2A.</p>
            </>
          ) : null}
        </div>
      </section>
      <section>
        <h2>Members</h2>
        <ul>
          {(detail.members ?? []).map((member) => (
            <li key={member.loginId}>
              {member.userLabel} @{member.loginId} ({member.role})
            </li>
          ))}
        </ul>
      </section>
      {detail.currentMilestone ? (
        <section>
          <h2>Current milestone</h2>
          <p>{detail.currentMilestone.title}</p>
          <p>{detail.currentMilestone.dueDateLabel}</p>
          <p>{`Open issues: ${detail.currentMilestone.openIssueCount}`}</p>
          <p>{`Closed issues: ${detail.currentMilestone.closedIssueCount}`}</p>
          <p>{`Progress: ${detail.currentMilestone.completionPercent}%`}</p>
        </section>
      ) : null}
    </main>
  );
}

export function ProjectWatchersPage(props: {
  detail: ProjectWatchersResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
    ownerName: "",
    projectName: "",
    totalCount: 0,
    watchers: [],
  };

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h4>
            <strong>project.watcher.title</strong>
          </h4>
          <p>project.watcher.description</p>
          <ul className="members project row-fluid">
            {detail.watchers.map((watcher) => (
              <li className="member span6 span-hard-wrap" key={watcher.loginId}>
                <a
                  className="avatar-wrap mlarge pull-left mr10"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${watcher.loginId}`)}
                >
                  {watcher.avatarUrl ? (
                    <img
                      alt={`${watcher.userLabel || watcher.loginId} avatar`}
                      height={64}
                      src={watcher.avatarUrl}
                      width={64}
                    />
                  ) : null}
                </a>
                <div className="member-name">{watcher.userLabel || watcher.loginId}</div>
                <div className="member-id">{`@${watcher.loginId}`}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export function ProjectMembersPage(props: {
  detail: ProjectMembersResponse | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onAddMember?: (loginId: string) => void;
  onDeleteMember?: (userId: number) => void;
  onUpdateMemberRole?: (userId: number, role: string) => void;
}) {
  const detail = props.detail ?? {
    enrollmentRequests: [],
    members: [],
    ownerName: "",
    projectName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };
  const [loginId, setLoginId] = React.useState("");
  const memberPath = `/${detail.ownerName}/${detail.projectName}/members`;

  return (
    <main className="app-shell">
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="inner-bubble">
            <form
              action={prefixBasePath(props.runtimeConfig.basePath, memberPath)}
              className="nm"
              id="addNewMember"
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                props.onAddMember?.(loginId);
              }}
            >
              <input
                autoComplete="off"
                className="text uname"
                data-provider="typeahead"
                id="loginId"
                name="loginId"
                onChange={(event) => setLoginId(event.target.value)}
                pattern="^[a-zA-Z0-9-]+([_.][a-zA-Z0-9-]+)*$"
                placeholder="project.members.addMember"
                required
                title="user.wrongloginId.alert"
                type="text"
                value={loginId}
              />
              <button className="ybtn ybtn-success" type="submit">
                <i className="yobicon-addfriend" /> button.add
              </button>
            </form>
          </div>

          <ul className="members project row-fluid">
            {detail.members.map((member) => (
              <li className="member span6 span-hard-wrap" key={member.userId}>
                <a
                  className="avatar-wrap mlarge pull-left mr10"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${member.loginId}`)}
                >
                  {member.avatarUrl ? (
                    <img
                      alt={`${member.userLabel || member.loginId} avatar`}
                      height={64}
                      src={member.avatarUrl}
                      width={64}
                    />
                  ) : null}
                </a>
                <div className="member-name">{member.userLabel || member.loginId}</div>
                <div className="member-id">{`@${member.loginId}`}</div>
                <div className="member-setting">
                  {member.isOwner ? (
                    <span className="label owner">user.role.owner</span>
                  ) : (
                    <>
                      <div className="btn-group" data-name={`roleof-${member.loginId}`}>
                        <button
                          className="btn dropdown-toggle large"
                          data-toggle="dropdown"
                          type="button"
                        >
                          <span className="d-label">{`user.role.${member.role}`}</span>
                          <span className="d-caret">
                            <span className="caret" />
                          </span>
                        </button>
                        <ul className="dropdown-menu">
                          {detail.roleOptions.map((roleOption) => (
                            <li
                              className={roleOption.role === member.role ? "active" : undefined}
                              data-selected={roleOption.role === member.role ? "true" : undefined}
                              data-value={roleOption.role}
                              key={`${member.userId}-${roleOption.role}`}
                            >
                              <button
                                data-action="apply"
                                data-href={`/${detail.ownerName}/${detail.projectName}/member/${member.userId}/edit`}
                                data-loginid={member.loginId}
                                onClick={(event) => {
                                  event.preventDefault();
                                  props.onUpdateMemberRole?.(member.userId, roleOption.role);
                                }}
                                type="button"
                              >
                                {`user.role.${roleOption.label}`}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        className="ybtn ybtn-danger ybtn-small"
                        data-action="delete"
                        data-href={`/${detail.ownerName}/${detail.projectName}/member/${member.userId}/delete`}
                        onClick={(event) => {
                          event.preventDefault();
                          props.onDeleteMember?.(member.userId);
                        }}
                        type="button"
                      >
                        button.delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {detail.enrollmentRequests.length > 0 ? (
            <>
              <legend>
                <h3>{`project.member.enrollment.request (${detail.enrollmentRequests.length})`}</h3>
              </legend>
              <div className="row-fluid">
                {detail.enrollmentRequests.map((request) => (
                  <div className="span2" key={request.userId}>
                    <div className="pull-left mr10">
                      <a href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}>
                        {request.avatarUrl ? (
                          <img
                            alt={`${request.userLabel || request.loginId} avatar`}
                            className="img-circle"
                            height={65}
                            src={request.avatarUrl}
                            width={65}
                          />
                        ) : null}
                      </a>
                    </div>
                    <div className="pull-left project-member-enrollment-info">
                      <span>
                        <a
                          href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}
                        >
                          <strong>{request.userLabel || request.loginId}</strong>
                        </a>
                      </span>
                      <span>{`(${request.loginId})`}</span>
                      <button
                        className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
                        data-loginid={request.loginId}
                        onClick={() => props.onAddMember?.(request.loginId)}
                        type="button"
                      >
                        <i className="yobicon-addfriend" /> button.add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function ProjectSettingsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onUpdateProjectOverview?: (input: {
    overview: string;
    ownerName: string;
    projectName: string;
  }) => void;
}) {
  const detail = props.detail ?? {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: "",
    projectName: "",
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
  const [formState, setFormState] = React.useState({
    overview: detail.overview,
  });

  React.useEffect(() => {
    setFormState({
      overview: detail.overview,
    });
  }, [detail.overview]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Project settings</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onUpdateProjectOverview?.({
            overview: formState.overview,
            ownerName: detail.ownerName,
            projectName: detail.projectName,
          });
        }}
      >
        <label>
          <span>Project location</span>
          <input
            readOnly
            name="projectSlug"
            type="text"
            value={`${detail.ownerName}/${detail.projectName}`}
          />
        </label>
        <label>
          <span>Project name</span>
          <input name="projectName" readOnly type="text" value={detail.projectName} />
        </label>
        <label>
          <span>Overview</span>
          <textarea
            name="overview"
            value={formState.overview}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                overview: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Visibility</span>
          <input name="projectScope" readOnly type="text" value={detail.projectScope} />
        </label>
        <section>
          <h2>Menu settings</h2>
          <label>
            <input checked={detail.showCode ?? false} readOnly type="checkbox" />
            Code
          </label>
          <label>
            <input checked={detail.showIssue ?? false} readOnly type="checkbox" />
            Issues
          </label>
          <label>
            <input checked={detail.showPullRequest ?? false} readOnly type="checkbox" />
            Pull requests
          </label>
          <label>
            <input checked={detail.showReview ?? false} readOnly type="checkbox" />
            Reviews
          </label>
          <label>
            <input checked={detail.showMilestone ?? false} readOnly type="checkbox" />
            Milestones
          </label>
          <label>
            <input checked={detail.showBoard ?? false} readOnly type="checkbox" />
            Boards
          </label>
        </section>
        <p>Code access is members only: {(detail.codeMemberOnly ?? false) ? "Yes" : "No"}</p>
        <button type="submit">{props.pending ? "Saving…" : "Save project"}</button>
      </form>
    </main>
  );
}
