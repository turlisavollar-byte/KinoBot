FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN npm install --global pnpm@9.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/landing/package.json ./apps/landing/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/packages/api-client/package.json ./apps/web/packages/api-client/package.json
COPY apps/dashboard/package.json ./apps/dashboard/package.json
COPY apps/api-server/package.json ./apps/api-server/package.json
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-zod/package.json ./lib/api-zod/package.json
COPY scripts/package.json ./scripts/package.json
RUN pnpm install --frozen-lockfile --config.auto-install-peers=false

COPY . .
ARG NEXT_PUBLIC_SITE_URL=https://localhost
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production
RUN pnpm --filter @workspace/landing build
RUN rm -f /app/apps/landing/.next/standalone/.env /app/apps/landing/.next/standalone/apps/landing/.env

FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/landing/.next/standalone ./
COPY --from=builder /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /app/apps/landing/public ./apps/landing/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
        CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/landing/server.js"]