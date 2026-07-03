import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { apiQueryKeys } from "../api/query-keys";
import { completePasswordReset, readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type ResetPasswordSearch = {
  error: string;
  s: string;
};

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRoute,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    error: typeof search.error === "string" ? search.error : "",
    s: typeof search.s === "string" ? search.s : "",
  }),
});

function ResetPasswordRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ResetPasswordScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function ResetPasswordScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { error, s } = Route.useSearch();
  const { language, t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const router = useRouter();
  const siteName = runtimeConfig.siteName ?? "Yona";
  const title = lookupLegacyMessage(language, "title.resetPasswordFor", {
    args: [siteName],
  });
  const resetMutation = useMutation({
    mutationFn: async (input: {
      hashString: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return completePasswordReset(runtimeConfig, csrfToken, input);
    },
    onError() {
      router.history.push(`/resetPassword?error=invalid&s=${encodeURIComponent(s)}`);
    },
    async onSuccess(response) {
      await queryClient.invalidateQueries({ queryKey: apiQueryKeys.session() });
      const redirectPath =
        typeof response.redirectPath === "string"
          ? response.redirectPath
          : "/users/loginform?password=reset";
      router.history.push(redirectPath);
    },
  });

  if (error) {
    return (
      <BadRequestPage
        runtimeConfig={runtimeConfig}
        message={t("site.resetPasswordEmail.wrongUrl")}
      />
    );
  }

  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div className="page full">
        <div className="center-wrap tag-line-wrap reset-password">
          <h1 className="title">
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p className="tag-line">{t("app.description")}</p>
        </div>

        <div className="login-form-wrap frm-wrap">
          <form
            action="/resetPassword"
            method="post"
            name="passwordReset"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <input type="hidden" name="hashString" value={s} />
            <dl>
              <dd>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="text password"
                  placeholder={t("user.password")}
                  autoComplete="off"
                />
              </dd>
              <dd>
                <input
                  id="retypedPassword"
                  type="password"
                  name="retypedPassword"
                  className="text password"
                  placeholder={t("validation.retypePassword")}
                  autoComplete="off"
                />
              </dd>
            </dl>

            <div className="btns-row">
              <button
                type="submit"
                className="ybtn ybtn-primary ybtn-fullsize"
                disabled={resetMutation.isPending}
              >
                {t("button.confirm")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SiteLayoutShell>
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    resetMutation.mutate({
      hashString: String(form.get("hashString") ?? ""),
      password: String(form.get("password") ?? ""),
      retypedPassword: String(form.get("retypedPassword") ?? ""),
    });
  }
}

function BadRequestPage({
  message,
  runtimeConfig,
}: {
  message: string;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  return (
    <SiteLayoutShell runtimeConfig={runtimeConfig}>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico-404" />
            <p>{message}</p>
            <Link to="/" className="ybtn ybtn-info">
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
    </SiteLayoutShell>
  );
}

function HighlightedLegacyMessage({ message }: { message: string }) {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return <>{message}</>;
  }

  return (
    <>
      {match[1]}
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}
