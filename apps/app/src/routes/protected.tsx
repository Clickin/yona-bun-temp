import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { protectedShellQueryOptions } from "@app/lib/queries";
import { buildProtectedRedirect, readDemoSession, signOutDemo } from "@app/lib/shell-data";

export const Route = createFileRoute("/protected")({
  beforeLoad: async ({ location }) => {
    const redirectTarget = buildProtectedRedirect(await readDemoSession(), location.href);
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(protectedShellQueryOptions()),
  component: ProtectedRouteComponent,
});

function ProtectedRouteComponent() {
  const shell = useSuspenseQuery(protectedShellQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = () => {
    setIsSigningOut(true);
    React.startTransition(() => {
      void (async () => {
        await signOutDemo();
        await router.invalidate();
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
          This route only renders after <code>beforeLoad</code> confirms the demo auth cookie.
        </p>
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
            {isSigningOut ? "Signing out..." : "Clear Demo Session"}
          </button>
        </div>
      </article>
    </section>
  );
}
