# Customer Identity Legacy Password Rehash Plan

## Current behavior

- New customer passwords are hashed with bcrypt using `BCRYPT_SALT_ROUNDS` (default: 12).
- The existing verifier still accepts the legacy salted SHA-256 format for accounts that have not logged in since migration.
- After a successful legacy-password verification, customer login hashes the submitted password with bcrypt and conditionally replaces the stored hash. The update also requires the stored hash and active account state to remain unchanged.
- Failed authentication does not update the stored credential. Accounts that do not log in remain on the legacy format until they authenticate or use an approved password-reset flow.

## Rollout and retirement

1. Keep the compatibility verifier enabled while legacy accounts may exist. Never export or log password hashes or submitted passwords during inventory.
2. Track the number of legacy-format credentials through an approved, sanitized operational metric. Do not query or expose production data without separate authorization.
3. Confirm the production bcrypt cost and capacity before rollout; the application default is 12 rounds and can be overridden with `BCRYPT_SALT_ROUNDS`.
4. Provide a password-reset path for dormant users who have not migrated through login.
5. Disable legacy SHA-256 verification only after an authorized inventory confirms no remaining credentials rely on it, or after an owner-approved cutoff/reset policy. Treat that disablement as a separate reviewed change.

## Validation

- Verify a valid legacy credential authenticates and is replaced with a bcrypt hash.
- Verify an invalid legacy credential does not change the stored hash.
- Verify concurrent credential changes cannot be overwritten by the conditional rehash update.
- Verify the resulting bcrypt credential continues to authenticate and no password/hash appears in audit or application logs.
