import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { signInWithPassword, signOut } from "@app/lib/auth";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { currentSessionQueryOptions } from "@app/lib/queries";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  reset: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(currentSessionQueryOptions()),
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const session = useSuspenseQuery(currentSessionQueryOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const search = Route.useSearch();
  const redirectTo = search.redirect || "/protected";
  const [pendingAction, setPendingAction] = React.useState<"signin" | "signout" | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");

  const runAuthAction = (action: "signin" | "signout") => {
    setPendingAction(action);
    setErrorMessage(null);

    React.startTransition(() => {
      void (async () => {
        try {
          if (action === "signin") {
            const result = await signInWithPassword({
              data: {
                identifier,
                password,
              },
            });
            if (!result.ok) {
              setErrorMessage(result.message);
              return;
            }
            setCurrentSessionData(queryClient, result.session);
            await navigate({ to: redirectTo });
          } else {
            const result = await signOut();
            setCurrentSessionData(queryClient, result.session);
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
        <strong>Password sign-in</strong>
        <p className="note">
          Session state is stored in-memory through <code>@yona/auth</code>. DB-backed session rows
          remain disallowed.
        </p>
        <div className="badge-row">
          <span className="badge">
            {session.data.isAnonymous ? "Guest mode" : `Signed in as ${session.data.userLabel}`}
          </span>
          <span className="badge">Redirect target: {redirectTo}</span>
        </div>
        {search.reset ? (
          <p className="note">Password reset completed. Sign in with the new password.</p>
        ) : null}
        {session.data.isAnonymous ? (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              runAuthAction("signin");
            }}
          >
            <label className="field">
              <span>Login ID or email</span>
              <input
                autoComplete="username"
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="login-id"
                type="text"
                value={identifier}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="your-password"
                type="password"
                value={password}
              />
            </label>
            <div className="action-row">
              <button className="cta" type="submit">
                {pendingAction === "signin" ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>
        ) : (
          <div className="action-row">
            <button
              className="secondary-cta"
              onClick={() => runAuthAction("signout")}
              type="button"
            >
              {pendingAction === "signout" ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        )}
        <div className="link-row">
          <Link className="link-text" to="/register">
            Create account
          </Link>
          <Link className="link-text" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <p className="note">Create an account first if this runtime does not have one yet.</p>
        {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
      </article>
    </section>
  );
}
