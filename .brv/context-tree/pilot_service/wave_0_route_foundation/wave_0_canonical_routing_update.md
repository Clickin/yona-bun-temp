---
title: Wave 0 Canonical Routing Update
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-10T13:29:35.463Z'
updatedAt: '2026-04-10T13:29:35.463Z'
---
## Raw Concept
**Task:**
Document Wave 0 canonical route foundation changes that keep legacy home, auth, directory, search, and deep project paths working while surfacing organization listings through PilotService.

**Changes:**
- Introduced a canonical route table in the yona-rust frontend to remap legacy home, auth, public directory, search, and deep project paths to their canonical handlers.
- PilotService now additively exposes the organization listing under /orgs to satisfy legacy directory navigation requirements without removing existing project routes.

**Flow:**
Incoming requests hit the yona-rust canonical router -> reserved prefixes map to legacy home/auth/public directory/search/deep project handlers -> PilotService RPCs register the organization listing response so /orgs renders using the legacy directory data

**Timestamp:** 2026-04-10

## Narrative
### Structure
The canonical route table acts as the single source of truth for mapping legacy url spaces (home, auth, directory, search, and deep project views) to the appropriate handler inside the yone-rust frontend shell, preserving redirects, pagination, and workspace shells.

### Dependencies
Dependent services include PilotService for organization listings and any existing route helpers that manage reserved prefixes and pagination helpers for workspace screens.

### Highlights
Legacy /orgs navigation now fetches the organization listing through PilotService while unchanged canonical handlers continue to serve home, auth, and project routes, enabling parity for directory and deep project paths.

## Facts
- **canonical_route_table**: The yona-rust frontend now resolves legacy home, auth, public directory, search, and deep project paths via a shared canonical route table. [project]
- **pilot_service_orgs_listing**: PilotService additively exposes the organization listing endpoint at /orgs to match legacy navigation expectations. [project]
