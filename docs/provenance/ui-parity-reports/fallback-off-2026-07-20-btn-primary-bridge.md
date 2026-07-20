# Fallback-off report: `.btn-primary` bridge

Batch 591 removes only the dead React-side `.btn-primary` arms from
`frontend/src/app.css`: the grouped primary base rule and its hover/focus
rule. Current React source has no literal `.btn-primary` emitter; `.ybtn-primary`
and `.ybtn-success` remain active shared Yobi consumers. Frozen Bootstrap and
the generated fallback remain unchanged as legacy evidence.

The formal fallback-off contract asserts exact `.btn-primary` absence and
retention of the `.ybtn-primary`/`.ybtn-success` declarations. This bounded
retirement changes no TSX, generated fallback CSS, or geometry baseline; the
source manifest hash is refreshed to match the edited `app.css`. Global
fallback discovery remains incomplete/non-green.
