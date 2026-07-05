import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { restFetch } from "../api/rest-client";
import type { ListOrganizationsResponse, YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type OrgsSearch = {
  filter: string;
  pageNum?: number;
};

type OrganizationDirectoryItem = YonaRecord & {
  createdLabel?: string;
  createdTitle?: string;
  descr?: string;
  description?: string;
  logoUrl?: string;
  name?: string;
  organizationName?: string;
};

export const Route = createFileRoute("/orgs")({
  component: OrgsRoute,
  validateSearch: (search: Record<string, unknown>): OrgsSearch => {
    const pageNum = positiveInteger(search.pageNum);
    return {
      filter: typeof search.filter === "string" ? search.filter : "",
      ...(pageNum ? { pageNum } : {}),
    };
  },
});

function OrgsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrgsScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrgsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const search = Route.useSearch();
  const { filter } = search;
  const { t } = useLegacyMessages();
  const organizationsQuery = useQuery(organizationsQueryOptions(runtimeConfig, search));
  const organizations = organizationItems(organizationsQuery.data);
  const totalPages = organizationTotalPages(organizationsQuery.data);
  const responsePage = positiveIntegerField(
    organizationsQuery.data,
    "pageNum",
    positiveIntegerField(organizationsQuery.data, "page", 1),
  );
  const currentPage = clampPageNum(search.pageNum ?? responsePage, totalPages);
  const autofocusRef = (node: HTMLInputElement | null) => {
    node?.setAttribute("autofocus", "");
  };

  return (
    <SiteLayoutShell activeMenu="projects" runtimeConfig={runtimeConfig}>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <div className="title_area">
            <ul className="nav nav-tabs">
              <li>
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to="/projects"
                >
                  {t("project.public")} {t("title.projectList")}
                </Link>
              </li>
              <li className="active">
                <Link
                  activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                  to="/orgs"
                >
                  {t("title.organization.list")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="search-wrap">
            <div id="search" className="pull-left">
              <form action={prefixBasePath(runtimeConfig.basePath, "/orgs")} method="get">
                <div className="search-bar">
                  <input
                    ref={autofocusRef}
                    name="filter"
                    className="textbox"
                    type="text"
                    placeholder={t("site.organization.filter")}
                    defaultValue={filter}
                  />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          {organizations.length === 0 ? (
            <div className="error-wrap">
              <i className="ico ico-err1"></i>
              <p>{t("organization.is.empty")}</p>
            </div>
          ) : (
            <>
              <ul className="all-projects">
                {organizations.map((organization) => (
                  <OrganizationListItem
                    key={organizationDisplayName(organization)}
                    organization={organization}
                  />
                ))}
              </ul>
              <OrganizationsPagination
                currentPage={currentPage}
                filter={filter}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function OrganizationsPagination({
  currentPage,
  filter,
  totalPages,
}: {
  currentPage: number;
  filter: string;
  totalPages: number;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  if (totalPages <= 1) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const pageSearch = (pageNum: number) => ({
    filter,
    pageNum,
  });
  const navigateToPage = (pageNum: number) => {
    void router.navigate({
      search: pageSearch(pageNum),
      to: "/orgs",
    });
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!/^[0-9]+$/u.test(event.currentTarget.value)) {
      event.currentTarget.value = String(currentPage);
      return;
    }
    const pageNum = clampPageNum(Number.parseInt(event.currentTarget.value, 10), totalPages);
    event.currentTarget.value = String(pageNum);
    navigateToPage(pageNum);
  };

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link
              activeProps={{ className: undefined }}
              search={pageSearch(currentPage - 1)}
              to="/orgs"
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
            key={currentPage}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => {
              event.currentTarget.select();
            }}
            onKeyDown={handleInputKeyDown}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link
              activeProps={{ className: undefined }}
              search={pageSearch(currentPage + 1)}
              to="/orgs"
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

function OrganizationListItem({ organization }: { organization: OrganizationDirectoryItem }) {
  const organizationName = organizationDisplayName(organization);
  if (!organizationIsReadable(organization)) {
    return (
      <li className="project" style={{ backgroundColor: "#fcfcfc" }}>
        <div className="info-wrap" style={{ opacity: 0.3 }}>
          <div className="owner-avatar-wrap">
            <img src="/assets/images/organization_default_logo.png" alt={organizationName} />
          </div>
          <div style={{ float: "left", color: "gray" }}>
            You do not have permission to view this project's information
          </div>
        </div>
      </li>
    );
  }

  const logoUrl = stringField(organization, "logoUrl", "");
  const createdLabel = stringField(organization, "createdLabel", "");
  const createdTitle = stringField(organization, "createdTitle", createdLabel);

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="owner-avatar-wrap">
          <Link
            to="/organizations/$organizationName"
            params={{ organizationName }}
            activeProps={{ className: undefined }}
          >
            {logoUrl ? <img src={logoUrl} alt={organizationName} /> : null}
          </Link>
        </div>
        <div style={{ float: "left" }}>
          <div className="header">
            <Link
              to="/organizations/$organizationName"
              params={{ organizationName }}
              activeProps={{ className: undefined }}
              className="black"
            >
              {organizationName}
            </Link>
          </div>
          <div className="desc">{organizationDescription(organization)}</div>
          <p className="name-tag">
            created <strong title={createdTitle}>{createdLabel}</strong>
          </p>
        </div>
      </div>
    </li>
  );
}

function organizationsQueryOptions(runtimeConfig: RuntimeConfig, search: OrgsSearch) {
  return {
    queryFn: () => listOrganizationsWithSearch(runtimeConfig, search),
    queryKey: ["api", "v1", "organizations", search],
  };
}

function listOrganizationsWithSearch(runtimeConfig: RuntimeConfig, search: OrgsSearch) {
  const params = new URLSearchParams();
  if (search.filter) {
    params.set("filter", search.filter);
  }
  if (search.pageNum) {
    params.set("pageNum", String(search.pageNum));
  }
  const query = params.toString();
  return restFetch<ListOrganizationsResponse>(
    runtimeConfig,
    query ? `/organizations?${query}` : "/organizations",
  );
}

function organizationItems(payload: unknown): OrganizationDirectoryItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as { items?: unknown; organizations?: unknown };
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.organizations)
      ? record.organizations
      : [];
  return items.filter((item): item is OrganizationDirectoryItem =>
    Boolean(item && typeof item === "object"),
  );
}

function organizationTotalPages(payload: unknown): number {
  const providedTotalPages = positiveIntegerField(payload, "totalPages", 0);
  if (providedTotalPages > 0) {
    return providedTotalPages;
  }
  const totalCount = positiveIntegerField(payload, "totalCount", 0);
  const pageSize = positiveIntegerField(payload, "pageSize", 0);
  if (totalCount > 0 && pageSize > 0) {
    return Math.ceil(totalCount / pageSize);
  }
  return 1;
}

function stringField(record: YonaRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function organizationDisplayName(record: YonaRecord): string {
  return stringField(record, "organizationName", stringField(record, "name", ""));
}

function organizationDescription(record: YonaRecord): string {
  return stringField(record, "description", stringField(record, "descr", ""));
}

function positiveInteger(value: unknown): number | undefined {
  const numberValue = numberFromPositiveInteger(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : undefined;
}

function numberFromPositiveInteger(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    return Number.parseInt(value, 10);
  }
  return Number.NaN;
}

function positiveIntegerField(payload: unknown, key: string, fallback: number): number {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  return positiveInteger((payload as Record<string, unknown>)[key]) ?? fallback;
}

function clampPageNum(pageNum: number, totalPages: number) {
  return Math.min(Math.max(pageNum, 1), Math.max(totalPages, 1));
}

function organizationIsReadable(record: YonaRecord): boolean {
  for (const key of ["viewerCanRead", "canRead", "isReadable", "readable"]) {
    if (record[key] === false) {
      return false;
    }
  }
  return true;
}
