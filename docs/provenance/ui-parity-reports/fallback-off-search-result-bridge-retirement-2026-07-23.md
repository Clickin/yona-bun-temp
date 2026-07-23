# Search result React fallback bridge retirement report

## Scope

This formal fallback-retirement batch removes only the React-side `app.css`
arms for `.search-box-wrap`, `.search-result-title`, `.search-list-wrap`,
`.search-content-body`, and `.search-meta-info`. The three global, project, and
organization search routes already own these visible result states through
route-local StyleX. The frozen `yona-original` LESS/Bootstrap sources and the
generated `legacy-fallback.css` remain unchanged for legacy output and any
unproven consumers.

## Evidence

`frontend/tests/legacy-fallback-off.e2e.ts` asserts the retired selector arms,
retains the generated frozen declarations, and verifies the three-route owner
contracts. The focused global, project, and organization search result suites
cover populated/empty copy, computed declarations, links/category interaction,
desktop/390px containment, and screenshots.

Managed dynamic-port system-Chrome runs outside the sandbox pass 5/5 for each
search result suite in normal and fallback-off modes. Live legacy rendering was
unavailable, so direct legacy screenshot comparison remains unverified.

The Yoram footer identity differences—NAVER/NAVER LABS/NAVER CLOUD, upstream
Yona repository, and developer-contact entries—remain intentional and are not
restored.
