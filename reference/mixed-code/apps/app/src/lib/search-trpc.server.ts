import { type SearchInput } from "@yona/contracts";
import { deleteCookie, getCookie, setResponseStatus } from "@tanstack/react-start/server";
import { createSearchCaller } from "./search-trpc";

export function createServerSearchCaller() {
  return createSearchCaller({
    deleteCookie,
    getCookie,
    setResponseStatus,
  });
}

export async function readServerSearchPage(input: SearchInput) {
  const { runMigrations } = await import("../../../../reference/mixed-code/packages/db/src/migrator");

  await runMigrations();
  return createServerSearchCaller().search(input);
}
