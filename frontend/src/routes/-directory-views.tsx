import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { OrganizationDirectoryViewModel, ProjectDirectoryViewModel } from "./-view-models";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

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

export function ProjectDirectoryPage({
  directory,
  href,
  messages: providedMessages,
  runtimeConfig,
}: {
  directory: ProjectDirectoryViewModel | null | undefined;
  href: string;
  messages?: LegacyMessageLookup;
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
              <form action={appHref(runtimeConfig, "/projects")} method="get">
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
                      <div className="project-main-copy">
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
                          ) : null}
                        </p>
                      </div>
                    </div>
                    {project.projectScope === "public" ? (
                      <div className="stats-wrap pull-right">
                        <div className="members">
                          <ul className="unstyled" />
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
              <div id="pagination"></div>
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
  runtimeConfig,
}: {
  directory: OrganizationDirectoryViewModel | null | undefined;
  href: string;
  messages?: LegacyMessageLookup;
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
              <form action={appHref(runtimeConfig, "/orgs")} method="get">
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
                      <div className="project-main-copy">
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
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div id="pagination"></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
