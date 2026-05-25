import * as React from "react";
import type {
  OrganizationPullRequestListQuery,
  PullRequestChangedFile,
  PullRequestChangesResponse,
  PullRequestDetailResponse,
  PullRequestFormOptionsResponse,
  PullRequestListCategory,
  PullRequestListQuery,
  PullRequestListResponse,
  ReviewThread,
  ReviewThreadListQuery,
  ReviewThreadListResponse,
} from "../api/pull-requests";
import type { RuntimeConfig } from "../runtime-config";
import { MarkdownAttachmentTextarea } from "./-markdown-attachment-textarea";
import { MarkdownRenderer } from "./-markdown-renderer";
import { buildOrganizationHref, OrganizationMenu } from "./-organization-views";
import { buildProjectHref, ProjectMenu } from "./-project-views";
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

function pullRequestQueryString(query: PullRequestListQuery, category: PullRequestListCategory) {
  const search = new URLSearchParams();
  if (query.filter) {
    search.set("filter", query.filter);
  }
  if (category !== "sent" && query.contributorId) {
    search.set("contributorId", String(query.contributorId));
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

function organizationPullRequestQueryString(query: OrganizationPullRequestListQuery) {
  const search = new URLSearchParams();
  if (query.filter) {
    search.set("filter", query.filter);
  }
  if (query.pageNum && query.pageNum > 1) {
    search.set("pageNum", String(query.pageNum));
  }
  return search.toString();
}

function PullRequestTabs(props: {
  active: PullRequestListCategory | string;
  detail: ProjectDetailViewModel;
  query: PullRequestListQuery;
  runtimeConfig: RuntimeConfig;
}) {
  const tabs: Array<{ category: PullRequestListCategory; label: string }> = [
    { category: "open", label: "Open" },
    { category: "closed", label: "Closed" },
  ];
  if (props.detail.isForked) {
    tabs.push({ category: "sent", label: "Sent" });
  }
  return (
    <ul className="pullrequeset-tab-menu nav-tabs">
      {tabs.map((tab) => (
        <li className={props.active === tab.category ? "active" : undefined} key={tab.category}>
          <a
            href={[
              projectCategoryHref(props.runtimeConfig, props.detail, tab.category),
              pullRequestQueryString(props.query, tab.category),
            ]
              .filter(Boolean)
              .join("?")}
          >
            {tab.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function PullRequestListRows(props: {
  items: PullRequestListResponse["items"];
  runtimeConfig: RuntimeConfig;
}) {
  if (props.items.length === 0) {
    return <div className="warning-none">pullRequest.is.empty</div>;
  }

  return (
    <ul className="post-list-wrap unstyled">
      {props.items.map((item) => (
        <li className="post-list-item" key={`${item.ownerName}/${item.projectName}/${item.id}`}>
          <div className="post-item title">
            <a
              href={prHref(
                props.runtimeConfig,
                item.ownerName,
                item.projectName,
                item.pullRequestNumber,
              )}
            >
              {item.title}
            </a>
            <span className={`pullRequest-stateInfo state ${item.state}`}>
              {item.conflict ? "Conflict" : item.state}
            </span>
          </div>
          <div className="pullRequest-branchInfo">
            <span>{`${item.fromOwnerName}/${item.fromProjectName}:${item.fromBranch}`}</span>
            <span>{` -> ${item.ownerName}/${item.projectName}:${item.toBranch}`}</span>
          </div>
          <div className="infos">
            <span>{`#${item.pullRequestNumber}`}</span>
            <span>{`Contributor: ${item.contributorLabel || item.contributorLoginId || "Unknown"}`}</span>
            <span>{`Reviewer: ${item.receiverLabel || item.receiverLoginId || "none"}`}</span>
            <span>{`Reviewers: ${item.reviewerCount}`}</span>
            <span>{`Threads: ${item.commentThreadCount}`}</span>
            <span>{item.updatedLabel || item.createdLabel}</span>
          </div>
        </li>
      ))}
    </ul>
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
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Pull Requests</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="board-header issue">
        <PullRequestTabs
          active={props.category}
          detail={detail}
          query={props.query}
          runtimeConfig={props.runtimeConfig}
        />
        <a
          className="ybtn ybtn-success"
          href={buildProjectHref(
            props.runtimeConfig,
            detail.ownerName,
            detail.projectName,
            "newPullRequestForm",
          )}
        >
          New Pull Request
        </a>
      </div>
      <div className="board-body">
        <form action={projectCategoryHref(props.runtimeConfig, detail, props.category)}>
          <input defaultValue={props.query.filter ?? ""} name="filter" placeholder="Search" />
          {props.category !== "sent" && props.query.contributorId ? (
            <input name="contributorId" type="hidden" value={props.query.contributorId} />
          ) : null}
          <button className="ybtn" type="submit">
            Search
          </button>
        </form>
        <p>{`Total ${list?.totalCount ?? 0}`}</p>
        <PullRequestListRows items={list?.items ?? []} runtimeConfig={props.runtimeConfig} />
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
    { category: "open", label: "Open" },
    { category: "closed", label: "Closed" },
  ];

  return (
    <main className="app-shell pull-request-page">
      <p className="eyebrow">Yona Rust Organization</p>
      <h1>Pull Requests</h1>
      <p>{detail.organizationName}</p>
      <OrganizationMenu active="pullrequests" detail={detail} runtimeConfig={props.runtimeConfig} />
      <ul className="pullrequeset-tab-menu nav-tabs">
        {tabs.map((tab) => (
          <li className={props.category === tab.category ? "active" : undefined} key={tab.category}>
            <a
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
            </a>
          </li>
        ))}
      </ul>
      <div className="board-body">
        <form
          action={organizationCategoryHref(
            props.runtimeConfig,
            detail.organizationName,
            props.category,
          )}
        >
          <input defaultValue={props.query.filter ?? ""} name="filter" placeholder="Search" />
          <button className="ybtn" type="submit">
            Search
          </button>
        </form>
        <p>{`Total ${props.list?.totalCount ?? 0}`}</p>
        <PullRequestListRows items={props.list?.items ?? []} runtimeConfig={props.runtimeConfig} />
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

  const formTitle = editMode ? "Edit Pull Request" : "New Pull Request";
  const backHref = buildProjectHref(
    props.runtimeConfig,
    detail.ownerName,
    detail.projectName,
    editMode && initialPullRequest
      ? `pullRequest/${initialPullRequest.pullRequestNumber}`
      : "pullRequests",
  );

  return (
    <main className="app-shell pull-request-page page-wrap-outer">
      <div className="project-page-wrap">
        <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
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
                  From project
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
                  From branch
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
                  To project
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
                  To branch
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
                Title
                <input
                  id="pullRequestState"
                  name="title"
                  onChange={(event) => setTitle(event.currentTarget.value)}
                  required
                  value={title}
                />
              </label>
              <label htmlFor="status">
                Description
                <MarkdownAttachmentTextarea
                  className="content-body"
                  csrfToken={props.csrfToken}
                  id="status"
                  name="bodyMarkdown"
                  onAttachmentUpload={(attachment) =>
                    setAttachmentIds((current) => [...current, attachment.id])
                  }
                  onChange={setBodyMarkdown}
                  required
                  runtimeConfig={props.runtimeConfig}
                  value={bodyMarkdown}
                />
              </label>
              <div id="__commits">
                <span className="num-badge">{initialPullRequest?.commits.length ?? 0}</span>
                <span> commits</span>
              </div>
              <div className="actions">
                <button className="ybtn ybtn-success" disabled={submitting} type="submit">
                  {editMode ? "Save" : "Create"}
                </button>
                <a className="ybtn" href={backHref}>
                  Cancel
                </a>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function PullRequestActionBar(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
  onAccept?: () => Promise<void>;
  onClose?: () => Promise<void>;
  onOpen?: () => Promise<void>;
  onReview?: () => Promise<void>;
  onUnreview?: () => Promise<void>;
  onWatchToggle?: () => Promise<void>;
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
    <div className="pull-request-actions">
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
          Edit
        </a>
      ) : null}
      {pr.permissions.canReadChanges ? (
        <a
          className="ybtn"
          href={prHref(
            props.runtimeConfig,
            pr.ownerName,
            pr.projectName,
            pr.pullRequestNumber,
            "changes",
          )}
        >
          Changes
        </a>
      ) : null}
      {pr.permissions.canUpdateState && pr.state === "open" ? (
        <button className="ybtn" onClick={() => void props.onClose?.()} type="button">
          Close
        </button>
      ) : null}
      {pr.permissions.canUpdateState && pr.state === "closed" ? (
        <button className="ybtn" onClick={() => void props.onOpen?.()} type="button">
          Reopen
        </button>
      ) : null}
      {pr.permissions.canReview ? (
        viewerReviewed ? (
          <button className="ybtn" onClick={() => void props.onUnreview?.()} type="button">
            Unreview
          </button>
        ) : (
          <button className="ybtn" onClick={() => void props.onReview?.()} type="button">
            Review
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
            Merge
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
              Merge
            </button>
            {pr.conflict ? (
              <p className="merge-conflict-help">pullRequest.conflict.manualResolve</p>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

function PullRequestSourceBranchActions(props: {
  onDeleteSourceBranch?: () => Promise<void>;
  onRestoreSourceBranch?: () => Promise<void>;
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const pr = props.pullRequest;
  if (
    pr.state !== "merged" ||
    (!pr.permissions.canDeleteSourceBranch && !pr.permissions.canRestoreSourceBranch)
  ) {
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
      <code>{pr.fromBranch}</code>{" "}
      {pr.permissions.canDeleteSourceBranch
        ? "pullRequest.delete.frombranch.message"
        : "pullRequest.restore.frombranch.message"}
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

export function ProjectPullRequestDetailPage(props: {
  csrfToken?: string;
  detail: ProjectDetailViewModel | null;
  pullRequest: PullRequestDetailResponse | undefined;
  runtimeConfig: RuntimeConfig;
  viewerId?: number;
  onAccept?: () => Promise<void>;
  onClose?: () => Promise<void>;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
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
  const [commentDraft, setCommentDraft] = React.useState("");
  const [commentAttachmentIds, setCommentAttachmentIds] = React.useState<number[]>([]);

  return (
    <main className="app-shell pull-request-page">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{pr?.title ?? "Pull Request"}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      {pr ? (
        <>
          <section className="board-header issue">
            <div className={`pullRequest-stateInfo state ${pr.conflict ? "conflict" : pr.state}`}>
              {pr.conflict ? "Conflict" : pr.state}
            </div>
            <div className="pullRequest-branchInfo">
              <span>{`${pr.fromOwnerName}/${pr.fromProjectName}:${pr.fromBranch}`}</span>
              <span>{` -> ${pr.ownerName}/${pr.projectName}:${pr.toBranch}`}</span>
            </div>
            <div className="infos">
              <span>{`#${pr.pullRequestNumber}`}</span>
              <span>{`Contributor: ${pr.contributor.userLabel || pr.contributor.loginId || "Unknown"}`}</span>
              <span>{`Reviewer: ${pr.receiver.userLabel || pr.receiver.loginId || "none"}`}</span>
              <span>{`Watchers: ${pr.watcherCount}`}</span>
              <span>{pr.updatedLabel || pr.createdLabel}</span>
            </div>
            <PullRequestActionBar
              pullRequest={pr}
              runtimeConfig={props.runtimeConfig}
              viewerId={props.viewerId}
              onClose={props.onClose}
              onAccept={props.onAccept}
              onOpen={props.onOpen}
              onReview={props.onReview}
              onUnreview={props.onUnreview}
              onWatchToggle={props.onWatchToggle}
            />
          </section>
          <PullRequestSourceBranchActions
            pullRequest={pr}
            runtimeConfig={props.runtimeConfig}
            onDeleteSourceBranch={props.onDeleteSourceBranch}
            onRestoreSourceBranch={props.onRestoreSourceBranch}
          />
          <section id="reviewers" className="review-list-wrap">
            <h2>Reviewers</h2>
            <p className={`reviewer-status ${pr.reviewed ? "reviewed" : "lacking"}`}>
              {`pullRequest.review.required ${pr.reviewers.length}/${pr.requiredReviewerCount}`}
              {pr.reviewed
                ? " pullRequest.review.complete"
                : ` pullRequest.review.lacking ${pr.lackingReviewerCount}`}
            </p>
            {pr.reviewers.length === 0 ? (
              <div className="warning-none">pullRequest.reviewers.empty</div>
            ) : (
              <ul className="unstyled">
                {pr.reviewers.map((reviewer) => (
                  <li key={reviewer.userId}>{reviewer.userLabel || reviewer.loginId}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="board-body">
            <MarkdownRenderer
              className="markdown-wrap"
              basePath={props.runtimeConfig.basePath}
              commitReferences={pullRequestMarkdownCommitReferences(pr)}
              issueReferences={pr.issueReferences}
              markdown={pr.bodyMarkdown}
              ownerName={pr.ownerName}
              projectName={pr.projectName}
            />
          </section>
          <ReviewThreadSection
            csrfToken={props.csrfToken}
            pullRequest={pr}
            runtimeConfig={props.runtimeConfig}
            threads={pr.threads}
            onCommentDelete={props.onCommentDelete}
            onCommentUpdate={props.onCommentUpdate}
            onThreadClose={props.onThreadClose}
            onThreadOpen={props.onThreadOpen}
          />
          <section className="board-comment-wrap">
            <h2 id="comments">{`Comments ${pr.threads.reduce(
              (count, thread) => count + thread.comments.length,
              0,
            )}`}</h2>
            {pr.permissions.canComment ? (
              <form
                className="review-form board-comment-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const contents = commentDraft.trim();
                  if (!contents) {
                    return;
                  }
                  void props.onCommentSubmit?.(contents, commentAttachmentIds).then(() => {
                    setCommentAttachmentIds([]);
                    setCommentDraft("");
                  });
                }}
              >
                <MarkdownAttachmentTextarea
                  csrfToken={props.csrfToken}
                  name="contentsMarkdown"
                  onAttachmentUpload={(attachment) =>
                    setCommentAttachmentIds((current) => [...current, attachment.id])
                  }
                  onChange={setCommentDraft}
                  runtimeConfig={props.runtimeConfig}
                  value={commentDraft}
                />
                <button className="ybtn ybtn-success" type="submit">
                  Comment
                </button>
              </form>
            ) : null}
          </section>
          <section className="review-list-wrap">
            <h2>Events</h2>
            {pr.events.length === 0 ? (
              <div className="warning-none">No pull request event.</div>
            ) : (
              <ul className="unstyled">
                {pr.events.map((event) => (
                  <li key={event.id}>
                    <span>{event.eventType}</span>
                    <span>{` ${event.senderLoginId}`}</span>
                    <span>{` ${event.createdLabel}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="warning-none">Loading&hellip;</div>
      )}
    </main>
  );
}

function ReviewThreadSection(props: {
  csrfToken?: string;
  pullRequest?: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
  threads: ReviewThread[];
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  return (
    <section className="review-list-wrap">
      <h2>Reviews</h2>
      {props.threads.length === 0 ? (
        <div className="warning-none">review.is.empty</div>
      ) : (
        props.threads.map((thread) => (
          <ReviewThreadItem
            csrfToken={props.csrfToken}
            key={thread.id}
            pullRequest={props.pullRequest}
            runtimeConfig={props.runtimeConfig}
            thread={thread}
            onCommentDelete={props.onCommentDelete}
            onCommentUpdate={props.onCommentUpdate}
            onThreadClose={props.onThreadClose}
            onThreadOpen={props.onThreadOpen}
          />
        ))
      )}
    </section>
  );
}

function ReviewThreadItem(props: {
  csrfToken?: string;
  pullRequest?: PullRequestDetailResponse;
  runtimeConfig?: RuntimeConfig;
  thread: ReviewThread;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editAttachmentIds, setEditAttachmentIds] = React.useState<number[]>([]);
  const threadState = reviewThreadStateClass(props.thread);
  const isCodeThread = props.thread.path.trim() !== "";
  const isOutdated = isOutdatedReviewThread(props.thread, props.pullRequest);

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

  return (
    <article
      className={`review-card comment-thread-wrap ${threadState}${threadState === "closed" && isCodeThread ? " fold" : ""}${isOutdated ? " outdated" : ""}`}
      data-range-endline={props.thread.endLine}
      data-range-endside={props.thread.endSide}
      data-range-path={isCodeThread ? props.thread.path : undefined}
      data-range-startline={props.thread.startLine}
      data-range-startside={props.thread.startSide}
      data-state={threadState}
      data-toggle={isCodeThread ? "CodeCommentThread" : undefined}
      id={`thread-${props.thread.id}`}
    >
      <header>
        <strong>{props.thread.path || props.thread.commitId || "General review"}</strong>
        <span>{props.thread.startLine ? `:${props.thread.startLine}` : ""}</span>
        <span className={`badge pullRequest-stateInfo state ${threadState}`}>{threadState}</span>
        {isOutdated ? <span className="outdated-label">review.outdated</span> : null}
      </header>
      <div className="thread-actrow">
        {threadState === "closed" ? (
          <button
            className="ybtn"
            onClick={() => void props.onThreadOpen?.(props.thread.id)}
            type="button"
          >
            Open thread
          </button>
        ) : (
          <button
            className="ybtn"
            onClick={() => void props.onThreadClose?.(props.thread.id)}
            type="button"
          >
            Close thread
          </button>
        )}
      </div>
      {props.thread.comments.map((comment) => (
        <div className="review-comment board-comment" id={`comment-${comment.id}`} key={comment.id}>
          <p>{`${comment.authorLabel || comment.authorLoginId || "Unknown"} ${comment.createdLabel}`}</p>
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
                  Edit
                </button>
              ) : null}
              <button
                className="btn-transparent pull-right close"
                data-request-method="delete"
                data-request-uri={pullRequestApiHref(
                  props.runtimeConfig,
                  props.pullRequest,
                  `/comments/${comment.id}`,
                )}
                onClick={() => void props.onCommentDelete?.(comment.id)}
                type="button"
              >
                Delete
              </button>
            </span>
          ) : null}
          {editingCommentId === comment.id && props.pullRequest && props.runtimeConfig ? (
            <form
              action={pullRequestApiHref(
                props.runtimeConfig,
                props.pullRequest,
                `/comments/${comment.id}`,
              )}
              className="review-form review-comment-edit-form"
              method="post"
              onSubmit={(event) => void submitEdit(event)}
            >
              <input name="_method" type="hidden" value="patch" />
              <MarkdownAttachmentTextarea
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
              basePath={props.runtimeConfig?.basePath}
              commitReferences={
                props.pullRequest ? pullRequestMarkdownCommitReferences(props.pullRequest) : []
              }
              data-via-email={comment.viaEmail ? "true" : undefined}
              issueReferences={comment.issueReferences}
              markdown={comment.contentsMarkdown}
              ownerName={props.pullRequest?.ownerName}
              projectName={props.pullRequest?.projectName}
            />
          )}
        </div>
      ))}
    </article>
  );
}

function ReviewThreadCards(props: {
  pullRequest?: PullRequestDetailResponse;
  threads: ReviewThread[];
}) {
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
        <ul className="nav nav-tabs">
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
            {openThreads.length === 0 ? (
              <div className="warning-none">review.is.empty</div>
            ) : (
              openThreads.map((thread) => (
                <ReviewThreadCard key={thread.id} pullRequest={props.pullRequest} thread={thread} />
              ))
            )}
          </div>
          <div className="tab-pane" id="reviewcards-closed">
            {closedThreads.length === 0 ? (
              <div className="warning-none">review.is.empty</div>
            ) : (
              closedThreads.map((thread) => (
                <ReviewThreadCard key={thread.id} pullRequest={props.pullRequest} thread={thread} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewThreadCard(props: {
  pullRequest?: PullRequestDetailResponse;
  thread: ReviewThread;
}) {
  const threadState = reviewThreadStateClass(props.thread);
  const isOutdated = isOutdatedReviewThread(props.thread, props.pullRequest);
  const replyCount = Math.max(props.thread.comments.length - 1, 0);
  const firstComment = props.thread.comments[0];
  return (
    <a
      className={`review-card ${threadState}${isOutdated ? " outdated" : ""}`}
      href={`#thread-${props.thread.id}`}
    >
      <p className="content">{firstComment?.contentsMarkdown ?? ""}</p>
      <p className="info">
        {replyCount > 0 ? (
          <span className="comments pull-left">
            <i className="yobicon-comments"></i> {replyCount}
          </span>
        ) : null}
        {isOutdated ? <span className="outdated-label">review.outdated</span> : null}
        <span className="date" title={props.thread.createdLabel}>
          {props.thread.createdLabel}
        </span>
        <span className="avatar-wrap smaller ml5">
          {props.thread.authorLabel || props.thread.authorLoginId}
        </span>
      </p>
    </a>
  );
}

function SelectedPullRequestCommitInfo(props: { commit: PullRequestCommitViewModel }) {
  const authorLabel = props.commit.authorEmail || "Anonymous";
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

export function PullRequestChangesPage(props: {
  csrfToken?: string;
  changes: PullRequestChangesResponse | undefined;
  detail: ProjectDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
  selectedCommitId?: string;
  onCommentDelete?: (commentId: number) => Promise<void>;
  onCommentUpdate?: (
    commentId: number,
    contentsMarkdown: string,
    attachmentIds?: number[],
  ) => Promise<void>;
  onInlineCommentSubmit?: (input: PullRequestInlineCommentSubmitInput) => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const pr = props.changes?.pullRequest;
  const files = props.changes?.files ?? [];
  const threads = props.changes?.threads ?? [];
  const commits = props.changes?.commits ?? [];
  const selectedCommit = props.selectedCommitId
    ? [...commits, ...(pr?.commits ?? [])].find(
        (commit) => commit.commitId === props.selectedCommitId,
      )
    : undefined;
  const selectableCommits = commits.filter(isSelectablePullRequestCommit);
  const [inlineDraft, setInlineDraft] = React.useState<InlineReviewDraft | null>(null);
  const [inlineCommentText, setInlineCommentText] = React.useState("");
  const [inlineAttachmentIds, setInlineAttachmentIds] = React.useState<number[]>([]);
  const canComment = pr?.permissions.canComment === true;

  function inlineThreadsForLine(path: string, line: number, side: "A" | "B") {
    return threads.filter(
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
    setInlineDraft(selectedDraft);
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

  function renderReviewThread(thread: ReviewThread) {
    return (
      <ReviewThreadItem
        key={thread.id}
        pullRequest={pr}
        runtimeConfig={props.runtimeConfig}
        thread={thread}
        csrfToken={props.csrfToken}
        onCommentDelete={props.onCommentDelete}
        onCommentUpdate={props.onCommentUpdate}
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
                            Comment
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

  const unrangedThreads = threads.filter((thread) => !thread.path);
  return (
    <main className="app-shell pull-request-page">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>{pr?.title ?? "Pull Request Changes"}</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section className="codediff-wrap">
        <h2>Changes</h2>
        <div
          className={`pullRequest-stateInfo state ${pr?.conflict ? "conflict" : (pr?.state ?? "open")}`}
        >
          {pr?.conflict ? "Conflict" : (pr?.state ?? "")}
        </div>
        {threads.length > 0 ? (
          <button className="ybtn ybtn-default btn-show-reviewcards" type="button">
            <i className="yobicon-restore"></i>
          </button>
        ) : null}
        {commits.length ? (
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
                    pullRequest.changes.all <span className="outdated-label">review.outdated</span>
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
        ) : (
          <div className="warning-none">No commit metadata is available.</div>
        )}
        {selectedCommit ? <SelectedPullRequestCommitInfo commit={selectedCommit} /> : null}
        {files.length ? (
          <div className="diffs-wrap">
            <div className="diff-body">{files.map(renderChangedFile)}</div>
          </div>
        ) : (
          <div className="warning-none">No changed file diff is available.</div>
        )}
        <ReviewThreadCards pullRequest={pr} threads={threads} />
        {unrangedThreads.map(renderReviewThread)}
      </section>
    </main>
  );
}

export function ProjectReviewsPage(props: {
  detail: ProjectDetailViewModel | null;
  query: ReviewThreadListQuery;
  reviews: ReviewThreadListResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const state = props.query.state === "closed" ? "closed" : "open";
  return (
    <main className="app-shell pull-request-page">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Reviews</h1>
      <p>{`${detail.ownerName}/${detail.projectName}`}</p>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <ul className="review-list-wrap nav-tabs">
        <li className={state === "open" ? "active" : undefined}>
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              `reviews?${reviewQueryString(props.query, "open")}`,
            )}
          >
            Open
          </a>
        </li>
        <li className={state === "closed" ? "active" : undefined}>
          <a
            href={buildProjectHref(
              props.runtimeConfig,
              detail.ownerName,
              detail.projectName,
              `reviews?${reviewQueryString(props.query, "closed")}`,
            )}
          >
            Closed
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
      >
        <input name="state" type="hidden" value={state} />
        {props.query.authorId ? (
          <input name="authorId" type="hidden" value={props.query.authorId} />
        ) : null}
        {props.query.participantId ? (
          <input name="participantId" type="hidden" value={props.query.participantId} />
        ) : null}
        {props.query.orderBy ? (
          <input name="orderBy" type="hidden" value={props.query.orderBy} />
        ) : null}
        {props.query.orderDir ? (
          <input name="orderDir" type="hidden" value={props.query.orderDir} />
        ) : null}
        <input defaultValue={props.query.filter ?? ""} name="filter" placeholder="Search" />
        <button className="ybtn" type="submit">
          Search
        </button>
      </form>
      <p>{`Open ${props.reviews?.openCount ?? 0} / Closed ${props.reviews?.closedCount ?? 0}`}</p>
      {(props.reviews?.items ?? []).length === 0 ? (
        <div className="warning-none">review.is.empty</div>
      ) : (
        <div className="review-list-wrap">
          {(props.reviews?.items ?? []).map((thread) => (
            <ReviewThreadItem key={thread.id} thread={thread} />
          ))}
        </div>
      )}
      <div className="pull-left">
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
          <i className="yobicon-file-excel" /> issue.downloadAsExcel
        </a>
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
