import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, type MouseEvent } from "react";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import {
  projectReviewsQueryOptions,
  type ReviewThread,
  type ReviewThreadListResponse,
} from "../../../api/pull-requests";
import type { ProjectContainer } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import { SitePagination } from "../../sites/-pagination";
import { ProjectHeader, ProjectMenu } from "../$projectName";

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
  validateSearch(search): ProjectReviewsSearch {
    return {
      authorId: Number(search.authorId) || 0,
      filter: typeof search.filter === "string" ? search.filter : "",
      orderBy: typeof search.orderBy === "string" ? search.orderBy : "",
      orderDir: typeof search.orderDir === "string" ? search.orderDir : "",
      pageNum: Number(search.pageNum) || 1,
      participantId: Number(search.participantId) || 0,
      state: typeof search.state === "string" ? search.state : "open",
    };
  },
});

function ProjectReviewsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectReviewsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectReviewsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery(
    readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const reviewsQuery = useQuery(
    projectReviewsQueryOptions(runtimeConfig, {
      authorId: search.authorId,
      filter: search.filter,
      orderBy: search.orderBy,
      orderDir: search.orderDir,
      ownerName,
      pageNum: search.pageNum,
      participantId: search.participantId,
      projectName,
      state: search.state,
    }),
  );

  if (!projectQuery.data || !reviewsQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu active="review" basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectReviewsBody
        project={projectQuery.data}
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
  const currentUserId =
    numberField(project.viewerUserId) || numberField(project.currentUserId) || 1;
  const activeState = search.state || reviews.state || "open";

  function pushReviews(next: Partial<ProjectReviewsSearch>) {
    router.history.push(
      prefixBasePath(runtimeConfig.basePath, `${baseRoute}${reviewsQuery(search, next)}`),
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
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="row-fluid issue-list-wrap">
          <div className="span2 search-wrap span-hard-wrap">
            <div className="inner advanced">
              <ul className="lst-stacked unstyled">
                <li className={search.participantId === 0 && search.authorId === 0 ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy filter uses href="#" hooks. */}
                  <a href="#" data-toggle="filter" onClick={(event) => filterClick(event, {})}>
                    {t("review.allReview")}
                    <span className="num-badge pull-right">{reviews.allCount}</span>
                  </a>
                </li>
                <li className={search.participantId === currentUserId ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy filter uses href="#" hooks. */}
                  <a
                    href="#"
                    data-toggle="filter"
                    data-type="participantId"
                    data-value={currentUserId}
                    onClick={(event) => filterClick(event, { participantId: currentUserId })}
                  >
                    {t("review.involvingYou")}
                    <span className="num-badge pull-right">{reviews.participantCount}</span>
                  </a>
                </li>
                <li className={search.authorId === currentUserId ? "active" : ""}>
                  {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy filter uses href="#" hooks. */}
                  <a
                    href="#"
                    data-toggle="filter"
                    data-type="authorId"
                    data-value={currentUserId}
                    onClick={(event) => filterClick(event, { authorId: currentUserId })}
                  >
                    {t("review.createdByYou")}
                    <span className="num-badge pull-right">{reviews.authorCount}</span>
                  </a>
                </li>
              </ul>
              <form id="search" name="search" action={action} method="get" onSubmit={onSubmit}>
                <input type="hidden" name="authorId" value={search.authorId || ""} />
                <input type="hidden" name="participantId" value={search.participantId || ""} />
                <input type="hidden" name="orderDir" value={search.orderDir} />
                <input type="hidden" name="orderBy" value={search.orderBy} />
                <input type="hidden" name="state" value={activeState} />
                <hr className="hide-in-mobile" />
                <div className="search-bar span-hard-wrap">
                  <input
                    name="filter"
                    className="textbox full"
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
            <div className="pull-right filters">
              {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy sort uses href="#" hooks. */}
              <a
                href="#"
                data-field="createdDate"
                data-value={
                  search.orderBy === "createdDate" && search.orderDir === "asc" ? "desc" : "asc"
                }
                className="filter"
                data-toggle="order"
                onClick={(event) => {
                  event.preventDefault();
                  pushReviews({
                    orderBy: "createdDate",
                    orderDir: event.currentTarget.dataset.value || "desc",
                    pageNum: 1,
                  });
                }}
              >
                <i
                  className={`ico btn-gray-arrow ${
                    search.orderBy === "createdDate" && search.orderDir !== "desc" ? "" : "down"
                  }`}
                ></i>
                {t("common.order.date")}
              </a>
            </div>
            <ul className="nav nav-tabs nm">
              <li className={activeState === "open" ? "active" : ""}>
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy state filter uses href="#" hooks. */}
                <a
                  href="#"
                  data-type="state"
                  data-value="open"
                  data-toggle="filter"
                  onClick={(event) => {
                    event.preventDefault();
                    pushReviews({ pageNum: 1, state: "open" });
                  }}
                >
                  {t("issue.state.open")}
                  <span className="num-badge">{reviews.openCount}</span>
                </a>
              </li>
              <li className={activeState === "closed" ? "active" : ""}>
                {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid -- legacy state filter uses href="#" hooks. */}
                <a
                  href="#"
                  data-type="state"
                  data-value="closed"
                  data-toggle="filter"
                  onClick={(event) => {
                    event.preventDefault();
                    pushReviews({ pageNum: 1, state: "closed" });
                  }}
                >
                  {t("issue.state.closed")}
                  <span className="num-badge">{reviews.closedCount}</span>
                </a>
              </li>
            </ul>
            <div className="review-list-wrap">
              <ProjectReviewRows
                basePath={runtimeConfig.basePath}
                ownerName={ownerName}
                projectName={projectName}
                reviews={reviews}
              />
            </div>
            <div className="pull-left" style={{ padding: 10 }}>
              <a
                href={`${action}${reviewsQuery(search, { format: "xls" })}`}
                className="ybtn small"
              >
                <i className="yobicon-file-excel"></i> {t("issue.downloadAsExcel")}
              </a>
            </div>
            <ProjectReviewPagination action={action} reviews={reviews} search={search} />
          </div>
        </div>
      </div>
    </div>
  );

  function filterClick(event: MouseEvent<HTMLAnchorElement>, next: Partial<ProjectReviewsSearch>) {
    event.preventDefault();
    pushReviews({
      authorId: next.authorId ?? 0,
      pageNum: 1,
      participantId: next.participantId ?? 0,
    });
  }
}

function ProjectReviewRows({
  basePath,
  ownerName,
  projectName,
  reviews,
}: {
  basePath: string;
  ownerName: string;
  projectName: string;
  reviews: ReviewThreadListResponse;
}) {
  const { t } = useLegacyMessages();
  if (reviews.items.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1"></i>
        <p>{t("review.is.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="post-list-wrap">
      {reviews.items.map((thread) => (
        <ProjectReviewRow
          basePath={basePath}
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
  basePath,
  ownerName,
  projectName,
  thread,
}: {
  basePath: string;
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
  const threadHref = reviewThreadHref(basePath, ownerName, projectName, thread);

  return (
    <li className="post-item">
      <a
        href={prefixBasePath(basePath, `/${authorLoginId}`)}
        className="avatar-wrap mlarge hide-in-mobile"
        data-toggle="tooltip"
        data-placement="top"
        title={authorLoginId}
      >
        <img
          src={
            firstComment?.authorAvatarUrl ||
            thread.authorAvatarUrl ||
            "/assets/images/default-avatar-32.png"
          }
          alt={authorLabel}
          width="32"
          height="32"
        />
      </a>
      <div className="title-wrap">
        <span className="post-id">{thread.id}</span>
        <a href={threadHref} className="title">
          {contents}
        </a>
      </div>
      <div className="infos">
        {authorLabel ? (
          <a
            href={prefixBasePath(basePath, `/${authorLoginId}`)}
            className="infos-item infos-link-item"
            data-toggle="tooltip"
            data-placement="top"
            title={authorLoginId}
          >
            {authorLabel}
          </a>
        ) : (
          <span className="infos-item">{t("issue.noAuthor")}</span>
        )}
        <span className="infos-item" title={thread.createdLabel}>
          {thread.createdLabel}
        </span>
        {commentCount > 0 ? (
          <span className="infos-item item-count-groups">
            <a href={threadHref} className="comments-count">
              <span className="count-groups item-icon">
                <i className="yobicon-comment2"></i>
              </span>
              <span className="count-groups item-count">{commentCount}</span>
            </a>
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ProjectReviewPagination({
  action,
  reviews,
  search,
}: {
  action: string;
  reviews: ReviewThreadListResponse;
  search: ProjectReviewsSearch;
}) {
  const pages = Math.ceil(reviews.totalCount / Math.max(reviews.pageSize, 1));
  if (pages <= 1) {
    return <div id="pagination"></div>;
  }
  return (
    <SitePagination
      currentPage={reviews.pageNum}
      pageHref={(pageNum) => `${action}${reviewsQuery(search, { pageNum })}`}
      totalPages={pages}
    />
  );
}

function reviewThreadHref(
  basePath: string,
  ownerName: string,
  projectName: string,
  thread: ReviewThread,
) {
  if (thread.pullRequestNumber) {
    return prefixBasePath(
      basePath,
      `/${ownerName}/${projectName}/pullRequest/${thread.pullRequestNumber}/changes#thread-${thread.id}`,
    );
  }
  return prefixBasePath(
    basePath,
    `/${ownerName}/${projectName}/commit/${thread.commitId}#thread-${thread.id}`,
  );
}

function reviewsQuery(
  search: ProjectReviewsSearch,
  next: Partial<ProjectReviewsSearch> & { format?: string },
) {
  const merged = { ...search, ...next };
  const query = new URLSearchParams();
  if (merged.authorId) query.set("authorId", String(merged.authorId));
  if (merged.participantId) query.set("participantId", String(merged.participantId));
  if (merged.orderDir) query.set("orderDir", merged.orderDir);
  if (merged.orderBy) query.set("orderBy", merged.orderBy);
  if (merged.state) query.set("state", merged.state);
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
