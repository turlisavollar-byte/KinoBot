# v2 CI/CD and monitoring

## CI

`.github/workflows/test.yml` runs for pushes and pull requests targeting `feature/v2-web-integration`. It installs the root workspace and the standalone `apps/web` lockfile separately, then runs Web lint/typecheck, root typecheck, landing unit tests, workspace tests, and both build paths.

The current root workspace test suite has four known dashboard failures (31 passed, 4 failed in the last staging run). The workflow marks that step `continue-on-error` temporarily so lint, typecheck, landing tests, and builds still run; the step emits a warning and its full test output remains visible. This must not be interpreted as a fully green test suite.

## Staging deploy

`.github/workflows/deploy-staging.yml` is `workflow_dispatch` only. It also requires a confirmation input, the `staging` GitHub Environment, and a manual reviewer approval configured in repository settings. Its job is hard-restricted to `feature/v2-web-integration`, `STAGING_HOST=3.105.228.88`, and user `ubuntu`. It backs up the staging DB before migrations, builds the app images, applies migrations, restarts only app services, then checks local staging endpoints. It never targets production.

Configure the `staging` environment with:

- Variables: `STAGING_HOST=3.105.228.88`, `STAGING_USER=ubuntu`.
- Secrets: `STAGING_SSH_PRIVATE_KEY` (dedicated key whose public half is authorized for the staging ubuntu account) and `STAGING_KNOWN_HOSTS` (pinned SSH host-key line for `3.105.228.88`).
- Required reviewers: at least one staging approver.

Do not put private keys, `.env`, or tokens in the repository. The SSH host key is pinned; the workflow does not use `ssh-keyscan` at runtime.

## Monitoring

`.github/workflows/monitor-staging.yml` checks the API health endpoint, nginx HTTP/HTTPS, API error log count over 15 minutes, and Docker CPU/RAM stats every 15 minutes or on manual dispatch. The check connects only to the staging host over SSH. It emits status/count/metrics, never raw API log lines. Failures create or update one GitHub issue; a successful subsequent check closes it. Ensure GitHub Issues are enabled and repository notifications reach the on-call team.

GitHub scheduled workflows run from the repository default branch. Until this branch is merged into that default branch, use `workflow_dispatch` to test monitoring from the feature branch.

## Known limitations

- The existing Web lint has one `react-hooks/exhaustive-deps` warning in `apps/web/app/(player)/watch/[id]/page.tsx`.
- Workspace tests are temporarily non-blocking due to the four dashboard failures noted above.
- No production deploy workflow or production host variable/secret is defined here.
