# 08) Application Deployment Strategy

이 파일명은 historical compatibility를 위해 유지하지만, 내용 기준선은 더 이상 SvelteKit이 아니다.

## 배포 토폴로지

- 하나의 Go application이 frontend static embed, app-facing HTTP/RPC endpoint, protocol route, asset route를 함께 제공한다.
- notification/integration delivery는 같은 Go process 내부의 async I/O로 처리하고, polling/retry/CPU-bound work만 별도 runtime 경로로 분리한다.
- 별도 backend API 프로세스를 canonical topology로 두지 않는다. frontend와 backend는 코드/경계상 분리되지만 최종 artifact는 묶을 수 있다.

## SFX 우선 시나리오

- 온프레미스 단일 서버
- 설치 단순성이 중요한 내부 배포
- 운영 인프라를 최소화해야 하는 환경

## Docker/Kubernetes 우선 시나리오

- CI/CD 중심 배포
- dev/staging/prod 다중 환경 운영
- 이미지 기반 표준화가 중요한 환경

## 운영 제약

- secure cookie 또는 in-memory session baseline에서는 process restart 시 session 유실 가능성을 운영 문서에 명시한다.
- scale-out 전에는 secondary storage와 worker startup policy를 먼저 정의한다.
- frontend dist와 user-uploaded asset은 구분한다.
- user-uploaded asset은 image layer나 embedded static asset에 포함하지 않는다.

## 선택 기준

- 단일 노드 설치 편의가 최우선이면 SFX
- 재현 가능한 빌드와 환경 격리가 최우선이면 Docker/Kubernetes
- 두 방식 모두 동일한 app contract, DB migration contract, asset route contract를 유지해야 한다
