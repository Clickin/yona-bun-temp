# Topic: protobuf_codegen

## Overview
Documents how yona-rust routes Rust proto generation through connectrpc-build while the browser frontend relies on checked-in Buf-generated TypeScript artifacts.

## Key Concepts
- Connectrpc-based build.rs generation for Rust server stubs
- Buf generate + protoc-gen-es/connect-query for frontend TS
- Contract tests that guard the split
- Documentation describing the rationale
