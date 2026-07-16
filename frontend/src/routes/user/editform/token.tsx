import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { resetApiTokenRest, readWorkspaceOverviewRest } from "../../../api/workspace";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import * as stylex from "@stylexjs/stylex";
import { tokenSettingsColors } from "./-token.stylex";

const styles = stylex.create({
  form: {
    float: "left",
    margin: "0px 0px 2px",
    width: "100%",
  },
  input: { width: "90%" },
  resetAction: {
    backgroundColor: {
      default: tokenSettingsColors.actionSurface,
      ":hover": tokenSettingsColors.actionInteractiveSurface,
      ":focus": tokenSettingsColors.actionInteractiveSurface,
      ":active": tokenSettingsColors.actionInteractiveSurface,
    },
    borderColor: tokenSettingsColors.actionBorder,
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: tokenSettingsColors.actionShadow,
    color: tokenSettingsColors.actionText,
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0px",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
});

const formStyleProps = stylex.props(styles.form);
const inputStyleProps = stylex.props(styles.input);
const resetActionStyleProps = stylex.props(styles.resetAction);

export const Route = createFileRoute("/user/editform/token")({
  component: UserTokenSettingsRoute,
});

function UserTokenSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <UserTokenSettingsScreen runtimeConfig={runtimeConfig} />;
}

function UserTokenSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const tokenResetAction = prefixBasePath(runtimeConfig.basePath, "/user/editform/token_reset");
  const workspaceQuery = useQuery({
    queryFn: () => readWorkspaceOverviewRest(runtimeConfig),
    queryKey: ["workspace", "overview"],
  });
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return resetApiTokenRest(runtimeConfig, csrfToken);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData(["workspace", "overview"], workspace);
    },
  });
  const apiToken =
    typeof workspaceQuery.data?.apiToken === "string" ? workspaceQuery.data.apiToken : "";

  return (
    <div data-testid="user-token-settings-wrapper" data-stylex-owner="user-token-settings-wrapper">
      <form
        {...formStyleProps}
        id="frmBasic"
        method="post"
        action={tokenResetAction}
        className={formStyleProps.className}
        data-stylex-owner="user-token-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          resetMutation.mutate();
        }}
      >
        <div>{t("userinfo.token")}</div>
        <div>
          <input
            {...inputStyleProps}
            onClick={(event) => {
              event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
            }}
            size={45}
            type="text"
            name="name"
            className={inputStyleProps.className}
            data-stylex-owner="user-token-settings-input"
            value={apiToken}
            readOnly
          />
        </div>
        <div>
          <button
            {...resetActionStyleProps}
            type="submit"
            className={resetActionStyleProps.className}
            data-stylex-owner="user-token-settings-reset-action"
          >
            {t("userinfo.recreateToken")}
          </button>
        </div>
      </form>
    </div>
  );
}
