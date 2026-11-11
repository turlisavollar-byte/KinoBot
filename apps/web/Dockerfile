FROM node:22-bookworm-slim AS builder

WORKDIR /app
RUN npm install --global pnpm@9.15.0

COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/pnpm-lock.yaml ./apps/web/pnpm-lock.yaml
COPY apps/web/packages/api-client/ ./apps/web/packages/api-client/
WORKDIR /app/apps/web
RUN pnpm install --ignore-workspace --frozen-lockfile

COPY apps/web/ ./
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_URL=https://localhost
ARG NEXT_BASE_PATH=/web
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_BASE_PATH=$NEXT_BASE_PATH
ENV NODE_ENV=production
RUN pnpm build
RUN rm -f /app/apps/web/.next/standalone/.env /app/apps/web/.next/standalone/apps/web/.env

FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
        CMD node -e "fetch('http://127.0.0.1:3000/web').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]