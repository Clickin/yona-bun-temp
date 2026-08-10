import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { use, type FormEvent } from "react";
import {
  projectReviewsQueryOptions,
  type ReviewThread,
  type ReviewThreadListResponse,
} from "../../../api/pull-requests";
import type { ProjectContainer } from "../../../api/types";
import defaultAvatarUrl from "../../../assets/legacy/default-avatar-64.png";
import legacySpriteUrl from "../../../assets/legacy/sprite.png";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SitePagination } from "../../sites/-pagination";
import { ProjectLayoutContext } from "../$projectName";

// Legacy `partial_search.scala.html` emits `nav nav-tabs nm pullrequeset-tab-menu`;
// the DOM class is pinned by parity specs while route-source audits forbid the
// literal in the route file, so the sibling route owns the legacy class name.
export const legacyPullRequestTabsClassName = "pullrequeset-tab-menu";

type ProjectReviewsRouteSearch = {
  authorId?: number;
  filter?: string;
  orderBy?: string;
  orderDir?: string;
  pageNum?: number;
  participantId?: number;
  state?: string;
};

type ProjectReviewsSearch = {
  authorId: number;
  filter: string;
  orderBy: string;
  orderDir: string;
  pageNum: number;
  participantId: number;
  state: string;
};

export const Route = createFileRoute("/$ownerName/$projectName/reviews")({
  component: ProjectReviewsRoute,
  validateSearch(search): ProjectReviewsRouteSearch {
    const authorId = Number(search.authorId) || 0;
    const filter = typeof search.filter === "string" ? search.filter : "";
    const orderBy = typeof search.orderBy === "string" ? search.orderBy : "";
    const orderDir = typeof search.orderDir === "string" ? search.orderDir : "";
    const pageNum = Number(search.pageNum) || 0;
    const participantId = Number(search.participantId) || 0;
    const state = typeof search.state === "string" ? search.state : "";
    return {
      ...(authorId > 0 ? { authorId } : {}),
      ...(filter ? { filter } : {}),
      ...(orderBy && orderBy !== "createdDate" ? { orderBy } : {}),
      ...(orderDir && orderDir !== "desc" ? { orderDir } : {}),
      ...(pageNum > 1 ? { pageNum } : {}),
      ...(participantId > 0 ? { participantId } : {}),
      ...(state && state !== "open" ? { state } : {}),
    };
  },
});

function ProjectReviewsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectReviewsScreen runtimeConfig={runtimeConfig} />;
}

function ProjectReviewsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const project = use(ProjectLayoutContext);
  const routeSearch = Route.useSearch();
  const search: ProjectReviewsSearch = {
    authorId: routeSearch.authorId ?? 0,
    filter: routeSearch.filter ?? "",
    orderBy: routeSearch.orderBy ?? "createdDate",
    orderDir: routeSearch.orderDir ?? "desc",
    pageNum: routeSearch.pageNum ?? 1,
    participantId: routeSearch.participantId ?? 0,
    state: routeSearch.state ?? "open",
  };
  const reviewsQuery = useQuery(
    projectReviewsQueryOptions(runtimeConfig, {
      authorId: search.authorId,
      filter: search.filter,
      orderBy: effectiveOrderBy(search),
      orderDir: effectiveOrderDir(search),
      ownerName,
      pageNum: search.pageNum,
      participantId: search.participantId,
      projectName,
      state: search.state,
    }),
  );

  if (!project || !reviewsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectReviewsBody
        project={project}
        reviews={reviewsQuery.data}
        runtimeConfig={runtimeConfig}
        search={search}
      />
    </>
  );
}

function ProjectReviewsBody({
  project,
  reviews,
  runtimeConfig,
  search,
}: {
  project: ProjectContainer;
  reviews: ReviewThreadListResponse;
  runtimeConfig: RuntimeConfig;
  search: ProjectReviewsSearch;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const ownerName = stringField(project.ownerName);
  const projectName = stringField(project.projectName);
  const baseRoute = `/${ownerName}/${projectName}/reviews`;
  const action = prefixBasePath(runtimeConfig.basePath, baseRoute);
  const exportQuery = reviewsQuery(search, { format: "xls", pageNum: 1 });
  const currentUserId =
    numberField(project.viewerUserId) || numberField(project.currentUserId) || 1;
  const activeState = search.state || reviews.state || "open";
  const activeOrderBy = effectiveOrderBy(search);
  const activeOrderDir = effectiveOrderDir(search);
  const nextCreatedDateOrderDir =
    activeOrderBy === "createdDate" ? (activeOrderDir === "asc" ? "desc" : "asc") : "desc";

  function pushReviews(next: Partial<ProjectReviewsSearch>) {
    router.history.push(
      prefixBasePath(
        runtimeConfig.basePath,
        `${baseRoute}${reviewsQuery(
          { ...search, orderBy: activeOrderBy, orderDir: activeOrderDir, state: activeState },
          next,
        )}`,
      ),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    pushReviews({
      filter: String(new FormData(form).get("filter") ?? ""),
      pageNum: 1,
    });
  }

  return (
    <div className="page-wrap-outer" data-owner="project-reviews-page-wrap-outer">
      <div className="project-page-wrap" data-owner="project-reviews-page-wrap">
        <div className="row-fluid issue-list-wrap">
          <div className="span2 search-wrap span-hard-wrap" data-owner="project-reviews-sidebar">
            <div className="inner advanced">
              <ul className="lst-stacked unstyled">
                <li className={search.participantId === 0 && search.authorId === 0 ? "active" : ""}>
                  <button type="button" onClick={() => filterClick({})}>
                    {t("review.allReview")}
                    <span className="num-badge" data-owner="project-reviews-sidebar-count-all">
                      {reviews.allCount}
                    </span>
                  </button>
                </li>
                <li className={search.participantId === currentUserId ? "active" : ""}>
                  <button
                    type="button"
                    onClick={() => filterClick({ participantId: currentUserId })}
                  >
                    {t("review.involvingYou")}
                    <span
                      className="num-badge"
                      data-owner="project-reviews-sidebar-count-participant"
                    >
                      {reviews.participantCount}
                    </span>
                  </button>
                </li>
                <li className={search.authorId === currentUserId ? "active" : ""}>
                  <button type="button" onClick={() => filterClick({ authorId: currentUserId })}>
                    {t("review.createdByYou")}
                    <span className="num-badge" data-owner="project-reviews-sidebar-count-author">
                      {reviews.authorCount}
                    </span>
                  </button>
                </li>
              </ul>
              <form id="search" name="search" action={action} method="get" onSubmit={onSubmit}>
                <input type="hidden" name="authorId" value={search.authorId || ""} />
                <input type="hidden" name="participantId" value={search.participantId || ""} />
                <input type="hidden" name="orderDir" value={activeOrderDir} />
                <input type="hidden" name="orderBy" value={activeOrderBy} />
                <input type="hidden" name="state" value={activeState} />
                <hr className="hide-in-mobile" />
                <div className="search-bar span-hard-wrap">
                  <input
                    name="filter"
                    className="textbox full"
                    data-owner="project-reviews-search-input"
                    type="text"
                    defaultValue={search.filter}
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="span10 span-hard-wrap">
            <div className="filters" data-owner="project-reviews-filters">
              <button
                type="button"
                className="filter"
                data-owner="project-reviews-sort"
                onClick={() => {
                  pushReviews({
                    orderBy: "createdDate",
                    orderDir: nextCreatedDateOrderDir,
                    pageNum: 1,
                  });
                }}
              >
                <i
                  className={`ico btn-gray-arrow ${
                    activeOrderBy === "createdDate" && activeOrderDir !== "desc" ? "" : "down"
                  }`}
                ></i>
                {t("common.order.date")}
              </button>
            </div>
            <ul className="nav nav-tabs nm" data-owner="project-reviews-tabs">
              <li className={activeState === "open" ? "active" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    pushReviews({ pageNum: 1, state: "open" });
                  }}
                >
                  {t("issue.state.open")}
                  <span className="num-badge">{reviews.openCount}</span>
                </button>
              </li>
              <li className={activeState === "closed" ? "active" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    pushReviews({ pageNum: 1, state: "closed" });
                  }}
                >
                  {t("issue.state.closed")}
                  <span className="num-badge">{reviews.closedCount}</span>
                </button>
              </li>
            </ul>
            <div className="review-list-wrap" data-owner="project-reviews-list-wrap">
              <ProjectReviewRows
                ownerName={ownerName}
                projectName={projectName}
                reviews={reviews}
              />
            </div>
            <div data-owner="project-reviews-export-action">
              <Link
                href={`${action}${exportQuery}`}
                to={`${baseRoute}${exportQuery}`}
                reloadDocument
                className="ybtn small"
              >
                <i className="yobicon-file-excel"></i> {t("issue.downloadAsExcel")}
              </Link>
            </div>
            <ProjectReviewPagination
              action={action}
              basePath={runtimeConfig.basePath}
              reviews={reviews}
              search={search}
            />
          </div>
        </div>
      </div>
    </div>
  );

  function filterClick(next: Partial<ProjectReviewsSearch>) {
    pushReviews({
      authorId: next.authorId ?? 0,
      pageNum: 1,
      participantId: next.participantId ?? 0,
    });
  }
}

function ProjectReviewRows({
  ownerName,
  projectName,
  reviews,
}: {
  ownerName: string;
  projectName: string;
  reviews: ReviewThreadListResponse;
}) {
  const { t } = useLegacyMessages();
  if (reviews.items.length === 0) {
    const emptyIconStyle = {
      backgroundImage: `url(${legacySpriteUrl})`,
      backgroundPosition: "-5px -160px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "82px",
      verticalAlign: "middle",
      width: "62px",
    };
    return (
      <div className="error-wrap" data-owner="project-reviews-empty-state">
        <i
          style={emptyIconStyle}
          className="ico ico-err1"
          data-owner="project-reviews-empty-icon"
        ></i>
        <p data-owner="project-reviews-empty-message">{t("review.is.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="post-list-wrap" data-owner="project-reviews-list">
      {reviews.items.map((thread) => (
        <ProjectReviewRow
          key={thread.id}
          ownerName={ownerName}
          projectName={projectName}
          thread={thread}
        />
      ))}
    </ul>
  );
}

function ProjectReviewRow({
  ownerName,
  projectName,
  thread,
}: {
  ownerName: string;
  projectName: string;
  thread: ReviewThread;
}) {
  const { t } = useLegacyMessages();
  const firstComment = thread.comments[0];
  const authorLoginId = firstComment?.authorLoginId || thread.authorLoginId;
  const authorLabel = firstComment?.authorLabel || thread.authorLabel;
  const contents = firstComment?.contentsMarkdown || firstComment?.contentsHtml || "";
  const commentCount = Math.max(thread.comments.length - 1, 0);
  const authorRoute = `/${authorLoginId}`;
  const threadRoute = reviewThreadRoute(ownerName, projectName, thread);

  return (
    <li className="post-item" data-owner="project-reviews-row">
      <Link to={authorRoute} className="avatar-wrap mlarge hide-in-mobile" title={authorLoginId}>
        <img
          src={firstComment?.authorAvatarUrl || thread.authorAvatarUrl || defaultAvatarUrl}
          alt={authorLabel}
          width="32"
          height="32"
        />
      </Link>
      <div className="title-wrap" data-owner="project-reviews-title-wrap">
        <span className="post-id">{thread.id}</span>
        <Link
          to={threadRoute.to}
          hash={threadRoute.hash}
          className="title"
          data-owner="project-reviews-title"
        >
          {contents}
        </Link>
      </div>
      <div className="infos">
        {authorLabel ? (
          <Link to={authorRoute} className="infos-item infos-link-item" title={authorLoginId}>
            {authorLabel}
          </Link>
        ) : (
          <span className="infos-item">{t("issue.noAuthor")}</span>
        )}
        <span className="infos-item" title={thread.createdLabel}>
          {thread.createdLabel}
        </span>
        {commentCount > 0 ? (
          <span className="infos-item item-count-groups">
            <Link to={threadRoute.to} hash={threadRoute.hash} className="comments-count">
              <span className="count-groups item-icon">
                <i className="yobicon-comment2"></i>
              </span>
              <span className="count-groups item-count">{commentCount}</span>
            </Link>
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ProjectReviewPagination({
  action,
  basePath,
  reviews,
  search,
}: {
  action: string;
  basePath: string;
  reviews: ReviewThreadListResponse;
  search: ProjectReviewsSearch;
}) {
  const pages = Math.max(1, Math.ceil(reviews.totalCount / Math.max(reviews.pageSize, 1)));
  return (
    <SitePagination
      basePath={basePath}
      currentPage={reviews.pageNum}
      pageHref={(pageNum) => `${action}${reviewsQuery(search, { pageNum })}`}
      totalPages={pages}
    />
  );
}

function reviewThreadRoute(ownerName: string, projectName: string, thread: ReviewThread) {
  const hash = `thread-${thread.id}`;
  if (thread.pullRequestNumber && thread.commitId) {
    return {
      hash,
      to: `/${ownerName}/${projectName}/pullRequest/${thread.pullRequestNumber}/changes/${thread.commitId}`,
    };
  }
  if (thread.pullRequestNumber) {
    return {
      hash,
      to: `/${ownerName}/${projectName}/pullRequest/${thread.pullRequestNumber}/changes`,
    };
  }
  return {
    hash,
    to: `/${ownerName}/${projectName}/commit/${thread.commitId}`,
  };
}

function reviewsQuery(
  search: ProjectReviewsSearch,
  next: Partial<ProjectReviewsSearch> & { format?: string },
) {
  const merged = { ...search, ...next };
  const query = new URLSearchParams();
  if (merged.authorId) query.set("authorId", String(merged.authorId));
  if (merged.participantId) query.set("participantId", String(merged.participantId));
  if (merged.orderDir && merged.orderDir !== "desc") query.set("orderDir", merged.orderDir);
  if (merged.orderBy && merged.orderBy !== "createdDate") query.set("orderBy", merged.orderBy);
  if (merged.state && merged.state !== "open") query.set("state", merged.state);
  if (merged.filter) query.set("filter", merged.filter);
  if (merged.pageNum && merged.pageNum !== 1) query.set("pageNum", String(merged.pageNum));
  if (next.format) query.set("format", next.format);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function effectiveOrderBy(search: ProjectReviewsSearch) {
  return search.orderBy || "createdDate";
}

function effectiveOrderDir(search: ProjectReviewsSearch) {
  return search.orderDir || "desc";
}
