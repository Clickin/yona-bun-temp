import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { OrganizationDetailViewModel } from "./-view-models";

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
        Organization home
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "issues")}>
        Issues
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "boards")}>
        Boards
      </a>
      <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "pullrequests")}>
        Pull requests
      </a>
      {detail.viewerCanUpdate ? (
        <a href={buildOrganizationHref(runtimeConfig, detail.organizationName, "settingform")}>
          Settings
        </a>
      ) : null}
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
}) {
  const detail = props.detail ?? {
    adminMembers: [],
    description: "",
    memberMembers: [],
    organizationName: "",
    viewerCanCreateProject: false,
    viewerCanUpdate: false,
    visibleProjects: [],
  };

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>{detail.organizationName || "Organization"}</h1>
      <OrganizationMenu detail={detail} runtimeConfig={props.runtimeConfig} />
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
        <OrganizationMemberBubble members={detail.adminMembers} title="Org admins" />
      ) : null}
      {detail.memberMembers?.length ? (
        <OrganizationMemberBubble members={detail.memberMembers} title="Org members" />
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
      <h1>Organization settings</h1>
      <OrganizationMenu detail={detail} runtimeConfig={props.runtimeConfig} />
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
