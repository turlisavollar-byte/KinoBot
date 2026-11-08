# Changelog

## v1.3.0 (2026-11-08)

### Production (51.20.38.77)

- Added pagination to the Dashboard user list.
- Added configurable trial duration in Dashboard settings.
- Added audit events for configuration changes and trial extensions.
- Added Sonner toast notifications.
- Seeded RBAC roles and permissions; admin has 37 permissions, including `view:health`.
- Added access-token refresh and one-time request retry after HTTP 401.
- Connected the required password-change flow for new administrators.
- Set `vm.overcommit_memory=1` for Redis host reliability.

### Test (3-25-119-10.sslip.io)

- The listed fixes were validated in the Docker Compose test environment.

### Release status

- The `v1.3.0` tag is pending deployment approval.
- The production RBAC migration ledger contains 10 entries; migration `0011` was not needed because the admin `view:health` grant was already present after seeding.
- Production API and Dashboard health checks returned HTTP 200 after the latest deployment.

## v1.2.0 (2026-11-07)

- Added configurable trial duration.
- Added audit logging.

## v1.1.1 (2026-10-27)

- Deployed the production Docker Compose configuration.
- Completed the 12/12 fix set.

## v1.0.1 (2026-10-24)

- Stable Telegram bot and admin dashboard release.
