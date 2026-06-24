# 09) LLM 온보딩 체크리스트

## 목적

- 이 문서는 새로 투입된 에이전트가 Rust pivot 이후 기준선을 빠르게 이해하도록 압축한 체크리스트다.
- 메인 source of truth는 `AGENTS.md`이며, 기술적 상세의 canonical source는 `SPEC.md`다.

## 빠른 상황 인식

- 목표는 legacy Yona 기능과 UX parity다.
- current canonical implementation baseline은 `repo root`다.
- `yona-original/`은 1차 source of truth다.
- `reference/mixed-code/**`는 legacy reference가 아니다.
- historical 문서는 status banner가 없으면 current guidance처럼 읽지 않는다.

## 추천 읽기 순서

1. `AGENTS.md` 변환 원칙과 고정 결정을 읽는다.
2. `SPEC.md`의 Summary, Fixed Decisions, Documentation Governance, Phase Plan, Definition of Done을 읽는다.
3. 작업 대상에 맞는 `docs/agents/*` mirror와 provenance 문서를 읽는다.
4. `yona-original/`에서 대응 legacy test/controller/model을 찾는다.
5. 구현 근거는 `yona-original/`에서만 찾는다.

## 구현 위치 체크리스트

- [ ] 새 canonical 구현은 `frontend`, `proto`, `crates/*`에 둔다.
- [ ] `reference/mixed-code/**`를 구현 근거나 parity evidence로 사용하지 않는다.
- [ ] legacy source와 Rust target layer를 provenance에 남긴다.
- [ ] 누락 기능을 `deferred`, `gap`, `deviation` 중 하나로 기록한다.
- [ ] historical 문서 변경 시 status banner를 유지한다.
