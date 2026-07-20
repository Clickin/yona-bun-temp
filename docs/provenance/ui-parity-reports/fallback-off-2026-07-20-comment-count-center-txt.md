# Bounded StyleX parity report: commits comment count and members delete actions

## Scope

- `/$ownerName/$projectName/commits`: populated comment-count spans no longer emit `.number-of-comments`; route StyleX owns the legacy float, relative position, margin, and color.
- `/$ownerName/$projectName/members`: delete-confirmation action row no longer emits `.center-txt`; route StyleX owns `text-align:center` while `buttons` and modal interaction remain.

## Evidence

- Focused tests assert frozen Scala/LESS source mapping, stable owner markers, class absence, computed declarations, and mobile checks.
- TypeScript check and `git diff --check` passed for both route owners.
- The commits focused Playwright worker reported exit 0; the members focused replay reached managed-server startup but returned `ERR_CONNECTION_REFUSED` on `127.0.0.1:3101`, so no live members screenshot claim is made here.

## Fallback boundary

Shared `.number-of-comments` remains for code file/merge-result consumers, and `.center-txt` remains for unrelated forms/modals. This wave removes neither shared selector globally.
