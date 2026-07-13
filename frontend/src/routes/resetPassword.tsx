import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { completePasswordReset, readSessionBootstrap } from "../auth-workspace-client";
import { LegacyI18nProvider, lookupLegacyMessage, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { SiteLayoutShell } from "./-home-route-screen";

type ResetPasswordSearch = {
  error?: string;
  s?: string;
};

const legacyAnchorActiveOptions = {
  exact: true,
  explicitUndefined: true,
} as const;
const legacyAnchorActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/resetPassword")({
  component: ResetPasswordRoute,
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    ...(typeof search.error === "string" && search.error ? { error: search.error } : {}),
    ...(typeof search.s === "string" && search.s ? { s: search.s } : {}),
  }),
});

function ResetPasswordRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <ResetPasswordScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ResetPasswordScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { error, s } = Route.useSearch();
  const resetToken = s ?? "";
  const { language, t } = useLegacyMessages();
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);
  const passwordInputRef = React.useRef<HTMLInputElement>(null);
  const retypedPasswordInputRef = React.useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<"password" | "retypedPassword", string>>
  >({});
  const siteName = runtimeConfig.siteName ?? "Yoram";
  const browserTitle = t("title.resetPassword");
  const title = lookupLegacyMessage(language, "title.resetPasswordFor", {
    args: [siteName],
  });
  // Reset completion changes credentials without authenticating or changing the current session.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  const resetMutation = useMutation({
    mutationFn: async (input: {
      hashString: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return completePasswordReset(runtimeConfig, csrfToken, input);
    },
    async onError() {
      await navigate({
        href: `/resetPassword?error=invalid&s=${encodeURIComponent(resetToken)}`,
      });
    },
    async onSuccess() {
      await navigate({ href: "/users/loginform?password=reset" });
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
      <title>{browserTitle}</title>
      <div className="page full">
        <div className="center-wrap tag-line-wrap reset-password">
          <h1 className="title">
            <HighlightedLegacyMessage message={title} />
          </h1>
          <p className="tag-line">{t("app.description")}</p>
        </div>

        <div className="login-form-wrap frm-wrap">
          <form
            action={prefixBasePath(runtimeConfig.basePath, "/resetPassword")}
            method="post"
            name="passwordReset"
            ref={formRef}
            onSubmit={(event) => void handleSubmit(event)}
          >
            <input type="hidden" name="hashString" value={resetToken} />
            <dl>
              <dd>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type="password"
                  name="password"
                  className="text password"
                  placeholder={t("user.password")}
                  autoComplete="off"
                  onBlur={validateCurrentForm}
                />
                <FieldPopover anchorRef={passwordInputRef} message={fieldErrors.password} />
              </dd>
              <dd>
                <input
                  ref={retypedPasswordInputRef}
                  id="retypedPassword"
                  type="password"
                  name="retypedPassword"
                  className="text password"
                  placeholder={t("validation.retypePassword")}
                  autoComplete="off"
                  onBlur={validateCurrentForm}
                />
                <FieldPopover
                  anchorRef={retypedPasswordInputRef}
                  message={fieldErrors.retypedPassword}
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
    const password = String(form.get("password") ?? "");
    const retypedPassword = String(form.get("retypedPassword") ?? "");
    const nextErrors = validateResetPasswordForm(password, retypedPassword, t);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    resetMutation.mutate({
      hashString: resetToken,
      password,
      retypedPassword,
    });
  }

  function validateCurrentForm() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const password = String(form.get("password") ?? "");
    const retypedPassword = String(form.get("retypedPassword") ?? "");
    setFieldErrors(validateResetPasswordForm(password, retypedPassword, t));
  }
}

function validateResetPasswordForm(
  password: string,
  retypedPassword: string,
  t: (key: string) => string,
): Partial<Record<"password" | "retypedPassword", string>> {
  const nextErrors: Partial<Record<"password" | "retypedPassword", string>> = {};

  if (!password) {
    nextErrors.password = t("validation.required");
  } else if (password.length < 4) {
    nextErrors.password = t("validation.tooShortPassword");
  }
  if (!retypedPassword) {
    nextErrors.retypedPassword = t("validation.required");
  } else if (retypedPassword !== password) {
    nextErrors.retypedPassword = t("validation.passwordMismatch");
  }

  return nextErrors;
}

function FieldPopover({
  anchorRef,
  message,
}: {
  anchorRef: React.RefObject<HTMLInputElement | null>;
  message?: string;
}) {
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<{ left: number; top: number } | null>(null);

  React.useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!message || !anchor || !popover) {
      setPlacement(null);
      return;
    }

    const left = anchor.offsetLeft - popover.offsetWidth;
    const top = anchor.offsetTop + (anchor.offsetHeight - popover.offsetHeight) / 2;
    setPlacement({ left, top });
  }, [anchorRef, message]);

  if (!message) return null;
  return (
    <div
      ref={popoverRef}
      className="popover left in"
      style={{
        display: "block",
        left: placement ? `${placement.left}px` : "-154px",
        maxWidth: "144px",
        position: "absolute",
        top: placement ? `${placement.top}px` : "0",
      }}
    >
      <div className="arrow"></div>
      <div className="popover-content">{message}</div>
    </div>
  );
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
      <div className="page-wrap-outer reset-password-bad-request">
        <div className="project-page-wrap">
          <div className="error-wrap">
            <i className="ico-404" />
            <p>{message}</p>
            <Link
              to=".."
              activeOptions={legacyAnchorActiveOptions}
              activeProps={legacyAnchorActiveProps}
              className="ybtn ybtn-info"
            >
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
