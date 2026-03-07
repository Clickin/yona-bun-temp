import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { demoSessionQueryOptions } from "@app/lib/queries";
import { signInDemo, signOutDemo } from "@app/lib/shell-data";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(demoSessionQueryOptions()),
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const session = useSuspenseQuery(demoSessionQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();
  const redirectTo = search.redirect || "/protected";
  const [pendingAction, setPendingAction] = React.useState<"signin" | "signout" | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const runAuthAction = (action: "signin" | "signout") => {
    setPendingAction(action);
    setErrorMessage(null);

    React.startTransition(() => {
      void (async () => {
        try {
          if (action === "signin") {
            await signInDemo();
            await router.invalidate();
            await navigate({ to: redirectTo });
          } else {
            await signOutDemo();
            await router.invalidate();
            await navigate({ to: "/" });
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Auth action failed.");
        } finally {
          setPendingAction(null);
        }
      })();
    });
  };

  return (
    <section className="panel-grid">
      <article className="login-panel">
        <strong>Demo auth boundary</strong>
        <p className="note">
          The protected route only opens after a server function sets a cookie. No DB session row is
          involved.
        </p>
        <div className="badge-row">
          <span className="badge">
            {session.data.isAuthenticated ? `Signed in as ${session.data.userLabel}` : "Guest mode"}
          </span>
          <span className="badge">Redirect target: {redirectTo}</span>
        </div>
        <div className="action-row">
          <button className="cta" onClick={() => runAuthAction("signin")} type="button">
            {pendingAction === "signin" ? "Applying session..." : "Set Demo Session"}
          </button>
          <button className="secondary-cta" onClick={() => runAuthAction("signout")} type="button">
            {pendingAction === "signout" ? "Clearing..." : "Clear Session"}
          </button>
        </div>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
