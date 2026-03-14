import * as React from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
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

const pageSizeOptions = [5, 10, 20, 50] as const;

const typeLabels: Record<BoundedSearchType, string> = {
  issue: "Issues",
  posting: "Discussions",
  project: "Projects",
  review_comment: "Review comments",
  user: "Users",
};

export const Route = createFileRoute("/search")({
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
        errorMessage: error instanceof Error ? error.message : "Search failed.",
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

function getSearchPrompt(search: BoundedSearchRouteSearch): string {
  if (!search.query) {
    return "Enter a keyword to search the bounded internal surface.";
  }

  if (search.scope === "organization" && !search.organizationName) {
    return "Enter an organization name to search within that organization.";
  }

  if (search.scope === "project" && (!search.ownerName || !search.projectName)) {
    return "Enter both owner and project names to search within a project.";
  }

  return "";
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
  const [scopeInput, setScopeInput] = React.useState(search.scope);

  React.useEffect(() => {
    setScopeInput(search.scope);
  }, [search.scope]);

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
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Search</strong>
        <p className="note">
          This bounded internal route only searches <code>user</code>, <code>project</code>,
          <code>issue</code>, <code>posting</code>, and <code>review_comment</code>.
        </p>
        <form action="/search" className="form-grid" method="get">
          <label className="field">
            <span>Query</span>
            <input
              defaultValue={search.query ?? ""}
              name="query"
              placeholder="Search keyword"
              type="text"
            />
          </label>
          <label className="field">
            <span>Scope</span>
            <select
              defaultValue={search.scope}
              name="scope"
              onChange={(event) =>
                setScopeInput(event.target.value as BoundedSearchRouteSearch["scope"])
              }
            >
              <option value="global">Global</option>
              <option value="organization">Organization</option>
              <option value="project">Project</option>
            </select>
          </label>
          {scopeInput === "organization" ? (
            <label className="field">
              <span>Organization</span>
              <input
                defaultValue={search.organizationName ?? ""}
                name="organizationName"
                placeholder="labs"
                type="text"
              />
            </label>
          ) : null}
          {scopeInput === "project" ? (
            <>
              <label className="field">
                <span>Owner</span>
                <input
                  defaultValue={search.ownerName ?? ""}
                  name="ownerName"
                  placeholder="yona"
                  type="text"
                />
              </label>
              <label className="field">
                <span>Project</span>
                <input
                  defaultValue={search.projectName ?? ""}
                  name="projectName"
                  placeholder="projectYobi"
                  type="text"
                />
              </label>
            </>
          ) : null}
          <label className="field">
            <span>Page size</span>
            <select defaultValue={String(search.pageSize)} name="pageSize">
              {pageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Type filters</span>
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
              Search
            </button>
            <a className="secondary-cta" href={clearHref}>
              Clear
            </a>
          </div>
        </form>
      </article>

      <article className="panel">
        <strong>Results</strong>
        <div className="badge-row">
          <span className="badge">Scope: {search.scope}</span>
          <span className="badge">Page size: {search.pageSize}</span>
          <span className="badge">
            Types:{" "}
            {search.types?.length
              ? search.types.map((type) => typeLabels[type]).join(", ")
              : "All bounded types"}
          </span>
        </div>
        {loaderData.page ? (
          <div className="badge-row">
            <span className="badge">Returned: {loaderData.page.counts.returned}</span>
            <span className="badge">Total: {loaderData.page.counts.total}</span>
            <span className="badge">Cursor: {search.cursor ?? "initial"}</span>
          </div>
        ) : null}
        {searchPrompt ? <p className="note">{searchPrompt}</p> : null}
        {loaderData.errorMessage ? (
          <p className="note error-note">{loaderData.errorMessage}</p>
        ) : null}
        {loaderData.page && loaderData.page.items.length === 0 ? (
          <p className="note">No results match this bounded search request.</p>
        ) : null}
        {loaderData.page?.items.map((result) => (
          <article className="panel" key={getResultKey(result)}>
            <strong>{typeLabels[result.type]}</strong>
            <p className="note">
              <ResultHeadline result={result} />
            </p>
            <p className="note">Scope: {result.scope}</p>
            {result.snippets.length > 0 ? (
              result.snippets.map((snippet) => (
                <p className="note" key={`${getResultKey(result)}-${snippet}`}>
                  {snippet}
                </p>
              ))
            ) : (
              <p className="note">No snippet available for this result.</p>
            )}
          </article>
        ))}
        {nextPageHref ? (
          <div className="action-row">
            <a className="secondary-cta" href={nextPageHref}>
              Next page
            </a>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function ResultHeadline({ result }: { result: SearchResult }) {
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
      return (
        <>
          Review comment #{result.reviewCommentId} in {result.ownerName}/{result.projectName}
        </>
      );
  }
}
