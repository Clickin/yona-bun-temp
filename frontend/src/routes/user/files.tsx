import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
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
    <div className="page-wrap-outer">
      <div className="page-wrap">
        <ul className="nav nav-tabs">
          <li>
            <Link activeProps={{ className: undefined }} to="/notifications">
              {t("notification")}
            </Link>
          </li>
          <li>
            <Link activeProps={{ className: undefined }} to="/user/issues">
              {t("issue.myIssue")}
            </Link>
          </li>
          <li className="active">
            <Link activeProps={{ className: undefined }} to="/user/files">
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
      <Pagination files={files} />
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
    <div className="attachment-file-detail row">
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
  const pages = Array.from({ length: files.totalPages }, (_, index) => index + 1);

  return (
    <div id="pagination">
      {pages.map((page) => {
        return (
          <Link
            activeProps={{ className: undefined }}
            key={page}
            to="/user/files"
            search={{ filter: files.filter, pageNum: page }}
            className={page === files.page ? "active" : undefined}
          >
            {page}
          </Link>
        );
      })}
    </div>
  );
}

function fileIconClass(fileName: string) {
  return fileName.toLowerCase().endsWith(".png") ? "png-icon font-larger" : "text-icon";
}
