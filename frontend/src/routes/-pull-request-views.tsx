import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { pullRequestMergeResultQueryOptions } from "../api/pull-requests";
import type {
  OrganizationPullRequestListQuery,
  PullRequestChangedFile,
  PullRequestChangesResponse,
  PullRequestDetailResponse,
  PullRequestEvent,
  PullRequestFormOptionsResponse,
  PullRequestListCategory,
  PullRequestListQuery,
  PullRequestPushedBranch,
  PullRequestListResponse,
  ReviewThread,
  ReviewThreadListQuery,
  ReviewThreadListResponse,
} from "../api/pull-requests";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import {
  addLegacyTasklistTemplateFromButton,
  LegacyMarkdownEditorShell,
  LegacyMarkdownHelp,
  MarkdownRenderer,
} from "./-markdown-renderer";
import { buildOrganizationHref, OrganizationHeader, OrganizationMenu } from "./-organization-views";
import { buildProjectHref, ProjectHeader, ProjectMenu } from "./-project-views";
import type { OrganizationDetailViewModel, ProjectDetailViewModel } from "./-view-models";

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

function fallbackOrganizationDetail(organizationName = ""): OrganizationDetailViewModel {
  return {
    description: "",
    organizationName,
    viewerCanUpdate: false,
  };
}

function prHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  pullRequestNumber: number,
  suffix = "",
) {
  const normalizedSuffix = suffix === "" ? "" : `/${suffix.replace(/^\/+/, "")}`;
  return buildProjectHref(
    runtimeConfig,
    ownerName,
    projectName,
    `pullRequest/${pullRequestNumber}${normalizedSuffix}`,
  );
}

function pullRequestApiHref(
  runtimeConfig: RuntimeConfig,
  pullRequest: PullRequestDetailResponse,
  suffix: string,
) {
  return `${runtimeConfig.apiBaseUrl}/v1/owners/${encodeURIComponent(
    pullRequest.ownerName,
  )}/projects/${encodeURIComponent(pullRequest.projectName)}/pull-requests/${
    pullRequest.pullRequestNumber
  }${suffix}`;
}

type PullRequestCommitViewModel = PullRequestChangesResponse["commits"][number];

type PullRequestCurrentUser = {
  avatarUrl?: string;
  loginId: string;
  userLabel: string;
};

function pullRequestChangesCommitHref(
  runtimeConfig: RuntimeConfig,
  pullRequest: PullRequestDetailResponse,
  commitId?: string,
) {
  const changesHref = prHref(
    runtimeConfig,
    pullRequest.ownerName,
    pullRequest.projectName,
    pullRequest.pullRequestNumber,
    "changes",
  );
  return commitId ? `${changesHref}/${encodeURIComponent(commitId)}` : changesHref;
}

function reviewThreadCardHref(
  runtimeConfig: RuntimeConfig | undefined,
  pullRequest: PullRequestDetailResponse | undefined,
  thread: ReviewThread,
) {
  const anchor = `#thread-${thread.id}`;
  if (!runtimeConfig || !pullRequest) {
    return anchor;
  }
  const commitId = thread.commitId.trim();
  return `${pullRequestChangesCommitHref(
    runtimeConfig,
    pullRequest,
    commitId === "" ? undefined : commitId,
  )}${anchor}`;
}

function pullRequestCommitTitle(commit: PullRequestCommitViewModel) {
  return (commit.commitMessage || "").split("\n")[0] || commit.commitId;
}

function pullRequestMarkdownCommitReferences(pullRequest: PullRequestDetailResponse) {
  return pullRequest.commits.flatMap((commit) => {
    if (!commit.commitId) {
      return [];
    }
    const title = pullRequestCommitTitle(commit);
    const references = [
      {
        commitId: commit.commitId,
        ownerName: pullRequest.ownerName,
        projectName: pullRequest.projectName,
        title,
      },
    ];
    if (
      pullRequest.fromOwnerName !== pullRequest.ownerName ||
      pullRequest.fromProjectName !== pullRequest.projectName
    ) {
      references.push({
        commitId: commit.commitId,
        ownerName: pullRequest.fromOwnerName,
        projectName: pullRequest.fromProjectName,
        title,
      });
    }
    return references;
  });
}

function pullRequestCommitShortId(commitId: string) {
  return commitId.slice(0, 7) || commitId;
}

function isOutdatedPullRequestCommit(commit: PullRequestCommitViewModel) {
  return commit.state.trim().toUpperCase() === "PRIOR";
}

function isSelectablePullRequestCommit(commit: PullRequestCommitViewModel) {
  return !isOutdatedPullRequestCommit(commit);
}

function reviewThreadStateClass(thread: ReviewThread) {
  return thread.state.trim().toLowerCase() || "open";
}

function reviewThreadStateHref(runtimeConfig: RuntimeConfig | undefined, threadId: number, state: "close" | "open") {
  const basePath = runtimeConfig?.basePath ?? "";
  return `${basePath}/threads/${threadId}/${state}`;
}

function isOutdatedReviewThread(thread: ReviewThread, pullRequest?: PullRequestDetailResponse) {
  const currentCommitId = pullRequest?.mergedCommitIdTo.trim() ?? "";
  return (
    thread.path.trim() !== "" &&
    thread.prevCommitId.trim() !== "" &&
    thread.commitId.trim() !== "" &&
    currentCommitId !== "" &&
    thread.commitId !== currentCommitId
  );
}

function isInlineReviewThreadForChanges(
  thread: ReviewThread,
  pullRequest: PullRequestDetailResponse | undefined,
  selectedCommitId: string | undefined,
) {
  const selectedCommit = selectedCommitId?.trim() ?? "";
  if (thread.path.trim() === "") {
    return false;
  }
  if (selectedCommit !== "") {
    return thread.commitId.trim() === selectedCommit;
  }
  if (thread.prevCommitId.trim() === "") {
    return false;
  }
  return !isOutdatedReviewThread(thread, pullRequest);
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

type InlineReviewDraft = {
  endLine: number;
  endSide: "A" | "B";
  path: string;
  startLine: number;
  startSide: "A" | "B";
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

function diffRowSide(row: HTMLTableRowElement): "A" | "B" | null {
  return row.dataset.side === "A" || row.dataset.side === "B" ? row.dataset.side : null;
}

function rowHasCommentableCode(row: HTMLTableRowElement): boolean {
  return row.dataset.line !== undefined && row.querySelector("td.code > pre") !== null;
}

function inlineDraftFromSelection(path: string, table: HTMLTableElement): InlineReviewDraft | null {
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

  const startRow = rows[startIndex];
  const endRow = rows[endIndex];
  const startLine = diffRowLine(startRow);
  const endLine = diffRowLine(endRow);
  const startSide = diffRowSide(startRow);
  const endSide = diffRowSide(endRow);
  if (startLine === null || endLine === null || startSide === null || endSide === null) {
    return null;
  }

  return { endLine, endSide, path, startLine, startSide };
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

function projectCategoryHref(
  runtimeConfig: RuntimeConfig,
  detail: ProjectDetailViewModel,
  category: PullRequestListCategory | string,
) {
  const suffix =
    category === "closed"
      ? "closedPullRequests"
      : category === "sent"
        ? "sentPullRequests"
        : "pullRequests";
  return buildProjectHref(runtimeConfig, detail.ownerName, detail.projectName, suffix);
}

type PullRequestFormSubmitInput = {
  attachmentIds: number[];
  bodyMarkdown: string;
  fromBranch: string;
  fromProjectId: number;
  title: string;
  toBranch: string;
  toProjectId: number;
};

type PullRequestInlineCommentSubmitInput = {
  attachmentIds: number[];
  commitId?: string;
  contentsMarkdown: string;
  endLine: number;
  endSide: "A" | "B";
  path: string;
  prevCommitId?: string;
  startLine: number;
  startSide: "A" | "B";
};

function pullRequestQueryString(
  query: PullRequestListQuery,
  category: PullRequestListCategory,
  overrides: Partial<PullRequestListQuery> = {},
) {
  const search = new URLSearchParams();
  const filter = overrides.filter ?? query.filter;
  if (filter) {
    search.set("filter", filter);
  }
  const contributorId = overrides.contributorId ?? query.contributorId;
  if (category !== "sent" && contributorId) {
    search.set("contributorId", String(contributorId));
  }
  const pageNum =
    Object.prototype.hasOwnProperty.call(overrides, "pageNum") ? overrides.pageNum : undefined;
  if (pageNum && pageNum > 1) {
    search.set("pageNum", String(pageNum));
  }
  return search.toString();
}

function organizationCategoryHref(
  runtimeConfig: RuntimeConfig,
  organizationName: string,
  category: string,
) {
  return buildOrganizationHref(
    runtimeConfig,
    organizationName,
    category === "closed" ? "closedPullrequests" : "pullrequests",
  );
}

function organizationPullRequestQueryString(
  query: OrganizationPullRequestListQuery,
  overrides: Partial<OrganizationPullRequestListQuery> = {},
) {
  const search = new URLSearchParams();
  const filter = overrides.filter ?? query.filter;
  if (filter) {
    search.set("filter", filter);
  }
  const pageNum =
    Object.prototype.hasOwnProperty.call(overrides, "pageNum") ? overrides.pageNum : undefined;
  if (pageNum && pageNum > 1) {
    search.set("pageNum", String(pageNum));
  }
  return search.toString();
}

function PullRequestTabs(props: {
  active: PullRequestListCategory | string;
  detail: ProjectDetailViewModel;
  list: PullRequestListResponse | undefined;
  query: PullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const tabs: Array<{ badge: string; category: PullRequestListCategory; label: string }> = [
    {
      badge: String(props.list?.openCount ?? 0),
      category: "open",
      label: "pullRequest.state.open",
    },
    {
      badge: String(props.list?.closedCount ?? 0),
      category: "closed",
      label: "pullRequest.state.closed",
    },
  ];
  if (props.detail.isForked) {
    tabs.push({
      badge: `${props.list?.acceptedCount ?? 0} / ${props.list?.sentCount ?? 0}`,
      category: "sent",
      label: "pullRequest.sent",
    });
  }
  return (
    <ul className="nav nav-tabs nm pullrequeset-tab-menu">
      {tabs.map((tab) => (
        <li className={props.active === tab.category ? "active" : undefined} key={tab.category}>
          <a
            data-type="state"
            data-url={[
              projectCategoryHref(props.runtimeConfig, props.detail, tab.category),
              pullRequestQueryString(props.query, tab.category),
            ]
              .filter(Boolean)
              .join("?")}
            href={[
              projectCategoryHref(props.runtimeConfig, props.detail, tab.category),
              pullRequestQueryString(props.query, tab.category),
            ]
              .filter(Boolean)
              .join("?")}
          >
            {tab.label}
            <span className="num-badge">{tab.badge}</span>
          </a>
        </li>
      ))}
      <li>
        <label className="two-column-mode">
          <input id="two-column-mode-checkbox" type="checkbox" /> twoColumnMode
        </label>
      </li>
    </ul>
  );
}

function ProjectPullRequestSearchForm(props: {
  category: PullRequestListCategory | string;
  detail: ProjectDetailViewModel;
  list: PullRequestListResponse | undefined;
  query: PullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <form
      action={projectCategoryHref(props.runtimeConfig, props.detail, props.category)}
      id="search"
      method="get"
      name="search"
    >
      <div className="search">
        <div className="search-bar">
          <input
            className="textbox full"
            defaultValue={props.query.filter ?? ""}
            name="filter"
            type="text"
          />
          <button className="search-btn" type="submit">
            <i className="yobicon-search"></i>
          </button>
        </div>
      </div>
      {props.category !== "sent" ? (
        <div className="srch-advanced" id="advanced-search-form">
          <dl className="issue-option">
            <dt>pullRequest.sender</dt>
            <dd>
              <select
                data-format="user"
                defaultValue={props.query.contributorId ? String(props.query.contributorId) : ""}
                id="contributors"
                name="contributorId"
              >
                <option value="">common.order.all</option>
                {props.list?.contributors.map((contributor) => (
                  <option
                    data-login-id={contributor.loginId}
                    key={contributor.userId}
                    value={contributor.userId}
                  >
                    {contributor.userLabel || contributor.loginId}
                  </option>
                ))}
              </select>
            </dd>
          </dl>
        </div>
      ) : null}
    </form>
  );
}

function OrganizationPullRequestSearchForm(props: {
  category: "closed" | "open";
  detail: OrganizationDetailViewModel;
  query: OrganizationPullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  return (
    <form
      action={organizationCategoryHref(
        props.runtimeConfig,
        props.detail.organizationName,
        props.category,
      )}
      id="search"
      method="get"
      name="search"
    >
      <div className="search">
        <div className="search-bar">
          <input
            className="textbox full"
            defaultValue={props.query.filter ?? ""}
            name="filter"
            type="text"
          />
          <button className="search-btn" type="submit">
            <i className="yobicon-search"></i>
          </button>
        </div>
      </div>
    </form>
  );
}

function PullRequestListRows(props: {
  items: PullRequestListResponse["items"];
  runtimeConfig: RuntimeConfig;
  showProjectName?: boolean;
}) {
  if (props.items.length === 0) {
    return (
      <ul className="post-list-wrap">
        <div className="error-wrap">
          <i className="ico ico-err1"></i>
          <p>pullRequest.is.empty</p>
        </div>
      </ul>
    );
  }

  return (
    <ul className="post-list-wrap">
      {props.items.map((item) => {
        const href = prHref(
          props.runtimeConfig,
          item.ownerName,
          item.projectName,
          item.pullRequestNumber,
        );
        const contributorAvatarLabel =
          item.contributorLabel || item.contributorLoginId || "issue.noAuthor";
        const receiverLabel = item.receiverLabel || item.receiverLoginId;
        const progressWidth =
          item.commentThreadCount > 0
            ? `${Math.min(
                100,
                Math.round((item.closedCommentThreadCount / item.commentThreadCount) * 100),
              )}%`
            : "0%";
        const stateClass = item.conflict ? "conflict" : item.state;
        const stateLabel = item.conflict
          ? "pullRequest.state.conflict"
          : `pullRequest.state.${item.state}`;
        return (
          <li
            className="post-item title"
            key={`${item.ownerName}/${item.projectName}/${item.id}`}
            {...({ href } as React.HTMLAttributes<HTMLLIElement>)}
          >
            <div className="span10 span-hard-wrap">
              <a
                className="avatar-wrap mlarge"
                data-placement="top"
                data-toggle="tooltip"
                href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                  item.contributorLoginId,
                )}`}
                title={item.contributorLoginId}
              >
                <span className="avatar-img">{contributorAvatarLabel}</span>
              </a>
              <div className="title-wrap">
                <span className="post-id">{item.pullRequestNumber}</span>
                <a className={`title${item.conflict ? " conflict" : ""}`} href={href}>
                  {item.title}
                </a>
              </div>
              <div className="infos">
                {item.contributorLoginId && item.contributorLabel ? (
                  <a
                    className="infos-item infos-link-item"
                    data-placement="top"
                    data-toggle="tooltip"
                    href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                      item.contributorLoginId,
                    )}`}
                    title={item.contributorLoginId}
                  >
                    {item.contributorLabel}
                  </a>
                ) : (
                  <span className="infos-item">issue.noAuthor</span>
                )}
                <span className="infos-item" title={item.createdLabel}>
                  {item.createdLabel}
                </span>
                {props.showProjectName ? (
                  <a
                    className="infos-link-item group-project-name"
                    href={buildProjectHref(props.runtimeConfig, item.ownerName, item.projectName)}
                  >
                    {item.projectName}
                  </a>
                ) : null}
                {item.commentThreadCount > 0 ? (
                  <div
                    className="infos-item"
                    style={{ marginRight: props.showProjectName ? 20 : 10 }}
                  >
                    <i className="infos-icon yobicon-post2 vmiddle"></i>
                    <div className="upload-progress">
                      <div className="bar orange" style={{ width: progressWidth }}></div>
                    </div>
                    <a
                      data-toggle="tooltip"
                      href={prHref(
                        props.runtimeConfig,
                        item.ownerName,
                        item.projectName,
                        item.pullRequestNumber,
                        "changes",
                      )}
                      title="pullRequest.review.closed / pullRequest.review.total"
                    >
                      <span>{item.closedCommentThreadCount}</span>
                      <span className="gray-txt">/</span>
                      <span className="size total">{item.commentThreadCount}</span>
                    </a>
                  </div>
                ) : null}
                {item.reviewerCount > 0 && !props.showProjectName ? (
                  <div className="infos-item" style={{ marginTop: -1 }}>
                    <i className="infos-icon yobicon-preview vmiddle"></i>
                    <a
                      data-toggle="tooltip"
                      href={`${href}#reviewers`}
                      title="pullRequest.reviewers"
                    >
                      <span className="vmiddle">{item.reviewerCount}</span>
                    </a>
                  </div>
                ) : null}
                <span className="to-branch">{item.toBranch}</span>
              </div>
            </div>
            <div className="span2 hide-in-mobile">
              <div className="mt5 pull-right hide-in-mobile">
                {item.receiverLoginId ? (
                  <a
                    className="avatar-wrap assinee"
                    data-original-title={receiverLabel}
                    data-placement="top"
                    data-toggle="tooltip"
                    href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                      item.receiverLoginId,
                    )}`}
                    title=""
                  >
                    <span className="avatar-img">{receiverLabel}</span>
                  </a>
                ) : (
                  <div className="empty-avatar-wrap">&nbsp;</div>
                )}
              </div>
              <div className={`state ${stateClass} pull-right`}>{stateLabel}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PullRequestListPagination(props: {
  hrefForPage: (pageNum: number) => string;
  list: PullRequestListResponse | undefined;
}) {
  const pageSize = Math.max(1, props.list?.pageSize || 15);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, props.list?.totalCount ?? 0) / pageSize));
  const currentPage = Math.min(Math.max(1, props.list?.pageNum || 1), pageCount);
  return (
    <LegacyPageNavigation
      currentPage={currentPage}
      hrefForPage={props.hrefForPage}
      pageCount={pageCount}
    />
  );
}

function LegacyPageNavigation(props: {
  currentPage: number;
  hrefForPage: (pageNum: number) => string;
  pageCount: number;
}) {
  if (props.pageCount <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = Math.min(Math.max(1, props.currentPage), props.pageCount);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < props.pageCount;
  const submitPageInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    const input = event.currentTarget;
    const parsedPage = Number.parseInt(input.value, 10);
    if (!Number.isFinite(parsedPage)) {
      input.value = String(currentPage);
      return;
    }
    const nextPage = Math.min(Math.max(1, parsedPage), props.pageCount);
    input.value = String(nextPage);
    window.location.href = props.hrefForPage(nextPage);
  };

  return (
    <div className="page-navigation-wrap" id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <a href={props.hrefForPage(currentPage - 1)} pjax-page="">
              <i className="ico btn-pg-prev"></i>
              <span>button.prevPage</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">button.prevPage</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            max={props.pageCount}
            min={1}
            name="pageNum"
            onKeyDown={submitPageInput}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{props.pageCount}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <a href={props.hrefForPage(currentPage + 1)} pjax-page="">
              <span>button.nextPage</span>
              <i className="ico btn-pg-next"></i>
            </a>
          ) : (
            <>
              <span className="off">button.nextPage</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function ProjectRecentlyPushedBranches(props: {
  branches: PullRequestPushedBranch[];
  runtimeConfig: RuntimeConfig;
}) {
  if (props.branches.length === 0) {
    return null;
  }

  return (
    <>
      <h5>pullRequest.pushed.branches.title</h5>
      <div className="alert alert-info">
        {props.branches.map((branch) => {
          const params = new URLSearchParams();
          params.set("fromBranch", branch.branchName);
          params.set("toBranch", branch.defaultBranch || "HEAD");
          return (
            <div key={`${branch.ownerName}/${branch.projectName}/${branch.id}`}>
              <i className="yobicon-split" />
              <span style={{ marginLeft: 5, fontWeight: "bold" }}>
                {branch.ownerName}/{branch.projectName}:{branch.shortName} ( {branch.pushedLabel} )
              </span>
              &nbsp;-&nbsp;
              <a
                href={buildProjectHref(
                  props.runtimeConfig,
                  branch.ownerName,
                  branch.projectName,
                  `newPullRequestForm?${params.toString()}`,
                )}
              >
                pullRequest
              </a>
              <a
                aria-hidden="true"
                className="close"
                data-dismiss="alert"
                data-request-method="delete"
                data-request-uri={buildProjectHref(
                  props.runtimeConfig,
                  branch.ownerName,
                  branch.projectName,
                  `pushedBranch/${branch.id}/delete`,
                )}
                href="#"
              >
                ×
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ProjectPullRequestListPage(props: {
  category: PullRequestListCategory;
  detail: ProjectDetailViewModel | null;
  list: PullRequestListResponse | undefined;
  query: PullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const list = props.list;

  return (
    <main className="app-shell pull-request-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
        <div className="row-fluid cb" pjax-container="">
          <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
            <ProjectPullRequestSearchForm
              category={props.category}
              detail={detail}
              list={list}
              query={props.query}
              runtimeConfig={props.runtimeConfig}
            />
          </div>
          <div className="span10 span-hard-wrap" id="span10">
            <ProjectRecentlyPushedBranches
              branches={list?.recentlyPushedBranches ?? []}
              runtimeConfig={props.runtimeConfig}
            />
            <div className="pull-right">
              <a
                className="ybtn ybtn-success"
                href={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "newPullRequestForm",
                )}
              >
                pullRequest.new
              </a>
            </div>
            <PullRequestTabs
              active={props.category}
              detail={detail}
              list={list}
              query={props.query}
              runtimeConfig={props.runtimeConfig}
            />
            <div className="tab-content" style={{ clear: "both", paddingTop: 15 }}>
              <div className="row-fluid tab-pane active" id="list">
                <PullRequestListRows items={list?.items ?? []} runtimeConfig={props.runtimeConfig} />
                <PullRequestListPagination
                  hrefForPage={(pageNum) =>
                    [
                      projectCategoryHref(props.runtimeConfig, detail, props.category),
                      pullRequestQueryString(props.query, props.category, { pageNum }),
                    ]
                      .filter(Boolean)
                      .join("?")
                  }
                  list={list}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}

function reviewQueryString(query: ReviewThreadListQuery, state: "closed" | "open") {
  const search = new URLSearchParams();
  search.set("state", state);
  if (query.filter) {
    search.set("filter", query.filter);
  }
  if (query.authorId) {
    search.set("authorId", String(query.authorId));
  }
  if (query.participantId) {
    search.set("participantId", String(query.participantId));
  }
  if (query.orderBy) {
    search.set("orderBy", query.orderBy);
  }
  if (query.orderDir) {
    search.set("orderDir", query.orderDir);
  }
  return search.toString();
}

function reviewListFilterQueryString(
  query: ReviewThreadListQuery,
  filter: Partial<ReviewThreadListQuery>,
) {
  const search = new URLSearchParams();
  const state = filter.state ?? query.state;
  search.set("state", state === "closed" ? "closed" : "open");
  const textFilter = filter.filter ?? query.filter;
  if (textFilter) {
    search.set("filter", textFilter);
  }
  const authorId = filter.authorId ?? query.authorId;
  if (authorId) {
    search.set("authorId", String(authorId));
  }
  const participantId = filter.participantId ?? query.participantId;
  if (participantId) {
    search.set("participantId", String(participantId));
  }
  const orderBy = filter.orderBy ?? query.orderBy;
  if (orderBy) {
    search.set("orderBy", orderBy);
  }
  const orderDir = filter.orderDir ?? query.orderDir;
  if (orderDir) {
    search.set("orderDir", orderDir);
  }
  const pageNum =
    Object.prototype.hasOwnProperty.call(filter, "pageNum") ? filter.pageNum : undefined;
  if (pageNum && pageNum > 1) {
    search.set("pageNum", String(pageNum));
  }
  return search.toString();
}

export function OrganizationPullRequestListPage(props: {
  category: "closed" | "open";
  detail: OrganizationDetailViewModel | null;
  list: PullRequestListResponse | undefined;
  organizationName: string;
  query: OrganizationPullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackOrganizationDetail(props.organizationName);
  const tabs = [
    { category: "open", label: "pullRequest.state.open" },
    { category: "closed", label: "pullRequest.state.closed" },
  ];

  return (
    <main className="app-shell pull-request-page">
      <OrganizationHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <OrganizationMenu active="pullrequests" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="row-fluid cb" pjax-container="">
          <div className="left-menu span2 search-wrap hide-in-mobile" style={{ paddingTop: 0 }}>
            <OrganizationPullRequestSearchForm
              category={props.category}
              detail={detail}
              query={props.query}
              runtimeConfig={props.runtimeConfig}
            />
          </div>
          <div className="span10 span-hard-wrap" id="span10">
            <ul className="nav nav-tabs nm pullrequeset-tab-menu">
              {tabs.map((tab) => (
                <li
                  className={props.category === tab.category ? "active" : undefined}
                  key={tab.category}
                >
                  <a
                    data-type="state"
                    data-url={[
                      organizationCategoryHref(
                        props.runtimeConfig,
                        detail.organizationName,
                        tab.category,
                      ),
                      organizationPullRequestQueryString(props.query),
                    ]
                      .filter(Boolean)
                      .join("?")}
                    href={[
                      organizationCategoryHref(
                        props.runtimeConfig,
                        detail.organizationName,
                        tab.category,
                      ),
                      organizationPullRequestQueryString(props.query),
                    ]
                      .filter(Boolean)
                      .join("?")}
                  >
                    {tab.label}
                    <span className="num-badge">
                      {tab.category === "closed"
                        ? props.list?.closedCount ?? 0
                        : props.list?.openCount ?? 0}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="tab-content" style={{ clear: "both", paddingTop: 15 }}>
              <div className="row-fluid tab-pane active" id="list">
                <PullRequestListRows
                  items={props.list?.items ?? []}
                  runtimeConfig={props.runtimeConfig}
                  showProjectName={true}
                />
                <PullRequestListPagination
                  hrefForPage={(pageNum) =>
                    [
                      organizationCategoryHref(
                        props.runtimeConfig,
                        detail.organizationName,
                        props.category,
                      ),
                      organizationPullRequestQueryString(props.query, { pageNum }),
                    ]
                      .filter(Boolean)
                      .join("?")
                  }
                  list={props.list}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ProjectPullRequestFormPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  formOptions: PullRequestFormOptionsResponse | undefined;
  mode: "create" | "edit";
  runtimeConfig: RuntimeConfig;
  onSubmit: (input: PullRequestFormSubmitInput) => Promise<void>;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const options = props.formOptions;
  const initialPullRequest = options?.pullRequest;
  const [fromProjectId, setFromProjectId] = React.useState(options?.selected.fromProjectId ?? 0);
  const [toProjectId, setToProjectId] = React.useState(options?.selected.toProjectId ?? 0);
  const [fromBranch, setFromBranch] = React.useState(options?.selected.fromBranch ?? "");
  const [toBranch, setToBranch] = React.useState(options?.selected.toBranch ?? "");
  const [title, setTitle] = React.useState(initialPullRequest?.title ?? "");
  const [bodyMarkdown, setBodyMarkdown] = React.useState(initialPullRequest?.bodyMarkdown ?? "");
  const [attachmentIds, setAttachmentIds] = React.useState<number[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const editMode = props.mode === "edit";
  const mergeResultEnabled =
    fromProjectId > 0 && toProjectId > 0 && fromBranch.trim() !== "" && toBranch.trim() !== "";
  const mergeResultQuery = useQuery({
    ...pullRequestMergeResultQueryOptions(props.runtimeConfig, {
      ownerName: detail.ownerName,
      projectName: detail.projectName,
      query: {
        fromBranch,
        fromProjectId,
        toBranch,
        toProjectId,
      },
    }),
    enabled: mergeResultEnabled,
    retry: false,
  });
  const mergeResult = mergeResultQuery.data;
  const formCommitCount = mergeResult?.commits.length ?? initialPullRequest?.commits.length ?? 0;

  React.useEffect(() => {
    if (!options) {
      return;
    }
    setFromProjectId(options.selected.fromProjectId);
    setToProjectId(options.selected.toProjectId);
    setFromBranch(options.selected.fromBranch);
    setToBranch(options.selected.toBranch);
    setTitle(options.pullRequest?.title ?? "");
    setBodyMarkdown(options.pullRequest?.bodyMarkdown ?? "");
    setAttachmentIds([]);
  }, [options]);

  const formTitle = editMode ? "title.editPullRequest" : "title.newPullRequest";
  const backHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    editMode && initialPullRequest
      ? `pullRequest/${initialPullRequest.pullRequestNumber}`
      : "pullRequests",
  );

  return (
    <main className="app-shell pull-request-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
        <div className="content-wrap frm-wrap">
          <section className="pull-request-wrap">
            <header className="board-header issue">
              <h1>{formTitle}</h1>
              <div className="pullRequest-branchInfo">
                <span>{`${detail.ownerName}/${detail.projectName}`}</span>
                {initialPullRequest ? (
                  <span className={`pullRequest-stateInfo state ${initialPullRequest.state}`}>
                    {initialPullRequest.state}
                  </span>
                ) : null}
              </div>
            </header>
            <form
              className="board-form pull-request-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (submitting) {
                  return;
                }
                setSubmitting(true);
                void props
                  .onSubmit({
                    attachmentIds,
                    bodyMarkdown,
                    fromBranch,
                    fromProjectId,
                    title,
                    toBranch,
                    toProjectId,
                  })
                  .finally(() => setSubmitting(false));
              }}
            >
              <div className="pull-request-branches">
                <label htmlFor="fromProjectId">
                  pullRequest.from
                  <select
                    disabled={editMode}
                    id="fromProjectId"
                    name="fromProjectId"
                    onChange={(event) => setFromProjectId(Number(event.currentTarget.value))}
                    value={fromProjectId}
                  >
                    {(options?.fromProjects ?? []).map((project) => (
                      <option key={project.id} value={project.id}>
                        {`${project.ownerName}/${project.projectName}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="fromBranch">
                  pullRequest.select.branch
                  <select
                    disabled={editMode}
                    id="fromBranch"
                    name="fromBranch"
                    onChange={(event) => setFromBranch(event.currentTarget.value)}
                    value={fromBranch}
                  >
                    {(options?.fromBranches ?? []).map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="toProjectId">
                  pullRequest.to
                  <select
                    disabled={editMode}
                    id="toProjectId"
                    name="toProjectId"
                    onChange={(event) => setToProjectId(Number(event.currentTarget.value))}
                    value={toProjectId}
                  >
                    {(options?.toProjects ?? []).map((project) => (
                      <option key={project.id} value={project.id}>
                        {`${project.ownerName}/${project.projectName}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="toBranch">
                  pullRequest.select.branch
                  <select
                    disabled={editMode}
                    id="toBranch"
                    name="toBranch"
                    onChange={(event) => setToBranch(event.currentTarget.value)}
                    value={toBranch}
                  >
                    {(options?.toBranches ?? []).map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label htmlFor="pullRequestState">
                title
                <input
                  id="pullRequestState"
                  name="title"
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  required
                  value={title}
                />
              </label>
              <label htmlFor="status">
                body
                <LegacyMarkdownEditorShell
                  editId="edit-content-body"
                  editorMode="content-body"
                  previewId="preview-content-body"
                >
                  <MarkdownAttachmentTextarea
                    className="editorSeries content comment nm"
                    csrfToken={props.csrfToken}
                    editorMode="content-body"
                    id="status"
                    name="body"
                    onAttachmentUpload={(attachment) =>
                      setAttachmentIds((current) => [...current, attachment.id])
                    }
                    onChange={setBodyMarkdown}
                    required
                    runtimeConfig={props.runtimeConfig}
                    value={bodyMarkdown}
                  />
                </LegacyMarkdownEditorShell>
              </label>
              <div
                className="code-browse-wrap tab-pane active"
                data-merge-result-url={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "newPullRequest/mergeResult",
                )}
                id="__commits"
              >
                <span className="num-badge vmiddle-inline" id="numOfCommits">
                  {formCommitCount}
                </span>
                <span> pullRequest.menu.commit</span>
                <div
                  className="code-browser-wrap"
                  data-commits={formCommitCount}
                  data-conflict={mergeResult ? String(mergeResult.conflict) : "false"}
                  data-pullrequest-body={bodyMarkdown}
                  data-pullrequest-title={title}
                  id="mergeResult"
                >
                  {mergeResultQuery.isError ? (
                    <div>
                      <h5>pullRequest.diff.noChanges</h5>
                    </div>
                  ) : mergeResult?.commits.length ? (
                    <div className="commit-wrap">
                      <table className="code-table commits">
                        <thead className="thead">
                          <tr>
                            <td className="commit-id">
                              <strong>@</strong>
                            </td>
                            <td className="messages">
                              <strong>code.commitMsg</strong>
                            </td>
                            <td className="date">
                              <strong>code.commitDate</strong>
                            </td>
                            <td className="author">
                              <strong>code.author</strong>
                            </td>
                          </tr>
                        </thead>
                        <tbody className="tbody">
                          {mergeResult.commits.map((commit) => (
                            <tr key={commit.commitId}>
                              <td className="commit-id">
                                <a
                                  href={buildProjectHref(
                                    props.runtimeConfig,
                                    detail.ownerName,
                                    detail.projectName,
                                    `code/${commit.commitId}`,
                                  )}
                                >
                                  {commit.commitShortId}
                                </a>
                              </td>
                              <td className="messages">{commit.commitMessage}</td>
                              <td className="date" title={commit.authorDateLabel}>
                                {commit.authorDateLabel}
                              </td>
                              <td className={`author ${commit.authorEmail}`}>
                                <div className="avatar-wrap">
                                  <span>{commit.authorEmail}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div>
                      <h5>pullRequest.diff.noChanges</h5>
                    </div>
                  )}
                </div>
              </div>
              <div className="actions">
                <button className="ybtn ybtn-success" disabled={submitting} type="submit">
                  {editMode ? "button.save" : "pullRequest.send"}
                </button>
                <a className="ybtn" href={backHref}>
                  button.cancel
                </a>
              </div>
            </form>
          </section>
        </div>
        </div>
      </div>
    </main>
  );
}

function PullRequestActionBar(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  onClose?: () => Promise<void>;
  onOpen?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
}) {
  const pr = props.pullRequest;
  return (
    <>
      <div className="pull-left">
        {props.onWatchToggle ? (
          <button
            className={`ybtn${pr.isWatching ? " ybtn-watching" : ""}`}
            data-toggle="button"
            data-watching={pr.isWatching ? "true" : "false"}
            id="watch-button"
            onClick={() => void props.onWatchToggle?.()}
            type="button"
          >
            {pr.isWatching ? "project.unwatch" : "project.watch"}
          </button>
        ) : null}
      </div>
      <div className="mr5" style={{ display: "inline-block" }}>
        {pr.permissions.canUpdate ? (
          <a
            className="ybtn"
            href={prHref(
              props.runtimeConfig,
              pr.ownerName,
              pr.projectName,
              pr.pullRequestNumber,
              "editform",
            )}
          >
            button.edit
          </a>
        ) : null}
        {pr.permissions.canUpdateState && pr.state === "open" ? (
          <a
            className="ybtn"
            data-request-method="post"
            href={prHref(
              props.runtimeConfig,
              pr.ownerName,
              pr.projectName,
              pr.pullRequestNumber,
              "close",
            )}
            onClick={(event) => {
              event.preventDefault();
              void props.onClose?.();
            }}
          >
            pullRequest.close
          </a>
        ) : null}
        {pr.permissions.canUpdateState && pr.state === "closed" ? (
          <a
            className="ybtn"
            data-request-method="post"
            href={prHref(
              props.runtimeConfig,
              pr.ownerName,
              pr.projectName,
              pr.pullRequestNumber,
              "open",
            )}
            onClick={(event) => {
              event.preventDefault();
              void props.onOpen?.();
            }}
          >
            pullRequest.reopen
          </a>
        ) : null}
      </div>
    </>
  );
}

function PullRequestReviewMergeControls(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
  onAccept?: () => Promise<void>;
  onReview?: () => Promise<void>;
  onUnreview?: () => Promise<void>;
}) {
  const pr = props.pullRequest;
  const viewerReviewed = props.viewerId
    ? pr.reviewers.some((reviewer) => reviewer.userId === props.viewerId)
    : false;
  const reviewSatisfied = pr.requiredReviewerCount === 0 || pr.reviewed;
  const canAccept =
    pr.permissions.canUpdateState && pr.state === "open" && !pr.conflict && reviewSatisfied;
  const disabledMergeTitle = pr.conflict
    ? "pullRequest.is.not.safe"
    : reviewSatisfied
      ? "pullRequest.merge.disabled"
      : "pullRequest.not.enough.review.point";
  return (
    <>
      <div id="reviewers" style={{ display: "inline-block", marginRight: 5 }}>
        <span style={{ fontSize: 13, margin: "0 10px", verticalAlign: "middle" }}>
          {`pullRequest.review.participants ${pr.reviewers.length}`}
        </span>
        {pr.reviewers.map((reviewer) => (
          <a
            className="usf-group"
            data-placement="top"
            data-toggle="tooltip"
            href={`${props.runtimeConfig.basePath}/${encodeURIComponent(reviewer.loginId)}`}
            key={reviewer.userId}
            title={reviewer.userLabel || reviewer.loginId}
          >
            <img
              alt={reviewer.userLabel || reviewer.loginId}
              className="avatar-wrap smaller"
              src={reviewer.avatarUrl}
            />
          </a>
        ))}
        <span className={`reviewer-status ${pr.reviewed ? "reviewed" : "lacking"}`}>
          {`pullRequest.review.required ${pr.reviewers.length}/${pr.requiredReviewerCount}`}
          {pr.reviewed
            ? " pullRequest.review.complete"
            : ` pullRequest.review.lacking ${pr.lackingReviewerCount}`}
        </span>
      </div>
      {pr.permissions.canReview && pr.state === "open" ? (
        viewerReviewed ? (
          <button
            className="ybtn ybtn-default"
            data-request-method="post"
            onClick={() => void props.onUnreview?.()}
            type="button"
          >
            pullRequest.unreview
          </button>
        ) : (
          <button
            className={`ybtn ${pr.reviewed ? "ybtn-default" : "ybtn-success"}`}
            data-request-method="post"
            onClick={() => void props.onReview?.()}
            type="button"
          >
            pullRequest.review
          </button>
        )
      ) : null}
      {pr.permissions.canUpdateState ? (
        canAccept ? (
          <a
            className="ybtn ybtn-success"
            data-request-method="post"
            href={prHref(
              props.runtimeConfig,
              pr.ownerName,
              pr.projectName,
              pr.pullRequestNumber,
              "accept",
            )}
            id="btnAccept"
            onClick={(event) => {
              event.preventDefault();
              void props.onAccept?.();
            }}
          >
            pullRequest.merge
          </a>
        ) : (
          <>
            <button
              className="ybtn ybtn-disabled"
              data-placement="top"
              data-toggle="tooltip"
              disabled
              title={disabledMergeTitle}
              type="button"
            >
              pullRequest.merge
            </button>
            {pr.conflict ? (
              <p className="merge-conflict-help">pullRequest.conflict.manualResolve</p>
            ) : null}
          </>
        )
      ) : null}
    </>
  );
}

function PullRequestBranchInfo(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const pr = props.pullRequest;
  return (
    <div className="pullRequest-branchInfo">
      <i className="yobicon-branch ml0"></i>
      <code className="from" data-original-title="pullRequest.from" data-toggle="tooltip">
        <a href={`${props.runtimeConfig.basePath}/${encodeURIComponent(pr.fromOwnerName)}`}>
          {pr.fromOwnerName}
        </a>
        <span>/</span>
        <a href={buildProjectHref(props.runtimeConfig, pr.fromOwnerName, pr.fromProjectName)}>
          {pr.fromProjectName}
        </a>
        {":"}
        <a
          className="branchName"
          href={buildProjectHref(
            props.runtimeConfig,
            pr.fromOwnerName,
            pr.fromProjectName,
            `code/${encodeURIComponent(pr.fromBranch)}`,
          )}
        >
          {pr.fromBranch}
        </a>
      </code>
      <i className="yobicon-right-2 ml10"></i>
      <code className="to" data-original-title="pullRequest.to" data-toggle="tooltip">
        <a href={`${props.runtimeConfig.basePath}/${encodeURIComponent(pr.ownerName)}`}>
          {pr.ownerName}
        </a>
        <span>/</span>
        <a href={buildProjectHref(props.runtimeConfig, pr.ownerName, pr.projectName)}>
          {pr.projectName}
        </a>
        {":"}
        <a
          className="branchName"
          href={buildProjectHref(
            props.runtimeConfig,
            pr.ownerName,
            pr.projectName,
            `code/${encodeURIComponent(pr.toBranch)}`,
          )}
        >
          {pr.toBranch}
        </a>
      </code>
    </div>
  );
}

function PullRequestOverviewTabs(props: {
  active: "changes" | "overview";
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const pr = props.pullRequest;
  const openThreadCount = pr.threads.filter(
    (thread) => reviewThreadStateClass(thread) !== "closed",
  ).length;
  return (
    <ul className="nav nav-tabs nm pull-request-overview-tabs">
      <li className={props.active === "overview" ? "active" : undefined}>
        <a href={prHref(props.runtimeConfig, pr.ownerName, pr.projectName, pr.pullRequestNumber)}>
          pullRequest.menu.overview
        </a>
      </li>
      <li className={props.active === "changes" ? "active" : undefined}>
        <a
          href={prHref(
            props.runtimeConfig,
            pr.ownerName,
            pr.projectName,
            pr.pullRequestNumber,
            "changes",
          )}
        >
          pullRequest.menu.changes
          {openThreadCount > 0 ? <span className="num-badge">{openThreadCount}</span> : null}
        </a>
      </li>
    </ul>
  );
}

function PullRequestConflictGuide(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
}) {
  const pr = props.pullRequest;
  const isContributor = props.viewerId === pr.contributor.userId;
  if (!pr.conflict) {
    return null;
  }
  const upstreamUrl = buildProjectHref(props.runtimeConfig, pr.ownerName, `${pr.projectName}.git`);
  const refreshHref = prHref(
    props.runtimeConfig,
    pr.ownerName,
    pr.projectName,
    pr.pullRequestNumber,
  );
  return (
    <div className="alert alert-error pull-request-conflict-guide">
      <i className="yobicon-error mr5"></i>
      <span>pullRequest.is.not.safe</span>
      {isContributor ? (
        <div className="howto-resolve-conflict">
          <h6>pullRequest.resolve.conflict</h6>
          <div className="help">
            <ol>
              <li>
                pullRequest.resolver.step1 <code>{`git checkout ${pr.fromBranch}`}</code>
              </li>
              <li>
                pullRequest.resolver.step2 <code>{`git remote add upstream ${upstreamUrl}`}</code>
              </li>
              <li>
                pullRequest.resolver.step3 <code>git fetch upstream</code>
              </li>
              <li>
                pullRequest.resolver.step4 <code>{`git rebase upstream/${pr.toBranch}`}</code>
              </li>
              <li>pullRequest.resolver.step5</li>
              <li>
                pullRequest.resolver.step6 <code>git add resolved_file</code>
              </li>
              <li>
                pullRequest.resolver.step7 <code>git rebase --continue</code>
              </li>
              <li>pullRequest.resolver.step8</li>
              <li>
                pullRequest.resolver.step9 <code>{`git push -f origin ${pr.fromBranch}`}</code>
              </li>
              <li>
                pullRequest.resolver.step10{" "}
                <a className="ybtn ybtn-mini ybtn-primary" href={refreshHref}>
                  button.page.refresh
                </a>
                pullRequest.resolver.step11
              </li>
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PullRequestStateNotice(props: {
  onDeleteSourceBranch?: () => Promise<void>;
  onRestoreSourceBranch?: () => Promise<void>;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
}) {
  const pr = props.pullRequest;
  if (pr.state === "open" && !pr.conflict) {
    return (
      <div className="alert alert-success">
        <i className="yobicon-check-circle-alt mr5"></i>
        <span>pullRequest.is.safe</span>
      </div>
    );
  }
  if (pr.conflict) {
    return (
      <PullRequestConflictGuide
        pullRequest={pr}
        runtimeConfig={props.runtimeConfig}
        viewerId={props.viewerId}
      />
    );
  }
  if (pr.state === "merging") {
    return (
      <div className="alert alert-warnning">
        <i className="yobicon-supportrequest mr5"></i>
        <span>pullRequest.is.merging</span>
      </div>
    );
  }
  if (pr.state !== "merged") {
    return null;
  }
  const deleteHref = prHref(
    props.runtimeConfig,
    pr.ownerName,
    pr.projectName,
    pr.pullRequestNumber,
    "deletefrombranch",
  );
  const restoreHref = prHref(
    props.runtimeConfig,
    pr.ownerName,
    pr.projectName,
    pr.pullRequestNumber,
    "restorefrombranch",
  );

  return (
    <section className="alert alert-info pull-request-source-branch">
      <a
        className="usf-group"
        href={`${props.runtimeConfig.basePath}/${encodeURIComponent(pr.receiver.loginId)}`}
      >
        <span className="avatar-wrap smaller">
          <img
            alt={pr.receiver.userLabel || pr.receiver.loginId}
            height={25}
            src={pr.receiver.avatarUrl}
            width={25}
          />
        </span>
        <strong className="name">{pr.receiver.userLabel || pr.receiver.loginId}</strong>
        <span className="loginid">
          {" "}
          <strong>@</strong>
          {pr.receiver.loginId}
        </span>
      </a>{" "}
      {`pullRequest.merged.the.pullrequest ${pr.receiver.userLabel || pr.receiver.loginId}`}{" "}
      {pr.permissions.canDeleteSourceBranch || pr.permissions.canRestoreSourceBranch ? (
        <>
          <code>{pr.fromBranch}</code>{" "}
          {pr.permissions.canDeleteSourceBranch
            ? "pullRequest.delete.frombranch.message"
            : "pullRequest.restore.frombranch.message"}
        </>
      ) : null}
      {pr.permissions.canDeleteSourceBranch ? (
        <button
          className="ybtn ybtn-danger ybtn-mini pull-right"
          data-request-method="delete"
          data-request-uri={deleteHref}
          onClick={() => void props.onDeleteSourceBranch?.()}
          type="button"
        >
          pullRequest.delete.branch
        </button>
      ) : null}
      {pr.permissions.canRestoreSourceBranch ? (
        <a
          className="ybtn ybtn-info ybtn-mini pull-right"
          data-request-method="post"
          href={restoreHref}
          onClick={(event) => {
            event.preventDefault();
            void props.onRestoreSourceBranch?.();
          }}
        >
          pullRequest.restore.branch
        </a>
      ) : null}
    </section>
  );
}

function pullRequestEventStateClass(event: PullRequestEvent) {
  const eventType = event.eventType ?? "";
  const newValue = event.newValue ?? "";
  if (
    eventType === "PULL_REQUEST_COMMIT_CHANGED" ||
    eventType === "PULL_REQUEST_REVIEW_STATE_CHANGED" ||
    eventType === "REVIEW_THREAD_STATE_CHANGED"
  ) {
    return "changed";
  }
  return legacyPullRequestEventState(newValue) || eventType.trim().toLowerCase() || "changed";
}

function legacyPullRequestEventState(value: string) {
  return value.trim().toLowerCase();
}

function pullRequestEventStateLabel(event: PullRequestEvent) {
  const eventType = event.eventType ?? "";
  const newValue = event.newValue ?? "";
  if (eventType === "PULL_REQUEST_REVIEW_STATE_CHANGED") {
    return newValue.trim().toUpperCase() === "DONE"
      ? "pullRequest.review"
      : "pullRequest.unreview";
  }
  if (eventType === "PULL_REQUEST_COMMIT_CHANGED") {
    return "pullRequest.event.commit";
  }
  const state = legacyPullRequestEventState(newValue);
  return state ? `pullRequest.event.${state}` : eventType;
}

function pullRequestEventMessage(event: PullRequestEvent) {
  const eventType = event.eventType ?? "";
  const newValue = event.newValue ?? "";
  if (eventType === "PULL_REQUEST_REVIEW_STATE_CHANGED") {
    return newValue.trim().toUpperCase() === "DONE"
      ? "notification.pullrequest.reviewed"
      : "notification.pullrequest.unreviewed";
  }
  if (eventType === "PULL_REQUEST_COMMIT_CHANGED") {
    return "pullRequest.event.message.commit";
  }
  const state = legacyPullRequestEventState(newValue);
  return state ? `pullRequest.event.message.${state}` : eventType;
}

function pullRequestEventHasMergedCommit(event: PullRequestEvent) {
  return (
    event.eventType === "PULL_REQUEST_MERGED" ||
    (event.eventType === "PULL_REQUEST_STATE_CHANGED" &&
      event.newValue.trim().toUpperCase() === "MERGED")
  );
}

function PullRequestEventTimeline(props: {
  events: PullRequestEvent[];
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  if (props.events.length === 0) {
    return <div className="board-comment-wrap"></div>;
  }
  return (
    <div className="board-comment-wrap">
      <ul className="comments" id="comments">
        {props.events.map((event) => {
          const eventStateClass = pullRequestEventStateClass(event);
          const mergedCommitId = props.pullRequest.mergedCommitIdTo.trim();
          return (
            <li className="event" id={`comment-${event.id}`} key={event.id}>
              <span className={`state ${eventStateClass}`}>{pullRequestEventStateLabel(event)}</span>
              {event.senderLoginId ? (
                <a
                  className="usf-group"
                  data-placement="top"
                  data-toggle="tooltip"
                  href={`${props.runtimeConfig.basePath}/${encodeURIComponent(event.senderLoginId)}`}
                  title={event.senderLoginId}
                >
                  <span className="avatar-wrap small">{event.senderLoginId.slice(0, 1).toUpperCase()}</span>
                </a>
              ) : null}
              <a
                className="usf-group user-link"
                data-placement="top"
                data-toggle="tooltip"
                href={`${props.runtimeConfig.basePath}/${encodeURIComponent(event.senderLoginId)}`}
                title={event.senderLoginId}
              >
                <strong>{event.senderLoginId || "User.anonymous.name"}</strong>
              </a>
              <span>{` ${pullRequestEventMessage(event)}`}</span>
              {pullRequestEventHasMergedCommit(event) && mergedCommitId ? (
                <a
                  className="link"
                  href={buildProjectHref(
                    props.runtimeConfig,
                    props.pullRequest.ownerName,
                    props.pullRequest.projectName,
                    `commit/${encodeURIComponent(mergedCommitId)}`,
                  )}
                  title="code.showCommit"
                >
                  {pullRequestCommitShortId(mergedCommitId)}
                </a>
              ) : null}
              {event.eventType === "PULL_REQUEST_COMMIT_CHANGED" && event.oldValue ? (
                <a
                  className="ybtn ybtn-mini"
                  href={buildProjectHref(
                    props.runtimeConfig,
                    props.pullRequest.ownerName,
                    props.pullRequest.projectName,
                    `compare/${encodeURIComponent(event.oldValue)}..${encodeURIComponent(
                      props.pullRequest.mergedCommitIdTo || event.newValue,
                    )}`,
                  )}
                >
                  pullRequest.additional.changes
                </a>
              ) : null}
              <span className="date">
                <a href={`#event-${event.id}`} title={event.createdLabel}>
                  {event.createdLabel}
                </a>
              </span>
              {event.eventType === "PULL_REQUEST_COMMIT_CHANGED" && event.commits.length ? (
                <ul className="commit-list">
                  {event.commits.map((commit) => {
                    const commitHref = pullRequestChangesCommitHref(
                      props.runtimeConfig,
                      props.pullRequest,
                      commit.commitId,
                    );
                    const shortMessage = pullRequestCommitTitle(commit);
                    const fullMessage = commit.commitMessage.trim();
                    return (
                      <li
                        className={`comment-body commit-info${
                          isOutdatedPullRequestCommit(commit) ? " outdated" : ""
                        }`}
                        key={commit.commitId || commit.commitShortId}
                      >
                        <a className="commit-id" href={commitHref}>
                          {commit.commitShortId || pullRequestCommitShortId(commit.commitId)}
                        </a>
                        <span className="avatar-wrap small hide-in-mobile">
                          {commit.authorEmail}
                        </span>
                        <div className="date hide-in-mobile" title={commit.authorDateLabel}>
                          {commit.authorDateLabel}
                        </div>
                        <a className="commitMsg short" href={commitHref}>
                          {shortMessage}
                        </a>
                        {fullMessage && fullMessage !== shortMessage ? (
                          <pre className="commitMsg desc hidden">{fullMessage}</pre>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ProjectPullRequestDetailPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  pullRequest: PullRequestDetailResponse | undefined;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
  onAccept?: () => Promise<void>;
  onClose?: () => Promise<void>;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onDeleteSourceBranch?: () => Promise<void>;
  onOpen?: () => Promise<void>;
  onReview?: () => Promise<void>;
  onRestoreSourceBranch?: () => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
  onUnreview?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const pr = props.pullRequest;

  return (
    <main className="app-shell pull-request-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
        {pr ? (
          <>
            <div className="board-header issue">
              <div className="pull-right mr10 mt10">
                <div className="date" title={pr.createdLabel}>
                  {pr.createdLabel}
                </div>
                <span
                  className={`pullRequest-stateInfo ${pr.conflict ? "conflict" : pr.state} badge nm ${
                    pr.conflict ? "badge-issue-conflict" : `badge-issue-${pr.state}`
                  }`}
                >
                  {pr.conflict ? "pullRequest.state.conflict" : `pullRequest.state.${pr.state}`}
                </span>
              </div>
              <div className="title">
                <strong className="board-id">{`#${pr.pullRequestNumber}`}</strong> {pr.title}
              </div>
            </div>
            <div className="pull-right">
              <PullRequestReviewMergeControls
                pullRequest={pr}
                runtimeConfig={props.runtimeConfig}
                viewerId={props.viewerId}
                onAccept={props.onAccept}
                onReview={props.onReview}
                onUnreview={props.onUnreview}
              />
            </div>
            <PullRequestOverviewTabs
              active="overview"
              pullRequest={pr}
              runtimeConfig={props.runtimeConfig}
            />
            <div className="board-body">
              <div className="author-info left-txt">
                <a
                  className="usf-group pull-left"
                  href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                    pr.contributor.loginId,
                  )}`}
                >
                  <span className="avatar-wrap smaller">
                    <img
                      alt={pr.contributor.userLabel || pr.contributor.loginId}
                      height={32}
                      src={pr.contributor.avatarUrl}
                      width={32}
                    />
                  </span>
                  <strong className="name">
                    {pr.contributor.userLabel || pr.contributor.loginId}
                  </strong>
                  <span className="loginid">
                    {" "}
                    <strong>@</strong>
                    {pr.contributor.loginId}
                  </span>
                </a>
                <PullRequestBranchInfo pullRequest={pr} runtimeConfig={props.runtimeConfig} />
              </div>
              <MarkdownRenderer
                className="content markdown-wrap"
                basePath={props.runtimeConfig.basePath}
                commitReferences={pullRequestMarkdownCommitReferences(pr)}
                issueReferences={pr.issueReferences}
                markdown={pr.bodyMarkdown}
                mentionReferences={pr.mentionReferences}
                ownerName={pr.ownerName}
                projectName={pr.projectName}
              />
              <div className="attachments" data-attachments="[]"></div>
            </div>
            <div id="state" className="pullRequest-stateInfo">
              <PullRequestStateNotice
                pullRequest={pr}
                runtimeConfig={props.runtimeConfig}
                onDeleteSourceBranch={props.onDeleteSourceBranch}
                onRestoreSourceBranch={props.onRestoreSourceBranch}
                viewerId={props.viewerId}
              />
            </div>
            <div className="board-footer board-actrow">
              <PullRequestActionBar
                pullRequest={pr}
                runtimeConfig={props.runtimeConfig}
                onClose={props.onClose}
                onOpen={props.onOpen}
                onWatchToggle={props.onWatchToggle}
              />
            </div>
            <hr className="nm" />
            <PullRequestEventTimeline
              events={pr.events}
              pullRequest={pr}
              runtimeConfig={props.runtimeConfig}
            />
            <div className="right-txt">
              <a className="ybtn ybtn-inverse ybtn-mini" data-toggle="modal" href="#helpMessage">
                title.help
              </a>
            </div>
            <div id="helpMessage" className="modal hide fade pullreq-info">
              <div className="modal-header">
                <h5>pullRequest.merge.help.1</h5>
              </div>
              <div className="modal-body">
                <div className="row-fluid">
                  <div className="pull-left help-messages mt10">
                    <p>pullRequest.merge.help.2</p>
                    <p>pullRequest.merge.help.3</p>
                    <p>pullRequest.merge.help.4</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="ybtn ybtn-info ybtn-small" data-dismiss="modal" type="button">
                  button.confirm
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="warning-none"></div>
        )}
        </div>
      </div>
    </main>
  );
}

function ReviewThreadItem(props: {
  csrfToken?: string;
  currentUser?: PullRequestCurrentUser;
  pullRequest?: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
  thread: ReviewThread;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onThreadCommentSubmit?: (
    threadId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editAttachmentIds, setEditAttachmentIds] = React.useState<number[]>([]);
  const [replyText, setReplyText] = React.useState("");
  const [replyAttachmentIds, setReplyAttachmentIds] = React.useState<number[]>([]);
  const threadState = reviewThreadStateClass(props.thread);
  const isCodeThread = props.thread.path.trim() !== "";
  const isOutdated = isOutdatedReviewThread(props.thread, props.pullRequest);
  const replyAuthor = props.currentUser ?? props.pullRequest?.contributor;
  const replyAuthorLabel = replyAuthor?.userLabel || replyAuthor?.loginId || "";

  function beginEdit(comment: ReviewThread["comments"][number]) {
    setEditingCommentId(comment.id);
    setEditText(comment.contentsMarkdown);
    setEditAttachmentIds([]);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = editText.trim();
    if (!editingCommentId || !contentsMarkdown || !props.onCommentUpdate) {
      return;
    }
    await props.onCommentUpdate(editingCommentId, contentsMarkdown, editAttachmentIds);
    setEditingCommentId(null);
    setEditText("");
    setEditAttachmentIds([]);
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = replyText.trim();
    if (!contentsMarkdown || !props.onThreadCommentSubmit) {
      return;
    }
    await props.onThreadCommentSubmit(props.thread.id, contentsMarkdown, replyAttachmentIds);
    setReplyAttachmentIds([]);
    setReplyText("");
  }

  return (
    <article
      className={`comment-thread-wrap ${threadState}${threadState === "closed" && isCodeThread ? " fold" : ""}${isOutdated ? " outdated" : ""}`}
      data-range-endline={props.thread.endLine}
      data-range-endside={props.thread.endSide}
      data-range-path={isCodeThread ? props.thread.path : undefined}
      data-range-startline={props.thread.startLine}
      data-range-startside={props.thread.startSide}
      data-state={isCodeThread ? threadState : undefined}
      data-toggle={isCodeThread ? "CodeCommentThread" : undefined}
      id={`thread-${props.thread.id}`}
    >
      <div className="btn-thread-here btn-thread-minimize">
        <button className="ybtn ybtn-default ybtn-small" type="button">
          <i className={isCodeThread ? "yobicon-post2" : "yobicon-comments"}></i>
        </button>
      </div>
      {isCodeThread ? (
        <div className="thread-header">
          <span className={`badge state ${threadState}`}>{`issue.state.${threadState}`}</span>
          <button className="ybtn ybtn-default ybtn-small btn-thread-minimize" type="button">
            <i className="yobicon-maximize"></i>
          </button>
          {isOutdated ? <span className="outdated-label">review.outdated</span> : null}
        </div>
      ) : null}
      {!props.onThreadCommentSubmit ? (
        <div className="thread-actrow">
          {threadState === "closed" ? (
            <button
              className="ybtn ybtn-default ybtn-small"
              data-request-method="post"
              data-request-uri={reviewThreadStateHref(props.runtimeConfig, props.thread.id, "open")}
              onClick={() => void props.onThreadOpen?.(props.thread.id)}
              type="button"
            >
              commentThread.open
            </button>
          ) : (
            <button
              className="ybtn ybtn-default ybtn-small"
              data-request-method="post"
              data-request-uri={reviewThreadStateHref(props.runtimeConfig, props.thread.id, "close")}
              onClick={() => void props.onThreadClose?.(props.thread.id)}
              type="button"
            >
              commentThread.close
            </button>
          )}
        </div>
      ) : null}
      <ul className="comments">
        {props.thread.comments.map((comment) => {
          const authorLabel = comment.authorLabel || comment.authorLoginId || "issue.noAuthor";
          const authorHref =
            props.runtimeConfig && comment.authorLoginId
              ? `${props.runtimeConfig.basePath}/${encodeURIComponent(comment.authorLoginId)}`
              : "#";
          return (
            <li className="comment" id={`comment-${comment.id}`} key={comment.id}>
              <div className="comment-avatar">
                <a
                  className="avatar-wrap"
                  data-placement="top"
                  data-toggle="tooltip"
                  href={authorHref}
                  title={authorLabel}
                >
                  <img
                    alt={comment.authorLoginId || authorLabel}
                    height={32}
                    src={props.thread.authorAvatarUrl}
                    width={32}
                  />
                </a>
              </div>
              <div className="media-body">
                <div className="meta-info">
                  <span className="comment_author pull-left">
                    <a
                      data-placement="top"
                      data-toggle="tooltip"
                      href={authorHref}
                      title={authorLabel}
                    >
                      <strong>{`${comment.authorLoginId || authorLabel} `}</strong>
                    </a>
                  </span>
                  <span className="ago">
                    <a href={`#comment-${comment.id}`} title={comment.createdLabel}>
                      {comment.createdLabel}
                    </a>
                  </span>
                  {comment.canDelete && props.pullRequest && props.runtimeConfig ? (
                    <span className="edit pull-right">
                      {props.onCommentUpdate ? (
                        <button
                          className="btn-transparent pull-right"
                          data-request-method="patch"
                          data-request-uri={pullRequestApiHref(
                            props.runtimeConfig,
                            props.pullRequest,
                            `/comments/${comment.id}`,
                          )}
                          onClick={() => beginEdit(comment)}
                          type="button"
                        >
                          button.edit
                        </button>
                      ) : null}
                      <button
                        aria-label="common.comment.delete"
                        className="btn-transparent pull-right close"
                        data-request-method="delete"
                        data-request-uri={pullRequestApiHref(
                          props.runtimeConfig,
                          props.pullRequest,
                          `/comments/${comment.id}`,
                        )}
                        data-toggle="comment-delete"
                        onClick={() => void props.onCommentDelete?.(comment.id)}
                        title="common.comment.delete"
                        type="button"
                      >
                        <i className="yobicon-trash"></i>
                      </button>
                    </span>
                  ) : null}
                </div>
                {editingCommentId === comment.id && props.pullRequest && props.runtimeConfig ? (
                  <div
                    className="comment-update-form review-comment-edit-form"
                    id={`comment-editform-${comment.id}`}
                  >
                    <form
                      action={pullRequestApiHref(
                        props.runtimeConfig,
                        props.pullRequest,
                        `/comments/${comment.id}`,
                      )}
                      encType="multipart/form-data"
                      method="post"
                      onSubmit={(event) => void submitEdit(event)}
                    >
                      <input name="_method" type="hidden" value="patch" />
                      <input name="id" type="hidden" value={comment.id} />
                      <div className="write-comment-box">
                        <div className="write-comment-wrap">
                          <LegacyMarkdownEditorShell
                            editId={`edit-${comment.id}`}
                            editorMode="update-comment-body"
                            previewId={`preview-${comment.id}`}
                          >
                            <MarkdownAttachmentTextarea
                              className="editorSeries content comment nm"
                              csrfToken={props.csrfToken}
                              editorMode="update-comment-body"
                              id={`editor-contents-${comment.id}`}
                              name={`contents-${comment.id}`}
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
                              <div className="msg">common.attach.dropFilesHere</div>
                            </div>
                          </div>
                          <div className="right-txt comment-update-button upload-button-line">
                            <button
                              className="ybtn ybtn-cancel"
                              data-comment-id={comment.id}
                              onClick={() => setEditingCommentId(null)}
                              type="button"
                            >
                              button.cancel
                            </button>
                            <button className="ybtn ybtn-info" type="submit">
                              button.save
                            </button>
                          </div>
                        </div>
                        <input
                          className="temporaryUploadFiles"
                          name="temporaryUploadFiles"
                          type="hidden"
                          value=""
                        />
                        <div className={`preview-${comment.id}`}></div>
                        <div className="attachment-files"></div>
                        <div
                          data-resourceid={comment.id}
                          data-resourcetype="NONISSUE_COMMENT"
                          id={`upload-${comment.id}`}
                        ></div>
                      </div>
                    </form>
                  </div>
                ) : (
                  <MarkdownRenderer
                    className="comment-body markdown-wrap"
                    basePath={props.runtimeConfig?.basePath}
                    commitReferences={
                      props.pullRequest ? pullRequestMarkdownCommitReferences(props.pullRequest) : []
                    }
                    data-via-email={comment.viaEmail ? "true" : undefined}
                    issueReferences={comment.issueReferences}
                    markdown={comment.contentsMarkdown}
                    mentionReferences={comment.mentionReferences}
                    ownerName={props.pullRequest?.ownerName}
                    projectName={props.pullRequest?.projectName}
                  />
                )}
                <div
                  className="attachments"
                  data-attachments={JSON.stringify(comment.attachments ?? [])}
                ></div>
              </div>
            </li>
          );
        })}
      </ul>
      {props.pullRequest && props.runtimeConfig && props.onThreadCommentSubmit ? (
        <div className="write-comment-form">
          <form
            action={pullRequestApiHref(props.runtimeConfig, props.pullRequest, "/comments")}
            className="review-form"
            encType="multipart/form-data"
            method="post"
            onSubmit={(event) => void submitReply(event)}
            style={{ display: "block" }}
          >
            <input name="thread.id" type="hidden" value={props.thread.id} />
            <div className="author-info-wrap pull-left hide-in-mobile">
              <div className="author-info">
                {replyAuthor ? (
                  <a
                    className="avatar-wrap medium"
                    data-placement="top"
                    data-toggle="tooltip"
                    href={`${props.runtimeConfig.basePath}/${encodeURIComponent(replyAuthor.loginId)}`}
                    title={replyAuthorLabel}
                  >
                    {replyAuthor.avatarUrl ? (
                      <img alt="" height={32} src={replyAuthor.avatarUrl} width={32} />
                    ) : (
                      <span className="avatar-img">{replyAuthorLabel}</span>
                    )}
                  </a>
                ) : null}
              </div>
            </div>
            <div className="write-comment-box">
              <div className="write-comment-wrap">
                <div data-toggle="markdown-editor" className="mt10">
                  <ul className="nav nav-tabs nm small">
                    <li className="active">
                      <a data-mode="edit" data-toggle="tab" href={`#edit-thread-${props.thread.id}`}>
                        common.editor.edit
                      </a>
                    </li>
                    <li>
                      <a
                        data-mode="preview"
                        data-toggle="tab"
                        href={`#preview-thread-${props.thread.id}`}
                      >
                        common.editor.preview
                      </a>
                    </li>
                    <li>
                      <div className="task-list-button">
                        <button
                          className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
                          onClick={(event) => addLegacyTasklistTemplateFromButton(event.currentTarget)}
                          type="button"
                        >
                          <i className="yobicon-list task-list-icon"></i> button.add.checklist
                        </button>
                      </div>
                    </li>
                    <li>
                      <div className="editor-clear-temporary">
                        <div className="editor-clear-temporary-button">
                          <button
                            className="ybtn ybtn-small ybtn-warning"
                            id="button-clear-temporary"
                            type="button"
                          >
                            button.clear.temporary
                          </button>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="editor-notice-label"></div>
                    </li>
                  </ul>
                  <div className="tab-content" style={{ overflow: "visible", position: "relative" }}>
                    <LegacyMarkdownHelp />
                    <div className="tab-pane active" id={`edit-thread-${props.thread.id}`}>
                      <div className="textarea-box">
                        <MarkdownAttachmentTextarea
                          className="editorSeries content comment nm"
                          csrfToken={props.csrfToken}
                          editorMode="code-review-body"
                          id={`editor-contents-thread-${props.thread.id}`}
                          name="contents"
                          onAttachmentUpload={(attachment) =>
                            setReplyAttachmentIds((current) => [...current, attachment.id])
                          }
                          onChange={setReplyText}
                          runtimeConfig={props.runtimeConfig}
                          value={replyText}
                        />
                      </div>
                    </div>
                    <div className="tab-pane" id={`preview-thread-${props.thread.id}`}>
                      <div
                        className="markdown-preview markdown-wrap code-review-body"
                        data-via-email="false"
                      ></div>
                    </div>
                    <div className="notification-receiver">
                      <span className="notification-receiver-title">
                        notification.receiver.list.title
                      </span>
                      <span className="notification-receiver-list"></span>
                    </div>
                  </div>
                </div>
                <div className="upload-wrap content-footer" data-resource-type="REVIEW_COMMENT">
                  <div className="attach-wrap">
                    <span className="help help-droppable">common.attach.drophere</span>
                    <div className="btn-wrap">
                      <div className="nbtn medium white fake-file-wrap">
                        <i className="yobicon-upload"></i> button.upload
                        <input className="file" multiple={true} name="filePath" type="file" />
                      </div>
                    </div>
                    <span className="plain">common.attach.clickbutton</span>
                    <span className="help help-pastable">common.attach.pastehere</span>
                  </div>
                  <ul className="attached-files unstyled"></ul>
                  <p className="right-txt help">
                    <i className="yobicon-supportrequest"></i>{" "}
                    common.attach.attachIfYouSave
                  </p>
                </div>
                <div className="upload-drop-here">
                  <div className="msg-wrap">
                    <div className="msg">common.attach.dropFilesHere</div>
                  </div>
                </div>
                <div className="right-txt">
                  {threadState === "closed" ? (
                    <button
                      className="ybtn ybtn-default ybtn-small"
                      data-request-method="post"
                      data-request-uri={reviewThreadStateHref(props.runtimeConfig, props.thread.id, "open")}
                      onClick={() => void props.onThreadOpen?.(props.thread.id)}
                      type="button"
                    >
                      commentThread.open
                    </button>
                  ) : (
                    <button
                      className="ybtn ybtn-default ybtn-small"
                      data-request-method="post"
                      data-request-uri={reviewThreadStateHref(props.runtimeConfig, props.thread.id, "close")}
                      onClick={() => void props.onThreadClose?.(props.thread.id)}
                      type="button"
                    >
                      commentThread.close
                    </button>
                  )}
                  <button className="ybtn ybtn-success ybtn-small" type="submit">
                    button.comment.new
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function ReviewThreadCards(props: {
  pullRequest?: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
  threads: ReviewThread[];
}) {
  if (props.threads.length === 0) {
    return null;
  }
  const openThreads = props.threads.filter((thread) => reviewThreadStateClass(thread) !== "closed");
  const closedThreads = props.threads.filter(
    (thread) => reviewThreadStateClass(thread) === "closed",
  );
  return (
    <section className="review-wrap">
      <div className="review-container">
        <button className="ybtn ybtn-default btn-hide-reviewcards" type="button">
          <i className="yobicon-maximize"></i>
        </button>
        <ul className="nav nav-tabs" style={{ marginBottom: 10 }}>
          <li className="active">
            <a data-toggle="tab" href="#reviewcards-open">
              {`issue.state.open ${openThreads.length}`}
            </a>
          </li>
          <li>
            <a data-toggle="tab" href="#reviewcards-closed">
              {`issue.state.closed ${closedThreads.length}`}
            </a>
          </li>
        </ul>
        <div className="tab-content review-list">
          <div className="tab-pane active" id="reviewcards-open">
            {openThreads.map((thread) => (
              <ReviewThreadCard
                key={thread.id}
                pullRequest={props.pullRequest}
                runtimeConfig={props.runtimeConfig}
                thread={thread}
              />
            ))}
          </div>
          <div className="tab-pane" id="reviewcards-closed">
            {closedThreads.map((thread) => (
              <ReviewThreadCard
                key={thread.id}
                pullRequest={props.pullRequest}
                runtimeConfig={props.runtimeConfig}
                thread={thread}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewThreadCard(props: {
  pullRequest?: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
  thread: ReviewThread;
}) {
  const threadState = reviewThreadStateClass(props.thread);
  const isOutdated = isOutdatedReviewThread(props.thread, props.pullRequest);
  const replyCount = Math.max(props.thread.comments.length - 1, 0);
  const firstComment = props.thread.comments[0];
  return (
    <a
      className={`review-card ${threadState}${isOutdated ? " outdated" : ""}`}
      href={reviewThreadCardHref(props.runtimeConfig, props.pullRequest, props.thread)}
    >
      <p className="content">{firstComment?.contentsMarkdown ?? ""}</p>
      <p className="info">
        {replyCount > 0 ? (
          <span className="comments pull-left">
            <i className="yobicon-comments"></i> {replyCount}
          </span>
        ) : null}
        <span className="outdated-label">review.outdated</span>
        <span className="date" title={props.thread.createdLabel}>
          {props.thread.createdLabel}
        </span>
        <span className="avatar-wrap smaller ml5">
          <img
            alt={props.thread.authorLabel || props.thread.authorLoginId}
            src={props.thread.authorAvatarUrl}
          />
        </span>
      </p>
    </a>
  );
}

function SelectedPullRequestCommitInfo(props: { commit: PullRequestCommitViewModel }) {
  const authorLabel = props.commit.authorEmail || "User.anonymous.name";
  return (
    <>
      <p className="commitInfo">
        <span className="avatar-wrap smaller">{authorLabel.slice(0, 1).toUpperCase()}</span>
        <strong>{authorLabel}</strong>
        <span className="ago" title={props.commit.authorDateLabel}>
          {props.commit.authorDateLabel}
        </span>
      </p>
      <pre className="commitMsg mt5">{props.commit.commitMessage}</pre>
    </>
  );
}

function PullRequestBlockReviewForm(props: {
  csrfToken?: string;
  draft: InlineReviewDraft | null;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const action = pullRequestApiHref(props.runtimeConfig, props.pullRequest, "/comments");
  const authorLabel =
    props.pullRequest.contributor.userLabel || props.pullRequest.contributor.loginId;
  return (
    <div className="review-form" id="review-form" style={{ display: "none" }}>
      <form action={action} encType="multipart/form-data" method="post">
        <input name="commitId" type="hidden" value={props.pullRequest.mergedCommitIdTo} />
        <input name="prevCommitId" type="hidden" value={props.pullRequest.mergedCommitIdFrom} />
        <input name="path" type="hidden" value={props.draft?.path ?? ""} />
        <input name="startLine" type="hidden" value={props.draft?.startLine ?? ""} />
        <input name="startSide" type="hidden" value={props.draft?.startSide ?? ""} />
        <input name="endLine" type="hidden" value={props.draft?.endLine ?? ""} />
        <input name="endSide" type="hidden" value={props.draft?.endSide ?? ""} />
        <div className="author-info-wrap pull-left hide-in-mobile">
          <div className="author-info">
            <a
              className="avatar-wrap medium"
              data-original-title={authorLabel}
              data-placement="top"
              data-toggle="tooltip"
              href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                props.pullRequest.contributor.loginId,
              )}`}
              title=""
            >
              <span className="avatar-img">{authorLabel}</span>
            </a>
          </div>
        </div>
        <div className="write-comment-box">
          <div className="write-comment-wrap">
            <div className="pull-right">
              <button className="ybtn ybtn-default ybtn-small" data-toggle="close" type="button">
                &times;
              </button>
            </div>
            <div data-toggle="markdown-editor" className="mt10">
              <ul className="nav nav-tabs nm small">
                <li className="active">
                  <a data-mode="edit" data-toggle="tab" href="#edit-review">
                    common.editor.edit
                  </a>
                </li>
                <li>
                  <a data-mode="preview" data-toggle="tab" href="#preview-review">
                    common.editor.preview
                  </a>
                </li>
              </ul>
              <div className="tab-content" style={{ overflow: "visible", position: "relative" }}>
                <LegacyMarkdownHelp />
                <div className="tab-pane active" id="edit-review">
                  <div className="textarea-box">
                    <textarea
                      className="editorSeries content comment nm"
                      data-editor-mode="code-review-body"
                      id="editor-contents-review"
                      name="contents"
                      {...{ markdown: "true" }}
                    ></textarea>
                  </div>
                </div>
                <div className="tab-pane" id="preview-review">
                  <div
                    className="markdown-preview markdown-wrap code-review-body"
                    data-via-email="false"
                  ></div>
                </div>
              </div>
            </div>
            {!props.csrfToken ? null : (
              <input name="csrfToken" type="hidden" value={props.csrfToken} />
            )}
            <div className="right-txt">
              <button className="ybtn ybtn-success ybtn-small" type="submit">
                button.comment.new
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export function PullRequestChangesPage(props: {
  csrfToken?: string;
  changes: PullRequestChangesResponse | undefined;
  currentUser?: PullRequestCurrentUser;
  detail: ProjectDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
  selectedCommitId?: string;
  viewerId?: number;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
  onInlineCommentSubmit?: (input: PullRequestInlineCommentSubmitInput) => Promise<void>;
  onThreadCommentSubmit?: (
    threadId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const pr = props.changes?.pullRequest;
  const files = props.changes?.files ?? [];
  const threads = props.changes?.threads ?? [];
  const cardThreads = props.changes?.cardThreads ?? threads;
  const inlineThreads = props.changes?.inlineThreads ?? threads;
  const commits = props.changes?.commits ?? [];
  const selectedCommit = props.selectedCommitId
    ? [...commits, ...(pr?.commits ?? [])].find(
        (commit) => commit.commitId === props.selectedCommitId,
      )
    : undefined;
  const selectableCommits = commits.filter(isSelectablePullRequestCommit);
  const [inlineDraft, setInlineDraft] = React.useState<InlineReviewDraft | null>(null);
  const [pendingInlineDraft, setPendingInlineDraft] = React.useState<InlineReviewDraft | null>(null);
  const [inlineCommentText, setInlineCommentText] = React.useState("");
  const [inlineAttachmentIds, setInlineAttachmentIds] = React.useState<number[]>([]);
  const [commentDraft, setCommentDraft] = React.useState("");
  const [commentAttachmentIds, setCommentAttachmentIds] = React.useState<number[]>([]);
  const canComment = pr?.permissions.canComment === true;

  function inlineThreadsForLine(path: string, line: number, side: "A" | "B") {
    return inlineThreads.filter(
      (thread) =>
        isInlineReviewThreadForChanges(thread, pr, props.selectedCommitId) &&
        thread.path === path &&
        (thread.endLine ?? thread.startLine) === line &&
        ((thread.endSide ?? thread.startSide) || "B") === side,
    );
  }

  function openInlineDraft(path: string, line: number, side: "A" | "B") {
    const nextDraft = { endLine: line, endSide: side, path, startLine: line, startSide: side };
    setInlineDraft((current) =>
      current?.path === nextDraft.path &&
      current.startLine === nextDraft.startLine &&
      current.endLine === nextDraft.endLine &&
      current.startSide === nextDraft.startSide &&
      current.endSide === nextDraft.endSide
        ? null
        : nextDraft,
    );
    setPendingInlineDraft(null);
    setInlineCommentText("");
    setInlineAttachmentIds([]);
  }

  function openInlineDraftFromSelection(path: string, table: HTMLTableElement) {
    if (!canComment) {
      return;
    }
    const selectedDraft = inlineDraftFromSelection(path, table);
    if (!selectedDraft) {
      return;
    }
    setPendingInlineDraft(selectedDraft);
    setInlineDraft(null);
  }

  function openPendingInlineDraft() {
    if (!pendingInlineDraft) {
      return;
    }
    setInlineDraft(pendingInlineDraft);
    setPendingInlineDraft(null);
    setInlineCommentText("");
    setInlineAttachmentIds([]);
    window.getSelection()?.removeAllRanges();
  }

  async function submitInlineComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = inlineCommentText.trim();
    if (!contentsMarkdown || !inlineDraft || !pr || !props.onInlineCommentSubmit) {
      return;
    }
    await props.onInlineCommentSubmit({
      attachmentIds: inlineAttachmentIds,
      commitId: pr.mergedCommitIdTo,
      contentsMarkdown,
      endLine: inlineDraft.endLine,
      endSide: inlineDraft.endSide,
      path: inlineDraft.path,
      prevCommitId: pr.mergedCommitIdFrom,
      startLine: inlineDraft.startLine,
      startSide: inlineDraft.startSide,
    });
    setInlineAttachmentIds([]);
    setInlineCommentText("");
    setInlineDraft(null);
  }

  async function submitNonRangedComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contentsMarkdown = commentDraft.trim();
    if (!contentsMarkdown || !props.onCommentSubmit) {
      return;
    }
    await props.onCommentSubmit(contentsMarkdown, commentAttachmentIds);
    setCommentAttachmentIds([]);
    setCommentDraft("");
  }

  function renderReviewThread(thread: ReviewThread) {
    return (
      <ReviewThreadItem
        key={thread.id}
        currentUser={props.currentUser}
        pullRequest={pr}
        runtimeConfig={props.runtimeConfig}
        thread={thread}
        csrfToken={props.csrfToken}
        onCommentDelete={props.onCommentDelete}
        onCommentUpdate={props.onCommentUpdate}
        onThreadCommentSubmit={
          canComment && props.onThreadCommentSubmit ? props.onThreadCommentSubmit : undefined
        }
        onThreadClose={props.onThreadClose}
        onThreadOpen={props.onThreadOpen}
      />
    );
  }

  function renderChangedFile(file: PullRequestChangedFile) {
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
          onMouseUp={(event) => openInlineDraftFromSelection(file.path, event.currentTarget)}
        >
          <tbody>
            {diffLines.map((line) => {
              const lineSide = line.kind === "remove" ? "A" : "B";
              const lineThreads =
                line.commentLine === undefined
                  ? []
                  : inlineThreadsForLine(file.path, line.commentLine, lineSide);
              const isInlineDraftOpen =
                inlineDraft?.path === file.path &&
                inlineDraft.endLine === line.commentLine &&
                inlineDraft.endSide === lineSide;
              return (
                <React.Fragment key={line.key}>
                  <tr
                    className={diffLineClass(line.kind)}
                    data-line={line.commentLine}
                    data-side={lineSide}
                    data-type={diffLineClass(line.kind)}
                  >
                    <td className="linenum">
                      {line.commentLine !== undefined && canComment ? (
                        <button
                          aria-label={`Comment on ${file.path}:${line.commentLine}`}
                          className="btn-transparent line-comment-trigger"
                          onClick={() =>
                            openInlineDraft(file.path, line.commentLine ?? 0, lineSide)
                          }
                          type="button"
                          >
                          button.comment.new
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
                  {isInlineDraftOpen && pr && inlineDraft ? (
                    <tr
                      className="comments board-comment-wrap inline-comment-form-row"
                      data-range-endline={inlineDraft.endLine}
                      data-range-endside={inlineDraft.endSide}
                      data-range-path={inlineDraft.path}
                      data-range-startline={inlineDraft.startLine}
                      data-range-startside={inlineDraft.startSide}
                    >
                      <td colSpan={3}>
                        <form
                          action={pullRequestApiHref(props.runtimeConfig, pr, "/comments")}
                          className="review-form code-review-form inline-review-form"
                          method="post"
                          onSubmit={(event) => void submitInlineComment(event)}
                        >
                          <input name="commitId" type="hidden" value={pr.mergedCommitIdTo} />
                          <input name="prevCommitId" type="hidden" value={pr.mergedCommitIdFrom} />
                          <input name="path" type="hidden" value={file.path} />
                          <input name="startLine" type="hidden" value={inlineDraft.startLine} />
                          <input name="startSide" type="hidden" value={inlineDraft.startSide} />
                          <input name="endLine" type="hidden" value={inlineDraft.endLine} />
                          <input name="endSide" type="hidden" value={inlineDraft.endSide} />
                          <MarkdownAttachmentTextarea
                            ariaLabel={`Pull request review comment on ${file.path}:${inlineDraft.startLine}-${inlineDraft.endLine}`}
                            csrfToken={props.csrfToken}
                            disabled={!canComment}
                            name="contentsMarkdown"
                            onAttachmentUpload={(attachment) =>
                              setInlineAttachmentIds((current) => [...current, attachment.id])
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
                            button.comment.new
                          </button>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                  {lineThreads.length > 0 ? (
                    <tr
                      className="comments board-comment-wrap"
                      data-commit-id={pr?.mergedCommitIdTo ?? ""}
                    >
                      <td colSpan={3}>{lineThreads.map(renderReviewThread)}</td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </article>
    );
  }

  const unrangedThreads =
    props.changes?.nonRangedThreads ??
    threads.filter((thread) => !thread.path);
  return (
    <main className="app-shell pull-request-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
        <div className="code-browse-wrap">
          {pr ? (
            <>
              <PullRequestOverviewTabs
                active="changes"
                pullRequest={pr}
                runtimeConfig={props.runtimeConfig}
              />
              <div className="board-body mb20">
                <div className="author-info right-txt" style={{ marginTop: 20 }}>
                  <a
                    className="usf-group pull-left"
                    href={`${props.runtimeConfig.basePath}/${encodeURIComponent(
                      pr.contributor.loginId,
                    )}`}
                  >
                    <span className="avatar-wrap smaller">
                      <span className="avatar-img">
                        {pr.contributor.userLabel || pr.contributor.loginId}
                      </span>
                    </span>
                    <strong className="name">
                      {pr.contributor.userLabel || pr.contributor.loginId}
                    </strong>
                    <span className="loginid">
                      {" "}
                      <strong>@</strong>
                      {pr.contributor.loginId}
                    </span>
                  </a>
                  <PullRequestBranchInfo pullRequest={pr} runtimeConfig={props.runtimeConfig} />
                </div>
              </div>
            </>
          ) : null}
          <section className={`codediff-wrap mt10${cardThreads.length === 0 ? " diffs-only" : ""}`}>
            {cardThreads.length > 0 ? (
              <button className="ybtn ybtn-default btn-show-reviewcards" type="button">
                <i className="yobicon-restore"></i>
              </button>
            ) : null}
            <div className="diffs-wrap" id="changes">
              <div className="btn-group auto mb10" id="commits">
                <button className="btn dropdown-toggle auto" data-toggle="dropdown" type="button">
                  <span className="d-label">
                    {selectedCommit ? (
                      <>
                        <strong className="blue-txt mr10 commit-hash">
                          {selectedCommit.commitShortId ||
                            pullRequestCommitShortId(selectedCommit.commitId)}
                        </strong>
                        <span>
                          {pullRequestCommitTitle(selectedCommit)}
                          {isOutdatedPullRequestCommit(selectedCommit) ? (
                            <>
                              {" "}
                              <span className="outdated-label">review.outdated</span>
                            </>
                          ) : null}
                        </span>
                      </>
                    ) : props.selectedCommitId ? (
                      <>
                        pullRequest.changes.all{" "}
                        <span className="outdated-label">review.outdated</span>
                        {" - "}
                        <strong className="blue-txt mr10 commit-hash">
                          {pullRequestCommitShortId(props.selectedCommitId)}
                        </strong>
                      </>
                    ) : (
                      "pullRequest.changes.all"
                    )}
                  </span>
                  <span className="d-caret">
                    <span className="caret"></span>
                  </span>
                </button>
                <ul className="dropdown-menu">
                  <li data-value="All">
                    <a href={pr ? pullRequestChangesCommitHref(props.runtimeConfig, pr) : "#"}>
                      pullRequest.changes.all
                    </a>
                  </li>
                  <li className="divider"></li>
                  {selectableCommits.map((commit) => {
                    const outdated = isOutdatedPullRequestCommit(commit);
                    return (
                      <li
                        className={outdated ? "outdated" : undefined}
                        data-value={commit.commitId}
                        key={commit.commitId}
                      >
                        <a
                          href={
                            pr
                              ? pullRequestChangesCommitHref(props.runtimeConfig, pr, commit.commitId)
                              : "#"
                          }
                        >
                          <strong className="blue-txt mr10 commit-hash">
                            {commit.commitShortId || commit.commitId}
                          </strong>
                          <span>
                            {pullRequestCommitTitle(commit)}
                            {outdated ? (
                              <>
                                {" "}
                                <span className="outdated-label">review.outdated</span>
                              </>
                            ) : null}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {selectedCommit ? <SelectedPullRequestCommitInfo commit={selectedCommit} /> : null}
              <div className="diff-body diffs-wrap-scroll">
                {pr ? (
                  <>
                    <div
                      className={`pullRequest-stateInfo state ${
                        pr.conflict ? "conflict" : pr.state
                      }`}
                    >
                      {pr.conflict ? "pullRequest.state.conflict" : `pullRequest.state.${pr.state}`}
                    </div>
                    <PullRequestConflictGuide
                      pullRequest={pr}
                      runtimeConfig={props.runtimeConfig}
                      viewerId={props.viewerId}
                    />
                  </>
                ) : null}
                {files.map(renderChangedFile)}
                <div className="btnPop">
                  <button
                    className="ybtn ybtn-info ybtn-small"
                    data-block-ready={pendingInlineDraft ? "true" : "false"}
                    disabled={!pendingInlineDraft}
                    onClick={openPendingInlineDraft}
                    type="button"
                  >
                    <i className="yobicon-post2"></i>
                  </button>
                </div>
              </div>
              <div className="board-comment-wrap">
                <div className="non-ranged-threads-wrap">
                  {unrangedThreads.map(renderReviewThread)}
                </div>
                {canComment ? (
                  <form
                    action={pr ? pullRequestApiHref(props.runtimeConfig, pr, "/comments") : undefined}
                    className="board-comment-form"
                    encType="multipart/form-data"
                    id="comment-form"
                    method="post"
                    onSubmit={(event) => void submitNonRangedComment(event)}
                  >
                    <div className="write-comment-box">
                      <MarkdownAttachmentTextarea
                        className="editorSeries content comment nm"
                        csrfToken={props.csrfToken}
                        name="contents"
                        onAttachmentUpload={(attachment) =>
                          setCommentAttachmentIds((current) => [...current, attachment.id])
                        }
                        onChange={setCommentDraft}
                        runtimeConfig={props.runtimeConfig}
                        value={commentDraft}
                      />
                      <div className="write-comment-wrap">
                        <div className="right-txt">
                          <button className="ybtn hidden" id="dynamic-comment-btn" type="button"></button>
                          <button className="ybtn ybtn-success" type="submit">
                            button.comment.new
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : null}
              </div>
              {canComment && pr ? (
                <PullRequestBlockReviewForm
                  csrfToken={props.csrfToken}
                  draft={inlineDraft}
                  pullRequest={pr}
                  runtimeConfig={props.runtimeConfig}
                />
              ) : null}
            </div>
            <ReviewThreadCards
              pullRequest={pr}
              runtimeConfig={props.runtimeConfig}
              threads={cardThreads}
            />
          </section>
        </div>
        </div>
      </div>
    </main>
  );
}

function projectReviewThreadHref(
  runtimeConfig: RuntimeConfig,
  detail: ProjectDetailViewModel,
  thread: ReviewThread,
) {
  const anchor = `#thread-${thread.id}`;
  const commitId = thread.commitId.trim();
  if (!thread.pullRequestNumber) {
    return commitId === ""
      ? anchor
      : `${buildProjectHref(
          runtimeConfig,
          detail.ownerName,
          detail.projectName,
          `commit/${encodeURIComponent(commitId)}`,
        )}${anchor}`;
  }
  const suffix = commitId === "" ? "changes" : `changes/${encodeURIComponent(commitId)}`;
  return `${prHref(
    runtimeConfig,
    detail.ownerName,
    detail.projectName,
    thread.pullRequestNumber,
    suffix,
  )}${anchor}`;
}

function ProjectReviewListRows(props: {
  detail: ProjectDetailViewModel;
  runtimeConfig: RuntimeConfig;
  threads: ReviewThread[];
}) {
  if (props.threads.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1"></i>
        <p>review.is.empty</p>
      </div>
    );
  }
  return (
    <ul className="post-list-wrap">
      {props.threads.map((thread) => {
        const firstComment = thread.comments[0];
        const authorAvatarLabel = thread.authorLabel || thread.authorLoginId || "issue.noAuthor";
        const replyCount = Math.max(thread.comments.length - 1, 0);
        const threadHref = projectReviewThreadHref(props.runtimeConfig, props.detail, thread);
        return (
          <li className="post-item" key={thread.id}>
            <a
              className="avatar-wrap mlarge hide-in-mobile"
              data-placement="top"
              data-toggle="tooltip"
              href={`${props.runtimeConfig.basePath}/${encodeURIComponent(thread.authorLoginId)}`}
              title={thread.authorLoginId}
            >
              <img alt={authorAvatarLabel} height={32} src={thread.authorAvatarUrl} width={32} />
            </a>
            <div className="title-wrap">
              <span className="post-id">{thread.id}</span>
              <a className="title" href={threadHref}>
                {firstComment?.contentsMarkdown || thread.path || `#${thread.id}`}
              </a>
            </div>
            <div className="infos">
              {thread.authorLoginId && thread.authorLabel ? (
                <a
                  className="infos-item infos-link-item"
                  data-placement="top"
                  data-toggle="tooltip"
                  href={`${props.runtimeConfig.basePath}/${encodeURIComponent(thread.authorLoginId)}`}
                  title={thread.authorLoginId}
                >
                  {thread.authorLabel}
                </a>
              ) : (
                <span className="infos-item">issue.noAuthor</span>
              )}
              <span className="infos-item" title={thread.createdLabel}>
                {thread.createdLabel}
              </span>
              {replyCount > 0 ? (
                <span className="infos-item item-count-groups">
                  <a href={threadHref}>
                    <i className="yobicon-comments"></i> {replyCount}
                  </a>
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProjectReviewPagination(props: {
  detail: ProjectDetailViewModel;
  query: ReviewThreadListQuery;
  reviews: ReviewThreadListResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const pageSize = Math.max(1, props.reviews?.pageSize || 15);
  const pageCount = Math.max(1, Math.ceil(Math.max(0, props.reviews?.totalCount ?? 0) / pageSize));
  const currentPage = Math.min(Math.max(1, props.reviews?.pageNum || 1), pageCount);

  const pageHref = (pageNum: number) =>
    buildProjectHref(
      props.runtimeConfig,
      props.detail.ownerName,
      props.detail.projectName,
      `reviews?${reviewListFilterQueryString(props.query, { pageNum })}`,
    );

  return (
    <LegacyPageNavigation currentPage={currentPage} hrefForPage={pageHref} pageCount={pageCount} />
  );
}

export function ProjectReviewsPage(props: {
  detail: ProjectDetailViewModel | null;
  query: ReviewThreadListQuery;
  reviews: ReviewThreadListResponse | undefined;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const state = props.query.state === "closed" ? "closed" : "open";
  const queryAuthorId = props.query.authorId ?? 0;
  const queryParticipantId = props.query.participantId ?? 0;
  const viewerId = props.viewerId ?? 0;
  const currentOrderDir = props.query.orderDir === "asc" ? "asc" : "desc";
  const nextOrderDir = currentOrderDir === "asc" ? "desc" : "asc";
  const reviewsHref = (query: string) =>
    buildProjectHref(props.runtimeConfig, detail.ownerName, detail.projectName, `reviews?${query}`);
  return (
    <main className="app-shell pull-request-page">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
        <div className="row-fluid issue-list-wrap">
          <div className="span2 search-wrap span-hard-wrap">
            <div className="inner advanced">
              <ul className="lst-stacked unstyled">
                <li className={queryAuthorId === 0 && queryParticipantId === 0 ? "active" : undefined}>
                  <a
                    data-toggle="filter"
                    href={reviewsHref(
                      reviewListFilterQueryString(props.query, {
                        authorId: 0,
                        participantId: 0,
                      }),
                    )}
                  >
                    review.allReview
                    <span className="num-badge pull-right">{props.reviews?.allCount ?? 0}</span>
                  </a>
                </li>
                <li className={viewerId !== 0 && queryParticipantId === viewerId ? "active" : undefined}>
                  <a
                    data-toggle="filter"
                    data-type="participantId"
                    data-value={viewerId || ""}
                    href={reviewsHref(
                      reviewListFilterQueryString(props.query, {
                        authorId: 0,
                        participantId: viewerId || undefined,
                      }),
                    )}
                  >
                    review.involvingYou
                    <span className="num-badge pull-right">
                      {props.reviews?.participantCount ?? 0}
                    </span>
                  </a>
                </li>
                <li className={viewerId !== 0 && queryAuthorId === viewerId ? "active" : undefined}>
                  <a
                    data-toggle="filter"
                    data-type="authorId"
                    data-value={viewerId || ""}
                    href={reviewsHref(
                      reviewListFilterQueryString(props.query, {
                        authorId: viewerId || undefined,
                        participantId: 0,
                      }),
                    )}
                  >
                    review.createdByYou
                    <span className="num-badge pull-right">{props.reviews?.authorCount ?? 0}</span>
                  </a>
                </li>
              </ul>
              <form
                action={buildProjectHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  "reviews",
                )}
                id="search"
                method="get"
                name="search"
              >
                <input name="authorId" type="hidden" value={props.query.authorId ?? ""} />
                <input name="participantId" type="hidden" value={props.query.participantId ?? ""} />
                <input name="orderDir" type="hidden" value={props.query.orderDir ?? ""} />
                <input name="orderBy" type="hidden" value={props.query.orderBy ?? ""} />
                <input name="state" type="hidden" value={state} />
                <hr className="hide-in-mobile" />
                <div className="search-bar span-hard-wrap">
                  <input
                    className="textbox full"
                    defaultValue={props.query.filter ?? ""}
                    name="filter"
                    type="text"
                  />
                  <button className="search-btn" type="submit">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="span10 span-hard-wrap">
            <div className="pull-right filters">
              <a
                className="filter"
                data-field="createdDate"
                data-toggle="order"
                data-value={nextOrderDir}
                href={reviewsHref(
                  reviewListFilterQueryString(props.query, {
                    orderBy: "createdDate",
                    orderDir: nextOrderDir,
                  }),
                )}
              >
                <i className={`ico btn-gray-arrow ${currentOrderDir === "desc" ? "down" : ""}`}></i>
                common.order.date
              </a>
            </div>
            <ul className="nav nav-tabs nm">
              <li className={state === "open" ? "active" : undefined}>
                <a
                  data-toggle="filter"
                  data-type="state"
                  data-value="open"
                  href={reviewsHref(reviewQueryString(props.query, "open"))}
                >
                  issue.state.open
                  <span className="num-badge">{props.reviews?.openCount ?? 0}</span>
                </a>
              </li>
              <li className={state === "closed" ? "active" : undefined}>
                <a
                  data-toggle="filter"
                  data-type="state"
                  data-value="closed"
                  href={reviewsHref(reviewQueryString(props.query, "closed"))}
                >
                  issue.state.closed
                  <span className="num-badge">{props.reviews?.closedCount ?? 0}</span>
                </a>
              </li>
            </ul>
            <div className="review-list-wrap">
              <ProjectReviewListRows
                detail={detail}
                runtimeConfig={props.runtimeConfig}
                threads={props.reviews?.items ?? []}
              />
            </div>
            <div className="pull-left" style={{ padding: 10 }}>
              <a
                className="ybtn small"
                href={projectReviewExcelExportHref(
                  props.runtimeConfig,
                  detail.ownerName,
                  detail.projectName,
                  props.query,
                  state,
                )}
              >
                <i className="yobicon-file-excel"></i> issue.downloadAsExcel
              </a>
            </div>
            <ProjectReviewPagination
              detail={detail}
              query={props.query}
              reviews={props.reviews}
              runtimeConfig={props.runtimeConfig}
            />
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}

function projectReviewExcelExportHref(
  runtimeConfig: RuntimeConfig,
  ownerName: string,
  projectName: string,
  query: ReviewThreadListQuery,
  state: string,
): string {
  const params = new URLSearchParams();
  params.set("state", state);
  if (query.filter) {
    params.set("filter", query.filter);
  }
  if (query.authorId) {
    params.set("authorId", String(query.authorId));
  }
  if (query.participantId) {
    params.set("participantId", String(query.participantId));
  }
  if (query.orderBy) {
    params.set("orderBy", query.orderBy);
  }
  if (query.orderDir) {
    params.set("orderDir", query.orderDir);
  }
  params.set("format", "xls");
  return `${buildProjectHref(runtimeConfig, ownerName, projectName, "reviews")}?${params.toString()}`;
}
