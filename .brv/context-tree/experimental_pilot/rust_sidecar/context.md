# Topic: rust_sidecar

## Overview
Documents the Rust-based experimental pilot sidecar built under experimental/rust-pilot, including its runtime architecture, shipping commands, and verification evidence.

## Key Concepts
- Axum router + Connect RPC JSON unary handlers generated with connectrpc-build
- SeaORM migrations and repository supporting SQLite/Postgres/MySQL/MariaDB
- Filesystem asset serving with runtime config injection and CSRF-aware session bootstrap
- Verification pipeline for DB matrix smoke tests and frontend/browser validations
