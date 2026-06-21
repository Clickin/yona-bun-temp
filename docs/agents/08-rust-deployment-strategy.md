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

## Kubernetes 상태

- `SPEC.md` Section 1.4의 release baseline은 SFX와 Docker/base-path다.
- 현재 repo에는 canonical Kubernetes, k8s, Helm, Deployment, Service manifest가 없다.
- Kubernetes 배포는 Docker image, 외부 `yona.toml`/환경변수, secret, DB, 그리고 user-uploaded asset volume을 조합하는 운영 가이드 follow-up으로 다룬다. 현재 non-baseline reference guidance는 `docs/deployment/kubernetes-reference.md`에 둔다.
- manifest가 추가되기 전에는 local k8s smoke를 release blocker로 보지 않는다.
