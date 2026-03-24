import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { buildProtectedRedirect } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { currentSessionQueryOptions, protectedShellQueryOptions } from "@app/lib/queries";

export const Route = createFileRoute("/protected")({
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(protectedShellQueryOptions()),
      context.queryClient.ensureQueryData(currentSessionQueryOptions(context.authCaller)),
    ]),
  component: ProtectedRouteComponent,
});

function ProtectedRouteComponent() {
  const shell = useSuspenseQuery(protectedShellQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const session = useSuspenseQuery(currentSessionQueryOptions(authCaller));
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const t = useTranslate();

  const handleSignOut = () => {
    setIsSigningOut(true);
    React.startTransition(() => {
      void (async () => {
        const result = await authCaller.signOut();
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
          <span className="badge">{t("app.project.actor", session.data.userLabel ?? session.data.loginId ?? "-")}</span>
          <span className="badge">
            {session.data.isSiteAdmin ? t("app.project.siteAdmin") : t("app.project.standardMember")}
          </span>
        </div>
      </article>
      {shell.data.lanes.map((lane) => (
        <article className="secret-panel" key={lane}>
          <strong>{lane}</strong>
        </article>
      ))}
      <article className="secret-panel">
        <strong>{t("app.project.sessionMutation")}</strong>
        <div className="action-row">
          <button className="secondary-cta" onClick={handleSignOut} type="button">
            {isSigningOut ? t("app.project.signingOut") : t("app.project.clearSession")}
          </button>
        </div>
      </article>
    </section>
  );
}
