# Bounded StyleX parity report: organization origin color and code-file comment count

## Scope

- Organization fork-origin project span no longer emits `.blue-txt`; route-local StyleX owns the legacy `#5DBBE0` color alongside existing small-font styling.
- Code-file comment-count span no longer emits `.number-of-comments`; route-local StyleX owns the legacy spacing/color while retaining `ml5`, icon, and copy.

## Evidence

- Frozen Scala/LESS and generated legacy CSS source mappings are asserted by focused contracts.
- Tests assert stable owner markers, class absence, computed color/spacing, and desktop/mobile output.
- Organization source contract passed; TypeScript/build/Vitest and diff checks passed for the batch.
- Live browser replay was blocked by the managed-server 3101 address conflict; no live screenshot claim is made.

## Fallback boundary

Shared `.blue-txt` and `.number-of-comments` remain for unrelated route consumers. Only the organization origin and code-file comment-count owners are retired from those utilities.
