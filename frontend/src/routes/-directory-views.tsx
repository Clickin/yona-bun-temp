import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type {
  OrganizationDirectoryViewModel,
  ProjectDirectoryViewModel,
} from "./-view-models";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

function readSearchParams(href: string): URLSearchParams {
  return new URL(href, "http://yona.local").searchParams;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildProjectsHref(filter: string, pageNum: number): string {
  const params = new URLSearchParams();
  if (filter.trim() !== "") {
    params.set("filter", filter.trim());
  }
  params.set("pageNum", String(pageNum));
  const query = params.toString();
  return query ? `/projects?${query}` : "/projects";
}

function buildOrganizationsHref(filter: string, pageNum: number): string {
  const params = new URLSearchParams();
  if (filter.trim() !== "") {
    params.set("filter", filter.trim());
  }
  params.set("pageNum", String(pageNum));
  return `/orgs?${params.toString()}`;
}

function getPaginationWindow(currentPageNum: number, totalPageCount: number) {
  const paginationWindow = 5;
  if (totalPageCount <= paginationWindow) {
    return Array.from({ length: totalPageCount }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPageNum - Math.floor(paginationWindow / 2));
  let end = start + paginationWindow - 1;

  if (end > totalPageCount) {
    end = totalPageCount;
    start = end - paginationWindow + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function ProjectDirectoryPage({
  directory,
  href,
  runtimeConfig,
}: {
  directory: ProjectDirectoryViewModel | null | undefined;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
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
  const totalPageCount =
    filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleProjects = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );
  const pageNumbers = getPaginationWindow(currentPageNum, totalPageCount);

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li className="active">
                <a href={appHref(runtimeConfig, "/projects")}>Project List</a>
              </li>
              <li>
                <a href={appHref(runtimeConfig, "/orgs")}>Organization List</a>
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
                    type="search"
                  />
                  <button className="search-btn" type="submit">
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
          {visibleProjects.length === 0 ? (
            <div className="error-wrap">
              <p>No public projects found.</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleProjects.map((project) => (
                  <li
                    className="project"
                    key={`${project.ownerName}/${project.projectName}`}
                  >
                    <div className="info-wrap">
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
                        </div>
                        <div className="desc">
                          {project.overview || "No overview yet."}
                        </div>
                        <p className="name-tag">by {project.ownerName}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPageCount > 1 ? (
                <nav className="directory-pagination legacy-directory-pagination" id="pagination">
                  {currentPageNum > 1 ? (
                    <a
                      className="nav-pill"
                      href={buildProjectsHref(params.get("filter") ?? "", currentPageNum - 1)}
                    >
                      Prev
                    </a>
                  ) : (
                    <span className="nav-pill is-disabled">Prev</span>
                  )}
                  {pageNumbers.map((nextPageNum) =>
                    nextPageNum === currentPageNum ? (
                      <span className="nav-pill active" key={nextPageNum}>
                        {nextPageNum}
                      </span>
                    ) : (
                      <a
                        className="nav-pill"
                        href={buildProjectsHref(params.get("filter") ?? "", nextPageNum)}
                        key={nextPageNum}
                      >
                        {nextPageNum}
                      </a>
                    ),
                  )}
                  {currentPageNum < totalPageCount ? (
                    <a
                      className="nav-pill"
                      href={buildProjectsHref(params.get("filter") ?? "", currentPageNum + 1)}
                    >
                      Next
                    </a>
                  ) : (
                    <span className="nav-pill is-disabled">Next</span>
                  )}
                </nav>
              ) : null}
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
  runtimeConfig,
}: {
  directory: OrganizationDirectoryViewModel | null | undefined;
  href: string;
  runtimeConfig: RuntimeConfig;
}) {
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
  const totalPageCount =
    filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
  const currentPageNum = totalPageCount === 0 ? 1 : Math.min(pageNum, totalPageCount);
  const visibleOrganizations = filtered.slice(
    (currentPageNum - 1) * pageSize,
    (currentPageNum - 1) * pageSize + pageSize,
  );
  const pageNumbers = getPaginationWindow(currentPageNum, totalPageCount);

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li>
                <a href={appHref(runtimeConfig, "/projects")}>Project List</a>
              </li>
              <li className="active">
                <a href={appHref(runtimeConfig, "/orgs")}>Organization List</a>
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
                    type="search"
                  />
                  <button className="search-btn" type="submit">
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
          {visibleOrganizations.length === 0 ? (
            <div className="error-wrap">
              <p>No organizations found.</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleOrganizations.map((organization) => (
                  <li className="project" key={organization.organizationName}>
                    <div className="info-wrap">
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
                        <div className="desc">
                          {organization.description || "No description yet."}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPageCount > 1 ? (
                <nav className="directory-pagination legacy-directory-pagination" id="pagination">
                  {currentPageNum > 1 ? (
                    <a
                      className="nav-pill"
                      href={buildOrganizationsHref(
                        params.get("filter") ?? "",
                        currentPageNum - 1,
                      )}
                    >
                      Prev
                    </a>
                  ) : (
                    <span className="nav-pill is-disabled">Prev</span>
                  )}
                  {pageNumbers.map((nextPageNum) =>
                    nextPageNum === currentPageNum ? (
                      <span className="nav-pill active" key={nextPageNum}>
                        {nextPageNum}
                      </span>
                    ) : (
                      <a
                        className="nav-pill"
                        href={buildOrganizationsHref(
                          params.get("filter") ?? "",
                          nextPageNum,
                        )}
                        key={nextPageNum}
                      >
                        {nextPageNum}
                      </a>
                    ),
                  )}
                  {currentPageNum < totalPageCount ? (
                    <a
                      className="nav-pill"
                      href={buildOrganizationsHref(
                        params.get("filter") ?? "",
                        currentPageNum + 1,
                      )}
                    >
                      Next
                    </a>
                  ) : (
                    <span className="nav-pill is-disabled">Next</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
