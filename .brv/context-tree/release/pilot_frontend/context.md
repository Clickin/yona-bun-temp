# Topic: pilot_frontend

## Overview
Summarizes the pilot-specific Vite configuration, index.html entry adjustments, and Vitest parity suites that keep the pilot frontend aligned with the canonical release.

## Key Concepts
- Vite pilot config with relative base and pilot route tree generation
- Index HTML entry with #root container loading ./src/main.tsx for base-path safety
- Vitest specs that mock pilot session services and verify runPilotIssueStateToggle success and failure handling
