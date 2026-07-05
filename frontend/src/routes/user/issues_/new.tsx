import { createFileRoute } from "@tanstack/react-router";
import { DirectIssueFormRouteScreen } from "../issues/-direct-issue-form-screen";

type UserDirectIssueSearch = {
  commentId: string;
};

export const Route = createFileRoute("/user/issues_/new")({
  component: UserDirectIssueFormRoute,
  validateSearch(search: Record<string, unknown>): UserDirectIssueSearch {
    return {
      commentId: stringSearch(search.commentId),
    };
  },
});

function UserDirectIssueFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { commentId } = Route.useSearch();

  return <DirectIssueFormRouteScreen commentId={commentId} runtimeConfig={runtimeConfig} />;
}

function stringSearch(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "";
}
