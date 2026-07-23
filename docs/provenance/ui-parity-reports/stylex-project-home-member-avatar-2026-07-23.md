# Project-home member-card avatar wrapper parity report

- State: authenticated populated project home member card with fallback avatar.
- Legacy source: `yona-original/app/views/project/home.scala.html:128-135`.
- Frozen geometry: `_common.less:140-153`, `_page.less:2677-2702`, Bootstrap
  `.img-rounded`/`.pull-left`, and the complete `yobi.less` import chain.
- React owner: `frontend/src/routes/$ownerName/$projectName.tsx`.
- Contract: `frontend/tests/stylex-project-home-member-avatar-wrapper.e2e.ts`.
- Verification: managed dynamic-port system Chrome, `PW_CHANNEL=chrome`, normal
  1/1 and `VITE_DISABLE_LEGACY_FALLBACK=1` 1/1; desktop and 390px containment
  checks included.
- Live legacy rendering was unavailable, so screenshot parity against a live
  legacy page is explicitly unverified. No compensating geometry was added.
- The Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD,
  upstream Yona repository, and developer-contact entries. This is an approved
  identity diff, not a parity gap, and must remain unchanged.
