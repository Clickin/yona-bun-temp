import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { buildProtectedRedirect, readCurrentSession, signOut } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { currentSessionQueryOptions, protectedShellQueryOptions } from "@app/lib/queries";

export const Route = createFileRoute("/protected")({
  beforeLoad: async ({ location }) => {
    const redirectTarget = buildProtectedRedirect(await readCurrentSession(), location.href);
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(protectedShellQueryOptions()),
      context.queryClient.ensureQueryData(currentSessionQueryOptions()),
    ]),
  component: ProtectedRouteComponent,
});

function ProtectedRouteComponent() {
  const shell = useSuspenseQuery(protectedShellQueryOptions());
  const session = useSuspenseQuery(currentSessionQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = () => {
    setIsSigningOut(true);
    React.startTransition(() => {
      void (async () => {
        const result = await signOut();
        setCurrentSessionData(queryClient, result.session);
        await navigate({ to: "/" });
        setIsSigningOut(false);
      })().catch(() => {
        setIsSigningOut(false);
      });
    });
  };

  return (
    <section className="secret-grid">
      <article className="secret-panel">
        <strong>{shell.data.title}</strong>
        <p className="note">
          This route only renders after <code>beforeLoad</code> confirms the canonical session
          projection.
        </p>
        <div className="badge-row">
          <span className="badge">Actor: {session.data.userLabel}</span>
          <span className="badge">
            {session.data.isSiteAdmin ? "Site admin" : "Standard member"}
          </span>
        </div>
      </article>
      {shell.data.lanes.map((lane) => (
        <article className="secret-panel" key={lane}>
          <strong>{lane}</strong>
        </article>
      ))}
      <article className="secret-panel">
        <strong>Session mutation</strong>
        <div className="action-row">
          <button className="secondary-cta" onClick={handleSignOut} type="button">
            {isSigningOut ? "Signing out..." : "Clear Session"}
          </button>
        </div>
      </article>
    </section>
  );
}
