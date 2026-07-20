# Fallback-off report: dead issue-detail event-index bridge

Batch 602 retires only the React-side `.issue-detail-page .comments
.event.event-index` base and nested `.state` compatibility arms from
`frontend/src/app.css`. Current React issue timelines emit ordinary event
owners and no `event-index` class. The frozen index-event Scala partial and
generated fallback remain unchanged as legacy output evidence.

`stylex-project-issue-detail-event-base.e2e.ts`,
`stylex-project-issue-detail-event-state-variants.e2e.ts`, and the formal
fallback-off contract assert exact absence of both retired arms while
retaining `.issue-detail-page .comments .event .state i`. Normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` focused static runs pass. This bounded cleanup
does not claim global fallback discovery completion.
