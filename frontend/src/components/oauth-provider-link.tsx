/* Shared OAuth provider logo + login link. Legacy Yona rendered provider
 * logos via TemplateHelper.providerWithLogo for github/google only; Yoram
 * adds kakao/naver (Korean apps commonly offer them). The login buttons are
 * the legacy `ybtn oauth-login-btn` shell pointing at `/authenticate/{kind}`;
 * kakao/naver render as text chips until official logo assets are added.
 */
import { Link } from "@tanstack/react-router";
import kakaoLogoUrl from "../assets/legacy/provider-logo/kakaotalk_sharing_btn_small.png?no-inline";
import naverLogoUrl from "../assets/legacy/provider-logo/NAVER_login_Dark_KR_green_icon_H56.png?no-inline";
import { prefixBasePath } from "../runtime-config";

export const OAUTH_PROVIDER_KINDS = ["github", "google", "kakao", "naver"] as const;
export type OAuthProviderKind = (typeof OAUTH_PROVIDER_KINDS)[number];

const GITHUB_OAUTH_LOGO_PATH =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38C13.71 14.53 16 11.53 16 8 16 3.58 12.42 0 8 0z";

function providerDisplayName(kind: OAuthProviderKind) {
  switch (kind) {
    case "github":
      return "github";
    case "google":
      return "Google";
    case "kakao":
      return "Kakao";
    case "naver":
      return "Naver";
  }
}

export function normalizeOAuthProviderKind(value: string): OAuthProviderKind | null {
  const normalized = value.trim().toLowerCase();
  return OAUTH_PROVIDER_KINDS.includes(normalized as OAuthProviderKind)
    ? (normalized as OAuthProviderKind)
    : null;
}

export function OAuthProviderLogo({
  basePath,
  dataOwnerPrefix,
  kind,
}: {
  basePath: string;
  dataOwnerPrefix: string;
  kind: string;
}) {
  const normalized = normalizeOAuthProviderKind(kind);
  if (!normalized) {
    return null;
  }
  const owner = `${dataOwnerPrefix}-provider-${normalized}`;
  if (normalized === "github") {
    return (
      <span className="github" data-owner={owner}>
        <svg aria-hidden="true" height="24" version="1.1" viewBox="0 0 16 16" width="19">
          <path d={GITHUB_OAUTH_LOGO_PATH} />
        </svg>
      </span>
    );
  }
  if (normalized === "google") {
    // Legacy DOM: the img is a direct child of `.auth-provider-logo`
    // (TemplateHelper.GoogleLogo), served from the legacy provider-logo
    // asset path.
    return (
      <img
        alt="login with Google"
        data-owner={`${owner}-image`}
        src={prefixBasePath(
          basePath,
          "/assets/images/provider-logo/btn_google_light_normal_ios.svg",
        )}
      />
    );
  }
  if (normalized === "kakao") {
    return <img alt="login with Kakao" data-owner={`${owner}-image`} src={kakaoLogoUrl} />;
  }
  // The supplied naver logo is a 224px square icon; render it at the same
  // size as the other provider logos (github svg is 24px tall).
  return (
    <img
      alt="login with Naver"
      data-owner={`${owner}-image`}
      height={24}
      src={naverLogoUrl}
      width={24}
    />
  );
}

export function OAuthProviderLink({
  basePath,
  dataOwnerPrefix,
  provider,
}: {
  basePath: string;
  dataOwnerPrefix: string;
  provider: string;
}) {
  const normalized = normalizeOAuthProviderKind(provider);
  if (!normalized) {
    return null;
  }
  const providerLoginPath: string = `/authenticate/${normalized}`;
  return (
    <Link
      to={providerLoginPath}
      href={prefixBasePath(basePath, providerLoginPath)}
      className="ybtn oauth-login-btn"
      data-owner={`${dataOwnerPrefix}-provider-button`}
      reloadDocument
    >
      <span className="auth-provider-logo" data-owner={`${dataOwnerPrefix}-provider-logo`}>
        <OAuthProviderLogo
          basePath={basePath}
          dataOwnerPrefix={dataOwnerPrefix}
          kind={normalized}
        />{" "}
        {normalized === "google" ? (
          // Legacy DOM: the Google label is bare text (no .provider-name span).
          <>Sign in with Google</>
        ) : (
          <span className="provider-name">{`Sign in with ${providerDisplayName(normalized)}`}</span>
        )}
      </span>
    </Link>
  );
}
