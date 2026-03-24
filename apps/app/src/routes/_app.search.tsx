import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ContentCard, SidebarSection, SiteShell } from "@app/components/parity-shells";
import {
  boundedSearchTypeValues,
  type BoundedSearchType,
  type SearchResult,
} from "@yona/contracts";
import {
  boundedSearchRouteSearchSchema,
  buildBoundedSearchInput,
  normalizeBoundedSearchRouteSearch,
  readSearchPage,
  type BoundedSearchRouteSearch,
} from "@app/lib/search";
import { useTranslate } from "@app/lib/i18n-react";

const pageSizeOptions = [5, 10, 20, 50] as const;

export const Route = createFileRoute("/_app/search")({
  validateSearch: boundedSearchRouteSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const parsedSearch = deps as BoundedSearchRouteSearch;
    const request = buildBoundedSearchInput(parsedSearch);
    if (!request) {
      return {
        errorMessage: null,
        page: null,
      };
    }

    try {
      return {
        errorMessage: null,
        page: await readSearchPage({ data: request }),
      };
    } catch (error) {
      return {
        errorMessage: error instanceof Error ? error.message : null,
        page: null,
      };
    }
  },
  component: SearchRouteComponent,
});

function createEmptySearchState(): BoundedSearchRouteSearch {
  return normalizeBoundedSearchRouteSearch({
    pageSize: 20,
    scope: "global",
  });
}

function getSearchPrompt(search: BoundedSearchRouteSearch): "organization" | "project" | "query" | null {
  if (!search.query) {
    return "query";
  }

  if (search.scope === "organization" && !search.organizationName) {
    return "organization";
  }

  if (search.scope === "project" && (!search.ownerName || !search.projectName)) {
    return "project";
  }

  return null;
}

function buildSearchHref(search: BoundedSearchRouteSearch): string {
  const params = new URLSearchParams();
  params.set("pageSize", String(search.pageSize));
  params.set("scope", search.scope);

  if (search.query) {
    params.set("query", search.query);
  }

  if (search.cursor) {
    params.set("cursor", search.cursor);
  }

  if (search.organizationName) {
    params.set("organizationName", search.organizationName);
  }

  if (search.ownerName) {
    params.set("ownerName", search.ownerName);
  }

  if (search.projectName) {
    params.set("projectName", search.projectName);
  }

  for (const type of search.types ?? []) {
    params.append("types", type);
  }

  return `/search?${params.toString()}`;
}

function getResultKey(result: SearchResult): string {
  switch (result.type) {
    case "user":
      return `user-${result.loginId}`;
    case "project":
      return `project-${result.ownerName}-${result.projectName}`;
    case "issue":
      return `issue-${result.ownerName}-${result.projectName}-${result.issueNumber}`;
    case "posting":
      return `posting-${result.ownerName}-${result.projectName}-${result.postingNumber}`;
    case "review_comment":
      return `review-${result.ownerName}-${result.projectName}-${result.reviewCommentId}`;
  }
}

function SearchRouteComponent() {
  const search = Route.useSearch() as BoundedSearchRouteSearch;
  const loaderData = Route.useLoaderData();
  const t = useTranslate();
  const [scopeInput, setScopeInput] = React.useState(search.scope);

  React.useEffect(() => {
    setScopeInput(search.scope);
  }, [search.scope]);

  const typeLabels: Record<BoundedSearchType, string> = {
    issue: t("search.menu.issues"),
    posting: t("search.menu.boards"),
    project: t("search.menu.projects"),
    review_comment: t("app.search.reviewComments"),
    user: t("search.menu.users"),
  };

  const searchPrompt = getSearchPrompt(search);
  const clearHref = buildSearchHref(createEmptySearchState());
  const nextPageHref = loaderData.page?.nextCursor
    ? buildSearchHref(
        normalizeBoundedSearchRouteSearch({
          ...search,
          cursor: loaderData.page.nextCursor,
        }),
      )
    : null;

  return (
    <SiteShell
      eyebrow={t("title.search")}
      sidebar={
        <SidebarSection title={t("title.search")}>
          <form action="/search" className="form-grid" method="get">
            <label className="field">
              <span>{t("site.project.filter")}</span>
              <input
                defaultValue={search.query ?? ""}
                name="query"
                placeholder={t("site.project.filter")}
                type="text"
              />
            </label>
            <label className="field">
              <span>{t("title.search")}</span>
              <select
                defaultValue={search.scope}
                name="scope"
                onChange={(event) => setScopeInput(event.target.value as BoundedSearchRouteSearch["scope"])}
              >
                <option value="global">{t("search.scope.all")}</option>
                <option value="organization">{t("search.scope.group")}</option>
                <option value="project">{t("search.scope.project")}</option>
              </select>
            </label>
            {scopeInput === "organization" ? (
              <label className="field">
                <span>{t("app.search.organization")}</span>
                <input
                  defaultValue={search.organizationName ?? ""}
                  name="organizationName"
                  placeholder={t("organization.name.placeholder")}
                  type="text"
                />
              </label>
            ) : null}
            {scopeInput === "project" ? (
              <>
                <label className="field">
                  <span>{t("app.search.owner")}</span>
                  <input
                    defaultValue={search.ownerName ?? ""}
                    name="ownerName"
                    placeholder={t("project.owner")}
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>{t("app.search.project")}</span>
                  <input
                    defaultValue={search.projectName ?? ""}
                    name="projectName"
                    placeholder={t("project.name.placeholder")}
                    type="text"
                  />
                </label>
              </>
            ) : null}
            <label className="field">
              <span>{t("app.search.pageSize")}</span>
              <select defaultValue={String(search.pageSize)} name="pageSize">
                {pageSizeOptions.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>{t("app.search.typeFilters")}</span>
              <div className="form-grid">
                {boundedSearchTypeValues.map((type) => (
                  <label className="note" key={type}>
                    <input
                      defaultChecked={search.types?.includes(type) ?? false}
                      name="types"
                      type="checkbox"
                      value={type}
                    />{" "}
                    {typeLabels[type]}
                  </label>
                ))}
              </div>
            </div>
            <div className="action-row">
              <button className="cta" type="submit">
                {t("title.search")}
              </button>
              <a className="secondary-cta" href={clearHref}>
                {t("app.search.clear")}
              </a>
            </div>
          </form>
        </SidebarSection>
      }
      title={t("title.search")}
    >
      <ContentCard title={t("title.search")}>
        <div className="badge-row">
          <span className="badge">{t("app.search.scopeBadge", search.scope)}</span>
          <span className="badge">{t("app.search.pageSizeBadge", search.pageSize)}</span>
          <span className="badge">
            {t(
              "app.search.typesBadge",
              search.types?.length ? search.types.map((type) => typeLabels[type]).join(", ") : t("app.search.allTypes"),
            )}
          </span>
        </div>
        {loaderData.page ? (
          <div className="badge-row">
            <span className="badge">{t("app.search.returned", loaderData.page.counts.returned)}</span>
            <span className="badge">{t("app.search.total", loaderData.page.counts.total)}</span>
            <span className="badge">{t("app.search.cursor", search.cursor ?? t("app.search.initialCursor"))}</span>
          </div>
        ) : null}
        {searchPrompt === "query" ? <p className="note">{t("app.search.queryHelp")}</p> : null}
        {searchPrompt === "organization" ? (
          <p className="note">{t("app.search.scopeHelp.organization")}</p>
        ) : null}
        {searchPrompt === "project" ? <p className="note">{t("app.search.scopeHelp.project")}</p> : null}
        {loaderData.errorMessage ? <p className="note error-note">{loaderData.errorMessage}</p> : null}
        {loaderData.page && loaderData.page.items.length === 0 ? (
          <p className="note">{t("title.no.results")}</p>
        ) : null}
      </ContentCard>
      {loaderData.page?.items.map((result) => (
        <ContentCard key={getResultKey(result)} title={typeLabels[result.type]}>
          <p className="note">
            <ResultHeadline result={result} />
          </p>
          <p className="note">{t("app.search.scopeBadge", result.scope)}</p>
          {result.snippets.length > 0 ? (
            result.snippets.map((snippet) => (
              <p className="note" key={`${getResultKey(result)}-${snippet}`}>
                {snippet}
              </p>
            ))
          ) : (
            <p className="note">{t("app.search.noSnippet")}</p>
          )}
        </ContentCard>
      ))}
      {nextPageHref ? (
        <div className="action-row">
          <a className="secondary-cta" href={nextPageHref}>
            {t("app.search.nextPage")}
          </a>
        </div>
      ) : null}
    </SiteShell>
  );
}

function ResultHeadline({ result }: { result: SearchResult }) {
  const t = useTranslate();

  switch (result.type) {
    case "user":
      return (
        <Link className="link-text" params={{ loginId: result.loginId }} to="/users/$loginId">
          {result.userLabel} ({result.loginId})
        </Link>
      );
    case "project":
      return (
        <Link
          className="link-text"
          params={{ owner: result.ownerName, projectName: result.projectName }}
          to="/$owner/$projectName"
        >
          {result.ownerName}/{result.projectName}
        </Link>
      );
    case "issue":
      return (
        <Link
          className="link-text"
          params={{
            issueNumber: String(result.issueNumber),
            owner: result.ownerName,
            projectName: result.projectName,
          }}
          to="/$owner/$projectName/issues/$issueNumber"
        >
          #{result.issueNumber} {result.title}
        </Link>
      );
    case "posting":
      return (
        <Link
          className="link-text"
          params={{
            owner: result.ownerName,
            postNumber: String(result.postingNumber),
            projectName: result.projectName,
          }}
          to="/$owner/$projectName/discussions/$postNumber"
        >
          #{result.postingNumber} {result.title}
        </Link>
      );
    case "review_comment":
      return <>{t("app.search.result.reviewComment", result.reviewCommentId, result.ownerName, result.projectName)}</>;
  }
}
