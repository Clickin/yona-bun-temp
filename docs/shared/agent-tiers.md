# Agent Tiers

Rust Ralph loops in this repository use three execution tiers.

## LOW

- 목적: narrow lookup, inventory, doc extraction, simple validation
- 기본 역할: `explore`, `analyst`, `writer`
- 사용 예:
  - 특정 legacy source path 확인
  - current mixed-code reference inventory
  - packet docs/status banner 정리

## STANDARD

- 목적: bounded implementation, regression evidence, packet-local review
- 기본 역할: `executor`, `test-engineer`, `verifier`, `planner`
- 사용 예:
  - `yona-rust` crate or frontend slice 구현
  - packet-level test/spec verification
  - bounded provenance and route/domain regression

## THOROUGH

- 목적: architecture review, cross-boundary verification, high-risk refactor
- 기본 역할: `architect`, `code-reviewer`, `critic`, `security-reviewer`
- 사용 예:
  - phase boundary 승인
  - repo/VCS/PR/search 같은 multi-system slice sign-off
  - packet rejection/fix loop의 최종 판정

## Ralph Lane Mapping

- 3-lane packets (`R0-1` ~ `R0-3`)
  - Lane A: STANDARD implementation
  - Lane B: STANDARD frontend/provenance
  - Lane C: STANDARD evidence + THOROUGH architect sign-off
- 5-lane packets (`R1` 이후)
  - Lane A: STANDARD frontend
  - Lane B: STANDARD server/domain
  - Lane C: STANDARD persistence/migration
  - Lane D: STANDARD evidence/regression
  - Lane E: THOROUGH architect sign-off
