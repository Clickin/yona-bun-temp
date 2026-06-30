import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { listOrganizationsQueryOptions } from "../api/org-project";
import type { YonaRecord } from "../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type OrgsSearch = {
  filter: string;
};

type OrganizationDirectoryItem = YonaRecord & {
  createdLabel?: string;
  createdTitle?: string;
  description?: string;
  logoUrl?: string;
  organizationName?: string;
};

export const Route = createFileRoute("/orgs")({
  component: OrgsRoute,
  validateSearch: (search: Record<string, unknown>): OrgsSearch => ({
    filter: typeof search.filter === "string" ? search.filter : "",
  }),
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
  const { filter } = Route.useSearch();
  const { t } = useLegacyMessages();
  const organizationsQuery = useQuery(listOrganizationsQueryOptions(runtimeConfig));
  const organizations = organizationItems(organizationsQuery.data);
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
                <a href={prefixBasePath(runtimeConfig.basePath, "/projects")}>
                  {t("project.public")} {t("title.projectList")}
                </a>
              </li>
              <li className="active">
                <a href={prefixBasePath(runtimeConfig.basePath, "/orgs")}>
                  {t("title.organization.list")}
                </a>
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
                    basePath={runtimeConfig.basePath}
                    key={organization.organizationName ?? ""}
                    organization={organization}
                  />
                ))}
              </ul>
              <div id="pagination"></div>
            </>
          )}
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function OrganizationListItem({
  basePath,
  organization,
}: {
  basePath: string;
  organization: OrganizationDirectoryItem;
}) {
  const organizationName = stringField(organization, "organizationName", "");
  const organizationHref = prefixBasePath(basePath, `/organizations/${organizationName}`);
  const logoUrl = stringField(
    organization,
    "logoUrl",
    "/assets/images/organization_default_logo.png",
  );
  const createdLabel = stringField(organization, "createdLabel", "");
  const createdTitle = stringField(organization, "createdTitle", createdLabel);

  return (
    <li className="project">
      <div className="info-wrap">
        <div className="owner-avatar-wrap">
          <a href={organizationHref}>
            <img src={logoUrl} alt={organizationName} />
          </a>
        </div>
        <div style={{ float: "left" }}>
          <div className="header">
            <a href={organizationHref} className="black">
              {organizationName}
            </a>
          </div>
          <div className="desc">{stringField(organization, "description", "")}</div>
          <p className="name-tag">
            created <strong title={createdTitle}>{createdLabel}</strong>
          </p>
        </div>
      </div>
    </li>
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

function stringField(record: YonaRecord, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
