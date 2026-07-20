# Project issue edit secondary-text fallback-off report

The single runtime `.secondary-txt` consumer is retired from the project issue
edit form. The existing issue-number owner now carries the frozen `#51aacc`
color through route-local StyleX while preserving the label/strong DOM and form
behavior. Frozen `_common.less` and generated fallback CSS remain unchanged as
legacy evidence.

The normal and `VITE_DISABLE_LEGACY_FALLBACK=1` static ownership contracts each
pass 1/1. Focused browser replay remains pending managed frontend availability.
