import * as React from "react";
import type { RuntimeConfig } from "../runtime-config";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type {
  ProjectDetailViewModel,
  ProjectIssueDetailViewModel,
  ProjectIssueListViewModel,
} from "./-view-models";

function fallbackProjectDetail(): ProjectDetailViewModel {
  return {
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
}

export function ProjectIssueListPage(props: {
  detail: ProjectDetailViewModel | null;
  issueList: ProjectIssueListViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Issue List</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section>
        <form action={buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName, "issues")}>
          <button type="submit">Search</button>
        </form>
      </section>
      <section>
        <ul>
          {(props.issueList?.items ?? []).map((item) => (
            <li key={item.issueNumber}>
              <a href={buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName, `issue/${item.issueNumber}`)}>
                {item.title}
              </a>
              <span>{item.state}</span>
              <span>{item.updatedLabel}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function ProjectIssueDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  issue: ProjectIssueDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const issue = props.issue;

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{issue?.title ?? "Issue"}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section>
        <p>{issue ? `#${issue.issueNumber}` : ""}</p>
        <p>{issue?.state ?? ""}</p>
      </section>
    </main>
  );
}
