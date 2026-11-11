# Changelog

## [1.1.0] - 2026-10-10

### Added

- Production audit logging with normalized `info`, `warning`, and `critical` severity.
- Audit-table ownership separation and retention workflows with operational runbooks.
- Scoped backend RBAC for administrator and user operations.
- Rate limiting for administrative account creation.
- Forced password change for newly created administrators on first login.
- Role-aware dashboard navigation and scoped administrator management.
- Actor profiles, filmographies, and film-cast relationships across the API, bot, and dashboard.
- Explicit broadcast audience selection for notifications.
- StreamX landing page with contact form, social links, demo configuration, SEO metadata, and analytics integration.
- OpenAPI and generated API client/schema updates for the new and revised endpoints.
- Release validation tooling: unit tests, Playwright E2E, and Lighthouse CI.

### Changed

- Dashboard theme toggle, responsive layouts, dialogs, and navigation.
- Catalog refresh behavior and configured Telegram bot labels/prompts.
- Notification audiences and admin/user management workflows.

### Fixed

- Audit payload sanitization to redact secrets and sensitive values.
- Audit retention execution under the dedicated archiver role.
- Authentication token propagation and mandatory password-change flow.
- Catalog actor biography persistence, deletion, season/episode editing, and required-channel prompts.
- Dashboard overlays and series-dialog labels.
- Landing contact form validation, HTML escaping, origin checks, honeypot, and rate limiting.

### Security

- Enforced backend role and resource-scope checks for admin and user operations.
- Redacted secrets from audit payloads.
- Added rate limiting to sensitive admin and contact workflows.
- Required new administrators to change their password at first login.
- Separated audit-table ownership and retention execution privileges.

### Database Migrations

- `0006_actor_movie_video_relations`
- `0007_bright_switch` (normalized audit severity)
- `0008_audit_owner_separation`
- `0009_admin_must_change_password`

### Validation

- Monorepo typecheck and build passed on the release candidate.
- API server: 287 tests passed, 3 skipped; dashboard: 27 tests passed.
- Landing: 6 unit tests passed; Chromium E2E: 8 tests passed.
- Lighthouse CI: Performance 100, Accessibility 100, Best Practices 100, SEO 100 (three runs).
