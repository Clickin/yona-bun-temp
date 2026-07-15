import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { verifyUser } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YoramQueryProvider } from "../../../query-client";
import type { RuntimeConfig } from "../../../runtime-config";
import { globalColors } from "../../../theme.stylex";
import { SiteLayoutShell } from "../../-home-route-screen";

const styles = stylex.create({
  taglineWrap: {
    textAlign: globalColors.resetPasswordTaglineTextAlign,
    marginTop: globalColors.resetPasswordTaglineMarginTop,
    marginBottom: globalColors.resetPasswordTaglineMarginBottom,
    paddingTop: globalColors.resetPasswordTaglinePaddingTop,
  },
  title: {
    display: globalColors.resetPasswordTitleDisplay,
    fontFamily: globalColors.resetPasswordTitleFontFamily,
    fontSize: globalColors.resetPasswordTitleFontSize,
    lineHeight: globalColors.resetPasswordTitleLineHeight,
    fontWeight: globalColors.resetPasswordTitleFontWeight,
  },
  tagline: {
    marginTop: globalColors.resetPasswordTaglineCopyMarginTop,
    fontSize: globalColors.resetPasswordTaglineFontSize,
    color: globalColors.resetPasswordTaglineColor,
  },
});

const taglineWrapStyleProps = stylex.props(styles.taglineWrap);
const titleStyleProps = stylex.props(styles.title);
const taglineStyleProps = stylex.props(styles.tagline);

export const Route = createFileRoute("/verify/$loginId/$verificationCode")({
  component: VerifyUserRoute,
});

function VerifyUserRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <VerifyUserScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function VerifyUserScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { loginId, verificationCode } = Route.useParams();
  const { t } = useLegacyMessages();
  const legacyBrowserTitle = "";
  const verificationQuery = useQuery({
    queryKey: ["auth", "verify", loginId, verificationCode],
    queryFn: () =>
      verifyUser(runtimeConfig, {
        loginId,
        verificationCode,
      }),
    retry: false,
  });

  if (verificationQuery.isError) {
    return <>Invalid verification</>;
  }

  if (!verificationQuery.data) {
    return (
      <>
        <title>{legacyBrowserTitle}</title>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <div className="page full">
            <div className="center-wrap tag-line-wrap reset-password">
              <p className="tag-line">{t("common.loading")}</p>
            </div>
          </div>
        </SiteLayoutShell>
      </>
    );
  }

  const verifiedLoginId =
    typeof verificationQuery.data.loginId === "string" ? verificationQuery.data.loginId : loginId;

  return (
    <>
      <title>{legacyBrowserTitle}</title>
      <SiteLayoutShell runtimeConfig={runtimeConfig}>
        <div className="page full">
          <div
            {...taglineWrapStyleProps}
            className={`center-wrap tag-line-wrap reset-password ${taglineWrapStyleProps.className ?? ""}`}
            data-stylex-owner="verified-user-success"
          >
            <h1 {...titleStyleProps} className={`title ${titleStyleProps.className ?? ""}`}>
              {t("user.verified")}
            </h1>
            <p>{verifiedLoginId}</p>
            <hr />
            <p {...taglineStyleProps} className={`tag-line ${taglineStyleProps.className ?? ""}`}>
              {t("user.verified.detail")}
            </p>
          </div>
        </div>
      </SiteLayoutShell>
    </>
  );
}
