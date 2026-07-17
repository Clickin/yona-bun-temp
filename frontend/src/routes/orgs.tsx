/* oxlint-disable jsx-a11y/no-autofocus -- legacy organization/list.scala.html sets autofocus on the directory filter input. */
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, type SearchSchemaInput, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { restFetch } from "../api/rest-client";
import type { ListOrganizationsResponse, YoramRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";
import { styles } from "./-orgs.stylex";

const sx = {
  breadcrumbOuter: stylex.props(styles.breadcrumbOuter),
  breadcrumbInner: stylex.props(styles.breadcrumbInner),
  tabsList: stylex.props(styles.tabsList),
  tabsItem: stylex.props(styles.tabsItem),
  tabsLink: stylex.props(styles.tabsLink),
  tabsActiveLink: stylex.props(styles.tabsLink, styles.tabsActiveLink),
  pageWrap: stylex.props(styles.pageWrap),
  page: stylex.props(styles.page),
  searchWrap: stylex.props(styles.searchWrap),
  searchContainer: stylex.props(styles.searchContainer),
  searchForm: stylex.props(styles.searchForm),
  searchBar: stylex.props(styles.searchBar),
  searchInput: stylex.props(styles.searchInput),
  searchButton: stylex.props(styles.searchButton),
  icon: stylex.props(styles.icon),
  list: stylex.props(styles.list),
  row: stylex.props(styles.row),
  privateRow: stylex.props(styles.privateRow),
  avatar: stylex.props(styles.avatar),
  avatarImage: stylex.props(styles.avatarImage),
  identity: stylex.props(styles.identity),
  privateIdentity: stylex.props(styles.privateIdentity),
  privateMessage: stylex.props(styles.privateMessage),
  header: stylex.props(styles.header),
  titleLink: stylex.props(styles.titleLink),
  description: stylex.props(styles.description),
  nameTag: stylex.props(styles.nameTag),
  empty: stylex.props(styles.empty),
  emptyMessage: stylex.props(styles.emptyMessage),
  pagination: stylex.props(styles.pagination),
  paginationList: stylex.props(styles.paginationList),
  paginationItem: stylex.props(styles.paginationItem),
  paginationIconItem: stylex.props(styles.paginationItem, styles.paginationIconItem),
  paginationDelimiter: stylex.props(styles.paginationItem, styles.paginationDelimiter),
  paginationLabel: stylex.props(styles.paginationLabel),
  paginationDisabled: stylex.props(styles.paginationLabel, styles.paginationDisabled),
  paginationInput: stylex.props(styles.paginationInput),
} as const;

type OrgsSearch = {
  filter: string;
  pageNum?: number;
};
type OrgsSearchInput = Partial<OrgsSearch> & SearchSchemaInput;

const LEGACY_ORGS_LINK_SEARCH = {
  filter: undefined,
  pageNum: undefined,
};
const LEGACY_PROJECTS_LINK_SEARCH = {
  filter: undefined,
  labelIds: undefined,
  pageNum: undefined,
} as const;

type OrganizationDirectoryItem = YoramRecord & {
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
  validateSearch: (search: OrgsSearchInput): OrgsSearch => {
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
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <OrgsScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
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

  return (
    <>
      <title>{t("title.projectList")}</title>
      <SiteLayoutShell activeMenu="projects" runtimeConfig={runtimeConfig}>
        <div {...sx.breadcrumbOuter} data-stylex-owner="organization-directory-breadcrumb-outer">
          <div {...sx.breadcrumbInner} data-stylex-owner="organization-directory-breadcrumb-inner">
            <div className="title_area" data-stylex-owner="organization-directory-title-area">
              <ul {...sx.tabsList} data-stylex-owner="organization-directory-tabs-list">
                <li {...sx.tabsItem} data-stylex-owner="organization-directory-tabs-item">
                  <Link
                    {...sx.tabsLink}
                    activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                    activeProps={{
                      "aria-current": undefined,
                      className: undefined,
                      "data-status": undefined,
                    }}
                    search={LEGACY_PROJECTS_LINK_SEARCH}
                    to="/projects"
                  >
                    {t("project.public")} {t("title.projectList")}
                  </Link>
                </li>
                <li {...sx.tabsItem} data-stylex-owner="organization-directory-tabs-item">
                  <Link
                    activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
                    activeProps={{
                      "aria-current": undefined,
                      className: undefined,
                      "data-status": undefined,
                    }}
                    search={LEGACY_ORGS_LINK_SEARCH}
                    {...sx.tabsActiveLink}
                    to="/orgs"
                  >
                    {t("title.organization.list")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div {...sx.pageWrap} data-stylex-owner="organization-directory-page-wrap">
          <div
            {...sx.page}
            data-stylex-owner="organization-directory-page"
            data-stylex-page-shell="organization-directory-page-shell"
          >
            <div {...sx.searchWrap} data-stylex-owner="organization-directory-search-wrap">
              <div
                id="search"
                {...sx.searchContainer}
                data-stylex-owner="organization-directory-search-container"
              >
                <form
                  {...sx.searchForm}
                  action={prefixBasePath(runtimeConfig.basePath, "/orgs")}
                  method="get"
                >
                  <div {...sx.searchBar} data-stylex-owner="organization-directory-search-bar">
                    <input
                      autoFocus
                      name="filter"
                      {...sx.searchInput}
                      data-stylex-owner="organization-directory-search-input"
                      type="text"
                      placeholder={t("site.organization.filter")}
                      defaultValue={filter}
                    />
                    <button
                      {...sx.searchButton}
                      data-stylex-owner="organization-directory-search-button"
                      type="submit"
                    >
                      <i
                        {...sx.icon}
                        data-stylex-owner="organization-directory-search-icon"
                        className="yobicon-search"
                      ></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
            {organizations.length === 0 ? (
              <div {...sx.empty} data-stylex-owner="organization-directory-empty">
                <i className="ico ico-err1"></i>
                <p {...sx.emptyMessage} data-stylex-owner="organization-directory-empty-message">
                  {t("organization.is.empty")}
                </p>
              </div>
            ) : (
              <>
                <ul {...sx.list} data-stylex-owner="organization-directory-list">
                  {organizations.map((organization) => (
                    <OrganizationListItem
                      basePath={runtimeConfig.basePath}
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
    </>
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
    ...(filter ? { filter } : {}),
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
    <div {...sx.pagination} data-stylex-owner="organization-directory-pagination" id="pagination">
      <ul {...sx.paginationList} data-stylex-owner="organization-directory-pagination-list">
        <li {...sx.paginationIconItem} data-stylex-owner="organization-directory-pagination-item">
          {hasPrev ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={pageSearch(currentPage - 1)}
              to="/orgs"
            >
              <i className="ico btn-pg-prev"></i>
              <span {...sx.paginationLabel}>{t("button.prevPage")}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span {...sx.paginationDisabled}>{t("button.prevPage")}</span>
            </>
          )}
        </li>
        <li {...sx.paginationItem} data-stylex-owner="organization-directory-pagination-item">
          <input
            {...sx.paginationInput}
            data-stylex-owner="organization-directory-pagination-input"
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
        <li {...sx.paginationDelimiter} data-stylex-owner="organization-directory-pagination-item">
          /
        </li>
        <li {...sx.paginationItem} data-stylex-owner="organization-directory-pagination-item">
          {totalPages}
        </li>
        <li {...sx.paginationIconItem} data-stylex-owner="organization-directory-pagination-item">
          {hasNext ? (
            <Link
              activeProps={{
                "aria-current": undefined,
                className: undefined,
                "data-status": undefined,
              }}
              search={pageSearch(currentPage + 1)}
              to="/orgs"
            >
              <span {...sx.paginationLabel}>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span {...sx.paginationDisabled}>{t("button.nextPage")}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function OrganizationListItem({
  basePath,
  organization,
}: {
  basePath: string;
  organization: OrganizationDirectoryItem;
}) {
  const organizationName = organizationDisplayName(organization);
  if (!organizationIsReadable(organization)) {
    return (
      <li
        {...sx.row}
        {...sx.privateRow}
        data-stylex-owner="organization-directory-row"
        data-stylex-owner-private="organization-directory-private-row"
      >
        <div
          {...sx.identity}
          {...sx.privateIdentity}
          data-stylex-owner="organization-directory-private"
        >
          <div {...sx.avatar}>
            <img
              src={prefixBasePath(basePath, "/assets/images/organization_default_logo.png")}
              alt={organizationName}
            />
          </div>
          <div {...sx.privateMessage} data-stylex-owner="organization-directory-private-message">
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
    <li {...sx.row} data-stylex-owner="organization-directory-row">
      <div data-stylex-owner="organization-directory-info">
        <div {...sx.avatar} data-stylex-owner="organization-directory-avatar">
          <Link
            to="/organizations/$organizationName"
            params={{ organizationName }}
            activeProps={{
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            }}
          >
            {logoUrl ? <img {...sx.avatarImage} src={logoUrl} alt={organizationName} /> : null}
          </Link>
        </div>
        <div {...sx.identity}>
          <div {...sx.header}>
            <Link
              to="/organizations/$organizationName"
              params={{ organizationName }}
              activeProps={{
                "aria-current": undefined,
                className: "black",
                "data-status": undefined,
              }}
              {...sx.titleLink}
            >
              {organizationName}
            </Link>
          </div>
          <div {...sx.description}>{organizationDescription(organization)}</div>
          <p {...sx.nameTag}>
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

function stringField(record: YoramRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function organizationDisplayName(record: YoramRecord): string {
  return stringField(record, "organizationName", stringField(record, "name", ""));
}

function organizationDescription(record: YoramRecord): string {
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

function organizationIsReadable(record: YoramRecord): boolean {
  for (const key of ["viewerCanRead", "canRead", "isReadable", "readable"]) {
    if (record[key] === false) {
      return false;
    }
  }
  return true;
}
