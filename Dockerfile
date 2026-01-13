# ==================== Base ====================
FROM oven/bun:1 AS base
WORKDIR /app

# ==================== Dependencies ====================
FROM base AS deps
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile || bun install

# ==================== Build Shared ====================
FROM deps AS build-shared
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./
RUN bun run --filter @habit-tracker/shared build

# ==================== Build API ====================
FROM build-shared AS build-api
COPY apps/api ./apps/api
RUN bun run --filter @habit-tracker/api db:generate
RUN bun run --filter @habit-tracker/api build

# ==================== Build Web ====================
FROM build-shared AS build-web
COPY apps/web ./apps/web
RUN bun run --filter @habit-tracker/web build

# ==================== API Production ====================
FROM oven/bun:1-alpine AS api
WORKDIR /app

COPY --from=build-api /app/package.json ./
COPY --from=build-api /app/apps/api/package.json ./apps/api/
COPY --from=build-api /app/packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev deps for Prisma CLI)
RUN bun install --frozen-lockfile || bun install

COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/apps/api/prisma ./apps/api/prisma
COPY --from=build-api /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/api

# Generate Prisma client using the local version
RUN bun run db:generate

# Run migrations and start
CMD ["sh", "-c", "bun ../../node_modules/.bin/prisma migrate deploy && bun dist/index.js"]

EXPOSE 3001

# ==================== Web Production ====================
FROM nginx:alpine AS web

# Copy nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=build-web /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
