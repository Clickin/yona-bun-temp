import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getServerIssue } from "../server-data";
import { issueOptions, trpcClient } from "../data";

export const Route = createFileRoute("/issues/$id")({
  validateSearch: z.object({ projectId: z.string().min(1).max(80) }),
  ssr: "data-only",
  headers: () => ({ "Cache-Control": "private, no-store" }),
  loaderDeps: ({ search }) => ({ projectId: search.projectId }),
  loader: async ({ context, params, deps }) => {
    const result =
      typeof window === "undefined"
        ? await getServerIssue({ data: { projectId: deps.projectId, id: params.id } })
        : await Promise.all([
            trpcClient.viewer.query(),
            trpcClient.issue.read.query({ projectId: deps.projectId, id: BigInt(params.id) }),
          ]).then(([viewer, issue]) => ({ viewer, issue }));
    if (!result.viewer.userId) throw redirect({ to: "/login" });
    context.queryClient.setQueryData(issueOptions(result.viewer, params.id).queryKey, result.issue);
    return { viewer: result.viewer };
  },
  component: IssueDetail,
});

function IssueDetail() {
  const { id } = Route.useParams();
  const { viewer } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const options = issueOptions(viewer, id);
  const { data: issue } = useSuspenseQuery(options);
  const update = useMutation({
    mutationFn: () =>
      trpcClient.issue.update.mutate({
        projectId: viewer.projectId,
        id: issue.id,
        title: "Updated through tRPC </script><script>window.__bunXss='executed'</script>",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: options.queryKey }),
        queryClient.invalidateQueries({
          queryKey: ["issues", "list", viewer.userId, viewer.projectId],
        }),
      ]);
    },
  });

  return (
    <main>
      <Link to="/issues">Back to issues</Link>
      <p data-testid="viewer">
        {viewer.userId} / {viewer.projectId}
      </p>
      <h1 data-testid="issue-title">{issue.title}</h1>
      <p data-testid="issue-id">{issue.id.toString()}</p>
      <p data-testid="issue-id-type">{typeof issue.id}</p>
      <p data-testid="issue-created-at">{issue.createdAt.toISOString()}</p>
      <p data-testid="issue-date-type">
        {issue.createdAt instanceof Date ? "Date" : typeof issue.createdAt}
      </p>
      <p data-testid="issue-created-at-precise">{issue.createdAtPrecise}</p>
      <p data-testid="issue-body">{issue.body === null ? "NULL" : issue.body}</p>
      <p data-testid="issue-optional">
        {issue.optionalSummary === undefined ? "undefined" : issue.optionalSummary}
      </p>
      <button type="button" disabled={update.isPending} onClick={() => update.mutate()}>
        Update title
      </button>
      {update.isError ? <p role="alert">Issue update failed</p> : null}
    </main>
  );
}
