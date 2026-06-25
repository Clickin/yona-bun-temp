import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listWorkspaceFilesRest, type WorkspaceFilesResponse } from "../../../api/workspace";
import { useAppRuntime } from "../../../app-runtime-context";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  type LegacyI18nContextValue,
} from "../../../i18n";
import { prefixBasePath } from "../../../runtime-config";
import { BadRequestPage, useDocumentTitle, useRequireAuthenticatedRoute } from "../../-shared";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

export const Route = createFileRoute("/user/files")({
  component: UserFilesRouteComponent,
});

function appHref(basePath: string, href: string): string {
  return prefixBasePath(basePath, href);
}

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages
    ? messages(key, { fallback: key })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { fallback: key });
}

function legacyUserFileIconClass(fileName: string): string {
  if (/\.a?png$|\.svgz$/i.test(fileName)) {
    return "icon image-icon light-orange font-larger";
  }
  if (/\.gif$|\.ora$|\.sgi$/i.test(fileName)) {
    return "icon image-icon medium-yellow font-larger";
  }
  if (/\.jpe?g$/i.test(fileName)) {
    return "icon image-icon medium-green font-larger";
  }
  if (/\.svg$/i.test(fileName)) {
    return "icon svg-icon dark-yellow font-larger";
  }
  if (/\.(?:zip|z|xz)$/i.test(fileName)) {
    return "icon zip-icon null font-larger";
  }
  if (/\.rar$|\.iso$/i.test(fileName)) {
    return "icon zip-icon medium-blue font-larger";
  }
  if (/\.t?gz$|\.tar$|\.whl$/i.test(fileName)) {
    return "icon zip-icon dark-blue font-larger";
  }
  if (/\.7z$/i.test(fileName)) {
    return "icon zip-icon medium-maroon font-larger";
  }
  if (/\.doc$/i.test(fileName)) {
    return "icon word-icon medium-blue font-larger";
  }
  if (/\.docx$/i.test(fileName)) {
    return "icon word-icon dark-blue font-larger";
  }
  if (/\.xls$/i.test(fileName)) {
    return "icon excel-icon dark-orange font-larger";
  }
  if (/\.xlsx$/i.test(fileName)) {
    return "icon excel-icon dark-green font-larger";
  }
  if (/\.ppt$/i.test(fileName)) {
    return "icon powerpoint-icon dark-orange font-larger";
  }
  if (/\.pptx$/i.test(fileName)) {
    return "icon powerpoint-icon medium-red font-larger";
  }
  if (/\.pdf$/i.test(fileName)) {
    return "icon pdf-icon medium-red font-larger";
  }
  const legacyReadmePattern =
    /^README(?:\b|_)|^(?:licen[sc]es?|(?:read|readme|click|delete|keep|test)\.me)$|\.(?:readme|1st)$/i;
  if (legacyReadmePattern.test(fileName)) {
    return "icon book-icon medium-blue font-larger";
  }
  return "icon text-icon";
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
  const { bootstrapping, messages, runtimeConfig } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/user/files");
  const [query, setQuery] = React.useState(() => userFilesQueryFromLocation());
  const [files, setFiles] = React.useState<WorkspaceFilesResponse | null>(null);
  const [readFailed, setReadFailed] = React.useState(false);

  useDocumentTitle("user.files");

  React.useEffect(() => {
    if (!canRender) {
      return;
    }
    let cancelled = false;
    setReadFailed(false);
    void (async () => {
      try {
        const nextQuery = userFilesQueryFromLocation();
        const nextFiles = await listWorkspaceFilesRest(runtimeConfig, nextQuery);
        if (!cancelled) {
          setQuery(nextQuery);
          setFiles(nextFiles);
        }
      } catch {
        if (!cancelled) {
          setReadFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRender, runtimeConfig]);

  if (bootstrapping || !canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (readFailed) {
    return <BadRequestPage href="/user/files" />;
  }

  return (
    <UserFilesPage
      basePath={runtimeConfig.basePath}
      files={files}
      messages={messages}
      query={query}
    />
  );
}

export function UserFilesPage(props: {
  basePath: string;
  files: WorkspaceFilesResponse | null;
  messages?: LegacyMessageLookup;
  query: { filter: string; page: number };
}) {
  const files = props.files?.files ?? [];
  const totalPages = props.files?.totalPages ?? 0;

  return (
    <main className="app-shell user-files-page">
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <MySeriesMenuTabs basePath={props.basePath} messages={props.messages} />
          <form action={appHref(props.basePath, "/user/files")}>
            <div className="user-file-search search search-bar">
              <input
                className="textbox"
                defaultValue=""
                name="filter"
                placeholder={legacyMessage(props.messages, "search.title")}
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
                    <i className={legacyUserFileIconClass(file.name)} />
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

function MySeriesMenuTabs({
  basePath,
  messages,
}: {
  basePath: string;
  messages?: LegacyMessageLookup;
}) {
  return (
    <ul className="nav nav-tabs">
      <li>
        <a href={appHref(basePath, "/notifications")}>{legacyMessage(messages, "notification")}</a>
      </li>
      <li>
        <a href={appHref(basePath, "/user/issues")}>{legacyMessage(messages, "issue.myIssue")}</a>
      </li>
      <li className="active">
        <a href={appHref(basePath, "/user/files")}>{legacyMessage(messages, "user.files")}</a>
      </li>
    </ul>
  );
}
