import { createFileRoute } from "@tanstack/react-router";
import { readPublicUserProfile } from "@app/lib/me";

export const Route = createFileRoute("/users/$loginId")({
  loader: ({ params }) =>
    readPublicUserProfile({
      data: {
        loginId: params.loginId,
      },
    }),
  component: PublicUserProfileRouteComponent,
});

function PublicUserProfileRouteComponent() {
  const data = Route.useLoaderData();

  return (
    <section className="panel-grid">
      <article className="panel">
        <strong>{data.userLabel}</strong>
        <p className="note">@{data.loginId}</p>
        <p className="note">
          joined: {data.joinedAt ? data.joinedAt.toISOString().slice(0, 10) : "unknown"}
        </p>
      </article>
    </section>
  );
}
