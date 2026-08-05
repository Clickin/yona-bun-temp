import { Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { LegacyMessage } from "./legacy-message";

// Consolidated from the nine site-admin screens (sites/{data,diagnostic,issueList,mail,
// massmail,postList,projectList,update,userList}.tsx). Per-screen differences (owner
// strings, active item, per-link search/mask/activeProps, legacy classes, route stylex)
// are props so each screen's rendered DOM stays byte-identical.

export type SiteAdminSidebarRoute =
  | "/sites/userList"
  | "/sites/postList"
  | "/sites/issueList"
  | "/sites/projectList"
  | "/sites/mail"
  | "/sites/massmail"
  | "/sites/update"
  | "/sites/diagnostic";

export interface SiteAdminSidebarStyleSlots {
  activeItem?: ReadonlyArray<stylex.CompiledStyles>;
  activeLink?: ReadonlyArray<stylex.CompiledStyles>;
  badge: ReadonlyArray<stylex.CompiledStyles>;
  firstItem: ReadonlyArray<stylex.CompiledStyles>;
  item: ReadonlyArray<stylex.CompiledStyles>;
  link?: ReadonlyArray<stylex.CompiledStyles>;
  nav: ReadonlyArray<stylex.CompiledStyles>;
}

export interface SiteAdminSidebarProps {
  /** data-stylex-owner of the <ul> ("site-*-sidebar" or "site-*-sidebar-nav"). */
  navOwner: string;
  /** data-stylex-owner prefix; item/link owners are `${ownerPrefix}-item`/`-link`. */
  ownerPrefix: string;
  /** data-stylex-owner of the update "1" badge span. */
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
  /** Per-element stylex style slots from the owning screen. */
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
  const navStyleProps = stylex.props(styleSlots.nav);
  return (
    <ul
      {...navStyleProps}
      className={
        ulClassName === undefined
          ? navStyleProps.className
          : `${ulClassName} ${navStyleProps.className}`
      }
      data-stylex-owner={navOwner}
    >
      {SITE_ADMIN_SIDEBAR_ITEMS.map((item, index) => {
        const isActive = item.to === activeTo;
        const itemStyleProps = stylex.props(
          isActive ? styleSlots.activeItem : index === 0 ? styleSlots.firstItem : styleSlots.item,
        );
        return (
          <li
            {...itemStyleProps}
            className={
              isActive && activeItemClassName !== undefined
                ? `${activeItemClassName} ${itemStyleProps.className}`
                : itemStyleProps.className
            }
            data-selected={
              dataSelected === "always"
                ? String(isActive)
                : dataSelected === "active-only" && isActive
                  ? "true"
                  : undefined
            }
            data-stylex-owner={`${ownerPrefix}-item`}
            key={item.to}
          >
            <Link
              {...baseLinkProps}
              {...stylex.props(styleSlots.link, isActive && styleSlots.activeLink)}
              data-stylex-owner={`${ownerPrefix}-link`}
              {...linkPropsByTo?.[item.to]}
              to={item.to}
            >
              <LegacyMessage messageKey={item.labelKey} />
              {item.to === "/sites/update" && showUpdateBadge ? (
                <span {...stylex.props(styleSlots.badge)} data-stylex-owner={badgeOwner}>
                  1
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
