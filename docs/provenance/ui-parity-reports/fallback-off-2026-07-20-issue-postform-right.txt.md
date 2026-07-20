# Bounded StyleX parity report: issue and board-post form right alignment

## Scope

- Issue creation submit actions no longer emit `.right-txt`; existing route StyleX action ownership preserves `text-align:right` and `actrow`.
- Board post creation options and attachment-help wrappers no longer emit `.right-txt`; route-local StyleX owns alignment, with `mt10 mb10`/`help` retained.

## Evidence

- Frozen issue/create, board/create, upload-form templates and `_common.less:163` are referenced by focused tests and the audit row.
- Tests assert stable owners, class absence, computed alignment, and desktop/mobile containment.
- Typecheck and diff checks passed for both route owners; live replay attempts were blocked by managed-server connection refusal on `127.0.0.1:3101`.

## Fallback boundary

Shared `.right-txt` remains for other issue/post/comment/form consumers. This wave removes only the bounded issue creation and board post creation owners.
