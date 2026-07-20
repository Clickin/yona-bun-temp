# Fallback-off report: organization member avatar bridge

Batch 601 removes only the React-side `.all-projects .project .stats-wrap
.members ul li` float and nested `.avatar-wrap` spacing arms from
`frontend/src/app.css`. The current organization directory emits an empty
member list and no member list-item/avatar consumer; the frozen organization
template and LESS remain unchanged as legacy evidence.

The organization directory and formal fallback-off static contracts assert
the scoped app.css arms are absent while the parent members layout remains.
Normal and `VITE_DISABLE_LEGACY_FALLBACK=1` focused runs cover the same
bounded contract; this does not claim global fallback discovery completion.
