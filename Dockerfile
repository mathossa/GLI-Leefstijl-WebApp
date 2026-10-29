# syntax=docker/dockerfile:1
# Explicit patch tags: review security updates before upgrading.
FROM node:22.23.4-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl tar \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
# Build-time placeholders only; real secrets never enter Docker build layers.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=unused-build-only-placeholder-of-32-characters \
    npm run build

# Contains Prisma CLI and Better Auth CLI for one-shot migration/bootstrap.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "db:deploy"]

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PRIVATE_UPLOAD_DIR=/app/private-uploads
RUN mkdir -p /app/.next /app/private-uploads && chown -R node:node /app/.next /app/private-uploads
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node scripts/healthcheck.mjs ./healthcheck.mjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
