# Topic: legacy_schema_baseline

## Overview
Documents the legacy schema baseline manifest, migration scaffolding, SeaORM persistence plumbing, and verification tests required for Rust migration parity.

## Key Concepts
- Manifest-driven table definitions stored in migration crate
- Collapsed migration script with backend-specific up/down flows
- SeaORM repo and repo_types surface legacy entities
- Schema validation tests ensure manifest, migrations, and dialect matrix exist
