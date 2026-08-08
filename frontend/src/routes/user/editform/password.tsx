import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { changePasswordRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import {
  passwordActionColors,
  passwordSeparatorColors,
  passwordSettingsColors,
  passwordValidationColors,
} from "./-password.stylex";

const styles = stylex.create({
  form: {
    display: "block",
    margin: "0px 0px 2px",
    padding: "0px",
  },
  list: {
    display: "block",
    lineHeight: "20px",
    margin: "0px",
    padding: "0px",
  },
  term: {
    display: "block",
    fontWeight: "700",
    lineHeight: "20px",
    margin: "0px",
    padding: "0px",
  },
  description: {
    display: "block",
    lineHeight: "20px",
    margin: "0px",
    padding: "0px",
  },
  spacedDescription: { marginTop: "10px" },
  input: {
    backgroundColor: passwordSettingsColors.inputSurface,
    borderColor: {
      default: passwordSettingsColors.inputBorder,
      ":focus": passwordSettingsColors.inputFocusBorder,
    },
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: passwordSettingsColors.inputText,
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: { default: "12px", "@media (max-width: 720px)": "16px" },
    fontWeight: "400",
    height: "20px",
    lineHeight: "20px",
    margin: "0px 0px 10px",
    outlineStyle: "none",
    padding: "4px 6px",
    transition: "border 0.2s linear, box-shadow 0.2s linear",
    verticalAlign: "middle",
    width: "206px",
  },
  action: {
    backgroundColor: {
      default: passwordActionColors.surface,
      ":active": passwordActionColors.interactiveSurface,
      ":focus": passwordActionColors.interactiveSurface,
      ":hover": passwordActionColors.interactiveSurface,
    },
    borderColor: {
      default: passwordActionColors.border,
      ":active": passwordActionColors.interactiveBorder,
      ":focus": passwordActionColors.interactiveBorder,
      ":hover": passwordActionColors.interactiveBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: `0 1px 0 ${passwordActionColors.shadow}`,
    color: {
      default: passwordActionColors.text,
      ":active": passwordActionColors.interactiveText,
      ":focus": passwordActionColors.interactiveText,
      ":hover": passwordActionColors.interactiveText,
    },
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    margin: "0px",
    outlineStyle: "none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      default: "none",
      ":active": "none",
      ":focus": "none",
      ":hover": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  submitAction: {
    backgroundColor: {
      default: passwordActionColors.primarySurface,
      ":active": passwordActionColors.primarySurfaceInteractive,
      ":focus": passwordActionColors.primarySurfaceInteractive,
      ":hover": passwordActionColors.primarySurfaceInteractive,
    },
    borderColor: {
      default: passwordActionColors.primaryBorder,
      ":active": passwordActionColors.primaryBorder,
      ":focus": passwordActionColors.primaryBorder,
      ":hover": passwordActionColors.primaryBorder,
    },
    color: {
      default: passwordActionColors.primaryText,
      ":active": passwordActionColors.primaryText,
      ":focus": passwordActionColors.primaryText,
      ":hover": passwordActionColors.primaryText,
    },
  },
  separator: {
    borderBottomColor: passwordSeparatorColors.bottomBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderLeftStyle: "none",
    borderLeftWidth: "0px",
    borderRightStyle: "none",
    borderRightWidth: "0px",
    borderTopColor: passwordSeparatorColors.topBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    display: "block",
    height: "0px",
    margin: "20px 0px",
    padding: "0px",
  },
  resetSection: { marginTop: "10px" },
  validation: {
    backgroundClip: "padding-box",
    backgroundColor: passwordValidationColors.surface,
    borderColor: passwordValidationColors.border,
    borderRadius: "2px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: `-2px 2px 1px ${passwordValidationColors.shadow}`,
    display: "block",
    fontSize: "13px",
    fontWeight: "400",
    left: { default: "230px", "@media (max-width: 720px)": "220px" },
    lineHeight: "1",
    marginLeft: "10px",
    maxWidth: "276px",
    opacity: "1",
    padding: "1px",
    position: "absolute",
    textAlign: "left",
    transition: "opacity 0.15s linear",
    whiteSpace: "normal",
    zIndex: "1010",
  },
  // Bootstrap tooltip.show: top = inputTop + inputHeight / 2 - popoverHeight / 2.
  // jQuery offset rounds the live required-message results to 232, 302, and 372px.
  validationOldPassword: { top: "232px" },
  validationPassword: { top: "302px" },
  validationRetypedPassword: { top: "372px" },
  validationArrow: {
    borderColor: "transparent",
    borderLeftWidth: "0px",
    borderRightColor: passwordValidationColors.arrowBorder,
    borderStyle: "solid",
    borderWidth: "11px",
    display: "block",
    height: "0px",
    left: "-11px",
    marginTop: "-11px",
    position: "absolute",
    top: "50%",
    width: "0px",
    "::after": {
      borderColor: "transparent",
      borderLeftWidth: "0px",
      borderRightColor: passwordValidationColors.surface,
      borderStyle: "solid",
      borderWidth: "10px",
      bottom: "-10px",
      content: '""',
      display: "block",
      height: "0px",
      left: "1px",
      position: "absolute",
      width: "0px",
    },
  },
  validationContent: {
    lineHeight: "120%",
    padding: "9px 10px",
  },
});

const formStyleProps = stylex.props(styles.form);
const listStyleProps = stylex.props(styles.list);
const termStyleProps = stylex.props(styles.term);
const descriptionStyleProps = stylex.props(styles.description);
const spacedDescriptionStyleProps = stylex.props(styles.description, styles.spacedDescription);
const inputStyleProps = stylex.props(styles.input);
const submitActionStyleProps = stylex.props(styles.action, styles.submitAction);
const separatorStyleProps = stylex.props(styles.separator);
const resetSectionStyleProps = stylex.props(styles.resetSection);
const resetActionStyleProps = stylex.props(styles.action);
const validationArrowStyleProps = stylex.props(styles.validationArrow);
const validationContentStyleProps = stylex.props(styles.validationContent);

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
        {...formStyleProps}
        id="frmPassword"
        method="post"
        action={prefixBasePath(runtimeConfig.basePath, "/user/resetPassword")}
        data-stylex-owner="user-password-form"
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
        <dl {...listStyleProps} data-stylex-owner="user-password-list">
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("user.currentPassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="oldPassword"
              name="oldPassword"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.oldPassword} field="oldPassword" />
          </dd>
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("user.newPassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="password"
              name="password"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.password} field="password" />
          </dd>
          <dt {...termStyleProps} data-stylex-owner="user-password-term">
            {t("validation.retypePassword")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-description">
            <input
              {...inputStyleProps}
              type="password"
              id="retypedPassword"
              name="retypedPassword"
              defaultValue=""
              autoComplete="off"
              data-stylex-owner="user-password-input"
              onBlur={(event) => validateWholePasswordForm(event.currentTarget.form)}
            />
            <FieldPopover message={fieldErrors.retypedPassword} field="retypedPassword" />
          </dd>
          <dd {...descriptionStyleProps} data-stylex-owner="user-password-description">
            <button
              {...submitActionStyleProps}
              type="submit"
              data-stylex-owner="user-password-submit-action"
            >
              {t("userinfo.changePassword")}
            </button>
          </dd>
        </dl>
      </form>
      <hr {...separatorStyleProps} data-stylex-owner="user-password-separator" />
      <div {...resetSectionStyleProps} data-stylex-owner="user-password-reset-section">
        <dl {...listStyleProps} data-stylex-owner="user-password-reset-list">
          <dt {...termStyleProps} data-stylex-owner="user-password-reset-term">
            {t("site.resetPasswordEmail.desc")}
          </dt>
          <dd {...spacedDescriptionStyleProps} data-stylex-owner="user-password-reset-description">
            <Link
              {...resetActionStyleProps}
              to="/lostPassword"
              data-stylex-owner="user-password-reset-action"
            >
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
  const placement =
    field === "oldPassword"
      ? styles.validationOldPassword
      : field === "password"
        ? styles.validationPassword
        : styles.validationRetypedPassword;
  return (
    <div
      {...stylex.props(styles.validation, placement)}
      data-stylex-owner="user-password-validation"
    >
      <div {...validationArrowStyleProps} data-stylex-owner="user-password-validation-arrow" />
      <div {...validationContentStyleProps} data-stylex-owner="user-password-validation-content">
        {message}
      </div>
    </div>
  );
}
