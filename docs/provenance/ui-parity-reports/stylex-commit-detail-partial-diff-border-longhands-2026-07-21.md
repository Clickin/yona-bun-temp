# StyleX parity report: commit-detail partial diff border longhands

Batch 750 repairs fallback-off border precedence for three existing
commit-detail partial-filediff StyleX owners.

Evidence: frozen
`yona-original/app/assets/stylesheets/less/_page.less:5842-5843,5847-5849,5950+`.

The route keeps the existing outer/meta/code-line DOM and owner markers. StyleX
now expresses the frozen outer and meta `1px solid #bbb` borders and the code-line
`border:none` reset as longhands, preventing fallback Bootstrap border defaults
from leaking into the owned surfaces. No other partial-diff declarations or
consumers moved.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
