import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { readProjectContainerQueryOptions } from "../../../api/org-project";
import { currentSessionQueryOptions } from "../../../api/session";
import { isSearchType, projectSearchQueryOptions, type SearchType } from "../../../api/search";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";
import {
  DefaultSearchErrorBody,
  emptySearchResult,
  isDefaultForbiddenError,
  isDefaultInternalServerError,
  isRequestTextTooLargeError,
  LegacySearchBody,
  RequestTextTooLargeErrorBody,
} from "../../-search-screen";
import { ProjectHeader, ProjectMenu } from "../$projectName";

type ProjectSearchRouteSearch = {
  keyword: string;
  pageNum: number;
  routeInvalid: boolean;
  searchType: SearchType;
};

export const Route = createFileRoute("/$ownerName/$projectName/search")({
  component: ProjectSearchRoute,
  validateSearch: (search: Record<string, unknown>): ProjectSearchRouteSearch => {
    const rawSearchType = typeof search.searchType === "string" ? search.searchType : "";
    const rawKeyword = typeof search.keyword === "string" ? search.keyword : "";
    const rawPageNum =
      typeof search.pageNum === "number"
        ? search.pageNum
        : typeof search.pageNum === "string"
          ? Number.parseInt(search.pageNum, 10)
          : 1;
    const validSearchType = isSearchType(rawSearchType);
    return {
      keyword: rawKeyword,
      pageNum: Number.isFinite(rawPageNum) && rawPageNum > 0 ? rawPageNum : 1,
      routeInvalid: rawKeyword.length === 0 || !validSearchType || rawSearchType === "project",
      searchType: validSearchType && rawSearchType !== "project" ? rawSearchType : "auto",
    };
  },
});

function ProjectSearchRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <ProjectSearchScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ProjectSearchScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const search = Route.useSearch();
  const projectQuery = useQuery({
    ...readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName }),
    enabled: !search.routeInvalid,
  });
  const currentSessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const hasKeyword = search.keyword.length > 0;
  const searchQuery = useQuery({
    ...projectSearchQueryOptions(runtimeConfig, {
      ...search,
      ownerName,
      projectName,
    }),
    enabled: hasKeyword && !search.routeInvalid,
  });
  const result =
    searchQuery.data ??
    emptySearchResult({
      ...search,
      scope: "project",
    });

  if (isRequestTextTooLargeError(searchQuery.error)) {
    return <RequestTextTooLargeErrorBody />;
  }

  if (search.routeInvalid) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.badrequest"
        runtimeConfig={runtimeConfig}
        ybtnClassName="ybtn ybtn-info"
      />
    );
  }

  if (isDefaultForbiddenError(searchQuery.error)) {
    if (!projectQuery.data) {
      return null;
    }

    return (
      <>
        <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
        <ProjectMenu active="home" basePath={runtimeConfig.basePath} project={projectQuery.data} />
        <ProjectSearchForbiddenErrorBody
          isAnonymous={isAnonymousViewer(currentSessionQuery.data)}
          redirectUrl={legacyProjectSearchRedirectUrl(
            runtimeConfig.basePath,
            ownerName,
            projectName,
            search,
          )}
        />
      </>
    );
  }

  if (isDefaultInternalServerError(searchQuery.error)) {
    return (
      <DefaultSearchErrorBody
        iconClassName="ico-404"
        messageKey="error.internalServerError"
        runtimeConfig={runtimeConfig}
      />
    );
  }

  if (!projectQuery.data) {
    return null;
  }

  return (
    <>
      <ProjectHeader basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <ProjectMenu basePath={runtimeConfig.basePath} project={projectQuery.data} />
      <LegacySearchBody
        includeProjectCategory={false}
        result={result}
        runtimeConfig={runtimeConfig}
        searchPath={`/${ownerName}/${projectName}/search`}
      />
    </>
  );
}

function ProjectSearchForbiddenErrorBody({
  isAnonymous,
  redirectUrl,
}: {
  isAnonymous: boolean;
  redirectUrl: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="error-wrap">
          <i className="ico ico-err2"></i>
          <p>{t("error.forbidden")}</p>
          {isAnonymous ? (
            <Link className="ybtn ybtn-primary" search={{ redirectUrl }} to="/users/loginform">
              {t("title.login")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function isAnonymousViewer(session: unknown) {
  return (
    typeof session === "object" &&
    session !== null &&
    "isAnonymous" in session &&
    session.isAnonymous === true
  );
}

function legacyProjectSearchRedirectUrl(
  basePath: string,
  ownerName: string,
  projectName: string,
  search: ProjectSearchRouteSearch,
) {
  const params = new URLSearchParams();
  params.set("keyword", search.keyword);
  params.set("searchType", search.searchType);
  params.set("pageNum", String(search.pageNum));
  return `${prefixBasePath(basePath, `/${ownerName}/${projectName}/search`)}?${params.toString()}`;
}
