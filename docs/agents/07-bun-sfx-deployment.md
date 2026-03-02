# 07) Bun SFX (Single-File Executable) 배포 가이드

## 7-1) Cross-Compilation

- `bun build --compile --target=...`로 타 OS/아키텍처 바이너리 생성.
- x64에서는 modern/baseline 선택 가능 (환경 호환성 기준으로 선택).
- 권장: 운영 환경 CPU/OS 매트릭스를 먼저 정의 후 타겟별 빌드.

예시:

```bash
bun build --compile --target=bun-linux-x64 ./index.ts --outfile yona-server
bun build --compile --target=bun-windows-x64 ./index.ts --outfile yona.exe
bun build --compile --target=bun-darwin-arm64 ./index.ts --outfile yona-server
```

## 7-2) 정적 리소스 임베딩

- `with { type: "file" }`로 파일을 실행 파일에 포함 가능.
- 이미지/JSON/템플릿 등 배포 시 외부 파일 의존도를 낮춘다.

## 7-3) Full-Stack Executable

- 서버에서 HTML을 import하면 Bun이 프론트엔드 자산(JS/CSS)도 함께 번들한다.
- 결과적으로 서버 + 클라이언트가 단일 바이너리로 배포된다.

## 7-4) 프로덕션 최적화

권장 플래그:

```bash
bun build --compile --minify --sourcemap --bytecode ./path/to/server.ts --outfile yona-server
```

- `--minify`: 바이너리 크기 절감
- `--sourcemap`: 디버깅 정확도 향상
- `--bytecode`: 시작 시간 단축

## 7-5) 다중 타겟 빌드 자동화

- `package.json` scripts에서 OS/아키텍처별 `build:sfx:*` 스크립트를 분리 운영.

## 7-6) 런타임 설정

- `.env` / `bunfig.toml` autoload 기본 활성화.
- 필요시 `BUN_OPTIONS`로 실행 플래그 주입.

## 7-7) GitHub Actions Cross-Compile Release

- 단일 Linux runner에서 다중 플랫폼 빌드 가능.
- release artifact와 checksum 파일(`SHA256SUMS`)을 함께 배포.

## 참고 링크

- Bun compile/build 문서: https://bun.com/docs/bundler/executables
- Bun SQL 런타임 문서: https://bun.com/docs/runtime/sql
