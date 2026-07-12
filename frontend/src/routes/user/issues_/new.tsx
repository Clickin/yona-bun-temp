import { Outlet, createFileRoute } from "@tanstack/react-router";

type UserDirectIssueSearch = {
  commentId: string;
};

export const Route = createFileRoute("/user/issues_/new")({
  component: Outlet,
  validateSearch(search: Record<string, unknown>): UserDirectIssueSearch {
    return {
      commentId: stringSearch(search.commentId),
    };
  },
});

function stringSearch(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "";
}
