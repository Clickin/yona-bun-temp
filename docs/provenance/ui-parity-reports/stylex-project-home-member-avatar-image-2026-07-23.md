# Project-home member-card avatar image/surface parity report

- State: authenticated populated project home member-card avatar.
- Legacy output: `yona-original/app/views/project/home.scala.html:128-135`.
- Frozen declarations: `_yobiUI.less:439-466` (`background:#ddd`, image
  `width:100%` and `vertical-align:top`), with wrapper/cascade evidence from
  `_common.less:140-153`, `_page.less:2677-2702`, Bootstrap, and all `yobi.less`
  imports.
- React owner: `frontend/src/routes/$ownerName/$projectName.tsx`.
- Focused contract: `frontend/tests/stylex-project-home-member-avatar-image.e2e.ts`.
- Verification: managed dynamic-port system Chrome, `PW_CHANNEL=chrome`, normal
  1/1 and `VITE_DISABLE_LEGACY_FALLBACK=1` 1/1; desktop 1366/mobile 390
  containment and document overflow checks pass.
- Live legacy rendering was unavailable, so screenshot parity against a live
  legacy page is explicitly unverified. No compensating geometry was added.
- The Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD,
  upstream Yona repository, and developer-contact entries. This approved
  identity diff is intentional, not a parity gap.
