# KinoBot Cinema Web

The cinema app is a Next.js 13 application in the KinoBot v2 Docker Compose stack. It is served at `/web` by the shared public Nginx; its API calls use the same-origin `/api/web` prefix. There is no Supabase dependency or direct database access from the browser.

## Runtime Contract

- Authentication endpoints: `POST /api/web/auth/register`, `POST /api/web/auth/login`, and `GET /api/web/auth/me`.
- Web access JWTs carry `audience=web`. The identity/admin middleware expects `audience=admin`, so cinema tokens cannot authorize dashboard administration.
- The Web API uses the existing PostgreSQL `users`, `user_profiles`, `subscriptions`, and `subscription_plans` tables plus `favorites` and `watch_progress` for customer state.
- Public catalog reads expose only published, non-deleted movies/series. Customer writes are scoped from the verified Web JWT subject, never a request-supplied user ID.
- Subscription state is determined server-side from an active, unexpired database subscription. `GET /api/web/subscriptions/current` provides UI state; it does not grant entitlement.
- `GET /api/web/movies/:id/stream` independently checks active premium/family entitlement and returns a five-minute S3-compatible signed URL only when the movie has `source_type=s3` and a storage key. Telegram `file_id` values are not returned to browsers.
- S3 video objects must be reachable by the browser through the signed URL endpoint and configured for media CORS/range requests. Telegram-only titles are not streamable by this Web app and return `STREAM_UNAVAILABLE`.
- Payment plans may be displayed from PostgreSQL, but the Web client does not grant or cancel subscriptions directly. Production purchase flows must use the configured payment provider and verified webhook before a subscription row becomes active.
- Password reset/change and self-service payment/cancellation are intentionally not advertised as working API features until matching server-side flows exist.

## Deployment

`apps/web/Dockerfile` builds the app with Next standalone output and `NEXT_BASE_PATH=/web`. The Compose service is internal-only on port 3000 and has an HTTP health check. `nginx/nginx.prod.conf` routes `/web/` to this service, `/admin/` to the Vite dashboard, `/api` to api-server, and `/` to the LandingPage.

`NEXT_PUBLIC_API_URL=/api` is public browser configuration, not a secret. The API container remains the only component with database credentials. JWTs are stored by the existing client adapter in browser localStorage; use HTTPS only and rotate/revoke tokens if a client device is compromised.

## v3 Readiness

No tenant identifiers, tenant routing, tenant-specific auth, schema-per-tenant, or row-level tenant isolation is implemented in v2. Customer tables and endpoints are centralized behind the API so a later v3 can introduce tenant scope deliberately. Before enabling multi-tenancy, tenant ownership must be added to customer, subscription, catalog-access, favorites, watch-progress, and stream authorization queries together.
