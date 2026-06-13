import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listWorkspaceFilesRest, type WorkspaceFilesResponse } from "../../../api/workspace";
import { useAppRuntime } from "../../../app-runtime-context";
import { prefixBasePath } from "../../../runtime-config";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../../-shared";

export const Route = createFileRoute("/user/files")({
  component: UserFilesRouteComponent,
});

function appHref(basePath: string, href: string): string {
  return prefixBasePath(basePath, href);
}

function userFilesQueryFromLocation(): { filter: string; page: number } {
  const searchParams = new URLSearchParams(window.location.search);
  const page = Number(searchParams.get("page") || searchParams.get("pageNum") || "1");
  return {
    filter: searchParams.get("filter") ?? "",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function UserFilesRouteComponent() {
  const { bootstrapping, runtimeConfig, setErrorMessage } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/files");
  const [query, setQuery] = React.useState(() => userFilesQueryFromLocation());
  const [files, setFiles] = React.useState<WorkspaceFilesResponse | null>(null);

  useDocumentTitle("user.files");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const nextQuery = userFilesQueryFromLocation();
        const nextFiles = await listWorkspaceFilesRest(runtimeConfig, nextQuery);
        if (!cancelled) {
          setQuery(nextQuery);
          setFiles(nextFiles);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Read user files failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, runtimeConfig, setErrorMessage]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>Loading…</h1>
      </main>
    );
  }

  return <UserFilesPage basePath={runtimeConfig.basePath} files={files} query={query} />;
}

export function UserFilesPage(props: {
  basePath: string;
  files: WorkspaceFilesResponse | null;
  query: { filter: string; page: number };
}) {
  const files = props.files?.files ?? [];
  const totalPages = props.files?.totalPages ?? 0;

  return (
    <main className="app-shell user-files-page">
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <MySeriesMenuTabs basePath={props.basePath} />
          <form action={appHref(props.basePath, "/user/files")}>
            <div className="user-file-search search search-bar">
              <input
                className="textbox"
                defaultValue={props.query.filter}
                name="filter"
                placeholder="search.title"
                type="text"
              />
              <button className="search-btn" type="submit">
                <i className="yobicon-search" />
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
            {files.map((file) => (
              <div className="attachment-file-detail row" key={file.id}>
                <div className="file-preview span1">
                  <a href={file.url} target="_blank">
                    {file.previewUrl ? <img alt="" src={file.previewUrl} /> : null}
                  </a>
                </div>
                <div className="span5 file-name">
                  <a href={file.url} target="_blank">
                    <i className="icon text-icon" />
                    {file.name}
                  </a>
                </div>
                <div className="span1 file-size">{file.sizeLabel}</div>
                <div className="span1 file-download">
                  <a href={file.downloadUrl}>
                    <button className="ybtn" type="button">
                      <i className="yobicon-cloud-download" />
                    </button>
                  </a>
                </div>
                <div className="span2 file-date">{file.createdLabel}</div>
                <div className="span4 file-location">
                  {file.locationHref ? (
                    <a href={file.locationHref} target="_blank">
                      {file.locationLabel || file.locationHref}
                    </a>
                  ) : (
                    file.locationLabel
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div id="pagination">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            const searchParams = new URLSearchParams();
            if (props.query.filter.trim()) {
              searchParams.set("filter", props.query.filter.trim());
            }
            if (page > 1) {
              searchParams.set("pageNum", String(page));
            }
            const query = searchParams.toString();
            return (
              <a
                className={page === (props.files?.page ?? props.query.page) ? "active" : ""}
                href={appHref(props.basePath, `/user/files${query ? `?${query}` : ""}`)}
                key={page}
              >
                {page}
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function MySeriesMenuTabs({ basePath }: { basePath: string }) {
  return (
    <ul className="nav nav-tabs">
      <li>
        <a href={appHref(basePath, "/notifications")}>notification</a>
      </li>
      <li>
        <a href={appHref(basePath, "/user/issues")}>issue.myIssue</a>
      </li>
      <li className="active">
        <a href={appHref(basePath, "/user/files")}>user.files</a>
      </li>
    </ul>
  );
}
