import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type SearchType =
  | "auto"
  | "issue"
  | "user"
  | "project"
  | "post"
  | "milestone"
  | "issue_comment"
  | "post_comment"
  | "review";

export const SEARCH_TYPES: SearchType[] = [
  "auto",
  "issue",
  "user",
  "project",
  "post",
  "milestone",
  "issue_comment",
  "post_comment",
  "review",
];

export type SearchScope = "global" | "organization" | "project";

export type SearchSnippet = {
  highlights: Array<{ end: number; start: number }>;
  text: string;
  truncated?: boolean;
};

export type SearchItem = {
  authorLabel: string;
  authorLoginId: string;
  avatarUrl?: string;
  createdLabel: string;
  dueDateUntilLabel?: string;
  href: string;
  id: string;
  number: string;
  originOwnerName?: string;
  originProjectName?: string;
  ownerName: string;
  projectName: string;
  projectLogoUrl?: string;
  reviewThreadOnPullRequest?: boolean;
  snippets: SearchSnippet[];
  state: string;
  title: string;
  type: SearchType;
  updatedLabel: string;
};

export type SearchCounts = {
  issueComments: number;
  issues: number;
  milestones: number;
  postComments: number;
  posts: number;
  projects: number;
  reviews: number;
  users: number;
};

export type SearchContext = {
  organizationName: string;
  ownerName: string;
  projectName: string;
};

export type SearchResponse = {
  context: SearchContext;
  counts: SearchCounts;
  items: SearchItem[];
  keyword: string;
  pageNum: number;
  pageSize: number;
  requestedSearchType: SearchType;
  scope: SearchScope;
  searchType: SearchType;
  totalCount: number;
};

export type SearchInput = {
  keyword: string;
  pageNum?: number;
  searchType: SearchType;
};

export type ProjectSearchInput = SearchInput & {
  ownerName: string;
  projectName: string;
};

export type OrganizationSearchInput = SearchInput & {
  organizationName: string;
};

export function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPES.includes(value as SearchType);
}

function searchQueryString(input: SearchInput): string {
  const query = new URLSearchParams();
  query.set("keyword", input.keyword);
  query.set("searchType", input.searchType);
  query.set("pageNum", String(input.pageNum || 1));
  return query.toString();
}

export function readGlobalSearch(runtimeConfig: RuntimeConfig, input: SearchInput) {
  return restFetch<SearchResponse>(runtimeConfig, `/search?${searchQueryString(input)}`);
}

export function readProjectSearch(runtimeConfig: RuntimeConfig, input: ProjectSearchInput) {
  return restFetch<SearchResponse>(
    runtimeConfig,
    `/projects/${encodeURIComponent(input.ownerName)}/${encodeURIComponent(
      input.projectName,
    )}/search?${searchQueryString(input)}`,
  );
}

export function readOrganizationSearch(
  runtimeConfig: RuntimeConfig,
  input: OrganizationSearchInput,
) {
  return restFetch<SearchResponse>(
    runtimeConfig,
    `/organizations/${encodeURIComponent(input.organizationName)}/search?${searchQueryString(
      input,
    )}`,
  );
}

function normalizedSearchKey(input: SearchInput) {
  return {
    keyword: input.keyword,
    pageNum: input.pageNum || 1,
    searchType: input.searchType,
  };
}

export function globalSearchQueryOptions(runtimeConfig: RuntimeConfig, input: SearchInput) {
  const keyInput = normalizedSearchKey(input);
  return queryOptions({
    placeholderData: keepPreviousData,
    queryFn: () => readGlobalSearch(runtimeConfig, keyInput),
    queryKey: apiQueryKeys.search.global(keyInput),
  });
}

export function projectSearchQueryOptions(runtimeConfig: RuntimeConfig, input: ProjectSearchInput) {
  const keyInput = normalizedSearchKey(input);
  return queryOptions({
    placeholderData: keepPreviousData,
    queryFn: () =>
      readProjectSearch(runtimeConfig, {
        ...keyInput,
        ownerName: input.ownerName,
        projectName: input.projectName,
      }),
    queryKey: apiQueryKeys.search.project(input.ownerName, input.projectName, keyInput),
  });
}

export function organizationSearchQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: OrganizationSearchInput,
) {
  const keyInput = normalizedSearchKey(input);
  return queryOptions({
    placeholderData: keepPreviousData,
    queryFn: () =>
      readOrganizationSearch(runtimeConfig, {
        ...keyInput,
        organizationName: input.organizationName,
      }),
    queryKey: apiQueryKeys.search.organization(input.organizationName, keyInput),
  });
}
