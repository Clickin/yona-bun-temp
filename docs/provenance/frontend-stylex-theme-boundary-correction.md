# Frontend StyleX Theme-Boundary Correction

Status: active blocker; Wave 1 route migration paused
Date: 2026-07-15

## Reason

The first 150 migration slices used `globalColors` as a catch-all for both theme paint and
route-local geometry. That recreates the centralized responsibility the StyleX migration is meant
to remove. Legacy provenance belongs in colocated comments, focused E2E, and the migration ledger;
it does not justify putting every literal behind a global variable.

## Required ownership

- Common theme variables: only semantic colors, surfaces, border colors, and theme-dependent
  shadows shared by multiple real consumers with the same meaning.
- `globalColors` final contract: only genuinely shared light/dark-mode override colors, surfaces,
  border colors, and semantic shadows. If none remain, delete the registry. A renamed catch-all or
  a registry containing the full CSS declaration set still fails the correction.
- Route theme variables: route-only theme paint in a route-owned `stylex.defineVars` set.
- Colocated `stylex.create`: margin, padding, width, height, offsets, display, typography size,
  weight and line height, border width/style/radius, responsive geometry, and other non-theme
  declarations written directly from frozen evidence.
- Provenance: legacy source comments, focused tests, and ledger rows, never variable indirection.

## Baseline inventory

The correction started with 2,129 definitions in `frontend/src/theme.stylex.ts`, 2,259 distinct
source references to `globalColors.*`, and 20 source consumers:

- `frontend/src/routes/-home-route-screen.tsx`
- `frontend/src/routes/__root.tsx`
- `frontend/src/routes/lostPassword.tsx`
- `frontend/src/routes/migration.tsx`
- `frontend/src/routes/resetPassword.tsx`
- `frontend/src/routes/restart.tsx`
- `frontend/src/routes/restricted.tsx`
- `frontend/src/routes/secret.tsx`
- `frontend/src/routes/sites/data.tsx`
- `frontend/src/routes/sites/diagnostic.tsx`
- `frontend/src/routes/sites/issueList.tsx`
- `frontend/src/routes/sites/mail.tsx`
- `frontend/src/routes/sites/massmail.tsx`
- `frontend/src/routes/sites/postList.tsx`
- `frontend/src/routes/sites/projectList.tsx`
- `frontend/src/routes/sites/update.tsx`
- `frontend/src/routes/sites/userList.tsx`
- `frontend/src/routes/users/loginform.tsx`
- `frontend/src/routes/users/signupform.tsx`
- `frontend/src/routes/verify/$loginId/$verificationCode.tsx`

## Resume gate

The original Wave 1 route/state sequence must not resume until current source evidence proves all
of the following:

- zero unclassified definitions;
- zero non-theme values in any `stylex.defineVars` set;
- zero route-only values in the common theme;
- `globalColors` is absent or every remaining definition and consumer is proven to be a genuinely
  shared light/dark-mode color boundary;
- affected browser parity and full frontend check/Vitest/build/StyleX verification pass;
- frozen hashes remain exact and correction provenance is committed.
- the final correction commit adds a precommit guard and focused contract test preventing
  non-color or route-owned entries from returning to `globalColors`.

## Correction ledger

| Consumer | Non-theme declarations inlined | Route theme isolated | Common theme reviewed | Focused parity | Commit |
| --- | --- | --- | --- | --- | --- |
| `/users/signupform` existing standalone signup owners | all 94 `globalColors` references audited; layout, responsive sizing, typography, spacing, input, label, and validation-popover structure/behavior declarations inlined | 9 route-local text/surface/border/shadow paint keys in ignored route module `users/-signupform.stylex.ts` | all 87 sole-consumer `standaloneSignup*` definitions removed | focused runtime assertions retained and static contracts enforce route isolation and zero global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/users/loginform` existing standalone login owners | all 46 `globalColors` references audited; layout, responsive sizing, typography, spacing, input structure, and behavior declarations inlined | 3 route-local text/border paint keys in ignored route module `users/-loginform.stylex.ts` | all 46 sole-consumer `standaloneLogin*` definitions removed | focused runtime assertions retained and static contracts enforce route isolation and zero global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/issueList` existing owners | all 182 `globalColors` references audited; tabs/sidebar/list/avatar/metadata/pagination geometry, typography, borders, interaction, and responsive values inlined | 16 route-local paint/shadow keys in ignored route module `sites/-issueList.stylex.ts` | all 149 sole-consumer `siteIssueList*` definitions plus the last-consumer 10 diagnostic title-strip definitions removed | focused runtime assertions retained and static contracts enforce removal from common theme and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/postList` existing owners | all 134 `globalColors` references audited; list/sidebar/avatar/metadata/pagination geometry, typography, border structure, interaction, and responsive values inlined | 13 route-local paint/shadow keys in ignored route module `sites/-postList.stylex.ts` | all 117 sole-consumer `sitePostList*` definitions removed; shared title-strip keys remain only for issueList | focused runtime assertions retained and static contracts enforce removal from common theme and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/massmail` existing owners | all 128 `globalColors` references audited; geometry, spacing, typography, border structure, interaction, and behavior declarations inlined | 17 route-local paint/shadow keys in ignored route module `sites/-massmail.stylex.ts` | all 99 sole-consumer `siteMassMail*` definitions removed; shared title-strip keys remain for issueList and postList | focused runtime assertions retained and static ownership contracts enforce route isolation and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/userList` existing title/search owners | all 12 `globalColors` references audited; title geometry, typography, float, and form margin inlined | 2 route-local title paint keys in ignored route module `sites/-userList.stylex.ts` | both sole-consumer `siteUserList*` definitions removed; shared title-strip keys remain for three real site-admin consumers | focused runtime assertions retained and static ownership contracts enforce route paint isolation and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/update` existing owners | all 90 `globalColors` references audited; geometry, spacing, typography, border structure, interaction, and behavior declarations inlined | 17 route-local paint/shadow keys in ignored route module `sites/-update.stylex.ts` | all 59 sole-consumer `siteUpdate*` definitions and the 15 last-consumer diagnostic error-pre definitions removed; shared title-strip keys remain for four real site-admin consumers | focused runtime assertions retained and static ownership contracts enforce route isolation and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/mail` existing owners | all 103 `globalColors` references audited; geometry, spacing, typography, border structure, interaction, and behavior declarations inlined | 21 route-local paint/shadow keys in ignored route module `sites/-mail.stylex.ts` | no mail global retained; all 73 sole-consumer `siteMail*` definitions removed, while shared title-strip definitions remain for five real site-admin consumers pending their corrections | focused runtime assertions retained and static ownership contracts enforce route paint isolation and zero route global references; TypeScript passes; browser execution is included in the final consolidated server run | this commit |
| `/sites/diagnostic` existing owners | all 68 `globalColors` references audited; geometry, spacing, typography, border structure, interaction, and layout declarations inlined | 12 route-local paint/shadow keys in ignored route module `sites/-diagnostic.stylex.ts` | route refs removed and 31 sole-consumer sidebar definitions deleted; 10 title-strip keys remain for six real site-admin consumers and 15 error-pre keys remain for the update route until those consumers are corrected | focused runtime assertions retained and static ownership contracts enforce route paint isolation and zero route global references; TypeScript passes; browser execution awaits the final consolidated server run after two startup timeouts | this commit |
| `/sites/data` existing owners | all 74 `globalColors` references audited; geometry, spacing, typography, border structure, interaction, and layout declarations inlined | 14 route-local paint/shadow keys in ignored route module `sites/-data.stylex.ts` | no common global retained by this route; all 55 sole-consumer `siteData*` definitions removed, while shared diagnostic definitions remain for their real consumers | 27/27 focused sidebar, title, warning, export, and site-admin runtime assertions pass; static ownership contracts enforce route paint isolation and zero route global references; TypeScript passes | this commit |
| `/lostPassword` existing owners | all 108 `globalColors` references audited; geometry, spacing, typography, border structure, responsive values, opacity and behavior declarations inlined | 13 route-local paint keys in ignored route module `-lostPassword.stylex.ts` | no common global retained; 100 sole-consumer definitions removed | 25/25 focused anonymous/authenticated success/error/prefill branch, desktop/mobile geometry, paint, dismissal, and exclusion checks pass after stale locators moved to actual conditional owners; TypeScript passes | this commit |
| `/resetPassword` existing owners | all 85 `globalColors` references audited; geometry, spacing, typography, border structure, responsive values, and behavior declarations inlined | 9 route-local paint/shadow keys in ignored route module `-resetPassword.stylex.ts` | no common global retained; 78 sole-consumer definitions removed after verification route correction | 18/18 affected focused/form/API/desktop-mobile checks pass; two whole-screen checks retain stale legacy popover-class and bad-request child-order expectations outside this ownership correction; TypeScript passes | this commit |
| `/verify/$loginId/$verificationCode` existing success owner | all 12 `globalColors` references audited; geometry, spacing, typography, and behavior declarations inlined | 1 route-local paint key in ignored route module `verify/$loginId/-verification.stylex.ts` | route refs removed; shared reset-password globals retained for real `resetPassword.tsx` consumer pending that consumer's audit | 9/9 affected success/pending/error/API/desktop-mobile checks pass; the whole-screen success DOM check retains the pre-existing shared GNB/footer mismatch; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
| `/restricted` existing sidebar pin | all 20 `globalColors` references audited; geometry, spacing, typography, border structure, and behavior declarations inlined | 3 route-local paint keys in ignored route module `-restricted.stylex.ts` | route refs removed; shared pin globals retained for real `-home-route-screen.tsx` consumer pending that consumer's audit | 12/12 focused and whole-screen browser checks pass, including desktop/mobile geometry, paint, screenshots, fallback, navigation, DOM, and source guards; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
| `/secret` existing setup owner | all 14 `globalColors` references audited; geometry, spacing, typography, and behavior declarations inlined | 2 route-local paint keys in ignored route module `-secret.stylex.ts` | no common global retained; 13 sole-consumer definitions removed | 11/11 affected setup/not-found/form/mutation/navigation/mobile checks pass, including focused desktop/mobile geometry and paint; the pre-existing whole-screen desktop input-height and 50% box-width expectations remain; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
| `/restart` existing notice owner | all 15 `globalColors` references audited; geometry, spacing, typography, and behavior declarations inlined | 2 route-local paint keys in ignored route module `-restart.stylex.ts` | no common global retained by this route; 1 sole-consumer definition removed | 9/9 affected owner/navigation/mobile checks pass, including focused desktop/mobile geometry and paint; the pre-existing whole-screen desktop `secretBoxWidth` expectation remains 640px versus the unchanged 50% owner rendering 470px; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
| `/migration` existing disabled shell | all 66 `globalColors` references audited; geometry, spacing, typography, border structure, and behavior declarations inlined | 15 route-local paint keys in ignored route module `-migration.stylex.ts` | no common global retained; 64 sole-consumer definitions removed | 6/6 affected focused browser checks pass, including desktop/mobile geometry and paint; whole-screen raw-DOM check retains the pre-existing shared GNB mismatch; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
| `/sites/projectList` already-migrated owners | 227 `globalColors` references audited; all non-theme declarations inlined | 41 route-local paint/shadow keys in ignored route module `-projectList.stylex.ts` | no common global retained; 217 sole-consumer definitions removed | 30/30 affected focused browser checks pass; full populated-DOM check retains the pre-existing shared GNB/footer mismatch; TypeScript, 11/11 Vitest, production build, StyleX verification, and frozen `6417f445...` hash pass | this commit |
