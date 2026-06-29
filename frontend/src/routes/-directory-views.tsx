import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { OrganizationDirectoryViewModel, ProjectDirectoryViewModel } from "./-view-models";

type LegacyMessageLookup = LegacyI18nContextValue["t"];
const legacyPjaxPageAttribute = { "pjax-page": "" };

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages
    ? messages(key, { fallback: key })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key);
}

function publicProjectListLabel(messages: LegacyMessageLookup | undefined) {
  return `${legacyMessage(messages, "project.public")} ${legacyMessage(messages, "title.projectList")}`;
}

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hrefWithPageNum(href: string, pageNum: number): string {
  const url = new URL(href, "http://yona.local");
  url.searchParams.set("pageNum", String(pageNum));
  return `${url.pathname}${url.search}`;
}

function stripBasePath(href: string, basePath: string): string {
  const normalizedBasePath = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  if (normalizedBasePath === "") {
    return href;
  }

  const url = new URL(href, "http://yona.local");
  if (url.pathname === normalizedBasePath) {
    return `/${url.search}`;
  }
  if (url.pathname.startsWith(`${normalizedBasePath}/`)) {
    return `${url.pathname.slice(normalizedBasePath.length)}${url.search}`;
  }
  return href;
}

function DirectoryPagination({
  currentPageNum,
  href,
  messages,
  runtimeConfig,
  totalPageCount,
}: {
  currentPageNum: number;
  href: string;
  messages: LegacyMessageLookup | undefined;
  runtimeConfig: RuntimeConfig;
  totalPageCount: number;
}) {
  if (totalPageCount <= 0) {
    return <div id="pagination"></div>;
  }

  const prevLabel = legacyMessage(messages, "button.prevPage");
  const nextLabel = legacyMessage(messages, "button.nextPage");
  const hasPrev = currentPageNum > 1;
  const hasNext = currentPageNum < totalPageCount;
  const unprefixedHref = stripBasePath(href, runtimeConfig.basePath);

  return (
    <div className="page-navigation-wrap" id="pagination">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <a
              href={appHref(runtimeConfig, hrefWithPageNum(unprefixedHref, currentPageNum - 1))}
              {...legacyPjaxPageAttribute}
            >
              <i className="ico btn-pg-prev"></i>
              <span>{prevLabel}</span>
            </a>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{prevLabel}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPageNum}
            max={totalPageCount}
            min={1}
            name="pageNum"
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPageCount}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <a
              href={appHref(runtimeConfig, hrefWithPageNum(unprefixedHref, currentPageNum + 1))}
              {...legacyPjaxPageAttribute}
            >
              <span>{nextLabel}</span>
              <i className="ico btn-pg-next"></i>
            </a>
          ) : (
            <>
              <span className="off">{nextLabel}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

export function ProjectDirectoryPage({
  directory,
  href,
  messages: providedMessages,
  onNavigate,
  runtimeConfig,
}: {
  directory: ProjectDirectoryViewModel | null | undefined;
  href: string;
  messages?: LegacyMessageLookup;
  onNavigate?: (href: string) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const runtimeMessages = useLegacyMessages().t;
  const messages = providedMessages ?? runtimeMessages;
  const params = readSearchParams(href);
  const filter = (params.get("filter") ?? "").trim().toLowerCase();
  const pageNum = parsePositiveInt(params.get("pageNum"), 1);
  const filtered = (directory?.items ?? []).filter((project) => {
    if (filter === "") {
      return true;
    }

    const haystack = [project.ownerName, project.projectName, project.overview]
      .join(" ")
      .toLowerCase();
    return haystack.includes(filter);
  });
  const pageSize = 10;
  const totalPageCount = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleProjects = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li className="active">
                <a href={appHref(runtimeConfig, "/projects")}>{publicProjectListLabel(messages)}</a>
              </li>
              <li>
                <a href={appHref(runtimeConfig, "/orgs")}>
                  {legacyMessage(messages, "title.organization.list")}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div className="pull-left" id="search">
              <form
                action={appHref(runtimeConfig, "/projects")}
                method="get"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!onNavigate) {
                    return;
                  }
                  const formData = new FormData(event.currentTarget);
                  const nextFilter = String(formData.get("filter") ?? "").trim();
                  onNavigate(
                    `/projects${nextFilter ? `?filter=${encodeURIComponent(nextFilter)}` : ""}`,
                  );
                }}
              >
                <div className="search-bar">
                  <input
                    className="textbox"
                    defaultValue={params.get("filter") ?? ""}
                    name="filter"
                    placeholder={legacyMessage(messages, "site.project.filter")}
                    type="text"
                  />
                  <button className="search-btn" type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </div>
          </div>
          {visibleProjects.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1"></i>
              <p>{legacyMessage(messages, "project.is.empty")}</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleProjects.map((project) => (
                  <li className="project" key={`${project.ownerName}/${project.projectName}`}>
                    <div className="info-wrap">
                      <div className="owner-avatar-wrap">
                        <a
                          href={appHref(
                            runtimeConfig,
                            `/${project.ownerName}/${project.projectName}`,
                          )}
                        >
                          {project.logoUrl ? (
                            <img alt={project.projectName} src={project.logoUrl} />
                          ) : null}
                        </a>
                      </div>
                      <div style={{ float: "left" }}>
                        <div className="header">
                          <a
                            className="black"
                            href={appHref(
                              runtimeConfig,
                              `/${project.ownerName}/${project.projectName}`,
                            )}
                          >
                            {project.projectName}
                          </a>
                          {project.projectScope === "private" ? (
                            <i className="yobicon-lock yobicon-small" />
                          ) : null}
                        </div>
                        <div className="desc">{project.overview}</div>
                        <p className="name-tag">
                          by{" "}
                          <a
                            className="owner-name-small"
                            href={appHref(runtimeConfig, `/${project.ownerName}`)}
                          >
                            {project.ownerName}
                          </a>{" "}
                          {project.createdLabel ? (
                            <>
                              at{" "}
                              <strong title={project.createdLabel}>
                                {project.createdLabel}
                              </strong>{" "}
                            </>
                          ) : null}
                          {project.lastPushedLabel ? (
                            <span className="small-font">
                              , {legacyMessage(messages, "project.codeUpdate")}{" "}
                              <strong>{project.lastPushedLabel}</strong>
                            </span>
                          ) : (
                            <span className="small-font"></span>
                          )}
                        </p>
                      </div>
                    </div>
                    {project.projectScope === "public" ? (
                      <div className="stats-wrap pull-right">
                        <div className="members">
                          <ul className="unstyled">
                            {(project.members ?? []).map((member) => (
                              <li key={member.loginId}>
                                <a
                                  className="avatar-wrap"
                                  href={appHref(runtimeConfig, `/${member.loginId}`)}
                                >
                                  {member.avatarUrl ? (
                                    <img alt={member.userLabel} src={member.avatarUrl} />
                                  ) : null}
                                </a>
                              </li>
                            ))}
                          </ul>
                          <p>
                            <i className="yobicon-friends yobicon-middle" />
                            <strong>{project.memberCount}</strong>{" "}
                            <i className="yobicon-eye yobicon-middle" />{" "}
                            <strong>{project.watchCount}</strong>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <DirectoryPagination
                currentPageNum={currentPageNum}
                href={href}
                messages={messages}
                runtimeConfig={runtimeConfig}
                totalPageCount={totalPageCount}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function OrganizationDirectoryPage({
  directory,
  href,
  messages: providedMessages,
  onNavigate,
  runtimeConfig,
}: {
  directory: OrganizationDirectoryViewModel | null | undefined;
  href: string;
  messages?: LegacyMessageLookup;
  onNavigate?: (href: string) => void;
  runtimeConfig: RuntimeConfig;
}) {
  const runtimeMessages = useLegacyMessages().t;
  const messages = providedMessages ?? runtimeMessages;
  const params = readSearchParams(href);
  const filter = (params.get("filter") ?? "").trim().toLowerCase();
  const pageNum = parsePositiveInt(params.get("pageNum"), 1);
  const filtered = (directory?.items ?? []).filter((organization) => {
    if (filter === "") {
      return true;
    }

    const haystack = [organization.organizationName, organization.description]
      .join(" ")
      .toLowerCase();
    return haystack.includes(filter);
  });
  const pageSize = 30;
  const totalPageCount = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleOrganizations = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li>
                <a href={appHref(runtimeConfig, "/projects")}>{publicProjectListLabel(messages)}</a>
              </li>
              <li className="active">
                <a href={appHref(runtimeConfig, "/orgs")}>
                  {legacyMessage(messages, "title.organization.list")}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div className="pull-left" id="search">
              <form
                action={appHref(runtimeConfig, "/orgs")}
                method="get"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!onNavigate) {
                    return;
                  }
                  const formData = new FormData(event.currentTarget);
                  const nextFilter = String(formData.get("filter") ?? "").trim();
                  onNavigate(
                    `/orgs${nextFilter ? `?filter=${encodeURIComponent(nextFilter)}` : ""}`,
                  );
                }}
              >
                <div className="search-bar">
                  <input
                    className="textbox"
                    defaultValue={params.get("filter") ?? ""}
                    name="filter"
                    placeholder={legacyMessage(messages, "site.organization.filter")}
                    type="text"
                  />
                  <button className="search-btn" type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </div>
          </div>
          {visibleOrganizations.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1"></i>
              <p>{legacyMessage(messages, "organization.is.empty")}</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleOrganizations.map((organization) => (
                  <li className="project" key={organization.organizationName}>
                    <div className="info-wrap">
                      <div className="owner-avatar-wrap">
                        <a
                          href={appHref(
                            runtimeConfig,
                            `/organizations/${organization.organizationName}`,
                          )}
                        >
                          {organization.logoUrl ? (
                            <img alt={organization.organizationName} src={organization.logoUrl} />
                          ) : null}
                        </a>
                      </div>
                      <div style={{ float: "left" }}>
                        <div className="header">
                          <a
                            className="black"
                            href={appHref(
                              runtimeConfig,
                              `/organizations/${organization.organizationName}`,
                            )}
                          >
                            {organization.organizationName}
                          </a>
                        </div>
                        <div className="desc">{organization.description}</div>
                        {organization.createdLabel ? (
                          <p className="name-tag">
                            created{" "}
                            <strong title={organization.createdLabel}>
                              {organization.createdLabel}
                            </strong>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <DirectoryPagination
                currentPageNum={currentPageNum}
                href={href}
                messages={messages}
                runtimeConfig={runtimeConfig}
                totalPageCount={totalPageCount}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
