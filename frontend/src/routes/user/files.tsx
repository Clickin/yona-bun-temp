import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  listWorkspaceFilesRest,
  type WorkspaceFileItem,
  type WorkspaceFilesResponse,
} from "../../api/workspace";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

type UserFilesSearch = {
  filter?: string;
  pageNum?: number;
};

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
    <YonaQueryProvider>
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
    </YonaQueryProvider>
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

  return (
    <div className="page-wrap-outer">
      <div className="page-wrap">
        <ul className="nav nav-tabs">
          <li>
            <a href={prefixBasePath(basePath, "/notifications")}>{t("notification")}</a>
          </li>
          <li>
            <a href={prefixBasePath(basePath, "/user/issues")}>{t("issue.myIssue")}</a>
          </li>
          <li className="active">
            <a href={prefixBasePath(basePath, "/user/files")}>{t("user.files")}</a>
          </li>
          <li></li>
        </ul>
        <form action={prefixBasePath(basePath, "/user/files")}>
          <div className="user-file-search search search-bar">
            <input
              ref={(element) => {
                element?.setAttribute("value", filter);
              }}
              name="filter"
              className="textbox"
              type="text"
              placeholder={t("search.title")}
              defaultValue={filter}
            />
            <button type="submit" className="search-btn">
              <i className="yobicon-search"></i>
            </button>
          </div>
        </form>
        <div className="attachment-files">
          <div className="attachment-files-header row">
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
      <Pagination basePath={basePath} files={files} />
    </div>
  );
}

function UserFileRow({
  attachment,
  basePath,
}: {
  attachment: WorkspaceFileItem;
  basePath: string;
}) {
  const fileUrl = prefixBasePath(basePath, attachment.url);
  const previewUrl = prefixBasePath(basePath, attachment.previewUrl);
  const downloadUrl = prefixBasePath(basePath, attachment.downloadUrl);
  const locationHref = prefixBasePath(basePath, attachment.locationHref);

  return (
    <div className="attachment-file-detail row">
      <div className="file-preview span1">
        <a href={fileUrl} target="_blank">
          {attachment.mimeType.startsWith("image/") ? <img src={previewUrl} alt="" /> : null}
        </a>
      </div>
      <div className="span5 file-name">
        <a href={fileUrl} target="_blank">
          <i className={`icon ${fileIconClass(attachment.name)}`}></i>
          {attachment.name}
        </a>
      </div>
      <div className="span1 file-size">{attachment.sizeLabel}</div>
      <div className="span1 file-download">
        <a href={downloadUrl}>
          <button type="button" className="ybtn">
            <i className="yobicon-cloud-download"></i>
          </button>
        </a>
      </div>
      <div className="span2 file-date">{attachment.createdLabel}</div>
      <div className="span4 file-location">
        <a href={locationHref} target="_blank">
          {attachment.locationLabel}
        </a>
      </div>
    </div>
  );
}

function Pagination({ basePath, files }: { basePath: string; files: WorkspaceFilesResponse }) {
  const pages = Array.from({ length: files.totalPages }, (_, index) => index + 1);

  return (
    <div id="pagination">
      {pages.map((page) => {
        const params = new URLSearchParams();
        if (files.filter !== "") {
          params.set("filter", files.filter);
        }
        params.set("pageNum", String(page));
        return (
          <a
            key={page}
            href={`${prefixBasePath(basePath, "/user/files")}?${params.toString()}`}
            className={page === files.page ? "active" : undefined}
          >
            {page}
          </a>
        );
      })}
    </div>
  );
}

function fileIconClass(fileName: string) {
  return fileName.toLowerCase().endsWith(".png") ? "png-icon font-larger" : "text-icon";
}
