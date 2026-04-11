import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { OrganizationAdminViewModel, OrganizationDetailViewModel } from "./-view-models";

function buildOrganizationHref(
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

function OrganizationMenu(props: {
  detail: OrganizationDetailViewModel;
  runtimeConfig: RuntimeConfig;
}) {
  const { detail, runtimeConfig } = props;

  return (
    <nav aria-label="Organization menu">
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName)}>
        Group Home
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "issues")}>
        Issue
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "boards")}>
        Board
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "pullrequests")}>
        Pull request
      </a>
      {detail.viewerCanUpdate ? (
        <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "settingform")}>
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
    <section>
      <h2>{props.title}</h2>
      <ul>
        {props.members.map((member) => (
          <li key={`${props.title}-${member.loginId}`}>
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
        <button
          type="button"
          onClick={() => props.onLeaveOrganization?.(detail.organizationName)}
        >
          Leave the group
        </button>
      </section>
    );
  }

  return null;
}

export function OrganizationNewPage(props: {
  onCreateOrganization?: (input: {
    description: string;
    organizationName: string;
  }) => void;
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
        <button type="submit">{props.pending ? "Creating..." : "Create organization"}</button>
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

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>{detail.organizationName || "Organization"}</h1>
      <OrganizationMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <OrganizationMembershipActions
        detail={detail}
        onCancelEnrollOrganization={props.onCancelEnrollOrganization}
        onEnrollOrganization={props.onEnrollOrganization}
        onLeaveOrganization={props.onLeaveOrganization}
      />
      <section>
        <h2>Description</h2>
        <p>{detail.description || "No description yet."}</p>
      </section>
      <section>
        <form action={buildOrganizationHref(props.runtimeConfig, detail.organizationName)} method="get">
          <label htmlFor="mylist-filter">Project filter</label>
          <input id="mylist-filter" name="filter" placeholder="Type project name" type="text" />
          <button type="submit">Search</button>
        </form>
        {detail.viewerCanCreateProject ? (
          <a
            href={prefixBasePath(
              props.runtimeConfig.basePath,
              `/projects/new?owner=${encodeURIComponent(detail.organizationName)}`,
            )}
          >
            Create project
          </a>
        ) : null}
      </section>
      <section>
        <h2>Projects</h2>
        <ul>
          {(detail.visibleProjects ?? []).map((project) => (
            <li key={`${project.ownerName}/${project.projectName}`}>
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
      {detail.adminMembers?.length ? (
        <OrganizationMemberBubble members={detail.adminMembers} title="Group Manager" />
      ) : null}
      {detail.memberMembers?.length ? (
        <OrganizationMemberBubble members={detail.memberMembers} title="Group Member" />
      ) : null}
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
        <button type="submit">
          {props.pending ? "Saving..." : "Save organization"}
        </button>
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
        <button type="submit">{props.pending ? "Adding..." : "Add"}</button>
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
          {props.pending ? "Deleting..." : "Delete This Group"}
        </button>
        <p>Do you want to delete this group?</p>
        <p>Are you sure you want to delete this group?</p>
      </section>
    </main>
  );
}
