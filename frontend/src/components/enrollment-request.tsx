import { Link } from "@tanstack/react-router";
import { useLegacyMessages } from "../i18n";

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

  return (
    <div className="span2">
      <div className="mr10" data-owner={avatarWrapOwner}>
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
      <div data-owner={detailsOwner}>
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
