import * as React from "react";
import type { IssueReferenceMetadata, MentionReferenceMetadata } from "../api/issue-meta";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import { MarkdownRenderer } from "./-markdown-renderer";
import { buildProjectHref, ProjectMenu } from "./-project-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./-view-models";

const MARKDOWN_CODE_EXTENSIONS = new Set(["markdown", "mdown", "mkdn", "mkd", "md", "mdwn"]);

export interface CodeHistoryViewModel {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commits: Array<{
    authorDate: string;
    authorEmail: string;
    authorName: string;
    commentCount: number;
    commitId: string;
    commitShortId: string;
    message: string;
    shortMessage: string;
  }>;
  hasNewer: boolean;
  hasOlder: boolean;
  noHead: boolean;
  ownerName: string;
  page: number;
  path: string;
  projectName: string;
  selectedBranch: string;
}

export interface CodeCommitDetailViewModel {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commit: CodeHistoryViewModel["commits"][number] | null;
  files: Array<{ path: string; patch: string }>;
  noHead: boolean;
  ownerName: string;
  parentCommit: { commitId: string; commitShortId: string } | null;
  path: string;
  permissions: {
    canComment: boolean;
    canUpdateThreadState: boolean;
  };
  projectName: string;
  selectedBranch: string;
  threads: CodeReviewThreadViewModel[];
}

export interface CodeReviewCommentViewModel {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  canDelete: boolean;
  contentsHtml: string;
  contentsMarkdown: string;
  createdLabel: string;
  id: number;
  issueReferences?: IssueReferenceMetadata[];
  mentionReferences?: MentionReferenceMetadata[];
  threadId: number;
  viaEmail: boolean;
}

export interface CodeReviewThreadViewModel {
  authorId: number;
  authorLabel: string;
  authorLoginId: string;
  comments: CodeReviewCommentViewModel[];
  commitId: string;
  createdLabel: string;
  endLine?: number;
  id: number;
  path: string;
  prevCommitId: string;
  startLine?: number;
  state: string;
}

export type CommitDiscussionCommentSubmitInput = {
  attachmentIds?: number[];
  contentsMarkdown: string;
  endLine?: number;
  path?: string;
  startLine?: number;
  threadId?: number;
};

export interface CodeCompareViewModel {
  commitA: CodeHistoryViewModel["commits"][number] | null;
  commitB: CodeHistoryViewModel["commits"][number] | null;
  files: Array<{ path: string; patch: string }>;
  noHead: boolean;
  ownerName: string;
  projectName: string;
  revA: string;
  revB: string;
}

export interface CodeBranchListViewModel {
  branches: Array<{
    commitDate: string;
    commitId: string;
    commitMessage: string;
    commitShortId: string;
    isDefault: boolean;
    name: string;
    pullRequest: {
      ownerName: string;
      projectName: string;
      pullRequestNumber: number;
      state: string;
    } | null;
    shortName: string;
  }>;
  defaultBranch: string;
  noHead: boolean;
  ownerName: string;
  permissions: {
    canDelete: boolean;
    canUpdate: boolean;
  };
  projectName: string;
}

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

function encodePathSegments(path: string) {
  const encodedSegments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment.length > 0) {
      encodedSegments.push(encodeURIComponent(segment));
    }
  }
  return encodedSegments.join("/");
}

function codeFileAssetHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  routeName: "files" | "image" | "rawcode",
  branch: string,
  path: string,
) {
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `${routeName}/${encodeURIComponent(branch)}/${encodePathSegments(path)}`,
  );
}

function codeArchiveHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
) {
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `code/${encodeURIComponent(branch)}/download`,
  );
}

function codeFileIsMarkdown(file: NonNullable<CodeBrowserViewModel["file"]>) {
  const extension = file.path.split(".").pop()?.toLowerCase() ?? "";
  return MARKDOWN_CODE_EXTENSIONS.has(extension);
}

function branchSetDefaultHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
) {
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `code/${encodeURIComponent(branch)}/setAsDefault`,
  );
}

function branchDeleteHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
) {
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `code/${encodeURIComponent(branch)}/`,
  );
}

function codeHistoryHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
  path = "",
  page?: number,
) {
  const suffix = path
    ? `commits/${encodeURIComponent(branch)}/${encodePathSegments(path)}`
    : branch
      ? `commits/${encodeURIComponent(branch)}`
      : "commits";
  const href = buildProjectHref(runtimeConfig, ownerName, projectName, suffix);
  if (page === undefined || page <= 0) {
    return href;
  }
  return `${href}?page=${page}`;
}

function pullRequestHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  pullRequestNumber: number,
) {
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `pullRequest/${pullRequestNumber}`,
  );
}

function commitDetailHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  commitId: string,
  branch: string,
  path = "",
) {
  const href = buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `commit/${encodeURIComponent(commitId)}`,
  );
  if (!branch && !path) {
    return href;
  }
  const searchParams = new URLSearchParams();
  if (branch) {
    searchParams.set("branch", branch);
  }
  if (path) {
    searchParams.set("path", path);
  }
  const anchor = path ? `#${path.replace(/[/.]/g, "-")}` : "";
  return `${href}?${searchParams.toString()}${anchor}`;
}

function diffAnchorId(path: string) {
  return path.replace(/[/.]/g, "-");
}

type ParsedDiffLine = {
  commentLine?: number;
  key: string;
  kind: "add" | "context" | "hunk" | "meta" | "remove";
  newLine?: number;
  oldLine?: number;
  text: string;
};

type InlineCommentDraft = {
  endLine: number;
  path: string;
  startLine: number;
};

function closestDiffSelectionRow(node: Node, table: HTMLTableElement): HTMLTableRowElement | null {
  const element = node instanceof Element ? node : node.parentElement;
  const row = element?.closest<HTMLTableRowElement>("tr[data-line]");
  return row && table.contains(row) ? row : null;
}

function diffRowLine(row: HTMLTableRowElement): number | null {
  const line = Number.parseInt(row.dataset.line ?? "", 10);
  return Number.isInteger(line) && line > 0 ? line : null;
}

function rowHasCommentableCode(row: HTMLTableRowElement): boolean {
  return row.dataset.line !== undefined && row.querySelector("td.code > pre") !== null;
}

function inlineCommentDraftFromSelection(
  path: string,
  table: HTMLTableElement,
): InlineCommentDraft | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const anchorRow = closestDiffSelectionRow(range.startContainer, table);
  const focusRow = closestDiffSelectionRow(range.endContainer, table);
  if (!anchorRow || !focusRow) {
    return null;
  }

  const rows = Array.from(table.rows);
  const anchorIndex = rows.indexOf(anchorRow);
  const focusIndex = rows.indexOf(focusRow);
  if (anchorIndex < 0 || focusIndex < 0) {
    return null;
  }

  const startIndex = Math.min(anchorIndex, focusIndex);
  const endIndex = Math.max(anchorIndex, focusIndex);
  const selectedRows = rows.slice(startIndex, endIndex + 1);
  if (!selectedRows.every(rowHasCommentableCode)) {
    return null;
  }

  const startLine = diffRowLine(rows[startIndex]);
  const endLine = diffRowLine(rows[endIndex]);
  if (startLine === null || endLine === null) {
    return null;
  }

  return { endLine, path, startLine };
}

function parseUnifiedDiffLines(patch: string): ParsedDiffLine[] {
  const lines = patch.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  return lines.map((text, index) => {
    const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (hunkMatch) {
      oldLine = Number.parseInt(hunkMatch[1] ?? "0", 10);
      newLine = Number.parseInt(hunkMatch[2] ?? "0", 10);
      inHunk = true;
      return { key: `${index}:hunk`, kind: "hunk", text };
    }

    if (
      !inHunk ||
      text.startsWith("diff ") ||
      text.startsWith("index ") ||
      text.startsWith("---") ||
      text.startsWith("+++")
    ) {
      return { key: `${index}:meta`, kind: "meta", text };
    }

    if (text.startsWith("+")) {
      const line = newLine;
      newLine += 1;
      return {
        commentLine: line,
        key: `${index}:add:${line}`,
        kind: "add",
        newLine: line,
        text,
      };
    }

    if (text.startsWith("-")) {
      const line = oldLine;
      oldLine += 1;
      return {
        commentLine: line,
        key: `${index}:remove:${line}`,
        kind: "remove",
        oldLine: line,
        text,
      };
    }

    const lineOld = oldLine;
    const lineNew = newLine;
    oldLine += 1;
    newLine += 1;
    return {
      commentLine: lineNew,
      key: `${index}:context:${lineNew}`,
      kind: "context",
      newLine: lineNew,
      oldLine: lineOld,
      text,
    };
  });
}

function diffLineClass(kind: ParsedDiffLine["kind"]) {
  return kind === "hunk" ? "range" : kind;
}

function commitDiscussionApiHref(
  runtimeConfig: RuntimeConfig,
  commitDetail: CodeCommitDetailViewModel,
  suffix: string,
) {
  return `${runtimeConfig.apiBaseUrl}/v1/projects/${encodeURIComponent(
    commitDetail.ownerName,
  )}/${encodeURIComponent(commitDetail.projectName)}/commit/${encodeURIComponent(
    commitDetail.commit?.commitId ?? "",
  )}${suffix}`;
}

function commitDiscussionMarkdownCommitReferences(commitDetail: CodeCommitDetailViewModel) {
  const references: Array<{
    commitId: string;
    ownerName: string;
    projectName: string;
    title?: string;
  }> = [];
  if (commitDetail.commit?.commitId) {
    references.push({
      commitId: commitDetail.commit.commitId,
      ownerName: commitDetail.ownerName,
      projectName: commitDetail.projectName,
      title: commitDetail.commit.shortMessage || commitDetail.commit.commitId,
    });
  }
  if (commitDetail.parentCommit?.commitId) {
    references.push({
      commitId: commitDetail.parentCommit.commitId,
      ownerName: commitDetail.ownerName,
      projectName: commitDetail.projectName,
    });
  }
  return references;
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
              {selectedBranch ? (
                <a
                  className="ybtn"
                  href={codeArchiveHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    selectedBranch,
                  )}
                >
                  Download
                </a>
              ) : null}
            </div>
            {code?.file ? (
              <CodeFileView
                file={code.file}
                ownerName={detail.ownerName}
                projectName={detail.projectName}
                runtimeConfig={props.runtimeConfig}
                selectedBranch={selectedBranch}
              />
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

export function CodeCommitDetailPage(props: {
  commitDetail: CodeCommitDetailViewModel | null;
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  onCloseThread?: (threadId: number) => Promise<void> | void;
  onCreateComment?: (input: CommitDiscussionCommentSubmitInput) => Promise<void> | void;
  onDeleteComment?: (commentId: number) => Promise<void> | void;
  onOpenThread?: (threadId: number) => Promise<void> | void;
  onUpdateComment?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void> | void;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const commitDetail = props.commitDetail;
  const commit = commitDetail?.commit ?? null;
  const selectedBranch = commitDetail?.selectedBranch ?? "";
  const selectedPath = commitDetail?.path ?? "";
  const listHref = codeHistoryHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    selectedBranch,
    selectedPath,
  );

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{commit?.shortMessage ?? "Commit"}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="code-browse-wrap" id="code-browse-wrap">
            <nav aria-label="Code tabs" className="nav nav-tabs">
              <a
                href={codeHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  selectedBranch,
                )}
              >
                Files
              </a>
              <a
                aria-current="page"
                href={codeHistoryHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  selectedBranch,
                )}
              >
                Commits
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
            {commitDetail?.noHead ? (
              <div className="alert alert-block">
                <h2>The repository is empty!</h2>
                <p>{`Clone URL: ${detail.cloneUrl ?? ""}`}</p>
              </div>
            ) : (
              <CodeCommitDiffView
                commitDetail={commitDetail}
                csrfToken={props.csrfToken}
                runtimeConfig={props.runtimeConfig}
                onCloseThread={props.onCloseThread}
                onCreateComment={props.onCreateComment}
                onDeleteComment={props.onDeleteComment}
                onOpenThread={props.onOpenThread}
                onUpdateComment={props.onUpdateComment}
              />
            )}
          </div>
          <button className="pull-left ybtn" id="watch-button" type="button">
            Watch
          </button>
          <a className="ybtn pull-right" href={listHref}>
            List
          </a>
        </div>
      </div>
    </main>
  );
}

export function CodeComparePage(props: {
  compare: CodeCompareViewModel | null;
  detail: ProjectDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const compare = props.compare;
  const files = compare?.files ?? [];
  const revA = compare?.commitA?.commitId ?? compare?.revA ?? "";
  const revB = compare?.commitB?.commitId ?? compare?.revB ?? "";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Compare</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="project-page-wrap">
        <div className="code-browse-wrap">
          {compare?.noHead ? (
            <div className="alert alert-block">
              <h2>The repository is empty!</h2>
              <p>{`Clone URL: ${detail.cloneUrl ?? ""}`}</p>
            </div>
          ) : (
            <>
              <p className="commitInfo">
                <strong className="commitId">{revA && revB ? `@${revA}..${revB}` : ""}</strong>
              </p>
              {files.length === 0 ? (
                <div className="alert">No changes</div>
              ) : (
                <div className="diff-body discommentable">
                  {files.map((file) => (
                    <article className="diff-file" id={diffAnchorId(file.path)} key={file.path}>
                      <h2>{file.path}</h2>
                      <pre className="diff-code">
                        <code>{file.patch}</code>
                      </pre>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export function CodeBranchListPage(props: {
  branchList: CodeBranchListViewModel | null;
  detail: ProjectDetailViewModel | null;
  onDeleteBranch: (branchName: string) => Promise<void>;
  onSetDefaultBranch: (branchName: string) => Promise<void>;
  pendingBranchName?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const branchList = props.branchList;
  const defaultBranch = branchList?.defaultBranch || "HEAD";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Branches</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="bubble-wrap dark-gray repo-wrap">
            <div className="code-browse-wrap">
              <ul className="nav nav-tabs">
                <li>
                  <a
                    href={codeHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      defaultBranch,
                    )}
                  >
                    Files
                  </a>
                </li>
                <li>
                  <a
                    href={codeHistoryHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      defaultBranch,
                    )}
                  >
                    Commits
                  </a>
                </li>
                <li className="active">
                  <a
                    aria-current="page"
                    href={buildProjectHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      "branches",
                    )}
                  >
                    Branches
                  </a>
                </li>
              </ul>
              {branchList?.noHead ? (
                <div className="alert alert-block">
                  <h2>The repository is empty!</h2>
                  <p>{`Clone URL: ${detail.cloneUrl ?? ""}`}</p>
                </div>
              ) : (
                <CodeBranchTable
                  branchList={branchList}
                  detail={detail}
                  onDeleteBranch={props.onDeleteBranch}
                  onSetDefaultBranch={props.onSetDefaultBranch}
                  pendingBranchName={props.pendingBranchName}
                  runtimeConfig={props.runtimeConfig}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CodeBranchTable(props: {
  branchList: CodeBranchListViewModel | null;
  detail: ProjectDetailViewModel;
  onDeleteBranch: (branchName: string) => Promise<void>;
  onSetDefaultBranch: (branchName: string) => Promise<void>;
  pendingBranchName?: string;
  runtimeConfig: RuntimeConfig;
}) {
  const branchList = props.branchList;
  const branches = branchList?.branches ?? [];
  const showActions =
    branchList?.permissions.canDelete === true || branchList?.permissions.canUpdate === true;
  return (
    <table className="table branch-list-wrap">
      <thead className="thead">
        <tr>
          <th>Branches</th>
          <th>Commit</th>
          <th>Pull Request</th>
          {showActions ? <th></th> : null}
        </tr>
      </thead>
      <tbody>
        {branches.length === 0 ? (
          <tr>
            <td className="warning-none" colSpan={showActions ? 4 : 3}>
              No branches
            </td>
          </tr>
        ) : (
          branches.map((branch) => (
            <CodeBranchRow
              branch={branch}
              canDelete={branchList?.permissions.canDelete === true}
              canUpdate={branchList?.permissions.canUpdate === true}
              detail={props.detail}
              key={branch.name}
              onDeleteBranch={props.onDeleteBranch}
              onSetDefaultBranch={props.onSetDefaultBranch}
              pending={props.pendingBranchName === branch.name}
              runtimeConfig={props.runtimeConfig}
              showActions={showActions}
            />
          ))
        )}
      </tbody>
    </table>
  );
}

function CodeBranchRow(props: {
  branch: CodeBranchListViewModel["branches"][number];
  canDelete: boolean;
  canUpdate: boolean;
  detail: ProjectDetailViewModel;
  onDeleteBranch: (branchName: string) => Promise<void>;
  onSetDefaultBranch: (branchName: string) => Promise<void>;
  pending: boolean;
  runtimeConfig: RuntimeConfig;
  showActions: boolean;
}) {
  const branch = props.branch;
  return (
    <tr className={branch.isDefault ? "head" : undefined}>
      <td className="branchName">
        <a
          href={codeHref(
            props.runtimeConfig,
            props.detail.ownerName,
            props.detail.projectName,
            branch.name,
          )}
        >
          {branch.shortName || branch.name}
        </a>
        {branch.isDefault ? <span className="headBranch ml10">Default branch</span> : null}
      </td>
      <td className="commit">
        <a
          className="commitId"
          href={codeHistoryHref(
            props.runtimeConfig,
            props.detail.ownerName,
            props.detail.projectName,
            branch.name,
          )}
          title={branch.commitId}
        >
          {branch.commitShortId}
        </a>
        <span className="date" title={branch.commitDate}>
          {branch.commitDate}
        </span>
        {branch.commitMessage ? (
          <pre className="commitMsg desc hidden">{branch.commitMessage}</pre>
        ) : null}
      </td>
      <td className="pullRequest">
        {branch.pullRequest ? (
          <a
            className={`blue-txt pullrequest-state ${branch.pullRequest.state.toLowerCase()}`}
            href={pullRequestHref(
              props.runtimeConfig,
              branch.pullRequest.ownerName,
              branch.pullRequest.projectName,
              branch.pullRequest.pullRequestNumber,
            )}
            title={`pullRequest.state.${branch.pullRequest.state.toLowerCase()}`}
          >
            {`pullRequest-${branch.pullRequest.pullRequestNumber}`}
          </a>
        ) : (
          <span className="disabled">No pull request</span>
        )}
      </td>
      {props.showActions ? (
        <td className="actions">
          {props.canUpdate && !branch.isDefault ? (
            <button
              className="ybtn ybtn-default ybtn-small"
              data-request-method="post"
              data-request-uri={branchSetDefaultHref(
                props.runtimeConfig,
                props.detail.ownerName,
                props.detail.projectName,
                branch.name,
              )}
              disabled={props.pending}
              onClick={() => {
                void props.onSetDefaultBranch(branch.name);
              }}
              type="button"
            >
              Set as default
            </button>
          ) : null}
          {props.canDelete && !branch.isDefault ? (
            <a
              className="ybtn ybtn-danger ybtn-small"
              data-request-method="delete"
              href={branchDeleteHref(
                props.runtimeConfig,
                props.detail.ownerName,
                props.detail.projectName,
                branch.name,
              )}
              onClick={(event) => {
                event.preventDefault();
                void props.onDeleteBranch(branch.name);
              }}
            >
              Delete
            </a>
          ) : null}
        </td>
      ) : null}
    </tr>
  );
}

function CodeCommitDiffView(props: {
  commitDetail: CodeCommitDetailViewModel | null;
  csrfToken?: string;
  onCloseThread?: (threadId: number) => Promise<void> | void;
  onCreateComment?: (input: CommitDiscussionCommentSubmitInput) => Promise<void> | void;
  onDeleteComment?: (commentId: number) => Promise<void> | void;
  onOpenThread?: (threadId: number) => Promise<void> | void;
  onUpdateComment?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void> | void;
  runtimeConfig: RuntimeConfig;
}) {
  const commitDetail = props.commitDetail;
  const commit = commitDetail?.commit;
  const files = commitDetail?.files ?? [];
  const threads = commitDetail?.threads ?? [];
  const nonRangedThreads = threads.filter((thread) => !thread.path);
  const openThreads = threads.filter((thread) => thread.state.toLowerCase() !== "closed");
  const closedThreads = threads.filter((thread) => thread.state.toLowerCase() === "closed");
  const [commentText, setCommentText] = React.useState("");
  const [commentAttachmentIds, setCommentAttachmentIds] = React.useState<number[]>([]);
  const [inlineComment, setInlineComment] = React.useState<InlineCommentDraft | null>(null);
  const [inlineCommentText, setInlineCommentText] = React.useState("");
  const [inlineAttachmentIds, setInlineAttachmentIds] = React.useState<number[]>([]);
  const canComment = commitDetail?.permissions.canComment ?? false;

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = commentText.trim();
    if (!contentsMarkdown || !props.onCreateComment) {
      return;
    }
    await props.onCreateComment({ attachmentIds: commentAttachmentIds, contentsMarkdown });
    setCommentAttachmentIds([]);
    setCommentText("");
  }

  function showInlineComment(path: string, line: number) {
    setInlineComment({ endLine: line, path, startLine: line });
    setInlineCommentText("");
    setInlineAttachmentIds([]);
  }

  function showInlineCommentFromSelection(path: string, table: HTMLTableElement) {
    if (!canComment) {
      return;
    }
    const selectedDraft = inlineCommentDraftFromSelection(path, table);
    if (!selectedDraft) {
      return;
    }
    setInlineComment(selectedDraft);
    setInlineCommentText("");
    setInlineAttachmentIds([]);
    window.getSelection()?.removeAllRanges();
  }

  async function submitInlineComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = inlineCommentText.trim();
    if (!contentsMarkdown || !inlineComment || !props.onCreateComment) {
      return;
    }
    await props.onCreateComment({
      attachmentIds: inlineAttachmentIds,
      contentsMarkdown,
      endLine: inlineComment.endLine,
      path: inlineComment.path,
      startLine: inlineComment.startLine,
    });
    setInlineAttachmentIds([]);
    setInlineCommentText("");
    setInlineComment(null);
  }

  function rangedThreadsForLine(path: string, line: number) {
    return threads.filter(
      (thread) => thread.path === path && (thread.endLine ?? thread.startLine) === line,
    );
  }

  return (
    <div className="codediff-wrap">
      <button className="ybtn ybtn-default btn-show-reviewcards" type="button">
        Review cards
      </button>
      <div className="diffs-wrap">
        <div className="commitInfo">
          <div className="commitAuthor">
            <strong>{commit?.authorName || "Anonymous"}</strong>
            {commit?.authorEmail ? <span>{` <${commit.authorEmail}>`}</span> : null}
            {commit?.authorDate ? (
              <span className="ago" title={commit.authorDate}>
                {commit.authorDate}
              </span>
            ) : null}
          </div>
          <div className="commitMsg-wrap">
            <strong>{commit?.shortMessage ?? ""}</strong>
            {commit && commit.message !== commit.shortMessage ? (
              <pre className="commitMsg desc">{commit.message}</pre>
            ) : null}
          </div>
          <div className="commitId-wrap">
            <strong className="commitId">{commit ? `@${commit.commitId}` : ""}</strong>
            {commitDetail?.parentCommit ? (
              <span className="parentCommit">
                {` parent @${commitDetail.parentCommit.commitShortId}`}
              </span>
            ) : null}
          </div>
        </div>

        <div className="diff-body">
          {files.length === 0 ? (
            <div className="warning-none">No changed file diff is available.</div>
          ) : (
            files.map((file) => {
              const diffLines = parseUnifiedDiffLines(file.patch);
              return (
                <article
                  className="diff-file diff-container"
                  data-file-path={file.path}
                  id={diffAnchorId(file.path)}
                  key={file.path}
                >
                  <h2>{file.path}</h2>
                  <table
                    className="diff-code diff-table"
                    onMouseUp={(event) =>
                      showInlineCommentFromSelection(file.path, event.currentTarget)
                    }
                  >
                    <tbody>
                      {diffLines.map((line) => {
                        const lineThreads =
                          line.commentLine === undefined
                            ? []
                            : rangedThreadsForLine(file.path, line.commentLine);
                        const isInlineFormOpen =
                          inlineComment?.path === file.path &&
                          inlineComment.endLine === line.commentLine;
                        return (
                          <React.Fragment key={line.key}>
                            <tr
                              className={diffLineClass(line.kind)}
                              data-line={line.commentLine}
                              data-side={line.kind === "remove" ? "A" : "B"}
                              data-type={diffLineClass(line.kind)}
                            >
                              <td className="linenum">
                                {line.commentLine !== undefined && canComment ? (
                                  <button
                                    aria-label={`Comment on ${file.path}:${line.commentLine}`}
                                    className="btn-transparent line-comment-trigger"
                                    onClick={() =>
                                      showInlineComment(file.path, line.commentLine ?? 0)
                                    }
                                    type="button"
                                  >
                                    Comment
                                  </button>
                                ) : null}
                                <div className="line-number" data-line-num={line.oldLine ?? ""}>
                                  {line.oldLine ?? ""}
                                </div>
                              </td>
                              <td className="linenum">
                                <div className="line-number" data-line-num={line.newLine ?? ""}>
                                  {line.newLine ?? ""}
                                </div>
                              </td>
                              <td className={line.kind === "hunk" ? "hunk" : "code"}>
                                <pre className="diff-partial-codeline">{line.text}</pre>
                              </td>
                            </tr>
                            {isInlineFormOpen && commitDetail && inlineComment ? (
                              <tr
                                className="comments board-comment-wrap inline-comment-form-row"
                                data-range-endline={inlineComment.endLine}
                                data-range-path={inlineComment.path}
                                data-range-startline={inlineComment.startLine}
                              >
                                <td colSpan={3}>
                                  <form
                                    action={commitDiscussionApiHref(
                                      props.runtimeConfig,
                                      commitDetail,
                                      "/comments",
                                    )}
                                    className="review-form code-review-form"
                                    method="post"
                                    onSubmit={(event) => {
                                      void submitInlineComment(event);
                                    }}
                                  >
                                    <input name="path" type="hidden" value={file.path} />
                                    <input
                                      name="startLine"
                                      type="hidden"
                                      value={inlineComment.startLine}
                                    />
                                    <input
                                      name="endLine"
                                      type="hidden"
                                      value={inlineComment.endLine}
                                    />
                                    <MarkdownAttachmentTextarea
                                      ariaLabel={`Code review comment on ${file.path}:${inlineComment.startLine}-${inlineComment.endLine}`}
                                      csrfToken={props.csrfToken}
                                      disabled={!canComment}
                                      name="contentsMarkdown"
                                      onAttachmentUpload={(attachment) =>
                                        setInlineAttachmentIds((current) => [
                                          ...current,
                                          attachment.id,
                                        ])
                                      }
                                      onChange={setInlineCommentText}
                                      runtimeConfig={props.runtimeConfig}
                                      value={inlineCommentText}
                                    />
                                    <button
                                      className="ybtn ybtn-success ybtn-small"
                                      disabled={!canComment}
                                      type="submit"
                                    >
                                      Comment
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ) : null}
                            {commitDetail && lineThreads.length > 0 ? (
                              <tr
                                className="comments board-comment-wrap"
                                data-commit-id={commitDetail.commit?.commitId ?? ""}
                              >
                                <td colSpan={3}>
                                  {lineThreads.map((thread) => (
                                    <CommitDiscussionThread
                                      commitDetail={commitDetail}
                                      csrfToken={props.csrfToken}
                                      key={thread.id}
                                      runtimeConfig={props.runtimeConfig}
                                      thread={thread}
                                      onCloseThread={props.onCloseThread}
                                      onCreateComment={props.onCreateComment}
                                      onDeleteComment={props.onDeleteComment}
                                      onOpenThread={props.onOpenThread}
                                      onUpdateComment={props.onUpdateComment}
                                    />
                                  ))}
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </article>
              );
            })
          )}
          <div className="btnPop">
            <button className="ybtn ybtn-info ybtn-small" type="button">
              Comment
            </button>
          </div>
        </div>

        <div className="board-comment-wrap">
          <div className="non-ranged-threads-wrap">
            {commitDetail
              ? nonRangedThreads.map((thread) => (
                  <CommitDiscussionThread
                    commitDetail={commitDetail}
                    csrfToken={props.csrfToken}
                    key={thread.id}
                    runtimeConfig={props.runtimeConfig}
                    thread={thread}
                    onCloseThread={props.onCloseThread}
                    onCreateComment={props.onCreateComment}
                    onDeleteComment={props.onDeleteComment}
                    onOpenThread={props.onOpenThread}
                    onUpdateComment={props.onUpdateComment}
                  />
                ))
              : null}
          </div>
          <form
            action={
              commitDetail
                ? commitDiscussionApiHref(props.runtimeConfig, commitDetail, "/comments")
                : "#"
            }
            className="review-form board-comment-form"
            method="post"
            onSubmit={(event) => {
              void submitComment(event);
            }}
          >
            <MarkdownAttachmentTextarea
              ariaLabel="Commit comment"
              csrfToken={props.csrfToken}
              disabled={!canComment}
              name="contentsMarkdown"
              onAttachmentUpload={(attachment) =>
                setCommentAttachmentIds((current) => [...current, attachment.id])
              }
              onChange={setCommentText}
              runtimeConfig={props.runtimeConfig}
              value={commentText}
            />
            <button className="ybtn" disabled={!canComment} type="submit">
              Comment
            </button>
          </form>
        </div>
      </div>

      <div className="review-wrap span-hard-wrap">
        <div className="review-container">
          <button className="ybtn ybtn-default btn-hide-reviewcards" type="button">
            Hide review cards
          </button>
          <ul className="nav nav-tabs">
            <li className="active">
              <a href="#reviewcards-open">{`Open ${openThreads.length}`}</a>
            </li>
            <li>
              <a href="#reviewcards-closed">{`Closed ${closedThreads.length}`}</a>
            </li>
          </ul>
          <div className="tab-content review-list">
            <div className="tab-pane active" id="reviewcards-open">
              {openThreads.length === 0 ? (
                <span>Open 0</span>
              ) : (
                openThreads.map((thread) => (
                  <CommitDiscussionReviewCard key={thread.id} thread={thread} />
                ))
              )}
            </div>
            <div className="tab-pane" id="reviewcards-closed">
              {closedThreads.length === 0 ? (
                <span>Closed 0</span>
              ) : (
                closedThreads.map((thread) => (
                  <CommitDiscussionReviewCard key={thread.id} thread={thread} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommitDiscussionReviewCard(props: { thread: CodeReviewThreadViewModel }) {
  const firstComment = props.thread.comments[0];
  return (
    <a
      className={`review-card ${props.thread.state.toLowerCase()}`}
      href={`#thread-${props.thread.id}`}
    >
      <p className="content">{firstComment?.contentsMarkdown ?? ""}</p>
      <span className="date" title={props.thread.createdLabel}>
        {props.thread.createdLabel}
      </span>
    </a>
  );
}

function CommitDiscussionThread(props: {
  commitDetail: CodeCommitDetailViewModel;
  csrfToken?: string;
  onCloseThread?: (threadId: number) => Promise<void> | void;
  onCreateComment?: (input: CommitDiscussionCommentSubmitInput) => Promise<void> | void;
  onDeleteComment?: (commentId: number) => Promise<void> | void;
  onOpenThread?: (threadId: number) => Promise<void> | void;
  onUpdateComment?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void> | void;
  runtimeConfig: RuntimeConfig;
  thread: CodeReviewThreadViewModel;
}) {
  const [replyText, setReplyText] = React.useState("");
  const [replyAttachmentIds, setReplyAttachmentIds] = React.useState<number[]>([]);
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editAttachmentIds, setEditAttachmentIds] = React.useState<number[]>([]);
  const state = props.thread.state.toLowerCase() === "closed" ? "closed" : "open";
  const canComment = props.commitDetail.permissions.canComment;
  const stateSuffix = `/threads/${props.thread.id}/${state === "closed" ? "open" : "close"}`;
  const stateAction = commitDiscussionApiHref(props.runtimeConfig, props.commitDetail, stateSuffix);

  function beginEdit(comment: CodeReviewCommentViewModel) {
    setEditingCommentId(comment.id);
    setEditText(comment.contentsMarkdown);
    setEditAttachmentIds([]);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = editText.trim();
    if (!editingCommentId || !contentsMarkdown || !props.onUpdateComment) {
      return;
    }
    await props.onUpdateComment(editingCommentId, contentsMarkdown, editAttachmentIds);
    setEditingCommentId(null);
    setEditText("");
    setEditAttachmentIds([]);
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = replyText.trim();
    if (!contentsMarkdown || !props.onCreateComment) {
      return;
    }
    await props.onCreateComment({
      attachmentIds: replyAttachmentIds,
      contentsMarkdown,
      threadId: props.thread.id,
    });
    setReplyAttachmentIds([]);
    setReplyText("");
  }

  return (
    <div
      className={`comment-thread-wrap ${state}${props.thread.path && state === "closed" ? " fold" : ""}`}
      data-range-endline={props.thread.endLine}
      data-range-endside={props.thread.path ? "B" : undefined}
      data-range-path={props.thread.path || undefined}
      data-range-startline={props.thread.startLine}
      data-range-startside={props.thread.path ? "B" : undefined}
      data-state={state}
      data-toggle={props.thread.path ? "CodeCommentThread" : undefined}
      id={`thread-${props.thread.id}`}
    >
      <div className="btn-thread-here btn-thread-minimize">
        <button className="ybtn ybtn-default ybtn-small" type="button">
          Comments
        </button>
      </div>
      <ul className="comments">
        {props.thread.comments.map((comment) => (
          <li className="comment" id={`comment-${comment.id}`} key={comment.id}>
            <div className="comment-avatar">
              <span className="avatar-wrap">{comment.authorLoginId || comment.authorLabel}</span>
            </div>
            <div className="media-body">
              <div className="meta-info">
                <span className="comment_author pull-left">
                  <strong>{comment.authorLoginId || comment.authorLabel}</strong>
                </span>
                <span className="ago">
                  <a href={`#comment-${comment.id}`} title={comment.createdLabel}>
                    {comment.createdLabel}
                  </a>
                </span>
                {comment.canDelete ? (
                  <span className="edit pull-right">
                    {props.onUpdateComment ? (
                      <button
                        className="btn-transparent pull-right"
                        data-request-method="patch"
                        data-request-uri={commitDiscussionApiHref(
                          props.runtimeConfig,
                          props.commitDetail,
                          `/comments/${comment.id}`,
                        )}
                        onClick={() => beginEdit(comment)}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      className="btn-transparent pull-right close"
                      data-request-method="delete"
                      data-request-uri={commitDiscussionApiHref(
                        props.runtimeConfig,
                        props.commitDetail,
                        `/comments/${comment.id}`,
                      )}
                      onClick={() => {
                        void props.onDeleteComment?.(comment.id);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </span>
                ) : null}
              </div>
              {editingCommentId === comment.id ? (
                <form
                  action={commitDiscussionApiHref(
                    props.runtimeConfig,
                    props.commitDetail,
                    `/comments/${comment.id}`,
                  )}
                  className="review-form review-comment-edit-form comment-update-form"
                  id={`comment-editform-${comment.id}`}
                  method="post"
                  onSubmit={(event) => {
                    void submitEdit(event);
                  }}
                >
                  <input name="_method" type="hidden" value="patch" />
                  <MarkdownAttachmentTextarea
                    ariaLabel="Edit commit comment"
                    csrfToken={props.csrfToken}
                    name="contentsMarkdown"
                    onAttachmentUpload={(attachment) =>
                      setEditAttachmentIds((current) => [...current, attachment.id])
                    }
                    onChange={setEditText}
                    runtimeConfig={props.runtimeConfig}
                    value={editText}
                  />
                  <button className="ybtn ybtn-success ybtn-small" type="submit">
                    Save
                  </button>
                  <button
                    className="ybtn ybtn-small"
                    onClick={() => setEditingCommentId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <MarkdownRenderer
                  className="comment-body markdown-wrap"
                  basePath={props.runtimeConfig.basePath}
                  commitReferences={commitDiscussionMarkdownCommitReferences(props.commitDetail)}
                  data-via-email={comment.viaEmail ? "true" : undefined}
                  issueReferences={comment.issueReferences}
                  markdown={comment.contentsMarkdown}
                  mentionReferences={comment.mentionReferences}
                  ownerName={props.commitDetail.ownerName}
                  projectName={props.commitDetail.projectName}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="thread-actrow">
        <button
          className="ybtn ybtn-small"
          data-request-method="post"
          data-request-uri={stateAction}
          onClick={() => {
            if (state === "closed") {
              void props.onOpenThread?.(props.thread.id);
            } else {
              void props.onCloseThread?.(props.thread.id);
            }
          }}
          type="button"
        >
          {state === "closed" ? "Open" : "Close"}
        </button>
      </div>
      <form
        action={commitDiscussionApiHref(props.runtimeConfig, props.commitDetail, "/comments")}
        className="review-form thread-comment-form"
        method="post"
        onSubmit={(event) => {
          void submitReply(event);
        }}
      >
        <input name="threadId" type="hidden" value={props.thread.id} />
        <MarkdownAttachmentTextarea
          ariaLabel="Reply to commit comment"
          csrfToken={props.csrfToken}
          disabled={!canComment}
          name="contentsMarkdown"
          onAttachmentUpload={(attachment) =>
            setReplyAttachmentIds((current) => [...current, attachment.id])
          }
          onChange={setReplyText}
          runtimeConfig={props.runtimeConfig}
          value={replyText}
        />
        <button className="ybtn" disabled={!canComment} type="submit">
          Comment
        </button>
      </form>
    </div>
  );
}

export function CodeHistoryPage(props: {
  detail: ProjectDetailViewModel | null;
  history: CodeHistoryViewModel | null;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const history = props.history;
  const selectedBranch = history?.selectedBranch ?? "";
  const selectedPath = history?.path ?? "";

  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Commit History</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section className="code-browse-wrap">
        {history?.noHead ? (
          <div className="alert alert-block">
            <h2>The repository is empty!</h2>
            <p>{`Clone URL: ${detail.cloneUrl ?? ""}`}</p>
          </div>
        ) : (
          <>
            {selectedPath ? (
              <nav aria-label="Breadcrumbs" className="code-breadcrumb-wrap">
                <a
                  href={codeHistoryHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    selectedBranch,
                  )}
                >
                  {detail.projectName}
                </a>
                {(history?.breadcrumbs ?? []).map((breadcrumb) => (
                  <React.Fragment key={breadcrumb.path}>
                    <span>/</span>
                    <a
                      href={codeHistoryHref(
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
            ) : (
              <div className="code-browse-header">
                <label htmlFor="branches">Branch</label>
                <select
                  id="branches"
                  onChange={(event) => {
                    window.location.assign(
                      codeHistoryHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        event.currentTarget.value,
                      ),
                    );
                  }}
                  value={selectedBranch}
                >
                  {(history?.branches ?? []).map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <nav aria-label="Code tabs">
                  <a
                    href={codeHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      selectedBranch,
                    )}
                  >
                    Files
                  </a>
                  <a
                    aria-current="page"
                    href={codeHistoryHref(
                      props.runtimeConfig,
                      detail.ownerName,
                      detail.projectName,
                      selectedBranch,
                    )}
                  >
                    Commits
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
              </div>
            )}
            <CodeHistoryTable
              history={history}
              ownerName={detail.ownerName}
              projectName={detail.projectName}
              runtimeConfig={props.runtimeConfig}
              selectedBranch={selectedBranch}
            />
          </>
        )}
      </section>
    </main>
  );
}

function CodeHistoryTable(props: {
  history: CodeHistoryViewModel | null;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const history = props.history;
  const commits = history?.commits ?? [];
  const path = history?.path ?? "";
  return (
    <>
      <div id="history" className="commit-wrap">
        <table className={`code-table commits${path ? " mt10" : ""}`}>
          <thead className="thead">
            <tr>
              <td className="commit-id">
                <strong>@</strong>
              </td>
              <td className="messages">
                <strong>Commit message</strong>
              </td>
              {path ? <td className="browse"></td> : null}
              <td className="date">
                <strong>Author date</strong>
              </td>
              <td className="author">
                <strong>Author</strong>
              </td>
            </tr>
          </thead>
          <tbody className="tbody">
            {commits.length === 0 ? (
              <tr>
                <td className="warning-none" colSpan={path ? 5 : 4}>
                  No commits
                </td>
              </tr>
            ) : (
              commits.map((commit) => {
                const showCommitHref = commitDetailHref(
                  props.runtimeConfig,
                  props.ownerName,
                  props.projectName,
                  commit.commitId,
                  props.selectedBranch,
                  path,
                );
                return (
                  <tr key={commit.commitId}>
                    <td className="commit-id">
                      <button
                        className="ybtn ybtn-mini btn-copy-commitId"
                        data-commit-id={commit.commitId}
                        title="Copy commit id"
                        type="button"
                      >
                        Copy
                      </button>
                      <a href={showCommitHref} title="Show commit">
                        {commit.commitShortId}
                      </a>
                    </td>
                    <td className="messages">
                      {commit.commentCount > 0 ? (
                        <span className="number-of-comments">
                          {`Comments ${commit.commentCount}`}
                        </span>
                      ) : null}
                      <a href={showCommitHref}>{commit.shortMessage}</a>
                      {commit.message !== commit.shortMessage ? (
                        <pre className="commitMsg desc hidden">{commit.message}</pre>
                      ) : null}
                    </td>
                    {path ? (
                      <td className="browse">
                        <a
                          className="ybtn"
                          href={codeHref(
                            props.runtimeConfig,
                            props.ownerName,
                            props.projectName,
                            commit.commitShortId,
                            path,
                          )}
                          title="Show code at this commit"
                        >
                          Show code
                        </a>
                      </td>
                    ) : null}
                    <td className="date">{commit.authorDate}</td>
                    <td className="author">
                      <span title={commit.authorEmail}>{commit.authorName || "Anonymous"}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="actrow margin-top-20">
        {history && history.hasNewer ? (
          <a
            className="ybtn pull-left"
            href={codeHistoryHref(
              props.runtimeConfig,
              props.ownerName,
              props.projectName,
              props.selectedBranch,
              path,
              history.page - 1,
            )}
          >
            Newer
          </a>
        ) : null}
        {history && history.hasOlder ? (
          <a
            className="ybtn pull-left"
            href={codeHistoryHref(
              props.runtimeConfig,
              props.ownerName,
              props.projectName,
              props.selectedBranch,
              path,
              history.page + 1,
            )}
          >
            Older
          </a>
        ) : null}
      </div>
    </>
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

function CodeFileView(props: {
  file: NonNullable<CodeBrowserViewModel["file"]>;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const rawHref = codeFileAssetHref(
    props.runtimeConfig,
    props.ownerName,
    props.projectName,
    "rawcode",
    props.selectedBranch,
    props.file.path,
  );
  const openHref = codeFileAssetHref(
    props.runtimeConfig,
    props.ownerName,
    props.projectName,
    "files",
    props.selectedBranch,
    props.file.path,
  );
  const imageHref = codeFileAssetHref(
    props.runtimeConfig,
    props.ownerName,
    props.projectName,
    "image",
    props.selectedBranch,
    props.file.path,
  );
  if (props.file.isBinary) {
    return (
      <div className="file-wrap" data-type="file">
        <CodeFileHeader file={props.file} openHref={openHref} rawHref={rawHref} showRaw={false} />
        {props.file.mimeType.startsWith("image/") ? (
          <div className="image-wrap" id="showImage">
            <img alt={props.file.name} src={imageHref} />
          </div>
        ) : (
          <div className="file-wrap" id="showFile">
            <p>
              <strong className="filename">{props.file.name}</strong>
              <br />
              <span>{`${props.file.size} bytes`}</span>
              <br />
              <a className="filehref ybtn" href={openHref} target="_blank">
                Download
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }
  if (props.file.isTooLarge) {
    return (
      <div className="file-wrap" data-type="file">
        <CodeFileHeader file={props.file} openHref={openHref} rawHref={rawHref} showRaw={false} />
        <p>
          {`Sorry, we cannot show a file larger than ${props.file.size} bytes here.`}
          <br />
          <a className="filehref ybtn" href={rawHref} target="_blank">
            View Raw
          </a>
        </p>
      </div>
    );
  }
  if (codeFileIsMarkdown(props.file)) {
    return (
      <div className="file-wrap" data-type="file">
        <CodeFileHeader file={props.file} openHref={openHref} rawHref={rawHref} showRaw={true} />
        <MarkdownRenderer
          className="markdown-wrap codebrowser-markdown"
          id="codeVal"
          markdown={props.file.text}
        />
      </div>
    );
  }
  return (
    <div className="file-wrap" data-type="file">
      <CodeFileHeader file={props.file} openHref={openHref} rawHref={rawHref} showRaw={true} />
      <CodeTextView file={props.file} />
    </div>
  );
}

function CodeTextView(props: { file: NonNullable<CodeBrowserViewModel["file"]> }) {
  const language = codeLanguageFromFile(props.file.path, props.file.mimeType);
  const lines = codeLines(props.file.text);
  return (
    <pre
      className="code-wrap code-syntax-wrap"
      data-language={language}
      data-mime-type={props.file.mimeType}
      id="showCode"
    >
      {lines.map((line) => (
        <span className="code-line-wrap" data-line-number={line.number} key={line.key}>
          <span aria-hidden="true" className="line-number">
            {line.number}
          </span>
          <code className="line-code">{highlightCodeLine(line.text, language)}</code>
        </span>
      ))}
    </pre>
  );
}

function codeLines(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trimmedTrailingNewline = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  const lines = trimmedTrailingNewline.split("\n");
  const displayLines = lines.length > 0 ? lines : [""];
  return displayLines.map((line, index) => ({
    key: `${index + 1}:${line}`,
    number: index + 1,
    text: line,
  }));
}

function codeLanguageFromFile(path: string, mimeType: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "rs") {
    return "rust";
  }
  if (extension === "java") {
    return "java";
  }
  if (extension === "js" || extension === "jsx" || extension === "ts" || extension === "tsx") {
    return "javascript";
  }
  if (extension === "scala") {
    return "scala";
  }
  if (extension === "html" || extension === "xml") {
    return "markup";
  }
  if (extension === "css" || extension === "less" || extension === "scss") {
    return "css";
  }
  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }
  if (mimeType.includes("json")) {
    return "json";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  return "plain";
}

function highlightCodeLine(line: string, language: string) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;
  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push(line.slice(cursor, index));
    }
    parts.push(
      <span className={`syntax-token ${syntaxTokenClass(token, language)}`} key={tokenIndex}>
        {token}
      </span>,
    );
    tokenIndex += 1;
    cursor = index + token.length;
  }
  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }
  return parts.length > 0 ? parts : "\u00a0";
}

function syntaxTokenClass(token: string, language: string) {
  if (token.startsWith("//") || token.startsWith("/*")) {
    return "syntax-comment";
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    return "syntax-string";
  }
  if (/^\d/.test(token)) {
    return "syntax-number";
  }
  if (isCodeKeyword(token, language)) {
    return "syntax-keyword";
  }
  if (/^[{}()[\].,;:+\-*/%=<>!&|?]+$/.test(token)) {
    return "syntax-punctuation";
  }
  return "syntax-identifier";
}

function isCodeKeyword(token: string, language: string) {
  const commonKeywords = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "else",
    "enum",
    "false",
    "for",
    "if",
    "import",
    "interface",
    "let",
    "new",
    "null",
    "private",
    "protected",
    "public",
    "return",
    "static",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "void",
    "while",
  ]);
  const rustKeywords = new Set([
    "as",
    "async",
    "await",
    "crate",
    "dyn",
    "fn",
    "impl",
    "let",
    "match",
    "mod",
    "mut",
    "pub",
    "self",
    "struct",
    "trait",
    "type",
    "use",
    "where",
  ]);
  const cssKeywords = new Set(["important", "media", "supports"]);
  return (
    commonKeywords.has(token) ||
    (language === "rust" && rustKeywords.has(token)) ||
    (language === "css" && cssKeywords.has(token))
  );
}

function CodeFileHeader(props: {
  file: NonNullable<CodeBrowserViewModel["file"]>;
  openHref: string;
  rawHref: string;
  showRaw: boolean;
}) {
  return (
    <div className="file-header">
      <div id="fileInfo" className="file-info">
        <strong>{props.file.name}</strong>
        <span>{props.file.mimeType}</span>
        <span>{`${props.file.size} bytes`}</span>
      </div>
      <div className="pull-right">
        {props.showRaw ? (
          <a className="ybtn" href={props.rawHref} target="_blank">
            Raw
          </a>
        ) : null}
        <a
          className="ybtn"
          data-content="Open file in browser"
          href={props.openHref}
          id="open-in-browser"
          target="_blank"
        >
          Open
        </a>
      </div>
    </div>
  );
}
