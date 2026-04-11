# 08) Rust Deployment Strategy

## 배포 토폴로지

- canonical topology는 repo root 기반 Rust application workspace다.
- frontend와 backend는 ownership 경계상 분리되지만, 최종 artifact는 함께 제공될 수 있다.
- 별도 old-stack backend API 프로세스를 canonical topology로 두지 않는다.

## 우선 시나리오

- on-prem 설치 단순성이 중요하면 single-binary/SFX를 우선한다.
- CI/CD, 다중 환경 운영, 이미지 표준화가 중요하면 Docker/Kubernetes를 우선한다.

## 고정 규칙

- 어떤 배포 형태에서도 canonical implementation path는 `repo root`다.
- `reference/mixed-code/**`는 deployment baseline이 아니다.
- user-uploaded asset은 image layer나 embedded static asset과 분리한다.

