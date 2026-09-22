# StreamX Monorepo Architecture

## Overview

StreamX uses a monorepo architecture where all clients (web, mobile, admin) communicate exclusively through a single API server. The API contract is defined by an OpenAPI specification, ensuring type safety and consistency across all platforms.

## Structure

```
streamx-monorepo/
├── packages/
│   ├── openapi/              # OpenAPI 3.0 specification (single source of truth)
│   │   └── openapi.yaml
│   └── api-client/           # Shared TypeScript API client
│       └── src/
│           ├── types.ts       # All shared types
│           ├── http.ts        # HTTP client (fetch-based, token management)
│           └── index.ts       # API namespaces: auth, profile, watchlist, history, subscriptions, content
│
├── apps/
│   ├── api-server/           # Express.js API server (the single backend)
│   │   └── src/
│   │       ├── index.ts      # Server entry point
│   │       ├── supabase.ts   # Server-side Supabase client (private)
│   │       ├── middleware/
│   │       │   └── auth.ts   # JWT auth middleware
│   │       └── routes/
│   │           ├── auth.ts          # /auth/*
│   │           ├── profile.ts       # /profile/*
│   │           ├── watchlist.ts     # /watchlist/*
│   │           ├── history.ts       # /history/*
│   │           ├── subscriptions.ts # /subscriptions/*
│   │           └── content.ts       # /content/*
│   │
│   └── web/                  # Next.js web app (this directory)
│       ├── app/              # Next.js App Router pages
│       ├── features/         # Feature modules (auth, billing, content, user)
│       ├── components/       # UI components (shadcn/ui + custom)
│       └── shared/           # Shared utilities and types
│
└── package.json              # Root workspace config
```

## Key Principles

### 1. No Direct Backend Access
Clients never talk to Supabase (or any other backend) directly. All data flows through the API server. This means:
- The web app imports from `@streamx/api-client`, not `@supabase/supabase-js`
- Supabase credentials are only in the API server's environment
- Swapping Supabase for another backend requires changes only in `apps/api-server`

### 2. OpenAPI as Single Source of Truth
The OpenAPI spec (`packages/openapi/openapi.yaml`) defines every endpoint, request body, and response schema. The API client types mirror this spec. When the spec changes, the client types update accordingly.

### 3. Shared API Client
`@streamx/api-client` is used by all clients. It provides:
- Type-safe methods for every API endpoint
- Automatic token management (localStorage-based)
- Consistent error handling via `ApiClientError`

### 4. Environment Isolation
- **API server**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `CORS_ORIGIN`
- **Web app**: `NEXT_PUBLIC_API_URL` (points to the API server)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/sign-in | No | Sign in with email/password |
| POST | /auth/sign-up | No | Create account |
| POST | /auth/sign-out | Yes | Sign out |
| GET | /auth/session | Yes | Get current session |
| POST | /auth/reset-password | No | Send reset email |
| POST | /auth/update-password | Yes | Update password |
| GET | /profile | Yes | Get profile |
| PATCH | /profile | Yes | Update profile |
| GET | /profile/stats | Yes | Get user stats |
| GET | /watchlist | Yes | List watchlist |
| POST | /watchlist | Yes | Toggle watchlist item |
| DELETE | /watchlist/:id | Yes | Remove watchlist item |
| GET | /history | Yes | List watch history |
| POST | /history | Yes | Upsert history entry |
| DELETE | /history/:id | Yes | Delete history entry |
| POST | /history/clear | Yes | Clear all history |
| GET | /subscriptions | Yes | Get subscription |
| PUT | /subscriptions | Yes | Create/update subscription |
| DELETE | /subscriptions | Yes | Cancel subscription |
| GET | /content/catalog | No | Get catalog data |
| GET | /content/movies | No | List movies |
| GET | /content/series | No | List series |
| GET | /content/movies/:id | No | Get movie details |
| GET | /content/series/:id | No | Get series details |
| GET | /content/search | No | Search content |

## Development

```bash
# Install all workspace dependencies
npm install

# Run the web app (Next.js dev server)
npm run dev

# Run the API server (Express)
npm run api:dev

# Build the web app
npm run build

# Build the API server
npm run api:build
```

## Adding a New Client (e.g., mobile app)

1. Create `apps/mobile/` with your React Native / Flutter project
2. Add `@streamx/api-client` as a dependency
3. Import from `@streamx/api-client` — all endpoints and types are already available
4. Set the API URL environment variable to point to the API server

No changes needed to the API server or OpenAPI spec.
