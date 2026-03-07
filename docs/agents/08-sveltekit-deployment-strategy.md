# 08) Application Deployment Strategy

이 파일명은 historical compatibility를 위해 유지하지만, 내용 기준선은 더 이상 SvelteKit이 아니다.

## 배포 토폴로지

- 하나의 Bun application이 UI SSR, thin `serverFunction` adapter, in-process `tRPC` backend, server route를 함께 제공한다.
- notification/integration delivery는 같은 Bun process 내부의 dedicated worker에서 처리한다.
- 별도 backend API 프로세스를 canonical topology로 두지 않는다.

## SFX 우선 시나리오

- 온프레미스 단일 서버
- 설치 단순성이 중요한 내부 배포
- 운영 인프라를 최소화해야 하는 환경

## Docker 우선 시나리오

- CI/CD 중심 배포
- dev/staging/prod 다중 환경 운영
- 이미지 기반 표준화가 중요한 환경

## 운영 제약

- in-memory session baseline에서는 process restart 시 session이 유실된다.
- scale-out 전에는 secondary storage와 worker startup policy를 먼저 정의한다.
- user-uploaded asset은 image layer나 compiled bundle에 포함하지 않는다.

## 선택 기준

- 단일 노드 설치 편의가 최우선이면 SFX
- 재현 가능한 빌드와 환경 격리가 최우선이면 Docker
- 두 방식 모두 동일한 app contract, DB migration contract, asset route contract를 유지해야 한다
