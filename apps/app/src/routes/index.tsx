import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { publicShellQueryOptions } from "@app/lib/queries";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicShellQueryOptions()),
  component: HomeRouteComponent,
});

function HomeRouteComponent() {
  const shell = useSuspenseQuery(publicShellQueryOptions());

  return (
    <section className="panel-grid">
      <article className="panel">
        <strong>{shell.data.headline}</strong>
        <p className="note">{shell.data.summary}</p>
      </article>
      {shell.data.workstreams.map((workstream) => (
        <article className="panel" key={workstream}>
          <strong>{workstream}</strong>
          <p className="note">
            Loader prefetches this card on the server, then the component reads it through
            <code> useSuspenseQuery </code> without a second source of truth.
          </p>
        </article>
      ))}
    </section>
  );
}
