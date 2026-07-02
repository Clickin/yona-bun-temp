import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
import { sitePostsQueryOptions, siteUpdateQueryOptions, type SitePost } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type PostListSearch = {
  pageNum: number;
};

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    children?: ReactNode;
    search?: Record<string, number | string | undefined>;
    to: string;
  }
>;

export const Route = createFileRoute("/sites/postList")({
  component: SitePostListRoute,
  validateSearch: (search: Record<string, unknown>): PostListSearch => ({
    pageNum: search.pageNum ? Number(search.pageNum) || 1 : 1,
  }),
});

function SitePostListRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SitePostListScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SitePostListScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { pageNum } = Route.useSearch();
  const query = useQuery(sitePostsQueryOptions(runtimeConfig, { page: pageNum }));
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <div className="title_area">
                <h2 className="pull-left">
                  <LegacyMessage messageKey="site.sidebar.postList" />
                </h2>
              </div>
              <ul className="post-list-wrap">
                {(query.data?.posts ?? []).map((post) => (
                  <PostListItem
                    key={`${post.ownerName}/${post.projectName}/${post.postNumber}`}
                    post={post}
                    runtimeConfig={runtimeConfig}
                  />
                ))}
              </ul>

              <PostListPagination
                currentPage={query.data?.page ?? pageNum}
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
  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={{ pageNum: currentPage - 1 }}
              to="/sites/postList"
              {...{ "pjax-page": "" }}
            >
              <i className="ico btn-pg-prev"></i>
              <span>PREV</span>
            </LegacyInternalLink>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">PREV</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            max={totalPages}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            readOnly
            type="number"
            value={currentPage}
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <LegacyInternalLink
              activeProps={{ className: undefined }}
              search={{ pageNum: currentPage + 1 }}
              to="/sites/postList"
              {...{ "pjax-page": "" }}
            >
              <span>NEXT</span>
              <i className="ico btn-pg-next"></i>
            </LegacyInternalLink>
          ) : (
            <>
              <span className="off">NEXT</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList", active: true },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend" },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update", badge: showUpdateBadge },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
            {item.badge ? <span className="notification-badge">1</span> : null}
          </LegacyInternalLink>
        </li>
      ))}
    </ul>
  );
}

function PostListItem({ post, runtimeConfig }: { post: SitePost; runtimeConfig: RuntimeConfig }) {
  const projectPath = prefixBasePath(
    runtimeConfig.basePath,
    `/${post.ownerName}/${post.projectName}`,
  );
  const postPath = prefixBasePath(
    runtimeConfig.basePath,
    `/${post.ownerName}/${post.projectName}/post/${post.postNumber}`,
  );
  const authorPath = prefixBasePath(runtimeConfig.basePath, `/${post.authorLoginId}`);

  return (
    <li className="row-fluid listitem">
      <a href={projectPath} className="avatar-wrap list-avatar">
        <img src={post.projectLogoUrl} alt={post.projectName} />
      </a>
      <div className="post-info-wrap">
        <a href={projectPath} className="post-project">
          {post.ownerName}/{post.projectName}
        </a>
        <span className="post-info-separator">·</span>
        <a href={postPath} className="post-title">
          {post.title}
        </a>
      </div>
      <div className="post-meta-wrap">
        <a href={authorPath} className="avatar-wrap">
          {isDefaultAuthorAvatar(post.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img src={post.authorAvatarUrl} />
          ) : (
            <img src={post.authorAvatarUrl} alt={post.authorLabel} width="16" height="16" />
          )}
        </a>
        <a href={authorPath} className="post-meta-item">
          {post.authorLabel}
        </a>
        <span className="post-meta-item" title={post.createdTitle}>
          {post.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <a href={`${postPath}#comments`}>
            <i className="yobicon-comments"></i>
            {post.commentCount}
          </a>
        </span>
      </div>
    </li>
  );
}

function isDefaultAuthorAvatar(avatarUrl: string) {
  return avatarUrl.includes("gravatar.com/avatar/");
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
