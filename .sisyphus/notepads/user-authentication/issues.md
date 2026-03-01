# Issues

- No unresolved implementation blockers during Task 6 delivery; auth route behavior is covered by focused unit specs and type checks.
- Hands-on QA for `POST /api/auth/register` and `POST /api/auth/login` requires configuring `YONA_DB_URL` to a reachable MySQL instance (unit tests mock DB calls).
- Hono auth app originally failed non-OAuth auth unit suites because eager import of `$lib/server/auth/oauth-providers` required missing `GITHUB_CLIENT_ID`; resolved by moving oauth provider import into GitHub handlers.
