import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { changePasswordRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";

export const Route = createFileRoute("/user/editform/password")({
  component: UserPasswordSettingsRoute,
});

function UserPasswordSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <UserPasswordSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserPasswordSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<"oldPassword" | "password" | "retypedPassword", string>>
  >({});
  const validateWholePasswordForm = React.useCallback(
    (form: HTMLFormElement | null) => {
      setFieldErrors(validatePasswordForm(form, t));
    },
    [t],
  );
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const loginId = workspaceQuery.data?.profile?.loginId ?? "";
  const passwordMutation = useMutation({
    mutationFn: async (input: {
      loginId: string;
      oldPassword: string;
      password: string;
      retypedPassword: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return changePasswordRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await router.navigate({
        search: { password: "reset", redirectUrl: "" },
        to: "/users/loginform",
      });
    },
  });

  return (
    <>
      <form
        id="frmPassword"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/resetPassword")}
        data-owner="user-password-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const nextErrors = validatePasswordForm(formData, t);
          setFieldErrors(nextErrors);
          if (Object.keys(nextErrors).length > 0) return;

          passwordMutation.mutate({
            loginId: String(formData.get("loginId") ?? ""),
            oldPassword: String(formData.get("oldPassword") ?? ""),
            password: String(formData.get("password") ?? ""),
            retypedPassword: String(formData.get("retypedPassword") ?? ""),
          });
        }}
      >
        <input type="hidden" name="loginId" value={loginId} />
        <dl data-owner="user-password-list">
          <dt data-owner="user-password-term">{t("user.currentPassword")}</dt>
          <dd data-owner="user-password-description">
            <input
              type="password"
              id="oldPassword"
              name="oldPassword"
              defaultValue=""
              autoComplete="off"
              data-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.oldPassword} field="oldPassword" />
          </dd>
          <dt data-owner="user-password-term">{t("user.newPassword")}</dt>
          <dd data-owner="user-password-description">
            <input
              type="password"
              id="password"
              name="password"
              defaultValue=""
              autoComplete="off"
              data-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.password} field="password" />
          </dd>
          <dt data-owner="user-password-term">{t("validation.retypePassword")}</dt>
          <dd data-owner="user-password-description">
            <input
              type="password"
              id="retypedPassword"
              name="retypedPassword"
              defaultValue=""
              autoComplete="off"
              data-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.retypedPassword} field="retypedPassword" />
          </dd>
          <dd data-owner="user-password-description">
            <button type="submit" data-owner="user-password-submit-action">
              {t("userinfo.changePassword")}
            </button>
          </dd>
        </dl>
      </form>
      <hr data-owner="user-password-separator" />
      <div data-owner="user-password-reset-section">
        <dl data-owner="user-password-reset-list">
          <dt data-owner="user-password-reset-term">{t("site.resetPasswordEmail.desc")}</dt>
          <dd data-owner="user-password-reset-description">
            <Link to="/lostPassword" data-owner="user-password-reset-action">
              {t("site.resetPasswordEmail.title")}
            </Link>
          </dd>
        </dl>
      </div>
    </>
  );
}

function validatePasswordForm(
  form: HTMLFormElement | FormData | null,
  t: (key: string) => string,
): Partial<Record<"oldPassword" | "password" | "retypedPassword", string>> {
  const formData = form instanceof FormData ? form : new FormData(form ?? undefined);
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const retypedPassword = String(formData.get("retypedPassword") ?? "");
  const nextErrors: Partial<Record<"oldPassword" | "password" | "retypedPassword", string>> = {};

  if (!oldPassword) nextErrors.oldPassword = t("validation.required");
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
  field,
  message,
}: {
  field: "oldPassword" | "password" | "retypedPassword";
  message?: string;
}) {
  if (!message) return null;
  // Bootstrap tooltip.show: top = inputTop + inputHeight / 2 - popoverHeight / 2.
  // jQuery offset rounds the live required-message results to 232, 302, and 372px.
  const placementTop = field === "oldPassword" ? "232px" : field === "password" ? "302px" : "372px";
  return (
    <div style={{ top: placementTop }} data-owner="user-password-validation">
      <div data-owner="user-password-validation-arrow" />
      <div data-owner="user-password-validation-content">{message}</div>
    </div>
  );
}
