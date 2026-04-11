import * as React from "react";
import type {
  ProjectDetailViewModel,
  ProjectMembersViewModel,
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
        <button type="submit">{props.pending ? "Creating..." : "Create project"}</button>
      </form>
    </main>
  );
}

export function ProjectDetailPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  members: ProjectMembersViewModel | null | undefined;
  onEnrollProject?: (ownerName: string, projectName: string) => void;
  onCancelEnrollProject?: (ownerName: string, projectName: string) => void;
  onToggleFavoriteProject?: (ownerName: string, projectName: string) => void;
}) {
  const detail = props.detail;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{detail ? `${detail.ownerName}/${detail.projectName}` : "Project"}</h1>
      <p>{detail?.overview || "No overview yet."}</p>
      <p>Scope: {detail?.projectScope ?? "unknown"}</p>
      {detail ? (
        <div className="runtime-grid">
          <button
            type="button"
            onClick={() =>
              props.onToggleFavoriteProject?.(detail.ownerName, detail.projectName)
            }
          >
            {detail.isFavorited ? "Unfavorite project" : "Favorite project"}
          </button>
          {detail.viewerCanEnroll ? (
            detail.enrollmentRequested ? (
              <button
                type="button"
                onClick={() =>
                  props.onCancelEnrollProject?.(detail.ownerName, detail.projectName)
                }
              >
                Cancel enrollment request
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  props.onEnrollProject?.(detail.ownerName, detail.projectName)
                }
              >
                Request enrollment
              </button>
            )
          ) : null}
        </div>
      ) : null}
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

export function ProjectSettingsPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
  pending?: boolean;
  onUpdateProject?: (input: {
    currentOwnerName: string;
    currentProjectName: string;
    ownerName: string;
    overview: string;
    projectName: string;
    projectScope: string;
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
    currentOwnerName: detail.ownerName,
    currentProjectName: detail.projectName,
    ownerName: detail.ownerName,
    overview: detail.overview,
    projectName: detail.projectName,
    projectScope: detail.projectScope,
  });

  React.useEffect(() => {
    setFormState({
      currentOwnerName: detail.ownerName,
      currentProjectName: detail.projectName,
      ownerName: detail.ownerName,
      overview: detail.overview,
      projectName: detail.projectName,
      projectScope: detail.projectScope,
    });
  }, [detail.ownerName, detail.overview, detail.projectName, detail.projectScope]);

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Project settings</h1>
      <form
        className="runtime-grid"
        onSubmit={(event) => {
          event.preventDefault();
          props.onUpdateProject?.(formState);
        }}
      >
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
        <button type="submit">{props.pending ? "Saving..." : "Save project"}</button>
      </form>
    </main>
  );
}
