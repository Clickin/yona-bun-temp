# Golden legacy Yona 1.16 MariaDB fixture — provenance and contents

## Provenance

- **Upstream source**: local checkout of upstream Yona, branch `next`,
  commit `60a5ac40689fc36ee5b55eddedd345fc34878190` (`git describe`: `v1.16.0-3-g60a5ac406`,
  i.e. three commits after the `v1.16.0` tag).
- **Schema origin**: applied the upstream Play evolutions
  `yona-original/conf/evolutions/default/1.sql … 32.sql` (Ups sections only) in numeric
  order into a fresh MariaDB instance. The concatenated Ups script is preserved verbatim
  as [`evolutions-ups.sql`](evolutions-ups.sql).
- **NOT derived from Yoram**: no Yoram entity, migration, or
  `crates/migration/legacy-final-schema-manifest.json` was consulted for this schema.
  The manifest is downstream of the same evolutions, so the gate comparing dump ↔ manifest
  is a real cross-check, not self-validation.
- **Build method**: actual MariaDB container + `mysqldump`. Docker WAS available
  (OrbStack, daemon started; image `mariadb:10.11`), so the preferred path was used:
  evolutions applied in-container → population SQL applied → `mariadb-dump --databases yona`
  → round-trip reload verified.
- **Population**: [`population.sql`](population.sql) (deterministic; also drives
  `gen-fixture.mjs` output — kept for regeneration on demand).

## Fixture content map

Database dump: `legacy-yona-mariadb-dump.sql` (includes `CREATE DATABASE yona` / `USE yona`;
built on MariaDB **10.11.18**; smoke script default image is 10.3 — pin
`YONA_LEGACY_MARIADB_IMAGE=mariadb:10.11` when gating, or relax).

| Area | Rows |
|---|---|
| `n4user` | admin(1), kris(2), laura(3) with legacy SHA-256 hashes; mika(4) with bcrypt `$2y$10$…` |
| Passwords | SHA-256 users all use password `legacy-gate-pass`; algorithm = Shiro `Sha256Hash(pw, salt, 1024).toBase64()`, i.e. `h=sha256(salt‖pw)` then 1023× `h=sha256(h)`, base64. Cross-checked JS vs Python vs DB (identical). mika's password: `bcrypt-gate-pass` |
| `organization` / `organization_user` | org `orbit`(1); kris ORG_ADMIN(6), mika ORG_MEMBER(7) |
| `project` | 101 `kris/sample-app` GIT PUBLIC · 102 `kris/private-tools` GIT PRIVATE · 103 `orbit/orbital-svn` Subversion PUBLIC |
| `role` | RoleType ordinals 1–7 (manager…org_member), seeded per upstream `RoleType.java` |
| Members | kris manager on all projects; laura member on 101; mika member on 103 |
| Issues/comments | 101: #1001 OPEN w/ assignee+label+comment+milestone, #1002 CLOSED; 103: #1 OPEN |
| Labels/boards/milestones | category `Type`, labels bug/feature, notice posting #1 + comment, milestone v1.0 |
| `pull_request` | one row matching the seeded `feature/login` branch |
| `attachment` | avatar `USER_AVATAR` → uploads/{c414cd…}; issue file `ISSUE_POST` → uploads/{a3d98c…} |
| `play_evolutions` | 32 rows (md5 of each upstream evolution file, state `applied`) |

Physical data root: `YONA_DATA/`

```
YONA_DATA/
├── repo/git/kris/sample-app.git      bare; branches master, feature/login (diverged); tag v1.0.0
├── repo/git/kris/private-tools.git   bare; master, 1 commit
├── repo/svn/orbit/orbital-svn        svnadmin-created fsfs; revisions r1–r3
└── uploads/<sha256-hex>              flat files, names == sha256(bytes)
```

Legacy conventions encoded here (verified against upstream source): project.owner holds the
owner login id (org name for org projects); `vcs` ∈ {`GIT`, `Subversion`}; issue/milestone
`state` uses enum ordinals (OPEN=1, CLOSED=2); default branch is `master`; attachment files
live flat under `uploads/{sha256hex}`; avatars are attachments with
container_type=`USER_AVATAR`, container_id=user id.

## Verification performed at creation time

- Dump round-trip: dropped DB, reloaded dump, counts match (4 users, 3 issues, 2 attachments, 32 evolutions).
- `git rev-parse --is-bare-repository` → `true` for both git repos;
  `git for-each-ref` shows master / feature/login / tags/v1.0.0; mirror clone re-verified.
- `svn info` on `file://…/repo/svn/orbit/orbital-svn` → Revision 3, valid UUID; `db/format` present.
- `shasum -a 256 uploads/*` matches both `attachment.hash` values.
- Password hash: independent Python reimplementation reproduces the exact base64 stored in `n4user`.
