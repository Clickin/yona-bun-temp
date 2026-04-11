import * as React from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { AuthShell } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";
import { currentSessionQueryKey } from "@app/lib/auth-shared";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordRouteComponent,
});

function ResetPasswordRouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const authCaller = router.options.context.authCaller;
  const queryClient = router.options.context.queryClient;
  const search = Route.useSearch();
  const t = useTranslate();
  const [pending, setPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [token, setToken] = React.useState(search.token ?? "");
  const [newPassword, setNewPassword] = React.useState("");

  return (
    <AuthShell
      description={t("app.description")}
      title={t("title.resetPasswordFor", t("app.name"))}
    >
      <header className="section-header">
        <h2>{t("title.resetPassword")}</h2>
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
                const result = await authCaller.completePasswordReset({
                  newPassword,
                  token,
                });

                if (!result.ok) {
                  setErrorMessage(result.message);
                  return;
                }

                await queryClient.invalidateQueries({
                  queryKey: currentSessionQueryKey,
                });
                await navigate({
                  search: {
                    reset: "1",
                  },
                  to: "/login",
                });
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
          <span>{t("app.auth.resetToken")}</span>
          <input
            onChange={(event) => setToken(event.target.value)}
            placeholder={t("app.auth.resetToken")}
            type="text"
            value={token}
          />
        </label>
        <label className="field">
          <span>{t("user.newPassword")}</span>
          <input
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={t("user.newPassword")}
            type="password"
            value={newPassword}
          />
        </label>
        <div className="action-row">
          <button className="cta" type="submit">
            {pending ? `${t("button.confirm")}...` : t("button.confirm")}
          </button>
        </div>
      </form>
      <div className="link-row">
        <Link className="link-text" to="/login">
          {t("title.login")}
        </Link>
      </div>
      {errorMessage ? <p className="note error-note">{errorMessage}</p> : null}
    </AuthShell>
  );
}
