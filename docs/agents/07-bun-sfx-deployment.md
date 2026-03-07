# 07) Bun SFX 배포 가이드

## 목표

- 하나의 Bun application을 일반 실행, SFX, Docker 세 방식으로 배포 가능하게 유지한다.
- app server, server routes, in-process worker는 하나의 배포 단위로 움직인다.

## SFX 원칙

- `bun build --compile --target=...`를 사용해 단일 실행 파일을 생성한다.
- 운영 대상 OS/아키텍처를 먼저 확정한 뒤 target matrix를 정한다.
- user-uploaded asset과 DB 파일은 실행 파일에 임베드하지 않고 외부 storage path로 둔다.

예시:

```bash
bun build --compile --target=bun-linux-x64 ./apps/app/src/server.ts --outfile yona-server
bun build --compile --target=bun-windows-x64 ./apps/app/src/server.ts --outfile yona.exe
```

## 런타임 구성

- app server와 dedicated worker는 같은 Bun process 안에서 초기화한다.
- in-memory session을 사용할 경우 process restart 시 active session이 사라진다는 점을 운영 문서에 명시한다.
- horizontal scaling이 필요하면 secondary storage를 먼저 붙인다.

## 배포 주의사항

- static build asset과 user-uploaded asset을 분리한다.
- secret, OAuth credential, integration signing material은 실행 파일이 아니라 환경 변수/비밀 저장소에서 주입한다.
- dialect별 connection string과 migration folder resolution이 일치해야 한다.

## Docker와의 관계

- Docker는 SFX의 대체가 아니라 병행 지원 대상이다.
- CI/CD와 multi-env 운영에서는 Docker를 우선 검토한다.
- 내부 단일 서버 설치 경험이 중요하면 SFX를 우선 검토한다.

## 참고 링크

- https://bun.com/docs/bundler/executables
- https://bun.com/docs/runtime/sql
