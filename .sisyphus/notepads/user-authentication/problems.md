# Problems

- Tech debt: AGENTS architecture targets `packages/api` for Hono sub-app contracts, but this repository currently hosts auth API handlers under `src/routes/api`; app-level contract extraction into `packages/api` remains pending.
