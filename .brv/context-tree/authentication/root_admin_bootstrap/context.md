# Topic: root_admin_bootstrap

## Overview
Covers the reserved root admin lifecycle including initialization, recovery, and password reset flows across services, UI routes, and CLI commands.

## Key Concepts
- Initialization states and reserved root admin validity
- bootstrap_mutex guarding first admin creation
- Serialized service mutations and CLI wrappers for recovery/reset
- UI route gating for initial setup

## Related Topics
- authentication/better_auth_integration
