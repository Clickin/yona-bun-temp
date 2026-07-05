import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { sitePostsQueryOptions, siteUpdateQueryOptions, type SitePost } from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import type { RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type PostListSearch = {
  pageNum: number;
};

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

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
  const { t } = useLegacyMessages();
  const router = useRouter();

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
            <Link
              activeProps={{ className: undefined }}
              pjax-page=""
              search={{ pageNum: currentPage - 1 }}
              to="/sites/postList"
            >
              <i className="ico btn-pg-prev"></i>
              <span>{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{t("button.prevPage")}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
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
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeProps={{ className: undefined }}
              pjax-page=""
              search={{ pageNum: currentPage + 1 }}
              to="/sites/postList"
            >
              <span>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">{t("button.nextPage")}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="active">
        <Link {...legacySiteSidebarLinkProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/diagnostic">
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function PostListItem({ post }: { post: SitePost }) {
  return (
    <li className="row-fluid listitem">
      <Link
        className="avatar-wrap list-avatar"
        params={{ ownerName: post.ownerName, projectName: post.projectName }}
        to="/$ownerName/$projectName"
      >
        <img src={post.projectLogoUrl} alt={post.projectName} />
      </Link>
      <div className="post-info-wrap">
        <Link
          className="post-project"
          params={{ ownerName: post.ownerName, projectName: post.projectName }}
          to="/$ownerName/$projectName"
        >
          {post.ownerName}/{post.projectName}
        </Link>
        <span className="post-info-separator">·</span>
        <Link
          className="post-title"
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
      <div className="post-meta-wrap">
        <Link className="avatar-wrap" params={{ user: post.authorLoginId }} to="/$user">
          {isDefaultAuthorAvatar(post.authorAvatarUrl) ? (
            /* oxlint-disable-next-line jsx-a11y/alt-text -- legacy default author avatar branch renders no alt/size attributes. */
            <img src={post.authorAvatarUrl} />
          ) : (
            <img src={post.authorAvatarUrl} alt={post.authorLabel} width="16" height="16" />
          )}
        </Link>
        <Link className="post-meta-item" params={{ user: post.authorLoginId }} to="/$user">
          {post.authorLabel}
        </Link>
        <span className="post-meta-item" title={post.createdTitle}>
          {post.createdLabel}
        </span>
        <span className="post-comments post-meta-item">
          <Link
            hash="comments"
            params={{
              ownerName: post.ownerName,
              postNumber: post.postNumber,
              projectName: post.projectName,
            }}
            to="/$ownerName/$projectName/post/$postNumber"
          >
            <i className="yobicon-comments"></i>
            {post.commentCount}
          </Link>
        </span>
      </div>
    </li>
  );
}

function isDefaultAuthorAvatar(avatarUrl: string) {
  return /^https:\/\/www\.gravatar\.com\/avatar\/[^?]+\?s=16&d=https%3A%2F%2Fko\.gravatar\.com%2Fuserimage%2F53495145%2F0eaeeb47c620542ad089f17377298af6\.png$/u.test(
    avatarUrl,
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}
