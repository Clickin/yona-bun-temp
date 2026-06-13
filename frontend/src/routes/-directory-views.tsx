import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import type { OrganizationDirectoryViewModel, ProjectDirectoryViewModel } from "./-view-models";

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
                <a href={appHref(runtimeConfig, "/projects")}>project.public title.projectList</a>
              </li>
              <li>
                <a href={appHref(runtimeConfig, "/orgs")}>title.organization.list</a>
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
                    placeholder="site.project.filter"
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
              <p>project.is.empty</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleProjects.map((project) => (
                  <li className="project" key={`${project.ownerName}/${project.projectName}`}>
                    <div className="info-wrap">
                      {project.logoUrl ? (
                        <div className="project-avatar">
                          <img alt="" src={project.logoUrl} />
                        </div>
                      ) : null}
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
                        <div className="desc">{project.overview}</div>
                        <p className="name-tag">by {project.ownerName}</p>
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
                <a href={appHref(runtimeConfig, "/projects")}>project.public title.projectList</a>
              </li>
              <li className="active">
                <a href={appHref(runtimeConfig, "/orgs")}>title.organization.list</a>
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
                    placeholder="site.organization.filter"
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
              <p>organization.is.empty</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {visibleOrganizations.map((organization) => (
                  <li className="project" key={organization.organizationName}>
                    <div className="info-wrap">
                      {organization.logoUrl ? (
                        <div className="project-avatar">
                          <img alt="" src={organization.logoUrl} />
                        </div>
                      ) : null}
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
