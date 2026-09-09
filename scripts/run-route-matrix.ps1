<#
Run the full route matrix check locally.
Prerequisites:
 - PostgreSQL running and accessible via DATABASE_URL in .env
 - .env file at repo root with DATABASE_URL and JWT_SECRET set
 - Run migrations: pnpm --filter @workspace/db run push (or migrate)
 - Optional: seed DB: pnpm --filter @workspace/db run seed

Usage (PowerShell):
  # copy example env and edit
  copy .env.example .env
  # edit .env then run migrations + seed
  pnpm --filter @workspace/db run push
  pnpm --filter @workspace/db run seed
  # run the route matrix checker
  pnpm --filter @workspace/api-server exec tsx --env-file ./.env ./artifacts/api-server/full-route-matrix-check.ts
#>

Write-Host "Starting route-matrix check helper..."
if (-not (Test-Path ".env")) {
        Write-Host ".env file not found. Copying from .env.example"
        Copy-Item -Path .env.example -Destination .env -Force
        Write-Host "Please edit .env and set DATABASE_URL and JWT_SECRET, then re-run this script. Exiting."
        exit 1
}

Write-Host "Ensure you ran migrations (pnpm --filter @workspace/db run push) and seed if needed."

# Run the checker
pnpm --filter @workspace/api-server exec tsx --env-file ./.env ./artifacts/api-server/full-route-matrix-check.ts

if ($LASTEXITCODE -ne 0) {
        Write-Error "Route matrix check failed. See output above."
        exit $LASTEXITCODE
}

Write-Host "Route matrix check completed."
