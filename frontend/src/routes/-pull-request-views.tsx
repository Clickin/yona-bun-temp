import type {
  PullRequestChangesResponse,
  PullRequestDetailResponse,
  PullRequestListCategory,
  PullRequestListQuery,
  PullRequestListResponse,
  ReviewThread,
  ReviewThreadListQuery,
  ReviewThreadListResponse,
} from "../api/pull-requests";
import type { RuntimeConfig } from "../runtime-config";
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
              href={organizationCategoryHref(
                props.runtimeConfig,
                detail.organizationName,
                tab.category,
              )}
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
          <input name="filter" placeholder="Search" />
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

function PullRequestActionBar(props: {
  pullRequest: PullRequestDetailResponse;
  runtimeConfig: RuntimeConfig;
}) {
  const pr = props.pullRequest;
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
    </div>
  );
}

export function ProjectPullRequestDetailPage(props: {
  detail: ProjectDetailViewModel | null;
  pullRequest: PullRequestDetailResponse | undefined;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? fallbackProjectDetail();
  const pr = props.pullRequest;

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
            <PullRequestActionBar pullRequest={pr} runtimeConfig={props.runtimeConfig} />
          </section>
          <section className="board-body">
            <div className="markdown-wrap" dangerouslySetInnerHTML={{ __html: pr.bodyHtml }} />
          </section>
          <ReviewThreadSection threads={pr.threads} />
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

function ReviewThreadSection(props: { threads: ReviewThread[] }) {
  return (
    <section className="review-list-wrap">
      <h2>Reviews</h2>
      {props.threads.length === 0 ? (
        <div className="warning-none">review.is.empty</div>
      ) : (
        props.threads.map((thread) => <ReviewThreadItem key={thread.id} thread={thread} />)
      )}
    </section>
  );
}

function ReviewThreadItem(props: { thread: ReviewThread }) {
  return (
    <article className="review-card" id={`thread-${props.thread.id}`}>
      <header>
        <strong>{props.thread.path || props.thread.commitId || "General review"}</strong>
        <span>{props.thread.startLine ? `:${props.thread.startLine}` : ""}</span>
        <span className={`pullRequest-stateInfo state ${props.thread.state}`}>
          {props.thread.state}
        </span>
      </header>
      {props.thread.comments.map((comment) => (
        <div className="review-comment" key={comment.id}>
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
          <ReviewThreadItem key={thread.id} thread={thread} />
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
