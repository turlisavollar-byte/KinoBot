# =============================================================================
# StreamOps Dashboard - Dockerfile
# Multi-stage build for production deployment with nginx
# =============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY apps/dashboard/package.json ./apps/dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile --config.auto-install-peers=false

# Copy source code
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV VITE_API_URL=/api

# Build the dashboard
RUN pnpm --filter @workspace/dashboard run build

# Stage 2: Production stage with nginx
FROM nginx:1.27-alpine AS production

# Install nginx-extras for additional features
RUN apk add --no-cache curl

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/apps/dashboard/dist/public /usr/share/nginx/html

# Copy nginx configuration
COPY apps/dashboard/nginx.conf /etc/nginx/nginx.conf

# Use the non-root nginx user provided by the official image.
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
