# Fallback-off parity report: project form field labels

Wave 641 moves the three advanced-form field-label consumers in both project
create and project import from the frozen `.right-txt` utility to route-local
StyleX owners. The `span2` wrappers, `mt10` spacing, label/content order, and
form behavior remain unchanged.

Static source contracts and typecheck pass. Live browser replay was attempted
but the managed local server on port 3101 was unavailable; no live parity claim
is made. Frozen LESS/CSS and generated fallback assets were not modified.
