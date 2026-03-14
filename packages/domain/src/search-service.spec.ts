import { describe, expect, it, vi } from "vitest";
import { search } from "./search-service";
import { DomainNotFoundError, DomainPermissionError } from "./errors";

const authenticatedActor = {
  actorId: 55,
  isAnonymous: false,
  isSiteAdmin: false,
  loginId: "searcher",
  name: "Searcher",
};

describe("search service", () => {
  it("parses global search and forwards actor visibility context to the db helper", async () => {
    const deps = {
      readOrganizationByName: vi.fn(),
      readProjectAuthorization: vi.fn(),
      searchDocuments: vi.fn().mockResolvedValue({
        counts: {
          returned: 1,
          total: 1,
        },
        items: [
          {
            loginId: "searcher",
            scope: "global",
            snippets: ["search keyword body"],
            type: "user",
            userLabel: "Searcher",
          },
        ],
        nextCursor: null,
        pageSize: 10,
      }),
    };

    await expect(
      search(
        authenticatedActor,
        {
          pageSize: 10,
          query: "  search keyword  ",
          scope: "global",
        },
        deps,
      ),
    ).resolves.toEqual({
      counts: {
        returned: 1,
        total: 1,
      },
      items: [
        {
          loginId: "searcher",
          scope: "global",
          snippets: ["search keyword body"],
          type: "user",
          userLabel: "Searcher",
        },
      ],
      nextCursor: null,
      pageSize: 10,
    });
    expect(deps.searchDocuments).toHaveBeenCalledWith(
      {
        pageSize: 10,
        query: "search keyword",
        scope: "global",
      },
      {
        actorId: 55,
        isSiteAdmin: false,
      },
    );
  });

  it("requires the organization scope target to exist", async () => {
    const deps = {
      readOrganizationByName: vi.fn().mockResolvedValue(null),
      readProjectAuthorization: vi.fn(),
      searchDocuments: vi.fn(),
    };

    await expect(
      search(
        authenticatedActor,
        {
          organizationName: "labs",
          pageSize: 10,
          query: "alpha",
          scope: "organization",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
    expect(deps.searchDocuments).not.toHaveBeenCalled();
  });

  it("reuses project read authorization before querying project-scoped results", async () => {
    const deps = {
      readOrganizationByName: vi.fn(),
      readProjectAuthorization: vi.fn().mockResolvedValue({
        project: {
          id: 77,
          ownerName: "yona",
          projectName: "project-yona",
          projectScope: "private",
        },
        viewer: {
          isOrganizationAdmin: false,
          isOrganizationMember: false,
          isProjectManager: false,
          isProjectMember: false,
        },
      }),
      searchDocuments: vi.fn().mockResolvedValue({
        counts: {
          returned: 0,
          total: 0,
        },
        items: [],
        nextCursor: null,
        pageSize: 5,
      }),
    };
    const anonymousActor = {
      actorId: null,
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: null,
    };

    await expect(
      search(
        anonymousActor,
        {
          ownerName: "yona",
          pageSize: 5,
          projectName: "project-yona",
          query: "alpha",
          scope: "project",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(DomainPermissionError);
    expect(deps.searchDocuments).not.toHaveBeenCalled();
  });
});
