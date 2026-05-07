# proto

Historical message schema snapshot from the pre-REST temporary implementation.

Phase -1 moved the canonical application API contract to REST JSON under `/api/v1`
plus the typed frontend REST client and TanStack Query boundary. This directory
is not a runtime RPC surface and must not be used as the contract source for new
feature work.
