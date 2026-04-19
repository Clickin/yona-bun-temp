import * as React from "react";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
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
      href: buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, "pullRequests"),
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
      {menuItems
        .filter((item) => item.show)
        .map((item) => (
          <a href={item.href} key={item.label}>
            {item.label}
          </a>
        ))}
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
        <button type="submit">{props.pending ? "Creating..." : "Create project"}</button>
      </form>
    </main>
  );
}

export function ProjectDetailPage(props: {
  detail: ProjectDetailViewModel | null | undefined;
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
        <p>{detail.watchCount ?? 0}</p>
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
          {activeTab === "readme" ? <h3>README</h3> : null}
          {activeTab === "history" ? <h3>Recent history</h3> : null}
          {activeTab === "dashboard" ? <h3>Dashboard</h3> : null}
          <p>Legacy placeholder panel while real {activeTab} content stays outside Wave 2A.</p>
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
        <button type="submit">{props.pending ? "Saving..." : "Save project"}</button>
      </form>
    </main>
  );
}
