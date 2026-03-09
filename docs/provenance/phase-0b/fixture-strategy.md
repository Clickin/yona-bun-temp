# Fixture Strategy

## Goal

Translate `yona-original/conf/test-data.yml` into stable TypeScript fixtures and factories without leaking legacy numeric IDs into new tests.

## Canonical Fixture Names

Freeze these identifiers as the canonical Phase 0B names:

- Users: `admin`, `yobi`, `laziel`, `doortts`, `nori`, `alecsiel`, `kjkmadness`
- Organizations: `labs`, `weblabs`
- Projects: `projectYobi`, `projectYobi-1`, `Jindo`, `CUBRID`, `HelloSocialApp`, `HelloSocialApp-1`, `TestApp`, `prj_test`

## Identity Mapping

| Legacy seed                             | Frozen TS fixture name  | Notes                                                                                              |
| --------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `loginId: yobi`                         | `userFixtures.yobi`     | personal owner of `projectYobi`; project manager in issue exemplar                                 |
| `loginId: laziel`                       | `userFixtures.laziel`   | project member and private-project visibility evidence                                             |
| `loginId: doortts`                      | `userFixtures.doortts`  | creator in org test; owner of `CUBRID`; recent-visit actor                                         |
| `loginId: nori`                         | `userFixtures.nori`     | issue author exemplar                                                                              |
| `loginId: alecsiel`                     | `userFixtures.alecsiel` | issue assignee exemplar                                                                            |
| implicit site admin actor used by tests | `userFixtures.admin`    | make this explicit in TS fixtures even when legacy setup injects it outside the local YAML excerpt |

## Project Seed Mapping

| Legacy seed                                                | Frozen TS fixture name                          | Visibility baseline                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `owner: yobi`, `name: projectYobi`, `projectScope: PUBLIC` | `projectFixtures.projectYobiPublic`             | canonical public project                                                                     |
| `owner: laziel`, `name: Jindo`, `projectScope: PRIVATE`    | `projectFixtures.jindoPrivate`                  | canonical private visibility contrast                                                        |
| `owner: doortts`, `name: CUBRID`, `projectScope: PRIVATE`  | `projectFixtures.cubridPrivate`                 | canonical second private project                                                             |
| `owner: yobi`, `name: HelloSocialApp`                      | `projectFixtures.helloSocialAppDuplicateTarget` | duplicate-name and rename target                                                             |
| synthetic protected org project                            | `projectFixtures.projectYobiProtectedOrg`       | add in TS factories for protected visibility coverage that is weak in the cited legacy files |

## Factory Plan

- `createUserFixture(name)` returns login-based actors keyed by fixture name, not numeric id.
- `createOrganizationFixture(name)` returns an org record plus optional membership rows.
- `createProjectFixture(name)` returns a project record plus optional org owner, visibility, and membership rows.
- `createIssueAuthFixture()` builds the minimal private-project issue matrix:
  - `admin` as site admin
  - `yobi` as project manager
  - `laziel` as project member
  - `nori` as author
  - `alecsiel` as assignee
  - `doortts` as nonmember

## Scenario Fixtures To Preserve

| Scenario                                         | TS fixture target                               |
| ------------------------------------------------ | ----------------------------------------------- |
| creator becomes sole org admin                   | `organizationScenarios.creatorOwnsOrganization` |
| create project under personal owner              | `projectScenarios.personalOwnerCreate`          |
| create project under org owner                   | `projectScenarios.organizationOwnerCreate`      |
| duplicate project identifier under same owner    | `projectScenarios.duplicateOwnerAndName`        |
| public, protected, and private visibility matrix | `projectScenarios.visibilityMatrix`             |
| recent visits dedupe and reorder                 | `workspaceScenarios.recentVisits`               |
| missing-project enroll request `no/project`      | `projectScenarios.missingEnrollmentTarget`      |
| issue edit authorization matrix                  | `issueScenarios.editAuthorizationMatrix`        |

## Rules

- Prefer login IDs and public owner plus project names in test assertions.
- Keep legacy display names and Korean overview text only where they add provenance value.
- Add protected-visibility TS fixtures even though the cited project tests are stronger on public and private than on protected.
