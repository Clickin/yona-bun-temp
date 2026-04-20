import * as React from "react";
import type { RuntimeConfig } from "../runtime-config";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./-view-models";

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

function codeHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
  path = "",
) {
  const suffix = path
    ? `code/${encodeURIComponent(branch)}/${path}`
    : `code/${encodeURIComponent(branch)}`;
  return buildProjectHref(runtimeConfig, ownerName, projectName, suffix);
}

export function CodeBrowserPage(props: {
  code: CodeBrowserViewModel | null;
  detail: ProjectDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const code = props.code;
  const selectedBranch = code?.selectedBranch ?? "";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Code</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section className="code-browse-wrap">
        <nav aria-label="Code tabs">
          <a
            aria-current="page"
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              "code",
            )}
          >
            Files
          </a>
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              "commits",
            )}
          >
            Commit
          </a>
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              "branches",
            )}
          >
            Branches
          </a>
        </nav>
        {code?.noHead ? (
          <div className="alert alert-block">
            <h2>The repository is empty!</h2>
            <p>{`Clone URL: ${detail.cloneUrl ?? ""}`}</p>
          </div>
        ) : (
          <>
            <div className="code-browse-header">
              <label htmlFor="branches">Branch</label>
              <select
                id="branches"
                onChange={(event) => {
                  const nextBranch = event.currentTarget.value;
                  window.location.assign(
                    codeHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      nextBranch,
                      code?.path ?? "",
                    ),
                  );
                }}
                value={selectedBranch}
              >
                {(code?.branches ?? []).map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <nav aria-label="Breadcrumbs" className="code-breadcrumb-wrap">
                <a
                  href={
                    selectedBranch
                      ? codeHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          selectedBranch,
                        )
                      : "#"
                  }
                >
                  {detail.projectName}
                </a>
                {(code?.breadcrumbs ?? []).map((breadcrumb) => (
                  <React.Fragment key={breadcrumb.path}>
                    <span>/</span>
                    <a
                      href={codeHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        selectedBranch,
                        breadcrumb.path,
                      )}
                    >
                      {breadcrumb.name}
                    </a>
                  </React.Fragment>
                ))}
              </nav>
            </div>
            {code?.file ? (
              <CodeFileView file={code.file} />
            ) : (
              <CodeFolderView
                entries={code?.entries ?? []}
                ownerName={detail.ownerName}
                projectName={detail.projectName}
                runtimeConfig={props.runtimeConfig}
                selectedBranch={selectedBranch}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function CodeFolderView(props: {
  entries: CodeBrowserViewModel["entries"];
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  if (props.entries.length === 0) {
    return <div className="alert alert-warning">No file exists</div>;
  }
  return (
    <div className="list-wrap" data-type="folder">
      <div className="row-fluid listhead">
        <strong>File name</strong>
        <strong>Commit message</strong>
        <strong>Commit date</strong>
      </div>
      {props.entries.map((entry) => (
        <div className="row-fluid listitem" data-path={entry.path} key={entry.path}>
          <a
            href={codeHref(
              props.runtimeConfig,
              props.ownerName,
              props.projectName,
              props.selectedBranch,
              entry.path,
            )}
          >
            {entry.kind === "folder" ? "Folder: " : "File: "}
            {entry.name}
          </a>
          <span>{entry.commitMessage || "No commit message"}</span>
          <span>{entry.commitDate}</span>
        </div>
      ))}
    </div>
  );
}

function CodeFileView(props: { file: NonNullable<CodeBrowserViewModel["file"]> }) {
  if (props.file.isBinary) {
    return <p>Binary file is not shown</p>;
  }
  if (props.file.isTooLarge) {
    return <p>{`Sorry, we cannot show a file larger than ${props.file.size} bytes here.`}</p>;
  }
  return (
    <div className="file-wrap" data-type="file">
      <div className="file-header">
        <strong>{props.file.name}</strong>
        <span>{props.file.mimeType}</span>
        <span>{`${props.file.size} bytes`}</span>
      </div>
      <pre id="showCode" className="code-wrap">
        {props.file.text}
      </pre>
    </div>
  );
}
