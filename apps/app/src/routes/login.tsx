import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AuthShell } from "@app/components/parity-shells";
import { resolvePostAuthRedirectPath, setCurrentSessionData } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { currentSessionQueryOptions } from "@app/lib/queries";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  reset: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(currentSessionQueryOptions(context.authCaller)),
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const session = useSuspenseQuery(currentSessionQueryOptions(authCaller));
  const navigate = useNavigate();
  const search = Route.useSearch();
  const t = useTranslate();
  const redirectTo = search.redirect;
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
            const result = await authCaller.signInWithPassword({
              identifier,
              password,
            });
            if (!result.ok) {
              setErrorMessage(result.message);
              return;
            }
            setCurrentSessionData(queryClient, result.session);
            await navigate({
              href: resolvePostAuthRedirectPath(result.session, redirectTo),
            });
          } else {
            const result = await authCaller.signOut();
            setCurrentSessionData(queryClient, result.session);
            await navigate({ to: "/" });
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : t("user.login.invalid"));
        } finally {
          setPendingAction(null);
        }
      })();
    });
  };

  return (
    <AuthShell description={t("app.description")} title={t("title.loginFor", t("app.name"))}>
      <header className="section-header">
        <h2>{t("title.login")}</h2>
      </header>
      {search.reset ? <p className="note">{t("app.auth.resetComplete")}</p> : null}
      {session.data.isAnonymous ? (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            runAuthAction("signin");
          }}
        >
          <label className="field">
            <span>{t("user.login.key")}</span>
            <input
              autoComplete="username"
              name="identifier"
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t("user.login.key")}
              type="text"
              value={identifier}
            />
          </label>
          <label className="field">
            <span>{t("user.password")}</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("user.password")}
              type="password"
              value={password}
            />
          </label>
          <div className="action-row">
            <button className="cta" type="submit">
              {pendingAction === "signin" ? `${t("button.login")}...` : t("button.login")}
            </button>
          </div>
        </form>
      ) : (
        <div className="action-row">
          <button className="secondary-cta" onClick={() => runAuthAction("signout")} type="button">
            {pendingAction === "signout" ? `${t("title.logout")}...` : t("title.logout")}
          </button>
        </div>
      )}
      <div className="link-row">
        <Link className="link-text" to="/register">
          {t("app.auth.createAccount")}
        </Link>
        <Link className="link-text" to="/forgot-password">
          {t("title.forgotpassword")}
        </Link>
      </div>
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
    </AuthShell>
  );
}
