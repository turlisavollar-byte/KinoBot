# Settings API

Base path: `/api/settings`. All settings endpoints require a valid Bearer access token and the `MANAGE_SYSTEM` permission (`manage:security`).

## Read settings

`GET /api/settings`

Success response:

```json
{
  "success": true,
  "data": {
    "trial_duration_days": 30
  }
}
```

`trial_duration_days` is returned as a number. The API falls back to `30` if the setting is absent, invalid, or the database read fails. Other stored settings are returned as strings.

## Update trial duration

`PUT /api/settings`

Request body:

```json
{
  "trial_duration_days": 14
}
```

The body is strict: the supported property is `trial_duration_days`, an integer from `0` through `365`. `0` disables free-trial access for newly created users; changing this value does not rewrite existing users' `trial_expires_at` values.

Success response:

```json
{
  "success": true,
  "data": {
    "trial_duration_days": 14
  }
}
```

Successful changes emit a `CONFIG_CHANGED` audit event with target `CONFIG / trial_duration_days`, previous and new values, and request actor context. Audit failure is logged and does not undo the settings update.

## Errors

- `401 Unauthorized`: access token missing, invalid, or expired.
- `403 Forbidden`: caller lacks `MANAGE_SYSTEM`.
- `400 Bad Request`: invalid body, non-integer days, or value outside `0–365`.
- `5xx`: settings persistence failed; inspect API logs and audit/database health.

## Operational notes

Trial duration is cached in each API process for up to five minutes. A successful update invalidates the cache in the process handling the request. New registrations read the configured duration; existing users are not bulk-updated.
