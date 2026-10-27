# KinoBot v2 Test Deploy Plan

**Status: audit/plan only.** No server connection, Docker command, database query,
backup, migration, deploy, merge, tag, branch update, or file deletion was
performed for this plan. Do not execute the deployment commands until the
server roles, isolation settings, migration rehearsal, and required approvals
below are complete.

## 1. Current Git State

Read-only local audit on 2026-10-28:

- Current branch: `feature/v2-web-integration`.
- Current `HEAD`: `23d4bb770ab5db52faed5d2233b863ecd0a0058d`.
- Annotated tag `v1.1.1` points to the same commit, `23d4bb7`.
- `feature/actor-card-mvp` also points to `23d4bb7`; local HEAD is 0 commits
  ahead and 0 behind `origin/feature/actor-card-mvp`.
- `git merge-base feature/v2-web-integration v1.1.1` is `23d4bb7`.
- There are no commits in `v1.1.1..feature/v2-web-integration`; the committed
  v2 branch currently contains only the frozen release baseline.
- No `origin/feature/v2-web-integration` ref exists in the local remote-tracking
  list. Therefore no v2 commits have been pushed.
- The v2 implementation is an uncommitted worktree diff: 23 tracked paths were
  modified, plus untracked `apps/web/`, Web API route, LandingPage Dockerfile,
  migrations 0012/0013, and Web refresh-session schema. Exact current status is
  available with `git status --short --branch`.
- The subscription-page file had local edits during this audit; its current
  content was read and retained. The plan does not overwrite that file.

**Protection rule:** do not check out `feature/actor-card-mvp`, commit, push,
merge, tag, reset, or use `git clean`. Keep all v2 work on
`feature/v2-web-integration` until separately reviewed and approved.

## 2. Known Server Metadata and Unknown Environment Roles

The local SSH config contains these aliases (alias resolution only; no SSH
connection was attempted):

| Alias        | Configured host | User     | Current role                                                                                                                           |
| ------------ | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `kinokino`   | `3.25.119.10`   | `ubuntu` | Operator identifies `3-25-119-10.sslip.io` as a previous v1.1.1 test endpoint; treat as protected v1.1.1 until audit proves otherwise. |
| `mytestkino` | `3.27.225.225`  | `ubuntu` | Role unknown; possible candidate only after read-only audit and owner confirmation.                                                    |
| `kinobot`    | `51.20.38.77`   | `ubuntu` | Role unknown; do not assume disposable or select as v2 target yet.                                                                     |

The two addresses `3.25.119.10` and `3.27.225.225` are different configured
SSH endpoints. This does **not** establish whether either host contains multiple
Compose environments or which databases/volumes they share. No environment can
currently be certified as safe for v2 deployment. Preferred order: a newly
provisioned disposable test server; otherwise use `mytestkino` only if the
read-only audit and operator explicitly confirm it has no protected workload.
Do not choose `kinokino` while its v1.1.1 test role remains plausible.

### Read-only server audit (run separately on each approved alias)

These commands inspect metadata only. Never print `.env`, process environments,
container environment variables, credentials, private keys, or full secret
bearing Compose output into a transcript.

```bash
ssh mytestkino 'hostname; hostnamectl; ip -brief address; free -h; df -h / /opt; sudo ss -lntp'
ssh mytestkino 'docker compose ls --all; docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"'
ssh mytestkino 'docker volume ls; docker network ls'
ssh mytestkino 'for id in $(docker ps -aq); do docker inspect --format "name={{.Name}} project={{index .Config.Labels \"com.docker.compose.project\"}} service={{index .Config.Labels \"com.docker.compose.service\"}} workdir={{index .Config.Labels \"com.docker.compose.project.working_dir\"}} config={{index .Config.Labels \"com.docker.compose.project.config_files\"}} mounts={{range .Mounts}}{{.Name}}:{{.Destination}};{{end}} ports={{json .NetworkSettings.Ports}}" "$id"; done'
ssh mytestkino 'sudo find /opt -maxdepth 3 -type f \( -name "docker-compose*.yml" -o -name "compose.yml" \) -print'
```

Repeat with `kinokino` and, only if needed, `kinobot`. If identifying databases is
necessary, use a DBA-approved **read-only** query that prints database names,
role names, migration counts, and table counts only. Do not inspect credentials.
Do not run `docker compose config` on the server if the expanded output could
reveal secrets; use `config -q` only after a project and env file are identified.

Record for each environment:

- Hostname, instance ID/type, RAM/swap, free disk, Docker/Compose versions.
- Compose project/service labels, config file path, working directory, image
  tags/digests, running/created/exited status.
- Container port mappings/listeners and which process owns ports 80/443,
  8080, and 3000.
- PostgreSQL container/endpoint, volume mount name, DB names, role names,
  schema/migration counts. Never record passwords or full connection strings.
- Redis container and volume; upload volume; MinIO/S3 endpoint and bucket names.
- Nginx container/config path and effective `server_name`/upstream/location
  routes. Redact any credential-like values.
- Whether databases, cluster-level PostgreSQL roles, volumes, networks, or
  object-store buckets are shared between the two environments.

Only after this inventory and the server owner confirms which environment is
protected may a test target be selected.

## 3. Deployment and Migration Risk Assessment

Current v2 deployment tooling is **not yet safe to point at a host that may run
v1.1.1**:

- `scripts/install.sh` hard-codes `/opt/kinobot` and copies source there. Do not
  run it on a server with an existing KinoBot install; its destination is not
  parameterized.
- Git-mode `scripts/deploy.sh` requires a clean checkout and runs
  `git pull --ff-only origin feature/v2-web-integration`. The v2 branch does
  not exist on `origin`, and the v2 work is uncommitted, so this path cannot
  deploy the current worktree.
- ZIP-mode deploy syncs with `rsync --delete` into the script's application
  directory. It preserves selected files (`.env`, backup/log/TLS paths), but
  replaces other source files. Never aim it at the v1.1.1 release directory.
- Compose has no explicit project `name:` or deployment `-p` in the script.
  The implicit project name comes from the working directory. Running from the
  same `/opt/kinobot` directory reuses the same project-scoped network and named
  volumes (`postgres_data`, `redis_data`, `upload_data`).
- PostgreSQL has no published host port, but project reuse means the same
  Postgres service and volume. `db-init` alters the cluster-global
  `kinobot_user` password and provisions global audit roles; project/DB-name
  separation without a separate PostgreSQL cluster is insufficient isolation.
- The API publishes fixed `127.0.0.1:8080`, Dashboard fixed
  `127.0.0.1:3000`, and public Nginx fixed `80`/`443`. A second stack cannot bind
  these ports while v1.1.1 runs. Two Nginx instances cannot both own the same
  public domain's standard 80/443 listener.
- Current Compose uses `.env` `DATABASE_URL` for the runtime and
  `MIGRATION_DATABASE_URL` for db-init/backup/migrations. Migration 0012 alters
  `users.telegram_id`, adds Web password hashes and a case-insensitive email
  index; it intentionally fails if existing email values collide by case.
  Migration 0013 creates Web refresh-session storage. If either URL resolves to
  the v1.1.1 DB/cluster, v2 will change that DB and may alter shared PostgreSQL
  roles. Treat both migrations as writes to the configured target.
- PostgreSQL named volumes are project-scoped, but external DB URLs ignore
  Compose project isolation. Verify the redacted host/database target and use a
  dedicated cluster/instance for v2 rehearsal.
- `S3_ENDPOINT` is the API's storage connection endpoint. `S3_PRESIGN_ENDPOINT`
  optionally controls the host embedded in browser-facing signed URLs; it must
  resolve from the user's browser, not just from the Compose network. Keep S3
  credentials server-side. The Dashboard writes `sourceType=minio`; the stream
  API supports `minio`/`s3`, not Telegram/HLS. Bucket CORS must allow the test
  origin and byte-range GET requests.
- Installer now substitutes `NEXT_PUBLIC_APP_URL` from the prompted domain.
  Verify the generated `.env` contains the exact URL before build; Next public
  variables are baked into the build image.

### Does a non-impacting v2 test method exist?

Yes, conditionally, but it is not the current default deploy path. Use either a
new disposable server, or on an audited host use all of these together:

1. A separate release directory, e.g. `/opt/kinobot-v2-test`; never `/opt/kinobot`.
2. A unique Compose project name, e.g. `kinobot-v2-test`, explicitly passed to
   **every** Compose operation (install/build/up/logs/stop). Add this support to
   the deploy script before executing it; setting a variable that the script
   ignores is not isolation.
3. A separate PostgreSQL container and volume, with v2-only admin/app secrets
   and URLs pointing to its own `postgres` service. Never share the v1.1.1
   PostgreSQL cluster: roles are cluster-global.
4. Unique host ports. Candidate local-only ports are API `18081`, Dashboard
   `13001`; test Nginx could use `18080`/`18443` if the host security group
   allows them. Keep v1.1.1 ports 8080/3000/80/443 unchanged. These values are
   proposals, not a confirmed available-port inventory.
5. A dedicated Redis volume/network and a separate test S3 bucket/credentials.
   Do not point v2 at the v1.1.1 bucket or uploads volume.
6. Test URL with the correct certificate/domain. `https://domain:18443` can
   reuse a certificate for that hostname, but only after firewall approval and
   confirming the Nginx route. Otherwise use a separately approved test
   hostname/certificate.
7. Verify all Compose labels, ports, mounts, DB target, and S3 bucket before the
   first `up`. A second project without separate ports/database is not safe.

If the current server cannot support those isolated ports/resources, use a new
server instead. The operator-reported `c7i-flex.large` has 3.7 GB RAM plus swap;
actual current load and disk headroom still require audit. Do not use it as the
v2 target until the audit confirms capacity and isolation.

## 4. Migration Backup and Rollback

- First preserve the v1.1.1 backup and record its restore-test status. Do not
  overwrite or prune it.
- Prefer a fresh v2 DB initialized from migrations for a smoke deployment. For
  realistic upgrade rehearsal, restore a **sanitized** v1.1.1 backup into the
  separate v2 PostgreSQL volume; production-derived personal data requires
  explicit data-handling approval and encrypted transfer/storage.
- Before migration, create a second test-target backup and verify it with
  `pg_restore --list`; record SHA-256, timestamp, DB name, and backup location.
  A custom-format dump's list check is not a full restore test. Restore it to a
  disposable third DB before claiming rollback readiness.
- Test 0012 duplicate-case email preflight on that clone. If it raises, stop;
  review duplicates and prepare an approved data reconciliation. Do not disable
  the case-insensitive uniqueness constraint.
- Rollback test app: stop only the isolated project, for example
  `docker compose -p kinobot-v2-test --env-file .env.v2-test -f docker-compose.prod.yml stop`.
  Do not use `down -v`; do not stop the v1.1.1 project. Preserve the v2 DB
  volume and logs for diagnosis.
- Database rollback means restoring the v2 test backup into its isolated v2
  database/volume. Never restore over the v1.1.1 volume. A code rollback does
  not reverse schema migrations.

## 5. Proposed Build, Deploy, and Smoke Commands

**Not executed.** These commands become eligible only after (a) audit chooses a
test target, (b) code adds explicit project/port configuration to every deploy
command, (c) the v2 work is exported as a reviewed ZIP or approved commit, (d)
0012/0013 pass staging restore tests, and (e) the operator approves execution.

Local validation:

```bash
git status --short --branch
pnpm install --frozen-lockfile --config.auto-install-peers=false
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/web typecheck
pnpm --filter @workspace/web build
pnpm --filter @workspace/landing build
BASE_PATH=/admin/ pnpm --filter @workspace/dashboard build
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml config -q
```

After an isolated `.env.v2-test` is created and reviewed, and project/port
support is implemented and approved:

```bash
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml build
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml up -d --wait postgres redis
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml run --rm db-init
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml run --rm db-backup
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml run --rm db-migrator
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml run --rm db-seed
docker compose --env-file .env.v2-test -p kinobot-v2-test -f docker-compose.prod.yml up -d --wait api-server dashboard web landing nginx
```

Smoke checks (replace host/ports with the audited, approved mapping):

```bash
curl --fail https://<approved-test-host>:18443/api/healthz
curl --fail https://<approved-test-host>:18443/admin/health
curl --fail https://<approved-test-host>:18443/web/
curl --fail https://<approved-test-host>:18443/
```

Authentication/entitlement test matrix:

- Register/login customer; verify `audience=web`, then verify that token is
  rejected by an admin-only endpoint.
- Refresh once; assert old refresh token replay is rejected and old access JWT
  is rejected after session rotation. Logout; assert the current access token
  fails its session lookup immediately.
- No/expired/basic subscription: stream endpoint returns `403 PREMIUM_REQUIRED`.
- Active premium/family plus S3-backed published movie: signed URL has a short
  expiry and can `GET` plus byte-range `GET` from a browser-like client.
- Telegram-backed/HLS movie: stream endpoint returns `503 STREAM_UNAVAILABLE`
  without revealing its Telegram file ID.
- Dashboard bot control and Telegram polling run once; verify LandingPage,
  Dashboard, and Web do not collide on paths or share auth audiences.

## 6. Approval Gates

The operator must explicitly approve each stage before it is performed:

1. Read-only SSH audit of `kinokino`, `mytestkino`, and, if needed, `kinobot`.
2. Selection of a disposable host/environment and any firewall/DNS changes.
3. Sanitized backup/restore test or confirmation to use a clean v2 DB.
4. Changes to deploy script/Compose for `-p` project isolation and port
   overrides, then review of resulting diff.
5. Creation/transfer of `.env.v2-test`, TLS/S3 test credentials, and source ZIP
   or approved v2 commit. Secrets must be entered/stored outside chat and Git.
6. Applying migrations 0012/0013 to the isolated test DB.
7. Starting/stopping the isolated test Compose project.
8. Any v1.1.1 production deploy, merge, tag, or switch-over is a separate
   future approval; none is authorized by this plan.

Until these approvals and audits pass, keep v1.1.1 serving traffic unchanged.
