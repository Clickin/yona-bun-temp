import * as React from "react";

import { LEGACY_DEFAULT_LANGUAGE, lookupLegacyMessage } from "../i18n";
import { highlightCodeLine } from "./-syntax-highlighting";
import type { IssueReferenceMetadata, MentionReferenceMetadata } from "../api/issue-meta";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import { LegacyMarkdownEditorShell, MarkdownRenderer } from "./-markdown-renderer";
import { buildProjectHref, ProjectHeader, ProjectMenu } from "./-project-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./-view-models";

type LegacyMessageLookup = (
  key: string,
  options?: { args?: (number | string)[]; fallback?: string },
) => string;

function legacyMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  argsOrOptions?: (number | string)[] | { args?: (number | string)[]; fallback?: string },
) {
  const args = Array.isArray(argsOrOptions) ? argsOrOptions : argsOrOptions?.args;
  const fallbackText = Array.isArray(argsOrOptions) ? key : (argsOrOptions?.fallback ?? key);
  if (messages) {
    return messages(key, { args, fallback: fallbackText });
  }
  return lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { args, fallback: fallbackText });
}

const LEGACY_ANONYMOUS_USER_NAME = "User.anonymous.name";

const MARKDOWN_CODE_EXTENSIONS = new Set([
  "license",
  "markdown",
  "mdown",
  "mkdn",
  "mkd",
  "md",
  "mdwn",
  "readme",
]);

export interface CodeHistoryViewModel {
  branches: Array<{ name: string }>;
  breadcrumbs: Array<{ name: string; path: string }>;
  commits: Array<{
    authorAvatarUrl?: string;
    authorDate: string;
    authorEmail: string;
    authorLoginId?: string;
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
    showCode: true,
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
}

function codeCloneUrl(detail: ProjectDetailViewModel) {
  return detail.cloneUrl || `${detail.ownerName}/${detail.projectName}`;
}

function isSvnProject(detail: ProjectDetailViewModel) {
  return (
    detail.vcs?.toLowerCase().includes("svn") || detail.vcs?.toLowerCase().includes("subversion")
  );
}

function CodeNoHeadBlock(props: {
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail;
  const projectName = detail.projectName || "project";
  const cloneUrl = codeCloneUrl(detail);
  const isSvn = isSvnProject(detail);
  const siteName = props.runtimeConfig.siteName ?? "Yona";

  return (
    <div className="row-fluid code-nohead-wrap">
      <div className="span12">
        <div className="alert alert-block">
          <h4>{legacyMessage(props.messages, "code.nohead")}</h4>
        </div>
        {detail.viewerCanUpdate ? (
          isSvn ? (
            <>
              <h5>{legacyMessage(props.messages, "code.nohead.svn.clone", [siteName])}</h5>
              <pre>
                <code>{`svn co ${cloneUrl}
cd ${projectName}/
echo "# ${projectName}" > README.md
svn add README.md
svn commit -m "first commit"`}</code>
              </pre>
            </>
          ) : (
            <>
              <h5>{legacyMessage(props.messages, "code.nohead.clone", [siteName])}</h5>
              <pre>
                <code>{`git clone ${cloneUrl} ${projectName}
cd ${projectName}/
echo "# ${projectName}" > README.md
git add README.md
git commit -m "Hello ${siteName}"
git push origin master`}</code>
              </pre>
              <h5>{legacyMessage(props.messages, "code.nohead.init", [siteName])}</h5>
              <pre>
                <code>{`mkdir ${projectName}
cd ${projectName}/
echo "# ${projectName}" > README.md
git init
git add README.md
git commit -m "Hello ${siteName}"
git remote add origin ${cloneUrl}
git push origin master`}</code>
              </pre>
              <h5>{legacyMessage(props.messages, "code.nohead.remote", [siteName])}</h5>
              <pre>
                <code>{`git remote add origin ${cloneUrl}
git push origin master`}</code>
              </pre>
              <h5>{legacyMessage(props.messages, "code.nohead.pull.push")}</h5>
              <pre>
                <code>{`git pull origin master
git push origin master`}</code>
              </pre>
            </>
          )
        ) : null}
      </div>
    </div>
  );
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

function codeNewFileHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
  path: string,
  isFile: boolean,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("path", codeNewFileDirectory(path, isFile));
  searchParams.set("branch", branch);
  return `${buildProjectHref(runtimeConfig, ownerName, projectName, "postform")}?${searchParams.toString()}`;
}

function codeEditFileHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  branch: string,
  path: string,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("path", path);
  searchParams.set("branch", branch);
  searchParams.set("edit", "true");
  return `${buildProjectHref(runtimeConfig, ownerName, projectName, "postform")}?${searchParams.toString()}`;
}

function codeNewFileDirectory(path: string, isFile: boolean) {
  if (!path) {
    return "";
  }
  if (!isFile) {
    return path.endsWith("/") ? path : `${path}/`;
  }
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(0, lastSlash + 1) : "";
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

function diffFileStats(lines: ParsedDiffLine[]) {
  return lines.reduce(
    (stats, line) => {
      if (line.kind === "add") {
        stats.added += 1;
      } else if (line.kind === "remove") {
        stats.deleted += 1;
      }
      return stats;
    },
    { added: 0, deleted: 0 },
  );
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

function commitDiscussionDirectHref(
  runtimeConfig: RuntimeConfig,
  commitDetail: CodeCommitDetailViewModel,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return buildProjectHref(
    runtimeConfig,
    commitDetail.ownerName,
    commitDetail.projectName,
    `commit/${encodeURIComponent(commitDetail.commit?.commitId ?? "")}${normalizedSuffix}`,
  );
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
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const code = props.code;
  const selectedBranch = code?.selectedBranch ?? "";
  const isFileView = Boolean(code?.file);
  const selectedBranchHref = selectedBranch
    ? codeHref(
        props.runtimeConfig,
        detail.ownerName,
        detail.projectName,
        selectedBranch,
        code?.path ?? "",
      )
    : "";

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="code" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <section className="code-browse-wrap">
            {!isFileView ? (
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
                  {legacyMessage(props.messages, "code.files")}
                </a>
                <a
                  href={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "commits",
                  )}
                >
                  {legacyMessage(props.messages, "code.commits")}
                </a>
                <a
                  href={buildProjectHref(
                    props.runtimeConfig,
                    detail.ownerName,
                    detail.projectName,
                    "branches",
                  )}
                >
                  {legacyMessage(props.messages, "title.branches")}
                </a>
              </nav>
            ) : null}
            {code?.noHead ? (
              <CodeNoHeadBlock
                detail={detail}
                messages={props.messages}
                runtimeConfig={props.runtimeConfig}
              />
            ) : (
              <>
                <div className="code-browse-header">
                  <select
                    className={code?.file ? "pull-left mb10" : "pull-left"}
                    data-dropdown-css-class="branches"
                    data-format="branch"
                    data-toggle="select2"
                    id="branches"
                    onChange={(event) => {
                      window.location.assign(event.currentTarget.value);
                    }}
                    value={selectedBranchHref}
                  >
                    {(code?.branches ?? []).map((branch) => {
                      const branchHref = codeHref(
                        props.runtimeConfig,
                        detail.ownerName,
                        detail.projectName,
                        branch.name,
                        code?.path ?? "",
                      );
                      return (
                        <option key={branch.name} value={branchHref}>
                          {branch.name}
                        </option>
                      );
                    })}
                  </select>
                  <div
                    aria-label="Breadcrumbs"
                    className="code-breadcrumb-wrap ml10 pull-left"
                    id="breadcrumbs"
                  >
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
                      <a
                        href={codeHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          selectedBranch,
                          breadcrumb.path,
                        )}
                        key={breadcrumb.path}
                      >
                        {breadcrumb.name}
                      </a>
                    ))}
                  </div>
                  {selectedBranch ? (
                    <div className="pull-right">
                      <a
                        className="ybtn"
                        href={codeArchiveHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          selectedBranch,
                        )}
                      >
                        {legacyMessage(props.messages, "code.download")}
                      </a>
                    </div>
                  ) : null}
                  {selectedBranch && detail.viewerCanUpdate ? (
                    <div className="pull-right">
                      <a
                        className="ybtn"
                        href={codeNewFileHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          selectedBranch,
                          code?.path ?? "",
                          Boolean(code?.file),
                        )}
                        id="new-file-link"
                      >
                        {legacyMessage(props.messages, "code.new.file")}
                      </a>
                    </div>
                  ) : null}
                </div>
                <div className="code-viewer-wrap">
                  <div id="spin" style={{ left: "50%", position: "fixed", top: "50%" }}></div>
                  {code?.file ? (
                    <CodeFileView
                      file={code.file}
                      ownerName={detail.ownerName}
                      projectName={detail.projectName}
                      runtimeConfig={props.runtimeConfig}
                      selectedBranch={selectedBranch}
                      viewerCanUpdate={detail.viewerCanUpdate}
                      messages={props.messages}
                    />
                  ) : (
                    <CodeFolderView
                      entries={code?.entries ?? []}
                      listPath={code?.path ?? ""}
                      ownerName={detail.ownerName}
                      projectName={detail.projectName}
                      runtimeConfig={props.runtimeConfig}
                      selectedBranch={selectedBranch}
                      messages={props.messages}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export function CodeCommitDetailPage(props: {
  commitDetail: CodeCommitDetailViewModel | null;
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  messages?: LegacyMessageLookup;
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
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="code" detail={detail} runtimeConfig={props.runtimeConfig} />
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
                {legacyMessage(props.messages, "code.files")}
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
                {legacyMessage(props.messages, "code.commits")}
              </a>
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "branches",
                )}
              >
                {legacyMessage(props.messages, "title.branches")}
              </a>
            </nav>
            {commitDetail?.noHead ? (
              <CodeNoHeadBlock
                detail={detail}
                messages={props.messages}
                runtimeConfig={props.runtimeConfig}
              />
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
                messages={props.messages}
              />
            )}
          </div>
          <button className="pull-left ybtn" id="watch-button" type="button">
            {legacyMessage(props.messages, "notification.watch")}
          </button>
          <a className="ybtn pull-right" href={listHref}>
            {legacyMessage(props.messages, "button.list")}
          </a>
        </div>
      </div>
    </main>
  );
}

export function CodeComparePage(props: {
  compare: CodeCompareViewModel | null;
  detail: ProjectDetailViewModel | null;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const compare = props.compare;
  const files = compare?.files ?? [];
  const revA = compare?.commitA?.commitId ?? compare?.revA ?? "";
  const revB = compare?.commitB?.commitId ?? compare?.revB ?? "";

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="code" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="code-browse-wrap">
            {compare?.noHead ? (
              <CodeNoHeadBlock
                detail={detail}
                messages={props.messages}
                runtimeConfig={props.runtimeConfig}
              />
            ) : (
              <>
                <p className="commitInfo">
                  <strong className="commitId">{revA && revB ? `@${revA}..${revB}` : ""}</strong>
                </p>
                {files.length === 0 ? (
                  <div className="alert">{legacyMessage(props.messages, "code.noChanges")}</div>
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
      </div>
    </main>
  );
}

export function CodeBranchListPage(props: {
  branchList: CodeBranchListViewModel | null;
  detail: ProjectDetailViewModel | null;
  messages?: LegacyMessageLookup;
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
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="code" detail={detail} runtimeConfig={props.runtimeConfig} />
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
                    {legacyMessage(props.messages, "code.files")}
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
                    {legacyMessage(props.messages, "code.commits")}
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
                    {legacyMessage(props.messages, "title.branches")}
                  </a>
                </li>
              </ul>
              {branchList?.noHead ? (
                <CodeNoHeadBlock
                  detail={detail}
                  messages={props.messages}
                  runtimeConfig={props.runtimeConfig}
                />
              ) : (
                <CodeBranchTable
                  branchList={branchList}
                  detail={detail}
                  onDeleteBranch={props.onDeleteBranch}
                  onSetDefaultBranch={props.onSetDefaultBranch}
                  pendingBranchName={props.pendingBranchName}
                  runtimeConfig={props.runtimeConfig}
                  messages={props.messages}
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
  messages?: LegacyMessageLookup;
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
          <th>{legacyMessage(props.messages, "title.branches")}</th>
          <th>{legacyMessage(props.messages, "code.branches.commit")}</th>
          <th>{legacyMessage(props.messages, "code.branches.pullRequest")}</th>
          {showActions ? <th></th> : null}
        </tr>
      </thead>
      <tbody>
        {branches.map((branch) => (
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
            messages={props.messages}
          />
        ))}
      </tbody>
    </table>
  );
}

function CodeBranchRow(props: {
  branch: CodeBranchListViewModel["branches"][number];
  canDelete: boolean;
  canUpdate: boolean;
  detail: ProjectDetailViewModel;
  messages?: LegacyMessageLookup;
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
        {branch.isDefault ? (
          <span className="headBranch ml10">
            {legacyMessage(props.messages, "code.branches.defaultBranch")}
          </span>
        ) : null}
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
        <span className="date" data-placement="top" data-toggle="tooltip" title={branch.commitDate}>
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
            data-placement="top"
            data-toggle="tooltip"
            href={pullRequestHref(
              props.runtimeConfig,
              branch.pullRequest.ownerName,
              branch.pullRequest.projectName,
              branch.pullRequest.pullRequestNumber,
            )}
            title={legacyMessage(
              props.messages,
              `pullRequest.state.${branch.pullRequest.state.toLowerCase()}`,
            )}
          >
            {`pullRequest-${branch.pullRequest.pullRequestNumber}`}
          </a>
        ) : (
          <span className="disabled">
            {legacyMessage(props.messages, "code.branches.noPullRequest")}
          </span>
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
              {legacyMessage(props.messages, "code.branches.setAsDefault")}
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
              {legacyMessage(props.messages, "button.delete")}
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
  messages?: LegacyMessageLookup;
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
    if (!contentsMarkdown) {
      return;
    }
    await props.onCreateComment?.({ attachmentIds: commentAttachmentIds, contentsMarkdown });
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
    if (!contentsMarkdown || !inlineComment) {
      return;
    }
    await props.onCreateComment?.({
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
        <i className="yobicon-restore"></i>
      </button>
      <div className="diffs-wrap">
        <div className="commitInfo">
          <div className="commitAuthor">
            <strong>{commit?.authorName || LEGACY_ANONYMOUS_USER_NAME}</strong>
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
          {files.map((file) => {
            const diffLines = parseUnifiedDiffLines(file.patch);
            const stats = diffFileStats(diffLines);
            return (
              <article
                className="diff-file diff-container"
                data-file-path={file.path}
                id={diffAnchorId(file.path)}
                key={file.path}
              >
                <h2>
                  <span className="filename">{file.path}</span>
                  <span aria-label="Changed lines" className="diff-stats">
                    <span className="num-added">{`+${stats.added}`}</span>
                    <span className="num-deleted">{`-${stats.deleted}`}</span>
                  </span>
                </h2>
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
                                  <i className="yobicon-post2"></i>
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
                                  action={commitDiscussionDirectHref(
                                    props.runtimeConfig,
                                    commitDetail,
                                    "/comments",
                                  )}
                                  className="review-form code-review-form"
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
                                  <LegacyMarkdownEditorShell
                                    editId={`edit-code-review-${line.key}`}
                                    editorMode="code-review-body"
                                    previewId={`preview-code-review-${line.key}`}
                                  >
                                    <MarkdownAttachmentTextarea
                                      ariaLabel={`Code review comment on ${file.path}:${inlineComment.startLine}-${inlineComment.endLine}`}
                                      className="editorSeries content comment nm"
                                      csrfToken={props.csrfToken}
                                      disabled={!canComment}
                                      editorMode="code-review-body"
                                      id="editor-contents"
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
                                  </LegacyMarkdownEditorShell>
                                  <button
                                    className="ybtn ybtn-success ybtn-small"
                                    disabled={!canComment}
                                    type="submit"
                                  >
                                    {legacyMessage(props.messages, "button.comment.new")}
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
                                    messages={props.messages}
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
          })}
          <div className="btnPop">
            <button className="ybtn ybtn-info ybtn-small" type="button">
              <i className="yobicon-post2"></i>
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
                    messages={props.messages}
                  />
                ))
              : null}
          </div>
          <form
            action={
              commitDetail
                ? commitDiscussionDirectHref(props.runtimeConfig, commitDetail, "/comments")
                : "#"
            }
            className="review-form board-comment-form"
            onSubmit={(event) => {
              void submitComment(event);
            }}
          >
            <div className="write-comment-box">
              <LegacyMarkdownEditorShell
                editId="edit-commit-comment"
                editorMode="comment-body"
                previewId="preview-commit-comment"
              >
                <MarkdownAttachmentTextarea
                  ariaLabel="Commit comment"
                  className="editorSeries content comment nm"
                  csrfToken={props.csrfToken}
                  disabled={!canComment}
                  editorMode="comment-body"
                  id="editor-contents"
                  name="contentsMarkdown"
                  onAttachmentUpload={(attachment) =>
                    setCommentAttachmentIds((current) => [...current, attachment.id])
                  }
                  onChange={setCommentText}
                  runtimeConfig={props.runtimeConfig}
                  value={commentText}
                />
              </LegacyMarkdownEditorShell>
              <div className="write-comment-wrap">
                <div className="right-txt">
                  <button className="ybtn ybtn-success" disabled={!canComment} type="submit">
                    {legacyMessage(props.messages, "button.comment.new")}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="review-wrap span-hard-wrap">
        <div className="review-container">
          <button className="ybtn ybtn-default btn-hide-reviewcards" type="button">
            <i className="yobicon-restore"></i>
          </button>
          <ul className="nav nav-tabs">
            <li className="active">
              <a data-toggle="tab" href="#reviewcards-open">
                {`${legacyMessage(props.messages, "issue.state.open")} ${openThreads.length}`}
              </a>
            </li>
            <li>
              <a data-toggle="tab" href="#reviewcards-closed">
                {`${legacyMessage(props.messages, "issue.state.closed")} ${closedThreads.length}`}
              </a>
            </li>
          </ul>
          <div className="tab-content review-list">
            <div className="tab-pane active" id="reviewcards-open">
              {openThreads.length === 0 ? (
                <span>{`${legacyMessage(props.messages, "issue.state.open")} 0`}</span>
              ) : (
                openThreads.map((thread) => (
                  <CommitDiscussionReviewCard key={thread.id} thread={thread} />
                ))
              )}
            </div>
            <div className="tab-pane" id="reviewcards-closed">
              {closedThreads.length === 0 ? (
                <span>{`${legacyMessage(props.messages, "issue.state.closed")} 0`}</span>
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
  messages?: LegacyMessageLookup;
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
    if (!editingCommentId || !contentsMarkdown) {
      return;
    }
    await props.onUpdateComment?.(editingCommentId, contentsMarkdown, editAttachmentIds);
    setEditingCommentId(null);
    setEditText("");
    setEditAttachmentIds([]);
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = replyText.trim();
    if (!contentsMarkdown) {
      return;
    }
    await props.onCreateComment?.({
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
          <i className="yobicon-post2"></i>
        </button>
      </div>
      <ul className="comments">
        {props.thread.comments.map((comment) => (
          <li className="comment" id={`comment-${comment.id}`} key={comment.id}>
            <div className="comment-avatar">
              {comment.authorLoginId ? (
                <a
                  className="avatar-wrap"
                  data-placement="top"
                  data-toggle="tooltip"
                  href={codeAuthorHref(props.runtimeConfig, comment.authorLoginId)}
                  title={comment.authorLabel}
                >
                  {comment.authorLoginId}
                </a>
              ) : (
                <span className="avatar-wrap">
                  {comment.authorLabel || legacyMessage(props.messages, "issue.noAuthor")}
                </span>
              )}
            </div>
            <div className="media-body">
              <div className="meta-info">
                <span className="comment_author pull-left">
                  {comment.authorLoginId ? (
                    <a
                      data-placement="top"
                      data-toggle="tooltip"
                      href={codeAuthorHref(props.runtimeConfig, comment.authorLoginId)}
                      title={comment.authorLabel}
                    >
                      <strong>{comment.authorLoginId} </strong>
                    </a>
                  ) : (
                    <strong>
                      {comment.authorLabel || legacyMessage(props.messages, "issue.noAuthor")}
                    </strong>
                  )}
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
                        {legacyMessage(props.messages, "button.edit")}
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
                      title={legacyMessage(props.messages, "common.comment.delete")}
                      type="button"
                    >
                      <i className="yobicon-trash"></i>
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
                  onSubmit={(event) => {
                    void submitEdit(event);
                  }}
                >
                  <input name="_method" type="hidden" value="patch" />
                  <LegacyMarkdownEditorShell
                    editId={`edit-${comment.id}`}
                    editorMode="update-comment-body"
                    previewId={`preview-${comment.id}`}
                  >
                    <MarkdownAttachmentTextarea
                      ariaLabel={legacyMessage(props.messages, "button.edit")}
                      className="editorSeries content comment nm"
                      csrfToken={props.csrfToken}
                      editorMode="update-comment-body"
                      id={`editor-contents-${comment.id}`}
                      name="contentsMarkdown"
                      onAttachmentUpload={(attachment) =>
                        setEditAttachmentIds((current) => [...current, attachment.id])
                      }
                      onChange={setEditText}
                      runtimeConfig={props.runtimeConfig}
                      value={editText}
                    />
                  </LegacyMarkdownEditorShell>
                  <div className="upload-drop-here">
                    <div className="msg-wrap">
                      <div className="msg">
                        {legacyMessage(props.messages, "common.attach.dropFilesHere")}
                      </div>
                    </div>
                  </div>
                  <button className="ybtn ybtn-success ybtn-small" type="submit">
                    {legacyMessage(props.messages, "button.save")}
                  </button>
                  <button
                    className="ybtn ybtn-small"
                    onClick={() => setEditingCommentId(null)}
                    type="button"
                  >
                    {legacyMessage(props.messages, "button.cancel")}
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
          {legacyMessage(
            props.messages,
            state === "closed" ? "commentThread.open" : "commentThread.close",
          )}
        </button>
      </div>
      <form
        action={commitDiscussionDirectHref(props.runtimeConfig, props.commitDetail, "/comments")}
        className="review-form thread-comment-form"
        onSubmit={(event) => {
          void submitReply(event);
        }}
      >
        <input name="threadId" type="hidden" value={props.thread.id} />
        <LegacyMarkdownEditorShell
          editId={`edit-thread-comment-${props.thread.id}`}
          editorMode="code-review-body"
          previewId={`preview-thread-comment-${props.thread.id}`}
        >
          <MarkdownAttachmentTextarea
            ariaLabel={legacyMessage(props.messages, "button.comment.new")}
            className="editorSeries content comment nm"
            csrfToken={props.csrfToken}
            disabled={!canComment}
            editorMode="code-review-body"
            id="editor-contents"
            name="contentsMarkdown"
            onAttachmentUpload={(attachment) =>
              setReplyAttachmentIds((current) => [...current, attachment.id])
            }
            onChange={setReplyText}
            runtimeConfig={props.runtimeConfig}
            value={replyText}
          />
        </LegacyMarkdownEditorShell>
        <button className="ybtn" disabled={!canComment} type="submit">
          {legacyMessage(props.messages, "button.comment.new")}
        </button>
      </form>
    </div>
  );
}

export function CodeHistoryPage(props: {
  detail: ProjectDetailViewModel | null;
  history: CodeHistoryViewModel | null;
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const history = props.history;
  const selectedBranch = history?.selectedBranch ?? "";
  const selectedPath = history?.path ?? "";
  const selectedHistoryBranchHref = selectedBranch
    ? codeHistoryHref(props.runtimeConfig, detail.ownerName, detail.projectName, selectedBranch)
    : "";

  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="code" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <section className="code-browse-wrap">
            {history?.noHead ? (
              <CodeNoHeadBlock
                detail={detail}
                messages={props.messages}
                runtimeConfig={props.runtimeConfig}
              />
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
                      <a
                        href={codeHistoryHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          selectedBranch,
                          breadcrumb.path,
                        )}
                        key={breadcrumb.path}
                      >
                        {breadcrumb.name}
                      </a>
                    ))}
                  </nav>
                ) : (
                  <div className="code-browse-header">
                    <select
                      className="pull-right"
                      data-dropdown-css-class="branches"
                      data-format="branch"
                      data-toggle="select2"
                      id="branches"
                      onChange={(event) => {
                        window.location.assign(event.currentTarget.value);
                      }}
                      value={selectedHistoryBranchHref}
                    >
                      {(history?.branches ?? []).map((branch) => {
                        const branchHref = codeHistoryHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          branch.name,
                        );
                        return (
                          <option key={branch.name} value={branchHref}>
                            {branch.name}
                          </option>
                        );
                      })}
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
                        {legacyMessage(props.messages, "code.files")}
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
                        {legacyMessage(props.messages, "code.commits")}
                      </a>
                      <a
                        href={buildProjectHref(
                          props.runtimeConfig,
                          detail.ownerName,
                          detail.projectName,
                          "branches",
                        )}
                      >
                        {legacyMessage(props.messages, "title.branches")}
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
                  messages={props.messages}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function CodeHistoryTable(props: {
  history: CodeHistoryViewModel | null;
  messages?: LegacyMessageLookup;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  const history = props.history;
  const commits = history?.commits ?? [];
  const path = history?.path ?? "";
  const newerHref =
    history && history.hasNewer
      ? codeHistoryHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.selectedBranch,
          path,
          history.page - 1,
        )
      : "";
  const olderHref =
    history && history.hasOlder
      ? codeHistoryHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.selectedBranch,
          path,
          history.page + 1,
        )
      : "";
  React.useEffect(() => {
    if (!newerHref && !olderHref) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "a" && newerHref) {
        window.location.assign(newerHref);
      }
      if (key === "s" && olderHref) {
        window.location.assign(olderHref);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [newerHref, olderHref]);
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
                <strong>{legacyMessage(props.messages, "code.commitMsg")}</strong>
              </td>
              {path ? <td className="browse"></td> : null}
              <td className="date">
                <strong>{legacyMessage(props.messages, "code.authorDate")}</strong>
              </td>
              <td className="author">
                <strong>{legacyMessage(props.messages, "code.author")}</strong>
              </td>
            </tr>
          </thead>
          <tbody className="tbody">
            {commits.length === 0 ? (
              <tr>
                <td className="warning-none" colSpan={path ? 5 : 4}>
                  {legacyMessage(props.messages, "code.nocommits")}
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
                        title={legacyMessage(props.messages, "code.copyCommitId")}
                        type="button"
                      >
                        <i className="yobicon-copy"></i>
                      </button>
                      <a
                        href={showCommitHref}
                        title={legacyMessage(props.messages, "code.showCommit")}
                      >
                        {commit.commitShortId}
                      </a>
                    </td>
                    <td className="messages">
                      {commit.commentCount > 0 ? (
                        <span className="number-of-comments">
                          <i className="yobicon-comments"></i> {commit.commentCount}
                        </span>
                      ) : null}
                      <CodeCommitMessage
                        commit={commit}
                        href={showCommitHref}
                        messages={props.messages}
                      />
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
                          title={legacyMessage(props.messages, "code.showCodeAtThisCommit")}
                        >
                          {legacyMessage(props.messages, "code.showCode")}
                        </a>
                      </td>
                    ) : null}
                    <td className="date" title={commit.authorDate}>
                      {commit.authorDate}
                    </td>
                    <td className="author">
                      <CodeHistoryAuthorCell
                        commit={commit}
                        messages={props.messages}
                        runtimeConfig={props.runtimeConfig}
                      />
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
          <a className="ybtn pull-left" href={newerHref}>
            {legacyMessage(props.messages, "code.newer")}
          </a>
        ) : null}
        {history && history.hasOlder ? (
          <a className="ybtn pull-left" href={olderHref}>
            {legacyMessage(props.messages, "code.older")}
          </a>
        ) : null}
      </div>
    </>
  );
}

function CodeFolderView(props: {
  entries: CodeBrowserViewModel["entries"];
  listPath: string;
  messages?: LegacyMessageLookup;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
}) {
  if (props.entries.length === 0) {
    return (
      <div className="alert alert-warning nm" style={{ borderTop: 0, paddingLeft: 23 }}>
        {legacyMessage(props.messages, "code.nofiles")}
      </div>
    );
  }
  return (
    <div
      className="list-wrap"
      data-list-path={props.listPath ? props.listPath : undefined}
      data-type="folder"
    >
      <div className="row-fluid listhead">
        <div className="span6 filename">
          <strong>{legacyMessage(props.messages, "code.filename")}</strong>
        </div>
        <div className="span4 commitMsg">
          <strong>{legacyMessage(props.messages, "code.commitMsg")}</strong>
        </div>
        <div className="span2 commitDate">
          <strong>{legacyMessage(props.messages, "code.commitDate")}</strong>
        </div>
      </div>
      {props.entries.map((entry) => {
        const rowId = `cb-${entry.path}`;
        const entryHref = codeHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.selectedBranch,
          entry.path,
        );
        const commitHref = commitDetailHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          entry.commitShortId,
          props.selectedBranch,
          entry.path,
        );
        return (
          <div className="row-fluid listitem" data-path={entry.path} id={rowId} key={entry.path}>
            <div className="span6 filename">
              <a
                className={entry.kind === "folder" ? "folder" : "file"}
                data-target-path={entry.path}
                data-type={entry.kind === "folder" ? "folder" : undefined}
                href={entry.kind === "folder" ? `${entryHref}#${rowId}` : entryHref}
                title={entry.name}
              >
                <span className="dynatree-icon vmiddle"></span>
                {entry.name}
              </a>
            </div>
            <div className="span5 commitMsg">
              {entry.authorAvatarUrl ? (
                <a
                  className="avatar-wrap smaller"
                  href={codeAuthorHref(props.runtimeConfig, entry.authorLoginId)}
                >
                  <img
                    alt={entry.authorLabel || entry.authorLoginId || ""}
                    src={entry.authorAvatarUrl}
                  />
                </a>
              ) : null}
              <span className="ml5">
                <a href={commitHref}>
                  {entry.commitMessage || legacyMessage(props.messages, "code.commitMsg.empty")}
                </a>
              </span>
            </div>
            <div className="span1 commitDate">{entry.commitDate}</div>
          </div>
        );
      })}
    </div>
  );
}

function CodeFileView(props: {
  file: NonNullable<CodeBrowserViewModel["file"]>;
  messages?: LegacyMessageLookup;
  ownerName: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
  selectedBranch: string;
  viewerCanUpdate: boolean;
}) {
  const rawRevision = props.file.commitId || props.selectedBranch;
  const rawHref = codeFileAssetHref(
    props.runtimeConfig,
    props.ownerName,
    props.projectName,
    "rawcode",
    rawRevision,
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
  const headerProps = {
    file: props.file,
    openHref,
    ownerName: props.ownerName,
    projectName: props.projectName,
    rawHref,
    runtimeConfig: props.runtimeConfig,
    selectedBranch: props.selectedBranch,
    viewerCanUpdate: props.viewerCanUpdate,
    messages: props.messages,
  };
  if (props.file.isBinary) {
    return (
      <div className="file-wrap" data-type="file">
        <CodeFileHeader {...headerProps} showRaw={false} />
        {props.file.mimeType.startsWith("image/") ? (
          <div className="image-wrap" id="showImage">
            <img alt={props.file.name} src={rawHref} />
          </div>
        ) : (
          <div className="file-wrap" id="showFile">
            <p>
              <strong className="filename">{props.file.name}</strong>
              <br />
              <span className="filesize">{`${props.file.size} bytes`}</span>
              <br />
              <a className="filehref ybtn" href={rawHref} target="_blank">
                <i className="yobicon-download-alt yobicon-white vmiddle"></i>{" "}
                {legacyMessage(props.messages, "button.download")}
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
        <CodeFileHeader {...headerProps} showRaw={false} />
        <p>
          {legacyMessage(props.messages, "code.tooBigFileForCodeBrowser")}
          <br />
          <a className="filehref ybtn" href={rawHref} target="_blank">
            {legacyMessage(props.messages, "code.viewRaw")}
          </a>
        </p>
      </div>
    );
  }
  if (codeFileIsMarkdown(props.file)) {
    return (
      <div className="file-wrap" data-type="file">
        <CodeFileHeader {...headerProps} showRaw={true} />
        <MarkdownRenderer
          basePath={props.runtimeConfig.basePath}
          className="markdown-wrap codebrowser-markdown"
          id="codeVal"
          markdown={props.file.text}
          mentionReferences={props.file.mentionReferences}
          ownerName={props.ownerName}
          projectName={props.projectName}
        />
      </div>
    );
  }
  return (
    <div className="file-wrap" data-type="file">
      <CodeFileHeader {...headerProps} showRaw={true} />
      <div className="hidden" id="codeVal">
        {props.file.text}
      </div>
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
  if (["a", "a86"].includes(extension)) {
    return "assembly_x86";
  }
  if (extension === "ada") {
    return "ada";
  }
  if (extension === "d") {
    return "d";
  }
  if (extension === "java") {
    return "java";
  }
  if (extension === "jsp") {
    return "jsp";
  }
  if (extension === "py") {
    return "python";
  }
  if (extension === "sh") {
    return "sh";
  }
  if (extension === "erl") {
    return "erlang";
  }
  if (extension === "r") {
    return "r";
  }
  if (["rb", "ruby"].includes(extension)) {
    return "ruby";
  }
  if (["inc", "php", "php3", "php4", "php5", "php6", "phps"].includes(extension)) {
    return "php";
  }
  if (["c", "cp", "cpp", "c__", "cxx", "h", "h++", "hpp"].includes(extension)) {
    return "c_cpp";
  }
  if (extension === "cs") {
    return "csharp";
  }
  if (extension === "js" || extension === "jsx" || extension === "ts" || extension === "tsx") {
    return "javascript";
  }
  if (extension === "scala") {
    return "scala";
  }
  if (extension === "sql") {
    return "sql";
  }
  if (extension === "dart") {
    return "dart";
  }
  if (["dtx", "tex"].includes(extension)) {
    return "latex";
  }
  if (extension === "diff") {
    return "diff";
  }
  if (extension === "json") {
    return "json";
  }
  if (extension === "coffee") {
    return "coffee";
  }
  if (extension === "bat") {
    return "batchfile";
  }
  if (["actionscript", "as"].includes(extension)) {
    return "actionscript";
  }
  if (["yaml", "yml"].includes(extension)) {
    return "yaml";
  }
  if (extension === "jade") {
    return "jade";
  }
  if (["htm", "html"].includes(extension)) {
    return "html";
  }
  if (extension === "svg") {
    return "svg";
  }
  if (["atom", "plist", "rss", "xhtml", "xjb", "xml", "xsd", "xsl"].includes(extension)) {
    return "xml";
  }
  if (extension === "less") {
    return "less";
  }
  if (extension === "css" || extension === "scss") {
    return "css";
  }
  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }
  if (["emakrfile", "emakerfile", "mak", "makefile", "mk"].includes(extension)) {
    return "makefile";
  }
  if (["config", "ini"].includes(extension)) {
    return "ini";
  }
  if (["gitignore", "sbt", "txt"].includes(extension)) {
    return "text";
  }
  if (extension === "vbs") {
    return "vbscript";
  }
  if (mimeType.includes("json")) {
    return "json";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  return "plain";
}

function codeLineEndingType(file: NonNullable<CodeBrowserViewModel["file"]>) {
  if (file.isBinary) {
    return "";
  }
  if (!file.text) {
    return "UNDEFINED";
  }
  return file.text.includes("\r\n") ? "DOS" : "UNIX";
}

function CodeFileHeader(props: {
  file: NonNullable<CodeBrowserViewModel["file"]>;
  messages?: LegacyMessageLookup;
  openHref: string;
  ownerName?: string;
  projectName?: string;
  rawHref: string;
  runtimeConfig?: RuntimeConfig;
  selectedBranch?: string;
  showRaw: boolean;
  viewerCanUpdate?: boolean;
}) {
  const historyHref =
    props.runtimeConfig && props.ownerName && props.projectName && props.selectedBranch
      ? codeHistoryHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.selectedBranch,
          props.file.path,
        )
      : "";
  const revisionHref =
    props.runtimeConfig &&
    props.ownerName &&
    props.projectName &&
    props.selectedBranch &&
    props.file.commitId
      ? commitDetailHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.file.commitId,
          props.selectedBranch,
          props.file.path,
        )
      : "";
  const editHref =
    props.runtimeConfig &&
    props.ownerName &&
    props.projectName &&
    props.selectedBranch &&
    props.viewerCanUpdate
      ? codeEditFileHref(
          props.runtimeConfig,
          props.ownerName,
          props.projectName,
          props.selectedBranch,
          props.file.path,
        )
      : "";
  return (
    <div className="file-header nm">
      <div id="fileInfo" className="file-info">
        <span id="commiter" className="commiter">
          {props.file.authorAvatarUrl ? (
            <a
              className="avatar-wrap smaller"
              href={codeAuthorHref(props.runtimeConfig, props.file.authorLoginId)}
            >
              <img
                alt={props.file.authorLabel || props.file.authorLoginId || ""}
                src={props.file.authorAvatarUrl}
              />
            </a>
          ) : null}
          <a className="ml5" href={codeAuthorHref(props.runtimeConfig, props.file.authorLoginId)}>
            {props.file.authorLabel || LEGACY_ANONYMOUS_USER_NAME}
          </a>
        </span>
        <span id="commitDate" className="commitDate">
          {props.file.commitDate}
        </span>
        <span id="revisionNo" className="revision">
          {revisionHref ? (
            <a href={revisionHref}>
              {props.file.commitShortId || props.file.commitId}
              {(props.file.commentCount ?? 0) > 0 ? (
                <span className="number-of-comments ml5">
                  <i className="yobicon-comments"></i> {props.file.commentCount}
                </span>
              ) : null}
            </a>
          ) : (
            props.file.commitShortId || props.file.commitId
          )}
        </span>
        <span id="commitMessage" className="commitMsg">
          {props.file.commitMessage || legacyMessage(props.messages, "code.commitMsg.empty")}
        </span>
        {!props.file.isBinary ? <span>{codeLineEndingType(props.file)}</span> : null}
      </div>
      <div className="pull-right">
        {props.showRaw ? (
          <a className="ybtn" href={props.rawHref} target="_blank">
            <i className="yobicon-download-alt yobicon-white vmiddle"></i> Raw
          </a>
        ) : null}
        {props.showRaw && editHref ? (
          <a className="ybtn" href={editHref}>
            {legacyMessage(props.messages, "button.edit", { fallback: "button.edit" })}
          </a>
        ) : null}
        <a
          className="ybtn"
          data-content={legacyMessage(props.messages, "code.open.desc")}
          href={props.openHref}
          id="open-in-browser"
          target="_blank"
        >
          <i className="yobicon-download-alt yobicon-white vmiddle"></i>{" "}
          {legacyMessage(props.messages, "code.open")}
        </a>
        {historyHref ? (
          <a className="ybtn" href={historyHref}>
            {legacyMessage(props.messages, "code.history")}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function CodeCommitMessage(props: {
  commit: CodeHistoryViewModel["commits"][number];
  href: string;
  messages?: LegacyMessageLookup;
}) {
  const shortMessage =
    props.commit.shortMessage || legacyMessage(props.messages, "code.commitMsg.empty");
  const messageLines = props.commit.message.split("\n");
  const hasDescription = messageLines.length > 1;
  const description = messageLines.slice(1).join("\n");
  return (
    <>
      <a className="commitMsg short" href={props.href}>
        {shortMessage}
      </a>
      {hasDescription ? (
        <>
          <button className="commitMsg moreBtn" type="button">
            <span>{"\u2026"}</span>
          </button>
          <pre className="commitMsg desc hidden">{description}</pre>
        </>
      ) : null}
    </>
  );
}

function CodeHistoryAuthorCell(props: {
  commit: CodeHistoryViewModel["commits"][number];
  messages?: LegacyMessageLookup;
  runtimeConfig: RuntimeConfig;
}) {
  const commit = props.commit;
  if (commit.authorLoginId && commit.authorAvatarUrl) {
    return (
      <a
        className="avatar-wrap"
        data-placement="top"
        data-toggle="tooltip"
        href={codeAuthorHref(props.runtimeConfig, commit.authorLoginId)}
        title={commit.authorLoginId}
      >
        <img alt={commit.authorName} height={32} src={commit.authorAvatarUrl} width={32} />
      </a>
    );
  }
  if (commit.authorEmail) {
    return (
      <span
        className="avatar-wrap"
        data-placement="top"
        data-toggle="tooltip"
        title={commit.authorEmail}
      >
        <img alt={commit.authorName || commit.authorEmail || ""} src={commit.authorAvatarUrl} />
      </span>
    );
  }
  if (commit.authorName) {
    return <span>{commit.authorName}</span>;
  }
  return <span>{LEGACY_ANONYMOUS_USER_NAME}</span>;
}

function codeAuthorHref(runtimeConfig: RuntimeConfig | undefined, loginId: string | undefined) {
  return loginId && runtimeConfig
    ? prefixBasePath(runtimeConfig.basePath, `/${encodeURIComponent(loginId)}`)
    : prefixBasePath(runtimeConfig?.basePath ?? "", "/");
}
