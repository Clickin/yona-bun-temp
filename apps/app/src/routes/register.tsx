import * as React from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AuthShell } from "@app/components/parity-shells";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { currentSessionQueryOptions } from "@app/lib/queries";

const registerSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearchSchema,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(currentSessionQueryOptions(context.authCaller)),
  component: RegisterRouteComponent,
});

function RegisterRouteComponent() {
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const navigate = useNavigate();
  const search = Route.useSearch();
  const t = useTranslate();
  const redirectTo = search.redirect || "/protected";
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
    name: "",
    password: "",
  });

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <AuthShell description={t("app.description")} title={t("title.signupFor", t("app.name"))}>
      <header className="section-header">
        <h2>{t("user.signupBtn")}</h2>
      </header>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setErrorMessage(null);

          React.startTransition(() => {
            void (async () => {
              try {
                const result = await authCaller.registerWithPassword(formState);

                if (!result.ok) {
                  setErrorMessage(result.message);
                  return;
                }

                setCurrentSessionData(queryClient, result.session);
                await navigate({ to: redirectTo });
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : t("user.login.invalid"));
              } finally {
                setPending(false);
              }
            })();
          });
        }}
      >
        <label className="field">
          <span>{t("user.name")}</span>
          <input
            autoComplete="name"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder={t("user.name")}
            type="text"
            value={formState.name}
          />
        </label>
        <label className="field">
          <span>{t("user.signupId")}</span>
          <input
            autoComplete="username"
            onChange={(event) => updateField("loginId", event.target.value)}
            placeholder={t("user.signupId")}
            type="text"
            value={formState.loginId}
          />
        </label>
        <label className="field">
          <span>{t("user.email")}</span>
          <input
            autoComplete="email"
            onChange={(event) => updateField("emailAddress", event.target.value)}
            placeholder={t("user.email")}
            type="email"
            value={formState.emailAddress}
          />
        </label>
        <label className="field">
          <span>{t("user.password")}</span>
          <input
            autoComplete="new-password"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder={t("user.password")}
            type="password"
            value={formState.password}
          />
        </label>
        <div className="action-row">
          <button className="cta" type="submit">
            {pending ? `${t("user.signupBtn")}...` : t("user.signupBtn")}
          </button>
        </div>
      </form>
      <div className="link-row">
        <Link className="link-text" to="/login">
          {t("app.auth.alreadyHaveAccount")}
        </Link>
      </div>
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
    </AuthShell>
  );
}
