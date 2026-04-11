import { z } from "zod";
import { authDisplayNameSchema, authLoginIdSchema } from "./auth";
import { organizationNameSchema } from "./org";
import { projectNameSchema, projectOwnerNameSchema } from "./project";

export const boundedSearchScopeValues = ["global", "organization", "project"] as const;

export const boundedSearchScopeSchema = z.enum(boundedSearchScopeValues);

export type BoundedSearchScope = z.infer<typeof boundedSearchScopeSchema>;

export const boundedSearchTypeValues = [
  "user",
  "project",
  "issue",
  "posting",
  "review_comment",
] as const;

export const boundedSearchTypeSchema = z.enum(boundedSearchTypeValues);

export type BoundedSearchType = z.infer<typeof boundedSearchTypeSchema>;

export const deferredSearchTypeValues = ["issue_comment", "posting_comment", "milestone"] as const;

export const deferredSearchTypeSchema = z.enum(deferredSearchTypeValues);

export type DeferredSearchType = z.infer<typeof deferredSearchTypeSchema>;

export const searchQuerySchema = z
  .string()
  .trim()
  .min(1, "Search query is required.")
  .max(255, "Search query must be at most 255 characters.");

export const searchCursorSchema = z.string().trim().min(1, "Search cursor is required.");

export const searchPageSizeSchema = z.number().int().min(1).max(100).default(20);

export const searchResultCountSchema = z
  .object({
    returned: z.number().int().min(0),
    total: z.number().int().min(0),
  })
  .strict();

export type SearchResultCount = z.infer<typeof searchResultCountSchema>;

const searchInputBaseSchema = z
  .object({
    cursor: searchCursorSchema.optional(),
    pageSize: searchPageSizeSchema,
    query: searchQuerySchema,
    types: z.array(boundedSearchTypeSchema).min(1).optional(),
  })
  .strict();

export const globalSearchInputSchema = searchInputBaseSchema.extend({
  scope: z.literal("global"),
});

export type GlobalSearchInput = z.infer<typeof globalSearchInputSchema>;

export const organizationSearchInputSchema = searchInputBaseSchema.extend({
  organizationName: organizationNameSchema,
  scope: z.literal("organization"),
});

export type OrganizationSearchInput = z.infer<typeof organizationSearchInputSchema>;

export const projectSearchInputSchema = searchInputBaseSchema.extend({
  ownerName: projectOwnerNameSchema,
  projectName: projectNameSchema,
  scope: z.literal("project"),
});

export type ProjectSearchInput = z.infer<typeof projectSearchInputSchema>;

export const searchInputSchema = z.discriminatedUnion("scope", [
  globalSearchInputSchema,
  organizationSearchInputSchema,
  projectSearchInputSchema,
]);

export type SearchInput = z.infer<typeof searchInputSchema>;

export const searchSnippetSchema = z.string().min(1);

export const userSearchResultSchema = z
  .object({
    loginId: authLoginIdSchema,
    scope: boundedSearchScopeSchema,
    snippets: z.array(searchSnippetSchema),
    type: z.literal("user"),
    userLabel: authDisplayNameSchema,
  })
  .strict();

export type UserSearchResult = z.infer<typeof userSearchResultSchema>;

export const projectSearchResultSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
    scope: boundedSearchScopeSchema,
    snippets: z.array(searchSnippetSchema),
    type: z.literal("project"),
  })
  .strict();

export type ProjectSearchResult = z.infer<typeof projectSearchResultSchema>;

export const issueSearchResultSchema = z
  .object({
    issueNumber: z.number().int().positive(),
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
    scope: boundedSearchScopeSchema,
    snippets: z.array(searchSnippetSchema),
    title: z.string().trim().min(1),
    type: z.literal("issue"),
  })
  .strict();

export type IssueSearchResult = z.infer<typeof issueSearchResultSchema>;

export const postingSearchResultSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    postingNumber: z.number().int().positive(),
    projectName: projectNameSchema,
    scope: boundedSearchScopeSchema,
    snippets: z.array(searchSnippetSchema),
    title: z.string().trim().min(1),
    type: z.literal("posting"),
  })
  .strict();

export type PostingSearchResult = z.infer<typeof postingSearchResultSchema>;

export const reviewCommentSearchResultSchema = z
  .object({
    ownerName: projectOwnerNameSchema,
    projectName: projectNameSchema,
    reviewCommentId: z.number().int().positive(),
    scope: boundedSearchScopeSchema,
    snippets: z.array(searchSnippetSchema),
    type: z.literal("review_comment"),
  })
  .strict();

export type ReviewCommentSearchResult = z.infer<typeof reviewCommentSearchResultSchema>;

export const searchResultSchema = z.discriminatedUnion("type", [
  userSearchResultSchema,
  projectSearchResultSchema,
  issueSearchResultSchema,
  postingSearchResultSchema,
  reviewCommentSearchResultSchema,
]);

export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchPageSchema = z
  .object({
    counts: searchResultCountSchema,
    items: z.array(searchResultSchema),
    nextCursor: searchCursorSchema.nullable(),
    pageSize: searchPageSizeSchema,
  })
  .strict();

export type SearchPage = z.infer<typeof searchPageSchema>;

export function makeSearchSnippets(
  contents: string,
  keyword: string,
  contextRadius: number,
): string[] {
  const normalizedContents = contents;
  const normalizedSearchContents = contents.toLocaleLowerCase();
  const normalizedKeyword = keyword.trim();
  const normalizedSearchKeyword = normalizedKeyword.toLocaleLowerCase();
  const radius = Math.max(0, Math.floor(contextRadius));

  if (normalizedContents.length === 0 || normalizedSearchKeyword.length === 0) {
    return [];
  }

  const ranges: Array<{ end: number; start: number }> = [];
  let searchStart = 0;

  while (searchStart < normalizedContents.length) {
    const matchIndex = normalizedSearchContents.indexOf(normalizedSearchKeyword, searchStart);
    if (matchIndex === -1) {
      break;
    }

    ranges.push({
      end: Math.min(
        normalizedContents.length,
        matchIndex + normalizedSearchKeyword.length + radius,
      ),
      start: Math.max(0, matchIndex - radius),
    });

    searchStart = matchIndex + normalizedSearchKeyword.length;
  }

  if (ranges.length === 0) {
    return [];
  }

  const mergedRanges: Array<{ end: number; start: number }> = [];
  for (const range of ranges) {
    const previousRange = mergedRanges[mergedRanges.length - 1];
    if (!previousRange || range.start > previousRange.end) {
      mergedRanges.push({ ...range });
      continue;
    }

    previousRange.end = Math.max(previousRange.end, range.end);
  }

  const snippets: string[] = [];
  for (const range of mergedRanges) {
    const snippet = normalizedContents.slice(range.start, range.end).trim();
    if (snippet.length > 0) {
      snippets.push(snippet);
    }
  }

  return snippets;
}
