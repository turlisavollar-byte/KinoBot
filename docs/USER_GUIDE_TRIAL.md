# Trial Settings Guide

## Who can change the trial duration

An authenticated administrator account with the `MANAGE_SYSTEM` permission can open **Settings** in the Dashboard and change **Trial duration (days)**. The value must be a whole number from `0` to `365`.

1. Open the Dashboard and sign in with an authorized account.
2. Open **Settings**.
3. Enter the desired trial duration and save.
4. A success or error notification confirms the result.

The API records a `CONFIG_CHANGED` audit event for a successful change.

## Who is affected

The configured duration applies when a new user is created through Telegram `/start` or the application user-creation flow. Existing users' trial expiry dates are not recalculated when the setting changes.

- `30`: the default trial length when no valid setting can be read.
- `1–365`: trial days assigned to future registrations.
- `0`: new registrations receive an expiry at creation time, so free-trial access is disabled.

Trial access is checked against the user's `trial_expires_at`. When it is not in the future, content access depends on a valid active subscription.

## Troubleshooting

If Settings cannot load or save, verify the account has `MANAGE_SYSTEM`, the API is healthy, and the `system_settings` migration has been applied. Do not edit the database or environment file manually as a first-line fix; use the documented API/deployment process and retain the audit record.
