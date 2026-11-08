# KinoBot v1.3.0

Telegram bot, admin dashboard, and REST API for managing movie content and subscriptions.

> Release note: the `v1.3.0` tag is pending deployment approval.

## Features

- Telegram bot for movie codes and subscriptions
- Admin dashboard for users, subscriptions, and audit logs
- REST API built with Express and Drizzle ORM
- PostgreSQL database and Redis caching
- Uzbek, Russian, and English interfaces

## Deployments

- Production: `51.20.38.77` (PM2 and system PostgreSQL)
- Test: `3-25-119-10.sslip.io` (Docker Compose)
- Backup archives: `/opt/KinoBot-backup-*.tar.gz`

The production PM2 deployment uses the host's workspace installation; a root-level `@workspace/db` symlink is not required for that runtime.

## v1.3.0 Fixes

- [x] User-list pagination
- [x] Configurable trial duration in Dashboard settings
- [x] Audit logging for configuration changes and trial extensions
- [x] Sonner toast notifications
- [x] RBAC role and permission seed
- [x] Access-token refresh and retry after HTTP 401
- [x] Required password-change flow for new administrators
- [x] Redis host overcommit setting (`vm.overcommit_memory=1`)

## Documentation

- [Settings API](docs/API_SETTINGS.md)
- [Trial user guide](docs/USER_GUIDE_TRIAL.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Changelog](docs/CHANGELOG.md)
