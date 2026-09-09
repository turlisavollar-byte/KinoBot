# =============================================================================
# StreamOps API Server - Dockerfile
# Multi-stage build for production deployment
# =============================================================================

# Stage 1: Base image with dependencies
FROM node:24-bookworm-slim AS base
WORKDIR /app

# Apply the latest Debian security fixes from the base image repository.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@11.5.2

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-server/package.json ./apps/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/

RUN pnpm install --frozen-lockfile

# Stage 3: Build application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NODE_ENV=production

# Build only the API application for this image
RUN pnpm --filter @workspace/api-server run build

# Stage 4: Production image
FROM node:24-bookworm-slim AS production

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
COPY --from=deps --chown=streamops:streamops /app/node_modules ./node_modules
COPY --chown=streamops:streamops package.json ./
COPY --chown=streamops:streamops pnpm-workspace.yaml ./

# Create necessary directories
RUN mkdir -p /var/uploads && \
    chown -R streamops:streamops /var/uploads

# Switch to non-root user
USER streamops

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.mjs"]
