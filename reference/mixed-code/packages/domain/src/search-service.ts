import {
  searchInputSchema,
  searchPageSchema,
  type SearchInput,
  type SearchPage,
} from "@yona/contracts";
import { DomainNotFoundError, type DomainActor } from "./errors";
import { requireProjectReadAuthorization } from "./project-authorization";

interface SearchActorContext {
  actorId: null | number;
  isSiteAdmin: boolean;
}

export interface SearchServiceDeps {
  readOrganizationByName: typeof import("@yona/db").readOrganizationByName;
  readProjectAuthorization: typeof import("@yona/db").readProjectAuthorization;
  searchDocuments: typeof import("@yona/db").searchDocuments;
}

let defaultDepsPromise: null | Promise<SearchServiceDeps> = null;

async function loadDefaultDeps(): Promise<SearchServiceDeps> {
  if (!defaultDepsPromise) {
    defaultDepsPromise = import("@yona/db").then(
      ({ readOrganizationByName, readProjectAuthorization, searchDocuments }) => ({
        readOrganizationByName,
        readProjectAuthorization,
        searchDocuments,
      }),
    );
  }

  return defaultDepsPromise as Promise<SearchServiceDeps>;
}

function toSearchActorContext(actor: DomainActor): SearchActorContext {
  return {
    actorId: actor.actorId,
    isSiteAdmin: actor.isSiteAdmin,
  };
}

export async function search(
  actor: DomainActor,
  input: SearchInput,
  deps?: SearchServiceDeps,
): Promise<SearchPage> {
  const resolvedDeps = deps ?? (await loadDefaultDeps());
  const parsedInput = searchInputSchema.parse(input);

  if (parsedInput.scope === "organization") {
    const organization = await resolvedDeps.readOrganizationByName(parsedInput.organizationName);
    if (!organization) {
      throw new DomainNotFoundError("Organization not found.");
    }
  }

  if (parsedInput.scope === "project") {
    await requireProjectReadAuthorization(actor, parsedInput, resolvedDeps);
  }

  return searchPageSchema.parse(
    await resolvedDeps.searchDocuments(parsedInput, toSearchActorContext(actor)),
  );
}
