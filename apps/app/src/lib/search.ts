import { createServerFn } from "@tanstack/react-start";
import {
  boundedSearchScopeSchema,
  boundedSearchTypeSchema,
  globalSearchInputSchema,
  organizationSearchInputSchema,
  projectSearchInputSchema,
  searchInputSchema,
  searchPageSchema,
  type SearchInput,
} from "@yona/contracts";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 20;

const optionalTrimmedStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}, z.string().optional());

const routeSearchTypesSchema = z
  .preprocess((value) => {
    if (typeof value === "string") {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }

    return undefined;
  }, z.array(boundedSearchTypeSchema).min(1).optional())
  .catch(undefined);

export const boundedSearchRouteSearchSchema = z.object({
  cursor: optionalTrimmedStringSchema,
  organizationName: optionalTrimmedStringSchema,
  ownerName: optionalTrimmedStringSchema,
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  projectName: optionalTrimmedStringSchema,
  query: optionalTrimmedStringSchema,
  scope: boundedSearchScopeSchema.catch("global").default("global"),
  types: routeSearchTypesSchema,
});

export type BoundedSearchRouteSearch = z.infer<typeof boundedSearchRouteSearchSchema>;

export function normalizeBoundedSearchRouteSearch(
  input: Partial<BoundedSearchRouteSearch>,
): BoundedSearchRouteSearch {
  return boundedSearchRouteSearchSchema.parse(input);
}

export function buildBoundedSearchInput(search: BoundedSearchRouteSearch): SearchInput | null {
  if (!search.query) {
    return null;
  }

  const inputBase = {
    cursor: search.cursor,
    pageSize: search.pageSize,
    query: search.query,
    types: search.types,
  };

  switch (search.scope) {
    case "global":
      return globalSearchInputSchema.parse({
        ...inputBase,
        scope: "global",
      });
    case "organization":
      if (!search.organizationName) {
        return null;
      }

      return organizationSearchInputSchema.parse({
        ...inputBase,
        organizationName: search.organizationName,
        scope: "organization",
      });
    case "project":
      if (!search.ownerName || !search.projectName) {
        return null;
      }

      return projectSearchInputSchema.parse({
        ...inputBase,
        ownerName: search.ownerName,
        projectName: search.projectName,
        scope: "project",
      });
  }
}

export const readSearchPage = createServerFn({ method: "GET" })
  .inputValidator(searchInputSchema)
  .handler(async ({ data }) => {
    const { readServerSearchPage } = await import("./search-trpc.server");
    return searchPageSchema.parse(await readServerSearchPage(data));
  });
