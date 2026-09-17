# =============================================================================
# StreamOps API Server - Dockerfile
# Multi-stage build for production deployment
# =============================================================================

# Stage 1: Base image with dependencies
# Use the maintained LTS runtime on the current Debian stable slim base.
FROM node:22-trixie-slim AS base
WORKDIR /app

# Apply the latest Debian security fixes from the base image repository.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install the repository-pinned pnpm version so frozen lockfile installs remain reproducible.
RUN npm install -g pnpm@9.15.0

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY scripts/package.json ./scripts/

RUN pnpm install --frozen-lockfile --config.auto-install-peers=false

# Stage 3: Build application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api-server/node_modules ./apps/api-server/node_modules
COPY --from=deps /app/lib/api-zod/node_modules ./lib/api-zod/node_modules
COPY --from=deps /app/lib/db/node_modules ./lib/db/node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production

# Build only the API application for this image
RUN pnpm --filter @workspace/api-server run build

# Stage 4: Production image
FROM node:22-trixie-slim AS production

# Install dumb-init for proper signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 streamops && \
    adduser --system --uid 1001 --ingroup streamops --no-create-home streamops

WORKDIR /app

# Copy built application
COPY --from=build --chown=streamops:streamops /app/apps/api-server/dist ./dist
COPY --from=build --chown=streamops:streamops /app/lib/db/drizzle-canonical ./lib/db/drizzle-canonical
COPY --from=build --chown=streamops:streamops /app/lib/db/scripts ./lib/db/scripts
COPY --from=build --chown=streamops:streamops /app/lib/db/src ./lib/db/src
COPY --from=build --chown=streamops:streamops /app/lib/db/drizzle.config.ts ./lib/db/drizzle.config.ts
COPY --from=deps --chown=streamops:streamops /app/node_modules ./node_modules
COPY --from=deps --chown=streamops:streamops /app/apps/api-server/node_modules ./apps/api-server/node_modules
COPY --from=deps --chown=streamops:streamops /app/lib/db/node_modules ./lib/db/node_modules
COPY --chown=streamops:streamops package.json ./
COPY --chown=streamops:streamops pnpm-workspace.yaml ./

# Create necessary directories
RUN for dependency in /app/apps/api-server/node_modules/*; do \
    name="$(basename "$dependency")"; \
    if [ "$name" != ".bin" ] && [ ! -e "/app/node_modules/$name" ]; then \
    ln -s "$dependency" "/app/node_modules/$name"; \
    fi; \
    done && \
    mkdir -p /app/logs /var/uploads && \
    chown -R streamops:streamops /app/logs /var/uploads

# Switch to non-root user
USER streamops

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.mjs"]
