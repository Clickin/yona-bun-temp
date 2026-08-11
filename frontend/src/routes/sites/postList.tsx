import { useQuery } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import { sitePostsQueryOptions, siteUpdateQueryOptions, type SitePost } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type PostListRouteSearch = {
  pageNum?: number;
};

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

const legacyPaginationLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};
const legacyUserLinkSearch = {
  daysAgo: undefined!,
  selected: undefined!,
} satisfies {
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
};
const legacyCurrentSitePostListSidebarSearch = {
  pageNum: -1,
} satisfies PostListRouteSearch;

export const Route = createFileRoute("/sites/postList")({
  component: SitePostListRoute,
  validateSearch: (search: Record<string, unknown>): PostListRouteSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : undefined,
  }),
});

function SitePostListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SitePostListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SitePostListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { pageNum } = Route.useSearch();
  const currentPage = pageNum ?? 1;
  const { t } = useLegacyMessages();
  const query = useQuery(sitePostsQueryOptions(runtimeConfig, { page: currentPage }));
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <title>{t("title.siteSetting")}</title>
      <div data-owner="site-post-list-breadcrumb-outer">
        <div data-owner="site-post-list-breadcrumb-inner">
          <h3 data-owner="site-post-list-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-post-list-page-wrap-outer">
        <div
          className="site-setting-wrap"
          data-owner="site-post-list-setting-wrap"
          data-owner-page="site-post-list-page"
        >
          <div className="row-fluid" data-owner="site-post-list-setting-grid">
            <div className="span2" data-owner="site-post-list-setting-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/postList"
                badgeOwner="site-post-list-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{
                  "/sites/postList": {
                    mask: { to: "/sites/postList" },
                    search: legacyCurrentSitePostListSidebarSearch,
                  },
                }}
                navOwner="site-post-list-sidebar"
                ulClassName="site-setting-nav"
                ownerPrefix="site-post-list-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
              />
            </div>
            <div className="span10" data-owner="site-post-list-setting-content-column">
              <div data-owner="site-post-list-title-strip">
                <h2 data-owner="site-post-list-title-heading">
                  <LegacyMessage messageKey="site.sidebar.postList" />
                </h2>
              </div>
              <ul className="post-list-wrap" data-owner="site-post-list-container">
                {(query.data?.posts ?? []).map((post, index) => (
                  <PostListItem
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    even={index % 2 === 1}
                    post={post}
                  />
                ))}
              </ul>

              <PostListPagination
                currentPage={query.data?.page ?? currentPage}
                totalPages={query.data?.totalPages ?? 0}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PostListPagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div data-owner="site-post-list-pagination" id="pagination">
      <ul data-owner="site-post-list-pagination-list">
        <li data-pagination-variant="icon" data-owner="site-post-list-pagination-item">
          {hasPrev ? (
            <Link
              {...legacyPaginationLinkProps}
              search={{ pageNum: currentPage - 1 }}
              to="/sites/postList"
            >
              <i
                data-owner="site-post-list-pagination-dynamic-sprite"
                style={
                  {
                    "--site-post-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
              <span data-owner="site-post-list-pagination-label">{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i
                data-pagination-state="off"
                data-owner="site-post-list-pagination-dynamic-sprite"
                style={
                  {
                    "--site-post-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
              <span data-pagination-state="off" data-owner="site-post-list-pagination-label">
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li data-owner="site-post-list-pagination-item">
          <input
            data-owner="site-post-list-pagination-input"
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              const inputValue = event.currentTarget.value;
              if (!/^[0-9]+$/.test(inputValue)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const pageNum = Number(inputValue);
              const nextPage = Math.min(Math.max(pageNum, 1), totalPages);
              event.currentTarget.value = String(nextPage);
              void router.navigate({
                search: { pageNum: nextPage },
                to: "/sites/postList",
              });
            }}
            pattern="[0-9]*"
            type="number"
            defaultValue={currentPage}
          />
        </li>
        <li data-pagination-variant="delimiter" data-owner="site-post-list-pagination-item">
          /
        </li>
        <li data-owner="site-post-list-pagination-item">{totalPages}</li>
        <li data-pagination-variant="icon" data-owner="site-post-list-pagination-item">
          {hasNext ? (
            <Link
              {...legacyPaginationLinkProps}
              search={{ pageNum: currentPage + 1 }}
              to="/sites/postList"
            >
              <span data-owner="site-post-list-pagination-label">{t("button.nextPage")}</span>
              <i
                data-owner="site-post-list-pagination-dynamic-sprite"
                style={
                  {
                    "--site-post-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
            </Link>
          ) : (
            <>
              <span data-pagination-state="off" data-owner="site-post-list-pagination-label">
                {t("button.nextPage")}
              </span>
              <i
                data-pagination-state="off"
                data-owner="site-post-list-pagination-dynamic-sprite"
                style={
                  {
                    "--site-post-list-pagination-sprite": `url(${legacySpriteUrl})`,
                  } as CSSProperties
                }
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function PostListItem({ even, post }: { even: boolean; post: SitePost }) {
  const projectLogoUrl = legacyProjectLogoUrl(post.projectLogoUrl);
  const createdTitle = post.createdTitle ?? post.createdLabel;

  return (
    <li className="row-fluid listitem" data-owner="site-post-list-row">
      <Link
        className="avatar-wrap list-avatar"
        data-owner="site-post-list-project-avatar"
        params={{ ownerName: post.ownerName, projectName: post.projectName }}
        to="/$ownerName/$projectName"
      >
        <img
          data-owner="site-post-list-project-avatar-image"
          src={projectLogoUrl}
          alt={post.projectName}
        />
      </Link>
      <div data-owner="site-post-list-info">
        <Link
          data-owner="site-post-list-project-link"
          params={{ ownerName: post.ownerName, projectName: post.projectName }}
          to="/$ownerName/$projectName"
        >
          {post.ownerName}/{post.projectName}
        </Link>
        <span data-owner="site-post-list-separator">·</span>
        <Link
          data-owner="site-post-list-title-link"
          params={{
            ownerName: post.ownerName,
            postNumber: post.postNumber,
            projectName: post.projectName,
          }}
          to="/$ownerName/$projectName/post/$postNumber"
        >
          {post.title}
        </Link>
      </div>
      <div data-owner="site-post-list-metadata">
        <Link
          data-owner="site-post-list-author-avatar"
          params={{ user: post.authorLoginId }}
          search={legacyUserLinkSearch}
          to="/$user"
        >
          {isDefaultAuthorAvatar(post.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img data-owner="site-post-list-author-avatar-image" src={post.authorAvatarUrl} />
          ) : (
            <img
              data-owner="site-post-list-author-avatar-image"
              src={post.authorAvatarUrl}
              alt={post.authorLabel}
              width="16"
              height="16"
            />
          )}
        </Link>
        <Link
          data-owner="site-post-list-metadata-item"
          params={{ user: post.authorLoginId }}
          search={legacyUserLinkSearch}
          to="/$user"
        >
          {post.authorLabel}
        </Link>
        <span data-owner="site-post-list-metadata-item" title={createdTitle}>
          {post.createdLabel}
        </span>
        <span data-owner="site-post-list-metadata-item">
          <Link
            hash="comments"
            params={{
              ownerName: post.ownerName,
              postNumber: post.postNumber,
              projectName: post.projectName,
            }}
            to="/$ownerName/$projectName/post/$postNumber"
          >
            <i data-owner="site-post-list-comments-icon"></i>
            {post.commentCount}
          </Link>
        </span>
      </div>
    </li>
  );
}

function legacyProjectLogoUrl(projectLogoUrl: string) {
  return projectLogoUrl.trim() || "/assets/images/project_default_logo.png";
}

function isDefaultAuthorAvatar(avatarUrl: string) {
  return (
    /^https:\/\/www\.gravatar\.com\/avatar\/[^?]+\?s=16&d=https%3A%2F%2Fko\.gravatar\.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6\.png$/u.test(
      avatarUrl,
    ) || /\/assets\/images\/default-avatar-\d+\.png$/u.test(avatarUrl)
  );
}
