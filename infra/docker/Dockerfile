# Image Node partagée — game + auth (prod-like Infomaniak sim)
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY apps ./apps
COPY packages ./packages
COPY tools ./tools
COPY infra ./infra
COPY server.js ./

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -sf "http://127.0.0.1:${HEALTH_PORT:-3000}/api/health" || exit 1
