import type { ProjectScope } from "@yona/contracts";

export interface IssueEditFacts {
  isActorAssignee: boolean;
  isActorAuthor: boolean;
  isProjectManager: boolean;
  isProjectMember: boolean;
  isSiteAdmin: boolean;
  projectScope: ProjectScope;
}

export type IssueEditReason =
  | "issue-assignee-edit"
  | "issue-author-edit"
  | "issue-edit-denied"
  | "project-manager-edit"
  | "project-member-edit"
  | "site-admin-edit";

export interface IssueEditDecision {
  allowed: boolean;
  reason: IssueEditReason;
}

export function authorizeIssueEdit(facts: IssueEditFacts): IssueEditDecision {
  if (facts.isSiteAdmin) {
    return {
      allowed: true,
      reason: "site-admin-edit",
    };
  }

  if (facts.isProjectManager) {
    return {
      allowed: true,
      reason: "project-manager-edit",
    };
  }

  if (facts.isActorAuthor) {
    return {
      allowed: true,
      reason: "issue-author-edit",
    };
  }

  if (facts.isActorAssignee) {
    return {
      allowed: true,
      reason: "issue-assignee-edit",
    };
  }

  if (facts.isProjectMember) {
    return {
      allowed: true,
      reason: "project-member-edit",
    };
  }

  return {
    allowed: false,
    reason: "issue-edit-denied",
  };
}
