# 08) SvelteKit 배포 전략

Yona는 배포 시나리오에 따라 두 가지 전략을 사용한다.

## 8-1) SFX 배포 (단일 실행 파일)

- 대상: 온프레미스/단일 서버/소규모 팀 내부 배포.
- 어댑터: `@jesterkit/exe-sveltekit`.
- 장점: 단일 파일 배포, 런타임 의존성 최소화, 운영 단순화.

## 8-2) Docker 배포 (CI/CD 및 클라우드)

- 대상: CI/CD 파이프라인, 클라우드 플랫폼, 멀티 환경 운영.
- 어댑터: `svelte-adapter-bun`.
- 장점: 표준화된 빌드/배포, 캐시 활용, 플랫폼 호환성.

## 8-3) 선택 가이드

- SFX 우선:
  - 소규모 내부 배포
  - 설치 단순성이 중요한 환경
  - 단일 서버 운영
- Docker 우선:
  - CI/CD 자동화 중심
  - 클라우드 배포
  - dev/staging/prod 다중 환경 운영

## 8-4) GitHub Actions 전략

- `build-sfx`, `build-docker`, `release` job을 분리해 이중 배포 지원.
- 태그 기반 release에서는 SFX artifact 중심 배포를 권장.
