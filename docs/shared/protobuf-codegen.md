# Protobuf Codegen Contract

`yona-rust/`는 protobuf codegen을 두 경로로 나눈다.

## Rust server

- Rust server는 `anthropics/connect-rust`의 crates.io 배포판인 `connectrpc`와 `connectrpc-build`를 사용한다.
- 현재 Rust 쪽은 `build.rs`에서 `connectrpc_build::Config::new()`를 호출해 local proto를 build-time에 생성한다.
- 즉, Rust service stub/message generation은 `buf generate`가 아니라 `connectrpc-build`가 canonical 경로다.

## Browser client

- browser/client checked-in output은 `buf generate`가 canonical 경로다.
- `yona-rust/buf.gen.yaml`은 `protoc-gen-es`와 `protoc-gen-connect-query`만 실행한다.
- 출력 경로는 `yona-rust/frontend/src/gen`으로 고정한다.

## Why split

- `anthropics/connect-rust` README 기준으로 Rust는 두 workflow를 모두 지원한다.
  - Option A: `buf generate` with `protoc-gen-connect-rust`
  - Option B: `connectrpc-build` in `build.rs`
- 현재 리포는 Rust generated code를 체크인하지 않고, Rust build-time generation만 필요하므로 Option B를 택한다.
- 대신 frontend client는 checked-in generated TS output이 다음 packet에서 더 유리하므로 `buf`를 사용한다.
