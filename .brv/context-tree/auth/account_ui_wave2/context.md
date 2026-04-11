# Topic: account_ui_wave2

## Overview
Details how Wave 2 restores the legacy account UI layout while relying on readAuthUiCapabilities, and how the auth service/TRPC layer enforces validation, rate limits, and session issuance.

## Key Concepts
- UI capability discovery via readAuthUiCapabilities
- rememberMe cookie persistence toggles
- Registration confirmation modes (none, admin, email)
- Typed failure messaging such as app.auth.reset.invalidToken

## Related Topics
- auth/session_management
