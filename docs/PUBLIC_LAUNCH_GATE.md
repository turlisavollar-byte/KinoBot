# Public Launch Gate

This document tracks the minimum proof required before the app is announced for public sales.

## Required before announcement

### 1. Backup / restore proof

- Database backup must be created automatically.
- The backup must be restored into a validation database.
- Restore validation must confirm that public tables exist after import.
- The result must be stored as a log in the backup directory.

### 2. Video access policy

- Create Video flow must support access model selection.
- Required states: free, subscription required, required channels.
- The dashboard must expose the policy clearly before publishing content.

### 3. Runtime standardization

- Monorepo uses one Node LTS version across apps.
- Monorepo uses one exact pnpm version across apps.
- CI and local dev follow the same version pin.

### 4. Naming consistency

- Project naming must be unified across env, docs, containers, UI, and logs.
- Brand and technical names should not drift.

## Current status

- Backup / restore proof: pending a restore-validation log for the current cloud database
- Access policy dashboard: complete
- Runtime standardization: implemented in workspace manifests
- Naming consistency: complete

The public Telegram bot identity is `FavoriteKinoBot`. The existing `StreamOps`
identifier remains the internal deployment namespace for container, network, and
database resources to avoid an unsafe production rename.

## Release rule

Do not announce public sales until all four gates are either complete or explicitly waived with a documented decision.
