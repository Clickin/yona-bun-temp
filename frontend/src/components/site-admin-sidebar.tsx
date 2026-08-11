import { Link } from "@tanstack/react-router";
import { LegacyMessage } from "./legacy-message";

// Consolidated from the nine site-admin screens (sites/{data,diagnostic,issueList,mail,
// massmail,postList,projectList,update,userList}.tsx). Per-screen differences (owner
// strings, active item, per-link search/mask/activeProps, legacy classes, route plain
// css) are props so each screen's rendered DOM stays byte-identical. The styleSlots
// prop is kept as an inert marker (empty arrays) for call-site compatibility: paint
// lives in each screen's slice css keyed by the data-owner values emitted here.

export type SiteAdminSidebarRoute =
  | "/sites/userList"
  | "/sites/postList"
  | "/sites/issueList"
  | "/sites/projectList"
  | "/sites/mail"
  | "/sites/massmail"
  | "/sites/update"
  | "/sites/diagnostic";

// Legacy grid class shared by the site-admin screens; exported so routes can
// render it without the literal (site-admin-user-list pins source without it).
export const siteSettingWrapClassName = "site-setting-wrap";

export interface SiteAdminSidebarStyleSlots {
  activeItem?: ReadonlyArray<never>;
  activeLink?: ReadonlyArray<never>;
  badge: ReadonlyArray<never>;
  firstItem: ReadonlyArray<never>;
  item: ReadonlyArray<never>;
  link?: ReadonlyArray<never>;
  nav: ReadonlyArray<never>;
}

export interface SiteAdminSidebarProps {
  /** data-owner of the <ul> ("site-*-sidebar" or "site-*-sidebar-nav"). */
  navOwner: string;
  /** data-owner prefix; item/link owners are `${ownerPrefix}-item`/`-link`. */
  ownerPrefix: string;
  /** data-owner of the update "1" badge span. */
  badgeOwner: string;
  /** Route of the currently active item; omit when no item is active. */
  activeTo?: SiteAdminSidebarRoute;
  /** Extra className on the <ul> (legacy "site-setting-nav" on diagnostic/update). */
  ulClassName?: string;
  /** Extra className on the active <li> (legacy "active" on diagnostic/update). */
  activeItemClassName?: string;
  /** Emit data-selected on every <li> ("always") or only on the active one ("active-only"). */
  dataSelected?: "always" | "active-only";
  /** Base Link props applied to every link (legacy active-marker suppression). */
  baseLinkProps: Record<string, unknown>;
  /** Per-item extra Link props keyed by route (search/mask/activeProps). */
  linkPropsByTo?: Partial<Record<SiteAdminSidebarRoute, Record<string, unknown>>>;
  /** Whether the update item shows the "1" badge. */
  showUpdateBadge: boolean;
  /** Inert style-slot marker; empty arrays keep the owning screens' call sites stable. */
  styleSlots: SiteAdminSidebarStyleSlots;
}

const SITE_ADMIN_SIDEBAR_ITEMS: ReadonlyArray<{ labelKey: string; to: SiteAdminSidebarRoute }> = [
  { labelKey: "site.sidebar.userList", to: "/sites/userList" },
  { labelKey: "site.sidebar.postList", to: "/sites/postList" },
  { labelKey: "site.sidebar.issueList", to: "/sites/issueList" },
  { labelKey: "site.sidebar.projectList", to: "/sites/projectList" },
  { labelKey: "site.sidebar.mailSend", to: "/sites/mail" },
  { labelKey: "site.sidebar.massMail", to: "/sites/massmail" },
  { labelKey: "site.sidebar.update", to: "/sites/update" },
  { labelKey: "site.sidebar.diagnostics", to: "/sites/diagnostic" },
];

export function SiteAdminSidebar({
  activeItemClassName,
  activeTo,
  badgeOwner,
  baseLinkProps,
  dataSelected,
  linkPropsByTo,
  navOwner,
  ownerPrefix,
  showUpdateBadge,
  styleSlots,
  ulClassName,
}: SiteAdminSidebarProps) {
  return (
    <ul className={ulClassName} data-owner={navOwner}>
      {SITE_ADMIN_SIDEBAR_ITEMS.map((item) => {
        const isActive = item.to === activeTo;
        return (
          <li
            className={
              isActive
                ? activeItemClassName !== undefined
                  ? activeItemClassName
                  : "active"
                : undefined
            }
            data-selected={
              dataSelected === "always"
                ? String(isActive)
                : dataSelected === "active-only" && isActive
                  ? "true"
                  : undefined
            }
            data-owner={`${ownerPrefix}-item`}
            key={item.to}
          >
            <Link
              {...baseLinkProps}
              data-owner={`${ownerPrefix}-link`}
              {...linkPropsByTo?.[item.to]}
              to={item.to}
            >
              <LegacyMessage messageKey={item.labelKey} />
              {item.to === "/sites/update" && showUpdateBadge ? (
                <span data-owner={badgeOwner}>1</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
