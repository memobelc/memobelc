# Build: Expo web static export (output: dist/)
# Debian (glibc), não Alpine (musl): lightningcss/NativeWind precisa do binário linux-x64-gnu no Metro.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV CI=true \
    EXPO_NO_TELEMETRY=1

# Injetado no bundle web em build time (configure no Dokploy em Build Args)
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN NODE_ENV=production npm run build

# Run: arquivos estáticos + serve (SPA)
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Dokploy costuma definir PORT em runtime
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
