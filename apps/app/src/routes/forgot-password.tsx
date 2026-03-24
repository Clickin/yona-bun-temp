import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AuthShell } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordRouteComponent,
});

function ForgotPasswordRouteComponent() {
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const t = useTranslate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [formState, setFormState] = React.useState({
    emailAddress: "",
    loginId: "",
  });

  const updateField = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <AuthShell
      description={t("app.description")}
      title={t("title.resetPasswordFor", t("app.name"))}
    >
      <header className="section-header">
        <h2>{t("title.forgotpassword")}</h2>
      </header>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setErrorMessage(null);
          setSubmitted(false);

          React.startTransition(() => {
            void (async () => {
              try {
                const result = await authCaller.requestPasswordReset(formState);
                if (!result.ok) {
                  setErrorMessage(result.message);
                  return;
                }
                setSubmitted(true);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : t("site.mail.fail"));
              } finally {
                setPending(false);
              }
            })();
          });
        }}
      >
        <label className="field">
          <span>{t("user.loginId")}</span>
          <input
            onChange={(event) => updateField("loginId", event.target.value)}
            placeholder={t("user.loginId")}
            type="text"
            value={formState.loginId}
          />
        </label>
        <label className="field">
          <span>{t("user.email")}</span>
          <input
            onChange={(event) => updateField("emailAddress", event.target.value)}
            placeholder={t("user.email")}
            type="email"
            value={formState.emailAddress}
          />
        </label>
        <div className="action-row">
          <button className="cta" type="submit">
            {pending ? `${t("button.confirm")}...` : t("button.confirm")}
          </button>
        </div>
      </form>
      {submitted ? <p className="note">{t("site.mail.sended")}</p> : null}
      <div className="link-row">
        <Link className="link-text" to="/reset-password">
          {t("app.auth.haveResetToken")}
        </Link>
      </div>
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
    </AuthShell>
  );
}
