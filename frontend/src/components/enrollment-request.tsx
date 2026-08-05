import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useLegacyMessages } from "../i18n";
import { enrollmentAvatarWrap, enrollmentDetails } from "./enrollment-request.stylex";

// Consolidated from the organization and project members screens
// (members.tsx in both). Per-screen differences are props so each screen's
// rendered DOM stays byte-identical.

function stringField(value: unknown, fallback: string) {
  if (typeof value === "string") {
    return value;
  }
  return fallback;
}

export interface EnrollmentRequestUser {
  avatarUrl?: unknown;
  loginId?: unknown;
  userLabel?: unknown;
  userId?: unknown;
}

type LinkActiveOptions = {
  exact?: boolean;
  explicitUndefined?: boolean;
  includeHash?: boolean;
  includeSearch?: boolean;
};

export function EnrollmentRequest({
  activeOptions,
  activeProps,
  avatarDefaultSrc,
  avatarWrapOwner,
  detailsOwner,
  onAccept,
  user,
}: {
  activeOptions?: LinkActiveOptions;
  activeProps: Record<string, unknown>;
  avatarDefaultSrc: string;
  avatarWrapOwner: string;
  detailsOwner: string;
  onAccept: (loginId: string, userId: unknown) => void;
  user: EnrollmentRequestUser;
}) {
  const { t } = useLegacyMessages();
  const loginId = stringField(user.loginId, "");
  const avatarWrapProps = stylex.props(enrollmentAvatarWrap.root);
  const detailsStyleProps = stylex.props(enrollmentDetails.root);

  return (
    <div className="span2">
      <div
        className={`${avatarWrapProps.className ?? ""} mr10`.trim()}
        data-stylex-owner={avatarWrapOwner}
      >
        <Link
          {...(activeOptions === undefined ? {} : { activeOptions })}
          activeProps={activeProps}
          params={{ user: loginId }}
          to="/$user"
        >
          <img
            src={stringField(user.avatarUrl, "") || avatarDefaultSrc}
            height="65"
            width="65"
            className="img-circle"
            alt=""
          />
        </Link>
      </div>
      <div className={detailsStyleProps.className} data-stylex-owner={detailsOwner}>
        <span>
          <Link
            {...(activeOptions === undefined ? {} : { activeOptions })}
            activeProps={activeProps}
            params={{ user: loginId }}
            to="/$user"
          >
            <strong>{stringField(user.userLabel, loginId)}</strong>
          </Link>
        </span>
        <span>({loginId})</span>
        <button
          type="button"
          className="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"
          data-loginid={loginId}
          onClick={() => onAccept(loginId, user.userId)}
        >
          <i className="yobicon-addfriend"></i>
          {t("button.add")}
        </button>
      </div>
    </div>
  );
}
