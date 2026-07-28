import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { readAuthUiCapabilitiesRest } from "../api/auth";
import type { ReadAuthUiCapabilitiesResponse } from "../api/types";
import { submitRootLoginDialogForm } from "../auth-root-shell-login-dialog";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { LegacyI18nProvider, resolveInitialLanguage, useLegacyMessages } from "../i18n";
import { prefixBasePath, type RuntimeConfig } from "../runtime-config";
import { rootColors, rootNotFoundStyles, rootProviderStyles } from "./-root.stylex";

export interface AppRouterContext {
  runtimeConfig: RuntimeConfig;
}

const legacyPlainLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;

const legacyPlainLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

type RootToast = {
  durationMs?: number;
  key: string;
  message: string;
};

type RootShellModalId = "loginDialog" | "yobiDialog";

type RootLoginDialogState = {
  errorMessage: string | null;
  identifier: string;
  password: string;
  rememberMe: boolean;
};

type RootYoramDialogProps = {
  isOpen: boolean;
  onDismiss: () => void;
};

type RootLoginDialogProps = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDismiss: () => void;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  resetNonce: number;
  runtimeConfig: RuntimeConfig;
  state: RootLoginDialogState;
  visible: boolean;
};

const RootToastContext = React.createContext<React.Dispatch<
  React.SetStateAction<RootToast | null>
> | null>(null);
const RootLoginDialogContext = React.createContext<(() => boolean) | null>(null);
const ROOT_YOBI_TOAST_DURATION_MS = 5000;
const GITHUB_OAUTH_LOGO_PATH =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59 0.4 0.07 0.55-0.17 0.55-0.38 0-0.19-0.01-0.82-0.01-1.49-2.01 0.37-2.53-0.49-2.69-0.94-0.09-0.23-0.48-0.94-0.82-1.13-0.28-0.15-0.68-0.52-0.01-0.53 0.63-0.01 1.08 0.58 1.23 0.82 0.72 1.21 1.87 0.87 2.33 0.66 0.07-0.52 0.28-0.87 0.51-1.07-1.78-0.2-3.64-0.89-3.64-3.95 0-0.87 0.31-1.59 0.82-2.15-0.08-0.2-0.36-1.02 0.08-2.12 0 0 0.67-0.21 2.2 0.82 0.64-0.18 1.32-0.27 2-0.27 0.68 0 1.36 0.09 2 0.27 1.53-1.04 2.2-0.82 2.2-0.82 0.44 1.1 0.16 1.92 0.08 2.12 0.51 0.56 0.82 1.27 0.82 2.15 0 3.07-1.87 3.75-3.65 3.95 0.29 0.25 0.54 0.73 0.54 1.48 0 1.07-0.01 1.93-0.01 2.2 0 0.21 0.15 0.46 0.55 0.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z";
const styles = stylex.create({
  grayTextSeparator: { color: rootColors.grayText },
  rootLoginDialogSeparator: { marginLeft: "10px", marginRight: "10px" },
  rootEventBoundary: {
    "--yoram-stylex-root-boundary": "stylex",
    display: "contents",
  },
  rootToastContainer: {
    position: "fixed",
    right: "20px",
    bottom: "25px",
    zIndex: "9999",
    margin: "10px",
    overflow: "hidden",
  },
  rootToast: {
    position: "relative",
    boxSizing: "border-box",
    width: "450px",
    padding: "10px 20px",
    margin: "10px",
    fontSize: "13px",
    fontWeight: "700",
    color: rootColors.toastText,
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    outline: "none",
    backgroundColor: rootColors.toastSurface,
    borderRadius: "2px",
    boxShadow: rootColors.toastShadow,
    opacity: "0.9",
    transitionDuration: "0.3s",
  },
  rootToastDismiss: {
    position: "absolute",
    top: "5px",
    left: "420px",
  },
  rootToastDismissButton: {
    color: rootColors.toastText,
    fontSize: "25px",
    fontWeight: "700",
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: "0px",
    padding: "0px",
    outline: "none",
  },
  rootToastSpacer: {
    display: "inline-block",
    width: "0px",
    height: "50px",
    verticalAlign: "middle",
  },
  rootToastMessage: {
    display: "inline-block",
    width: "90%",
    margin: "0px",
    fontSize: "15px",
    verticalAlign: "middle",
    wordBreak: "break-all",
    overflowWrap: "break-word",
  },
  // common/loginDialog.scala.html + frozen Bootstrap modal/_page.less/_responsive.less.
  rootLoginDialog: {
    display: "none",
    position: "fixed",
    top: "10%",
    left: {
      default: "50%",
      // _responsive.less:205-212 resolves the root dialog to the viewport's left edge.
      "@media (max-width: 720px)": "0px",
    },
    zIndex: "1050",
    width: {
      default: "460px",
      "@media (max-width: 767px)": "100%",
    },
    marginLeft: {
      default: "-230px",
      "@media (max-width: 767px)": "0px",
    },
    backgroundColor: rootColors.loginDialogSurface,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: rootColors.loginDialogBorder,
    borderRadius: "6px",
    outline: "none",
    boxShadow: rootColors.loginDialogShadow,
    backgroundClip: "padding-box",
  },
  rootLoginDialogVisible: { display: "block" },
  // frozen Bootstrap bootstrap.css:5196-5200.
  rootLoginDialogBody: {
    position: "relative",
    maxHeight: "400px",
    padding: "15px",
    overflowY: "auto",
  },
  rootLoginDialogErrorVisible: { display: "block" },
  rootLoginDialogForm: {
    margin: "20px auto",
    width: {
      "@media (max-width: 767px)": "inherit",
    },
  },
  rootLoginDialogInput: {
    boxShadow: "none",
  },
  rootLoginDialogTextInput: {
    boxSizing: "content-box",
    minHeight: "0px",
    width: {
      "@media (max-width: 767px)": "95%",
    },
  },
  rootLoginDialogError: {
    display: "none",
    marginBottom: "20px",
    color: rootColors.errorText,
  },
  rootLoginDialogErrorIcon: {
    verticalAlign: "middle",
    marginRight: "5px",
    fontSize: "13px",
  },
  // frozen _page.less:835-839 and 6568-6570. The generic `.checkbox`
  // important shorthand cannot remain once the dialog-specific class retires.
  rootLoginDialogCheckbox: {
    display: "inline-block",
    marginTop: "4px",
    marginRight: "2px",
    marginBottom: "2px",
    marginLeft: "2px",
    minHeight: "20px",
    verticalAlign: "top",
    width: "auto",
  },
  rootLoginDialogRememberLabel: {
    display: "inline-block",
    fontSize: "12px",
    lineHeight: "20px",
    marginBottom: "5px",
  },
  rootLoginDialogButtonRow: {
    display: "block",
    textAlign: "center",
    width: "auto",
  },
  // frozen _page.less:1626-1645. Keep the dialog's lower rows independent
  // from the generated legacy fallback stylesheet.
  rootLoginDialogSocialTitleLine: {
    lineHeight: "20px",
    marginTop: "12px",
    marginBottom: "10px",
  },
  rootLoginDialogActionRow: {
    lineHeight: "22px",
    overflow: "auto",
    textAlign: "right",
  },
  // frozen Bootstrap bootstrap.css:6097-6099. The legacy template uses this
  // for the remember-me control, so it cannot depend on fallback CSS here.
  rootLoginDialogRememberGroup: {
    float: "left",
  },
  rootLoginDialogSubmit: {
    width: "100%",
  },
  // common/scripts.scala.html + frozen _common.less:162.
  // Keep the legacy classes for the global dialog DOM contract while StyleX
  // owns the visible confirmation-row alignment.
  rootYoramDialogActionRow: {
    textAlign: "center",
  },
  // common/loginDialog.scala.html + frozen Bootstrap/.modal-backdrop + _override.less
  rootLoginDialogBackdrop: {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
    zIndex: "1040",
    backgroundColor: "#000000",
    opacity: "0.5",
  },
});
const rootLoginDialogFormClassName = stylex.props(styles.rootLoginDialogForm).className;
const rootLoginDialogInputClassName = stylex.props(styles.rootLoginDialogInput).className;
const rootLoginDialogTextInputClassName = stylex.props(styles.rootLoginDialogTextInput).className;
const rootLoginDialogErrorClassName = stylex.props(styles.rootLoginDialogError).className;
const rootLoginDialogErrorIconClassName = stylex.props(styles.rootLoginDialogErrorIcon).className;
const rootLoginDialogCheckboxClassName = stylex.props(styles.rootLoginDialogCheckbox).className;
const rootLoginDialogRememberLabelClassName = stylex.props(
  styles.rootLoginDialogRememberLabel,
).className;
const rootLoginDialogSeparatorStyleProps = stylex.props(
  styles.grayTextSeparator,
  styles.rootLoginDialogSeparator,
);
const rootLoginDialogButtonRowClassName = stylex.props(styles.rootLoginDialogButtonRow).className;
const rootLoginDialogSocialTitleLineClassName = stylex.props(
  styles.rootLoginDialogSocialTitleLine,
).className;
const rootLoginDialogActionRowClassName = stylex.props(styles.rootLoginDialogActionRow).className;
const rootLoginDialogRememberGroupClassName = stylex.props(
  styles.rootLoginDialogRememberGroup,
).className;
const rootLoginDialogSubmitClassName = stylex.props(styles.rootLoginDialogSubmit).className;
const rootLoginDialogBackdropClassName = stylex.props(styles.rootLoginDialogBackdrop).className;

export function useRootToast() {
  const setRootToast = React.use(RootToastContext);
  if (!setRootToast) {
    throw new Error("useRootToast must be used under RootToastContext.");
  }
  return setRootToast;
}

export function useRootLoginDialog() {
  const openRootLoginDialog = React.use(RootLoginDialogContext);
  if (!openRootLoginDialog) {
    throw new Error("useRootLoginDialog must be used under RootLoginDialogContext.");
  }
  return openRootLoginDialog;
}

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootResetShell,
  notFoundComponent: RootAliasNotFound,
});

function RootResetShell() {
  const { runtimeConfig } = Route.useRouteContext();
  const router = useRouter();
  const [rootToast, setRootToast] = React.useState<RootToast | null>(null);
  const [rootShellModal, setRootShellModal] = React.useState<RootShellModalId | null>(null);
  const [authenticatedRevision, setAuthenticatedRevision] = React.useState(0);
  const [rootLoginDialogResetNonce, setRootLoginDialogResetNonce] = React.useState(0);
  const [rootLoginDialogState, setRootLoginDialogState] = React.useState<RootLoginDialogState>({
    errorMessage: null,
    identifier: "",
    password: "",
    rememberMe: true,
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const rendersPlainResponseState = pathname.startsWith("/verify/");
  const rendersStandaloneLoginState = pathname === "/users/loginform";
  const loginDialogInputRef = React.useRef<HTMLInputElement | null>(null);

  const openRootLoginDialog = React.useCallback(() => {
    if (rendersPlainResponseState || rendersStandaloneLoginState) {
      return false;
    }

    setRootShellModal("loginDialog");
    setRootLoginDialogResetNonce((current) => current + 1);
    setRootLoginDialogState((current) => ({
      ...current,
      errorMessage: null,
      identifier: "",
      password: "",
    }));
    return true;
  }, [rendersPlainResponseState, rendersStandaloneLoginState]);

  const closeRootShellModal = React.useCallback(() => {
    setRootShellModal(null);
  }, []);

  const handleRootShellKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && rootShellModal) {
        event.preventDefault();
        closeRootShellModal();
      }
    },
    [closeRootShellModal, rootShellModal],
  );

  const handleRootShellClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      const requiredLogin = target.closest<HTMLElement>('[data-login="required"]');
      if (requiredLogin && openRootLoginDialog()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    },
    [openRootLoginDialog],
  );

  const handleRootLoginDialogSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRootLoginDialogState((current) => ({
        ...current,
        errorMessage: null,
      }));

      try {
        await submitRootLoginDialogForm(runtimeConfig, rootLoginDialogState);
        closeRootShellModal();
        setAuthenticatedRevision((current) => current + 1);
        await router.invalidate();
      } catch (caught) {
        setRootLoginDialogState((current) => ({
          ...current,
          errorMessage: caught instanceof Error ? caught.message : "Failed to authenticate.",
        }));
      }
    },
    [closeRootShellModal, rootLoginDialogState, router, runtimeConfig],
  );

  React.useEffect(() => {
    if (rootShellModal !== "loginDialog") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loginDialogInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [rootShellModal]);

  const rootShellContent = (
    <>
      <Outlet key={authenticatedRevision} />
      {rendersPlainResponseState ? null : (
        <>
          <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
            <RootYoramDialog
              isOpen={rootShellModal === "yobiDialog"}
              onDismiss={closeRootShellModal}
            />
          </LegacyI18nProvider>
          <div
            {...stylex.props(styles.rootToastContainer)}
            id="yobiToasts"
            data-stylex-owner="root-toast-container"
          >
            {rootToast ? (
              <RootYoramToast
                durationMs={rootToast.durationMs}
                key={rootToast.key}
                message={rootToast.message}
                onDismiss={() => setRootToast(null)}
              />
            ) : null}
          </div>
          <script type="text/x-jquery-tmpl" id="tplYobiToast">
            {
              '<div class="toast" tabindex="-1"><div class="btn-dismiss"><button type="button" class="btn-transparent">&times;</button></div><div class="center-text"><span class="v"></span><div class="msg"></div></div></div>'
            }
          </script>
          <LegacySelect2Assets runtimeConfig={runtimeConfig} />
          <LegacySelect2Templates />
          {rendersStandaloneLoginState ? null : (
            <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
              <RootLoginDialog
                inputRef={loginDialogInputRef}
                onDismiss={closeRootShellModal}
                onIdentifierChange={(identifier) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    identifier,
                  }));
                }}
                onPasswordChange={(password) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    password,
                  }));
                }}
                onRememberMeChange={(rememberMe) => {
                  setRootLoginDialogState((current) => ({
                    ...current,
                    rememberMe,
                  }));
                }}
                onSubmit={handleRootLoginDialogSubmit}
                resetNonce={rootLoginDialogResetNonce}
                runtimeConfig={runtimeConfig}
                state={rootLoginDialogState}
                visible={rootShellModal === "loginDialog"}
              />
            </LegacyI18nProvider>
          )}
          {rootShellModal ? (
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Bootstrap 2 dismisses through the backdrop; root key capture provides Escape dismissal.
            <div
              {...(rootShellModal === "loginDialog"
                ? stylex.props(styles.rootLoginDialogBackdrop)
                : {})}
              className={[
                "modal-backdrop in",
                rootShellModal === "loginDialog" ? rootLoginDialogBackdropClassName : null,
              ]
                .filter(Boolean)
                .join(" ")}
              data-stylex-owner={
                rootShellModal === "loginDialog" ? "root-login-dialog-backdrop" : undefined
              }
              data-stylex-part={
                rootShellModal === "loginDialog" ? "login-dialog-backdrop" : undefined
              }
              onClick={closeRootShellModal}
            ></div>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <RootLoginDialogContext.Provider value={openRootLoginDialog}>
      <RootToastContext.Provider value={setRootToast}>
        {rendersPlainResponseState ? (
          rootShellContent
        ) : (
          <div
            {...stylex.props(styles.rootEventBoundary)}
            data-stylex-root-boundary=""
            onClickCapture={handleRootShellClick}
            onKeyDownCapture={handleRootShellKeyDown}
          >
            {rootShellContent}
          </div>
        )}
      </RootToastContext.Provider>
    </RootLoginDialogContext.Provider>
  );
}

function RootYoramToast({
  durationMs,
  message,
  onDismiss,
}: {
  durationMs?: number;
  message: string;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const timeoutMs = durationMs ?? ROOT_YOBI_TOAST_DURATION_MS;
    if (timeoutMs <= 0) {
      return;
    }
    const timeoutId = window.setTimeout(onDismiss, timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, onDismiss]);

  return (
    <div
      {...stylex.props(styles.rootToast)}
      tabIndex={-1}
      data-stylex-owner="root-yoram-toast"
      data-stylex-part="toast"
    >
      <div {...stylex.props(styles.rootToastDismiss)} data-stylex-part="toast-dismiss">
        <button {...stylex.props(styles.rootToastDismissButton)} type="button" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div>
        <span {...stylex.props(styles.rootToastSpacer)} />
        <div {...stylex.props(styles.rootToastMessage)} data-stylex-part="toast-message">
          {message}
        </div>
      </div>
    </div>
  );
}

function RootYoramDialog({ isOpen, onDismiss }: RootYoramDialogProps) {
  const { t } = useLegacyMessages();
  return (
    <div
      id="yobiDialog"
      className={isOpen ? "modal yobiDialog in" : "modal hide yobiDialog"}
      tabIndex={-1}
      role="dialog"
      aria-hidden={!isOpen}
    >
      <div className="btn-dismiss">
        <button type="button" className="btn-transparent" onClick={onDismiss}>
          &times;
        </button>
      </div>
      <div className="message">
        <div className="center-text">
          <p className="msg" />
          <p className="desc" />
        </div>
        <div
          className={`${stylex.props(styles.rootYoramDialogActionRow).className} center-txt buttons`}
          data-stylex-owner="root-yoram-dialog-action-row"
        >
          <button type="button" className="ybtn ybtn-info" onClick={onDismiss}>
            {t("button.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function LegacySelect2Assets({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const language = resolveInitialLanguage(runtimeConfig.supportedLanguages);
  const localeScript =
    language === "ko-KR"
      ? "/assets/javascripts/lib/select2/select2_locale_ko.js"
      : language === "ja-JP"
        ? "/assets/javascripts/lib/select2/select2_locale_ja.js"
        : "";

  return (
    <>
      <script
        defer
        src={prefixBasePath(runtimeConfig.basePath, "/assets/javascripts/lib/select2/select2.js")}
      ></script>
      <script
        defer
        src={prefixBasePath(
          runtimeConfig.basePath,
          "/assets/javascripts/common/yobi.ui.Select2.js",
        )}
      ></script>
      {localeScript ? (
        <script defer src={prefixBasePath(runtimeConfig.basePath, localeScript)}></script>
      ) : null}
    </>
  );
}

function LegacySelect2Templates() {
  const TemplateScript = "script";

  return (
    <>
      <TemplateScript
        id="tplSelect2FormatUser"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name} \${loginId}">
    <span class="avatar-wrap smaller"><img src="\${avatarURL}" width="20" height="20"></span>
    <strong class="name">\${name}</strong>
    <span class="loginid">\${loginId}</span>
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2FormatMilestone"
        type="text/x-jquery-tmpl"
      >{`<div title="[\${stateLabel}] \${name}">
    \${name}
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2Projects"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name}">
    <span class="avatar-wrap smaller"><img src="\${avatarURL}" width="16" height="16"></span>
    <span class="loginid">\${owner}</span>
    <span class="name">\${name}</span>
</div>`}</TemplateScript>
      <TemplateScript
        id="tplSelect2ProjectsWithoutAvatar"
        type="text/x-jquery-tmpl"
      >{`<div class="usf-group" title="\${name}">
    <span class="width25px"></span>
    <span class="loginid">\${owner}</span>
    <span class="name">\${name}</span>
</div>`}</TemplateScript>
      <TemplateScript id="tplSelect2FormatIssues" type="text/x-jquery-tmpl">{`<div title="\${name}">
    \${name}
</div>`}</TemplateScript>
    </>
  );
}

function RootLoginDialog({
  inputRef,
  onDismiss,
  onIdentifierChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
  resetNonce,
  runtimeConfig,
  state,
  visible,
}: RootLoginDialogProps) {
  const { t } = useLegacyMessages();
  const [capabilities, setCapabilities] = React.useState<ReadAuthUiCapabilitiesResponse | null>(
    null,
  );
  React.useEffect(() => {
    let active = true;
    readAuthUiCapabilitiesRest(runtimeConfig)
      .then((nextCapabilities) => {
        if (active) {
          setCapabilities(nextCapabilities);
        }
      })
      .catch(() => {
        if (active) {
          setCapabilities(null);
        }
      });
    return () => {
      active = false;
    };
  }, [runtimeConfig]);

  const basePath = runtimeConfig.basePath;
  const socialLoginOnly = capabilities?.socialLoginOnly === true;
  const socialProviders = Array.isArray(capabilities?.enabledSocialProviders)
    ? capabilities.enabledSocialProviders
    : [];
  const rootLoginDialogProps = stylex.props(
    styles.rootLoginDialog,
    visible && styles.rootLoginDialogVisible,
  );

  return (
    <div
      id="loginDialog"
      {...rootLoginDialogProps}
      className={rootLoginDialogProps.className}
      tabIndex={-1}
      role="dialog"
      aria-hidden={visible ? false : true}
      data-stylex-owner="root-login-dialog-frame"
    >
      <div {...stylex.props(styles.rootLoginDialogBody)} data-stylex-owner="root-login-dialog-body">
        <div className="pull-right">
          {/* oxlint-disable jsx-a11y/no-aria-hidden-on-focusable -- legacy common/loginDialog.scala.html renders aria-hidden on the focusable close button. */}
          <button
            type="button"
            className="close"
            aria-hidden="true"
            data-stylex-part="login-dialog-close"
            onClick={onDismiss}
          >
            &times;
          </button>
        </div>
        <form
          action={prefixBasePath(basePath, "/users/login")}
          method="post"
          className={["frm-wrap login-form-wrap", rootLoginDialogFormClassName]
            .filter(Boolean)
            .join(" ")}
          data-stylex-part="login-dialog-form"
          onSubmit={onSubmit}
          key={resetNonce}
        >
          {socialLoginOnly ? (
            <div
              className={["btns-row nm", rootLoginDialogButtonRowClassName]
                .filter(Boolean)
                .join(" ")}
            >
              {t("app.warn.support.social.login.only")}
            </div>
          ) : (
            <>
              <dl>
                <dd>
                  <input
                    id="loginIdOrEmailD"
                    name="loginIdOrEmail"
                    type="text"
                    className={[
                      "text email",
                      rootLoginDialogInputClassName,
                      rootLoginDialogTextInputClassName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    autoComplete="off"
                    placeholder={t("user.login.key")}
                    ref={inputRef}
                    value={state.identifier}
                    onChange={(event) => onIdentifierChange(event.target.value)}
                  />
                </dd>
                <dd>
                  <input
                    id="passwordD"
                    name="password"
                    type="password"
                    className={[
                      "text password",
                      rootLoginDialogInputClassName,
                      rootLoginDialogTextInputClassName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    autoComplete="off"
                    placeholder={t("user.password")}
                    value={state.password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                  />
                </dd>
              </dl>
              <div
                className={["error", rootLoginDialogErrorClassName].filter(Boolean).join(" ")}
                {...(state.errorMessage ? stylex.props(styles.rootLoginDialogErrorVisible) : {})}
                data-stylex-owner="root-login-dialog-error"
              >
                <i
                  className={["yobicon-error", rootLoginDialogErrorIconClassName]
                    .filter(Boolean)
                    .join(" ")}
                />
                <span className="error-message">{state.errorMessage ?? ""}</span>
              </div>
              <div
                className={["btns-row nm", rootLoginDialogButtonRowClassName]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="submit"
                  className={["ybtn ybtn-primary fullsize", rootLoginDialogSubmitClassName]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t("button.login")}
                </button>
              </div>
            </>
          )}
          <div
            className={["btns-row nm", rootLoginDialogButtonRowClassName].filter(Boolean).join(" ")}
          >
            {socialProviders.length > 0 && !socialLoginOnly ? (
              <div
                className={["social-login-title-line", rootLoginDialogSocialTitleLineClassName]
                  .filter(Boolean)
                  .join(" ")}
              >
                {" "}
                {t("title.or")}
              </div>
            ) : null}
            {socialProviders.map((provider) => (
              <RootOAuthProviderLink
                basePath={basePath}
                key={String(provider)}
                provider={String(provider)}
              />
            ))}
          </div>
          {!socialLoginOnly ? (
            <div
              className={["act-row mt20", rootLoginDialogActionRowClassName]
                .filter(Boolean)
                .join(" ")}
              data-stylex-owner="root-login-dialog-action-row"
            >
              <div
                className={["pull-left", rootLoginDialogRememberGroupClassName]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  id="remember-meD"
                  type="checkbox"
                  name="rememberMe"
                  className={[rootLoginDialogInputClassName, rootLoginDialogCheckboxClassName]
                    .filter(Boolean)
                    .join(" ")}
                  checked={state.rememberMe}
                  onChange={(event) => onRememberMeChange(event.target.checked)}
                />
                <label
                  htmlFor="remember-meD"
                  className={["bg-checkbox", rootLoginDialogRememberLabelClassName]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t("title.rememberMe")}
                </label>
              </div>
              <Link to="/lostPassword">{t("title.resetPassword")}</Link>
              <span
                {...rootLoginDialogSeparatorStyleProps}
                data-stylex-owner="root-login-dialog-separator"
              >
                |
              </span>
              <Link to="/users/signupform">{t("title.signup")}</Link>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function RootOAuthProviderLink({ basePath, provider }: { basePath: string; provider: string }) {
  const normalized = provider.trim().toLowerCase();
  if (normalized !== "github" && normalized !== "google") {
    return null;
  }
  const providerLoginPath: string = `/authenticate/${normalized}`;

  return (
    <Link to={providerLoginPath} className="ybtn oauth-login-btn" reloadDocument>
      {normalized === "github" ? (
        <span
          className={`${stylex.props(rootProviderStyles.logo).className} auth-provider-logo`}
          data-stylex-owner="root-provider-logo"
        >
          <span
            className={`${stylex.props(rootProviderStyles.github).className} github`}
            data-stylex-owner="root-provider-github"
          >
            <svg
              {...stylex.props(rootProviderStyles.logoSvg)}
              aria-hidden="true"
              height="24"
              version="1.1"
              viewBox="0 0 16 16"
              width="19"
            >
              <path d={GITHUB_OAUTH_LOGO_PATH} />
            </svg>
          </span>{" "}
          <span className="provider-name">Sign in with github</span>
        </span>
      ) : (
        <span
          className={`${stylex.props(rootProviderStyles.logo).className} auth-provider-logo`}
          data-stylex-owner="root-provider-logo"
        >
          <img
            {...stylex.props(rootProviderStyles.logoSvg)}
            src={prefixBasePath(
              basePath,
              "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
            )}
            alt="login with Google"
          />{" "}
          Sign in with Google
        </span>
      )}
    </Link>
  );
}

export function RootAliasNotFound() {
  const { runtimeConfig } = Route.useRouteContext();
  return (
    <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
      <RootAliasNotFoundScreen runtimeConfig={runtimeConfig} />
    </LegacyI18nProvider>
  );
}

type RootNotFoundUsermenuTab = "myOrganizationList" | "myProjectList" | "myRecentIssueList";

function RootAliasNotFoundScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const [activeUsermenuTab, setActiveUsermenuTab] =
    React.useState<RootNotFoundUsermenuTab>("myOrganizationList");
  const handleUsermenuTabClick =
    (tab: RootNotFoundUsermenuTab) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveUsermenuTab(tab);
    };
  const rootAliasLocation = useRouterState({ select: (state) => state.location });
  const pathname = rootAliasLocation.pathname;
  const resetPasswordSearch = rootAliasLocation.search;
  const feedbackUrl = runtimeConfig.feedbackUrl?.trim();
  const loginFormPath: string = "/users/loginform";
  const signupFormPath: string = "/users/signupform";
  const logoutPath: string = "/logout";

  if (pathname === "/reset-password") {
    return <Navigate to="/resetPassword" search={resetPasswordSearch} replace />;
  }

  return (
    <>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <Link
            activeOptions={legacyPlainLinkActiveOptions}
            activeProps={legacyPlainLinkActiveProps}
            className="logo"
            to="/"
          >
            <h1 className="blind">{runtimeConfig.siteName ?? "Yoram"}</h1>
          </Link>
          <ul className="gnb-nav">
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                to="/projects"
              >
                {t("title.projectList")}
              </Link>
            </li>
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                to="/_help"
              >
                {t("title.help")}
              </Link>
            </li>
            {feedbackUrl ? (
              <li>
                <Link to={feedbackUrl} target="_blank">
                  {t("title.yobi.feedback")}
                </Link>
              </li>
            ) : null}
          </ul>
          <div id="mySidenav" className="sidenav">
            <div className="span5 right-menu span-hard-wrap">
              <div className="row-fluid user-menu-wrap">
                <span className="user-menu">
                  <Link
                    activeOptions={legacyPlainLinkActiveOptions}
                    activeProps={legacyPlainLinkActiveProps}
                    params={{ user: "anonymous" }}
                    search={{ daysAgo: undefined!, selected: undefined! }}
                    to="/$user"
                  >
                    {t("userinfo.profile")}
                  </Link>
                </span>
                <span className="user-menu">
                  <Link to="/user/editform" search={{}} reloadDocument>
                    {t("userinfo.accountSetting")}
                  </Link>
                </span>
                <Link to={logoutPath} reloadDocument>
                  <span className="user-menu logout label">{t("title.logout")}</span>
                </Link>
              </div>
              <ul className="nav nav-tabs nm">
                <li
                  className={`myOrganizationList${activeUsermenuTab === "myOrganizationList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myOrganizationList")}>
                    {t("title.favorite")}
                  </button>
                </li>
                <li
                  className={`myProjectList${activeUsermenuTab === "myProjectList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myProjectList")}>
                    {t("title.project")}
                  </button>
                </li>
                <li
                  className={`myRecentIssueList${activeUsermenuTab === "myRecentIssueList" ? " active" : ""}`}
                >
                  <button type="button" onClick={handleUsermenuTabClick("myRecentIssueList")}>
                    {t("title.recently.visited.issue")}
                  </button>
                </li>
              </ul>
              <div className="tab-content tab-box">
                <div id="usermenu-tab-content-list" className="tab-content">
                  {"Loading..."}
                </div>
              </div>
            </div>
          </div>
          <ul className="gnb-usermenu">
            <li className="gnb-usermenu-item" id="required-logged-in">
              <Link to={loginFormPath} className="user-item-btn" data-login="required">
                {t("title.login")}
              </Link>
            </li>
            <li className="divider"></li>
            <li>
              <Link to={signupFormPath} className="ybtn ybtn-success">
                {t("title.signup")}
              </Link>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <div
            {...stylex.props(rootNotFoundStyles.errorWrap)}
            className={`${stylex.props(rootNotFoundStyles.errorWrap).className} error-wrap`}
            data-stylex-owner="root-alias-notfound-error-wrap"
          >
            <i
              {...stylex.props(rootNotFoundStyles.errorIcon(legacySpriteUrl))}
              className={`${stylex.props(rootNotFoundStyles.errorIcon(legacySpriteUrl)).className} ico ico-err2`}
              data-stylex-owner="root-alias-notfound-error-icon"
            />
            <p
              {...stylex.props(rootNotFoundStyles.errorMessage)}
              data-stylex-owner="root-alias-notfound-error-message"
            >
              {t("error.notfound")}
            </p>
            <Link
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
              className="ybtn ybtn-info"
              data-stylex-owner="root-alias-notfound-home"
              to="/"
            >
              {t("menu.home")}
            </Link>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">Yoram authors</span>
        </div>
      </footer>
    </>
  );
}
