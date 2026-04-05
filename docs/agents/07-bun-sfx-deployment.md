# 07) Go SFX 배포 가이드

## 목표

- 하나의 Go application이 frontend static embed, app-facing API, protocol route, background work를 함께 제공하는 단일 배포 단위가 되게 유지한다.
- on-prem 설치 경험은 OS별 단일 실행 파일(SFX)을 우선한다.
- main site 운영은 Docker/Kubernetes를 우선한다.

## SFX 원칙

- Go binary를 OS별로 별도 빌드한다.
- frontend dist는 Go binary에 `embed` 하거나 동일 artifact에 포함한다.
- user-uploaded asset과 DB 파일은 실행 파일에 임베드하지 않고 외부 storage path로 둔다.

예시:

```bash
GOOS=linux GOARCH=amd64 go build -o yona-server ./cmd/yona
GOOS=windows GOARCH=amd64 go build -o yona.exe ./cmd/yona
GOOS=darwin GOARCH=arm64 go build -o yona-macos ./cmd/yona
```

## 런타임 구성

- frontend 정적 자산, app-facing API, asset route, smart HTTP, webhook ingress는 같은 Go process 안에서 초기화한다.
- in-memory session을 사용할 경우 process restart 시 active session이 사라진다는 점을 운영 문서에 명시한다.
- horizontal scaling이 필요하면 secondary storage를 먼저 붙인다.

## 배포 주의사항

- static build asset과 user-uploaded asset을 분리한다.
- secret, OAuth credential, integration signing material은 실행 파일이 아니라 환경 변수/비밀 저장소에서 주입한다.
- dialect별 connection string과 migration folder resolution이 일치해야 한다.
- Git/SVN executable 경로와 OS별 binary availability를 배포 checklist에 포함한다.

## Docker와의 관계

- Docker는 SFX의 대체가 아니라 병행 지원 대상이다.
- CI/CD와 multi-env 운영에서는 Docker/Kubernetes를 우선 검토한다.
- 내부 단일 서버 설치 경험이 중요하면 SFX를 우선 검토한다.

## 참고 링크

- https://pkg.go.dev/embed
- https://go.dev/wiki/WindowsCrossCompiling
- https://github.com/Masterminds/vcs
