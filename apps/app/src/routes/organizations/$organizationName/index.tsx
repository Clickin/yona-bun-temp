import { Link, createFileRoute } from "@tanstack/react-router";
import { readOrganizationDetail } from "@app/lib/organization";

export const Route = createFileRoute("/organizations/$organizationName/")({
  loader: ({ params }) =>
    readOrganizationDetail({
      data: {
        organizationName: params.organizationName,
      },
    }),
  component: OrganizationDetailRouteComponent,
});

function OrganizationDetailRouteComponent() {
  const data = Route.useLoaderData();

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>{data.organizationName}</strong>
        <p className="note">{data.description ?? "No description yet."}</p>
        {data.viewerCanUpdate ? (
          <div className="link-row">
            <Link
              className="link-text"
              params={{ organizationName: data.organizationName }}
              to="/organizations/$organizationName/settings"
            >
              Edit settings
            </Link>
          </div>
        ) : null}
      </article>
    </section>
  );
}
