import * as React from "react";
import type {
  OrganizationPullRequestListQuery,
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
}) {
  const pr = props.pullRequest;
  const viewerReviewed = props.viewerId
    ? pr.reviewers.some((reviewer) => reviewer.userId === props.viewerId)
    : false;
  const canAccept = pr.permissions.canUpdateState && pr.state === "open" && !pr.conflict;
  return (
    <div className="pull-request-actions">
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
          <button
            className="ybtn ybtn-disabled"
            data-placement="top"
            data-toggle="tooltip"
            disabled
            title={pr.conflict ? "pullRequest.is.not.safe" : "pullRequest.merge.disabled"}
            type="button"
          >
            Merge
          </button>
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
  onCommentSubmit?: (contentsMarkdown: string, attachmentIds?: number[]) => Promise<void>;
  onDeleteSourceBranch?: () => Promise<void>;
  onOpen?: () => Promise<void>;
  onReview?: () => Promise<void>;
  onRestoreSourceBranch?: () => Promise<void>;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
  onUnreview?: () => Promise<void>;
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
            <div className="markdown-wrap" dangerouslySetInnerHTML={{ __html: pr.bodyHtml }} />
          </section>
          <ReviewThreadSection
            threads={pr.threads}
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
  threads: ReviewThread[];
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
            key={thread.id}
            thread={thread}
            onThreadClose={props.onThreadClose}
            onThreadOpen={props.onThreadOpen}
          />
        ))
      )}
    </section>
  );
}

function ReviewThreadItem(props: {
  thread: ReviewThread;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  return (
    <article className="review-card comment-thread-wrap" id={`thread-${props.thread.id}`}>
      <header>
        <strong>{props.thread.path || props.thread.commitId || "General review"}</strong>
        <span>{props.thread.startLine ? `:${props.thread.startLine}` : ""}</span>
        <span className={`pullRequest-stateInfo state ${props.thread.state}`}>
          {props.thread.state}
        </span>
      </header>
      <div className="thread-actrow">
        {props.thread.state === "closed" ? (
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
          <div dangerouslySetInnerHTML={{ __html: comment.contentsHtml }} />
        </div>
      ))}
    </article>
  );
}

export function PullRequestChangesPage(props: {
  changes: PullRequestChangesResponse | undefined;
  detail: ProjectDetailViewModel | null;
  runtimeConfig: RuntimeConfig;
  onThreadClose?: (threadId: number) => Promise<void>;
  onThreadOpen?: (threadId: number) => Promise<void>;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const pr = props.changes?.pullRequest;
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
        {props.changes?.commits.length ? (
          <ul className="unstyled">
            {props.changes.commits.map((commit) => (
              <li key={commit.commitId}>
                <span>{commit.commitShortId || commit.commitId}</span>
                <span>{` ${commit.commitMessage}`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="warning-none">No commit metadata is available.</div>
        )}
        {props.changes?.files.length ? (
          props.changes.files.map((file) => (
            <pre key={file.path}>
              <code>{file.patch || file.path}</code>
            </pre>
          ))
        ) : (
          <div className="warning-none">No changed file diff is available.</div>
        )}
        {(props.changes?.threads ?? []).map((thread) => (
          <ReviewThreadItem
            key={thread.id}
            thread={thread}
            onThreadClose={props.onThreadClose}
            onThreadOpen={props.onThreadOpen}
          />
        ))}
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
    </main>
  );
}
