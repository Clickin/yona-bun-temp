import { describe, expect, it } from "vitest";
import { authorizeIssueEdit } from "./issue-authorization";

function facts(overrides: Partial<Parameters<typeof authorizeIssueEdit>[0]> = {}) {
  return {
    isActorAssignee: false,
    isActorAuthor: false,
    isProjectManager: false,
    isProjectMember: false,
    isSiteAdmin: false,
    projectScope: "private" as const,
    ...overrides,
  };
}

describe("issue edit authorization exemplar", () => {
  it("preserves the first edit matrix from IssueAppTest", () => {
    expect(authorizeIssueEdit(facts({ isActorAuthor: true }))).toEqual({
      allowed: true,
      reason: "issue-author-edit",
    });
    expect(authorizeIssueEdit(facts({ isActorAssignee: true }))).toEqual({
      allowed: true,
      reason: "issue-assignee-edit",
    });
    expect(authorizeIssueEdit(facts({ isProjectManager: true, isProjectMember: true }))).toEqual({
      allowed: true,
      reason: "project-manager-edit",
    });
    expect(authorizeIssueEdit(facts({ isProjectMember: true }))).toEqual({
      allowed: true,
      reason: "project-member-edit",
    });
    expect(authorizeIssueEdit(facts({ isSiteAdmin: true }))).toEqual({
      allowed: true,
      reason: "site-admin-edit",
    });
    expect(authorizeIssueEdit(facts({ projectScope: "public" }))).toEqual({
      allowed: false,
      reason: "issue-edit-denied",
    });
  });
});
