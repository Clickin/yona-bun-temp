# Organization members add-member form parity — 2026-07-23

Batch 849 moves the exact frozen form declarations into the existing
organization-members StyleX boundary.

Legacy output is `yona-original/app/views/organization/members.scala.html:31-39`:
the `inner-bubble` contains the native `nm` form and `text uname` input. Frozen
`yona-original/app/assets/stylesheets/less/_page.less:2169-2179` defines:

```css
.inner-bubble {
  margin-bottom: 10px;
  position: relative;
}

.inner-bubble .text.uname {
  width: 384px;
  margin: 0;
  border-radius: 2px;
}
```

React keeps the legacy classes, form/input/button DOM, placeholder and button
copy, typeahead selection, submit mutation, and responsive fallback. StyleX
owns only `addFormBubble` and `addFormUsername`; no frozen file, app.css
selector, or compensating number changed.

Focused evidence:

- `frontend/tests/stylex-organization-members-list.e2e.ts`
- managed dynamic-port system Chrome (`PW_CHANNEL=chrome`)
- 7/7 passing, including normal/fallback-off form cases
- desktop `1366x900` and mobile `390x844` geometry/no-overflow checks
- screenshots under `frontend/output/playwright/visual-sweep/`

The live legacy instance was unavailable, so screenshot comparison against
legacy remains unverified. Approved Yoram footer/provider/developer-contact/
repository differences remain intentional identity changes.
