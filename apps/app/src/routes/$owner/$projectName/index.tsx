import { Link, createFileRoute } from "@tanstack/react-router";
import { readProjectDetail } from "@app/lib/project";

export const Route = createFileRoute("/$owner/$projectName/")({
  loader: ({ params }) =>
    readProjectDetail({
      data: {
        ownerName: params.owner,
        projectName: params.projectName,
      },
    }),
  component: ProjectDetailRouteComponent,
});

function ProjectDetailRouteComponent() {
  const data = Route.useLoaderData();

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>
          {data.ownerName}/{data.projectName}
        </strong>
        <div className="badge-row">
          <span className="badge">{data.projectScope}</span>
          {data.organizationName ? <span className="badge">org-owned</span> : null}
        </div>
        <p className="note">{data.overview ?? "No overview yet."}</p>
        {data.viewerCanUpdate ? (
          <div className="link-row">
            <Link
              className="link-text"
              params={{
                owner: data.ownerName,
                projectName: data.projectName,
              }}
              to="/$owner/$projectName/settings"
            >
              Edit settings
            </Link>
          </div>
        ) : null}
      </article>
    </section>
  );
}
