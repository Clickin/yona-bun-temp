import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import {
  listWorkspaceFilesRest,
  type WorkspaceFileItem,
  type WorkspaceFilesResponse,
} from "../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { userFilesSearchColors } from "./-files.stylex";

const styles = stylex.create({
  fileHeader: {
    backgroundColor: "#f1f1f1",
    borderRadius: "5px",
    color: "gray",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
    padding: "10px 5px",
    textAlign: "center",
  },
  fileRow: {
    borderBottomColor: "#eee",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderColor: "#fff",
    borderStyle: "solid",
    borderWidth: "1px",
    color: "gray",
    fontFamily: "monospace",
    lineHeight: "30px",
    padding: "5px",
  },
  searchRoot: {
    backgroundColor: userFilesSearchColors.rootSurface,
    borderColor: userFilesSearchColors.rootBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    height: "20px",
    lineHeight: "20px",
    margin: {
      default: "0px 0px 10px",
      "@media (max-width: 720px)": "5px 0px",
    },
    padding: "4px 25px 4px 5px",
    position: "relative",
  },
  searchInput: {
    backgroundColor: userFilesSearchColors.inputSurface,
    borderColor: userFilesSearchColors.inputText,
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: userFilesSearchColors.inputText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: {
      default: "12px",
      "@media (max-width: 720px)": "16px",
    },
    fontWeight: "400",
    height: "20px",
    lineHeight: "20px",
    margin: "0px -5px",
    outline: { ":focus": "0 none" },
    padding: "0px 5px",
    transition: "width 0.15s",
    verticalAlign: "middle",
    width: {
      default: "100%",
      "@media (max-width: 720px)": "inherit",
    },
  },
  searchAction: {
    backgroundColor: userFilesSearchColors.actionSurface,
    borderColor: userFilesSearchColors.actionText,
    borderStyle: "none",
    borderWidth: "0px",
    color: userFilesSearchColors.actionText,
    cursor: "pointer",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "12px",
    fontWeight: "400",
    height: "20px",
    lineHeight: "normal",
    margin: "0px",
    outline: "0 none",
    padding: "0px",
    position: "absolute",
    right: "5px",
    textAlign: "center",
    top: "5px",
  },
});

const searchStyleProps = stylex.props(styles.searchRoot);
const searchInputStyleProps = stylex.props(styles.searchInput);
const searchActionStyleProps = stylex.props(styles.searchAction);

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
      <div className="page-wrap-outer" data-stylex-owner="user-files-page">
        <div className="page-wrap" data-stylex-owner="user-files-list">
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
            <div {...searchStyleProps} data-stylex-owner="user-files-search">
              <input
                {...searchInputStyleProps}
                key={`${filter}:${pageNum}`}
                name="filter"
                type="text"
                placeholder={t("search.title")}
                defaultValue=""
                data-stylex-owner="user-files-search-input"
              />
              <button
                {...searchActionStyleProps}
                type="submit"
                data-stylex-owner="user-files-search-action"
              >
                <i className="yobicon-search"></i>
              </button>
            </div>
          </form>
          <div className="attachment-files" data-stylex-owner="user-files-files">
            <div
              className={`${stylex.props(styles.fileHeader).className} attachment-files-header row`}
              data-stylex-owner="user-files-header"
            >
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
      className={`${stylex.props(styles.fileRow).className} attachment-file-detail row${isHovered ? " hover" : ""}`}
      data-stylex-owner="user-files-row"
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

  return (
    <div id="pagination" className="page-navigation-wrap" data-stylex-owner="user-files-pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              search={pageSearch(currentPage - 1)}
              to="/user/files"
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
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{files.totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeOptions={legacyRouteLocalActiveOptions}
              activeProps={legacyRouteLocalActiveProps}
              search={pageSearch(currentPage + 1)}
              to="/user/files"
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
