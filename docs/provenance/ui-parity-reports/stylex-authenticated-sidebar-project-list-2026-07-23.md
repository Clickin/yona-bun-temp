# Authenticated sidebar project/organization list-item parity — 2026-07-23

Batch 847 moves one frozen declaration into the existing authenticated sidebar
StyleX boundary:

```css
.user-project-list li {
  margin-left: 0;
}
```

Legacy output comes from `yona-original/app/views/sidebar.scala.html:58-74`
and `yona-original/app/views/common/usermenu_tab_content_list.scala.html:1-13`.
The complete `yobi.less` import chain and
`yona-original/app/assets/stylesheets/less/_usermenu.less` establish the
declaration. React owns the same visible behavior through
`authenticatedSidenavProjectOrganizationListStyles.item` on the authenticated
organization row, nested favorite-project row, and direct-project row.

The legacy classes, list/tab DOM, translated copy, search filtering, favorite
star controls, and TanStack links remain intact. No frozen source, global
selector, or compensating geometry was added.

Focused evidence:

- `frontend/tests/stylex-authenticated-sidebar-project-list.e2e.ts`
- managed dynamic-port system Chrome (`PW_CHANNEL=chrome`)
- 3/3 passing in normal mode and 3/3 in fallback-off mode
- desktop `1366x900` and mobile `390x844` containment checks
- screenshots under
  `frontend/output/playwright/stylex-authenticated-sidebar-project-list/`

The populated live legacy instance was unavailable, so the captured React
screenshots are recorded but live screenshot comparison remains unverified.
The approved Yoram footer intentionally differs by omitting unrelated
NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact
entries; this is an intentional identity change, not a parity gap.
