# Domain: pilot_service

## Purpose
Capture foundational knowledge about the yona-rust pilot service backend, APIs, and frontend workspace shell that power the initial org/project flows.

## Scope
Included in this domain:
- PilotService proto RPC definitions for session, organization, and project handling
- Server-side session, workspace, and authorization helpers supporting those RPCs
- Frontend AuthWorkspaceShell wiring that keeps workspace overview, favorites, and navigation in sync with the backend

Excluded from this domain:
- Later waves focused on public directories, enrollment workflow beyond baseline, and deep project navigation routes

## Ownership
Pilot infrastructure team

## Usage
Use this domain when referencing the baseline PilotService surface or workspace shell behaviors implemented in R0-3 before later feature waves.
