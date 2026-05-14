import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { BoardPostDetail } from "../api/boards";
import type {
  ProjectMember,
  ProjectWatcher,
  ProjectWebhook,
  ProjectWebhookInput,
  ProjectWebhookType,
  ReadProjectMembersResponse,
  ReadProjectWebhooksResponse,
} from "../api/org-project";
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
        <p>
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              "watchers",
            )}
          >
            {detail.watchCount ?? 0}
          </a>
        </p>
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
  detail: ProjectDetailViewModel | null | undefined;
  runtimeConfig: RuntimeConfig;
  watchers: ProjectWatcher[] | null | undefined;
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
  const watchers = props.watchers ?? [];

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h4>
            <strong>This project's watcher list.</strong>
          </h4>
          <p>* This list contains only those who can access this project.</p>
          <ul className="members project row-fluid">
            {watchers.map((watcher) => (
              <li className="member span6 span-hard-wrap" key={watcher.loginId}>
                <a
                  className="avatar-wrap mlarge pull-left mr10"
                  href={prefixBasePath(props.runtimeConfig.basePath, `/${watcher.loginId}`)}
                >
                  <img alt="" height="64" src={watcher.avatarUrl} width="64" />
                </a>
                <div className="member-name">{watcher.userLabel}</div>
                <div className="member-id">{`@${watcher.loginId}`}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

export function ProjectStatisticsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  runtimeConfig: RuntimeConfig;
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

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <h1>Under Construction</h1>
        </div>
      </div>
    </main>
  );
}

function projectMemberRoleLabel(response: ReadProjectMembersResponse, role: string): string {
  return response.roleOptions.find((option) => option.role === role)?.label ?? role;
}

function ProjectMemberAdminSubMenu(props: {
  detail: ProjectDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const membersHref = buildProjectHref(
    props.runtimeConfig,
    props.detail.ownerName,
    props.detail.projectName,
    "members",
  );
  const settingsHref = buildProjectHref(
    props.runtimeConfig,
    props.detail.ownerName,
    props.detail.projectName,
    "settingform",
  );
  const deleteHref = buildProjectHref(
    props.runtimeConfig,
    props.detail.ownerName,
    props.detail.projectName,
    "deleteform",
  );

  return (
    <aside className="lnb">
      <ul className="nav nav-tabs nav-stacked">
        <li className="active">
          <a href={membersHref} id="subMenuProjectMember">
            project.members
          </a>
        </li>
        <li>
          <a href={settingsHref} id="subMenuProjectSetting">
            Project settings
          </a>
        </li>
        <li>
          <a href={deleteHref} id="subMenuProjectDelete">
            Delete project
          </a>
        </li>
      </ul>
    </aside>
  );
}

function ProjectMemberCard(props: {
  detail: ProjectDetailViewModel;
  member: ProjectMember;
  pending?: boolean;
  response: ReadProjectMembersResponse;
  runtimeConfig: RuntimeConfig;
  onDeleteMember?: (member: ProjectMember) => void | Promise<void>;
  onUpdateMemberRole?: (member: ProjectMember, role: string) => void | Promise<void>;
}) {
  const memberHref = prefixBasePath(props.runtimeConfig.basePath, `/${props.member.loginId}`);
  const memberDeleteHref = buildProjectHref(
    props.runtimeConfig,
    props.detail.ownerName,
    props.detail.projectName,
    `members/${props.member.userId}/delete`,
  );
  const memberEditHref = buildProjectHref(
    props.runtimeConfig,
    props.detail.ownerName,
    props.detail.projectName,
    `member/${props.member.userId}/edit`,
  );
  const canMutate = props.response.permissions.canUpdate && !props.member.isOwner && !props.pending;

  return (
    <li className="member span6 span-hard-wrap">
      <a className="avatar-wrap mlarge pull-left mr10" href={memberHref}>
        <img alt="" height="64" src={props.member.avatarUrl} width="64" />
      </a>
      <div className="member-name">
        {props.member.userLabel}
        {props.member.isOwner ? <span className="label owner">owner</span> : null}
      </div>
      <div className="member-id">{`@${props.member.loginId}`}</div>
      {props.response.permissions.canUpdate && !props.member.isOwner ? (
        <div className="member-setting">
          <div className="btn-group" data-name={`roleof-${props.member.loginId}`}>
            <button className="dropdown-toggle large" disabled={props.pending} type="button">
              <span className="d-label">
                {projectMemberRoleLabel(props.response, props.member.role)}
              </span>
              <span className="d-caret" />
            </button>
            <ul className="dropdown-menu">
              {props.response.roleOptions.map((roleOption) => (
                <li key={`${props.member.userId}-${roleOption.role}`}>
                  <button
                    data-action="apply"
                    data-href={memberEditHref}
                    data-login-id={props.member.loginId}
                    data-role={roleOption.role}
                    disabled={!canMutate}
                    onClick={() => void props.onUpdateMemberRole?.(props.member, roleOption.role)}
                    type="button"
                  >
                    {roleOption.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button
            className="ybtn ybtn-danger ybtn-small"
            data-action="delete"
            data-href={memberDeleteHref}
            data-login-id={props.member.loginId}
            disabled={!canMutate}
            onClick={() => void props.onDeleteMember?.(props.member)}
            type="button"
          >
            Delete
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function ProjectMembersPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  onAddMember?: (loginId: string) => void | Promise<void>;
  onDeleteMember?: (member: ProjectMember) => void | Promise<void>;
  onUpdateMemberRole?: (member: ProjectMember, role: string) => void | Promise<void>;
  pending?: boolean;
  response: ReadProjectMembersResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
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
  const response = props.response ?? {
    enrollmentRequests: [],
    members: [],
    permissions: {
      canUpdate: false,
    },
    roleOptions: [],
  };
  const [loginId, setLoginId] = React.useState("");

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <ProjectMemberAdminSubMenu detail={detail} runtimeConfig={props.runtimeConfig} />
          <section className="content-wrap frm-wrap">
            <div className="inner-bubble">
              <form
                className="nm"
                id="addNewMember"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextLoginId = loginId.trim();
                  if (!nextLoginId) {
                    return;
                  }
                  void Promise.resolve(props.onAddMember?.(nextLoginId)).then(() => {
                    setLoginId("");
                  });
                }}
              >
                <input
                  className="text uname"
                  id="loginId"
                  name="loginId"
                  pattern="^[A-Za-z0-9_.-]+$"
                  placeholder="project.members.addMember"
                  type="text"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                />
                <button
                  className="ybtn ybtn-success"
                  disabled={!response.permissions.canUpdate || props.pending}
                  type="submit"
                >
                  <i aria-hidden="true" className="yobicon-addfriend" />
                  Add
                </button>
              </form>
            </div>

            <ul className="members project row-fluid">
              {response.members.map((member) => (
                <ProjectMemberCard
                  detail={detail}
                  key={member.userId}
                  member={member}
                  pending={props.pending}
                  response={response}
                  runtimeConfig={props.runtimeConfig}
                  onDeleteMember={props.onDeleteMember}
                  onUpdateMemberRole={props.onUpdateMemberRole}
                />
              ))}
            </ul>

            {response.enrollmentRequests.length > 0 ? (
              <section className="enrollment-requests">
                <h4>project.member.enrollment.request</h4>
                <ul className="enrollment-request-list">
                  {response.enrollmentRequests.map((request) => (
                    <li className="enrollment-request" key={request.userId}>
                      <a
                        className="avatar-wrap mlarge pull-left mr10"
                        href={prefixBasePath(props.runtimeConfig.basePath, `/${request.loginId}`)}
                      >
                        <img alt="" height="64" src={request.avatarUrl} width="64" />
                      </a>
                      <div className="member-name">{request.userLabel}</div>
                      <div className="member-id">{`@${request.loginId}`}</div>
                      <div className="member-setting">
                        <button
                          className="enrollAcceptBtn"
                          data-login-id={request.loginId}
                          disabled={!response.permissions.canUpdate || props.pending}
                          onClick={() => void props.onAddMember?.(request.loginId)}
                          type="button"
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

const webhookTypeOptions: Array<{ label: string; value: ProjectWebhookType }> = [
  { label: "Simple", value: "SIMPLE" },
  { label: "Slack", value: "DETAIL_SLACK" },
  { label: "Hangout Chat", value: "DETAIL_HANGOUT_CHAT" },
  { label: "JSON", value: "JSON" },
];

function webhookTypeLabel(value: ProjectWebhookType): string {
  return webhookTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function ProjectWebhooksPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  onCreate?: (input: ProjectWebhookInput) => void | Promise<void>;
  onDelete?: (webhook: ProjectWebhook) => void | Promise<void>;
  pending?: boolean;
  response: ReadProjectWebhooksResponse | null | undefined;
  runtimeConfig: RuntimeConfig;
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
  const response = props.response ?? {
    permissions: {
      canCreate: false,
      canDelete: false,
    },
    webhooks: [],
  };
  const webhooksHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    "webhooks",
  );

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap webhook-editor-wrap">
          <section className="content-wrap frm-wrap">
            <h4>Webhooks</h4>
            <form
              action={webhooksHref}
              className="new-webhook-wrap"
              id="formNewWebhook"
              method="post"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void props.onCreate?.({
                  gitPush: formData.get("gitPush") === "on",
                  payloadUrl: String(formData.get("payloadUrl") ?? ""),
                  secret: String(formData.get("secret") ?? ""),
                  webhookType: String(
                    formData.get("webhookType") ?? "SIMPLE",
                  ) as ProjectWebhookType,
                });
                event.currentTarget.reset();
              }}
            >
              <strong className="form-legend">Create new webhook</strong>
              <label htmlFor="payloadUrl">Payload URL</label>
              <input
                className="input-webhook-payload"
                id="payloadUrl"
                maxLength={2000}
                name="payloadUrl"
                required
                type="url"
              />
              <label htmlFor="secret">Authorization Token</label>
              <input
                className="input-webhook-secret"
                id="secret"
                maxLength={250}
                name="secret"
                type="text"
              />
              <fieldset>
                <legend>Webhook type</legend>
                {webhookTypeOptions.map((option) => (
                  <label key={option.value}>
                    <input
                      defaultChecked={option.value === "SIMPLE"}
                      name="webhookType"
                      type="radio"
                      value={option.value}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <label htmlFor="gitPush">
                <input id="gitPush" name="gitPush" type="checkbox" />
                Include git push events
              </label>
              <div className="form-wrap form-actions">
                <button
                  className="ybtn ybtn-primary btn-submit"
                  disabled={!response.permissions.canCreate || props.pending}
                  type="submit"
                >
                  Add webhook
                </button>
              </div>
            </form>
          </section>
          <section className="content-wrap">
            <h4>Webhooks</h4>
            <div className="webhook-list-wrap" id="webhooksList">
              {response.webhooks.length === 0 ? (
                <div className="error-wrap">
                  <i aria-hidden="true" className="ico ico-err1" />
                  <p>No webhook exists.</p>
                </div>
              ) : (
                <>
                  <div className="row-fluid list-head">
                    <strong className="span5 payload-url">Payload URL</strong>
                    <strong className="span2 secret text-center">Authorization Token</strong>
                    <strong className="span2 text-center">Type</strong>
                    <strong className="span1 text-center">Git push</strong>
                    <strong className="span2 text-right">Actions</strong>
                  </div>
                  {response.webhooks.map((webhook) => (
                    <div
                      className="row-fluid list-item vertical-align"
                      data-webhook-id={webhook.id}
                      key={webhook.id}
                    >
                      <div className="span5 payload-url">{webhook.payloadUrl}</div>
                      <div className="span2 secret text-center">{webhook.secret || "NONE"}</div>
                      <div className="span2 text-center">
                        {webhookTypeLabel(webhook.webhookType)}
                      </div>
                      <div className="span1 text-center">
                        <input checked={webhook.gitPush} readOnly type="checkbox" />
                      </div>
                      <div className="span2 text-right">
                        <button
                          className="ybtn ybtn-danger ybtn-small"
                          data-request-method="delete"
                          data-request-uri={`${webhooksHref}/${webhook.id}`}
                          disabled={!response.permissions.canDelete || props.pending}
                          onClick={() => void props.onDelete?.(webhook)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function ProjectDeletePage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  onDelete?: () => void | Promise<void>;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
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
  const [accepted, setAccepted] = React.useState(false);
  const settingsHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    "settingform",
  );
  const deleteHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    "deleteform",
  );

  return (
    <main className="app-shell">
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <aside className="lnb">
            <ul className="nav nav-tabs nav-stacked">
              <li>
                <a href={settingsHref} id="subMenuProjectSetting">
                  Project settings
                </a>
              </li>
              <li className="active">
                <a href={deleteHref} id="subMenuProjectDelete">
                  Delete project
                </a>
              </li>
            </ul>
          </aside>
          <section className="content-wrap frm-wrap">
            <h3>{`${detail.ownerName} / ${detail.projectName}`}</h3>
            <div className="bubble-wrap gray wp">
              <div className="cu-label">project.delete</div>
              <div className="cu-desc">
                <p>project.delete.description</p>
                <strong className="notice">project.delete.notice</strong>
              </div>
            </div>
            <label className="bg-checkbox label-agreement" htmlFor="accept">
              <input
                checked={accepted}
                id="accept"
                name="accept"
                onChange={(event) => setAccepted(event.target.checked)}
                type="checkbox"
              />
              project.delete.accept
            </label>
            <div className="box-wrap bottom">
              <a
                className="ybtn ybtn-danger"
                data-toggle="modal"
                href="#alertDeletion"
                id="btnDelete"
              >
                <i aria-hidden="true" className="yobicon-database-remove" />
                Delete
              </a>
            </div>
            <div className="modal hide fade" id="alertDeletion" role="dialog">
              <div className="modal-header">
                <h4>project.delete</h4>
              </div>
              <div className="modal-body">
                <p>project.delete.confirm</p>
              </div>
              <div className="modal-footer">
                <button
                  className="ybtn ybtn-danger"
                  disabled={!accepted || props.pending}
                  id="btnDeleteExec"
                  onClick={() => void props.onDelete?.()}
                  type="button"
                >
                  {props.pending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </section>
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
