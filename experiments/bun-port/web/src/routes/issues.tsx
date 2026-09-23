import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { getServerIssueList } from "../server-data";
import { issueListOptions, trpcClient } from "../data";

export const Route = createFileRoute("/issues")({
  ssr: "data-only",
  headers: () => ({ "Cache-Control": "private, no-store" }),
  loader: async ({ context }) => {
    const result =
      typeof window === "undefined"
        ? await getServerIssueList()
        : await trpcClient.issue.homeList.query();
    if (!result.viewer.userId) throw redirect({ to: "/login" });
    context.queryClient.setQueryData(issueListOptions(result.viewer).queryKey, result.items);
    return { viewer: result.viewer };
  },
  component: IssueList,
});

function IssueList() {
  const { viewer } = Route.useLoaderData();
  const { data: issues } = useSuspenseQuery(issueListOptions(viewer));
  return (
    <main>
      <h1>Issues</h1>
      <p data-testid="viewer">
        {viewer.userId} / {viewer.projectId}
      </p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id.toString()}>
            <Link
              to="/issues/$id"
              params={{ id: issue.id.toString() }}
              search={{ projectId: viewer.projectId }}
            >
              {issue.number.toString()}: {issue.title}
            </Link>
          </li>
        ))}
      </ul>
      <Outlet />
    </main>
  );
}
