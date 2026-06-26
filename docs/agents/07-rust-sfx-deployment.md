# 07) Rust SFX 배포 가이드

## 목표

- `repo root` workspace를 single-binary/SFX와 Docker/Kubernetes 양쪽에 맞게 유지한다.
- frontend build output과 backend runtime을 하나의 Rust 배포 단위로 묶을 수 있게 한다.
- user-uploaded asset과 embedded/static asset을 명확히 분리한다.

## SFX 원칙

- OS별 Rust binary를 별도 빌드한다.
- frontend 정적 자산은 canonical runtime이 읽을 수 있는 방식으로 포함한다.
- user-uploaded asset과 DB 파일은 실행 파일 내부에 넣지 않는다.
- runtime base path는 first-class 요구사항으로 유지한다.

## 운영 규칙

- session/auth bootstrap, asset delivery, HTTP/REST 진입점은 동일한 runtime 기준을 공유해야 한다.
- 환경별 secret과 credential은 실행 파일이 아니라 외부 주입으로 관리한다.
- single-binary 배포와 container 배포가 동일한 contract를 제공해야 한다.

## Windows MSVC 빌드

### macOS xwin cross build

macOS에서 Windows MSVC binary를 만들 때는 `xwin`으로 MSVC CRT/Windows SDK
sysroot를 만들고 Homebrew LLVM의 `clang-cl`/`llvm-lib`/`lld-link`를 사용한다.

전제:

- macOS
- Rust target: `rustup target add x86_64-pc-windows-msvc`
- `xwin`: `cargo install xwin`
- Homebrew LLVM: `brew install llvm`
- Node.js와 `pnpm`

기본 빌드:

```bash
pnpm build:windows-msvc:xwin
```

기본값은 `x86_64-pc-windows-msvc`, `release`, `db-matrix` feature다. SQLite
전용 smoke binary가 필요하면:

```bash
pnpm build:windows-msvc:xwin -- --features none
```

산출물:

- `dist/windows-msvc-x86_64-pc-windows-msvc/yoram.exe`
- `dist/windows-msvc-x86_64-pc-windows-msvc/yoram.toml`
- `dist/yoram-windows-msvc-x86_64-pc-windows-msvc.zip`

스크립트는 기본적으로 `.xwin-cache/`에 xwin sysroot를 보관한다. 다시 받고 싶으면
`-- --refresh-xwin`을 붙인다. Homebrew LLVM 위치를 자동 탐지하지 못하면
`LLVM_BIN=/path/to/llvm/bin`을 지정한다.

### Windows native build

전제:

- Windows 10/11
- Visual Studio Build Tools 2022의 `Desktop development with C++`
- Rust MSVC toolchain: `rustup default stable-x86_64-pc-windows-msvc`
- Node.js와 `pnpm`

기본 빌드:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-msvc.ps1
```

기본값은 `x86_64-pc-windows-msvc`, `release`, `db-matrix` feature다. 따라서
SQLite, PostgreSQL, MySQL/MariaDB 런타임을 포함한다. SQLite 전용 smoke binary가
필요하면 다음처럼 빌드한다:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-msvc.ps1 -Features none
```

산출물:

- `dist\windows-msvc-x86_64-pc-windows-msvc\yoram.exe`
- `dist\windows-msvc-x86_64-pc-windows-msvc\yoram.toml`
- `dist\yoram-windows-msvc-x86_64-pc-windows-msvc.zip`

실행 예:

```powershell
cd .\dist\windows-msvc-x86_64-pc-windows-msvc
$env:YORAM_CONFIG_TOML = (Resolve-Path .\yoram.toml)
$env:YONA_USE_EMBEDDED_ASSETS = "1"
.\yoram.exe
```

다른 config 파일을 쓸 때도 `YORAM_CONFIG_TOML`만 바꾸면 된다. 환경변수
`YONA_*`는 `yoram.toml`보다 우선한다.
