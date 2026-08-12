import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import {
  listWorkspaceFilesRest,
  type WorkspaceFileItem,
  type WorkspaceFilesResponse,
} from "../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type UserFilesSearch = {
  filter?: string;
  pageNum?: number;
};

const legacyRouteLocalActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyRouteLocalActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};
const legacyEmptyUserFilesSearch = { filter: undefined, pageNum: undefined };

export const Route = createFileRoute("/user/files")({
  component: UserFilesRoute,
  validateSearch(search: Record<string, unknown>): UserFilesSearch {
    const rawPageNum = Number(search.pageNum);
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
    };
  },
});

function UserFilesRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const search = Route.useSearch();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <UserFilesScreen
            basePath={runtimeConfig.basePath}
            filter={search.filter ?? ""}
            pageNum={search.pageNum ?? 1}
            runtimeConfig={runtimeConfig}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function UserFilesScreen({
  basePath,
  filter,
  pageNum,
  runtimeConfig,
}: {
  basePath: string;
  filter: string;
  pageNum: number;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const filesQuery = useQuery({
    queryFn: () => listWorkspaceFilesRest(runtimeConfig, { filter, page: pageNum }),
    queryKey: ["workspace", "files", { filter, pageNum }],
  });
  const files = filesQuery.data ?? {
    files: [],
    filter,
    page: pageNum,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  };
  const searchNavigationMutation = useMutation({
    mutationFn: async (nextFilter: string) => nextFilter,
    onSuccess: async (nextFilter) => {
      await queryClient.invalidateQueries({ queryKey: ["workspace", "files"] });
      await router.navigate({
        search: { filter: nextFilter, pageNum: 1 },
        to: "/user/files",
      });
    },
  });

  return (
    <>
      <title>{t("user.files")}</title>
      <link
        rel="stylesheet"
        type="text/css"
        media="all"
        precedence="legacy-filetype"
        href={prefixBasePath(basePath, "/assets/stylesheets/filetype.css")}
      />
      <div className="page-wrap-outer" data-owner="user-files-page">
        <div className="page-wrap" data-owner="user-files-list">
          <ul className="nav nav-tabs">
            <li>
              <Link activeProps={legacyRouteLocalActiveProps} to="/notifications">
                {t("notification")}
              </Link>
            </li>
            <li>
              <Link
                activeProps={legacyRouteLocalActiveProps}
                to="/user/issues"
                search={{
                  filter: "assigned",
                  orderBy: "updatedDate",
                  orderDir: "desc",
                  pageNum: 1,
                  query: "",
                  state: "open",
                }}
              >
                {t("issue.myIssue")}
              </Link>
            </li>
            <li className="active">
              <Link
                activeOptions={legacyRouteLocalActiveOptions}
                activeProps={legacyRouteLocalActiveProps}
                search={legacyEmptyUserFilesSearch}
                to="/user/files"
              >
                {t("user.files")}
              </Link>
            </li>
            <li></li>
          </ul>
          <form
            action={prefixBasePath(basePath, "/user/files")}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              searchNavigationMutation.mutate(String(formData.get("filter") ?? ""));
            }}
          >
            <div className="user-file-search search search-bar" data-owner="user-files-search">
              <input
                key={`${filter}:${pageNum}`}
                name="filter"
                type="text"
                className="textbox"
                placeholder={t("search.title")}
                defaultValue=""
                data-owner="user-files-search-input"
              />
              <button type="submit" className="search-btn" data-owner="user-files-search-action">
                <i className="yobicon-search"></i>
              </button>
            </div>
          </form>
          <div className="attachment-files" data-owner="user-files-files">
            <div className="attachment-files-header row" data-owner="user-files-header">
              <div className="span1 header-preview">Preview</div>
              <div className="span5 header-file-name">Filename</div>
              <div className="span1 header-size">Size</div>
              <div className="span1">Download</div>
              <div className="span2 file-date">Date</div>
              <div className="span4 header-location">Location</div>
            </div>
            {files.files.map((attachment) => (
              <UserFileRow key={attachment.id} attachment={attachment} basePath={basePath} />
            ))}
          </div>
        </div>
        <Pagination files={files} />
      </div>
    </>
  );
}

function UserFileRow({
  attachment,
  basePath,
}: {
  attachment: WorkspaceFileItem;
  basePath: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const fileTo = attachment.url;
  const fileHref = prefixBasePath(basePath, attachment.url);
  const previewUrl = prefixBasePath(basePath, attachment.previewUrl);
  const downloadTo = attachment.downloadUrl;
  const downloadHref = prefixBasePath(basePath, attachment.downloadUrl);
  const locationTo = attachment.locationHref ?? "";
  const locationHref = attachment.locationHref
    ? prefixBasePath(basePath, attachment.locationHref)
    : "";
  const locationLabel = attachment.locationLabel || attachment.locationHref;

  return (
    <div
      className={`attachment-file-detail row${isHovered ? " hover" : ""}`}
      data-owner="user-files-row"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="file-preview span1">
        <Link href={fileHref} reloadDocument target="_blank" to={fileTo}>
          {attachment.mimeType.startsWith("image/") ? <img src={previewUrl} alt="" /> : null}
        </Link>
      </div>
      <div className="span5 file-name">
        <Link href={fileHref} reloadDocument target="_blank" to={fileTo}>
          <i className={`icon ${fileIconClass(attachment.name)}`}></i>
          {attachment.name}
        </Link>
      </div>
      <div className="span1 file-size">{attachment.sizeLabel}</div>
      <div className="span1 file-download">
        <Link href={downloadHref} reloadDocument to={downloadTo}>
          <button type="button" className="ybtn">
            <i className="yobicon-cloud-download"></i>
          </button>
        </Link>
      </div>
      <div className="span2 file-date">{attachment.createdLabel}</div>
      <div className="span4 file-location">
        {locationHref ? (
          <Link href={locationHref} reloadDocument target="_blank" to={locationTo}>
            {locationLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Pagination({ files }: { files: WorkspaceFilesResponse }) {
  const { t } = useLegacyMessages();
  const router = useRouter();

  if (files.totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const currentPage = Math.min(Math.max(files.page, 1), files.totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < files.totalPages;
  const pageSearch = (pageNum: number) => ({ filter: files.filter, pageNum });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: "/user/files",
    });
  };

  const paginationSpriteStyle = {
    "--user-files-pagination-sprite": `url(${legacySpriteUrl})`,
  } as CSSProperties;
  return (
    <div id="pagination" className="page-navigation-wrap" data-owner="user-files-pagination">
      <ul className="page-nums" data-owner="user-files-pagination-list">
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="user-files-pagination-item"
        >
          {hasPrev ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              search={pageSearch(currentPage - 1)}
              to="/user/files"
            >
              <i
                className="ico btn-pg-prev"
                style={paginationSpriteStyle}
                data-owner="user-files-pagination-icon"
              ></i>
              <span data-owner="user-files-pagination-label">{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i
                className="ico btn-pg-prev off"
                style={paginationSpriteStyle}
                data-disabled="true"
                data-owner="user-files-pagination-icon"
              ></i>
              <span className="off" data-disabled="true" data-owner="user-files-pagination-label">
                {t("button.prevPage")}
              </span>
            </>
          )}
        </li>
        <li className="page-num" data-owner="user-files-pagination-item">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            key={`${currentPage}-${files.totalPages}`}
            max={files.totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              if (!/^\d+$/u.test(event.currentTarget.value)) {
                event.currentTarget.value = String(currentPage);
                return;
              }

              const requestedPage = Number.parseInt(event.currentTarget.value, 10);
              const nextPage = Math.min(Math.max(requestedPage, 1), files.totalPages);
              event.currentTarget.value = String(nextPage);
              navigateToPage(nextPage);
            }}
            pattern="[0-9]*"
            type="number"
            data-owner="user-files-pagination-input"
          />
        </li>
        <li
          className="page-num delimiter"
          data-pagination-variant="delimiter"
          data-owner="user-files-pagination-item"
        >
          /
        </li>
        <li className="page-num" data-owner="user-files-pagination-item">
          {files.totalPages}
        </li>
        <li
          className="page-num ikon"
          data-pagination-variant="icon"
          data-owner="user-files-pagination-item"
        >
          {hasNext ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              search={pageSearch(currentPage + 1)}
              to="/user/files"
            >
              <span data-owner="user-files-pagination-label">{t("button.nextPage")}</span>
              <i
                className="ico btn-pg-next"
                style={paginationSpriteStyle}
                data-owner="user-files-pagination-icon"
              ></i>
            </Link>
          ) : (
            <>
              <span className="off" data-disabled="true" data-owner="user-files-pagination-label">
                {t("button.nextPage")}
              </span>
              <i
                className="ico btn-pg-next off"
                style={paginationSpriteStyle}
                data-disabled="true"
                data-owner="user-files-pagination-icon"
              ></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function fileIconClass(fileName: string) {
  const normalizedFileName = fileName.toLowerCase();
  if (/\.(?:apng|png|svgz)$/u.test(normalizedFileName)) {
    return "image-icon light-orange font-larger";
  }
  if (/\.te?xt$|\.irclog$|\.uot$/u.test(normalizedFileName)) {
    return "text-icon medium-blue font-larger";
  }
  return "text-icon";
}
