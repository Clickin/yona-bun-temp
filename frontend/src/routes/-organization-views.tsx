import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type {
  OrganizationAdminViewModel,
  OrganizationDetailViewModel,
  OrganizationIssueListViewModel,
} from "./-view-models";

export function buildOrganizationHref(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return prefixBasePath(
    runtimeConfig.basePath,
    `/organizations/${organizationName}${normalizedSuffix}`,
  );
}

function buildOrganizationIssueHref(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  query: OrganizationIssueListQuery,
  updates: Partial<OrganizationIssueListQuery>,
) {
  const nextQuery = { ...query, ...updates };
  const search = new URLSearchParams();
  if (nextQuery.state) {
    search.set("state", nextQuery.state);
  }
  if (nextQuery.filter) {
    search.set("filter", nextQuery.filter);
  }
  if (nextQuery.orderBy) {
    search.set("orderBy", nextQuery.orderBy);
  }
  if (nextQuery.orderDir) {
    search.set("orderDir", nextQuery.orderDir);
  }
  if (nextQuery.authorId) {
    search.set("authorId", String(nextQuery.authorId));
  }
  if (nextQuery.assigneeId) {
    search.set("assigneeId", String(nextQuery.assigneeId));
  }
  for (const projectName of nextQuery.projectNames) {
    search.append("projectNames", projectName);
  }
  search.set("pageNum", String(nextQuery.pageNum || 1));
  const suffix = `issues?${search.toString()}`;
  return buildOrganizationHref(runtimeConfig, organizationName, suffix);
}

export interface OrganizationIssueListQuery {
  assigneeId: number;
  authorId: number;
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  projectNames: string[];
  state: string;
}

export function OrganizationMenu(props: {
  active?: "boards" | "home" | "issues" | "pullrequests" | "settings";
  detail: OrganizationDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;

  return (
    <nav aria-label="Organization menu">
      <a
        aria-current={props.active === "home" ? "page" : undefined}
        href={buildOrganizationHref(runtimeConfig, detail.organizationName)}
      >
        Group Home
      </a>
      <a
        aria-current={props.active === "issues" ? "page" : undefined}
        href={buildOrganizationHref(runtimeConfig, detail.organizationName, "issues")}
      >
        Issue
      </a>
      <a
        aria-current={props.active === "boards" ? "page" : undefined}
        href={buildOrganizationHref(runtimeConfig, detail.organizationName, "boards")}
      >
        Board
      </a>
      <a
        aria-current={props.active === "pullrequests" ? "page" : undefined}
        href={buildOrganizationHref(runtimeConfig, detail.organizationName, "pullrequests")}
      >
        Pull request
      </a>
      {detail.viewerCanUpdate ? (
        <a
          aria-current={props.active === "settings" ? "page" : undefined}
          href={buildOrganizationHref(runtimeConfig, detail.organizationName, "settingform")}
        >
          Settings
        </a>
      ) : null}
    </nav>
  );
}

function OrganizationSettingsSubMenu(props: {
  organizationName: string;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <nav aria-label="Organization settings menu">
      <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "settingform")}>
        Setting
      </a>
      <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "members")}>
        Members
      </a>
      <a href={buildOrganizationHref(props.runtimeConfig, props.organizationName, "deleteForm")}>
        Group Delete
      </a>
    </nav>
  );
}

function OrganizationMemberBubble(props: {
  members: NonNullable<OrganizationDetailViewModel["adminMembers"]>;
  title: string;
}) {
  return (
    <section className="organization-member-wrap">
      <h2>{props.title}</h2>
      <ul className="member-list unstyled">
        {props.members.map((member) => (
          <li className="member-item" key={`${props.title}-${member.loginId}`}>
            {member.userLabel} @{member.loginId}
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrganizationMembershipActions(props: {
  detail: OrganizationDetailViewModel;
  onCancelEnrollOrganization?: (organizationName: string) => void;
  onEnrollOrganization?: (organizationName: string) => void;
  onLeaveOrganization?: (organizationName: string) => void;
}) {
  const { detail } = props;

  if (detail.viewerCanEnroll) {
    return (
      <section>
        <h2>Member enrollment request</h2>
        <p>
          {detail.enrollmentRequested
            ? "You can be a member if the members of this group accept this request."
            : "Admins of this group can check your enrollment request."}
        </p>
        <button
          type="button"
          onClick={() => {
            if (detail.enrollmentRequested) {
              props.onCancelEnrollOrganization?.(detail.organizationName);
              return;
            }
            props.onEnrollOrganization?.(detail.organizationName);
          }}
        >
          {detail.enrollmentRequested ? "Cancel sign-up request" : "Send sign-up request"}
        </button>
      </section>
    );
  }

  if (detail.viewerCanLeave) {
    return (
      <section>
        <h2>Membership</h2>
        <button type="button" onClick={() => props.onLeaveOrganization?.(detail.organizationName)}>
          Leave the group
        </button>
      </section>
    );
  }

  return null;
}

export function OrganizationNewPage(props: {
  onCreateOrganization?: (input: { description: string; organizationName: string }) => void;
  pending?: boolean;
}) {
  const [formState, setFormState] = React.useState({
    description: "",
    organizationName: "",
  });

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Create organization</h1>
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onCreateOrganization?.(formState);
        }}
      >
        <label>
          <span>Organization name</span>
          <input
            name="organizationName"
            type="text"
            value={formState.organizationName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                organizationName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            name="description"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>
        <button type="submit">{props.pending ? "Creating…" : "Create organization"}</button>
      </form>
    </main>
  );
}

export function OrganizationDetailPage(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  runtimeConfig: RuntimeConfig;
  onCancelEnrollOrganization?: (organizationName: string) => void;
  onEnrollOrganization?: (organizationName: string) => void;
  onLeaveOrganization?: (organizationName: string) => void;
}) {
  const detail = props.detail ?? {
    adminMembers: [],
    description: "",
    enrollmentRequested: false,
    memberMembers: [],
    organizationName: "",
    viewerCanCreateProject: false,
    viewerCanEnroll: false,
    viewerCanLeave: false,
    viewerCanUpdate: false,
    visibleProjects: [],
  };

  const organizationHref = buildOrganizationHref(props.runtimeConfig, detail.organizationName);

  return (
    <main className="app-shell organization-page page-wrap-outer">
      <div className="project-page-wrap organization-home-wrap">
        <p className="eyebrow">Yona Rust Organization</p>
        <h1>{detail.organizationName || "Organization"}</h1>
        <OrganizationMenu detail={detail} runtimeConfig={props.runtimeConfig} />
        <div className="project-home-header row-fluid">
          <div className="project-overview span9 span-hard-wrap">
            <div className="project-description">
              <h3>
                <span className="markdown-wrap">{detail.description || "No description yet."}</span>
              </h3>
            </div>
          </div>
        </div>
        <section className="organization-project-filter">
          <form action={organizationHref} method="get">
            <label htmlFor="mylist-filter">Project filter</label>
            <input id="mylist-filter" name="filter" placeholder="Type project name" type="text" />
            <button type="submit">Search</button>
          </form>
          {detail.viewerCanCreateProject ? (
            <a
              className="ybtn ybtn-success"
              href={prefixBasePath(
                props.runtimeConfig.basePath,
                `/projects/new?owner=${encodeURIComponent(detail.organizationName)}`,
              )}
            >
              Create project
            </a>
          ) : null}
        </section>
        <div className="row-fluid organization-home-body">
          <div className="span9 span-left-pane">
            <section>
              <h2>Projects</h2>
              <ul className="project-list-wrap organization-project-list">
                {(detail.visibleProjects ?? []).map((project) => (
                  <li
                    className="listitem organization-project-card"
                    key={`${project.ownerName}/${project.projectName}`}
                  >
                    <a
                      href={prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/${project.ownerName}/${project.projectName}`,
                      )}
                    >
                      {project.projectName}
                    </a>
                    <p>{project.overview}</p>
                    <p>State: {project.projectScope}</p>
                    <p>{`Members: ${project.memberCount}`}</p>
                    <p>{`Watchers: ${project.watchCount}`}</p>
                    <p>{`Created ${project.createdLabel}`}</p>
                    <p>{`Last pushed ${project.lastPushedLabel}`}</p>
                    {project.originOwnerName && project.originProjectName ? (
                      <p>{`Original: ${project.originOwnerName} / ${project.originProjectName}`}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="span3 span-right-pane">
            <div className="bubble-wrap gray organization-home">
              <OrganizationMembershipActions
                detail={detail}
                onCancelEnrollOrganization={props.onCancelEnrollOrganization}
                onEnrollOrganization={props.onEnrollOrganization}
                onLeaveOrganization={props.onLeaveOrganization}
              />
              {detail.adminMembers?.length ? (
                <OrganizationMemberBubble members={detail.adminMembers} title="Group Manager" />
              ) : null}
              {detail.memberMembers?.length ? (
                <OrganizationMemberBubble members={detail.memberMembers} title="Group Member" />
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function OrganizationIssueListPage(props: {
  currentUserId: number;
  detail: OrganizationDetailViewModel | null | undefined;
  issueList: OrganizationIssueListViewModel | null | undefined;
  query: OrganizationIssueListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
    description: "",
    organizationName: props.issueList?.organizationName ?? "",
    viewerCanUpdate: false,
  };
  const issueList = props.issueList;
  const query = props.query;
  const organizationName = detail.organizationName || issueList?.organizationName || "";
  const openHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    pageNum: 1,
    state: "open",
  });
  const closedHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    pageNum: 1,
    state: "closed",
  });
  const authoredHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: 0,
    authorId: props.currentUserId,
    pageNum: 1,
  });
  const assignedHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: props.currentUserId,
    authorId: 0,
    pageNum: 1,
  });
  const allHref = buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
    assigneeId: 0,
    authorId: 0,
    pageNum: 1,
  });

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Organization Issues</h1>
      <p>{organizationName}</p>
      <OrganizationMenu active="issues" detail={detail} runtimeConfig={props.runtimeConfig} />
      <section className="issue-list-wrap">
        <aside className="left-menu">
          <nav aria-label="Issue quick filters">
            <a href={allHref}>All</a>
            {props.currentUserId > 0 ? (
              <>
                <a href={assignedHref}>Assigned to me</a>
                <a href={authoredHref}>Authored by me</a>
              </>
            ) : null}
          </nav>
          <form
            action={buildOrganizationHref(props.runtimeConfig, organizationName, "issues")}
            method="get"
          >
            <input name="state" type="hidden" value={query.state || "open"} />
            <input name="orderBy" type="hidden" value={query.orderBy} />
            <input name="orderDir" type="hidden" value={query.orderDir} />
            <input name="authorId" type="hidden" value={query.authorId || ""} />
            <input name="assigneeId" type="hidden" value={query.assigneeId || ""} />
            <label htmlFor="organization-issue-projects">Projects</label>
            <select
              id="organization-issue-projects"
              multiple
              name="projectNames"
              defaultValue={query.projectNames}
            >
              {(issueList?.visibleProjects ?? []).map((project) => (
                <option key={project.projectName} value={project.projectName}>
                  {project.projectName}
                </option>
              ))}
            </select>
            <label htmlFor="organization-issue-filter">Search</label>
            <input
              id="organization-issue-filter"
              name="filter"
              placeholder="Search issues"
              type="text"
              defaultValue={query.filter}
            />
            <button type="submit">Search</button>
          </form>
        </aside>
        <section>
          <nav aria-label="Issue state tabs">
            <a className={(query.state || "open") === "open" ? "active" : ""} href={openHref}>
              Open <span>{issueList?.openIssueCount ?? 0}</span>
            </a>
            <a className={query.state === "closed" ? "active" : ""} href={closedHref}>
              Closed <span>{issueList?.closedIssueCount ?? 0}</span>
            </a>
          </nav>
          <div className="filter-wrap">
            {["dueDate", "updatedDate", "createdDate", "numOfComments"].map((orderBy) => (
              <a
                href={buildOrganizationIssueHref(props.runtimeConfig, organizationName, query, {
                  orderBy,
                  orderDir: query.orderBy === orderBy && query.orderDir === "desc" ? "asc" : "desc",
                  pageNum: 1,
                })}
                key={orderBy}
              >
                {orderBy}
              </a>
            ))}
          </div>
          {(issueList?.items ?? []).length > 0 ? (
            <ul className="post-list-wrap">
              {issueList?.items.map((issue) => (
                <li
                  className="post-item title"
                  key={`${issue.ownerName}/${issue.projectName}/${issue.issueNumber}`}
                >
                  <a
                    className="title"
                    href={prefixBasePath(
                      props.runtimeConfig.basePath,
                      `/${issue.ownerName}/${issue.projectName}/issue/${issue.issueNumber}`,
                    )}
                  >
                    {issue.title}
                  </a>
                  <div className="infos">
                    <span>{issue.authorLabel || "No author"}</span>
                    <span>{issue.updatedLabel}</span>
                    <span>{`Comments: ${issue.commentCount}`}</span>
                    <span>{`Votes: ${issue.voterCount}`}</span>
                    <span>{`Watchers: ${issue.watcherCount}`}</span>
                    <span>{`Assignee: ${issue.assigneeLabel || "none"}`}</span>
                    <a
                      className="group-project-name"
                      href={prefixBasePath(
                        props.runtimeConfig.basePath,
                        `/${issue.ownerName}/${issue.projectName}`,
                      )}
                    >
                      {issue.projectName}
                    </a>
                    <span>{`#${issue.issueNumber}`}</span>
                    {issue.labels.map((label) => (
                      <span key={label.id} style={{ backgroundColor: label.color || "#ddd" }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="error-wrap">
              <p>Issue is empty.</p>
            </div>
          )}
          <nav aria-label="Issue pagination" id="pagination">
            <span>{`Page ${issueList?.pageNum ?? 1}`}</span>
            <span>{`Total ${issueList?.totalCount ?? 0}`}</span>
          </nav>
        </section>
      </section>
    </main>
  );
}

export function OrganizationSettingsPage(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onUpdateOrganization?: (input: {
    currentOrganizationName: string;
    description: string;
    organizationName: string;
  }) => void;
}) {
  const detail = props.detail ?? {
    description: "",
    organizationName: "",
    viewerCanUpdate: false,
  };
  const [formState, setFormState] = React.useState({
    currentOrganizationName: detail.organizationName,
    description: detail.description,
    organizationName: detail.organizationName,
  });

  React.useEffect(() => {
    setFormState({
      currentOrganizationName: detail.organizationName,
      description: detail.description,
      organizationName: detail.organizationName,
    });
  }, [detail.description, detail.organizationName]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Group Setting</h1>
      <OrganizationMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <OrganizationSettingsSubMenu
        organizationName={detail.organizationName}
        runtimeConfig={props.runtimeConfig}
      />
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onUpdateOrganization?.(formState);
        }}
      >
        <label>
          <span>Organization name</span>
          <input
            name="organizationName"
            type="text"
            value={formState.organizationName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                organizationName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            name="description"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>
        <button type="submit">{props.pending ? "Saving…" : "Save organization"}</button>
      </form>
    </main>
  );
}

export function OrganizationMembersPage(props: {
  detail: OrganizationAdminViewModel | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onAcceptEnrollment?: (organizationName: string, userId: string) => void;
  onAddMember?: (organizationName: string, loginId: string) => void;
  onDeleteMember?: (organizationName: string, userId: string) => void;
  onUpdateMemberRole?: (organizationName: string, userId: string, role: string) => void;
}) {
  const detail = props.detail ?? {
    deleteAllowed: false,
    enrollmentRequests: [],
    members: [],
    organizationName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };
  const [loginId, setLoginId] = React.useState("");

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Members</h1>
      <OrganizationSettingsSubMenu
        organizationName={detail.organizationName}
        runtimeConfig={props.runtimeConfig}
      />
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onAddMember?.(detail.organizationName, loginId);
        }}
      >
        <label>
          <span>Add member</span>
          <input
            name="loginId"
            placeholder="Add a new member..."
            type="text"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
        </label>
        <button type="submit">{props.pending ? "Adding…" : "Add"}</button>
      </form>
      <ul>
        {detail.members.map((member) => (
          <li key={member.userId}>
            <strong>{member.userLabel}</strong> @{member.loginId}
            <div>
              {detail.roleOptions.map((roleOption) => (
                <button
                  key={`${member.userId}-${roleOption.role}`}
                  type="button"
                  onClick={() =>
                    props.onUpdateMemberRole?.(
                      detail.organizationName,
                      member.userId,
                      roleOption.role,
                    )
                  }
                >
                  {roleOption.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => props.onDeleteMember?.(detail.organizationName, member.userId)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <section>
        <h2>Delete a group member</h2>
        <p>Are you sure this user should leave this group?</p>
      </section>
      {detail.enrollmentRequests.length > 0 ? (
        <section>
          <h2>Enrollment requests</h2>
          <ul>
            {detail.enrollmentRequests.map((request) => (
              <li key={request.userId}>
                <strong>{request.userLabel}</strong> @{request.loginId}
                <button
                  type="button"
                  onClick={() =>
                    props.onAcceptEnrollment?.(detail.organizationName, request.userId)
                  }
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

export function OrganizationDeletePage(props: {
  detail: OrganizationAdminViewModel | null | undefined;
  pending?: boolean;
  runtimeConfig: RuntimeConfig;
  onDeleteOrganization?: (organizationName: string) => void;
}) {
  const detail = props.detail ?? {
    deleteAllowed: false,
    enrollmentRequests: [],
    members: [],
    organizationName: "",
    roleOptions: [],
    viewerCanUpdate: false,
  };

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Group Delete</h1>
      <OrganizationSettingsSubMenu
        organizationName={detail.organizationName}
        runtimeConfig={props.runtimeConfig}
      />
      <section>
        <button
          type="button"
          disabled={!detail.deleteAllowed || props.pending}
          onClick={() => props.onDeleteOrganization?.(detail.organizationName)}
        >
          {props.pending ? "Deleting…" : "Delete This Group"}
        </button>
        <p>Do you want to delete this group?</p>
        <p>Are you sure you want to delete this group?</p>
      </section>
    </main>
  );
}
