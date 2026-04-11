# Domain: tooling

## Purpose
Capture knowledge about support tooling that enumerates server surface and query key inventories for the API transport spike.

## Scope
Included in this domain:
- Inventory generator architecture and execution flow
- Auth requirement and error-mapping inference rules
- Semantic diff gating via inventory.spec.ts tests
- Artifacts written under tools/api-transport-spike/inventory and packages/contracts

Excluded from this domain:
- General runtime stack decisions
- Projects unrelated to the API transport spike inventory pipeline

## Ownership
Core tooling squad

## Usage
Refer to this domain when updating the inventory generator, its auth/error heuristics, or the semantic diff gate compliance tests.
