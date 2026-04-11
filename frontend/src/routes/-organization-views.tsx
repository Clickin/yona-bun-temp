import * as React from "react";
import type {
  OrganizationDetailViewModel,
  OrganizationMembersViewModel,
} from "./-view-models";

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
  members: OrganizationMembersViewModel | null | undefined;
}) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>{props.detail?.organizationName ?? "Organization"}</h1>
      <p>{props.detail?.description || "No description yet."}</p>
      <Section title="Members">
        {props.members?.members?.length ? (
          <ul>
            {props.members.members.map((member) => (
              <li key={member.loginId}>
                {member.userLabel} ({member.role})
              </li>
            ))}
          </ul>
        ) : (
          <p>Member summary requires update authority.</p>
        )}
      </Section>
    </main>
  );
}

export function OrganizationSettingsPage(props: {
  detail: OrganizationDetailViewModel | null | undefined;
  pending?: boolean;
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
